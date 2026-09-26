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
     * existants triés par ID.
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

            // Convertir les IDs en entiers
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
        // Dans ce cas, prendre tous les groupes existants par ID.
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
     * AJOUTER AUTOMATIQUEMENT UN GROUPE À LA ROTATION
     * ============================================================
     *
     * Le nouveau groupe est ajouté à la fin de groups_order.
     *
     * Exemple :
     *
     * [1, 2, 3]
     *
     * devient :
     *
     * [1, 2, 3, 4]
     *
     * si le nouveau groupe possède l'ID 4.
     */
    public function addGroupToRotation($groupId)
    {
        $groupId = (int) $groupId;

        // Récupérer l'ordre actuel
        $groupsOrder = $this->groups_order;

        if (!is_array($groupsOrder)) {
            $groupsOrder = [];
        }

        // Convertir les IDs en entiers
        $groupsOrder = array_map(
            'intval',
            $groupsOrder
        );

        // Supprimer les doublons
        $groupsOrder = array_values(
            array_unique($groupsOrder)
        );

        // Ajouter uniquement si le groupe n'existe pas déjà
        if (!in_array($groupId, $groupsOrder, true)) {
            $groupsOrder[] = $groupId;
        }

        // Sauvegarder
        $this->groups_order = $groupsOrder;
        $this->save();

        return $groupsOrder;
    }

    /**
     * ============================================================
     * RETIRER AUTOMATIQUEMENT UN GROUPE DE LA ROTATION
     * ============================================================
     *
     * Lorsqu'un groupe est supprimé, son ID est retiré de
     * groups_order.
     */
    public function removeGroupFromRotation($groupId)
    {
        $groupId = (int) $groupId;

        $groupsOrder = $this->groups_order;

        if (!is_array($groupsOrder)) {
            $groupsOrder = [];
        }

        // Convertir les IDs en entiers
        $groupsOrder = array_map(
            'intval',
            $groupsOrder
        );

        // Retirer le groupe
        $groupsOrder = array_values(
            array_filter(
                $groupsOrder,
                fn ($id) => $id !== $groupId
            )
        );

        // Sauvegarder
        $this->groups_order = $groupsOrder;
        $this->save();

        return $groupsOrder;
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