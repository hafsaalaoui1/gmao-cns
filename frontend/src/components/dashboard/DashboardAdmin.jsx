import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Link } from 'react-router-dom';

import {
    Users,
    UserCheck,
    UserCog,
    Shield,
    UserPlus,
    Activity,
    Settings,
    LogOut,
    Clock,
    Calendar,
    CheckCircle,
    AlertTriangle,
    User,
    ChevronRight,
    PlusCircle,
    Wrench,
    Ticket,
    Eye,
    ClipboardList
} from 'lucide-react';

import './DashboardAdmin.css';


const DashboardAdmin = () => {

    const { user } = useAuth();

    // ============================================================
    // STATISTIQUES
    // ============================================================

    const [stats, setStats] = useState({
        total_users: 0,
        active_users: 0,
        total_intervenants: 0,
        total_responsables: 0,
        total_admins: 0,
        total_groups: 0,
        total_equipments: 0,
        total_interventions: 0,
        total_tickets: 0,
        pending_interventions: 0,
        open_tickets: 0,
        pending_readings: 0
    });

    // ============================================================
    // ÉTATS
    // ============================================================

    const [loading, setLoading] = useState(true);

    const [recentActivities, setRecentActivities] = useState([]);

    // Planning = préventif + correctif
    const [todayPlanning, setTodayPlanning] = useState([]);


    // ============================================================
    // CHARGEMENT INITIAL
    // ============================================================

    useEffect(() => {

        fetchStats();
        fetchRecentActivities();
        fetchTodayPlanning();

    }, []);


    // ============================================================
    // EXTRAIRE UN TABLEAU D'UNE RÉPONSE API
    // ============================================================

    const extractArray = (response, preferredKeys = []) => {

        const payload = response?.data;

        if (Array.isArray(payload)) {
            return payload;
        }

        for (const key of preferredKeys) {

            if (Array.isArray(payload?.[key])) {
                return payload[key];
            }
        }

        if (Array.isArray(payload?.data)) {
            return payload.data;
        }

        if (Array.isArray(payload?.data?.data)) {
            return payload.data.data;
        }

        return [];
    };


    // ============================================================
    // STATISTIQUES ADMIN
    // ============================================================

    const fetchStats = async () => {

        try {

            const response =
                await api.get('/dashboard/admin-stats');

            console.log(
                'Statistiques Admin:',
                response.data
            );

            const data =
                response.data?.data &&
                typeof response.data.data === 'object' &&
                !Array.isArray(response.data.data)
                    ? response.data.data
                    : response.data;

            setStats({

                total_users:
                    Number(data?.total_users ?? 0),

                active_users:
                    Number(data?.active_users ?? 0),

                total_intervenants:
                    Number(data?.total_intervenants ?? 0),

                total_responsables:
                    Number(data?.total_responsables ?? 0),

                total_admins:
                    Number(data?.total_admins ?? 0),

                total_groups:
                    Number(data?.total_groups ?? 0),

                total_equipments:
                    Number(data?.total_equipments ?? 0),

                total_interventions:
                    Number(data?.total_interventions ?? 0),

                total_tickets:
                    Number(data?.total_tickets ?? 0),

                pending_interventions:
                    Number(data?.pending_interventions ?? 0),

                open_tickets:
                    Number(data?.open_tickets ?? 0),

                pending_readings:
                    Number(data?.pending_readings ?? 0)
            });

        } catch (error) {

            console.error(
                'Erreur statistiques Admin:',
                error
            );

        } finally {

            setLoading(false);
        }
    };


    // ============================================================
    // PLANNING DU JOUR
    // PRÉVENTIF + CORRECTIF
    // ============================================================

    const fetchTodayPlanning = async () => {

        try {

            const [
                interventionsResponse,
                ticketsResponse
            ] = await Promise.all([

                api.get('/interventions/today'),

                api.get('/tickets')

            ]);


            console.log(
                'Interventions préventives:',
                interventionsResponse.data
            );

            console.log(
                'Tickets correctifs:',
                ticketsResponse.data
            );


            // ====================================================
            // 1. PRÉVENTIF
            // ====================================================

            const preventive =
                extractArray(
                    interventionsResponse,
                    [
                        'interventions',
                        'data'
                    ]
                );


            const preventivePlanning =
                preventive.map((intervention) => ({

                    ...intervention,

                    type: 'preventive',

                    source: 'intervention',

                    original_id:
                        intervention.id,

                    display_title:
                        intervention.title ||
                        intervention.name ||
                        `Intervention #${intervention.id}`,

                    equipment_name:
                        intervention.equipment?.name ||
                        intervention.equipment?.designation ||
                        intervention.equipment_name ||
                        'Équipement non renseigné',

                    assigned_user_name:
                        intervention.user?.name ||
                        intervention.assignedTo?.name ||
                        intervention.intervenant?.name ||
                        intervention.user_name ||
                        'Non affecté',

                    planning_status:
                        intervention.status ||
                        'en_attente',

                    scheduled_time:
                        intervention.scheduled_time ||
                        intervention.start_time ||
                        intervention.time ||
                        null

                }));


            // ====================================================
            // 2. CORRECTIF = TICKETS ACTIFS
            // ====================================================

            const tickets =
                extractArray(
                    ticketsResponse,
                    [
                        'tickets',
                        'data'
                    ]
                );


            /*
             * Pour l'Admin :
             *
             * - assigne      → affiché
             * - en_cours     → affiché
             * - en_attente   → affiché
             *
             * Les tickets "nouveau" ne sont pas encore pris
             * en charge, donc ils ne sont pas dans le planning.
             *
             * Les tickets "resolu" et "cloture" ne sont plus
             * actifs, donc ils ne sont pas affichés.
             */

            const activeTicketStatuses = [
                'assigne',
                'en_cours',
                'en_attente'
            ];


            const correctivePlanning =
                tickets
                    .filter((ticket) => {

                        const status =
                            String(
                                ticket.status || ''
                            )
                                .trim()
                                .toLowerCase();

                        return activeTicketStatuses.includes(
                            status
                        );

                    })
                    .map((ticket) => ({

                        ...ticket,

                        type: 'corrective',

                        source: 'ticket',

                        original_id:
                            ticket.id,

                        display_title:
                            `Ticket #${ticket.id}`,

                        equipment_name:
                            ticket.equipment?.name ||
                            ticket.equipment?.designation ||
                            ticket.equipment_name ||
                            'Équipement non renseigné',

                        assigned_user_name:
                            ticket.assignedTo?.name ||
                            ticket.assigned_to_user?.name ||
                            ticket.assigned_user?.name ||
                            'Non affecté',

                        planning_status:
                            ticket.status,

                        /*
                         * Pour un ticket correctif, on garde
                         * sa date de déclaration comme information.
                         * On ne filtre PAS sur cette date :
                         *
                         * un ticket créé hier mais toujours
                         * en_cours doit rester visible aujourd'hui.
                         */

                        scheduled_date:
                            ticket.declared_date ||
                            ticket.created_at ||
                            null,

                        scheduled_time:
                            ticket.declared_time ||
                            null

                    }));


            // ====================================================
            // 3. FUSION PRÉVENTIF + CORRECTIF
            // ====================================================

            const combinedPlanning = [

                ...preventivePlanning,

                ...correctivePlanning

            ];


            // ====================================================
            // 4. TRI PAR HEURE
            // ====================================================

            combinedPlanning.sort((a, b) => {

                const timeA =
                    a.scheduled_time ||
                    '23:59';

                const timeB =
                    b.scheduled_time ||
                    '23:59';

                return String(timeA).localeCompare(
                    String(timeB)
                );
            });


            console.log(
                'Planning du jour Admin:',
                combinedPlanning
            );


            setTodayPlanning(
                combinedPlanning
            );


        } catch (error) {

            console.error(
                'Erreur chargement planning Admin:',
                error
            );

            setTodayPlanning([]);
        }
    };


    // ============================================================
    // ACTIVITÉS RÉCENTES
    // ============================================================

    const fetchRecentActivities = async () => {

        try {

            const response =
                await api.get('/logs/recent');

            console.log(
                'Activités récentes:',
                response.data
            );

            const activities =
                extractArray(
                    response,
                    [
                        'logs',
                        'activities',
                        'data'
                    ]
                );

            setRecentActivities(
                activities
            );

        } catch (error) {

            console.error(
                'Erreur activités récentes:',
                error
            );

            setRecentActivities([]);
        }
    };


    // ============================================================
    // FORMAT TEMPS
    // ============================================================

    const formatTimeAgo = (date) => {

        if (!date) {
            return 'Date inconnue';
        }

        try {

            const parsedDate =
                new Date(date);

            if (
                isNaN(
                    parsedDate.getTime()
                )
            ) {
                return date;
            }

            const now = new Date();

            const diff = Math.floor(
                (now - parsedDate) / 1000
            );


            if (diff < 60) {

                return `Il y a ${diff} secondes`;
            }

            if (diff < 3600) {

                return `Il y a ${Math.floor(
                    diff / 60
                )} minutes`;
            }

            if (diff < 86400) {

                return `Il y a ${Math.floor(
                    diff / 3600
                )} heures`;
            }

            if (diff < 604800) {

                return `Il y a ${Math.floor(
                    diff / 86400
                )} jours`;
            }

            return (
                parsedDate.toLocaleDateString(
                    'fr-FR'
                ) +
                ' ' +
                parsedDate.toLocaleTimeString(
                    'fr-FR',
                    {
                        hour: '2-digit',
                        minute: '2-digit'
                    }
                )
            );

        } catch (error) {

            return date || 'Date inconnue';
        }
    };


    // ============================================================
    // BADGE ACTIVITÉ
    // ============================================================

    const getActionBadge = (action) => {

        const normalizedAction =
            String(action || '');


        if (
            normalizedAction.includes('créé') ||
            normalizedAction.includes('Création')
        ) {

            return {
                color: '#22c55e',
                icon: CheckCircle,
                label: 'Création'
            };
        }


        if (
            normalizedAction.includes('supprimé') ||
            normalizedAction.includes('Suppression')
        ) {

            return {
                color: '#ef4444',
                icon: AlertTriangle,
                label: 'Suppression'
            };
        }


        if (
            normalizedAction.includes('modifié') ||
            normalizedAction.includes('Modification')
        ) {

            return {
                color: '#f59e0b',
                icon: Activity,
                label: 'Modification'
            };
        }


        if (
            normalizedAction.includes('connecté') ||
            normalizedAction.includes('Connexion')
        ) {

            return {
                color: '#3b82f6',
                icon: User,
                label: 'Connexion'
            };
        }


        if (
            normalizedAction.includes('déconnecté') ||
            normalizedAction.includes('Déconnexion')
        ) {

            return {
                color: '#8b5cf6',
                icon: LogOut,
                label: 'Déconnexion'
            };
        }


        return {
            color: '#6b7280',
            icon: Activity,
            label: 'Action'
        };
    };


    // ============================================================
    // LABEL STATUT
    // ============================================================

    const getStatusLabel = (status) => {

        const labels = {

            nouveau: 'Nouveau',

            assigne: 'Assigné',

            en_attente: 'En attente',

            en_cours: 'En cours',

            terminee: 'Terminée',

            validee: 'Validée',

            en_retard: 'En retard',

            cloturee: 'Clôturée',

            annulee: 'Annulée'
        };


        return (
            labels[
                String(status || '')
                    .trim()
                    .toLowerCase()
            ] ||
            status ||
            'Non renseigné'
        );
    };


    // ============================================================
    // CLASSE STATUT
    // ============================================================

    const getStatusClass = (status) => {

        const normalized =
            String(status || '')
                .trim()
                .toLowerCase();


        switch (normalized) {

            case 'en_cours':
                return 'planning-status-in-progress';

            case 'assigne':
                return 'planning-status-assigned';

            case 'en_attente':
                return 'planning-status-pending';

            case 'terminee':
                return 'planning-status-completed';

            case 'validee':
                return 'planning-status-validated';

            case 'en_retard':
                return 'planning-status-late';

            default:
                return 'planning-status-default';
        }
    };


    // ============================================================
    // HEURE PLANNING
    // ============================================================

    const formatPlanningTime = (item) => {

        const time =
            item.scheduled_time ||
            item.time ||
            item.start_time;


        if (!time) {
            return '--:--';
        }


        return String(time).substring(
            0,
            5
        );
    };


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <div className="admin-loading">

                <div className="loader"></div>

                <p>
                    Chargement du tableau de bord...
                </p>

            </div>
        );
    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div className="admin-dashboard">


            {/* ====================================================
                TOPBAR
            ==================================================== */}

            <div className="admin-topbar">

                <div className="topbar-left">

                    <div className="topbar-greeting">

                        <h1 className="topbar-title">

                            <User
                                size={22}
                                style={{
                                    marginRight: '8px',
                                    color: '#3b82f6'
                                }}
                            />

                            Bonjour,

                            <span className="topbar-name">

                                {user?.name ||
                                    'Administrateur'}

                            </span>

                        </h1>


                        <span className="topbar-role">
                            Administrateur
                        </span>

                    </div>

                </div>


                <div className="topbar-right">

                    <div className="topbar-badge">

                        <Calendar
                            size={14}
                            className="badge-icon"
                        />

                        <span className="badge-text">

                            {new Date().toLocaleDateString(
                                'fr-FR',
                                {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                }
                            )}

                        </span>


                        <span className="badge-separator">
                            •
                        </span>


                        <span className="badge-text">

                            {new Date().toLocaleTimeString(
                                'fr-FR',
                                {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }
                            )}

                        </span>

                    </div>

                </div>

            </div>


            {/* ====================================================
                STATISTIQUES
            ==================================================== */}

            <div className="admin-stats-grid">


                <div className="stat-card">

                    <div className="stat-card-left">

                        <p className="stat-card-value">
                            {stats.total_users}
                        </p>

                        <p className="stat-card-label">
                            Total Utilisateurs
                        </p>

                    </div>


                    <div className="stat-card-right">

                        <div className="stat-card-icon stat-icon-blue">

                            <Users size={24} />

                        </div>

                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-card-left">

                        <p className="stat-card-value">
                            {stats.active_users}
                        </p>

                        <p className="stat-card-label">
                            Comptes Actifs
                        </p>

                    </div>


                    <div className="stat-card-right">

                        <div className="stat-card-icon stat-icon-green">

                            <UserCheck size={24} />

                        </div>

                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-card-left">

                        <p className="stat-card-value">
                            {stats.total_intervenants}
                        </p>

                        <p className="stat-card-label">
                            Intervenants
                        </p>

                    </div>


                    <div className="stat-card-right">

                        <div className="stat-card-icon stat-icon-purple">

                            <UserCog size={24} />

                        </div>

                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-card-left">

                        <p className="stat-card-value">
                            {stats.total_responsables}
                        </p>

                        <p className="stat-card-label">
                            Responsables
                        </p>

                    </div>


                    <div className="stat-card-right">

                        <div className="stat-card-icon stat-icon-amber">

                            <Shield size={24} />

                        </div>

                    </div>

                </div>

            </div>


            {/* ====================================================
                PLANNING DU JOUR
            ==================================================== */}

            <div className="admin-planning-section">

                <div className="section-header">

                    <div>

                        <h2 className="section-title">

                            <ClipboardList
                                size={20}
                                style={{
                                    marginRight: '8px'
                                }}
                            />

                            Planning du jour

                        </h2>


                        <p className="section-subtitle">

                            Interventions préventives et
                            maintenances correctives

                        </p>

                    </div>


                    <div className="planning-counter">

                        {todayPlanning.length}

                        <span>

                            élément
                            {todayPlanning.length !== 1
                                ? 's'
                                : ''}

                        </span>

                    </div>

                </div>


                {todayPlanning.length === 0 ? (

                    <div className="planning-empty">

                        <Calendar
                            size={42}
                            className="empty-icon"
                        />

                        <p>
                            Aucune intervention ou
                            maintenance corrective
                            active aujourd'hui.
                        </p>

                    </div>

                ) : (

                    <div className="admin-planning-table-wrapper">

                        <table className="admin-planning-table">

                            <thead>

                                <tr>

                                    <th>
                                        Type
                                    </th>

                                    <th>
                                        Heure
                                    </th>

                                    <th>
                                        Intervention / Ticket
                                    </th>

                                    <th>
                                        Équipement
                                    </th>

                                    <th>
                                        Intervenant
                                    </th>

                                    <th>
                                        Statut
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {todayPlanning.map(
                                    (item, index) => {

                                        const isCorrective =
                                            item.type ===
                                            'corrective';


                                        return (

                                            <tr
                                                key={
                                                    `${item.type}-${item.original_id}-${index}`
                                                }
                                            >

                                                {/* TYPE */}

                                                <td>

                                                    <span
                                                        className={
                                                            isCorrective
                                                                ? 'planning-type planning-type-corrective'
                                                                : 'planning-type planning-type-preventive'
                                                        }
                                                    >

                                                        {isCorrective ? (

                                                            <>
                                                                <Ticket
                                                                    size={14}
                                                                />

                                                                Correctif
                                                            </>

                                                        ) : (

                                                            <>
                                                                <Wrench
                                                                    size={14}
                                                                />

                                                                Préventif
                                                            </>

                                                        )}

                                                    </span>

                                                </td>


                                                {/* HEURE */}

                                                <td>

                                                    <div className="planning-time">

                                                        <Clock
                                                            size={14}
                                                        />

                                                        {formatPlanningTime(
                                                            item
                                                        )}

                                                    </div>

                                                </td>


                                                {/* INTERVENTION / TICKET */}

                                                <td>

                                                    <div className="planning-title-cell">

                                                        <strong>

                                                            {
                                                                item.display_title
                                                            }

                                                        </strong>


                                                        {isCorrective &&
                                                            item.description && (

                                                                <span className="planning-description">

                                                                    {
                                                                        item.description
                                                                    }

                                                                </span>

                                                            )}

                                                    </div>

                                                </td>


                                                {/* ÉQUIPEMENT */}

                                                <td>

                                                    <span className="planning-equipment">

                                                        {
                                                            item.equipment_name
                                                        }

                                                    </span>

                                                </td>


                                                {/* INTERVENANT */}

                                                <td>

                                                    <span className="planning-user">

                                                        {
                                                            item.assigned_user_name
                                                        }

                                                    </span>

                                                </td>


                                                {/* STATUT */}

                                                <td>

                                                    <span
                                                        className={`planning-status ${getStatusClass(
                                                            item.planning_status
                                                        )}`}
                                                    >

                                                        {
                                                            getStatusLabel(
                                                                item.planning_status
                                                            )
                                                        }

                                                    </span>

                                                </td>


                                                {/* ACTION */}

                                                <td>

                                                    <Link
                                                        to={
                                                            isCorrective
                                                                ? `/tickets/${item.original_id}`
                                                                : `/interventions/${item.original_id}`
                                                        }
                                                        className="planning-view-link"
                                                    >

                                                        <Eye
                                                            size={15}
                                                        />

                                                        Voir

                                                    </Link>

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


            {/* ====================================================
                ACTIONS RAPIDES
            ==================================================== */}

            <div className="admin-actions-section">

                <div className="section-header">

                    <div>

                        <h2 className="section-title">

                            <PlusCircle
                                size={20}
                                style={{
                                    marginRight: '8px'
                                }}
                            />

                            Actions rapides

                        </h2>


                        <p className="section-subtitle">

                            Accédez aux fonctionnalités principales

                        </p>

                    </div>

                </div>


                <div className="actions-grid-horizontal">


                    <Link
                        to="/users"
                        className="action-link"
                    >

                        <Users
                            size={20}
                            className="action-icon"
                        />


                        <div className="action-text">

                            <span className="action-title">
                                Gérer les utilisateurs
                            </span>

                            <span className="action-desc">
                                Créer, modifier, désactiver
                            </span>

                        </div>


                        <ChevronRight
                            size={16}
                            className="action-arrow"
                        />

                    </Link>


                    <Link
                        to="/users/create"
                        className="action-link"
                    >

                        <UserPlus
                            size={20}
                            className="action-icon"
                        />


                        <div className="action-text">

                            <span className="action-title">
                                Ajouter un utilisateur
                            </span>

                            <span className="action-desc">
                                Créer un nouveau compte
                            </span>

                        </div>


                        <ChevronRight
                            size={16}
                            className="action-arrow"
                        />

                    </Link>


                    <Link
                        to="/logs"
                        className="action-link"
                    >

                        <Activity
                            size={20}
                            className="action-icon"
                        />


                        <div className="action-text">

                            <span className="action-title">
                                Logs d'activité
                            </span>

                            <span className="action-desc">
                                Consulter l'historique
                            </span>

                        </div>


                        <ChevronRight
                            size={16}
                            className="action-arrow"
                        />

                    </Link>


                    <Link
                        to="/settings"
                        className="action-link"
                    >

                        <Settings
                            size={20}
                            className="action-icon"
                        />


                        <div className="action-text">

                            <span className="action-title">
                                Paramètres système
                            </span>

                            <span className="action-desc">
                                Configuration générale
                            </span>

                        </div>


                        <ChevronRight
                            size={16}
                            className="action-arrow"
                        />

                    </Link>

                </div>

            </div>


            {/* ====================================================
                DERNIÈRES ACTIVITÉS
            ==================================================== */}

            <div className="admin-activities">

                <div className="section-header">

                    <div>

                        <h2 className="section-title">

                            <Clock
                                size={20}
                                style={{
                                    marginRight: '8px'
                                }}
                            />

                            Dernières activités

                        </h2>


                        <p className="section-subtitle">

                            Les actions récentes effectuées
                            dans l'application

                        </p>

                    </div>


                    <Link
                        to="/logs"
                        className="view-all"
                    >
                        Voir tout →
                    </Link>

                </div>


                <div className="timeline">

                    {recentActivities.length === 0 ? (

                        <div className="activity-empty">

                            <Activity
                                size={40}
                                className="empty-icon"
                            />

                            <p>
                                Aucune activité récente
                            </p>

                        </div>

                    ) : (

                        recentActivities.map(
                            (activity, index) => {

                                const badge =
                                    getActionBadge(
                                        activity.action
                                    );

                                const BadgeIcon =
                                    badge.icon;


                                return (

                                    <div
                                        key={
                                            activity.id ||
                                            index
                                        }
                                        className="timeline-item"
                                    >

                                        <div
                                            className="timeline-icon"
                                            style={{
                                                backgroundColor:
                                                    badge.color
                                            }}
                                        >

                                            <BadgeIcon
                                                size={14}
                                                color="#fff"
                                            />

                                        </div>


                                        <div className="timeline-content">

                                            <div className="timeline-header">

                                                <span className="timeline-user">

                                                    {activity.user_name ||
                                                        'Utilisateur'}

                                                </span>


                                                <span
                                                    className="timeline-badge"
                                                    style={{
                                                        color:
                                                            badge.color,
                                                        borderColor:
                                                            badge.color
                                                    }}
                                                >

                                                    {badge.label}

                                                </span>

                                            </div>


                                            <p className="timeline-action">

                                                {activity.action ||
                                                    activity.message ||
                                                    'Activité'}

                                            </p>


                                            <span className="timeline-time">

                                                {formatTimeAgo(
                                                    activity.created_at ||
                                                    activity.time
                                                )}

                                            </span>

                                        </div>

                                    </div>

                                );

                            }
                        )

                    )}

                </div>

            </div>


            {/* ====================================================
                FOOTER
            ==================================================== */}

            <div className="admin-footer">

                <p>
                    © {new Date().getFullYear()}
                    {' '}GMAO CNS -
                    {' '}Office National des Aéroports
                </p>


                <p className="footer-version">
                    Version 1.0.0
                </p>

            </div>

        </div>
    );
};


export default DashboardAdmin;