import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { RefreshCw, Folder, FolderOpen, Plus, ChevronRight, ChevronDown, Edit3, Trash2 } from 'lucide-react';
import './EquipmentHierarchy.css';

const EquipmentHierarchy = () => {
    const [hierarchy, setHierarchy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [editCategory, setEditCategory] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '', description: '', parent_id: '' });

    useEffect(() => {
        fetchHierarchy();
    }, []);

    const fetchHierarchy = async () => {
        setLoading(true);
        try {
            const response = await api.get('/equipment-categories/hierarchy');
            setHierarchy(response.data.data || []);
            // Ouvrir automatiquement le premier niveau
            const initialExpand = {};
            response.data.data.forEach(item => {
                initialExpand[item.id] = true;
            });
            setExpanded(initialExpand);
        } catch (error) {
            console.error('Erreur chargement hiérarchie:', error);
            toast.error('Impossible de charger la structure');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editCategory) {
                await api.put(`/equipment-categories/${editCategory.id}`, formData);
                toast.success('Catégorie mise à jour');
            } else {
                await api.post('/equipment-categories', formData);
                toast.success('Catégorie créée');
            }
            setShowForm(false);
            setEditCategory(null);
            setFormData({ name: '', code: '', description: '', parent_id: '' });
            fetchHierarchy();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erreur');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer cette catégorie ?')) return;
        try {
            await api.delete(`/equipment-categories/${id}`);
            toast.success('Catégorie supprimée');
            fetchHierarchy();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erreur');
        }
    };

    const openEdit = (category) => {
        setEditCategory(category);
        setFormData({
            name: category.name,
            code: category.code || '',
            description: category.description || '',
            parent_id: category.parent_id || '',
        });
        setShowForm(true);
    };

    const renderNode = (node) => {
        const isExpanded = expanded[node.id];
        const hasChildren = (node.children && node.children.length > 0);
        const hasEquipments = (node.equipments && node.equipments.length > 0);

        return (
            <div key={node.id} className="hierarchy-node">
                <div className="node-header" onClick={() => hasChildren && toggleExpand(node.id)}>
                    <div className="node-info">
                        {hasChildren ? (
                            isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                        ) : (
                            <span className="node-spacer"></span>
                        )}
                        {isExpanded ? <FolderOpen size={18} className="folder-open" /> : <Folder size={18} className="folder" />}
                        <span className="node-name">{node.name}</span>
                        {node.code && <span className="node-code">{node.code}</span>}
                        <span className="node-count">
                            {node.equipments?.length || 0} équipement(s)
                        </span>
                    </div>
                    <div className="node-actions">
                        <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openEdit(node); }}>
                            <Edit3 size={14} />
                        </button>
                        <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(node.id); }}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {isExpanded && node.children && node.children.length > 0 && (
                    <div className="node-children">
                        {node.children.map(child => renderNode(child))}
                    </div>
                )}

                {isExpanded && hasEquipments && (
                    <div className="node-equipments">
                        {node.equipments.map(eq => (
                            <div key={eq.id} className="equipment-item">
                                <span className="eq-icon">🔧</span>
                                <span className="eq-name">{eq.name}</span>
                                {eq.code && <span className="eq-code">{eq.code}</span>}
                                <span className={`eq-status status-${eq.status}`}>{eq.status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="loading-state"><RefreshCw size={36} className="spin" /> Chargement...</div>;
    }

    return (
        <div className="equipment-hierarchy">
            <div className="hierarchy-header">
                <h1>📂 Structure des équipements</h1>
                <div className="header-actions">
                    <button className="btn-primary" onClick={() => { setShowForm(true); setEditCategory(null); setFormData({ name: '', code: '', description: '', parent_id: '' }); }}>
                        <Plus size={18} /> Nouvelle catégorie
                    </button>
                    <button className="btn-refresh" onClick={fetchHierarchy}>
                        <RefreshCw size={18} /> Actualiser
                    </button>
                </div>
            </div>

            {hierarchy.length === 0 ? (
                <div className="empty-state">
                    <p>Aucune catégorie définie.</p>
                    <p className="hint">Créez une catégorie pour commencer à organiser vos équipements.</p>
                </div>
            ) : (
                <div className="hierarchy-tree">
                    {hierarchy.map(node => renderNode(node))}
                </div>
            )}

            {/* Modal de création/modification */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h2>
                            <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nom</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Code</label>
                                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="2" />
                            </div>
                            <div className="form-group">
                                <label>Catégorie parente (optionnel)</label>
                                <select value={formData.parent_id} onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}>
                                    <option value="">Aucune (catégorie racine)</option>
                                    {hierarchy.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Annuler</button>
                                <button type="submit" className="btn-primary">{editCategory ? 'Mettre à jour' : 'Créer'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentHierarchy;