import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Download,
    Edit3,
    FileText,
    RefreshCw,
    User,
    Users,
    Wrench,
    ClipboardList,
    AlertCircle,
    ChevronRight,
    X,
    Eye,
    Activity,
    Hash,
    Timer,
    Gauge,
    FileSpreadsheet,
} from 'lucide-react';

import './InterventionDetail.css';

const InterventionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [intervention, setIntervention] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [starting, setStarting] = useState(false);

    const [activeTab, setActiveTab] = useState('details');

    const [readings, setReadings] = useState([]);

    const [selectedReading, setSelectedReading] = useState(null);
    const [readingModalOpen, setReadingModalOpen] = useState(false);

    // ============================================================
    // CHARGEMENT DE L'INTERVENTION
    // ============================================================

    const fetchIntervention = async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            const response = await api.get(`/interventions/${id}`);

            const interventionData =
                response?.data?.data ??
                response?.data ??
                null;

            if (!interventionData) {
                throw new Error('Intervention introuvable');
            }

            setIntervention(interventionData);

            setReadings(
                Array.isArray(interventionData.readings)
                    ? interventionData.readings
                    : []
            );
        } catch (error) {
            console.error(
                'Erreur chargement intervention :',
                error
            );

            toast.error(
                error?.response?.data?.message ||
                'Impossible de charger l’intervention.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchIntervention(true);
        }
    }, [id]);

    // ============================================================
    // DÉMARRER L'INTERVENTION
    // ============================================================

    const handleStart = async () => {
        if (!intervention || starting) {
            return;
        }

        try {
            setStarting(true);

            const response = await api.post(
                `/interventions/${intervention.id}/start`
            );

            const updatedIntervention =
                response?.data?.data ??
                null;

            if (updatedIntervention) {
                setIntervention(updatedIntervention);

                setReadings(
                    Array.isArray(updatedIntervention.readings)
                        ? updatedIntervention.readings
                        : []
                );
            } else {
                await fetchIntervention(false);
            }

            toast.success(
                'Intervention démarrée avec succès.'
            );
        } catch (error) {
            console.error(
                'Erreur démarrage intervention :',
                error
            );

            toast.error(
                error?.response?.data?.message ||
                'Impossible de démarrer l’intervention.'
            );
        } finally {
            setStarting(false);
        }
    };

    // ============================================================
    // TÉLÉCHARGEMENT PDF
    // ============================================================

    const downloadPdf = async () => {
        if (!intervention) {
            return;
        }

        try {
            const response = await api.get(
                `/interventions/${intervention.id}/download-pdf`,
                {
                    responseType: 'blob',
                }
            );

            const blob = new Blob(
                [response.data],
                {
                    type:
                        response.headers?.['content-type'] ||
                        'application/pdf',
                }
            );

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download =
                `intervention-${intervention.id}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

            toast.success('PDF téléchargé.');
        } catch (error) {
            console.error(
                'Erreur téléchargement PDF :',
                error
            );

            toast.error(
                'Impossible de télécharger le PDF.'
            );
        }
    };

    // ============================================================
    // MODALE RELEVÉ
    // ============================================================

    const openReading = (reading) => {
        setSelectedReading(reading);
        setReadingModalOpen(true);
    };

    const closeReading = () => {
        setSelectedReading(null);
        setReadingModalOpen(false);
    };

    // ============================================================
    // HELPERS
    // ============================================================

    const formatDate = (date) => {
        if (!date) {
            return '—';
        }

        try {
            return new Intl.DateTimeFormat(
                'fr-FR',
                {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }
            ).format(new Date(date));
        } catch {
            return date;
        }
    };

    const formatDateTime = (date) => {
        if (!date) {
            return '—';
        }

        try {
            return new Intl.DateTimeFormat(
                'fr-FR',
                {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }
            ).format(new Date(date));
        } catch {
            return date;
        }
    };

    const formatTime = (time) => {
        if (!time) {
            return '—';
        }

        return String(time).substring(0, 5);
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'en_attente':
                return 'En attente';

            case 'en_cours':
                return 'En cours';

            case 'terminee':
                return 'Terminée';

            case 'validee':
                return 'Validée';

            case 'en_retard':
                return 'En retard';

            case 'annulee':
                return 'Annulée';

            default:
                return status || '—';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'en_attente':
                return 'status-planifiee';

            case 'en_cours':
                return 'status-en-cours';

            case 'terminee':
                return 'status-terminee';

            case 'validee':
                return 'status-validee';

            case 'en_retard':
                return 'status-retard';

            case 'annulee':
                return 'status-rejetee';

            default:
                return 'status-planifiee';
        }
    };

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 'urgente':
                return 'Urgente';

            case 'elevee':
            case 'haute':
                return 'Élevée';

            case 'normale':
            case 'normal':
                return 'Normale';

            case 'faible':
                return 'Faible';

            default:
                return priority || '—';
        }
    };

    const getPriorityClass = (priority) => {
        switch (priority) {
            case 'urgente':
                return 'prio-urgente';

            case 'elevee':
            case 'haute':
                return 'prio-elevee';

            case 'normale':
            case 'normal':
                return 'prio-normale';

            default:
                return '';
        }
    };

    const getReadingStatusLabel = (status) => {
        switch (status) {
            case 'valide':
            case 'validee':
                return 'Validé';

            case 'rejete':
            case 'rejetee':
                return 'Rejeté';

            case 'modifications_demandees':
                return 'Modifications demandées';

            case 'brouillon':
                return 'Brouillon';

            default:
                return status || '—';
        }
    };

    const getReadingStatusClass = (status) => {
        switch (status) {
            case 'valide':
            case 'validee':
                return 'status-terminee';

            case 'rejete':
            case 'rejetee':
                return 'status-rejetee';

            case 'modifications_demandees':
                return 'status-modifications';

            default:
                return 'status-planifiee';
        }
    };

    const getDisplayStateLabel = () => {
        if (!intervention) {
            return '';
        }

        if (intervention.status === 'validee') {
            return 'Intervention validée';
        }

        if (intervention.status === 'terminee') {
            return 'En attente de validation';
        }

        if (intervention.status === 'en_cours') {
            return 'Intervention en cours';
        }

        if (intervention.status === 'en_retard') {
            return 'Intervention en retard';
        }

        if (intervention.status === 'annulee') {
            return 'Intervention annulée';
        }

        return 'Intervention planifiée';
    };

    const getReadingValues = (reading) => {
        if (!reading) {
            return {};
        }

        if (
            reading.values &&
            typeof reading.values === 'object'
        ) {
            return reading.values;
        }

        return {};
    };

    // ============================================================
    // DONNÉES CALCULÉES
    // ============================================================

    const equipment = intervention?.equipment || null;
    const group = intervention?.group || null;
    const user = intervention?.user || null;

    const assignedTemplate =
        intervention?.template ||
        intervention?.reading_template ||
        null;

    const planningTemplate =
        intervention?.planningTemplate ||
        intervention?.planning_template ||
        null;

    const canStart =
        intervention &&
        ['en_attente', 'en_retard'].includes(
            intervention.status
        );

    const canEdit =
        intervention &&
        ['en_attente', 'en_cours'].includes(
            intervention.status
        );

    const statusClass = getStatusClass(
        intervention?.status
    );

    const statusLabel = getStatusLabel(
        intervention?.status
    );

    const priorityClass = getPriorityClass(
        intervention?.priority
    );

    const readingCount = readings.length;

    const latestReading = useMemo(() => {
        if (!readings.length) {
            return null;
        }

        return [...readings].sort((a, b) => {
            const dateA =
                new Date(
                    a.taken_at ||
                    a.created_at ||
                    0
                ).getTime();

            const dateB =
                new Date(
                    b.taken_at ||
                    b.created_at ||
                    0
                ).getTime();

            return dateB - dateA;
        })[0];
    }, [readings]);

    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {
        return (
            <div className="intervention-detail">
                <div className="loader-state">
                    <RefreshCw
                        size={32}
                        className="spin"
                    />

                    <span>
                        Chargement de l’intervention...
                    </span>
                </div>
            </div>
        );
    }

    // ============================================================
    // EMPTY
    // ============================================================

    if (!intervention) {
        return (
            <div className="intervention-detail">
                <div className="empty-state">
                    <AlertCircle size={42} />

                    <h3>
                        Intervention introuvable
                    </h3>

                    <p>
                        L’intervention demandée
                        n’existe pas ou n’est plus
                        disponible.
                    </p>

                    <button
                        type="button"
                        className="btn-primary"
                        onClick={() =>
                            navigate('/interventions')
                        }
                    >
                        <ArrowLeft size={16} />

                        Retour aux interventions
                    </button>
                </div>
            </div>
        );
    }

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="intervention-detail">

            {/* ======================================================
                HEADER
            ====================================================== */}

            <div className="detail-header">

                <div className="header-left">

                    <button
                        type="button"
                        className="back-button"
                        onClick={() =>
                            navigate('/interventions')
                        }
                        title="Retour"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div>

                        <div className="page-breadcrumbs">
                            <span>
                                Interventions
                            </span>

                            <ChevronRight size={12} />

                            <span>
                                Détail
                            </span>
                        </div>

                        <h1>
                            Intervention #
                            {intervention.id}
                        </h1>

                        <div className="header-status">
                            <span
                                className={`status-badge ${statusClass}`}
                            >
                                {statusLabel}
                            </span>
                        </div>

                    </div>
                </div>

                <div className="header-actions">

                    {canStart && (
                        <button
                            type="button"
                            className="btn-success-action"
                            onClick={handleStart}
                            disabled={starting}
                        >
                            {starting ? (
                                <>
                                    <RefreshCw
                                        size={16}
                                        className="spin"
                                    />

                                    Démarrage...
                                </>
                            ) : (
                                <>
                                    <Activity
                                        size={16}
                                    />

                                    Démarrer
                                </>
                            )}
                        </button>
                    )}

                    {canEdit && (
                        <button
                            type="button"
                            className="btn-edit"
                            onClick={() =>
                                navigate(
                                    `/interventions/${intervention.id}/edit`
                                )
                            }
                        >
                            <Edit3 size={16} />

                            Modifier
                        </button>
                    )}

                    <button
                        type="button"
                        className="btn-refresh"
                        onClick={() =>
                            fetchIntervention(false)
                        }
                        disabled={refreshing}
                        title="Actualiser"
                    >
                        <RefreshCw
                            size={17}
                            className={
                                refreshing
                                    ? 'spin'
                                    : ''
                            }
                        />
                    </button>

                </div>
            </div>

            {/* ======================================================
                SUMMARY BAR
            ====================================================== */}

            <div className="detail-summary-bar">

                <div className="summary-pill">

                    <div className="pill-icon">
                        <Wrench size={20} />
                    </div>

                    <div>
                        <span>
                            Équipement
                        </span>

                        <strong>
                            {equipment?.name ||
                                equipment?.designation ||
                                '—'}
                        </strong>
                    </div>

                </div>

                <div className="summary-divider" />

                <div className="summary-pill">

                    <div className="pill-icon">
                        <Users size={20} />
                    </div>

                    <div>
                        <span>
                            Groupe
                        </span>

                        <strong>
                            {group?.name ||
                                group?.nom ||
                                '—'}
                        </strong>
                    </div>

                </div>

                <div className="summary-divider" />

                <div className="summary-pill">

                    <div className="pill-icon">
                        <CalendarDays size={20} />
                    </div>

                    <div>
                        <span>
                            Date prévue
                        </span>

                        <strong>
                            {formatDate(
                                intervention.scheduled_date
                            )}
                        </strong>
                    </div>

                </div>

                <div className="summary-divider" />

                <div className="summary-pill">

                    <div className="pill-icon">
                        <Clock3 size={20} />
                    </div>

                    <div>
                        <span>
                            Heure
                        </span>

                        <strong>
                            {formatTime(
                                intervention.scheduled_time
                            )}
                        </strong>
                    </div>

                </div>

            </div>

            {/* ======================================================
                NAVIGATION
            ====================================================== */}

            <div className="navigation-tabs">

                <button
                    type="button"
                    className={
                        `tab-btn ${
                            activeTab === 'details'
                                ? 'active'
                                : ''
                        }`
                    }
                    onClick={() =>
                        setActiveTab('details')
                    }
                >
                    <FileText size={17} />

                    Détails
                </button>

                <button
                    type="button"
                    className={
                        `tab-btn ${
                            activeTab === 'readings'
                                ? 'active'
                                : ''
                        }`
                    }
                    onClick={() =>
                        setActiveTab('readings')
                    }
                >
                    <ClipboardList size={17} />

                    Relevés

                    {readingCount > 0 && (
                        <span>
                            ({readingCount})
                        </span>
                    )}
                </button>

            </div>

            {/* ======================================================
                TAB : DÉTAILS
            ====================================================== */}

            {activeTab === 'details' && (

                <div className="tab-content-grid">

                    {/* ------------------------------------------------
                        INFORMATIONS PRINCIPALES
                    ------------------------------------------------ */}

                    <div className="detail-grid-compact">

                        <section className="detail-card-section">

                            <div className="card-section-header">

                                <div className="card-section-title">
                                    <Wrench size={18} />

                                    <h3>
                                        Équipement
                                    </h3>
                                </div>

                            </div>

                            <div className="card-section-body">

                                <div className="info-grid">

                                    <div className="info-item">
                                        <span className="info-label">
                                            Désignation
                                        </span>

                                        <span className="info-value">
                                            {equipment?.name ||
                                                equipment?.designation ||
                                                '—'}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Référence
                                        </span>

                                        <span className="info-value">
                                            {equipment?.reference ||
                                                equipment?.code ||
                                                equipment?.serial_number ||
                                                '—'}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Type
                                        </span>

                                        <span className="info-value">
                                            {equipment?.type ||
                                                equipment?.category ||
                                                '—'}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Localisation
                                        </span>

                                        <span className="info-value">
                                            {equipment?.location ||
                                                equipment?.localisation ||
                                                '—'}
                                        </span>
                                    </div>

                                </div>

                            </div>

                        </section>

                        {/* ------------------------------------------------
                            PLANIFICATION
                        ------------------------------------------------ */}

                        <section className="detail-card-section">

                            <div className="card-section-header">

                                <div className="card-section-title">
                                    <CalendarDays size={18} />

                                    <h3>
                                        Planification
                                    </h3>
                                </div>

                            </div>

                            <div className="card-section-body">

                                <div className="info-grid">

                                    <div className="info-item">
                                        <span className="info-label">
                                            Date
                                        </span>

                                        <span className="info-value">
                                            {formatDate(
                                                intervention.scheduled_date
                                            )}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Heure
                                        </span>

                                        <span className="info-value">
                                            {formatTime(
                                                intervention.scheduled_time
                                            )}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Durée
                                        </span>

                                        <span className="info-value">
                                            {intervention.duration
                                                ? `${intervention.duration} min`
                                                : '—'}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Priorité
                                        </span>

                                        <span
                                            className={`info-value priority-tag ${priorityClass}`}
                                        >
                                            {getPriorityLabel(
                                                intervention.priority
                                            )}
                                        </span>
                                    </div>

                                </div>

                            </div>

                        </section>

                    </div>

                    {/* ------------------------------------------------
                        AFFECTATION
                    ------------------------------------------------ */}

                    <section className="detail-card-section">

                        <div className="card-section-header">

                            <div className="card-section-title">
                                <Users size={18} />

                                <h3>
                                    Affectation
                                </h3>
                            </div>

                        </div>

                        <div className="card-section-body">

                            <div className="info-grid">

                                <div className="info-item">

                                    <span className="info-label">
                                        Groupe responsable
                                    </span>

                                    <span className="info-value">
                                        {group?.name ||
                                            group?.nom ||
                                            '—'}
                                    </span>

                                </div>

                                <div className="info-item">

                                    <span className="info-label">
                                        Intervenant
                                    </span>

                                    <span className="info-value">
                                        {user?.name ||
                                            user?.full_name ||
                                            'Non affecté'}
                                    </span>

                                </div>

                                <div className="info-item">

                                    <span className="info-label">
                                        Type
                                    </span>

                                    <span className="info-value">
                                        {intervention.type ||
                                            '—'}
                                    </span>

                                </div>

                                <div className="info-item">

                                    <span className="info-label">
                                        Créée par
                                    </span>

                                    <span className="info-value">
                                        {intervention.created_by_user?.name ||
                                            intervention.createdBy?.name ||
                                            '—'}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </section>

                    {/* ------------------------------------------------
                        MODÈLE DE RELEVÉ
                    ------------------------------------------------ */}

                    <section className="detail-card-section">

                        <div className="card-section-header">

                            <div className="card-section-title">
                                <ClipboardList size={18} />

                                <h3>
                                    Modèle de relevé
                                </h3>
                            </div>

                        </div>

                        {assignedTemplate ? (

                            <div className="reading-banner">

                                <div className="reading-banner-left">

                                    <div className="reading-banner-icon">
                                        <Gauge size={22} />
                                    </div>

                                    <div className="reading-banner-details">

                                        <div className="reading-banner-title">

                                            <h3>
                                                {assignedTemplate.name ||
                                                    assignedTemplate.title ||
                                                    assignedTemplate.designation ||
                                                    'Modèle de relevé'}
                                            </h3>

                                            {assignedTemplate.type && (
                                                <span className="reading-badge-type">
                                                    {assignedTemplate.type}
                                                </span>
                                            )}

                                        </div>

                                        <div className="reading-banner-sub">

                                            <Hash size={14} />

                                            <span>
                                                {assignedTemplate.id
                                                    ? `Modèle #${assignedTemplate.id}`
                                                    : 'Modèle associé'}
                                            </span>

                                        </div>

                                    </div>

                                </div>

                                <div className="reading-banner-actions">

                                    {intervention.reading_pdf_path && (
                                        <button
                                            type="button"
                                            className="btn-open-reading"
                                            onClick={
                                                downloadPdf
                                            }
                                        >
                                            <Download
                                                size={16}
                                            />

                                            PDF
                                        </button>
                                    )}

                                </div>

                            </div>

                        ) : (

                            <div className="no-assigned-reading">

                                <AlertCircle size={18} />

                                <span>
                                    Aucun modèle de relevé
                                    n’est associé à cette
                                    intervention.
                                </span>

                            </div>

                        )}

                    </section>

                    {/* ------------------------------------------------
                        DESCRIPTION
                    ------------------------------------------------ */}

                    <section className="detail-section">

                        <div className="section-header">

                            <div>

                                <span className="section-kicker">
                                    INTERVENTION
                                </span>

                                <h2>
                                    Description
                                </h2>

                            </div>

                        </div>

                        <div className="description-content">

                            <p>
                                {intervention.description ||
                                    'Aucune description fournie pour cette intervention.'}
                            </p>

                        </div>

                    </section>

                    {/* ------------------------------------------------
                        DIAGNOSTIC
                    ------------------------------------------------ */}

                    {(intervention.diagnostic ||
                        intervention.actions ||
                        intervention.observations) && (

                        <section className="detail-section">

                            <div className="section-header">

                                <div>

                                    <span className="section-kicker">
                                        COMPTE RENDU
                                    </span>

                                    <h2>
                                        Informations de réalisation
                                    </h2>

                                </div>

                            </div>

                            <div className="card-section-body">

                                <div className="info-grid">

                                    <div className="info-item">

                                        <span className="info-label">
                                            Diagnostic
                                        </span>

                                        <span className="info-value">
                                            {intervention.diagnostic ||
                                                '—'}
                                        </span>

                                    </div>

                                    <div className="info-item">

                                        <span className="info-label">
                                            Actions réalisées
                                        </span>

                                        <span className="info-value">
                                            {intervention.actions ||
                                                '—'}
                                        </span>

                                    </div>

                                    <div className="info-item">

                                        <span className="info-label">
                                            Observations
                                        </span>

                                        <span className="info-value">
                                            {intervention.observations ||
                                                '—'}
                                        </span>

                                    </div>

                                    <div className="info-item">

                                        <span className="info-label">
                                            Pièces utilisées
                                        </span>

                                        <span className="info-value">
                                            {intervention.parts_used
                                                ? (
                                                    Array.isArray(
                                                        intervention.parts_used
                                                    )
                                                        ? intervention.parts_used.join(
                                                              ', '
                                                          )
                                                        : String(
                                                              intervention.parts_used
                                                          )
                                                )
                                                : 'Aucune'}
                                        </span>

                                    </div>

                                </div>

                            </div>

                        </section>

                    )}

                    {/* ------------------------------------------------
                        INFORMATIONS SYSTÈME
                    ------------------------------------------------ */}

                    <section className="detail-card-section">

                        <div className="card-section-header">

                            <div className="card-section-title">
                                <Hash size={18} />

                                <h3>
                                    Informations système
                                </h3>
                            </div>

                        </div>

                        <div className="card-section-body">

                            <div className="info-grid">

                                <div className="info-item">
                                    <span className="info-label">
                                        Identifiant
                                    </span>

                                    <span className="info-value">
                                        #{intervention.id}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">
                                        Créée le
                                    </span>

                                    <span className="info-value">
                                        {formatDateTime(
                                            intervention.created_at
                                        )}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">
                                        Démarrée le
                                    </span>

                                    <span className="info-value">
                                        {formatDateTime(
                                            intervention.started_at
                                        )}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">
                                        Terminée le
                                    </span>

                                    <span className="info-value">
                                        {formatDateTime(
                                            intervention.completed_at
                                        )}
                                    </span>
                                </div>

                            </div>

                        </div>

                    </section>

                </div>
            )}

            {/* ======================================================
                TAB : RELEVÉS
            ====================================================== */}

            {activeTab === 'readings' && (

                <div className="tab-content-stack">

                    <section className="detail-card-section">

                        <div className="card-section-header">

                            <div className="card-section-title">

                                <ClipboardList size={18} />

                                <h3>
                                    Historique des relevés
                                </h3>

                            </div>

                            <span className="reading-badge-type">
                                {readingCount}{' '}
                                relevé
                                {readingCount > 1
                                    ? 's'
                                    : ''}
                            </span>

                        </div>

                        {readings.length > 0 ? (

                            <div className="reading-history">

                                {readings.map(
                                    (reading, index) => {

                                        const readingStatus =
                                            reading.validation_status ||
                                            reading.status ||
                                            'brouillon';

                                        return (
                                            <div
                                                key={
                                                    reading.id ||
                                                    index
                                                }
                                                className="reading-history-item clickable"
                                                onClick={() =>
                                                    openReading(
                                                        reading
                                                    )
                                                }
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(
                                                    event
                                                ) => {
                                                    if (
                                                        event.key ===
                                                        'Enter'
                                                    ) {
                                                        openReading(
                                                            reading
                                                        );
                                                    }
                                                }}
                                            >

                                                <div className="reading-history-main">

                                                    <div className="reading-history-icon">
                                                        <ClipboardList
                                                            size={
                                                                18
                                                            }
                                                        />
                                                    </div>

                                                    <div>

                                                        <strong>
                                                            Relevé #
                                                            {reading.id ||
                                                                index +
                                                                    1}
                                                        </strong>

                                                        <span className="history-date">
                                                            {formatDateTime(
                                                                reading.taken_at ||
                                                                    reading.created_at
                                                            )}
                                                        </span>

                                                        {reading.commentaire && (
                                                            <p className="history-comment">
                                                                {
                                                                    reading.commentaire
                                                                }
                                                            </p>
                                                        )}

                                                        {reading.comment && (
                                                            <p className="history-comment">
                                                                {
                                                                    reading.comment
                                                                }
                                                            </p>
                                                        )}

                                                    </div>

                                                </div>

                                                <div className="reading-history-right">

                                                    <span
                                                        className={`status-badge ${getReadingStatusClass(
                                                            readingStatus
                                                        )}`}
                                                    >
                                                        {getReadingStatusLabel(
                                                            readingStatus
                                                        )}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        className="btn-open-reading-icon"
                                                        onClick={(
                                                            event
                                                        ) => {
                                                            event.stopPropagation();
                                                            openReading(
                                                                reading
                                                            );
                                                        }}
                                                        title="Consulter"
                                                    >
                                                        <Eye
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </button>

                                                </div>

                                            </div>
                                        );
                                    }
                                )}

                            </div>

                        ) : (

                            <div className="no-assigned-reading">

                                <ClipboardList
                                    size={22}
                                />

                                <span>
                                    Aucun relevé n’a encore
                                    été créé pour cette
                                    intervention.
                                </span>

                            </div>

                        )}

                    </section>

                    {/* ------------------------------------------------
                        DERNIER RELEVÉ
                    ------------------------------------------------ */}

                    {latestReading && (

                        <section className="detail-card-section">

                            <div className="card-section-header">

                                <div className="card-section-title">

                                    <Activity size={18} />

                                    <h3>
                                        Dernier relevé
                                    </h3>

                                </div>

                            </div>

                            <div className="card-section-body">

                                <div className="info-grid">

                                    <div className="info-item">

                                        <span className="info-label">
                                            Date de mesure
                                        </span>

                                        <span className="info-value">
                                            {formatDateTime(
                                                latestReading.taken_at ||
                                                    latestReading.created_at
                                            )}
                                        </span>

                                    </div>

                                    <div className="info-item">

                                        <span className="info-label">
                                            Effectué par
                                        </span>

                                        <span className="info-value">
                                            {latestReading.taken_by_user?.name ||
                                                latestReading.takenBy?.name ||
                                                latestReading.user?.name ||
                                                '—'}
                                        </span>

                                    </div>

                                    <div className="info-item">

                                        <span className="info-label">
                                            Validation
                                        </span>

                                        <span className="info-value">

                                            <span
                                                className={`status-badge ${getReadingStatusClass(
                                                    latestReading.validation_status ||
                                                        latestReading.status
                                                )}`}
                                            >
                                                {getReadingStatusLabel(
                                                    latestReading.validation_status ||
                                                        latestReading.status
                                                )}
                                            </span>

                                        </span>

                                    </div>

                                </div>

                            </div>

                        </section>
                    )}

                </div>
            )}

            {/* ======================================================
                MODALE RELEVÉ
            ====================================================== */}

            {readingModalOpen &&
                selectedReading && (

                    <div
                        className="reading-modal-overlay"
                        onMouseDown={(
                            event
                        ) => {
                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                closeReading();
                            }
                        }}
                    >

                        <div className="reading-modal">

                            <div className="reading-modal-header">

                                <div>

                                    <span className="modal-subtitle">
                                        CONSULTATION DU RELEVÉ
                                    </span>

                                    <h2>
                                        Relevé #
                                        {selectedReading.id}
                                    </h2>

                                </div>

                                <button
                                    type="button"
                                    className="reading-modal-close"
                                    onClick={
                                        closeReading
                                    }
                                    title="Fermer"
                                >
                                    <X size={22} />
                                </button>

                            </div>

                            <div className="reading-modal-body">

                                <div className="reading-document">

                                    {/* ------------------------------------------------
                                        IDENTIFICATION
                                    ------------------------------------------------ */}

                                    <div className="document-top">

                                        <div className="document-brand">

                                            <strong>
                                                GMAO CNS
                                            </strong>

                                            <span>
                                                Fiche de relevé
                                            </span>

                                        </div>

                                        <div className="document-code">

                                            <span>
                                                Intervention
                                            </span>

                                            <strong>
                                                #
                                                {
                                                    intervention.id
                                                }
                                            </strong>

                                        </div>

                                    </div>

                                    <div className="document-division">
                                        SYSTÈMES CNS
                                    </div>

                                    {/* ------------------------------------------------
                                        STATUS
                                    ------------------------------------------------ */}

                                    <div className="reading-status-banner">

                                        <div className="status-banner-left">

                                            <CheckCircle2
                                                size={18}
                                            />

                                            <strong>
                                                {getReadingStatusLabel(
                                                    selectedReading.validation_status ||
                                                        selectedReading.status
                                                )}
                                            </strong>

                                        </div>

                                        {selectedReading.validated_at && (
                                            <span className="validated-at-text">
                                                Validé le{' '}
                                                {formatDateTime(
                                                    selectedReading.validated_at
                                                )}
                                            </span>
                                        )}

                                        {(
                                            selectedReading.commentaire ||
                                            selectedReading.comment
                                        ) && (

                                            <div className="validation-comment-box">

                                                <AlertCircle
                                                    size={16}
                                                />

                                                <span>
                                                    {selectedReading.commentaire ||
                                                        selectedReading.comment}
                                                </span>

                                            </div>
                                        )}

                                    </div>

                                    {/* ------------------------------------------------
                                        IDENTIFICATION
                                    ------------------------------------------------ */}

                                    <div className="document-identification">

                                        <div className="document-field">
                                            <span>
                                                Équipement
                                            </span>

                                            <strong>
                                                {equipment?.name ||
                                                    equipment?.designation ||
                                                    '—'}
                                            </strong>
                                        </div>

                                        <div className="document-field">
                                            <span>
                                                Groupe
                                            </span>

                                            <strong>
                                                {group?.name ||
                                                    group?.nom ||
                                                    '—'}
                                            </strong>
                                        </div>

                                        <div className="document-field">
                                            <span>
                                                Date
                                            </span>

                                            <strong>
                                                {formatDate(
                                                    selectedReading.taken_at ||
                                                        selectedReading.created_at
                                                )}
                                            </strong>
                                        </div>

                                        <div className="document-field">
                                            <span>
                                                Intervenant
                                            </span>

                                            <strong>
                                                {selectedReading.taken_by_user?.name ||
                                                    selectedReading.takenBy?.name ||
                                                    selectedReading.user?.name ||
                                                    user?.name ||
                                                    '—'}
                                            </strong>
                                        </div>

                                    </div>

                                    {/* ------------------------------------------------
                                        VALEURS
                                    ------------------------------------------------ */}

                                    <div>

                                        <div className="document-section-title">
                                            <Gauge size={17} />

                                            Valeurs relevées
                                        </div>

                                        <div className="interactive-reading-table-wrapper">

                                            <table className="interactive-reading-table">

                                                <thead>
                                                    <tr>
                                                        <th>
                                                            Paramètre
                                                        </th>

                                                        <th>
                                                            Valeur
                                                        </th>

                                                        <th>
                                                            Unité
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>

                                                    {Object.entries(
                                                        getReadingValues(
                                                            selectedReading
                                                        )
                                                    ).length > 0 ? (

                                                        Object.entries(
                                                            getReadingValues(
                                                                selectedReading
                                                            )
                                                        ).map(
                                                            (
                                                                [
                                                                    key,
                                                                    value,
                                                                ]
                                                            ) => {

                                                                let displayValue =
                                                                    value;

                                                                let unit =
                                                                    '';

                                                                if (
                                                                    value &&
                                                                    typeof value ===
                                                                        'object'
                                                                ) {
                                                                    displayValue =
                                                                        value.value ??
                                                                        value.valeur ??
                                                                        value.display ??
                                                                        '—';

                                                                    unit =
                                                                        value.unit ??
                                                                        value.unite ??
                                                                        '';
                                                                }

                                                                return (
                                                                    <tr
                                                                        key={
                                                                            key
                                                                        }
                                                                    >
                                                                        <td>
                                                                            {
                                                                                key
                                                                            }
                                                                        </td>

                                                                        <td>
                                                                            <span className="value-display-only">
                                                                                {String(
                                                                                    displayValue
                                                                                )}
                                                                            </span>
                                                                        </td>

                                                                        <td>
                                                                            <span className="unit-tag">
                                                                                {unit ||
                                                                                    '—'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }
                                                        )

                                                    ) : (

                                                        <tr>
                                                            <td
                                                                colSpan="3"
                                                                className="text-center"
                                                            >
                                                                Aucune
                                                                valeur
                                                                enregistrée
                                                            </td>
                                                        </tr>
                                                    )}

                                                </tbody>

                                            </table>

                                        </div>

                                    </div>

                                    {/* ------------------------------------------------
                                        OBSERVATION
                                    ------------------------------------------------ */}

                                    {(
                                        selectedReading.observation ||
                                        selectedReading.observations
                                    ) && (

                                        <div>

                                            <div className="document-section-title">
                                                <FileText
                                                    size={17}
                                                />

                                                Observation
                                            </div>

                                            <div className="validation-comment-box">

                                                {selectedReading.observation ||
                                                    selectedReading.observations}

                                            </div>

                                        </div>
                                    )}

                                </div>

                            </div>

                        </div>

                    </div>
                )}

        </div>
    );
};

export default InterventionDetail;