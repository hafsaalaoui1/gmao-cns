<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Intervention;
use App\Models\Reading;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\PlanningException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class InterventionController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | PRÉPARER UNE INTERVENTION POUR LA RÉPONSE API
    |--------------------------------------------------------------------------
    */

    private function prepareInterventionForResponse(
        Intervention $intervention,
        bool $withSequence = false
    ): Intervention {

        /*
        |--------------------------------------------------------------------------
        | 0. GESTION AUTOMATIQUE DU RETARD
        |--------------------------------------------------------------------------
        */

        if (
            $intervention->status === 'en_attente'
            &&
            !empty($intervention->scheduled_date)
            &&
            !empty($intervention->scheduled_time)
        ) {

            $scheduledDateTime =
                $intervention->getScheduledDateTime();

            $now = Carbon::now(
                config(
                    'app.timezone',
                    'Africa/Casablanca'
                )
            );

            if (
                $scheduledDateTime
                &&
                $now->greaterThanOrEqualTo(
                    $scheduledDateTime
                )
            ) {

                $intervention->status =
                    'en_retard';

                $intervention->save();
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 1. CALCULER L'ÉTAT D'AFFICHAGE
        |--------------------------------------------------------------------------
        */

        $intervention->display_state =
            $intervention->getDisplayState();

        /*
        |--------------------------------------------------------------------------
        | 2. CALCULER LA DATE/HEURE DE DISPONIBILITÉ
        |--------------------------------------------------------------------------
        */

        $scheduledDateTime =
            $intervention->getScheduledDateTime();

        $intervention->available_at =
            $scheduledDateTime
                ?->toIso8601String();

        /*
        |--------------------------------------------------------------------------
        | 3. PROTECTION DE LA DATE BRUTE MYSQL
        |--------------------------------------------------------------------------
        */

        $rawDate =
            $intervention->getRawOriginal(
                'scheduled_date'
            );

        if ($rawDate !== null) {

            $intervention->setAttribute(
                'scheduled_date',
                substr(
                    (string) $rawDate,
                    0,
                    10
                )
            );
        }

        /*
        |--------------------------------------------------------------------------
        | 4. PROTECTION DE L'HEURE BRUTE MYSQL
        |--------------------------------------------------------------------------
        */

        $rawTime =
            $intervention->getRawOriginal(
                'scheduled_time'
            );

        if ($rawTime !== null) {

            $rawTime =
                substr(
                    (string) $rawTime,
                    0,
                    8
                );

            if (strlen($rawTime) === 5) {
                $rawTime .= ':00';
            }

            $intervention->setAttribute(
                'scheduled_time',
                $rawTime
            );
        }

        return $intervention;
    }


    /*
    |--------------------------------------------------------------------------
    | CALENDRIER
    |--------------------------------------------------------------------------
    */

    public function calendar()
    {
        try {

            $interventions = Intervention::with([
                'equipment',
                'group',
                'user',
                'template',
                'planningTemplate'
            ])
                ->orderBy('scheduled_date', 'asc')
                ->orderBy('scheduled_time', 'asc')
                ->orderBy('id', 'asc')
                ->get();

            $interventions->transform(
                function ($intervention) {

                    return $this->prepareInterventionForResponse(
                        $intervention
                    );
                }
            );

            return response()->json([
                'success' => true,
                'data' => $interventions,
                'message' =>
                    'Calendrier des interventions'
            ]);

        } catch (\Exception $e) {

            Log::error(
                'Erreur calendrier interventions : '
                . $e->getMessage()
            );

            return response()->json([
                'success' => false,
                'data' => [],
                'message' =>
                    'Erreur lors du chargement du calendrier',
                'error' =>
                    $e->getMessage()
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | LISTE DE TOUTES LES INTERVENTIONS
    |--------------------------------------------------------------------------
    */

    public function index()
    {
        try {

            $interventions = Intervention::with([
                'equipment',
                'group',
                'user',
                'template',
                'planningTemplate'
            ])
                ->orderBy('scheduled_date', 'asc')
                ->orderBy('scheduled_time', 'asc')
                ->orderBy('id', 'asc')
                ->get();

            $interventions->transform(
                function ($intervention) {

                    return $this->prepareInterventionForResponse(
                        $intervention
                    );
                }
            );

            return response()->json([
                'success' => true,
                'data' => $interventions,
                'message' =>
                    'Liste des interventions'
            ]);

        } catch (\Exception $e) {

            Log::error(
                'Erreur liste interventions : '
                . $e->getMessage()
            );

            return response()->json([
                'success' => false,
                'data' => [],
                'message' =>
                    'Erreur lors du chargement des interventions',
                'error' =>
                    $e->getMessage()
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | INTERVENTIONS DU JOUR
    |--------------------------------------------------------------------------
    */

    public function daily(Request $request)
    {
        try {

            $user = auth()->user();

            $validated = $request->validate([
                'date' => 'nullable|date_format:Y-m-d',
            ]);

            $date = $validated['date']
                ?? now()->format('Y-m-d');

            $query = Intervention::with([
                'equipment',
                'group',
                'user',
                'template',
                'planningTemplate'
            ])
                ->where(
                    'scheduled_date',
                    $date
                )
                ->whereIn('status', [
                    'en_attente',
                    'en_cours',
                    'terminee',
                    'validee',
                    'en_retard'
                ]);

            /*
            |--------------------------------------------------------------------------
            | RESPONSABLE
            |--------------------------------------------------------------------------
            */

            if ($user->role === 'responsable') {

                // Le responsable voit tout.

            } else {

                /*
                |--------------------------------------------------------------------------
                | INTERVENANT
                |--------------------------------------------------------------------------
                */

                $query->where(
                    function ($q) use ($user) {

                        $q->where(
                            'user_id',
                            $user->id
                        );

                        if (!empty($user->group_id)) {

                            $q->orWhere(
                                'group_id',
                                $user->group_id
                            );
                        }
                    }
                );
            }

            $interventions = $query
                ->orderBy(
                    'scheduled_date',
                    'asc'
                )
                ->orderBy(
                    'scheduled_time',
                    'asc'
                )
                ->orderBy(
                    'id',
                    'asc'
                )
                ->get();

            $interventions->transform(
                function ($intervention) {

                    return $this->prepareInterventionForResponse(
                        $intervention
                    );
                }
            );

            Log::info(
                'INTERVENTIONS DU JOUR',
                [
                    'user_id' =>
                        $user->id,

                    'role' =>
                        $user->role,

                    'date_demandee' =>
                        $date,

                    'count' =>
                        $interventions->count(),

                    'ids' =>
                        $interventions
                            ->pluck('id')
                            ->values()
                            ->toArray(),

                    'dates_brutes' =>
                        $interventions
                            ->map(
                                function ($intervention) {

                                    return [
                                        'id' =>
                                            $intervention->id,

                                        'scheduled_date' =>
                                            $intervention
                                                ->getRawOriginal(
                                                    'scheduled_date'
                                                ),

                                        'scheduled_time' =>
                                            $intervention
                                                ->getRawOriginal(
                                                    'scheduled_time'
                                                ),
                                    ];
                                }
                            )
                            ->values()
                            ->toArray(),
                ]
            );

            return response()->json([
                'success' => true,
                'data' => $interventions,
                'date' => $date,
                'count' => $interventions->count(),
                'message' =>
                    'Interventions du jour'
            ]);

        } catch (\Exception $e) {

            Log::error(
                'Erreur récupération interventions du jour : '
                . $e->getMessage(),
                [
                    'user_id' =>
                        auth()->id(),

                    'date' =>
                        $request->input('date'),
                ]
            );

            return response()->json([
                'success' => false,
                'data' => [],
                'message' =>
                    'Erreur lors du chargement des interventions du jour',
                'error' =>
                    $e->getMessage()
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | AFFICHER UNE INTERVENTION
    |--------------------------------------------------------------------------
    */

    public function show($id)
    {
        try {

            $intervention = Intervention::with([
                'equipment',
                'group',
                'user',
                'createdBy',
                'template',
                'planningTemplate',
                'readings'
            ])->findOrFail($id);

            $intervention =
                $this->prepareInterventionForResponse(
                    $intervention
                );

            return response()->json([
                'success' => true,
                'data' => $intervention
            ]);

        } catch (\Exception $e) {

            Log::error(
                'Erreur show intervention : '
                . $e->getMessage()
            );

            return response()->json([
                'success' => false,
                'data' => null,
                'message' =>
                    'Erreur lors du chargement de l\'intervention',
                'error' =>
                    $e->getMessage()
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | CRÉER UNE INTERVENTION
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        $validated = $request->validate([

            'equipment_id' =>
                'required|exists:equipments,id',

            'type' =>
                'required|string',

            'scheduled_date' =>
                'required|date_format:Y-m-d',

            'scheduled_time' =>
                'nullable|date_format:H:i',

            'duration' =>
                'nullable|integer|min:1',

            'group_id' =>
                'nullable|exists:groups,id',

            'user_id' =>
                'nullable|exists:users,id',

            'priority' =>
                'required|in:faible,normale,elevée,urgente',

            'description' =>
                'nullable|string',

            'status' =>
                'sometimes|in:en_attente,en_cours,terminee,validee,en_retard,annulee',

            'template_id' =>
                'nullable|exists:equipment_reading_templates,id',

            'planning_template_id' =>
                'nullable|exists:planning_templates,id',
        ]);

        $scheduledDate =
            $validated['scheduled_date'];

        $scheduledTime =
            !empty($validated['scheduled_time'])
                ? substr(
                    $validated['scheduled_time'],
                    0,
                    5
                ) . ':00'
                : '08:00:00';

        $intervention = Intervention::create([

            'equipment_id' =>
                $validated['equipment_id'],

            'type' =>
                $validated['type'],

            'scheduled_date' =>
                $scheduledDate,

            'scheduled_time' =>
                $scheduledTime,

            'duration' =>
                $validated['duration'] ?? 60,

            'group_id' =>
                $validated['group_id'] ?? null,

            'user_id' =>
                $validated['user_id'] ?? null,

            'priority' =>
                $validated['priority'],

            'description' =>
                $validated['description'] ?? null,

            'status' =>
                $validated['status'] ?? 'en_attente',

            'deadline' =>
                now()->addHours(48),

            'created_by' =>
                auth()->id(),

            'template_id' =>
                $validated['template_id'] ?? null,

            'planning_template_id' =>
                $validated['planning_template_id'] ?? null,
        ]);

        $intervention->load([
            'equipment',
            'group',
            'user',
            'template',
            'planningTemplate'
        ]);

        $intervention =
            $this->prepareInterventionForResponse(
                $intervention
            );

        return response()->json([
            'success' => true,
            'data' => $intervention,
            'message' =>
                'Intervention créée'
        ], 201);
    }


    /*
    |--------------------------------------------------------------------------
    | MODIFIER UNE INTERVENTION
    |--------------------------------------------------------------------------
    */

    public function update(
        Request $request,
        $id
    ) {
        $intervention =
            Intervention::findOrFail($id);

        $validated = $request->validate([

            'equipment_id' =>
                'sometimes|exists:equipments,id',

            'type' =>
                'sometimes|string',

            'scheduled_date' =>
                'sometimes|date_format:Y-m-d',

            'scheduled_time' =>
                'nullable|date_format:H:i',

            'duration' =>
                'nullable|integer|min:1',

            'group_id' =>
                'nullable|exists:groups,id',

            'user_id' =>
                'nullable|exists:users,id',

            'priority' =>
                'sometimes|in:faible,normale,elevée,urgente',

            'description' =>
                'nullable|string',

            'status' =>
                'sometimes|in:en_attente,en_cours,terminee,validee,en_retard,annulee',

            'template_id' =>
                'nullable|exists:equipment_reading_templates,id',

            'planning_template_id' =>
                'nullable|exists:planning_templates,id',
        ]);

        if (
            array_key_exists(
                'scheduled_time',
                $validated
            )
            &&
            !empty(
                $validated['scheduled_time']
            )
        ) {

            $validated['scheduled_time'] =
                substr(
                    $validated['scheduled_time'],
                    0,
                    5
                ) . ':00';
        }

        $intervention->update(
            $validated
        );

        $intervention->load([
            'equipment',
            'group',
            'user',
            'template',
            'planningTemplate'
        ]);

        $intervention =
            $this->prepareInterventionForResponse(
                $intervention
            );

        return response()->json([
            'success' => true,
            'data' => $intervention,
            'message' =>
                'Intervention mise à jour'
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | SUPPRIMER UNE INTERVENTION
    |--------------------------------------------------------------------------
    |
    | Si l'intervention provient d'une PlanningTemplate récurrente,
    | on crée une PlanningException pour cette date uniquement.
    |
    */

    public function destroy($id)
    {
        $intervention =
            Intervention::findOrFail($id);

        $planningTemplateId =
            $intervention->planning_template_id;

        $scheduledDate =
            $intervention->getScheduledDateRaw();

        DB::beginTransaction();

        try {

            if (
                !empty($planningTemplateId)
                &&
                !empty($scheduledDate)
            ) {

                PlanningException::updateOrCreate(
                    [
                        'planning_template_id' =>
                            $planningTemplateId,

                        'exception_date' =>
                            $scheduledDate,
                    ],
                    [
                        'group_id_override' =>
                            null,

                        'status_override' =>
                            'annulee',

                        'reason' =>
                            'Intervention supprimée manuellement.',
                    ]
                );
            }

            $intervention->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' =>
                    !empty($planningTemplateId)
                        ? 'Intervention supprimée et occurrence annulée pour cette date.'
                        : 'Intervention supprimée'
            ]);

        } catch (\Exception $e) {

            DB::rollBack();

            Log::error(
                'Erreur suppression intervention : ' .
                $e->getMessage(),
                [
                    'intervention_id' =>
                        $id,

                    'planning_template_id' =>
                        $planningTemplateId,

                    'scheduled_date' =>
                        $scheduledDate,
                ]
            );

            return response()->json([
                'success' => false,
                'message' =>
                    'Erreur lors de la suppression de l’intervention.',
                'error' =>
                    $e->getMessage()
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | AFFECTER UNE INTERVENTION
    |--------------------------------------------------------------------------
    */

    public function assign(
        Request $request,
        $id
    ) {
        $intervention =
            Intervention::findOrFail($id);

        $validated = $request->validate([

            'user_id' =>
                'nullable|exists:users,id',

            'group_id' =>
                'nullable|exists:groups,id',
        ]);

        $oldUserId =
            $intervention->user_id;

        $oldGroupId =
            $intervention->group_id;

        $intervention->update(
            $validated
        );

        /*
        |--------------------------------------------------------------------------
        | NOTIFICATION INTERVENANT DIRECT
        |--------------------------------------------------------------------------
        */

        if (
            !empty($intervention->user_id)
            &&
            (int) $intervention->user_id !==
            (int) $oldUserId
        ) {

            Notification::create([

                'user_id' =>
                    $intervention->user_id,

                'title' =>
                    'Nouvelle intervention',

                'message' =>
                    'Une nouvelle intervention vous a été affectée.',

                'type' =>
                    'intervention',

                'related_id' =>
                    $intervention->id,

                'data' => [

                    'intervention_id' =>
                        $intervention->id,

                    'equipment_id' =>
                        $intervention->equipment_id,

                    'scheduled_date' =>
                        $intervention
                            ->getRawOriginal(
                                'scheduled_date'
                            ),

                    'scheduled_time' =>
                        $intervention
                            ->getRawOriginal(
                                'scheduled_time'
                            ),
                ],

                'priority' =>
                    $intervention->priority
                    ?? 'normale',

                'read_at' =>
                    null,
            ]);
        }

        $intervention->load([
            'equipment',
            'group',
            'user',
            'template',
            'planningTemplate'
        ]);

        $intervention =
            $this->prepareInterventionForResponse(
                $intervention
            );

        return response()->json([
            'success' => true,
            'data' => $intervention,
            'message' =>
                'Intervention affectée'
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | MES INTERVENTIONS
    |--------------------------------------------------------------------------
    */

    public function myInterventions()
    {
        try {

            $user = auth()->user();

            /*
            |--------------------------------------------------------------------------
            | 1. INTERVENTIONS PRÉVENTIVES
            |--------------------------------------------------------------------------
            */

            $interventionQuery = Intervention::with([
                'equipment',
                'group',
                'user',
                'template',
                'planningTemplate',
                'readings'
            ])
                ->whereIn('status', [
                    'en_attente',
                    'en_cours',
                    'terminee',
                    'validee',
                    'en_retard'
                ]);

            /*
            |--------------------------------------------------------------------------
            | RESPONSABLE
            |--------------------------------------------------------------------------
            */

            if ($user->role === 'responsable') {

                // Le responsable voit toutes les interventions.

            } else {

                /*
                |--------------------------------------------------------------------------
                | INTERVENANT
                |--------------------------------------------------------------------------
                */

                $interventionQuery->where(
                    function ($query) use ($user) {

                        $query->where(
                            'user_id',
                            $user->id
                        );

                        if (!empty($user->group_id)) {

                            $query->orWhere(
                                'group_id',
                                $user->group_id
                            );
                        }
                    }
                );
            }

            $interventions =
                $interventionQuery->get();

            /*
            |--------------------------------------------------------------------------
            | 2. TRANSFORMER LES INTERVENTIONS PRÉVENTIVES
            |--------------------------------------------------------------------------
            */

            $interventions->transform(
                function ($intervention) {

                    $intervention =
                        $this->prepareInterventionForResponse(
                            $intervention
                        );

                    $intervention->source =
                        'intervention';

                    $intervention->intervention_type =
                        'preventive';

                    $intervention->type_display =
                        'Préventive';

                    return $intervention;
                }
            );

            /*
            |--------------------------------------------------------------------------
            | 3. TICKETS CORRECTIFS
            |--------------------------------------------------------------------------
            */

            $ticketQuery = Ticket::with([
                'equipment',
                'declaredBy',
                'assignedTo',
                'group'
            ]);

            /*
            |--------------------------------------------------------------------------
            | RESPONSABLE
            |--------------------------------------------------------------------------
            */

            if ($user->role === 'responsable') {

                // Aucune restriction.

            } else {

                /*
                |--------------------------------------------------------------------------
                | INTERVENANT
                |--------------------------------------------------------------------------
                */

                $ticketQuery->where(
                    function ($query) use ($user) {

                        $query->where(
                            'assigned_to',
                            $user->id
                        );

                        if (!empty($user->group_id)) {

                            $query->orWhere(
                                'group_id',
                                $user->group_id
                            );
                        }
                    }
                );
            }

            $tickets = $ticketQuery
                ->orderBy(
                    'declared_date',
                    'asc'
                )
                ->orderBy(
                    'id',
                    'asc'
                )
                ->get();

            /*
            |--------------------------------------------------------------------------
            | 4. TRANSFORMER LES TICKETS
            |--------------------------------------------------------------------------
            */

            $tickets->transform(
                function ($ticket) {

                    $declaredDateTime = null;

                    if ($ticket->declared_date) {

                        try {

                            $declaredDateTime =
                                Carbon::parse(
                                    $ticket->declared_date
                                );

                        } catch (\Exception $e) {

                            $declaredDateTime = null;
                        }
                    }

                    return (object) [

                        'id' =>
                            $ticket->id,

                        'ticket_id' =>
                            $ticket->id,

                        'source' =>
                            'ticket',

                        'intervention_type' =>
                            'corrective',

                        'type' =>
                            'corrective',

                        'type_display' =>
                            'Corrective',

                        'display_title' =>
                            'Ticket #' . $ticket->id,

                        'description' =>
                            $ticket->description,

                        'priority' =>
                            $ticket->priority,

                        'status' =>
                            $ticket->status,

                        'diagnostic' =>
                            $ticket->diagnostic,

                        'solution' =>
                            $ticket->solution,

                        'parts_used' =>
                            $ticket->parts_used,

                        'equipment_id' =>
                            $ticket->equipment_id,

                        'equipment' =>
                            $ticket->equipment,

                        'assigned_to' =>
                            $ticket->assigned_to,

                        'assigned_user' =>
                            $ticket->assignedTo,

                        'group_id' =>
                            $ticket->group_id,

                        'group' =>
                            $ticket->group,

                        'declared_by' =>
                            $ticket->declared_by,

                        'declared_user' =>
                            $ticket->declaredBy,

                        'declared_date' =>
                            $ticket->declared_date,

                        'scheduled_date' =>
                            $declaredDateTime
                                ? $declaredDateTime
                                    ->format('Y-m-d')
                                : null,

                        'scheduled_time' =>
                            $declaredDateTime
                                ? $declaredDateTime
                                    ->format('H:i:s')
                                : null,

                        'available_at' =>
                            $declaredDateTime
                                ? $declaredDateTime
                                    ->toIso8601String()
                                : null,

                        'resolution_date' =>
                            $ticket->resolution_date,

                        'created_at' =>
                            $ticket->created_at,

                        'updated_at' =>
                            $ticket->updated_at,
                    ];
                }
            );

            /*
            |--------------------------------------------------------------------------
            | 5. FUSIONNER
            |--------------------------------------------------------------------------
            */

            $allItems =
                $interventions
                    ->concat($tickets)
                    ->sortBy(
                        function ($item) {

                            $date =
                                $item->scheduled_date
                                ?? null;

                            $time =
                                $item->scheduled_time
                                ?? '00:00:00';

                            if (!$date) {
                                return PHP_INT_MAX;
                            }

                            try {

                                return Carbon::parse(
                                    $date . ' ' . $time
                                )->timestamp;

                            } catch (\Exception $e) {

                                return PHP_INT_MAX;
                            }
                        }
                    )
                    ->values();

            /*
            |--------------------------------------------------------------------------
            | 6. LOG
            |--------------------------------------------------------------------------
            */

            Log::info(
                'MES INTERVENTIONS + TICKETS CORRECTIFS',
                [
                    'user_id' =>
                        $user->id,

                    'role' =>
                        $user->role,

                    'preventive_count' =>
                        $interventions->count(),

                    'corrective_count' =>
                        $tickets->count(),

                    'total_count' =>
                        $allItems->count(),
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | 7. RÉPONSE
            |--------------------------------------------------------------------------
            */

            return response()->json([
                'success' => true,

                'data' =>
                    $allItems,

                'count' =>
                    $allItems->count(),

                'preventive_count' =>
                    $interventions->count(),

                'corrective_count' =>
                    $tickets->count(),

                'message' =>
                    'Interventions préventives et tickets correctifs'
            ]);

        } catch (\Exception $e) {

            Log::error(
                'Erreur récupération mes interventions + tickets : '
                . $e->getMessage(),
                [
                    'user_id' =>
                        auth()->id(),

                    'error' =>
                        $e->getTraceAsString(),
                ]
            );

            return response()->json([
                'success' => false,

                'data' => [],

                'count' => 0,

                'preventive_count' => 0,

                'corrective_count' => 0,

                'message' =>
                    'Erreur lors du chargement des interventions',

                'error' =>
                    $e->getMessage()
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | PROCHAINE INTERVENTION
    |--------------------------------------------------------------------------
    */

    public function nextIntervention(
        Request $request
    ) {
        $user = $request->user();

        try {

            /*
            |--------------------------------------------------------------------------
            | 1. ID FOURNI PAR LE FRONTEND
            |--------------------------------------------------------------------------
            */

            $currentInterventionId =
                $request->input(
                    'after_intervention_id'
                );

            $currentIntervention = null;

            /*
            |--------------------------------------------------------------------------
            | 2. UTILISER L'ID FOURNI
            |--------------------------------------------------------------------------
            */

            if (
                !empty(
                    $currentInterventionId
                )
            ) {

                $currentIntervention =
                    Intervention::with([
                        'equipment',
                        'group',
                        'user',
                        'planningTemplate'
                    ])
                    ->find(
                        $currentInterventionId
                    );

                if (!$currentIntervention) {

                    return response()->json([
                        'success' => false,
                        'data' => null,
                        'message' =>
                            'L\'intervention actuelle est introuvable.'
                    ], 404);
                }

                /*
                |--------------------------------------------------------------------------
                | VÉRIFIER L'AFFECTATION
                |--------------------------------------------------------------------------
                */

                $isAuthorized =
                    (int) $currentIntervention->user_id ===
                    (int) $user->id
                    ||
                    (
                        !empty(
                            $currentIntervention->group_id
                        )
                        &&
                        !empty(
                            $user->group_id
                        )
                        &&
                        (int)
                            $currentIntervention->group_id ===
                        (int)
                            $user->group_id
                    );

                if (!$isAuthorized) {

                    return response()->json([
                        'success' => false,
                        'data' => null,
                        'message' =>
                            'Vous n\'êtes pas autorisé à accéder à cette intervention.'
                    ], 403);
                }
            }

            /*
            |--------------------------------------------------------------------------
            | 3. SI PAS D'ID :
            |    DERNIÈRE INTERVENTION TERMINÉE / VALIDÉE
            |--------------------------------------------------------------------------
            */

            if (!$currentIntervention) {

                $currentIntervention =
                    Intervention::with([
                        'equipment',
                        'group',
                        'user',
                        'planningTemplate'
                    ])
                    ->whereIn('status', [
                        'terminee',
                        'validee'
                    ])
                    ->where(
                        function ($query) use ($user) {

                            $query->where(
                                'user_id',
                                $user->id
                            );

                            if (
                                !empty(
                                    $user->group_id
                                )
                            ) {

                                $query->orWhere(
                                    'group_id',
                                    $user->group_id
                                );
                            }
                        }
                    )
                    ->orderBy(
                        'scheduled_date',
                        'desc'
                    )
                    ->orderBy(
                        'scheduled_time',
                        'desc'
                    )
                    ->orderBy(
                        'id',
                        'desc'
                    )
                    ->first();
            }

            /*
            |--------------------------------------------------------------------------
            | 4. AUCUNE INTERVENTION TERMINÉE / VALIDÉE
            |--------------------------------------------------------------------------
            */

            if (!$currentIntervention) {

                $now =
                    Carbon::now(
                        config(
                            'app.timezone',
                            'Africa/Casablanca'
                        )
                    );

                $firstUpcoming =
                    Intervention::with([
                        'equipment',
                        'group',
                        'user',
                        'planningTemplate'
                    ])
                    ->whereIn('status', [
                        'en_attente',
                        'en_retard'
                    ])
                    ->where(
                        function ($query) use ($user) {

                            $query->where(
                                'user_id',
                                $user->id
                            );

                            if (
                                !empty(
                                    $user->group_id
                                )
                            ) {

                                $query->orWhere(
                                    'group_id',
                                    $user->group_id
                                );
                            }
                        }
                    )
                    ->orderBy(
                        'scheduled_date',
                        'asc'
                    )
                    ->orderBy(
                        'scheduled_time',
                        'asc'
                    )
                    ->orderBy(
                        'id',
                        'asc'
                    )
                    ->get()
                    ->filter(
                        function ($intervention) use ($now) {

                            $dateTime =
                                $intervention
                                    ->getScheduledDateTime();

                            return $dateTime
                                &&
                                $dateTime
                                    ->greaterThanOrEqualTo(
                                        $now
                                    );
                        }
                    )
                    ->first();

                if (!$firstUpcoming) {

                    return response()->json([
                        'success' => true,
                        'data' => null,
                        'message' =>
                            'Aucune prochaine intervention.'
                    ]);
                }

                $firstUpcoming =
                    $this->prepareInterventionForResponse(
                        $firstUpcoming
                    );

                $firstUpcoming->after_intervention_id =
                    null;

                $firstUpcoming->sequence_planning_id =
                    $firstUpcoming
                        ->planning_template_id;

                return response()->json([
                    'success' => true,
                    'data' => $firstUpcoming,
                    'message' =>
                        'Première intervention à venir.'
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | 5. DATE/HEURE DE L'INTERVENTION ACTUELLE
            |--------------------------------------------------------------------------
            */

            $currentDateTime =
                $currentIntervention
                    ->getScheduledDateTime();

            if (!$currentDateTime) {

                return response()->json([
                    'success' => true,
                    'data' => null,
                    'message' =>
                        'La date/heure de l\'intervention actuelle est invalide.'
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | 6. AFFECTATION ACTUELLE
            |--------------------------------------------------------------------------
            */

            $currentGroupId =
                $currentIntervention->group_id;

            $currentUserId =
                $currentIntervention->user_id;

            /*
            |--------------------------------------------------------------------------
            | 7. CHERCHER LES FUTURES INTERVENTIONS
            |--------------------------------------------------------------------------
            */

            $futureQuery =
                Intervention::with([
                    'equipment',
                    'group',
                    'user',
                    'planningTemplate'
                ])
                ->whereIn('status', [
                    'en_attente',
                    'en_retard'
                ]);

            /*
            |--------------------------------------------------------------------------
            | 8. PRIORITÉ AU GROUPE
            |--------------------------------------------------------------------------
            */

            if (!empty($currentGroupId)) {

                $futureQuery->where(
                    'group_id',
                    $currentGroupId
                );

            } elseif (!empty($currentUserId)) {

                /*
                |--------------------------------------------------------------------------
                | 9. SI PAS DE GROUPE :
                |    UTILISER L'AFFECTATION DIRECTE
                |--------------------------------------------------------------------------
                */

                $futureQuery->where(
                    'user_id',
                    $currentUserId
                );

            } else {

                /*
                |--------------------------------------------------------------------------
                | 10. DERNIER CAS :
                |     UTILISATEUR CONNECTÉ + SON GROUPE
                |--------------------------------------------------------------------------
                */

                $futureQuery->where(
                    function ($query) use ($user) {

                        $query->where(
                            'user_id',
                            $user->id
                        );

                        if (
                            !empty(
                                $user->group_id
                            )
                        ) {

                            $query->orWhere(
                                'group_id',
                                $user->group_id
                            );
                        }
                    }
                );
            }

            /*
            |--------------------------------------------------------------------------
            | 11. RÉCUPÉRER LES CANDIDATS
            |--------------------------------------------------------------------------
            */

            $futureInterventions =
                $futureQuery
                    ->orderBy(
                        'scheduled_date',
                        'asc'
                    )
                    ->orderBy(
                        'scheduled_time',
                        'asc'
                    )
                    ->orderBy(
                        'id',
                        'asc'
                    )
                    ->get();

            /*
            |--------------------------------------------------------------------------
            | 12. FILTRER PAR DATE/HEURE
            |--------------------------------------------------------------------------
            */

            $nextIntervention =
                $futureInterventions
                    ->filter(
                        function ($intervention) use (
                            $currentDateTime,
                            $currentIntervention
                        ) {

                            if (
                                (int) $intervention->id ===
                                (int) $currentIntervention->id
                            ) {
                                return false;
                            }

                            $scheduledDateTime =
                                $intervention
                                    ->getScheduledDateTime();

                            if (!$scheduledDateTime) {
                                return false;
                            }

                            return $scheduledDateTime
                                ->greaterThan(
                                    $currentDateTime
                                );
                        }
                    )
                    ->sortBy(
                        function ($intervention) {

                            $dateTime =
                                $intervention
                                    ->getScheduledDateTime();

                            if (!$dateTime) {
                                return PHP_INT_MAX;
                            }

                            return $dateTime->timestamp;
                        }
                    )
                    ->first();

            /*
            |--------------------------------------------------------------------------
            | 13. AUCUNE PROCHAINE INTERVENTION
            |--------------------------------------------------------------------------
            */

            if (!$nextIntervention) {

                return response()->json([
                    'success' => true,
                    'data' => null,
                    'message' =>
                        'Aucune prochaine intervention pour ce groupe.'
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | 14. PRÉPARER LA RÉPONSE
            |--------------------------------------------------------------------------
            */

            $nextIntervention =
                $this->prepareInterventionForResponse(
                    $nextIntervention
                );

            /*
            |--------------------------------------------------------------------------
            | 15. INFORMATIONS POUR LE FRONTEND
            |--------------------------------------------------------------------------
            */

            $nextIntervention->after_intervention_id =
                $currentIntervention->id;

            $nextIntervention->sequence_planning_id =
                $nextIntervention
                    ->planning_template_id;

            /*
            |--------------------------------------------------------------------------
            | 16. LOG COMPLET
            |--------------------------------------------------------------------------
            */

            Log::info(
                'PROCHAINE INTERVENTION',
                [

                    'user_id' =>
                        $user->id,

                    'current_intervention_id' =>
                        $currentIntervention->id,

                    'current_date_raw' =>
                        $currentIntervention
                            ->getRawOriginal(
                                'scheduled_date'
                            ),

                    'current_time_raw' =>
                        $currentIntervention
                            ->getRawOriginal(
                                'scheduled_time'
                            ),

                    'current_datetime' =>
                        $currentDateTime
                            ->toDateTimeString(),

                    'current_planning_template_id' =>
                        $currentIntervention
                            ->planning_template_id,

                    'current_group_id' =>
                        $currentGroupId,

                    'current_user_id' =>
                        $currentUserId,

                    'next_intervention_id' =>
                        $nextIntervention->id,

                    'next_date_raw' =>
                        $nextIntervention
                            ->getRawOriginal(
                                'scheduled_date'
                            ),

                    'next_time_raw' =>
                        $nextIntervention
                            ->getRawOriginal(
                                'scheduled_time'
                            ),

                    'next_group_id' =>
                        $nextIntervention->group_id,

                    'next_user_id' =>
                        $nextIntervention->user_id,

                    'next_planning_template_id' =>
                        $nextIntervention
                            ->planning_template_id,

                    'next_display_state' =>
                        $nextIntervention
                            ->display_state,

                    'next_available_at' =>
                        $nextIntervention
                            ->available_at,
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | 17. RETOUR
            |--------------------------------------------------------------------------
            */

            return response()->json([
                'success' => true,
                'data' => $nextIntervention,
                'message' =>
                    'Prochaine intervention trouvée.'
            ]);

        } catch (\Exception $e) {

            Log::error(
                'Erreur prochaine intervention : '
                . $e->getMessage(),
                [
                    'user_id' =>
                        $user?->id,

                    'after_intervention_id' =>
                        $request->input(
                            'after_intervention_id'
                        )
                ]
            );

            return response()->json([
                'success' => false,
                'data' => null,
                'message' =>
                    'Erreur lors de la recherche de la prochaine intervention.',
                'error' =>
                    $e->getMessage()
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | DÉMARRER UNE INTERVENTION
    |--------------------------------------------------------------------------
    */

    public function startIntervention($id)
    {
        $intervention =
            Intervention::with([
                'template',
                'planningTemplate'
            ])->findOrFail($id);

        $user = auth()->user();

        /*
        |--------------------------------------------------------------------------
        | VÉRIFIER LE RÔLE
        |--------------------------------------------------------------------------
        |
        | Seul l'intervenant / ATSEP peut démarrer une intervention.
        |
        */

        if ($user->role !== 'intervenant') {

            return response()->json([
                'success' => false,
                'message' =>
                    'Seul un intervenant / ATSEP peut démarrer une intervention.'
            ], 403);
        }

        /*
        |--------------------------------------------------------------------------
        | VÉRIFIER L'AFFECTATION
        |--------------------------------------------------------------------------
        */

        if (
            (int) $intervention->user_id !==
            (int) $user->id
            &&
            (
                empty($user->group_id)
                ||
                (int) $intervention->group_id !==
                (int) $user->group_id
            )
        ) {

            return response()->json([
                'message' =>
                    'Non autorisé'
            ], 403);
        }

        /*
        |--------------------------------------------------------------------------
        | VÉRIFIER LE STATUT
        |--------------------------------------------------------------------------
        */

        if (
            !in_array(
                $intervention->status,
                [
                    'en_attente',
                    'en_retard'
                ],
                true
            )
        ) {

            return response()->json([
                'message' =>
                    'Intervention déjà démarrée ou terminée'
            ], 400);
        }

        /*
        |--------------------------------------------------------------------------
        | VÉRIFIER DATE + HEURE
        |--------------------------------------------------------------------------
        */

        $scheduledDateTime =
            $intervention
                ->getScheduledDateTime();

        $now = Carbon::now(
            config(
                'app.timezone',
                'Africa/Casablanca'
            )
        );

        if (
            $scheduledDateTime
            &&
            $now->lt(
                $scheduledDateTime
            )
        ) {

            return response()->json([

                'message' =>
                    'Cette intervention n’est pas encore active.',

                'available_at' =>
                    $scheduledDateTime
                        ->toIso8601String()

            ], 422);
        }

        DB::beginTransaction();

        try {

            /*
            |--------------------------------------------------------------------------
            | DÉMARRAGE
            |--------------------------------------------------------------------------
            */

            $intervention->status =
                'en_cours';

            $intervention->started_at =
                $now;

            $intervention->save();

            /*
            |--------------------------------------------------------------------------
            | CRÉATION DU READING
            |--------------------------------------------------------------------------
            */

            if (
                !empty(
                    $intervention->template_id
                )
            ) {

                Reading::firstOrCreate(

                    [
                        'intervention_id' =>
                            $intervention->id,
                    ],

                    [
                        'equipment_id' =>
                            $intervention->equipment_id,

                        'template_id' =>
                            $intervention->template_id,

                        'values' =>
                            [],

                        'validation_status' =>
                            'brouillon',

                        'taken_by' =>
                            $user->id,

                        'taken_at' =>
                            $now,
                    ]
                );
            }

            DB::commit();

            /*
            |--------------------------------------------------------------------------
            | RECHARGER
            |--------------------------------------------------------------------------
            */

            $intervention->load([
                'equipment',
                'group',
                'user',
                'template',
                'planningTemplate',
                'readings'
            ]);

            $intervention =
                $this->prepareInterventionForResponse(
                    $intervention
                );

            return response()->json([

                'success' => true,

                'data' =>
                    $intervention,

                'message' =>
                    'Intervention démarrée avec succès'

            ]);

        } catch (\Exception $e) {

            DB::rollBack();

            Log::error(
                'Erreur démarrage intervention : '
                . $e->getMessage()
            );

            return response()->json([

                'success' => false,

                'message' =>
                    'Erreur lors du démarrage de l\'intervention',

                'error' =>
                    $e->getMessage()

            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | TERMINER UNE INTERVENTION
    |--------------------------------------------------------------------------
    */

    public function completeIntervention(
        Request $request,
        $id
    ) {

        $intervention =
            Intervention::findOrFail($id);

        $user = auth()->user();

        /*
        |--------------------------------------------------------------------------
        | VÉRIFIER LE RÔLE
        |--------------------------------------------------------------------------
        |
        | Seul l'intervenant / ATSEP peut finaliser une intervention.
        |
        */

        if ($user->role !== 'intervenant') {

            return response()->json([
                'success' => false,
                'message' =>
                    'Seul un intervenant / ATSEP peut finaliser une intervention.'
            ], 403);
        }

        /*
        |--------------------------------------------------------------------------
        | VÉRIFICATION AUTORISATION
        |--------------------------------------------------------------------------
        */

        if (
            (int) $intervention->user_id !==
            (int) $user->id
            &&
            (
                empty($user->group_id)
                ||
                (int) $intervention->group_id !==
                (int) $user->group_id
            )
        ) {

            return response()->json([
                'message' =>
                    'Non autorisé'
            ], 403);
        }

        /*
        |--------------------------------------------------------------------------
        | VÉRIFIER STATUT
        |--------------------------------------------------------------------------
        */

        if (
            $intervention->status !==
            'en_cours'
        ) {

            return response()->json([
                'message' =>
                    'L\'intervention n\'est pas en cours'
            ], 400);
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([

            'diagnostic' =>
                'nullable|string',

            'actions' =>
                'nullable|string',

            'observations' =>
                'nullable|string',

            'parts_used' =>
                'nullable|array',
        ]);

        /*
        |--------------------------------------------------------------------------
        | TERMINER
        |--------------------------------------------------------------------------
        */

        $intervention->update([

            'status' =>
                'terminee',

            'completed_at' =>
                now(),

            'diagnostic' =>
                $validated['diagnostic']
                ?? null,

            'actions' =>
                $validated['actions']
                ?? null,

            'observations' =>
                $validated['observations']
                ?? null,

            'parts_used' =>
                $validated['parts_used']
                ?? null,
        ]);

        /*
        |--------------------------------------------------------------------------
        | RECHARGER
        |--------------------------------------------------------------------------
        */

        $intervention->load([
            'equipment',
            'group',
            'user',
            'template',
            'planningTemplate',
            'readings'
        ]);

        $intervention =
            $this->prepareInterventionForResponse(
                $intervention
            );

        return response()->json([

            'success' => true,

            'data' =>
                $intervention,

            'message' =>
                'Intervention terminée'
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | SOUMETTRE LE RELEVÉ
    |--------------------------------------------------------------------------
    */

    public function submitReadings(
        Request $request,
        $id
    ) {

        $intervention =
            Intervention::with([
                'template'
            ])->findOrFail($id);

        $user = auth()->user();

        /*
        |--------------------------------------------------------------------------
        | VÉRIFIER LE RÔLE
        |--------------------------------------------------------------------------
        |
        | Seul l'intervenant / ATSEP peut saisir un relevé.
        |
        */

        if ($user->role !== 'intervenant') {

            return response()->json([
                'success' => false,
                'message' =>
                    'Seul un intervenant / ATSEP peut saisir un relevé.'
            ], 403);
        }

        /*
        |--------------------------------------------------------------------------
        | VÉRIFIER UTILISATEUR
        |--------------------------------------------------------------------------
        */

        if (
            (int) $intervention->user_id !==
            (int) $user->id
            &&
            (
                empty($user->group_id)
                ||
                (int) $intervention->group_id !==
                (int) $user->group_id
            )
        ) {

            return response()->json([
                'message' =>
                    'Non autorisé'
            ], 403);
        }

        /*
        |--------------------------------------------------------------------------
        | SEULEMENT EN COURS
        |--------------------------------------------------------------------------
        */

        if (
            $intervention->status !==
            'en_cours'
        ) {

            return response()->json([

                'message' =>
                    'La saisie du relevé n\'est autorisée que pendant une intervention en cours.'

            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | TEMPLATE
        |--------------------------------------------------------------------------
        */

        if (
            empty(
                $intervention->template_id
            )
        ) {

            return response()->json([

                'message' =>
                    'Aucun relevé n\'est associé à cette intervention.'

            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([

            'values' =>
                'required|array',

            'commentaire' =>
                'nullable|string',
        ]);

        DB::beginTransaction();

        try {

            /*
            |--------------------------------------------------------------------------
            | READING EXISTANT
            |--------------------------------------------------------------------------
            */

            $reading =
                Reading::where(
                    'intervention_id',
                    $intervention->id
                )->first();

            /*
            |--------------------------------------------------------------------------
            | CRÉER
            |--------------------------------------------------------------------------
            */

            if (!$reading) {

                $reading = Reading::create([

                    'equipment_id' =>
                        $intervention->equipment_id,

                    'template_id' =>
                        $intervention->template_id,

                    'intervention_id' =>
                        $intervention->id,

                    'values' =>
                        $validated['values'],

                    'commentaire' =>
                        $validated['commentaire']
                        ?? null,

                    'validation_status' =>
                        'en_attente',

                    'taken_by' =>
                        $user->id,

                    'taken_at' =>
                        now(),
                ]);

            } else {

                /*
                |--------------------------------------------------------------------------
                | METTRE À JOUR
                |--------------------------------------------------------------------------
                */

                $reading->update([

                    'values' =>
                        $validated['values'],

                    'commentaire' =>
                        $validated['commentaire']
                        ?? null,

                    'validation_status' =>
                        'en_attente',

                    'taken_by' =>
                        $user->id,

                    'taken_at' =>
                        $reading->taken_at
                        ?? now(),
                ]);
            }

            DB::commit();

            return response()->json([

                'success' => true,

                'data' =>
                    $reading,

                'message' =>
                    'Relevé soumis avec succès pour validation'

            ]);

        } catch (\Exception $e) {

            DB::rollBack();

            Log::error(
                'Erreur soumission relevé : '
                . $e->getMessage()
            );

            return response()->json([

                'success' => false,

                'message' =>
                    'Erreur lors de la soumission du relevé',

                'error' =>
                    $e->getMessage()

            ], 500);
        }
    }
}