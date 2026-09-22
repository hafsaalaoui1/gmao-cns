<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentCategory extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'parent_id',
        'order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Relation : parent (catégorie parente)
    public function parent(): BelongsTo
    {
        return $this->belongsTo(EquipmentCategory::class, 'parent_id');
    }

    // Relation : enfants (sous-catégories)
    public function children(): HasMany
    {
        return $this->hasMany(EquipmentCategory::class, 'parent_id')->orderBy('order');
    }

    // Relation : équipements
    public function equipments(): HasMany
    {
        return $this->hasMany(Equipment::class, 'category_id');
    }

    // Récupérer la hiérarchie complète (pour le frontend)
    public static function getHierarchy(): array
    {
        return self::with(['children.equipments', 'equipments'])
            ->whereNull('parent_id')
            ->orderBy('order')
            ->get()
            ->toArray();
    }
}