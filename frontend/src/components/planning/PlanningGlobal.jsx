import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Plus,
    Trash2,
    X,
    Wrench,
    Users,
    Clock,
    Save,
    Info,
} from 'lucide-react';
import './PlanningGlobal.css';

const PlanningGlobal = () => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [equipments, setEquipments] = useState([]);
    const [groups, setGroups] = useState([]);
    const [monthlyEvents, setMonthlyEvents] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedCell, setSelectedCell] = useState(null);

    const [formData, setFormData] = useState({
        equipment_id: '',
        type: 'preventive',
        frequency: 'monthly',
        day_of_month: '',
        day_of_week: null,
        start_date: `${new Date().getFullYear()}-01-01`,
        end_date: `${new Date().getFullYear()}-12-31`,
        preferred_time: '09:00',
        duration: 60,
        group_id: '',
        priority: 'normale',
        description: '',
        reading_pdf: null,
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // --- Chargements ---
    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        fetchMonthlyPlanning();
    }, [year, month]);

    const loadInitialData = async () => {
        try {
            const [equipmentsResponse, groupsResponse] = await Promise.all([
                api.get('/equipments'),
                api.get('/groups'),
            ]);
            setEquipments(equipmentsResponse.data.data || equipmentsResponse.data || []);
            setGroups(groupsResponse.data.data || groupsResponse.data || []);
        } catch (error) {
            toast.error('Impossible de charger les données');
        }
    };

    const fetchMonthlyPlanning = async () => {
        setLoading(true);
        try {
            const response = await api.get('/maintenance-plans/monthly', {
                params: { year, month },
            });
            setMonthlyEvents(response.data.events || []);
        } catch (error) {
            setMonthlyEvents([]);
            toast.error('Impossible de charger le planning mensuel');
        } finally {
            setLoading(false);
        }
    };

    // --- Navigation ---
    const changeMonth = (delta) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
        setSelectedPlan(null);
        setSelectedCell(null);
    };

    const goToCurrentMonth = () => {
        setCurrentDate(new Date());
        setSelectedPlan(null);
        setSelectedCell(null);
    };

    // --- Fonctions de la cellule ---
    const getEventForCell = (equipmentId, day) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return monthlyEvents.find(
            e => Number(e.equipment_id) === Number(equipmentId) && e.scheduled_date === dateStr
        ) || null;
    };

    // --- MODALE : CRÉATION ---
    const openCreateModal = (equipmentId, day) => {
        setSelectedPlan(null);
        setSelectedCell({ equipmentId, day });
        setFormData({
            equipment_id: equipmentId,
            type: 'preventive',
            frequency: 'monthly',
            day_of_month: day,
            day_of_week: null,
            start_date: `${year}-${String(month).padStart(2, '0')}-01`,
            end_date: `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`,
            preferred_time: '09:00',
            duration: 60,
            group_id: '',
            priority: 'normale',
            description: '',
            reading_pdf: null,
        });
        setShowModal(true);
    };

    // --- MODALE : ÉDITION (pour les plans manuels uniquement) ---
    const openEditModal = async (plan) => {
        try {
            const response = await api.get(`/maintenance-plans/${plan.id}`);
            const data = response.data.data || response.data;

            setSelectedPlan(data);

            setFormData({
                equipment_id: data.equipment_id || '',
                type: data.type || 'preventive',
                frequency: data.frequency || 'monthly',
                day_of_month: data.day_of_month || '',
                day_of_week: data.day_of_week || null,
                start_date: data.start_date || `${year}-01-01`,
                end_date: data.end_date || `${year}-12-31`,
                preferred_time: data.preferred_time || '09:00',
                duration: data.duration || 60,
                group_id: data.group_id || '',
                priority: data.priority || 'normale',
                description: data.description || '',
                reading_pdf: null,
            });

            setShowModal(true);
        } catch (error) {
            console.error('Erreur chargement plan:', error);
            toast.error('Erreur lors du chargement du plan');
        }
    };

    // --- Gestion des champs ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFormData(prev => ({ ...prev, reading_pdf: file }));
    };

    // --- Soumission (avec FormData) ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.equipment_id) {
            toast.error('Veuillez sélectionner un équipement');
            return;
        }
        if (!formData.day_of_month) {
            toast.error('Veuillez sélectionner un jour');
            return;
        }

        setSubmitting(true);

        try {
            const payload = new FormData();

            Object.keys(formData).forEach(key => {
                if (key === 'reading_pdf') {
                    if (formData[key] instanceof File) {
                        payload.append('reading_pdf', formData[key]);
                    }
                } else if (formData[key] !== null && formData[key] !== undefined) {
                    payload.append(key, formData[key]);
                }
            });

            payload.append('year', year);
            payload.set('day_of_month', Number(formData.day_of_month));
            if (formData.day_of_week) payload.set('day_of_week', Number(formData.day_of_week));
            payload.set('duration', Number(formData.duration));

            if (selectedPlan) {
                payload.append('_method', 'PUT');
                await api.post(`/maintenance-plans/${selectedPlan.id}`, payload, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Planification mise à jour');
            } else {
                await api.post('/maintenance-plans', payload, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Maintenance planifiée');
            }

            setShowModal(false);
            setSelectedPlan(null);
            fetchMonthlyPlanning();
        } catch (error) {
            console.error('Erreur complète :', error);

            if (error.response && error.response.status === 422) {
                const errors = error.response.data.errors;
                if (errors) {
                    const messages = Object.values(errors).flat();
                    messages.forEach(msg => toast.error(msg));
                } else {
                    toast.error('Données invalides. Vérifiez les champs.');
                }
            } else if (error.response && error.response.data && error.response.data.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Erreur lors de l’enregistrement');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // --- Suppression ---
    const handleDelete = async () => {
        if (!selectedPlan) return;
        if (!window.confirm('Voulez-vous vraiment supprimer cette planification ?')) return;

        try {
            await api.delete(`/maintenance-plans/${selectedPlan.id}`);
            toast.success('Planification supprimée');
            setShowModal(false);
            setSelectedPlan(null);
            fetchMonthlyPlanning();
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
    };

    // --- Helpers d'affichage ---
    const getTypeLabel = (type) => {
        switch (type) {
            case 'preventive': return 'P';
            case 'corrective': return 'C';
            case 'inspection': return 'I';
            case 'control': return 'CTRL';
            default: return '•';
        }
    };

    const getPriorityClass = (priority) => {
        switch (priority) {
            case 'urgente': return 'priority-urgent';
            case 'elevée': return 'priority-high';
            case 'normale': return 'priority-normal';
            case 'faible': return 'priority-low';
            default: return 'priority-normal';
        }
    };

    // --- Statistiques ---
    const numberOfEvents = monthlyEvents.length;
    const numberOfEquipments = equipments.length;
    const numberOfGroups = groups.length;
    const monthName = currentDate.toLocaleString('fr', { month: 'long', year: 'numeric' });

    return (
        <div className="planning-page">
            {/* HEADER */}
            <div className="planning-header">
                <div className="planning-title">
                    <div className="planning-title-icon"><CalendarDays size={24} /></div>
                    <div>
                        <h1>Planning mensuel</h1>
                        <p>Planification des maintenances pour le mois</p>
                    </div>
                </div>
                <button className="refresh-button" onClick={fetchMonthlyPlanning} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualiser
                </button>
            </div>

            {/* STATS */}
            <div className="planning-stats">
                <div className="stat-card">
                    <div className="stat-icon blue"><Wrench size={20} /></div>
                    <div><span>Équipements</span><strong>{numberOfEquipments}</strong></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><CalendarDays size={20} /></div>
                    <div><span>Événements ce mois</span><strong>{numberOfEvents}</strong></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><Users size={20} /></div>
                    <div><span>Groupes</span><strong>{numberOfGroups}</strong></div>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="planning-toolbar">
                <div className="year-navigation">
                    <button onClick={() => changeMonth(-1)} className="navigation-button"><ChevronLeft size={18} /></button>
                    <button onClick={goToCurrentMonth} className="today-button">Mois actuel</button>
                    <button onClick={() => changeMonth(1)} className="navigation-button"><ChevronRight size={18} /></button>
                    <div className="current-year"><CalendarDays size={18} /> <strong>{monthName}</strong></div>
                </div>
                <div className="planning-legend">
                    <span>Priorité :</span>
                    <span className="legend-item"><i className="legend-dot urgent"></i> Urgente</span>
                    <span className="legend-item"><i className="legend-dot high"></i> Élevée</span>
                    <span className="legend-item"><i className="legend-dot normal"></i> Normale</span>
                    <span className="legend-item"><i className="legend-dot low"></i> Faible</span>
                </div>
            </div>

            {/* TABLEAU */}
            <div className="planning-card">
                <div className="planning-card-header">
                    <div>
                        <h2>Calendrier mensuel des maintenances</h2>
                        <p>Cliquez sur un jour pour planifier une maintenance pour ce mois</p>
                    </div>
                    <button className="new-plan-button" onClick={() => openCreateModal(equipments[0]?.id, 1)} disabled={equipments.length === 0}>
                        <Plus size={17} /> Nouvelle maintenance
                    </button>
                </div>

                <div className="planning-table-wrapper">
                    <table className="planning-table">
                        <thead>
                            <tr>
                                <th className="equipment-column">Équipements</th>
                                {daysArray.map(day => (
                                    <th key={day} className="day-column"><strong>{day}</strong></th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={daysArray.length + 1} className="table-loading">
                                        <RefreshCw size={20} className="spin" /> Chargement...
                                    </td>
                                </tr>
                            ) : equipments.length === 0 ? (
                                <tr>
                                    <td colSpan={daysArray.length + 1} className="empty-table">Aucun équipement disponible.</td>
                                </tr>
                            ) : (
                                equipments.slice().sort((a, b) => a.name.localeCompare(b.name)).map(equipment => (
                                    <tr key={equipment.id}>
                                        <td className="equipment-cell">
                                            <div className="equipment-name">
                                                <div className="equipment-icon"><Wrench size={16} /></div>
                                                <div><strong>{equipment.name}</strong>{equipment.code && <span>{equipment.code}</span>}</div>
                                            </div>
                                        </td>
                                        {daysArray.map(day => {
                                            const event = getEventForCell(equipment.id, day);
                                            return (
                                                <td
                                                    key={day}
                                                    className={`planning-cell ${event ? 'has-plan' : ''}`}
                                                    onClick={() => {
                                                        if (event) {
                                                            // Distinguer la source de l'événement
                                                            if (event.source === 'plan') {
                                                                // Plan manuel → ouvrir la modal de modification
                                                                openEditModal(event);
                                                            } else if (event.source === 'template') {
                                                                // Intervention générée → ouvrir le formulaire de modification
                                                                window.location.href = `/interventions/${event.id}/edit`;
                                                            } else {
                                                                // Fallback : ouvrir la modal (comportement ancien)
                                                                openEditModal(event);
                                                            }
                                                        } else {
                                                            // Cellule vide → créer un plan
                                                            openCreateModal(equipment.id, day);
                                                        }
                                                    }}
                                                >
                                                    {event ? (
                                                        <div
                                                            className={`maintenance-marker ${getPriorityClass(event.priority)}`}
                                                            title={event.description || 'Maintenance planifiée'}
                                                        >
                                                            {getTypeLabel(event.type)}
                                                        </div>
                                                    ) : (
                                                        <div className="empty-cell"><Plus size={14} /></div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="planning-info">
                    <Info size={17} />
                    <div>
                        <strong>Fonctionnement du planning</strong>
                        <p>
                            Ce planning mensuel affiche les maintenances planifiées pour chaque jour du mois.
                            Les marqueurs <strong>P</strong> (Préventif), <strong>C</strong> (Correctif),
                            <strong>I</strong> (Inspection) ou <strong>CTRL</strong> (Contrôle) indiquent les interventions.
                            Un clic sur un marqueur permet de modifier le plan ou de consulter le détail de l’intervention.
                        </p>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="planning-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>{selectedPlan ? 'Modifier la maintenance' : 'Planifier une maintenance'}</h2>
                                <p>Définissez les paramètres de la maintenance pour ce mois.</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="planning-form">
                            {/* ÉQUIPEMENT */}
                            <div className="form-group">
                                <label>Équipement</label>
                                <select name="equipment_id" value={formData.equipment_id} onChange={handleChange} required>
                                    <option value="">Sélectionner un équipement</option>
                                    {equipments.map(equipment => (
                                        <option key={equipment.id} value={equipment.id}>{equipment.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* TYPE + PRIORITÉ */}
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Type de maintenance</label>
                                    <select name="type" value={formData.type} onChange={handleChange}>
                                        <option value="preventive">Préventive</option>
                                        <option value="corrective">Corrective</option>
                                        <option value="inspection">Inspection</option>
                                        <option value="control">Contrôle</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Priorité</label>
                                    <select name="priority" value={formData.priority} onChange={handleChange}>
                                        <option value="faible">Faible</option>
                                        <option value="normale">Normale</option>
                                        <option value="elevée">Élevée</option>
                                        <option value="urgente">Urgente</option>
                                    </select>
                                </div>
                            </div>

                            {/* JOUR */}
                            <div className="form-group">
                                <label>Jour du mois</label>
                                <select name="day_of_month" value={formData.day_of_month} onChange={handleChange} required>
                                    <option value="">Sélectionner un jour</option>
                                    {daysArray.map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>

                            {/* HEURE + DURÉE */}
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Heure</label>
                                    <div className="input-icon-wrapper">
                                        <Clock size={16} />
                                        <input type="time" name="preferred_time" value={formData.preferred_time} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Durée (minutes)</label>
                                    <input type="number" name="duration" min="1" value={formData.duration} onChange={handleChange} />
                                </div>
                            </div>

                            {/* GROUPE */}
                            <div className="form-group">
                                <label>Groupe responsable</label>
                                <div className="input-icon-wrapper">
                                    <Users size={16} />
                                    <select name="group_id" value={formData.group_id} onChange={handleChange}>
                                        <option value="">Sélectionner un groupe</option>
                                        {groups.map(group => (
                                            <option key={group.id} value={group.id}>{group.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 🆕 CHAMP PDF AVEC AFFICHAGE EXISTANT */}
                            <div className="form-group">
                                <label htmlFor="reading_pdf">📄 Relevé PDF (modèle)</label>
                                <input
                                    type="file"
                                    id="reading_pdf"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                />
                                <small style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                                    Joindre le document de relevé (PDF, max 5 Mo)
                                </small>

                                {formData.reading_pdf instanceof File && (
                                    <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
                                        📎 Nouveau fichier : {formData.reading_pdf.name}
                                    </p>
                                )}

                                {selectedPlan?.reading_pdf_path && !(formData.reading_pdf instanceof File) && (
                                    <p style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
                                        📄 PDF existant : <a href={`/storage/${selectedPlan.reading_pdf_path}`} target="_blank" rel="noopener noreferrer">Consulter</a>
                                    </p>
                                )}
                            </div>

                            {/* DESCRIPTION */}
                            <div className="form-group">
                                <label>Description</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Décrivez les opérations de maintenance..." rows="4" />
                            </div>

                            {/* ACTIONS */}
                            <div className="modal-actions">
                                {selectedPlan && (
                                    <button type="button" className="delete-button" onClick={handleDelete}>
                                        <Trash2 size={16} /> Supprimer
                                    </button>
                                )}
                                <button type="button" className="cancel-button" onClick={() => setShowModal(false)}>
                                    Annuler
                                </button>
                                <button type="submit" className="save-button" disabled={submitting}>
                                    {submitting ? <><RefreshCw size={16} className="spin" /> Enregistrement...</> : <><Save size={16} /> {selectedPlan ? 'Enregistrer' : 'Planifier'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanningGlobal;
