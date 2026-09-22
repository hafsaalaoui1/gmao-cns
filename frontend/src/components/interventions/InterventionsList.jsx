import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Wrench, User, RefreshCw, Eye, Edit, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';

const InterventionsList = () => {
    const [interventions, setInterventions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('Tous');
    const [filterType, setFilterType] = useState('Tous');

    useEffect(() => { loadInterventions(); }, []);

    const loadInterventions = async () => {
        try {
            const response = await api.get('/interventions');
            setInterventions(response.data.data || response.data);
        } catch (error) {
            toast.error('Erreur chargement des interventions');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            'planifiee': { color: '#3b82f6', label: '📅 Planifiée' },
            'en_cours': { color: '#f59e0b', label: '⏳ En cours' },
            'terminee': { color: '#22c55e', label: '✅ Terminée' },
            'cloturee': { color: '#6b7280', label: '🔒 Clôturée' }
        };
        return config[status] || config['planifiee'];
    };

    const filtered = interventions.filter(i => {
        const matchStatus = filterStatus === 'Tous' || i.status === filterStatus;
        const matchType = filterType === 'Tous' || i.type === filterType;
        return matchStatus && matchType;
    });

    if (loading) return <div className="loading-container">Chargement...</div>;

    return (
        <div className="interventions-list">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🛠️ Gestion des interventions</h1>
                    <p className="page-subtitle">Suivez et gérez toutes les interventions</p>
                </div>
                <Link to="/interventions/new" className="btn-primary">+ Nouvelle intervention</Link>
            </div>

            <div className="filters-bar">
                <div className="filter-wrapper">
                    <Filter size={18} className="filter-icon" />
                    <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="Tous">Tous les statuts</option>
                        <option value="planifiee">Planifiée</option>
                        <option value="en_cours">En cours</option>
                        <option value="terminee">Terminée</option>
                        <option value="cloturee">Clôturée</option>
                    </select>
                </div>
                <div className="filter-wrapper">
                    <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="Tous">Tous les types</option>
                        <option value="preventive">Préventive</option>
                        <option value="corrective">Corrective</option>
                    </select>
                </div>
                <button className="btn-refresh" onClick={loadInterventions}><RefreshCw size={18} /></button>
            </div>

            <div className="table-container">
                <table className="table-modern">
                    <thead>
                        <tr>
                            <th>Équipement</th>
                            <th>Type</th>
                            <th>Date</th>
                            <th>Heure</th>
                            <th>Statut</th>
                            <th>Priorité</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="7" className="empty-state">Aucune intervention</td></tr>
                        ) : (
                            filtered.map(i => {
                                const status = getStatusBadge(i.status);
                                return (
                                    <tr key={i.id}>
                                        <td>{i.equipment?.name || 'N/A'}</td>
                                        <td>{i.type === 'preventive' ? '🛡️ Préventive' : '🔧 Corrective'}</td>
                                        <td>{i.scheduled_date}</td>
                                        <td>{i.scheduled_time}</td>
                                        <td><span className="status-badge" style={{ color: status.color, background: `${status.color}15` }}>{status.label}</span></td>
                                        <td>{i.priority}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <Link to={`/interventions/${i.id}`} className="btn-action btn-view"><Eye size={16} /></Link>
                                                <Link to={`/interventions/${i.id}/edit`} className="btn-action btn-edit"><Edit size={16} /></Link>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InterventionsList;