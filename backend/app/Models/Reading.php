<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reading extends Model
{
    protected $fillable = [
        'equipment_id',
        'intervention_id',
        'values',
        'commentaire',
        'validation_status',
        'validation_commentaire',
        'taken_by',
        'taken_at',
        'validated_by',
        'validated_at',
        'template_id',
    ];

    protected $casts = [
        'values' => 'array',
        'taken_at' => 'datetime',
        'validated_at' => 'datetime',
    ];

    /**
     * Intervention liée au relevé
     */
    public function intervention()
    {
        return $this->belongsTo(
            Intervention::class,
            'intervention_id'
        );
    }

    /**
     * Équipement concerné
     */
    public function equipment()
    {
        return $this->belongsTo(
            Equipment::class,
            'equipment_id'
        );
    }

    /**
     * Utilisateur ayant effectué le relevé
     */
    public function takenBy()
    {
        return $this->belongsTo(
            User::class,
            'taken_by'
        );
    }

    /**
     * Responsable ayant validé le relevé
     */
    public function validatedBy()
    {
        return $this->belongsTo(
            User::class,
            'validated_by'
        );
    }

    /**
     * Canvas / modèle utilisé pour le relevé
     */
    public function template()
    {
        return $this->belongsTo(
            EquipmentReadingTemplate::class,
            'template_id'
        );
    }
}