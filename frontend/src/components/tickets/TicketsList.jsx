import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

import {
  Plus,
  Eye,
  Trash2,
  Search,
  Filter,
  Ticket as TicketIcon,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  User,
  Users,
  Calendar,
  Wrench
} from 'lucide-react';

import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import './TicketsList.css';

/* ==========================================================================
   1. CONFIGURATIONS
   ========================================================================== */

const STATUS_CONFIG = {
  nouveau: {
    class: 'status-nouveau',
    label: 'Nouveau',
    Icon: TicketIcon
  },

  assigne: {
    class: 'status-assigne',
    label: 'Assigné',
    Icon: User
  },

  en_cours: {
    class: 'status-en-cours',
    label: 'En cours',
    Icon: Wrench
  },

  en_attente: {
    class: 'status-en-attente',
    label: 'En attente',
    Icon: Clock
  },

  resolu: {
    class: 'status-resolu',
    label: 'Résolu',
    Icon: CheckCircle2
  },

  cloture: {
    class: 'status-cloture',
    label: 'Clôturé',
    Icon: CheckCircle2
  }
};

const PRIORITY_CONFIG = {
  urgente: {
    class: 'priority-urgente',
    label: 'Urgente',
    Icon: ShieldAlert
  },

  elevee: {
    class: 'priority-elevee',
    label: 'Élevée',
    Icon: AlertTriangle
  },

  élevée: {
    class: 'priority-elevee',
    label: 'Élevée',
    Icon: AlertTriangle
  },

  normale: {
    class: 'priority-normale',
    label: 'Normale',
    Icon: Clock
  },

  faible: {
    class: 'priority-faible',
    label: 'Faible',
    Icon: CheckCircle2
  }
};

const getStatusBadge = (status) => {
  const key = String(status || '')
    .trim()
    .toLowerCase();

  return (
    STATUS_CONFIG[key] || {
      class: 'status-nouveau',
      label: status || 'Nouveau',
      Icon: TicketIcon
    }
  );
};

const getPriorityBadge = (priority) => {
  const key = String(priority || '')
    .trim()
    .toLowerCase();

  return (
    PRIORITY_CONFIG[key] || {
      class: 'priority-normale',
      label: 'Normale',
      Icon: Clock
    }
  );
};

const formatDate = (date) => {
  if (!date) return '—';

  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
};

/* ==========================================================================
   2. HELPER - AFFECTATION

   Backend attendu :

   assigned_to : 5
   assigned_user : {
      id: 5,
      name: "Ahmed"
   }

   group_id : null
   group : null

   OU :

   assigned_to : null
   assigned_user : null
   group_id : 2
   group : {
      id: 2,
      name: "Groupe A"
   }
   ========================================================================== */

const getAssignmentInfo = (ticket) => {
  /*
   * PRIORITÉ 1 :
   * Intervenant directement affecté
   *
   * Nouvelle relation Laravel :
   * assignedUser()
   *
   * JSON :
   * assigned_user
   */

  const assignedUser =
    ticket?.assigned_user ||
    ticket?.assignedUser ||
    null;

  if (assignedUser && typeof assignedUser === 'object') {
    const name =
      assignedUser.name ||
      assignedUser.nom ||
      assignedUser.full_name ||
      assignedUser.username ||
      `Intervenant #${assignedUser.id}`;

    return {
      type: 'user',
      label: name,
      Icon: User
    };
  }

  /*
   * Compatibilité avec une ancienne réponse Laravel
   * où assigned_to pouvait contenir directement l'objet utilisateur.
   */

  if (
    ticket?.assigned_to &&
    typeof ticket.assigned_to === 'object'
  ) {
    const user = ticket.assigned_to;

    const name =
      user.name ||
      user.nom ||
      user.full_name ||
      user.username ||
      `Intervenant #${user.id}`;

    return {
      type: 'user',
      label: name,
      Icon: User
    };
  }

  /*
   * PRIORITÉ 2 :
   * Affectation à un groupe
   */

  if (ticket?.group && typeof ticket.group === 'object') {
    const group = ticket.group;

    const name =
      group.name ||
      group.nom ||
      group.label ||
      `Groupe #${group.id}`;

    return {
      type: 'group',
      label: name,
      Icon: Users
    };
  }

  /*
   * PRIORITÉ 3 :
   * Aucun destinataire
   */

  return {
    type: 'none',
    label: 'Non assigné',
    Icon: User
  };
};

/* ==========================================================================
   3. CUSTOM HOOK
   ========================================================================== */

