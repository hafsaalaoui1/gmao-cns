<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlanningException;
use App\Models\PlanningTemplate;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PlanningExceptionController extends Controller
{
    /**
     * Liste toutes les exceptions de planning.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PlanningException::with([
            'template.equipment',
            'template.group',
            'template.rotation',
            'groupOverride',
        ]);

        // Filtrer par template si demandé
        if ($request->filled('planning_template_id')) {
            $query->where(
                'planning_template_id',
                $request->planning_template_id
            );
        }

        // Filtrer par date si demandée
        if ($request->filled('exception_date')) {
            $query->whereDate(
                'exception_date',
                $request->exception_date
            );
        }

        $exceptions = $query
            ->orderBy('exception_date', 'asc')
            ->get();

        return response()->json($exceptions);
    }

    /**
     * Créer une nouvelle exception.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'planning_template_id' => [
                'required',
                'integer',
                'exists:planning_templates,id',
            ],

            'exception_date' => [
                'required',
                'date',
            ],

            'group_id_override' => [
                'nullable',
                'integer',
                'exists:groups,id',
            ],

            'status_override' => [
                'nullable',
                'string',
                'max:50',
            ],

            'reason' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        // Vérifier que le template existe
        $template = PlanningTemplate::findOrFail(
            $validated['planning_template_id']
        );

        // Vérifier qu'une exception n'existe pas déjà
        // pour le même template et la même date.
        $existing = PlanningException::where(
            'planning_template_id',
            $validated['planning_template_id']
        )
            ->whereDate(
                'exception_date',
                $validated['exception_date']
            )
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Une exception existe déjà pour ce planning à cette date.',
                'exception' => $existing,
            ], 422);
        }

        // Si un groupe est fourni, vérifier qu'il existe
        if (!empty($validated['group_id_override'])) {
            Group::findOrFail(
                $validated['group_id_override']
            );
        }

        $exception = PlanningException::create($validated);

        $exception->load([
            'template.equipment',
            
            'template.rotation',
            'groupOverride',
        ]);

        return response()->json([
            'message' => 'Exception de planning créée avec succès.',
            'exception' => $exception,
        ], 201);
    }

    /**
     * Afficher une exception précise.
     */
    public function show(PlanningException $planningException): JsonResponse
    {
        $planningException->load([
            'template.equipment',
            'template.group',
            'template.rotation',
            'groupOverride',
        ]);

        return response()->json($planningException);
    }

    /**
     * Modifier une exception.
     */
    public function update(
        Request $request,
        PlanningException $planningException
    ): JsonResponse {
        $validated = $request->validate([
            'planning_template_id' => [
                'sometimes',
                'integer',
                'exists:planning_templates,id',
            ],

            'exception_date' => [
                'sometimes',
                'date',
            ],

            'group_id_override' => [
                'nullable',
                'integer',
                'exists:groups,id',
            ],

            'status_override' => [
                'nullable',
                'string',
                'max:50',
            ],

            'reason' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $templateId = $validated['planning_template_id']
            ?? $planningException->planning_template_id;

        $exceptionDate = $validated['exception_date']
            ?? $planningException->exception_date;

        // Éviter les doublons
        $duplicate = PlanningException::where(
            'planning_template_id',
            $templateId
        )
            ->whereDate(
                'exception_date',
                $exceptionDate
            )
            ->where(
                'id',
                '!=',
                $planningException->id
            )
            ->exists();

        if ($duplicate) {
            return response()->json([
                'message' => 'Une autre exception existe déjà pour ce planning à cette date.',
            ], 422);
        }

        $planningException->update($validated);

        $planningException->load([
            'template.equipment',
            'template.group',
            'template.rotation',
            'groupOverride',
        ]);

        return response()->json([
            'message' => 'Exception de planning mise à jour avec succès.',
            'exception' => $planningException,
        ]);
    }

    /**
     * Supprimer une exception.
     */
    public function destroy(
        PlanningException $planningException
    ): JsonResponse {
        $planningException->delete();

        return response()->json([
            'message' => 'Exception de planning supprimée avec succès.',
        ]);
    }
}