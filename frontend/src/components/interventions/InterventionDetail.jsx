import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    ArrowLeft,
    Calendar,
    Clock,
    ClipboardList,
    FileText,
    Loader2,
    RefreshCw,
    Wrench,
    CheckCircle2,
    AlertCircle,
    PlayCircle,
    Eye,
    Save,
    MessageSquare,
    X,
    ExternalLink,
    Info,
    History,
    RotateCcw,
    User,
    ShieldAlert,
    Building2,
    Sliders,
    ChevronRight,
    Activity,
    Download
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './InterventionDetail.css';

/* ============================================================
   HELPERS
============================================================ */

const normalizeReadingValues = (values) => {
    if (!values) return {};

    if (typeof values === 'string') {
        try {
            return JSON.parse(values);
        } catch {
            return {};
        }
    }

    if (typeof values === 'object') {
        return values;
    }

    return {};
};

const isMeaningfulValue = (value) => {
    if (value === null || value === undefined) return false;

    if (typeof value === 'string') {
        return value.trim() !== '';
    }

    return true;
};

const readingHasValues = (reading) => {
    if (!reading) return false;

    const values = normalizeReadingValues(
        reading.values ?? reading.reading_values
    );

    if (
        values &&
        typeof values === 'object' &&
        Object.keys(values).length > 0
    ) {
        return Object.values(values).some(isMeaningfulValue);
    }

    return false;
};

const getReadingTime = (reading) => {
    return (
        reading?.reading_date ||
        reading?.measured_at ||
        reading?.created_at ||
        reading?.updated_at ||
        null
    );
};

const normalizeKey = (value) => {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
};

const normalizeStatus = (value) => {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/-/g, '_');
};

const findValueByKeys = (values, keys = []) => {
    if (!values || typeof values !== 'object') {
        return undefined;
    }

    const normalizedEntries = Object.entries(values).map(
        ([key, value]) => [normalizeKey(key), value]
    );

    for (const key of keys) {
        const normalizedTarget = normalizeKey(key);

        const exact = normalizedEntries.find(
            ([normalizedKey]) => normalizedKey === normalizedTarget
        );

        if (exact) {
            return exact[1];
        }
    }

    return undefined;
};

const getParameterReadingValue = (values, parameter) => {
    if (!parameter) return undefined;

    const parameterId = parameter.id ?? parameter.parameter_id;
    const parameterName =
        parameter.name ??
        parameter.label ??
        parameter.parameter_name ??
        '';

    const keys = [
        parameterId,
        String(parameterId ?? ''),
        parameterName,
        normalizeKey(parameterName),
        `parameter_${parameterId}`,
        `param_${parameterId}`,
        `value_${parameterId}`
    ].filter(Boolean);

    return findValueByKeys(values, keys);
};

const buildFormValuesFromReading = (reading) => {
    if (!reading) return {};

    return normalizeReadingValues(
        reading.values ??
        reading.reading_values ??
        reading.data ??
        {}
    );
};

const buildReadingFormFromReading = (reading) => {
    if (!reading) {
        return {
            values: {},
            observation: '',
            annexes: []
        };
    }

    let annexes = reading.annexes ?? [];

    if (typeof annexes === 'string') {
        try {
            annexes = JSON.parse(annexes);
        } catch {
            annexes = [];
        }
    }

    if (!Array.isArray(annexes)) {
        annexes = [];
    }

    return {
        values: buildFormValuesFromReading(reading),
        observation:
            reading.observation ??
            reading.observations ??
            '',
        annexes
    };
};

const formatDate = (date) => {
    if (!date) return '—';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return '—';
    }

    return parsed.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const formatDateTime = (date) => {
    if (!date) return '—';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return '—';
    }

    return parsed.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getStatusConfig = (status) => {
    const normalized = normalizeStatus(status);

    const configs = {
        en_attente: {
            label: 'En attente',
            className: 'status-pending',
            icon: Clock
        },

        planifiee: {
            label: 'Planifiée',
            className: 'status-pending',
            icon: Calendar
        },

        en_retard: {
            label: 'En retard',
            className: 'status-late',
            icon: AlertCircle
        },

        en_cours: {
            label: 'En cours',
            className: 'status-progress',
            icon: PlayCircle
        },

        terminee: {
            label: 'Terminée',
            className: 'status-completed',
            icon: CheckCircle2
        },

        validee: {
            label: 'Validée',
            className: 'status-validated',
            icon: CheckCircle2
        },

        annulee: {
            label: 'Annulée',
            className: 'status-cancelled',
            icon: X
        }
    };

    return (
        configs[normalized] || {
            label: status || 'Inconnu',
            className: 'status-default',
            icon: Info
        }
    );
};

const getPriorityConfig = (priority) => {
    const normalized = normalizeStatus(priority);

    const configs = {
        basse: {
            label: 'Basse',
            className: 'priority-low'
        },

        faible: {
            label: 'Faible',
            className: 'priority-low'
        },

        moyenne: {
            label: 'Moyenne',
            className: 'priority-medium'
        },

        normale: {
            label: 'Normale',
            className: 'priority-medium'
        },

        haute: {
            label: 'Haute',
            className: 'priority-high'
        },

        urgente: {
            label: 'Urgente',
            className: 'priority-critical'
        },

        critique: {
            label: 'Critique',
            className: 'priority-critical'
        }
    };

    return (
        configs[normalized] || {
            label: priority || '—',
            className: 'priority-default'
        }
    );
};

/* ============================================================
   HOOK - DONNÉES INTERVENTION
============================================================ */

