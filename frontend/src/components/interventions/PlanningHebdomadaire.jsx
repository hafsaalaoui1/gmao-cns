import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  CalendarDays,
  Clock,
  Users,
  Wrench,
  AlertCircle,
} from 'lucide-react';

import './PlanningHebdomadaire.css';

/* ============================================================
   UTILITAIRES
   ============================================================ */

/**
 * Retourne le lundi de la semaine correspondant à une date.
 */
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();

  // Dimanche = 0
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
};

/**
 * Retourne la date correspondant à un jour de la semaine.
 *
 * index :
 * 0 = lundi
 * 1 = mardi
 * ...
 * 6 = dimanche
 */
const getDateOfWeekDay = (weekStart, index) => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + index);
  return date;
};

/**
 * Format d'affichage d'une date.
 */
const formatDate = (date) => {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
};

/**
 * Format YYYY-MM-DD.
 *
 * Important :
 * on utilise les valeurs locales pour éviter
 * les problèmes de décalage UTC avec toISOString().
 */
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Nom du jour.
 */
const getDayName = (index) => {
  const names = [
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
    'Dimanche',
  ];

  return names[index];
};

/* ============================================================
   COMPOSANT
   ============================================================ */

const PlanningHebdomadaire = () => {
  /* ============================================================
     ETATS
     ============================================================ */

  const [loading, setLoading] = useState(false);

  const [weekStart, setWeekStart] = useState(() =>
    getWeekStart(new Date())
  );

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentWeek, setCurrentWeek] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  const [groups, setGroups] = useState([]);
  const [equipments, setEquipments] = useState([]);

  const [formData, setFormData] = useState({
    equipment_id: '',
    day_of_week: '',
    start_time: '09:00',
    duration: 60,
    type: 'preventive',
    priority: 'normale',
    group_id: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '09:00',
  });

  /* ============================================================
     CHARGEMENT DES DONNEES
     ============================================================ */

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchWeekPlanning();
  }, [weekStart]);

  /**
   * Charge :
   * - catégories
   * - groupes
   * - équipements
   *
   * Il n'y a plus de chargement des rotations ici.
   * La rotation est maintenant automatique côté backend.
   */
  const loadData = async () => {
    try {
      setLoading(true);

      const [
        categoriesRes,
        groupsRes,
        equipmentsRes,
      ] = await Promise.all([
        api.get('/equipment-categories/hierarchy'),
        api.get('/groups'),
        api.get('/equipments'),
      ]);

      setCategories(
        categoriesRes.data?.data ??
        categoriesRes.data ??
        []
      );

      setGroups(
        groupsRes.data?.data ??
        groupsRes.data ??
        []
      );

      setEquipments(
        equipmentsRes.data?.data ??
        equipmentsRes.data ??
        []
      );
    } catch (error) {
      console.error(
        'Erreur chargement des données :',
        error
      );

      toast.error(
        'Impossible de charger les données du planning'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charge le planning de la semaine.
   */
  const fetchWeekPlanning = async () => {
    try {
      setLoading(true);

      const weekStartFormatted =
        formatLocalDate(weekStart);

      const response = await api.get(
        '/maintenance-plans/weekly',
        {
          params: {
            week_start: weekStartFormatted,
          },
        }
      );

      const data =
        response.data?.data ??
        response.data ??
        [];

      setEvents(Array.isArray(data) ? data : []);

      updateCurrentWeekLabel(weekStart);
    } catch (error) {
      console.error(
        'Erreur chargement planning :',
        error
      );

      toast.error(
        'Impossible de charger le planning'
      );

      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Texte de la semaine affichée.
   */
  const updateCurrentWeekLabel = (start) => {
    const end = getDateOfWeekDay(start, 6);

    const startText = start.toLocaleDateString(
      'fr-FR',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }
    );

    const endText = end.toLocaleDateString(
      'fr-FR',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }
    );

    setCurrentWeek(
      `Du ${startText} au ${endText}`
    );
  };

  /* ============================================================
     NAVIGATION SEMAINE
     ============================================================ */

  const goToPreviousWeek = () => {
    const newDate = new Date(weekStart);

    newDate.setDate(
      newDate.getDate() - 7
    );

    setWeekStart(
      getWeekStart(newDate)
    );
  };

  const goToNextWeek = () => {
    const newDate = new Date(weekStart);

    newDate.setDate(
      newDate.getDate() + 7
    );

    setWeekStart(
      getWeekStart(newDate)
    );
  };

  const goToCurrentWeek = () => {
    setWeekStart(
      getWeekStart(new Date())
    );
  };

  /* ============================================================
     RECHERCHE D'UNE INTERVENTION DANS UNE CELLULE
     ============================================================ */

  /**
   * Cherche l'intervention correspondant exactement :
   * - à l'équipement
   * - à la date de la cellule
   */
  const getEventForCell = (
    equipmentId,
    dayIndex
  ) => {
    const cellDate = getDateOfWeekDay(
      weekStart,
      dayIndex
    );

    const cellDateString =
      formatLocalDate(cellDate);

    return events.find((event) => {
      const eventEquipmentId =
        Number(event.equipment_id);

      const currentEquipmentId =
        Number(equipmentId);

      const eventDate =
        event.scheduled_date
          ? String(event.scheduled_date).substring(
              0,
              10
            )
          : null;

      return (
        eventEquipmentId ===
          currentEquipmentId &&
        eventDate === cellDateString
      );
    });
  };

  /* ============================================================
     CLIC SUR UNE CELLULE
     ============================================================ */

  const handleCellClick = (
    equipment,
    dayIndex
  ) => {
    const event = getEventForCell(
      equipment.id,
      dayIndex
    );

    /**
     * Si une intervention existe déjà :
     * on ouvre directement sa page de modification.
     */
    if (event) {
      window.location.href =
        `/interventions/${event.id}/edit`;

      return;
    }

    /**
     * Sinon :
     * on ouvre le formulaire de création.
     */
    const selectedDate =
      getDateOfWeekDay(
        weekStart,
        dayIndex
      );

    const selectedDateString =
      formatLocalDate(selectedDate);

    setIsEdit(false);
    setEditingEvent(null);

    setSelectedEquipment(
      equipment.id
    );

    /**
     * day_of_week :
     * 1 = lundi
     * ...
     * 7 = dimanche
     */
    setSelectedDay(
      dayIndex + 1
    );

    setFormData({
      equipment_id: equipment.id,
      day_of_week: dayIndex + 1,
      start_time: '09:00',
      duration: 60,
      type: 'preventive',
      priority: 'normale',
      group_id: '',
      description: '',
      scheduled_date:
        selectedDateString,
      scheduled_time: '09:00',
    });

    setShowModal(true);
  };

  /* ============================================================
     MODIFICATION FORMULAIRE
     ============================================================ */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* ============================================================
     FERMETURE MODAL
     ============================================================ */

  const handleModalClose = () => {
    setShowModal(false);
    setIsEdit(false);
    setEditingEvent(null);
    setSelectedEquipment(null);
    setSelectedDay(null);

    setFormData({
      equipment_id: '',
      day_of_week: '',
      start_time: '09:00',
      duration: 60,
      type: 'preventive',
      priority: 'normale',
      group_id: '',
      description: '',
      scheduled_date: '',
      scheduled_time: '09:00',
    });
  };

  /* ============================================================
     SOUMISSION FORMULAIRE
     ============================================================ */

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);

      /* ========================================================
         MODIFICATION D'UNE INTERVENTION EXISTANTE
         ======================================================== */

      if (isEdit && editingEvent) {
        const payload = {
          equipment_id:
            formData.equipment_id,

          type:
            formData.type,

          scheduled_date:
            formData.scheduled_date,

          scheduled_time:
            formData.scheduled_time ||
            formData.start_time,

          duration:
            parseInt(
              formData.duration,
              10
            ),

          group_id:
            formData.group_id
              ? parseInt(
                  formData.group_id,
                  10
                )
              : null,

          priority:
            formData.priority,

          description:
            formData.description,
        };

        await api.put(
          `/interventions/${editingEvent.id}`,
          payload
        );

        toast.success(
          'Intervention modifiée avec succès'
        );

        handleModalClose();

        await fetchWeekPlanning();

        return;
      }

      /* ========================================================
         CREATION
         ======================================================== */

      if (!selectedEquipment) {
        toast.error(
          'Veuillez sélectionner un équipement'
        );

        return;
      }

      /**
       * Le groupe est obligatoire.
       *
       * C'est lui qui représente le groupe
       * de la première intervention.
       */
      if (!formData.group_id) {
        toast.error(
          'Veuillez sélectionner un groupe responsable'
        );

        return;
      }

      /**
       * Date de la cellule sélectionnée.
       *
       * Exemple :
       * jeudi 10/09/2026
       * => start_date = 2026-09-10
       *
       * C'est très important pour que cette
       * intervention soit la première de la rotation.
       */
      const selectedDate =
        getDateOfWeekDay(
          weekStart,
          selectedDay - 1
        );

      const selectedDateString =
        formatLocalDate(selectedDate);

      /**
       * Année de la date sélectionnée.
       */
      const selectedYear =
        selectedDate.getFullYear();

      /**
       * Utilisateur connecté.
       */
      const storedUser =
        localStorage.getItem('user');

      let userId = 1;

      try {
        if (storedUser) {
          const parsedUser =
            JSON.parse(storedUser);

          userId =
            parsedUser?.id ||
            parsedUser?.user?.id ||
            1;
        }
      } catch (error) {
        console.warn(
          'Impossible de lire utilisateur localStorage',
          error
        );
      }

      /* ========================================================
         PAYLOAD TEMPLATE
         ======================================================== */

      const payload = {
        equipment_id:
          selectedEquipment,

        day_of_week:
          selectedDay,

        start_time:
          formData.start_time,

        duration:
          parseInt(
            formData.duration,
            10
          ),

        type:
          formData.type,

        priority:
          formData.priority,

        description:
          formData.description,

        /**
         * IMPORTANT :
         * On envoie uniquement group_id.
         *
         * Le backend cherchera la rotation
         * correspondant à ce groupe.
         */
        group_id:
          parseInt(
            formData.group_id,
            10
          ),

        /**
         * La date de départ est la date
         * réellement choisie dans le planning.
         */
        start_date:
          selectedDateString,

        /**
         * On génère jusqu'à la fin de l'année.
         */
        end_date:
          `${selectedYear}-12-31`,

        is_active:
          true,

        created_by:
          userId,
      };

      console.log(
        'Création PlanningTemplate :',
        payload
      );

      /* ========================================================
         CREATION TEMPLATE
         ======================================================== */

      const response =
        await api.post(
          '/planning-templates',
          payload
        );

      const created =
        response.data?.data ??
        response.data;

      if (!created?.id) {
        throw new Error(
          'Le template créé ne possède pas d’identifiant.'
        );
      }

      /* ========================================================
         GENERATION DES INTERVENTIONS
         ======================================================== */

      console.log(
        'Génération des interventions pour le template :',
        created.id
      );

      await api.post(
        `/planning-templates/${created.id}/generate`,
        {
          year: selectedYear,
        }
      );

      toast.success(
        'Maintenance récurrente créée avec succès'
      );

      handleModalClose();

      await fetchWeekPlanning();
    } catch (error) {
      console.error(
        'Erreur soumission planning :',
        error
      );

      console.error(
        'Réponse serveur :',
        error?.response?.data
      );

      const serverMessage =
        error?.response?.data?.message;

      const validationErrors =
        error?.response?.data?.errors;

      if (
        validationErrors &&
        typeof validationErrors === 'object'
      ) {
        const firstError =
          Object.values(
            validationErrors
          )?.[0]?.[0];

        toast.error(
          firstError ||
            'Erreur de validation'
        );
      } else {
        toast.error(
          serverMessage ||
            'Une erreur est survenue'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     EQUIPEMENTS
     ============================================================ */

  /**
   * Aplatit les catégories si l'API retourne
   * une hiérarchie.
   */
  const renderEquipmentRows = () => {
    const rows = [];

    const walk = (
      items,
      categoryName = ''
    ) => {
      if (!Array.isArray(items)) {
        return;
      }

      items.forEach((item) => {
        if (
          Array.isArray(item.equipments)
        ) {
          item.equipments.forEach(
            (equipment) => {
              rows.push({
                ...equipment,
                categoryName:
                  item.name ||
                  categoryName,
              });
            }
          );
        }

        if (
          Array.isArray(item.children)
        ) {
          walk(
            item.children,
            item.name ||
              categoryName
          );
        }
      });
    };

    walk(categories);

    /**
     * Si la hiérarchie n'a pas permis
     * de trouver les équipements,
     * on utilise directement /equipments.
     */
    if (rows.length === 0) {
      return equipments.map(
        (equipment) => ({
          ...equipment,
          categoryName:
            equipment.category?.name ||
            equipment.category_name ||
            '',
        })
      );
    }

    return rows;
  };

  const equipmentRows =
    renderEquipmentRows();

  /* ============================================================
     BADGES
     ============================================================ */

  const getTypeLabel = (type) => {
    switch (type) {
      case 'preventive':
        return 'Préventive';

      case 'corrective':
        return 'Corrective';

      case 'inspection':
        return 'Inspection';

      case 'controle':
        return 'Contrôle';

      default:
        return type || 'Maintenance';
    }
  };

  const getPriorityLabel = (
    priority
  ) => {
    switch (priority) {
      case 'faible':
        return 'Faible';

      case 'normale':
        return 'Normale';

      case 'élevée':
      case 'elevee':
        return 'Élevée';

      case 'critique':
        return 'Critique';

      default:
        return priority || 'Normale';
    }
  };

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="planning-hebdomadaire">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="planning-header">

        <div className="planning-title">

          <div className="planning-title-icon">
            <CalendarDays size={26} />
          </div>

          <div>
            <h1>
              Planning hebdomadaire
            </h1>

            <p>
              Planification des maintenances CNS
            </p>
          </div>

        </div>

        <div className="planning-actions">

          <button
            type="button"
            className="btn-secondary"
            onClick={goToCurrentWeek}
          >
            Aujourd'hui
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={goToPreviousWeek}
            title="Semaine précédente"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="current-week">
            {currentWeek}
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={goToNextWeek}
            title="Semaine suivante"
          >
            <ChevronRight size={20} />
          </button>

        </div>
      </div>

      {/* ======================================================
          INFORMATION ROTATION
          ====================================================== */}

      <div className="planning-info">
        <AlertCircle size={18} />

        <div>
          <strong>
            Rotation automatique des groupes
          </strong>

          <span>
            Le groupe choisi lors de la création
            correspond à la première intervention.
            Les semaines suivantes, le système fait
            automatiquement tourner les groupes selon
            la rotation configurée.
          </span>
        </div>
      </div>

      {/* ======================================================
          TABLEAU
          ====================================================== */}

      <div className="planning-card">

        {loading && (
          <div className="planning-loading">
            Chargement...
          </div>
        )}

        <div className="planning-table-wrapper">

          <table className="planning-table">

            <thead>
              <tr>

                <th className="equipment-column">
                  Équipement
                </th>

                {Array.from(
                  { length: 7 },
                  (_, index) => {
                    const date =
                      getDateOfWeekDay(
                        weekStart,
                        index
                      );

                    const isToday =
                      formatLocalDate(
                        date
                      ) ===
                      formatLocalDate(
                        new Date()
                      );

                    return (
                      <th
                        key={index}
                        className={
                          isToday
                            ? 'today-column'
                            : ''
                        }
                      >
                        <div className="day-header">

                          <span className="day-name">
                            {getDayName(index)}
                          </span>

                          <span className="day-date">
                            {formatDate(date)}
                          </span>

                        </div>
                      </th>
                    );
                  }
                )}

              </tr>
            </thead>

            <tbody>

              {equipmentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="empty-planning"
                  >
                    Aucun équipement trouvé.
                  </td>
                </tr>
              ) : (
                equipmentRows.map(
                  (equipment) => (
                    <tr
                      key={equipment.id}
                    >

                      {/* ========================================
                          EQUIPEMENT
                          ======================================== */}

                      <td className="equipment-cell">

                        <div className="equipment-name">

                          <div className="equipment-icon">
                            <Wrench size={17} />
                          </div>

                          <div>

                            <strong>
                              {
                                equipment.name ||
                                equipment.designation ||
                                `Équipement #${equipment.id}`
                              }
                            </strong>

                            {equipment.categoryName && (
                              <small>
                                {
                                  equipment.categoryName
                                }
                              </small>
                            )}

                          </div>

                        </div>

                      </td>

                      {/* ========================================
                          JOURS
                          ======================================== */}

                      {Array.from(
                        { length: 7 },
                        (_, dayIndex) => {
                          const event =
                            getEventForCell(
                              equipment.id,
                              dayIndex
                            );

                          const cellDate =
                            getDateOfWeekDay(
                              weekStart,
                              dayIndex
                            );

                          const isToday =
                            formatLocalDate(
                              cellDate
                            ) ===
                            formatLocalDate(
                              new Date()
                            );

                          return (
                            <td
                              key={dayIndex}
                              className={`planning-cell ${
                                isToday
                                  ? 'today-cell'
                                  : ''
                              } ${
                                event
                                  ? 'has-event'
                                  : 'empty-cell'
                              }`}
                              onClick={() =>
                                handleCellClick(
                                  equipment,
                                  dayIndex
                                )
                              }
                            >

                              {event ? (
                                <div className="event-card">

                                  <div className="event-type">
                                    {getTypeLabel(
                                      event.type
                                    )}
                                  </div>

                                  <div className="event-time">
                                    <Clock
                                      size={13}
                                    />

                                    <span>
                                      {
                                        event.scheduled_time ||
                                        event.start_time ||
                                        '--:--'
                                      }
                                    </span>
                                  </div>

                                  {event.group_name && (
                                    <div className="event-group">
                                      <Users
                                        size={13}
                                      />

                                      <span>
                                        {
                                          event.group_name
                                        }
                                      </span>
                                    </div>
                                  )}

                                  {event.duration && (
                                    <div className="event-duration">
                                      {
                                        event.duration
                                      } min
                                    </div>
                                  )}

                                </div>
                              ) : (
                                <div className="empty-cell-content">

                                  <Plus
                                    size={18}
                                  />

                                  <span>
                                    Planifier
                                  </span>

                                </div>
                              )}

                            </td>
                          );
                        }
                      )}

                    </tr>
                  )
                )
              )}

            </tbody>

          </table>

        </div>
      </div>

      {/* ======================================================
          MODAL
          ====================================================== */}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={handleModalClose}
        >

          <div
            className="planning-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* ==================================================
                MODAL HEADER
                ================================================== */}

            <div className="modal-header">

              <div>
                <h2>
                  {isEdit
                    ? 'Modifier l’intervention'
                    : 'Planifier une maintenance récurrente'}
                </h2>

                {!isEdit && (
                  <p>
                    Configurez la maintenance à partir
                    de la date sélectionnée.
                  </p>
                )}
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={handleModalClose}
              >
                <X size={21} />
              </button>

            </div>

            {/* ==================================================
                FORMULAIRE
                ================================================== */}

            <form
              onSubmit={handleSubmit}
              className="planning-form"
            >

              {/* ================================================
                  EQUIPEMENT
                  ================================================ */}

              <div className="form-group">

                <label>
                  Équipement
                </label>

                <select
                  name="equipment_id"
                  value={
                    formData.equipment_id
                  }
                  onChange={handleChange}
                  disabled={!isEdit}
                  required
                >

                  <option value="">
                    Sélectionner un équipement
                  </option>

                  {equipments.map(
                    (equipment) => (
                      <option
                        key={equipment.id}
                        value={equipment.id}
                      >
                        {
                          equipment.name ||
                          equipment.designation ||
                          `Équipement #${equipment.id}`
                        }
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* ================================================
                  DATE
                  ================================================ */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Date
                  </label>

                  <input
                    type="date"
                    name="scheduled_date"
                    value={
                      formData.scheduled_date
                    }
                    onChange={handleChange}
                    disabled={!isEdit}
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Heure
                  </label>

                  <input
                    type="time"
                    name={
                      isEdit
                        ? 'scheduled_time'
                        : 'start_time'
                    }
                    value={
                      isEdit
                        ? formData.scheduled_time
                        : formData.start_time
                    }
                    onChange={handleChange}
                    required
                  />

                </div>

              </div>

              {/* ================================================
                  DUREE
                  ================================================ */}

              <div className="form-group">

                <label>
                  Durée (minutes)
                </label>

                <input
                  type="number"
                  name="duration"
                  min="1"
                  value={
                    formData.duration
                  }
                  onChange={handleChange}
                  required
                />

              </div>

              {/* ================================================
                  TYPE + PRIORITE
                  ================================================ */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Type de maintenance
                  </label>

                  <select
                    name="type"
                    value={
                      formData.type
                    }
                    onChange={handleChange}
                    required
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

                    <option value="controle">
                      Contrôle
                    </option>

                  </select>

                </div>

                <div className="form-group">

                  <label>
                    Priorité
                  </label>

                  <select
                    name="priority"
                    value={
                      formData.priority
                    }
                    onChange={handleChange}
                    required
                  >

                    <option value="faible">
                      Faible
                    </option>

                    <option value="normale">
                      Normale
                    </option>

                    <option value="élevée">
                      Élevée
                    </option>

                    <option value="critique">
                      Critique
                    </option>

                  </select>

                  <small className="form-help">
                    {
                      getPriorityLabel(
                        formData.priority
                      )
                    }
                  </small>

                </div>

              </div>

              {/* ================================================
                  GROUPE RESPONSABLE
                  ================================================ */}

              <div className="form-group">

                <label>
                  Groupe responsable
                </label>

                <select
                  name="group_id"
                  value={
                    formData.group_id
                  }
                  onChange={handleChange}
                  required
                >

                  <option value="">
                    Sélectionner un groupe
                  </option>

                  {groups.map(
                    (group) => (
                      <option
                        key={group.id}
                        value={group.id}
                      >
                        {group.name}
                      </option>
                    )
                  )}

                </select>

                {!isEdit && (
                  <small className="form-help rotation-help">
                    <span>
                      ⓘ
                    </span>

                    <span>
                      Le groupe choisi sera affecté
                      à cette première intervention.
                      Les semaines suivantes, le système
                      fera automatiquement tourner les groupes.
                    </span>
                  </small>
                )}

              </div>

              {/* ================================================
                  DESCRIPTION
                  ================================================ */}

              <div className="form-group">

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
                  placeholder="Description de la maintenance..."
                />

              </div>

              {/* ================================================
                  INFORMATION DATE
                  ================================================ */}

              {!isEdit && (
                <div className="recurring-info">

                  <CalendarDays
                    size={18}
                  />

                  <div>

                    <strong>
                      Maintenance récurrente
                    </strong>

                    <p>
                      La maintenance sera générée
                      chaque semaine à partir du
                      <strong>
                        {' '}
                        {formData.scheduled_date}
                      </strong>
                      .
                    </p>

                    <p>
                      Le groupe sélectionné sera le
                      premier groupe responsable, puis
                      les groupes tourneront automatiquement
                      chaque semaine.
                    </p>

                  </div>

                </div>
              )}

              {/* ================================================
                  BOUTONS
                  ================================================ */}

              <div className="modal-footer">

                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleModalClose}
                  disabled={loading}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >

                  {loading ? (
                    'Enregistrement...'
                  ) : (
                    isEdit
                      ? 'Enregistrer les modifications'
                      : 'Créer la maintenance'
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

export default PlanningHebdomadaire;