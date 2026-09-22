import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { X, Save, Clock, Users, AlertTriangle } from 'lucide-react';

const CreateInterventionModal = ({ equipment, date, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState([]);
    const [formData, setFormData] = useState({
        equipment_id: equipment?.id || '',
        scheduled_date: date || '',
        scheduled_time: '09:00',
        type: 'preventive',
        priority: 'normale',
        group_id: '',
        description: '',
    });

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const response = await api.get('/groups');
            setGroups(response.data.data || response.data || []);
        } catch (error) {
            console.error('Erreur chargement groupes:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.group_id) {
            toast.error('❌ Veuillez affecter l\'intervention à un groupe');
            return;
        }
        setLoading(true);
        try {
            await api.post('/interventions', {
                ...formData,
                status: 'planifiee',
                created_by: 1, // À adapter avec l'utilisateur connecté
            });
            onSuccess();
        } catch (error) {
            toast.error('❌ Erreur lors de la création');
            console.error('Erreur:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!equipment) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <Plus size={20} style={{ marginRight: '8px' }} />
                        Nouvelle intervention
                    </h2>
                    <button className="btn-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Équipement (lecture seule) */}
                    <div className="form-group">
                        <label>Équipement</label>
                        <div className="form-control-static">
                            <strong>{equipment.name}</strong>
                            <span className="text-muted">({equipment.type})</span>
                        </div>
                    </div>

                    <div className="form-row">
                        {/* Date */}
                        <div className="form-group">
                            <label>Date</label>
                            <input
                                type="date"
                                name="scheduled_date"
                                className="form-control"
                                value={formData.scheduled_date}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        {/* Heure */}
                        <div className="form-group">
                            <label>Heure</label>
                            <input
                                type="time"
                                name="scheduled_time"
                                className="form-control"
                                value={formData.scheduled_time}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        {/* Type */}
                        <div className="form-group">
                            <label>Type</label>
                            <select
                                name="type"
                                className="form-control"
                                value={formData.type}
                                onChange={handleChange}
                            >
                                <option value="preventive">🛡️ Préventive</option>
                                <option value="corrective">🔧 Corrective</option>
                            </select>
                        </div>
                        {/* Priorité */}
                        <div className="form-group">
                            <label>Priorité</label>
                            <select
                                name="priority"
                                className="form-control"
                                value={formData.priority}
                                onChange={handleChange}
                            >
                                <option value="faible">🟢 Faible</option>
                                <option value="normale">🔵 Normale</option>
                                <option value="elevée">🟡 Élevée</option>
                                <option value="urgente">🔴 Urgente</option>
                            </select>
                        </div>
                    </div>

                    {/* Groupe */}
                    <div className="form-group">
                        <label>
                            <Users size={16} style={{ marginRight: '6px' }} />
                            Groupe affecté *
                        </label>
                        <select
                            name="group_id"
                            className="form-control"
                            value={formData.group_id}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Sélectionner un groupe</option>
                            {groups.map(group => (
                                <option key={group.id} value={group.id}>
                                    {group.name} ({group.users?.length || 0} membres)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            className="form-control"
                            rows="3"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Détails de l'intervention..."
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Annuler
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Création...' : (
                                <>
                                    <Save size={18} />
                                    Créer l'intervention
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateInterventionModal;