import React, {
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';

import api from '../../services/api';
import { toast } from 'react-hot-toast';

import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  X,
  Save,
  Trash2
} from 'lucide-react';

import './PlanningHebdomadaire.css';

// =====================================================
// HELPERS
// =====================================================

/**
 * Retourne le lundi de la semaine contenant la date donnée.
 *
 * Convention utilisée dans toute l'application :
 * 1 = Lundi
 * 2 = Mardi
 * 3 = Mercredi
 * 4 = Jeudi
 * 5 = Vendredi
 * 6 = Samedi
 * 7 = Dimanche
 */
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();

  // JS :
  // Dimanche = 0
  // Lundi    = 1
  // Mardi    = 2
  // ...
  //
  // On transforme donc la date en lundi.
  const diff =
    d.getDate() -
    day +
    (day === 0 ? -6 : 1);

  d.setDate(diff);
  d.setHours(0, 0, 0, 0);

  return d;
};

/**
 * Retourne la date correspondant à un jour de la semaine.
 *
 * idx :
 * 0 = lundi
 * 1 = mardi
 * 2 = mercredi
 * 3 = jeudi
 * ...
 */
const getDateOfWeekDay = (
  weekStart,
  idx
) => {
  const d = new Date(weekStart);

  d.setDate(
    d.getDate() + idx
  );

  return d;
};

/**
 * Format d'affichage d'une date.
 */
const formatDate = (
  dateValue
) => {
  if (!dateValue) {
    return '';
  }

  const d = new Date(dateValue);

  if (isNaN(d.getTime())) {
    return '';
  }

  return d.toLocaleDateString(
    'fr-FR',
    {
      day: 'numeric',
      month: 'short'
    }
  );
};

/**
 * Format YYYY-MM-DD sans problème de timezone.
 */
const formatLocalDate = (
  date
) => {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// =====================================================
// JOURS
// =====================================================

const DAYS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche'
];

const DAY_LABELS = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche'
};

// =====================================================
// FORMULAIRE INITIAL
// =====================================================

