import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { 
    Calendar, Clock, Wrench, AlertCircle, CheckCircle, RefreshCw, 
    Search, Filter, Download, FileText, PlusCircle
} from 'lucide-react';

const PlanningTable = () => {
    const [interventions, setInterventions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterPriority, setFilterPriority] = useState('Tous');
    const [filterStatus, setFilterStatus] = useState('Tous');

    useEffect(() => {
        loadInterventions();
    }, []);

    const loadInterventions = async () => {
        try {
            const response = await api.get('/interventions/calendar');
            if (Array.isArray(response.data) && response.data.length > 0) {
                setInterventions(response.data);
            } else {
                // Données fictives
                setInterventions([
                    { id: 1, equipment: { name: 'VOR-001' }, type: 'preventive', scheduled_date: '2026-08-27', scheduled_time: '09:00', priority: 'normale', status: 'planifiee' },
                    { id: 2, equipment: { name: 'ILS-002' }, type: 'preventive', scheduled_date: '2026-08-28', scheduled_time: '10:00', priority: 'faible', status: 'planifiee' },
                    { id: 3, equipment: { name: 'DME-003' }, type: 'corrective', scheduled_date: '2026-08-29', scheduled_time: '14:00', priority: 'urgente', status: 'en_cours' },
                ]);
                toast.info('📋 Données de test affichées');
            }
        } catch (error) {
            console.error('Erreur chargement:', error);
            setInterventions([
                { id: 1, equipment: { name: 'VOR-001' }, type: 'preventive', scheduled_date: '2026-08-27', scheduled_time: '09:00', priority: 'normale', status: 'planifiee' },
                { id: 2, equipment: { name: 'ILS-002' }, type: 'preventive', scheduled_date: '2026-08-28', scheduled_time: '10:00', priority: 'faible', status: 'planifiee' },
            ]);
            toast.info('📋 Données de test affichées (erreur API)');
        } finally {
            setLoading(false);
        }
    };

    const getPriorityBadge = (priority) => {
        const config = {
            'urgente': { color: '#ef4444', bg: '#fee2e2', label: '🚨 Urgente' },
            'elevée': { color: '#f59e0b', bg: '#fef3c7', label: '🔺 Élevée' },
            'normale': { color: '#3b82f6', bg: '#dbeafe', label: '🔵 Normale' },
            'faible': { color: '#10b981', bg: '#d1fae5', label: '🟢 Faible' }
        };
        return config[priority] || config['normale'];
    };

    const getStatusBadge = (status) => {
        const config = {
            'planifiee': { color: '#3b82f6', bg: '#dbeafe', label: '📅 Planifiée' },
            'en_cours': { color: '#f59e0b', bg: '#fef3c7', label: '⏳ En cours' },
            'terminee': { color: '#10b981', bg: '#d1fae5', label: '✅ Terminée' },
            'cloturee': { color: '#6b7280', bg: '#f3f4f6', label: '🔒 Clôturée' }
        };
        return config[status] || config['planifiee'];
    };

    const getTypeBadge = (type) => {
        return type === 'preventive' 
            ? { color: '#3b82f6', bg: '#dbeafe', label: '🛡️ Préventive' }
            : { color: '#ef4444', bg: '#fee2e2', label: '🔧 Corrective' };
    };

    // Filtres combinés
    const filteredInterventions = interventions.filter(interv => {
        const matchSearch = (interv.equipment?.name || '').toLowerCase().includes(search.toLowerCase());
        const matchDate = !filterDate || interv.scheduled_date === filterDate;
        const matchPriority = filterPriority === 'Tous' || interv.priority === filterPriority;
        const matchStatus = filterStatus === 'Tous' || interv.status === filterStatus;
        return matchSearch && matchDate && matchPriority && matchStatus;
    });

    // Export CSV
    const exportCSV = () => {
        if (filteredInterventions.length === 0) {
            toast.info('Aucune donnée à exporter');
            return;
        }
        const headers = ['ID', 'Équipement', 'Type', 'Date', 'Heure', 'Priorité', 'Statut'];
        const rows = filteredInterventions.map(interv => [
            interv.id,
            interv.equipment?.name || 'N/A',
            interv.type === 'preventive' ? 'Préventive' : 'Corrective',
            new Date(interv.scheduled_date).toLocaleDateString('fr-FR'),
            interv.scheduled_time,
            interv.priority,
            interv.status
        ]);
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'planning_interventions.csv';
        link.click();
        toast.success('Export CSV réussi');
    };

    if (loading) {
        return <div className="loading-container">Chargement du planning...</div>;
    }

    return (
        <div className="planning-table">
            {/* HEADER */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Calendar size={28} className="title-icon" />
                        Planning des interventions
                    </h1>
                    <p className="page-subtitle">
                        {filteredInterventions.length} intervention(s) planifiée(s)
                    </p>
                </div>
                <div className="header-actions">
                    <button className="btn-export" onClick={exportCSV}>
                        <Download size={18} /> Exporter CSV
                    </button>
                    <button className="btn-refresh" onClick={loadInterventions}>
                        <RefreshCw size={18} /> Actualiser
                    </button>
                    <Link to="/interventions/new" className="btn-primary">
                        <PlusCircle size={18} /> Nouvelle intervention
                    </Link>
                </div>
            </div>

            {/* FILTRES */}
            <div className="filters-bar">
                <div className="search-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Rechercher un équipement..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <div className="filter-wrapper">
                        <Calendar size={16} className="filter-icon" />
                        <input
                            type="date"
                            className="filter-input"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-wrapper">
                        <Filter size={16} className="filter-icon" />
                        <select 
                            className="filter-select"
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                        >
                            <option value="Tous">Toutes priorité</option>
                            <option value="urgente">Urgente</option>
                            <option value="elevée">Élevée</option>
                            <option value="normale">Normale</option>
                            <option value="faible">Faible</option>
                        </select>
                    </div>
                    <div className="filter-wrapper">
                        <Filter size={16} className="filter-icon" />
                        <select 
                            className="filter-select"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="Tous">Tous statuts</option>
                            <option value="planifiee">Planifiée</option>
                            <option value="en_cours">En cours</option>
                            <option value="terminee">Terminée</option>
                            <option value="cloturee">Clôturée</option>
                        </select>
                    </div>
                    {filterDate && (
                        <button className="btn-clear-filter" onClick={() => setFilterDate('')}>
                            ✕ Effacer filtre
                        </button>
                    )}
                </div>
            </div>

            {/* TABLEAU */}
            {filteredInterventions.length === 0 ? (
                <div className="empty-state-container">
                    <Calendar size={48} className="empty-icon" />
                    <h4>Aucune intervention trouvée</h4>
                    <p>
                        {search || filterDate || filterPriority !== 'Tous' || filterStatus !== 'Tous' 
                            ? 'Aucun résultat ne correspond à vos critères.'
                            : 'Commencez par créer votre première intervention.'}
                    </p>
                    {!search && !filterDate && filterPriority === 'Tous' && filterStatus === 'Tous' && (
                        <Link to="/interventions/new" className="btn-primary">
                            + Créer une intervention
                        </Link>
                    )}
                </div>
            ) : (
                <div className="table-container">
                    <table className="table-modern">
                        <thead>
                            <tr>
                                <th>Équipement</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Heure</th>
                                <th>Priorité</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInterventions.map((interv) => {
                                const priority = getPriorityBadge(interv.priority);
                                const status = getStatusBadge(interv.status);
                                const type = getTypeBadge(interv.type);
                                return (
                                    <tr key={interv.id}>
                                        <td>
                                            <div className="equipment-cell">
                                                <Wrench size={16} className="equipment-icon" />
                                                <span>{interv.equipment?.name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge" style={{ color: type.color, background: type.bg }}>
                                                {type.label}
                                            </span>
                                        </td>
                                        <td>{new Date(interv.scheduled_date).toLocaleDateString('fr-FR')}</td>
                                        <td>{interv.scheduled_time}</td>
                                        <td>
                                            <span className="badge" style={{ color: priority.color, background: priority.bg }}>
                                                {priority.label}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge" style={{ color: status.color, background: status.bg }}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <Link to={`/interventions/${interv.id}`} className="btn-action btn-view" title="Voir">
                                                    👁️
                                                </Link>
                                                <Link to={`/interventions/${interv.id}/edit`} className="btn-action btn-edit" title="Modifier">
                                                    ✏️
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PlanningTable;