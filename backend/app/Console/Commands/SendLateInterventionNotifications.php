<?php

namespace App\Console\Commands;

use App\Models\Intervention;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendLateInterventionNotifications extends Command
{
    /**
     * Nom de la commande Artisan.
     */
    protected $signature = 'app:send-late-intervention-notifications';

    /**
     * Description de la commande.
     */
    protected $description = 'Détecte les interventions en retard et envoie une notification aux intervenants concernés';

    /**
     * Exécution de la commande.
     */
    public function handle()
    {
        $now = now();

        $this->info(
            "Recherche des interventions en retard au {$now->format('Y-m-d H:i:s')}..."
        );

        /*
        |--------------------------------------------------------------------------
        | Récupérer les interventions à vérifier
        |--------------------------------------------------------------------------
        */

        $interventions = Intervention::with([
            'group.users',
            'equipment',
        ])
            ->whereNotIn('status', [
                'en_cours',
                'terminee',
                'validee',
                'cloturee',
            ])
            ->whereNotNull('scheduled_date')
            ->whereNotNull('scheduled_time')
            ->whereDate('scheduled_date', '<=', $now->toDateString())
            ->whereNotNull('group_id')
            ->get();

        if ($interventions->isEmpty()) {

            $this->info(
                'Aucune intervention à vérifier.'
            );

            return self::SUCCESS;
        }

        $notificationsCreated = 0;
        $interventionsLate = 0;

        /*
        |--------------------------------------------------------------------------
        | Vérifier chaque intervention
        |--------------------------------------------------------------------------
        */

        foreach ($interventions as $intervention) {

            /*
            |--------------------------------------------------------------------------
            | Construire la date et l'heure prévues
            |--------------------------------------------------------------------------
            */

            try {

                $scheduledDate = Carbon::parse(
                    $intervention->scheduled_date
                )->format('Y-m-d');

                $scheduledTime = substr(
                    (string) $intervention->scheduled_time,
                    0,
                    8
                );

                $scheduledDateTime = Carbon::parse(
                    "{$scheduledDate} {$scheduledTime}"
                );

            } catch (\Throwable $e) {

                $this->warn(
                    "Intervention #{$intervention->id} : "
                    . "date ou heure invalide."
                );

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | L'intervention est-elle réellement en retard ?
            |--------------------------------------------------------------------------
            */

            if ($scheduledDateTime->greaterThanOrEqualTo($now)) {
                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Passer l'intervention à EN_RETARD
            |--------------------------------------------------------------------------
            */

            if ($intervention->status !== 'en_retard') {

                $intervention->update([
                    'status' => 'en_retard',
                ]);

                $this->warn(
                    "⚠ Intervention #{$intervention->id} → EN RETARD"
                );
            }

            $interventionsLate++;

            /*
            |--------------------------------------------------------------------------
            | Vérifier le groupe
            |--------------------------------------------------------------------------
            */

            $group = $intervention->group;

            if (!$group) {

                $this->warn(
                    "Intervention #{$intervention->id} : "
                    . "groupe introuvable."
                );

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Récupérer les intervenants actifs
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
            | Informations pour la notification
            |--------------------------------------------------------------------------
            */

            $equipmentName = $intervention->equipment?->name
                ?? 'Équipement';

            $dateFormatted = $scheduledDateTime->format('d/m/Y');

            $timeFormatted = $scheduledDateTime->format('H:i');

            $message =
                "L'intervention #{$intervention->id} prévue le "
                . "{$dateFormatted} à {$timeFormatted} "
                . "n'a pas encore été commencée. "
                . "Équipement : {$equipmentName}.";

            /*
            |--------------------------------------------------------------------------
            | Notification à chaque intervenant du groupe
            |--------------------------------------------------------------------------
            */

            foreach ($users as $user) {

                /*
                |--------------------------------------------------------------------------
                | Éviter les doublons
                |--------------------------------------------------------------------------
                */

                $alreadyNotified = Notification::where(
                    'user_id',
                    $user->id
                )
                    ->where(
                        'related_id',
                        $intervention->id
                    )
                    ->where(
                        'type',
                        'intervention_retard'
                    )
                    ->exists();

                if ($alreadyNotified) {

                    $this->line(
                        "Notification de retard déjà envoyée : "
                        . "intervention #{$intervention->id} "
                        . "→ {$user->name}"
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

                    'title' => '⚠ Intervention en retard',

                    'message' => $message,

                    'type' => 'intervention_retard',

                    'related_id' => $intervention->id,

                    'data' => [
                        'intervention_id' => $intervention->id,

                        'equipment_id' => $intervention->equipment_id,

                        'group_id' => $intervention->group_id,

                        'scheduled_date' => $scheduledDate,

                        'scheduled_time' => $scheduledTime,

                        'status' => 'en_retard',
                    ],

                    'priority' => 'high',

                    'read_at' => null,
                ]);

                $notificationsCreated++;

                $this->info(
                    "✓ Notification retard créée : "
                    . "intervention #{$intervention->id} "
                    . "→ {$user->name}"
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Résultat final
        |--------------------------------------------------------------------------
        */

        $this->info('');

        $this->info(
            '=============================================='
        );

        $this->info(
            'Vérification des retards terminée.'
        );

        $this->info(
            "Interventions en retard : {$interventionsLate}"
        );

        $this->info(
            "Notifications créées : {$notificationsCreated}"
        );

        $this->info(
            '=============================================='
        );

        return self::SUCCESS;
    }
}