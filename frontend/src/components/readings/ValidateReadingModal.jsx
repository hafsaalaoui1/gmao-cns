import React, { useMemo, useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import {
    X,
    CheckCircle,
    XCircle,
    MessageSquare,
    Calendar,
    User,
    Wrench,
    ClipboardList
} from 'lucide-react';
import './ValidateReadingModal.css';

/* ==========================================================================
   VALIDATE READING MODAL
   ========================================================================== */

const ValidateReadingModal = ({
    reading,
    onClose,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [commentaire, setCommentaire] = useState('');

    /* ==========================================================================
       TEMPLATE
       ========================================================================== */

    const template = reading?.template || {};

    /* ==========================================================================
       UTILITAIRES DE PARSING
       ========================================================================== */

    const parseJson = (value, fallback) => {
        if (value === undefined || value === null) {
            return fallback;
        }

        if (typeof value !== 'string') {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.error('Erreur parsing JSON :', error);
            return fallback;
        }
    };

    /* ==========================================================================
       VALEURS DU RELEVÉ
       ========================================================================== */

    const values = useMemo(() => {
        let data = parseJson(reading?.values, {});

        if (Array.isArray(data)) {
            const result = {};
            data.forEach((value, index) => {
                result[String(index)] = value;
            });
            return result;
        }

        if (data && typeof data === 'object') {
            return data;
        }

        return {};
    }, [reading]);

    /* ==========================================================================
       ENTRÉES DE VALEURS SIMPLES
       ========================================================================== */

    const valueEntries = useMemo(() => {
        return Object.entries(values).filter(
            ([key, value]) => {
                if (key === '_annexes' || key === 'annexes') {
                    return false;
                }
                return value !== undefined && value !== null && value !== '';
            }
        );
    }, [values]);

    /* ==========================================================================
       PARAMÈTRES DU TEMPLATE (CORRIGÉ & ROBUSTE)
       ========================================================================== */

    const parameters = useMemo(() => {
        let rawParams = template?.parameters || template?.params || reading?.parameters;
        let params = parseJson(rawParams, []);

        if (params && typeof params === 'object' && !Array.isArray(params)) {
            if (Array.isArray(params.parameters)) {
                params = params.parameters;
            } else if (Array.isArray(params.data)) {
                params = params.data;
            }
        }

        let parsedList = Array.isArray(params) ? params : [];

        // Fallback dynamique si le modèle ne transmet pas la liste officielle des paramètres
        if (parsedList.length === 0 && valueEntries.length > 0) {
            const detectedKeys = new Set();
            valueEntries.forEach(([key]) => {
                const cleanKey = key.replace(/(?:_monitor|_moniteur)?_\d+$/i, '');
                detectedKeys.add(cleanKey);
            });

            return Array.from(detectedKeys).map((key) => ({
                id: key,
                name: key.replace(/_/g, ' ').toUpperCase(),
                unit: '—'
            }));
        }

        return parsedList;
    }, [template, reading, valueEntries]);

    /* ==========================================================================
       FORMAT DATES
       ========================================================================== */

    const formatDate = (date) => {
        if (!date) return '—';

        try {
            const parsed = new Date(date);
            if (Number.isNaN(parsed.getTime())) return '—';

            return parsed.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return '—';
        }
    };

    const formatDateTime = (date) => {
        if (!date) return '—';

        try {
            const parsed = new Date(date);
            if (Number.isNaN(parsed.getTime())) return '—';

            return parsed.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '—';
        }
    };

    /* ==========================================================================
       FRÉQUENCE
       ========================================================================== */

    const getFrequencyLabel = (frequency) => {
        const labels = {
            quotidienne: 'Quotidienne',
            hebdomadaire: 'Hebdomadaire',
            mensuelle: 'Mensuelle',
            trimestrielle: 'Trimestrielle',
            semestrielle: 'Semestrielle',
            annuelle: 'Annuelle'
        };

        return labels[frequency] || frequency || '—';
    };

    /* ==========================================================================
       ÉQUIPEMENT
       ========================================================================== */

    const getEquipmentName = () => {
        return reading?.equipment?.name || reading?.equipment?.nom || '—';
    };

    const getEquipmentReference = () => {
        return reading?.equipment?.reference || reading?.equipment?.code || reading?.equipment?.ref || '—';
    };

    /* ==========================================================================
       INTERVENANT
       ========================================================================== */

    const getIntervenantName = () => {
        if (reading?.takenBy?.name) return reading.takenBy.name;
        if (reading?.takenBy?.full_name) return reading.takenBy.full_name;

        if (reading?.taken_by && typeof reading.taken_by === 'object') {
            return reading.taken_by.name || reading.taken_by.full_name || '—';
        }

        if (typeof reading?.taken_by === 'string') {
            return reading.taken_by;
        }

        return '—';
    };

    /* ==========================================================================
       NORMALISATION DES CLÉS
       ========================================================================== */

    const normalizeKey = (value) => {
        if (value === undefined || value === null) return '';

        return String(value)
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_')
            .replace(/-/g, '_');
    };

    /* ==========================================================================
       TEST VALEUR
       ========================================================================== */

    const hasValue = (value) => {
        return value !== undefined && value !== null && value !== '';
    };

    /* ==========================================================================
       NOMBRE DE MONITEURS
       ========================================================================== */

    const monitorCount = useMemo(() => {
        if (!parameters.length) return 1;

        const counts = parameters.map((parameter) => {
            const count = Number(
                parameter?.monitors ??
                parameter?.monitor_count ??
                parameter?.nb_monitors ??
                parameter?.nombre_moniteurs ??
                1
            );

            return (Number.isFinite(count) && count > 0) ? count : 1;
        });

        return Math.max(...counts);
    }, [parameters]);

    /* ==========================================================================
       RECHERCHE EXACTE D'UNE CLÉ
       ========================================================================== */

    const findExactValue = (keys) => {
        for (const key of keys) {
            if (key === undefined || key === null) continue;
            const stringKey = String(key);

            if (Object.prototype.hasOwnProperty.call(values, stringKey) && hasValue(values[stringKey])) {
                return values[stringKey];
            }
        }
        return undefined;
    };

    /* ==========================================================================
       RECHERCHE NORMALISÉE
       ========================================================================== */

    const findNormalizedValue = (keys) => {
        const normalizedKeys = keys
            .filter(key => key !== undefined && key !== null)
            .map(normalizeKey);

        if (!normalizedKeys.length) return undefined;

        for (const [storedKey, storedValue] of Object.entries(values)) {
            if (!hasValue(storedValue)) continue;

            const normalizedStoredKey = normalizeKey(storedKey);

            if (normalizedKeys.includes(normalizedStoredKey)) {
                return storedValue;
            }
        }

        return undefined;
    };

    /* ==========================================================================
       CLÉS QUI REPRÉSENTENT UN MONITEUR
       ========================================================================== */

    const isMonitorKey = (key) => {
        const normalized = normalizeKey(key);
        return (
            normalized.includes('_monitor_') ||
            normalized.includes('_moniteur_') ||
            normalized.includes('_monitor') ||
            normalized.includes('_moniteur')
        );
    };

    const getMonitorNumberFromKey = (key) => {
        const normalized = normalizeKey(key);
        const match = normalized.match(/(?:monitor|moniteur)_?(\d+)$/);
        return match ? Number(match[1]) : null;
    };

    const measurementEntries = useMemo(() => {
        return valueEntries.filter(([key]) => isMonitorKey(key));
    }, [valueEntries]);

    const getValueByStoredPosition = (parameterIndex, monitorIndex) => {
        const monitorNumber = monitorIndex + 1;
        const position = parameterIndex + 1;

        const possibleKeys = [
            `${position}_monitor_${monitorNumber}`,
            `${position}_moniteur_${monitorNumber}`,
            `${position}_monitor${monitorNumber}`,
            `${position}_moniteur${monitorNumber}`,
            `${position}_${monitorNumber}`
        ];

        const exactValue = findExactValue(possibleKeys);
        if (hasValue(exactValue)) return exactValue;

        const normalizedValue = findNormalizedValue(possibleKeys);
        if (hasValue(normalizedValue)) return normalizedValue;

        const monitorEntries = measurementEntries.filter(([key]) => {
            const keyMonitor = getMonitorNumberFromKey(key);
            if (keyMonitor !== null) {
                return keyMonitor === monitorNumber;
            }
            return true;
        });

        if (monitorEntries[parameterIndex]) {
            return monitorEntries[parameterIndex][1];
        }

        return undefined;
    };

    /* ==========================================================================
       VALEUR D'UN PARAMÈTRE
       ========================================================================== */

    const getParameterValue = (parameter, monitorIndex, parameterIndex) => {
        if (!parameter) return '—';

        const parameterId = parameter.id ?? parameter.parameter_id ?? parameter.key ?? parameter.code;
        const parameterName = parameter.name ?? parameter.label ?? parameter.nom ?? parameter.title;
        const monitorNumber = monitorIndex + 1;

        const idKeys = [];
        if (parameterId !== undefined) {
            idKeys.push(
                `${parameterId}_monitor_${monitorNumber}`,
                `${parameterId}_moniteur_${monitorNumber}`,
                `${parameterId}_monitor${monitorNumber}`,
                `${parameterId}_moniteur${monitorNumber}`,
                `${parameterId}_${monitorNumber}`
            );
        }

        let value = findExactValue(idKeys);
        if (hasValue(value)) return value;

        value = findNormalizedValue(idKeys);
        if (hasValue(value)) return value;

        const nameKeys = [];
        if (parameterName !== undefined) {
            nameKeys.push(
                `${parameterName}_monitor_${monitorNumber}`,
                `${parameterName}_moniteur_${monitorNumber}`,
                `${parameterName}_monitor${monitorNumber}`,
                `${parameterName}_moniteur${monitorNumber}`,
                `${parameterName}_${monitorNumber}`
            );
        }

        value = findExactValue(nameKeys);
        if (hasValue(value)) return value;

        value = findNormalizedValue(nameKeys);
        if (hasValue(value)) return value;

        if (parameterId !== undefined && monitorIndex === 0) {
            value = findExactValue([parameterId]);
            if (hasValue(value)) return value;
        }

        if (parameterName !== undefined && monitorIndex === 0) {
            value = findNormalizedValue([parameterName]);
            if (hasValue(value)) return value;
        }

        const objectKeys = [parameterId, parameterName].filter(key => key !== undefined && key !== null);

        for (const objectKey of objectKeys) {
            const objectValue = values[String(objectKey)];

            if (!objectValue || typeof objectValue !== 'object') continue;

            const monitorKeys = [
                `monitor_${monitorNumber}`,
                `moniteur_${monitorNumber}`,
                `monitor${monitorNumber}`,
                `moniteur${monitorNumber}`,
                String(monitorNumber),
                String(monitorIndex)
            ];

            for (const monitorKey of monitorKeys) {
                if (hasValue(objectValue[monitorKey])) {
                    return objectValue[monitorKey];
                }
            }

            if (Array.isArray(objectValue) && hasValue(objectValue[monitorIndex])) {
                return objectValue[monitorIndex];
            }
        }

        if (parameterId !== undefined) {
            const normalizedId = normalizeKey(parameterId);

            for (const [storedKey, storedValue] of Object.entries(values)) {
                if (!hasValue(storedValue)) continue;

                const normalizedStoredKey = normalizeKey(storedKey);
                const sameParameter = normalizedStoredKey.startsWith(`${normalizedId}_`);
                const sameMonitor =
                    normalizedStoredKey.includes(`_monitor_${monitorNumber}`) ||
                    normalizedStoredKey.includes(`_moniteur_${monitorNumber}`) ||
                    normalizedStoredKey.includes(`_monitor${monitorNumber}`) ||
                    normalizedStoredKey.includes(`_moniteur${monitorNumber}`);

                if (sameParameter && sameMonitor) {
                    return storedValue;
                }
            }
        }

        const storedPositionValue = getValueByStoredPosition(parameterIndex, monitorIndex);
        if (hasValue(storedPositionValue)) {
            return storedPositionValue;
        }

        return '—';
    };

    /* ==========================================================================
       OBSERVATION D'UN PARAMÈTRE
       ========================================================================== */

    const getParameterObservation = (parameter) => {
        if (!parameter) return '—';

        const parameterId = parameter.id ?? parameter.parameter_id;
        const parameterName = parameter.name ?? parameter.label ?? parameter.nom;
        const keys = [];

        if (parameterId !== undefined) keys.push(`${parameterId}_observation`);
        if (parameterName !== undefined) keys.push(`${parameterName}_observation`);

        let observation = findExactValue(keys);
        if (hasValue(observation)) return observation;

        observation = findNormalizedValue(keys);
        if (hasValue(observation)) return observation;

        const objectKeys = [parameterId, parameterName].filter(key => key !== undefined && key !== null);

        for (const key of objectKeys) {
            const objectValue = values[String(key)];
            if (objectValue && typeof objectValue === 'object' && hasValue(objectValue.observation)) {
                return objectValue.observation;
            }
        }

        for (const [storedKey, storedValue] of Object.entries(values)) {
            if (!hasValue(storedValue)) continue;

            const normalized = normalizeKey(storedKey);
            const matchesId = parameterId && normalized.includes(normalizeKey(parameterId));
            const matchesName = parameterName && normalized.includes(normalizeKey(parameterName));

            if ((matchesId || matchesName) && normalized.includes('observation')) {
                return storedValue;
            }
        }

        return '—';
    };

    /* ==========================================================================
       ANNEXES
       ========================================================================== */

    const annexes = useMemo(() => {
        let data = template?.annexes;
        data = parseJson(data, []);

        if ((!Array.isArray(data) || data.length === 0) && Array.isArray(values?._annexes)) {
            data = values._annexes;
        }

        return Array.isArray(data) ? data : [];
    }, [template, values]);

    /* ==========================================================================
       SIGNATURES
       ========================================================================== */

    const signatures = useMemo(() => {
        let data = template?.signatures;
        data = parseJson(data, []);
        return Array.isArray(data) ? data : [];
    }, [template]);

    /* ==========================================================================
       VALIDATION
       ========================================================================== */

    const handleValidate = async (action) => {
        if ((action === 'rejeter' || action === 'demander_modification') && !commentaire.trim()) {
            toast.error(
                action === 'rejeter'
                    ? 'Veuillez ajouter un commentaire pour le rejet.'
                    : 'Veuillez expliquer les modifications demandées.'
            );
            return;
        }

        if (!reading?.id) {
            toast.error('Identifiant du relevé introuvable.');
            return;
        }

        setLoading(true);

        try {
            await api.post(`/readings/${reading.id}/validate`, {
                action,
                commentaire: commentaire.trim() || null
            });

            if (action === 'valider') {
                toast.success('Relevé validé avec succès.');
            } else if (action === 'rejeter') {
                toast.success('Relevé rejeté.');
            } else {
                toast.success('Modifications demandées à l’intervenant.');
            }

            if (typeof onSuccess === 'function') {
                await onSuccess();
            }
        } catch (error) {
            console.error('Erreur validation relevé :', error);
            toast.error(error?.response?.data?.message || 'Erreur lors du traitement du relevé.');
        } finally {
            setLoading(false);
        }
    };

    /* ==========================================================================
       AFFICHAGE
       ========================================================================== */

    return (
        <div className="reading-modal-overlay" onClick={onClose}>
            <div className="reading-modal-content" onClick={(e) => e.stopPropagation()}>

                {/* HEADER */}
                <div className="reading-modal-header">
                    <div>
                        <h2>
                            <ClipboardList size={22} />
                            Relevé à valider
                        </h2>
                        <p>Formulaire rempli par l’intervenant</p>
                    </div>

                    <button
                        type="button"
                        className="reading-modal-close"
                        onClick={onClose}
                        disabled={loading}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* DOCUMENT */}
                <div className="reading-document">

                    {/* EN-TÊTE ONDA */}
                    <div className="document-header">
                        <div className="document-header-left">
                            <div className="onda-logo-text">ONDA</div>
                            <div className="onda-title">OFFICE NATIONAL DES AÉROPORTS</div>
                            <div className="onda-division">
                                {template?.header?.division || 'DIVISION TECHNIQUE NAVIGATION'}
                            </div>
                            <div className="onda-airport">
                                Aéroport : {template?.header?.aeroport || 'FES SAISS'}
                            </div>
                        </div>

                        <div className="document-header-right">
                            <div><strong>Code :</strong> {template?.header?.code || '—'}</div>
                            <div><strong>Réf. envoi :</strong> {template?.header?.ref_envoi || '—'}</div>
                            <div><strong>Date :</strong> {formatDate(reading?.taken_at || template?.header?.date)}</div>
                        </div>
                    </div>

                    {/* TITRE */}
                    <div className="document-title-section">
                        <h1>{template?.template_name || template?.name || 'RELEVÉ DE MAINTENANCE'}</h1>
                        {(template?.template_type || template?.type) && (
                            <div className="document-type">
                                {template.template_type || template.type}
                            </div>
                        )}
                    </div>

                    {/* INFORMATIONS */}
                    <div className="document-identification">
                        <div className="identification-row">
                            <div className="identification-item">
                                <span className="label"><Wrench size={15} /> Équipement</span>
                                <strong>{getEquipmentName()}</strong>
                            </div>

                            <div className="identification-item">
                                <span className="label">Référence</span>
                                <strong>{getEquipmentReference()}</strong>
                            </div>
                        </div>

                        <div className="identification-row">
                            <div className="identification-item">
                                <span className="label">Type</span>
                                <strong>{template?.template_type || template?.type || '—'}</strong>
                            </div>

                            <div className="identification-item">
                                <span className="label">Fréquence</span>
                                <strong>{getFrequencyLabel(template?.frequency)}</strong>
                            </div>
                        </div>

                        <div className="identification-row">
                            <div className="identification-item">
                                <span className="label"><User size={15} /> Intervenant</span>
                                <strong>{getIntervenantName()}</strong>
                            </div>

                            <div className="identification-item">
                                <span className="label"><Calendar size={15} /> Date du relevé</span>
                                <strong>{formatDateTime(reading?.taken_at)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* RELEVÉ DES MESURES */}
                    <div className="document-section">
                        <div className="section-title">RELEVÉ DES MESURES</div>

                        {parameters.length === 0 ? (
                            <div className="no-parameters">
                                {valueEntries.length > 0 ? (
                                    <div>
                                        <strong>Valeurs saisies :</strong>
                                        <div style={{ marginTop: '12px' }}>
                                            {valueEntries.map(([key, value]) => (
                                                <div key={key} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                                                    <strong>{key}</strong> : {String(value)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    'Aucun paramètre configuré dans ce relevé.'
                                )}
                            </div>
                        ) : (
                            <div className="measurement-table-wrapper">
                                <table className="measurement-table">
                                    <thead>
                                        <tr>
                                            <th>Paramètre</th>
                                            <th>Unité</th>
                                            <th>Tolérance</th>
                                            {Array.from({ length: monitorCount }, (_, index) => (
                                                <th key={index}>Moniteur {index + 1}</th>
                                            ))}
                                            <th>Observation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parameters.map((parameter, parameterIndex) => {
                                            const parameterObservation = getParameterObservation(parameter);

                                            return (
                                                <tr key={parameter.id || parameter.parameter_id || parameterIndex}>
                                                    <td className="parameter-name">
                                                        {parameter.name || parameter.label || parameter.nom || '—'}
                                                    </td>
                                                    <td>{parameter.unit || parameter.unite || '—'}</td>
                                                    <td>{parameter.tolerance || parameter.tolerance_min || parameter.tolerance_max || '—'}</td>

                                                    {Array.from({ length: monitorCount }, (_, monitorIndex) => (
                                                        <td key={monitorIndex} className="measurement-value-cell">
                                                            <span className="measurement-value">
                                                                {getParameterValue(parameter, monitorIndex, parameterIndex)}
                                                            </span>
                                                        </td>
                                                    ))}

                                                    <td className="observation-cell">
                                                        {parameterObservation}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* VÉRIFICATION DIRECTE DES VALEURS */}
                    {parameters.length > 0 && measurementEntries.length > 0 && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px 14px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#64748b'
                        }}>
                            {measurementEntries.length} valeur(s) de mesure enregistrée(s) dans ce relevé.
                        </div>
                    )}

                    {/* OBSERVATIONS */}
                    <div className="document-section">
                        <div className="section-title">OBSERVATIONS</div>
                        <div className="observations-box">
                            {reading?.commentaire ? (
                                <p>{reading.commentaire}</p>
                            ) : (
                                <span className="empty-text">Aucune observation renseignée.</span>
                            )}
                        </div>
                    </div>

                    {/* VALIDATION */}
                    <div className="document-section">
                        <div className="section-title">VALIDATION</div>
                        <div className="validation-info">
                            <div className="validation-status">
                                <strong>Statut du relevé :</strong>
                                <span className="status-pending">En attente de validation</span>
                            </div>
                        </div>

                        <div className="signatures-grid">
                            {signatures.length > 0 ? (
                                signatures.map((signature, index) => (
                                    <div className="signature-box" key={index}>
                                        <strong>
                                            {typeof signature === 'string'
                                                ? signature
                                                : signature?.name || signature?.label || 'Signature'}
                                        </strong>
                                        <div className="signature-line">Signature :</div>
                                        <div className="signature-placeholder">______________________</div>
                                    </div>
                                ))
                            ) : (
                                <>
                                    <div className="signature-box">
                                        <strong>Électroniciens de la Sécurité Aérienne</strong>
                                        <div className="signature-line">Signature :</div>
                                        <div className="signature-placeholder">______________________</div>
                                    </div>
                                    <div className="signature-box">
                                        <strong>Responsable technique</strong>
                                        <div className="signature-line">Signature :</div>
                                        <div className="signature-placeholder">______________________</div>
                                    </div>
                                    <div className="signature-box">
                                        <strong>Chef de Service Radar & Radionavigation</strong>
                                        <div className="signature-line">Signature :</div>
                                        <div className="signature-placeholder">______________________</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ANNEXES */}
                    {annexes.length > 0 && (
                        <div className="document-section">
                            <div className="section-title">ANNEXES</div>
                            <div className="annexes-list">
                                {annexes.map((annex, index) => (
                                    <div className="annex-item" key={index}>
                                        <span className="annex-check">✓</span>
                                        <span>
                                            {typeof annex === 'string'
                                                ? annex
                                                : annex?.name || annex?.path || 'Annexe'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* COMMENTAIRE RESPONSABLE ET ACTIONS */}
                <div className="validation-footer">
                    <div className="responsable-comment">
                        <label>
                            <MessageSquare size={16} />
                            Commentaire du responsable
                        </label>
                        <textarea
                            rows="3"
                            value={commentaire}
                            onChange={(e) => setCommentaire(e.target.value)}
                            placeholder="Ajouter un commentaire, une remarque ou expliquer les modifications demandées..."
                            disabled={loading}
                        />
                    </div>

                    <div className="validation-actions">
                        <button
                            type="button"
                            className="btn-validation btn-reject"
                            onClick={() => handleValidate('rejeter')}
                            disabled={loading}
                        >
                            <XCircle size={18} />
                            Rejeter
                        </button>

                        <button
                            type="button"
                            className="btn-validation btn-modification"
                            onClick={() => handleValidate('demander_modification')}
                            disabled={loading}
                        >
                            <MessageSquare size={18} />
                            Demander modifications
                        </button>

                        <button
                            type="button"
                            className="btn-validation btn-approve"
                            onClick={() => handleValidate('valider')}
                            disabled={loading}
                        >
                            <CheckCircle size={18} />
                            {loading ? 'Traitement...' : 'Valider'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ValidateReadingModal;