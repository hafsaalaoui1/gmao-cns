import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { 
  UserPlus, UserMinus, Users, ArrowLeft, 
  Save, X, RefreshCw, PlusCircle, Edit3, Info, CheckCircle2 
} from 'lucide-react';
import './GroupForm.css';

const GroupForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [groupUsers, setGroupUsers] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(user?.role || '');
    } catch (e) {
      console.error('Erreur lecture du profil', e);
    }
  }, []);

  const loadUsers = useCallback(async () => {
  setLoadingUsers(true);

  try {
    const response = await api.get('/users/intervenants');

    setAvailableUsers(
      response.data?.data || response.data || []
    );
  } catch (error) {
    console.error('Erreur chargement intervenants:', error);
    toast.error('Erreur lors du chargement des intervenants');
  } finally {
    setLoadingUsers(false);
  }
}, []);

  const loadGroup = useCallback(async () => {
    setFetching(true);
    try {
      const response = await api.get(`/groups/${id}`);
      const group = response.data.data || response.data;
      setFormData({
        name: group.name || '',
        description: group.description || '',
      });
      setGroupUsers(group.users || []);
    } catch (error) {
      toast.error('Erreur lors du chargement du groupe');
      navigate('/groups');
    } finally {
      setFetching(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'responsable') {
      loadUsers();
    }
  }, [userRole, loadUsers]);

  useEffect(() => {
    if (isEdit) {
      loadGroup();
    }
  }, [id, isEdit, loadGroup]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Le nom du groupe est obligatoire');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        user_ids: groupUsers.map(u => u.id)
      };

      if (isEdit) {
        await api.put(`/groups/${id}`, payload);
        toast.success('Groupe mis à jour avec succès');
      } else {
        await api.post('/groups', payload);
        toast.success('Groupe créé avec succès');
      }
      navigate('/groups');
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de l\'enregistrement';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const addUserToGroup = (user) => {
    if (!groupUsers.find(u => u.id === user.id)) {
      setGroupUsers([...groupUsers, user]);
    }
  };

  const removeUserFromGroup = (userId) => {
    setGroupUsers(groupUsers.filter(u => u.id !== userId));
  };

  const availableIntervenants = availableUsers.filter(
    user => !groupUsers.some(g => g.id === user.id)
  );

  if (fetching) {
    return (
      <div className="group-form-page">
        <div className="form-state-container">
          <RefreshCw size={36} className="spin-icon" />
          <p>Chargement du formulaire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group-form-page">
      {/* HEADER DE NAVIGATION */}
      <div className="form-top-bar">
        <button type="button" className="btn-back-link" onClick={() => navigate('/groups')}>
          <ArrowLeft size={16} /> <span>Retour aux groupes</span>
        </button>
      </div>

      <div className="form-header-title">
        <div className={`title-icon-wrapper ${isEdit ? 'edit-mode' : 'create-mode'}`}>
          {isEdit ? <Edit3 size={24} /> : <PlusCircle size={24} />}
        </div>
        <div>
          <h1>{isEdit ? 'Modifier le groupe' : 'Nouveau groupe'}</h1>
          <p className="subtitle">
            {isEdit 
              ? 'Mettez à jour les informations et la composition du groupe.' 
              : 'Définissez le nom, la description et attribuez les intervenants.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-layout">
        {/* CARTE : INFORMATIONS GÉNÉRALES */}
        <div className="form-card">
          <div className="card-header">
            <Users size={18} className="card-icon" />
            <h2>Informations Générales</h2>
          </div>
          <div className="card-body">
            <div className="form-field">
              <label htmlFor="name" className="required-label">Nom du groupe</label>
              <input
                id="name"
                type="text"
                name="name"
                className="form-control"
                placeholder="Ex: Équipe Maintenance Avionique"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                rows="3"
                placeholder="Précisez le rôle, le domaine ou la spécialité de ce groupe..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* CARTE : COMPOSITION DU GROUPE */}
        <div className="form-card">
          <div className="card-header">
            <UserPlus size={18} className="card-icon" />
            <h2>Membres du Groupe ({groupUsers.length})</h2>
          </div>
          <div className="card-body">
            {/* Sélecteur d'intervenant */}
            {(userRole === 'admin' || userRole === 'responsable') ? (
              <div className="add-member-wrapper">
                <label className="field-sublabel">Ajouter un membre</label>
                <div className="select-row">
                  {loadingUsers ? (
                    <div className="loading-users-badge">
                      <RefreshCw size={14} className="spin-icon" /> Chargement des intervenants...
                    </div>
                  ) : (
                    <select
                      className="form-control select-control"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          const userId = parseInt(e.target.value);
                          const user = availableUsers.find(u => u.id === userId);
                          if (user) addUserToGroup(user);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="" disabled>-- Sélectionner un intervenant à ajouter --</option>
                      {availableIntervenants.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email || 'Aucun email'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ) : (
              <div className="role-notice">
                <Info size={16} />
                <span>Rôle restreint : Seuls les responsables et admins peuvent modifier les membres.</span>
              </div>
            )}

            {/* Liste des membres sous forme de cartes / puces */}
            <div className="members-section">
              <label className="field-sublabel">Membres actuellement sélectionnés</label>
              {groupUsers.length > 0 ? (
                <div className="members-grid">
                  {groupUsers.map(user => (
                    <div key={user.id} className="member-chip">
                      <div className="chip-avatar">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="chip-info">
                        <span className="chip-name">{user.name}</span>
                        <span className="chip-email">{user.email || 'Pas d\'email'}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-chip"
                        title="Retirer le membre"
                        onClick={() => removeUserFromGroup(user.id)}
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-members-placeholder">
                  <CheckCircle2 size={24} className="empty-icon" />
                  <p>Aucun membre n'a encore été ajouté à ce groupe.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PIED DE PAGE AVEC BOUTONS */}
        <div className="form-actions-bar">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate('/groups')}
            disabled={loading}
          >
            <X size={16} /> <span>Annuler</span>
          </button>
          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? (
              <>
                <RefreshCw size={16} className="spin-icon" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isEdit ? 'Enregistrer les modifications' : 'Créer le groupe'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GroupForm;