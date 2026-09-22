import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';
import Login from './components/auth/Login';

import './components/equipments/EquipmentsList.css';

// ===== ADMIN =====
import DashboardAdmin from './components/dashboard/DashboardAdmin';
import UserList from './components/users/UserList';
import UserForm from './components/users/UserForm';
import Logs from './components/logs/Logs';
import Settings from './components/settings/Settings';
import GroupDetails from './components/groups/GroupDetails';

// ===== RESPONSABLE & INTERVENANT =====
import DashboardResponsable from './components/dashboard/DashboardResponsable';
import DashboardIntervenant from './components/dashboard/DashboardIntervenant';

// ===== ÉQUIPEMENTS =====
import EquipmentsList from './components/equipments/EquipmentsList';
import EquipmentForm from './components/equipments/EquipmentForm';
import EquipmentDetails from './components/equipments/EquipmentDetails';
import EquipmentHierarchy from './components/equipments/EquipmentHierarchy';

// ===== GROUPES =====
import GroupsList from './components/groups/GroupsList';
import GroupForm from './components/groups/GroupForm';

// ===== PLANNING & INTERVENTIONS =====
import PlanningGlobal from './components/planning/PlanningGlobal';
import InterventionsList from './components/interventions/InterventionsList';
import InterventionForm from './components/interventions/InterventionForm';
import MyInterventions from './components/interventions/MyInterventions';
import InterventionDetails from './components/interventions/InterventionDetail';
import PlanningHebdomadaire from './components/planning/PlanningHebdomadaire';

// ===== TICKETS =====
import TicketForm from './components/tickets/TicketForm';
import TicketDetails from './components/tickets/TicketDetails';
import TicketsList from './components/tickets/TicketsList.jsx';

// ===== RELEVÉS =====
import RelevesAValider from './components/readings/RelevesAValider';
import CreateCanvasForm from './components/readings/CreateCanvasForm';
import CanvasList from './components/readings/CanvasList';
import HistoriqueReleves from './components/readings/HistoriqueReleves';

// ===== STOCK =====
import PartsList from './components/parts/PartsList';
import PartForm from './components/parts/PartForm';

// ===== PLANNING TEMPLATES =====
import PlanningTemplateForm from './components/planning/PlanningTemplateForm';

import './App.css';

// ============================================================
// LAYOUT
// ============================================================

const PageWithLayout = ({ children }) => (
  <Layout>
    {children}
  </Layout>
);

// ============================================================
// DASHBOARD SELON LE RÔLE
// ============================================================

const DashboardPage = () => {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return (
      <ProtectedRoute>
        <PageWithLayout>
          <DashboardAdmin />
        </PageWithLayout>
      </ProtectedRoute>
    );
  }

  if (user?.role === 'responsable') {
    return (
      <ProtectedRoute>
        <PageWithLayout>
          <DashboardResponsable />
        </PageWithLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageWithLayout>
        <DashboardIntervenant />
      </PageWithLayout>
    </ProtectedRoute>
  );
};

// ============================================================
// LOGIN
// ============================================================

const LoginPage = () => <Login />;

// ============================================================
// REDIRECTION HOME
// ============================================================

const HomeRedirect = () => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/login" replace />;
};

// ============================================================
// APP
// ============================================================