const useTicketsData = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [priorityFilter, setPriorityFilter] = useState('Toutes');
  const [sortBy, setSortBy] = useState('recent');

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get('/tickets');

      const data =
        response.data?.data ||
        response.data ||
        [];

      console.log('📋 Tickets reçus :', data);

      if (Array.isArray(data)) {
        setTickets(data);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error(
        '❌ Erreur chargement tickets :',
        error
      );

      toast.error(
        error.response?.data?.message ||
        'Erreur lors du chargement des tickets'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    return tickets

      /* --------------------------------------------------------------------
         RECHERCHE
         -------------------------------------------------------------------- */

      .filter((ticket) => {
        const search = searchTerm
          .trim()
          .toLowerCase();

        if (!search) {
          return true;
        }

        const equipmentName =
          ticket.equipment?.name ||
          ticket.equipment?.nom ||
          '';

        const equipmentCode =
          ticket.equipment?.code ||
          ticket.equipment?.reference ||
          '';

        const description =
          ticket.description ||
          '';

        const assignment =
          getAssignmentInfo(ticket);

        const assignedName =
          assignment.label || '';

        return (
          String(ticket.id || '')
            .toLowerCase()
            .includes(search) ||

          String(equipmentName)
            .toLowerCase()
            .includes(search) ||

          String(equipmentCode)
            .toLowerCase()
            .includes(search) ||

          String(description)
            .toLowerCase()
            .includes(search) ||

          String(assignedName)
            .toLowerCase()
            .includes(search)
        );
      })

      /* --------------------------------------------------------------------
         FILTRE STATUT
         -------------------------------------------------------------------- */

      .filter((ticket) =>
        statusFilter === 'Tous'
          ? true
          : ticket.status === statusFilter
      )

      /* --------------------------------------------------------------------
         FILTRE PRIORITÉ
         -------------------------------------------------------------------- */

      .filter((ticket) => {
        if (priorityFilter === 'Toutes') {
          return true;
        }

        const priority = String(
          ticket.priority || ''
        )
          .trim()
          .toLowerCase();

        if (priorityFilter === 'elevee') {
          return (
            priority === 'elevee' ||
            priority === 'élevée'
          );
        }

        return priority === priorityFilter;
      })

      /* --------------------------------------------------------------------
         TRI
         -------------------------------------------------------------------- */

      .sort((a, b) => {
        if (sortBy === 'recent') {
          return (
            new Date(
              b.declared_date ||
              b.created_at ||
              0
            ) -
            new Date(
              a.declared_date ||
              a.created_at ||
              0
            )
          );
        }

        if (sortBy === 'oldest') {
          return (
            new Date(
              a.declared_date ||
              a.created_at ||
              0
            ) -
            new Date(
              b.declared_date ||
              b.created_at ||
              0
            )
          );
        }

        if (sortBy === 'priority') {
          const priorityOrder = {
            urgente: 4,
            elevee: 3,
            élevée: 3,
            normale: 2,
            faible: 1
          };

          return (
            (
              priorityOrder[
                String(
                  b.priority || ''
                ).toLowerCase()
              ] || 0
            ) -
            (
              priorityOrder[
                String(
                  a.priority || ''
                ).toLowerCase()
              ] || 0
            )
          );
        }

        return 0;
      });
  }, [
    tickets,
    searchTerm,
    statusFilter,
    priorityFilter,
    sortBy
  ]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('Tous');
    setPriorityFilter('Toutes');
  };

  return {
    tickets,
    filteredTickets,
    loading,

    searchTerm,
    setSearchTerm,

    statusFilter,
    setStatusFilter,

    priorityFilter,
    setPriorityFilter,

    sortBy,
    setSortBy,

    resetFilters,
    setTickets
  };
};

/* ==========================================================================
   4. HEADER
   ========================================================================== */

const TicketsHeader = ({ isIntervenant }) => (
  <div className="tickets-header">

    <div className="tickets-title">

      <div className="tickets-title-icon">
        <TicketIcon size={22} />
      </div>

      <div>
        <h1>Gestion des Tickets</h1>

        <p>
          {isIntervenant
            ? 'Gérez et suivez l’état de vos interventions'
            : 'Consultez et gérez les tickets de maintenance'}
        </p>
      </div>

    </div>

    <Link
      to="/tickets/create"
      className="btn-primary"
    >
      <Plus size={18} />
      <span>Nouveau ticket</span>
    </Link>

  </div>
);

/* ==========================================================================
   5. FILTRES
   ========================================================================== */

