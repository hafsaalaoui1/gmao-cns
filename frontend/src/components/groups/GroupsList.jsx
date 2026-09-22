import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { 
  Users, Plus, Edit3, Trash2, Eye, RefreshCw, 
  Search, AlertTriangle, UserCheck, Layers, X 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import './GroupsList.css';

const GroupsList = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/groups');
      let data = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }
      setGroups(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des groupes');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleDelete = async () => {
    if (!groupToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/groups/${groupToDelete.id}`);
      toast.success('Groupe supprimé avec succès');
      setShowDeleteModal(false);
      setGroupToDelete(null);
      setGroups(prev => prev.filter(g => g.id !== groupToDelete.id));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const filteredGroups = useMemo(() => {
    return groups.filter(group =>
      group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);

  return (
    <div className="groups-container">
      {/* HEADER PAGE */}
      <div className="groups-header">
        <div className="header-text">
          <div className="header-title-wrapper">
            <div className="icon-badge">
              <Users size={24} />
            </div>
            <h1>Gestion des groupes</h1>
          </div>
          <p className="subtitle">
            Organisez vos intervenants, gérez leurs affectations et suivez les équipes d'intervention.
          </p>
        </div>
        <Link to="/groups/new" className="btn-primary-action">
          <Plus size={18} />
          <span>Nouveau groupe</span>
        </Link>
      </div>

      {/* BARRE D'OUTILS ET RECHERCHE */}
      <div className="groups-toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher un groupe par nom ou description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="btn-clear-search" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>

        <div className="toolbar-stats">
          <span className="stats-badge">
            <Layers size={14} /> {filteredGroups.length} groupe(s)
          </span>
          <button 
            className="btn-icon-refresh" 
            onClick={loadGroups} 
            disabled={loading}
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={36} className="spin-icon" />
          <p>Chargement des groupes d'intervention...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="empty-card">
          <div className="empty-content">
            <div className="empty-icon-circle">
              <Users size={40} />
            </div>
            <h3>{searchQuery ? 'Aucun résultat trouvé' : 'Aucun groupe répertorié'}</h3>
            <p>
              {searchQuery 
                ? `Aucun groupe ne correspond à votre recherche "${searchQuery}".` 
                : 'Commencez par structurer vos équipes en créant votre premier groupe.'}
            </p>
            {searchQuery ? (
              <button className="btn-secondary" onClick={() => setSearchQuery('')}>
                Réinitialiser la recherche
              </button>
            ) : (
              <Link to="/groups/new" className="btn-primary-action mt-3">
                <Plus size={18} /> Créer un groupe
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="groups-grid">
          {filteredGroups.map((group) => (
            <div key={group.id} className="group-card">
              <div className="card-top">
                <div className="group-avatar-box">
                  <Users size={20} />
                </div>
                <div className="group-main-info">
                  <h3 className="group-title">{group.name}</h3>
                  <span className="member-count-badge">
                    <UserCheck size={13} /> {group.users?.length || 0} membre(s)
                  </span>
                </div>
              </div>

              <p className="group-description">
                {group.description || 'Aucune description renseignée pour ce groupe.'}
              </p>

              <div className="card-footer">
                <div className="card-actions">
                  <Link to={`/groups/${group.id}`} className="btn-card-action btn-view" title="Consulter">
                    <Eye size={16} /> <span>Voir</span>
                  </Link>
                  <Link to={`/groups/${group.id}/edit`} className="btn-card-action btn-edit" title="Modifier">
                    <Edit3 size={16} /> <span>Éditer</span>
                  </Link>
                  <button 
                    type="button"
                    className="btn-card-action btn-delete" 
                    title="Supprimer"
                    onClick={() => {
                      setGroupToDelete(group);
                      setShowDeleteModal(true);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE SUPPRESSION */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="warning-icon-box">
                <AlertTriangle size={22} />
              </div>
              <h3>Supprimer le groupe</h3>
            </div>
            <div className="modal-body">
              <p>
                Êtes-vous sûr de vouloir supprimer définitivement le groupe <strong>"{groupToDelete?.name}"</strong> ?
              </p>
              <p className="modal-subtext">
                Cette action supprimera également toutes les affectations associées à ce groupe.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                type="button"
                className="btn-modal-cancel" 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button 
                type="button"
                className="btn-modal-delete" 
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <RefreshCw size={16} className="spin-icon" /> : <Trash2 size={16} />}
                <span>{deleting ? 'Suppression...' : 'Confirmer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsList;