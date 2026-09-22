<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\UserCreatedMail;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    /**
     * Liste de tous les utilisateurs
     */
    public function index()
    {
        $users = User::orderBy('name')->get();

        return response()->json([
            'data' => $users,
            'message' => 'Liste des utilisateurs'
        ]);
    }

    /**
     * Créer un nouvel utilisateur
     *
     * Le mot de passe est généré automatiquement
     * puis envoyé par email.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:admin,responsable,intervenant',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
                'message' => 'Erreur de validation'
            ], 422);
        }

        // Génération automatique du mot de passe
        $password = Str::random(12);

        $userData = [
            'name' => trim($request->name),
            'email' => strtolower(trim($request->email)),
            'password' => Hash::make($password),
            'role' => $request->role,
            'is_active' => $request->is_active ?? true,
        ];

        // Création de l'utilisateur
        $user = User::create($userData);

        /*
         * Envoi des identifiants par email
         *
         * Le mot de passe en clair est uniquement utilisé
         * pour construire l'email. Il n'est jamais enregistré
         * en clair dans la base de données.
         */
        try {
            Mail::to($user->email)->send(
                new UserCreatedMail(
                    $user->name,
                    $user->email,
                    $password
                )
            );
        } catch (\Throwable $e) {

            // Journaliser l'erreur sans jamais enregistrer le mot de passe
            Log::error('Erreur lors de l\'envoi de l\'email de création utilisateur', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'data' => $user,
                'message' => 'Utilisateur créé, mais l\'email contenant les identifiants n\'a pas pu être envoyé.'
            ], 500);
        }

        // Journalisation
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'Création d\'utilisateur',
            'details' => json_encode([
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
            ]),
            'ip_address' => $request->ip(),
        ]);

        /*
         * IMPORTANT :
         * On ne retourne plus le mot de passe dans la réponse API.
         */
        return response()->json([
            'data' => $user,
            'message' => 'Utilisateur créé avec succès. Les identifiants ont été envoyés par email.'
        ], 201);
    }

    /**
     * Afficher un utilisateur
     */
    public function show($id)
    {
        $user = User::findOrFail($id);

        return response()->json([
            'data' => $user,
            'message' => 'Utilisateur trouvé'
        ]);
    }

    /**
     * Modifier un utilisateur
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'sometimes|nullable|string|min:6',
            'role' => 'sometimes|in:admin,responsable,intervenant',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
                'message' => 'Erreur de validation'
            ], 422);
        }

        $data = $request->only([
            'name',
            'email',
            'role',
            'is_active',
        ]);

        // Si un nouveau mot de passe est fourni
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        // Journalisation
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'Modification d\'utilisateur',
            'details' => json_encode([
                'user_id' => $user->id,
                'email' => $user->email,
            ]),
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'data' => $user->fresh(),
            'message' => 'Utilisateur mis à jour'
        ]);
    }

    /**
     * Supprimer un utilisateur
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        // Empêcher l'utilisateur connecté de supprimer son propre compte
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte'
            ], 403);
        }

        $email = $user->email;

        $user->delete();

        // Journalisation
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'Suppression d\'utilisateur',
            'details' => json_encode([
                'user_id' => $id,
                'email' => $email
            ]),
            'ip_address' => request()->ip(),
        ]);

        return response()->json([
            'message' => 'Utilisateur supprimé'
        ]);
    }

    /**
     * Activer / désactiver un utilisateur
     */
    public function toggleActive($id)
    {
        $user = User::findOrFail($id);

        // Empêcher l'utilisateur connecté de désactiver son propre compte
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'Vous ne pouvez pas désactiver votre propre compte'
            ], 403);
        }

        $user->is_active = !$user->is_active;
        $user->save();

        // Journalisation
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => $user->is_active
                ? 'Activation d\'utilisateur'
                : 'Désactivation d\'utilisateur',
            'details' => json_encode([
                'user_id' => $user->id,
                'email' => $user->email
            ]),
            'ip_address' => request()->ip(),
        ]);

        return response()->json([
            'data' => $user,
            'message' => $user->is_active
                ? 'Utilisateur activé'
                : 'Utilisateur désactivé'
        ]);
    }

    /**
     * Liste des intervenants actifs
     */
    public function intervenants()
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json([
                'error' => 'Non authentifié'
            ], 401);
        }

        $intervenants = User::whereRaw(
            'LOWER(TRIM(role)) = ?',
            ['intervenant']
        )
            ->where('is_active', true)
            ->select(
                'id',
                'name',
                'email'
            )
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $intervenants,
            'message' => 'Liste des intervenants'
        ]);
    }
}