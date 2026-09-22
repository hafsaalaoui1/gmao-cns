import React, { useEffect, useMemo, useState } from 'react';
import {
    Search,
    Eye,
    X,
    Calendar,
    User,
    Wrench,
    FileText,
    CheckCircle,
    Clock,
    XCircle,
    AlertCircle,
    Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import './HistoriqueReleves.css';

const HistoriqueReleves = () => {
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('tous');
    const [selectedReading, setSelectedReading] = useState(null);

    // ============================================================
    // CHARGER L'HISTORIQUE
    // ============================================================
    const loadHistory = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/readings/history');
            const data = response.data?.data || [];
            setReadings(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Erreur chargement historique:', err);
            setError(
                err.response?.data?.message ||
                "Impossible de charger l'historique des relevés."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    // ============================================================
    // HELPERS PARSING & FORMATTING
    // ============================================================
    const parseJson = (value, fallback = {}) => {
        if (value === null || value === undefined) return fallback;
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return parsed ?? fallback;
            } catch (error) {
                return fallback;
            }
        }
        return fallback;
    };

    const getValues = (reading) => {
        const parsed = parseJson(reading?.values, {});
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    };

    const getParameters = (template) => {
        const parsed = parseJson(template?.parameters, []);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.parameters)) {
            return parsed.parameters;
        }
        return [];
    };

    const formatDate = (date) => {
        if (!date) return '-';
        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) return '-';
        return parsedDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatDateTime = (date) => {
        if (!date) return '-';
        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) return '-';
        return parsedDate.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'valide': return 'Validé';
            case 'en_attente': return 'En attente';
            case 'rejete': return 'Rejeté';
            case 'modifications_demandees': return 'Modification demandée';
            case 'brouillon': return 'Brouillon';
            default: return status || '-';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'valide': return <CheckCircle size={16} />;
            case 'en_attente': return <Clock size={16} />;
            case 'rejete': return <XCircle size={16} />;
            case 'modifications_demandees': return <AlertCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'valide': return 'status-valide';
            case 'en_attente': return 'status-attente';
            case 'rejete': return 'status-rejete';
            case 'modifications_demandees': return 'status-modification';
            case 'brouillon': return 'status-brouillon';
            default: return '';
        }
    };

    const getEquipmentName = (reading) => {
        return (
            reading?.equipment?.name ||
            reading?.equipment?.nom ||
            reading?.equipment?.designation ||
            (reading?.equipment_id ? `Équipement #${reading.equipment_id}` : '-')
        );
    };

    const getCanvasName = (reading) => {
        return (
            reading?.template?.template_name ||
            reading?.template?.name ||
            reading?.template?.title ||
            reading?.template?.code ||
            (reading?.template_id ? `Canvas #${reading.template_id}` : '-')
        );
    };

    const getIntervenantName = (reading) => {
        return (
            reading?.takenBy?.name ||
            reading?.takenBy?.nom ||
            reading?.taken_by_user?.name ||
            reading?.taken_by?.name ||
            (reading?.taken_by ? `Utilisateur #${reading.taken_by}` : '-')
        );
    };

    const normalizeValue = (value) => {
        if (value === null || value === undefined || value === '') return '-';
        if (typeof value === 'string' || typeof value === 'number') return String(value);
        if (typeof value === 'object') {
            return String(value.value ?? value.valeur ?? value.reading ?? value.measurement ?? '-');
        }
        return String(value);
    };

    const getParameterValue = (values, parameter, index, monitorIndex = 0) => {
        if (!parameter) return '-';
        const monitorNumber = monitorIndex + 1;
        const parameterId = parameter.id !== undefined && parameter.id !== null ? String(parameter.id) : null;
        const parameterName = parameter.name || parameter.label || parameter.title || null;

        const possibleDirectKeys = [
            parameterId,
            parameterName,
            parameterId ? `${parameterId}_monitor_${monitorNumber}` : null,
            parameterName ? `${parameterName}_monitor_${monitorNumber}` : null,
            parameterId ? `${parameterId}_monitor${monitorNumber}` : null,
            parameterName ? `${parameterName}_monitor${monitorNumber}` : null
        ].filter(Boolean);

        for (const key of possibleDirectKeys) {
            if (Object.prototype.hasOwnProperty.call(values, key)) {
                const storedValue = values[key];
                if (storedValue !== null && storedValue !== undefined && storedValue !== '') {
                    if (typeof storedValue === 'object' && !Array.isArray(storedValue)) {
                        return normalizeValue(
                            storedValue[`monitor_${monitorNumber}`] ??
                            storedValue[`monitor${monitorNumber}`] ??
                            storedValue[monitorIndex] ??
                            storedValue.value
                        );
                    }
                    return normalizeValue(storedValue);
                }
            }
        }

        const monitorEntries = Object.entries(values).filter(([key, value]) => {
            if (key.startsWith('_')) return false;
            if (value === null || value === undefined || value === '') return false;
            return key.toLowerCase().endsWith(`_monitor_${monitorNumber}`);
        });

        if (monitorEntries[index] && monitorEntries[index][1] !== undefined) {
            return normalizeValue(monitorEntries[index][1]);
        }

        return '-';
    };

    // ============================================================
    // EXPORT EXCEL AVEC DÉTAILS DES MESURES
    // ============================================================
    const handleExportExcel = () => {
        const validatedReadings = filteredReadings.filter(
            (reading) => reading?.validation_status === 'valide'
        );

        if (validatedReadings.length === 0) {
            alert('Aucun relevé validé à exporter parmi les résultats.');
            return;
        }

        const exportRows = [];

        validatedReadings.forEach((reading) => {
            const template = reading?.template || {};
            const parameters = getParameters(template);
            const values = getValues(reading);

            let monitorCount = 1;
            if (parameters.length > 0) {
                const maxMonitors = parameters.reduce(
                    (max, p) => Math.max(max, Number(p?.monitors) || 1),
                    1
                );
                monitorCount = Math.min(Math.max(maxMonitors, 1), 4);
            }

            if (parameters.length === 0) {
                exportRows.push({
                    'ID Relevé': reading.id,
                    'Date Relevé': formatDateTime(reading.taken_at || reading.created_at),
                    'Équipement': getEquipmentName(reading),
                    'Canvas / Modèle': getCanvasName(reading),
                    'Intervenant': getIntervenantName(reading),
                    'Validé par': reading.validatedBy?.name || reading.validatedBy?.nom || '-',
                    'Date Validation': formatDateTime(reading.validated_at),
                    'Paramètre': '-',
                    'Unité': '-',
                    'Tolérance': '-',
                    'Moniteur 1': '-',
                    'Moniteur 2': '-',
                    'Moniteur 3': '-',
                    'Moniteur 4': '-',
                    'Observations': reading.commentaire || reading.observation || ''
                });
            } else {
                parameters.forEach((param, pIdx) => {
                    const row = {
                        'ID Relevé': reading.id,
                        'Date Relevé': formatDateTime(reading.taken_at || reading.created_at),
                        'Équipement': getEquipmentName(reading),
                        'Canvas / Modèle': getCanvasName(reading),
                        'Intervenant': getIntervenantName(reading),
                        'Validé par': reading.validatedBy?.name || reading.validatedBy?.nom || '-',
                        'Date Validation': formatDateTime(reading.validated_at),
                        'Paramètre': param.name || param.label || param.title || '-',
                        'Unité': param.unit || param.unite || '-',
                        'Tolérance': param.tolerance || param.tolerance_value || param.standard || '-'
                    };

                    for (let m = 0; m < 4; m++) {
                        const colName = `Moniteur ${m + 1}`;
                        if (m < monitorCount) {
                            row[colName] = getParameterValue(values, param, pIdx, m);
                        } else {
                            row[colName] = 'N/A';
                        }
                    }

                    row['Observations'] = reading.commentaire || reading.observation || '';
                    exportRows.push(row);
                });
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Relevés Validés');
        XLSX.writeFile(
            workbook,
            `Releves_Valides_${new Date().toISOString().slice(0, 10)}.xlsx`
        );
    };

    // ============================================================
    // FILTRAGE
    // ============================================================
    const filteredReadings = useMemo(() => {
        return readings.filter((reading) => {
            const text = `
                ${getEquipmentName(reading)}
                ${getCanvasName(reading)}
                ${getIntervenantName(reading)}
                ${reading?.validation_status || ''}
            `.toLowerCase();

            const matchesSearch = text.includes(search.toLowerCase());
            const matchesStatus =
                statusFilter === 'tous' ||
                reading?.validation_status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [readings, search, statusFilter]);

    if (loading) {
        return (
            <div className="history-page">
                <div className="history-loading">Chargement de l'historique...</div>
            </div>
        );
    }

    return (
        <div className="history-page">
            {/* HEADER */}
            <div className="history-header">
                <div>
                    <h1>Historique des relevés</h1>
                    <p>Consultez et exportez les relevés réalisés et validés.</p>
                </div>

                <div className="history-header-actions">
                    <button
                        type="button"
                        className="btn-export-excel"
                        onClick={handleExportExcel}
                    >
                        <Download size={16} />
                        Exporter Excel (Validés)
                    </button>

                    <div className="history-count">
                        {filteredReadings.length}
                        <span>relevé{filteredReadings.length > 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="history-error">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* FILTRES */}
            <div className="history-filters">
                <div className="history-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un équipement, Canvas..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="history-status-filter"
                >
                    <option value="tous">Tous les statuts</option>
                    <option value="en_attente">En attente</option>
                    <option value="valide">Validé</option>
                    <option value="rejete">Rejeté</option>
                    <option value="modifications_demandees">Modification demandée</option>
                </select>
            </div>

            {/* TABLEAU */}
            <div className="history-card">
                {filteredReadings.length === 0 ? (
                    <div className="history-empty">
                        <FileText size={42} />
                        <h3>Aucun relevé trouvé</h3>
                        <p>Aucun relevé ne correspond aux critères sélectionnés.</p>
                    </div>
                ) : (
                    <div className="history-table-wrapper">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Équipement</th>
                                    <th>Canvas</th>
                                    <th>Intervenant</th>
                                    <th>Statut</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReadings.map((reading) => (
                                    <tr
                                        key={reading.id}
                                        onClick={() => setSelectedReading(reading)}
                                    >
                                        <td>
                                            <div className="history-date">
                                                <Calendar size={15} />
                                                {formatDate(reading.taken_at)}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="history-equipment">
                                                <Wrench size={16} />
                                                <span>{getEquipmentName(reading)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="canvas-name">
                                                {getCanvasName(reading)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="history-user">
                                                <User size={15} />
                                                {getIntervenantName(reading)}
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={`history-status ${getStatusClass(
                                                    reading.validation_status
                                                )}`}
                                            >
                                                {getStatusIcon(reading.validation_status)}
                                                {getStatusLabel(reading.validation_status)}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="history-view-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedReading(reading);
                                                }}
                                            >
                                                <Eye size={16} />
                                                Voir
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL EN LECTURE SEULE */}
            {selectedReading && (
                <ReadingHistoryModal
                    reading={selectedReading}
                    onClose={() => setSelectedReading(null)}
                    formatDateTime={formatDateTime}
                    getStatusLabel={getStatusLabel}
                    getStatusClass={getStatusClass}
                    getStatusIcon={getStatusIcon}
                    getEquipmentName={getEquipmentName}
                    getParameterValue={getParameterValue}
                    getParameters={getParameters}
                    getValues={getValues}
                />
            )}
        </div>
    );
};

// ================================================================
// MODAL : CANVAS REMPLI EN LECTURE SEULE
// ================================================================
const ReadingHistoryModal = ({
    reading,
    onClose,
    formatDateTime,
    getStatusLabel,
    getStatusClass,
    getStatusIcon,
    getEquipmentName,
    getParameterValue,
    getParameters,
    getValues
}) => {
    const template = reading?.template || {};
    const values = useMemo(() => getValues(reading), [reading]);
    const parameters = useMemo(() => getParameters(template), [template]);

    const header = parseValue(template?.header, {});
    const signatures = parseValue(template?.signatures, []);
    const annexes = parseValue(template?.annexes, []);
    const submittedAnnexes = Array.isArray(values._annexes) ? values._annexes : [];

    const monitorCount = useMemo(() => {
        if (!parameters.length) return 1;
        const max = parameters.reduce(
            (m, p) => Math.max(m, Number(p?.monitors) || 1),
            1
        );
        return Math.min(Math.max(max, 1), 4);
    }, [parameters]);

    return (
        <div className="history-modal-overlay" onClick={onClose}>
            <div className="history-modal" onClick={(e) => e.stopPropagation()}>
                <div className="history-modal-header">
                    <div>
                        <span className="history-modal-label">Consultation du relevé</span>
                        <h2>
                            {template.template_name || template.name || template.title || 'Relevé'}
                        </h2>
                    </div>
                    <button type="button" className="history-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="history-document">
                    {/* EN-TÊTE */}
                    <div className="document-header">
                        <div className="document-logo">ONDA</div>
                        <div className="document-header-center">
                            <strong>OFFICE NATIONAL DES AÉROPORTS</strong>
                            <span>Aéroport Fès-Saïss</span>
                            <span>Division Technique Navigation</span>
                        </div>
                        <div className="document-code">
                            <span>Code</span>
                            <strong>{header.code || template.code || '-'}</strong>
                        </div>
                    </div>

                    {/* IDENTIFICATION */}
                    <section className="document-section">
                        <div className="document-section-title">Identification</div>
                        <div className="document-info-grid">
                            <div>
                                <span>Aéroport</span>
                                <strong>{header.aeroport || 'FES SAISS'}</strong>
                            </div>
                            <div>
                                <span>Division</span>
                                <strong>{header.division || '-'}</strong>
                            </div>
                            <div>
                                <span>Référence</span>
                                <strong>{header.ref_envoi || '-'}</strong>
                            </div>
                            <div>
                                <span>Date du relevé</span>
                                <strong>{formatDateTime(reading.taken_at || reading.created_at)}</strong>
                            </div>
                            <div>
                                <span>Équipement</span>
                                <strong>{getEquipmentName(reading)}</strong>
                            </div>
                            <div>
                                <span>Intervenant</span>
                                <strong>
                                    {reading?.takenBy?.name || reading?.takenBy?.nom || '-'}
                                </strong>
                            </div>
                            <div>
                                <span>Fréquence</span>
                                <strong>{template.frequency || '-'}</strong>
                            </div>
                            <div>
                                <span>Type</span>
                                <strong>{template.template_type || template.type || '-'}</strong>
                            </div>
                        </div>
                    </section>

                    {/* PARAMÈTRES */}
                    <section className="document-section">
                        <div className="document-section-title">Paramètres relevés</div>
                        {parameters.length === 0 ? (
                            <div className="document-empty">Aucun paramètre défini.</div>
                        ) : (
                            <div className="document-table-wrapper">
                                <table className="document-table">
                                    <thead>
                                        <tr>
                                            <th>Paramètre</th>
                                            <th>Unité</th>
                                            <th>Tolérance</th>
                                            {Array.from({ length: monitorCount }, (_, i) => (
                                                <th key={i}>Moniteur {i + 1}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parameters.map((param, index) => (
                                            <tr key={param.id ?? index}>
                                                <td>{param.name || param.label || param.title || '-'}</td>
                                                <td>{param.unit || param.unite || '-'}</td>
                                                <td>{param.tolerance || param.tolerance_value || param.standard || '-'}</td>
                                                {Array.from({ length: monitorCount }, (_, mIdx) => (
                                                    <td key={mIdx} className="reading-value">
                                                        <span className="history-reading-value">
                                                            {getParameterValue(values, param, index, mIdx)}
                                                        </span>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* OBSERVATIONS */}
                    <section className="document-section">
                        <div className="document-section-title">Observations</div>
                        <div className="document-observations">
                            {reading?.commentaire || reading?.observation || 'Aucune observation.'}
                        </div>
                    </section>

                    {/* VALIDATION */}
                    <section className="document-section">
                        <div className="document-section-title">Validation</div>
                        <div className="history-validation-box">
                            <div>
                                <span>État</span>
                                <strong className={`history-status ${getStatusClass(reading?.validation_status)}`}>
                                    {getStatusIcon(reading?.validation_status)}
                                    {getStatusLabel(reading?.validation_status)}
                                </strong>
                            </div>
                            <div>
                                <span>Validé par</span>
                                <strong>{reading?.validatedBy?.name || reading?.validatedBy?.nom || '-'}</strong>
                            </div>
                            <div>
                                <span>Date de validation</span>
                                <strong>{formatDateTime(reading?.validated_at)}</strong>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

const parseValue = (value, fallback) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) ?? fallback;
        } catch {
            return fallback;
        }
    }
    return fallback;
};

export default HistoriqueReleves;