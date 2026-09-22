<?php

namespace App\Http\Controllers\Api;

use App\Models\Equipment;
use App\Models\Ticket;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class EquipmentController extends Controller
{
    /**
     * Liste de tous les équipements
     */
    public function index()
    {
        $equipments = Equipment::all();

        return response()->json($equipments);
    }

    /**
     * Créer un équipement
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'commissioning_date' => 'nullable|date',

            // Statuts autorisés
            'status' => 'required|in:operationnel,en_maintenance,en_panne,hors_service,retire',

            'maintenance_frequency' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:equipment_categories,id',
        ]);

        $equipment = Equipment::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Équipement créé avec succès',
            'data' => $equipment,
        ], 201);
    }

    /**
     * Afficher un équipement
     */
    public function show($id)
    {
        $equipment = Equipment::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $equipment,
        ]);
    }

    /**
     * Modifier un équipement
     */
    public function update(Request $request, $id)
    {
        $equipment = Equipment::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'commissioning_date' => 'nullable|date',

            // IMPORTANT :
            // Le statut choisi dans React doit être enregistré
            // exactement avec l'une de ces valeurs.
            'status' => 'required|in:operationnel,en_maintenance,en_panne,hors_service,retire',

            'maintenance_frequency' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:equipment_categories,id',
        ]);

        $equipment->update($validated);

        // Récupérer les données réellement enregistrées
        $equipment->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Équipement mis à jour avec succès',
            'data' => $equipment,
        ]);
    }

    /**
     * Supprimer un équipement
     */
    public function destroy($id)
    {
        $equipment = Equipment::findOrFail($id);

        $equipment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Équipement supprimé avec succès',
        ]);
    }

    /**
     * Historique des interventions correctives
     * d'un équipement
     */
    public function history($id)
    {
        // Vérifier que l'équipement existe
        $equipment = Equipment::findOrFail($id);

        // Récupérer uniquement les tickets correctifs
        // résolus ou clôturés pour cet équipement
        $tickets = Ticket::with([
            'assignedTo',
        ])
            ->where('equipment_id', $equipment->id)
            ->whereIn('status', ['resolu', 'cloture'])
            ->orderByDesc('resolution_date')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,

            'equipment' => $equipment,

            'history' => $tickets,
        ]);
    }
}