const TicketsFilters = ({
  searchTerm,
  setSearchTerm,

  statusFilter,
  setStatusFilter,

  priorityFilter,
  setPriorityFilter,

  sortBy,
  setSortBy
}) => (
  <div className="tickets-filters">

    <div className="filter-input-wrapper search-wrapper">

      <Search
        size={18}
        className="filter-icon"
      />

      <input
        type="text"
        className="custom-filter-input"
        placeholder="Rechercher par ID, équipement, intervenant ou groupe..."
        value={searchTerm}
        onChange={(e) =>
          setSearchTerm(e.target.value)
        }
      />

    </div>

    <div className="filter-input-wrapper">

      <Filter
        size={16}
        className="filter-icon"
      />

      <select
        className="custom-filter-select"
        value={statusFilter}
        onChange={(e) =>
          setStatusFilter(e.target.value)
        }
      >
        <option value="Tous">
          Tous les statuts
        </option>

        <option value="nouveau">
          Nouveau
        </option>

        <option value="assigne">
          Assigné
        </option>

        <option value="en_cours">
          En cours
        </option>

        <option value="en_attente">
          En attente
        </option>

        <option value="resolu">
          Résolu
        </option>

        <option value="cloture">
          Clôturé
        </option>
      </select>

    </div>

    <div className="filter-input-wrapper">

      <AlertTriangle
        size={16}
        className="filter-icon"
      />

      <select
        className="custom-filter-select"
        value={priorityFilter}
        onChange={(e) =>
          setPriorityFilter(e.target.value)
        }
      >
        <option value="Toutes">
          Toutes les priorités
        </option>

        <option value="urgente">
          Urgente
        </option>

        <option value="elevee">
          Élevée
        </option>

        <option value="normale">
          Normale
        </option>

        <option value="faible">
          Faible
        </option>
      </select>

    </div>

    <div className="filter-input-wrapper">

      <Calendar
        size={16}
        className="filter-icon"
      />

      <select
        className="custom-filter-select"
        value={sortBy}
        onChange={(e) =>
          setSortBy(e.target.value)
        }
      >
        <option value="recent">
          Plus récents
        </option>

        <option value="oldest">
          Plus anciens
        </option>

        <option value="priority">
          Priorité
        </option>
      </select>

    </div>

  </div>
);

/* ==========================================================================
   6. TABLEAU
   ========================================================================== */

const TicketsTable = ({
  tickets,
  isAdmin,
  onDelete
}) => (
  <div className="tickets-table-container">

    <table className="tickets-table">

      <thead>
        <tr>
          <th>ID</th>
          <th>Équipement</th>
          <th>Description</th>
          <th>Statut</th>
          <th>Priorité</th>
          <th>Assigné à</th>
          <th>Date</th>
          <th className="text-right">
            Actions
          </th>
        </tr>
      </thead>

      <tbody>

        {tickets.map((ticket) => {

          const status =
            getStatusBadge(ticket.status);

          const StatusIcon =
            status.Icon;

          const priority =
            getPriorityBadge(ticket.priority);

          const PriorityIcon =
            priority.Icon;

          const equipmentName =
            ticket.equipment?.name ||
            ticket.equipment?.nom ||
            'Non spécifié';

          const equipmentCode =
            ticket.equipment?.code ||
            ticket.equipment?.reference ||
            '';

          const assignment =
            getAssignmentInfo(ticket);

          return (
            <tr key={ticket.id}>

              {/* ID */}

              <td>
                <span className="ticket-id">
                  #{ticket.id}
                </span>
              </td>

              {/* ÉQUIPEMENT */}

              <td>

                <div className="equipment-cell">

                  <div className="equipment-icon">
                    <Wrench size={14} />
                  </div>

                  <div>

                    <strong className="equipment-name">
                      {equipmentName}
                    </strong>

                    {equipmentCode && (
                      <span className="equipment-code">
                        {equipmentCode}
                      </span>
                    )}

                  </div>

                </div>

              </td>

              {/* DESCRIPTION */}

              <td>

                <span className="ticket-description">

                  {ticket.description
                    ? ticket.description.length > 50
                      ? `${ticket.description.substring(
                          0,
                          50
                        )}...`
                      : ticket.description
                    : '—'}

                </span>

              </td>

              {/* STATUT */}

              <td>

                <span
                  className={`badge-status ${status.class}`}
                >
                  <StatusIcon size={12} />
                  {status.label}
                </span>

              </td>

              {/* PRIORITÉ */}

              <td>

                <span
                  className={`badge-priority ${priority.class}`}
                >
                  <PriorityIcon size={12} />
                  {priority.label}
                </span>

              </td>

              {/* ASSIGNÉ À */}

              <td>

                {assignment.type === 'user' && (
                  <div className="user-cell">

                    <User size={14} />

                    <span>
                      {assignment.label}
                    </span>

                  </div>
                )}

                {assignment.type === 'group' && (
                  <div className="user-cell">

                    <Users size={14} />

                    <span>
                      {assignment.label}
                    </span>

                  </div>
                )}

                {assignment.type === 'none' && (
                  <span className="not-assigned">
                    Non assigné
                  </span>
                )}

              </td>

              {/* DATE */}

              <td>

                <span className="date-cell">
                  {formatDate(
                    ticket.declared_date ||
                    ticket.created_at
                  )}
                </span>

              </td>

              {/* ACTIONS */}

              <td className="text-right">

                <div className="ticket-actions">

                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="action-btn action-view"
                    title="Voir les détails"
                  >
                    <Eye size={16} />
                  </Link>

                  {isAdmin && (
                    <button
                      type="button"
                      className="action-btn action-delete"
                      title="Supprimer le ticket"
                      onClick={() =>
                        onDelete(ticket.id)
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                </div>

              </td>

            </tr>
          );
        })}

      </tbody>

    </table>

  </div>
);

/* ==========================================================================
   7. COMPOSANT PRINCIPAL
   ========================================================================== */

const TicketsList = () => {

  const {
    isAdmin,
    isIntervenant
  } = useAuth();

  const {
    tickets,
    filteredTickets,
    loading,

    searchTerm,
    setSearchTerm,

    statusFilter,
    setStatusFilter,

    priorityFilter,
    setPriorityFilter,

    sortBy,
    setSortBy,

    resetFilters,
    setTickets
  } = useTicketsData();

  /* ------------------------------------------------------------------------
     SUPPRESSION
     ------------------------------------------------------------------------ */

  const handleDelete = async (id) => {

    if (!isAdmin) {
      toast.error(
        "Vous n'êtes pas autorisé à supprimer un ticket."
      );

      return;
    }

    const confirmed =
      window.confirm(
        'Êtes-vous sûr de vouloir supprimer ce ticket ?\n\nCette action est irréversible.'
      );

    if (!confirmed) {
      return;
    }

    try {

      await api.delete(
        `/tickets/${id}`
      );

      setTickets((prev) =>
        prev.filter(
          (ticket) =>
            ticket.id !== id
        )
      );

      toast.success(
        'Ticket supprimé avec succès'
      );

    } catch (error) {

      console.error(
        '❌ Erreur suppression ticket :',
        error
      );

      toast.error(
        error.response?.data?.message ||
        'Erreur lors de la suppression du ticket'
      );
    }
  };

  /* ------------------------------------------------------------------------
     LOADING
     ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="tickets-list">

        <div className="tickets-loading">

          <div className="loading-spinner"></div>

          <p>
            Chargement des tickets...
          </p>

        </div>

      </div>
    );
  }

  /* ------------------------------------------------------------------------
     FILTRES ACTIFS
     ------------------------------------------------------------------------ */

  const isFiltered =
    Boolean(searchTerm) ||
    statusFilter !== 'Tous' ||
    priorityFilter !== 'Toutes';

  /* ------------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------------ */

  return (

    <div className="tickets-list">

      <TicketsHeader
        isIntervenant={isIntervenant}
      />

      <TicketsFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}

        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}

        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}

        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <div className="tickets-count">

        <span>

          <strong>
            {filteredTickets.length}
          </strong>{' '}

          ticket
          {filteredTickets.length > 1
            ? 's'
            : ''}{' '}

          trouvé
          {filteredTickets.length > 1
            ? 's'
            : ''}

        </span>

        {isFiltered && (
          <button
            type="button"
            className="clear-filters"
            onClick={resetFilters}
          >
            Réinitialiser les filtres
          </button>
        )}

      </div>

      {filteredTickets.length === 0 ? (

        <div className="empty-state">

          <div className="empty-state-icon">
            <TicketIcon size={36} />
          </div>

          <h3>
            Aucun ticket trouvé
          </h3>

          <p>
            {tickets.length === 0
              ? 'Aucun ticket n’a encore été déclaré.'
              : 'Aucun ticket ne correspond à vos critères de recherche.'}
          </p>

          {tickets.length === 0 && (
            <Link
              to="/tickets/create"
              className="btn-primary"
            >
              <Plus size={18} />
              <span>
                Créer un ticket
              </span>
            </Link>
          )}

        </div>

      ) : (

        <TicketsTable
          tickets={filteredTickets}
          isAdmin={isAdmin}
          onDelete={handleDelete}
        />

      )}

    </div>
  );
};

export default TicketsList;