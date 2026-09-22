import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import {
    X,
    RefreshCw,
    Save,
    Send,
    AlertTriangle,
    CheckCircle,
    FileText,
} from 'lucide-react';
import './ReadingForm.css';

const ReadingForm = ({
    interventionId,
    equipmentId,
    onClose,
    onSave,
}) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [intervention, setIntervention] = useState(null);
    const [template, setTemplate] = useState(null);

    const [values, setValues] = useState({});
    const [globalComment, setGlobalComment] = useState('');
    const [generalState, setGeneralState] = useState('normal');

    useEffect(() => {
        fetchIntervention();
    }, [interventionId]);

    /**
     * Charger l'intervention et son modèle de relevé
     */
    const fetchIntervention = async () => {
        setLoading(true);

        try {
            const response = await api.get(
                `/interventions/${interventionId}`
            );

            const data = response.data;

            setIntervention(data);

            /*
             * Le modèle est directement lié
             * à l'intervention.
             */
            const readingTemplate = data?.template;

            if (!readingTemplate) {
                toast.error(
                    'Aucun modèle de relevé n’est associé à cette intervention.'
                );

                setTemplate(null);
                return;
            }

            setTemplate(readingTemplate);

            /*
             * Initialiser les champs du relevé
             */
            initializeValues(
                readingTemplate.parameters || []
            );

            /*
             * Si un relevé existe déjà,
             * récupérer ses données.
             */
            if (
                Array.isArray(data.readings) &&
                data.readings.length > 0
            ) {
                const existingReading = data.readings[0];

                if (existingReading.values) {
                    setValues(existingReading.values);
                }

                if (existingReading.commentaire) {
                    setGlobalComment(
                        existingReading.commentaire
                    );
                }
            }
        } catch (error) {
            console.error(
                'Erreur chargement intervention :',
                error
            );

            toast.error(
                'Impossible de charger le relevé.'
            );
        } finally {
            setLoading(false);
        }
    };

    /**
     * Initialiser la structure des valeurs.
     *
     * Exemple :
     *
     * {
     *     "1": {
     *         monitor_1: "",
     *         monitor_2: ""
     *     }
     * }
     */
    const initializeValues = (parameters) => {
        const initialValues = {};

        parameters.forEach((parameter, index) => {
            const parameterId =
                parameter.id ?? index;

            const monitorCount =
                Number(parameter.monitors || 1);

            initialValues[parameterId] = {};

            for (
                let monitor = 1;
                monitor <= monitorCount;
                monitor++
            ) {
                initialValues[parameterId][
                    `monitor_${monitor}`
                ] = '';
            }
        });

        setValues(initialValues);
    };

    /**
     * Modifier une valeur de moniteur
     */
    const handleValueChange = (
        parameterId,
        monitor,
        value
    ) => {
        setValues((previous) => ({
            ...previous,

            [parameterId]: {
                ...(previous[parameterId] || {}),

                [`monitor_${monitor}`]: value,
            },
        }));
    };

    /**
     * Vérifier automatiquement
     * si une valeur est dans la plage normale.
     */
    const getValueStatus = (
        parameter,
        value
    ) => {
        if (
            value === undefined ||
            value === null ||
            value === ''
        ) {
            return 'empty';
        }

        const numericValue = Number(value);

        if (Number.isNaN(numericValue)) {
            return 'unknown';
        }

        const min =
            parameter.normal_min !== '' &&
            parameter.normal_min !== null &&
            parameter.normal_min !== undefined
                ? Number(parameter.normal_min)
                : null;

        const max =
            parameter.normal_max !== '' &&
            parameter.normal_max !== null &&
            parameter.normal_max !== undefined
                ? Number(parameter.normal_max)
                : null;

        if (
            min !== null &&
            !Number.isNaN(min) &&
            numericValue < min
        ) {
            return 'anomaly';
        }

        if (
            max !== null &&
            !Number.isNaN(max) &&
            numericValue > max
        ) {
            return 'anomaly';
        }

        return 'normal';
    };

    /**
     * Vérifier les champs obligatoires
     */
    const validateValues = () => {
        if (!template) {
            toast.error(
                'Aucun modèle de relevé disponible.'
            );

            return false;
        }

        const parameters =
            template.parameters || [];

        for (
            let index = 0;
            index < parameters.length;
            index++
        ) {
            const parameter =
                parameters[index];

            const parameterId =
                parameter.id ?? index;

            const monitorCount =
                Number(parameter.monitors || 1);

            for (
                let monitor = 1;
                monitor <= monitorCount;
                monitor++
            ) {
                const value =
                    values?.[parameterId]?.[
                        `monitor_${monitor}`
                    ];

                if (
                    value === undefined ||
                    value === null ||
                    String(value).trim() === ''
                ) {
                    toast.error(
                        `Veuillez renseigner "${parameter.name}" - Moniteur ${monitor}.`
                    );

                    return false;
                }
            }
        }

        return true;
    };

    /**
     * Préparer les données envoyées
     * au backend Laravel.
     */
    const buildPayload = () => {
        return {
            values,
            commentaire: globalComment,
        };
    };

    /**
     * Enregistrer
     *
     * Attention :
     * ton endpoint actuel transmet le relevé
     * avec validation_status = en_attente.
     */
    const handleSaveDraft = async () => {
        setSubmitting(true);

        try {
            await api.post(
                `/interventions/${interventionId}/readings`,
                buildPayload()
            );

            toast.success(
                'Relevé enregistré.'
            );

            if (onSave) {
                await onSave();
            }
        } catch (error) {
            console.error(
                'Erreur sauvegarde relevé :',
                error
            );

            toast.error(
                error?.response?.data?.message ||
                'Erreur lors de la sauvegarde du relevé.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Transmettre le relevé au responsable
     */
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateValues()) {
            return;
        }

        setSubmitting(true);

        try {
            await api.post(
                `/interventions/${interventionId}/readings`,
                buildPayload()
            );

            toast.success(
                'Relevé transmis au responsable avec succès.'
            );

            if (onSave) {
                await onSave();
            }

            onClose();
        } catch (error) {
            console.error(
                'Erreur transmission relevé :',
                error
            );

            toast.error(
                error?.response?.data?.message ||
                'Erreur lors de la transmission du relevé.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Récupérer une valeur du header
     */
    const getHeaderValue = (
        key,
        fallback = ''
    ) => {
        return (
            template?.header?.[key] ??
            fallback
        );
    };

    /*
     * Chargement
     */
    if (loading) {
        return (
            <div className="modal-overlay">
                <div className="reading-modal loading-modal">

                    <RefreshCw
                        size={40}
                        className="spin"
                    />

                    <p>
                        Chargement de la fiche de relevé...
                    </p>

                </div>
            </div>
        );
    }

    /*
     * Aucun template
     */
    if (!template) {
        return (
            <div
                className="modal-overlay"
                onClick={onClose}
            >
                <div
                    className="reading-modal"
                    onClick={(e) =>
                        e.stopPropagation()
                    }
                >

                    <div className="modal-header">

                        <div>
                            <h2>
                                Relevé technique
                            </h2>
                        </div>

                        <button
                            type="button"
                            className="modal-close"
                            onClick={onClose}
                        >
                            <X size={20} />
                        </button>

                    </div>

                    <div className="reading-empty">

                        <AlertTriangle
                            size={42}
                        />

                        <h3>
                            Aucun modèle de relevé
                        </h3>

                        <p>
                            Cette intervention ne possède
                            aucun modèle de relevé associé.
                        </p>

                    </div>

                </div>
            </div>
        );
    }

    const parameters =
        template.parameters || [];

    const signatures =
        template.signatures || [];

    const annexes =
        template.annexes || [];

    const today =
        new Date().toLocaleDateString('fr-FR');

    /*
     * Nombre maximum de moniteurs
     */
    const maxMonitors = Math.max(
        ...parameters.map(
            (parameter) =>
                Number(parameter.monitors || 1)
        ),
        1
    );

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
        >

            <div
                className="reading-modal professional-reading-modal"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >

                {/* =========================
                    HEADER
                ========================== */}

                <div className="modal-header reading-modal-header">

                    <div className="reading-header-title">

                        <FileText size={24} />

                        <div>

                            <h2>
                                Fiche de relevé technique
                            </h2>

                            <span>
                                Intervention #
                                {interventionId}
                            </span>

                        </div>

                    </div>

                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>

                </div>

                <form
                    onSubmit={handleSubmit}
                    className="reading-form"
                >

                    <div className="reading-form-scroll">

                        {/* =========================
                            EN-TÊTE OFFICIEL
                        ========================== */}

                        <section className="official-header">

                            <div className="official-header-left">

                                <strong>
                                    OFFICE NATIONAL
                                    DES AÉROPORTS
                                </strong>

                                <span>
                                    DIVISION TECHNIQUE
                                    NAVIGATION
                                </span>

                                <span>
                                    Aéroport FES SAISS
                                </span>

                            </div>

                            <div className="official-header-center">

                                <h1>
                                    {template.template_name}
                                </h1>

                                <span>
                                    {template.template_type ||
                                        'RELEVÉ TECHNIQUE'}
                                </span>

                            </div>

                            <div className="official-header-right">

                                <div>
                                    <strong>
                                        Date
                                    </strong>

                                    <span>
                                        {getHeaderValue(
                                            'date',
                                            today
                                        )}
                                    </span>
                                </div>

                                <div>
                                    <strong>
                                        Code site
                                    </strong>

                                    <span>
                                        {getHeaderValue(
                                            'code',
                                            '-'
                                        )}
                                    </span>
                                </div>

                                <div>
                                    <strong>
                                        Réf. envoi
                                    </strong>

                                    <span>
                                        {getHeaderValue(
                                            'ref_envoi',
                                            '-'
                                        )}
                                    </span>
                                </div>

                            </div>

                        </section>

                        {/* =========================
                            INFORMATIONS ÉQUIPEMENT
                        ========================== */}

                        <section className="reading-section">

                            <div className="section-title">

                                <span>
                                    1
                                </span>

                                <h3>
                                    Informations sur
                                    l'équipement
                                </h3>

                            </div>

                            <div className="equipment-info-grid">

                                <div className="info-item">

                                    <label>
                                        Équipement
                                    </label>

                                    <strong>
                                        {intervention
                                            ?.equipment
                                            ?.name ||
                                            'N/A'}
                                    </strong>

                                </div>

                                <div className="info-item">

                                    <label>
                                        Type
                                    </label>

                                    <strong>
                                        {intervention
                                            ?.equipment
                                            ?.type ||
                                            '-'}
                                    </strong>

                                </div>

                                <div className="info-item">

                                    <label>
                                        Fréquence
                                    </label>

                                    <strong>
                                        {template.frequency ||
                                            '-'}
                                    </strong>

                                </div>

                                <div className="info-item">

                                    <label>
                                        Intervention
                                    </label>

                                    <strong>
                                        #{interventionId}
                                    </strong>

                                </div>

                            </div>

                            {/* État général */}

                            <div className="general-state">

                                <label>
                                    État général de
                                    l'équipement
                                </label>

                                <div className="state-options">

                                    <label
                                        className={
                                            generalState ===
                                            'normal'
                                                ? 'selected'
                                                : ''
                                        }
                                    >

                                        <input
                                            type="radio"
                                            name="general_state"
                                            value="normal"
                                            checked={
                                                generalState ===
                                                'normal'
                                            }
                                            onChange={(e) =>
                                                setGeneralState(
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <CheckCircle
                                            size={17}
                                        />

                                        Normal

                                    </label>

                                    <label
                                        className={
                                            generalState ===
                                            'anomalie'
                                                ? 'selected'
                                                : ''
                                        }
                                    >

                                        <input
                                            type="radio"
                                            name="general_state"
                                            value="anomalie"
                                            checked={
                                                generalState ===
                                                'anomalie'
                                            }
                                            onChange={(e) =>
                                                setGeneralState(
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <AlertTriangle
                                            size={17}
                                        />

                                        Anomalie

                                    </label>

                                    <label
                                        className={
                                            generalState ===
                                            'hors_service'
                                                ? 'selected'
                                                : ''
                                        }
                                    >

                                        <input
                                            type="radio"
                                            name="general_state"
                                            value="hors_service"
                                            checked={
                                                generalState ===
                                                'hors_service'
                                            }
                                            onChange={(e) =>
                                                setGeneralState(
                                                    e.target.value
                                                )
                                            }
                                        />

                                        Hors service

                                    </label>

                                </div>

                            </div>

                        </section>

                        {/* =========================
                            PARAMÈTRES
                        ========================== */}

                        <section className="reading-section">

                            <div className="section-title">

                                <span>
                                    2
                                </span>

                                <h3>
                                    Relevé des paramètres
                                </h3>

                            </div>

                            <div className="reading-table-container">

                                <table className="professional-reading-table">

                                    <thead>

                                        <tr>

                                            <th>
                                                Paramètre
                                            </th>

                                            <th>
                                                Unité
                                            </th>

                                            {maxMonitors >= 1 && (
                                                <th>
                                                    Moniteur 1
                                                </th>
                                            )}

                                            {maxMonitors >= 2 && (
                                                <th>
                                                    Moniteur 2
                                                </th>
                                            )}

                                            {maxMonitors >= 3 && (
                                                <th>
                                                    Moniteur 3
                                                </th>
                                            )}

                                            <th>
                                                Tolérance
                                            </th>

                                            <th>
                                                État
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {parameters.map(
                                            (
                                                parameter,
                                                index
                                            ) => {

                                                const parameterId =
                                                    parameter.id ??
                                                    index;

                                                const monitorCount =
                                                    Number(
                                                        parameter.monitors ||
                                                        1
                                                    );

                                                const parameterValues =
                                                    values?.[
                                                        parameterId
                                                    ] || {};

                                                const hasAnomaly =
                                                    Object.values(
                                                        parameterValues
                                                    ).some(
                                                        (
                                                            value
                                                        ) =>
                                                            getValueStatus(
                                                                parameter,
                                                                value
                                                            ) ===
                                                            'anomaly'
                                                    );

                                                return (
                                                    <tr
                                                        key={
                                                            parameterId
                                                        }
                                                    >

                                                        <td className="parameter-name">

                                                            <strong>
                                                                {
                                                                    parameter.name
                                                                }
                                                            </strong>

                                                        </td>

                                                        <td>
                                                            {
                                                                parameter.unit ||
                                                                '-'
                                                            }
                                                        </td>

                                                        {[
                                                            1,
                                                            2,
                                                            3,
                                                        ].map(
                                                            (
                                                                monitor
                                                            ) => {

                                                                if (
                                                                    monitor >
                                                                    monitorCount
                                                                ) {
                                                                    return (
                                                                        <td
                                                                            key={
                                                                                monitor
                                                                            }
                                                                            className="not-applicable"
                                                                        >
                                                                            —
                                                                        </td>
                                                                    );
                                                                }

                                                                const currentValue =
                                                                    values?.[
                                                                        parameterId
                                                                    ]?.[
                                                                        `monitor_${monitor}`
                                                                    ] || '';

                                                                const status =
                                                                    getValueStatus(
                                                                        parameter,
                                                                        currentValue
                                                                    );

                                                                return (
                                                                    <td
                                                                        key={
                                                                            monitor
                                                                        }
                                                                        className={
                                                                            status ===
                                                                            'anomaly'
                                                                                ? 'value-anomaly'
                                                                                : ''
                                                                        }
                                                                    >

                                                                        <input
                                                                            type="text"
                                                                            value={
                                                                                currentValue
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                handleValueChange(
                                                                                    parameterId,
                                                                                    monitor,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            placeholder="Valeur"
                                                                            className={
                                                                                status ===
                                                                                'anomaly'
                                                                                    ? 'input-anomaly'
                                                                                    : ''
                                                                            }
                                                                        />

                                                                    </td>
                                                                );
                                                            }
                                                        )}

                                                        <td className="tolerance-cell">

                                                            {
                                                                parameter.tolerance ||
                                                                '-'
                                                            }

                                                            {parameter.normal_min !==
                                                                '' &&
                                                                parameter.normal_min !==
                                                                    null &&
                                                                parameter.normal_min !==
                                                                    undefined && (
                                                                    <small>
                                                                        Normal :
                                                                        {' '}
                                                                        {
                                                                            parameter.normal_min
                                                                        }

                                                                        {parameter.normal_max !==
                                                                            '' &&
                                                                            parameter.normal_max !==
                                                                                null &&
                                                                            parameter.normal_max !==
                                                                                undefined &&
                                                                            ` → ${parameter.normal_max}`}
                                                                    </small>
                                                                )}

                                                        </td>

                                                        <td className="parameter-status">

                                                            {hasAnomaly ? (
                                                                <span className="status-anomaly">

                                                                    <AlertTriangle
                                                                        size={
                                                                            15
                                                                        }
                                                                    />

                                                                    Anomalie

                                                                </span>
                                                            ) : (
                                                                <span className="status-normal">

                                                                    <CheckCircle
                                                                        size={
                                                                            15
                                                                        }
                                                                    />

                                                                    Normal

                                                                </span>
                                                            )}

                                                        </td>

                                                    </tr>
                                                );
                                            }
                                        )}

                                    </tbody>

                                </table>

                            </div>

                            <div className="tolerance-note">

                                <AlertTriangle
                                    size={16}
                                />

                                <span>
                                    Les valeurs hors
                                    des plages normales
                                    sont automatiquement
                                    signalées.
                                </span>

                            </div>

                        </section>

                        {/* =========================
                            OBSERVATIONS
                        ========================== */}

                        <section className="reading-section">

                            <div className="section-title">

                                <span>
                                    3
                                </span>

                                <h3>
                                    Observation
                                </h3>

                            </div>

                            <textarea
                                className="observation-textarea"
                                value={globalComment}
                                onChange={(e) =>
                                    setGlobalComment(
                                        e.target.value
                                    )
                                }
                                rows={5}
                                placeholder="Saisissez les observations, anomalies constatées ou informations complémentaires..."
                            />

                        </section>

                        {/* =========================
                            ANNEXES
                        ========================== */}

                        {annexes.length > 0 && (
                            <section className="reading-section">

                                <div className="section-title">

                                    <span>
                                        4
                                    </span>

                                    <h3>
                                        Annexes
                                    </h3>

                                </div>

                                <div className="annexes-list">

                                    {annexes.map(
                                        (
                                            annex,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    index
                                                }
                                                className="annex-item"
                                            >

                                                <FileText
                                                    size={17}
                                                />

                                                <span>
                                                    {annex}
                                                </span>

                                            </div>
                                        )
                                    )}

                                </div>

                            </section>
                        )}

                        {/* =========================
                            VALIDATION
                        ========================== */}

                        <section className="reading-section validation-section">

                            <div className="section-title">

                                <span>
                                    {annexes.length > 0
                                        ? '5'
                                        : '4'}
                                </span>

                                <h3>
                                    Validation
                                </h3>

                            </div>

                            <div className="signature-grid">

                                {signatures.length > 0 ? (
                                    signatures.map(
                                        (
                                            signature,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    index
                                                }
                                                className="signature-box"
                                            >

                                                <strong>
                                                    {
                                                        signature
                                                    }
                                                </strong>

                                                <div className="signature-space">
                                                    Signature
                                                </div>

                                                <div className="signature-date">
                                                    Date :
                                                    ____ / ____ / ______
                                                </div>

                                            </div>
                                        )
                                    )
                                ) : (
                                    <>
                                        <div className="signature-box">

                                            <strong>
                                                Électroniciens
                                                de la
                                                Sécurité
                                                Aérienne
                                            </strong>

                                            <div className="signature-space">
                                                Signature
                                            </div>

                                            <div className="signature-date">
                                                Date :
                                                ____ / ____ / ______
                                            </div>

                                        </div>

                                        <div className="signature-box">

                                            <strong>
                                                Responsable
                                                technique
                                            </strong>

                                            <div className="signature-space">
                                                Signature
                                            </div>

                                            <div className="signature-date">
                                                Date :
                                                ____ / ____ / ______
                                            </div>

                                        </div>

                                        <div className="signature-box">

                                            <strong>
                                                Chef de
                                                Service
                                                Radar &
                                                Radionavigation
                                            </strong>

                                            <div className="signature-space">
                                                Signature
                                            </div>

                                            <div className="signature-date">
                                                Date :
                                                ____ / ____ / ______
                                            </div>

                                        </div>
                                    </>
                                )}

                            </div>

                        </section>

                    </div>

                    {/* =========================
                        ACTIONS
                    ========================== */}

                    <div className="modal-actions reading-actions">

                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Annuler
                        </button>

                        <button
                            type="button"
                            className="btn-draft"
                            onClick={
                                handleSaveDraft
                            }
                            disabled={submitting}
                        >
                            <Save size={17} />

                            {submitting
                                ? 'Enregistrement...'
                                : 'Enregistrer'}
                        </button>

                        <button
                            type="submit"
                            className="btn-submit-reading"
                            disabled={submitting}
                        >
                            <Send size={17} />

                            {submitting
                                ? 'Transmission...'
                                : 'Transmettre au responsable'}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
};

export default ReadingForm;