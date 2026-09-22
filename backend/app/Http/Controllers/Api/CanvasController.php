<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\EquipmentReadingTemplate;
use App\Models\Intervention;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CanvasController extends Controller
{
    /**
     * Liste des canvas actifs
     */
    public function index()
    {
        $canvases = EquipmentReadingTemplate::with([
            'equipment',
            'createdBy',
        ])
            ->where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $canvases,
            'message' => 'Liste des canvas',
        ]);
    }

    /**
     * Créer un canvas
     */
    public function store(Request $request)
    {
        $validator = Validator::make(
            $request->all(),
            [
                'equipment_id' =>
                    'required|exists:equipments,id',

                'template_name' =>
                    'required|string|max:255',

                'template_type' =>
                    'required|string|max:100',

                'header' =>
                    'nullable|array',

                'frequency' =>
                    'required|string|max:100',

                'parameters' =>
                    'required|array|min:1',

                'signatures' =>
                    'nullable|array',

                'annexes' =>
                    'nullable|array',
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
            ], 422);
        }

        $canvas = EquipmentReadingTemplate::create([
            'equipment_id' =>
                $request->equipment_id,

            'template_name' =>
                $request->template_name,

            'template_type' =>
                $request->template_type,

            'header' =>
                $request->header ?? [],

            'frequency' =>
                $request->frequency,

            'parameters' =>
                $request->parameters,

            'signatures' =>
                $request->signatures ?? [],

            'annexes' =>
                $request->annexes ?? [],

            'created_by' =>
                auth()->id(),

            'is_active' =>
                true,
        ]);

        ActivityLog::create([
            'user_id' => auth()->id(),

            'action' =>
                'Création de canvas de relevé',

            'details' => json_encode([
                'canvas_id' =>
                    $canvas->id,

                'name' =>
                    $canvas->template_name,

                'equipment_id' =>
                    $canvas->equipment_id,
            ]),

            'ip_address' =>
                $request->ip(),
        ]);

        $canvas->load([
            'equipment',
            'createdBy',
        ]);

        return response()->json([
            'data' => $canvas,
            'message' =>
                'Canvas créé avec succès',
        ], 201);
    }

    /**
     * Afficher un canvas
     */
    public function show($id)
    {
        $canvas = EquipmentReadingTemplate::with([
            'equipment',
            'createdBy',
        ])->findOrFail($id);

        return response()->json([
            'data' => $canvas,
        ]);
    }

    /**
     * Modifier un canvas
     */
    public function update(Request $request, $id)
    {
        $canvas =
            EquipmentReadingTemplate::findOrFail($id);

        $validator = Validator::make(
            $request->all(),
            [
                'template_name' =>
                    'sometimes|string|max:255',

                'template_type' =>
                    'sometimes|string|max:100',

                'header' =>
                    'sometimes|nullable|array',

                'frequency' =>
                    'sometimes|string|max:100',

                'parameters' =>
                    'sometimes|array|min:1',

                'signatures' =>
                    'sometimes|nullable|array',

                'annexes' =>
                    'sometimes|nullable|array',

                'is_active' =>
                    'sometimes|boolean',
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->only([
            'template_name',
            'template_type',
            'header',
            'frequency',
            'parameters',
            'signatures',
            'annexes',
            'is_active',
        ]);

        $canvas->update($data);

        ActivityLog::create([
            'user_id' => auth()->id(),

            'action' =>
                'Modification de canvas',

            'details' => json_encode([
                'canvas_id' =>
                    $canvas->id,
            ]),

            'ip_address' =>
                $request->ip(),
        ]);

        $canvas->load([
            'equipment',
            'createdBy',
        ]);

        return response()->json([
            'data' => $canvas,

            'message' =>
                'Canvas mis à jour avec succès',
        ]);
    }

    /**
     * Désactiver un canvas
     */
    public function destroy($id)
    {
        $canvas =
            EquipmentReadingTemplate::findOrFail($id);

        $canvas->is_active = false;
        $canvas->save();

        ActivityLog::create([
            'user_id' => auth()->id(),

            'action' =>
                'Suppression de canvas',

            'details' => json_encode([
                'canvas_id' =>
                    $canvas->id,
            ]),

            'ip_address' =>
                request()->ip(),
        ]);

        return response()->json([
            'message' =>
                'Canvas supprimé avec succès',
        ]);
    }

    /**
     * Assigner un canvas à une intervention
     */
    public function assignToIntervention(
        Request $request,
        $id
    ) {
        $canvas =
            EquipmentReadingTemplate::findOrFail($id);

        if (!$canvas->is_active) {
            return response()->json([
                'message' =>
                    'Ce canvas est désactivé.',
            ], 422);
        }

        $validator = Validator::make(
            $request->all(),
            [
                'intervention_id' =>
                    'required|exists:interventions,id',
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'errors' =>
                    $validator->errors(),
            ], 422);
        }

        $intervention =
            Intervention::with('equipment')
                ->findOrFail(
                    $request->intervention_id
                );

        /*
         * Le Canvas est enregistré dans
         * interventions.template_id
         */
        $intervention->template_id =
            $canvas->id;

        $intervention->save();

        /*
         * Notification de l'intervenant
         */
        if ($intervention->user_id) {
            Notification::create([
                'user_id' =>
                    $intervention->user_id,

                'title' =>
                    'Canvas de relevé assigné',

                'message' =>
                    'Un canvas de relevé a été assigné à votre intervention.',

                'type' =>
                    'canvas_assigne',

                'related_id' =>
                    $canvas->id,
            ]);
        }

        ActivityLog::create([
            'user_id' =>
                auth()->id(),

            'action' =>
                'Assignation de canvas à intervention',

            'details' => json_encode([
                'canvas_id' =>
                    $canvas->id,

                'intervention_id' =>
                    $intervention->id,
            ]),

            'ip_address' =>
                $request->ip(),
        ]);

        return response()->json([
            'message' =>
                'Canvas assigné à l’intervention avec succès',

            'data' => [
                'canvas_id' =>
                    $canvas->id,

                'intervention_id' =>
                    $intervention->id,
            ],
        ]);
    }
}