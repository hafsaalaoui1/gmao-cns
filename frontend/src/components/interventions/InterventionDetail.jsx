import React, {
    useEffect,
    useMemo,
    useState,
    useCallback
} from 'react';

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

/* ==========================================================================
   HELPERS & UTILS
   ========================================================================== */

const normalizeReadingValues = (values) => {
    if (!values) return {};

    if (typeof values === 'string') {
        try {
            values = JSON.parse(values);
        } catch (error) {
            return {};
        }
    }

    if (Array.isArray(values)) {
        return values.reduce(
            (acc, val, idx) => ({
                ...acc,
                [idx]: val
            }),
            {}
        );
    }

    return typeof values === 'object' && values !== null
        ? values
        : {};
};

const isMeaningfulValue = (val) =>
    val !== null &&
    val !== undefined &&
    (typeof val !== 'string' || val.trim() !== '');

const readingHasValues = (reading) => {
    if (!reading) return false;

    const values = normalizeReadingValues(
        reading.values
    );

    return Object.keys(values).some(
        (key) =>
            !String(key).startsWith('_') &&
            isMeaningfulValue(values[key])
    );
};

const getReadingTime = (reading) => {
    if (!reading) return 0;

    const val =
        reading.taken_at ||
        reading.created_at ||
        reading.updated_at ||
        0;

    const ts = new Date(val).getTime();

    return Number.isNaN(ts) ? 0 : ts;
};

