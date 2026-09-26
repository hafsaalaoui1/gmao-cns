<?php

namespace App\Http\Controllers\Api;

use App\Models\Group;
use App\Models\User;
use App\Models\GroupRotation;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

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
     * Lorsqu'un groupe est créé :
     *
     * 1. Le groupe est enregistré.
     * 2. Les utilisateurs sont associés.
     * 3. Le nouveau groupe est automatiquement ajouté
     *    à toutes les rotations actives.
     *
     * Exemple :
     *
     * Rotation :
     * [1, 2, 3]
     *
     * Création du groupe 4
     *
     * Résultat :
     * [1, 2, 3, 4]
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

        DB::beginTransaction();

        try {

            // --------------------------------------------------------
            // 1. CRÉATION DU GROUPE
            // --------------------------------------------------------

            $group = Group::create([
                'name' => $request->name,
                'description' => $request->description,
            ]);

            // --------------------------------------------------------
            // 2. ASSOCIATION DES UTILISATEURS
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

            // --------------------------------------------------------
            // 3. AJOUT AUTOMATIQUE À TOUTES LES ROTATIONS ACTIVES
            // --------------------------------------------------------
            //
            // Le nouveau groupe est ajouté à la fin de l'ordre
            // de chaque rotation active.
            //
            // Exemple :
            //
            // Avant :
            // [1, 2, 3]
            //
            // Nouveau groupe : 4
            //
            // Après :
            // [1, 2, 3, 4]
            //
            // --------------------------------------------------------

            $activeRotations = GroupRotation::where('is_active', true)
                ->get();

            foreach ($activeRotations as $rotation) {
                $rotation->addGroupToRotation($group->id);
            }

            DB::commit();

            return response()->json([
                'data' => $group->load('users'),
                'message' => 'Groupe créé et ajouté automatiquement aux rotations actives'
            ], 201);

        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'message' => 'Erreur lors de la création du groupe',
                'error' => $e->getMessage()
            ], 500);
        }
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

        DB::beginTransaction();

        try {

            // --------------------------------------------------------
            // 1. MISE À JOUR DU GROUPE
            // --------------------------------------------------------

            $group->update(
                $request->only([
                    'name',
                    'description'
                ])
            );

            // --------------------------------------------------------
            // 2. DÉSAFFECTER LES ANCIENS MEMBRES
            // --------------------------------------------------------

            User::where('group_id', $group->id)
                ->update([
                    'group_id' => null
                ]);

            // --------------------------------------------------------
            // 3. AFFECTER LES NOUVEAUX MEMBRES
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

            DB::commit();

            return response()->json([
                'data' => $group->load('users'),
                'message' => 'Groupe mis à jour'
            ]);

        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'message' => 'Erreur lors de la mise à jour du groupe',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * SUPPRIMER UN GROUPE
     * ============================================================
     *
     * Lorsqu'un groupe est supprimé :
     *
     * 1. Ses utilisateurs sont désaffectés.
     * 2. Son ID est retiré automatiquement de toutes les
     *    rotations.
     * 3. Le groupe est supprimé.
     */
    public function destroy($id)
    {
        $group = Group::findOrFail($id);

        DB::beginTransaction();

        try {

            // --------------------------------------------------------
            // 1. RETIRER LE GROUPE DE TOUTES LES ROTATIONS
            // --------------------------------------------------------

            $rotations = GroupRotation::get();

            foreach ($rotations as $rotation) {
                $rotation->removeGroupFromRotation($group->id);
            }

            // --------------------------------------------------------
            // 2. DÉSAFFECTER LES MEMBRES
            // --------------------------------------------------------

            User::where('group_id', $group->id)
                ->update([
                    'group_id' => null
                ]);

            // --------------------------------------------------------
            // 3. SUPPRESSION DU GROUPE
            // --------------------------------------------------------

            $group->delete();

            DB::commit();

            return response()->json([
                'message' => 'Groupe supprimé et retiré automatiquement des rotations'
            ]);

        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'message' => 'Erreur lors de la suppression du groupe',
                'error' => $e->getMessage()
            ], 500);
        }
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