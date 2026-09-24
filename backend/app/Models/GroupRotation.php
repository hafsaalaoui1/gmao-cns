<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Group;
use App\Models\PlanningTemplate;

class GroupRotation extends Model
{
    protected $fillable = [
        'name',
        'groups_order',
        'is_active',
    ];

    protected $casts = [
        'groups_order' => 'array',
        'is_active' => 'boolean',
    ];

    public function templates()
    {
        return $this->hasMany(PlanningTemplate::class);
    }

    /**
     * ============================================================
     * ORDRE DES GROUPES DE LA ROTATION
     * ============================================================
     *
     * Retourne l'ordre enregistré dans groups_order.
     *
     * Exemple :
     *
     * groups_order = [3, 1, 5, 4]
     *
     * donnera :
     *
     * Groupe 3 → Groupe 1 → Groupe 5 → Groupe 4
     *
     * Si aucun ordre n'est enregistré, on utilise les groupes
     * existants triés par ID comme ordre de secours.
     */
    public function getDynamicGroups()
    {
        // ============================================================
        // 1. RÉCUPÉRER L'ORDRE ENREGISTRÉ
        // ============================================================

        $orderedGroups = $this->groups_order;

        // ============================================================
        // 2. SI UNE ROTATION EST CONFIGURÉE
        // ============================================================

        if (is_array($orderedGroups) && !empty($orderedGroups)) {

            // Convertir tous les IDs en entiers
            $orderedGroups = array_map(
                'intval',
                $orderedGroups
            );

            // Supprimer les doublons
            $orderedGroups = array_values(
                array_unique($orderedGroups)
            );

            // Vérifier que les groupes existent réellement
            $existingGroupIds = Group::query()
                ->whereIn('id', $orderedGroups)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->toArray();

            // Garder exactement l'ordre défini dans groups_order
            $orderedGroups = array_values(
                array_filter(
                    $orderedGroups,
                    fn ($groupId) =>
                        in_array(
                            $groupId,
                            $existingGroupIds,
                            true
                        )
                )
            );

            if (!empty($orderedGroups)) {
                return $orderedGroups;
            }
        }

        // ============================================================
        // 3. AUCUN ORDRE CONFIGURÉ
        // ============================================================
        //
        // Dans ce cas seulement, on prend tous les groupes
        // existants par ID.
        //
        // Exemple :
        //
        // [1, 3, 4, 5]
        //
        // ============================================================

        return Group::query()
            ->orderBy('id', 'asc')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->toArray();
    }

    /**
     * ============================================================
     * ORDRE EFFECTIF DE LA ROTATION
     * ============================================================
     */
    public function getEffectiveGroupsOrder()
    {
        return $this->getDynamicGroups();
    }

    /**
     * ============================================================
     * GROUPE POUR UNE SEMAINE
     * ============================================================
     *
     * Exemple :
     *
     * groups_order = [3, 1, 5, 4]
     *
     * semaine 1 → 3
     * semaine 2 → 1
     * semaine 3 → 5
     * semaine 4 → 4
     * semaine 5 → 3
     * semaine 6 → 1
     * ...
     */
    public function getGroupForWeek($weekNumber)
    {
        $groups = $this->getEffectiveGroupsOrder();

        if (empty($groups)) {
            return null;
        }

        $index = ($weekNumber - 1) % count($groups);

        return $groups[$index];
    }
}