const normalizeKey = (key) =>
    String(key ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');

const normalizeStatus = (status) =>
    String(status ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

const findValueByKeys = (
    values,
    possibleKeys
) => {
    const normalizedValues =
        normalizeReadingValues(values);

    for (const key of possibleKeys) {
        if (
            Object.prototype.hasOwnProperty.call(
                normalizedValues,
                key
            )
        ) {
            return normalizedValues[key];
        }
    }

    const normalizedPossibleKeys =
        possibleKeys.map(normalizeKey);

    for (const [
        existingKey,
        value
    ] of Object.entries(normalizedValues)) {
        if (
            normalizedPossibleKeys.includes(
                normalizeKey(existingKey)
            )
        ) {
            return value;
        }
    }

    return undefined;
};

const getParameterReadingValue = (
    values,
    parameter,
    parameterIndex,
    monitorIndex
) => {
    const monitorNum = monitorIndex + 1;

    const parameterId =
        parameter?.id ??
        parameter?.key ??
        `parameter-${parameterIndex}`;

    const parameterName =
        parameter?.name ??
        parameter?.parameter ??
        parameter?.label ??
        `Paramètre ${parameterIndex + 1}`;

    const possibleKeys = [
        `${parameterId}_monitor_${monitorNum}`,
        `${parameterId}_moniteur_${monitorNum}`,
        `${parameterName}_monitor_${monitorNum}`,
        `${parameterIndex + 1}_monitor_${monitorNum}`
    ];

    const directValue = findValueByKeys(
        values,
        possibleKeys
    );

    if (
        directValue !== undefined &&
        directValue !== null
    ) {
        return directValue;
    }

    const normalizedValues =
        normalizeReadingValues(values);

    for (const key of [
        parameterId,
        parameterName,
        String(parameterIndex + 1)
    ]) {
        const nested =
            normalizedValues[key];

        if (
            nested &&
            typeof nested === 'object'
        ) {
            const nestedValue =
                findValueByKeys(
                    nested,
                    [
                        `monitor_${monitorNum}`,
                        `moniteur_${monitorNum}`,
                        String(monitorNum)
                    ]
                );

            if (
                nestedValue !== undefined
            ) {
                return nestedValue;
            }
        }
    }

    return '';
};

const buildFormValuesFromReading = (
    reading,
    normalizedParameters
) => {
    const sourceValues =
        normalizeReadingValues(
            reading?.values
        );

    const result = {
        ...sourceValues
    };

    normalizedParameters.forEach(
        (parameter, parameterIndex) => {
            const monitors = Math.max(
                Number(parameter.monitors) || 1,
                1
            );

            for (
                let monitorIndex = 0;
                monitorIndex < monitors;
                monitorIndex++
            ) {
                const val =
                    getParameterReadingValue(
                        sourceValues,
                        parameter,
                        parameterIndex,
                        monitorIndex
                    );

                if (
                    val !== undefined &&
                    val !== null
                ) {
                    const key = `${
                        parameter.id ||
                        `parameter-${parameterIndex}`
                    }_monitor_${
                        monitorIndex + 1
                    }`;

                    result[key] = val;
                }
            }
        }
    );

    return result;
};

const buildReadingFormFromReading = (
    reading,
    normalizedParameters
) => ({
    values: buildFormValuesFromReading(
        reading,
        normalizedParameters
    ),
    observation:
        reading?.commentaire ||
        reading?.comment ||
        reading?.observation ||
        '',
    annexes: Array.isArray(
        reading?.annexes
    )
        ? reading.annexes
        : []
});

const formatDate = (date) => {
    if (!date) return '—';

    try {
        return new Date(
            date
        ).toLocaleDateString(
            'fr-FR',
            {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }
        );
    } catch {
        return date;
    }
};

const formatDateTime = (date) => {
    if (!date) return '—';

    try {
        return new Date(
            date
        ).toLocaleString(
            'fr-FR',
            {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        );
    } catch {
        return date;
    }
};

const getStatusConfig = (status) => {
    const normalizedStatus =
        normalizeStatus(status);

    const configs = {
        planifiee: {
            label: 'Planifiée',
            class: 'status-planifiee',
            icon: Calendar
        },

        en_attente: {
            label: 'En attente',
            class: 'status-planifiee',
            icon: Clock
        },

        en_cours: {
            label: 'En cours',
            class: 'status-en-cours',
            icon: PlayCircle
        },

        terminee: {
            label: 'Terminée',
            class: 'status-terminee',
            icon: CheckCircle2
        },

        validee: {
            label: 'Validée',
            class: 'status-validee',
            icon: CheckCircle2
        },

        valide: {
            label: 'Validé',
            class: 'status-validee',
            icon: CheckCircle2
        },

        rejetee: {
            label: 'Rejetée',
            class: 'status-rejetee',
            icon: AlertCircle
        },

        rejete: {
            label: 'Rejeté',
            class: 'status-rejetee',
            icon: AlertCircle
        },

        modifications_demandees: {
            label: 'Modifications requises',
            class: 'status-modifications',
            icon: RotateCcw
        },

        cloturee: {
            label: 'Clôturée',
            class: 'status-terminee',
            icon: CheckCircle2
        },

        en_retard: {
            label: 'En retard',
            class: 'status-retard',
            icon: AlertCircle
        }
    };

    return (
        configs[normalizedStatus] || {
            label: status || 'Inconnu',
            class: 'status-default',
            icon: Info
        }
    );
};

const getPriorityConfig = (priority) => {
    const configs = {
        faible: {
            label: 'Faible',
            class: 'prio-faible'
        },

        normale: {
            label: 'Normale',
            class: 'prio-normale'
        },

        elevee: {
            label: 'Élevée',
            class: 'prio-elevee'
        },

        urgente: {
            label: 'Urgente',
            class: 'prio-urgente'
        }
    };

    return (
        configs[priority] || {
            label: priority || '—',
            class: ''
        }
    );
};

/* ==========================================================================
   HOOK DATA
   ========================================================================== */

const useInterventionData = (id) => {
    const [intervention, setIntervention] =
        useState(null);

    const [readings, setReadings] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const fetchIntervention =
        useCallback(
            async (showToast = false) => {
                if (!id) return;

                if (showToast) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                try {
                    const response =
                        await api.get(
                            `/interventions/${id}`
                        );

                    setIntervention(
                        response.data?.data ||
                            response.data
                    );

                    try {
                        const readingsResponse =
                            await api.get(
                                `/interventions/${id}/readings`
                            );

                        const readingsData =
                            readingsResponse.data
                                ?.data ||
                            readingsResponse.data ||
                            [];

                        setReadings(
                            Array.isArray(
                                readingsData
                            )
                                ? readingsData
                                : []
                        );
                    } catch (error) {
                        setReadings([]);
                    }

                    if (showToast) {
                        toast.success(
                            'Données actualisées'
                        );
                    }
                } catch (error) {
                    toast.error(
                        error.response?.data
                            ?.message ||
                            'Erreur de chargement.'
                    );

                    setIntervention(null);
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

/* ==========================================================================
   MODAL RELEVÉ
   ========================================================================== */

const ReadingModal = ({
    assignedCanvas,
    intervention,
    normalizedParameters,
    monitorCount,
    readingForm,
    onValueChange,
    onObservationChange,
    onSave,
    onClose,
    saving,
    equipmentName,
    correctionMode,
    readOnly,
    activeReading,
    onExportExcel
}) => {
    const statusCfg =
        getStatusConfig(
            activeReading?.validation_status
        );

    const StatusIcon =
        statusCfg.icon;

    return (
        <div
            className="reading-modal-overlay"
            onMouseDown={(e) =>
                e.target === e.currentTarget &&
                onClose()
            }
        >
            <div className="reading-modal">
                <div className="reading-modal-header">
                    <div>
                        <span className="modal-subtitle">
                            {readOnly
                                ? 'CONSULTATION DU RELEVÉ'
                                : correctionMode
                                ? 'MODIFICATION DU RELEVÉ'
                                : 'RELEVÉ DE MAINTENANCE'}
                        </span>

                        <h2>
                            {assignedCanvas.template_name ||
                                'Fiche de Relevé'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="reading-modal-close"
                        onClick={onClose}
                        title="Fermer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="reading-modal-body">
                    <div className="reading-document">

                        <div className="document-top">
                            <div className="document-brand">
                                <strong>
                                    ONDA
                                </strong>

                                <span>
                                    OFFICE NATIONAL DES
                                    AÉROPORTS
                                </span>
                            </div>

                            <div className="document-code">
                                <span>
                                    CODE DOCUMENT
                                </span>

                                <strong>
                                    {assignedCanvas.header
                                        ?.code || '—'}
                                </strong>
                            </div>
                        </div>

                        <div className="document-division">
                            {assignedCanvas.header
                                ?.division ||
                                'DIVISION TECHNIQUE NAVIGATION AÉRIENNE'}
                        </div>

                        {activeReading?.validation_status && (
                            <div className="reading-status-banner">
                                <div className="status-banner-left">
                                    <span
                                        className={`status-badge ${statusCfg.class}`}
                                    >
                                        <StatusIcon size={14} />
                                        {statusCfg.label}
                                    </span>

                                    {activeReading.validated_at && (
                                        <span className="validated-at-text">
                                            Validé le{' '}
                                            <strong>
                                                {formatDateTime(
                                                    activeReading.validated_at
                                                )}
                                            </strong>
                                        </span>
                                    )}
                                </div>

                                {activeReading.validation_commentaire && (
                                    <div className="validation-comment-box">
                                        <MessageSquare size={14} />

                                        <span>
                                            <strong>
                                                Note responsable :
                                            </strong>{' '}
                                            {
                                                activeReading.validation_commentaire
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="document-identification">
                            <div className="document-field">
                                <span>
                                    AÉROPORT
                                </span>

                                <strong>
                                    {assignedCanvas.header
                                        ?.aeroport ||
                                        'FES SAISS'}
                                </strong>
                            </div>

                            <div className="document-field">
                                <span>
                                    ÉQUIPEMENT
                                </span>

                                <strong>
                                    {assignedCanvas.equipment
                                        ?.name ||
                                        equipmentName}
                                </strong>
                            </div>

                            <div className="document-field">
                                <span>
                                    FRÉQUENCE
                                </span>

                                <strong>
                                    {assignedCanvas.frequency ||
                                        '—'}
                                </strong>
                            </div>

                            <div className="document-field">
                                <span>
                                    DATE PLANNIFIÉE
                                </span>

                                <strong>
                                    {formatDate(
                                        intervention.scheduled_date
                                    )}
                                </strong>
                            </div>
                        </div>

                        <div className="document-section">
                            <div className="document-section-title">
                                <Sliders size={16} />
                                RELEVÉ DES MESURES
                            </div>

                            {normalizedParameters.length >
                            0 ? (
                                <div className="interactive-reading-table-wrapper">
                                    <table className="interactive-reading-table">
                                        <thead>
                                            <tr>
                                                <th>
                                                    Paramètre
                                                </th>

                                                <th>
                                                    Unité
                                                </th>

                                                {Array.from({
                                                    length: monitorCount
                                                }).map(
                                                    (_, i) => (
                                                        <th
                                                            key={i}
                                                            className="text-center"
                                                        >
                                                            Moniteur{' '}
                                                            {i + 1}
                                                        </th>
                                                    )
                                                )}

                                                <th>
                                                    Tolérance
                                                </th>

                                                <th>
                                                    Plage normale
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {normalizedParameters.map(
                                                (
                                                    param,
                                                    pIdx
                                                ) => (
                                                    <tr
                                                        key={
                                                            param.id ||
                                                            pIdx
                                                        }
                                                    >
                                                        <td>
                                                            <strong>
                                                                {
                                                                    param.name
                                                                }
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            <span className="unit-tag">
                                                                {param.unit ||
                                                                    '—'}
                                                            </span>
                                                        </td>

                                                        {Array.from({
                                                            length: monitorCount
                                                        }).map(
                                                            (
                                                                _,
                                                                mIdx
                                                            ) => {
                                                                const hasMonitor =
                                                                    mIdx <
                                                                    param.monitors;

                                                                const key = `${
                                                                    param.id ||
                                                                    `parameter-${pIdx}`
                                                                }_monitor_${
                                                                    mIdx +
                                                                    1
                                                                }`;

                                                                const val =
                                                                    readingForm
                                                                        .values[
                                                                        key
                                                                    ] ??
                                                                    '';

                                                                return (
                                                                    <td
                                                                        key={
                                                                            mIdx
                                                                        }
                                                                        className="text-center"
                                                                    >
                                                                        {hasMonitor ? (
                                                                            readOnly ? (
                                                                                <span className="value-display-only">
                                                                                    {val !==
                                                                                    ''
                                                                                        ? val
                                                                                        : '—'}
                                                                                </span>
                                                                            ) : (
                                                                                <input
                                                                                    type="text"
                                                                                    className="reading-input"
                                                                                    value={
                                                                                        val
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) =>
                                                                                        onValueChange(
                                                                                            param,
                                                                                            pIdx,
                                                                                            mIdx,
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    placeholder="Saisir..."
                                                                                />
                                                                            )
                                                                        ) : (
                                                                            <span className="cell-disabled">
                                                                                —
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            }
                                                        )}

                                                        <td>
                                                            {param.tolerance ||
                                                                '—'}
                                                        </td>

                                                        <td>
                                                            <span className="range-badge">
                                                                {param.normal_min &&
                                                                param.normal_max
                                                                    ? `${param.normal_min} – ${param.normal_max}`
                                                                    : param.normal_min
                                                                    ? `≥ ${param.normal_min}`
                                                                    : param.normal_max
                                                                    ? `≤ ${param.normal_max}`
                                                                    : '—'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-param-state">
                                    Aucun paramètre configuré
                                    dans ce modèle.
                                </div>
                            )}
                        </div>

                        <div className="document-section">
                            <div className="document-section-title">
                                <MessageSquare size={16} />
                                OBSERVATIONS & REMARQUES
                            </div>

                            <textarea
                                className="reading-observation"
                                value={
                                    readingForm.observation
                                }
                                onChange={(e) =>
                                    onObservationChange(
                                        e.target.value
                                    )
                                }
                                placeholder={
                                    readOnly
                                        ? 'Aucune observation saisie.'
                                        : 'Saisissez vos observations, anomalies constatées...'
                                }
                                rows={3}
                                readOnly={readOnly}
                            />
                        </div>

                        <div className="reading-save-area">
                            <div className="reading-save-info">
                                <Info size={18} />

                                <div>
                                    <strong>
                                        {readOnly
                                            ? 'Mode Consultation'
                                            : correctionMode
                                            ? 'Mode Correction'
                                            : 'Enregistrement'}
                                    </strong>

                                    <span>
                                        {readOnly
                                            ? 'Les valeurs affichées correspondent au relevé enregistré.'
                                            : 'Les données seront soumises au système.'}
                                    </span>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    gap: '0.75rem',
                                    alignItems: 'center'
                                }}
                            >
                                {readOnly &&
                                    [
                                        'valide',
                                        'validee',
                                        'terminee'
                                    ].includes(
                                        activeReading?.validation_status
                                    ) && (
                                        <button
                                            type="button"
                                            className="btn-excel-export"
                                            onClick={() =>
                                                onExportExcel(
                                                    activeReading
                                                )
                                            }
                                        >
                                            <Download size={15} />
                                            Exporter Excel
                                        </button>
                                    )}

                                {!readOnly ? (
                                    <button
                                        type="button"
                                        className="btn-save-reading"
                                        onClick={onSave}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <Loader2
                                                size={16}
                                                className="spin"
                                            />
                                        ) : correctionMode ? (
                                            <RotateCcw size={16} />
                                        ) : (
                                            <Save size={16} />
                                        )}

                                        {saving
                                            ? 'Enregistrement...'
                                            : correctionMode
                                            ? 'Soumettre correction'
                                            : 'Enregistrer le relevé'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn-secondary-action"
                                        onClick={onClose}
                                    >
                                        Fermer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ==========================================================================
   COMPOSANT PRINCIPAL
   ========================================================================== */

const InterventionDetail = () => {
    const { id } = useParams();

    const navigate = useNavigate();

    /* ======================================================================
       GESTION DES RÔLES
       ====================================================================== */

    const { user } = useAuth();

    /*
     * On normalise le rôle pour accepter :
     * - intervenant
     * - atsep
     *
     * sans modifier le design.
     */
    const userRole = String(
        user?.role || ''
    )
        .trim()
        .toLowerCase();

    const canOperateIntervention =
        userRole === 'intervenant' ||
        userRole === 'atsep';

    const isResponsable =
        userRole === 'responsable';

    const isAdmin =
        userRole === 'admin';

    /*
     * Responsable et Admin sont des utilisateurs
     * de consultation sur cette page.
     */
    const canConsultIntervention =
        canOperateIntervention ||
        isResponsable ||
        isAdmin;

    const {
        intervention,
        readings,
        loading,
        refreshing,
        fetchIntervention
    } = useInterventionData(id);

    const [activeTab, setActiveTab] =
        useState('general');

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

    const assignedCanvas =
        intervention?.template || null;

    const normalizedParameters =
        useMemo(() => {
            let params =
                assignedCanvas?.parameters;

            if (!params) return [];

            if (typeof params === 'string') {
                try {
                    params = JSON.parse(params);
                } catch (e) {
                    return [];
                }
            }

            if (
                params &&
                !Array.isArray(params) &&
                typeof params === 'object' &&
                Array.isArray(
                    params.parameters
                )
            ) {
                params = params.parameters;
            }

            if (!Array.isArray(params))
                return [];

            return params
                .map(
                    (
                        parameter,
                        index
                    ) => {
                        if (!parameter)
                            return null;

                        if (
                            typeof parameter !==
                            'object'
                        ) {
                            return {
                                id: `parameter-${index}`,
                                name: String(
                                    parameter
                                ),
                                unit: '',
                                monitors: 1,
                                tolerance: '',
                                normal_min: '',
                                normal_max: ''
                            };
                        }

                        return {
                            id:
                                parameter.id ??
                                parameter.key ??
                                `parameter-${index}`,

                            name:
                                parameter.name ||
                                parameter.parameter ||
                                parameter.label ||
                                `Paramètre ${
                                    index + 1
                                }`,

                            unit:
                                parameter.unit ||
                                parameter.unite ||
                                '',

                            monitors: Math.max(
                                Number(
                                    parameter.monitors ??
                                        parameter.monitor_count ??
                                        parameter.nb_monitors
                                ) || 1,
                                1
                            ),

                            tolerance:
                                parameter.tolerance ||
                                '',

                            normal_min:
                                parameter.normal_min ??
                                parameter.normalMin ??
                                '',

                            normal_max:
                                parameter.normal_max ??
                                parameter.normalMax ??
                                ''
                        };
                    }
                )
                .filter(Boolean);
        }, [assignedCanvas]);

    const monitorCount =
        useMemo(() => {
            if (
                normalizedParameters.length ===
                0
            ) {
                return 1;
            }

            return Math.max(
                ...normalizedParameters.map(
                    (p) =>
                        Number(
                            p.monitors
                        ) || 1
                )
            );
        }, [normalizedParameters]);

    const visibleReadings =
        useMemo(() => {
            if (!Array.isArray(readings))
                return [];

            return readings.filter(
                (r) =>
                    r?.validation_status !==
                        'brouillon' ||
                    readingHasValues(r)
            );
        }, [readings]);

    const latestReading =
        useMemo(() => {
            if (
                !Array.isArray(
                    visibleReadings
                ) ||
                visibleReadings.length === 0
            ) {
                return null;
            }

            return [
                ...visibleReadings
            ].sort(
                (a, b) =>
                    getReadingTime(b) -
                    getReadingTime(a)
            )[0];
        }, [visibleReadings]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setIsReadingModalOpen(false);
                setCorrectionMode(false);
                setReadOnlyReading(false);
            }
        };

        if (isReadingModalOpen) {
            document.addEventListener(
                'keydown',
                handleEscape
            );

            document.body.style.overflow =
                'hidden';
        }

        return () => {
            document.removeEventListener(
                'keydown',
                handleEscape
            );

            document.body.style.overflow =
                '';
        };
    }, [isReadingModalOpen]);

    const equipmentName =
        useMemo(
            () =>
                intervention?.equipment
                    ?.name ||
                intervention?.equipment
                    ?.nom ||
                `Équipement #${
                    intervention?.equipment_id ||
                    '—'
                }`,
            [intervention]
        );

    const groupName =
        useMemo(
            () =>
                intervention?.group?.name ||
                intervention?.group?.nom ||
                'Non affecté',
            [intervention]
        );

    const userName =
        useMemo(() => {
            const u =
                intervention?.user;

            if (!u)
                return 'Non assigné';

            return (
                u.name ||
                `${u.first_name || ''} ${
                    u.last_name || ''
                }`.trim() ||
                u.email
            );
        }, [intervention]);

    const handleReadingChange = (
        param,
        pIdx,
        mIdx,
        val
    ) => {
        const key = `${
            param.id ||
            `parameter-${pIdx}`
        }_monitor_${mIdx + 1}`;

        setReadingForm((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                [key]: val
            }
        }));
    };

    const handleObservationChange = (
        val
    ) => {
        setReadingForm((prev) => ({
            ...prev,
            observation: val
        }));
    };

    /* ==========================================================================
       EXPORT EXCEL
       ========================================================================== */

    const exportReadingToExcel = (
        readingToExport
    ) => {
        if (!readingToExport) {
            toast.error(
                'Aucun relevé à exporter.'
            );
            return;
        }

        const dateSaisie =
            formatDateTime(
                readingToExport.taken_at ||
                    readingToExport.created_at
            );

        const dateValidation =
            formatDateTime(
                readingToExport.validated_at
            );

        const staticValues =
            normalizeReadingValues(
                readingToExport.values
            );

        const excelData = [
            [
                'RAPPORT DE RELEVÉ DE MAINTENANCE'
            ],
            [''],
            ['RÉFÉRENCE & ÉQUIPEMENT'],
            [
                'Intervention ID',
                `#${intervention.id}`
            ],
            ['Équipement', equipmentName],
            [
                "Type d'équipement",
                intervention.equipment
                    ?.type || '—'
            ],
            [
                'Aéroport',
                assignedCanvas?.header
                    ?.aeroport ||
                    'FES SAISS'
            ],
            ['Groupe', groupName],
            [
                'Technicien / Intervenant',
                userName
            ],
            [''],
            ['DÉTAILS DU RELEVÉ'],
            [
                'Modèle de relevé',
                assignedCanvas
                    ?.template_name ||
                    '—'
            ],
            [
                'Fréquence',
                assignedCanvas?.frequency ||
                    '—'
            ],
            [
                'Date de réalisation',
                dateSaisie
            ],
            [
                'Statut de validation',
                readingToExport.validation_status ||
                    'Validé'
            ],
            [
                'Date de validation',
                dateValidation
            ],
            [
                'Remarque responsable',
                readingToExport.validation_commentaire ||
                    '—'
            ],
            [
                'Observations technicien',
                readingToExport.commentaire ||
                    readingToExport.observation ||
                    '—'
            ],
            [''],
            ['MESURES ET PARAMÈTRES']
        ];

        const headers = [
            'Paramètre',
            'Unité'
        ];

        for (
            let i = 1;
            i <= monitorCount;
            i++
        ) {
            headers.push(
                `Moniteur ${i}`
            );
        }

        headers.push(
            'Tolérance',
            'Plage normale'
        );

        excelData.push(headers);

        normalizedParameters.forEach(
            (param, pIdx) => {
                const row = [
                    param.name,
                    param.unit || '—'
                ];

                for (
                    let mIdx = 0;
                    mIdx < monitorCount;
                    mIdx++
                ) {
                    const hasMonitor =
                        mIdx <
                        param.monitors;

                    if (hasMonitor) {
                        const val =
                            getParameterReadingValue(
                                staticValues,
                                param,
                                pIdx,
                                mIdx
                            );

                        row.push(
                            val !== '' &&
                                val !==
                                    undefined
                                ? val
                                : '—'
                        );
                    } else {
                        row.push('N/A');
                    }
                }

                row.push(
                    param.tolerance ||
                        '—'
                );

                const range =
                    param.normal_min &&
                    param.normal_max
                        ? `${param.normal_min} – ${param.normal_max}`
                        : param.normal_min
                        ? `≥ ${param.normal_min}`
                        : param.normal_max
                        ? `≤ ${param.normal_max}`
                        : '—';

                row.push(range);

                excelData.push(row);
            }
        );

        const worksheet =
            XLSX.utils.aoa_to_sheet(
                excelData
            );

        worksheet['!cols'] = [
            { wch: 30 },
            { wch: 12 },
            ...Array(
                monitorCount
            ).fill({
                wch: 15
            }),
            { wch: 15 },
            { wch: 20 }
        ];

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            'Relevé'
        );

        const fileName = `Releve_Intervention_${
            intervention.id
        }_${equipmentName.replace(
            /[^a-zA-Z0-9]/g,
            '_'
        )}.xlsx`;

        XLSX.writeFile(
            workbook,
            fileName
        );

        toast.success(
            'Export Excel généré avec succès !'
        );
    };

    /* ==========================================================================
       ACTIONS MODALE
       ========================================================================== */

    const openNewReading = () => {
        /*
         * Sécurité frontend supplémentaire :
         * seul Intervenant/ATSEP peut ouvrir
         * le formulaire de saisie.
         */
        if (!canOperateIntervention) {
            toast.error(
                'Seul un Intervenant / ATSEP peut saisir un relevé.'
            );
            return;
        }

        setCorrectionMode(false);
        setReadOnlyReading(false);
        setSelectedReading(null);

        setReadingForm({
            values: {},
            observation: '',
            annexes: []
        });

        setIsReadingModalOpen(true);
    };

    const openCorrectionReading = () => {
        /*
         * Seul Intervenant/ATSEP peut corriger.
         */
        if (!canOperateIntervention) {
            toast.error(
                'Seul un Intervenant / ATSEP peut modifier un relevé.'
            );
            return;
        }

        setCorrectionMode(true);
        setReadOnlyReading(false);

        if (latestReading) {
            setSelectedReading(
                latestReading
            );

            setReadingForm(
                buildReadingFormFromReading(
                    latestReading,
                    normalizedParameters
                )
            );
        }

        setIsReadingModalOpen(true);
    };

    const openReadingReadOnly = (
        targetReading = latestReading
    ) => {
        /*
         * Consultation autorisée aux trois rôles.
         */
        if (!canConsultIntervention) {
            toast.error(
                'Accès non autorisé.'
            );
            return;
        }

        if (targetReading) {
            setSelectedReading(
                targetReading
            );

            setReadingForm(
                buildReadingFormFromReading(
                    targetReading,
                    normalizedParameters
                )
            );
        }

        setCorrectionMode(false);
        setReadOnlyReading(true);
        setIsReadingModalOpen(true);
    };

    /* ==========================================================================
       DÉMARRER INTERVENTION
       ========================================================================== */

    const handleStartIntervention =
        async () => {
            /*
             * Protection frontend du rôle.
             */
            if (!canOperateIntervention) {
                toast.error(
                    'Seul un Intervenant / ATSEP peut démarrer une intervention.'
                );
                return;
            }

            try {
                setStartingIntervention(
                    true
                );

                await api.post(
                    `/interventions/${id}/start`
                );

                toast.success(
                    'Intervention démarrée.'
                );

                await fetchIntervention();
            } catch (error) {
                toast.error(
                    error.response?.data
                        ?.message ||
                        'Erreur au démarrage.'
                );
            } finally {
                setStartingIntervention(
                    false
                );
            }
        };

    /* ==========================================================================
       SAUVEGARDER RELEVÉ
       ========================================================================== */

    const handleSaveReading =
        async () => {
            /*
             * Protection frontend du rôle.
             */
            if (!canOperateIntervention) {
                toast.error(
                    'Seul un Intervenant / ATSEP peut enregistrer un relevé.'
                );
                return;
            }

            try {
                setSavingReading(true);

                const templateId =
                    intervention.template_id ||
                    assignedCanvas.id;

                const payload = {
                    template_id:
                        templateId,

                    canvas_id:
                        templateId,

                    values:
                        normalizeReadingValues(
                            readingForm.values
                        ),

                    commentaire:
                        readingForm.observation,

                    taken_at:
                        new Date().toISOString()
                };

                await api.post(
                    `/interventions/${id}/readings`,
                    payload
                );

                toast.success(
                    'Relevé sauvegardé.'
                );

                setIsReadingModalOpen(
                    false
                );

                await fetchIntervention();
            } catch (error) {
                toast.error(
                    error.response?.data
                        ?.message ||
                        'Erreur de sauvegarde.'
                );
            } finally {
                setSavingReading(false);
            }
        };

    /* ==========================================================================
       FINALISER INTERVENTION
       ========================================================================== */

    const handleCompleteIntervention =
        async () => {
            /*
             * Protection frontend du rôle.
             */
            if (!canOperateIntervention) {
                toast.error(
                    'Seul un Intervenant / ATSEP peut finaliser une intervention.'
                );
                return;
            }

            try {
                setCompletingIntervention(
                    true
                );

                await api.post(
                    `/interventions/${id}/complete`,
                    {
                        diagnostic:
                            intervention.diagnostic ||
                            '',

                        actions:
                            intervention.actions ||
                            '',

                        observations:
                            intervention.observations ||
                            ''
                    }
                );

                toast.success(
                    'Intervention finalisée.'
                );

                await fetchIntervention();
            } catch (error) {
                toast.error(
                    error.response?.data
                        ?.message ||
                        'Erreur de finalisation.'
                );
            } finally {
                setCompletingIntervention(
                    false
                );
            }
        };

    /* ==========================================================================
       LOADING
       ========================================================================== */

    if (loading) {
        return (
            <div className="intervention-detail loader-state">
                <Loader2
                    size={36}
                    className="spin text-blue"
                />

                <p>
                    Chargement de la fiche
                    d'intervention...
                </p>
            </div>
        );
    }

    if (!intervention) {
        return (
            <div className="intervention-detail loader-state">
                <AlertCircle
                    size={48}
                    className="text-red"
                />

                <h2>
                    Intervention introuvable
                </h2>

                <button
                    type="button"
                    className="btn-secondary-action"
                    onClick={() =>
                        navigate(-1)
                    }
                >
                    <ArrowLeft size={16} />
                    Retour à la liste
                </button>
            </div>
        );
    }

    /* ==========================================================================
       STATUTS
       ========================================================================== */

    const rawStatus =
        intervention.status;

    const currentStatus =
        normalizeStatus(rawStatus);

    const statusConfig =
        getStatusConfig(
            currentStatus
        );

    const StatusIcon =
        statusConfig.icon;

    const priorityConfig =
        getPriorityConfig(
            intervention.priority
        );

    /*
     * Une intervention peut être démarrée lorsqu'elle est :
     * - planifiée
     * - en attente
     * - en retard
     *
     * MAIS uniquement par Intervenant / ATSEP.
     */
    const isPending = [
        'en_attente',
        'planifiee',
        'en_retard'
    ].includes(currentStatus);

    const isInProgress =
        currentStatus ===
        'en_cours';

    const latestReadingStatus =
        normalizeStatus(
            latestReading?.validation_status
        );

    /*
     * IMPORTANT :
     *
     * canCorrectReading dépend maintenant
     * également du rôle.
     *
     * Donc :
     *
     * Intervenant/ATSEP :
     *     peut corriger si le statut du relevé
     *     le permet.
     *
     * Responsable/Admin :
     *     ne peut jamais corriger depuis
     *     cette page.
     */
    const canCorrectReading =
        canOperateIntervention &&
        !!latestReading &&
        [
            'rejete',
            'rejetee',
            'modifications_demandees',
            'valide'
        ].includes(
            latestReadingStatus
        );

    return (
        <div className="intervention-detail">

            {/* HEADER */}

            <header className="detail-header">
                <div className="header-left">

                    <button
                        type="button"
                        className="back-button"
                        onClick={() =>
                            navigate(-1)
                        }
                        title="Retour"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div>
                        <div className="page-breadcrumbs">
                            <span>
                                Interventions
                            </span>

                            <ChevronRight
                                size={12}
                            />

                            <span>
                                Détail #
                                {intervention.id}
                            </span>
                        </div>

                        <h1>
                            Fiche d'Intervention #
                            {intervention.id}
                        </h1>
                    </div>
                </div>

                <div className="header-actions">

                    <span
                        className={`status-badge ${statusConfig.class}`}
                    >
                        <StatusIcon size={14} />
                        {statusConfig.label}
                    </span>

                    <button
                        type="button"
                        className="btn-refresh"
                        onClick={() =>
                            fetchIntervention(
                                true
                            )
                        }
                        disabled={refreshing}
                    >
                        <RefreshCw
                            size={14}
                            className={
                                refreshing
                                    ? 'spin'
                                    : ''
                            }
                        />
                    </button>

                    {/* ======================================================
                        BOUTON DÉMARRER
                        Intervenant / ATSEP uniquement
                        ====================================================== */}

                    {canOperateIntervention &&
                        isPending && (
                            <button
                                type="button"
                                className="btn-primary-action"
                                onClick={
                                    handleStartIntervention
                                }
                                disabled={
                                    startingIntervention
                                }
                            >
                                {startingIntervention ? (
                                    <Loader2
                                        size={15}
                                        className="spin"
                                    />
                                ) : (
                                    <PlayCircle
                                        size={15}
                                    />
                                )}

                                Démarrer
                            </button>
                        )}

                    {/* ======================================================
                        BOUTON SAISIR RELEVÉ
                        Intervenant / ATSEP uniquement
                        ====================================================== */}

                    {canOperateIntervention &&
                        isInProgress &&
                        assignedCanvas && (
                            <button
                                type="button"
                                className="btn-secondary-action"
                                onClick={
                                    openNewReading
                                }
                            >
                                <ClipboardList
                                    size={15}
                                />
                                Saisir Relevé
                            </button>
                        )}

                    {/* ======================================================
                        BOUTON FINALISER
                        Intervenant / ATSEP uniquement
                        ====================================================== */}

                    {canOperateIntervention &&
                        isInProgress && (
                            <button
                                type="button"
                                className="btn-success-action"
                                onClick={
                                    handleCompleteIntervention
                                }
                                disabled={
                                    completingIntervention
                                }
                            >
                                {completingIntervention ? (
                                    <Loader2
                                        size={15}
                                        className="spin"
                                    />
                                ) : (
                                    <CheckCircle2
                                        size={15}
                                    />
                                )}

                                Finaliser
                            </button>
                        )}

                    {/* ======================================================
                        MODIFIER
                        CONSERVÉ EXACTEMENT COMME AVANT
                        ====================================================== */}

                    <button
                        type="button"
                        className="btn-edit"
                        onClick={() =>
                            navigate(
                                `/interventions/${intervention.id}/edit`
                            )
                        }
                    >
                        <Wrench size={14} />
                        Modifier
                    </button>
                </div>
            </header>

            {/* KPI BAR */}

            <div className="detail-summary-bar">

                <div className="summary-pill">
                    <div className="pill-icon">
                        <Wrench size={18} />
                    </div>

                    <div>
                        <span>
                            Équipement
                        </span>

                        <strong>
                            {equipmentName}
                        </strong>
                    </div>
                </div>

                <div className="summary-divider" />

                <div className="summary-pill">
                    <div className="pill-icon">
                        <Calendar size={18} />
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
                        <Clock size={18} />
                    </div>

                    <div>
                        <span>
                            Heure
                        </span>

                        <strong>
                            {intervention.scheduled_time ||
                                '—'}
                        </strong>
                    </div>
                </div>

                <div className="summary-divider" />

                <div className="summary-pill">
                    <div className="pill-icon">
                        <ShieldAlert
                            size={18}
                        />
                    </div>

                    <div>
                        <span>
                            Priorité
                        </span>

                        <strong
                            className={`priority-tag ${priorityConfig.class}`}
                        >
                            {
                                priorityConfig.label
                            }
                        </strong>
                    </div>
                </div>
            </div>

            {/* NAVIGATION TABS */}

            <div className="navigation-tabs">

                <button
                    className={`tab-btn ${
                        activeTab === 'general'
                            ? 'active'
                            : ''
                    }`}
                    onClick={() =>
                        setActiveTab(
                            'general'
                        )
                    }
                >
                    <Info size={16} />
                    Informations Générales
                </button>

                <button
                    className={`tab-btn ${
                        activeTab ===
                        'readings'
                            ? 'active'
                            : ''
                    }`}
                    onClick={() =>
                        setActiveTab(
                            'readings'
                        )
                    }
                >
                    <FileText size={16} />
                    Relevé & Historique (
                    {visibleReadings.length})
                </button>
            </div>

            {/* ==============================================================
                TAB 1 : INFORMATIONS GENERALES
                ============================================================== */}

            {activeTab === 'general' && (
                <div className="tab-content-grid">

                    <div className="detail-grid-compact">

                        <div className="detail-card-section">
                            <div className="card-section-header">
                                <div className="card-section-title">
                                    <Building2
                                        size={18}
                                    />

                                    <h3>
                                        Équipement &
                                        Affectation
                                    </h3>
                                </div>
                            </div>

                            <div className="card-section-body">
                                <div className="info-grid">

                                    <div className="info-item">
                                        <span className="info-label">
                                            Équipement
                                            Cible
                                        </span>

                                        <strong className="info-value">
                                            {
                                                equipmentName
                                            }
                                        </strong>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Type /
                                            Référence
                                        </span>

                                        <span className="info-value">
                                            {intervention
                                                .equipment
                                                ?.type ||
                                                '—'}{' '}
                                            {intervention
                                                .equipment
                                                ?.reference &&
                                                `(${intervention.equipment.reference})`}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Groupe
                                            d'affectation
                                        </span>

                                        <strong className="info-value">
                                            {groupName}
                                        </strong>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Technicien
                                            Référent
                                        </span>

                                        <strong className="info-value">
                                            <User
                                                size={
                                                    14
                                                }
                                                className="inline-icon"
                                            />{' '}
                                            {userName}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="detail-card-section">
                            <div className="card-section-header">
                                <div className="card-section-title">
                                    <Activity
                                        size={18}
                                    />

                                    <h3>
                                        Planification
                                        & Suivi
                                    </h3>
                                </div>
                            </div>

                            <div className="card-section-body">
                                <div className="info-grid">

                                    <div className="info-item">
                                        <span className="info-label">
                                            Type de
                                            maintenance
                                        </span>

                                        <strong className="info-value">
                                            {intervention.type ||
                                                '—'}
                                        </strong>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Durée
                                            Estimée
                                        </span>

                                        <span className="info-value">
                                            {intervention.duration
                                                ? `${intervention.duration} min`
                                                : '—'}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Date Limite
                                        </span>

                                        <span className="info-value">
                                            {formatDate(
                                                intervention.deadline
                                            )}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">
                                            Début Réel
                                        </span>

                                        <span className="info-value">
                                            {formatDateTime(
                                                intervention.started_at
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {intervention.description && (
                        <div className="detail-section-compact">
                            <div className="section-header-compact">
                                <Info size={16} />

                                <h2>
                                    Description /
                                    Instructions
                                    Métier
                                </h2>
                            </div>

                            <div className="description-content">
                                <p>
                                    {
                                        intervention.description
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ==============================================================
                TAB 2 : RELEVÉS & HISTORIQUE
                ============================================================== */}

            {activeTab === 'readings' && (
                <div className="tab-content-stack">

                    <div className="detail-section-compact">

                        <div className="section-header-compact">
                            <FileText size={16} />

                            <h2>
                                Modèle de Relevé
                                Rattaché
                            </h2>
                        </div>

                        {assignedCanvas ? (
                            <div className="reading-banner">

                                <div className="reading-banner-left">

                                    <div className="reading-banner-icon">
                                        <ClipboardList
                                            size={22}
                                        />
                                    </div>

                                    <div className="reading-banner-details">

                                        <div className="reading-banner-title">
                                            <h3>
                                                {
                                                    assignedCanvas.template_name ||
                                                    'Relevé Standard'
                                                }
                                            </h3>

                                            {assignedCanvas.template_type && (
                                                <span className="reading-badge-type">
                                                    {
                                                        assignedCanvas.template_type
                                                    }
                                                </span>
                                            )}
                                        </div>

                                        <div className="reading-banner-sub">
                                            <span>
                                                {
                                                    normalizedParameters.length
                                                }{' '}
                                                paramètres
                                                répertoriés
                                            </span>

                                            <span>
                                                •
                                            </span>

                                            <span>
                                                Fréquence :{' '}
                                                {assignedCanvas.frequency ||
                                                    'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="reading-banner-actions">

                                    {/* ==================================================
                                        SAISIR FORMULAIRE
                                        Intervenant / ATSEP uniquement
                                        ================================================== */}

                                    {canOperateIntervention &&
                                        isInProgress && (
                                            <button
                                                type="button"
                                                className="btn-open-reading"
                                                onClick={
                                                    openNewReading
                                                }
                                            >
                                                <Eye
                                                    size={15}
                                                />
                                                Saisir le
                                                formulaire
                                                <ExternalLink
                                                    size={
                                                        13
                                                    }
                                                />
                                            </button>
                                        )}

                                    {/* ==================================================
                                        MODIFIER LES DONNÉES
                                        Intervenant / ATSEP uniquement
                                        ================================================== */}

                                    {canOperateIntervention &&
                                        canCorrectReading && (
                                            <button
                                                type="button"
                                                className="btn-open-reading warning"
                                                onClick={
                                                    openCorrectionReading
                                                }
                                            >
                                                <RotateCcw
                                                    size={
                                                        15
                                                    }
                                                />
                                                Modifier les
                                                données
                                                <ExternalLink
                                                    size={
                                                        13
                                                    }
                                                />
                                            </button>
                                        )}

                                    {/* ==================================================
                                        CONSULTER
                                        Intervenant / Responsable / Admin
                                        ================================================== */}

                                    {!isInProgress &&
                                        !canCorrectReading &&
                                        canConsultIntervention && (
                                            <button
                                                type="button"
                                                className="btn-open-reading"
                                                onClick={() =>
                                                    openReadingReadOnly(
                                                        latestReading
                                                    )
                                                }
                                            >
                                                <Eye
                                                    size={
                                                        15
                                                    }
                                                />
                                                Consulter
                                                <ExternalLink
                                                    size={
                                                        13
                                                    }
                                                />
                                            </button>
                                        )}
                                </div>
                            </div>
                        ) : (
                            <div className="no-assigned-reading">
                                <ClipboardList
                                    size={22}
                                />

                                <span>
                                    Aucun formulaire
                                    de relevé n'est
                                    configuré pour
                                    cette
                                    intervention.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* HISTORIQUE */}

                    {visibleReadings.length >
                        0 && (
                        <div className="detail-section-compact">

                            <div className="section-header-compact">
                                <History
                                    size={16}
                                />

                                <h2>
                                    Historique des
                                    Relevés
                                    Effectués
                                </h2>
                            </div>

                            <div className="reading-history">

                                {[
                                    ...visibleReadings
                                ]
                                    .sort(
                                        (a, b) =>
                                            getReadingTime(
                                                b
                                            ) -
                                            getReadingTime(
                                                a
                                            )
                                    )
                                    .map(
                                        (
                                            reading,
                                            index
                                        ) => {
                                            const rStatus =
                                                getStatusConfig(
                                                    reading.validation_status
                                                );

                                            const RIcon =
                                                rStatus.icon;

                                            const isValidated =
                                                [
                                                    'valide',
                                                    'validee',
                                                    'terminee'
                                                ].includes(
                                                    normalizeStatus(
                                                        reading.validation_status
                                                    )
                                                );

                                            return (
                                                <div
                                                    className="reading-history-item clickable"
                                                    key={
                                                        reading.id ||
                                                        index
                                                    }
                                                    onClick={() =>
                                                        openReadingReadOnly(
                                                            reading
                                                        )
                                                    }
                                                    title="Cliquer pour voir les valeurs saisies"
                                                >
                                                    <div className="reading-history-main">

                                                        <div className="reading-history-icon">
                                                            <FileText
                                                                size={
                                                                    17
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
                                                                Saisi le{' '}
                                                                {formatDateTime(
                                                                    reading.taken_at ||
                                                                        reading.created_at
                                                                )}
                                                            </span>

                                                            {reading.validation_commentaire && (
                                                                <p className="history-comment">
                                                                    "
                                                                    {
                                                                        reading.validation_commentaire
                                                                    }
                                                                    "
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="reading-history-right">

                                                        <span
                                                            className={`status-badge ${rStatus.class}`}
                                                        >
                                                            <RIcon
                                                                size={
                                                                    14
                                                                }
                                                            />

                                                            {
                                                                rStatus.label
                                                            }
                                                        </span>

                                                        {isValidated && (
                                                            <button
                                                                type="button"
                                                                className="btn-excel-export-sm"
                                                                title="Exporter en Excel"
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();

                                                                    exportReadingToExcel(
                                                                        reading
                                                                    );
                                                                }}
                                                            >
                                                                <Download
                                                                    size={
                                                                        13
                                                                    }
                                                                />
                                                                Excel
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="btn-open-reading-icon"
                                                        >
                                                            <Eye
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODALE */}

            {isReadingModalOpen &&
                assignedCanvas && (
                    <ReadingModal
                        assignedCanvas={
                            assignedCanvas
                        }
                        intervention={
                            intervention
                        }
                        normalizedParameters={
                            normalizedParameters
                        }
                        monitorCount={
                            monitorCount
                        }
                        readingForm={
                            readingForm
                        }
                        onValueChange={
                            handleReadingChange
                        }
                        onObservationChange={
                            handleObservationChange
                        }
                        onSave={
                            handleSaveReading
                        }
                        onClose={() => {
                            setIsReadingModalOpen(
                                false
                            );

                            setCorrectionMode(
                                false
                            );

                            setReadOnlyReading(
                                false
                            );
                        }}
                        saving={
                            savingReading
                        }
                        equipmentName={
                            equipmentName
                        }
                        correctionMode={
                            correctionMode
                        }
                        readOnly={
                            readOnlyReading
                        }
                        activeReading={
                            selectedReading ||
                            latestReading
                        }
                        onExportExcel={
                            exportReadingToExcel
                        }
                    />
                )}
        </div>
    );
};

export default InterventionDetail;