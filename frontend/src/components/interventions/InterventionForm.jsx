import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import {
    ArrowLeft,
    Save,
    X,
    Trash2,
    RefreshCw
} from 'lucide-react';
import './InterventionForm.css';

const InterventionForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);

    const [equipments, setEquipments] = useState([]);
    const [groups, setGroups] = useState([]);
    const [canvases, setCanvases] = useState([]);

    const [formData, setFormData] = useState({
        equipment_id: '',
        template_id: '',
        type: 'preventive',
        scheduled_date: '',
        scheduled_time: '09:00',
        duration: 60,
        group_id: '',
        priority: 'normale',
        description: '',
        planning_template_id: null,
    });

    // =========================================================
    // Chargement initial
    // =========================================================
    useEffect(() => {
        loadData();

        if (isEdit) {
            fetchIntervention();
        }
    }, [id]);

    // =========================================================
    // Charger équipements, groupes et Canvas
    // =========================================================
    const loadData = async () => {
        try {
            const [equipRes, groupsRes, canvasRes] = await Promise.all([
                api.get('/equipments'),
                api.get('/groups'),
                api.get('/canvases'),
            ]);

            setEquipments(
                equipRes.data?.data ||
                equipRes.data ||
                []
            );

            setGroups(
                groupsRes.data?.data ||
                groupsRes.data ||
                []
            );

            setCanvases(
                canvasRes.data?.data ||
                canvasRes.data ||
                []
            );

        } catch (error) {
            console.error(
                'Erreur chargement données:',
                error
            );

            toast.error(
                'Impossible de charger les listes'
            );
        }
    };

    // =========================================================
    // Charger intervention en modification
    // =========================================================
    const fetchIntervention = async () => {
        try {
            const res = await api.get(
                `/interventions/${id}`
            );

            const data =
                res.data?.data ||
                res.data;

            setFormData({
                equipment_id:
                    data.equipment_id || '',

                template_id:
                    data.template_id || '',

                type:
                    data.type ||
                    'preventive',

                scheduled_date:
                    data.scheduled_date ||
                    '',

                scheduled_time:
                    data.scheduled_time
                        ? data.scheduled_time.substring(0, 5)
                        : '09:00',

                duration:
                    data.duration ||
                    60,

                group_id:
                    data.group_id ||
                    '',

                priority:
                    data.priority ||
                    'normale',

                description:
                    data.description ||
                    '',

                planning_template_id:
                    data.planning_template_id ||
                    null,
            });

        } catch (error) {
            console.error(
                'Erreur chargement intervention:',
                error
            );

            toast.error(
                'Impossible de charger l\'intervention'
            );

            navigate('/planning-global');

        } finally {
            setFetching(false);
        }
    };

    // =========================================================
    // Canvas disponibles pour l'équipement sélectionné
    // =========================================================
    const availableCanvases = canvases.filter((canvas) => {
        return (
            Number(canvas.equipment_id) ===
            Number(formData.equipment_id)
        ) && (
            canvas.is_active === true ||
            canvas.is_active === 1
        );
    });

    // =========================================================
    // Gestion des champs
    // =========================================================
    const handleChange = (e) => {
        const {
            name,
            value
        } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Si l'utilisateur change d'équipement,
        // on réinitialise le Canvas sélectionné.
        if (name === 'equipment_id') {
            setFormData(prev => ({
                ...prev,
                equipment_id: value,
                template_id: ''
            }));
        }
    };

    // =========================================================
    // Soumission
    // =========================================================
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Vérification équipement
        if (!formData.equipment_id) {
            toast.error(
                'Veuillez sélectionner un équipement.'
            );
            return;
        }

        setLoading(true);

        try {
            const payload = {
                equipment_id:
                    Number(formData.equipment_id),

                template_id:
                    formData.template_id
                        ? Number(formData.template_id)
                        : null,

                type:
                    formData.type,

                scheduled_date:
                    formData.scheduled_date,

                scheduled_time:
                    formData.scheduled_time,

                duration:
                    Number(formData.duration),

                group_id:
                    formData.group_id
                        ? Number(formData.group_id)
                        : null,

                priority:
                    formData.priority,

                description:
                    formData.description,
            };

            console.log(
                'Payload intervention:',
                payload
            );

            if (isEdit) {
                await api.put(
                    `/interventions/${id}`,
                    payload
                );

                toast.success(
                    'Intervention mise à jour'
                );

            } else {
                await api.post(
                    '/interventions',
                    payload
                );

                toast.success(
                    'Intervention créée'
                );
            }

            navigate('/planning-global');

        } catch (error) {
            console.error(
                'Erreur sauvegarde:',
                error
            );

            const message =
                error.response?.data?.message ||
                error.response?.data?.errors ||
                'Erreur lors de l\'enregistrement';

            toast.error(
                typeof message === 'string'
                    ? message
                    : 'Erreur lors de l\'enregistrement'
            );

        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // Suppression
    // =========================================================
    const handleDelete = async () => {
        if (!formData.planning_template_id) {
            toast.error(
                'Cette intervention n’est pas liée à un planning récurrent.'
            );
            return;
        }

        const confirmed = window.confirm(
            '⚠️ Attention !\n\n' +
            'Cette intervention appartient à un planning récurrent.\n\n' +
            'La suppression va supprimer TOUTES les interventions ' +
            'générées par cette récurrence pour toute l’année.\n\n' +
            'Voulez-vous vraiment continuer ?'
        );

        if (!confirmed) return;

        setLoading(true);

        try {
            await api.delete(
                `/planning-templates/${formData.planning_template_id}`
            );

            toast.success(
                'La récurrence et toutes ses interventions ont été supprimées.'
            );

            navigate('/planning-global');

        } catch (error) {
            console.error(
                'Erreur suppression récurrence:',
                error
            );

            const message =
                error.response?.data?.message ||
                'Erreur lors de la suppression de la récurrence';

            toast.error(message);

        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // Chargement
    // =========================================================
    if (fetching) {
        return (
            <div className="loading-state">
                <RefreshCw
                    size={36}
                    className="spin"
                />

                <p>
                    Chargement de l'intervention...
                </p>
            </div>
        );
    }

    // =========================================================
    // Rendu
    // =========================================================
    return (
        <div className="intervention-form">

            {/* Header */}
            <div className="form-header">

                <button
                    className="btn-back"
                    onClick={() =>
                        navigate('/planning-global')
                    }
                >
                    <ArrowLeft size={16} />
                    Retour au planning
                </button>

                <h1>
                    {isEdit
                        ? 'Modifier l\'intervention'
                        : 'Nouvelle intervention'}
                </h1>

            </div>

            {/* Formulaire */}
            <form
                onSubmit={handleSubmit}
                className="form-card"
            >

                <div className="form-grid">

                    {/* =====================================================
                        Équipement
                    ====================================================== */}
                    <div className="form-group">

                        <label className="required">
                            Équipement
                        </label>

                        <select
                            name="equipment_id"
                            value={formData.equipment_id}
                            onChange={handleChange}
                            required
                        >
                            <option value="">
                                Sélectionner un équipement
                            </option>

                            {equipments.map(eq => (
                                <option
                                    key={eq.id}
                                    value={eq.id}
                                >
                                    {eq.name}
                                </option>
                            ))}
                        </select>

                    </div>

                    {/* =====================================================
                        RELEVÉ / CANVAS
                    ====================================================== */}
                    <div className="form-group">

                        <label>
                            Relevé
                        </label>

                        <select
                            name="template_id"
                            value={formData.template_id}
                            onChange={handleChange}
                            disabled={
                                !formData.equipment_id ||
                                availableCanvases.length === 0
                            }
                        >

                            <option value="">
                                {!formData.equipment_id
                                    ? 'Sélectionner d’abord un équipement'
                                    : availableCanvases.length === 0
                                        ? 'Aucun relevé disponible'
                                        : 'Sélectionner un relevé'}
                            </option>

                            {availableCanvases.map(canvas => (
                                <option
                                    key={canvas.id}
                                    value={canvas.id}
                                >
                                    {canvas.template_name}
                                </option>
                            ))}

                        </select>

                        {/* Information sous le champ */}
                        {formData.equipment_id &&
                            availableCanvases.length === 0 && (
                                <small className="form-help">
                                    Aucun Canvas de relevé actif
                                    n'est associé à cet équipement.
                                </small>
                            )}

                    </div>

                    {/* =====================================================
                        Type de maintenance
                    ====================================================== */}
                    <div className="form-group">

                        <label>
                            Type de maintenance
                        </label>

                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                        >
                            <option value="preventive">
                                Préventive
                            </option>

                            <option value="corrective">
                                Corrective
                            </option>

                            <option value="inspection">
                                Inspection
                            </option>

                            <option value="control">
                                Contrôle
                            </option>
                        </select>

                    </div>

                    {/* =====================================================
                        Date
                    ====================================================== */}
                    

                    {/* =====================================================
                        Heure
                    ====================================================== */}
                    <div className="form-group">

                        <label>
                            Heure
                        </label>

                        <input
                            type="time"
                            name="scheduled_time"
                            value={
                                formData.scheduled_time
                            }
                            onChange={handleChange}
                        />

                    </div>

                    {/* =====================================================
                        Durée
                    ====================================================== */}
                    <div className="form-group">

                        <label>
                            Durée (minutes)
                        </label>

                        <input
                            type="number"
                            name="duration"
                            value={formData.duration}
                            onChange={handleChange}
                            min="1"
                            step="5"
                        />

                    </div>

                    {/* =====================================================
                        Priorité
                    ====================================================== */}
                    <div className="form-group">

                        <label>
                            Priorité
                        </label>

                        <select
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                        >
                            <option value="faible">
                                Faible
                            </option>

                            <option value="normale">
                                Normale
                            </option>

                            <option value="elevée">
                                Élevée
                            </option>

                            <option value="urgente">
                                Urgente
                            </option>
                        </select>

                    </div>

                    {/* =====================================================
                        Groupe responsable
                    ====================================================== */}
                    <div className="form-group full-width">

                        <label>
                            Groupe responsable
                        </label>

                        <select
                            name="group_id"
                            value={formData.group_id}
                            onChange={handleChange}
                        >

                            <option value="">
                                Aucun groupe
                            </option>

                            {groups.map(g => (
                                <option
                                    key={g.id}
                                    value={g.id}
                                >
                                    {g.name}
                                </option>
                            ))}

                        </select>

                    </div>

                    {/* =====================================================
                        Description
                    ====================================================== */}
                    <div className="form-group full-width">

                        <label>
                            Description
                        </label>

                        <textarea
                            name="description"
                            value={
                                formData.description
                            }
                            onChange={handleChange}
                            rows="4"
                            placeholder="Détails de l'intervention..."
                        />

                    </div>

                </div>

                {/* =====================================================
                    Actions
                ====================================================== */}
                <div className="form-actions">

                    <div className="form-actions-left">

                        {isEdit && (
                            <button
                                type="button"
                                className="btn-delete"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                <Trash2 size={16} />
                                Supprimer
                            </button>
                        )}

                    </div>

                    <div className="form-actions-right">

                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() =>
                                navigate('/planning-global')
                            }
                            disabled={loading}
                        >
                            <X size={16} />
                            Annuler
                        </button>

                        <button
                            type="submit"
                            className="btn-save"
                            disabled={loading}
                        >

                            {loading ? (
                                <>
                                    <RefreshCw
                                        size={16}
                                        className="spin"
                                    />

                                    Enregistrement...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />

                                    {isEdit
                                        ? 'Mettre à jour'
                                        : 'Créer'}
                                </>
                            )}

                        </button>

                    </div>

                </div>

            </form>

        </div>
    );
};

export default InterventionForm;