<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        if (!auth()->check()) {
            return response()->json(['error' => 'Non authentifié'], 401);
        }

        $userRole = auth()->user()->role;

        // L'admin a accès à tout
        if ($userRole === 'admin') {
            return $next($request);
        }

        // Vérifier si le rôle de l'utilisateur est dans la liste autorisée
        if (!in_array($userRole, $roles)) {
            return response()->json(['error' => 'Accès non autorisé'], 403);
        }

        return $next($request);
    }
}