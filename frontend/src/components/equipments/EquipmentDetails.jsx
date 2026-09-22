import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

import {
  ArrowLeft,
  Wrench,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit,
  MapPin,
  Tag,
  RefreshCw,
  FileText,
  Activity,
  Server,
  Power,
  User,
  ClipboardList
} from 'lucide-react';

import './EquipmentDetails.css';

const EquipmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ============================================================
  // DROITS D'ACCÈS
  // ============================================================

  const { isAdmin, isResponsable } = useAuth();

  // Admin + Responsable peuvent modifier
  // Intervenant / ATSEP peut seulement consulter
  const canManageEquipment = isAdmin || isResponsable;

  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Historique correctif
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // ============================================================
  // CHARGEMENT
  // ============================================================

  useEffect(() => {
    fetchEquipment();
    fetchHistory();
  }, [id]);

  /**
   * Charger les informations de l'équipement
   */
  const fetchEquipment = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        `/equipments/${id}`
      );

      const data =
        response.data?.data ||
        response.data;

      setEquipment(data);

    } catch (error) {
      console.error(
        'Erreur équipement :',
        error
      );

      toast.error(
        "Erreur de chargement de l'équipement"
      );

      navigate('/equipments');

    } finally {
      setLoading(false);
    }
  };

  /**
   * Charger l'historique des interventions correctives
   */
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);

      const response = await api.get(
        `/equipments/${id}/history`
      );

      const data =
        response.data?.history || [];

      setHistory(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {
      console.error(
        'Erreur historique :',
        error
      );

      setHistory([]);

      // L'historique ne bloque pas
      // l'affichage de l'équipement.

    } finally {
      setHistoryLoading(false);
    }
  };

  // ============================================================
  // STATUT ÉQUIPEMENT
  // ============================================================

  const getStatusBadge = (status) => {
    const config = {
      operationnel: {
        icon: CheckCircle,
        label: 'Opérationnel',
        cssClass: 'status-op'
      },

      en_maintenance: {
        icon: Clock,
        label: 'En maintenance',
        cssClass: 'status-maint'
      },

      en_panne: {
        icon: AlertTriangle,
        label: 'En panne',
        cssClass: 'status-panne'
      },

      hors_service: {
        icon: Power,
        label: 'Hors service',
        cssClass: 'status-off'
      },

      retire: {
        icon: Power,
        label: 'Retiré',
        cssClass: 'status-off'
      }
    };

    return (
      config[status] ||
      config.operationnel
    );
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date) => {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return '—';
    }

    return parsedDate.toLocaleDateString(
      'fr-FR',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }
    );
  };

  // ============================================================
  // FORMAT DATE + HEURE
  // ============================================================

  const formatDateTime = (date) => {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return '—';
    }

    return parsedDate.toLocaleString(
      'fr-FR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  };

  // ============================================================
  // PIÈCES UTILISÉES
  // ============================================================

  const formatParts = (parts) => {
    if (!parts) {
      return 'Aucune';
    }

    if (Array.isArray(parts)) {

      if (parts.length === 0) {
        return 'Aucune';
      }

      return parts
        .map((part) => {

          if (typeof part === 'string') {
            return part;
          }

          if (typeof part === 'object') {
            return (
              part.name ||
              part.nom ||
              part.reference ||
              JSON.stringify(part)
            );
          }

          return String(part);

        })
        .join(', ');
    }

    if (typeof parts === 'object') {
      return (
        parts.name ||
        parts.nom ||
        parts.reference ||
        JSON.stringify(parts)
      );
    }

    return String(parts);
  };

  // ============================================================
  // NOM INTERVENANT
  // ============================================================

  const getIntervenantName = (ticket) => {
    const user = ticket.assignedTo;

    if (!user) {
      return 'Non renseigné';
    }

    return (
      user.name ||
      user.full_name ||
      user.username ||
      `${user.first_name || ''} ${
        user.last_name || ''
      }`.trim() ||
      'Non renseigné'
    );
  };

  // ============================================================
  // STATUT TICKET
  // ============================================================

  const getTicketStatus = (status) => {

    if (status === 'cloture') {
      return {
        label: 'Clôturé',
        cssClass: 'history-status-closed'
      };
    }

    return {
      label: 'Résolu',
      cssClass: 'history-status-resolved'
    };
  };

  // ============================================================
  // CHARGEMENT
  // ============================================================

  if (loading) {
    return (
      <div className="state-container">

        <RefreshCw
          size={32}
          className="spin-icon"
        />

        <p>
          Chargement des détails...
        </p>

      </div>
    );
  }

  // ============================================================
  // ÉQUIPEMENT INTROUVABLE
  // ============================================================

  if (!equipment) {
    return (
      <div className="empty-state-card">

        <AlertTriangle size={32} />

        <p>
          Équipement introuvable
        </p>

        <button
          onClick={() =>
            navigate('/equipments')
          }
          className="btn-back"
        >
          Retour à la liste
        </button>

      </div>
    );
  }

  const statusConfig =
    getStatusBadge(
      equipment.status
    );

  const StatusIcon =
    statusConfig.icon;

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="equipment-details-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="details-header">

        <button
          className="btn-back-link"
          onClick={() =>
            navigate('/equipments')
          }
        >
          <ArrowLeft size={16} />
          <span>
            Retour à la liste
          </span>
        </button>

        <div className="header-main-content">

          <div className="title-area">

            <div className="equipment-icon-badge">
              <Server size={24} />
            </div>

            <div>

              <div className="header-title-row">

                <h1>
                  {equipment.name}
                </h1>

                <span
                  className={`status-badge ${statusConfig.cssClass}`}
                >
                  <StatusIcon size={12} />

                  {statusConfig.label}
                </span>

              </div>

              <p className="subtitle">

                {equipment.brand ||
                  'Marque N/A'}

                {equipment.model
                  ? ` • ${equipment.model}`
                  : ''}

              </p>

            </div>

          </div>

          {/* ==================================================
              MODIFIER
              ADMIN + RESPONSABLE UNIQUEMENT
          ================================================== */}

          {canManageEquipment && (
            <div className="header-actions">

              <Link
                to={`/equipments/${id}/edit`}
                className="btn-edit"
              >
                <Edit size={15} />

                <span>
                  Modifier
                </span>
              </Link>

            </div>
          )}

        </div>

      </div>

      {/* ======================================================
          INFORMATIONS ÉQUIPEMENT
      ====================================================== */}

      <div className="details-grid">

        {/* ==================================================
            CARTE 1 : CARACTÉRISTIQUES TECHNIQUES
        ================================================== */}

        <div className="info-card">

          <div className="card-header">

            <Tag
              size={18}
              className="card-icon"
            />

            <h2>
              Caractéristiques Techniques
            </h2>

          </div>

          <div className="card-body">

            {/* NOM */}

            <div className="detail-item">

              <span className="detail-label">
                Nom de l'équipement
              </span>

              <span className="detail-value highlight">
                {equipment.name || '—'}
              </span>

            </div>

            {/* TYPE */}

            <div className="detail-item">

              <span className="detail-label">
                Type d'équipement
              </span>

              <span className="detail-value">

                <span className="type-tag">
                  {equipment.type ||
                    'Non spécifié'}
                </span>

              </span>

            </div>

            {/* NUMÉRO DE SÉRIE */}

            <div className="detail-item">

              <span className="detail-label">
                Numéro de Série (S/N)
              </span>

              <span className="detail-value font-mono">
                {equipment.serial_number ||
                  '—'}
              </span>

            </div>

            {/* FABRICANT */}

            <div className="detail-item">

              <span className="detail-label">
                Fabricant & Modèle
              </span>

              <span className="detail-value">

                {equipment.brand || '—'}

                {equipment.model
                  ? ` (${equipment.model})`
                  : ''}

              </span>

            </div>

            {/* EMPLACEMENT */}

            <div className="detail-item">

              <span className="detail-label">
                Emplacement / Site
              </span>

              <span className="detail-value icon-text">

                <MapPin
                  size={14}
                  className="sub-icon"
                />

                {equipment.location ||
                  'Non assigné'}

              </span>

            </div>

          </div>

        </div>

        {/* ==================================================
            CARTE 2 : SUIVI OPÉRATIONNEL
        ================================================== */}

        <div className="info-card">

          <div className="card-header">

            <Activity
              size={18}
              className="card-icon"
            />

            <h2>
              Cycle de Vie & Maintenance
            </h2>

          </div>

          <div className="card-body">

            {/* DATE MISE EN SERVICE */}

            <div className="detail-item">

              <span className="detail-label">
                Date de mise en service
              </span>

              <span className="detail-value icon-text">

                <Calendar
                  size={14}
                  className="sub-icon"
                />

                {formatDate(
                  equipment.commissioning_date
                )}

              </span>

            </div>

            {/* FRÉQUENCE */}

            <div className="detail-item">

              <span className="detail-label">
                Fréquence de maintenance
              </span>

              <span className="detail-value icon-text">

                <Clock
                  size={14}
                  className="sub-icon"
                />

                {equipment.maintenance_frequency ||
                  'Non définie'}

              </span>

            </div>

            {/* DERNIÈRE RÉVISION */}

            <div className="detail-item">

              <span className="detail-label">
                Dernière révision
              </span>

              <span className="detail-value icon-text">

                <Wrench
                  size={14}
                  className="sub-icon"
                />

                {formatDate(
                  equipment.last_maintenance
                )}

              </span>

            </div>

            {/* DESCRIPTION */}

            <div className="detail-item full-width">

              <span className="detail-label">
                Description / Remarques
              </span>

              <div className="description-box">

                <FileText
                  size={14}
                  className="desc-icon"
                />

                <p>
                  {equipment.description ||
                    'Aucune note ou description disponible pour cet équipement.'}
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ======================================================
          HISTORIQUE DES INTERVENTIONS CORRECTIVES
      ====================================================== */}

      <div className="info-card history-card">

        <div className="card-header">

          <ClipboardList
            size={18}
            className="card-icon"
          />

          <div>

            <h2>
              Historique des interventions correctives
            </h2>

            <p className="history-subtitle">
              Pannes et opérations de maintenance
              corrective réalisées sur cet équipement
            </p>

          </div>

        </div>

        <div className="card-body history-body">

          {/* CHARGEMENT HISTORIQUE */}

          {historyLoading ? (

            <div className="history-loading">

              <RefreshCw
                size={24}
                className="spin-icon"
              />

              <p>
                Chargement de l'historique...
              </p>

            </div>

          ) : history.length === 0 ? (

            /* ==================================================
               HISTORIQUE VIDE
            ================================================== */

            <div className="history-empty">

              <FileText size={32} />

              <h3>
                Aucun historique correctif
              </h3>

              <p>
                Aucune intervention corrective
                résolue ou clôturée n'est enregistrée
                pour cet équipement.
              </p>

            </div>

          ) : (

            /* ==================================================
               HISTORIQUE
            ================================================== */

            <div className="history-list">

              {history.map((ticket) => {

                const ticketStatus =
                  getTicketStatus(
                    ticket.status
                  );

                return (

                  <div
                    className="history-item"
                    key={ticket.id}
                  >

                    {/* ==================================================
                        EN-TÊTE
                    ================================================== */}

                    <div className="history-item-header">

                      <div className="history-title">

                        <div className="history-icon">
                          <Wrench size={16} />
                        </div>

                        <div>

                          <h3>
                            Intervention corrective
                            #{ticket.id}
                          </h3>

                          <span className="history-date">

                            <Calendar size={13} />

                            {formatDateTime(
                              ticket.resolution_date ||
                              ticket.updated_at ||
                              ticket.declared_date
                            )}

                          </span>

                        </div>

                      </div>

                      <span
                        className={`history-status ${ticketStatus.cssClass}`}
                      >
                        {ticketStatus.label}
                      </span>

                    </div>

                    {/* ==================================================
                        INFORMATIONS
                    ================================================== */}

                    <div className="history-details">

                      {/* PANNE */}

                      <div className="history-detail">

                        <span className="history-detail-label">
                          Panne / Description
                        </span>

                        <p>
                          {ticket.description ||
                            '—'}
                        </p>

                      </div>

                      {/* DIAGNOSTIC */}

                      <div className="history-detail">

                        <span className="history-detail-label">
                          Diagnostic
                        </span>

                        <p>
                          {ticket.diagnostic ||
                            '—'}
                        </p>

                      </div>

                      {/* SOLUTION */}

                      <div className="history-detail">

                        <span className="history-detail-label">
                          Solution
                        </span>

                        <p>
                          {ticket.solution ||
                            '—'}
                        </p>

                      </div>

                      {/* PIÈCES */}

                      <div className="history-detail">

                        <span className="history-detail-label">
                          Pièces utilisées
                        </span>

                        <p>
                          {formatParts(
                            ticket.parts_used
                          )}
                        </p>

                      </div>

                      {/* INTERVENANT */}

                      <div className="history-detail">

                        <span className="history-detail-label">
                          Intervenant
                        </span>

                        <p className="history-user">

                          <User size={14} />

                          {getIntervenantName(
                            ticket
                          )}

                        </p>

                      </div>

                      {/* DATE DÉCLARATION */}

                      <div className="history-detail">

                        <span className="history-detail-label">
                          Date de déclaration
                        </span>

                        <p>
                          {formatDateTime(
                            ticket.declared_date
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                );
              })}

            </div>

          )}

        </div>

      </div>

    </div>
  );
};

export default EquipmentDetails;