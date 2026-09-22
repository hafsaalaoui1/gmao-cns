<?php

namespace App\Http\Controllers\Api;

use App\Models\Group;
use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Validator;

class GroupController extends Controller
{
    /**
     * Liste des groupes
     */
    public function index()
    {
        $groups = Group::with('users')->get();
        return response()->json([
            'data' => $groups,
            'message' => 'Liste des groupes'
        ]);
    }

    /**
     * Créer un groupe
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:groups,name',
            'description' => 'nullable|string',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $group = Group::create([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        // Associer les utilisateurs sélectionnés
        if ($request->has('user_ids') && !empty($request->user_ids)) {
            User::whereIn('id', $request->user_ids)->update(['group_id' => $group->id]);
        }

        return response()->json([
            'data' => $group->load('users'),
            'message' => 'Groupe créé avec succès'
        ], 201);
    }

    /**
     * Afficher un groupe
     */
    public function show($id)
    {
        $group = Group::with('users')->findOrFail($id);
        return response()->json([
            'data' => $group,
            'message' => 'Groupe trouvé'
        ]);
    }

    /**
     * Mettre à jour un groupe
     */
    public function update(Request $request, $id)
    {
        $group = Group::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:groups,name,' . $id,
            'description' => 'nullable|string',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $group->update($request->only(['name', 'description']));

        // Désaffecter tous les anciens membres
        User::where('group_id', $group->id)->update(['group_id' => null]);

        // Associer les nouveaux membres
        if ($request->has('user_ids') && !empty($request->user_ids)) {
            User::whereIn('id', $request->user_ids)->update(['group_id' => $group->id]);
        }

        return response()->json([
            'data' => $group->load('users'),
            'message' => 'Groupe mis à jour'
        ]);
    }

    /**
     * Supprimer un groupe
     */
    public function destroy($id)
    {
        $group = Group::findOrFail($id);

        // Désaffecter les membres avant suppression
        User::where('group_id', $group->id)->update(['group_id' => null]);

        $group->delete();

        return response()->json([
            'message' => 'Groupe supprimé'
        ]);
    }

    /**
     * Ajouter un utilisateur au groupe (utile si on veut ajouter un par un)
     */
    public function addUser(Request $request, $id)
    {
        $group = Group::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::findOrFail($request->user_id);
        $user->group_id = $group->id;
        $user->save();

        return response()->json([
            'message' => 'Utilisateur ajouté au groupe avec succès'
        ]);
    }

    /**
     * Retirer un utilisateur du groupe
     */
    public function removeUser($id, $userId)
    {
        $user = User::findOrFail($userId);
        $user->group_id = null;
        $user->save();

        return response()->json([
            'message' => 'Utilisateur retiré du groupe avec succès'
        ]);
    }
}