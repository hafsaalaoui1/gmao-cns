<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Intervention;
use App\Models\MaintenancePlan;
use Carbon\Carbon;
use Illuminate\Http\Request;

class MaintenancePlanController extends Controller
{
    /**
     * ============================================================
     * PLANNING ANNUEL
     * ============================================================
     */
    public function getAnnualPlanning(Request $request)
    {
        try {
            $year = (int) $request->get('year', now()->year);

            $startDate = Carbon::create($year, 1, 1)->startOfDay();
            $endDate = Carbon::create($year, 12, 31)->endOfDay();

            $interventions = Intervention::with([
                'equipment.category',
                'group'
            ])
                ->whereNotNull('planning_template_id')
                ->whereBetween('scheduled_date', [
                    $startDate->toDateString(),
                    $endDate->toDateString()
                ])
                ->orderBy('scheduled_date')
                ->orderBy('scheduled_time')
                ->get();

            $events = [];

            foreach ($interventions as $intervention) {

                $scheduledDate = Carbon::parse(
                    $intervention->scheduled_date
                );

                $events[] = [
                    'id' => $intervention->id,
                    'intervention_id' => $intervention->id,

                    'equipment_id' => $intervention->equipment_id,
                    'equipment_name' => $intervention->equipment?->name ?? 'N/A',

                    'category_id' =>
                        $intervention->equipment?->category_id ?? 0,

                    'category_name' =>
                        $intervention->equipment?->category?->name
                        ?? 'Non catégorisé',

                    /*
                     * IMPORTANT :
                     * 1 = lundi
                     * 2 = mardi
                     * 3 = mercredi
                     * 4 = jeudi
                     * 5 = vendredi
                     * 6 = samedi
                     * 7 = dimanche
                     */
                    'day_of_week' => $scheduledDate->dayOfWeekIso,

                    'scheduled_date' =>
                        $intervention->scheduled_date,

                    'scheduled_time' =>
                        $intervention->scheduled_time,

                    'type' => $intervention->type,
                    'priority' => $intervention->priority,
                    'status' => $intervention->status,

                    'group_id' => $intervention->group_id,
                    'group_name' =>
                        $intervention->group?->name ?? null,

                    'duration' =>
                        $intervention->duration ?? null,

                    'description' =>
                        $intervention->description ?? null,

                    'source' => 'intervention',
                ];
            }

            return response()->json([
                'year' => $year,
                'events' => $events,
            ]);

        } catch (\Throwable $e) {

            return response()->json([
                'message' => 'Erreur lors du chargement du planning annuel.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /**
     * ============================================================
     * PLANNING MENSUEL
     * ============================================================
     */
    public function getMonthlyPlanning(Request $request)
    {
        try {
            $year = (int) $request->get(
                'year',
                now()->year
            );

            $month = (int) $request->get(
                'month',
                now()->month
            );

            $startDate = Carbon::create(
                $year,
                $month,
                1
            )->startOfDay();

            $endDate = $startDate
                ->copy()
                ->endOfMonth()
                ->endOfDay();

            $events = [];


            /*
             * ========================================================
             * 1. INTERVENTIONS GÉNÉRÉES
             * ========================================================
             */
            $interventions = Intervention::with([
                'equipment.category',
                'group'
            ])
                ->whereNotNull('planning_template_id')
                ->whereBetween('scheduled_date', [
                    $startDate->toDateString(),
                    $endDate->toDateString()
                ])
                ->orderBy('scheduled_date')
                ->orderBy('scheduled_time')
                ->get();

            foreach ($interventions as $intervention) {

                $scheduledDate = Carbon::parse(
                    $intervention->scheduled_date
                );

                $events[] = [
                    'id' => $intervention->id,
                    'intervention_id' => $intervention->id,

                    'equipment_id' => $intervention->equipment_id,
                    'equipment_name' =>
                        $intervention->equipment?->name ?? 'N/A',

                    'category_id' =>
                        $intervention->equipment?->category_id ?? 0,

                    'category_name' =>
                        $intervention->equipment?->category?->name
                        ?? 'Non catégorisé',

                    'day_of_week' =>
                        $scheduledDate->dayOfWeekIso,

                    'type' => $intervention->type,
                    'priority' => $intervention->priority,

                    'scheduled_date' =>
                        $intervention->scheduled_date,

                    'scheduled_time' =>
                        $intervention->scheduled_time,

                    'group_id' =>
                        $intervention->group_id,

                    'group_name' =>
                        $intervention->group?->name,

                    'status' =>
                        $intervention->status,

                    'duration' =>
                        $intervention->duration ?? null,

                    'description' =>
                        $intervention->description ?? null,

                    'source' => 'intervention',
                ];
            }


            /*
             * ========================================================
             * 2. MAINTENANCE PLANS MANUELS
             * ========================================================
             */
            $plans = MaintenancePlan::with([
                'equipment.category',
                'group'
            ])
                ->where(
                    'start_date',
                    '<=',
                    $endDate->toDateString()
                )
                ->where(function ($query) use ($startDate) {

                    $query
                        ->whereNull('end_date')
                        ->orWhere(
                            'end_date',
                            '>=',
                            $startDate->toDateString()
                        );
                })
                ->get();

            foreach ($plans as $plan) {

                $dates = $this->getOccurrencesInRange(
                    $plan,
                    $startDate,
                    $endDate
                );

                foreach ($dates as $date) {

                    $events[] = [
                        'id' => $plan->id,
                        'intervention_id' => null,

                        'equipment_id' =>
                            $plan->equipment_id,

                        'equipment_name' =>
                            $plan->equipment?->name ?? 'N/A',

                        'category_id' =>
                            $plan->equipment?->category_id ?? 0,

                        'category_name' =>
                            $plan->equipment?->category?->name
                            ?? 'Non catégorisé',

                        'day_of_week' =>
                            $date->dayOfWeekIso,

                        'scheduled_date' =>
                            $date->toDateString(),

                        'scheduled_time' =>
                            $plan->preferred_time,

                        'type' =>
                            $plan->type,

                        'priority' =>
                            $plan->priority,

                        'status' =>
                            $plan->status ?? null,

                        'group_id' =>
                            $plan->group_id,

                        'group_name' =>
                            $plan->group?->name ?? null,

                        'duration' =>
                            $plan->duration ?? null,

                        'description' =>
                            $plan->description ?? null,

                        'source' => 'plan',
                    ];
                }
            }


            return response()->json([
                'year' => $year,
                'month' => $month,
                'events' => $events,
            ]);

        } catch (\Throwable $e) {

            return response()->json([
                'message' => 'Erreur lors du chargement du planning mensuel.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /**
     * ============================================================
     * PLANNING HEBDOMADAIRE
     * ============================================================
     *
     * IMPORTANT :
     *
     * Lundi    = 1
     * Mardi    = 2
     * Mercredi = 3
     * Jeudi    = 4
     * Vendredi = 5
     * Samedi   = 6
     * Dimanche = 7
     *
     * Le frontend utilise :
     * index 0 = lundi
     * index 1 = mardi
     * ...
     * index 6 = dimanche
     *
     * Donc :
     * indexFrontend = day_of_week - 1
     */
    public function getWeeklyPlanning(Request $request)
    {
        try {

            /*
             * ========================================================
             * 1. DÉTERMINER LA SEMAINE
             * ========================================================
             */

            $weekStart = $request->get(
                'week_start',
                now()->startOfWeek()->toDateString()
            );

            /*
             * On force le début de semaine à minuit.
             */
            $weekStartDate = Carbon::parse(
                $weekStart
            )->startOfDay();

            /*
             * IMPORTANT :
             * On ajoute exactement 6 jours.
             *
             * Cela garantit :
             *
             * lundi -> dimanche
             *
             * sans dépendre de la locale Carbon.
             */
            $weekEndDate = $weekStartDate
                ->copy()
                ->addDays(6)
                ->endOfDay();

            $weekStartString =
                $weekStartDate->toDateString();

            $weekEndString =
                $weekEndDate->toDateString();


            $events = [];


            /*
             * ========================================================
             * 2. INTERVENTIONS GÉNÉRÉES
             * ========================================================
             */

            $interventions = Intervention::with([
                'equipment.category',
                'group'
            ])
                ->whereNotNull('planning_template_id')
                ->whereBetween('scheduled_date', [
                    $weekStartString,
                    $weekEndString
                ])
                ->orderBy('scheduled_date')
                ->orderBy('scheduled_time')
                ->get();


            foreach ($interventions as $intervention) {

                /*
                 * On calcule le jour UNIQUEMENT à partir de
                 * scheduled_date.
                 *
                 * Carbon ISO :
                 *
                 * 1 = lundi
                 * 2 = mardi
                 * 3 = mercredi
                 * 4 = jeudi
                 * 5 = vendredi
                 * 6 = samedi
                 * 7 = dimanche
                 */
                $scheduledDate = Carbon::parse(
                    $intervention->scheduled_date
                );

                $dayOfWeek =
                    $scheduledDate->dayOfWeekIso;


                $events[] = [
                    'id' => $intervention->id,

                    'intervention_id' =>
                        $intervention->id,

                    'equipment_id' =>
                        $intervention->equipment_id,

                    'equipment_name' =>
                        $intervention->equipment?->name
                        ?? 'N/A',

                    'category_id' =>
                        $intervention->equipment?->category_id
                        ?? 0,

                    'category_name' =>
                        $intervention->equipment?->category?->name
                        ?? 'Non catégorisé',

                    /*
                     * ⭐ CORRECTION PRINCIPALE
                     */
                    'day_of_week' =>
                        $dayOfWeek,

                    'scheduled_date' =>
                        $intervention->scheduled_date,

                    'scheduled_time' =>
                        $intervention->scheduled_time,

                    'type' =>
                        $intervention->type,

                    'priority' =>
                        $intervention->priority,

                    'status' =>
                        $intervention->status,

                    'group_id' =>
                        $intervention->group_id,

                    'group_name' =>
                        $intervention->group?->name
                        ?? null,

                    'duration' =>
                        $intervention->duration
                        ?? null,

                    'description' =>
                        $intervention->description
                        ?? null,

                    'source' =>
                        'intervention',
                ];
            }


            /*
             * ========================================================
             * 3. MAINTENANCE PLANS MANUELS
             * ========================================================
             */

            $plans = MaintenancePlan::with([
                'equipment.category',
                'group'
            ])
                ->where(
                    'start_date',
                    '<=',
                    $weekEndString
                )
                ->where(function ($query) use ($weekStartString) {

                    $query
                        ->whereNull('end_date')
                        ->orWhere(
                            'end_date',
                            '>=',
                            $weekStartString
                        );
                })
                ->get();


            foreach ($plans as $plan) {

                $dates = $this->getOccurrencesInRange(
                    $plan,
                    $weekStartDate,
                    $weekEndDate
                );


                foreach ($dates as $date) {

                    /*
                     * Le jour est directement calculé à partir
                     * de la date réelle de l'occurrence.
                     */
                    $dayOfWeek =
                        $date->dayOfWeekIso;


                    $events[] = [
                        'id' =>
                            $plan->id,

                        'intervention_id' =>
                            null,

                        'equipment_id' =>
                            $plan->equipment_id,

                        'equipment_name' =>
                            $plan->equipment?->name
                            ?? 'N/A',

                        'category_id' =>
                            $plan->equipment?->category_id
                            ?? 0,

                        'category_name' =>
                            $plan->equipment?->category?->name
                            ?? 'Non catégorisé',

                        /*
                         * ⭐ CORRECTION
                         */
                        'day_of_week' =>
                            $dayOfWeek,

                        'scheduled_date' =>
                            $date->toDateString(),

                        'scheduled_time' =>
                            $plan->preferred_time,

                        'type' =>
                            $plan->type,

                        'priority' =>
                            $plan->priority,

                        'status' =>
                            $plan->status ?? null,

                        'group_id' =>
                            $plan->group_id,

                        'group_name' =>
                            $plan->group?->name
                            ?? null,

                        'duration' =>
                            $plan->duration ?? null,

                        'description' =>
                            $plan->description ?? null,

                        'source' =>
                            'plan',
                    ];
                }
            }


            /*
             * ========================================================
             * 4. ORGANISATION PAR CATÉGORIE / ÉQUIPEMENT / JOUR
             * ========================================================
             */

            $categories = [];
            $grouped = [];


            foreach ($events as $event) {

                $catId =
                    $event['category_id'] ?? 0;

                $catName =
                    $event['category_name']
                    ?? 'Non catégorisé';

                $equipId =
                    $event['equipment_id'];

                $equipName =
                    $event['equipment_name']
                    ?? 'N/A';

                /*
                 * ⭐ On utilise maintenant directement
                 * day_of_week envoyé par le backend.
                 *
                 * Pas de nouveau calcul à partir de la date.
                 */
                $dayOfWeek =
                    (int) ($event['day_of_week'] ?? 0);


                /*
                 * Sécurité :
                 * le jour doit être entre 1 et 7.
                 */
                if ($dayOfWeek < 1 || $dayOfWeek > 7) {
                    continue;
                }


                /*
                 * Conversion pour le tableau frontend :
                 *
                 * lundi    -> index 0
                 * mardi    -> index 1
                 * mercredi -> index 2
                 * jeudi    -> index 3
                 * vendredi -> index 4
                 * samedi   -> index 5
                 * dimanche -> index 6
                 */
                $dayIndex =
                    $dayOfWeek - 1;


                if (!isset($categories[$catId])) {
                    $categories[$catId] =
                        $catName;
                }


                if (!isset(
                    $grouped[$catId][$equipId]
                )) {

                    $grouped[$catId][$equipId] = [
                        'equipment_name' =>
                            $equipName,

                        'days' => [],
                    ];
                }


                /*
                 * ⭐ Placement de l'intervention
                 * dans le BON jour.
                 */
                $grouped[$catId][$equipId]['days'][$dayIndex] = [

                    'id' =>
                        $event['id'] ?? null,

                    'intervention_id' =>
                        $event['intervention_id'] ?? null,

                    'day_of_week' =>
                        $dayOfWeek,

                    'type' =>
                        $event['type'] ?? null,

                    'priority' =>
                        $event['priority'] ?? null,

                    'group_id' =>
                        $event['group_id'] ?? null,

                    'group_name' =>
                        $event['group_name'] ?? null,

                    'status' =>
                        $event['status'] ?? null,

                    'scheduled_date' =>
                        $event['scheduled_date'] ?? null,

                    'scheduled_time' =>
                        $event['scheduled_time'] ?? null,

                    'duration' =>
                        $event['duration'] ?? null,

                    'description' =>
                        $event['description'] ?? null,

                    'source' =>
                        $event['source'] ?? null,
                ];
            }


            /*
             * ========================================================
             * 5. CONSTRUIRE LE RÉSULTAT FINAL
             * ========================================================
             */

            $result = [];


            foreach ($categories as $categoryId => $categoryName) {

                $equipments = [];


                if (isset($grouped[$categoryId])) {

                    foreach (
                        $grouped[$categoryId]
                        as $equipmentId => $equipment
                    ) {

                        /*
                         * On garantit que les 7 jours existent.
                         */
                        $days = [];

                        for ($i = 0; $i < 7; $i++) {

                            $days[$i] =
                                $equipment['days'][$i]
                                ?? null;
                        }


                        $equipments[] = [
                            'equipment_id' =>
                                $equipmentId,

                            'equipment_name' =>
                                $equipment['equipment_name'],

                            'days' =>
                                $days,
                        ];
                    }
                }


                $result[] = [
                    'category_id' =>
                        $categoryId,

                    'category_name' =>
                        $categoryName,

                    'equipments' =>
                        $equipments,
                ];
            }


            /*
             * ========================================================
             * 6. RÉPONSE
             * ========================================================
             */

            return response()->json([

                'week_start' =>
                    $weekStartString,

                'week_end' =>
                    $weekEndString,

                /*
                 * Liste complète des événements.
                 *
                 * Le frontend peut utiliser cette liste
                 * avec getEventForCell().
                 */
                'events' =>
                    $events,

                /*
                 * Planning organisé :
                 * catégorie -> équipement -> jours
                 */
                'categories' =>
                    $result,

                /*
                 * Ordre officiel des jours.
                 */
                'days' => [
                    'Lundi',
                    'Mardi',
                    'Mercredi',
                    'Jeudi',
                    'Vendredi',
                    'Samedi',
                    'Dimanche',
                ],
            ]);

        } catch (\Throwable $e) {

            return response()->json([

                'message' =>
                    'Erreur lors du chargement du planning hebdomadaire.',

                'error' =>
                    $e->getMessage(),

            ], 500);
        }
    }


    /**
     * ============================================================
     * OCCURRENCES D'UN MAINTENANCE PLAN
     * ============================================================
     */
    private function getOccurrencesInRange(
        $plan,
        $startDate,
        $endDate
    ) {

        $dates = [];

        $current =
            $startDate
                ->copy()
                ->startOfDay();

        $end =
            $endDate
                ->copy()
                ->startOfDay();


        while ($current->lte($end)) {

            $match = false;


            switch ($plan->frequency) {

                /*
                 * ----------------------------------------------------
                 * DAILY
                 * ----------------------------------------------------
                 */
                case 'daily':

                    $match = true;

                    break;


                /*
                 * ----------------------------------------------------
                 * WEEKLY
                 * ----------------------------------------------------
                 *
                 * IMPORTANT :
                 * dayOfWeekIso :
                 *
                 * 1 lundi
                 * 2 mardi
                 * 3 mercredi
                 * 4 jeudi
                 * 5 vendredi
                 * 6 samedi
                 * 7 dimanche
                 */
                case 'weekly':

                    $match =
                        (
                            (int) $current->dayOfWeekIso
                            ===
                            (int) $plan->day_of_week
                        );

                    break;


                /*
                 * ----------------------------------------------------
                 * MONTHLY
                 * ----------------------------------------------------
                 */
                case 'monthly':

                    $match =
                        (
                            (int) $current->day
                            ===
                            (int) $plan->day_of_month
                        );

                    break;


                /*
                 * ----------------------------------------------------
                 * AUTRE
                 * ----------------------------------------------------
                 */
                default:

                    $match = false;

                    break;
            }


            if ($match) {
                $dates[] =
                    $current->copy();
            }


            $current->addDay();
        }


        return $dates;
    }


    /**
     * ============================================================
     * CRUD MAINTENANCE PLANS
     * ============================================================
     *
     * Ces méthodes sont conservées pour ne pas casser
     * les routes existantes du projet.
     */

    public function index(Request $request)
    {
        try {

            $plans = MaintenancePlan::with([
                'equipment.category',
                'group'
            ])
                ->orderBy('start_date')
                ->get();

            return response()->json($plans);

        } catch (\Throwable $e) {

            return response()->json([
                'message' =>
                    'Erreur lors du chargement des plans.',
                'error' =>
                    $e->getMessage(),
            ], 500);
        }
    }


    public function store(Request $request)
    {
        try {

            $validated = $request->validate([
                'equipment_id' => 'required|exists:equipment,id',
                'frequency' => 'required|string',
                'start_date' => 'required|date',

                'end_date' =>
                    'nullable|date|after_or_equal:start_date',

                'day_of_week' =>
                    'nullable|integer|min:1|max:7',

                'day_of_month' =>
                    'nullable|integer|min:1|max:31',

                'preferred_time' =>
                    'nullable',

                'type' =>
                    'nullable|string',

                'priority' =>
                    'nullable|string',

                'duration' =>
                    'nullable|integer',

                'description' =>
                    'nullable|string',

                'group_id' =>
                    'nullable|exists:groups,id',

                'status' =>
                    'nullable|string',
            ]);


            $plan =
                MaintenancePlan::create(
                    $validated
                );


            return response()->json(
                $plan->load([
                    'equipment.category',
                    'group'
                ]),
                201
            );

        } catch (\Throwable $e) {

            return response()->json([
                'message' =>
                    'Erreur lors de la création du plan.',
                'error' =>
                    $e->getMessage(),
            ], 500);
        }
    }


    public function show($id)
    {
        try {

            $plan =
                MaintenancePlan::with([
                    'equipment.category',
                    'group'
                ])->findOrFail($id);


            return response()->json($plan);

        } catch (\Throwable $e) {

            return response()->json([
                'message' =>
                    'Plan introuvable.',
                'error' =>
                    $e->getMessage(),
            ], 404);
        }
    }


    public function update(Request $request, $id)
    {
        try {

            $plan =
                MaintenancePlan::findOrFail($id);


            $validated = $request->validate([
                'equipment_id' =>
                    'sometimes|exists:equipment,id',

                'frequency' =>
                    'sometimes|string',

                'start_date' =>
                    'sometimes|date',

                'end_date' =>
                    'nullable|date',

                'day_of_week' =>
                    'nullable|integer|min:1|max:7',

                'day_of_month' =>
                    'nullable|integer|min:1|max:31',

                'preferred_time' =>
                    'nullable',

                'type' =>
                    'nullable|string',

                'priority' =>
                    'nullable|string',

                'duration' =>
                    'nullable|integer',

                'description' =>
                    'nullable|string',

                'group_id' =>
                    'nullable|exists:groups,id',

                'status' =>
                    'nullable|string',
            ]);


            $plan->update($validated);


            return response()->json(
                $plan->load([
                    'equipment.category',
                    'group'
                ])
            );

        } catch (\Throwable $e) {

            return response()->json([
                'message' =>
                    'Erreur lors de la modification du plan.',
                'error' =>
                    $e->getMessage(),
            ], 500);
        }
    }


    public function destroy($id)
    {
        try {

            $plan =
                MaintenancePlan::findOrFail($id);

            $plan->delete();


            return response()->json([
                'message' =>
                    'Plan supprimé avec succès.'
            ]);

        } catch (\Throwable $e) {

            return response()->json([
                'message' =>
                    'Erreur lors de la suppression du plan.',
                'error' =>
                    $e->getMessage(),
            ], 500);
        }
    }


    /**
     * ============================================================
     * GÉNÉRATION DES INTERVENTIONS
     * ============================================================
     *
     * Méthode conservée si elle est appelée par une route
     * existante.
     */
    private function generateInterventions($plan)
    {
        /*
         * La génération principale de ton projet est maintenant
         * réalisée par InterventionGenerator à partir des
         * PlanningTemplate.
         *
         * Cette méthode est volontairement conservée pour éviter
         * de casser d'anciennes références.
         */

        return [];
    }
}