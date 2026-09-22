<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanningException extends Model
{
    protected $fillable = [
        'planning_template_id',
        'exception_date',
        'group_id_override',
        'status_override',
        'reason',
    ];

    protected $casts = [
        'exception_date' => 'date',
    ];

    public function template()
    {
        return $this->belongsTo(PlanningTemplate::class, 'planning_template_id');
    }

    public function groupOverride()
    {
        return $this->belongsTo(Group::class, 'group_id_override');
    }
}