const useInterventionData = (id) => {
    const [intervention, setIntervention] = useState(null);
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchIntervention = useCallback(
        async (silent = false) => {
            if (!id) return;

            try {
                if (silent) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                const [interventionResponse, readingsResponse] =
                    await Promise.all([
                        api.get(`/interventions/${id}`),
                        api.get(`/interventions/${id}/readings`)
                    ]);

                setIntervention(
                    interventionResponse.data?.data ??
                    interventionResponse.data
                );

                const readingsData =
                    readingsResponse.data?.data ??
                    readingsResponse.data ??
                    [];

                setReadings(
                    Array.isArray(readingsData)
                        ? readingsData
                        : []
                );
            } catch (error) {
                console.error(
                    'Erreur chargement intervention :',
                    error
                );

                toast.error(
                    error.response?.data?.message ||
                    'Impossible de charger l’intervention'
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [id]
    );

    useEffect(() => {
        fetchIntervention();
    }, [fetchIntervention]);

    return {
        intervention,
        readings,
        loading,
        refreshing,
        fetchIntervention
    };
};

/* ============================================================
   MODAL RELEVÉ
============================================================ */

const ReadingModal = ({
    isOpen,
    onClose,
    intervention,
    reading,
    form,
    setForm,
    parameters,
    readOnly = false,
    correctionMode = false,
    saving = false,
    onSave
}) => {
    const [exporting, setExporting] = useState(false);

    if (!isOpen) return null;

    const values = form?.values ?? {};

    const validationStatus = normalizeStatus(
        reading?.validation_status
    );

    const validationLabels = {
        valide: 'Validé',
        rejete: 'Rejeté',
        modifications_demandees:
            'Modifications demandées'
    };

    const exportExcel = () => {
        try {
            setExporting(true);

            const rows = parameters.map((parameter) => ({
                Paramètre:
                    parameter.name ||
                    parameter.label ||
                    `Paramètre ${parameter.id}`,

                Unité:
                    parameter.unit ||
                    parameter.unity ||
                    '—',

                Valeur:
                    getParameterReadingValue(
                        values,
                        parameter
                    ) ?? '—'
            }));

            if (form?.observation) {
                rows.push({
                    Paramètre: 'Observations',
                    Unité: '',
                    Valeur: form.observation
                });
            }

            const worksheet =
                XLSX.utils.json_to_sheet(rows);

            const workbook =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                'Relevé'
            );

            XLSX.writeFile(
                workbook,
                `releve-intervention-${intervention?.id ?? 'export'}.xlsx`
            );

            toast.success('Relevé exporté avec succès');
        } catch (error) {
            console.error(error);
            toast.error('Erreur lors de l’export Excel');
        } finally {
            setExporting(false);
        }
    };

    const updateValue = (parameter, value) => {
        if (readOnly) return;

        const parameterId = parameter.id;

        setForm((previous) => ({
            ...previous,
            values: {
                ...(previous.values ?? {}),
                [parameterId]: value
            }
        }));
    };

    const updateObservation = (value) => {
        if (readOnly) return;

        setForm((previous) => ({
            ...previous,
            observation: value
        }));
    };

    return (
        <div className="reading-modal-overlay">
            <div className="reading-modal">
                <div className="reading-modal-header">
                    <div>
                        <div className="reading-modal-title">
                            <ClipboardList size={20} />
                            <span>
                                {readOnly
                                    ? 'Consultation du relevé'
                                    : correctionMode
                                        ? 'Modification du relevé'
                                        : 'Saisie du relevé'}
                            </span>
                        </div>

                        <div className="reading-modal-subtitle">
                            Intervention #{intervention?.id}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="reading-modal-body">
                    {reading && (
                        <div className="reading-validation-banner">
                            <Info size={18} />

                            <div>
                                <strong>
                                    État du relevé
                                </strong>

                                <span>
                                    {validationLabels[
                                        validationStatus
                                    ] ||
                                        reading.validation_status ||
                                        'Non validé'}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="reading-info-grid">
                        <div className="reading-info-item">
                            <span>Intervention</span>
                            <strong>
                                #{intervention?.id ?? '—'}
                            </strong>
                        </div>

                        <div className="reading-info-item">
                            <span>Équipement</span>
                            <strong>
                                {intervention?.equipment?.name ||
                                    intervention?.equipment_name ||
                                    '—'}
                            </strong>
                        </div>

                        <div className="reading-info-item">
                            <span>Date</span>
                            <strong>
                                {formatDateTime(
                                    getReadingTime(reading)
                                )}
                            </strong>
                        </div>
                    </div>

                    <div className="reading-section">
                        <div className="reading-section-header">
                            <div>
                                <h3>
                                    <Sliders size={18} />
                                    Paramètres
                                </h3>

                                <p>
                                    Valeurs relevées sur
                                    l’équipement
                                </p>
                            </div>
                        </div>

                        <div className="reading-parameters">
                            {parameters.length === 0 ? (
                                <div className="empty-state">
                                    Aucun paramètre défini
                                    pour ce relevé.
                                </div>
                            ) : (
                                parameters.map(
                                    (parameter, index) => {
                                        const value =
                                            getParameterReadingValue(
                                                values,
                                                parameter
                                            );

                                        const monitors =
                                            Array.isArray(
                                                parameter.monitors
                                            )
                                                ? parameter.monitors
                                                : [];

                                        return (
                                            <div
                                                className="reading-parameter-card"
                                                key={
                                                    parameter.id ??
                                                    index
                                                }
                                            >
                                                <div className="parameter-header">
                                                    <div>
                                                        <strong>
                                                            {parameter.name ||
                                                                parameter.label ||
                                                                `Paramètre ${index + 1}`}
                                                        </strong>

                                                        {parameter.unit && (
                                                            <span>
                                                                {
                                                                    parameter.unit
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="parameter-input-row">
                                                    <input
                                                        type="text"
                                                        value={
                                                            value ??
                                                            ''
                                                        }
                                                        disabled={
                                                            readOnly
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateValue(
                                                                parameter,
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        placeholder={
                                                            readOnly
                                                                ? 'Aucune valeur'
                                                                : 'Entrer la valeur'
                                                        }
                                                    />

                                                    {parameter.unit && (
                                                        <span className="input-unit">
                                                            {
                                                                parameter.unit
                                                            }
                                                        </span>
                                                    )}
                                                </div>

                                                {(parameter.normal_min !==
                                                    undefined ||
                                                    parameter.normal_max !==
                                                        undefined ||
                                                    parameter.tolerance !==
                                                        undefined) && (
                                                    <div className="parameter-range">
                                                        {parameter.normal_min !==
                                                            undefined &&
                                                            parameter.normal_max !==
                                                                undefined && (
                                                                <span>
                                                                    Plage normale :
                                                                    {' '}
                                                                    {
                                                                        parameter.normal_min
                                                                    }
                                                                    {' '}
                                                                    –
                                                                    {' '}
                                                                    {
                                                                        parameter.normal_max
                                                                    }
                                                                </span>
                                                            )}

                                                        {parameter.tolerance !==
                                                            undefined && (
                                                            <span>
                                                                Tolérance :
                                                                {' '}
                                                                {
                                                                    parameter.tolerance
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {monitors.length > 0 && (
                                                    <div className="parameter-monitors">
                                                        <span>
                                                            Moniteurs :
                                                        </span>

                                                        {monitors.map(
                                                            (
                                                                monitor,
                                                                monitorIndex
                                                            ) => (
                                                                <span
                                                                    key={
                                                                        monitorIndex
                                                                    }
                                                                    className="monitor-badge"
                                                                >
                                                                    {typeof monitor ===
                                                                    'object'
                                                                        ? monitor.name ||
                                                                          monitor.label ||
                                                                          `Moniteur ${monitorIndex + 1}`
                                                                        : monitor}
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                )
                            )}
                        </div>
                    </div>

                    <div className="reading-section">
                        <div className="reading-section-header">
                            <div>
                                <h3>
                                    <MessageSquare size={18} />
                                    Observations
                                </h3>
                            </div>
                        </div>

                        <textarea
                            value={form?.observation ?? ''}
                            disabled={readOnly}
                            onChange={(event) =>
                                updateObservation(
                                    event.target.value
                                )
                            }
                            placeholder={
                                readOnly
                                    ? 'Aucune observation'
                                    : 'Ajouter une observation...'
                            }
                            rows={5}
                        />
                    </div>
                </div>

                <div className="reading-modal-footer">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onClose}
                    >
                        <X size={17} />
                        Fermer
                    </button>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={exportExcel}
                        disabled={exporting}
                    >
                        {exporting ? (
                            <Loader2
                                size={17}
                                className="spin"
                            />
                        ) : (
                            <Download size={17} />
                        )}

                        Exporter Excel
                    </button>

                    {!readOnly && (
                        <button
                            type="button"
                            className="primary-button"
                            onClick={onSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <Loader2
                                    size={17}
                                    className="spin"
                                />
                            ) : (
                                <Save size={17} />
                            )}

                            {correctionMode
                                ? 'Enregistrer les modifications'
                                : 'Enregistrer le relevé'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ============================================================
   COMPOSANT PRINCIPAL
============================================================ */

const InterventionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    /*
     * ========================================================
     * AUTHENTIFICATION / RÔLE
     * ========================================================
     *
     * Seul l'Intervenant/ATSEP peut :
     * - démarrer une intervention
     * - saisir un relevé
     * - modifier un relevé
     * - finaliser une intervention
     *
     * Responsable/Admin :
     * - consultation
     * - validation via leurs écrans dédiés
     * - autres opérations autorisées par leur rôle
     */

    const {
        user,
        isIntervenant
    } = useAuth();

    const {
        intervention,
        readings,
        loading,
        refreshing,
        fetchIntervention
    } = useInterventionData(id);

    const [activeTab, setActiveTab] = useState('general');

    const [
        isReadingModalOpen,
        setIsReadingModalOpen
    ] = useState(false);

    const [
        savingReading,
        setSavingReading
    ] = useState(false);

    const [
        startingIntervention,
        setStartingIntervention
    ] = useState(false);

    const [
        completingIntervention,
        setCompletingIntervention
    ] = useState(false);

    const [
        correctionMode,
        setCorrectionMode
    ] = useState(false);

    const [
        readOnlyReading,
        setReadOnlyReading
    ] = useState(false);

    const [
        selectedReading,
        setSelectedReading
    ] = useState(null);

    const [
        readingForm,
        setReadingForm
    ] = useState({
        values: {},
        observation: '',
        annexes: []
    });

    /* ========================================================
       DONNÉES DU TEMPLATE
    ======================================================== */

    const assignedCanvas =
        intervention?.template || null;

    const normalizedParameters = useMemo(() => {
        if (!assignedCanvas) return [];

        let parameters =
            assignedCanvas.parameters ??
            assignedCanvas.reading_parameters ??
            assignedCanvas.fields ??
            [];

        if (typeof parameters === 'string') {
            try {
                parameters = JSON.parse(parameters);
            } catch {
                parameters = [];
            }
        }

        if (!Array.isArray(parameters)) {
            return [];
        }

        return parameters.map((parameter, index) => ({
            ...parameter,

            id:
                parameter.id ??
                parameter.parameter_id ??
                parameter.key ??
                index,

            name:
                parameter.name ??
                parameter.label ??
                parameter.parameter_name ??
                `Paramètre ${index + 1}`,

            unit:
                parameter.unit ??
                parameter.unity ??
                '',

            monitors:
                Array.isArray(parameter.monitors)
                    ? parameter.monitors
                    : [],

            tolerance:
                parameter.tolerance ??
                parameter.allowed_tolerance ??
                undefined,

            normal_min:
                parameter.normal_min ??
                parameter.min ??
                undefined,

            normal_max:
                parameter.normal_max ??
                parameter.max ??
                undefined
        }));
    }, [assignedCanvas]);

    const monitorCount = useMemo(() => {
        return normalizedParameters.reduce(
            (maximum, parameter) =>
                Math.max(
                    maximum,
                    Array.isArray(parameter.monitors)
                        ? parameter.monitors.length
                        : 0
                ),
            0
        );
    }, [normalizedParameters]);

    /* ========================================================
       RELEVÉS VISIBLES
    ======================================================== */

    const visibleReadings = useMemo(() => {
        return readings.filter((reading) => {
            return readingHasValues(reading) ||
                reading.observation ||
                reading.observations ||
                reading.validation_status;
        });
    }, [readings]);

    const latestReading = useMemo(() => {
        if (visibleReadings.length === 0) {
            return null;
        }

        return [...visibleReadings].sort((a, b) => {
            const dateA = new Date(
                getReadingTime(a) || 0
            ).getTime();

            const dateB = new Date(
                getReadingTime(b) || 0
            ).getTime();

            return dateB - dateA;
        })[0];
    }, [visibleReadings]);

    /* ========================================================
       STATUT
    ======================================================== */

    const rawStatus = intervention?.status;

    /*
     * Le backend peut envoyer display_state = en_retard
     * alors que status reste en_attente.
     *
     * On privilégie donc display_state lorsqu'il existe.
     */
    const effectiveStatus =
        intervention?.display_state ||
        rawStatus;

    const currentStatus =
        normalizeStatus(effectiveStatus);

    const statusConfig =
        getStatusConfig(currentStatus);

    const StatusIcon =
        statusConfig.icon;

    const priorityConfig =
        getPriorityConfig(
            intervention?.priority
        );

    const isPending = [
        'en_attente',
        'planifiee',
        'en_retard'
    ].includes(currentStatus);

    const isInProgress =
        currentStatus === 'en_cours';

    const latestReadingStatus =
        normalizeStatus(
            latestReading?.validation_status
        );

    const canCorrectReading =
        !!latestReading &&
        [
            'rejete',
            'rejetee',
            'modifications_demandees',
            'valide'
        ].includes(latestReadingStatus);

    /* ========================================================
       AUTORISATIONS FRONTEND
    ======================================================== */

    const canStartIntervention =
        Boolean(isIntervenant) &&
        isPending;

    const canEnterReading =
        Boolean(isIntervenant) &&
        isInProgress &&
        Boolean(assignedCanvas);

    const canEditReading =
        Boolean(isIntervenant) &&
        canCorrectReading;

    const canCompleteIntervention =
        Boolean(isIntervenant) &&
        isInProgress;

    /* ========================================================
       OUVRIR NOUVEAU RELEVÉ
    ======================================================== */

    const openNewReading = () => {
        if (!isIntervenant) {
            toast.error(
                'Seul un Intervenant/ATSEP peut saisir un relevé.'
            );
            return;
        }

        if (!isInProgress) {
            toast.error(
                'L’intervention doit être en cours.'
            );
            return;
        }

        if (!assignedCanvas) {
            toast.error(
                'Aucun formulaire de relevé n’est associé à cette intervention.'
            );
            return;
        }

        setSelectedReading(null);

        setReadingForm({
            values: {},
            observation: '',
            annexes: []
        });

        setCorrectionMode(false);
        setReadOnlyReading(false);
        setIsReadingModalOpen(true);
    };

    /* ========================================================
       MODIFIER RELEVÉ
    ======================================================== */

    const openCorrectionReading = () => {
        if (!isIntervenant) {
            toast.error(
                'Seul un Intervenant/ATSEP peut modifier un relevé.'
            );
            return;
        }

        if (!latestReading) {
            toast.error(
                'Aucun relevé disponible.'
            );
            return;
        }

        setSelectedReading(latestReading);

        setReadingForm(
            buildReadingFormFromReading(
                latestReading
            )
        );

        setCorrectionMode(true);
        setReadOnlyReading(false);
        setIsReadingModalOpen(true);
    };

    /* ========================================================
       CONSULTER RELEVÉ
    ======================================================== */

    const openReadingReadOnly = (reading) => {
        setSelectedReading(reading);

        setReadingForm(
            buildReadingFormFromReading(
                reading
            )
        );

        setCorrectionMode(false);
        setReadOnlyReading(true);
        setIsReadingModalOpen(true);
    };

    /* ========================================================
       DÉMARRER INTERVENTION
    ======================================================== */

    const handleStartIntervention = async () => {
        if (!isIntervenant) {
            toast.error(
                'Seul un Intervenant/ATSEP peut démarrer une intervention.'
            );
            return;
        }

        if (!isPending) {
            toast.error(
                'Cette intervention ne peut pas être démarrée dans son état actuel.'
            );
            return;
        }

        try {
            setStartingIntervention(true);

            await api.post(
                `/interventions/${id}/start`
            );

            toast.success(
                'Intervention démarrée avec succès.'
            );

            await fetchIntervention(true);
        } catch (error) {
            console.error(
                'Erreur démarrage intervention :',
                error
            );

            toast.error(
                error.response?.data?.message ||
                'Impossible de démarrer l’intervention.'
            );
        } finally {
            setStartingIntervention(false);
        }
    };

    /* ========================================================
       ENREGISTRER RELEVÉ
    ======================================================== */

    const handleSaveReading = async () => {
        if (!isIntervenant) {
            toast.error(
                'Seul un Intervenant/ATSEP peut enregistrer un relevé.'
            );
            return;
        }

        if (!isInProgress) {
            toast.error(
                'L’intervention doit être en cours pour saisir un relevé.'
            );
            return;
        }

        try {
            setSavingReading(true);

            const payload = {
                values:
                    readingForm.values ?? {},

                observation:
                    readingForm.observation ?? '',

                annexes:
                    readingForm.annexes ?? []
            };

            /*
             * En correction, on met à jour le relevé existant
             * si l'API le permet.
             *
             * Sinon, on crée un nouveau relevé.
             */
            if (
                correctionMode &&
                selectedReading?.id
            ) {
                await api.put(
                    `/interventions/${id}/readings/${selectedReading.id}`,
                    payload
                );
            } else {
                await api.post(
                    `/interventions/${id}/readings`,
                    payload
                );
            }

            toast.success(
                correctionMode
                    ? 'Relevé modifié avec succès.'
                    : 'Relevé enregistré avec succès.'
            );

            setIsReadingModalOpen(false);
            setSelectedReading(null);
            setCorrectionMode(false);
            setReadOnlyReading(false);

            setReadingForm({
                values: {},
                observation: '',
                annexes: []
            });

            await fetchIntervention(true);
        } catch (error) {
            console.error(
                'Erreur sauvegarde relevé :',
                error
            );

            toast.error(
                error.response?.data?.message ||
                'Impossible d’enregistrer le relevé.'
            );
        } finally {
            setSavingReading(false);
        }
    };

    /* ========================================================
       FINALISER INTERVENTION
    ======================================================== */

    const handleCompleteIntervention = async () => {
        if (!isIntervenant) {
            toast.error(
                'Seul un Intervenant/ATSEP peut finaliser une intervention.'
            );
            return;
        }

        if (!isInProgress) {
            toast.error(
                'Cette intervention n’est pas en cours.'
            );
            return;
        }

        const confirmed = window.confirm(
            'Voulez-vous vraiment finaliser cette intervention ?'
        );

        if (!confirmed) {
            return;
        }

        try {
            setCompletingIntervention(true);

            await api.post(
                `/interventions/${id}/complete`
            );

            toast.success(
                'Intervention finalisée avec succès.'
            );

            await fetchIntervention(true);
        } catch (error) {
            console.error(
                'Erreur finalisation intervention :',
                error
            );

            toast.error(
                error.response?.data?.message ||
                'Impossible de finaliser l’intervention.'
            );
        } finally {
            setCompletingIntervention(false);
        }
    };

    /* ========================================================
       EXPORT RELEVÉ
    ======================================================== */

    const exportReadingExcel = (reading) => {
        try {
            const values =
                buildFormValuesFromReading(
                    reading
                );

            const rows =
                normalizedParameters.map(
                    (parameter) => ({
                        Paramètre:
                            parameter.name,

                        Unité:
                            parameter.unit ||
                            '—',

                        Valeur:
                            getParameterReadingValue(
                                values,
                                parameter
                            ) ?? '—'
                    })
                );

            const observation =
                reading?.observation ??
                reading?.observations ??
                '';

            if (observation) {
                rows.push({
                    Paramètre:
                        'Observations',

                    Unité:
                        '',

                    Valeur:
                        observation
                });
            }

            const worksheet =
                XLSX.utils.json_to_sheet(
                    rows
                );

            const workbook =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                'Relevé'
            );

            XLSX.writeFile(
                workbook,
                `releve-${reading?.id ?? 'export'}.xlsx`
            );

            toast.success(
                'Relevé exporté avec succès.'
            );
        } catch (error) {
            console.error(error);

            toast.error(
                'Erreur lors de l’export Excel.'
            );
        }
    };

    /* ========================================================
       CHARGEMENT
    ======================================================== */

    if (loading) {
        return (
            <div className="intervention-detail-page">
                <div className="loading-state">
                    <Loader2
                        size={40}
                        className="spin"
                    />

                    <p>
                        Chargement de l’intervention...
                    </p>
                </div>
            </div>
        );
    }

    if (!intervention) {
        return (
            <div className="intervention-detail-page">
                <div className="empty-state">
                    <AlertCircle size={40} />

                    <h2>
                        Intervention introuvable
                    </h2>

                    <p>
                        Cette intervention n’existe pas
                        ou n’est plus disponible.
                    </p>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                            navigate(
                                '/interventions'
                            )
                        }
                    >
                        <ArrowLeft size={17} />
                        Retour aux interventions
                    </button>
                </div>
            </div>
        );
    }

    /* ========================================================
       DONNÉES AFFICHAGE
    ======================================================== */

    const equipment =
        intervention.equipment;

    const assignedUser =
        intervention.assigned_user ??
        intervention.intervenant ??
        intervention.user;

    const group =
        intervention.group ??
        intervention.assigned_group;

    const scheduledDate =
        intervention.scheduled_date ??
        intervention.planned_date ??
        intervention.date;

    const scheduledStart =
        intervention.scheduled_start_time ??
        intervention.start_time ??
        intervention.scheduled_time;

    const scheduledEnd =
        intervention.scheduled_end_time ??
        intervention.end_time;

    return (
        <div className="intervention-detail-page">

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="intervention-detail-header">

                <div className="header-left">

                    <button
                        type="button"
                        className="back-button"
                        onClick={() =>
                            navigate(
                                '/interventions'
                            )
                        }
                    >
                        <ArrowLeft size={19} />
                    </button>

                    <div className="header-title-area">

                        <div className="breadcrumb">
                            <span>
                                Interventions
                            </span>

                            <ChevronRight
                                size={15}
                            />

                            <span>
                                #{intervention.id}
                            </span>
                        </div>

                        <h1>
                            Intervention #
                            {intervention.id}
                        </h1>

                        <p>
                            {equipment?.name ||
                                intervention.equipment_name ||
                                'Équipement non renseigné'}
                        </p>
                    </div>
                </div>

                <div className="header-actions">

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                            fetchIntervention(true)
                        }
                        disabled={refreshing}
                    >
                        <RefreshCw
                            size={17}
                            className={
                                refreshing
                                    ? 'spin'
                                    : ''
                            }
                        />

                        Actualiser
                    </button>

                    {/* =========================================
                        DÉMARRER
                        UNIQUEMENT INTERVENANT
                    ========================================= */}

                    {canStartIntervention && (
                        <button
                            type="button"
                            className="primary-button"
                            onClick={
                                handleStartIntervention
                            }
                            disabled={
                                startingIntervention
                            }
                        >
                            {startingIntervention ? (
                                <Loader2
                                    size={17}
                                    className="spin"
                                />
                            ) : (
                                <PlayCircle
                                    size={17}
                                />
                            )}

                            Démarrer
                        </button>
                    )}

                    {/* =========================================
                        SAISIR RELEVÉ
                        UNIQUEMENT INTERVENANT
                    ========================================= */}

                    {canEnterReading && (
                        <button
                            type="button"
                            className="primary-button"
                            onClick={
                                openNewReading
                            }
                        >
                            <ClipboardList
                                size={17}
                            />

                            Saisir Relevé
                        </button>
                    )}

                    {/* =========================================
                        FINALISER
                        UNIQUEMENT INTERVENANT
                    ========================================= */}

                    {canCompleteIntervention && (
                        <button
                            type="button"
                            className="primary-button"
                            onClick={
                                handleCompleteIntervention
                            }
                            disabled={
                                completingIntervention
                            }
                        >
                            {completingIntervention ? (
                                <Loader2
                                    size={17}
                                    className="spin"
                                />
                            ) : (
                                <CheckCircle2
                                    size={17}
                                />
                            )}

                            Finaliser
                        </button>
                    )}

                    {/* =========================================
                        MODIFIER INTERVENTION
                    ========================================= */}

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                            navigate(
                                `/interventions/${intervention.id}/edit`
                            )
                        }
                    >
                        <Wrench size={17} />
                        Modifier
                    </button>
                </div>
            </div>

            {/* ==================================================
                BANDEAU INFORMATIONS
            ================================================== */}

            <div className="intervention-summary">

                <div className="summary-status">

                    <div
                        className={`status-badge ${statusConfig.className}`}
                    >
                        <StatusIcon size={17} />

                        {statusConfig.label}
                    </div>

                    <div
                        className={`priority-badge ${priorityConfig.className}`}
                    >
                        {priorityConfig.label}
                    </div>
                </div>

                <div className="summary-info">

                    <div className="summary-item">
                        <Calendar size={18} />

                        <div>
                            <span>
                                Date prévue
                            </span>

                            <strong>
                                {formatDate(
                                    scheduledDate
                                )}
                            </strong>
                        </div>
                    </div>

                    <div className="summary-item">
                        <Clock size={18} />

                        <div>
                            <span>
                                Horaire
                            </span>

                            <strong>
                                {scheduledStart ||
                                    '—'}

                                {scheduledEnd
                                    ? ` - ${scheduledEnd}`
                                    : ''}
                            </strong>
                        </div>
                    </div>

                    <div className="summary-item">
                        <User size={18} />

                        <div>
                            <span>
                                Intervenant
                            </span>

                            <strong>
                                {assignedUser?.name ||
                                    assignedUser?.full_name ||
                                    assignedUser?.email ||
                                    'Non assigné'}
                            </strong>
                        </div>
                    </div>

                    <div className="summary-item">
                        <Building2 size={18} />

                        <div>
                            <span>
                                Groupe
                            </span>

                            <strong>
                                {group?.name ||
                                    intervention.group_name ||
                                    'Non assigné'}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================================================
                INFORMATION RÔLE
            ================================================== */}

            {!isIntervenant && (
                <div className="role-information-banner">
                    <ShieldAlert size={19} />

                    <div>
                        <strong>
                            Mode consultation
                        </strong>

                        <span>
                            Votre rôle (
                            {user?.role ||
                                'non défini'}
                            ) ne permet pas de démarrer,
                            saisir ou finaliser cette
                            intervention.
                        </span>
                    </div>
                </div>
            )}

            {/* ==================================================
                TABS
            ================================================== */}

            <div className="intervention-tabs">

                <button
                    type="button"
                    className={
                        activeTab === 'general'
                            ? 'active'
                            : ''
                    }
                    onClick={() =>
                        setActiveTab('general')
                    }
                >
                    <Info size={17} />
                    Général
                </button>

                <button
                    type="button"
                    className={
                        activeTab === 'reading'
                            ? 'active'
                            : ''
                    }
                    onClick={() =>
                        setActiveTab('reading')
                    }
                >
                    <ClipboardList size={17} />
                    Relevés
                    <span className="tab-count">
                        {visibleReadings.length}
                    </span>
                </button>

                <button
                    type="button"
                    className={
                        activeTab === 'history'
                            ? 'active'
                            : ''
                    }
                    onClick={() =>
                        setActiveTab('history')
                    }
                >
                    <History size={17} />
                    Historique
                </button>
            </div>

            {/* ==================================================
                CONTENU
            ================================================== */}

            <div className="intervention-detail-content">

                {/* =================================================
                    ONGLET GÉNÉRAL
                ================================================= */}

                {activeTab === 'general' && (
                    <div className="detail-grid">

                        <section className="detail-card">

                            <div className="detail-card-header">
                                <div>
                                    <h2>
                                        <Wrench size={19} />
                                        Équipement
                                    </h2>

                                    <p>
                                        Informations sur
                                        l’équipement concerné
                                    </p>
                                </div>
                            </div>

                            <div className="detail-card-body">

                                <div className="info-row">
                                    <span>
                                        Nom
                                    </span>

                                    <strong>
                                        {equipment?.name ||
                                            intervention.equipment_name ||
                                            '—'}
                                    </strong>
                                </div>

                                <div className="info-row">
                                    <span>
                                        Référence
                                    </span>

                                    <strong>
                                        {equipment?.reference ||
                                            equipment?.code ||
                                            '—'}
                                    </strong>
                                </div>

                                <div className="info-row">
                                    <span>
                                        Catégorie
                                    </span>

                                    <strong>
                                        {equipment?.category?.name ||
                                            equipment?.category_name ||
                                            '—'}
                                    </strong>
                                </div>

                                <div className="info-row">
                                    <span>
                                        Localisation
                                    </span>

                                    <strong>
                                        {equipment?.location ||
                                            '—'}
                                    </strong>
                                </div>
                            </div>
                        </section>

                        <section className="detail-card">

                            <div className="detail-card-header">
                                <div>
                                    <h2>
                                        <ClipboardList size={19} />
                                        Planification
                                    </h2>

                                    <p>
                                        Informations de
                                        planification
                                    </p>
                                </div>
                            </div>

                            <div className="detail-card-body">

                                <div className="info-row">
                                    <span>
                                        Type
                                    </span>

                                    <strong>
                                        {intervention.type ||
                                            intervention.intervention_type ||
                                            'Préventive'}
                                    </strong>
                                </div>

                                <div className="info-row">
                                    <span>
                                        Priorité
                                    </span>

                                    <span
                                        className={`priority-badge ${priorityConfig.className}`}
                                    >
                                        {
                                            priorityConfig.label
                                        }
                                    </span>
                                </div>

                                <div className="info-row">
                                    <span>
                                        Date
                                    </span>

                                    <strong>
                                        {formatDate(
                                            scheduledDate
                                        )}
                                    </strong>
                                </div>

                                <div className="info-row">
                                    <span>
                                        Horaire
                                    </span>

                                    <strong>
                                        {scheduledStart ||
                                            '—'}

                                        {scheduledEnd
                                            ? ` - ${scheduledEnd}`
                                            : ''}
                                    </strong>
                                </div>
                            </div>
                        </section>

                        <section className="detail-card full-width">

                            <div className="detail-card-header">
                                <div>
                                    <h2>
                                        <FileText size={19} />
                                        Description
                                    </h2>
                                </div>
                            </div>

                            <div className="detail-card-body">

                                <div className="description-box">
                                    {intervention.description ||
                                        intervention.instructions ||
                                        'Aucune description disponible.'}
                                </div>
                            </div>
                        </section>

                        {assignedCanvas && (
                            <section className="detail-card full-width">

                                <div className="detail-card-header">
                                    <div>
                                        <h2>
                                            <Sliders size={19} />
                                            Formulaire de relevé
                                        </h2>

                                        <p>
                                            Structure associée
                                            à cette intervention
                                        </p>
                                    </div>
                                </div>

                                <div className="detail-card-body">

                                    <div className="template-summary">

                                        <div className="template-icon">
                                            <ClipboardList
                                                size={24}
                                            />
                                        </div>

                                        <div>
                                            <strong>
                                                {assignedCanvas.name ||
                                                    assignedCanvas.title ||
                                                    'Formulaire de relevé'}
                                            </strong>

                                            <span>
                                                {
                                                    normalizedParameters.length
                                                }{' '}
                                                paramètre(s)
                                            </span>

                                            {monitorCount >
                                                0 && (
                                                <span>
                                                    {monitorCount}{' '}
                                                    moniteur(s)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* =================================================
                    ONGLET RELEVÉS
                ================================================= */}

                {activeTab === 'reading' && (
                    <div className="reading-tab">

                        <div className="tab-header">

                            <div>
                                <h2>
                                    Fiches de relevé
                                </h2>

                                <p>
                                    Relevés associés à
                                    cette intervention
                                </p>
                            </div>

                            {/* =====================================
                                SAISIE UNIQUEMENT INTERVENANT
                            ===================================== */}

                            {canEnterReading && (
                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={
                                        openNewReading
                                    }
                                >
                                    <ClipboardList
                                        size={17}
                                    />
                                    Saisir le formulaire
                                </button>
                            )}
                        </div>

                        {/* =========================================
                            CORRECTION UNIQUEMENT INTERVENANT
                        ========================================= */}

                        {canEditReading && (
                            <div className="correction-banner">
                                <RotateCcw
                                    size={18}
                                />

                                <div>
                                    <strong>
                                        Modification
                                        nécessaire
                                    </strong>

                                    <span>
                                        Le dernier relevé
                                        nécessite une
                                        modification ou
                                        peut être corrigé.
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={
                                        openCorrectionReading
                                    }
                                >
                                    Modifier les données
                                </button>
                            </div>
                        )}

                        {visibleReadings.length === 0 ? (
                            <div className="empty-state">

                                <ClipboardList
                                    size={44}
                                />

                                <h3>
                                    Aucun relevé
                                </h3>

                                <p>
                                    Aucun relevé n’a
                                    encore été enregistré
                                    pour cette intervention.
                                </p>

                                {canEnterReading && (
                                    <button
                                        type="button"
                                        className="primary-button"
                                        onClick={
                                            openNewReading
                                        }
                                    >
                                        <ClipboardList
                                            size={17}
                                        />
                                        Saisir un relevé
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="readings-list">

                                {visibleReadings.map(
                                    (reading, index) => {
                                        const readingStatus =
                                            normalizeStatus(
                                                reading.validation_status
                                            );

                                        const validationLabel =
                                            {
                                                valide:
                                                    'Validé',
                                                rejete:
                                                    'Rejeté',
                                                rejetee:
                                                    'Rejeté',
                                                modifications_demandees:
                                                    'Modifications demandées'
                                            }[
                                                readingStatus
                                            ] ||
                                            reading.validation_status ||
                                            'En attente';

                                        return (
                                            <div
                                                className="reading-history-card"
                                                key={
                                                    reading.id ??
                                                    index
                                                }
                                            >

                                                <div className="reading-history-main">

                                                    <div className="reading-history-icon">
                                                        <ClipboardList
                                                            size={21}
                                                        />
                                                    </div>

                                                    <div className="reading-history-info">

                                                        <div className="reading-history-title">
                                                            <strong>
                                                                Relevé #
                                                                {reading.id ??
                                                                    index +
                                                                        1}
                                                            </strong>

                                                            <span
                                                                className={`validation-status validation-${readingStatus}`}
                                                            >
                                                                {
                                                                    validationLabel
                                                                }
                                                            </span>
                                                        </div>

                                                        <div className="reading-history-meta">

                                                            <span>
                                                                <Calendar
                                                                    size={14}
                                                                />

                                                                {formatDate(
                                                                    getReadingTime(
                                                                        reading
                                                                    )
                                                                )}
                                                            </span>

                                                            <span>
                                                                <Clock
                                                                    size={14}
                                                                />

                                                                {formatDateTime(
                                                                    getReadingTime(
                                                                        reading
                                                                    )
                                                                )}
                                                            </span>
                                                        </div>

                                                        {(
                                                            reading.observation ||
                                                            reading.observations
                                                        ) && (
                                                            <p>
                                                                {
                                                                    reading.observation ||
                                                                    reading.observations
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="reading-history-actions">

                                                    <button
                                                        type="button"
                                                        className="icon-button"
                                                        title="Consulter"
                                                        onClick={() =>
                                                            openReadingReadOnly(
                                                                reading
                                                            )
                                                        }
                                                    >
                                                        <Eye
                                                            size={17}
                                                        />
                                                    </button>

                                                    {readingStatus ===
                                                        'valide' && (
                                                        <button
                                                            type="button"
                                                            className="icon-button"
                                                            title="Exporter Excel"
                                                            onClick={() =>
                                                                exportReadingExcel(
                                                                    reading
                                                                )
                                                            }
                                                        >
                                                            <Download
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* =================================================
                    ONGLET HISTORIQUE
                ================================================= */}

                {activeTab === 'history' && (
                    <div className="history-tab">

                        <div className="tab-header">

                            <div>
                                <h2>
                                    Historique
                                </h2>

                                <p>
                                    Historique des relevés
                                    et de l’intervention
                                </p>
                            </div>
                        </div>

                        <div className="history-timeline">

                            <div className="timeline-item">

                                <div className="timeline-marker">
                                    <Activity
                                        size={17}
                                    />
                                </div>

                                <div className="timeline-content">

                                    <div className="timeline-header">
                                        <strong>
                                            Intervention créée
                                        </strong>

                                        <span>
                                            {formatDateTime(
                                                intervention.created_at
                                            )}
                                        </span>
                                    </div>

                                    <p>
                                        L’intervention #
                                        {intervention.id}{' '}
                                        a été créée dans
                                        le système.
                                    </p>
                                </div>
                            </div>

                            {visibleReadings
                                .slice()
                                .sort(
                                    (a, b) =>
                                        new Date(
                                            getReadingTime(
                                                a
                                            ) || 0
                                        ) -
                                        new Date(
                                            getReadingTime(
                                                b
                                            ) || 0
                                        )
                                )
                                .map(
                                    (
                                        reading,
                                        index
                                    ) => (
                                        <div
                                            className="timeline-item"
                                            key={
                                                reading.id ??
                                                index
                                            }
                                        >

                                            <div className="timeline-marker">
                                                <ClipboardList
                                                    size={
                                                        17
                                                    }
                                                />
                                            </div>

                                            <div className="timeline-content">

                                                <div className="timeline-header">
                                                    <strong>
                                                        Relevé #
                                                        {reading.id ??
                                                            index +
                                                                1}
                                                    </strong>

                                                    <span>
                                                        {formatDateTime(
                                                            getReadingTime(
                                                                reading
                                                            )
                                                        )}
                                                    </span>
                                                </div>

                                                <p>
                                                    Relevé
                                                    enregistré
                                                    pour
                                                    l’intervention.
                                                </p>

                                                <button
                                                    type="button"
                                                    className="link-button"
                                                    onClick={() =>
                                                        openReadingReadOnly(
                                                            reading
                                                        )
                                                    }
                                                >
                                                    <Eye
                                                        size={
                                                            15
                                                        }
                                                    />
                                                    Consulter
                                                </button>
                                            </div>
                                        </div>
                                    )
                                )}

                            {intervention.completed_at && (
                                <div className="timeline-item">

                                    <div className="timeline-marker completed">
                                        <CheckCircle2
                                            size={
                                                17
                                            }
                                        />
                                    </div>

                                    <div className="timeline-content">

                                        <div className="timeline-header">
                                            <strong>
                                                Intervention
                                                terminée
                                            </strong>

                                            <span>
                                                {formatDateTime(
                                                    intervention.completed_at
                                                )}
                                            </span>
                                        </div>

                                        <p>
                                            L’intervention
                                            a été
                                            finalisée.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {intervention.validated_at && (
                                <div className="timeline-item">

                                    <div className="timeline-marker validated">
                                        <CheckCircle2
                                            size={
                                                17
                                            }
                                        />
                                    </div>

                                    <div className="timeline-content">

                                        <div className="timeline-header">
                                            <strong>
                                                Intervention
                                                validée
                                            </strong>

                                            <span>
                                                {formatDateTime(
                                                    intervention.validated_at
                                                )}
                                            </span>
                                        </div>

                                        <p>
                                            L’intervention
                                            a été validée.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ==================================================
                MODAL RELEVÉ
            ================================================== */}

            <ReadingModal
                isOpen={
                    isReadingModalOpen
                }
                onClose={() => {
                    if (savingReading) {
                        return;
                    }

                    setIsReadingModalOpen(
                        false
                    );

                    setSelectedReading(
                        null
                    );

                    setCorrectionMode(
                        false
                    );

                    setReadOnlyReading(
                        false
                    );
                }}
                intervention={
                    intervention
                }
                reading={
                    selectedReading
                }
                form={
                    readingForm
                }
                setForm={
                    setReadingForm
                }
                parameters={
                    normalizedParameters
                }
                readOnly={
                    readOnlyReading
                }
                correctionMode={
                    correctionMode
                }
                saving={
                    savingReading
                }
                onSave={
                    handleSaveReading
                }
            />
        </div>
    );
};

export default InterventionDetail;