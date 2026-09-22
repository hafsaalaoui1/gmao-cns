<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GroupRotation extends Model
{
    protected $fillable = ['name', 'groups_order', 'is_active'];

    protected $casts = [
        'groups_order' => 'array',
        'is_active' => 'boolean',
    ];

    public function templates()
    {
        return $this->hasMany(PlanningTemplate::class);
    }

    public function getGroupForWeek($weekNumber)
    {
        $groups = $this->groups_order;
        if (empty($groups)) {
            return null;
        }
        // Le groupe est déterminé par le numéro de semaine (1-indexé)
        $index = ($weekNumber - 1) % count($groups);
        return $groups[$index];
    }
}