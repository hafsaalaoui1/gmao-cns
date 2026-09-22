import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Power,
  RefreshCw,
  User,
  X,
  Save,
  Loader2,
  Users,
  Filter
} from 'lucide-react';
import './UserList.css';

const UserList = () => {
  // =========================
  // STATES
  // =========================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'intervenant',
    is_active: true,
  });

  // =========================
  // FORMAT ROLE
  // =========================
  const formatRole = (role) => {
    switch (String(role || '').toLowerCase().trim()) {
      case 'admin':
        return 'Admin';
      case 'responsable':
        return 'Responsable';
      case 'intervenant':
        return 'Intervenant';
      default:
        return role || '-';
    }
  };

  // =========================
  // INITIALS FOR AVATAR
  // =========================
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // =========================
  // DATE FORMAT
  // =========================
  const formatDate = (date) => {
    if (!date) return '-';
    try {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) return date;

      return parsedDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return date;
    }
  };

  // =========================
  // FETCH USERS
  // =========================
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      const usersData = response?.data?.data;

      if (Array.isArray(usersData)) {
        setUsers(usersData);
      } else {
        console.error('Réponse API inattendue :', response.data);
        setUsers([]);
        toast.error('Format de réponse inattendu');
      }
    } catch (error) {
      console.error('Erreur récupération utilisateurs :', error);
      if (error.response?.status === 401) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
      } else if (error.response?.status === 403) {
        toast.error("Accès refusé. Seul l'administrateur peut gérer les utilisateurs.");
      } else {
        toast.error(error.response?.data?.message || 'Impossible de récupérer les utilisateurs');
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // =========================
  // FILTERED USERS
  // =========================
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        String(user.name || '').toLowerCase().includes(search) ||
        String(user.email || '').toLowerCase().includes(search);

      const userRole = String(user.role || '').toLowerCase().trim();
      const matchesRole = roleFilter === 'all' || userRole === roleFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && Boolean(user.is_active)) ||
        (statusFilter === 'inactive' && !Boolean(user.is_active));

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // =========================
  // MODAL HANDLERS
  // =========================
  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'intervenant',
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: String(user.role || 'intervenant').toLowerCase().trim(),
      is_active: Boolean(user.is_active),
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'intervenant',
      is_active: true,
    });
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // =========================
  // SAVE USER
  // =========================
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) return toast.error('Le nom est obligatoire.');
    if (!formData.email.trim()) return toast.error("L'email est obligatoire.");
    if (!['admin', 'responsable', 'intervenant'].includes(formData.role)) return toast.error('Rôle invalide.');

    try {
      setSaving(true);
      if (editingUser) {
        const response = await api.put(`/users/${editingUser.id}`, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          is_active: formData.is_active,
        });
        const updatedUser = response?.data?.data;

        if (updatedUser) {
          setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updatedUser : u)));
        } else {
          await fetchUsers();
        }
        toast.success(response?.data?.message || 'Utilisateur mis à jour avec succès.');
      } else {
        const response = await api.post('/users', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          is_active: formData.is_active,
        });
        const createdUser = response?.data?.data;

        if (createdUser) {
          setUsers((prev) => [createdUser, ...prev]);
        } else {
          await fetchUsers();
        }
        toast.success(response?.data?.message || 'Utilisateur créé avec succès.');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Erreur sauvegarde utilisateur :', error);
      if (error.response?.status === 422) {
        const errors = error.response?.data?.errors;
        const firstError = errors ? Object.values(errors)?.[0]?.[0] : null;
        toast.error(firstError || error.response?.data?.message || 'Erreur de validation.');
      } else if (error.response?.status === 403) {
        toast.error('Vous n’avez pas les droits nécessaires.');
      } else {
        toast.error(error.response?.data?.message || 'Une erreur est survenue.');
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // TOGGLE ACTIVE
  // =========================
  const handleToggleActive = async (user) => {
    const action = user.is_active ? 'désactiver' : 'activer';
    if (!window.confirm(`Voulez-vous vraiment ${action} le compte de ${user.name} ?`)) return;

    try {
      setTogglingId(user.id);
      const response = await api.put(`/users/${user.id}/toggle`);
      const updatedUser = response?.data?.data;

      if (updatedUser) {
        setUsers((prev) => prev.map((item) => (item.id === user.id ? updatedUser : item)));
      } else {
        await fetchUsers();
      }
      toast.success(response?.data?.message || 'Statut de l’utilisateur mis à jour.');
    } catch (error) {
      console.error('Erreur changement statut utilisateur :', error);
      toast.error(error.response?.data?.message || 'Impossible de modifier le statut.');
    } finally {
      setTogglingId(null);
    }
  };

  // =========================
  // DELETE USER
  // =========================
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer l'utilisateur "${user.name}" ?\n\nCette action est irréversible.`)) return;

    try {
      setDeletingId(user.id);
      const response = await api.delete(`/users/${user.id}`);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      toast.success(response?.data?.message || 'Utilisateur supprimé avec succès.');
    } catch (error) {
      console.error('Erreur suppression utilisateur :', error);
      toast.error(error.response?.data?.message || 'Impossible de supprimer l’utilisateur.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="user-management">
      {/* HEADER */}
      <div className="page-header-modern">
        <div className="header-left">
          <h1 className="page-title">
            <Users size={24} />
            Gestion des utilisateurs
          </h1>
          <p className="page-subtitle">
            Gérez les comptes et les rôles des utilisateurs de la GMAO CNS.
          </p>
        </div>

        <button type="button" className="btn-primary-modern" onClick={handleAddUser}>
          <Plus size={18} />
          Ajouter un utilisateur
        </button>
      </div>

      {/* FILTERS SECTION */}
      <div className="filters-section">
        {/* Search */}
        <div className="search-wrapper">
          <Search size={18} className="search-icon" color="var(--slate-400)" />
          <input
            type="text"
            className="search-input"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Role Filter */}
        <div className="filter-wrapper">
          <Filter size={18} className="filter-icon" color="var(--slate-400)" />
          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Admin</option>
            <option value="responsable">Responsable</option>
            <option value="intervenant">Intervenant</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="filter-wrapper">
          <Filter size={18} className="filter-icon" color="var(--slate-400)" />
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Désactivés</option>
          </select>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          className="btn-refresh"
          onClick={fetchUsers}
          disabled={loading}
          title="Actualiser"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* TABLE */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--slate-500)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            Chargement des utilisateurs...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--slate-500)' }}>
            Aucun utilisateur trouvé.
          </div>
        ) : (
          <table className="table-modern">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Date de création</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  {/* USER CELL */}
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{getInitials(user.name)}</div>
                      <div>
                        <div className="user-name">{user.name}</div>
                      </div>
                    </div>
                  </td>

                  {/* EMAIL */}
                  <td className="user-email">{user.email}</td>

                  {/* ROLE */}
                  <td>
                    <span className="role-badge">{formatRole(user.role)}</span>
                  </td>

                  {/* STATUS */}
                  <td>
                    <span
                      className={`status-badge ${
                        user.is_active ? 'status-active' : 'status-inactive'
                      }`}
                    >
                      {user.is_active ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>

                  {/* DATE */}
                  <td className="user-date">{formatDate(user.created_at)}</td>

                  {/* ACTIONS */}
                  <td>
                    <div className="action-buttons">
                      {/* EDIT */}
                      <button
                        type="button"
                        className="btn-action btn-edit"
                        onClick={() => handleEditUser(user)}
                        title="Modifier"
                      >
                        <Pencil />
                      </button>

                      {/* TOGGLE ACTIVE */}
                      <button
                        type="button"
                        className={`btn-action ${
                          user.is_active ? 'btn-toggle-off' : 'btn-toggle-on'
                        }`}
                        onClick={() => handleToggleActive(user)}
                        disabled={togglingId === user.id}
                        title={user.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {togglingId === user.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Power />
                        )}
                      </button>

                      {/* DELETE */}
                      <button
                        type="button"
                        className="btn-action btn-delete"
                        onClick={() => handleDeleteUser(user)}
                        disabled={deletingId === user.id}
                        title="Supprimer"
                      >
                        {deletingId === user.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="form-modal">
          <div className="form-modal-content">
            <div className="form-modal-header">
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {editingUser ? 'Modifier l’utilisateur' : 'Ajouter un utilisateur'}
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseModal}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom complet</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex : Ahmed Alaoui"
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label>Adresse email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="exemple@onda.ma"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Rôle</label>
                <select
                  name="role"
                  className="form-select"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={saving}
                >
                  <option value="intervenant">Intervenant</option>
                  <option value="responsable">Responsable</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-check">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    disabled={saving}
                  />
                  Compte actif (autoriser la connexion)
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Loader2 size={16} className="animate-spin" /> Enregistrement...
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Save size={16} /> Enregistrer
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;