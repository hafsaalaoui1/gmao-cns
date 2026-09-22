<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reading;
use App\Models\Intervention;
use App\Models\Equipment;
use App\Models\EquipmentReadingTemplate;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ReadingController extends Controller
{
    /**
     * ============================================================
     * RÉCUPÉRER LES RELEVÉS D'UNE INTERVENTION
     * ============================================================
     */
    public function getReadings($interventionId)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'message' => 'Utilisateur non authentifié.',
            ], 401);
        }

        $intervention = Intervention::with([
            'readings.equipment',
            'readings.template',
            'readings.takenBy',
            'readings.validatedBy',
        ])->findOrFail($interventionId);

        $isAssignedUser =
            (int) $intervention->user_id === (int) $user->id;

        $isInAssignedGroup =
            !empty($intervention->group_id)
            && !empty($user->group_id)
            && (int) $intervention->group_id === (int) $user->group_id;

        $isAdminOrResponsable = in_array(
            $user->role,
            ['admin', 'responsable'],
            true
        );

        if (
            !$isAssignedUser
            && !$isInAssignedGroup
            && !$isAdminOrResponsable
        ) {
            return response()->json([
                'message' =>
                    'Vous n\'êtes pas autorisé à consulter les relevés de cette intervention.',
            ], 403);
        }

        $readings = $intervention->readings
            ->sortByDesc(function ($reading) {
                return $reading->taken_at ?? $reading->created_at;
            })
            ->values();

        $data = $readings->map(function ($reading) {
            return [
                'id' => $reading->id,
                'equipment_id' => $reading->equipment_id,
                'intervention_id' => $reading->intervention_id,
                'template_id' => $reading->template_id,

                'values' => $reading->values,
                'commentaire' => $reading->commentaire,

                'validation_status' => $reading->validation_status,
                'validation_commentaire' =>
                    $reading->validation_commentaire,

                'taken_by' => $reading->taken_by,
                'taken_at' => $reading->taken_at,

                'validated_by' => $reading->validated_by,
                'validated_at' => $reading->validated_at,

                'equipment' => $reading->equipment,
                'template' => $reading->template,
                'takenBy' => $reading->takenBy,
                'validatedBy' => $reading->validatedBy,
            ];
        });

        return response()->json([
            'message' => 'Relevés récupérés avec succès.',
            'data' => $data,
        ]);
    }


    /**
     * ============================================================
     * SOUMETTRE UN RELEVÉ
     * ============================================================
     *
     * Logique :
     *
     * brouillon
     *      ↓
     * en_attente
     *      ↓
     * valide
     *
     * ou :
     *
     * en_attente
     *      ↓
     * modifications_demandees
     *      ↓
     * en_attente
     *      ↓
     * valide
     *
     * Un relevé déjà validé n'est jamais écrasé.
     */
    public function submitReadings(Request $request, $interventionId)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'message' => 'Utilisateur non authentifié.',
            ], 401);
        }

        $intervention = Intervention::findOrFail($interventionId);

        $isAssignedUser =
            (int) $intervention->user_id === (int) $user->id;

        $isInAssignedGroup =
            !empty($intervention->group_id)
            && !empty($user->group_id)
            && (int) $intervention->group_id === (int) $user->group_id;

        $isAdminOrResponsable = in_array(
            $user->role,
            ['admin', 'responsable'],
            true
        );

        if (
            !$isAssignedUser
            && !$isInAssignedGroup
            && !$isAdminOrResponsable
        ) {
            return response()->json([
                'message' =>
                    'Vous n\'êtes pas autorisé à saisir un relevé pour cette intervention.',
            ], 403);
        }

        $validator = Validator::make(
            $request->all(),
            [
                'template_id' => [
                    'nullable',
                    'integer',
                    'exists:equipment_reading_templates,id',
                ],

                'values' => [
                    'required',
                    'array',
                ],

                'commentaire' => [
                    'nullable',
                    'string',
                ],

                'annexes' => [
                    'nullable',
                    'array',
                ],

                'annexes.*' => [
                    'nullable',
                    'file',
                    'max:10240',
                ],

                'taken_at' => [
                    'nullable',
                    'date',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $values = $validated['values'];

        /**
         * ============================================================
         * ANNEXES
         * ============================================================
         */
        $annexes = [];

        if ($request->hasFile('annexes')) {
            foreach ($request->file('annexes') as $file) {

                if (!$file->isValid()) {
                    continue;
                }

                $path = $file->store(
                    'readings/' . $intervention->id,
                    'public'
                );

                $annexes[] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'url' => Storage::disk('public')->url($path),
                    'size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                ];
            }
        }

        if (!empty($annexes)) {
            $values['_annexes'] = $annexes;
        }

        /**
         * ============================================================
         * CHERCHER UN RELEVÉ MODIFIABLE
         * ============================================================
         *
         * On modifie uniquement :
         *
         * - brouillon
         * - modifications_demandees
         *
         * On ne touche jamais à :
         *
         * - en_attente
         * - valide
         * - rejete
         */
        $reading = Reading::where(
            'intervention_id',
            $intervention->id
        )
            ->where(
                'taken_by',
                $user->id
            )
            ->whereIn(
                'validation_status',
                [
                    'brouillon',
                    'modifications_demandees',
                ]
            )
            ->latest('id')
            ->first();

        $takenAt =
            !empty($validated['taken_at'])
                ? $validated['taken_at']
                : now();

        /**
         * ============================================================
         * CAS 1 : RELEVÉ MODIFIABLE EXISTANT
         * ============================================================
         */
        if ($reading) {

            $reading->update([
                'equipment_id' =>
                    $intervention->equipment_id,

                'template_id' =>
                    $validated['template_id']
                    ?? $reading->template_id,

                'values' =>
                    $values,

                'commentaire' =>
                    array_key_exists(
                        'commentaire',
                        $validated
                    )
                        ? $validated['commentaire']
                        : $reading->commentaire,

                'validation_status' =>
                    'en_attente',

                'validation_commentaire' =>
                    null,

                'taken_by' =>
                    $user->id,

                'taken_at' =>
                    $takenAt,

                'validated_by' =>
                    null,

                'validated_at' =>
                    null,
            ]);

            $reading->refresh();

            $message =
                'Relevé modifié et soumis avec succès. Il est maintenant en attente de validation.';
        }

        /**
         * ============================================================
         * CAS 2 : NOUVEAU RELEVÉ
         * ============================================================
         */
        else {

            $reading = Reading::create([
                'equipment_id' =>
                    $intervention->equipment_id,

                'intervention_id' =>
                    $intervention->id,

                'template_id' =>
                    $validated['template_id']
                    ?? null,

                'values' =>
                    $values,

                'commentaire' =>
                    $validated['commentaire']
                    ?? null,

                'validation_status' =>
                    'en_attente',

                'validation_commentaire' =>
                    null,

                'taken_by' =>
                    $user->id,

                'taken_at' =>
                    $takenAt,

                'validated_by' =>
                    null,

                'validated_at' =>
                    null,
            ]);

            $message =
                'Relevé enregistré avec succès. Il est maintenant en attente de validation.';
        }

        /**
         * ============================================================
         * CHARGER LES RELATIONS
         * ============================================================
         */
        $reading->load([
            'equipment',
            'intervention',
            'template',
            'takenBy',
            'validatedBy',
        ]);

        /**
         * ============================================================
         * NOTIFIER LES RESPONSABLES
         * ============================================================
         */
        $this->notifyResponsablesForNewReading(
            $reading,
            $user
        );

        return response()->json([
            'message' => $message,
            'data' => $reading,
        ], 201);
    }


    /**
     * ============================================================
     * VALIDER / REJETER / DEMANDER MODIFICATION
     * ============================================================
     */
    public function validateReadings(Request $request, $readingId)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'message' => 'Utilisateur non authentifié.',
            ], 401);
        }

        if (!in_array(
            $user->role,
            ['responsable', 'admin'],
            true
        )) {
            return response()->json([
                'message' =>
                    'Non autorisé. Seul le responsable ou l\'administrateur peut traiter un relevé.',
            ], 403);
        }

        $validator = Validator::make(
            $request->all(),
            [
                'action' => [
                    'required',
                    'in:valider,rejeter,demander_modification',
                ],

                'commentaire' => [
                    'nullable',
                    'string',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        if (
            in_array(
                $validated['action'],
                [
                    'rejeter',
                    'demander_modification',
                ],
                true
            )
            &&
            empty(
                trim(
                    $validated['commentaire'] ?? ''
                )
            )
        ) {
            return response()->json([
                'message' =>
                    $validated['action'] === 'rejeter'
                        ? 'Un commentaire est obligatoire pour le rejet.'
                        : 'Veuillez expliquer les modifications demandées.',
            ], 422);
        }

        $reading = Reading::with([
            'intervention',
            'equipment',
            'template',
            'takenBy',
            'validatedBy',
        ])->findOrFail($readingId);

        if ($reading->validation_status !== 'en_attente') {
            return response()->json([
                'message' =>
                    'Ce relevé a déjà été traité.',

                'validation_status' =>
                    $reading->validation_status,
            ], 422);
        }

        $status = match ($validated['action']) {

            'valider' =>
                'valide',

            'rejeter' =>
                'rejete',

            'demander_modification' =>
                'modifications_demandees',

            default =>
                null,
        };

        /**
         * IMPORTANT :
         *
         * On ne touche PAS à values.
         *
         * Les valeurs saisies par l'intervenant
         * restent donc stockées.
         */
        $reading->update([
            'validation_status' =>
                $status,

            'validation_commentaire' =>
                $validated['commentaire'] ?? null,

            'validated_by' =>
                $user->id,

            'validated_at' =>
                now(),
        ]);

        $reading->refresh();

        $reading->load([
            'equipment',
            'intervention',
            'template',
            'takenBy',
            'validatedBy',
        ]);

        $intervention = $reading->intervention;

        /**
         * ============================================================
         * SYNCHRONISER L'INTERVENTION
         * ============================================================
         */
        if ($intervention) {

            if ($validated['action'] === 'valider') {

                $intervention->status = 'validee';
                $intervention->save();

                $this->notifyReadingDecision(
                    $reading,
                    $user,
                    'valide'
                );
            }

            elseif ($validated['action'] === 'rejeter') {

                $intervention->status = 'rejetee';
                $intervention->save();

                $this->notifyReadingDecision(
                    $reading,
                    $user,
                    'rejete'
                );
            }

            elseif (
                $validated['action'] ===
                'demander_modification'
            ) {

                $intervention->status =
                    'modifications_demandees';

                $intervention->save();

                $this->notifyReadingDecision(
                    $reading,
                    $user,
                    'modifications_demandees'
                );
            }
        }

        $message = match ($validated['action']) {

            'valider' =>
                'Relevé validé avec succès.',

            'rejeter' =>
                'Relevé rejeté avec succès. L\'intervention est maintenant marquée comme rejetée.',

            'demander_modification' =>
                'Modifications demandées à l’intervenant.',

            default =>
                'Opération effectuée.',
        };

        return response()->json([
            'message' => $message,
            'data' => $reading,

            'intervention_status' =>
                $intervention
                    ? $intervention->status
                    : null,
        ]);
    }


    /**
     * ============================================================
     * RELEVÉS À VALIDER
     * ============================================================
     *
     * Cette méthode est utilisée par :
     *
     * GET /api/readings/to-validate
     *
     * Elle retourne UNIQUEMENT les relevés :
     *
     * validation_status = en_attente
     */
    public function toValidate()
    {
        $user = Auth::user();

        /**
         * Sécurité :
         * si aucun utilisateur n'est authentifié.
         */
        if (!$user) {
            return response()->json([
                'message' => 'Utilisateur non authentifié.',
                'data' => [],
                'count' => 0,
            ], 401);
        }

        /**
         * Seuls Admin et Responsable peuvent consulter
         * cette liste.
         */
        if (!in_array(
            $user->role,
            ['admin', 'responsable'],
            true
        )) {
            return response()->json([
                'message' => 'Non autorisé.',
                'data' => [],
                'count' => 0,
            ], 403);
        }

        /**
         * ========================================================
         * RÉCUPÉRER LES RELEVÉS EN ATTENTE
         * ========================================================
         */
        $readings = Reading::query()
            ->where(
                'validation_status',
                'en_attente'
            )
            ->with([
                'equipment',
                'intervention',
                'template',
                'takenBy',
                'validatedBy',
            ])
            ->orderByDesc('taken_at')
            ->orderByDesc('id')
            ->get();

        /**
         * ========================================================
         * PRÉPARER LA RÉPONSE
         * ========================================================
         */
        $data = $readings->map(
            function ($reading) {

                /**
                 * ------------------------------------------------
                 * VALUES
                 * ------------------------------------------------
                 */
                $values = $reading->values;

                if (is_string($values)) {
                    $decoded = json_decode(
                        $values,
                        true
                    );

                    $values = is_array($decoded)
                        ? $decoded
                        : [];
                }

                if (!is_array($values)) {
                    $values = [];
                }

                /**
                 * ------------------------------------------------
                 * TEMPLATE
                 * ------------------------------------------------
                 */
                $template = $reading->template;

                $templateData = null;

                if ($template) {

                    $parameters =
                        $template->parameters;

                    if (is_string($parameters)) {
                        $decodedParameters =
                            json_decode(
                                $parameters,
                                true
                            );

                        $parameters =
                            is_array(
                                $decodedParameters
                            )
                                ? $decodedParameters
                                : [];
                    }

                    if (!is_array($parameters)) {
                        $parameters = [];
                    }

                    $templateData = [
                        'id' =>
                            $template->id,

                        'equipment_id' =>
                            $template->equipment_id,

                        'name' =>
                            $template->name
                            ?? $template->template_name
                            ?? null,

                        'template_name' =>
                            $template->template_name
                            ?? $template->name
                            ?? null,

                        'description' =>
                            $template->description
                            ?? null,

                        'parameters' =>
                            $parameters,

                        'created_at' =>
                            $template->created_at,

                        'updated_at' =>
                            $template->updated_at,
                    ];
                }

                /**
                 * ------------------------------------------------
                 * EQUIPMENT
                 * ------------------------------------------------
                 */
                $equipmentData =
                    $reading->equipment;

                /**
                 * ------------------------------------------------
                 * INTERVENTION
                 * ------------------------------------------------
                 */
                $interventionData =
                    $reading->intervention;

                /**
                 * ------------------------------------------------
                 * INTERVENANT
                 * ------------------------------------------------
                 */
                $takenByData = null;

                if ($reading->takenBy) {

                    $takenByData = [
                        'id' =>
                            $reading->takenBy->id,

                        'name' =>
                            $reading->takenBy->name,

                        'username' =>
                            $reading->takenBy->username
                            ?? null,

                        'email' =>
                            $reading->takenBy->email,

                        'role' =>
                            $reading->takenBy->role,
                    ];
                }

                /**
                 * ------------------------------------------------
                 * RESPONSABLE QUI A VALIDÉ
                 * ------------------------------------------------
                 */
                $validatedByData = null;

                if ($reading->validatedBy) {

                    $validatedByData = [
                        'id' =>
                            $reading->validatedBy->id,

                        'name' =>
                            $reading->validatedBy->name,

                        'username' =>
                            $reading->validatedBy->username
                            ?? null,

                        'email' =>
                            $reading->validatedBy->email,

                        'role' =>
                            $reading->validatedBy->role,
                    ];
                }

                /**
                 * ------------------------------------------------
                 * FICHE FINALE
                 * ------------------------------------------------
                 */
                return [
                    'id' =>
                        $reading->id,

                    'equipment_id' =>
                        $reading->equipment_id,

                    'intervention_id' =>
                        $reading->intervention_id,

                    'template_id' =>
                        $reading->template_id,

                    /**
                     * Valeurs saisies par l'intervenant.
                     */
                    'values' =>
                        $values,

                    'commentaire' =>
                        $reading->commentaire,

                    /**
                     * Validation.
                     */
                    'validation_status' =>
                        $reading->validation_status,

                    'validation_commentaire' =>
                        $reading->validation_commentaire,

                    /**
                     * Intervenant.
                     */
                    'taken_by' =>
                        $reading->taken_by,

                    'taken_at' =>
                        $reading->taken_at,

                    /**
                     * Responsable.
                     */
                    'validated_by' =>
                        $reading->validated_by,

                    'validated_at' =>
                        $reading->validated_at,

                    /**
                     * Relations.
                     */
                    'equipment' =>
                        $equipmentData,

                    'intervention' =>
                        $interventionData,

                    'template' =>
                        $templateData,

                    'takenBy' =>
                        $takenByData,

                    'validatedBy' =>
                        $validatedByData,
                ];
            }
        )->values();

        /**
         * Log utile pour vérifier dans Laravel
         * combien de relevés sont envoyés.
         */
        Log::info(
            'Relevés à valider récupérés',
            [
                'user_id' =>
                    $user->id,

                'user_role' =>
                    $user->role,

                'count' =>
                    $data->count(),

                'reading_ids' =>
                    $data->pluck('id')->values()->all(),
            ]
        );

        return response()->json([
            'success' => true,

            'message' =>
                'Relevés en attente de validation récupérés avec succès.',

            'data' =>
                $data,

            'count' =>
                $data->count(),
        ]);
    }


    /**
     * ============================================================
     * HISTORIQUE DES RELEVÉS
     * ============================================================
     */
    public function history()
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'message' => 'Utilisateur non authentifié.',
            ], 401);
        }

        $query = Reading::with([
            'equipment',
            'intervention',
            'template',
            'takenBy',
            'validatedBy',
        ]);

        /**
         * Intervenant :
         * uniquement ses relevés.
         */
        if ($user->role === 'intervenant') {

            $query->where(
                'taken_by',
                $user->id
            );
        }

        /**
         * Admin / Responsable :
         * tous les relevés.
         */
        elseif (
            !in_array(
                $user->role,
                [
                    'admin',
                    'responsable',
                ],
                true
            )
        ) {

            return response()->json([
                'message' =>
                    'Non autorisé.',
            ], 403);
        }

        $readings = $query
            ->orderByDesc('taken_at')
            ->orderByDesc('id')
            ->get();

        $data = $readings->map(
            function ($reading) {

                return [
                    'id' =>
                        $reading->id,

                    'equipment_id' =>
                        $reading->equipment_id,

                    'intervention_id' =>
                        $reading->intervention_id,

                    'template_id' =>
                        $reading->template_id,

                    'values' =>
                        $reading->values,

                    'commentaire' =>
                        $reading->commentaire,

                    'validation_status' =>
                        $reading->validation_status,

                    'validation_commentaire' =>
                        $reading->validation_commentaire,

                    'taken_by' =>
                        $reading->taken_by,

                    'taken_at' =>
                        $reading->taken_at,

                    'validated_by' =>
                        $reading->validated_by,

                    'validated_at' =>
                        $reading->validated_at,

                    'equipment' =>
                        $reading->equipment,

                    'intervention' =>
                        $reading->intervention,

                    'template' =>
                        $reading->template,

                    'takenBy' =>
                        $reading->takenBy,

                    'validatedBy' =>
                        $reading->validatedBy,
                ];
            }
        );

        return response()->json([
            'message' =>
                'Historique des relevés récupéré avec succès.',

            'data' =>
                $data,
        ]);
    }


    /**
     * ============================================================
     * RELEVÉS D'UN ÉQUIPEMENT
     * ============================================================
     */
    public function byEquipment($equipmentId)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'message' => 'Utilisateur non authentifié.',
            ], 401);
        }

        $equipment =
            Equipment::findOrFail(
                $equipmentId
            );

        $query = Reading::where(
            'equipment_id',
            $equipmentId
        )
            ->with([
                'equipment',
                'intervention',
                'template',
                'takenBy',
                'validatedBy',
            ]);

        if ($user->role === 'intervenant') {

            $query->where(
                'taken_by',
                $user->id
            );
        }

        elseif (
            !in_array(
                $user->role,
                [
                    'admin',
                    'responsable',
                ],
                true
            )
        ) {

            return response()->json([
                'message' =>
                    'Non autorisé.',
            ], 403);
        }

        $readings = $query
            ->orderByDesc('taken_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'message' =>
                'Relevés de l\'équipement récupérés avec succès.',

            'equipment' =>
                $equipment,

            'data' =>
                $readings,
        ]);
    }


    /**
     * ============================================================
     * RÉCUPÉRER LES MODÈLES DE RELEVÉS
     * ============================================================
     */
    public function getTemplates($equipmentId)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'message' =>
                    'Utilisateur non authentifié.',
            ], 401);
        }

        if (!in_array(
            $user->role,
            [
                'admin',
                'responsable',
                'intervenant',
            ],
            true
        )) {
            return response()->json([
                'message' =>
                    'Non autorisé.',
            ], 403);
        }

        $templates =
            EquipmentReadingTemplate::where(
                'equipment_id',
                $equipmentId
            )
                ->orderByDesc('created_at')
                ->get();

        return response()->json([
            'message' =>
                'Modèles de relevés récupérés avec succès.',

            'data' =>
                $templates,
        ]);
    }


    /**
     * ============================================================
     * CRÉER UN MODÈLE DE RELEVÉ
     * ============================================================
     */
    public function createTemplate(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'message' =>
                    'Utilisateur non authentifié.',
            ], 401);
        }

        if (!in_array(
            $user->role,
            [
                'admin',
                'responsable',
            ],
            true
        )) {
            return response()->json([
                'message' =>
                    'Non autorisé.',
            ], 403);
        }

        $validator = Validator::make(
            $request->all(),
            [
                'equipment_id' => [
                    'required',
                    'integer',
                    'exists:equipment,id',
                ],

                'name' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'description' => [
                    'nullable',
                    'string',
                ],

                'parameters' => [
                    'required',
                    'array',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'message' =>
                    'Données invalides.',

                'errors' =>
                    $validator->errors(),
            ], 422);
        }

        $validated =
            $validator->validated();

        $template =
            EquipmentReadingTemplate::create([
                'equipment_id' =>
                    $validated['equipment_id'],

                'name' =>
                    $validated['name'],

                'description' =>
                    $validated['description']
                    ?? null,

                'parameters' =>
                    $validated['parameters'],
            ]);

        return response()->json([
            'message' =>
                'Modèle de relevé créé avec succès.',

            'data' =>
                $template,
        ], 201);
    }


    /**
     * ============================================================
     * MÉTHODE SUBMIT
     * ============================================================
     */
    public function submit(Request $request)
    {
        $validator = Validator::make(
            $request->all(),
            [
                'intervention_id' => [
                    'required',
                    'integer',
                    'exists:interventions,id',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'message' =>
                    'intervention_id est obligatoire.',

                'errors' =>
                    $validator->errors(),
            ], 422);
        }

        return $this->submitReadings(
            $request,
            $request->intervention_id
        );
    }


    /**
     * ============================================================
     * NOTIFIER LES RESPONSABLES
     * ============================================================
     */
    private function notifyResponsablesForNewReading(
        Reading $reading,
        User $intervenant
    ) {
        $responsables =
            User::where(
                'role',
                'responsable'
            )->get();

        foreach ($responsables as $responsable) {

            if (
                (int) $responsable->id ===
                (int) $intervenant->id
            ) {
                continue;
            }

            $intervenantName =
                $intervenant->name
                ?? $intervenant->username
                ?? 'Intervenant';

            $this->createNotification(
                $responsable,

                'Nouveau relevé à valider',

                'L’intervenant ' .
                    $intervenantName .
                    ' a soumis un relevé pour validation.',

                $reading,

                'normal'
            );
        }
    }


    /**
     * ============================================================
     * NOTIFICATION DE DÉCISION
     * ============================================================
     */
    private function notifyReadingDecision(
        Reading $reading,
        User $responsable,
        string $decision
    ) {
        $intervenant =
            $reading->takenBy;

        if (!$intervenant) {
            return;
        }

        $responsableName =
            $responsable->name
            ?? $responsable->username
            ?? 'Responsable';

        if ($decision === 'valide') {

            $title =
                'Relevé validé';

            $message =
                'Votre relevé a été validé par ' .
                $responsableName .
                '.';

            $priority =
                'normal';
        }

        elseif ($decision === 'rejete') {

            $title =
                'Relevé rejeté';

            $message =
                'Votre relevé a été rejeté par ' .
                $responsableName .
                '.';

            if (
                !empty(
                    $reading->validation_commentaire
                )
            ) {
                $message .=
                    ' Commentaire : ' .
                    $reading->validation_commentaire;
            }

            $priority =
                'high';
        }

        elseif (
            $decision ===
            'modifications_demandees'
        ) {

            $title =
                'Modifications demandées';

            $message =
                'Des modifications sont demandées sur votre relevé par ' .
                $responsableName .
                '.';

            if (
                !empty(
                    $reading->validation_commentaire
                )
            ) {
                $message .=
                    ' Commentaire : ' .
                    $reading->validation_commentaire;
            }

            $priority =
                'high';
        }

        else {
            return;
        }

        $this->createNotification(
            $intervenant,
            $title,
            $message,
            $reading,
            $priority
        );
    }


    /**
     * ============================================================
     * CRÉER UNE NOTIFICATION
     * ============================================================
     */
    private function createNotification(
        User $user,
        string $title,
        string $message,
        Reading $reading,
        string $priority = 'normal'
    ) {
        try {

            Notification::create([
                'user_id' =>
                    $user->id,

                'title' =>
                    $title,

                'message' =>
                    $message,

                'type' =>
                    'reading',

                'related_id' =>
                    $reading->id,

                'data' => [
                    'reading_id' =>
                        $reading->id,

                    'intervention_id' =>
                        $reading->intervention_id,

                    'equipment_id' =>
                        $reading->equipment_id,

                    'validation_status' =>
                        $reading->validation_status,
                ],

                'priority' =>
                    $priority,

                'read_at' =>
                    null,
            ]);

        } catch (\Throwable $e) {

            Log::error(
                'Erreur lors de la création d\'une notification de relevé.',
                [
                    'reading_id' =>
                        $reading->id,

                    'user_id' =>
                        $user->id,

                    'error' =>
                        $e->getMessage(),
                ]
            );
        }
    }
}