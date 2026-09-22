import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

import {
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  Users,
  User,
  RefreshCw,
  HardDrive,
  FileText,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

import './TicketForm.css';

// ============================================================
// CONSTANTES
// ============================================================

const PRIORITY_OPTIONS = [
  {
    value: 'faible',
    label: 'Faible',
    icon: CheckCircle2,
    class: 'priority-faible',
  },
  {
    value: 'normale',
    label: 'Normale',
    icon: Clock,
    class: 'priority-normale',
  },
  {
    value: 'elevee',
    label: 'Élevée',
    icon: AlertTriangle,
    class: 'priority-elevee',
  },
  {
    value: 'urgente',
    label: 'Urgente',
    icon: ShieldAlert,
    class: 'priority-urgente',
  },
];

// ============================================================
// SELECTEUR DE PRIORITE
// ============================================================

const PrioritySelector = ({
  options,
  selected,
  onChange,
}) => (
  <div className="priority-selector">
    {options.map(
      ({
        value,
        label,
        icon: Icon,
        class: className,
      }) => (
        <button
          key={value}
          type="button"
          className={`priority-btn ${className} ${
            selected === value ? 'selected' : ''
          }`}
          onClick={() => onChange(value)}
          aria-pressed={selected === value}
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      )
    )}
  </div>
);

// ============================================================
// CHAMP DU FORMULAIRE
// ============================================================

const FormField = ({
  id,
  label,
  required,
  icon,
  children,
}) => (
  <div className="form-group">
    {label && (
      <label
        htmlFor={id}
        className={required ? 'required-label' : ''}
      >
        {icon && (
          <span className="field-icon">
            {icon}
          </span>
        )}

        <span>{label}</span>
      </label>
    )}

    {children}
  </div>
);

// ============================================================
// SECTION ASSIGNATION
// ============================================================

const AssignmentSection = ({
  groups,
  users,
  selectedGroup,
  selectedUser,
  onGroupChange,
  onUserChange,
  isLoading,
}) => {
  return (
    <div className="assignment-section">

      <h3 className="section-title">
        <Users size={18} />
        <span>Assignation</span>
      </h3>

      <div className="form-row">

        {/* ==================================================
            GROUPE
        ================================================== */}

        <div className="form-group">

          <label htmlFor="group-select">
            <Users size={15} />
            <span>Groupe d'intervenants</span>
          </label>

          <select
            id="group-select"
            className="form-control"
            value={selectedGroup}
            onChange={(e) =>
              onGroupChange(e.target.value)
            }
            disabled={isLoading}
          >
            <option value="">
              Aucun groupe
            </option>

            {groups.map((group) => (
              <option
                key={group.id}
                value={group.id}
              >
                {group.name}

                {Array.isArray(group.users)
                  ? ` (${group.users.length} membres)`
                  : ''}
              </option>
            ))}
          </select>

          {selectedGroup && (
            <p className="info-text">
              Le ticket sera affecté à ce groupe.
            </p>
          )}

        </div>

        {/* ==================================================
            INTERVENANT
        ================================================== */}

        <div className="form-group">

          <label htmlFor="assigned-to-select">
            <User size={15} />
            <span>Intervenant assigné</span>
          </label>

          <select
            id="assigned-to-select"
            name="assigned_to"
            className="form-control"
            value={selectedUser}
            onChange={(e) =>
              onUserChange(e.target.value)
            }
            disabled={isLoading}
          >
            <option value="">
              Aucun intervenant
            </option>

            {users.map((user) => (
              <option
                key={user.id}
                value={String(user.id)}
              >
                {user.name}

                {user.email
                  ? ` (${user.email})`
                  : ''}
              </option>
            ))}
          </select>

          {selectedGroup && users.length > 0 && (
            <p className="info-text">
              {users.length}{' '}
              {users.length > 1
                ? 'intervenants disponibles'
                : 'intervenant disponible'}
              {' '}dans ce groupe.
            </p>
          )}

          {selectedGroup && users.length === 0 && (
            <p className="info-text warning">
              Aucun intervenant disponible dans ce groupe.
            </p>
          )}

          {selectedUser && (
            <p className="info-text">
              <User size={14} />
              Le ticket sera affecté directement à cet intervenant.
            </p>
          )}

        </div>

      </div>

      {/* ==================================================
          INFORMATION SUR L'AFFECTATION
      ================================================== */}

      <div className="assignment-info">

        {!selectedGroup && !selectedUser && (
          <p className="info-text">
            Aucun groupe ni intervenant sélectionné.
            Le ticket sera créé comme « Non assigné ».
          </p>
        )}

        {selectedGroup && !selectedUser && (
          <p className="info-text">
            <Users size={14} />
            Affectation : <strong>Groupe</strong>
          </p>
        )}

        {!selectedGroup && selectedUser && (
          <p className="info-text">
            <User size={14} />
            Affectation : <strong>Intervenant</strong>
          </p>
        )}

      </div>

    </div>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const TicketForm = () => {

  const navigate = useNavigate();
  const { id } = useParams();

  const isEdit = Boolean(id);

  const {
    isResponsable,
    isIntervenant,
  } = useAuth();

  // ==========================================================
  // ETATS
  // ==========================================================

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [equipments, setEquipments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);

  const [selectedGroup, setSelectedGroup] = useState('');

  const [formData, setFormData] = useState({
    equipment_id: '',
    priority: 'normale',
    description: '',
    assigned_to: '',
  });

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  const initialize = useCallback(async () => {

    setInitialLoading(true);

    try {

      const requests = [
        api.get('/equipments'),
      ];

      if (isResponsable) {
        requests.push(
          api.get('/groups'),
          api.get('/users/intervenants')
        );
      }

      if (isEdit) {
        requests.push(
          api.get(`/tickets/${id}`)
        );
      }

      const responses = await Promise.all(requests);

      // ======================================================
      // EQUIPEMENTS
      // ======================================================

      const equipmentResponse = responses[0];

      const equipmentData =
        equipmentResponse?.data?.data ??
        equipmentResponse?.data ??
        [];

      setEquipments(
        Array.isArray(equipmentData)
          ? equipmentData
          : []
      );

      // ======================================================
      // GROUPES + INTERVENANTS
      // ======================================================

      if (isResponsable) {

        const groupsResponse = responses[1];
        const usersResponse = responses[2];

        const groupsData =
          groupsResponse?.data?.data ??
          groupsResponse?.data ??
          [];

        const usersData =
          usersResponse?.data?.data ??
          usersResponse?.data ??
          [];

        setGroups(
          Array.isArray(groupsData)
            ? groupsData
            : []
        );

        setUsers(
          Array.isArray(usersData)
            ? usersData
            : []
        );
      }

      // ======================================================
      // MODE EDITION
      // ======================================================

      if (isEdit) {

        const ticketIndex =
          isResponsable ? 3 : 1;

        const ticketResponse =
          responses[ticketIndex];

        const ticket =
          ticketResponse?.data?.data ??
          ticketResponse?.data;

        if (!ticket) {
          throw new Error(
            'Ticket introuvable.'
          );
        }

        // ----------------------------------------------------
        // INFORMATIONS PRINCIPALES
        // ----------------------------------------------------

        setFormData({
          equipment_id:
            ticket.equipment_id ?? '',

          priority:
            ticket.priority ?? 'normale',

          description:
            ticket.description ?? '',

          assigned_to:
            ticket.assigned_to != null
              ? String(ticket.assigned_to)
              : '',
        });

        // ----------------------------------------------------
        // AFFECTATION GROUPE
        // ----------------------------------------------------

        if (
          isResponsable &&
          ticket.group_id != null
        ) {

          setSelectedGroup(
            String(ticket.group_id)
          );

          setFormData((prev) => ({
            ...prev,
            assigned_to: '',
          }));
        }

        // ----------------------------------------------------
        // AFFECTATION INTERVENANT
        // ----------------------------------------------------

        else if (
          isResponsable &&
          ticket.assigned_to != null
        ) {

          setSelectedGroup('');
        }

        // ----------------------------------------------------
        // AUCUNE AFFECTATION
        // ----------------------------------------------------

        else {
          setSelectedGroup('');
        }
      }

    } catch (error) {

      console.error(
        'Erreur de chargement du formulaire :',
        error
      );

      console.error(
        'Réponse serveur :',
        error.response?.data
      );

      toast.error(
        error.response?.data?.message ||
        'Impossible de charger les données.'
      );

      if (isEdit) {
        navigate('/tickets');
      }

    } finally {
      setInitialLoading(false);
    }

  }, [
    id,
    isEdit,
    isResponsable,
    navigate,
  ]);

  // ==========================================================
  // USE EFFECT
  // ==========================================================

  useEffect(() => {
    initialize();
  }, [initialize]);

  // ==========================================================
  // FILTRAGE UTILISATEURS
  // ==========================================================

  const filteredUsers = useMemo(() => {

    if (!selectedGroup) {
      return users;
    }

    const group = groups.find(
      (item) =>
        Number(item.id) ===
        Number(selectedGroup)
    );

    if (!group) {
      return users;
    }

    // --------------------------------------------------------
    // group.users
    // --------------------------------------------------------

    if (Array.isArray(group.users)) {

      const groupUserIds =
        group.users.map(
          (user) => Number(user.id)
        );

      return users.filter(
        (user) =>
          groupUserIds.includes(
            Number(user.id)
          )
      );
    }

    // --------------------------------------------------------
    // group.intervenants
    // --------------------------------------------------------

    if (Array.isArray(group.intervenants)) {

      const groupUserIds =
        group.intervenants.map(
          (user) => Number(user.id)
        );

      return users.filter(
        (user) =>
          groupUserIds.includes(
            Number(user.id)
          )
      );
    }

    // --------------------------------------------------------
    // group.user_ids
    // --------------------------------------------------------

    if (Array.isArray(group.user_ids)) {

      const groupUserIds =
        group.user_ids.map(
          (userId) => Number(userId)
        );

      return users.filter(
        (user) =>
          groupUserIds.includes(
            Number(user.id)
          )
      );
    }

    return users;

  }, [
    selectedGroup,
    users,
    groups,
  ]);

  // ==========================================================
  // CHANGEMENT CHAMPS
  // ==========================================================

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================================
  // PRIORITE
  // ==========================================================

  const handlePriorityChange = (priority) => {

    setFormData((prev) => ({
      ...prev,
      priority,
    }));
  };

  // ==========================================================
  // GROUPE
  // ==========================================================

  const handleGroupChange = (groupId) => {

    const normalizedGroupId =
      groupId
        ? String(groupId)
        : '';

    setSelectedGroup(
      normalizedGroupId
    );

    // Groupe sélectionné = pas d'intervenant direct
    setFormData((prev) => ({
      ...prev,
      assigned_to: '',
    }));
  };

  // ==========================================================
  // INTERVENANT
  // ==========================================================

  const handleUserChange = (userId) => {

    const normalizedUserId =
      userId
        ? String(userId)
        : '';

    // Intervenant sélectionné = pas de groupe
    setSelectedGroup('');

    setFormData((prev) => ({
      ...prev,
      assigned_to: normalizedUserId,
    }));
  };

  // ==========================================================
  // SOUMISSION
  // ==========================================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    // --------------------------------------------------------
    // VERIFICATION AUTORISATION
    // --------------------------------------------------------

    if (
      !isResponsable &&
      !isIntervenant
    ) {
      toast.error(
        "Vous n'êtes pas autorisé."
      );
      return;
    }

    // --------------------------------------------------------
    // VERIFICATION FORMULAIRE
    // --------------------------------------------------------

    if (
      !formData.equipment_id ||
      !formData.description.trim()
    ) {
      toast.error(
        'Veuillez sélectionner un équipement et décrire le problème.'
      );
      return;
    }

    // --------------------------------------------------------
    // VERIFICATION PRIORITE
    // --------------------------------------------------------

    const validPriorities = [
      'faible',
      'normale',
      'elevee',
      'urgente',
    ];

    if (!validPriorities.includes(formData.priority)) {
      toast.error(
        'Veuillez sélectionner une priorité valide.'
      );
      return;
    }

    setLoading(true);

    // ======================================================
    // AFFECTATION
    // ======================================================

    let assignedTo = null;
    let groupId = null;

    if (isResponsable) {

      // ----------------------------------------------------
      // GROUPE
      // ----------------------------------------------------

      if (selectedGroup) {

        groupId = Number(selectedGroup);
        assignedTo = null;
      }

      // ----------------------------------------------------
      // INTERVENANT DIRECT
      // ----------------------------------------------------

      else if (formData.assigned_to) {

        assignedTo =
          Number(formData.assigned_to);

        groupId = null;
      }
    }

    // ======================================================
    // PAYLOAD FINAL
    // ======================================================

    const payload = {
      equipment_id:
        Number(formData.equipment_id),

      priority:
        formData.priority,

      description:
        formData.description.trim(),

      assigned_to:
        assignedTo,

      group_id:
        groupId,
    };

    // ======================================================
    // DEBUG
    // ======================================================

    console.log(
      '========== TICKET PAYLOAD =========='
    );

    console.log(
      'equipment_id:',
      payload.equipment_id
    );

    console.log(
      'priority:',
      payload.priority
    );

    console.log(
      'description:',
      payload.description
    );

    console.log(
      'assigned_to:',
      payload.assigned_to
    );

    console.log(
      'group_id:',
      payload.group_id
    );

    console.log(
      'payload complet:',
      payload
    );

    console.log(
      '===================================='
    );

    // ======================================================
    // ENVOI
    // ======================================================

    try {

      if (isEdit) {

        await api.put(
          `/tickets/${id}`,
          payload
        );

        toast.success(
          'Ticket mis à jour avec succès.'
        );

      } else {

        await api.post(
          '/tickets',
          payload
        );

        toast.success(
          'Ticket créé avec succès.'
        );
      }

      navigate('/tickets');

    } catch (error) {

      console.error(
        'Erreur lors de l’enregistrement :',
        error
      );

      console.error(
        'Réponse serveur :',
        error.response?.data
      );

      // ====================================================
      // ERREUR 422
      // ====================================================

      if (
        error.response?.status === 422
      ) {

        const errors =
          error.response?.data?.errors || {};

        console.error(
          'ERREURS DE VALIDATION :',
          JSON.stringify(errors, null, 2)
        );

        const firstError =
          Object.values(errors)
            .flat()
            .find(Boolean);

        toast.error(
          firstError ||
          'Les données envoyées sont invalides.'
        );

        return;
      }

      // ====================================================
      // AUTRES ERREURS
      // ====================================================

      toast.error(
        error.response?.data?.message ||
        'Une erreur est survenue.'
      );

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (initialLoading) {

    return (
      <div className="ticket-form-page">

        <div className="form-loader">

          <RefreshCw
            size={36}
            className="spin"
          />

          <p>
            Chargement du formulaire...
          </p>

        </div>

      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="ticket-form-page">

      {/* ====================================================
          TOP BAR
      ==================================================== */}

      <div className="form-top-bar">

        <button
          type="button"
          className="btn-back"
          onClick={() =>
            navigate('/tickets')
          }
          disabled={loading}
        >
          <ArrowLeft size={18} />

          <span>
            Retour aux tickets
          </span>
        </button>

      </div>

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="form-header">

        <div
          className={`header-icon ${
            isEdit
              ? 'edit'
              : 'create'
          }`}
        >
          <AlertCircle size={28} />
        </div>

        <div className="header-text">

          <h1>
            {isEdit
              ? `Modifier le ticket #${id}`
              : 'Nouveau ticket'}
          </h1>

          <p>
            {isEdit
              ? 'Mettez à jour les informations et le suivi de l’incident.'
              : 'Renseignez les détails ci-dessous pour signaler un problème technique.'}
          </p>

        </div>

      </header>

      {/* ====================================================
          FORMULAIRE
      ==================================================== */}

      <form
        onSubmit={handleSubmit}
        className="ticket-form"
      >

        <div className="form-card">

          <div className="card-header">

            <FileText
              size={20}
              className="card-icon"
            />

            <h2>
              Informations du signalement
            </h2>

          </div>

          <div className="card-body">

            {/* =============================================
                EQUIPEMENT
            ============================================= */}

            <FormField
              id="equipment_id"
              label="Équipement concerné"
              required
              icon={
                <HardDrive size={16} />
              }
            >

              <select
                id="equipment_id"
                name="equipment_id"
                className="form-control"
                value={
                  formData.equipment_id
                }
                onChange={handleChange}
                required
                disabled={loading}
              >

                <option value="">
                  Sélectionnez un équipement
                </option>

                {equipments.map(
                  (equipment) => (
                    <option
                      key={equipment.id}
                      value={equipment.id}
                    >
                      {equipment.name}

                      {equipment.type
                        ? ` (${equipment.type})`
                        : ''}
                    </option>
                  )
                )}

              </select>

            </FormField>

            {/* =============================================
                PRIORITE
            ============================================= */}

            <div className="form-group">

              <label className="required-label">
                Niveau de priorité
              </label>

              <PrioritySelector
                options={
                  PRIORITY_OPTIONS
                }
                selected={
                  formData.priority
                }
                onChange={
                  handlePriorityChange
                }
              />

            </div>

            {/* =============================================
                DESCRIPTION
            ============================================= */}

            <FormField
              id="description"
              label="Description du problème"
              required
              icon={
                <FileText size={16} />
              }
            >

              <textarea
                id="description"
                name="description"
                className="form-control textarea-control"
                rows="5"
                placeholder="Décrivez précisément la panne ou le comportement anormal..."
                value={
                  formData.description
                }
                onChange={handleChange}
                required
                disabled={loading}
              />

            </FormField>

            {/* =============================================
                ASSIGNATION
            ============================================= */}

            {isResponsable && (
              <AssignmentSection
                groups={groups}
                users={filteredUsers}
                selectedGroup={
                  selectedGroup
                }
                selectedUser={
                  formData.assigned_to
                }
                onGroupChange={
                  handleGroupChange
                }
                onUserChange={
                  handleUserChange
                }
                isLoading={loading}
              />
            )}

          </div>

        </div>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div className="form-actions">

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              navigate('/tickets')
            }
            disabled={loading}
          >
            <X size={18} />

            <span>
              Annuler
            </span>
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >

            {loading ? (
              <>
                <RefreshCw
                  size={18}
                  className="spin"
                />

                <span>
                  Enregistrement...
                </span>
              </>
            ) : (
              <>
                <Save size={18} />

                <span>
                  {isEdit
                    ? 'Mettre à jour'
                    : 'Créer le ticket'}
                </span>
              </>
            )}

          </button>

        </div>

      </form>

    </div>
  );
};

export default TicketForm;