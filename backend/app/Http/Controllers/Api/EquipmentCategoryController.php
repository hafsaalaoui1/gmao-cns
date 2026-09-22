<?php

namespace App\Http\Controllers\Api;

use App\Models\EquipmentCategory;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;

class EquipmentCategoryController extends Controller
{
    // Liste des catégories (pour le select)
    public function index()
    {
        return response()->json([
            'data' => EquipmentCategory::all(),
        ]);
    }

    // Hiérarchie complète (arborescence)
    public function hierarchy()
{
    try {
        $categories = EquipmentCategory::with(['children', 'equipments'])
            ->whereNull('parent_id')
            ->orderBy('order')
            ->get();

        return response()->json([
            'data' => $categories,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'file'  => $e->getFile(),
            'line'  => $e->getLine(),
        ], 500);
    }
}
    // Créer une catégorie
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:equipment_categories,id',
            'order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $category = EquipmentCategory::create($validated);
        return response()->json(['data' => $category, 'message' => 'Catégorie créée'], 201);
    }

    // Afficher une catégorie
    public function show($id)
    {
        $category = EquipmentCategory::with(['parent', 'children', 'equipments'])->findOrFail($id);
        return response()->json(['data' => $category]);
    }

    // Mettre à jour
    public function update(Request $request, $id)
    {
        $category = EquipmentCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:equipment_categories,id',
            'order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $category->update($validated);
        return response()->json(['data' => $category, 'message' => 'Catégorie mise à jour']);
    }

    // Supprimer
    public function destroy($id)
    {
        $category = EquipmentCategory::findOrFail($id);

        // Vérifier s'il y a des équipements attachés
        if ($category->equipments()->count() > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer cette catégorie car elle contient des équipements.'
            ], 422);
        }

        $category->delete();
        return response()->json(['message' => 'Catégorie supprimée']);
    }

    // Ajouter un équipement à une catégorie (depuis la page équipement)
    public function addEquipment(Request $request, $id)
    {
        $category = EquipmentCategory::findOrFail($id);
        $validated = $request->validate([
            'equipment_id' => 'required|exists:equipments,id',
        ]);

        $equipment = \App\Models\Equipment::findOrFail($validated['equipment_id']);
        $equipment->category_id = $category->id;
        $equipment->save();

        return response()->json(['message' => 'Équipement ajouté à la catégorie']);
    }
}