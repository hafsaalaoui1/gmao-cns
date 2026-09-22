<?php

namespace App\Http\Controllers\Api;

use App\Models\GroupRotation;
use App\Models\Group;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;

class GroupRotationController extends Controller
{
    public function index()
{
    try {
        $rotations = GroupRotation::with('templates')->get();
        return response()->json(['data' => $rotations]);
    } catch (\Exception $e) {
        \Log::error('GroupRotation index: ' . $e->getMessage());
        return response()->json(['error' => $e->getMessage()], 500);
    }
}

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'groups_order' => 'required|array',
            'groups_order.*' => 'exists:groups,id',
            'is_active' => 'nullable|boolean',
        ]);

        $rotation = GroupRotation::create([
            'name' => $validated['name'],
            'groups_order' => $validated['groups_order'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'data' => $rotation,
            'message' => 'Rotation créée avec succès',
        ], 201);
    }

    public function show($id)
    {
        $rotation = GroupRotation::with('templates')->findOrFail($id);
        return response()->json(['data' => $rotation]);
    }

    public function update(Request $request, $id)
    {
        $rotation = GroupRotation::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'groups_order' => 'sometimes|array',
            'groups_order.*' => 'exists:groups,id',
            'is_active' => 'nullable|boolean',
        ]);

        $rotation->update($validated);

        return response()->json([
            'data' => $rotation,
            'message' => 'Rotation mise à jour',
        ]);
    }

    public function destroy($id)
    {
        $rotation = GroupRotation::findOrFail($id);

        if ($rotation->templates()->count() > 0) {
            return response()->json([
                'message' => 'Cette rotation est utilisée par des templates, impossible de la supprimer.'
            ], 422);
        }

        $rotation->delete();
        return response()->json(['message' => 'Rotation supprimée']);
    }
}