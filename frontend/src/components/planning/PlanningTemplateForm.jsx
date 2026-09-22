import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, X, RefreshCw, Calendar, Clock, Users, Tag } from 'lucide-react';
import './PlanningTemplateForm.css';

const PlanningTemplateForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [equipments, setEquipments] = useState([]);
    const [rotations, setRotations] = useState([]);
    const [groups, setGroups] = useState([]);
    const [templateData, setTemplateData] = useState(null); // Pour stocker les données complètes du template

    const [formData, setFormData] = useState({
        equipment_id: '',
        day_of_week: '',
        start_time: '09:00',
        duration: 60,
        type: 'preventive',
        priority: 'normale',
        description: '',
        group_rotation_id: '',
        start_date: '',
        end_date: '',
        is_active: true,
        reading_pdf: null, // Pour le fichier uploadé
    });

    const dayLabels = {
        1: 'Lundi',
        2: 'Mardi',
        3: 'Mercredi',
        4: 'Jeudi',
        5: 'Vendredi',
        6: 'Samedi',
        7: 'Dimanche',
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (isEdit) {
            fetchTemplate();
        }
    }, [id]);

    const loadData = async () => {
        try {
            const [equipmentsRes, rotationsRes, groupsRes] = await Promise.all([
                api.get('/equipments'),
                api.get('/group-rotations'),
                api.get('/groups'),
            ]);
            setEquipments(equipmentsRes.data.data || equipmentsRes.data || []);
            setRotations(rotationsRes.data.data || rotationsRes.data || []);
            setGroups(groupsRes.data.data || groupsRes.data || []);
        } catch (error) {
            console.error('Erreur chargement données:', error);
            toast.error('Impossible de charger les données');
        }
    };

    const fetchTemplate = async () => {
        setFetching(true);
        try {
            const response = await api.get(`/planning-templates/${id}`);
            const data = response.data.data || response.data;
            setTemplateData(data);
            setFormData({
                equipment_id: data.equipment_id || '',
                day_of_week: data.day_of_week || '',
                start_time: data.start_time || '09:00',
                duration: data.duration || 60,
                type: data.type || 'preventive',
                priority: data.priority || 'normale',
                description: data.description || '',
                group_rotation_id: data.group_rotation_id || '',
                start_date: data.start_date || '',
                end_date: data.end_date || '',
                is_active: data.is_active ?? true,
                reading_pdf: null,
            });
        } catch (error) {
            toast.error('Erreur chargement du template');
            navigate('/planning-templates');
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFormData(prev => ({ ...prev, reading_pdf: file }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.equipment_id) {
            toast.error('Veuillez sélectionner un équipement');
            setLoading(false);
            return;
        }
        if (!formData.day_of_week) {
            toast.error('Veuillez sélectionner un jour');
            setLoading(false);
            return;
        }

        try {
            const payload = new FormData();

            // Ajouter les champs texte
            Object.keys(formData).forEach(key => {
                if (key === 'reading_pdf') {
                    if (formData[key] instanceof File) {
                        payload.append('reading_pdf', formData[key]);
                    }
                } else if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
                    payload.append(key, formData[key]);
                }
            });

            // Ajouter les nombres
            payload.set('duration', Number(formData.duration));
            payload.set('day_of_week', Number(formData.day_of_week));

            if (isEdit) {
                payload.append('_method', 'PUT');
                await api.post(`/planning-templates/${id}`, payload, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Template mis à jour');
            } else {
                await api.post('/planning-templates', payload, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Template créé avec succès');
            }
            navigate('/planning-templates');
        } catch (error) {
            console.error('Erreur:', error);
            toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="loading-state">
                <RefreshCw size={36} className="spin" />
                <p>Chargement du template...</p>
            </div>
        );
    }

    return (
        <div className="template-form">
            <div className="form-header">
                <button className="btn-back" onClick={() => navigate('/planning-templates')}>
                    <ArrowLeft size={16} /> Retour
                </button>
                <h1>{isEdit ? 'Modifier le template' : 'Nouveau template récurrent'}</h1>
                <p className="subtitle">
                    Définissez un modèle de maintenance récurrente. Le système générera automatiquement les interventions.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="form-card">
                <div className="form-grid">
                    {/* Équipement */}
                    <div className="form-group">
                        <label className="required">Équipement</label>
                        <select
                            name="equipment_id"
                            value={formData.equipment_id}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Sélectionner un équipement</option>
                            {equipments.map(eq => (
                                <option key={eq.id} value={eq.id}>
                                    {eq.name} {eq.code ? `(${eq.code})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Jour de la semaine */}
                    <div className="form-group">
                        <label className="required">Jour de la semaine</label>
                        <select
                            name="day_of_week"
                            value={formData.day_of_week}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Sélectionner un jour</option>
                            {Object.entries(dayLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Heure */}
                    <div className="form-group">
                        <label>Heure de début</label>
                        <input
                            type="time"
                            name="start_time"
                            value={formData.start_time}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Durée */}
                    <div className="form-group">
                        <label>Durée (minutes)</label>
                        <input
                            type="number"
                            name="duration"
                            value={formData.duration}
                            onChange={handleChange}
                            min="1"
                            step="5"
                        />
                    </div>

                    {/* Type */}
                    <div className="form-group">
                        <label>Type de maintenance</label>
                        <select name="type" value={formData.type} onChange={handleChange}>
                            <option value="preventive">Préventive</option>
                            <option value="corrective">Corrective</option>
                            <option value="inspection">Inspection</option>
                            <option value="control">Contrôle</option>
                        </select>
                    </div>

                    {/* Priorité */}
                    <div className="form-group">
                        <label>Priorité</label>
                        <select name="priority" value={formData.priority} onChange={handleChange}>
                            <option value="faible">Faible</option>
                            <option value="normale">Normale</option>
                            <option value="elevée">Élevée</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>

                    {/* Rotation des groupes */}
                    <div className="form-group">
                        <label>Rotation des groupes</label>
                        <select
                            name="group_rotation_id"
                            value={formData.group_rotation_id}
                            onChange={handleChange}
                        >
                            <option value="">Aucune rotation (groupe fixe)</option>
                            {rotations.map(rot => (
                                <option key={rot.id} value={rot.id}>
                                    {rot.name}
                                </option>
                            ))}
                        </select>
                        <small className="hint">
                            Si vous sélectionnez une rotation, le groupe changera automatiquement chaque semaine.
                        </small>
                    </div>

                    {/* Période de validité */}
                    <div className="form-group">
                        <label>Date de début</label>
                        <input
                            type="date"
                            name="start_date"
                            value={formData.start_date}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Date de fin</label>
                        <input
                            type="date"
                            name="end_date"
                            value={formData.end_date}
                            onChange={handleChange}
                        />
                        <small className="hint">Laissez vide pour une validité permanente.</small>
                    </div>

                    {/* Description */}
                    <div className="form-group full-width">
                        <label>Description / Instructions</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            placeholder="Instructions de maintenance..."
                        />
                    </div>

                    {/* Fichier PDF */}
                    <div className="form-group full-width">
                        <label htmlFor="reading_pdf">📄 Relevé PDF (modèle)</label>
                        <input
                            type="file"
                            id="reading_pdf"
                            name="reading_pdf"
                            accept=".pdf"
                            onChange={handleFileChange}
                        />
                        <small className="hint">
                            Joindre le document de relevé (PDF, max 5 Mo)
                        </small>

                        {/* Affichage du nouveau fichier sélectionné */}
                        {formData.reading_pdf instanceof File && (
                            <p style={{ color: '#16a34a', fontSize: '13px', marginTop: '4px' }}>
                                📎 Nouveau fichier : {formData.reading_pdf.name}
                            </p>
                        )}

                        {/* Affichage du PDF existant en mode édition */}
                        {isEdit && templateData?.reading_pdf_path && !(formData.reading_pdf instanceof File) && (
                            <p style={{ color: '#2563eb', fontSize: '13px', marginTop: '4px' }}>
                                📄 PDF actuel : <a href={`/storage/${templateData.reading_pdf_path}`} target="_blank" rel="noopener noreferrer">Consulter</a>
                            </p>
                        )}
                    </div>

                    {/* Actif */}
                    <div className="form-group full-width checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                            />
                            Template actif
                        </label>
                        <small className="hint">
                            Un template inactif ne générera pas d'interventions.
                        </small>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => navigate('/planning-templates')}
                    >
                        <X size={16} /> Annuler
                    </button>
                    <button
                        type="submit"
                        className="btn-save"
                        disabled={loading}
                    >
                        {loading ? (
                            <><RefreshCw size={16} className="spin" /> Enregistrement...</>
                        ) : (
                            <><Save size={16} /> {isEdit ? 'Mettre à jour' : 'Créer'}</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PlanningTemplateForm;