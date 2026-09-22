import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { 
    Package, Plus, Search, Edit, Trash2, Eye,
    AlertTriangle, CheckCircle2, RefreshCw, XCircle,
    Boxes, DollarSign, ShieldAlert
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import './PartsList.css';

const PartsList = () => {
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [partToDelete, setPartToDelete] = useState(null);
    const [filterLowStock, setFilterLowStock] = useState(false);

    useEffect(() => {
        loadParts();
    }, []);

    const loadParts = async () => {
        setLoading(true);
        try {
            const response = await api.get('/parts');
            setParts(response.data.data || response.data || []);
        } catch (error) {
            toast.error('Erreur lors du chargement des pièces');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!partToDelete) return;
        try {
            await api.delete(`/parts/${partToDelete.id}`);
            toast.success('Pièce supprimée avec succès');
            setShowDeleteModal(false);
            setPartToDelete(null);
            loadParts();
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
    };

    // Calcul des statistiques
    const stats = useMemo(() => {
        const totalItems = parts.length;
        const lowStockItems = parts.filter(p => p.quantity <= p.alert_threshold).length;
        const outOfStockItems = parts.filter(p => p.quantity === 0).length;
        const totalValue = parts.reduce((acc, p) => acc + (p.quantity * (parseFloat(p.unit_price) || 0)), 0);

        return { totalItems, lowStockItems, outOfStockItems, totalValue };
    }, [parts]);

    // Filtrage des données
    const filteredParts = useMemo(() => {
        return parts.filter(p => {
            const query = search.toLowerCase();
            const matchSearch = 
                p.name?.toLowerCase().includes(query) ||
                p.reference?.toLowerCase().includes(query) ||
                p.category?.toLowerCase().includes(query) ||
                p.supplier?.toLowerCase().includes(query);
            
            const matchStock = !filterLowStock || p.quantity <= p.alert_threshold;
            return matchSearch && matchStock;
        });
    }, [parts, search, filterLowStock]);

    if (loading) {
        return (
            <div className="loading-wrapper">
                <RefreshCw size={24} className="spin text-blue-600" />
                <span>Chargement de l'inventaire...</span>
            </div>
        );
    }

    return (
        <div className="parts-container">
            {/* Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">Gestion des Stocks & Pièces</h1>
                    <p className="page-subtitle">Suivez les disponibilités, consommables et réapprovisionnements</p>
                </div>
                <Link to="/parts/new" className="btn-primary">
                    <Plus size={18} />
                    <span>Nouvelle pièce</span>
                </Link>
            </header>

            {/* Cartes de Statistiques (KPIs) */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon blue">
                        <Boxes size={22} />
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-label">Total Références</span>
                        <span className="kpi-value">{stats.totalItems}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon amber">
                        <AlertTriangle size={22} />
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-label">Stock Bas</span>
                        <span className="kpi-value">{stats.lowStockItems}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon red">
                        <XCircle size={22} />
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-label">Rupture de Stock</span>
                        <span className="kpi-value">{stats.outOfStockItems}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon green">
                        <DollarSign size={22} />
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-label">Valeur du Stock</span>
                        <span className="kpi-value">{stats.totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                </div>
            </div>

            {/* Barre de Recherche et Filtres */}
            <div className="filters-card">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Rechercher par réf, nom, catégorie, fournisseur..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="filters-actions">
                    <button 
                        type="button"
                        className={`filter-btn ${filterLowStock ? 'active' : ''}`}
                        onClick={() => setFilterLowStock(!filterLowStock)}
                    >
                        <ShieldAlert size={16} />
                        <span>Alerte stock ({stats.lowStockItems})</span>
                    </button>

                    <button type="button" className="btn-icon" onClick={loadParts} title="Actualiser">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Tableau des Pièces */}
            <div className="table-card">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Référence</th>
                            <th>Désignation</th>
                            <th>Catégorie</th>
                            <th>Fournisseur</th>
                            <th>Quantité</th>
                            <th>Prix Unitaire</th>
                            <th>Statut</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredParts.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="empty-state">
                                    <Package size={36} />
                                    <p>Aucune pièce ne correspond à vos critères.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredParts.map((part) => {
                                const isOutOfStock = part.quantity === 0;
                                const isLowStock = part.quantity <= part.alert_threshold && !isOutOfStock;

                                return (
                                    <tr key={part.id}>
                                        <td>
                                            <span className="part-ref-code">{part.reference}</span>
                                        </td>
                                        <td>
                                            <div className="part-name">{part.name}</div>
                                            {part.location && <span className="part-location">📍 {part.location}</span>}
                                        </td>
                                        <td>
                                            <span className="category-tag">{part.category || 'Non classé'}</span>
                                        </td>
                                        <td className="text-muted">{part.supplier || '-'}</td>
                                        <td>
                                            <span className={`qty-indicator ${isOutOfStock ? 'out' : isLowStock ? 'low' : 'ok'}`}>
                                                {part.quantity}
                                            </span>
                                        </td>
                                        <td className="font-medium">
                                            {part.unit_price ? `${parseFloat(part.unit_price).toFixed(2)} €` : '-'}
                                        </td>
                                        <td>
                                            {isOutOfStock ? (
                                                <span className="badge badge-danger">
                                                    <XCircle size={12} /> Rupture
                                                </span>
                                            ) : isLowStock ? (
                                                <span className="badge badge-warning">
                                                    <AlertTriangle size={12} /> Stock Bas
                                                </span>
                                            ) : (
                                                <span className="badge badge-success">
                                                    <CheckCircle2 size={12} /> En Stock
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <Link to={`/parts/${part.id}`} className="action-btn view" title="Détails">
                                                    <Eye size={16} />
                                                </Link>
                                                <Link to={`/parts/${part.id}/edit`} className="action-btn edit" title="Modifier">
                                                    <Edit size={16} />
                                                </Link>
                                                <button 
                                                    type="button"
                                                    className="action-btn delete" 
                                                    title="Supprimer"
                                                    onClick={() => {
                                                        setPartToDelete(part);
                                                        setShowDeleteModal(true);
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modale de Confirmation de Suppression */}
            {showDeleteModal && (
                <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-icon-wrapper red">
                            <Trash2 size={24} />
                        </div>
                        <h3>Supprimer la pièce ?</h3>
                        <p>
                            Êtes-vous sûr de vouloir supprimer la référence <strong>{partToDelete?.reference}</strong> ({partToDelete?.name}) ? 
                            Cette action est définitive.
                        </p>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>
                                Annuler
                            </button>
                            <button className="btn-confirm-delete" onClick={handleDelete}>
                                Oui, supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartsList;