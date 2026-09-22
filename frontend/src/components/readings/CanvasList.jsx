import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import api from '../../services/api';
import { Link } from 'react-router-dom';

import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Wrench,
  Calendar,
  SlidersHorizontal,
  Search,
  AlertTriangle,
  Layers,
  Tag,
  Filter,
  Database,
  Activity,
  ChevronRight,
  X,
} from 'lucide-react';

import { toast } from 'react-hot-toast';

import './CanvasList.css';

const CanvasList = () => {
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [canvasToDelete, setCanvasToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ============================================================
  // CHARGEMENT DES CANVAS
  // ============================================================

  const loadCanvases = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get('/canvases');

      const data =
        response.data?.data ||
        response.data ||
        [];

      setCanvases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement canvas:', error);

      toast.error(
        error.response?.data?.message ||
        'Erreur lors du chargement des canvas'
      );

      setCanvases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCanvases();
  }, [loadCanvases]);

  // ============================================================
  // SUPPRESSION
  // ============================================================

  const openDeleteModal = (canvas) => {
    setCanvasToDelete(canvas);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;

    setShowDeleteModal(false);
    setCanvasToDelete(null);
  };

  const handleDelete = async () => {
    if (!canvasToDelete) return;

    setIsDeleting(true);

    try {
      await api.delete(`/canvases/${canvasToDelete.id}`);

      toast.success('Canvas supprimé avec succès');

      setShowDeleteModal(false);
      setCanvasToDelete(null);

      await loadCanvases();
    } catch (error) {
      console.error('Erreur suppression canvas:', error);

      toast.error(
        error.response?.data?.message ||
        'Erreur lors de la suppression du canvas'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ============================================================
  // TYPES DISPONIBLES
  // ============================================================

  const availableTypes = useMemo(() => {
    const types = canvases
      .map((canvas) => canvas.template_type)
      .filter(Boolean);

    return [
      'ALL',
      ...Array.from(new Set(types)),
    ];
  }, [canvases]);

  // ============================================================
  // FILTRAGE
  // ============================================================

  const filteredCanvases = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return canvases.filter((canvas) => {
      const templateName =
        String(canvas.template_name || '').toLowerCase();

      const equipmentName =
        String(canvas.equipment?.name || '').toLowerCase();

      const templateType =
        String(canvas.template_type || '').toLowerCase();

      const matchesSearch =
        !search ||
        templateName.includes(search) ||
        equipmentName.includes(search) ||
        templateType.includes(search);

      const matchesType =
        selectedType === 'ALL' ||
        canvas.template_type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [canvases, searchTerm, selectedType]);

  // ============================================================
  // STATISTIQUES
  // ============================================================

  const statistics = useMemo(() => {
    const totalParameters = canvases.reduce(
      (total, canvas) =>
        total + (Array.isArray(canvas.parameters)
          ? canvas.parameters.length
          : 0),
      0
    );

    const equipmentCount = new Set(
      canvases
        .map((canvas) => canvas.equipment?.id)
        .filter(Boolean)
    ).size;

    const typeCount = new Set(
      canvases
        .map((canvas) => canvas.template_type)
        .filter(Boolean)
    ).size;

    return {
      total: canvases.length,
      parameters: totalParameters,
      equipment: equipmentCount,
      types: typeCount,
    };
  }, [canvases]);

  // ============================================================
  // RESET FILTRES
  // ============================================================

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedType('ALL');
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="canvas-list-page">
        <div className="canvas-loading-card">
          <div className="loading-icon-wrapper">
            <RefreshCw
              size={30}
              className="spin-icon"
            />
          </div>

          <h3>Chargement des canvas</h3>

          <p>
            Récupération des modèles de relevés...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="canvas-list-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="canvas-hero">

        <div className="hero-content">

          <div className="hero-icon">
            <Layers size={27} />
          </div>

          <div className="hero-text">
            <div className="breadcrumb">
              <span>GMAO CNS</span>
              <ChevronRight size={14} />
              <span>Relevés</span>
              <ChevronRight size={14} />
              <strong>Canvas</strong>
            </div>

            <h1>
              Canvas de relevés
            </h1>

            <p>
              Gérez les modèles utilisés pour les relevés
              des équipements CNS.
            </p>
          </div>

        </div>

        <div className="hero-actions">

          <button
            type="button"
            className="btn-refresh"
            onClick={loadCanvases}
            title="Actualiser"
          >
            <RefreshCw size={17} />
            <span>Actualiser</span>
          </button>

          <Link
            to="/readings/canvases/new"
            className="btn-new-canvas"
          >
            <Plus size={18} />
            <span>Nouveau canvas</span>
          </Link>

        </div>

      </section>

      {/* ======================================================
          STATISTIQUES
      ====================================================== */}

      <section className="canvas-stats-grid">

        <div className="stat-card">
          <div className="stat-icon blue">
            <Database size={20} />
          </div>

          <div className="stat-content">
            <span className="stat-label">
              Canvas disponibles
            </span>

            <strong className="stat-value">
              {statistics.total}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <SlidersHorizontal size={20} />
          </div>

          <div className="stat-content">
            <span className="stat-label">
              Paramètres
            </span>

            <strong className="stat-value">
              {statistics.parameters}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Wrench size={20} />
          </div>

          <div className="stat-content">
            <span className="stat-label">
              Équipements
            </span>

            <strong className="stat-value">
              {statistics.equipment}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <Activity size={20} />
          </div>

          <div className="stat-content">
            <span className="stat-label">
              Types de relevés
            </span>

            <strong className="stat-value">
              {statistics.types}
            </strong>
          </div>
        </div>

      </section>

      {/* ======================================================
          FILTRES
      ====================================================== */}

      <section className="canvas-toolbar">

        <div className="toolbar-left">

          <div className="section-title">
            <div className="section-title-icon">
              <FileText size={18} />
            </div>

            <div>
              <h2>Modèles de relevés</h2>

              <span>
                {filteredCanvases.length} résultat
                {filteredCanvases.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

        </div>

        <div className="toolbar-right">

          <div className="search-box-modern">

            <Search
              size={17}
              className="search-icon"
            />

            <input
              type="text"
              placeholder="Rechercher un canvas..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />

            {searchTerm && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearchTerm('')}
                title="Effacer"
              >
                <X size={15} />
              </button>
            )}

          </div>

          <div className="filter-select-wrapper">

            <Filter
              size={16}
              className="filter-select-icon"
            />

            <select
              value={selectedType}
              onChange={(e) =>
                setSelectedType(e.target.value)
              }
              className="type-select-modern"
            >
              <option value="ALL">
                Tous les types
              </option>

              {availableTypes
                .filter((type) => type !== 'ALL')
                .map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
            </select>

          </div>

        </div>

      </section>

      {/* ======================================================
          FILTRES ACTIFS
      ====================================================== */}

      {(searchTerm || selectedType !== 'ALL') && (
        <div className="active-filters">

          <span className="active-filter-label">
            Filtres :
          </span>

          {searchTerm && (
            <span className="filter-chip">
              Recherche : "{searchTerm}"

              <button
                type="button"
                onClick={() => setSearchTerm('')}
              >
                <X size={12} />
              </button>
            </span>
          )}

          {selectedType !== 'ALL' && (
            <span className="filter-chip">
              Type : {selectedType}

              <button
                type="button"
                onClick={() =>
                  setSelectedType('ALL')
                }
              >
                <X size={12} />
              </button>
            </span>
          )}

          <button
            type="button"
            className="reset-filters"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>

        </div>
      )}

      {/* ======================================================
          LISTE
      ====================================================== */}

      {filteredCanvases.length === 0 ? (

        <div className="canvas-empty-state">

          <div className="empty-icon-wrapper">
            <FileText size={34} />
          </div>

          <h3>
            Aucun canvas trouvé
          </h3>

          <p>
            {searchTerm || selectedType !== 'ALL'
              ? 'Aucun modèle ne correspond à vos critères de recherche.'
              : 'Commencez par créer un modèle de relevé pour vos équipements CNS.'}
          </p>

          {searchTerm || selectedType !== 'ALL' ? (

            <button
              type="button"
              className="btn-empty-secondary"
              onClick={resetFilters}
            >
              Réinitialiser les filtres
            </button>

          ) : (

            <Link
              to="/readings/canvases/new"
              className="btn-empty-primary"
            >
              <Plus size={17} />
              Créer un canvas
            </Link>

          )}

        </div>

      ) : (

        <div className="canvas-grid">

          {filteredCanvases.map((canvas) => {

            const parameters = Array.isArray(
              canvas.parameters
            )
              ? canvas.parameters
              : [];

            return (

              <article
                key={canvas.id}
                className="canvas-card"
              >

                {/* TOP CARD */}

                <div className="canvas-card-header">

                  <div className="canvas-card-title-area">

                    <div className="canvas-card-icon">
                      <FileText size={20} />
                    </div>

                    <div className="canvas-card-title">

                      <h3>
                        {canvas.template_name ||
                          'Canvas sans nom'}
                      </h3>

                      {canvas.template_type && (
                        <span className="canvas-type-badge">
                          <Tag size={11} />
                          {canvas.template_type}
                        </span>
                      )}

                    </div>

                  </div>

                  <span className="active-status">
                    <span className="status-dot" />
                    Actif
                  </span>

                </div>

                {/* EQUIPMENT */}

                <div className="equipment-banner">

                  <div className="equipment-icon">
                    <Wrench size={16} />
                  </div>

                  <div>
                    <span className="equipment-label">
                      Équipement
                    </span>

                    <strong>
                      {canvas.equipment?.name ||
                        'Aucun équipement associé'}
                    </strong>
                  </div>

                </div>

                {/* INFORMATIONS */}

                <div className="canvas-information">

                  <div className="information-item">

                    <div className="information-icon">
                      <Calendar size={15} />
                    </div>

                    <div>
                      <span>
                        Fréquence
                      </span>

                      <strong>
                        {canvas.frequency ||
                          'Non définie'}
                      </strong>
                    </div>

                  </div>

                  <div className="information-item">

                    <div className="information-icon">
                      <SlidersHorizontal size={15} />
                    </div>

                    <div>
                      <span>
                        Paramètres
                      </span>

                      <strong>
                        {parameters.length}
                      </strong>
                    </div>

                  </div>

                </div>

                {/* PARAMÈTRES */}

                {parameters.length > 0 && (

                  <div className="parameters-section">

                    <div className="parameters-header">
                      <span>
                        Paramètres du relevé
                      </span>

                      {parameters.length > 3 && (
                        <span>
                          +{parameters.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="parameters-list">

                      {parameters
                        .slice(0, 3)
                        .map((param, index) => (

                          <span
                            key={param.id || index}
                            className="parameter-chip"
                          >
                            {param.name ||
                              `Paramètre ${index + 1}`}
                          </span>

                        ))}

                    </div>

                  </div>

                )}

                {/* ACTIONS */}

                <div className="canvas-card-actions">

                  <Link
                    to={`/readings/canvases/${canvas.id}`}
                    className="card-action view"
                  >
                    <Eye size={15} />
                    <span>Voir</span>
                  </Link>

                  <Link
                    to={`/readings/canvases/${canvas.id}/edit`}
                    className="card-action edit"
                  >
                    <Edit size={15} />
                    <span>Modifier</span>
                  </Link>

                  <button
                    type="button"
                    className="card-action delete"
                    onClick={() =>
                      openDeleteModal(canvas)
                    }
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>

                </div>

              </article>

            );
          })}

        </div>

      )}

      {/* ======================================================
          MODAL SUPPRESSION
      ====================================================== */}

      {showDeleteModal && (

        <div
          className="modal-overlay"
          onClick={closeDeleteModal}
        >

          <div
            className="delete-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="delete-modal-icon">
              <AlertTriangle size={25} />
            </div>

            <div className="delete-modal-content">

              <h3>
                Supprimer le canvas ?
              </h3>

              <p>
                Vous êtes sur le point de supprimer
                définitivement le modèle :
              </p>

              <div className="canvas-delete-name">
                <FileText size={16} />

                <strong>
                  {canvasToDelete?.template_name ||
                    'Canvas'}
                </strong>
              </div>

              <p className="delete-warning">
                Cette action est irréversible et
                retirera ce modèle de relevé.
              </p>

            </div>

            <div className="delete-modal-actions">

              <button
                type="button"
                className="modal-cancel-btn"
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Annuler
              </button>

              <button
                type="button"
                className="modal-delete-btn"
                onClick={handleDelete}
                disabled={isDeleting}
              >

                {isDeleting ? (
                  <RefreshCw
                    size={16}
                    className="spin-icon"
                  />
                ) : (
                  <Trash2 size={16} />
                )}

                <span>
                  {isDeleting
                    ? 'Suppression...'
                    : 'Supprimer'}
                </span>

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default CanvasList;