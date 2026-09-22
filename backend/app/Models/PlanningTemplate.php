<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Equipment;
use App\Models\EquipmentReadingTemplate;
use App\Models\GroupRotation;
use App\Models\PlanningException;
use App\Models\User;
use App\Models\Intervention;

class PlanningTemplate extends Model
{
    protected $fillable = [
        'equipment_id',
        'reading_canvas_id',
        'day_of_week',
        'start_time',
        'duration',
        'type',
        'priority',
        'description',

        // Groupe choisi pour la première intervention
        'group_id',

        // Rotation associée à ce planning
        'group_rotation_id',

        'start_offset',
        'start_date',
        'end_date',
        'is_active',
        'created_by',
        'reading_pdf_path',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    /**
     * Équipement concerné par le planning
     */
    public function equipment()
    {
        return $this->belongsTo(
            Equipment::class,
            'equipment_id'
        );
    }

    /**
     * Canevas de relevé associé
     */
    public function readingCanvas()
    {
        return $this->belongsTo(
            EquipmentReadingTemplate::class,
            'reading_canvas_id'
        );
    }

    /**
     * Groupe choisi pour la première intervention
     */
    public function group()
    {
        return $this->belongsTo(
            \App\Models\Group::class,
            'group_id'
        );
    }

    /**
     * Rotation des groupes
     */
    public function rotation()
    {
        return $this->belongsTo(
            GroupRotation::class,
            'group_rotation_id'
        );
    }

    /**
     * Exceptions du planning
     */
    public function exceptions()
    {
        return $this->hasMany(
            PlanningException::class
        );
    }

    /**
     * Utilisateur ayant créé le planning
     */
    public function createdBy()
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    /**
     * Interventions générées à partir de ce planning
     */
    public function interventions()
    {
        return $this->hasMany(
            Intervention::class,
            'planning_template_id'
        );
    }
}