const INITIAL_FORM_STATE = {
  equipment_id: '',
  reading_canvas_id: '',
  day_of_week: '',
  start_time: '09:00',
  duration: 60,
  type: 'preventive',
  priority: 'normale',

  // IMPORTANT :
  // Il n'y a plus de group_rotation_id.
  // Le groupe sélectionné devient le groupe
  // de la première intervention.
  group_id: '',

  description: '',
  scheduled_date: '',
  scheduled_time: '09:00'
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const PlanningHebdomadaire = () => {
  const [initialLoading, setInitialLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [weekStart, setWeekStart] =
    useState(() =>
      getWeekStart(new Date())
    );

  const [events, setEvents] =
    useState([]);

  const [categories, setCategories] =
    useState([]);

  const [currentWeek, setCurrentWeek] =
    useState('');

  // ===================================================
  // MODALE
  // ===================================================

  const [showModal, setShowModal] =
    useState(false);

  const [isEdit, setIsEdit] =
    useState(false);

  const [selectedEquipment, setSelectedEquipment] =
    useState(null);

  const [selectedDay, setSelectedDay] =
    useState(null);

  const [editingEvent, setEditingEvent] =
    useState(null);

  const [formData, setFormData] =
    useState(INITIAL_FORM_STATE);

  // ===================================================
  // RÉFÉRENTIELS
  // ===================================================

  const [groups, setGroups] =
    useState([]);

  const [equipments, setEquipments] =
    useState([]);

  const [canvases, setCanvases] =
    useState([]);

  // =====================================================
  // CHARGEMENT INITIAL
  // =====================================================

  const loadData = useCallback(
    async () => {
      try {
        const [
          catRes,
          groupsRes,
          equipRes,
          canvasRes
        ] = await Promise.all([
          api.get(
            '/equipment-categories/hierarchy'
          ),

          api.get('/groups'),

          api.get('/equipments'),

          api.get('/canvases')
        ]);

        // -------------------------------------------------
        // CATÉGORIES
        // -------------------------------------------------

        setCategories(
          catRes.data?.data ||
          catRes.data ||
          []
        );

        // -------------------------------------------------
        // GROUPES
        // -------------------------------------------------

        setGroups(
          groupsRes.data?.data ||
          groupsRes.data ||
          []
        );

        // -------------------------------------------------
        // ÉQUIPEMENTS
        // -------------------------------------------------

        setEquipments(
          equipRes.data?.data ||
          equipRes.data ||
          []
        );

        // -------------------------------------------------
        // CANVAS / RELEVÉS
        // -------------------------------------------------

        setCanvases(
          canvasRes.data?.data ||
          canvasRes.data ||
          []
        );
      } catch (error) {
        console.error(
          'Erreur chargement données référentielles:',
          error
        );

        toast.error(
          'Impossible de charger les données référentielles'
        );
      } finally {
        setInitialLoading(false);
      }
    },
    []
  );

  // =====================================================
  // CHARGEMENT DU PLANNING
  // =====================================================

  const fetchWeekPlanning =
    useCallback(async () => {
      setRefreshing(true);

      try {
        const weekStartStr =
          formatLocalDate(
            weekStart
          );

        const response =
          await api.get(
            '/maintenance-plans/weekly',
            {
              params: {
                week_start:
                  weekStartStr
              }
            }
          );

        const eventsData =
          response.data?.events ||
          [];

        console.log(
          '📅 Planning semaine reçue :',
          eventsData
        );

        setEvents(eventsData);

        // -------------------------------------------------
        // DIMANCHE DE LA SEMAINE
        // -------------------------------------------------

        const endDate =
          new Date(weekStart);

        endDate.setDate(
          endDate.getDate() + 6
        );

        setCurrentWeek(
          `Semaine du ${formatDate(
            weekStart
          )} au ${formatDate(
            endDate
          )}`
        );
      } catch (error) {
        console.error(
          'Erreur lors du chargement du planning:',
          error
        );

        toast.error(
          'Impossible de charger le planning'
        );

        setEvents([]);
      } finally {
        setRefreshing(false);
      }
    }, [weekStart]);

  // =====================================================
  // USE EFFECT
  // =====================================================

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetchWeekPlanning();
  }, [fetchWeekPlanning]);

  // =====================================================
  // NAVIGATION ENTRE SEMAINES
  // =====================================================

  const changeWeek = (
    delta
  ) => {
    const newDate =
      new Date(weekStart);

    newDate.setDate(
      newDate.getDate() +
        delta * 7
    );

    setWeekStart(
      getWeekStart(newDate)
    );
  };

  const goToCurrentWeek =
    () => {
      setWeekStart(
        getWeekStart(
          new Date()
        )
      );
    };

  // =====================================================
  // TROUVER L'ÉVÉNEMENT D'UNE CELLULE
  // =====================================================

  const getEventForCell =
    useCallback(
      (
        equipmentId,
        dayOfWeek
      ) => {
        // Date réelle correspondant
        // à la colonne.

        const targetDate =
          new Date(weekStart);

        targetDate.setDate(
          targetDate.getDate() +
            (dayOfWeek - 1)
        );

        const dateStr =
          formatLocalDate(
            targetDate
          );

        const foundEvent =
          events.find(
            (event) => {
              // Même équipement
              if (
                String(
                  event.equipment_id
                ) !==
                String(
                  equipmentId
                )
              ) {
                return false;
              }

              // =================================================
              // PRIORITÉ 1 :
              // day_of_week retourné par le backend
              // =================================================

              if (
                event.day_of_week !==
                  null &&
                event.day_of_week !==
                  undefined &&
                event.day_of_week !==
                  ''
              ) {
                return (
                  Number(
                    event.day_of_week
                  ) ===
                  Number(
                    dayOfWeek
                  )
                );
              }

              // =================================================
              // PRIORITÉ 2 :
              // scheduled_date
              // =================================================

              if (
                event.scheduled_date
              ) {
                const eventDate =
                  String(
                    event.scheduled_date
                  ).split('T')[0];

                return (
                  eventDate ===
                  dateStr
                );
              }

              return false;
            }
          );

        return (
          foundEvent || null
        );
      },
      [
        weekStart,
        events
      ]
    );

  // =====================================================
  // TROUVER UN ÉQUIPEMENT
  // =====================================================

  const getRealEquipment =
    useCallback(
      (equipmentId) => {
        if (!equipmentId) {
          return null;
        }

        // -------------------------------------------------
        // RECHERCHE DIRECTE
        // -------------------------------------------------

        const directMatch =
          equipments.find(
            (eq) =>
              String(eq.id) ===
              String(equipmentId)
          );

        if (directMatch) {
          return directMatch;
        }

        // -------------------------------------------------
        // RECHERCHE DANS LA HIÉRARCHIE
        // -------------------------------------------------

        let hierarchyEquipment =
          null;

        const search = (
          nodes
        ) => {
          if (
            !Array.isArray(
              nodes
            )
          ) {
            return;
          }

          for (
            const node of nodes
          ) {
            if (
              Array.isArray(
                node.equipments
              )
            ) {
              const found =
                node.equipments.find(
                  (eq) =>
                    String(
                      eq.id
                    ) ===
                    String(
                      equipmentId
                    )
                );

              if (found) {
                hierarchyEquipment =
                  found;

                return;
              }
            }

            if (
              Array.isArray(
                node.children
              )
            ) {
              search(
                node.children
              );

              if (
                hierarchyEquipment
              ) {
                return;
              }
            }
          }
        };

        search(categories);

        return hierarchyEquipment;
      },
      [
        equipments,
        categories
      ]
    );

  // =====================================================
  // NOM DE L'ÉQUIPEMENT
  // =====================================================

  const getEquipmentName =
    useCallback(
      (id) => {
        if (!id) {
          return 'Équipement inconnu';
        }

        const eq =
          getRealEquipment(id);

        return (
          eq?.name ||
          eq?.designation ||
          'Équipement inconnu'
        );
      },
      [getRealEquipment]
    );

  // =====================================================
  // CANVAS DISPONIBLES
  // =====================================================

  const availableCanvases =
    useMemo(() => {
      const eqId =
        formData.equipment_id ||
        selectedEquipment;

      if (!eqId) {
        return [];
      }

      const realEq =
        getRealEquipment(
          eqId
        );

      const targetId =
        realEq?.id ||
        eqId;

      return canvases.filter(
        (canvas) => {
          const canvasEqId =
            canvas.equipment_id ??
            canvas.equipment?.id ??
            null;

          const sameEq =
            String(
              canvasEqId
            ).trim() ===
            String(
              targetId
            ).trim();

          const isActive =
            canvas.is_active ===
              true ||
            canvas.is_active ===
              1 ||
            canvas.is_active ===
              '1';

          return (
            sameEq &&
            isActive
          );
        }
      );
    }, [
      formData.equipment_id,
      selectedEquipment,
      canvases,
      getRealEquipment
    ]);

  // =====================================================
  // CLIC SUR UNE CELLULE
  // =====================================================

  const handleCellClick = (
    equipmentId,
    dayOfWeek,
    event
  ) => {
    // -------------------------------------------------
    // SI UNE INTERVENTION EXISTE
    // -------------------------------------------------

    if (event) {
      window.location.href =
        `/interventions/${event.id}`;

      return;
    }

    // -------------------------------------------------
    // ÉQUIPEMENT
    // -------------------------------------------------

    const realEq =
      getRealEquipment(
        equipmentId
      );

    const targetId =
      realEq?.id ||
      equipmentId;

    // -------------------------------------------------
    // JOUR
    // -------------------------------------------------

    setSelectedEquipment(
      targetId
    );

    setSelectedDay(
      dayOfWeek
    );

    // -------------------------------------------------
    // DATE RÉELLE DE LA CELLULE
    // -------------------------------------------------

    const selectedDate =
      getDateOfWeekDay(
        weekStart,
        Number(dayOfWeek) - 1
      );

    const selectedDateStr =
      formatLocalDate(
        selectedDate
      );

    // -------------------------------------------------
    // FORMULAIRE
    // -------------------------------------------------

    setFormData({
      ...INITIAL_FORM_STATE,

      equipment_id:
        String(targetId),

      day_of_week:
        Number(dayOfWeek),

      scheduled_date:
        selectedDateStr
    });

    setIsEdit(false);

    setEditingEvent(null);

    setShowModal(true);
  };

  // =====================================================
  // FERMER MODALE
  // =====================================================

  const handleModalClose =
    () => {
      setShowModal(false);

      setIsEdit(false);

      setEditingEvent(null);

      setSelectedEquipment(
        null
      );

      setSelectedDay(null);

      setFormData(
        INITIAL_FORM_STATE
      );
    };

  // =====================================================
  // CHANGEMENT FORMULAIRE
  // =====================================================

  const handleChange = (
    e
  ) => {
    const {
      name,
      value
    } = e.target;

    // -------------------------------------------------
    // ÉQUIPEMENT
    // -------------------------------------------------

    if (
      name === 'equipment_id'
    ) {
      setFormData(
        (prev) => ({
          ...prev,

          equipment_id:
            value,

          reading_canvas_id:
            ''
        })
      );

      return;
    }

    // -------------------------------------------------
    // AUTRES CHAMPS
    // -------------------------------------------------

    setFormData(
      (prev) => ({
        ...prev,
        [name]: value
      })
    );
  };

  // =====================================================
  // SUPPRIMER UNE INTERVENTION
  // =====================================================

  const handleDelete =
    async () => {
      if (
        !editingEvent ||
        !window.confirm(
          'Voulez-vous vraiment supprimer cette intervention ?'
        )
      ) {
        return;
      }

      try {
        await api.delete(
          `/interventions/${editingEvent.id}`
        );

        toast.success(
          'Intervention supprimée'
        );

        handleModalClose();

        await fetchWeekPlanning();
      } catch (error) {
        console.error(
          'Erreur suppression :',
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            'Erreur lors de la suppression'
        );
      }
    };

  // =====================================================
  // ENREGISTRER / PLANIFIER
  // =====================================================

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      // -------------------------------------------------
      // VÉRIFICATION ÉQUIPEMENT
      // -------------------------------------------------

      if (
        !selectedEquipment
      ) {
        toast.error(
          'Équipement manquant'
        );

        return;
      }

      try {
        // =================================================
        // MODIFICATION
        // =================================================

        if (
          isEdit &&
          editingEvent
        ) {
          const payload = {
            equipment_id:
              formData.equipment_id,

            template_id:
              formData.reading_canvas_id
                ? Number(
                    formData.reading_canvas_id
                  )
                : null,

            type:
              formData.type,

            scheduled_date:
              formData.scheduled_date,

            scheduled_time:
              formData.scheduled_time,

            duration:
              parseInt(
                formData.duration,
                10
              ),

            group_id:
              formData.group_id ||
              null,

            priority:
              formData.priority,

            description:
              formData.description
          };

          await api.put(
            `/interventions/${editingEvent.id}`,
            payload
          );

          toast.success(
            'Intervention mise à jour'
          );
        }

        // =================================================
        // CRÉATION D'UNE MAINTENANCE RÉCURRENTE
        // =================================================

        else {
          const currentYear =
            new Date().getFullYear();

          // -------------------------------------------------
          // UTILISATEUR CONNECTÉ
          // -------------------------------------------------

          let userId = 1;

          try {
            const userStr =
              localStorage.getItem(
                'user'
              );

            if (userStr) {
              userId =
                JSON.parse(
                  userStr
                )?.id || 1;
            }
          } catch (_) {
            // On garde userId = 1
          }

          // -------------------------------------------------
          // JOUR
          // -------------------------------------------------

          const selectedDayNumber =
            Number(
              selectedDay
            );

          if (
            !selectedDayNumber ||
            selectedDayNumber <
              1 ||
            selectedDayNumber >
              7
          ) {
            toast.error(
              'Jour de planification invalide'
            );

            return;
          }

          // -------------------------------------------------
          // GROUPE RESPONSABLE
          // -------------------------------------------------

          if (
            !formData.group_id
          ) {
            toast.error(
              'Veuillez sélectionner un groupe responsable'
            );

            return;
          }

          // -------------------------------------------------
          // DATE DE LA PREMIÈRE INTERVENTION
          // -------------------------------------------------
          //
          // IMPORTANT :
          //
          // Si l'utilisateur clique par exemple :
          //
          // Jeudi 10/09/2026
          //
          // alors :
          //
          // start_date = 2026-09-10
          //
          // et non :
          //
          // 2026-01-01
          //
          // Cela permet au backend de considérer
          // le groupe choisi comme le groupe de
          // la première intervention.
          //
          // Exemple :
          //
          // Rotation A → B → C
          //
          // Groupe choisi = B
          //
          // 10/09 = B
          // 17/09 = C
          // 24/09 = A
          // 01/10 = B
          //

          const firstOccurrenceDate =
            getDateOfWeekDay(
              weekStart,
              selectedDayNumber - 1
            );

          const firstOccurrenceDateStr =
            formatLocalDate(
              firstOccurrenceDate
            );

          // -------------------------------------------------
          // PAYLOAD
          // -------------------------------------------------

          const payload = {
            equipment_id:
              Number(
                selectedEquipment
              ),

            reading_canvas_id:
              formData.reading_canvas_id
                ? Number(
                    formData.reading_canvas_id
                  )
                : null,

            day_of_week:
              selectedDayNumber,

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

            // IMPORTANT :
            // Un seul groupe est choisi.
            //
            // Ce groupe correspond à la première
            // intervention.
            //
            // La rotation hebdomadaire est ensuite
            // gérée par le backend.
            group_id:
              Number(
                formData.group_id
              ),

            start_date:
              firstOccurrenceDateStr,

            end_date:
              `${currentYear}-12-31`,

            is_active:
              true,

            created_by:
              userId
          };

          console.log(
            '📤 Création du PlanningTemplate :',
            payload
          );

          // -------------------------------------------------
          // CRÉER LE TEMPLATE
          // -------------------------------------------------

          const createRes =
            await api.post(
              '/planning-templates',
              payload
            );

          const created =
            createRes.data?.data ||
            createRes.data;

          if (
            !created?.id
          ) {
            throw new Error(
              'Template de planning non créé'
            );
          }

          console.log(
            '✅ Template créé :',
            created
          );

          // -------------------------------------------------
          // GÉNÉRER LES INTERVENTIONS
          // -------------------------------------------------

          await api.post(
            `/planning-templates/${created.id}/generate`,
            {
              year:
                currentYear
            }
          );

          toast.success(
            'Maintenance planifiée avec succès !'
          );
        }

        // -------------------------------------------------
        // FERMER ET ACTUALISER
        // -------------------------------------------------

        handleModalClose();

        await fetchWeekPlanning();
      } catch (error) {
        console.error(
          'Erreur enregistrement :',
          error
        );

        console.error(
          'Réponse serveur :',
          error.response?.data
        );

        toast.error(
          error.response?.data
            ?.message ||
            'Erreur lors de la sauvegarde'
        );
      }
    };

  // =====================================================
  // CONSTRUCTION DE LA MATRICE
  // =====================================================

  const tableData =
    useMemo(() => {
      const rows = [];

      const traverse = (
        nodes
      ) => {
        if (
          !Array.isArray(
            nodes
          )
        ) {
          return;
        }

        for (
          const node of nodes
        ) {
          if (
            node.equipments?.length
          ) {
            const equipmentsList =
              node.equipments.map(
                (eq) => {
                  const daysData =
                    {};

                  // 1 = lundi
                  // 2 = mardi
                  // 3 = mercredi
                  // 4 = jeudi
                  // ...
                  for (
                    let d = 1;
                    d <= 7;
                    d++
                  ) {
                    const event =
                      getEventForCell(
                        eq.id,
                        d
                      );

                    daysData[d] =
                      event
                        ? {
                            type:
                              event.type,

                            priority:
                              event.priority,

                            id:
                              event.id,

                            group_name:
                              event.group_name ||
                              null
                          }
                        : null;
                  }

                  return {
                    id: eq.id,

                    name:
                      eq.name,

                    days:
                      daysData
                  };
                }
              );

            rows.push({
              category:
                node.name ||
                'Non catégorisé',

              equipments:
                equipmentsList
            });
          }

          if (
            node.children
          ) {
            traverse(
              node.children
            );
          }
        }
      };

      traverse(
        categories
      );

      return rows;
    }, [
      categories,
      getEventForCell
    ]);

  // =====================================================
  // LOADING
  // =====================================================

  if (initialLoading) {
    return (
      <div className="loading-state">
        <RefreshCw
          size={36}
          className="spin"
        />

        <p>
          Chargement du planning...
        </p>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="planning-hebdomadaire">

      {/* =================================================
          HEADER
      ================================================== */}

      <div className="ph-header">

        <div className="ph-title">

          <Calendar size={24} />

          <div>
            <h1>
              Planning hebdomadaire
            </h1>

            <p>
              Vue par semaine avec regroupement
              par catégorie. Cliquez sur une case
              vide pour planifier.
            </p>
          </div>

        </div>

        <button
          className="btn-refresh"
          onClick={
            fetchWeekPlanning
          }
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? 'spin'
                : ''
            }
          />

          Actualiser
        </button>

      </div>

      {/* =================================================
          NAVIGATION
      ================================================== */}

      <div className="ph-nav">

        <button
          onClick={() =>
            changeWeek(-1)
          }
          className="nav-btn"
          title="Semaine précédente"
        >
          <ChevronLeft
            size={18}
          />
        </button>

        <button
          onClick={
            goToCurrentWeek
          }
          className="today-btn"
        >
          Semaine actuelle
        </button>

        <button
          onClick={() =>
            changeWeek(1)
          }
          className="nav-btn"
          title="Semaine suivante"
        >
          <ChevronRight
            size={18}
          />
        </button>

        <div className="ph-week-display">
          <strong>
            {currentWeek}
          </strong>
        </div>

      </div>

      {/* =================================================
          TABLEAU
      ================================================== */}

      {tableData.length === 0 ? (

        <div className="empty-state">

          <p>
            Aucun équipement n'est encore
            organisé par catégorie.
          </p>

          <p>
            Créez des catégories et assignez-y
            des équipements pour voir le planning.
          </p>

        </div>

      ) : (

        <div className="ph-table-wrapper">

          <table className="ph-table">

            {/* =================================================
                HEADER DU TABLEAU
            ================================================== */}

            <thead>

              <tr>

                <th className="category-column">
                  Catégorie / Équipement
                </th>

                {DAYS.map(
                  (
                    day,
                    idx
                  ) => (

                    <th
                      key={idx}
                      className="day-column"
                    >

                      <span className="day-name">
                        {day}
                      </span>

                      <span className="day-date">
                        {formatDate(
                          getDateOfWeekDay(
                            weekStart,
                            idx
                          )
                        )}
                      </span>

                    </th>

                  )
                )}

              </tr>

            </thead>

            {/* =================================================
                BODY
            ================================================== */}

            <tbody>

              {tableData.map(
                (
                  group,
                  idx
                ) => (

                  <React.Fragment
                    key={idx}
                  >

                    {/* ================================
                        CATÉGORIE
                    ================================= */}

                    <tr className="category-row">

                      <td
                        colSpan="8"
                        className="category-cell"
                      >

                        <span className="category-name">
                          {
                            group.category
                          }
                        </span>

                        <span className="category-count">
                          {
                            group
                              .equipments
                              .length
                          }{' '}
                          équipement(s)
                        </span>

                      </td>

                    </tr>

                    {/* ================================
                        ÉQUIPEMENTS
                    ================================= */}

                    {group.equipments.map(
                      (eq) => (

                        <tr
                          key={eq.id}
                          className="equipment-row"
                        >

                          <td className="equipment-cell">

                            <span className="equipment-name">
                              {
                                eq.name
                              }
                            </span>

                          </td>

                          {/* =================================
                              JOURS
                          ================================== */}

                          {[
                            1,
                            2,
                            3,
                            4,
                            5,
                            6,
                            7
                          ].map(
                            (
                              dayNum
                            ) => {

                              const event =
                                eq.days[
                                  dayNum
                                ];

                              return (

                                <td
                                  key={
                                    dayNum
                                  }
                                  className={
                                    `planning-cell ${
                                      event
                                        ? 'has-event'
                                        : ''
                                    }`
                                  }
                                  onClick={() =>
                                    handleCellClick(
                                      eq.id,
                                      dayNum,
                                      event
                                    )
                                  }
                                >

                                  {event ? (

                                    <div
                                      className={
                                        `event-detail priority-${event.priority}`
                                      }
                                    >

                                      <span className="event-group">
                                        {
                                          event.group_name ||
                                          'Aucun groupe'
                                        }
                                      </span>

                                      <span className="event-type">
                                        {{
                                          preventive:
                                            'P',

                                          corrective:
                                            'C',

                                          inspection:
                                            'I',

                                          control:
                                            'CTRL'
                                        }[
                                          event.type
                                        ] ||
                                          '•'}
                                      </span>

                                    </div>

                                  ) : (

                                    <div className="empty-cell-add">
                                      +
                                    </div>

                                  )}

                                </td>

                              );
                            }
                          )}

                        </tr>

                      )
                    )}

                  </React.Fragment>

                )
              )}

            </tbody>

          </table>

        </div>

      )}

      {/* =================================================
          LÉGENDE
      ================================================== */}

      <div className="ph-legend">

        <span>
          Priorité :
        </span>

        <span className="legend-item">

          <span className="legend-dot urgent"></span>

          Urgente

        </span>

        <span className="legend-item">

          <span className="legend-dot high"></span>

          Élevée

        </span>

        <span className="legend-item">

          <span className="legend-dot normal"></span>

          Normale

        </span>

        <span className="legend-item">

          <span className="legend-dot low"></span>

          Faible

        </span>

        <span className="legend-item">

          <span className="legend-dot plus">
            +
          </span>

          = Cliquer pour planifier

        </span>

      </div>

      {/* =================================================
          MODALE
      ================================================== */}

      {showModal && (

        <InterventionModal
          isEdit={isEdit}

          formData={formData}

          selectedEquipment={
            selectedEquipment
          }

          selectedDay={
            selectedDay
          }

          availableCanvases={
            availableCanvases
          }

          groups={groups}

          equipments={
            equipments
          }

          getEquipmentName={
            getEquipmentName
          }

          handleChange={
            handleChange
          }

          handleSubmit={
            handleSubmit
          }

          handleDelete={
            handleDelete
          }

          handleModalClose={
            handleModalClose
          }
        />

      )}

    </div>
  );
};

// =====================================================
// SUB-COMPONENT : MODALE INTERVENTION
// =====================================================

const InterventionModal = ({
  isEdit,
  formData,
  selectedEquipment,
  selectedDay,
  availableCanvases,
  groups,
  equipments,
  getEquipmentName,
  handleChange,
  handleSubmit,
  handleDelete,
  handleModalClose
}) => {

  return (
    <div
      className="modal-overlay"
      onClick={
        handleModalClose
      }
    >

      <div
        className="modal-content"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* =================================================
            HEADER MODALE
        ================================================== */}

        <div className="modal-header">

          <h2>
            {isEdit
              ? "Modifier l'intervention"
              : 'Planifier une maintenance récurrente'}
          </h2>

          <button
            type="button"
            className="modal-close"
            onClick={
              handleModalClose
            }
          >
            <X size={20} />
          </button>

        </div>

        {/* =================================================
            FORMULAIRE
        ================================================== */}

        <form
          onSubmit={
            handleSubmit
          }
        >

          {/* =================================================
              CRÉATION
          ================================================== */}

          {!isEdit ? (

            <>

              {/* =================================================
                  ÉQUIPEMENT
              ================================================== */}

              <div className="form-group">

                <label>
                  Équipement
                </label>

                <input
                  type="text"
                  value={getEquipmentName(
                    selectedEquipment
                  )}
                  disabled
                />

              </div>

              {/* =================================================
                  RELEVÉ
              ================================================== */}

              <div className="form-group">

                <label>
                  Relevé
                </label>

                <select
                  name="reading_canvas_id"
                  value={
                    formData.reading_canvas_id
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="">

                    {availableCanvases.length ===
                    0
                      ? 'Aucun relevé'
                      : 'Sélectionner un relevé'}

                  </option>

                  {availableCanvases.map(
                    (c) => (

                      <option
                        key={c.id}
                        value={c.id}
                      >
                        {
                          c.template_name
                        }
                      </option>

                    )
                  )}

                </select>

                {selectedEquipment && (

                  <small>

                    {availableCanvases.length ===
                    0
                      ? "Aucun Canvas de relevé actif n'est associé à cet équipement."
                      : 'Sélectionnez le relevé qui sera utilisé pour cette maintenance.'}

                  </small>

                )}

              </div>

              {/* =================================================
                  JOUR FIXE
              ================================================== */}

              <div className="form-group">

                <label>
                  Jour fixe
                </label>

                <input
                  type="text"
                  value={
                    DAY_LABELS[
                      Number(
                        selectedDay
                      )
                    ] || ''
                  }
                  disabled
                />

              </div>

              {/* =================================================
                  HEURE
              ================================================== */}

              <div className="form-group">

                <label>
                  Heure de début
                </label>

                <input
                  type="time"
                  name="start_time"
                  value={
                    formData.start_time
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>

              {/* =================================================
                  DURÉE
              ================================================== */}

              <div className="form-group">

                <label>
                  Durée (minutes)
                </label>

                <input
                  type="number"
                  name="duration"
                  value={
                    formData.duration
                  }
                  onChange={
                    handleChange
                  }
                  min="1"
                  step="5"
                  required
                />

              </div>

              {/* =================================================
                  TYPE
              ================================================== */}

              <div className="form-group">

                <label>
                  Type de maintenance
                </label>

                <select
                  name="type"
                  value={
                    formData.type
                  }
                  onChange={
                    handleChange
                  }
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

                  <option value="control">
                    Contrôle
                  </option>

                </select>

              </div>

              {/* =================================================
                  PRIORITÉ
              ================================================== */}

              <div className="form-group">

                <label>
                  Priorité
                </label>

                <select
                  name="priority"
                  value={
                    formData.priority
                  }
                  onChange={
                    handleChange
                  }
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

                  <option value="urgente">
                    Urgente
                  </option>

                </select>

              </div>

              {/* =================================================
                  GROUPE RESPONSABLE
              ================================================== */}

              <div className="form-group">

                <label>
                  Groupe responsable
                </label>

                <select
                  name="group_id"
                  value={
                    formData.group_id
                  }
                  onChange={
                    handleChange
                  }
                  required
                >

                  <option value="">
                    Sélectionner un groupe
                  </option>

                  {groups.map(
                    (g) => (

                      <option
                        key={g.id}
                        value={g.id}
                      >
                        {
                          g.name
                        }
                      </option>

                    )
                  )}

                </select>

                <small>
                  ⓘ Le groupe choisi sera affecté à cette première
                  intervention. Les semaines suivantes, le système
                  fera automatiquement tourner les groupes.
                </small>

              </div>

            </>

          ) : (

            /* =================================================
               MODIFICATION
            ================================================== */

            <>

              {/* =================================================
                  ÉQUIPEMENT
              ================================================== */}

              <div className="form-group">

                <label>
                  Équipement
                </label>

                <select
                  name="equipment_id"
                  value={
                    formData.equipment_id
                  }
                  onChange={
                    handleChange
                  }
                  required
                >

                  <option value="">
                    Sélectionner un équipement
                  </option>

                  {equipments.map(
                    (eq) => (

                      <option
                        key={eq.id}
                        value={eq.id}
                      >
                        {
                          eq.name
                        }
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* =================================================
                  RELEVÉ
              ================================================== */}

              <div className="form-group">

                <label>
                  Relevé
                </label>

                <select
                  name="reading_canvas_id"
                  value={
                    formData.reading_canvas_id
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="">

                    {availableCanvases.length ===
                    0
                      ? 'Aucun relevé'
                      : 'Sélectionner un relevé'}

                  </option>

                  {availableCanvases.map(
                    (c) => (

                      <option
                        key={c.id}
                        value={c.id}
                      >
                        {
                          c.template_name
                        }
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* =================================================
                  DATE
              ================================================== */}

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
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>

              {/* =================================================
                  HEURE
              ================================================== */}

              <div className="form-group">

                <label>
                  Heure de début
                </label>

                <input
                  type="time"
                  name="scheduled_time"
                  value={
                    formData.scheduled_time
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>

              {/* =================================================
                  DURÉE
              ================================================== */}

              <div className="form-group">

                <label>
                  Durée (minutes)
                </label>

                <input
                  type="number"
                  name="duration"
                  value={
                    formData.duration
                  }
                  onChange={
                    handleChange
                  }
                  min="1"
                  step="5"
                  required
                />

              </div>

              {/* =================================================
                  TYPE
              ================================================== */}

              <div className="form-group">

                <label>
                  Type de maintenance
                </label>

                <select
                  name="type"
                  value={
                    formData.type
                  }
                  onChange={
                    handleChange
                  }
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

                  <option value="control">
                    Contrôle
                  </option>

                </select>

              </div>

              {/* =================================================
                  PRIORITÉ
              ================================================== */}

              <div className="form-group">

                <label>
                  Priorité
                </label>

                <select
                  name="priority"
                  value={
                    formData.priority
                  }
                  onChange={
                    handleChange
                  }
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

                  <option value="urgente">
                    Urgente
                  </option>

                </select>

              </div>

              {/* =================================================
                  GROUPE
              ================================================== */}

              <div className="form-group">

                <label>
                  Groupe responsable
                </label>

                <select
                  name="group_id"
                  value={
                    formData.group_id
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="">
                    Aucun groupe
                  </option>

                  {groups.map(
                    (g) => (

                      <option
                        key={g.id}
                        value={g.id}
                      >
                        {
                          g.name
                        }
                      </option>

                    )
                  )}

                </select>

              </div>

            </>

          )}

          {/* =================================================
              DESCRIPTION
          ================================================== */}

          <div className="form-group">

            <label>
              Description (optionnel)
            </label>

            <textarea
              name="description"
              value={
                formData.description
              }
              onChange={
                handleChange
              }
              rows="2"
              placeholder="Instructions..."
            />

          </div>

          {/* =================================================
              ACTIONS
          ================================================== */}

          <div className="modal-actions">

            {isEdit && (

              <button
                type="button"
                className="btn-delete"
                onClick={
                  handleDelete
                }
              >

                <Trash2
                  size={16}
                />

                Supprimer

              </button>

            )}

            <div className="modal-actions-right">

              <button
                type="button"
                className="btn-cancel"
                onClick={
                  handleModalClose
                }
              >
                Annuler
              </button>

              <button
                type="submit"
                className="btn-save"
              >

                <Save
                  size={16}
                />

                {isEdit
                  ? 'Enregistrer'
                  : 'Planifier'}

              </button>

            </div>

          </div>

        </form>

      </div>

    </div>
  );
};

export default PlanningHebdomadaire;