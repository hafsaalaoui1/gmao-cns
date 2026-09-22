<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Charger la relation group
        $user = User::with('group')->where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants sont incorrects.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'Votre compte est désactivé.'
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        // Construire la réponse avec les données du groupe
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'group_id' => $user->group_id,
                'group' => $user->group ? [
                    'id' => $user->group->id,
                    'name' => $user->group->name,
                ] : null,
            ],
            'token' => $token,
            'message' => 'Connexion réussie',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnecté']);
    }

    public function user(Request $request)
    {
        $user = $request->user()->load('group');
        return response()->json($user);
    }
}