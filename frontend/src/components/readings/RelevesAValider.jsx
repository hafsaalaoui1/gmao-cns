import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import {
    ClipboardCheck,
    CheckCircle,
    XCircle,
    Eye,
    RefreshCw,
    MessageSquare,
    User,
    Calendar,
    Wrench,
    Clock,
    Loader2
} from 'lucide-react';
import ValidateReadingModal from './ValidateReadingModal';
import './RelevesAValider.css';

/* ==========================================================================
   HELPERS & CONFIG
   ========================================================================== */

const STATUS_CONFIG = {
    en_attente: {
        colorClass: 'status-pending',
        label: 'En attente',
        icon: Clock
    },
    valide: {
        colorClass: 'status-valid',
        label: 'Validé',
        icon: CheckCircle
    },
    rejete: {
        colorClass: 'status-rejected',
        label: 'Rejeté',
        icon: XCircle
    },
    modifications_demandees: {
        colorClass: 'status-changes',
        label: 'Modifications demandées',
        icon: MessageSquare
    }
};

const formatDate = (date) => {
    if (!date) return '—';

    try {
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return '—';
    }
};

/* ==========================================================================
   NORMALISATION DES VALUES
   ========================================================================== */

const normalizeValues = (rawValues) => {
    let values = rawValues;

    if (typeof values === 'string') {
        try {
            values = JSON.parse(values);
        } catch (error) {
            console.error('Erreur parsing reading.values :', error);
            return {};
        }
    }

    if (Array.isArray(values)) {
        const objectValues = {};

        values.forEach((value, index) => {
            objectValues[index] = value;
        });

        return objectValues;
    }

    if (values && typeof values === 'object') {
        return values;
    }

    return {};
};

/* ==========================================================================
   READING CARD
   ========================================================================== */

