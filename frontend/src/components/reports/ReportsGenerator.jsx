import React, { useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { 
    FileText, Download, FileSpreadsheet, FilePdf,
    Calendar, Filter, RefreshCw, Printer,
    BarChart3, PieChart, TrendingUp, Clock
} from 'lucide-react';

const ReportsGenerator = () => {
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('equipments');
    const [period, setPeriod] = useState({
        start_date: '',
        end_date: '',
    });
    const [format, setFormat] = useState('pdf');
    const [generating, setGenerating] = useState(false);

    const reportTypes = [
        { id: 'equipments', label: 'Équipements', icon: BarChart3, desc: 'Liste des équipements avec statut' },
        { id: 'interventions', label: 'Interventions', icon: TrendingUp, desc: 'Interventions par période' },
        { id: 'tickets', label: 'Tickets', icon: FileText, desc: 'Tickets résolus par période' },
        { id: 'kpi', label: 'KPI', icon: Clock, desc: 'MTTR, MTBF, disponibilité' },
    ];

    const handleGenerate = async () => {
        if (!period.start_date || !period.end_date) {
            toast.error('Veuillez sélectionner une période');
            return;
        }

        setGenerating(true);
        try {
            const response = await api.get('/reports/generate', {
                params: {
                    type: reportType,
                    start_date: period.start_date,
                    end_date: period.end_date,
                    format: format,
                },
                responseType: 'blob',
            });

            // Créer un lien pour télécharger le fichier
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `rapport_${reportType}_${period.start_date}_${period.end_date}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success('Rapport généré avec succès');
        } catch (error) {
            toast.error('Erreur lors de la génération du rapport');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="reports-generator">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Rapports et statistiques</h1>
                    <p className="page-subtitle">Générez des rapports personnalisés</p>
                </div>
            </div>

            <div className="reports-container">
                {/* Types de rapports */}
                <div className="report-types">
                    <h3>Type de rapport</h3>
                    <div className="report-types-grid">
                        {reportTypes.map((type) => (
                            <div
                                key={type.id}
                                className={`report-type-card ${reportType === type.id ? 'active' : ''}`}
                                onClick={() => setReportType(type.id)}
                            >
                                <div className="report-type-icon">
                                    <type.icon size={24} />
                                </div>
                                <div className="report-type-info">
                                    <h4>{type.label}</h4>
                                    <p>{type.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Période */}
                <div className="report-period">
                    <h3>
                        <Calendar size={18} />
                        Période
                    </h3>
                    <div className="period-inputs">
                        <div className="form-group">
                            <label>Date de début</label>
                            <input
                                type="date"
                                className="form-control"
                                value={period.start_date}
                                onChange={(e) => setPeriod({ ...period, start_date: e.target.value })}
                                max={period.end_date || undefined}
                            />
                        </div>
                        <div className="form-group">
                            <label>Date de fin</label>
                            <input
                                type="date"
                                className="form-control"
                                value={period.end_date}
                                onChange={(e) => setPeriod({ ...period, end_date: e.target.value })}
                                min={period.start_date || undefined}
                            />
                        </div>
                    </div>
                </div>

                {/* Format */}
                <div className="report-format">
                    <h3>Format d'export</h3>
                    <div className="format-options">
                        <button
                            className={`format-btn ${format === 'pdf' ? 'active' : ''}`}
                            onClick={() => setFormat('pdf')}
                        >
                            <FilePdf size={20} />
                            PDF
                        </button>
                        <button
                            className={`format-btn ${format === 'excel' ? 'active' : ''}`}
                            onClick={() => setFormat('excel')}
                        >
                            <FileSpreadsheet size={20} />
                            Excel
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="report-actions">
                    <button 
                        className="btn-primary btn-lg"
                        onClick={handleGenerate}
                        disabled={generating || !period.start_date || !period.end_date}
                    >
                        {generating ? (
                            <>
                                <RefreshCw size={18} className="spin" />
                                Génération en cours...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Générer le rapport
                            </>
                        )}
                    </button>
                    <button 
                        className="btn-secondary btn-lg"
                        onClick={() => setPeriod({ start_date: '', end_date: '' })}
                    >
                        Réinitialiser
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportsGenerator;