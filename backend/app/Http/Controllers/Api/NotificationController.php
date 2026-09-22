<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Liste des notifications de l'utilisateur connecté.
     */
    public function index(Request $request)
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return response()->json($notifications);
    }

    /**
     * Nombre de notifications non lues.
     */
    public function unreadCount(Request $request)
    {
        return response()->json([
        'user_id' => $request->user()->id,
        'user_name' => $request->user()->name,
        'count' => Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count(),
    ]);
    }

    /**
     * Marquer une notification comme lue.
     */
    public function markAsRead(Request $request, string $id)
    {
        $notification = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$notification) {
            return response()->json([
                'message' => 'Notification introuvable.',
            ], 404);
        }

        if (!$notification->read_at) {
            $notification->update([
                'read_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Notification marquée comme lue.',
            'notification' => $notification->fresh(),
        ]);
    }

    /**
     * Marquer toutes les notifications comme lues.
     */
    public function markAllAsRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
            ]);

        return response()->json([
            'message' => 'Toutes les notifications ont été marquées comme lues.',
        ]);
    }

    /**
     * Supprimer une notification.
     */
    public function destroy(Request $request, string $id)
    {
        $notification = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$notification) {
            return response()->json([
                'message' => 'Notification introuvable.',
            ], 404);
        }

        $notification->delete();

        return response()->json([
            'message' => 'Notification supprimée.',
        ]);
    }
}