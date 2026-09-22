import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import {
    Package,
    Wrench,
    MapPin,
    Euro,
    AlertTriangle,
    Save,
    ArrowLeft,
    Loader2,
    Truck,
    Boxes,
    Settings2,
    Info
} from 'lucide-react';
import './PartForm.css';

const PartForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [equipments, setEquipments] = useState([]);

    const [formData, setFormData] = useState({
        reference: '',
        name: '',
        category: '',
        supplier: '',
        quantity: 0,
        alert_threshold: 10,
        location: '',
        unit_price: '',
        compatibility: [],
    });

    // ============================================================
    // CHARGEMENT
    // ============================================================

    useEffect(() => {
        loadEquipments();

        if (isEdit) {
            loadPart();
        }
    }, [id]);

    const loadEquipments = async () => {
        try {
            const response = await api.get('/equipments');

            const data = response.data.data || response.data || [];

            setEquipments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur chargement équipements:', error);
            toast.error('Impossible de charger les équipements');
        }
    };

    const loadPart = async () => {
        try {
            const response = await api.get(`/parts/${id}`);

            const data = response.data.data || response.data;

            setFormData({
                reference: data.reference || '',
                name: data.name || '',
                category: data.category || '',
                supplier: data.supplier || '',
                quantity: data.quantity ?? 0,
                alert_threshold: data.alert_threshold ?? 10,
                location: data.location || '',
                unit_price: data.unit_price || '',
                compatibility: data.compatibility || [],
            });
        } catch (error) {
            console.error('Erreur chargement pièce:', error);
            toast.error('Erreur lors du chargement de la pièce');
            navigate('/parts');
        }
    };

    // ============================================================
    // GESTION DU FORMULAIRE
    // ============================================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEquipmentToggle = (equipmentId) => {
        setFormData(prev => {
            const current = prev.compatibility || [];

            const exists = current.includes(equipmentId);

            return {
                ...prev,
                compatibility: exists
                    ? current.filter(id => id !== equipmentId)
                    : [...current, equipmentId]
            };
        });
    };

    // ============================================================
    // ENREGISTREMENT
    // ============================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.reference.trim()) {
            toast.error('La référence est obligatoire');
            return;
        }

        if (!formData.name.trim()) {
            toast.error('Le nom de la pièce est obligatoire');
            return;
        }

        if (Number(formData.quantity) < 0) {
            toast.error('La quantité ne peut pas être négative');
            return;
        }

        setLoading(true);

        try {
            if (isEdit) {
                await api.put(`/parts/${id}`, formData);
                toast.success('Pièce modifiée avec succès');
            } else {
                await api.post('/parts', formData);
                toast.success('Pièce créée avec succès');
            }

            navigate('/parts');
        } catch (error) {
            console.error('Erreur enregistrement:', error);

            toast.error(
                error.response?.data?.message ||
                'Erreur lors de l’enregistrement de la pièce'
            );
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // RENDU
    // ============================================================

    return (
        <div className="part-form-container">

            {/* =====================================================
                HEADER
            ===================================================== */}
            <div className="part-page-header">

                <button
                    type="button"
                    className="part-back-button"
                    onClick={() => navigate('/parts')}
                    disabled={loading}
                >
                    <ArrowLeft size={18} />
                </button>

                <div className="part-header-content">

                    <div className="part-header-icon">
                        <Package size={24} />
                    </div>

                    <div>
                        <h1>
                            {isEdit
                                ? 'Modifier la pièce'
                                : 'Ajouter une pièce'}
                        </h1>

                        <p>
                            {isEdit
                                ? 'Modifiez les informations et les paramètres de stock.'
                                : 'Ajoutez une nouvelle pièce détachée au stock.'}
                        </p>
                    </div>

                </div>
            </div>


            {/* =====================================================
                FORMULAIRE
            ===================================================== */}
            <form
                onSubmit={handleSubmit}
                className="part-form"
            >

                {/* =================================================
                    SECTION 1 — IDENTIFICATION
                ================================================= */}
                <section className="part-card">

                    <div className="part-card-header">

                        <div className="part-section-icon">
                            <Package size={19} />
                        </div>

                        <div>
                            <h2>Identification</h2>
                            <p>
                                Informations principales de la pièce
                            </p>
                        </div>

                    </div>


                    <div className="part-card-body">

                        <div className="part-grid-2">

                            {/* Référence */}
                            <div className="part-form-group">

                                <label htmlFor="reference">
                                    Référence
                                    <span className="required">*</span>
                                </label>

                                <input
                                    id="reference"
                                    type="text"
                                    name="reference"
                                    className="part-input"
                                    placeholder="Ex : REF-8921"
                                    value={formData.reference}
                                    onChange={handleChange}
                                    required
                                />

                                <small>
                                    Identifiant unique de la pièce.
                                </small>

                            </div>


                            {/* Nom */}
                            <div className="part-form-group">

                                <label htmlFor="name">
                                    Nom de la pièce
                                    <span className="required">*</span>
                                </label>

                                <input
                                    id="name"
                                    type="text"
                                    name="name"
                                    className="part-input"
                                    placeholder="Ex : Filtre hydraulique"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />

                            </div>


                            {/* Catégorie */}
                            <div className="part-form-group">

                                <label htmlFor="category">
                                    Catégorie
                                </label>

                                <select
                                    id="category"
                                    name="category"
                                    className="part-input"
                                    value={formData.category}
                                    onChange={handleChange}
                                >
                                    <option value="">
                                        Sélectionner une catégorie
                                    </option>

                                    <option value="Électronique">
                                        Électronique
                                    </option>

                                    <option value="Électrique">
                                        Électrique
                                    </option>

                                    <option value="Mécanique">
                                        Mécanique
                                    </option>

                                    <option value="Informatique">
                                        Informatique
                                    </option>

                                    <option value="Consommable">
                                        Consommable
                                    </option>

                                </select>

                            </div>


                            {/* Fournisseur */}
                            <div className="part-form-group">

                                <label htmlFor="supplier">
                                    Fournisseur
                                </label>

                                <div className="part-input-wrapper">

                                    <Truck
                                        size={17}
                                        className="part-input-icon"
                                    />

                                    <input
                                        id="supplier"
                                        type="text"
                                        name="supplier"
                                        className="part-input has-icon"
                                        placeholder="Nom du fournisseur"
                                        value={formData.supplier}
                                        onChange={handleChange}
                                    />

                                </div>

                            </div>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    SECTION 2 — STOCK
                ================================================= */}
                <section className="part-card">

                    <div className="part-card-header">

                        <div className="part-section-icon">
                            <Boxes size={19} />
                        </div>

                        <div>
                            <h2>Gestion du stock</h2>
                            <p>
                                Quantité, seuil d’alerte et localisation
                            </p>
                        </div>

                    </div>


                    <div className="part-card-body">

                        <div className="part-grid-2">

                            {/* Quantité */}
                            <div className="part-form-group">

                                <label htmlFor="quantity">
                                    Quantité en stock
                                    <span className="required">*</span>
                                </label>

                                <input
                                    id="quantity"
                                    type="number"
                                    name="quantity"
                                    className="part-input"
                                    min="0"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    required
                                />

                            </div>


                            {/* Seuil */}
                            <div className="part-form-group">

                                <label htmlFor="alert_threshold">
                                    Seuil d’alerte
                                </label>

                                <div className="part-input-wrapper">

                                    <AlertTriangle
                                        size={17}
                                        className="part-input-icon warning"
                                    />

                                    <input
                                        id="alert_threshold"
                                        type="number"
                                        name="alert_threshold"
                                        className="part-input has-icon"
                                        min="0"
                                        value={formData.alert_threshold}
                                        onChange={handleChange}
                                    />

                                </div>

                                <small>
                                    Une alerte sera affichée lorsque le stock
                                    atteint ce seuil.
                                </small>

                            </div>


                            {/* Emplacement */}
                            <div className="part-form-group">

                                <label htmlFor="location">
                                    Emplacement
                                </label>

                                <div className="part-input-wrapper">

                                    <MapPin
                                        size={17}
                                        className="part-input-icon"
                                    />

                                    <input
                                        id="location"
                                        type="text"
                                        name="location"
                                        className="part-input has-icon"
                                        placeholder="Ex : Magasin B - Rayonnage 14"
                                        value={formData.location}
                                        onChange={handleChange}
                                    />

                                </div>

                            </div>


                            {/* Prix */}
                            <div className="part-form-group">

                                <label htmlFor="unit_price">
                                    Prix unitaire
                                </label>

                                <div className="part-input-wrapper">

                                    <Euro
                                        size={17}
                                        className="part-input-icon"
                                    />

                                    <input
                                        id="unit_price"
                                        type="number"
                                        name="unit_price"
                                        className="part-input has-icon"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.unit_price}
                                        onChange={handleChange}
                                    />

                                </div>

                                <small>
                                    Prix d’achat unitaire de la pièce.
                                </small>

                            </div>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    SECTION 3 — COMPATIBILITÉ
                ================================================= */}
                <section className="part-card">

                    <div className="part-card-header">

                        <div className="part-section-icon">
                            <Settings2 size={19} />
                        </div>

                        <div>
                            <h2>Compatibilité</h2>
                            <p>
                                Équipements pouvant utiliser cette pièce
                            </p>
                        </div>

                    </div>


                    <div className="part-card-body">

                        <div className="compatibility-info">

                            <Info size={16} />

                            <span>
                                Sélectionnez les équipements compatibles
                                avec cette pièce détachée.
                            </span>

                        </div>


                        {equipments.length === 0 ? (

                            <div className="compatibility-empty">

                                <Wrench size={25} />

                                <p>
                                    Aucun équipement disponible.
                                </p>

                            </div>

                        ) : (

                            <div className="equipment-grid">

                                {equipments.map((equipment) => {

                                    const selected =
                                        formData.compatibility?.includes(
                                            equipment.id
                                        );

                                    return (

                                        <label
                                            key={equipment.id}
                                            className={`equipment-option ${
                                                selected
                                                    ? 'selected'
                                                    : ''
                                            }`}
                                        >

                                            <input
                                                type="checkbox"
                                                checked={selected}
                                                onChange={() =>
                                                    handleEquipmentToggle(
                                                        equipment.id
                                                    )
                                                }
                                            />

                                            <div className="equipment-option-content">

                                                <div className="equipment-option-icon">
                                                    <Wrench size={16} />
                                                </div>

                                                <div>

                                                    <strong>
                                                        {equipment.name}
                                                    </strong>

                                                    {equipment.type && (
                                                        <span>
                                                            {equipment.type}
                                                        </span>
                                                    )}

                                                </div>

                                            </div>

                                        </label>

                                    );
                                })}

                            </div>

                        )}

                    </div>

                </section>


                {/* =================================================
                    INFORMATION
                ================================================= */}
                <div className="part-info-box">

                    <Info size={18} />

                    <div>

                        <strong>
                            Gestion des pièces détachées
                        </strong>

                        <p>
                            Les informations saisies seront utilisées pour
                            suivre le stock et associer les pièces aux
                            équipements concernés.
                        </p>

                    </div>

                </div>


                {/* =================================================
                    ACTIONS
                ================================================= */}
                <div className="part-form-actions">

                    <button
                        type="button"
                        className="part-btn-secondary"
                        onClick={() => navigate('/parts')}
                        disabled={loading}
                    >
                        <ArrowLeft size={16} />
                        Annuler
                    </button>


                    <button
                        type="submit"
                        className="part-btn-primary"
                        disabled={loading}
                    >

                        {loading ? (

                            <>
                                <Loader2
                                    size={17}
                                    className="spin"
                                />

                                Enregistrement...
                            </>

                        ) : (

                            <>
                                <Save size={17} />

                                {isEdit
                                    ? 'Mettre à jour'
                                    : 'Créer la pièce'}
                            </>

                        )}

                    </button>

                </div>

            </form>

        </div>
    );
};

export default PartForm;