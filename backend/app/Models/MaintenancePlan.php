<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaintenancePlan extends Model
{
    protected $fillable = [
        'equipment_id',
        'type',
        'frequency',
        'day_of_week',
        'day_of_month',
        'start_date',
        'end_date',
        'preferred_time',
        'duration',
        'group_id',
        'priority',
        'status',
        'description',
        'reading_pdf_path', // ← ajout essentiel
    ];

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }

    public function group()
    {
        return $this->belongsTo(Group::class);
    }
}