<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    protected $fillable = [
        'equipment_id',
        'declared_by',
        'declared_date',
        'description',
        'priority',
        'status',
        'diagnostic',
        'solution',
        'parts_used',
        'resolution_date',
        'assigned_to',
        'group_id',
    ];

    protected $casts = [
        'declared_date' => 'date',
        'resolution_date' => 'datetime',
        'parts_used' => 'array',
    ];

    public function equipment()
    {
        return $this->belongsTo(
            Equipment::class,
            'equipment_id'
        );
    }

    public function declaredBy()
    {
        return $this->belongsTo(
            User::class,
            'declared_by'
        );
    }

    /**
     * IMPORTANT :
     * On utilise assignedUser() et non assignedTo()
     * pour éviter la collision avec la colonne assigned_to.
     */
    public function assignedUser()
    {
        return $this->belongsTo(
            User::class,
            'assigned_to'
        );
    }
    public function assignedTo()
{
    return $this->belongsTo(
        User::class,
        'assigned_to'
    );
}

    public function group()
    {
        return $this->belongsTo(
            Group::class,
            'group_id'
        );
    }
}