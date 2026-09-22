<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Equipment extends Model
{
    use HasFactory;

    protected $table = 'equipments';

    protected $fillable = [
        'name',
        'type',
        'brand',
        'model',
        'serial_number',
        'location',
        'commissioning_date',
        'status',
        'maintenance_frequency',
        'description',
        'technical_docs',
        'category_id',
    ];

    protected $casts = [
        'commissioning_date' => 'date',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(EquipmentCategory::class, 'category_id');
    }

    public function interventions()
    {
        return $this->hasMany(Intervention::class);
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    public function readings()
    {
        return $this->hasMany(Reading::class);
    }

    public function planningTemplates()
    {
        return $this->hasMany(PlanningTemplate::class);
    }
}