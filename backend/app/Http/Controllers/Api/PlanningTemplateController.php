<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlanningTemplate;
use App\Models\Intervention;
use App\Models\GroupRotation;
use App\Services\InterventionGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlanningTemplateController extends Controller
{
    /**
     * ============================================================
     * INDEX
     * ============================================================
     */
    public function index()
    {
        $templates = PlanningTemplate::with([
            'equipment',
            'rotation',
            'readingCanvas',
            'exceptions',
            'createdBy',
        ])
            ->orderBy('equipment_id')
            ->get();

        return response()->json([
            'data' => $templates,
        ]);
    }

    /**
     * ============================================================
     * STORE
     * ============================================================
     *
     * Création d'un modèle de maintenance récurrente.
     *
     * IMPORTANT :
     *
     * group_id = groupe choisi pour la PREMIÈRE intervention.
     *
     * Exemple :
     *
     * Rotation :
     * ALAOUI -> HAFSALAOU -> GROUPE C
     *
     * Si l'utilisateur choisit ALAOUI :
     *
     * semaine 1 = ALAOUI
     * semaine 2 = HAFSALAOU
     * semaine 3 = GROUPE C
     * semaine 4 = ALAOUI
     *
     * La rotation est gérée par InterventionGenerator.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'equipment_id' => [
                'required',
                'exists:equipments,id',
            ],

            'reading_canvas_id' => [
                'nullable',
                'exists:equipment_reading_templates,id',
            ],

            'day_of_week' => [
                'required',
                'integer',
                'min:1',
                'max:7',
            ],

            'start_time' => [
                'nullable',
                'date_format:H:i',
            ],

            'duration' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'type' => [
                'nullable',
                'string',
            ],

            'priority' => [
                'nullable',
                'in:faible,normale,elevée,urgente,critique',
            ],

            'description' => [
                'nullable',
                'string',
            ],

            /**
             * Groupe choisi pour la première intervention.
             */
            'group_id' => [
                'required',
                'integer',
                'exists:groups,id',
            ],

            'start_date' => [
                'required',
                'date',
            ],

            'end_date' => [
                'nullable',
                'date',
                'after_or_equal:start_date',
            ],

            'is_active' => [
                'nullable',
                'boolean',
            ],

            'reading_pdf_path' => [
                'nullable',
                'string',
                'max:500',
            ],
        ]);

        /**
         * ========================================================
         * GROUPE DE DÉPART
         * ========================================================
         *
         * On récupère exactement l'ID envoyé par React.
         *
         * Exemple :
         * Alaoui = 2
         *
         * $startingGroupId = 2
         */
        $startingGroupId = (int) $validated['group_id'];

        /**
         * ========================================================
         * RECHERCHE DE LA ROTATION
         * ========================================================
         *
         * On cherche une rotation active contenant le groupe
         * sélectionné.
         */
        $rotation = null;

        $activeRotations = GroupRotation::where(
            'is_active',
            true
        )
            ->orderBy('id')
            ->get();

        foreach ($activeRotations as $candidateRotation) {

            $groupsOrder = $candidateRotation->groups_order;

            /**
             * Si groups_order est stocké en JSON sous forme
             * de chaîne, on le décode.
             */
            if (is_string($groupsOrder)) {
                $groupsOrder = json_decode(
                    $groupsOrder,
                    true
                );
            }

            if (!is_array($groupsOrder)) {
                continue;
            }

            /**
             * Normaliser les IDs.
             */
            $groupsOrder = array_map(
                'intval',
                $groupsOrder
            );

            /**
             * Vérifier si le groupe choisi existe dans
             * cette rotation.
             */
            if (
                in_array(
                    $startingGroupId,
                    $groupsOrder,
                    true
                )
            ) {
                $rotation = $candidateRotation;

                break;
            }
        }

        /**
         * ========================================================
         * AUCUNE ROTATION
         * ========================================================
         */
        if (!$rotation) {
            return response()->json([
                'message' =>
                    'Le groupe sélectionné ne fait partie d’aucune rotation active.',

                'errors' => [
                    'group_id' => [
                        'Veuillez sélectionner un groupe appartenant à une rotation active.'
                    ],
                ],
            ], 422);
        }

        /**
         * ========================================================
         * NORMALISER L'ORDRE DE ROTATION
         * ========================================================
         */
        $groupsOrder = $rotation->groups_order;

        if (is_string($groupsOrder)) {
            $groupsOrder = json_decode(
                $groupsOrder,
                true
            );
        }

        if (!is_array($groupsOrder)) {
            return response()->json([
                'message' =>
                    'La configuration de la rotation est invalide.',
            ], 422);
        }

        $groupsOrder = array_values(
            array_map(
                'intval',
                $groupsOrder
            )
        );

        /**
         * Vérification finale :
         * le groupe choisi doit être présent.
         */
        if (
            !in_array(
                $startingGroupId,
                $groupsOrder,
                true
            )
        ) {
            return response()->json([
                'message' =>
                    'Le groupe sélectionné n’existe pas dans l’ordre de rotation.',
            ], 422);
        }

        /**
         * ========================================================
         * CRÉATION DU TEMPLATE
         * ========================================================
         *
         * TRÈS IMPORTANT :
         *
         * On sauvegarde directement le group_id sélectionné.
         *
         * Donc si React envoie :
         *
         * group_id = 2
         *
         * le template aura :
         *
         * group_id = 2
         *
         * Il ne sera PAS remplacé par le premier groupe
         * de la rotation.
         */
        $template = PlanningTemplate::create([
            'equipment_id' =>
                $validated['equipment_id'],

            'reading_canvas_id' =>
                $validated['reading_canvas_id'] ?? null,

            'day_of_week' =>
                $validated['day_of_week'],

            'start_time' =>
                $validated['start_time'] ?? '09:00:00',

            'duration' =>
                $validated['duration'] ?? 60,

            'type' =>
                $validated['type'] ?? 'preventive',

            'priority' =>
                $validated['priority'] ?? 'normale',

            'description' =>
                $validated['description'] ?? null,

            /**
             * Groupe choisi par l'utilisateur.
             */
            'group_id' =>
                $startingGroupId,

            /**
             * Rotation trouvée automatiquement.
             */
            'group_rotation_id' =>
                $rotation->id,

            /**
             * Ancien système conservé pour compatibilité.
             */
            'start_offset' => 0,

            /**
             * Date réellement sélectionnée dans le planning.
             */
            'start_date' =>
                $validated['start_date'],

            /**
             * Si aucune date de fin n'est fournie :
             * fin de l'année correspondant à start_date.
             */
            'end_date' =>
                $validated['end_date']
                    ?? date(
                        'Y-12-31',
                        strtotime(
                            $validated['start_date']
                        )
                    ),

            'is_active' =>
                $validated['is_active'] ?? true,

            'created_by' =>
                auth()->id(),

            'reading_pdf_path' =>
                $validated['reading_pdf_path'] ?? null,
        ]);

        /**
         * ========================================================
         * CHARGER LES RELATIONS
         * ========================================================
         */
        $template->load([
            'equipment',
            'rotation',
            'readingCanvas',
            'exceptions',
            'createdBy',
        ]);

        /**
         * ========================================================
         * RÉPONSE
         * ========================================================
         */
        return response()->json([
            'data' => $template,

            'message' =>
                'Template créé avec succès.',

            /**
             * Informations utiles pour vérifier le groupe
             * réellement enregistré.
             */
            'rotation_info' => [
                'starting_group_id' =>
                    $startingGroupId,

                'rotation_id' =>
                    $rotation->id,

                'groups_order' =>
                    $groupsOrder,
            ],
        ], 201);
    }

    /**
     * ============================================================
     * SHOW
     * ============================================================
     */
    public function show($id)
    {
        $template = PlanningTemplate::with([
            'equipment',
            'rotation',
            'readingCanvas',
            'exceptions',
            'createdBy',
        ])
            ->findOrFail($id);

        return response()->json([
            'data' => $template,
        ]);
    }

    /**
     * ============================================================
     * UPDATE
     * ============================================================
     */
    public function update(
        Request $request,
        $id
    ) {
        $template =
            PlanningTemplate::findOrFail($id);

        $validated = $request->validate([
            'equipment_id' =>
                'sometimes|exists:equipments,id',

            'reading_canvas_id' =>
                'sometimes|nullable|exists:equipment_reading_templates,id',

            'day_of_week' =>
                'sometimes|integer|min:1|max:7',

            'start_time' =>
                'sometimes|nullable|date_format:H:i',

            'duration' =>
                'sometimes|nullable|integer|min:1',

            'type' =>
                'sometimes|nullable|string',

            'priority' =>
                'sometimes|nullable|in:faible,normale,elevée,urgente,critique',

            'description' =>
                'sometimes|nullable|string',

            /**
             * Groupe de départ.
             */
            'group_id' =>
                'sometimes|integer|exists:groups,id',

            'start_date' =>
                'sometimes|date',

            'end_date' =>
                'sometimes|nullable|date|after_or_equal:start_date',

            'is_active' =>
                'sometimes|boolean',

            'reading_pdf_path' =>
                'sometimes|nullable|string|max:500',
        ]);

        /**
         * ========================================================
         * SI LE GROUPE DE DÉPART EST MODIFIÉ
         * ========================================================
         */
        if (isset($validated['group_id'])) {

            $startingGroupId =
                (int) $validated['group_id'];

            $rotation = null;

            $activeRotations =
                GroupRotation::where(
                    'is_active',
                    true
                )
                    ->orderBy('id')
                    ->get();

            foreach (
                $activeRotations
                as $candidateRotation
            ) {

                $groupsOrder =
                    $candidateRotation->groups_order;

                if (is_string($groupsOrder)) {
                    $groupsOrder =
                        json_decode(
                            $groupsOrder,
                            true
                        );
                }

                if (!is_array($groupsOrder)) {
                    continue;
                }

                $groupsOrder =
                    array_map(
                        'intval',
                        $groupsOrder
                    );

                if (
                    in_array(
                        $startingGroupId,
                        $groupsOrder,
                        true
                    )
                ) {
                    $rotation =
                        $candidateRotation;

                    break;
                }
            }

            /**
             * Aucun groupe trouvé dans une rotation active.
             */
            if (!$rotation) {
                return response()->json([
                    'message' =>
                        'Le groupe sélectionné ne fait partie d’aucune rotation active.',

                    'errors' => [
                        'group_id' => [
                            'Veuillez sélectionner un groupe appartenant à une rotation active.'
                        ],
                    ],
                ], 422);
            }

            /**
             * Garder le groupe sélectionné comme groupe
             * de départ.
             */
            $validated['group_id'] =
                $startingGroupId;

            /**
             * Mettre à jour la rotation associée.
             */
            $validated['group_rotation_id'] =
                $rotation->id;
        }

        /**
         * ========================================================
         * MISE À JOUR
         * ========================================================
         */
        $template->update(
            $validated
        );

        /**
         * ========================================================
         * RECHARGER LES RELATIONS
         * ========================================================
         */
        $template->load([
            'equipment',
            'rotation',
            'readingCanvas',
            'exceptions',
            'createdBy',
        ]);

        return response()->json([
            'data' => $template,

            'message' =>
                'Template mis à jour.',
        ]);
    }

    /**
     * ============================================================
     * DESTROY
     * ============================================================
     */
    public function destroy($id)
    {
        $template =
            PlanningTemplate::findOrFail($id);

        DB::transaction(
            function () use (
                $template,
                $id
            ) {

                /**
                 * Supprimer toutes les interventions
                 * générées par cette récurrence.
                 */
                Intervention::where(
                    'planning_template_id',
                    $id
                )->delete();

                /**
                 * Supprimer les exceptions.
                 */
                $template
                    ->exceptions()
                    ->delete();

                /**
                 * Supprimer le template.
                 */
                $template->delete();
            }
        );

        return response()->json([
            'message' =>
                'La récurrence et toutes ses interventions ont été supprimées pour toute l’année.',
        ]);
    }

    /**
     * ============================================================
     * GENERATE
     * ============================================================
     */
    public function generate(
        Request $request,
        $id
    ) {
        $template =
            PlanningTemplate::with([
                'rotation',
                'readingCanvas',
                'exceptions',
            ])
                ->findOrFail($id);

        $year =
            $request->get(
                'year',
                date('Y')
            );

        $generator =
            new InterventionGenerator();

        $count =
            $generator->generateForTemplate(
                $template,
                $year
            );

        return response()->json([
            'message' =>
                'Interventions générées avec succès pour l’année '
                . $year,

            'count' =>
                $count,
        ]);
    }

    /**
     * ============================================================
     * GENERATE ALL
     * ============================================================
     */
    public function generateAll(
        Request $request
    ) {
        $year =
            $request->get(
                'year',
                date('Y')
            );

        $generator =
            new InterventionGenerator();

        $count =
            $generator->generateForAll(
                $year
            );

        return response()->json([
            'message' =>
                'Toutes les interventions ont été générées pour l’année '
                . $year,

            'count' =>
                $count,
        ]);
    }
}