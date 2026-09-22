<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Notification;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'group_id',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Groupe auquel appartient l'utilisateur.
     */
    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    /**
     * Notifications personnalisées de l'utilisateur.
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class, 'user_id');
    }
}