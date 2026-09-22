<?php

namespace App\Console\Commands;

use App\Models\Intervention;
use App\Models\Notification;
use Illuminate\Console\Command;

class SendDailyInterventionNotifications extends Command
{
    /**
     * Nom de la commande Artisan.
     */
    protected $signature = 'app:send-daily-intervention-notifications';

    /**
     * Description de la commande.
     */
    protected $description = 'Envoie les notifications pour les interventions prévues aujourd’hui';

    /**
     * Exécution de la commande.
     */
    public function handle()
    {
        $today = now()->toDateString();

        $this->info(
            "Recherche des interventions prévues le {$today}..."
        );

        /*
        |--------------------------------------------------------------------------
        | Récupérer les interventions prévues aujourd'hui
        |--------------------------------------------------------------------------
        */

        $interventions = Intervention::with([
            'group.users',
            'equipment',
        ])
            ->whereDate('scheduled_date', $today)
            ->whereNotIn('status', [
                'terminee',
                'validee',
                'cloturee',
            ])
            ->whereNotNull('group_id')
            ->get();

        /*
        |--------------------------------------------------------------------------
        | Aucune intervention
        |--------------------------------------------------------------------------
        */

        if ($interventions->isEmpty()) {

            $this->info(
                'Aucune intervention prévue aujourd’hui.'
            );

            return self::SUCCESS;
        }

        $notificationsCreated = 0;

        /*
        |--------------------------------------------------------------------------
        | Parcourir les interventions
        |--------------------------------------------------------------------------
        */

        foreach ($interventions as $intervention) {

            /*
            |--------------------------------------------------------------------------
            | Vérifier le groupe
            |--------------------------------------------------------------------------
            */

            $group = $intervention->group;

            if (!$group) {

                $this->warn(
                    "Intervention #{$intervention->id} : groupe introuvable."
                );

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Récupérer les intervenants actifs du groupe
            |--------------------------------------------------------------------------
            */

            $users = $group->users()
                ->where('role', 'intervenant')
                ->where('is_active', true)
                ->get();

            if ($users->isEmpty()) {

                $this->warn(
                    "Intervention #{$intervention->id} : "
                    . "aucun intervenant actif dans le groupe {$group->name}."
                );

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Informations de l'équipement
            |--------------------------------------------------------------------------
            */

            $equipmentName = $intervention->equipment?->name
                ?? 'Équipement';

            /*
            |--------------------------------------------------------------------------
            | Heure prévue
            |--------------------------------------------------------------------------
            */

            $time = null;

            if ($intervention->scheduled_time) {

                $time = substr(
                    (string) $intervention->scheduled_time,
                    0,
                    5
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Message
            |--------------------------------------------------------------------------
            */

            $message = "Une intervention est prévue aujourd’hui.";

            if ($time) {

                $message .= " Heure prévue : {$time}.";
            }

            $message .= " Équipement : {$equipmentName}.";

            /*
            |--------------------------------------------------------------------------
            | Notification pour chaque intervenant
            |--------------------------------------------------------------------------
            */

            foreach ($users as $user) {

                /*
                |--------------------------------------------------------------------------
                | Éviter les doublons
                |
                | Une notification quotidienne ne doit être créée
                | qu'une seule fois par intervention et utilisateur.
                |--------------------------------------------------------------------------
                */

                $alreadyNotified = Notification::where('user_id', $user->id)
                    ->where('related_id', $intervention->id)
                    ->where('type', 'intervention')
                    ->whereDate('created_at', $today)
                    ->exists();

                if ($alreadyNotified) {

                    $this->line(
                        "Notification déjà envoyée : "
                        . "intervention #{$intervention->id} → {$user->name}"
                    );

                    continue;
                }

                /*
                |--------------------------------------------------------------------------
                | Créer la notification
                |--------------------------------------------------------------------------
                */

                Notification::create([
                    'user_id' => $user->id,

                    'title' => 'Intervention prévue aujourd’hui',

                    'message' => $message,

                    'type' => 'intervention',

                    'related_id' => $intervention->id,

                    'data' => [
                        'intervention_id' => $intervention->id,
                        'equipment_id' => $intervention->equipment_id,
                        'group_id' => $intervention->group_id,

                        'scheduled_date' => $intervention->scheduled_date
                            ? $intervention->scheduled_date->format('Y-m-d')
                            : $today,

                        'scheduled_time' => $intervention->scheduled_time,
                    ],

                    'priority' => $intervention->priority ?? 'normal',

                    'read_at' => null,
                ]);

                $notificationsCreated++;

                $this->info(
                    "✓ Notification créée : "
                    . "intervention #{$intervention->id} → {$user->name}"
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Résultat
        |--------------------------------------------------------------------------
        */

        $this->info(
            "Terminé. {$notificationsCreated} notification(s) créée(s)."
        );

        return self::SUCCESS;
    }
}