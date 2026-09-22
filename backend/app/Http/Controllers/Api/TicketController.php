<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TicketController extends Controller
{
    /**
     * Statuts possibles d'un ticket
     */
    private const STATUSES = [
        'nouveau',
        'assigne',
        'en_cours',
        'en_attente',
        'resolu',
        'cloture',
    ];

    /**
     * Rôles autorisés à gérer les tickets
     */
    private const MANAGER_ROLES = [
        'admin',
        'responsable',
    ];

    /**
     * Transitions autorisées pour un intervenant
     */
    private const INTERVENANT_TRANSITIONS = [
        'nouveau' => [],
        'assigne' => ['en_cours'],
        'en_cours' => ['en_attente', 'resolu'],
        'en_attente' => ['en_cours', 'resolu'],
        'resolu' => [],
        'cloture' => [],
    ];

    /**
     * ============================================================
     * LISTE DES TICKETS
     * ============================================================
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = Ticket::with([
            'equipment',
            'declaredBy',
            'assignedTo',
            'group',
        ])
            ->where(function ($q) {
                $q->where('status', '!=', 'cloture')
                    ->orWhere(function ($q) {
                        $q->where('status', 'cloture')
                            ->whereDate(
                                'resolution_date',
                                now()->toDateString()
                            );
                    });
            })
            ->orderByDesc('created_at');

        /**
         * Admin / Responsable :
         * voient tous les tickets visibles.
         */
        if ($this->isManager($user)) {

            $tickets = $query->get();

        } else {

            /**
             * Intervenant :
             * voit les tickets qui lui sont directement affectés
             * ou affectés à son groupe.
             */
            $tickets = $query
                ->where(function ($q) use ($user) {

                    $q->where('assigned_to', $user->id);

                    if (!empty($user->group_id)) {
                        $q->orWhere(
                            'group_id',
                            $user->group_id
                        );
                    }

                })
                ->get();
        }

        /**
         * Informations utilisées par le frontend.
         */
        $tickets->each(function ($ticket) {

            $ticket->type = 'corrective';
            $ticket->source = 'ticket';
            $ticket->display_title = 'Ticket #' . $ticket->id;

        });

        return response()->json([
            'success' => true,
            'data' => $tickets,
        ]);
    }

    /**
     * ============================================================
     * CREER UN TICKET
     * ============================================================
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([

            'equipment_id' => [
                'required',
                'exists:equipments,id',
            ],

            'description' => [
                'required',
                'string',
                'max:5000',
            ],

            'priority' => [
                'required',
                Rule::in([
                    'faible',
                    'normale',
                    'elevee',
                    'urgente',
                ]),
            ],

            'assigned_to' => [
                'nullable',
                'exists:users,id',
            ],

            'group_id' => [
                'nullable',
                'exists:groups,id',
            ],
        ]);

        /**
         * Un intervenant ne peut pas choisir lui-même
         * l'intervenant ou le groupe affecté.
         */
        if ($this->isIntervenant($user)) {

            $validated['assigned_to'] = null;
            $validated['group_id'] = null;
        }

        /**
         * Un ticket ne peut pas être affecté simultanément
         * à une personne et à un groupe.
         */
        if (
            !empty($validated['assigned_to']) &&
            !empty($validated['group_id'])
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Un ticket ne peut pas être affecté simultanément à un intervenant et à un groupe.',
            ], 422);
        }

        /**
         * Vérifier l'intervenant affecté.
         */
        if (!empty($validated['assigned_to'])) {

            $assignedUser =
                User::find($validated['assigned_to']);

            if (
                !$assignedUser ||
                !$assignedUser->is_active ||
                !$this->isIntervenant($assignedUser)
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'L’intervenant sélectionné est invalide ou inactif.',
                ], 422);
            }
        }

        /**
         * Création du ticket.
         */
        $ticket = Ticket::create([

            'equipment_id' =>
                $validated['equipment_id'],

            'declared_by' =>
                $user->id,

            'declared_date' =>
                now(),

            'description' =>
                $validated['description'],

            'priority' =>
                $validated['priority'],

            'status' =>
                (
                    !empty($validated['assigned_to']) ||
                    !empty($validated['group_id'])
                )
                    ? 'assigne'
                    : 'nouveau',

            'assigned_to' =>
                $validated['assigned_to'] ?? null,

            'group_id' =>
                $validated['group_id'] ?? null,
        ]);

        /**
         * Notification de création.
         */
        $this->notifyTicketCreated($ticket);

        return response()->json([
            'success' => true,
            'message' => 'Ticket créé avec succès.',
            'data' => $ticket->load([
                'equipment',
                'declaredBy',
                'assignedTo',
                'group',
            ]),
        ], 201);
    }

    /**
     * ============================================================
     * AFFICHER UN TICKET
     * ============================================================
     */
    public function show($id)
    {
        $user = Auth::user();

        $ticket = Ticket::with([
            'equipment',
            'declaredBy',
            'assignedTo',
            'group',
        ])->find($id);

        if (!$ticket) {

            return response()->json([
                'success' => false,
                'message' => 'Ticket introuvable.',
            ], 404);
        }

        /**
         * Vérification des droits pour l'intervenant.
         */
        if (
            $this->isIntervenant($user) &&
            !$this->isAssignedToIntervenant(
                $ticket,
                $user
            )
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Vous n’êtes pas autorisé à consulter ce ticket.',
            ], 403);
        }

        $ticket->type = 'corrective';
        $ticket->source = 'ticket';
        $ticket->display_title =
            'Ticket #' . $ticket->id;

        return response()->json([
            'success' => true,
            'data' => $ticket,
        ]);
    }

    /**
     * ============================================================
     * MODIFIER UN TICKET
     * ============================================================
     */
    public function update(
        Request $request,
        $id
    ) {
        $user = Auth::user();

        $ticket = Ticket::find($id);

        if (!$ticket) {

            return response()->json([
                'success' => false,
                'message' => 'Ticket introuvable.',
            ], 404);
        }

        /**
         * Un ticket clôturé ne peut plus être modifié.
         */
        if ($ticket->status === 'cloture') {

            return response()->json([
                'success' => false,
                'message' =>
                    'Un ticket clôturé ne peut plus être modifié.',
            ], 422);
        }

        /**
         * Intervenant :
         * peut modifier uniquement diagnostic et solution.
         */
        if ($this->isIntervenant($user)) {

            if (
                !$this->isAssignedToIntervenant(
                    $ticket,
                    $user
                )
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'Vous n’êtes pas autorisé à modifier ce ticket.',
                ], 403);
            }

            $validated = $request->validate([

                'diagnostic' => [
                    'nullable',
                    'string',
                ],

                'solution' => [
                    'nullable',
                    'string',
                ],
            ]);

            $ticket->update($validated);
        }

        /**
         * Admin / Responsable :
         * peuvent modifier les informations principales.
         */
        elseif ($this->isManager($user)) {

            $validated = $request->validate([

                'description' => [
                    'sometimes',
                    'required',
                    'string',
                    'max:5000',
                ],

                'priority' => [
                    'sometimes',
                    Rule::in([
                        'faible',
                        'normale',
                        'elevee',
                        'urgente',
                    ]),
                ],

                'equipment_id' => [
                    'sometimes',
                    'exists:equipments,id',
                ],

                'diagnostic' => [
                    'nullable',
                    'string',
                ],

                'solution' => [
                    'nullable',
                    'string',
                ],
            ]);

            $ticket->update($validated);
        }

        else {

            return response()->json([
                'success' => false,
                'message' =>
                    'Vous n’êtes pas autorisé à modifier ce ticket.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' =>
                'Ticket modifié avec succès.',
            'data' =>
                $ticket->fresh()->load([
                    'equipment',
                    'declaredBy',
                    'assignedTo',
                    'group',
                ]),
        ]);
    }

    /**
     * ============================================================
     * AFFECTER UN TICKET
     * ============================================================
     */
    public function assign(
        Request $request,
        $id
    ) {
        $user = Auth::user();

        if (!$this->isManager($user)) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Seul un Admin ou un Responsable peut affecter un ticket.',
            ], 403);
        }

        $ticket = Ticket::find($id);

        if (!$ticket) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Ticket introuvable.',
            ], 404);
        }

        if ($ticket->status === 'cloture') {

            return response()->json([
                'success' => false,
                'message' =>
                    'Un ticket clôturé ne peut pas être réaffecté.',
            ], 422);
        }

        $validated = $request->validate([

            'assigned_to' => [
                'nullable',
                'exists:users,id',
            ],

            'group_id' => [
                'nullable',
                'exists:groups,id',
            ],
        ]);

        /**
         * Une seule affectation possible.
         */
        if (
            !empty($validated['assigned_to']) &&
            !empty($validated['group_id'])
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Choisissez soit un intervenant, soit un groupe.',
            ], 422);
        }

        /**
         * Vérification de l'intervenant.
         */
        if (!empty($validated['assigned_to'])) {

            $assignedUser =
                User::find($validated['assigned_to']);

            if (
                !$assignedUser ||
                !$assignedUser->is_active ||
                !$this->isIntervenant($assignedUser)
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'L’intervenant sélectionné est invalide ou inactif.',
                ], 422);
            }
        }

        /**
         * On ne peut pas retirer l'affectation
         * d'un ticket déjà en cours de traitement.
         */
        if (
            $ticket->status !== 'nouveau' &&
            $ticket->status !== 'assigne' &&
            empty($validated['assigned_to']) &&
            empty($validated['group_id'])
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Impossible de retirer l’affectation d’un ticket déjà en traitement.',
            ], 422);
        }

        /**
         * Sauvegarder l'affectation.
         */
        $ticket->assigned_to =
            $validated['assigned_to'] ?? null;

        $ticket->group_id =
            $validated['group_id'] ?? null;

        /**
         * Mise à jour automatique du statut.
         */
        if (
            !empty($ticket->assigned_to) ||
            !empty($ticket->group_id)
        ) {

            if ($ticket->status === 'nouveau') {
                $ticket->status = 'assigne';
            }

        } else {

            if ($ticket->status === 'assigne') {
                $ticket->status = 'nouveau';
            }
        }

        $ticket->save();

        /**
         * Notification d'affectation.
         */
        $this->notifyTicketAssigned($ticket);

        return response()->json([
            'success' => true,
            'message' =>
                'Ticket affecté avec succès.',
            'data' =>
                $ticket->fresh()->load([
                    'equipment',
                    'declaredBy',
                    'assignedTo',
                    'group',
                ]),
        ]);
    }

    /**
     * ============================================================
     * CHANGER LE STATUT D'UN TICKET
     * ============================================================
     */
    public function updateStatus(
        Request $request,
        $id
    ) {
        $user = Auth::user();

        $ticket = Ticket::find($id);

        if (!$ticket) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Ticket introuvable.',
            ], 404);
        }

        /**
         * Un ticket clôturé est définitif.
         */
        if ($ticket->status === 'cloture') {

            return response()->json([
                'success' => false,
                'message' =>
                    'Un ticket clôturé ne peut plus être modifié.',
            ], 422);
        }

        $validated = $request->validate([

            'status' => [
                'required',
                Rule::in(self::STATUSES),
            ],

            'diagnostic' => [
                'nullable',
                'string',
            ],

            'solution' => [
                'nullable',
                'string',
            ],

            'parts_used' => [
                'nullable',
                'string',
            ],
        ]);

        $newStatus =
            $validated['status'];

        $oldStatus =
            $ticket->status;

        /**
         * Vérifier les droits de l'intervenant.
         */
        if ($this->isIntervenant($user)) {

            if (
                !$this->isAssignedToIntervenant(
                    $ticket,
                    $user
                )
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'Vous n’êtes pas autorisé à modifier ce ticket.',
                ], 403);
            }

            /**
             * L'intervenant ne peut jamais clôturer.
             */
            if ($newStatus === 'cloture') {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'Un intervenant ne peut pas clôturer un ticket. Seul un Admin ou un Responsable peut le faire.',
                ], 403);
            }

            if (
                !$this->canTransitionStatus(
                    $oldStatus,
                    $newStatus,
                    $user
                )
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        "Transition impossible : {$oldStatus} → {$newStatus}.",
                ], 422);
            }
        }

        /**
         * Admin / Responsable.
         */
        elseif ($this->isManager($user)) {

            if (
                !$this->canTransitionStatus(
                    $oldStatus,
                    $newStatus,
                    $user
                )
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        "Transition impossible : {$oldStatus} → {$newStatus}.",
                ], 422);
            }
        }

        else {

            return response()->json([
                'success' => false,
                'message' =>
                    'Vous n’êtes pas autorisé à modifier le statut.',
            ], 403);
        }

        /**
         * Pour résoudre ou clôturer :
         * diagnostic + solution obligatoires.
         */
        if (
            in_array(
                $newStatus,
                ['resolu', 'cloture'],
                true
            )
        ) {

            $diagnostic =
                $validated['diagnostic']
                ?? $ticket->diagnostic;

            $solution =
                $validated['solution']
                ?? $ticket->solution;

            if (
                empty(trim((string) $diagnostic)) ||
                empty(trim((string) $solution))
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'Le diagnostic et la solution sont obligatoires pour résoudre ou clôturer un ticket.',
                ], 422);
            }
        }

        /**
         * Mise à jour du ticket.
         */
        $ticket->status =
            $newStatus;

        if (
            array_key_exists(
                'diagnostic',
                $validated
            )
        ) {

            $ticket->diagnostic =
                $validated['diagnostic'];
        }

        if (
            array_key_exists(
                'solution',
                $validated
            )
        ) {

            $ticket->solution =
                $validated['solution'];
        }

        if (
            array_key_exists(
                'parts_used',
                $validated
            )
        ) {

            $ticket->parts_used =
                $validated['parts_used'];
        }

        /**
         * resolution_date :
         * moment où le ticket passe à resolu ou cloture.
         */
        if (
            in_array(
                $newStatus,
                ['resolu', 'cloture'],
                true
            )
        ) {

            $ticket->resolution_date =
                now();
        }

        $ticket->save();

        /**
         * Notification du changement de statut.
         */
        $this->notifyTicketStatusChanged(
            $ticket,
            $oldStatus,
            $newStatus
        );

        return response()->json([
            'success' => true,
            'message' =>
                'Statut du ticket mis à jour avec succès.',
            'data' =>
                $ticket->fresh()->load([
                    'equipment',
                    'declaredBy',
                    'assignedTo',
                    'group',
                ]),
        ]);
    }

    /**
     * ============================================================
     * CONFIRMER LA PANNE DE L'EQUIPEMENT
     * ============================================================
     *
     * Option B :
     *
     * Ticket → en_cours
     *        ↓
     * Diagnostic
     *        ↓
     * Confirmation panne
     *        ↓
     * Equipment → en_panne
     */
    public function confirmFailure($id)
    {
        $user = Auth::user();

        $ticket =
            Ticket::with('equipment')->find($id);

        if (!$ticket) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Ticket introuvable.',
            ], 404);
        }

        /**
         * L'intervenant doit être affecté au ticket,
         * directement ou par son groupe.
         */
        if ($this->isIntervenant($user)) {

            if (
                !$this->isAssignedToIntervenant(
                    $ticket,
                    $user
                )
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'Vous n’êtes pas autorisé à confirmer la panne de ce ticket.',
                ], 403);
            }
        }

        /**
         * Admin / Responsable peuvent également
         * confirmer la panne.
         */
        elseif (!$this->isManager($user)) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Vous n’êtes pas autorisé à confirmer la panne.',
            ], 403);
        }

        /**
         * Le ticket doit être en cours de traitement.
         */
        if ($ticket->status !== 'en_cours') {

            return response()->json([
                'success' => false,
                'message' =>
                    'La panne peut être confirmée uniquement lorsque le ticket est en cours de traitement.',
            ], 422);
        }

        /**
         * Vérifier qu'un équipement est associé.
         */
        if (!$ticket->equipment) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Aucun équipement n’est associé à ce ticket.',
            ], 422);
        }

        /**
         * Si l'équipement est déjà en panne.
         */
        if (
            $ticket->equipment->status === 'en_panne'
        ) {

            return response()->json([
                'success' => true,
                'message' =>
                    'L’équipement est déjà marqué comme étant en panne.',
                'data' =>
                    $ticket->fresh()->load([
                        'equipment',
                        'declaredBy',
                        'assignedTo',
                        'group',
                    ]),
            ]);
        }

        /**
         * Mise à jour atomique.
         */
        DB::transaction(
            function () use ($ticket) {

                $ticket->equipment->update([
                    'status' => 'en_panne',
                ]);
            }
        );

        return response()->json([
            'success' => true,
            'message' =>
                'Panne confirmée. L’équipement est maintenant marqué "En panne".',
            'data' =>
                $ticket->fresh()->load([
                    'equipment',
                    'declaredBy',
                    'assignedTo',
                    'group',
                ]),
        ]);
    }

    /**
     * ============================================================
     * CLOTURER UN TICKET
     * ============================================================
     *
     * Seul Admin / Responsable.
     */
    public function close($id)
    {
        $user = Auth::user();

        if (!$this->isManager($user)) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Seul un Admin ou un Responsable peut clôturer un ticket.',
            ], 403);
        }

        $ticket = Ticket::find($id);

        if (!$ticket) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Ticket introuvable.',
            ], 404);
        }

        if ($ticket->status === 'cloture') {

            return response()->json([
                'success' => false,
                'message' =>
                    'Ce ticket est déjà clôturé.',
            ], 422);
        }

        /**
         * On ne peut clôturer qu'un ticket résolu.
         */
        if ($ticket->status !== 'resolu') {

            return response()->json([
                'success' => false,
                'message' =>
                    'Le ticket doit d’abord être résolu avant sa clôture.',
            ], 422);
        }

        /**
         * Diagnostic et solution obligatoires.
         */
        if (
            empty(trim((string) $ticket->diagnostic)) ||
            empty(trim((string) $ticket->solution))
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Le diagnostic et la solution sont obligatoires avant la clôture.',
            ], 422);
        }

        /**
         * On passe par updateStatus()
         * pour conserver toute la logique centrale.
         */
        $request = new Request([
            'status' =>
                'cloture',

            'diagnostic' =>
                $ticket->diagnostic,

            'solution' =>
                $ticket->solution,

            'parts_used' =>
                $ticket->parts_used,
        ]);

        return $this->updateStatus(
            $request,
            $id
        );
    }

    /**
     * ============================================================
     * SUPPRIMER UN TICKET
     * ============================================================
     */
    public function destroy($id)
    {
        $user = Auth::user();

        if (!$this->isManager($user)) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Seul un Admin ou un Responsable peut supprimer un ticket.',
            ], 403);
        }

        $ticket = Ticket::find($id);

        if (!$ticket) {

            return response()->json([
                'success' => false,
                'message' =>
                    'Ticket introuvable.',
            ], 404);
        }

        /**
         * Les tickets clôturés restent dans l'historique.
         */
        if ($ticket->status === 'cloture') {

            return response()->json([
                'success' => false,
                'message' =>
                    'Un ticket clôturé ne peut pas être supprimé.',
            ], 422);
        }

        $ticket->delete();

        return response()->json([
            'success' => true,
            'message' =>
                'Ticket supprimé avec succès.',
        ]);
    }

    /**
     * ============================================================
     * TRANSITIONS DE STATUT
     * ============================================================
     */
    private function canTransitionStatus(
        string $oldStatus,
        string $newStatus,
        User $user
    ): bool {

        /**
         * Même statut = autorisé.
         */
        if ($oldStatus === $newStatus) {
            return true;
        }

        /**
         * Admin / Responsable :
         * toutes les transitions sont autorisées.
         */
        if ($this->isManager($user)) {
            return true;
        }

        /**
         * Intervenant :
         * uniquement les transitions définies.
         */
        if ($this->isIntervenant($user)) {

            return in_array(
                $newStatus,
                self::INTERVENANT_TRANSITIONS[
                    $oldStatus
                ] ?? [],
                true
            );
        }

        return false;
    }

    /**
     * ============================================================
     * VERIFIER L'AFFECTATION A L'INTERVENANT
     * ============================================================
     */
    private function isAssignedToIntervenant(
        Ticket $ticket,
        User $user
    ): bool {

        /**
         * Affectation directe.
         */
        if (
            !empty($ticket->assigned_to) &&
            (int) $ticket->assigned_to ===
            (int) $user->id
        ) {

            return true;
        }

        /**
         * Affectation par groupe.
         */
        if (
            !empty($ticket->group_id) &&
            !empty($user->group_id) &&
            (int) $ticket->group_id ===
            (int) $user->group_id
        ) {

            return true;
        }

        return false;
    }

    /**
     * ============================================================
     * VERIFIER MANAGER
     * ============================================================
     */
    private function isManager(User $user): bool
    {
        return in_array(
            strtolower((string) $user->role),
            self::MANAGER_ROLES,
            true
        );
    }

    /**
     * ============================================================
     * VERIFIER INTERVENANT / ATSEP
     * ============================================================
     */
    private function isIntervenant(User $user): bool
    {
        return in_array(
            strtolower((string) $user->role),
            [
                'intervenant',
                'atsep',
            ],
            true
        );
    }

    /**
     * ============================================================
     * NOTIFICATION : CREATION
     * ============================================================
     */
    private function notifyTicketCreated(
        Ticket $ticket
    ): void {

        /**
         * Recharger les relations nécessaires.
         */
        $ticket->loadMissing([
            'equipment',
            'declaredBy',
            'assignedTo',
            'group',
        ]);

        /**
         * --------------------------------------------------------
         * 1. Notification des Admins / Responsables
         * --------------------------------------------------------
         *
         * Le responsable et l'admin doivent savoir
         * qu'un nouveau ticket a été créé.
         */
        $managers = User::whereIn(
            'role',
            self::MANAGER_ROLES
        )
            ->where('is_active', true)
            ->get();

        foreach ($managers as $manager) {

            Notification::create([

                'user_id' =>
                    $manager->id,

                'title' =>
                    'Nouveau ticket',

                'message' =>
                    'Un nouveau ticket #' .
                    $ticket->id .
                    ' a été créé.',

                'type' =>
                    'ticket',

                'related_id' =>
                    $ticket->id,

                'data' => [

                    'ticket_id' =>
                        $ticket->id,

                    'equipment_id' =>
                        $ticket->equipment_id,

                    'declared_by' =>
                        $ticket->declared_by,

                    'assigned_to' =>
                        $ticket->assigned_to,

                    'group_id' =>
                        $ticket->group_id,

                    'priority' =>
                        $ticket->priority,

                    'status' =>
                        $ticket->status,
                ],

                'priority' =>
                    $ticket->priority ?? 'normale',

                'read_at' =>
                    null,
            ]);
        }

        /**
         * --------------------------------------------------------
         * 2. Notification de l'intervenant directement affecté
         * --------------------------------------------------------
         */
        if (!empty($ticket->assigned_to)) {

            $assignedUser =
                User::find($ticket->assigned_to);

            if (
                $assignedUser &&
                $assignedUser->is_active &&
                $this->isIntervenant($assignedUser)
            ) {

                Notification::create([

                    'user_id' =>
                        $assignedUser->id,

                    'title' =>
                        'Nouveau ticket',

                    'message' =>
                        'Un nouveau ticket #' .
                        $ticket->id .
                        ' vous a été affecté.',

                    'type' =>
                        'ticket',

                    'related_id' =>
                        $ticket->id,

                    'data' => [

                        'ticket_id' =>
                            $ticket->id,

                        'equipment_id' =>
                            $ticket->equipment_id,

                        'declared_by' =>
                            $ticket->declared_by,

                        'assigned_to' =>
                            $ticket->assigned_to,

                        'group_id' =>
                            $ticket->group_id,

                        'priority' =>
                            $ticket->priority,

                        'status' =>
                            $ticket->status,
                    ],

                    'priority' =>
                        $ticket->priority ?? 'normale',

                    'read_at' =>
                        null,
                ]);
            }
        }

        /**
         * --------------------------------------------------------
         * 3. Notification des membres du groupe
         * --------------------------------------------------------
         */
        if (!empty($ticket->group_id)) {

            $groupUsers = User::where(
                'group_id',
                $ticket->group_id
            )
                ->where('is_active', true)
                ->whereIn(
                    'role',
                    [
                        'intervenant',
                        'atsep',
                    ]
                )
                ->get();

            foreach ($groupUsers as $groupUser) {

                Notification::create([

                    'user_id' =>
                        $groupUser->id,

                    'title' =>
                        'Nouveau ticket',

                    'message' =>
                        'Un nouveau ticket #' .
                        $ticket->id .
                        ' a été affecté à votre groupe.',

                    'type' =>
                        'ticket',

                    'related_id' =>
                        $ticket->id,

                    'data' => [

                        'ticket_id' =>
                            $ticket->id,

                        'equipment_id' =>
                            $ticket->equipment_id,

                        'declared_by' =>
                            $ticket->declared_by,

                        'assigned_to' =>
                            $ticket->assigned_to,

                        'group_id' =>
                            $ticket->group_id,

                        'priority' =>
                            $ticket->priority,

                        'status' =>
                            $ticket->status,
                    ],

                    'priority' =>
                        $ticket->priority ?? 'normale',

                    'read_at' =>
                        null,
                ]);
            }
        }
    }

    /**
     * ============================================================
     * NOTIFICATION : AFFECTATION
     * ============================================================
     */
    private function notifyTicketAssigned(
        Ticket $ticket
    ): void {

        $ticket->loadMissing([
            'equipment',
            'assignedTo',
            'group',
        ]);

        /**
         * --------------------------------------------------------
         * Affectation directe
         * --------------------------------------------------------
         */
        if (!empty($ticket->assigned_to)) {

            $assignedUser =
                User::find($ticket->assigned_to);

            if (
                $assignedUser &&
                $assignedUser->is_active &&
                $this->isIntervenant($assignedUser)
            ) {

                Notification::create([

                    'user_id' =>
                        $assignedUser->id,

                    'title' =>
                        'Ticket assigné',

                    'message' =>
                        'Le ticket #' .
                        $ticket->id .
                        ' vous a été assigné.',

                    'type' =>
                        'ticket',

                    'related_id' =>
                        $ticket->id,

                    'data' => [

                        'ticket_id' =>
                            $ticket->id,

                        'equipment_id' =>
                            $ticket->equipment_id,

                        'declared_by' =>
                            $ticket->declared_by,

                        'assigned_to' =>
                            $ticket->assigned_to,

                        'group_id' =>
                            $ticket->group_id,

                        'priority' =>
                            $ticket->priority,

                        'status' =>
                            $ticket->status,
                    ],

                    'priority' =>
                        $ticket->priority ?? 'normale',

                    'read_at' =>
                        null,
                ]);
            }
        }

        /**
         * --------------------------------------------------------
         * Affectation à un groupe
         * --------------------------------------------------------
         */
        elseif (!empty($ticket->group_id)) {

            $groupUsers = User::where(
                'group_id',
                $ticket->group_id
            )
                ->where('is_active', true)
                ->whereIn(
                    'role',
                    [
                        'intervenant',
                        'atsep',
                    ]
                )
                ->get();

            foreach ($groupUsers as $groupUser) {

                Notification::create([

                    'user_id' =>
                        $groupUser->id,

                    'title' =>
                        'Ticket assigné',

                    'message' =>
                        'Le ticket #' .
                        $ticket->id .
                        ' a été affecté à votre groupe.',

                    'type' =>
                        'ticket',

                    'related_id' =>
                        $ticket->id,

                    'data' => [

                        'ticket_id' =>
                            $ticket->id,

                        'equipment_id' =>
                            $ticket->equipment_id,

                        'declared_by' =>
                            $ticket->declared_by,

                        'assigned_to' =>
                            $ticket->assigned_to,

                        'group_id' =>
                            $ticket->group_id,

                        'priority' =>
                            $ticket->priority,

                        'status' =>
                            $ticket->status,
                    ],

                    'priority' =>
                        $ticket->priority ?? 'normale',

                    'read_at' =>
                        null,
                ]);
            }
        }
    }

    /**
     * ============================================================
     * NOTIFICATION : CHANGEMENT DE STATUT
     * ============================================================
     */
    private function notifyTicketStatusChanged(
        Ticket $ticket,
        string $oldStatus,
        string $newStatus
    ): void {

        /**
         * Aucun changement réel.
         */
        if ($oldStatus === $newStatus) {
            return;
        }

        $ticket->loadMissing([
            'equipment',
            'declaredBy',
            'assignedTo',
            'group',
        ]);

        /**
         * Traduction des statuts.
         */
        $statusLabels = [

            'nouveau' =>
                'Nouveau',

            'assigne' =>
                'Assigné',

            'en_cours' =>
                'En cours',

            'en_attente' =>
                'En attente',

            'resolu' =>
                'Résolu',

            'cloture' =>
                'Clôturé',
        ];

        $statusLabel =
            $statusLabels[$newStatus]
            ?? $newStatus;

        /**
         * --------------------------------------------------------
         * Qui doit recevoir la notification ?
         * --------------------------------------------------------
         *
         * On utilise un tableau pour éviter les doublons.
         */
        $recipientIds = [];

        /**
         * Le déclarant du ticket.
         */
        if (!empty($ticket->declared_by)) {

            $recipientIds[] =
                (int) $ticket->declared_by;
        }

        /**
         * L'intervenant affecté.
         */
        if (!empty($ticket->assigned_to)) {

            $recipientIds[] =
                (int) $ticket->assigned_to;
        }

        /**
         * Membres du groupe affecté.
         */
        if (!empty($ticket->group_id)) {

            $groupUserIds = User::where(
                'group_id',
                $ticket->group_id
            )
                ->where('is_active', true)
                ->whereIn(
                    'role',
                    [
                        'intervenant',
                        'atsep',
                    ]
                )
                ->pluck('id')
                ->toArray();

            foreach ($groupUserIds as $groupUserId) {

                $recipientIds[] =
                    (int) $groupUserId;
            }
        }

        /**
         * Pour "résolu" et "clôturé",
         * les responsables doivent également être informés.
         */
        if (
            in_array(
                $newStatus,
                [
                    'resolu',
                    'cloture',
                ],
                true
            )
        ) {

            $managerIds = User::whereIn(
                'role',
                self::MANAGER_ROLES
            )
                ->where('is_active', true)
                ->pluck('id')
                ->toArray();

            foreach ($managerIds as $managerId) {

                $recipientIds[] =
                    (int) $managerId;
            }
        }

        /**
         * Supprimer les doublons.
         */
        $recipientIds =
            array_values(
                array_unique($recipientIds)
            );

        /**
         * Si aucun destinataire.
         */
        if (empty($recipientIds)) {
            return;
        }

        /**
         * Titre selon le nouveau statut.
         */
        $title = 'Ticket mis à jour';

        if ($newStatus === 'en_cours') {
            $title = 'Ticket en cours';
        }

        elseif ($newStatus === 'en_attente') {
            $title = 'Ticket en attente';
        }

        elseif ($newStatus === 'resolu') {
            $title = 'Ticket résolu';
        }

        elseif ($newStatus === 'cloture') {
            $title = 'Ticket clôturé';
        }

        /**
         * Message.
         */
        $message =
            'Le ticket #' .
            $ticket->id .
            ' est maintenant ' .
            strtolower($statusLabel) .
            '.';

        /**
         * Création des notifications.
         */
        foreach ($recipientIds as $recipientId) {

            /**
             * Vérifier que l'utilisateur existe
             * et qu'il est actif.
             */
            $recipient =
                User::find($recipientId);

            if (
                !$recipient ||
                !$recipient->is_active
            ) {
                continue;
            }

            Notification::create([

                'user_id' =>
                    $recipient->id,

                'title' =>
                    $title,

                'message' =>
                    $message,

                'type' =>
                    'ticket',

                'related_id' =>
                    $ticket->id,

                'data' => [

                    'ticket_id' =>
                        $ticket->id,

                    'equipment_id' =>
                        $ticket->equipment_id,

                    'declared_by' =>
                        $ticket->declared_by,

                    'assigned_to' =>
                        $ticket->assigned_to,

                    'group_id' =>
                        $ticket->group_id,

                    'old_status' =>
                        $oldStatus,

                    'status' =>
                        $newStatus,

                    'priority' =>
                        $ticket->priority,
                ],

                'priority' =>
                    $ticket->priority ?? 'normale',

                'read_at' =>
                    null,
            ]);
        }
    }
}