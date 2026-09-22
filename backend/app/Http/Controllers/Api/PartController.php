<?php

namespace App\Http\Controllers\Api;

use App\Models\Part;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Validator;

class PartController extends Controller
{
    public function index()
    {
        try {
            $parts = Part::all();
            return response()->json([
                'data' => $parts,
                'message' => 'Liste des pièces'
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'reference' => 'required|unique:parts,reference',
            'name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:0',
            'alert_threshold' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $part = Part::create($request->all());
        return response()->json([
            'data' => $part,
            'message' => 'Pièce créée avec succès'
        ], 201);
    }

    public function show($id)
    {
        $part = Part::findOrFail($id);
        return response()->json(['data' => $part]);
    }

    public function update(Request $request, $id)
    {
        $part = Part::findOrFail($id);
        $part->update($request->all());
        return response()->json([
            'data' => $part,
            'message' => 'Pièce mise à jour'
        ]);
    }

    public function destroy($id)
    {
        $part = Part::findOrFail($id);
        $part->delete();
        return response()->json(['message' => 'Pièce supprimée']);
    }

    // Optionnel : récupérer les pièces en stock bas
    public function lowStock()
    {
        $parts = Part::lowStock()->get();
        return response()->json(['data' => $parts]);
    }
}