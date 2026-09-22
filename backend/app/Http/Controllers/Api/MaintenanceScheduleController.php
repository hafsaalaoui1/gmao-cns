<?php

namespace App\Http\Controllers\Api;

use App\Models\MaintenanceSchedule;
use App\Models\Equipment;
use App\Models\Intervention;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class MaintenanceScheduleController extends Controller
{
    /**
     * Récupérer le planning complet avec les interventions de la semaine
     */
    public function getWeeklyPlanning(Request $request)
    {
        $weekStart = $request->get('week_start', now()->startOfWeek()->toDateString());
        $weekEnd = now()->parse($weekStart)->endOfWeek()->toDateString();

        // 1. Récupérer tous les équipements
        $equipments = Equipment::select('id', 'name', 'type')->get();

        // 2. Récupérer le planning préventif (maintenance_schedules)
        $schedules = MaintenanceSchedule::all()->groupBy('equipment_id');

        // 3. Récupérer les interventions de la semaine
        $interventions = Intervention::whereBetween('scheduled_date', [$weekStart, $weekEnd])
            ->with('group')
            ->get()
            ->groupBy('equipment_id');

        // 4. Construire la grille
        $days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        $weekDates = [];
        $current = now()->parse($weekStart);
        for ($i = 0; $i < 7; $i++) {
            $weekDates[$days[$i]] = $current->copy()->addDays($i)->toDateString();
        }

        $planning = $equipments->map(function ($equipment) use ($schedules, $interventions, $weekDates) {
            $equipSchedules = $schedules->get($equipment->id, collect());
            $equipInterventions = $interventions->get($equipment->id, collect());

            $weekPlan = [];
            foreach ($weekDates as $dayName => $date) {
                // Vérifier si l'équipement est prévu ce jour-là
                $scheduled = $equipSchedules->firstWhere('day_of_week', $dayName);
                if ($scheduled) {
                    // Vérifier si une intervention existe déjà
                    $intervention = $equipInterventions->firstWhere('scheduled_date', $date);
                    $weekPlan[$dayName] = [
                        'scheduled' => true,
                        'intervention' => $intervention ? [
                            'id' => $intervention->id,
                            'status' => $intervention->status,
                            'priority' => $intervention->priority,
                            'group_name' => $intervention->group?->name,
                            'time' => $intervention->scheduled_time,
                        ] : null,
                        'date' => $date,
                    ];
                } else {
                    $weekPlan[$dayName] = [
                        'scheduled' => false,
                        'intervention' => null,
                        'date' => $date,
                    ];
                }
            }

            return [
                'id' => $equipment->id,
                'name' => $equipment->name,
                'type' => $equipment->type,
                'week' => $weekPlan,
            ];
        });

        return response()->json([
            'week_start' => $weekStart,
            'week_end' => $weekEnd,
            'planning' => $planning,
        ]);
    }
}