<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\Group;
use App\Models\Intervention;
use App\Models\Reading;
use App\Models\Ticket;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    // ============================================================
    // DASHBOARD PRINCIPAL
    // ============================================================

    public function stats(Request $request)
    {
        $user = $request->user();

        switch ($user->role) {
            case 'admin':
                return $this->adminStats();

            case 'responsable':
                return $this->responsableStats();

            case 'intervenant':
                return $this->intervenantStats($user);

            default:
                return response()->json([
                    'message' => 'Rôle non reconnu'
                ], 403);
        }
    }

    // ============================================================
    // STATISTIQUES ADMIN
    // ============================================================

    public function adminStats()
    {
        // Mettre automatiquement les interventions en retard
        $this->updateLateInterventions();

        return response()->json([
            'total_users' => User::count(),
            'active_users' => User::where('is_active', true)->count(),

            'total_admins' => User::where('role', 'admin')->count(),
            'total_responsables' => User::where('role', 'responsable')->count(),
            'total_intervenants' => User::where('role', 'intervenant')->count(),

            'total_groups' => Group::count(),
            'total_equipments' => Equipment::count(),
            'total_interventions' => Intervention::count(),

            // Un ticket représente une maintenance corrective
            'total_tickets' => Ticket::count(),

            'pending_interventions' => Intervention::whereIn(
                'status',
                ['en_attente', 'planifiee']
            )->count(),

            'open_tickets' => Ticket::whereNotIn(
                'status',
                ['resolu', 'cloture']
            )->count(),

            'pending_readings' => Reading::where(
                'validation_status',
                'en_attente'
            )->count(),

            'late_interventions' => Intervention::where(
                'status',
                'en_retard'
            )->count(),
        ]);
    }

    // ============================================================
    // STATISTIQUES RESPONSABLE
    // ============================================================

    private function responsableStats()
    {
        // Mettre automatiquement les interventions en retard
        $this->updateLateInterventions();

        $today = today();

        // --------------------------------------------------------
        // ÉQUIPEMENTS
        // --------------------------------------------------------

        $totalEquipments = Equipment::count();

        $operationalEquipments = Equipment::where(
            'status',
            'operationnel'
        )->count();

        $faultyEquipments = Equipment::where(
            'status',
            'en_panne'
        )->count();

        // --------------------------------------------------------
        // INTERVENTIONS PLANIFIÉES
        // --------------------------------------------------------

        $plannedInterventions = Intervention::whereIn(
            'status',
            ['en_attente', 'planifiee']
        )->count();

        // --------------------------------------------------------
        // INTERVENTIONS EN COURS
        // --------------------------------------------------------

        $inProgressInterventions = Intervention::where(
            'status',
            'en_cours'
        )->count();

        // --------------------------------------------------------
        // INTERVENTIONS TERMINÉES
        // --------------------------------------------------------

        $completedInterventions = Intervention::whereIn(
            'status',
            ['terminee', 'validee', 'cloturee']
        )->count();

        // --------------------------------------------------------
        // INTERVENTIONS À VENIR
        // --------------------------------------------------------

        $upcomingInterventions = Intervention::where(function ($query) use ($today) {

            $query->whereDate(
                'scheduled_date',
                '>',
                $today
            );

            $query->orWhere(function ($q) use ($today) {

                $q->whereDate(
                    'scheduled_date',
                    $today
                );

                $q->where(function ($timeQuery) {

                    $timeQuery
                        ->whereNull('scheduled_time')
                        ->orWhere(
                            'scheduled_time',
                            '>=',
                            now()->format('H:i:s')
                        );
                });
            });

        })
        ->whereNotIn(
            'status',
            [
                'terminee',
                'validee',
                'cloturee',
                'annulee',
                'en_retard'
            ]
        )
        ->count();

        // --------------------------------------------------------
        // INTERVENTIONS EN RETARD
        // --------------------------------------------------------

        $lateInterventions = Intervention::where('status', 'en_retard')
    ->whereDate('scheduled_date', today())
    ->count();

        // --------------------------------------------------------
        // INTERVENTIONS URGENTES
        // --------------------------------------------------------

        $urgentInterventions = Intervention::whereIn(
            'priority',
            ['urgente']
        )
        ->whereNotIn(
            'status',
            [
                'terminee',
                'validee',
                'cloturee',
                'annulee'
            ]
        )
        ->count();

        // --------------------------------------------------------
        // TICKETS OUVERTS
        // --------------------------------------------------------

        $openTickets = Ticket::whereNotIn(
            'status',
            ['resolu', 'cloture']
        )->count();

        // --------------------------------------------------------
        // TICKETS CRITIQUES
        // --------------------------------------------------------

        $criticalTickets = Ticket::whereIn(
            'priority',
            ['urgente', 'élevée', 'elevee']
        )
        ->whereNotIn(
            'status',
            ['resolu', 'cloture']
        )
        ->count();

        // --------------------------------------------------------
        // TICKETS EN ATTENTE
        // --------------------------------------------------------

        $pendingTickets = Ticket::whereIn(
            'status',
            ['nouveau', 'assigne', 'en_attente']
        )->count();

        // --------------------------------------------------------
        // TICKETS RÉSOLUS
        // --------------------------------------------------------

        $resolvedTickets = Ticket::whereIn(
            'status',
            ['resolu', 'cloture']
        )->count();

        // --------------------------------------------------------
        // RELEVÉS À VALIDER
        // --------------------------------------------------------

        $readingsToValidate = Reading::where(
            'validation_status',
            'en_attente'
        )->count();

        return response()->json([
            'total_equipments' => $totalEquipments,

            'operational_equipments' => $operationalEquipments,

            'faulty_equipments' => $faultyEquipments,

            'planned_interventions' => $plannedInterventions,

            'in_progress_interventions' => $inProgressInterventions,

            'completed_interventions' => $completedInterventions,

            'upcoming_interventions' => $upcomingInterventions,

            'late_interventions' => $lateInterventions,

            'urgent_interventions' => $urgentInterventions,

            'open_tickets' => $openTickets,

            'critical_tickets' => $criticalTickets,

            'pending_tickets' => $pendingTickets,

            'resolved_tickets' => $resolvedTickets,

            'readings_to_validate' => $readingsToValidate,
        ]);
    }

    // ============================================================
    // METTRE À JOUR LES INTERVENTIONS EN RETARD
    // ============================================================

    private function updateLateInterventions()
    {
        $now = Carbon::now();

        $interventions = Intervention::where(
            'status',
            'en_attente'
        )
        ->whereNotNull('scheduled_date')
        ->whereNotNull('scheduled_time')
        ->get();

        foreach ($interventions as $intervention) {

            $scheduledDateTime = $intervention->getScheduledDateTime();

            if (
                $scheduledDateTime &&
                $scheduledDateTime->lessThanOrEqualTo($now)
            ) {
                $intervention->update([
                    'status' => 'en_retard'
                ]);
            }
        }
    }

    // ============================================================
    // STATISTIQUES INTERVENANT
    // ============================================================

    private function intervenantStats($user)
    {
        $interventions = Intervention::where(function ($query) use ($user) {

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

        });

        $today = (clone $interventions)
            ->whereDate(
                'scheduled_date',
                today()
            )
            ->count();

        $upcoming = (clone $interventions)
            ->where(function ($query) {

                $query->whereDate(
                    'scheduled_date',
                    '>',
                    today()
                );

                $query->orWhere(function ($q) {

                    $q->whereDate(
                        'scheduled_date',
                        today()
                    );

                    $q->where(function ($timeQuery) {

                        $timeQuery
                            ->whereNull('scheduled_time')
                            ->orWhere(
                                'scheduled_time',
                                '>=',
                                now()->format('H:i:s')
                            );
                    });
                });

            })
            ->whereNotIn(
                'status',
                [
                    'terminee',
                    'validee',
                    'cloturee',
                    'annulee'
                ]
            )
            ->count();

        $completed = (clone $interventions)
            ->whereIn(
                'status',
                [
                    'terminee',
                    'validee',
                    'cloturee'
                ]
            )
            ->count();

        $openTickets = Ticket::where(
            'assigned_to',
            $user->id
        )
        ->whereNotIn(
            'status',
            ['cloture']
        )
        ->count();

        return response()->json([
            'my_interventions_today' => $today,

            'my_interventions_upcoming' => $upcoming,

            'my_interventions_completed' => $completed,

            'my_open_tickets' => $openTickets,
        ]);
    }

    // ============================================================
    // KPI
    // ============================================================

    public function kpi()
    {
        // --------------------------------------------------------
        // MAINTENANCE PRÉVENTIVE
        // --------------------------------------------------------

        $preventive = Intervention::where(
            'type',
            'preventive'
        )->count();

        // --------------------------------------------------------
        // MAINTENANCE CORRECTIVE
        //
        // Dans cette application :
        // 1 ticket = 1 maintenance corrective
        // --------------------------------------------------------

        $corrective = Ticket::count();

        // Total des maintenances
        //
        // Préventive = interventions préventives
        // Corrective = tickets
        //
        $totalMaintenance = $preventive + $corrective;

        // --------------------------------------------------------
        // TICKETS
        // --------------------------------------------------------

        $totalTickets = Ticket::count();

        $resolvedTickets = Ticket::whereIn(
            'status',
            ['resolu', 'cloture']
        )->count();

        // --------------------------------------------------------
        // DISPONIBILITÉ DES ÉQUIPEMENTS
        // --------------------------------------------------------

        $operational = Equipment::where(
            'status',
            'operationnel'
        )->count();

        $totalEquipment = Equipment::count();

        return response()->json([

            // Temps moyen de réparation
            'mttr' => $this->calculateMTTR(),

            // Temps moyen entre pannes
            'mtbf' => $this->calculateMTBF(),

            // ----------------------------------------------------
            // TAUX DE MAINTENANCE PRÉVENTIVE
            // ----------------------------------------------------

            'preventive_rate' => $totalMaintenance > 0
                ? round(
                    ($preventive / $totalMaintenance) * 100,
                    2
                )
                : 0,

            // ----------------------------------------------------
            // TAUX DE MAINTENANCE CORRECTIVE
            //
            // Corrective = Tickets
            // ----------------------------------------------------

            'corrective_rate' => $totalMaintenance > 0
                ? round(
                    ($corrective / $totalMaintenance) * 100,
                    2
                )
                : 0,

            // ----------------------------------------------------
            // TAUX DE RÉSOLUTION DES TICKETS
            // ----------------------------------------------------

            'resolution_rate' => $totalTickets > 0
                ? round(
                    ($resolvedTickets / $totalTickets) * 100,
                    2
                )
                : 0,

            // ----------------------------------------------------
            // DISPONIBILITÉ
            // ----------------------------------------------------

            'availability_rate' => $totalEquipment > 0
                ? round(
                    ($operational / $totalEquipment) * 100,
                    2
                )
                : 0,
        ]);
    }

    // ============================================================
    // MTTR
    // ============================================================

    private function calculateMTTR()
    {
        $interventions = Intervention::whereIn(
            'status',
            [
                'terminee',
                'validee',
                'cloturee'
            ]
        )
        ->whereNotNull('duration')
        ->get();

        if ($interventions->isEmpty()) {
            return 0;
        }

        $totalMinutes = $interventions->sum('duration');

        return round(
            $totalMinutes /
            $interventions->count() /
            60,
            2
        );
    }

    // ============================================================
    // MTBF
    // ============================================================

    private function calculateMTBF()
    {
        // Les pannes sont représentées par les tickets
        $tickets = Ticket::whereIn(
            'status',
            ['resolu', 'cloture']
        )
        ->whereNotNull('resolution_date')
        ->whereNotNull('declared_date')
        ->get();

        if ($tickets->count() < 2) {
            return 0;
        }

        $dates = $tickets
            ->map(function ($ticket) {

                return Carbon::parse(
                    $ticket->declared_date
                );

            })
            ->sort()
            ->values();

        $intervals = [];

        for (
            $i = 1;
            $i < $dates->count();
            $i++
        ) {

            $interval = $dates[$i]
                ->diffInDays($dates[$i - 1]);

            if ($interval > 0) {
                $intervals[] = $interval;
            }
        }

        if (empty($intervals)) {
            return 0;
        }

        return round(
            array_sum($intervals) /
            count($intervals),
            2
        );
    }

    // ============================================================
    // CHARTS
    // ============================================================

    public function charts()
    {
        return response()->json([
            'interventions_by_month' =>
                $this->getInterventionsByMonth(),

            'failures_by_equipment' =>
                $this->getFailuresByEquipment(),

            'type_distribution' =>
                $this->getTypeDistribution(),
        ]);
    }

    // ============================================================
    // INTERVENTIONS / MAINTENANCES PAR MOIS
    //
    // Préventif = Intervention
    // Correctif = Ticket
    // ============================================================

    private function getInterventionsByMonth()
    {
        $months = [];

        $now = now();

        for ($i = 11; $i >= 0; $i--) {

            $date = $now->copy()->subMonths($i);

            // -----------------------------------------------
            // MAINTENANCE PRÉVENTIVE
            // -----------------------------------------------

            $preventive = Intervention::where(
                'type',
                'preventive'
            )
            ->whereYear(
                'scheduled_date',
                $date->year
            )
            ->whereMonth(
                'scheduled_date',
                $date->month
            )
            ->count();

            // -----------------------------------------------
            // MAINTENANCE CORRECTIVE
            // = TICKETS
            // -----------------------------------------------

            $corrective = Ticket::whereYear(
                'declared_date',
                $date->year
            )
            ->whereMonth(
                'declared_date',
                $date->month
            )
            ->count();

            $months[] = [
                'month' => $date->format('M Y'),

                'preventive' => $preventive,

                'corrective' => $corrective,
            ];
        }

        return $months;
    }

    // ============================================================
    // PANNES PAR ÉQUIPEMENT
    //
    // Une panne déclarée = un ticket
    // ============================================================

    private function getFailuresByEquipment()
    {
        return Ticket::select(
            'equipment_id',
            DB::raw('COUNT(*) as total')
        )
        ->with('equipment')
        ->groupBy('equipment_id')
        ->orderByDesc('total')
        ->limit(10)
        ->get()
        ->map(function ($item) {

            return [
                'name' => $item->equipment
                    ? $item->equipment->name
                    : 'Inconnu',

                'value' => (int) $item->total,
            ];

        })
        ->values();
    }

    // ============================================================
    // RÉPARTITION PRÉVENTIF / CORRECTIF
    //
    // IMPORTANT :
    //
    // Préventif = nombre d'interventions préventives
    // Correctif = nombre de tickets
    // ============================================================

    private function getTypeDistribution()
    {
        // Maintenance préventive
        $preventive = Intervention::where(
            'type',
            'preventive'
        )->count();

        // Maintenance corrective
        // Un ticket = une maintenance corrective
        $corrective = Ticket::count();

        return collect([

            [
                'type' => 'Préventif',
                'count' => (int) $preventive,
            ],

            [
                'type' => 'Correctif',
                'count' => (int) $corrective,
            ],

        ]);
    }

    // ============================================================
    // INTERVENTIONS DU JOUR
    // ============================================================

    public function todayInterventions(Request $request)
    {
        // Mettre automatiquement les interventions en retard
        $this->updateLateInterventions();

        $user = $request->user();

        $query = Intervention::with([
            'equipment',
            'group',
            'user',
            'template'
        ])
        ->whereDate(
            'scheduled_date',
            today()
        );

        if ($user->role === 'intervenant') {

            $query->where(function ($q) use ($user) {

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

            });
        }

        $interventions = $query
            ->orderBy(
                'scheduled_time',
                'asc'
            )
            ->get()
            ->map(function ($intervention) {

                return [
                    'id' => $intervention->id,

                    'time' => $intervention->scheduled_time,

                    'equipment' => $intervention->equipment
                        ? $intervention->equipment->name
                        : 'N/A',

                    'type' => $intervention->type,

                    'group' => $intervention->group
                        ? $intervention->group->name
                        : 'Non affecté',

                    'technician' => $intervention->user
                        ? $intervention->user->name
                        : 'Non affecté',

                    'status' => $intervention->status,

                    'priority' => $intervention->priority,

                    'scheduled_date' =>
                        $intervention->scheduled_date,

                    'duration' =>
                        $intervention->duration,
                ];
            });

        return response()->json(
            $interventions
        );
    }

    // ============================================================
    // ACTIVITÉS RÉCENTES
    // ============================================================

    public function recentActivities()
    {
        $activities = collect();

        // --------------------------------------------------------
        // INTERVENTIONS TERMINÉES
        // --------------------------------------------------------

        $completed = Intervention::with([
            'equipment',
            'user'
        ])
        ->whereIn(
            'status',
            [
                'terminee',
                'validee',
                'cloturee'
            ]
        )
        ->latest('updated_at')
        ->limit(5)
        ->get()
        ->map(function ($intervention) {

            $equipmentName = $intervention->equipment
                ? $intervention->equipment->name
                : 'équipement inconnu';

            return [

                'message' => $intervention->user

                    ? "{$intervention->user->name} a terminé l'intervention sur {$equipmentName}"

                    : "Intervention terminée sur {$equipmentName}",

                'time' => $intervention->updated_at
                    ? $intervention->updated_at->diffForHumans()
                    : '',

                'type' => 'intervention',

                '_timestamp' =>
                    $intervention->updated_at,
            ];
        });

        // --------------------------------------------------------
        // TICKETS
        // --------------------------------------------------------

        $tickets = Ticket::with([
            'equipment',
            'declaredBy'
        ])
        ->latest('created_at')
        ->limit(5)
        ->get()
        ->map(function ($ticket) {

            $equipmentName = $ticket->equipment
                ? $ticket->equipment->name
                : 'équipement inconnu';

            return [

                'message' => $ticket->declaredBy

                    ? "Nouveau ticket de {$ticket->declaredBy->name} sur {$equipmentName}"

                    : "Nouveau ticket sur {$equipmentName}",

                'time' => $ticket->created_at
                    ? $ticket->created_at->diffForHumans()
                    : '',

                'type' => 'ticket',

                '_timestamp' =>
                    $ticket->created_at,
            ];
        });

        // --------------------------------------------------------
        // RELEVÉS
        // --------------------------------------------------------

        $readings = Reading::with([
            'equipment',
            'takenBy'
        ])
        ->where(
            'validation_status',
            'en_attente'
        )
        ->latest('created_at')
        ->limit(5)
        ->get()
        ->map(function ($reading) {

            $equipmentName = $reading->equipment
                ? $reading->equipment->name
                : 'équipement inconnu';

            return [

                'message' => $reading->takenBy

                    ? "{$reading->takenBy->name} a soumis un relevé pour {$equipmentName}"

                    : "Relevé soumis pour {$equipmentName}",

                'time' => $reading->created_at
                    ? $reading->created_at->diffForHumans()
                    : '',

                'type' => 'reading',

                '_timestamp' =>
                    $reading->created_at,
            ];
        });

        // --------------------------------------------------------
        // FUSION DES ACTIVITÉS
        // --------------------------------------------------------

        $activities = $completed
            ->merge($tickets)
            ->merge($readings)
            ->sortByDesc('_timestamp')
            ->take(15)
            ->values()
            ->map(function ($item) {

                unset($item['_timestamp']);

                return $item;
            });

        return response()->json(
            $activities
        );
    }

    // ============================================================
    // STATISTIQUES ADMIN COMPLÈTES
    // ============================================================

    public function adminFullStats(Request $request)
    {
        return response()->json([

            'users' =>
                $this->adminStats()->getData(),

            'equipments' =>
                $this->responsableStats()->getData(),

            'kpi' =>
                $this->kpi()->getData(),

            'charts' =>
                $this->charts()->getData(),

            'today' =>
                $this->todayInterventions($request)->getData(),

            'activities' =>
                $this->recentActivities()->getData(),
        ]);
    }
}