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
     * Les interventions suivantes sont automatiquement réparties
     * entre tous les groupes existants grâce à GroupRotation.
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
         * Le groupe envoyé par React devient le groupe
         * de la première intervention.
         */
        $startingGroupId = (int) $validated['group_id'];

        /**
         * ========================================================
         * RECHERCHE DE LA ROTATION ACTIVE
         * ========================================================
         *
         * La rotation n'est plus recherchée en fonction de
         * groups_order.
         *
         * On prend simplement la rotation active.
         *
         * Les groupes utilisés par cette rotation sont ensuite
         * récupérés dynamiquement depuis la table groups.
         */
        $rotation = GroupRotation::where('is_active', true)
            ->orderBy('id')
            ->first();

        /**
         * ========================================================
         * AUCUNE ROTATION ACTIVE
         * ========================================================
         */
        if (!$rotation) {
            return response()->json([
                'message' =>
                    'Aucune rotation active n’est disponible.',

                'errors' => [
                    'group_id' => [
                        'Veuillez créer ou activer une rotation avant de créer une récurrence.'
                    ],
                ],
            ], 422);
        }

        /**
         * ========================================================
         * ORDRE DE ROTATION DYNAMIQUE
         * ========================================================
         *
         * IMPORTANT :
         *
         * On n'utilise plus directement :
         *
         *     $rotation->groups_order
         *
         * car cette ancienne valeur peut contenir seulement
         * [1, 3].
         *
         * getEffectiveGroupsOrder() récupère automatiquement
         * tous les groupes actuellement présents en base.
         *
         * Exemple :
         *
         * groupes existants :
         *     [1, 3, 4]
         *
         * rotation dynamique :
         *     [1, 3, 4]
         */
        $groupsOrder = $rotation->getEffectiveGroupsOrder();

        /**
         * ========================================================
         * VÉRIFICATION DU GROUPE DE DÉPART
         * ========================================================
         *
         * Le groupe doit exister dans la liste dynamique.
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
                    'Le groupe sélectionné n’est pas disponible dans la rotation dynamique.',

                'errors' => [
                    'group_id' => [
                        'Le groupe sélectionné doit exister dans la liste des groupes.'
                    ],
                ],
            ], 422);
        }

        /**
         * ========================================================
         * CRÉATION DU TEMPLATE
         * ========================================================
         *
         * Le groupe sélectionné est conservé comme groupe
         * de départ.
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
             * Informations utiles pour vérifier la rotation.
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

            /**
             * ====================================================
             * RECHERCHE DE LA ROTATION ACTIVE
             * ====================================================
             *
             * On ne vérifie plus groups_order.
             * La rotation utilise automatiquement tous les
             * groupes existants.
             */
            $rotation = GroupRotation::where('is_active', true)
                ->orderBy('id')
                ->first();

            /**
             * ====================================================
             * AUCUNE ROTATION ACTIVE
             * ====================================================
             */
            if (!$rotation) {
                return response()->json([
                    'message' =>
                        'Aucune rotation active n’est disponible.',

                    'errors' => [
                        'group_id' => [
                            'Veuillez créer ou activer une rotation avant de modifier cette récurrence.'
                        ],
                    ],
                ], 422);
            }

            /**
             * ====================================================
             * ORDRE DE ROTATION DYNAMIQUE
             * ====================================================
             */
            $groupsOrder =
                $rotation->getEffectiveGroupsOrder();

            /**
             * ====================================================
             * VÉRIFICATION DU GROUPE
             * ====================================================
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
                        'Le groupe sélectionné n’est pas disponible dans la rotation dynamique.',

                    'errors' => [
                        'group_id' => [
                            'Le groupe sélectionné doit exister dans la liste des groupes.'
                        ],
                    ],
                ], 422);
            }

            /**
             * ====================================================
             * GARDER LE GROUPE COMME GROUPE DE DÉPART
             * ====================================================
             */
            $validated['group_id'] =
                $startingGroupId;

            /**
             * ====================================================
             * METTRE À JOUR LA ROTATION ASSOCIÉE
             * ====================================================
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