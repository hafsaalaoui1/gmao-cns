import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Ticket as TicketIcon,
  Users,
  Wrench,
} from 'lucide-react';

import api from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

import './MyInterventions.css';

/* ============================================================
   HELPERS
============================================================ */

const getToday = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const normalizeText = (value) => {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

/* ============================================================
   COMPONENT
============================================================ */

export default function MyInterventions() {
  const { user } = useAuth();

  /* ==========================================================
     ROLE
  ========================================================== */

  const userRole = String(user?.role || '').toLowerCase();

  const isIntervenant =
    userRole === 'intervenant' ||
    userRole === 'atsep';

  const isResponsable =
    userRole === 'responsable';

  const isAdmin =
    userRole === 'admin';

  /*
   * La prochaine intervention concerne uniquement
   * l'Intervenant.
   */
  const canShowNextIntervention =
    isIntervenant;

  /*
   * Les tickets doivent être chargés pour :
   * - Intervenant
   * - Responsable
   *
   * L'Admin n'utilise pas cette page pour les tickets
   * selon la logique actuelle.
   */
  const canShowTickets =
    isIntervenant ||
    isResponsable;

  /* ==========================================================
     STATES
  ========================================================== */

  const [interventions, setInterventions] =
    useState([]);

  const [tickets, setTickets] =
    useState([]);

  const [nextIntervention, setNextIntervention] =
    useState(null);

  const [selectedDate, setSelectedDate] =
    useState(getToday());

  const [loading, setLoading] =
    useState(true);

  const [loadingNext, setLoadingNext] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('all');

  const [typeFilter, setTypeFilter] =
    useState('all');

  /* ==========================================================
     FORMAT DATE
  ========================================================== */

  const formatDate = useCallback((value) => {
    if (!value) {
      return '-';
    }

    const dateString =
      String(value).substring(0, 10);

    const parts =
      dateString.split('-');

    if (parts.length !== 3) {
      return value;
    }

    const [year, month, day] = parts;

    return `${day}/${month}/${year}`;
  }, []);

  /* ==========================================================
     FORMAT TIME
  ========================================================== */

  const formatTime = useCallback((value) => {
    if (!value) {
      return '-';
    }

    const stringValue =
      String(value);

    if (stringValue.includes('T')) {
      return stringValue.substring(11, 16);
    }

    return stringValue.substring(0, 5);
  }, []);

  /* ==========================================================
     GROUP NAME
  ========================================================== */

  const getGroupName = useCallback((item) => {
    return (
      item?.group?.name ||
      item?.group?.nom ||
      item?.group_name ||
      item?.groupName ||
      (
        item?.group_id
          ? `Groupe ${item.group_id}`
          : '—'
      )
    );
  }, []);

  /* ==========================================================
     STATUS INTERVENTION
  ========================================================== */

  const getDisplayStatus = useCallback((status) => {
    const normalized =
      normalizeText(status);

    const statuses = {
      en_attente: 'En attente',
      en_cours: 'En cours',
      terminee: 'Terminée',
      validee: 'Validée',
      en_retard: 'En retard',
      planifiee: 'Planifiée',
      annulee: 'Annulée',
    };

    return (
      statuses[normalized] ||
      status ||
      '—'
    );
  }, []);

  /* ==========================================================
     STATUS CLASS INTERVENTION
  ========================================================== */

  const getStatusClass = useCallback((status) => {
    const normalized =
      normalizeText(status);

    switch (normalized) {
      case 'en_cours':
        return 'status-en-cours';

      case 'en_attente':
        return 'status-attente-validation';

      case 'terminee':
        return 'status-terminee';

      case 'validee':
        return 'status-validee';

      case 'planifiee':
        return 'status-planifiee';

      case 'en_retard':
        return 'status-retard';

      case 'annulee':
        return 'status-annulee';

      default:
        return 'status-default';
    }
  }, []);

  /* ==========================================================
     STATUS TICKET
  ========================================================== */

  const getTicketDisplayStatus = useCallback((status) => {
    const normalized =
      normalizeText(status);

    const statuses = {
      nouveau: 'Nouveau',
      assigne: 'Assigné',
      en_cours: 'En cours',
      en_attente: 'En attente',
      resolu: 'Résolu',
      cloture: 'Clôturé',
    };

    return (
      statuses[normalized] ||
      status ||
      '—'
    );
  }, []);

  /* ==========================================================
     STATUS CLASS TICKET
  ========================================================== */

  const getTicketStatusClass = useCallback((status) => {
    const normalized =
      normalizeText(status);

    switch (normalized) {
      case 'en_cours':
        return 'status-en-cours';

      case 'en_attente':
        return 'status-attente-validation';

      case 'resolu':
        return 'status-validee';

      case 'cloture':
        return 'status-validee';

      case 'nouveau':
      case 'assigne':
        return 'status-upcoming';

      default:
        return 'status-default';
    }
  }, []);

  /* ==========================================================
     TYPE
  ========================================================== */

  const getType = useCallback((type) => {
    const normalized =
      normalizeText(type);

    if (
      normalized.includes('prevent') ||
      normalized === 'pm'
    ) {
      return 'Préventive';
    }

    if (
      normalized.includes('correct') ||
      normalized === 'cm' ||
      normalized === 'ticket'
    ) {
      return 'Corrective';
    }

    return type || '—';
  }, []);

  /* ==========================================================
     TYPE CLASS
  ========================================================== */

  const getTypeClass = useCallback((type) => {
    const normalized =
      normalizeText(type);

    if (
      normalized.includes('prevent') ||
      normalized === 'pm'
    ) {
      return 'type-preventive';
    }

    if (
      normalized.includes('correct') ||
      normalized === 'cm' ||
      normalized === 'ticket'
    ) {
      return 'type-corrective';
    }

    return 'type-default';
  }, []);

  /* ==========================================================
     PRIORITY
  ========================================================== */

  const getPriority = useCallback((priority) => {
    const normalized =
      normalizeText(priority);

    if (normalized === 'urgente') {
      return 'Urgente';
    }

    if (
      normalized === 'elevee' ||
      normalized === 'haute'
    ) {
      return 'Élevée';
    }

    if (
      normalized === 'normale' ||
      normalized === 'moyenne'
    ) {
      return 'Normale';
    }

    if (
      normalized === 'faible' ||
      normalized === 'basse'
    ) {
      return 'Faible';
    }

    return priority || '—';
  }, []);

  /* ==========================================================
     PRIORITY CLASS
  ========================================================== */

  const getPriorityClass = useCallback((priority) => {
    const normalized =
      normalizeText(priority);

    if (normalized === 'urgente') {
      return 'priority-urgente';
    }

    if (
      normalized === 'elevee' ||
      normalized === 'haute'
    ) {
      return 'priority-elevee';
    }

    if (
      normalized === 'normale' ||
      normalized === 'moyenne'
    ) {
      return 'priority-normale';
    }

    if (
      normalized === 'faible' ||
      normalized === 'basse'
    ) {
      return 'priority-faible';
    }

    return 'priority-default';
  }, []);

  /* ==========================================================
     FETCH INTERVENTIONS
  ========================================================== */

  const fetchInterventions = useCallback(async () => {
    try {
      const response = await api.get(
        '/interventions/daily',
        {
          params: {
            date: selectedDate,
          },
        }
      );

      const rawData =
        response.data?.data ??
        response.data ??
        [];

      const data =
        Array.isArray(rawData)
          ? rawData
          : [];

      const uniqueData =
        Array.from(
          new Map(
            data.map((item) => [
              item.id,
              item,
            ])
          ).values()
        );

      uniqueData.sort((a, b) => {
        const dateA =
          `${a?.scheduled_date || ''} ${
            a?.scheduled_time || ''
          }`;

        const dateB =
          `${b?.scheduled_date || ''} ${
            b?.scheduled_time || ''
          }`;

        return dateA.localeCompare(dateB);
      });

      console.log(
        'Interventions reçues :',
        uniqueData
      );

      setInterventions(uniqueData);
    } catch (error) {
      console.error(
        'Erreur récupération interventions :',
        error
      );

      setInterventions([]);

      toast.error(
        'Impossible de récupérer les interventions.'
      );
    }
  }, [selectedDate]);

  /* ==========================================================
     FETCH TICKETS
     
     Intervenant :
       -> ses tickets selon le backend

     Responsable :
       -> tous les tickets selon le backend
  ========================================================== */

  const fetchTickets = useCallback(async () => {
    if (!canShowTickets) {
      setTickets([]);
      return;
    }

    try {
      const response =
        await api.get('/tickets');

      const rawData =
        response.data?.data ??
        response.data ??
        [];

      const data =
        Array.isArray(rawData)
          ? rawData
          : [];

      /*
       * Suppression des doublons éventuels
       */
      const uniqueTickets =
        Array.from(
          new Map(
            data.map((ticket) => [
              ticket.id,
              ticket,
            ])
          ).values()
        );

      console.log(
        'Utilisateur :',
        user?.name ||
        user?.nom ||
        user?.email
      );

      console.log(
        'Rôle :',
        userRole
      );

      console.log(
        'Tickets reçus :',
        uniqueTickets
      );

      console.log(
        'Nombre de tickets :',
        uniqueTickets.length
      );

      console.log(
        'IDs tickets :',
        uniqueTickets.map(
          (ticket) => ticket.id
        )
      );

      setTickets(uniqueTickets);
    } catch (error) {
      console.error(
        'Erreur récupération tickets :',
        error
      );

      setTickets([]);
    }
  }, [
    canShowTickets,
    user,
    userRole,
  ]);

  /* ==========================================================
     FETCH NEXT INTERVENTION
  ========================================================== */

  const fetchNextIntervention =
    useCallback(async () => {
      if (!canShowNextIntervention) {
        setNextIntervention(null);
        return;
      }

      try {
        setLoadingNext(true);

        const response =
          await api.get(
            '/interventions/next'
          );

        const data =
          response.data?.data ??
          response.data ??
          null;

        setNextIntervention(data);
      } catch (error) {
        console.error(
          'Erreur récupération prochaine intervention :',
          error
        );

        setNextIntervention(null);
      } finally {
        setLoadingNext(false);
      }
    }, [canShowNextIntervention]);

  /* ==========================================================
     LOAD
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);

      const requests = [
        fetchInterventions(),
      ];

      /*
       * Tickets :
       * Intervenant + Responsable
       */
      if (canShowTickets) {
        requests.push(
          fetchTickets()
        );
      }

      /*
       * Prochaine intervention :
       * uniquement Intervenant
       */
      if (canShowNextIntervention) {
        requests.push(
          fetchNextIntervention()
        );
      }

      await Promise.all(requests);

      if (mounted) {
        setLoading(false);
      }
    };

    loadData();

    /*
     * Actualisation automatique toutes les 30 secondes.
     */
    const interval =
      setInterval(() => {
        fetchInterventions();

        if (canShowTickets) {
          fetchTickets();
        }

        if (canShowNextIntervention) {
          fetchNextIntervention();
        }
      }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [
    selectedDate,
    canShowTickets,
    canShowNextIntervention,
    fetchInterventions,
    fetchTickets,
    fetchNextIntervention,
  ]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = async () => {
    try {
      setLoading(true);

      const requests = [
        fetchInterventions(),
      ];

      if (canShowTickets) {
        requests.push(
          fetchTickets()
        );
      }

      if (canShowNextIntervention) {
        requests.push(
          fetchNextIntervention()
        );
      }

      await Promise.all(requests);

      toast.success(
        'Données actualisées.'
      );
    } catch (error) {
      console.error(
        'Erreur actualisation :',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     RESET FILTERS
  ========================================================== */

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  /* ==========================================================
     COMBINER INTERVENTIONS + TICKETS
  ========================================================== */

  const allItems = useMemo(() => {
    /*
     * Interventions préventives / normales
     */
    const interventionItems =
      interventions.map(
        (intervention) => ({
          ...intervention,
          isTicket: false,
        })
      );

    /*
     * Tickets = interventions correctives
     */
    const ticketItems =
      tickets.map((ticket) => ({
        ...ticket,

        isTicket: true,

        /*
         * Ticket = Corrective
         */
        type: 'corrective',

        interventionType:
          'corrective',

        /*
         * Informations utiles pour
         * l'affichage et la recherche
         */
        source: 'ticket',

        display_title:
          `Ticket #${ticket.id}`,
      }));

    return [
      ...interventionItems,
      ...ticketItems,
    ];
  }, [
    interventions,
    tickets,
  ]);

  /* ==========================================================
     FILTERS
  ========================================================== */

  const filteredItems = useMemo(() => {
    const search =
      normalizeText(searchTerm);

    return allItems.filter(
      (item) => {
        /* ====================================================
           STATUS
        ==================================================== */

        const itemStatus =
          normalizeText(
            item?.status
          );

        const matchesStatus =
          statusFilter === 'all' ||
          itemStatus ===
            normalizeText(
              statusFilter
            );

        if (!matchesStatus) {
          return false;
        }

        /* ====================================================
           TYPE
        ==================================================== */

        const itemType =
          normalizeText(
            item?.type ||
            item?.interventionType ||
            ''
          );

        let matchesType = true;

        /*
         * Préventive :
         * uniquement les vraies interventions.
         */
        if (
          typeFilter ===
          'preventive'
        ) {
          matchesType =
            !item.isTicket &&
            (
              itemType.includes(
                'prevent'
              ) ||
              itemType === 'pm'
            );
        }

        /*
         * Corrective :
         * interventions correctives
         * + tickets.
         */
        if (
          typeFilter ===
          'corrective'
        ) {
          matchesType =
            item.isTicket ||
            itemType.includes(
              'correct'
            ) ||
            itemType === 'cm';
        }

        if (!matchesType) {
          return false;
        }

        /* ====================================================
           SEARCH
        ==================================================== */

        if (!search) {
          return true;
        }

        const equipmentName =
          item?.equipment?.name ||
          item?.equipment?.designation ||
          item?.equipment_name ||
          '';

        const equipmentCode =
          item?.equipment?.code ||
          item?.equipment?.reference ||
          item?.equipment_code ||
          '';

        const groupName =
          item?.group?.name ||
          item?.group_name ||
          '';

        const description =
          item?.description ||
          item?.problem_description ||
          item?.diagnostic ||
          item?.observations ||
          '';

        const declaredBy =
          item?.declaredBy?.name ||
          item?.declaredBy?.nom ||
          item?.declared_by_name ||
          '';

        const assignedUser =
          item?.assignedUser?.name ||
          item?.assignedUser?.nom ||
          '';

        const ticketNumber =
          item.isTicket
            ? `ticket ${item.id}`
            : '';

        const searchableText =
          normalizeText(
            [
              equipmentName,
              equipmentCode,
              groupName,
              description,
              declaredBy,
              assignedUser,
              ticketNumber,
              item?.status,
              item?.priority,
              item?.type,
              item?.display_title,
            ].join(' ')
          );

        return searchableText.includes(
          search
        );
      }
    );
  }, [
    allItems,
    searchTerm,
    statusFilter,
    typeFilter,
  ]);

  /* ==========================================================
     STATISTICS
     
     Les statistiques restent basées
     uniquement sur les interventions.
  ========================================================== */

  const statistics = useMemo(() => {
    const total =
      interventions.length;

    const enCours =
      interventions.filter(
        (item) =>
          normalizeText(
            item?.status
          ) === 'en_cours'
      ).length;

    const terminees =
      interventions.filter(
        (item) =>
          normalizeText(
            item?.status
          ) === 'terminee'
      ).length;

    const enRetard =
      interventions.filter(
        (item) =>
          normalizeText(
            item?.status
          ) === 'en_retard'
      ).length;

    return {
      total,
      enCours,
      terminees,
      enRetard,
    };
  }, [interventions]);

  /* ==========================================================
     TICKET EQUIPMENT
  ========================================================== */

  const getTicketEquipment =
    useCallback((ticket) => {
      return (
        ticket?.equipment?.name ||
        ticket?.equipment?.designation ||
        ticket?.equipment_name ||
        'Équipement inconnu'
      );
    }, []);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="my-interventions">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="my-interventions-header">

        <div className="page-title-section">

          <div className="page-title-icon">
            <Wrench size={25} />
          </div>

          <div>

            <h1>
              {isIntervenant
                ? 'Mes interventions'
                : 'Interventions'}
            </h1>

            <p>
              {isIntervenant
                ? 'Consultez et gérez vos interventions de maintenance.'
                : 'Consultez et gérez les interventions de maintenance.'}
            </p>

          </div>

        </div>

        <button
          type="button"
          className="btn-refresh"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? 'spin'
                : ''
            }
          />

          Actualiser
        </button>

      </div>

      {/* ======================================================
          PROCHAINE INTERVENTION
      ====================================================== */}

      {canShowNextIntervention && (
        <div
          className={`next-intervention-card ${
            nextIntervention
              ? getStatusClass(
                  nextIntervention.status
                )
              : 'status-upcoming'
          }`}
        >

          <div className="next-intervention-header">

            <div className="next-intervention-title">

              <div className="next-intervention-icon">
                <CalendarDays size={22} />
              </div>

              <div>

                <span className="next-label">
                  Prochaine intervention
                </span>

                <h2>
                  {loadingNext
                    ? 'Chargement...'
                    : nextIntervention
                    ? (
                        nextIntervention
                          ?.equipment
                          ?.name ||
                        nextIntervention
                          ?.equipment
                          ?.designation ||
                        'Équipement'
                      )
                    : 'Aucune prochaine intervention'}
                </h2>

              </div>

            </div>

            {nextIntervention && (
              <span
                className={`next-status-badge ${
                  getStatusClass(
                    nextIntervention.status
                  )
                }`}
              >
                {getDisplayStatus(
                  nextIntervention.status
                )}
              </span>
            )}

          </div>

          {nextIntervention && (
            <>
              <div className="next-intervention-info">

                <div className="next-info-item">

                  <CalendarDays size={18} />

                  <div>

                    <span>
                      Date
                    </span>

                    <strong>
                      {formatDate(
                        nextIntervention.scheduled_date
                      )}
                    </strong>

                  </div>

                </div>

                <div className="next-info-item">

                  <Clock size={18} />

                  <div>

                    <span>
                      Heure
                    </span>

                    <strong>
                      {formatTime(
                        nextIntervention.scheduled_time
                      )}
                    </strong>

                  </div>

                </div>

                <div className="next-info-item">

                  <Users size={18} />

                  <div>

                    <span>
                      Groupe
                    </span>

                    <strong>
                      {getGroupName(
                        nextIntervention
                      )}
                    </strong>

                  </div>

                </div>

              </div>

              <div className="next-intervention-actions">

                <Link
                  to={`/interventions/${nextIntervention.id}`}
                  className="btn-detail"
                >
                  Voir les détails
                  <ChevronRight size={16} />
                </Link>

                {normalizeText(
                  nextIntervention.status
                ) === 'en_attente' && (
                  <span className="next-locked-message">
                    <Clock size={15} />
                    Intervention en attente
                  </span>
                )}

                {normalizeText(
                  nextIntervention.status
                ) === 'en_cours' && (
                  <span className="next-validation-message">
                    <AlertCircle size={15} />
                    Intervention en cours
                  </span>
                )}

              </div>
            </>
          )}

        </div>
      )}

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="interventions-summary">

        <div className="summary-card">

          <div className="summary-icon">
            <Wrench size={20} />
          </div>

          <div>

            <span className="summary-label">
              Total
            </span>

            <strong className="summary-value">
              {statistics.total}
            </strong>

          </div>

        </div>

        <div className="summary-card">

          <div className="summary-icon">
            <Clock size={20} />
          </div>

          <div>

            <span className="summary-label">
              En cours
            </span>

            <strong className="summary-value">
              {statistics.enCours}
            </strong>

          </div>

        </div>

        <div className="summary-card">

          <div className="summary-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>

            <span className="summary-label">
              Terminées
            </span>

            <strong className="summary-value">
              {statistics.terminees}
            </strong>

          </div>

        </div>

        <div className="summary-card summary-card-danger">

          <div className="summary-icon">
            <AlertCircle size={20} />
          </div>

          <div>

            <span className="summary-label">
              En retard
            </span>

            <strong className="summary-value">
              {statistics.enRetard}
            </strong>

          </div>

        </div>

      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <div className="filters-card">

        <div className="filters-header">

          <div className="filters-title">
            <Filter size={16} />
            Filtres
          </div>

          <button
            type="button"
            className="reset-filters"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>

        </div>

        <div className="filters-grid">

          {/* DATE */}

          <div className="filter-field">

            <label htmlFor="selectedDate">
              Date
            </label>

            <input
              id="selectedDate"
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(
                  event.target.value
                )
              }
            />

          </div>

          {/* SEARCH */}

          <div className="filter-field">

            <label htmlFor="searchTerm">
              Recherche
            </label>

            <div className="input-with-icon">

              <Search size={16} />

              <input
                id="searchTerm"
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Équipement, ticket, description..."
              />

            </div>

          </div>

          {/* STATUS */}

          <div className="filter-field">

            <label htmlFor="statusFilter">
              Statut
            </label>

            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >

              <option value="all">
                Tous les statuts
              </option>

              <option value="en_attente">
                En attente
              </option>

              <option value="en_cours">
                En cours
              </option>

              <option value="terminee">
                Terminée
              </option>

              <option value="validee">
                Validée
              </option>

              <option value="en_retard">
                En retard
              </option>

              {/* Statuts tickets */}

              <option value="nouveau">
                Nouveau
              </option>

              <option value="assigne">
                Assigné
              </option>

              <option value="resolu">
                Résolu
              </option>

              <option value="cloture">
                Clôturé
              </option>

            </select>

          </div>

          {/* TYPE */}

          <div className="filter-field">

            <label htmlFor="typeFilter">
              Type
            </label>

            <select
              id="typeFilter"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
            >

              <option value="all">
                Tous les types
              </option>

              <option value="preventive">
                Préventive
              </option>

              <option value="corrective">
                Corrective
              </option>

            </select>

          </div>

        </div>

      </div>

      {/* ======================================================
          DAY INFO
      ====================================================== */}

      <div className="interventions-day-info">

        <div className="day-info-left">

          <div className="day-info-icon">
            <CalendarDays size={19} />
          </div>

          <div>

            <strong>
              {isIntervenant
                ? 'Mes interventions'
                : 'Interventions'}
              {' du '}
              {formatDate(selectedDate)}
            </strong>

            <span>
              {filteredItems.length}{' '}
              élément
              {filteredItems.length !== 1
                ? 's'
                : ''}{' '}
              affiché
              {filteredItems.length !== 1
                ? 's'
                : ''}
            </span>

          </div>

        </div>

        <span className="filter-result">

          {filteredItems.length} résultat
          {filteredItems.length !== 1
            ? 's'
            : ''}

        </span>

      </div>

      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading ? (

        <div className="loading-state">

          <RefreshCw
            size={30}
            className="spin"
          />

          <h3>
            Chargement des interventions...
          </h3>

          <p>
            Veuillez patienter.
          </p>

        </div>

      ) : filteredItems.length === 0 ? (

        /* ====================================================
           EMPTY
        ==================================================== */

        <div className="empty-state">

          <div className="empty-icon">
            <ClipboardListIconFallback />
          </div>

          <h3>
            Aucun élément trouvé
          </h3>

          <p>
            Aucune intervention ou aucun ticket
            ne correspond aux filtres sélectionnés.
          </p>

          <button
            type="button"
            className="empty-reset-btn"
            onClick={resetFilters}
          >
            Réinitialiser les filtres
          </button>

        </div>

      ) : (

        /* ====================================================
           TABLE UNIQUE
           
           INTERVENTIONS + TICKETS
        ==================================================== */

        <div className="interventions-table-container">

          <table className="interventions-table">

            <thead>

              <tr>

                <th>
                  Équipement
                </th>

                <th>
                  Type
                </th>

                <th>
                  Date
                </th>

                <th>
                  Heure
                </th>

                <th>
                  Groupe
                </th>

                <th>
                  Statut
                </th>

                <th>
                  Priorité
                </th>

                <th>
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredItems.map(
                (item) => {

                  /* ==================================================
                     TICKET CORRECTIF
                  ================================================== */

                  if (item.isTicket) {

                    return (
                      <tr
                        key={`ticket-${item.id}`}
                      >

                        {/* ÉQUIPEMENT */}

                        <td>

                          <div className="equipment-cell">

                            <div className="equipment-icon">
                              <TicketIcon size={17} />
                            </div>

                            <div className="equipment-info">

                              <strong>
                                {getTicketEquipment(
                                  item
                                )}
                              </strong>

                              <span>
                                Ticket #{item.id}
                              </span>

                            </div>

                          </div>

                        </td>

                        {/* TYPE */}

                        <td>

                          <span
                            className={`type-badge ${getTypeClass(
                              'corrective'
                            )}`}
                          >
                            Corrective
                          </span>

                        </td>

                        {/* DATE */}

                        <td>

                          <span className="table-date">

                            {item?.created_at
                              ? formatDate(
                                  item.created_at
                                )
                              : item?.declared_date
                              ? formatDate(
                                  item.declared_date
                                )
                              : '-'}

                          </span>

                        </td>

                        {/* HEURE */}

                        <td>

                          <span className="table-time">

                            {item?.created_at
                              ? formatTime(
                                  item.created_at
                                )
                              : item?.declared_date
                              ? formatTime(
                                  item.declared_date
                                )
                              : '-'}

                          </span>

                        </td>

                        {/* GROUPE */}

                        <td>

                          <span className="group-badge">
                            {getGroupName(item)}
                          </span>

                        </td>

                        {/* STATUT */}

                        <td>

                          <span
                            className={`status-badge ${getTicketStatusClass(
                              item?.status
                            )}`}
                          >

                            <AlertCircle size={13} />

                            {getTicketDisplayStatus(
                              item?.status
                            )}

                          </span>

                        </td>

                        {/* PRIORITÉ */}

                        <td>

                          <span
                            className={`priority-badge ${getPriorityClass(
                              item?.priority
                            )}`}
                          >

                            {getPriority(
                              item?.priority
                            )}

                          </span>

                        </td>

                        {/* ACTION */}

                        <td>

                          <div className="table-actions">

                            <Link
                              to={`/tickets/${item.id}`}
                              className="btn-detail"
                            >

                              Voir

                              <ChevronRight
                                size={14}
                              />

                            </Link>

                          </div>

                        </td>

                      </tr>
                    );
                  }

                  /* ==================================================
                     INTERVENTION NORMALE
                  ================================================== */

                  const equipmentName =
                    item?.equipment?.name ||
                    item?.equipment?.designation ||
                    item?.equipment_name ||
                    'Équipement inconnu';

                  const equipmentCode =
                    item?.equipment?.code ||
                    item?.equipment?.reference ||
                    item?.equipment_code ||
                    '';

                  const interventionType =
                    item?.type ||
                    item?.interventionType ||
                    '';

                  return (
                    <tr
                      key={`intervention-${item.id}`}
                    >

                      {/* ÉQUIPEMENT */}

                      <td>

                        <div className="equipment-cell">

                          <div className="equipment-icon">
                            <Wrench size={17} />
                          </div>

                          <div className="equipment-info">

                            <strong>
                              {equipmentName}
                            </strong>

                            {equipmentCode && (
                              <span>
                                {equipmentCode}
                              </span>
                            )}

                          </div>

                        </div>

                      </td>

                      {/* TYPE */}

                      <td>

                        <span
                          className={`type-badge ${getTypeClass(
                            interventionType
                          )}`}
                        >

                          {getType(
                            interventionType
                          )}

                        </span>

                      </td>

                      {/* DATE */}

                      <td>

                        <span className="table-date">

                          {formatDate(
                            item?.scheduled_date
                          )}

                        </span>

                      </td>

                      {/* HEURE */}

                      <td>

                        <span className="table-time">

                          {formatTime(
                            item?.scheduled_time
                          )}

                        </span>

                      </td>

                      {/* GROUPE */}

                      <td>

                        <span className="group-badge">

                          {getGroupName(item)}

                        </span>

                      </td>

                      {/* STATUT */}

                      <td>

                        <span
                          className={`status-badge ${getStatusClass(
                            item?.status
                          )}`}
                        >

                          {getDisplayStatus(
                            item?.status
                          )}

                        </span>

                      </td>

                      {/* PRIORITÉ */}

                      <td>

                        <span
                          className={`priority-badge ${getPriorityClass(
                            item?.priority
                          )}`}
                        >

                          {getPriority(
                            item?.priority
                          )}

                        </span>

                      </td>

                      {/* ACTION */}

                      <td>

                        <div className="table-actions">

                          <Link
                            to={`/interventions/${item.id}`}
                            className="btn-detail"
                          >

                            Voir

                            <ChevronRight
                              size={14}
                            />

                          </Link>

                        </div>

                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}

/* ============================================================
   FALLBACK ICON
============================================================ */

function ClipboardListIconFallback() {
  return (
    <Wrench size={30} />
  );
}