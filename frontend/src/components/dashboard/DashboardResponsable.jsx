import React, { useState, useEffect, useCallback, useMemo } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';

import {
  CheckCircle,
  AlertCircle,
  Clock,
  Wrench,
  Calendar,
  RefreshCw,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Timer,
  Repeat,
  Zap,
  Target
} from 'lucide-react';

import api from '../../services/api';
import './DashboardResponsable.css';

// ============================================================
// CONSTANTES
// ============================================================

const CHART_COLORS = [
  '#2563eb',
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#8b5cf6'
];

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

const StatCard = ({
  variant,
  icon: Icon,
  label,
  value,
  status
}) => (
  <div className={`stat-card ${variant}`}>
    <div className="stat-card-header">
      <div className="stat-icon-wrapper">
        <Icon
          size={18}
          strokeWidth={2.2}
        />
      </div>

      <span className="stat-status">
        {status}
      </span>
    </div>

    <div className="stat-content">
      <span className="stat-label">
        {label}
      </span>

      <strong className="stat-value">
        {value ?? 0}
      </strong>
    </div>
  </div>
);

// ============================================================
// KPI CARD
// ============================================================

const KpiCard = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  highlight = true
}) => (
  <div className={`kpi-card ${highlight ? 'highlight' : ''}`}>
    <div className="kpi-header-row">

      <span className="kpi-title">
        {title}
      </span>

      {Icon && (
        <div className="kpi-icon">
          <Icon
            size={18}
            strokeWidth={2.2}
          />
        </div>
      )}

    </div>

    <div className="kpi-value-container">

      <span className="kpi-value">
        {value ?? 0}
      </span>

      {unit && (
        <span className="kpi-unit">
          {unit}
        </span>
      )}

    </div>

    <span className="kpi-sub">
      {subtitle}
    </span>
  </div>
);

// ============================================================
// DASHBOARD RESPONSABLE
// ============================================================

