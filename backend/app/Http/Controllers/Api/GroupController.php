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
     * ============================================================
     * LISTE DES GROUPES
     * ============================================================
     */
    public function index()
    {
        $groups = Group::with('users')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $groups,
            'message' => 'Liste des groupes'
        ]);
    }

    /**
     * ============================================================
     * CRÉER UN GROUPE
     * ============================================================
     *
     * Le groupe est créé normalement.
     *
     * La rotation est dynamique :
     * le nouveau groupe sera automatiquement pris en compte
     * par la rotation active lors de la prochaine génération
     * du planning.
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
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        // --------------------------------------------------------
        // Création du groupe
        // --------------------------------------------------------

        $group = Group::create([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        // --------------------------------------------------------
        // Association des utilisateurs
        // --------------------------------------------------------

        if (
            $request->has('user_ids') &&
            !empty($request->user_ids)
        ) {
            User::whereIn('id', $request->user_ids)
                ->update([
                    'group_id' => $group->id
                ]);
        }

        return response()->json([
            'data' => $group->load('users'),
            'message' => 'Groupe créé avec succès'
        ], 201);
    }

    /**
     * ============================================================
     * AFFICHER UN GROUPE
     * ============================================================
     */
    public function show($id)
    {
        $group = Group::with('users')
            ->findOrFail($id);

        return response()->json([
            'data' => $group,
            'message' => 'Groupe trouvé'
        ]);
    }

    /**
     * ============================================================
     * METTRE À JOUR UN GROUPE
     * ============================================================
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
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        // --------------------------------------------------------
        // Mise à jour du groupe
        // --------------------------------------------------------

        $group->update(
            $request->only([
                'name',
                'description'
            ])
        );

        // --------------------------------------------------------
        // Désaffecter les anciens membres
        // --------------------------------------------------------

        User::where('group_id', $group->id)
            ->update([
                'group_id' => null
            ]);

        // --------------------------------------------------------
        // Affecter les nouveaux membres
        // --------------------------------------------------------

        if (
            $request->has('user_ids') &&
            !empty($request->user_ids)
        ) {
            User::whereIn('id', $request->user_ids)
                ->update([
                    'group_id' => $group->id
                ]);
        }

        return response()->json([
            'data' => $group->load('users'),
            'message' => 'Groupe mis à jour'
        ]);
    }

    /**
     * ============================================================
     * SUPPRIMER UN GROUPE
     * ============================================================
     */
    public function destroy($id)
    {
        $group = Group::findOrFail($id);

        // --------------------------------------------------------
        // Désaffecter les membres
        // --------------------------------------------------------

        User::where('group_id', $group->id)
            ->update([
                'group_id' => null
            ]);

        // --------------------------------------------------------
        // Suppression
        // --------------------------------------------------------

        $group->delete();

        return response()->json([
            'message' => 'Groupe supprimé'
        ]);
    }

    /**
     * ============================================================
     * AJOUTER UN UTILISATEUR
     * ============================================================
     */
    public function addUser(Request $request, $id)
    {
        $group = Group::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::findOrFail($request->user_id);

        $user->group_id = $group->id;
        $user->save();

        return response()->json([
            'message' => 'Utilisateur ajouté au groupe avec succès'
        ]);
    }

    /**
     * ============================================================
     * RETIRER UN UTILISATEUR
     * ============================================================
     */
    public function removeUser($id, $userId)
    {
        $group = Group::findOrFail($id);

        $user = User::findOrFail($userId);

        // Vérifier que l'utilisateur appartient bien à ce groupe
        if ((int) $user->group_id !== (int) $group->id) {
            return response()->json([
                'message' => 'Cet utilisateur n’appartient pas à ce groupe.'
            ], 422);
        }

        $user->group_id = null;
        $user->save();

        return response()->json([
            'message' => 'Utilisateur retiré du groupe avec succès'
        ]);
    }
}