function App() {
  return (
    <AuthProvider>
      <Router>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff'
            }
          }}
        />

        <Routes>

          {/* ==================================================
              HOME / AUTH
          ================================================== */}

          <Route
            path="/"
            element={<HomeRedirect />}
          />

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          {/* ==================================================
              ADMIN
          ================================================== */}

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PageWithLayout>
                  <UserList />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users/create"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PageWithLayout>
                  <UserForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PageWithLayout>
                  <UserForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/logs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PageWithLayout>
                  <Logs />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PageWithLayout>
                  <Settings />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================================================
              ÉQUIPEMENTS
          ================================================== */}

          <Route
            path="/equipments"
            element={
              <ProtectedRoute>
                <PageWithLayout>
                  <EquipmentsList />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/equipments/new"
            element={
              <ProtectedRoute allowedRoles={['responsable', 'admin']}>
                <PageWithLayout>
                  <EquipmentForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/equipments/:id"
            element={
              <ProtectedRoute>
                <PageWithLayout>
                  <EquipmentDetails />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/equipments/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['responsable', 'admin']}>
                <PageWithLayout>
                  <EquipmentForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/equipment-structure"
            element={
              <ProtectedRoute allowedRoles={['responsable', 'admin']}>
                <PageWithLayout>
                  <EquipmentHierarchy />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================================================
              GROUPES
          ================================================== */}

          <Route
            path="/groups"
            element={
              <ProtectedRoute allowedRoles={['responsable', 'admin']}>
                <PageWithLayout>
                  <GroupsList />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/groups/new"
            element={
              <ProtectedRoute allowedRoles={['responsable', 'admin']}>
                <PageWithLayout>
                  <GroupForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/groups/:id"
            element={
              <ProtectedRoute allowedRoles={['responsable', 'admin']}>
                <PageWithLayout>
                  <GroupDetails />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/groups/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['responsable', 'admin']}>
                <PageWithLayout>
                  <GroupForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================================================
              PLANNING
          ================================================== */}

          <Route
            path="/planning-global"
            element={
              <ProtectedRoute allowedRoles={['responsable', 'admin']}>
                <PageWithLayout>
                  <PlanningHebdomadaire />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================================================
              INTERVENTIONS
          ================================================== */}

          <Route
            path="/interventions/:id"
            element={
              <ProtectedRoute>
                <PageWithLayout>
                  <InterventionDetails />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/interventions"
            element={
              <ProtectedRoute allowedRoles={['responsable', 'admin']}>
                <PageWithLayout>
                  <InterventionsList />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/interventions/new"
            element={
              <ProtectedRoute allowedRoles={['responsable', 'admin']}>
                <PageWithLayout>
                  <InterventionForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/interventions/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['responsable', 'admin']}>
                <PageWithLayout>
                  <InterventionForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================================================
              TICKETS
          ================================================== */}

          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <PageWithLayout>
                  <TicketsList />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* IMPORTANT :
              /tickets/new et /tickets/create doivent être
              déclarées avant /tickets/:id
          */}

          <Route
            path="/tickets/new"
            element={
              <ProtectedRoute>
                <PageWithLayout>
                  <TicketForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets/create"
            element={
              <ProtectedRoute>
                <PageWithLayout>
                  <TicketForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets/:id/edit"
            element={
              <ProtectedRoute>
                <PageWithLayout>
                  <TicketForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets/:id"
            element={
              <ProtectedRoute>
                <PageWithLayout>
                  <TicketDetails />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================================================
              RELEVÉS
          ================================================== */}

          <Route
            path="/readings/to-validate"
            element={
              <ProtectedRoute
                allowedRoles={['responsable', 'admin']}
              >
                <PageWithLayout>
                  <RelevesAValider />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/readings/canvases"
            element={
              <ProtectedRoute
                allowedRoles={['responsable', 'admin']}
              >
                <PageWithLayout>
                  <CanvasList />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/readings/canvases/new"
            element={
              <ProtectedRoute
                allowedRoles={['responsable', 'admin']}
              >
                <PageWithLayout>
                  <CreateCanvasForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/readings/canvases/:id"
            element={
              <ProtectedRoute
                allowedRoles={['responsable', 'admin']}
              >
                <PageWithLayout>
                  <CreateCanvasForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/readings/canvases/:id/edit"
            element={
              <ProtectedRoute
                allowedRoles={['responsable', 'admin']}
              >
                <PageWithLayout>
                  <CreateCanvasForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================================================
              HISTORIQUE DES RELEVÉS
          ================================================== */}

          <Route
            path="/readings/history"
            element={
              <ProtectedRoute
                allowedRoles={[
                  'responsable',
                  'intervenant',
                  'admin'
                ]}
              >
                <PageWithLayout>
                  <HistoriqueReleves />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================================================
              PLANNING TEMPLATES
          ================================================== */}

          <Route
            path="/planning-templates/new"
            element={
              <ProtectedRoute
                allowedRoles={['responsable', 'admin']}
              >
                <PageWithLayout>
                  <PlanningTemplateForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/planning-templates/:id/edit"
            element={
              <ProtectedRoute
                allowedRoles={['responsable', 'admin']}
              >
                <PageWithLayout>
                  <PlanningTemplateForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================================================
              STOCK
          ================================================== */}

          <Route
            path="/parts"
            element={
              <ProtectedRoute
                allowedRoles={['responsable', 'admin']}
              >
                <PageWithLayout>
                  <PartsList />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/parts/new"
            element={
              <ProtectedRoute
                allowedRoles={['responsable', 'admin']}
              >
                <PageWithLayout>
                  <PartForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/parts/:id/edit"
            element={
              <ProtectedRoute
                allowedRoles={['responsable', 'admin']}
              >
                <PageWithLayout>
                  <PartForm />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================================================
              MES INTERVENTIONS
          ================================================== */}

          <Route
            path="/my-interventions"
            element={
              <ProtectedRoute>
                <PageWithLayout>
                  <MyInterventions />
                </PageWithLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================================================
              ROUTE INCONNUE
          ================================================== */}

          <Route
            path="*"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

        </Routes>

      </Router>
    </AuthProvider>
  );
}

export default App;