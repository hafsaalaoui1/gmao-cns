<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Part extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'name',
        'category',
        'supplier',
        'quantity',
        'alert_threshold',
        'location',
        'unit_price',
        'compatibility',
    ];

    protected $casts = [
        'compatibility' => 'array',
        'unit_price' => 'decimal:2',
    ];

    // Relations (si besoin)
    public function movements()
    {
        return $this->hasMany(PartMovement::class);
    }

    // Scope pour les stocks bas
    public function scopeLowStock($query)
    {
        return $query->whereColumn('quantity', '<=', 'alert_threshold');
    }
}