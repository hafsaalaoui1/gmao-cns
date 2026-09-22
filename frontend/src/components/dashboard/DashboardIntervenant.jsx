import React, {
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

import {
  Calendar,
  Clock,
  CheckCircle,
  RefreshCw,
  ArrowRight,
  Users,
  Wrench,
  AlertTriangle,
  ChevronRight,
  Activity,
  Layers,
  Lock,
  PlayCircle
} from 'lucide-react';

import './DashboardIntervenant.css';

/* ==========================================================================
   CONSTANTES ET CONFIGURATION DES STATUTS
   ========================================================================== */

const STATUS_MAP = {
  /* -------------------- PRÉVENTIF -------------------- */

  a_venir: {
    label: 'À venir',
    class: 'status-upcoming'
  },

  active: {
    label: 'Active',
    class: 'status-active'
  },

  en_attente: {
    label: 'Planifiée',
    class: 'status-planned'
  },

  planifiee: {
    label: 'Planifiée',
    class: 'status-planned'
  },

  en_cours: {
    label: 'En cours',
    class: 'status-progress'
  },

  terminee: {
    label: 'Terminée',
    class: 'status-completed'
  },

  en_attente_validation: {
    label: 'En validation',
    class: 'status-validation'
  },

  validee: {
    label: 'Validée',
    class: 'status-validated'
  },

  en_retard: {
    label: 'En retard',
    class: 'status-late'
  },

  annulee: {
    label: 'Annulée',
    class: 'status-cancelled'
  },

  /* -------------------- CORRECTIF / TICKETS -------------------- */

  nouveau: {
    label: 'Nouveau',
    class: 'status-upcoming'
  },

  assigne: {
    label: 'Assigné',
    class: 'status-planned'
  },

  resolu: {
    label: 'Résolu',
    class: 'status-completed'
  },

  cloture: {
    label: 'Clôturé',
    class: 'status-completed'
  }
};

/* ==========================================================================
   FONCTIONS UTILITAIRES
   ========================================================================== */

const normalizeStatus = (status) => {
  return String(status || '')
    .trim()
    .toLowerCase();
};

const getStatusBadge = (status) => {
  const key = normalizeStatus(status);

  return (
    STATUS_MAP[key] || {
      label: status || 'Inconnu',
      class: 'status-default'
    }
  );
};

/* ==========================================================================
   EXTRACTION ROBUSTE DES TABLEAUX DEPUIS LES RÉPONSES API
   ========================================================================== */

const extractArray = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.tickets)) {
    return payload.tickets;
  }

  if (Array.isArray(payload?.interventions)) {
    return payload.interventions;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
};

/* ==========================================================================
   FORMATAGE
   ========================================================================== */

const formatTime = (time) => {
  if (!time) return '--:--';

  return String(time).substring(0, 5);
};

const formatDate = (date) => {
  if (!date) return '--/--/----';

  const parts = String(date)
    .substring(0, 10)
    .split('-');

  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : date;
};

const getTodayDate = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    now.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getScheduledDateTime = (item) => {
  if (!item) return null;

  const date =
    item.scheduled_date ||
    item.date;

  const time =
    item.scheduled_time ||
    item.time ||
    '00:00:00';

  if (!date) return null;

  const parsed = new Date(
    `${String(date).substring(0, 10)}T${String(time).substring(0, 8)}`
  );

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
};

/* ==========================================================================
   ÉTAT D'AFFICHAGE
   ========================================================================== */

const getDisplayState = (item) => {
  if (!item) return 'default';

  /*
   * Pour les tickets correctifs,
   * on conserve directement leur statut réel.
   */
  if (item.isTicket) {
    return normalizeStatus(
      item.status ||
      item.display_state ||
      'default'
    );
  }

  if (item.display_state) {
    return normalizeStatus(
      item.display_state
    );
  }

  const status = normalizeStatus(
    item.status
  );

  if (
    [
      'validee',
      'en_cours',
      'annulee'
    ].includes(status)
  ) {
    return status;
  }

  if (status === 'terminee') {
    return 'en_attente_validation';
  }

  if (
    status === 'en_attente' ||
    status === 'planifiee'
  ) {
    const scheduled =
      getScheduledDateTime(item);

    return scheduled &&
      scheduled.getTime() > Date.now()
      ? 'a_venir'
      : 'active';
  }

  if (status === 'en_retard') {
    return 'active';
  }

  return status || 'default';
};

/* ==========================================================================
   NORMALISATION DES TICKETS
   ========================================================================== */

const normalizeTicket = (
  ticket,
  currentGroupName
) => {
  const originalId = ticket.id;

  return {
    ...ticket,

    /*
     * On conserve l'ID réel du ticket
     * dans original_id.
     */
    id: `ticket-${originalId}`,

    original_id: originalId,

    isTicket: true,

    type: 'Correctif',

    interventionType: 'corrective',

    source: 'ticket',

    display_title:
      `Ticket #${originalId}`,

    equipment_name:
      ticket.equipment?.name ||
      ticket.equipment_name ||
      'Équipement',

    group_name:
      ticket.group?.name ||
      ticket.group_name ||
      currentGroupName ||
      'Non assigné',

    /*
     * Pour l'affichage dans le tableau,
     * on garde la date de déclaration.
     */
    scheduled_date:
      ticket.declared_date ||
      ticket.created_at,

    scheduled_time:
      ticket.declared_date
        ? String(
            ticket.declared_date
          ).substring(11, 19)
        : String(
            ticket.created_at || ''
          ).substring(11, 19),

    display_state:
      ticket.status
  };
};

/* ==========================================================================
   HOOK PERSONNALISÉ : DASHBOARD INTERVENANT
   ========================================================================== */

