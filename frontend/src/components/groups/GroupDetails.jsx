import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, Users, User, Mail, Edit3, 
  RefreshCw, UserPlus, Shield, Info
} from 'lucide-react';
import './GroupDetails.css';

const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(user?.role || '');
    } catch (e) {
      console.error('Erreur lecture du profil', e);
    }
  }, []);

  const canEdit = userRole === 'admin' || userRole === 'responsable';

  const fetchGroup = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await api.get(`/groups/${id}`);
      setGroup(response.data.data || response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des détails du groupe');
      navigate('/groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  if (loading) {
    return (
      <div className="group-details-page">
        <div className="details-state-container">
          <RefreshCw size={36} className="spin-icon" />
          <p>Chargement des détails du groupe...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="group-details-page">
        <div className="details-state-container">
          <Info size={40} className="info-icon" />
          <h2>Groupe introuvable</h2>
          <p>Ce groupe n'existe pas ou a été supprimé.</p>
          <button className="btn-back-main" onClick={() => navigate('/groups')}>
            <ArrowLeft size={16} /> Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group-details-page">
      {/* BARRE DE NAVIGATION ET ACTIONS RAPIDES */}
      <div className="details-top-bar">
        <button className="btn-back-link" onClick={() => navigate('/groups')}>
          <ArrowLeft size={16} /> <span>Retour aux groupes</span>
        </button>

        {canEdit && (
          <Link to={`/groups/${id}/edit`} className="btn-header-edit">
            <Edit3 size={16} /> <span>Modifier le groupe</span>
          </Link>
        )}
      </div>

      {/* CARTE HERO D'INFORMATION GROUPE */}
      <div className="group-hero-card">
        <div className="hero-content">
          <div className="hero-avatar">
            <Users size={28} />
          </div>
          <div className="hero-text">
            <div className="hero-header-line">
              <h1>{group.name}</h1>
              <span className="badge-count">
                <Users size={14} /> {group.users?.length || 0} membre(s)
              </span>
            </div>
            <p className="hero-description">
              {group.description || 'Aucune description fournie pour ce groupe.'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION MEMBRES */}
      <div className="members-container-card">
        <div className="members-card-header">
          <div className="header-left">
            <User size={18} className="header-icon" />
            <h2>Intervenants assignés ({group.users?.length || 0})</h2>
          </div>
          <button 
            className="btn-icon-refresh" 
            onClick={() => fetchGroup(true)} 
            disabled={refreshing}
            title="Actualiser la liste"
          >
            <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} />
          </button>
        </div>

        <div className="members-card-body">
          {group.users && group.users.length > 0 ? (
            <div className="members-grid">
              {group.users.map(user => (
                <div key={user.id} className="member-profile-card">
                  <div className="avatar-circle">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="profile-details">
                    <span className="profile-name">{user.name}</span>
                    <span className="profile-email">
                      <Mail size={13} /> {user.email || 'Pas d\'adresse email'}
                    </span>
                    {user.role && (
                      <span className="profile-role-tag">
                        <Shield size={11} /> {user.role}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-members-box">
              <div className="empty-icon-wrapper">
                <Users size={32} />
              </div>
              <h3>Aucun intervenant dans ce groupe</h3>
              <p>Affectez des membres à ce groupe pour organiser les interventions.</p>
              {canEdit && (
                <Link to={`/groups/${id}/edit`} className="btn-add-members">
                  <UserPlus size={16} /> Ajouter des membres
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDetails;