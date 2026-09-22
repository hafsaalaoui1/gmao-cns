import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { RefreshCw, Plus, Edit3, Trash2, Play, Calendar, Users, Clock } from 'lucide-react';
import './PlanningTemplatesList.css';

const PlanningTemplatesList = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const response = await api.get('/planning-templates');
            setTemplates(response.data.data || []);
        } catch (error) {
            console.error('Erreur chargement templates:', error);
            toast.error('Impossible de charger les templates');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer ce template ?')) return;
        try {
            await api.delete(`/planning-templates/${id}`);
            toast.success('Template supprimé');
            fetchTemplates();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erreur');
        }
    };

    const handleGenerate = async (id) => {
        setGenerating(true);
        try {
            await api.post(`/planning-templates/${id}/generate`, { year: new Date().getFullYear() });
            toast.success('Interventions générées avec succès');
        } catch (error) {
            toast.error('Erreur lors de la génération');
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateAll = async () => {
        setGenerating(true);
        try {
            await api.get('/planning-templates/generate-all', { params: { year: new Date().getFullYear() } });
            toast.success('Toutes les interventions ont été générées');
        } catch (error) {
            toast.error('Erreur lors de la génération');
        } finally {
            setGenerating(false);
        }
    };

    const dayLabels = {
        1: 'Lundi',
        2: 'Mardi',
        3: 'Mercredi',
        4: 'Jeudi',
        5: 'Vendredi',
        6: 'Samedi',
        7: 'Dimanche',
    };

    if (loading) {
        return (
            <div className="loading-state">
                <RefreshCw size={36} className="spin" />
                <p>Chargement des templates...</p>
            </div>
        );
    }

    return (
        <div className="planning-templates">
            <div className="templates-header">
                <h1>📋 Planning récurrent</h1>
                <div className="header-actions">
                    <button className="btn-generate-all" onClick={handleGenerateAll} disabled={generating}>
                        <Play size={18} /> Générer tout
                    </button>
                    <Link to="/planning-templates/new" className="btn-primary">
                        <Plus size={18} /> Nouveau template
                    </Link>
                    <button className="btn-refresh" onClick={fetchTemplates}>
                        <RefreshCw size={18} /> Actualiser
                    </button>
                </div>
            </div>

            {templates.length === 0 ? (
                <div className="empty-state">
                    <p>Aucun template de planning récurrent.</p>
                    <p className="hint">Créez un template pour automatiser la génération des interventions.</p>
                </div>
            ) : (
                <div className="templates-grid">
                    {templates.map((template) => (
                        <div key={template.id} className="template-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <h3>{template.equipment?.name}</h3>
                                    <span className={`status-badge ${template.is_active ? 'active' : 'inactive'}`}>
                                        {template.is_active ? 'Actif' : 'Inactif'}
                                    </span>
                                </div>
                                <div className="card-actions">
                                    <Link to={`/planning-templates/${template.id}/edit`} className="btn-edit">
                                        <Edit3 size={16} />
                                    </Link>
                                    <button className="btn-delete" onClick={() => handleDelete(template.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="card-body">
                                <div className="info-row">
                                    <Calendar size={16} />
                                    <span><strong>Jour :</strong> {dayLabels[template.day_of_week]}</span>
                                </div>
                                <div className="info-row">
                                    <Clock size={16} />
                                    <span><strong>Heure :</strong> {template.start_time} - {template.duration} min</span>
                                </div>
                                <div className="info-row">
                                    <Users size={16} />
                                    <span>
                                        <strong>Rotation :</strong> {template.rotation?.name || 'Aucune'}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span><strong>Type :</strong> {template.type}</span>
                                    <span className={`priority-${template.priority}`}>
                                        {template.priority}
                                    </span>
                                </div>
                                {template.description && (
                                    <p className="description">{template.description}</p>
                                )}
                            </div>

                            <div className="card-footer">
                                <button
                                    className="btn-generate"
                                    onClick={() => handleGenerate(template.id)}
                                    disabled={generating}
                                >
                                    <Play size={14} /> Générer
                                </button>
                                <span className="dates">
                                    {template.start_date} → {template.end_date || '∞'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PlanningTemplatesList;