const useIntervenantDashboard = () => {
  const [stats, setStats] = useState({
    today: 0,
    upcoming: 0,
    completed: 0
  });

  const [
    todayInterventions,
    setTodayInterventions
  ] = useState([]);

  const [
    upcomingInterventions,
    setUpcomingInterventions
  ] = useState([]);

  const [groupName, setGroupName] =
    useState('Non assigné');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [, setCurrentTime] =
    useState(Date.now());

  /* ========================================================================
     RÉCUPÉRATION DU DASHBOARD
     ======================================================================== */

  const fetchDashboard =
    useCallback(async () => {
      try {
        setRefreshing(true);

        /*
         * On récupère :
         *
         * 1. utilisateur connecté
         * 2. statistiques
         * 3. interventions préventives du jour
         * 4. prochaine intervention
         * 5. tickets correctifs
         */
        const [
          userRes,
          statsRes,
          todayRes,
          nextRes,
          ticketsRes
        ] = await Promise.all([
          api.get('/user'),
          api.get('/dashboard/stats'),
          api.get(
            '/dashboard/today-interventions'
          ),
          api.get('/interventions/next'),
          api.get('/tickets')
        ]);

        /* ================================================================
           UTILISATEUR ET GROUPE
           ================================================================ */

        const currentUser =
          userRes.data?.user ||
          userRes.data?.data ||
          userRes.data ||
          {};

        const fetchedGroup =
          currentUser.group?.name ||
          currentUser.group_name ||
          userRes.data?.group?.name ||
          userRes.data?.group_name ||
          userRes.data?.data?.group?.name ||
          userRes.data?.data?.group_name ||
          'Non assigné';

        /*
         * ID de l'utilisateur connecté.
         */
        const currentUserId =
          currentUser.id ??
          userRes.data?.user?.id ??
          userRes.data?.id ??
          userRes.data?.data?.id ??
          null;

        /*
         * ID du groupe de l'utilisateur connecté.
         */
        const currentGroupId =
          currentUser.group_id ??
          currentUser.group?.id ??
          userRes.data?.group_id ??
          userRes.data?.group?.id ??
          userRes.data?.data?.group_id ??
          userRes.data?.data?.group?.id ??
          null;

        setGroupName(
          fetchedGroup
        );

        localStorage.setItem(
          'user_group_name',
          fetchedGroup
        );

        /* ================================================================
           STATISTIQUES
           ================================================================ */

        const statsData =
          statsRes.data?.data ||
          statsRes.data ||
          {};

        setStats({
          today:
            Number(
              statsData.my_interventions_today
            ) || 0,

          upcoming:
            Number(
              statsData.my_interventions_upcoming
            ) || 0,

          completed:
            Number(
              statsData.my_interventions_completed
            ) || 0
        });

        /* ================================================================
           INTERVENTIONS PRÉVENTIVES DU JOUR
           ================================================================ */

        const preventiveToday =
          extractArray(todayRes);

        /* ================================================================
           TICKETS CORRECTIFS
           ================================================================ */

        const allTickets =
          extractArray(ticketsRes);

        /*
         * Les tickets suivants doivent apparaître
         * dans "Interventions du jour" :
         *
         * - assigne
         * - en_cours
         * - en_attente
         *
         * IMPORTANT :
         *
         * On ne vérifie PAS la date de création.
         *
         * Ainsi, un ticket créé hier mais toujours
         * en_cours aujourd'hui reste visible.
         */
        const activeTicketStatuses = [
          'assigne',
          'en_cours',
          'en_attente'
        ];

        const correctiveToday =
          allTickets
            .filter((ticket) => {

              /*
               * ==========================================================
               * ID DE L'INTERVENANT AFFECTÉ
               * ==========================================================
               *
               * Laravel peut renvoyer :
               *
               * assigned_to
               *
               * ou :
               *
               * assignedTo.id
               *
               * ou :
               *
               * assigned_to_id
               */

              const ticketAssignedUserId =
                ticket.assigned_to ??
                ticket.assigned_to_id ??
                ticket.assignedTo?.id ??
                ticket.assigned_to_user?.id ??
                null;

              /*
               * ==========================================================
               * ID DU GROUPE AFFECTÉ
               * ==========================================================
               */

              const ticketGroupId =
                ticket.group_id ??
                ticket.group?.id ??
                null;

              /*
               * ==========================================================
               * TICKET ASSIGNÉ DIRECTEMENT À L'INTERVENANT
               * ==========================================================
               */

              const assignedToMe =
                currentUserId !== null &&
                currentUserId !== undefined &&
                ticketAssignedUserId !== null &&
                ticketAssignedUserId !== undefined &&
                Number(ticketAssignedUserId) ===
                  Number(currentUserId);

              /*
               * ==========================================================
               * TICKET ASSIGNÉ AU GROUPE DE L'INTERVENANT
               * ==========================================================
               */

              const assignedToMyGroup =
                currentGroupId !== null &&
                currentGroupId !== undefined &&
                ticketGroupId !== null &&
                ticketGroupId !== undefined &&
                Number(ticketGroupId) ===
                  Number(currentGroupId);

              /*
               * Un ticket est visible si :
               *
               * - il est affecté directement à l'intervenant
               *
               * OU
               *
               * - il appartient à son groupe.
               */
              return (
                assignedToMe ||
                assignedToMyGroup
              );
            })

            /*
             * ============================================================
             * FILTRE SUR LE STATUT
             * ============================================================
             */
            .filter((ticket) => {

              const ticketStatus =
                normalizeStatus(
                  ticket.status
                );

              return activeTicketStatuses.includes(
                ticketStatus
              );
            })

            /*
             * ============================================================
             * NORMALISATION
             * ============================================================
             */
            .map((ticket) =>
              normalizeTicket(
                ticket,
                fetchedGroup
              )
            );

        /* ================================================================
           FUSION PRÉVENTIF + CORRECTIF
           ================================================================ */

        setTodayInterventions([
          ...preventiveToday,
          ...correctiveToday
        ]);

        /* ================================================================
           PROCHAINE INTERVENTION
           ================================================================ */

        const nextData =
          nextRes.data?.data ||
          nextRes.data;

        setUpcomingInterventions(
          Array.isArray(nextData)
            ? nextData
            : nextData
              ? [nextData]
              : []
        );

      } catch (error) {

        console.error(
          'Erreur tableau de bord :',
          error
        );

        setGroupName(
          localStorage.getItem(
            'user_group_name'
          ) ||
          'Non assigné'
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  /* ========================================================================
     AUTO REFRESH
     ======================================================================== */

  useEffect(() => {
    fetchDashboard();

    const interval =
      setInterval(
        fetchDashboard,
        30000
      );

    return () =>
      clearInterval(interval);
  }, [fetchDashboard]);

  /* ========================================================================
     HORLOGE
     ======================================================================== */

  useEffect(() => {
    const timer =
      setInterval(
        () =>
          setCurrentTime(
            Date.now()
          ),
        1000
      );

    return () =>
      clearInterval(timer);
  }, []);

  /* ========================================================================
     PROCHAINES INTERVENTIONS
     ======================================================================== */

  const processedUpcoming =
    useMemo(() => {
      return upcomingInterventions.map(
        (item) => ({
          ...item,
          display_state:
            getDisplayState(item)
        })
      );
    }, [
      upcomingInterventions
    ]);

  return {
    stats,

    todayInterventions,

    upcomingInterventions:
      processedUpcoming,

    groupName,

    loading,

    refreshing,

    fetchDashboard
  };
};

/* ==========================================================================
   HEADER
   ========================================================================== */

const DashboardHeader = ({
  userName,
  groupName,
  refreshing,
  onRefresh
}) => (
  <header className="pro-header">

    <div className="pro-header-left">

      <div className="pro-title-group">

        <h1>
          Bonjour,{' '}
          {userName || 'Intervenant'}
        </h1>

        <span className="pro-pill-badge">
          <Activity size={12} />
          Espace Intervenant
        </span>

      </div>

      <p className="pro-subtitle">
        Suivez l’état de vos interventions
        et activités de maintenance du jour.
      </p>

    </div>

    <div className="pro-header-right">

      <div
        className={`pro-group-chip ${
          groupName === 'Non assigné'
            ? 'warning'
            : ''
        }`}
      >
        <Users size={14} />

        <span>
          {groupName}
        </span>
      </div>

      <button
        type="button"
        className="pro-btn-secondary"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RefreshCw
          size={13}
          className={
            refreshing
              ? 'spin-icon'
              : ''
          }
        />

        <span>
          {refreshing
            ? 'Actualisation...'
            : 'Actualiser'}
        </span>
      </button>

    </div>
  </header>
);

/* ==========================================================================
   STATISTIQUES
   ========================================================================== */

const StatsGrid = ({
  stats
}) => {

  const cards = [
    {
      label: "Aujourd'hui",
      value: stats.today,
      icon: Calendar,
      color: 'blue',
      subtext:
        'Planifiées ce jour'
    },

    {
      label: 'À venir',
      value: stats.upcoming,
      icon: Clock,
      color: 'amber',
      subtext:
        'En attente d’exécution'
    },

    {
      label: 'Réalisées',
      value: stats.completed,
      icon: CheckCircle,
      color: 'emerald',
      subtext:
        'Terminées avec succès'
    }
  ];

  return (
    <div className="pro-stats-grid">

      {cards.map(
        (card, i) => {

          const Icon =
            card.icon;

          return (
            <div
              key={i}
              className={`pro-stat-card theme-${card.color}`}
            >

              <div className="pro-stat-head">

                <span className="pro-stat-label">
                  {card.label}
                </span>

                <div className="pro-stat-icon">
                  <Icon size={16} />
                </div>

              </div>

              <div className="pro-stat-body">

                <div className="pro-stat-value">
                  {card.value}
                </div>

                <div className="pro-stat-sub">
                  {card.subtext}
                </div>

              </div>

            </div>
          );
        }
      )}

    </div>
  );
};

/* ==========================================================================
   CARTE PROCHAINE INTERVENTION
   ========================================================================== */

const UpcomingInterventionCard = ({
  intervention
}) => {

  if (!intervention) {
    return (
      <div className="upcoming-empty">

        <div className="upcoming-empty-icon">
          <Calendar size={22} />
        </div>

        <div className="upcoming-empty-text">

          <h3>
            Aucune prochaine intervention
          </h3>

          <p>
            Votre planning ne contient pas
            d'intervention à venir pour le
            moment.
          </p>

        </div>

        <Link
          to="/my-interventions"
          className="upcoming-link"
        >
          Voir le planning
          <ArrowRight size={14} />
        </Link>

      </div>
    );
  }

  const displayState =
    getDisplayState(
      intervention
    );

  const status =
    getStatusBadge(
      displayState
    );

  const scheduledDateTime =
    getScheduledDateTime(
      intervention
    );

  const equipmentName =
    intervention.equipment?.name ||
    intervention.equipment_name ||
    intervention.equipment ||
    'Équipement principal';

  const group =
    intervention.group?.name ||
    intervention.group_name ||
    intervention.group ||
    'Non assigné';

  return (
    <section
      className={`upcoming-card ${status.class}`}
    >

      <div className="upcoming-header">

        <div className="upcoming-title">

          <div className="upcoming-icon">
            <Wrench size={18} />
          </div>

          <div>

            <span className="upcoming-overline">
              PROCHAINE INTERVENTION
            </span>

            <h2>
              {equipmentName}
            </h2>

          </div>

        </div>

        <span
          className={`status-badge ${status.class}`}
        >
          <span className="dot" />
          {status.label}
        </span>

      </div>

      <div className="upcoming-content">

        <div className="upcoming-info-grid">

          <div className="upcoming-info">

            <Calendar size={15} />

            <div>

              <span>
                Date
              </span>

              <strong>
                {formatDate(
                  intervention.scheduled_date ||
                  intervention.date
                )}
              </strong>

            </div>

          </div>

          <div className="upcoming-info">

            <Clock size={15} />

            <div>

              <span>
                Horaire
              </span>

              <strong>
                {formatTime(
                  intervention.scheduled_time ||
                  intervention.time
                )}
              </strong>

            </div>

          </div>

          <div className="upcoming-info">

            <Users size={15} />

            <div>

              <span>
                Groupe
              </span>

              <strong>
                {group}
              </strong>

            </div>

          </div>

          <div className="upcoming-info">

            <Layers size={15} />

            <div>

              <span>
                Type
              </span>

              <strong>
                {intervention.type ||
                  'Préventif'}
              </strong>

            </div>

          </div>

        </div>

      </div>

      <div className="upcoming-footer">

        <Link
          to={
            intervention.isTicket
              ? `/tickets/${intervention.original_id}`
              : `/interventions/${intervention.id}`
          }
          className="upcoming-detail-btn"
        >
          Détails
          <ChevronRight size={15} />
        </Link>

        {displayState === 'a_venir' && (
          <div className="upcoming-locked">

            <Lock size={14} />

            <span>
              Disponible à partir du{' '}

              {scheduledDateTime
                ? `${formatDate(
                    scheduledDateTime
                      .toISOString()
                  )} à ${formatTime(
                    scheduledDateTime
                      .toTimeString()
                  )}`
                : `${formatDate(
                    intervention.scheduled_date
                  )} à ${formatTime(
                    intervention.scheduled_time
                  )}`}
            </span>

          </div>
        )}

        {displayState === 'active' && (
          <Link
            to={
              intervention.isTicket
                ? `/tickets/${intervention.original_id}`
                : `/interventions/${intervention.id}`
            }
            className="upcoming-start-btn"
          >
            <PlayCircle size={15} />
            Commencer l’intervention
          </Link>
        )}

        {displayState === 'en_cours' && (
          <Link
            to={
              intervention.isTicket
                ? `/tickets/${intervention.original_id}`
                : `/interventions/${intervention.id}`
            }
            className="upcoming-start-btn"
          >
            <Wrench size={15} />
            Continuer l’intervention
          </Link>
        )}

        {displayState ===
          'en_attente_validation' && (
          <div className="upcoming-waiting">

            <Clock size={14} />

            En attente de validation

          </div>
        )}

        {displayState === 'validee' && (
          <div className="upcoming-approved">

            <CheckCircle size={14} />

            Intervention validée

          </div>
        )}

      </div>

    </section>
  );
};

/* ==========================================================================
   TABLEAU DES INTERVENTIONS DU JOUR
   ========================================================================== */

const TodayTable = ({
  todayInterventions,
  groupName
}) => {

  if (
    todayInterventions.length === 0
  ) {
    return (
      <div className="pro-empty">

        <div className="pro-empty-icon">
          <Calendar size={24} />
        </div>

        <h3>
          Aucune intervention prévue
          aujourd'hui
        </h3>

        <p>
          Consultez vos prochaines
          interventions pour connaître votre
          planning.
        </p>

        <Link
          to="/my-interventions"
          className="pro-btn-outline"
        >
          Consulter le planning complet
        </Link>

      </div>
    );
  }

  /*
   * Tri par horaire.
   */
  const sortedInterventions = [
    ...todayInterventions
  ].sort((a, b) => {

    const timeA = String(
      a.scheduled_time ||
      a.time ||
      '00:00:00'
    );

    const timeB = String(
      b.scheduled_time ||
      b.time ||
      '00:00:00'
    );

    return timeA.localeCompare(
      timeB
    );
  });

  return (
    <div className="pro-table-wrapper">

      <table className="pro-table">

        <thead>

          <tr>

            <th>
              Horaire
            </th>

            <th>
              Équipement
            </th>

            <th>
              Type
            </th>

            <th>
              Groupe
            </th>

            <th>
              Statut
            </th>

            <th className="align-right">
              Action
            </th>

          </tr>

        </thead>

        <tbody>

          {sortedInterventions
            .slice(0, 10)
            .map((item) => {

              const status =
                getStatusBadge(
                  getDisplayState(item)
                );

              const equipment =
                item.equipment?.name ||
                item.equipment_name ||
                item.equipment ||
                'Équipement principal';

              const group =
                item.group?.name ||
                item.group_name ||
                item.group ||
                groupName;

              /*
               * Un ticket possède isTicket=true.
               */
              const isTicket =
                item.isTicket === true;

              /*
               * Ticket :
               * /tickets/:id
               *
               * Préventif :
               * /interventions/:id
               */
              const detailLink =
                isTicket
                  ? `/tickets/${item.original_id}`
                  : `/interventions/${item.id}`;

              return (
                <tr
                  key={
                    isTicket
                      ? `ticket-${item.original_id}`
                      : `intervention-${item.id}`
                  }
                >

                  {/* HORAIRE */}

                  <td className="font-mono">

                    <Clock
                      size={13}
                      className="text-muted"
                    />

                    {formatTime(
                      item.scheduled_time ||
                      item.time
                    )}

                  </td>

                  {/* ÉQUIPEMENT */}

                  <td>

                    <div className="equip-cell">

                      <div className="equip-avatar">

                        <Wrench size={13} />

                      </div>

                      <span>
                        {equipment}
                      </span>

                    </div>

                  </td>

                  {/* TYPE */}

                  <td>

                    <span className="pro-tag">

                      <Layers size={11} />

                      {isTicket
                        ? 'Correctif'
                        : item.type ||
                          'Préventif'}

                    </span>

                  </td>

                  {/* GROUPE */}

                  <td className="text-muted">

                    {group}

                  </td>

                  {/* STATUT */}

                  <td>

                    <span
                      className={`status-badge ${status.class}`}
                    >

                      <span className="dot" />

                      {status.label}

                    </span>

                  </td>

                  {/* ACTION */}

                  <td className="align-right">

                    <Link
                      to={detailLink}
                      className="pro-table-action"
                    >

                      Détails

                      <ChevronRight
                        size={13}
                      />

                    </Link>

                  </td>

                </tr>
              );
            })}

        </tbody>

      </table>

    </div>
  );
};

/* ==========================================================================
   COMPOSANT PRINCIPAL
   ========================================================================== */

const DashboardIntervenant = () => {

  const { user } =
    useAuth();

  const {
    stats,
    todayInterventions,
    upcomingInterventions,
    groupName,
    loading,
    refreshing,
    fetchDashboard
  } = useIntervenantDashboard();

  /* ========================================================================
     CHARGEMENT
     ======================================================================== */

  if (loading) {
    return (
      <div className="pro-loader-screen">

        <div className="pro-spinner" />

        <span>
          Chargement du tableau de bord...
        </span>

      </div>
    );
  }

  /* ========================================================================
     AFFICHAGE
     ======================================================================== */

  return (
    <div className="pro-dashboard-wrapper">

      <DashboardHeader
        userName={user?.name}
        groupName={groupName}
        refreshing={refreshing}
        onRefresh={fetchDashboard}
      />

      {/* ================================================================
          ALERTE SI PAS DE GROUPE
          ================================================================ */}

      {groupName === 'Non assigné' && (
        <div className="pro-alert">

          <AlertTriangle size={16} />

          <span>
            Aucun groupe d'intervention
            assigné. Contactez votre
            responsable.
          </span>

        </div>
      )}

      {/* ================================================================
          STATISTIQUES
          ================================================================ */}

      <StatsGrid
        stats={stats}
      />

      {/* ================================================================
          PROCHAINE INTERVENTION
          ================================================================ */}

      <UpcomingInterventionCard
        intervention={
          upcomingInterventions[0] ||
          null
        }
      />

      {/* ================================================================
          INTERVENTIONS DU JOUR
          ================================================================ */}

      <main className="pro-main-card">

        <div className="pro-card-header">

          <div className="pro-card-title">

            <Wrench size={16} />

            <h2>
              Interventions du jour
            </h2>

          </div>

          <Link
            to="/my-interventions"
            className="pro-link"
          >
            Tout afficher

            <ArrowRight size={14} />

          </Link>

        </div>

        <TodayTable
          todayInterventions={
            todayInterventions
          }
          groupName={
            groupName
          }
        />

      </main>

    </div>
  );
};

export default DashboardIntervenant;