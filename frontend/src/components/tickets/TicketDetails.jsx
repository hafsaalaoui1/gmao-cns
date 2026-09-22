import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

import {
    ArrowLeft,
    Edit,
    Ticket as TicketIcon,
    Calendar,
    User,
    Users,
    Package,
    Clock,
    AlertTriangle,
    AlertCircle,
    FileText,
    Wrench,
    CheckCircle,
    Loader2,
    ClipboardList,
    ShieldAlert,
    UserCheck,
    CircleDot,
    PauseCircle,
    PlayCircle,
    Save,
} from 'lucide-react';

import { toast } from 'react-hot-toast';

import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

import './TicketDetails.css';

// ============================================================
// STATUTS
// ============================================================

const STATUS_CONFIG = {
    nouveau: {
        label: 'Nouveau',
        className: 'status-nouveau',
    },

    assigne: {
        label: 'Assigné',
        className: 'status-assigne',
    },

    en_cours: {
        label: 'En cours',
        className: 'status-en-cours',
    },

    en_attente: {
        label: 'En attente',
        className: 'status-en-attente',
    },

    resolu: {
        label: 'Résolu',
        className: 'status-resolu',
    },

    cloture: {
        label: 'Clôturé',
        className: 'status-cloture',
    },
};

// ============================================================
// PRIORITÉS
// ============================================================

const PRIORITY_CONFIG = {
    urgente: {
        label: 'Urgente',
        className: 'priority-urgente',
    },

    elevee: {
        label: 'Élevée',
        className: 'priority-elevee',
    },

    élevée: {
        label: 'Élevée',
        className: 'priority-elevee',
    },

    normale: {
        label: 'Normale',
        className: 'priority-normale',
    },

    faible: {
        label: 'Faible',
        className: 'priority-faible',
    },
};

// ============================================================
// FORMATAGE
// ============================================================

const formatDateTime = (date) => {
    if (!date) return '-';

    try {
        return new Date(date).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '-';
    }
};

// ============================================================
// BADGE STATUT
// ============================================================

const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status];

    if (!config) {
        return (
            <span className="badge-status">
                {status || '-'}
            </span>
        );
    }

    return (
        <span className={`badge-status ${config.className}`}>
            <CircleDot size={12} />
            {config.label}
        </span>
    );
};

// ============================================================
// BADGE PRIORITÉ
// ============================================================

const PriorityBadge = ({ priority }) => {
    const config = PRIORITY_CONFIG[priority];

    if (!config) {
        return (
            <span className="badge-priority">
                {priority || '-'}
            </span>
        );
    }

    return (
        <span className={`badge-priority ${config.className}`}>
            <AlertTriangle size={12} />
            {config.label}
        </span>
    );
};

// ============================================================
// META ITEM
// ============================================================

const MetaItem = ({
    icon,
    label,
    children,
}) => {
    return (
        <div className="meta-item">

            <span className="meta-label">
                {icon}
                {label}
            </span>

            <span className="meta-value">
                {children}
            </span>

        </div>
    );
};

// ============================================================
// PAGE
// ============================================================

const TicketDetails = () => {

    const { id } = useParams();
    const navigate = useNavigate();

    const {
        isAdmin,
        isResponsable,
        isIntervenant,
    } = useAuth();

    const [ticket, setTicket] = useState(null);

    const [loading, setLoading] = useState(true);

    const [changingStatus, setChangingStatus] =
        useState(false);

    const [savingDetails, setSavingDetails] =
        useState(false);

    const [diagnostic, setDiagnostic] =
        useState('');

    const [solution, setSolution] =
        useState('');

    // ==========================================================
    // RÉCUPÉRER LE TICKET
    // ==========================================================

    const fetchTicket = async () => {

        try {

            setLoading(true);

            const response = await api.get(
                `/tickets/${id}`
            );

            const data =
                response.data?.data ||
                response.data?.ticket ||
                response.data;

            if (!data || !data.id) {

                toast.error(
                    'Ticket introuvable'
                );

                navigate('/tickets');

                return;
            }

            setTicket(data);

            setDiagnostic(
                data.diagnostic || ''
            );

            setSolution(
                data.solution || ''
            );

        } catch (error) {

            console.error(
                '❌ Erreur récupération ticket :',
                error
            );

            toast.error(
                error.response?.data?.message ||
                'Impossible de charger le ticket'
            );

            navigate('/tickets');

        } finally {

            setLoading(false);
        }
    };

    // ==========================================================
    // SAUVEGARDER DIAGNOSTIC + SOLUTION
    // ==========================================================

    const handleSaveDetails = async () => {

        if (!ticket || savingDetails) {
            return;
        }

        try {

            setSavingDetails(true);

            const response = await api.put(
                `/tickets/${ticket.id}`,
                {
                    diagnostic: diagnostic.trim(),
                    solution: solution.trim(),
                }
            );

            const data =
                response.data?.data ||
                response.data?.ticket ||
                response.data;

            setTicket((previous) => ({
                ...previous,
                ...(data || {}),

                diagnostic:
                    data?.diagnostic ??
                    diagnostic.trim(),

                solution:
                    data?.solution ??
                    solution.trim(),
            }));

            toast.success(
                response.data?.message ||
                'Diagnostic et solution enregistrés'
            );

        } catch (error) {

            console.error(
                '❌ Erreur sauvegarde :',
                error
            );

            toast.error(
                error.response?.data?.message ||
                'Impossible d’enregistrer les informations'
            );

        } finally {

            setSavingDetails(false);
        }
    };

    // ==========================================================
    // CHANGER LE STATUT
    // ==========================================================

    const handleStatusChange = async (
        newStatus
    ) => {

        if (
            !ticket ||
            !newStatus ||
            newStatus === ticket.status ||
            changingStatus
        ) {
            return;
        }

        // ------------------------------------------------------
        // Diagnostic + solution obligatoires
        // ------------------------------------------------------

        if (
            newStatus === 'resolu' ||
            newStatus === 'cloture'
        ) {

            const finalDiagnostic =
                diagnostic.trim() ||
                ticket.diagnostic?.trim();

            const finalSolution =
                solution.trim() ||
                ticket.solution?.trim();

            if (
                !finalDiagnostic ||
                !finalSolution
            ) {

                toast.error(
                    'Le diagnostic et la solution sont obligatoires avant la résolution ou la clôture.'
                );

                return;
            }
        }

        try {

            setChangingStatus(true);

            const payload = {
                status: newStatus,
            };

            // --------------------------------------------------
            // Ajouter diagnostic + solution
            // --------------------------------------------------

            if (
                newStatus === 'resolu' ||
                newStatus === 'cloture'
            ) {

                payload.diagnostic =
                    diagnostic.trim() ||
                    ticket.diagnostic;

                payload.solution =
                    solution.trim() ||
                    ticket.solution;
            }

            const response = await api.put(
                `/tickets/${ticket.id}/status`,
                payload
            );

            const data =
                response.data?.data ||
                response.data?.ticket ||
                response.data;

            setTicket((previous) => ({
                ...previous,
                ...(data || {}),

                status: newStatus,

                diagnostic:
                    data?.diagnostic ??
                    payload.diagnostic ??
                    previous.diagnostic,

                solution:
                    data?.solution ??
                    payload.solution ??
                    previous.solution,
            }));

            toast.success(
                response.data?.message ||
                'Statut mis à jour avec succès'
            );

        } catch (error) {

            console.error(
                '❌ Erreur changement statut :',
                error
            );

            toast.error(
                error.response?.data?.message ||
                'Impossible de modifier le statut'
            );

        } finally {

            setChangingStatus(false);
        }
    };

    // ==========================================================
    // ACTIONS
    // ==========================================================

    const handleStart = () =>
        handleStatusChange('en_cours');

    const handlePause = () =>
        handleStatusChange('en_attente');

    const handleResume = () =>
        handleStatusChange('en_cours');

    // ==========================================================
    // RÉSOUDRE LE TICKET
    // ==========================================================

    const handleResolve = async () => {

        if (
            !diagnostic.trim() ||
            !solution.trim()
        ) {

            toast.error(
                'Veuillez renseigner le diagnostic et la solution.'
            );

            return;
        }

        await handleStatusChange('resolu');
    };

    // ==========================================================
    // CONFIRMER LA PANNE DE L'ÉQUIPEMENT
    // ==========================================================

    const handleConfirmFailure = async () => {

        if (
            !ticket ||
            changingStatus
        ) {
            return;
        }

        // ------------------------------------------------------
        // Sécurité côté frontend
        // ------------------------------------------------------

        if (ticket.status !== 'en_cours') {

            toast.error(
                'La panne peut être confirmée uniquement lorsque le ticket est en cours.'
            );

            return;
        }

        if (!ticket.equipment) {

            toast.error(
                'Aucun équipement n’est associé à ce ticket.'
            );

            return;
        }

        if (
            ticket.equipment.status === 'en_panne'
        ) {

            toast.error(
                'Cet équipement est déjà marqué comme étant en panne.'
            );

            return;
        }

        try {

            setChangingStatus(true);

            const response = await api.post(
                `/tickets/${ticket.id}/confirm-failure`
            );

            const data =
                response.data?.data ||
                response.data?.ticket ||
                response.data;

            setTicket((previous) => ({
                ...previous,
                ...(data || {}),

                equipment:
                    data?.equipment ??
                    previous.equipment,
            }));

            toast.success(
                response.data?.message ||
                'Panne confirmée. L’équipement est maintenant en panne.'
            );

        } catch (error) {

            console.error(
                '❌ Erreur confirmation panne :',
                error
            );

            toast.error(
                error.response?.data?.message ||
                'Impossible de confirmer la panne.'
            );

        } finally {

            setChangingStatus(false);
        }
    };

    // ==========================================================
    // CLÔTURER
    // ==========================================================

    const handleClose = () =>
        handleStatusChange('cloture');

    // ==========================================================
    // CHARGEMENT
    // ==========================================================

    useEffect(() => {

        if (!id) {

            toast.error(
                'Identifiant du ticket invalide'
            );

            navigate('/tickets');

            return;
        }

        fetchTicket();

    }, [id]);

    // ==========================================================
    // PERMISSIONS
    // ==========================================================

    const canEdit =
        isAdmin ||
        isResponsable;

    const canChangeStatus =
        isAdmin ||
        isResponsable ||
        isIntervenant;

    const canEditTechnicalInfo =
        isIntervenant &&
        (
            ticket?.status === 'en_cours' ||
            ticket?.status === 'en_attente'
        );

    // ==========================================================
    // LOADING
    // ==========================================================

    if (loading) {

        return (
            <div className="details-state-container">

                <Loader2
                    size={40}
                    className="spin"
                />

                <p>
                    Chargement du ticket...
                </p>

            </div>
        );
    }

    // ==========================================================
    // EMPTY
    // ==========================================================

    if (!ticket) {

        return (
            <div className="details-state-container">

                <FileText
                    size={50}
                    className="empty-icon"
                />

                <p>
                    Ticket introuvable.
                </p>

            </div>
        );
    }

    // ==========================================================
    // RELATIONS
    // ==========================================================

    const equipment =
        ticket.equipment || null;

    const declaredBy =
        ticket.declared_by_user ||
        ticket.declaredBy ||
        (
            ticket.declared_by &&
            typeof ticket.declared_by === 'object'
                ? ticket.declared_by
                : null
        );

    const assignedUser =
        ticket.assigned_user ||
        ticket.assignedUser ||
        (
            ticket.assigned_to &&
            typeof ticket.assigned_to === 'object'
                ? ticket.assigned_to
                : null
        );

    const assignedGroup =
        ticket.group ||
        ticket.assigned_group ||
        null;

    const normalizedStatus =
        STATUS_CONFIG[ticket.status]
            ? ticket.status
            : 'nouveau';

    // ==========================================================
    // ACTIONS DU TICKET
    // ==========================================================

    const renderStatusActions = () => {

        if (!canChangeStatus) {
            return null;
        }

        // ======================================================
        // ADMIN / RESPONSABLE
        // ======================================================

        if (isAdmin || isResponsable) {

            // --------------------------------------------------
            // Ticket résolu : possibilité de clôturer
            // --------------------------------------------------

            if (ticket.status === 'resolu') {

                return (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            flexWrap: 'wrap',
                        }}
                    >

                        <button
                            type="button"
                            className="ticket-action-btn ticket-action-success"
                            onClick={handleClose}
                            disabled={changingStatus}
                        >

                            {changingStatus ? (
                                <Loader2
                                    size={17}
                                    className="spin"
                                />
                            ) : (
                                <CheckCircle size={17} />
                            )}

                            Clôturer le ticket

                        </button>

                        {changingStatus && (
                            <Loader2
                                size={17}
                                className="spin"
                            />
                        )}

                    </div>
                );
            }

            // --------------------------------------------------
            // Ticket clôturé
            // --------------------------------------------------

            if (ticket.status === 'cloture') {

                return (
                    <p className="description-text">
                        Ce ticket est clôturé. Aucune
                        nouvelle action n'est disponible.
                    </p>
                );
            }

            // --------------------------------------------------
            // Autres statuts : gestionnaire
            // --------------------------------------------------

            return (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                    }}
                >

                    <select
                        className="ticket-status-select"
                        value={normalizedStatus}
                        onChange={(e) =>
                            handleStatusChange(
                                e.target.value
                            )
                        }
                        disabled={changingStatus}
                    >

                        {Object.entries(
                            STATUS_CONFIG
                        ).map(
                            ([value, config]) => (

                                <option
                                    key={value}
                                    value={value}
                                >
                                    {config.label}
                                </option>

                            )
                        )}

                    </select>

                    {changingStatus && (
                        <Loader2
                            size={17}
                            className="spin"
                        />
                    )}

                </div>
            );
        }

        // ======================================================
        // INTERVENANT
        // ======================================================

        if (!isIntervenant) {
            return null;
        }

        switch (ticket.status) {

            // --------------------------------------------------
            // NOUVEAU
            // --------------------------------------------------

            case 'nouveau':

                return (
                    <p className="description-text">
                        Ce ticket n'est pas encore affecté.
                    </p>
                );

            // --------------------------------------------------
            // ASSIGNÉ
            // --------------------------------------------------

            case 'assigne':

                return (
                    <button
                        type="button"
                        className="ticket-action-btn"
                        onClick={handleStart}
                        disabled={changingStatus}
                    >

                        {changingStatus ? (
                            <Loader2
                                size={17}
                                className="spin"
                            />
                        ) : (
                            <PlayCircle size={17} />
                        )}

                        Démarrer l'intervention

                    </button>
                );

            // --------------------------------------------------
            // EN COURS
            // --------------------------------------------------

            case 'en_cours':

                return (
                    <div
                        style={{
                            display: 'flex',
                            gap: '0.65rem',
                            flexWrap: 'wrap',
                        }}
                    >

                        {/* METTRE EN ATTENTE */}

                        <button
                            type="button"
                            className="ticket-action-btn"
                            onClick={handlePause}
                            disabled={changingStatus}
                        >

                            {changingStatus ? (
                                <Loader2
                                    size={17}
                                    className="spin"
                                />
                            ) : (
                                <PauseCircle size={17} />
                            )}

                            Mettre en attente

                        </button>


                        {/* CONFIRMER LA PANNE */}

                        {ticket.equipment &&
                            ticket.equipment.status !== 'en_panne' && (

                                <button
                                    type="button"
                                    className="ticket-action-btn ticket-action-danger"
                                    onClick={handleConfirmFailure}
                                    disabled={changingStatus}
                                >

                                    {changingStatus ? (
                                        <Loader2
                                            size={17}
                                            className="spin"
                                        />
                                    ) : (
                                        <AlertCircle size={17} />
                                    )}

                                    Confirmer la panne

                                </button>
                            )}


                        {/* RÉSOUDRE */}

                        <button
                            type="button"
                            className="ticket-action-btn ticket-action-success"
                            onClick={handleResolve}
                            disabled={changingStatus}
                        >

                            {changingStatus ? (
                                <Loader2
                                    size={17}
                                    className="spin"
                                />
                            ) : (
                                <CheckCircle size={17} />
                            )}

                            Résoudre le ticket

                        </button>

                    </div>
                );

            // --------------------------------------------------
            // EN ATTENTE
            // --------------------------------------------------

            case 'en_attente':

                return (
                    <div
                        style={{
                            display: 'flex',
                            gap: '0.65rem',
                            flexWrap: 'wrap',
                        }}
                    >

                        <button
                            type="button"
                            className="ticket-action-btn"
                            onClick={handleResume}
                            disabled={changingStatus}
                        >

                            {changingStatus ? (
                                <Loader2
                                    size={17}
                                    className="spin"
                                />
                            ) : (
                                <PlayCircle size={17} />
                            )}

                            Reprendre

                        </button>

                        <button
                            type="button"
                            className="ticket-action-btn ticket-action-success"
                            onClick={handleResolve}
                            disabled={changingStatus}
                        >

                            {changingStatus ? (
                                <Loader2
                                    size={17}
                                    className="spin"
                                />
                            ) : (
                                <CheckCircle size={17} />
                            )}

                            Résoudre le ticket

                        </button>

                    </div>
                );

            // --------------------------------------------------
            // RÉSOLU
            // --------------------------------------------------

            case 'resolu':

                return (
                    <p className="description-text">
                        Le ticket est résolu et attend sa
                        clôture par le Responsable ou
                        l'Administrateur.
                    </p>
                );

            // --------------------------------------------------
            // CLÔTURÉ
            // --------------------------------------------------

            case 'cloture':

                return (
                    <p className="description-text">
                        Ce ticket est clôturé. Aucune
                        nouvelle action n'est disponible.
                    </p>
                );

            default:
                return null;
        }
    };

    // ==========================================================
    // RENDER
    // ==========================================================

    return (
        <div className="ticket-details-page">

            {/* ==================================================
                RETOUR
            ================================================== */}

            <div className="details-top-bar">

                <button
                    type="button"
                    className="btn-back"
                    onClick={() =>
                        navigate('/tickets')
                    }
                >

                    <ArrowLeft size={18} />

                    Retour aux tickets

                </button>

            </div>

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="details-header">

                <div className="header-left">

                    <div className="ticket-icon-wrapper">

                        <TicketIcon
                            size={25}
                            className="ticket-icon"
                        />

                    </div>

                    <div className="header-text">

                        <h1>
                            Ticket #{ticket.id}
                        </h1>

                        <p className="header-meta">

                            <Calendar size={14} />

                            Déclaré le{' '}

                            {formatDateTime(
                                ticket.created_at
                            )}

                        </p>

                    </div>

                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                    }}
                >

                    <StatusBadge
                        status={ticket.status}
                    />

                    {canEdit && (
                        <Link
                            to={`/tickets/${ticket.id}/edit`}
                            className="btn-edit"
                        >

                            <Edit size={17} />

                            Modifier

                        </Link>
                    )}

                </div>

            </div>

            {/* ==================================================
                ACTIONS
            ================================================== */}

            {canChangeStatus && (

                <div className="detail-card">

                    <div className="card-header">

                        <Wrench
                            size={19}
                            className="card-icon"
                        />

                        <h2>
                            Actions
                        </h2>

                    </div>

                    <div className="card-body">

                        {renderStatusActions()}

                    </div>

                </div>
            )}

            {/* ==================================================
                GRILLE
            ================================================== */}

            <div className="details-grid">

                {/* =================================================
                    COLONNE PRINCIPALE
                ================================================= */}

                <div className="main-column">

                    {/* DESCRIPTION */}

                    <div className="detail-card">

                        <div className="card-header">

                            <FileText
                                size={19}
                                className="card-icon"
                            />

                            <h2>
                                Description du problème
                            </h2>

                        </div>

                        <div className="card-body">

                            {ticket.description ? (

                                <p className="description-text">
                                    {ticket.description}
                                </p>

                            ) : (

                                <p className="description-text">
                                    Aucune description disponible.
                                </p>

                            )}

                        </div>

                    </div>

                    {/* ÉQUIPEMENT */}

                    <div className="detail-card">

                        <div className="card-header">

                            <Package
                                size={19}
                                className="card-icon"
                            />

                            <h2>
                                Équipement concerné
                            </h2>

                        </div>

                        <div className="card-body">

                            {equipment ? (

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                    }}
                                >

                                    <div
                                        style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '10px',
                                            background: '#eff6ff',
                                            color: '#2563eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >

                                        <Package size={21} />

                                    </div>

                                    <div>

                                        <div
                                            style={{
                                                fontWeight: 600,
                                                color: '#1e293b',
                                                marginBottom: '3px',
                                            }}
                                        >

                                            {equipment.name ||
                                                equipment.designation ||
                                                `Équipement #${equipment.id}`}

                                        </div>

                                        {equipment.code && (
                                            <div
                                                style={{
                                                    fontSize: '0.78rem',
                                                    color: '#64748b',
                                                }}
                                            >

                                                Référence :{' '}
                                                {equipment.code}

                                            </div>
                                        )}

                                        {equipment.status && (
                                            <div
                                                style={{
                                                    marginTop: '4px',
                                                    fontSize: '0.78rem',
                                                    color:
                                                        equipment.status === 'en_panne'
                                                            ? '#dc2626'
                                                            : '#64748b',
                                                    fontWeight: 600,
                                                }}
                                            >

                                                État :{' '}
                                                {equipment.status === 'operationnel'
                                                    ? 'Opérationnel'
                                                    : equipment.status === 'en_panne'
                                                        ? 'En panne'
                                                        : equipment.status === 'en_maintenance'
                                                            ? 'En maintenance'
                                                            : equipment.status === 'hors_service'
                                                                ? 'Hors service'
                                                                : equipment.status === 'retire'
                                                                    ? 'Retiré'
                                                                    : equipment.status}

                                            </div>
                                        )}

                                    </div>

                                </div>

                            ) : (

                                <p className="description-text">
                                    Aucun équipement renseigné.
                                </p>

                            )}

                        </div>

                    </div>

                    {/* DIAGNOSTIC */}

                    <div className="detail-card">

                        <div className="card-header">

                            <Wrench
                                size={19}
                                className="card-icon"
                            />

                            <h2>
                                Diagnostic technique
                            </h2>

                        </div>

                        <div className="card-body">

                            {canEditTechnicalInfo ? (

                                <>
                                    <textarea
                                        value={diagnostic}
                                        onChange={(e) =>
                                            setDiagnostic(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Décrivez le diagnostic technique..."
                                        rows={5}
                                        style={{
                                            width: '100%',
                                            padding: '0.8rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                        }}
                                    />

                                    {!ticket.diagnostic && (
                                        <p
                                            style={{
                                                marginTop: '0.5rem',
                                                marginBottom: 0,
                                                fontSize: '0.75rem',
                                                color: '#64748b',
                                            }}
                                        >
                                            Renseignez le diagnostic
                                            avant de résoudre le ticket.
                                        </p>
                                    )}
                                </>

                            ) : (

                                ticket.diagnostic ? (

                                    <p className="diagnostic-text">
                                        {ticket.diagnostic}
                                    </p>

                                ) : (

                                    <p className="description-text">
                                        Aucun diagnostic renseigné.
                                    </p>

                                )
                            )}

                        </div>

                    </div>

                    {/* SOLUTION */}

                    <div className="detail-card">

                        <div className="card-header">

                            <CheckCircle
                                size={19}
                                className="solution-icon"
                            />

                            <h2>
                                Solution / Résolution
                            </h2>

                        </div>

                        <div className="card-body">

                            {canEditTechnicalInfo ? (

                                <>
                                    <textarea
                                        value={solution}
                                        onChange={(e) =>
                                            setSolution(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Décrivez la solution apportée..."
                                        rows={5}
                                        style={{
                                            width: '100%',
                                            padding: '0.8rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                        }}
                                    />

                                    <button
                                        type="button"
                                        onClick={
                                            handleSaveDetails
                                        }
                                        disabled={
                                            savingDetails
                                        }
                                        className="ticket-action-btn"
                                        style={{
                                            marginTop: '0.75rem',
                                        }}
                                    >

                                        {savingDetails ? (
                                            <Loader2
                                                size={16}
                                                className="spin"
                                            />
                                        ) : (
                                            <Save size={16} />
                                        )}

                                        Enregistrer

                                    </button>

                                </>

                            ) : (

                                ticket.solution ? (

                                    <p className="solution-text">
                                        {ticket.solution}
                                    </p>

                                ) : (

                                    <p className="description-text">
                                        Aucune solution renseignée.
                                    </p>

                                )
                            )}

                        </div>

                    </div>

                    {/* OBSERVATIONS */}

                    {ticket.observations && (

                        <div className="detail-card">

                            <div className="card-header">

                                <ClipboardList
                                    size={19}
                                    className="card-icon"
                                />

                                <h2>
                                    Observations
                                </h2>

                            </div>

                            <div className="card-body">

                                <p className="description-text">
                                    {ticket.observations}
                                </p>

                            </div>

                        </div>
                    )}

                    {/* SUIVI */}

                    <div className="detail-card">

                        <div className="card-header">

                            <ShieldAlert
                                size={19}
                                className="card-icon"
                            />

                            <h2>
                                Suivi du traitement
                            </h2>

                        </div>

                        <div className="card-body">

                            <div className="meta-list">

                                <MetaItem
                                    icon={
                                        <Clock size={15} />
                                    }
                                    label="Statut"
                                >
                                    <StatusBadge
                                        status={
                                            ticket.status
                                        }
                                    />
                                </MetaItem>

                                <hr className="meta-divider" />

                                <MetaItem
                                    icon={
                                        <AlertTriangle
                                            size={15}
                                        />
                                    }
                                    label="Priorité"
                                >
                                    <PriorityBadge
                                        priority={
                                            ticket.priority
                                        }
                                    />
                                </MetaItem>

                                <hr className="meta-divider" />

                                <MetaItem
                                    icon={
                                        <User size={15} />
                                    }
                                    label="Déclaré par"
                                >
                                    {declaredBy
                                        ? (
                                            declaredBy.name ||
                                            declaredBy.full_name ||
                                            declaredBy.username ||
                                            'Utilisateur'
                                        )
                                        : 'Non renseigné'}
                                </MetaItem>

                                <hr className="meta-divider" />

                                <MetaItem
                                    icon={
                                        <UserCheck
                                            size={15}
                                        />
                                    }
                                    label="Intervenant"
                                >
                                    {assignedUser
                                        ? (
                                            assignedUser.name ||
                                            assignedUser.full_name ||
                                            assignedUser.username ||
                                            'Intervenant'
                                        )
                                        : 'Non assigné'}
                                </MetaItem>

                                <hr className="meta-divider" />

                                <MetaItem
                                    icon={
                                        <Users size={15} />
                                    }
                                    label="Groupe"
                                >
                                    {assignedGroup
                                        ? (
                                            assignedGroup.name ||
                                            `Groupe #${assignedGroup.id}`
                                        )
                                        : 'Aucun groupe'}
                                </MetaItem>

                                <hr className="meta-divider" />

                                <MetaItem
                                    icon={
                                        <Calendar
                                            size={15}
                                        />
                                    }
                                    label="Date de déclaration"
                                >
                                    {formatDateTime(
                                        ticket.created_at
                                    )}
                                </MetaItem>

                                {ticket.resolution_date && (
                                    <>
                                        <hr className="meta-divider" />

                                        <MetaItem
                                            icon={
                                                <CheckCircle
                                                    size={15}
                                                />
                                            }
                                            label="Date de résolution"
                                        >
                                            {formatDateTime(
                                                ticket.resolution_date
                                            )}
                                        </MetaItem>
                                    </>
                                )}

                                {ticket.closed_at && (
                                    <>
                                        <hr className="meta-divider" />

                                        <MetaItem
                                            icon={
                                                <CheckCircle
                                                    size={15}
                                                />
                                            }
                                            label="Date de clôture"
                                        >
                                            {formatDateTime(
                                                ticket.closed_at
                                            )}
                                        </MetaItem>
                                    </>
                                )}

                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    SIDEBAR
                ================================================= */}

                <div className="sidebar-column">

                    {/* ÉTAT */}

                    <div className="detail-card">

                        <div className="card-header">

                            <CircleDot
                                size={19}
                                className="card-icon"
                            />

                            <h2>
                                État du ticket
                            </h2>

                        </div>

                        <div className="card-body">

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    padding: '0.5rem 0 0.75rem',
                                }}
                            >

                                <StatusBadge
                                    status={
                                        ticket.status
                                    }
                                />

                                <p
                                    style={{
                                        margin: 0,
                                        color: '#64748b',
                                        fontSize: '0.78rem',
                                        textAlign: 'center',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    État actuel du ticket
                                </p>

                            </div>

                        </div>

                    </div>

                    {/* PRIORITÉ */}

                    <div className="detail-card">

                        <div className="card-header">

                            <AlertTriangle
                                size={19}
                                className="card-icon"
                            />

                            <h2>
                                Niveau de priorité
                            </h2>

                        </div>

                        <div className="card-body">

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    padding: '0.35rem 0',
                                }}
                            >

                                <PriorityBadge
                                    priority={
                                        ticket.priority
                                    }
                                />

                            </div>

                        </div>

                    </div>

                    {/* AFFECTATION */}

                    <div className="detail-card">

                        <div className="card-header">

                            <UserCheck
                                size={19}
                                className="card-icon"
                            />

                            <h2>
                                Affectation
                            </h2>

                        </div>

                        <div className="card-body">

                            <div className="meta-list">

                                <MetaItem
                                    icon={
                                        <User size={15} />
                                    }
                                    label="Intervenant"
                                >
                                    {assignedUser
                                        ? (
                                            assignedUser.name ||
                                            assignedUser.full_name ||
                                            assignedUser.username ||
                                            'Intervenant'
                                        )
                                        : 'Non assigné'}
                                </MetaItem>

                                <hr className="meta-divider" />

                                <MetaItem
                                    icon={
                                        <Users size={15} />
                                    }
                                    label="Groupe"
                                >
                                    {assignedGroup
                                        ? (
                                            assignedGroup.name ||
                                            `Groupe #${assignedGroup.id}`
                                        )
                                        : 'Aucun groupe'}
                                </MetaItem>

                            </div>

                        </div>

                    </div>

                    {/* INFO INTERVENANT */}

                    {isIntervenant && (

                        <div className="detail-card">

                            <div className="card-header">

                                <Wrench
                                    size={19}
                                    className="card-icon"
                                />

                                <h2>
                                    Intervention corrective
                                </h2>

                            </div>

                            <div className="card-body">

                                <p className="description-text">
                                    Ce ticket est intégré à votre
                                    espace « Mes interventions »
                                    comme une intervention
                                    corrective.
                                </p>

                            </div>

                        </div>
                    )}

                </div>

            </div>

        </div>
    );
};

export default TicketDetails;