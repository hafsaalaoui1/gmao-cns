import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import {
    ArrowLeft, Save, X, PlusCircle, Edit3,
    Wrench, Tag, MapPin, Calendar, Clock,
    Hash, RefreshCw, FolderTree
} from 'lucide-react';
import './EquipmentForm.css';

const EquipmentForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        type: '',
        brand: '',
        model: '',
        serial_number: '',
        location: '',
        commissioning_date: '',
        status: 'operationnel',
        maintenance_frequency: '',
        description: '',
        category_id: '', // ✅ Ajout du champ catégorie
    });

    const isEdit = !!id;

    // Charger les catégories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.get('/equipment-categories');
                setCategories(response.data.data || []);
            } catch (error) {
                console.error('Erreur chargement catégories:', error);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        if (isEdit) {
            fetchEquipment();
        }
    }, [id]);

    const fetchEquipment = async () => {
        setFetching(true);
        try {
            const response = await api.get(`/equipments/${id}`);
            const data = response.data?.data || response.data;
            setFormData({
                name: data.name || '',
                type: data.type || '',
                brand: data.brand || '',
                model: data.model || '',
                serial_number: data.serial_number || '',
                location: data.location || '',
                commissioning_date: data.commissioning_date || '',
                status: data.status || 'operationnel',
                maintenance_frequency: data.maintenance_frequency || '',
                description: data.description || '',
                category_id: data.category_id || '', // ✅ Récupération de la catégorie
            });
        } catch (error) {
            toast.error('Erreur chargement de l\'équipement');
            navigate('/equipments');
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await api.put(`/equipments/${id}`, formData);
                toast.success('Équipement mis à jour avec succès');
            } else {
                await api.post('/equipments', formData);
                toast.success('Équipement créé avec succès');
            }
            navigate('/equipments');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="state-container">
                <RefreshCw size={32} className="spin-icon" />
                <p>Chargement du formulaire...</p>
            </div>
        );
    }

    return (
        <div className="equipment-form-page">

            {/* HEADER & BOUTON RETOUR */}
            <div className="form-header">
                <button className="btn-back-link" onClick={() => navigate('/equipments')}>
                    <ArrowLeft size={16} /> <span>Retour à la liste</span>
                </button>

                <div className="header-main-content">
                    <div className="title-area">
                        <div className={`header-icon-box ${isEdit ? 'edit-mode' : 'create-mode'}`}>
                            {isEdit ? <Edit3 size={22} /> : <PlusCircle size={22} />}
                        </div>
                        <div>
                            <h1>{isEdit ? 'Modifier l\'équipement' : 'Nouveau matériel'}</h1>
                            <p className="subtitle">
                                {isEdit
                                    ? 'Mettez à jour les paramètres techniques et administratifs de l\'équipement'
                                    : 'Renseignez la fiche d\'identification pour l\'enregistrer dans le parc'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* FORMULAIRE CONTAINER */}
            <form onSubmit={handleSubmit} className="form-layout">

                {/* BLOC 1: IDENTIFICATION & CARACTÉRISTIQUES */}
                <div className="form-card">
                    <div className="card-header">
                        <Tag size={18} className="card-icon" />
                        <h2>Identification & Spécifications</h2>
                    </div>

                    <div className="card-body">
                        <div className="form-grid">

                            <div className="form-group col-span-2">
                                <label className="required-label">Nom de l'équipement</label>
                                <div className="input-wrapper">
                                    <Wrench size={16} className="input-icon" />
                                    <input
                                        type="text"
                                        name="name"
                                        className="has-icon"
                                        placeholder="Ex: VOR-001"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="required-label">Type de système</label>
                                <div className="input-wrapper">
                                    <select name="type" value={formData.type} onChange={handleChange} required>
                                        <option value="">Sélectionner un type</option>
                                        <option value="VOR/DME">VOR/DME</option>
                                        <option value="ILS">ILS</option>
                                        <option value="DME">DME</option>
                                        <option value="Radar">Radar</option>
                                        <option value="Communication">Communication</option>
                                        <option value="Surveillance">Surveillance</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Numéro de série (S/N)</label>
                                <div className="input-wrapper">
                                    <Hash size={16} className="input-icon" />
                                    <input
                                        type="text"
                                        name="serial_number"
                                        className="has-icon"
                                        placeholder="Ex: SN001"
                                        value={formData.serial_number}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Fabricant / Marque</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        name="brand"
                                        placeholder="Ex: Thales"
                                        value={formData.brand}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Modèle</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        name="model"
                                        placeholder="Ex: VRB-51"
                                        value={formData.model}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* ✅ NOUVEAU CHAMP : CATÉGORIE / SALLE */}
                            <div className="form-group">
                                <label>Catégorie / Salle</label>
                                <div className="input-wrapper">
                                    <FolderTree size={16} className="input-icon" />
                                    <select
                                        name="category_id"
                                        value={formData.category_id}
                                        onChange={handleChange}
                                        className="has-icon"
                                    >
                                        <option value="">Aucune catégorie</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group col-span-2">
                                <label>Emplacement / Site d'installation</label>
                                <div className="input-wrapper">
                                    <MapPin size={16} className="input-icon" />
                                    <input
                                        type="text"
                                        name="location"
                                        className="has-icon"
                                        placeholder="Ex: Aéroport Fès-Saïss"
                                        value={formData.location}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* BLOC 2: STATUT & SUIVI OPÉRATIONNEL */}
                <div className="form-card">
                    <div className="card-header">
                        <Clock size={18} className="card-icon" />
                        <h2>Cycle de Vie & Maintenance</h2>
                    </div>

                    <div className="card-body">
                        <div className="form-grid">

                            <div className="form-group">
                                <label>Statut opérationnel</label>
                                <div className="input-wrapper">
                                    <select name="status" value={formData.status} onChange={handleChange}>
                                        <option value="operationnel">🟢 Opérationnel</option>
                                        <option value="en_maintenance">🟡 En maintenance</option>
                                        <option value="en_panne">🔴 En panne</option>
                                        <option value="hors_service">⚫ Hors service</option>
                                        <option value="retire">📦 Retiré du parc</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Fréquence de maintenance</label>
                                <div className="input-wrapper">
                                    <select
                                        name="maintenance_frequency"
                                        value={formData.maintenance_frequency}
                                        onChange={handleChange}
                                    >
                                        <option value="">Non définie</option>
                                        <option value="hebdomadaire">Hebdomadaire</option>
                                        <option value="mensuelle">Mensuelle</option>
                                        <option value="trimestrielle">Trimestrielle</option>
                                        <option value="semestrielle">Semestrielle</option>
                                        <option value="annuelle">Annuelle</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group col-span-2">
                                <label>Date de mise en service</label>
                                <div className="input-wrapper">
                                    <Calendar size={16} className="input-icon" />
                                    <input
                                        type="date"
                                        name="commissioning_date"
                                        className="has-icon"
                                        value={formData.commissioning_date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-group col-span-2">
                                <label>Description / Notes complémentaires</label>
                                <div className="input-wrapper">
                                    <textarea
                                        name="description"
                                        rows="4"
                                        placeholder="Précisez ici toute remarque technique..."
                                        value={formData.description}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* BARRE DE VALIDATION */}
                <div className="form-footer-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => navigate('/equipments')}
                        disabled={loading}
                    >
                        <X size={16} /> <span>Annuler</span>
                    </button>

                    <button
                        type="submit"
                        className="btn-save"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <RefreshCw size={16} className="spin-icon" />
                                <span>Enregistrement...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>{isEdit ? 'Enregistrer les modifications' : 'Créer l\'équipement'}</span>
                            </>
                        )}
                    </button>
                </div>

            </form>

        </div>
    );
};

export default EquipmentForm;