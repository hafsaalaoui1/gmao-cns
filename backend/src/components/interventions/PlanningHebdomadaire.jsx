import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Plus, Calendar, Clock, Users } from 'lucide-react';
import CreateInterventionModal from './CreateInterventionModal';

const PlanningHebdomadaire = () => {
    const [loading, setLoading] = useState(true);
    const [planning, setPlanning] = useState([]);
    const [weekStart, setWeekStart] = useState(() => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(today.setDate(diff)).toISOString().split('T')[0];
    });
    const [weekEnd, setWeekEnd] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');

    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    useEffect(() => {
        fetchPlanning();
    }, [weekStart]);

    const fetchPlanning = async () => {
        setLoading(true);
        try {
            const response = await api.get('/maintenance-schedules/weekly', {
                params: { week_start: weekStart }
            });
            setPlanning(response.data.planning);
            setWeekEnd(response.data.week_end);
        } catch (error) {
            console.error('Erreur chargement planning:', error);
            toast.error('Erreur chargement du planning');
        } finally {
            setLoading(false);
        }
    };

    const changeWeek = (direction) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + direction * 7);
        setWeekStart(date.toISOString().split('T')[0]);
    };

    const getStatusBadge = (status) => {
        const config = {
            'planifiee': { color: '#3b82f6', bg: '#dbeafe', label: 'Planifiée' },
            'en_cours': { color: '#f59e0b', bg: '#fef3c7', label: 'En cours' },
            'terminee': { color: '#10b981', bg: '#d1fae5', label: 'Terminée' },
            'cloturee': { color: '#6b7280', bg: '#f3f4f6', label: 'Clôturée' }
        };
        return config[status] || config['planifiee'];
    };

    const getPriorityBadge = (priority) => {
        const config = {
            'urgente': { color: '#ef4444', bg: '#fee2e2', label: 'Urgente' },
            'elevée': { color: '#f59e0b', bg: '#fef3c7', label: 'Élevée' },
            'normale': { color: '#3b82f6', bg: '#dbeafe', label: 'Normale' },
            'faible': { color: '#10b981', bg: '#d1fae5', label: 'Faible' }
        };
        return config[priority] || config['normale'];
    };

    const openCreateModal = (equipment, date) => {
        setSelectedEquipment(equipment);
        setSelectedDate(date);
        setShowModal(true);
    };

    if (loading) {
        return <div className="loading-container">Chargement du planning...</div>;
    }

    // Formater la date pour l'affichage
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="planning-hebdo">
            {/* HEADER */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">📅 Planning préventif</h1>
                    <p className="page-subtitle">
                        Semaine du {new Date(weekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {' au '}
                        {new Date(weekEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="header-actions">
                    <button className="btn-icon" onClick={() => changeWeek(-1)} title="Semaine précédente">
                        <ChevronLeft size={20} />
                    </button>
                    <button className="btn-icon" onClick={() => setWeekStart(new Date().toISOString().split('T')[0])} title="Aujourd'hui">
                        <Calendar size={20} />
                    </button>
                    <button className="btn-icon" onClick={() => changeWeek(1)} title="Semaine suivante">
                        <ChevronRight size={20} />
                    </button>
                    <button className="btn-refresh" onClick={fetchPlanning}>
                        <RefreshCw size={18} /> Actualiser
                    </button>
                </div>
            </div>

            {/* GRILLE HEBDOMADAIRE */}
            <div className="table-container">
                <table className="planning-grid">
                    <thead>
                        <tr>
                            <th className="equipment-header">Équipement</th>
                            {jours.map((jour, index) => {
                                const date = new Date(weekStart);
                                date.setDate(date.getDate() + index);
                                const dateStr = date.toISOString().split('T')[0];
                                return (
                                    <th key={jour} className="day-header">
                                        <div className="day-name">{jour}</div>
                                        <div className="day-date">{formatDate(dateStr)}</div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {planning.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="empty-state">Aucun équipement enregistré</td>
                            </tr>
                        ) : (
                            planning.map((equip) => (
                                <tr key={equip.id}>
                                    <td className="equipment-cell">
                                        <strong>{equip.name}</strong>
                                        <span className="equipment-type">{equip.type}</span>
                                    </td>
                                    {jours.map((jour) => {
                                        const dayData = equip.week[jour];
                                        if (!dayData || !dayData.scheduled) {
                                            return <td key={jour} className="day-cell empty">—</td>;
                                        }
                                        const intervention = dayData.intervention;
                                        if (intervention) {
                                            const status = getStatusBadge(intervention.status);
                                            const priority = getPriorityBadge(intervention.priority);
                                            return (
                                                <td key={jour} className="day-cell has-intervention">
                                                    <Link to={`/interventions/${intervention.id}`} className="intervention-link">
                                                        <div className="intervention-badge" style={{ borderColor: status.color }}>
                                                            <span className="intervention-time">
                                                                <Clock size={12} /> {intervention.time?.substring(0, 5) || '09:00'}
                                                            </span>
                                                            <span className="intervention-status" style={{ color: status.color }}>
                                                                {status.label}
                                                            </span>
                                                            {intervention.group_name && (
                                                                <span className="intervention-group">
                                                                    <Users size={12} /> {intervention.group_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Link>
                                                </td>
                                            );
                                        }
                                        return (
                                            <td key={jour} className="day-cell schedulable">
                                                <button
                                                    className="btn-add-schedule"
                                                    onClick={() => openCreateModal(equip, dayData.date)}
                                                    title="Créer une intervention"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL DE CRÉATION */}
            {showModal && (
                <CreateInterventionModal
                    equipment={selectedEquipment}
                    date={selectedDate}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        fetchPlanning();
                        toast.success('✅ Intervention créée avec succès !');
                    }}
                />
            )}
        </div>
    );
};

export default PlanningHebdomadaire;