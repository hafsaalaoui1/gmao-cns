<?php

namespace App\Services;

use App\Models\PlanningTemplate;
use App\Models\Intervention;
use App\Models\GroupRotation;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InterventionGenerator
{
    /**
     * ============================================================
     * GET ACTIVE ROTATION
     * ============================================================
     *
     * L'application utilise une seule rotation active.
     */
    protected function getActiveRotation()
    {
        return GroupRotation::where('is_active', true)
            ->orderBy('id')
            ->first();
    }

    /**
     * ============================================================
     * GET GROUPS ORDER
     * ============================================================
     */
    protected function getGroupsOrder($rotation, $startingGroupId = null)
    {
        $groups = [];

        if ($rotation) {
            $groups = $rotation->getEffectiveGroupsOrder();

            $groups = array_values(
                array_unique(
                    array_map('intval', $groups)
                )
            );
        }

        if (empty($groups) && $startingGroupId !== null) {
            $groups = [(int) $startingGroupId];
        }

        return $groups;
    }

    /**
     * ============================================================
     * GET THEORETICAL GROUP
     * ============================================================
     *
     * Exemple avec :
     *
     * rotation = [1,3,4,5]
     * groupe de départ = 3
     *
     * semaine 1 => 3
     * semaine 2 => 4
     * semaine 3 => 5
     * semaine 4 => 1
     * semaine 5 => 3
     */
    protected function getTheoreticalGroup(
        PlanningTemplate $template,
        Carbon $current,
        array $groups
    ) {
        if (empty($groups)) {
            return null;
        }

        $startingGroupId = $template->group_id
            ? (int) $template->group_id
            : null;

        $startingGroupIndex = 0;

        if ($startingGroupId !== null) {
            $foundIndex = array_search(
                $startingGroupId,
                $groups,
                true
            );

            if ($foundIndex !== false) {
                $startingGroupIndex = $foundIndex;
            }
        }

        $templateReferenceWeek = Carbon::parse(
            $template->start_date
        )->startOfWeek(Carbon::MONDAY);

        $currentWeek = $current
            ->copy()
            ->startOfWeek(Carbon::MONDAY);

        $weeksDifference = $templateReferenceWeek->diffInWeeks(
            $currentWeek
        );

        $rotationIndex =
            (
                $startingGroupIndex
                + $weeksDifference
            )
            % count($groups);

        return (int) (
            $groups[$rotationIndex]
            ?? $groups[$startingGroupIndex]
        );
    }

    /**
     * ============================================================
     * GET WEEKLY ASSIGNMENTS FROM DATABASE
     * ============================================================
     *
     * Recharge les interventions déjà générées pour une semaine.
     *
     * Règles :
     *
     * - un équipement = un seul groupe
     * - un groupe = un seul équipement
     */
    protected function getWeeklyAssignments(
        Carbon $date,
        array &$weeklyAssignments
    ) {
        $weekStart = $date
            ->copy()
            ->startOfWeek(Carbon::MONDAY);

        $weekEnd = $date
            ->copy()
            ->endOfWeek(Carbon::SUNDAY);

        $weekKey = $weekStart->toDateString();

        if (!isset($weeklyAssignments[$weekKey])) {

            $weeklyAssignments[$weekKey] = [
                'equipment_to_group' => [],
                'group_to_equipment' => [],
            ];

            $existingInterventions = Intervention::whereNotNull(
                'planning_template_id'
            )
                ->whereBetween(
                    'scheduled_date',
                    [
                        $weekStart->toDateString(),
                        $weekEnd->toDateString(),
                    ]
                )
                ->get([
                    'equipment_id',
                    'group_id',
                ]);

            foreach ($existingInterventions as $intervention) {

                $equipmentId = (int) $intervention->equipment_id;
                $groupId = (int) $intervention->group_id;

                if ($equipmentId <= 0 || $groupId <= 0) {
                    continue;
                }

                $weeklyAssignments[$weekKey]
                    ['equipment_to_group']
                    [$equipmentId] = $groupId;

                $weeklyAssignments[$weekKey]
                    ['group_to_equipment']
                    [$groupId] = $equipmentId;
            }
        }

        return $weekKey;
    }

    /**
     * ============================================================
     * FIND AVAILABLE GROUP
     * ============================================================
     *
     * Essaie d'abord le groupe théorique.
     *
     * Si celui-ci est déjà utilisé pendant la semaine,
     * cherche le prochain groupe libre dans la rotation.
     */
    protected function findAvailableGroup(
        $desiredGroup,
        array $groups,
        array $weeklyData
    ) {
        $desiredGroup = (int) $desiredGroup;

        if (
            !isset(
                $weeklyData['group_to_equipment'][$desiredGroup]
            )
        ) {
            return $desiredGroup;
        }

        if (empty($groups)) {
            return null;
        }

        $desiredIndex = array_search(
            $desiredGroup,
            $groups,
            true
        );

        if ($desiredIndex === false) {
            $desiredIndex = 0;
        }

        $groupCount = count($groups);

        for ($offset = 1; $offset < $groupCount; $offset++) {

            $candidateIndex =
                (
                    $desiredIndex
                    + $offset
                )
                % $groupCount;

            $candidateGroup =
                (int) $groups[$candidateIndex];

            if (
                !isset(
                    $weeklyData['group_to_equipment']
                        [$candidateGroup]
                )
            ) {
                return $candidateGroup;
            }
        }

        return null;
    }

    /**
     * ============================================================
     * REGISTER ASSIGNMENT
     * ============================================================
     */
    protected function registerAssignment(
        array &$weeklyAssignments,
        $weekKey,
        $equipmentId,
        $groupId
    ) {
        $equipmentId = (int) $equipmentId;
        $groupId = (int) $groupId;

        if (!isset($weeklyAssignments[$weekKey])) {
            $weeklyAssignments[$weekKey] = [
                'equipment_to_group' => [],
                'group_to_equipment' => [],
            ];
        }

        $weeklyAssignments[$weekKey]
            ['equipment_to_group']
            [$equipmentId] = $groupId;

        $weeklyAssignments[$weekKey]
            ['group_to_equipment']
            [$groupId] = $equipmentId;
    }

    /**
     * ============================================================
     * GENERATE FOR TEMPLATE
     * ============================================================
     *
     * Génère les interventions d'un seul template.
     *
     * IMPORTANT :
     *
     * Cette méthode applique maintenant AUSSI la contrainte globale.
     *
     * Pour une même semaine :
     *
     * - un groupe = maximum un équipement
     * - un équipement = maximum un groupe
     */
    public function generateForTemplate($template, $year)
    {
        // ============================================================
        // DATES
        // ============================================================

        $startDate = $template->start_date
            ? Carbon::parse($template->start_date)
            : Carbon::create($year, 1, 1);

        $endDate = $template->end_date
            ? Carbon::parse($template->end_date)
            : Carbon::create($year, 12, 31);

        // ============================================================
        // LIMITES ANNÉE
        // ============================================================

        $yearStart = Carbon::create(
            $year,
            1,
            1
        )->startOfDay();

        $yearEnd = Carbon::create(
            $year,
            12,
            31
        )->endOfDay();

        if ($startDate->lt($yearStart)) {
            $startDate = $yearStart->copy();
        }

        if ($endDate->gt($yearEnd)) {
            $endDate = $yearEnd->copy();
        }

        // ============================================================
        // VALIDATION
        // ============================================================

        if ($startDate->gt($endDate)) {

            Log::warning(
                "Template {$template->id} : "
                . "date de début supérieure à la date de fin."
            );

            return 0;
        }

        // ============================================================
        // ROTATION ACTIVE
        // ============================================================

        $rotation = $this->getActiveRotation();

        if (!$rotation) {

            Log::warning(
                "Template {$template->id} : "
                . "aucune rotation active trouvée."
            );
        }

        // ============================================================
        // GROUPES
        // ============================================================

        $startingGroupId = $template->group_id
            ? (int) $template->group_id
            : null;

        $groups = $this->getGroupsOrder(
            $rotation,
            $startingGroupId
        );

        if (empty($groups)) {

            Log::warning(
                "Template {$template->id} : "
                . "aucun groupe disponible."
            );

            return 0;
        }

        // ============================================================
        // MÉMOIRE GLOBALE DES SEMAINES
        // ============================================================

        $weeklyAssignments = [];

        // ============================================================
        // COMPTEUR
        // ============================================================

        $count = 0;

        // ============================================================
        // PARCOURS DES DATES
        // ============================================================

        $current = $startDate->copy();

        while ($current->lte($endDate)) {

            // ========================================================
            // JOUR DU TEMPLATE
            // ========================================================

            if (
                (int) $current->dayOfWeekIso ===
                (int) $template->day_of_week
            ) {

                // ====================================================
                // SEMAINE
                // ====================================================

                $weekKey = $this->getWeeklyAssignments(
                    $current,
                    $weeklyAssignments
                );

                // ====================================================
                // EXCEPTION
                // ====================================================

                $exception = $template
                    ->exceptions()
                    ->whereDate(
                        'exception_date',
                        $current->toDateString()
                    )
                    ->first();

                // ====================================================
                // ANNULATION
                // ====================================================

                if (
                    $exception &&
                    $exception->status_override === 'annulee'
                ) {

                    Log::info(
                        "Intervention annulée : "
                        . "template={$template->id}, "
                        . "date={$current->toDateString()}"
                    );

                    $current->addDay();

                    continue;
                }

                // ====================================================
                // GROUPE THÉORIQUE
                // ====================================================

                $theoreticalGroupId =
                    $this->getTheoreticalGroup(
                        $template,
                        $current,
                        $groups
                    );

                if ($theoreticalGroupId === null) {

                    $current->addDay();

                    continue;
                }

                // ====================================================
                // GROUPE DEMANDÉ
                // ====================================================

                $overrideGroupId = null;

                if (
                    $exception &&
                    $exception->group_id_override !== null
                ) {

                    $overrideGroupId =
                        (int) $exception->group_id_override;
                }

                $desiredGroup =
                    $overrideGroupId
                    ?? $theoreticalGroupId;

                $desiredGroup = (int) $desiredGroup;

                // ====================================================
                // ÉQUIPEMENT
                // ====================================================

                $equipmentId =
                    (int) $template->equipment_id;

                // ====================================================
                // ÉQUIPEMENT DÉJÀ AFFECTÉ CETTE SEMAINE
                // ====================================================

                if (
                    isset(
                        $weeklyAssignments[$weekKey]
                            ['equipment_to_group']
                            [$equipmentId]
                    )
                ) {

                    $existingGroup =
                        $weeklyAssignments[$weekKey]
                            ['equipment_to_group']
                            [$equipmentId];

                    Log::warning(
                        "Conflit équipement/semaine : "
                        . "equipment={$equipmentId}, "
                        . "week={$weekKey}, "
                        . "template={$template->id}. "
                        . "Groupe déjà attribué={$existingGroup}."
                    );

                    $current->addDay();

                    continue;
                }

                // ====================================================
                // CHOIX DU GROUPE
                // ====================================================

                $selectedGroup = null;

                // ====================================================
                // EXCEPTION AVEC GROUPE IMPOSÉ
                // ====================================================

                if ($overrideGroupId !== null) {

                    if (
                        !isset(
                            $weeklyAssignments[$weekKey]
                                ['group_to_equipment']
                                [$desiredGroup]
                        )
                    ) {

                        $selectedGroup =
                            $desiredGroup;

                    } else {

                        $occupiedEquipment =
                            $weeklyAssignments[$weekKey]
                                ['group_to_equipment']
                                [$desiredGroup];

                        Log::warning(
                            "Conflit d'exception : "
                            . "le groupe {$desiredGroup} "
                            . "est déjà utilisé par "
                            . "l'équipement {$occupiedEquipment} "
                            . "durant la semaine {$weekKey}. "
                            . "Template={$template->id}."
                        );

                        $current->addDay();

                        continue;
                    }

                } else {

                    // =================================================
                    // ROTATION NORMALE
                    // =================================================

                    $selectedGroup =
                        $this->findAvailableGroup(
                            $desiredGroup,
                            $groups,
                            $weeklyAssignments[$weekKey]
                        );

                    if (
                        $selectedGroup !== null &&
                        $selectedGroup !== $desiredGroup
                    ) {

                        Log::info(
                            "Réaffectation automatique : "
                            . "template={$template->id}, "
                            . "equipment={$equipmentId}, "
                            . "week={$weekKey}, "
                            . "groupe théorique={$desiredGroup}, "
                            . "groupe choisi={$selectedGroup}"
                        );
                    }
                }

                // ====================================================
                // AUCUN GROUPE DISPONIBLE
                // ====================================================

                if ($selectedGroup === null) {

                    Log::warning(
                        "Aucun groupe disponible : "
                        . "template={$template->id}, "
                        . "equipment={$equipmentId}, "
                        . "week={$weekKey}"
                    );

                    $current->addDay();

                    continue;
                }

                $selectedGroup = (int) $selectedGroup;

                // ====================================================
                // DERNIÈRE SÉCURITÉ
                // ====================================================

                if (
                    isset(
                        $weeklyAssignments[$weekKey]
                            ['group_to_equipment']
                            [$selectedGroup]
                    )
                ) {

                    Log::warning(
                        "Conflit final groupe/équipement : "
                        . "template={$template->id}, "
                        . "group={$selectedGroup}, "
                        . "week={$weekKey}"
                    );

                    $current->addDay();

                    continue;
                }

                // ====================================================
                // VÉRIFIER DOUBLON TEMPLATE / DATE
                // ====================================================

                $alreadyExists =
                    Intervention::where(
                        'planning_template_id',
                        $template->id
                    )
                    ->whereDate(
                        'scheduled_date',
                        $current->toDateString()
                    )
                    ->exists();

                if ($alreadyExists) {

                    // On enregistre quand même l'affectation existante
                    // dans la mémoire globale.

                    $existingIntervention =
                        Intervention::where(
                            'planning_template_id',
                            $template->id
                        )
                        ->whereDate(
                            'scheduled_date',
                            $current->toDateString()
                        )
                        ->first();

                    if ($existingIntervention) {

                        $existingEquipment =
                            (int) $existingIntervention->equipment_id;

                        $existingGroup =
                            (int) $existingIntervention->group_id;

                        $this->registerAssignment(
                            $weeklyAssignments,
                            $weekKey,
                            $existingEquipment,
                            $existingGroup
                        );
                    }

                    $current->addDay();

                    continue;
                }

                // ====================================================
                // VÉRIFICATION ÉQUIPEMENT / DATE
                // ====================================================

                $sameEquipmentSameDate =
                    Intervention::where(
                        'equipment_id',
                        $equipmentId
                    )
                    ->whereDate(
                        'scheduled_date',
                        $current->toDateString()
                    )
                    ->whereNotNull(
                        'planning_template_id'
                    )
                    ->exists();

                if ($sameEquipmentSameDate) {

                    Log::warning(
                        "Doublon équipement/date détecté : "
                        . "equipment={$equipmentId}, "
                        . "date={$current->toDateString()}, "
                        . "template={$template->id}. "
                        . "Intervention ignorée."
                    );

                    $current->addDay();

                    continue;
                }

                // ====================================================
                // CRÉATION
                // ====================================================

                try {

                    Intervention::create([

                        'equipment_id' =>
                            $equipmentId,

                        'type' =>
                            $template->type,

                        'scheduled_date' =>
                            $current->toDateString(),

                        'scheduled_time' =>
                            $template->start_time,

                        'duration' =>
                            $template->duration,

                        'group_id' =>
                            $selectedGroup,

                        'priority' =>
                            $template->priority,

                        'description' =>
                            $template->description,

                        'status' =>
                            'en_attente',

                        'created_by' =>
                            $template->created_by,

                        'template_id' =>
                            $template->reading_canvas_id,

                        'planning_template_id' =>
                            $template->id,
                    ]);

                    // =================================================
                    // ENREGISTRER L'AFFECTATION
                    // =================================================

                    $this->registerAssignment(
                        $weeklyAssignments,
                        $weekKey,
                        $equipmentId,
                        $selectedGroup
                    );

                    $count++;

                    Log::info(
                        "Intervention créée : "
                        . "template={$template->id}, "
                        . "equipment={$equipmentId}, "
                        . "date={$current->toDateString()}, "
                        . "week={$weekKey}, "
                        . "group={$selectedGroup}"
                    );

                } catch (\Exception $e) {

                    Log::error(
                        "Erreur création intervention : "
                        . $e->getMessage(),
                        [
                            'template_id' =>
                                $template->id,

                            'equipment_id' =>
                                $equipmentId,

                            'date' =>
                                $current->toDateString(),

                            'group_id' =>
                                $selectedGroup,

                            'week' =>
                                $weekKey,
                        ]
                    );
                }
            }

            $current->addDay();
        }

        Log::info(
            "Template {$template->id} : "
            . "{$count} interventions générées."
        );

        return $count;
    }

    /**
     * ============================================================
     * GENERATE FOR ALL
     * ============================================================
     *
     * Génère tous les templates actifs.
     *
     * Règles globales :
     *
     * - un équipement = un seul groupe par semaine
     * - un groupe = un seul équipement par semaine
     *
     * Les exceptions avec groupe imposé sont traitées en priorité.
     */
    public function generateForAll($year)
    {
        // ============================================================
        // TEMPLATES
        // ============================================================

        $templates = PlanningTemplate::where(
            'is_active',
            true
        )
            ->orderBy('id', 'asc')
            ->get();

        if ($templates->isEmpty()) {

            Log::info(
                "Aucun template actif pour {$year}."
            );

            return 0;
        }

        // ============================================================
        // ROTATION UNIQUE
        // ============================================================

        $rotation = $this->getActiveRotation();

        $allGroups = [];

        if ($rotation) {

            $allGroups =
                $rotation->getEffectiveGroupsOrder();

            $allGroups = array_values(
                array_unique(
                    array_map(
                        'intval',
                        $allGroups
                    )
                )
            );
        }

        // ============================================================
        // OCCURRENCES
        // ============================================================

        $occurrences = [];

        foreach ($templates as $template) {

            // ========================================================
            // DATES
            // ========================================================

            $startDate = $template->start_date
                ? Carbon::parse($template->start_date)
                : Carbon::create($year, 1, 1);

            $endDate = $template->end_date
                ? Carbon::parse($template->end_date)
                : Carbon::create($year, 12, 31);

            $yearStart = Carbon::create(
                $year,
                1,
                1
            );

            $yearEnd = Carbon::create(
                $year,
                12,
                31
            );

            if ($startDate->lt($yearStart)) {
                $startDate = $yearStart->copy();
            }

            if ($endDate->gt($yearEnd)) {
                $endDate = $yearEnd->copy();
            }

            if ($startDate->gt($endDate)) {
                continue;
            }

            // ========================================================
            // GROUPES DU TEMPLATE
            // ========================================================

            $startingGroupId = $template->group_id
                ? (int) $template->group_id
                : null;

            $groups = $this->getGroupsOrder(
                $rotation,
                $startingGroupId
            );

            if (empty($groups)) {
                continue;
            }

            // ========================================================
            // PARCOURS
            // ========================================================

            $current = $startDate->copy();

            while ($current->lte($endDate)) {

                if (
                    (int) $current->dayOfWeekIso ===
                    (int) $template->day_of_week
                ) {

                    // =================================================
                    // SEMAINE
                    // =================================================

                    $weekKey =
                        $current
                            ->copy()
                            ->startOfWeek(
                                Carbon::MONDAY
                            )
                            ->toDateString();

                    // =================================================
                    // GROUPE THÉORIQUE
                    // =================================================

                    $theoreticalGroupId =
                        $this->getTheoreticalGroup(
                            $template,
                            $current,
                            $groups
                        );

                    if ($theoreticalGroupId === null) {
                        $current->addDay();
                        continue;
                    }

                    // =================================================
                    // EXCEPTION
                    // =================================================

                    $exception = $template
                        ->exceptions()
                        ->whereDate(
                            'exception_date',
                            $current->toDateString()
                        )
                        ->first();

                    // =================================================
                    // ANNULATION
                    // =================================================

                    if (
                        $exception &&
                        $exception->status_override === 'annulee'
                    ) {

                        $current->addDay();

                        continue;
                    }

                    // =================================================
                    // OVERRIDE
                    // =================================================

                    $overrideGroupId = null;

                    if (
                        $exception &&
                        $exception->group_id_override !== null
                    ) {

                        $overrideGroupId =
                            (int)
                            $exception->group_id_override;
                    }

                    // =================================================
                    // OCCURRENCE
                    // =================================================

                    $occurrences[] = [

                        'template' =>
                            $template,

                        'date' =>
                            $current->copy(),

                        'week_key' =>
                            $weekKey,

                        'theoretical_group_id' =>
                            $theoreticalGroupId,

                        'override_group_id' =>
                            $overrideGroupId,
                    ];
                }

                $current->addDay();
            }
        }

        // ============================================================
        // ORDRE
        // ============================================================
        //
        // 1. semaine
        // 2. exceptions
        // 3. template
        //
        // ============================================================

        usort(
            $occurrences,
            function ($a, $b) {

                $weekCompare =
                    strcmp(
                        $a['week_key'],
                        $b['week_key']
                    );

                if ($weekCompare !== 0) {
                    return $weekCompare;
                }

                $aOverride =
                    $a['override_group_id'] !== null;

                $bOverride =
                    $b['override_group_id'] !== null;

                if ($aOverride && !$bOverride) {
                    return -1;
                }

                if (!$aOverride && $bOverride) {
                    return 1;
                }

                return
                    $a['template']->id
                    <=>
                    $b['template']->id;
            }
        );

        // ============================================================
        // MÉMOIRE
        // ============================================================

        $weeklyAssignments = [];

        // ============================================================
        // COMPTEUR
        // ============================================================

        $total = 0;

        // ============================================================
        // TRAITEMENT
        // ============================================================

        foreach ($occurrences as $occurrence) {

            $template =
                $occurrence['template'];

            $current =
                $occurrence['date'];

            $weekKey =
                $occurrence['week_key'];

            $equipmentId =
                (int) $template->equipment_id;

            // ========================================================
            // CHARGER LES INTERVENTIONS EXISTANTES
            // ========================================================

            $this->getWeeklyAssignments(
                $current,
                $weeklyAssignments
            );

            // ========================================================
            // ÉQUIPEMENT DÉJÀ UTILISÉ CETTE SEMAINE
            // ========================================================

            if (
                isset(
                    $weeklyAssignments[$weekKey]
                        ['equipment_to_group']
                        [$equipmentId]
                )
            ) {

                Log::warning(
                    "Conflit équipement/semaine : "
                    . "equipment={$equipmentId}, "
                    . "week={$weekKey}, "
                    . "template={$template->id}. "
                    . "Occurrence ignorée."
                );

                continue;
            }

            // ========================================================
            // GROUPE DEMANDÉ
            // ========================================================

            $desiredGroup =
                $occurrence['override_group_id']
                ??
                $occurrence['theoretical_group_id'];

            $desiredGroup =
                (int) $desiredGroup;

            // ========================================================
            // GROUPES DU TEMPLATE
            // ========================================================

            $groups =
                $allGroups;

            if (empty($groups)) {

                $groups = [
                    $desiredGroup
                ];
            }

            // ========================================================
            // CHOISIR LE GROUPE
            // ========================================================

            $selectedGroup = null;

            // ========================================================
            // EXCEPTION
            // ========================================================

            if (
                $occurrence['override_group_id'] !== null
            ) {

                if (
                    !isset(
                        $weeklyAssignments[$weekKey]
                            ['group_to_equipment']
                            [$desiredGroup]
                    )
                ) {

                    $selectedGroup =
                        $desiredGroup;

                } else {

                    $occupiedEquipment =
                        $weeklyAssignments[$weekKey]
                            ['group_to_equipment']
                            [$desiredGroup];

                    Log::warning(
                        "Conflit d'exception : "
                        . "groupe={$desiredGroup}, "
                        . "equipment={$occupiedEquipment}, "
                        . "week={$weekKey}, "
                        . "template={$template->id}."
                    );

                    continue;
                }

            } else {

                // ====================================================
                // ROTATION NORMALE
                // ====================================================

                $selectedGroup =
                    $this->findAvailableGroup(
                        $desiredGroup,
                        $groups,
                        $weeklyAssignments[$weekKey]
                    );

                if (
                    $selectedGroup !== null &&
                    $selectedGroup !== $desiredGroup
                ) {

                    Log::info(
                        "Réaffectation automatique : "
                        . "template={$template->id}, "
                        . "equipment={$equipmentId}, "
                        . "week={$weekKey}, "
                        . "groupe théorique={$desiredGroup}, "
                        . "groupe choisi={$selectedGroup}"
                    );
                }
            }

            // ========================================================
            // AUCUN GROUPE
            // ========================================================

            if ($selectedGroup === null) {

                Log::warning(
                    "Aucun groupe disponible : "
                    . "template={$template->id}, "
                    . "equipment={$equipmentId}, "
                    . "week={$weekKey}"
                );

                continue;
            }

            $selectedGroup =
                (int) $selectedGroup;

            // ========================================================
            // SÉCURITÉ GROUPE
            // ========================================================

            if (
                isset(
                    $weeklyAssignments[$weekKey]
                        ['group_to_equipment']
                        [$selectedGroup]
                )
            ) {

                Log::warning(
                    "Conflit final : "
                    . "groupe={$selectedGroup}, "
                    . "week={$weekKey}, "
                    . "template={$template->id}."
                );

                continue;
            }

            // ========================================================
            // INTERVENTION EXISTANTE
            // ========================================================

            $alreadyExists =
                Intervention::where(
                    'planning_template_id',
                    $template->id
                )
                ->whereDate(
                    'scheduled_date',
                    $current->toDateString()
                )
                ->first();

            if ($alreadyExists) {

                $this->registerAssignment(
                    $weeklyAssignments,
                    $weekKey,
                    $alreadyExists->equipment_id,
                    $alreadyExists->group_id
                );

                continue;
            }

            // ========================================================
            // ÉQUIPEMENT / DATE
            // ========================================================

            $sameEquipmentSameDate =
                Intervention::where(
                    'equipment_id',
                    $equipmentId
                )
                ->whereDate(
                    'scheduled_date',
                    $current->toDateString()
                )
                ->whereNotNull(
                    'planning_template_id'
                )
                ->exists();

            if ($sameEquipmentSameDate) {

                Log::warning(
                    "Doublon équipement/date : "
                    . "equipment={$equipmentId}, "
                    . "date={$current->toDateString()}, "
                    . "template={$template->id}."
                );

                continue;
            }

            // ========================================================
            // CRÉATION
            // ========================================================

            try {

                Intervention::create([

                    'equipment_id' =>
                        $equipmentId,

                    'type' =>
                        $template->type,

                    'scheduled_date' =>
                        $current->toDateString(),

                    'scheduled_time' =>
                        $template->start_time,

                    'duration' =>
                        $template->duration,

                    'group_id' =>
                        $selectedGroup,

                    'priority' =>
                        $template->priority,

                    'description' =>
                        $template->description,

                    'status' =>
                        'en_attente',

                    'created_by' =>
                        $template->created_by,

                    'template_id' =>
                        $template->reading_canvas_id,

                    'planning_template_id' =>
                        $template->id,
                ]);

                // =================================================
                // ENREGISTRER
                // =================================================

                $this->registerAssignment(
                    $weeklyAssignments,
                    $weekKey,
                    $equipmentId,
                    $selectedGroup
                );

                $total++;

                Log::info(
                    "Intervention créée : "
                    . "template={$template->id}, "
                    . "equipment={$equipmentId}, "
                    . "date={$current->toDateString()}, "
                    . "week={$weekKey}, "
                    . "group={$selectedGroup}"
                );

            } catch (\Exception $e) {

                Log::error(
                    "Erreur création intervention : "
                    . $e->getMessage(),
                    [
                        'template_id' =>
                            $template->id,

                        'equipment_id' =>
                            $equipmentId,

                        'date' =>
                            $current->toDateString(),

                        'group_id' =>
                            $selectedGroup,

                        'week' =>
                            $weekKey,
                    ]
                );
            }
        }

        // ============================================================
        // LOG
        // ============================================================

        Log::info(
            "Total général des interventions générées "
            . "pour {$year} : {$total}"
        );

        return $total;
    }

    /**
     * ============================================================
     * RESET PLANNING INTERVENTIONS
     * ============================================================
     */
    public function resetPlanningInterventions($year)
    {
        $yearStart = Carbon::create(
            $year,
            1,
            1
        )->startOfDay();

        $yearEnd = Carbon::create(
            $year,
            12,
            31
        )->endOfDay();

        $query = Intervention::whereNotNull(
            'planning_template_id'
        )
            ->whereBetween(
                'scheduled_date',
                [
                    $yearStart->toDateString(),
                    $yearEnd->toDateString(),
                ]
            )
            ->where(
                'status',
                'en_attente'
            );

        $count = $query->count();

        Log::info(
            "Reset planning {$year} : "
            . "{$count} interventions en_attente trouvées."
        );

        $deleted = 0;

        if ($count > 0) {
            $deleted = $query->delete();
        }

        Log::info(
            "Reset planning {$year} terminé : "
            . "{$deleted} interventions supprimées."
        );

        return $deleted;
    }

    /**
     * ============================================================
     * RESET AND REGENERATE
     * ============================================================
     */
    public function resetAndRegenerate($year)
    {
        return DB::transaction(
            function () use ($year) {

                $deleted =
                    $this->resetPlanningInterventions(
                        $year
                    );

                $generated =
                    $this->generateForAll(
                        $year
                    );

                Log::info(
                    "Reset + régénération {$year} terminée : "
                    . "supprimées={$deleted}, "
                    . "générées={$generated}"
                );

                return [
                    'deleted' =>
                        $deleted,

                    'generated' =>
                        $generated,
                ];
            }
        );
    }
}