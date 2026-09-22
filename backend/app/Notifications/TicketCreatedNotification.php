<?php

namespace App\Notifications;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TicketCreatedNotification extends Notification
{
    use Queueable;

    protected Ticket $ticket;

    public function __construct(Ticket $ticket)
    {
        $this->ticket = $ticket;
    }

    /**
     * Notification interne Laravel.
     */
    public function via($notifiable)
    {
        return ['database'];
    }

    /**
     * Données enregistrées dans la table notifications.
     */
    public function toDatabase($notifiable)
    {
        return [
            'type' => 'ticket_created',
            'title' => 'Nouveau ticket',
            'message' => 'Un nouveau ticket a été créé.',
            'ticket_id' => $this->ticket->id,
            'equipment_id' => $this->ticket->equipment_id,
            'equipment_name' => $this->ticket->equipment?->name,
            'priority' => $this->ticket->priority,
            'declared_by' => $this->ticket->declaredBy?->name,
        ];
    }
}