<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Intervention extends Model
{
    use HasFactory;

    /*
    |--------------------------------------------------------------------------
    | FILLABLE
    |--------------------------------------------------------------------------
    */

    protected $fillable = [
        'equipment_id',
        'type',
        'scheduled_date',
        'scheduled_time',
        'duration',
        'priority',
        'status',
        'group_id',
        'user_id',
        'created_by',
        'description',
        'reading_pdf_path',
        'template_id',
        'deadline',
        'started_at',
        'completed_at',
        'diagnostic',
        'actions',
        'observations',
        'parts_used',
        'photos',
        'planning_template_id',
    ];

    /*
    |--------------------------------------------------------------------------
    | CASTS
    |--------------------------------------------------------------------------
    |
    | scheduled_date est une DATE MySQL.
    | Le format Y-m-d permet d'éviter qu'une conversion timezone
    | transforme par erreur 2026-09-25 en 2026-09-24.
    |
    */

    protected $casts = [
        'scheduled_date' => 'date:Y-m-d',

        'deadline' => 'date:Y-m-d',

        'started_at' => 'datetime',

        'completed_at' => 'datetime',

        'parts_used' => 'array',

        'photos' => 'array',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONS
    |--------------------------------------------------------------------------
    */

    /**
     * Équipement
     */
    public function equipment()
    {
        return $this->belongsTo(
            Equipment::class,
            'equipment_id'
        );
    }

    /**
     * Groupe affecté
     */
    public function group()
    {
        return $this->belongsTo(
            Group::class,
            'group_id'
        );
    }

    /**
     * Intervenant affecté
     */
    public function user()
    {
        return $this->belongsTo(
            User::class,
            'user_id'
        );
    }

    /**
     * Utilisateur ayant créé l'intervention
     */
    public function createdBy()
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    /**
     * Template de relevé
     */
    public function template()
    {
        return $this->belongsTo(
            EquipmentReadingTemplate::class,
            'template_id'
        );
    }

    /**
     * Plan de maintenance
     */
    public function maintenancePlan()
    {
        return $this->belongsTo(
            MaintenancePlan::class,
            'maintenance_plan_id'
        );
    }

    /**
     * Template de planning
     */
    public function planningTemplate()
    {
        return $this->belongsTo(
            PlanningTemplate::class,
            'planning_template_id'
        );
    }

    /**
     * Relevés
     */
    public function readings()
    {
        return $this->hasMany(
            Reading::class,
            'intervention_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DATE + HEURE PROGRAMMÉES
    |--------------------------------------------------------------------------
    |
    | Cette méthode utilise les valeurs BRUTES de la base de données.
    |
    | Exemple :
    |
    | scheduled_date = 2026-09-25
    | scheduled_time = 09:00:00
    |
    | résultat :
    |
    | 2026-09-25 09:00:00
    |
    | Important :
    | On ne fait pas confiance ici à une conversion automatique
    | de scheduled_date en Carbon pour éviter les problèmes de timezone.
    |
    */

    public function getScheduledDateTime(): ?Carbon
    {
        $rawDate = $this->getRawOriginal('scheduled_date');

        if (!$rawDate) {
            return null;
        }

        $rawTime = $this->getRawOriginal('scheduled_time');

        if (!$rawTime) {
            $rawTime = '00:00:00';
        }

        /*
        | Nettoyage de l'heure.
        | MySQL peut retourner :
        | 09:00
        | ou
        | 09:00:00
        */

        $rawTime = substr((string) $rawTime, 0, 8);

        if (strlen($rawTime) === 5) {
            $rawTime .= ':00';
        }

        /*
        | On utilise explicitement le timezone de l'application.
        */

        $timezone = config(
            'app.timezone',
            'Africa/Casablanca'
        );

        try {
            return Carbon::createFromFormat(
                'Y-m-d H:i:s',
                $rawDate . ' ' . $rawTime,
                $timezone
            );
        } catch (\Throwable $e) {
            /*
            | Fallback sécurisé.
            */

            try {
                return Carbon::parse(
                    $rawDate . ' ' . $rawTime,
                    $timezone
                );
            } catch (\Throwable $e) {
                return null;
            }
        }
    }

    /*
    |--------------------------------------------------------------------------
    | DATE BRUTE
    |--------------------------------------------------------------------------
    |
    | Retourne toujours la date exactement comme elle existe
    | dans MySQL.
    |
    | Exemple :
    |
    | MySQL : 2026-09-25
    | résultat : 2026-09-25
    |
    */

    public function getScheduledDateRaw(): ?string
    {
        $date = $this->getRawOriginal('scheduled_date');

        if (!$date) {
            return null;
        }

        return substr((string) $date, 0, 10);
    }

    /*
    |--------------------------------------------------------------------------
    | HEURE BRUTE
    |--------------------------------------------------------------------------
    */

    public function getScheduledTimeRaw(): ?string
    {
        $time = $this->getRawOriginal('scheduled_time');

        if (!$time) {
            return null;
        }

        $time = substr((string) $time, 0, 8);

        if (strlen($time) === 5) {
            $time .= ':00';
        }

        return $time;
    }

    /*
    |--------------------------------------------------------------------------
    | ÉTAT D'AFFICHAGE
    |--------------------------------------------------------------------------
    |
    | IMPORTANT :
    |
    | status = état enregistré en base
    |
    | display_state = état calculé pour l'interface
    |
    */

    public function getDisplayState(): string
    {
        /*
        |--------------------------------------------------------------------------
        | Validée
        |--------------------------------------------------------------------------
        */

        if ($this->status === 'validee') {
            return 'validee';
        }

        /*
        |--------------------------------------------------------------------------
        | Terminée mais pas encore validée
        |--------------------------------------------------------------------------
        */

        if ($this->status === 'terminee') {
            return 'en_attente_validation';
        }

        /*
        |--------------------------------------------------------------------------
        | Déjà commencée
        |--------------------------------------------------------------------------
        */

        if ($this->status === 'en_cours') {
            return 'en_cours';
        }

        /*
        |--------------------------------------------------------------------------
        | Annulée
        |--------------------------------------------------------------------------
        */

        if ($this->status === 'annulee') {
            return 'annulee';
        }

        /*
        |--------------------------------------------------------------------------
        | En attente / en retard
        |--------------------------------------------------------------------------
        */

        if (
            in_array(
                $this->status,
                [
                    'en_attente',
                    'en_retard',
                ],
                true
            )
        ) {
            $scheduled = $this->getScheduledDateTime();

            /*
            | S'il n'y a pas de date,
            | on considère l'intervention comme active.
            */

            if (!$scheduled) {
                return 'active';
            }

            /*
            | La date/heure n'est pas encore atteinte.
            */

            if (now()->lt($scheduled)) {
                return 'a_venir';
            }

            /*
            | La date/heure est atteinte.
            */

            return 'active';
        }

        /*
        |--------------------------------------------------------------------------
        | Par défaut
        |--------------------------------------------------------------------------
        */

        return (string) $this->status;
    }

    /*
    |--------------------------------------------------------------------------
    | INTERVENTION ACTIVE ?
    |--------------------------------------------------------------------------
    */

    public function isActive(): bool
    {
        return $this->getDisplayState() === 'active';
    }

    /*
    |--------------------------------------------------------------------------
    | INTERVENTION À VENIR ?
    |--------------------------------------------------------------------------
    */

    public function isUpcoming(): bool
    {
        return $this->getDisplayState() === 'a_venir';
    }

    /*
    |--------------------------------------------------------------------------
    | INTERVENTION TERMINÉE ?
    |--------------------------------------------------------------------------
    */

    public function isCompleted(): bool
    {
        return in_array(
            $this->status,
            [
                'terminee',
                'validee',
                'cloturee',
            ],
            true
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SCOPES
    |--------------------------------------------------------------------------
    */

    public function scopeByStatus(
        $query,
        $status
    ) {
        return $query->where(
            'status',
            $status
        );
    }

    public function scopeByPriority(
        $query,
        $priority
    ) {
        return $query->where(
            'priority',
            $priority
        );
    }

    public function scopePlanned($query)
    {
        return $query->whereIn(
            'status',
            [
                'en_attente',
                'planifiee',
                'en_cours',
            ]
        );
    }

    public function scopeCompleted($query)
    {
        return $query->whereIn(
            'status',
            [
                'terminee',
                'validee',
                'cloturee',
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | INTERVENTIONS D'UN UTILISATEUR
    |--------------------------------------------------------------------------
    |
    | Une intervention peut être affectée :
    |
    | 1. directement à l'utilisateur
    | 2. à son groupe
    |
    */

    public function scopeForUser(
        $query,
        $userId
    ) {
        $user = auth()->user();

        return $query->where(
            function ($q) use (
                $userId,
                $user
            ) {
                /*
                |--------------------------------------------------------------------------
                | Affectation directe
                |--------------------------------------------------------------------------
                */

                $q->where(
                    'user_id',
                    $userId
                );

                /*
                |--------------------------------------------------------------------------
                | Affectation au groupe
                |--------------------------------------------------------------------------
                */

                if (
                    $user &&
                    !empty($user->group_id)
                ) {
                    $q->orWhere(
                        'group_id',
                        $user->group_id
                    );
                }
            }
        );
    }
}