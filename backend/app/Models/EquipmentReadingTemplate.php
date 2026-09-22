<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EquipmentReadingTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'equipment_id',
        'template_name',
        'template_type',
        'header',
        'frequency',
        'parameters',
        'signatures',
        'annexes',
        'created_by',
        'is_active',
    ];

    protected $casts = [
        'header' => 'array',
        'parameters' => 'array',
        'signatures' => 'array',
        'annexes' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Équipement associé au canvas
     */
    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }

    /**
     * Utilisateur qui a créé le canvas
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Interventions utilisant ce canvas
     *
     * interventions.template_id
     * -> equipment_reading_templates.id
     */
    public function interventions()
    {
        return $this->hasMany(
            Intervention::class,
            'template_id'
        );
    }
}