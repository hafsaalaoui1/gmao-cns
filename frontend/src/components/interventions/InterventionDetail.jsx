import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

import {
    RefreshCw,
    FileText,
    Download,
    Edit3,
    Play,
    ArrowLeft,
    CalendarDays,
    Clock3,
    Users,
    Wrench,
    ClipboardList,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

import './InterventionDetail.css';

const InterventionDetail = () => {

    const { id } = useParams();
    const navigate = useNavigate();

    const [intervention, setIntervention] = useState(null);
    const [loading, setLoading] = useState(true);
    const [readings, setReadings] = useState([]);
    const [starting, setStarting] = useState(false);

    // ============================================================
    // CHARGEMENT DE L'INTERVENTION
    // ============================================================

    useEffect(() => {
        console.log('🔥🔥 INTERVENTION DETAIL CHARGÉ');
        console.log('🔥 ID reçu dans URL =', id);

        fetchIntervention();
    }, [id]);

    // ============================================================
    // CHARGER L'INTERVENTION
    // ============================================================

    const fetchIntervention = async () => {

        setLoading(true);

        console.log('🔥 FETCH INTERVENTION');
        console.log('🔥 ID =', id);

        try {

            const response = await api.get(
                `/interventions/${id}`
            );

            console.log(
                '🔥 RESPONSE API =',
                response.data
            );

            const interventionData =
                response.data?.data ||
                response.data;

            console.log(
                '🔥 INTERVENTION COMPLETE =',
                interventionData
            );

            console.log(
                '🔥 TEMPLATE / RELEVÉ AFFECTÉ =',
                interventionData?.template
            );

            console.log(
                '🔥 TEMPLATE ID =',
                interventionData?.template_id
            );

            console.log(
                '🔥 READINGS / MESURES =',
                interventionData?.readings
            );

            // ====================================================
            // INTERVENTION
            // ====================================================

            setIntervention(
                interventionData
            );

            // ====================================================
            // RELEVÉS SAISIS
            // ====================================================

            setReadings(
                Array.isArray(
                    interventionData?.readings
                )
                    ? interventionData.readings
                    : []
            );

        } catch (error) {

            console.error(
                '❌ Erreur chargement intervention :',
                error
            );

            console.error(
                '❌ Response erreur :',
                error.response?.data
            );

            toast.error(
                'Impossible de charger les détails de l’intervention'
            );

            navigate(
                '/my-interventions'
            );

        } finally {

            setLoading(false);

        }
    };

    // ============================================================
    // DÉMARRER L'INTERVENTION
    // ============================================================

    const handleStart = async () => {

        if (!intervention || starting) {
            return;
        }

        setStarting(true);

        console.log(
            '🚀 DÉMARRAGE INTERVENTION',
            intervention.id
        );

        try {

            const response = await api.post(
                `/interventions/${intervention.id}/start`
            );

            console.log(
                '🚀 RESPONSE START =',
                response.data
            );

            if (response.data?.success) {

                toast.success(
                    'Intervention démarrée avec succès'
                );

                /*
                 * On recharge complètement les données.
                 * Cela permet notamment de récupérer :
                 * - status = en_cours
                 * - started_at
                 * - le Reading créé automatiquement
                 */
                await fetchIntervention();

            } else {

                toast.error(
                    response.data?.message ||
                    'Impossible de démarrer l’intervention'
                );

            }

        } catch (error) {

            console.error(
                '❌ Erreur démarrage intervention :',
                error
            );

            console.error(
                '❌ Response erreur start :',
                error.response?.data
            );

            toast.error(
                error.response?.data?.message ||
                'Impossible de démarrer l’intervention'
            );

        } finally {

            setStarting(false);

        }
    };

    // ============================================================
    // MODIFIER
    // ============================================================

    const handleEdit = () => {

        navigate(
            `/interventions/${intervention.id}/edit`
        );

    };

    // ============================================================
    // TÉLÉCHARGER PDF
    // ============================================================

    const downloadPdf = async () => {

        try {

            const response = await api.get(
                `/interventions/${id}/download-pdf`,
                {
                    responseType: 'blob'
                }
            );

            const url =
                window.URL.createObjectURL(
                    new Blob([response.data])
                );

            const link =
                document.createElement('a');

            link.href = url;

            link.setAttribute(
                'download',
                `releve_${id}.pdf`
            );

            document.body.appendChild(link);

            link.click();

            link.remove();

            window.URL.revokeObjectURL(url);

        } catch (error) {

            console.error(
                'Erreur téléchargement PDF :',
                error
            );

            toast.error(
                'Erreur lors du téléchargement du PDF'
            );

        }
    };

    // ============================================================
    // BADGE STATUT
    // ============================================================

    const getStatusBadge = (status) => {

        const map = {

            en_attente: {
                label: 'Planifiée',
                className: 'status-planifiee',
                icon: <CalendarDays size={16} />
            },

            en_cours: {
                label: 'En cours',
                className: 'status-en-cours',
                icon: <Clock3 size={16} />
            },

            terminee: {
                label: 'Terminée',
                className: 'status-terminee',
                icon: <CheckCircle2 size={16} />
            },

            validee: {
                label: 'Validée',
                className: 'status-validee',
                icon: <CheckCircle2 size={16} />
            },

            en_retard: {
                label: 'En retard',
                className: 'status-retard',
                icon: <AlertCircle size={16} />
            }

        };

        return (
            map[status] || {
                label: status || 'Inconnu',
                className: 'status-default',
                icon: <AlertCircle size={16} />
            }
        );
    };

    // ============================================================
    // CHARGEMENT
    // ============================================================

    if (loading) {

        return (

            <div className="loading-state">

                <RefreshCw
                    size={36}
                    className="spin"
                />

                <p>
                    Chargement des détails...
                </p>

            </div>

        );
    }

    // ============================================================
    // INTERVENTION INTROUVABLE
    // ============================================================

    if (!intervention) {

        return (

            <div className="empty-state">

                <AlertCircle size={42} />

                <h3>
                    Intervention introuvable
                </h3>

                <p>
                    Cette intervention n'existe pas
                    ou a été supprimée.
                </p>

                <button
                    onClick={() =>
                        navigate('/my-interventions')
                    }
                    className="btn-primary"
                >
                    <ArrowLeft size={18} />
                    Retour à la liste
                </button>

            </div>
        );
    }

    // ============================================================
    // INFORMATIONS
    // ============================================================

    const statusInfo =
        getStatusBadge(
            intervention.status
        );

    // ============================================================
    // MODIFICATION AUTORISÉE
    // ============================================================

    const isEditable = [
        'en_attente',
        'en_cours'
    ].includes(
        intervention.status
    );

    // ============================================================
    // DÉMARRAGE AUTORISÉ
    //
    // Le backend autorise le démarrage pour :
    // - en_attente
    // - en_retard
    //
    // Le backend vérifie également :
    // - l'utilisateur / groupe affecté
    // - la date et l'heure planifiées
    // ============================================================

    const canStart = [
        'en_attente',
        'en_retard'
    ].includes(
        intervention.status
    );

    // ============================================================
    // RELEVÉ AFFECTÉ
    //
    // IMPORTANT :
    // intervention.template = relevé affecté
    // intervention.readings = mesures réellement saisies
    // ============================================================

    const assignedCanvas =
        intervention.template || null;

    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div className="intervention-detail">

            {/* =====================================================
                HEADER
            ====================================================== */}

            <div className="detail-header">

                <div className="header-left">

                    <button
                        className="back-button"
                        onClick={() =>
                            navigate('/my-interventions')
                        }
                        title="Retour"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div>

                        <div className="page-kicker">
                            DÉTAIL DE L'INTERVENTION
                        </div>

                        <h1>
                            Intervention #{intervention.id}
                        </h1>

                        <div className="header-status">

                            <span
                                className={`status-badge ${statusInfo.className}`}
                            >
                                {statusInfo.icon}
                                {statusInfo.label}
                            </span>

                        </div>

                    </div>

                </div>

                <div className="header-actions">

                    {/* =================================================
                        BOUTON DÉMARRER
                    ================================================== */}

                    {canStart && (

                        <button
                            className="btn-start"
                            onClick={handleStart}
                            disabled={starting}
                        >

                            {starting ? (

                                <>
                                    <RefreshCw
                                        size={17}
                                        className="spin"
                                    />

                                    Démarrage...
                                </>

                            ) : (

                                <>
                                    <Play size={17} />

                                    Démarrer
                                </>

                            )}

                        </button>

                    )}

                    {/* =================================================
                        BOUTON MODIFIER
                    ================================================== */}

                    {isEditable && (

                        <button
                            className="btn-edit"
                            onClick={handleEdit}
                            disabled={starting}
                        >
                            <Edit3 size={17} />
                            Modifier
                        </button>

                    )}

                    {/* =================================================
                        BOUTON ACTUALISER
                    ================================================== */}

                    <button
                        className="btn-refresh"
                        onClick={fetchIntervention}
                        disabled={starting}
                    >
                        <RefreshCw size={17} />
                        Actualiser
                    </button>

                </div>

            </div>

            {/* =====================================================
                RÉSUMÉ RAPIDE
            ====================================================== */}

            <div className="detail-summary">

                <div className="summary-item">

                    <div className="summary-icon">
                        <Wrench size={20} />
                    </div>

                    <div>

                        <span>
                            Équipement
                        </span>

                        <strong>
                            {intervention.equipment?.name ||
                                'Non renseigné'}
                        </strong>

                    </div>

                </div>

                <div className="summary-item">

                    <div className="summary-icon">
                        <CalendarDays size={20} />
                    </div>

                    <div>

                        <span>
                            Date planifiée
                        </span>

                        <strong>
                            {intervention.scheduled_date ||
                                '-'}
                        </strong>

                    </div>

                </div>

                <div className="summary-item">

                    <div className="summary-icon">
                        <Clock3 size={20} />
                    </div>

                    <div>

                        <span>
                            Heure
                        </span>

                        <strong>
                            {intervention.scheduled_time ||
                                '-'}
                        </strong>

                    </div>

                </div>

                <div className="summary-item">

                    <div className="summary-icon">
                        <Users size={20} />
                    </div>

                    <div>

                        <span>
                            Groupe
                        </span>

                        <strong>
                            {intervention.group?.name ||
                                'Non affecté'}
                        </strong>

                    </div>

                </div>

            </div>

            {/* =====================================================
                INFORMATIONS PRINCIPALES
            ====================================================== */}

            <div className="detail-grid">

                {/* Équipement */}

                <div className="detail-card">

                    <div className="card-title">

                        <div className="card-icon">
                            <Wrench size={18} />
                        </div>

                        <h3>
                            Équipement
                        </h3>

                    </div>

                    <div className="card-content">

                        <p className="equipment-name">
                            {intervention.equipment?.name ||
                                'N/A'}
                        </p>

                        <span className="equipment-type">
                            {intervention.equipment?.type ||
                                'Type non renseigné'}
                        </span>

                    </div>

                </div>

                {/* Type & priorité */}

                <div className="detail-card">

                    <div className="card-title">

                        <div className="card-icon">
                            <ClipboardList size={18} />
                        </div>

                        <h3>
                            Type & priorité
                        </h3>

                    </div>

                    <div className="info-list">

                        <div className="info-row">

                            <span>
                                Type
                            </span>

                            <strong>
                                {intervention.type ||
                                    '-'}
                            </strong>

                        </div>

                        <div className="info-row">

                            <span>
                                Priorité
                            </span>

                            <strong>
                                {intervention.priority ||
                                    '-'}
                            </strong>

                        </div>

                    </div>

                </div>

                {/* Planification */}

                <div className="detail-card">

                    <div className="card-title">

                        <div className="card-icon">
                            <CalendarDays size={18} />
                        </div>

                        <h3>
                            Planification
                        </h3>

                    </div>

                    <div className="info-list">

                        <div className="info-row">

                            <span>
                                Date
                            </span>

                            <strong>
                                {intervention.scheduled_date ||
                                    '-'}
                            </strong>

                        </div>

                        <div className="info-row">

                            <span>
                                Heure
                            </span>

                            <strong>
                                {intervention.scheduled_time ||
                                    '-'}
                            </strong>

                        </div>

                        <div className="info-row">

                            <span>
                                Durée
                            </span>

                            <strong>
                                {intervention.duration
                                    ? `${intervention.duration} min`
                                    : '-'}
                            </strong>

                        </div>

                        {intervention.deadline && (

                            <div className="info-row">

                                <span>
                                    Délai
                                </span>

                                <strong>
                                    {intervention.deadline}
                                </strong>

                            </div>

                        )}

                    </div>

                </div>

                {/* Affectation */}

                <div className="detail-card">

                    <div className="card-title">

                        <div className="card-icon">
                            <Users size={18} />
                        </div>

                        <h3>
                            Affectation
                        </h3>

                    </div>

                    <div className="info-list">

                        <div className="info-row">

                            <span>
                                Groupe
                            </span>

                            <strong>
                                {intervention.group?.name ||
                                    'Non affecté'}
                            </strong>

                        </div>

                        <div className="info-row">

                            <span>
                                Intervenant
                            </span>

                            <strong>
                                {intervention.user?.name ||
                                    'Non affecté'}
                            </strong>

                        </div>

                    </div>

                </div>

                {/* Statut */}

                <div className="detail-card status-card">

                    <div className="card-title">

                        <div className="card-icon">
                            <ClipboardList size={18} />
                        </div>

                        <h3>
                            État de l'intervention
                        </h3>

                    </div>

                    <div className="status-display">

                        <span
                            className={`status-badge large ${statusInfo.className}`}
                        >
                            {statusInfo.icon}
                            {statusInfo.label}
                        </span>

                        <p>

                            {intervention.status ===
                                'en_attente' &&
                                "L’intervention est planifiée et attend son exécution."}

                            {intervention.status ===
                                'en_cours' &&
                                "L’intervention est actuellement en cours d’exécution."}

                            {intervention.status ===
                                'terminee' &&
                                "L’intervention est terminée et attend la validation du responsable."}

                            {intervention.status ===
                                'validee' &&
                                "L’intervention a été validée et clôturée."}

                            {intervention.status ===
                                'en_retard' &&
                                "Cette intervention a dépassé le délai prévu."}

                        </p>

                    </div>

                </div>

            </div>

            {/* =====================================================
                DESCRIPTION
            ====================================================== */}

            {intervention.description && (

                <div className="detail-section">

                    <div className="section-header">

                        <div>

                            <span className="section-kicker">
                                INFORMATIONS
                            </span>

                            <h2>
                                Description
                            </h2>

                        </div>

                    </div>

                    <div className="description-box">

                        <p>
                            {intervention.description}
                        </p>

                    </div>

                </div>

            )}

            {/* =====================================================
                RELEVÉ AFFECTÉ
            ====================================================== */}

            <div className="detail-section">

                <div className="section-header">

                    <div>

                        <span className="section-kicker">
                            RELEVÉ
                        </span>

                        <h2>
                            Relevé affecté à l'intervention
                        </h2>

                    </div>

                    <ClipboardList size={22} />

                </div>

                {assignedCanvas ? (

                    <div className="assigned-reading">

                        {/* Nom */}

                        <div className="info-row">

                            <span>
                                Nom du relevé
                            </span>

                            <strong>
                                {assignedCanvas.template_name ||
                                    'Sans nom'}
                            </strong>

                        </div>

                        {/* Type */}

                        <div className="info-row">

                            <span>
                                Type
                            </span>

                            <strong>
                                {assignedCanvas.template_type ||
                                    '-'}
                            </strong>

                        </div>

                        {/* Fréquence */}

                        <div className="info-row">

                            <span>
                                Fréquence
                            </span>

                            <strong>
                                {assignedCanvas.frequency ||
                                    '-'}
                            </strong>

                        </div>

                        {/* Équipement */}

                        <div className="info-row">

                            <span>
                                Équipement
                            </span>

                            <strong>
                                {assignedCanvas.equipment?.name ||
                                    intervention.equipment?.name ||
                                    '-'}
                            </strong>

                        </div>

                        {/* Paramètres */}

                        {Array.isArray(
                            assignedCanvas.parameters
                        ) &&
                        assignedCanvas.parameters.length > 0 && (

                            <div className="reading-parameters">

                                <strong>
                                    Paramètres à relever :
                                </strong>

                                <ul>

                                    {assignedCanvas.parameters.map(
                                        (parameter, index) => (

                                            <li key={index}>

                                                {typeof parameter ===
                                                'string'
                                                    ? parameter
                                                    : parameter?.name ||
                                                      parameter?.label ||
                                                      parameter?.parameter ||
                                                      JSON.stringify(
                                                          parameter
                                                      )}

                                            </li>

                                        )
                                    )}

                                </ul>

                            </div>

                        )}

                        {/* Header du relevé */}

                        {assignedCanvas.header &&
                        typeof assignedCanvas.header ===
                            'object' && (

                            <div className="reading-header-info">

                                <strong>
                                    Informations du relevé :
                                </strong>

                                <pre>
                                    {JSON.stringify(
                                        assignedCanvas.header,
                                        null,
                                        2
                                    )}
                                </pre>

                            </div>

                        )}

                        {/* PDF */}

                        {(intervention.reading_pdf_path ||
                            assignedCanvas.reading_pdf_path) && (

                            <div className="pdf-card">

                                <div className="pdf-info">

                                    <FileText size={24} />

                                    <div>

                                        <strong>
                                            Document de relevé
                                        </strong>

                                        <span>
                                            Document associé à cette intervention
                                        </span>

                                    </div>

                                </div>

                                <div className="pdf-actions">

                                    <button
                                        onClick={downloadPdf}
                                        className="btn-secondary"
                                    >
                                        <Download size={16} />
                                        Télécharger
                                    </button>

                                    <a
                                        href={
                                            intervention.reading_pdf_path ||
                                            assignedCanvas.reading_pdf_path
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary"
                                    >
                                        <FileText size={16} />
                                        Consulter
                                    </a>

                                </div>

                            </div>

                        )}

                    </div>

                ) : (

                    <div className="no-readings">

                        <ClipboardList size={32} />

                        <strong>
                            Aucun relevé affecté
                        </strong>

                        <p>
                            Aucun relevé n'est associé à cette intervention.
                        </p>

                        <small>
                            template_id :
                            {' '}
                            {intervention.template_id ||
                                'null'}
                        </small>

                    </div>

                )}

            </div>

            {/* =====================================================
                RELEVÉS / MESURES SAISIS
            ====================================================== */}

            <div className="detail-section">

                <div className="section-header">

                    <div>

                        <span className="section-kicker">
                            MESURES
                        </span>

                        <h2>
                            Relevés de l'intervention
                        </h2>

                    </div>

                    <span className="reading-count">

                        {readings.length}

                        {' '}

                        relevé
                        {readings.length > 1
                            ? 's'
                            : ''}

                    </span>

                </div>

                {readings.length > 0 ? (

                    <div className="readings-table-wrapper">

                        <table className="readings-table">

                            <thead>

                                <tr>

                                    <th>
                                        Paramètre
                                    </th>

                                    <th>
                                        Valeur attendue
                                    </th>

                                    <th>
                                        Valeur mesurée
                                    </th>

                                    <th>
                                        Statut
                                    </th>

                                    <th>
                                        Commentaire
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {readings.map(
                                    (reading, index) => (

                                        <tr
                                            key={
                                                reading.id ||
                                                index
                                            }
                                        >

                                            <td>

                                                <strong>
                                                    {reading.parameter ||
                                                        '-'}
                                                </strong>

                                            </td>

                                            <td>
                                                {reading.expected_value ||
                                                    '-'}
                                            </td>

                                            <td>
                                                {reading.measured_value ||
                                                    '-'}
                                            </td>

                                            <td>

                                                <span
                                                    className={`reading-status ${reading.status || ''}`}
                                                >

                                                    {reading.status ===
                                                        'normal' &&
                                                        '✓ Normal'}

                                                    {reading.status ===
                                                        'attention' &&
                                                        '⚠ Attention'}

                                                    {reading.status ===
                                                        'alerte' &&
                                                        '● Alerte'}

                                                    {![
                                                        'normal',
                                                        'attention',
                                                        'alerte'
                                                    ].includes(
                                                        reading.status
                                                    ) &&
                                                        (
                                                            reading.status ||
                                                            '-'
                                                        )}

                                                </span>

                                            </td>

                                            <td>

                                                {reading.comment ||
                                                    '-'}

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                ) : (

                    <div className="no-readings">

                        <ClipboardList size={32} />

                        <strong>
                            Aucun relevé disponible
                        </strong>

                        <p>
                            Aucune mesure n'a encore été
                            enregistrée pour cette intervention.
                        </p>

                        {assignedCanvas && (

                            <small>

                                Le relevé «{' '}

                                {assignedCanvas.template_name ||
                                    'Sans nom'}

                                {' '}» est bien affecté.

                                Les mesures apparaîtront ici
                                après leur saisie.

                            </small>

                        )}

                    </div>

                )}

            </div>

            {/* =====================================================
                INFORMATIONS SYSTÈME
            ====================================================== */}

            <div className="detail-section">

                <div className="section-header">

                    <div>

                        <span className="section-kicker">
                            SYSTÈME
                        </span>

                        <h2>
                            Informations système
                        </h2>

                    </div>

                </div>

                <div className="detail-grid">

                    <div className="detail-card">

                        <div className="info-list">

                            <div className="info-row">

                                <span>
                                    Créée le
                                </span>

                                <strong>
                                    {intervention.created_at
                                        ? new Date(
                                            intervention.created_at
                                        ).toLocaleString(
                                            'fr-FR'
                                        )
                                        : '-'}
                                </strong>

                            </div>

                            {intervention.started_at && (

                                <div className="info-row">

                                    <span>
                                        Début
                                    </span>

                                    <strong>
                                        {new Date(
                                            intervention.started_at
                                        ).toLocaleString(
                                            'fr-FR'
                                        )}
                                    </strong>

                                </div>

                            )}

                            {intervention.completed_at && (

                                <div className="info-row">

                                    <span>
                                        Fin
                                    </span>

                                    <strong>
                                        {new Date(
                                            intervention.completed_at
                                        ).toLocaleString(
                                            'fr-FR'
                                        )}
                                    </strong>

                                </div>

                            )}

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default InterventionDetail;