const DashboardResponsable = () => {

  const [stats, setStats] = useState({});
  const [kpi, setKpi] = useState({});
  const [charts, setCharts] = useState({});
  const [todayInterventions, setTodayInterventions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ==========================================================
  // CHARGEMENT DES DONNÉES
  // ==========================================================

  const fetchAllData = useCallback(
    async (isRefresh = false) => {

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {

        const [
          statsRes,
          kpiRes,
          chartsRes,
          todayRes
        ] = await Promise.all([

          api.get('/dashboard/stats'),

          api.get('/dashboard/kpi'),

          api.get('/dashboard/charts'),

          api.get('/dashboard/today-interventions'),

        ]);

        setStats(
          statsRes.data || {}
        );

        setKpi(
          kpiRes.data || {}
        );

        setCharts(
          chartsRes.data || {}
        );

        setTodayInterventions(
          todayRes.data || []
        );

      } catch (error) {

        console.error(
          'Erreur lors du chargement des données du dashboard :',
          error
        );

      } finally {

        setLoading(false);

        setRefreshing(false);
      }
    },
    []
  );

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {

    fetchAllData();

  }, [fetchAllData]);

  // ==========================================================
  // DONNÉES GRAPHIQUE MENSUEL
  // ==========================================================

  const monthlyData = useMemo(() => {

    return (
      charts.interventions_by_month || []
    ).map((item) => {

      const preventive =
        Number(item.preventive || 0);

      const corrective =
        Number(item.corrective || 0);

      return {

        ...item,

        preventive,

        corrective,

        total:
          preventive + corrective,

      };
    });

  }, [charts.interventions_by_month]);

  // ==========================================================
  // INFORMATIONS UTILISATEUR
  // ==========================================================

  const userName =
    localStorage.getItem('user_name') ||
    'Responsable';

  const userInitial =
    userName.trim()
      ? userName
          .trim()
          .charAt(0)
          .toUpperCase()
      : 'R';

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (

      <div className="dashboard-loading">

        <div className="loading-spinner"></div>

        <p>
          Chargement des données analytiques...
        </p>

      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="dashboard-responsable">

      {/* ======================================================
          EN-TÊTE
      ====================================================== */}

      <header className="dash-header">

        <div className="dash-header-title">

          <span className="dash-header-badge">

            <Activity size={12} />

            GMAO Pro

          </span>

          <h1>
            Tableau de bord
          </h1>

          <p>
            Vue d'ensemble opérationnelle & indicateurs clés
          </p>

        </div>

        <div className="dash-header-actions">

          <button
            type="button"
            onClick={() => fetchAllData(true)}
            className={`btn-refresh ${
              refreshing ? 'spinning' : ''
            }`}
            disabled={refreshing}
          >

            <RefreshCw size={15} />

            <span>
              {
                refreshing
                  ? 'Actualisation...'
                  : 'Actualiser'
              }
            </span>

          </button>

          <div className="user-profile-badge">

            <div className="avatar">
              {userInitial}
            </div>

            <div className="user-info">

              <span className="name">
                {userName}
              </span>

              <span className="role">
                Responsable
              </span>

            </div>

          </div>

        </div>

      </header>

      {/* ======================================================
          RANGÉE 1 : STATISTIQUES
      ====================================================== */}

      <div className="stats-grid">

        {/* ÉQUIPEMENTS ACTIFS */}

        <StatCard
          variant="success"
          icon={CheckCircle}
          label="Équipements Actifs"
          value={
            stats.operational_equipments ?? 0
          }
          status="Opérationnel"
        />

        {/* ÉQUIPEMENTS EN PANNE */}

        <StatCard
          variant="danger"
          icon={AlertCircle}
          label="Équipements en Panne"
          value={
            stats.faulty_equipments ?? 0
          }
          status="Critique"
        />

        {/* INTERVENTIONS PRÉVUES */}

        

        {/* INTERVENTIONS EN COURS */}

        <StatCard
          variant="warning"
          icon={Clock}
          label="Interventions en Cours"
          value={
            stats.in_progress_interventions ?? 0
          }
          status="En cours"
        />

        {/* INTERVENTIONS EN RETARD */}

        <StatCard
          variant="danger"
          icon={AlertCircle}
          label="Interventions en Retard"
          value={
            stats.late_interventions ?? 0
          }
          status="À traiter"
        />

        {/* TICKETS OUVERTS */}

        <StatCard
          variant="purple"
          icon={Wrench}
          label="Tickets Ouverts"
          value={
            stats.open_tickets ?? 0
          }
          status="Demandes"
        />

      </div>

      {/* ======================================================
          RANGÉE 2 : PLANNING DU JOUR
      ====================================================== */}

      <section className="dash-panel">

        <div className="panel-header">

          <div>

            <h3>
              Planning du jour
            </h3>

            <p>
              Interventions programmées aujourd'hui
            </p>

          </div>

          <Calendar
            size={18}
            className="panel-icon"
          />

        </div>

        {todayInterventions.length === 0 ? (

          <div className="empty-state">

            <CheckCircle2 size={28} />

            <p>
              Aucune intervention prévue aujourd'hui.
            </p>

          </div>

        ) : (

          <div className="today-table-wrapper">

            <table className="today-table">

              <thead>

                <tr>

                  <th>
                    Heure
                  </th>

                  <th>
                    Équipement
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Statut
                  </th>

                </tr>

              </thead>

              <tbody>

                {todayInterventions.map(
                  (item) => {

                    const statusClass =
                      String(
                        item.status || ''
                      )
                        .toLowerCase()
                        .replace(
                          /\s+/g,
                          '-'
                        );

                    return (

                      <tr key={item.id}>

                        <td className="time-col">
                          {item.time || '—'}
                        </td>

                        <td className="equipment-col">

                          <strong>
                            {
                              item.equipment ||
                              'Équipement'
                            }
                          </strong>

                        </td>

                        <td>

                          <span className="type-badge">

                            {
                              item.type ||
                              '—'
                            }

                          </span>

                        </td>

                        <td>

                          <span
                            className={`status-pill status-${statusClass}`}
                          >

                            {
                              item.status ||
                              '—'
                            }

                          </span>

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

      {/* ======================================================
          RANGÉE 3 : KPI + PRIORITÉS
      ====================================================== */}

      <div className="dashboard-row-2col">

        {/* ====================================================
            KPI
        ==================================================== */}

        <section className="dash-panel">

          <div className="panel-header">

            <div>

              <h3>
                Indicateurs clés
              </h3>

              <p>
                Efficacité opérationnelle
              </p>

            </div>

            <Activity
              size={18}
              className="panel-icon"
            />

          </div>

          <div className="kpi-grid">

            <KpiCard
              title="MTTR"
              value={kpi.mttr}
              unit="h"
              subtitle="Temps moyen de réparation"
              icon={Timer}
            />

            <KpiCard
              title="MTBF"
              value={kpi.mtbf}
              unit="h"
              subtitle="Temps moyen entre pannes"
              icon={Repeat}
            />

            <KpiCard
              title="DISPONIBILITÉ"
              value={kpi.availability_rate}
              unit="%"
              subtitle="Taux d'opération"
              icon={Zap}
            />

            <KpiCard
              title="RÉSOLUTION"
              value={kpi.resolution_rate}
              unit="%"
              subtitle="Tickets résolus"
              icon={Target}
            />

          </div>

        </section>

        {/* ====================================================
            PRIORITÉS
        ==================================================== */}

        <section className="dash-panel">

          <div className="panel-header">

            <div>

              <h3>
                Priorités d'action
              </h3>

              <p>
                Attention requise
              </p>

            </div>

            <ShieldAlert
              size={18}
              className="panel-icon"
            />

          </div>

          <div className="priority-list">

            {/* TICKETS CRITIQUES */}

            <div className="priority-item critical">

              <div className="priority-info">

                <span>
                  Tickets critiques
                </span>

                <p>
                  Non résolus
                </p>

              </div>

              <span className="priority-count">

                {
                  stats.critical_tickets ||
                  0
                }

              </span>

            </div>

            {/* INTERVENTIONS URGENTES */}

            <div className="priority-item urgent">

              <div className="priority-info">

                <span>
                  Interventions urgentes
                </span>

                <p>
                  Sous 24h
                </p>

              </div>

              <span className="priority-count">

                {
                  stats.urgent_interventions ||
                  0
                }

              </span>

            </div>

            {/* PROCHAINS 7 JOURS */}

            <div className="priority-item upcoming">

              <div className="priority-info">

                <span>
                  Prochains 7 jours
                </span>

                <p>
                  Planifiées
                </p>

              </div>

              <span className="priority-count">

                {
                  stats.upcoming_interventions ||
                  0
                }

              </span>

            </div>

          </div>

        </section>

      </div>

      {/* ======================================================
          RANGÉE 4 : ANALYSE
      ====================================================== */}

      <section className="dash-panel">

        <div className="panel-header">

          <div>

            <h3>
              Analyse de l'activité
            </h3>

            <p>
              Répartition des interventions et pannes
            </p>

          </div>

        </div>

        <div className="charts-grid">

          {/* ==================================================
              CHARGE MENSUELLE
          ================================================== */}

          <div className="chart-box">

            <div className="chart-box-header">

              <h4>
                Charge mensuelle
              </h4>

              <span>
                Préventif vs correctif
              </span>

            </div>

            <div className="chart-wrapper">

              <ResponsiveContainer
                width="100%"
                height={200}
              >

                <BarChart
                  data={monthlyData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -25,
                    bottom: 0
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 10,
                      fill: '#64748b'
                    }}
                    axisLine={false}
                  />

                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: '#64748b'
                    }}
                    axisLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border:
                        '1px solid #e2e8f0',
                      boxShadow:
                        '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: '11px',
                      paddingTop: '4px'
                    }}
                  />

                  <Bar
                    dataKey="preventive"
                    stackId="a"
                    fill="#2563eb"
                    name="Préventif"
                  />

                  <Bar
                    dataKey="corrective"
                    stackId="a"
                    fill="#f59e0b"
                    name="Correctif"
                    radius={[
                      4,
                      4,
                      0,
                      0
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* ==================================================
              TYPE DE MAINTENANCE
          ================================================== */}

          <div className="chart-box">

            <div className="chart-box-header">

              <h4>
                Type de maintenance
              </h4>

              <span>
                Répartition des interventions
              </span>

            </div>

            <div className="chart-wrapper">

              <ResponsiveContainer
                width="100%"
                height={200}
              >

                <PieChart>

                  <Pie
                    data={
                      charts.type_distribution ||
                      []
                    }
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                  >

                    {(
                      charts.type_distribution ||
                      []
                    ).map(
                      (entry, index) => (

                        <Cell
                          key={`cell-${index}`}
                          fill={
                            CHART_COLORS[
                              index %
                              CHART_COLORS.length
                            ]
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border:
                        '1px solid #e2e8f0',
                      boxShadow:
                        '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                  />

                </PieChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* ==================================================
              TOP 5 PANNES
          ================================================== */}

          <div className="chart-box">

            <div className="chart-box-header">

              <h4>
                Top 5 équipements impactés
              </h4>

              <span>
                Nombre de pannes
              </span>

            </div>

            <div className="chart-wrapper">

              <ResponsiveContainer
                width="100%"
                height={200}
              >

                <BarChart
                  data={
                    charts.failures_by_equipment ||
                    []
                  }
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 10,
                    left: 0,
                    bottom: 0
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    type="number"
                    tick={{
                      fontSize: 10,
                      fill: '#64748b'
                    }}
                    axisLine={false}
                  />

                  <YAxis
                    dataKey="name"
                    type="category"
                    width={75}
                    tick={{
                      fontSize: 10,
                      fill: '#64748b'
                    }}
                    axisLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border:
                        '1px solid #e2e8f0',
                      boxShadow:
                        '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                  />

                  <Bar
                    dataKey="value"
                    fill="#ef4444"
                    name="Pannes"
                    radius={[
                      0,
                      4,
                      4,
                      0
                    ]}
                    barSize={14}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
};

export default DashboardResponsable;