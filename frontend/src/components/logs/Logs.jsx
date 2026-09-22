import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { 
    Search, 
    Calendar, 
    Filter, 
    RefreshCw, 
    Download,
    User,
    UserPlus,
    UserCheck,
    UserX,
    Trash2,
    LogIn,
    LogOut,
    Edit,
    Eye,
    AlertCircle,
    FileText,
    Users,
    Activity
} from 'lucide-react';
import './Logs.css';

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        user_id: '',
        action: '',
        date_from: '',
        date_to: '',
    });
    const [selectedLog, setSelectedLog] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.user_id) params.append('user_id', filters.user_id);
            if (filters.action) params.append('action', filters.action);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            
            const url = `/logs?${params.toString()}`;
            const response = await api.get(url);
            setLogs(response.data.data || response.data);
        } catch (error) {
            console.error('Erreur:', error);
            toast.error('Erreur chargement des logs');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters({ ...filters, [name]: value });
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchLogs();
    };

    const handleReset = () => {
        setFilters({
            user_id: '',
            action: '',
            date_from: '',
            date_to: '',
        });
        setTimeout(() => fetchLogs(), 100);
    };

    const getActionBadge = (action) => {
        const configs = [
            { keywords: ['Création', 'création'], color: 'badge-green', icon: UserPlus, label: 'CRÉATION' },
            { keywords: ['Activation', 'activation'], color: 'badge-green', icon: UserCheck, label: 'ACTIVATION' },
            { keywords: ['Suppression', 'suppression'], color: 'badge-red', icon: Trash2, label: 'SUPPRESSION' },
            { keywords: ['Désactivation', 'désactivation'], color: 'badge-red', icon: UserX, label: 'DÉSACTIVATION' },
            { keywords: ['Connexion', 'connexion'], color: 'badge-blue', icon: LogIn, label: 'CONNEXION' },
            { keywords: ['Déconnexion', 'déconnexion'], color: 'badge-blue', icon: LogOut, label: 'DÉCONNEXION' },
            { keywords: ['Modification', 'modification'], color: 'badge-amber', icon: Edit, label: 'MODIFICATION' },
            { keywords: ['Test', 'test'], color: 'badge-purple', icon: Activity, label: 'TEST LOG' },
            { keywords: ['Export', 'export'], color: 'badge-indigo', icon: FileText, label: 'EXPORT' },
            { keywords: ['Import', 'import'], color: 'badge-indigo', icon: Users, label: 'IMPORT' },
        ];

        for (const config of configs) {
            for (const keyword of config.keywords) {
                if (action.includes(keyword)) {
                    return config;
                }
            }
        }
        return { color: 'badge-gray', icon: AlertCircle, label: 'ACTION' };
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getAvatarColor = (id) => {
        const colors = [
            'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 
            'bg-amber-500', 'bg-rose-500', 'bg-indigo-500',
            'bg-teal-500', 'bg-orange-500', 'bg-pink-500'
        ];
        return colors[id % colors.length];
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const exportCSV = () => {
        if (logs.length === 0) {
            toast.error('Aucun log à exporter');
            return;
        }

        const headers = ['ID', 'Utilisateur', 'Action', 'Détails', 'IP', 'Date'];
        const rows = logs.map(log => [
            log.id,
            log.user?.name || 'Inconnu',
            log.action,
            typeof log.details === 'string' ? log.details : JSON.stringify(log.details),
            log.ip_address,
            formatDate(log.created_at)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `logs_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        toast.success('Export CSV réussi !');
    };

    const viewDetails = (log) => {
        setSelectedLog(log);
        setShowModal(true);
    };

    if (loading) {
        return (
            <div className="logs-loading">
                <div className="loader"></div>
                <p>Chargement des logs...</p>
            </div>
        );
    }

    return (
        <div className="logs-page">
            {/* Header avec sous-titre */}
            <div className="logs-header">
                <div className="header-left">
                    <h1 className="page-title">📋 Logs d'activité</h1>
                    <p className="page-subtitle">
                        Traçabilité des opérations effectuées sur le système GMAO CNS
                    </p>
                </div>
                <button className="btn-export" onClick={exportCSV}>
                    <Download size={18} />
                    Exporter CSV
                </button>
            </div>

            {/* Filtres avec espacement corrigé */}
            <div className="filters-bar">
                <form onSubmit={handleFilterSubmit} className="filters-form">
                    <div className="filters-grid">
                        <div className="filter-group">
                            <div className="filter-input-wrapper">
                                <User size={16} className="filter-icon" />
                                <input
                                    type="text"
                                    name="user_id"
                                    className="filter-input"
                                    placeholder="ID utilisateur"
                                    value={filters.user_id}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>
                        <div className="filter-group">
                            <div className="filter-input-wrapper">
                                <Search size={16} className="filter-icon" />
                                <input
                                    type="text"
                                    name="action"
                                    className="filter-input"
                                    placeholder="Action..."
                                    value={filters.action}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>
                        <div className="filter-group">
                            <div className="filter-input-wrapper">
                                <Calendar size={16} className="filter-icon" />
                                <input
                                    type="date"
                                    name="date_from"
                                    className="filter-input filter-date"
                                    value={filters.date_from}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>
                        <div className="filter-group">
                            <div className="filter-input-wrapper">
                                <Calendar size={16} className="filter-icon" />
                                <input
                                    type="date"
                                    name="date_to"
                                    className="filter-input filter-date"
                                    value={filters.date_to}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="filters-actions">
                        <button type="submit" className="btn-filter">
                            <Filter size={16} />
                            Filtrer
                        </button>
                        <button type="button" className="btn-reset" onClick={handleReset}>
                            <RefreshCw size={16} />
                            Réinitialiser
                        </button>
                    </div>
                </form>
            </div>

            {/* Tableau */}
            <div className="logs-table-container">
                <table className="logs-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Utilisateur</th>
                            <th>Action</th>
                            <th>Détails</th>
                            <th>IP</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="empty-state">
                                    <div className="empty-content">
                                        <span className="empty-icon">📭</span>
                                        <p>Aucun log trouvé</p>
                                        <span className="empty-hint">Essayez de modifier vos filtres</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => {
                                const badge = getActionBadge(log.action);
                                const BadgeIcon = badge.icon;
                                const initials = getInitials(log.user?.name);
                                const avatarColor = getAvatarColor(log.id);

                                return (
                                    <tr key={log.id}>
                                        <td className="log-id">#{log.id}</td>
                                        <td>
                                            <div className="user-cell">
                                                <div className={`user-avatar ${avatarColor}`}>
                                                    {initials}
                                                </div>
                                                <span className="user-name">{log.user?.name || 'Inconnu'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${badge.color}`}>
                                                <BadgeIcon size={12} />
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                className="btn-details"
                                                onClick={() => viewDetails(log)}
                                            >
                                                <Eye size={14} />
                                                Voir détails
                                            </button>
                                        </td>
                                        <td>
                                            <code className="ip-badge">{log.ip_address || 'N/A'}</code>
                                        </td>
                                        <td className="log-date">{formatDate(log.created_at)}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Détails */}
            {showModal && selectedLog && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📄 Détails du log</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-row">
                                <span className="detail-label">ID</span>
                                <span className="detail-value">#{selectedLog.id}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Utilisateur</span>
                                <span className="detail-value">{selectedLog.user?.name || 'Inconnu'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Action</span>
                                <span className="detail-value">{selectedLog.action}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">IP</span>
                                <span className="detail-value">{selectedLog.ip_address || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Date</span>
                                <span className="detail-value">{formatDate(selectedLog.created_at)}</span>
                            </div>
                            <div className="detail-row detail-row-full">
                                <span className="detail-label">Détails (JSON)</span>
                                <div className="json-viewer">
                                    <pre>
                                        {typeof selectedLog.details === 'string' 
                                            ? JSON.stringify(JSON.parse(selectedLog.details), null, 2)
                                            : JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-close-modal" onClick={() => setShowModal(false)}>Fermer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logs;