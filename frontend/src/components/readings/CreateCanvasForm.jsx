import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

import {
    ArrowLeft,
    Save,
    X,
    Plus,
    Trash2,
    FileText,
    Wrench,
    RefreshCw,
    Sparkles,
    ShieldCheck,
    Download,
    Settings2,
    ClipboardList,
    Building2,
    SlidersHorizontal,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Info,
    Eye,
} from 'lucide-react';

import './CreateCanvasForm.css';

const STEPS = [
    { id: 'header', stepNumber: 1, title: 'En-tête', sub: 'Informations officielles' },
    { id: 'general', stepNumber: 2, title: 'Identification', sub: 'Canvas et équipement' },
    { id: 'parameters', stepNumber: 3, title: 'Paramètres', sub: 'Mesures et tolérances' },
    { id: 'validation', stepNumber: 4, title: 'Validation', sub: 'Signatures et annexes' },
    { id: 'preview', stepNumber: 5, title: 'Prévisualisation', sub: 'Aperçu du document' },
];

const CreateCanvasForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [equipments, setEquipments] = useState([]);

    // Navigation des étapes par ID
    const [activeSection, setActiveSection] = useState('header');

    const [formData, setFormData] = useState({
        equipment_id: '',
        template_name: '',
        template_type: '',
        frequency: 'hebdomadaire',

        header: {
            aeroport: 'FES SAISS',
            division: 'DIVISION TECHNIQUE NAVIGATION',
            code: 'FEZ_8_E_006/01',
            ref_envoi: '',
            date: '',
        },

        parameters: [],
        signatures: [],
        annexes: [],
    });

    const [newParam, setNewParam] = useState({
        name: '',
        unit: '',
        monitors: 2,
        tolerance: '',
        normal_min: '',
        normal_max: '',
        critical_min: '',
        critical_max: '',
    });

    const [newSignature, setNewSignature] = useState('');
    const [newAnnexe, setNewAnnexe] = useState('');

    useEffect(() => {
        loadEquipments();

        if (isEdit) {
            loadCanvas();
        }
    }, [id]);

    // Index de l'étape courante (0 à 4)
    const currentStepIndex = useMemo(() => {
        return STEPS.findIndex((s) => s.id === activeSection);
    }, [activeSection]);

    // Navigation suivant/précédent
    const handleNextStep = () => {
        if (currentStepIndex < STEPS.length - 1) {
            setActiveSection(STEPS[currentStepIndex + 1].id);
        }
    };

    const handlePrevStep = () => {
        if (currentStepIndex > 0) {
            setActiveSection(STEPS[currentStepIndex - 1].id);
        }
    };

    // ============================================================
    // CHARGEMENT DES DONNÉES
    // ============================================================

    const loadEquipments = async () => {
        try {
            const response = await api.get('/equipments');
            setEquipments(response.data.data || response.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Erreur de chargement des équipements');
        }
    };

    const loadCanvas = async () => {
        try {
            const response = await api.get(`/canvases/${id}`);
            const data = response.data.data || response.data;

            setFormData({
                equipment_id: data.equipment_id || '',
                template_name: data.template_name || '',
                template_type: data.template_type || '',
                frequency: data.frequency || 'hebdomadaire',

                header: {
                    aeroport: data.header?.aeroport || 'FES SAISS',
                    division: data.header?.division || 'DIVISION TECHNIQUE NAVIGATION',
                    code: data.header?.code || 'FEZ_8_E_006/01',
                    ref_envoi: data.header?.ref_envoi || '',
                    date: data.header?.date || '',
                },

                parameters: Array.isArray(data.parameters) ? data.parameters : [],
                signatures: Array.isArray(data.signatures) ? data.signatures : [],
                annexes: Array.isArray(data.annexes) ? data.annexes : [],
            });
        } catch (error) {
            console.error(error);
            toast.error('Erreur de chargement du canvas');
            navigate('/readings/canvases');
        }
    };

    // ============================================================
    // GESTIONNAIRES D'ÉVÉNEMENTS
    // ============================================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name.startsWith('header.')) {
            const key = name.split('.')[1];
            setFormData((prev) => ({
                ...prev,
                header: {
                    ...prev.header,
                    [key]: value,
                },
            }));
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleParameterChange = (field, value) => {
        setNewParam((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // ============================================================
    // PARAMÈTRES
    // ============================================================

    const addParameter = () => {
        if (!newParam.name.trim()) {
            toast.error('Le nom du paramètre est requis');
            return;
        }

        const parameter = {
            ...newParam,
            id: Date.now(),
        };

        setFormData((prev) => ({
            ...prev,
            parameters: [...prev.parameters, parameter],
        }));

        setNewParam({
            name: '',
            unit: '',
            monitors: 2,
            tolerance: '',
            normal_min: '',
            normal_max: '',
            critical_min: '',
            critical_max: '',
        });

        toast.success('Paramètre ajouté');
    };

    const removeParameter = (paramId, index) => {
        setFormData((prev) => ({
            ...prev,
            parameters: prev.parameters.filter((parameter, parameterIndex) =>
                parameter.id ? parameter.id !== paramId : parameterIndex !== index
            ),
        }));
    };

    // ============================================================
    // SIGNATURES
    // ============================================================

    const addSignature = () => {
        const value = newSignature.trim();

        if (!value) {
            toast.error('Saisissez un rôle de validation');
            return;
        }

        setFormData((prev) => ({
            ...prev,
            signatures: [...prev.signatures, value],
        }));

        setNewSignature('');
    };

    const removeSignature = (index) => {
        setFormData((prev) => ({
            ...prev,
            signatures: prev.signatures.filter((_, i) => i !== index),
        }));
    };

    // ============================================================
    // ANNEXES
    // ============================================================

    const addAnnexe = () => {
        const value = newAnnexe.trim();

        if (!value) {
            toast.error('Saisissez le nom de l’annexe');
            return;
        }

        setFormData((prev) => ({
            ...prev,
            annexes: [...prev.annexes, value],
        }));

        setNewAnnexe('');
    };

    const removeAnnexe = (index) => {
        setFormData((prev) => ({
            ...prev,
            annexes: prev.annexes.filter((_, i) => i !== index),
        }));
    };

    // ============================================================
    // MODÈLES DE PRÉREMPLISSAGE (TEMPLATES)
    // ============================================================

    const applyTemplate = (template) => {
        setFormData((prev) => ({
            ...prev,
            template_name: template.template_name,
            template_type: template.template_type,
            frequency: template.frequency,
            header: {
                ...prev.header,
                ...template.header,
            },
            parameters: template.parameters || [],
            signatures: template.signatures || [],
            annexes: template.annexes || [],
        }));

        setActiveSection('parameters');
        toast.success(`Template ${template.template_name} appliqué`);
    };

    const applyVorTemplate = () => {
        applyTemplate({
            template_name: 'RELEVÉ VOR AN431',
            template_type: 'VOR_AN431',
            frequency: 'hebdomadaire',
            header: {
                aeroport: 'FES SAISS',
                division: 'DIVISION TECHNIQUE NAVIGATION',
                code: 'FEZ_8_E_006/01',
                ref_envoi: '',
                date: '',
            },
            parameters: [
                { id: Date.now() + 1, name: 'Niveau HF', unit: '%', monitors: 2, tolerance: '>80%', normal_min: '80', normal_max: '100', critical_min: '', critical_max: '' },
                { id: Date.now() + 2, name: 'Azimut', unit: '°', monitors: 2, tolerance: 'Référence ±1°', normal_min: '-1', normal_max: '1', critical_min: '', critical_max: '' },
                { id: Date.now() + 3, name: 'TDM 30_VAR', unit: '%', monitors: 2, tolerance: '28% à 32%', normal_min: '28', normal_max: '32', critical_min: '', critical_max: '' },
                { id: Date.now() + 4, name: 'TDM 9960 Hz', unit: '%', monitors: 2, tolerance: '28% à 32%', normal_min: '28', normal_max: '32', critical_min: '', critical_max: '' },
                { id: Date.now() + 5, name: 'Indice de modulation EM', unit: '%', monitors: 2, tolerance: '16±1', normal_min: '15', normal_max: '17', critical_min: '', critical_max: '' },
                { id: Date.now() + 6, name: 'TDM 1020', unit: '%', monitors: 2, tolerance: '8% à 12%', normal_min: '8', normal_max: '12', critical_min: '', critical_max: '' },
            ],
            signatures: [
                'Électroniciens de la Sécurité Aérienne',
                'Responsable technique',
                'Chef de Service Radar & Radionavigation',
            ],
            annexes: [
                "Test d'autonomie des batteries",
                'État des climatiseurs',
                'État des antennes',
                "Taux d'obstacles",
            ],
        });
    };

    const applyIlsTemplate = () => {
        applyTemplate({
            template_name: 'RELEVÉ ILS RWY28',
            template_type: 'ILS_RWY28',
            frequency: 'hebdomadaire',
            header: {
                aeroport: 'FES SAISS',
                division: 'DIVISION TECHNIQUE NAVIGATION',
                code: 'FEZ_8_E_007/01',
                ref_envoi: '',
                date: '',
            },
            parameters: [
                { id: Date.now() + 1, name: 'Puissance émise', unit: 'W', monitors: 2, tolerance: '>10W', normal_min: '10', normal_max: '50', critical_min: '', critical_max: '' },
                { id: Date.now() + 2, name: 'Fréquence LOC', unit: 'MHz', monitors: 2, tolerance: '±0.5 MHz', normal_min: '108.1', normal_max: '111.9', critical_min: '', critical_max: '' },
                { id: Date.now() + 3, name: 'DDM', unit: '%', monitors: 2, tolerance: '0.0875 ± 0.005', normal_min: '', normal_max: '', critical_min: '', critical_max: '' },
                { id: Date.now() + 4, name: 'Modulation', unit: '%', monitors: 2, tolerance: '20% à 40%', normal_min: '20', normal_max: '40', critical_min: '', critical_max: '' },
            ],
            signatures: [
                'Électroniciens de la Sécurité Aérienne',
                'Responsable technique',
                'Chef de Service Radar & Radionavigation',
            ],
            annexes: [
                'Contrôle du câblage',
                'Test des alimentations',
                'État du réflecteur',
            ],
        });
    };

    const applyDmeTemplate = () => {
        applyTemplate({
            template_name: 'RELEVÉ DME 2',
            template_type: 'DME_2',
            frequency: 'mensuelle',
            header: {
                aeroport: 'FES SAISS',
                division: 'DIVISION TECHNIQUE NAVIGATION',
                code: 'FEZ_8_E_008/01',
                ref_envoi: '',
                date: '',
            },
            parameters: [
                { id: Date.now() + 1, name: 'Puissance porteuse', unit: 'W', monitors: 2, tolerance: '>20W', normal_min: '20', normal_max: '100', critical_min: '', critical_max: '' },
                { id: Date.now() + 2, name: 'TDM 9960', unit: '%', monitors: 2, tolerance: '28% à 32%', normal_min: '28', normal_max: '32', critical_min: '', critical_max: '' },
                { id: Date.now() + 3, name: 'TDM 1020', unit: '%', monitors: 2, tolerance: '8% à 12%', normal_min: '8', normal_max: '12', critical_min: '', critical_max: '' },
                { id: Date.now() + 4, name: 'Fréquence interrogation', unit: 'MHz', monitors: 2, tolerance: '±1 MHz', normal_min: '960', normal_max: '1215', critical_min: '', critical_max: '' },
            ],
            signatures: [
                'Électroniciens de la Sécurité Aérienne',
                'Responsable technique',
            ],
            annexes: [
                "État de l'antenne",
                'Test des répondeurs',
            ],
        });
    };

    const applyRadarTemplate = () => {
        applyTemplate({
            template_name: 'RELEVÉ RADAR ASR-9',
            template_type: 'RADAR_ASR9',
            frequency: 'trimestrielle',
            header: {
                aeroport: 'FES SAISS',
                division: 'DIVISION TECHNIQUE NAVIGATION',
                code: 'FEZ_8_E_009/01',
                ref_envoi: '',
                date: '',
            },
            parameters: [
                { id: Date.now() + 1, name: 'Puissance crête', unit: 'kW', monitors: 2, tolerance: '>25kW', normal_min: '25', normal_max: '50', critical_min: '', critical_max: '' },
                { id: Date.now() + 2, name: 'Fréquence', unit: 'MHz', monitors: 2, tolerance: '±0.5 MHz', normal_min: '', normal_max: '', critical_min: '', critical_max: '' },
                { id: Date.now() + 3, name: 'Taux de rotation', unit: 'rpm', monitors: 2, tolerance: '12 ± 1', normal_min: '11', normal_max: '13', critical_min: '', critical_max: '' },
                { id: Date.now() + 4, name: 'Sensibilité récepteur', unit: 'dBm', monitors: 2, tolerance: '>-90dBm', normal_min: '-90', normal_max: '', critical_min: '', critical_max: '' },
                { id: Date.now() + 5, name: 'Largeur de faisceau', unit: '°', monitors: 2, tolerance: '1.5° ± 0.1°', normal_min: '1.4', normal_max: '1.6', critical_min: '', critical_max: '' },
            ],
            signatures: [
                'Électroniciens de la Sécurité Aérienne',
                'Responsable technique',
                'Chef de Service Radar & Radionavigation',
            ],
            annexes: [
                'État du radôme',
                'Contrôle des alimentations',
                'Test des amplificateurs',
            ],
        });
    };

    // ============================================================
    // EXPORT PDF
    // ============================================================

    const exportPdf = async () => {
        if (!isEdit) {
            toast.error("Enregistrez d'abord le canvas avant de l'exporter");
            return;
        }

        setExporting(true);

        try {
            const response = await api.get(`/canvases/${id}/export-pdf`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `${formData.template_name || 'canvas'}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('PDF exporté avec succès');
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'export PDF");
        } finally {
            setExporting(false);
        }
    };

    // ============================================================
    // SOUMISSION DU FORMULAIRE
    // ============================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.header.aeroport.trim()) {
            toast.error("Le nom de l'aéroport est requis");
            setActiveSection('header');
            return;
        }

        if (!formData.equipment_id) {
            toast.error('Sélectionnez un équipement');
            setActiveSection('general');
            return;
        }

        if (!formData.template_name.trim()) {
            toast.error('Le nom du canvas est requis');
            setActiveSection('general');
            return;
        }

        if (!formData.template_type.trim()) {
            toast.error('Le type / code est requis');
            setActiveSection('general');
            return;
        }

        if (formData.parameters.length === 0) {
            toast.error('Ajoutez au moins un paramètre');
            setActiveSection('parameters');
            return;
        }

        setLoading(true);

        try {
            if (isEdit) {
                await api.put(`/canvases/${id}`, formData);
                toast.success('Canvas mis à jour avec succès');
            } else {
                await api.post('/canvases', formData);
                toast.success('Canvas créé avec succès');
            }

            navigate('/readings/canvases');
        } catch (error) {
            console.error(error);
            if (error.response?.data?.errors) {
                console.error('Erreurs validation:', error.response.data.errors);
            }
            toast.error("Erreur lors de l'enregistrement");
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // VALEURS CALCULÉES
    // ============================================================

    const selectedEquipment = useMemo(() => {
        return equipments.find(
            (equipment) => String(equipment.id) === String(formData.equipment_id)
        );
    }, [equipments, formData.equipment_id]);

    const getFrequencyLabel = (frequency) => {
        const labels = {
            hebdomadaire: 'Hebdomadaire',
            bimensuelle: 'Bimensuelle',
            mensuelle: 'Mensuelle',
            trimestrielle: 'Trimestrielle',
            annuelle: 'Annuelle',
        };
        return labels[frequency] || frequency || '—';
    };

    const monitorColumns = useMemo(() => {
        const maxMonitors = Math.max(
            1,
            ...formData.parameters.map((parameter) => Number(parameter.monitors) || 1)
        );
        return Array.from({ length: maxMonitors }, (_, index) => index + 1);
    }, [formData.parameters]);

    // ============================================================
    // RENDU DU COMPOSANT
    // ============================================================

    return (
        <div className="canvas-page">
            {/* EN-TÊTE DE PAGE */}
            <header className="page-header">
                <div className="header-top">
                    <button
                        type="button"
                        className="back-button"
                        onClick={() => navigate('/readings/canvases')}
                    >
                        <span className="arrow-icon">
                            <ArrowLeft size={18} />
                        </span>
                        <span>Retour aux canvas</span>
                    </button>

                    <div className="header-status">
                        {isEdit ? (
                            <span className="status-badge edit">
                                <RefreshCw size={15} />
                                Modification
                            </span>
                        ) : (
                            <span className="new-canvas-badge">
                                <Plus size={15} />
                               
                            </span>
                        )}
                    </div>
                </div>

                <div className="header-main">
                    <div className="page-title">
                        <div className="title-icon">
                            <ClipboardList size={27} />
                        </div>
                        <div>
                            <h1>{isEdit ? 'Modifier le canvas' : 'Créer un canvas'}</h1>
                            <p>Configuration du relevé de maintenance</p>
                        </div>
                    </div>

                    <div className="header-actions">
                        <div className="template-actions">
                            <button type="button" className="template-button" onClick={applyVorTemplate}>
                                <Wrench size={16} /> VOR
                            </button>
                            <button type="button" className="template-button" onClick={applyIlsTemplate}>
                                <Settings2 size={16} /> ILS
                            </button>
                            <button type="button" className="template-button" onClick={applyDmeTemplate}>
                                <RefreshCw size={16} /> DME
                            </button>
                            <button type="button" className="template-button" onClick={applyRadarTemplate}>
                                <Sparkles size={16} /> Radar
                            </button>
                        </div>

                        
                    </div>
                </div>

                {/* NAVIGATION DES ÉTAPES */}
                <nav className="steps-navigation">
                    {STEPS.map((step, index) => {
                        const isActive = activeSection === step.id;
                        const isCompleted = currentStepIndex > index;

                        return (
                            <React.Fragment key={step.id}>
                                <button
                                    type="button"
                                    className={`step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                    onClick={() => setActiveSection(step.id)}
                                >
                                    <span className="step-number">
                                        {isCompleted ? '✓' : step.stepNumber}
                                    </span>
                                    <span>
                                        <strong>{step.title}</strong>
                                        <small>{step.sub}</small>
                                    </span>
                                </button>

                                {index < STEPS.length - 1 && (
                                    <ChevronRight className={`step-arrow ${isCompleted ? 'completed' : ''}`} size={18} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </nav>
            </header>

            {/* FORMULAIRE PRINCIPAL AVEC CONDITIONNEMENT SUR ACTIVE SECTION */}
            <main className="canvas-layout">
                <form id="canvas-form" onSubmit={handleSubmit} className="canvas-form">
                    
                    {/* SECTION 1 : EN-TÊTE */}
                    {activeSection === 'header' && (
                        <section id="header" className="form-card">
                            <div className="card-heading">
                                <div className="card-icon">
                                    <Building2 size={21} />
                                </div>
                                <div>
                                    <h2>En-tête du document</h2>
                                    <p>Informations officielles apparaissant sur le relevé.</p>
                                </div>
                            </div>

                            <div className="official-header-box">
                                <div className="official-header-title">
                                    <FileText size={18} />
                                    Identification officielle
                                </div>

                                <div className="form-grid">
                                    <div className="field-group">
                                        <label>Aéroport</label>
                                        <input
                                            type="text"
                                            name="header.aeroport"
                                            value={formData.header.aeroport}
                                            onChange={handleChange}
                                            placeholder="FES SAISS"
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Division</label>
                                        <input
                                            type="text"
                                            name="header.division"
                                            value={formData.header.division}
                                            onChange={handleChange}
                                            placeholder="DIVISION TECHNIQUE NAVIGATION"
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Code</label>
                                        <input
                                            type="text"
                                            name="header.code"
                                            value={formData.header.code}
                                            onChange={handleChange}
                                            placeholder="FEZ_8_E_006/01"
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Référence d'envoi</label>
                                        <input
                                            type="text"
                                            name="header.ref_envoi"
                                            value={formData.header.ref_envoi}
                                            onChange={handleChange}
                                            placeholder="Référence"
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            name="header.date"
                                            value={formData.header.date}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* SECTION 2 : IDENTIFICATION */}
                    {activeSection === 'general' && (
                        <section id="general" className="form-card">
                            <div className="card-heading">
                                <div className="card-icon">
                                    <ClipboardList size={21} />
                                </div>
                                <div>
                                    <h2>Identification</h2>
                                    <p>Définissez le canvas et l'équipement concerné.</p>
                                </div>
                            </div>

                            <div className="form-grid">
                                <div className="field-group full-width">
                                    <label>
                                        Équipement <span className="required">*</span>
                                    </label>
                                    <select
                                        name="equipment_id"
                                        value={formData.equipment_id}
                                        onChange={handleChange}
                                    >
                                        <option value="">Sélectionnez un équipement</option>
                                        {equipments.map((equipment) => (
                                            <option key={equipment.id} value={equipment.id}>
                                                {equipment.name || equipment.designation || `Équipement #${equipment.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedEquipment && (
                                    <div className="selected-equipment-info full-width">
                                        <div className="selected-equipment-icon">
                                            <Wrench size={19} />
                                        </div>
                                        <div>
                                            <strong>
                                                {selectedEquipment.name || selectedEquipment.designation || 'Équipement sélectionné'}
                                            </strong>
                                            <span>
                                                {selectedEquipment.code || selectedEquipment.reference || `ID : ${selectedEquipment.id}`}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="field-group">
                                    <label>
                                        Nom du canvas <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="template_name"
                                        value={formData.template_name}
                                        onChange={handleChange}
                                        placeholder="Ex. RELEVÉ VOR AN431"
                                    />
                                </div>

                                <div className="field-group">
                                    <label>
                                        Type / Code <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="template_type"
                                        value={formData.template_type}
                                        onChange={handleChange}
                                        placeholder="Ex. VOR_AN431"
                                    />
                                </div>

                                <div className="field-group">
                                    <label>Fréquence</label>
                                    <select
                                        name="frequency"
                                        value={formData.frequency}
                                        onChange={handleChange}
                                    >
                                        <option value="hebdomadaire">Hebdomadaire</option>
                                        <option value="bimensuelle">Bimensuelle</option>
                                        <option value="mensuelle">Mensuelle</option>
                                        <option value="trimestrielle">Trimestrielle</option>
                                        <option value="annuelle">Annuelle</option>
                                    </select>
                                </div>
                            </div>

                            <div className="important-message">
                                <Info size={18} />
                                <div>
                                    <strong>Templates rapides</strong>
                                    <span>Vous pouvez utiliser les boutons VOR, ILS, DME ou Radar en haut de la page pour préremplir automatiquement le canvas.</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* SECTION 3 : PARAMÈTRES */}
                    {activeSection === 'parameters' && (
                        <section id="parameters" className="form-card">
                            <div className="card-heading">
                                <div className="card-icon">
                                    <SlidersHorizontal size={21} />
                                </div>
                                <div>
                                    <h2>Paramètres de mesure</h2>
                                    <p>Définissez les paramètres, unités, tolérances et limites.</p>
                                </div>
                                <span className="parameter-count">
                                    {formData.parameters.length} paramètre(s)
                                </span>
                            </div>

                            <div className="parameter-form">
                                <div className="parameter-grid">
                                    <div className="field-group">
                                        <label>Paramètre</label>
                                        <input
                                            type="text"
                                            value={newParam.name}
                                            onChange={(e) => handleParameterChange('name', e.target.value)}
                                            placeholder="Ex. Niveau HF"
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Unité</label>
                                        <input
                                            type="text"
                                            value={newParam.unit}
                                            onChange={(e) => handleParameterChange('unit', e.target.value)}
                                            placeholder="%, W, MHz..."
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Moniteurs</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={newParam.monitors}
                                            onChange={(e) => handleParameterChange('monitors', e.target.value)}
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Tolérance</label>
                                        <input
                                            type="text"
                                            value={newParam.tolerance}
                                            onChange={(e) => handleParameterChange('tolerance', e.target.value)}
                                            placeholder="Ex. 28% à 32%"
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Min normal</label>
                                        <input
                                            type="text"
                                            value={newParam.normal_min}
                                            onChange={(e) => handleParameterChange('normal_min', e.target.value)}
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Max normal</label>
                                        <input
                                            type="text"
                                            value={newParam.normal_max}
                                            onChange={(e) => handleParameterChange('normal_max', e.target.value)}
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Min critique</label>
                                        <input
                                            type="text"
                                            value={newParam.critical_min}
                                            onChange={(e) => handleParameterChange('critical_min', e.target.value)}
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Max critique</label>
                                        <input
                                            type="text"
                                            value={newParam.critical_max}
                                            onChange={(e) => handleParameterChange('critical_max', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button type="button" className="add-button" onClick={addParameter}>
                                    <Plus size={17} /> Ajouter le paramètre
                                </button>
                            </div>

                            {formData.parameters.length > 0 ? (
                                <div className="parameters-table-wrapper">
                                    <table className="parameters-table">
                                        <thead>
                                            <tr>
                                                <th>Paramètre</th>
                                                <th>Unité</th>
                                                <th>Moniteurs</th>
                                                <th>Tolérance</th>
                                                <th>Normal</th>
                                                <th>Critique</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.parameters.map((parameter, index) => (
                                                <tr key={parameter.id || index}>
                                                    <td>
                                                        <strong>{parameter.name}</strong>
                                                    </td>
                                                    <td>{parameter.unit || '—'}</td>
                                                    <td>
                                                        <span className="monitor-badge">
                                                            {parameter.monitors || 1}
                                                        </span>
                                                    </td>
                                                    <td>{parameter.tolerance || '—'}</td>
                                                    <td>
                                                        {parameter.normal_min || parameter.normal_max
                                                            ? `${parameter.normal_min || '—'} → ${parameter.normal_max || '—'}`
                                                            : '—'}
                                                    </td>
                                                    <td>
                                                        {parameter.critical_min || parameter.critical_max
                                                            ? `${parameter.critical_min || '—'} → ${parameter.critical_max || '—'}`
                                                            : '—'}
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="delete-button"
                                                            onClick={() => removeParameter(parameter.id, index)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <SlidersHorizontal size={30} />
                                    <strong>Aucun paramètre</strong>
                                    <span>Ajoutez au moins un paramètre de mesure.</span>
                                </div>
                            )}
                        </section>
                    )}

                    {/* SECTION 4 : VALIDATION */}
                    {activeSection === 'validation' && (
                        <section id="validation" className="form-card">
                            <div className="card-heading">
                                <div className="card-icon">
                                    <ShieldCheck size={21} />
                                </div>
                                <div>
                                    <h2>Validation et annexes</h2>
                                    <p>Définissez les personnes responsables de la validation et les documents associés.</p>
                                </div>
                            </div>

                            <div className="validation-columns">
                                {/* SIGNATURES */}
                                <div className="validation-block">
                                    <div className="block-title">
                                        <CheckCircle2 size={18} /> Signatures
                                    </div>

                                    <div className="inline-add">
                                        <input
                                            type="text"
                                            value={newSignature}
                                            onChange={(e) => setNewSignature(e.target.value)}
                                            placeholder="Ex. Responsable technique"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addSignature();
                                                }
                                            }}
                                        />
                                        <button type="button" className="add-button compact" onClick={addSignature}>
                                            <Plus size={16} /> Ajouter
                                        </button>
                                    </div>

                                    {formData.signatures.length > 0 ? (
                                        <div className="item-list">
                                            {formData.signatures.map((signature, index) => (
                                                <div className="list-item" key={index}>
                                                    <div className="list-item-content">
                                                        <CheckCircle2 size={17} />
                                                        <span>{signature}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="delete-button"
                                                        onClick={() => removeSignature(index)}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="small-empty">Aucune signature configurée.</div>
                                    )}
                                </div>

                                {/* ANNEXES */}
                                <div className="validation-block">
                                    <div className="block-title">
                                        <FileText size={18} /> Annexes
                                    </div>

                                    <div className="inline-add">
                                        <input
                                            type="text"
                                            value={newAnnexe}
                                            onChange={(e) => setNewAnnexe(e.target.value)}
                                            placeholder="Ex. État des antennes"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addAnnexe();
                                                }
                                            }}
                                        />
                                        <button type="button" className="add-button compact" onClick={addAnnexe}>
                                            <Plus size={16} /> Ajouter
                                        </button>
                                    </div>

                                    {formData.annexes.length > 0 ? (
                                        <div className="item-list">
                                            {formData.annexes.map((annexe, index) => (
                                                <div className="list-item" key={index}>
                                                    <div className="list-item-content">
                                                        <FileText size={17} />
                                                        <span>{annexe}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="delete-button"
                                                        onClick={() => removeAnnexe(index)}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="small-empty">Aucune annexe configurée.</div>
                                    )}
                                </div>
                            </div>

                            <div className="validation-info">
                                <Info size={18} />
                                <span>Les signatures servent à indiquer les rôles responsables de la validation du relevé. Elles ne constituent pas encore une signature électronique.</span>
                            </div>
                        </section>
                    )}

                    {/* SECTION 5 : PRÉVISUALISATION */}
                    {activeSection === 'preview' && (
                        <section id="preview" className="form-card">
                            <div className="card-heading">
                                <div className="card-icon">
                                    <Eye size={21} />
                                </div>
                                <div>
                                    <h2>Prévisualisation</h2>
                                    <p>Aperçu du document qui sera utilisé pour le relevé.</p>
                                </div>
                            </div>

                            <div className="preview-card-section">
                                <div className="preview-container">
                                    <div className="official-document">
                                        {/* EN-TÊTE DOCUMENT */}
                                        <div className="document-header">
                                            <div className="document-logo-placeholder">ONDA</div>

                                            <div className="document-header-center">
                                                <strong>OFFICE NATIONAL DES AÉROPORTS</strong>
                                                <span>{formData.header.aeroport || 'FES SAISS'}</span>
                                                <span>{formData.header.division || 'DIVISION TECHNIQUE NAVIGATION'}</span>
                                            </div>

                                            <div className="document-meta">
                                                <span>Code</span>
                                                <strong>{formData.header.code || '—'}</strong>
                                                <span>Réf. envoi</span>
                                                <strong>{formData.header.ref_envoi || '—'}</strong>
                                                <span>Date</span>
                                                <strong>{formData.header.date || '—'}</strong>
                                            </div>
                                        </div>

                                        {/* TITRE DOCUMENT */}
                                        <div className="document-main-title">
                                            <h3>{formData.template_name || 'RELEVÉ DE MAINTENANCE'}</h3>
                                            <span>{getFrequencyLabel(formData.frequency)}</span>
                                        </div>

                                        {/* IDENTIFICATION ÉQUIPEMENT */}
                                        <div className="document-section">
                                            <div className="document-section-title">Identification de l'équipement</div>

                                            <div className="equipment-document-grid">
                                                <div>
                                                    <span>Équipement</span>
                                                    <strong>{selectedEquipment?.name || selectedEquipment?.designation || '—'}</strong>
                                                </div>

                                                <div>
                                                    <span>Référence</span>
                                                    <strong>{selectedEquipment?.code || selectedEquipment?.reference || '—'}</strong>
                                                </div>

                                                <div>
                                                    <span>Type</span>
                                                    <strong>{formData.template_type || '—'}</strong>
                                                </div>

                                                <div>
                                                    <span>Fréquence</span>
                                                    <strong>{getFrequencyLabel(formData.frequency)}</strong>
                                                </div>
                                            </div>
                                        </div>

                                        {/* TABLEAU DES MESURES */}
                                        <div className="document-section">
                                            <div className="document-section-title">Relevé des mesures</div>

                                            {formData.parameters.length > 0 ? (
                                                <div className="document-table-wrapper">
                                                    <table className="document-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Paramètre</th>
                                                                <th>Unité</th>
                                                                <th>Tolérance</th>
                                                                {monitorColumns.map((monitor) => (
                                                                    <th key={monitor}>Moniteur {monitor}</th>
                                                                ))}
                                                                <th>Observation</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {formData.parameters.map((parameter, index) => (
                                                                <tr key={parameter.id || index}>
                                                                    <td>
                                                                        <strong>{parameter.name}</strong>
                                                                        {(parameter.normal_min || parameter.normal_max) && (
                                                                            <small>
                                                                                Normal : {parameter.normal_min} → {parameter.normal_max}
                                                                            </small>
                                                                        )}
                                                                    </td>
                                                                    <td>{parameter.unit || '—'}</td>
                                                                    <td>{parameter.tolerance || '—'}</td>
                                                                    {monitorColumns.map((monitor) => (
                                                                        <td key={monitor} className="measurement-cell">
                                                                            —
                                                                        </td>
                                                                    ))}
                                                                    <td>—</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="empty-preview">Aucun paramètre configuré.</div>
                                            )}
                                        </div>

                                        {/* OBSERVATIONS */}
                                        <div className="document-section">
                                            <div className="document-section-title">Observations</div>
                                            <div className="observation-area">&nbsp;</div>
                                        </div>

                                        {/* SIGNATURES */}
                                        <div className="document-section">
                                            <div className="document-section-title">Validation</div>

                                            {formData.signatures.length > 0 ? (
                                                <div className="signature-document-grid">
                                                    {formData.signatures.map((signature, index) => (
                                                        <div className="signature-box" key={index}>
                                                            <strong>{signature}</strong>
                                                            <div className="signature-line">Signature</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="empty-signature-preview">Aucune signature configurée.</div>
                                            )}
                                        </div>

                                        {/* ANNEXES */}
                                        {formData.annexes.length > 0 && (
                                            <div className="document-section">
                                                <div className="document-section-title">Annexes</div>
                                                <ul className="annex-document-list">
                                                    {formData.annexes.map((annexe, index) => (
                                                        <li key={index}>
                                                            <FileText size={14} />
                                                            {annexe}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </form>
            </main>

            {/* PIED DE PAGE ET ACTIONS DE NAVIGATION */}
            <footer className="form-footer">
                <div className="footer-nav-buttons">
                    <button
                        type="button"
                        className="cancel-button"
                        onClick={handlePrevStep}
                        disabled={currentStepIndex === 0}
                    >
                        <ChevronLeft size={17} />
                        Précédent
                    </button>

                    {currentStepIndex < STEPS.length - 1 && (
                        <button
                            type="button"
                            className="next-button"
                            onClick={handleNextStep}
                        >
                            Suivant
                            <ChevronRight size={17} />
                        </button>
                    )}
                </div>

                <div className="footer-actions">
                    <button
                        type="button"
                        className="cancel-button"
                        onClick={() => navigate('/readings/canvases')}
                    >
                        <X size={17} />
                        Annuler
                    </button>

                    <button
                        type="submit"
                        form="canvas-form"
                        className="save-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <RefreshCw size={17} className="spin" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <Save size={17} />
                                {isEdit ? 'Mettre à jour' : 'Enregistrer le canvas'}
                            </>
                        )}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default CreateCanvasForm;