const ReadingCard = ({ reading, onView }) => {
    const statusInfo =
        STATUS_CONFIG[reading?.validation_status] ||
        STATUS_CONFIG[reading?.status] ||
        STATUS_CONFIG.en_attente;

    const StatusIcon = statusInfo.icon;

    const values = normalizeValues(reading?.values);
    const valuesEntries = Object.entries(values);

    const visibleValues = valuesEntries.slice(0, 6);
    const extraCount = Math.max(valuesEntries.length - 6, 0);

    const intervenantName =
        reading?.takenBy?.name ||
        reading?.takenBy?.full_name ||
        reading?.taken_by?.name ||
        reading?.taken_by?.full_name ||
        (typeof reading?.taken_by === 'string'
            ? reading.taken_by
            : null) ||
        'Intervenant inconnu';

    const equipmentName =
        reading?.equipment?.name ||
        reading?.equipment?.nom ||
        'Équipement non spécifié';

    const templateName =
        reading?.template?.template_name ||
        reading?.template?.name ||
        reading?.template?.title;

    return (
        <div className="releve-card">
            <div className="releve-header">
                <div className="releve-info">
                    <div className="equipment-tag">
                        <Wrench size={15} />

                        <span className="releve-equipment">
                            {equipmentName}
                        </span>
                    </div>

                    {templateName && (
                        <span className="releve-type">
                            {templateName}
                        </span>
                    )}
                </div>

                <span
                    className={`releve-status ${statusInfo.colorClass}`}
                >
                    <StatusIcon size={14} />
                    {statusInfo.label}
                </span>
            </div>

            <div className="releve-body">
                <div className="releve-meta">
                    <span className="meta-item">
                        <User size={14} />
                        {intervenantName}
                    </span>

                    <span className="meta-item">
                        <Calendar size={14} />

                        {formatDate(
                            reading?.taken_at ||
                            reading?.created_at
                        )}
                    </span>
                </div>

                <div className="releve-values">
                    {visibleValues.length > 0 ? (
                        visibleValues.map(([key, value]) => (
                            <div
                                key={key}
                                className="releve-value-item"
                            >
                                <span
                                    className="value-label"
                                    title={key}
                                >
                                    {key}
                                </span>

                                <strong className="value-number">
                                    {value === null ||
                                    value === undefined ||
                                    value === ''
                                        ? '—'
                                        : String(value)}
                                </strong>
                            </div>
                        ))
                    ) : (
                        <p className="no-values-text">
                            Aucune valeur renseignée
                        </p>
                    )}

                    {extraCount > 0 && (
                        <div className="releve-value-item value-more-badge">
                            <span>
                                +{extraCount} autres
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="releve-actions">
                <button
                    type="button"
                    className="btn-view-releve"
                    onClick={() => onView(reading)}
                >
                    <Eye size={16} />
                    Consulter
                </button>
            </div>
        </div>
    );
};

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

const RelevesAValider = () => {
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedReading, setSelectedReading] = useState(null);
    const [showModal, setShowModal] = useState(false);

    /* ======================================================================
       CHARGEMENT
       ====================================================================== */

    const loadReadings = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const response = await api.get(
                '/readings/to-validate'
            );

            console.log(
                '========== TO VALIDATE =========='
            );

            console.log(
                'Réponse complète :',
                response.data
            );

            const responseData = response.data;

            const data = Array.isArray(responseData)
                ? responseData
                : Array.isArray(responseData?.data)
                    ? responseData.data
                    : [];

            console.log(
                'Nombre de relevés :',
                data.length
            );

            if (data.length > 0) {
                const firstReading = data[0];

                console.log(
                    '========== PREMIER RELEVÉ =========='
                );

                console.log(
                    'Reading :',
                    firstReading
                );

                console.log(
                    'VALUES :',
                    firstReading?.values
                );

                console.log(
                    'TEMPLATE :',
                    firstReading?.template
                );

                console.log(
                    'PARAMETERS :',
                    firstReading?.template?.parameters
                );

                console.log(
                    'VALUE KEYS :',
                    Object.keys(
                        normalizeValues(
                            firstReading?.values
                        )
                    )
                );
            }

            setReadings(data);
        } catch (error) {
            console.error(
                'Erreur chargement relevés à valider :',
                error
            );

            console.error(
                'Réponse serveur :',
                error?.response?.data
            );

            toast.error(
                error?.response?.data?.message ||
                'Erreur lors du chargement des relevés'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    /* ======================================================================
       INITIALISATION
       ====================================================================== */

    useEffect(() => {
        loadReadings();
    }, [loadReadings]);

    /* ======================================================================
       MODAL
       ====================================================================== */

    const handleOpenModal = (reading) => {
        setSelectedReading(reading);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedReading(null);
    };

    const handleSuccessModal = async () => {
        handleCloseModal();

        await loadReadings(true);
    };

    /* ======================================================================
       LOADING
       ====================================================================== */

    if (loading) {
        return (
            <div className="releves-validator">
                <div className="loading-state">
                    <Loader2
                        size={32}
                        className="spin"
                    />

                    <p>
                        Chargement des relevés à valider...
                    </p>
                </div>
            </div>
        );
    }

    /* ======================================================================
       AFFICHAGE
       ====================================================================== */

    return (
        <div className="releves-validator">
            <header className="page-header">
                <div>
                    <h1 className="page-title">
                        <ClipboardCheck
                            size={26}
                            className="title-icon"
                        />

                        Relevés à valider
                    </h1>

                    <p className="page-subtitle">
                        {readings.length === 0
                            ? 'Aucun relevé en attente de traitement'
                            : `${readings.length} relevé(s) nécessite(nt) votre validation`}
                    </p>
                </div>

                <button
                    type="button"
                    className="btn-refresh"
                    onClick={() => loadReadings(true)}
                    disabled={refreshing}
                >
                    <RefreshCw
                        size={18}
                        className={
                            refreshing ? 'spin' : ''
                        }
                    />

                    <span>
                        {refreshing
                            ? 'Actualisation...'
                            : 'Actualiser'}
                    </span>
                </button>
            </header>

            {readings.length === 0 ? (
                <div className="empty-state-card">
                    <div className="empty-icon-wrapper">
                        <ClipboardCheck size={48} />
                    </div>

                    <h3>
                        Tout est à jour !
                    </h3>

                    <p>
                        Tous les relevés ont été validés ou
                        traités.
                    </p>
                </div>
            ) : (
                <div className="releves-grid">
                    {readings.map((reading) => (
                        <ReadingCard
                            key={reading.id}
                            reading={reading}
                            onView={handleOpenModal}
                        />
                    ))}
                </div>
            )}

            {showModal && selectedReading && (
                <ValidateReadingModal
                    reading={selectedReading}
                    onClose={handleCloseModal}
                    onSuccess={handleSuccessModal}
                />
            )}
        </div>
    );
};

export default RelevesAValider;