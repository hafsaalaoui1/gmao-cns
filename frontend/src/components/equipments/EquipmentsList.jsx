import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import {
  Wrench,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Power,
  RefreshCw,
  Filter,
  MapPin,
  Radio,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import './EquipmentsList.css';

const EquipmentsList = () => {
  const { isAdmin, isResponsable } = useAuth();

  const [equipements, setEquipements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('Tous');
  const [filterType, setFilterType] = useState('Tous');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [equipementToDelete, setEquipementToDelete] = useState(null);

  /*
   * ADMIN + RESPONSABLE :
   * - Ajouter
   * - Modifier
   * - Supprimer
   *
   * INTERVENANT :
   * - Consulter uniquement
   */
  const canManageEquipment = isAdmin || isResponsable;

  useEffect(() => {
    loadEquipements();
  }, []);

  // ============================================================
  // CHARGEMENT DES ÉQUIPEMENTS
  // ============================================================

  const loadEquipements = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/equipments');

      let data = [];

      if (
        response.data?.data &&
        Array.isArray(response.data.data)
      ) {
        data = response.data.data;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      } else {
        for (const key of Object.keys(response.data || {})) {
          if (Array.isArray(response.data[key])) {
            data = response.data[key];
            break;
          }
        }
      }

      setEquipements(data);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Erreur de chargement'
      );

      toast.error(
        'Erreur de chargement des équipements'
      );

      setEquipements([]);

    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SUPPRESSION
  // ============================================================

  const handleDelete = async () => {
    if (!equipementToDelete) return;

    try {
      await api.delete(
        `/equipments/${equipementToDelete.id}`
      );

      toast.success(
        'Équipement supprimé avec succès'
      );

      setShowDeleteModal(false);
      setEquipementToDelete(null);

      loadEquipements();

    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        'Erreur lors de la suppression'
      );
    }
  };

  // ============================================================
  // STATUT ÉQUIPEMENT
  // ============================================================

  const getStatutConfig = (statut) => {
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
        icon: AlertCircle,
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
      config[statut] ||
      config.operationnel
    );
  };

  // ============================================================
  // TYPES D'ÉQUIPEMENTS
  // ============================================================

  const getTypeOptions = () => {
    const types = ['Tous'];

    equipements.forEach((eq) => {
      if (
        eq.type &&
        !types.includes(eq.type)
      ) {
        types.push(eq.type);
      }
    });

    return types;
  };

  // ============================================================
  // FILTRAGE
  // ============================================================

  const filteredEquipements = equipements.filter(
    (eq) => {
      const searchValue =
        search.toLowerCase();

      const matchSearch =
        (eq.name || '')
          .toLowerCase()
          .includes(searchValue) ||

        (eq.type || '')
          .toLowerCase()
          .includes(searchValue) ||

        (eq.brand || '')
          .toLowerCase()
          .includes(searchValue) ||

        (eq.serial_number || '')
          .toLowerCase()
          .includes(searchValue);

      const matchStatut =
        filterStatut === 'Tous' ||
        eq.status === filterStatut;

      const matchType =
        filterType === 'Tous' ||
        eq.type === filterType;

      return (
        matchSearch &&
        matchStatut &&
        matchType
      );
    }
  );

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
          Chargement des équipements...
        </p>
      </div>
    );
  }

  // ============================================================
  // ERREUR
  // ============================================================

  if (error) {
    return (
      <div className="error-card">

        <div className="error-icon-wrapper">
          <AlertCircle size={24} />
        </div>

        <h3>
          Erreur de chargement
        </h3>

        <p>
          {error}
        </p>

        <button
          onClick={loadEquipements}
          className="btn-retry"
        >
          <RefreshCw size={14} />
          Réessayer
        </button>

      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="equipments-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="header-section">

        <div className="header-title-wrapper">

          <div className="header-icon-box">
            <Wrench size={20} />
          </div>

          <div>

            <div className="title-with-badge">

              <h1>
                Gestion des équipements
              </h1>

              <span className="count-badge">
                {equipements.length}
              </span>

            </div>

            <p className="header-description">
              Inventaire et suivi de l'état
              opérationnel des systèmes
            </p>

          </div>

        </div>

        {/* ==================================================
            AJOUTER ÉQUIPEMENT
            ADMIN + RESPONSABLE UNIQUEMENT
        ================================================== */}

        {canManageEquipment && (
          <Link
            to="/equipments/new"
            className="btn-add"
          >
            <Plus size={16} />
            <span>
              Ajouter un équipement
            </span>
          </Link>
        )}

      </div>

      {/* ======================================================
          FILTRES
      ====================================================== */}

      <div className="filters-card">

        <div className="search-box">

          <Search
            size={16}
            className="search-icon"
          />

          <input
            type="text"
            placeholder="Rechercher (nom, type, fabricant, série)..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        <div className="filters-group">

          {/* FILTRE STATUT */}

          <div className="select-wrapper">

            <select
              value={filterStatut}
              onChange={(e) =>
                setFilterStatut(e.target.value)
              }
            >
              <option value="Tous">
                Tous les statuts
              </option>

              <option value="operationnel">
                Opérationnel
              </option>

              <option value="en_maintenance">
                En maintenance
              </option>

              <option value="en_panne">
                En panne
              </option>

              <option value="hors_service">
                Hors service
              </option>

              <option value="retire">
                Retiré
              </option>
            </select>

            <Filter
              size={14}
              className="select-icon"
            />

          </div>

          {/* FILTRE TYPE */}

          <div className="select-wrapper">

            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value)
              }
            >

              <option value="Tous">
                Tous les types
              </option>

              {getTypeOptions()
                .filter(
                  (type) => type !== 'Tous'
                )
                .map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}

            </select>

            <Filter
              size={14}
              className="select-icon"
            />

          </div>

          {/* ACTUALISER */}

          <button
            onClick={loadEquipements}
            title="Actualiser"
            className="btn-icon-refresh"
          >
            <RefreshCw size={16} />
          </button>

        </div>

      </div>

      {/* ======================================================
          TABLEAU
      ====================================================== */}

      <div className="table-card">

        <div className="table-wrapper">

          <table className="custom-table">

            <thead>

              <tr>

                <th>
                  Équipement
                </th>

                <th>
                  Type
                </th>

                <th>
                  Localisation
                </th>

                <th>
                  Statut
                </th>

                <th className="text-right">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {/* ==================================================
                  AUCUN RÉSULTAT
              ================================================== */}

              {filteredEquipements.length === 0 ? (

                <tr>

                  <td
                    colSpan="5"
                    className="empty-cell"
                  >

                    <div className="empty-box">

                      <div className="empty-icon-wrapper">
                        <Wrench size={28} />
                      </div>

                      <p className="empty-title">
                        Aucun équipement trouvé
                      </p>

                      <p className="empty-desc">

                        {search ||
                        filterStatut !== 'Tous' ||
                        filterType !== 'Tous'
                          ? 'Aucun résultat ne correspond à vos critères de recherche.'
                          : 'Commencez par enregistrer votre premier équipement.'}

                      </p>

                      {/* AJOUTER :
                          ADMIN + RESPONSABLE */}

                      {!search &&
                        filterStatut === 'Tous' &&
                        filterType === 'Tous' &&
                        canManageEquipment && (

                          <Link
                            to="/equipments/new"
                            className="empty-btn-add"
                          >

                            <Plus size={14} />

                            Ajouter un équipement

                          </Link>

                        )}

                    </div>

                  </td>

                </tr>

              ) : (

                /* ==================================================
                   LISTE DES ÉQUIPEMENTS
                ================================================== */

                filteredEquipements.map((eq) => {

                  const statut =
                    getStatutConfig(
                      eq.status
                    );

                  const StatutIcon =
                    statut.icon;

                  return (

                    <tr key={eq.id}>

                      {/* ÉQUIPEMENT */}

                      <td>

                        <div className="eq-info-cell">

                          <div className="eq-icon-box">
                            <Radio size={16} />
                          </div>

                          <div>

                            <p className="eq-name">
                              {eq.name || '—'}
                            </p>

                            <p className="eq-serial">
                              S/N:{' '}
                              {eq.serial_number || '—'}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* TYPE */}

                      <td>

                        <span className="type-tag">
                          {eq.type || '—'}
                        </span>

                      </td>

                      {/* LOCALISATION */}

                      <td>

                        <div className="location-info">

                          <MapPin
                            size={14}
                            className="loc-icon"
                          />

                          <span>
                            {eq.location || '—'}
                          </span>

                        </div>

                      </td>

                      {/* STATUT */}

                      <td>

                        <span
                          className={`status-badge ${statut.cssClass}`}
                        >

                          <StatutIcon size={12} />

                          {statut.label}

                        </span>

                      </td>

                      {/* ACTIONS */}

                      <td className="text-right">

                        <div className="actions-wrapper">

                          {/* ==============================
                              CONSULTER
                              TOUT LE MONDE
                          ============================== */}

                          <Link
                            to={`/equipments/${eq.id}`}
                            title="Consulter"
                            className="btn-action view"
                          >
                            <Eye size={15} />
                          </Link>

                          {/* ==============================
                              MODIFIER
                              ADMIN + RESPONSABLE
                          ============================== */}

                          {canManageEquipment && (

                            <Link
                              to={`/equipments/${eq.id}/edit`}
                              title="Modifier"
                              className="btn-action edit"
                            >
                              <Edit size={15} />
                            </Link>

                          )}

                          {/* ==============================
                              SUPPRIMER
                              ADMIN + RESPONSABLE
                          ============================== */}

                          {canManageEquipment && (

                            <button
                              type="button"
                              title="Supprimer"
                              onClick={() => {

                                setEquipementToDelete(eq);
                                setShowDeleteModal(true);

                              }}
                              className="btn-action delete"
                            >

                              <Trash2 size={15} />

                            </button>

                          )}

                        </div>

                      </td>

                    </tr>

                  );

                })

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* ======================================================
          MODAL SUPPRESSION
      ====================================================== */}

      {showDeleteModal && (

        <div
          className="modal-overlay"
          onClick={() =>
            setShowDeleteModal(false)
          }
        >

          <div
            className="modal-box"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER MODAL */}

            <div className="modal-header">

              <div className="modal-alert-icon">
                <AlertCircle size={22} />
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                className="btn-close-modal"
              >

                <X size={18} />

              </button>

            </div>

            {/* BODY */}

            <div className="modal-body">

              <h3>
                Confirmer la suppression
              </h3>

              <p>

                Êtes-vous sûr de vouloir
                supprimer l'équipement{' '}

                <strong>
                  "{equipementToDelete?.name}"
                </strong>

                ? Cette action est irréversible.

              </p>

            </div>

            {/* FOOTER */}

            <div className="modal-footer">

              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                className="btn-cancel"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="btn-confirm-delete"
              >
                Supprimer
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default EquipmentsList;