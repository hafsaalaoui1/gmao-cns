<?php

namespace App\Http\Controllers\Api;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class LogController extends Controller
{
    /**
     * Liste des logs
     */
    public function index(Request $request)
    {
        $query = ActivityLog::with('user');

        // Filtrer par utilisateur
        if ($request->filled('user_id')) {
        $query->where('user_id', $request->user_id);
    }
        

        // Filtrer par action
        if ($request->action) {
            $query->where('action', 'LIKE', "%{$request->action}%");
        }

        // Filtrer par date
        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($logs);
    }

    /**
     * Dernières activités (pour le dashboard)
     */
    public function recent()
    {
        $logs = ActivityLog::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'user_name' => $log->user?->name ?? 'Inconnu',
                    'action' => $log->action,
                    'created_at' => $log->created_at->diffForHumans(),
                ];
            });

        return response()->json($logs);
    }
}