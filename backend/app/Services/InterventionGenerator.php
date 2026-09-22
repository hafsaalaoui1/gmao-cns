<?php

namespace App\Services;

use App\Models\PlanningTemplate;
use App\Models\Intervention;
use App\Models\GroupRotation;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class InterventionGenerator
{
    /**
     * ============================================================
     * GENERATE FOR TEMPLATE
     * ============================================================
     *
     * Génère les interventions d'un template pour une année.
     *
     * LOGIQUE DES GROUPES :
     *
     * Le group_id du template représente le groupe choisi
     * pour la première intervention.
     *
     * La rotation enregistrée dans group_rotation_id
     * détermine l'ordre des groupes.
     *
     * Exemple :
     *
     * Rotation : A -> B -> C
     * Groupe choisi : B
     *
     * Semaine 1 -> B
     * Semaine 2 -> C
     * Semaine 3 -> A
     * Semaine 4 -> B
     * Semaine 5 -> C
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

        // Limiter la génération à l'année demandée.
        $yearStart = Carbon::create($year, 1, 1);
        $yearEnd = Carbon::create($year, 12, 31);

        if ($startDate->lt($yearStart)) {
            $startDate = $yearStart->copy();
        }

        if ($endDate->gt($yearEnd)) {
            $endDate = $yearEnd->copy();
        }

        // Vérification des dates.
        if ($startDate->gt($endDate)) {
            Log::warning(
                "Template {$template->id} : date de début supérieure à la date de fin."
            );

            return 0;
        }

        // ============================================================
        // GROUPE DE DÉPART
        // ============================================================

        /**
         * Le groupe choisi dans le formulaire.
         *
         * Exemple :
         *
         * group_id = 3
         *
         * Cela signifie :
         *
         * Première intervention -> groupe 3
         */
        $startingGroupId = $template->group_id
            ? (int) $template->group_id
            : null;

        if (!$startingGroupId) {
            Log::warning(
                "Template {$template->id} : aucun groupe responsable défini."
            );

            return 0;
        }

        Log::info(
            "Template {$template->id} : groupe de départ = {$startingGroupId}"
        );

        // ============================================================
        // ROTATION
        // ============================================================

        /**
         * Le template possède normalement :
         *
         * group_rotation_id
         *
         * Exemple :
         *
         * group_rotation_id = 3
         *
         * On utilise directement cette rotation.
         */
        $rotation = null;

        if ($template->group_rotation_id) {
            $rotation = GroupRotation::find(
                $template->group_rotation_id
            );
        }

        // ============================================================
        // ORDRE DES GROUPES
        // ============================================================

        $groups = [];

        if ($rotation) {
            $groupsOrder = $rotation->groups_order;

            /**
             * Selon le modèle GroupRotation,
             * groups_order peut déjà être un tableau
             * ou être encore une chaîne JSON.
             */
            if (is_string($groupsOrder)) {
                $groupsOrder = json_decode(
                    $groupsOrder,
                    true
                );
            }

            if (is_array($groupsOrder)) {
                $groups = array_values(
                    array_filter(
                        $groupsOrder,
                        function ($groupId) {
                            return $groupId !== null
                                && $groupId !== '';
                        }
                    )
                );

                $groups = array_map(
                    'intval',
                    $groups
                );
            }
        }

        // ============================================================
        // AUCUNE ROTATION VALIDE
        // ============================================================

        /**
         * Si aucune rotation valide n'est trouvée,
         * on utilise uniquement le groupe choisi.
         *
         * Ainsi, l'intervention n'est pas perdue.
         */
        if (empty($groups)) {
            Log::warning(
                "Template {$template->id} : aucune rotation valide trouvée. "
                . "Le groupe {$startingGroupId} sera utilisé seul."
            );

            $groups = [
                $startingGroupId
            ];
        }

        // ============================================================
        // POSITION DU GROUPE DE DÉPART
        // ============================================================

        $startingGroupIndex = array_search(
            $startingGroupId,
            $groups,
            true
        );

        /**
         * Le groupe choisi doit obligatoirement
         * être présent dans la rotation.
         *
         * Exemple :
         *
         * groups = [1, 3]
         * startingGroup = 3
         *
         * startingIndex = 1
         */
        if ($startingGroupIndex === false) {
            Log::warning(
                "Template {$template->id} : "
                . "le groupe {$startingGroupId} n'existe pas "
                . "dans la rotation."
            );

            /**
             * Sécurité :
             * on utilise le groupe choisi seul.
             */
            $groups = [
                $startingGroupId
            ];

            $startingGroupIndex = 0;
        }

        Log::info(
            "Template {$template->id} : "
            . "ordre rotation = "
            . implode(' -> ', $groups)
            . " | position départ = "
            . $startingGroupIndex
        );

        // ============================================================
        // COMPTEUR
        // ============================================================

        $count = 0;

        /**
         * Nombre d'occurrences hebdomadaires.
         *
         * 0 = première intervention
         * 1 = deuxième semaine
         * 2 = troisième semaine
         * etc.
         */
        $occurrenceIndex = 0;

        // ============================================================
        // PARCOURS DES DATES
        // ============================================================

        $current = $startDate->copy();

        while ($current->lte($endDate)) {

            /**
             * Carbon :
             *
             * 1 = lundi
             * 2 = mardi
             * 3 = mercredi
             * 4 = jeudi
             * 5 = vendredi
             * 6 = samedi
             * 7 = dimanche
             */
            if (
                (int) $current->dayOfWeekIso ===
                (int) $template->day_of_week
            ) {

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
                // GROUPE RESPONSABLE
                // ====================================================

                /**
                 * Calcul de la position dans la rotation.
                 *
                 * Exemple :
                 *
                 * groups = [1, 3]
                 * startingIndex = 1
                 *
                 * occurrence 0 :
                 * (1 + 0) % 2 = 1 -> groupe 3
                 *
                 * occurrence 1 :
                 * (1 + 1) % 2 = 0 -> groupe 1
                 *
                 * occurrence 2 :
                 * (1 + 2) % 2 = 1 -> groupe 3
                 */
                $rotationIndex =
                    (
                        $startingGroupIndex
                        + $occurrenceIndex
                    )
                    % count($groups);

                $groupId =
                    $groups[$rotationIndex]
                    ?? $startingGroupId;

                // ====================================================
                // EXCEPTION : GROUPE OVERRIDE
                // ====================================================

                /**
                 * Une exception peut temporairement
                 * remplacer le groupe calculé.
                 */
                if (
                    $exception &&
                    $exception->group_id_override !== null
                ) {
                    $groupId =
                        (int) $exception->group_id_override;

                    Log::info(
                        "Template {$template->id} : "
                        . "groupe remplacé par exception pour "
                        . $current->toDateString()
                        . " -> {$groupId}"
                    );
                }

                // ====================================================
                // EXCEPTION : ANNULATION
                // ====================================================

                if (
                    $exception &&
                    $exception->status_override === 'annulee'
                ) {

                    Log::info(
                        "Template {$template->id} : "
                        . "intervention du "
                        . $current->toDateString()
                        . " annulée."
                    );

                    /**
                     * Même si l'intervention est annulée,
                     * cette semaine compte dans la rotation.
                     */
                    $occurrenceIndex++;

                    $current->addDay();

                    continue;
                }

                // ====================================================
                // CRÉATION
                // ====================================================

                try {

                    /**
                     * Vérifier si l'intervention existe déjà.
                     *
                     * On évite ainsi les doublons si le générateur
                     * est exécuté plusieurs fois.
                     */
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

                    if (!$alreadyExists) {

                        Intervention::create([

                            // ----------------------------------------
                            // ÉQUIPEMENT
                            // ----------------------------------------

                            'equipment_id' =>
                                $template->equipment_id,

                            // ----------------------------------------
                            // TYPE
                            // ----------------------------------------

                            'type' =>
                                $template->type,

                            // ----------------------------------------
                            // DATE
                            // ----------------------------------------

                            'scheduled_date' =>
                                $current->toDateString(),

                            // ----------------------------------------
                            // HEURE
                            // ----------------------------------------

                            'scheduled_time' =>
                                $template->start_time,

                            // ----------------------------------------
                            // DURÉE
                            // ----------------------------------------

                            'duration' =>
                                $template->duration,

                            // ----------------------------------------
                            // GROUPE
                            // ----------------------------------------

                            'group_id' =>
                                $groupId,

                            // ----------------------------------------
                            // PRIORITÉ
                            // ----------------------------------------

                            'priority' =>
                                $template->priority,

                            // ----------------------------------------
                            // DESCRIPTION
                            // ----------------------------------------

                            'description' =>
                                $template->description,

                            // ----------------------------------------
                            // STATUT
                            // ----------------------------------------

                            'status' =>
                                'en_attente',

                            // ----------------------------------------
                            // CRÉATEUR
                            // ----------------------------------------

                            'created_by' =>
                                $template->created_by,

                            // ----------------------------------------
                            // MODÈLE DE RELEVÉ
                            // ----------------------------------------

                            'template_id' =>
                                $template->reading_canvas_id,

                            // ----------------------------------------
                            // TEMPLATE PLANNING
                            // ----------------------------------------

                            'planning_template_id' =>
                                $template->id,
                        ]);

                        $count++;

                        Log::info(
                            "Intervention créée : "
                            . "template={$template->id}, "
                            . "date={$current->toDateString()}, "
                            . "group_id={$groupId}, "
                            . "occurrence={$occurrenceIndex}"
                        );

                    } else {

                        Log::info(
                            "Intervention déjà existante : "
                            . "template={$template->id}, "
                            . "date={$current->toDateString()}"
                        );
                    }

                } catch (\Exception $e) {

                    Log::error(
                        "Erreur création intervention : "
                        . $e->getMessage(),
                        [
                            'template_id' =>
                                $template->id,

                            'date' =>
                                $current->toDateString(),

                            'group_id' =>
                                $groupId,

                            'occurrence_index' =>
                                $occurrenceIndex,
                        ]
                    );
                }

                // ====================================================
                // SEMAINE SUIVANTE
                // ====================================================

                $occurrenceIndex++;
            }

            // ========================================================
            // JOUR SUIVANT
            // ========================================================

            $current->addDay();
        }

        // ============================================================
        // LOG FINAL
        // ============================================================

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
     * Génère les interventions de tous les templates actifs.
     */
    public function generateForAll($year)
    {
        $templates = PlanningTemplate::where(
            'is_active',
            true
        )->get();

        $total = 0;

        foreach ($templates as $template) {

            $total += $this->generateForTemplate(
                $template,
                $year
            );
        }

        Log::info(
            'Total général des interventions générées : '
            . $total
        );

        return $total;
    }
}