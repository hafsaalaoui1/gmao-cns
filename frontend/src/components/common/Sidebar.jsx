import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Wrench,
  Calendar,
  Ticket,
  ClipboardCheck,
  Package,
  LogOut,
  History,
  Plane,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import './Sidebar.css';

const Sidebar = () => {
  const { user, isAdmin, isResponsable, logout } = useAuth();
  const location = useLocation();

  // État pour réduire/agrandir le menu (icônes seules)
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path) => location.pathname === path;

  const getMenuGroups = () => {
    if (isAdmin) {
      return [
        {
          title: 'Admin',
          items: [
            { label: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard },
            { label: 'Utilisateurs', path: '/users', icon: Users },
            { label: 'Logs système', path: '/logs', icon: FileText },
            { label: 'Paramètres', path: '/settings', icon: Settings },
           
          ]
        }
      ];
    }

    if (isResponsable) {
      return [
        {
          title: 'Général',
          items: [
            { label: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard },
            { label: 'Planning global', path: '/planning-global', icon: Calendar }
          ]
        },
        {
          title: 'Maintenance',
          items: [
            { label: 'Équipements', path: '/equipments', icon: Wrench },
            { label: 'Tickets', path: '/tickets', icon: Ticket },
            { label: 'Interventions', path: '/my-interventions', icon: ClipboardCheck },
            
          ]
        },
        {
          title: 'Relevés',
          items: [
            { label: 'Canvas relevés', path: '/readings/canvases', icon: FileText },
            { label: 'A valider', path: '/readings/to-validate', icon: ClipboardCheck },
            { label: 'Historique', path: '/readings/history', icon: History },
            { label: 'Groupes', path: '/groups', icon: Users }
          ]
        }
      ];
    }

    // Intervenant
    return [
      {
        title: 'Général',
        items: [
          { label: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard },
          
        ]
      },
      {
        title: 'Mes Tâches',
        items: [
          { label: ' Mes interventions', path: '/my-interventions', icon: ClipboardCheck },
          { label: 'Tickets', path: '/tickets', icon: Ticket },
          { label: 'Équipements', path: '/equipments', icon: Wrench },
          { label: 'Historique', path: '/readings/history', icon: History }
        ]
      }
    ];
  };

  const menuGroups = getMenuGroups();

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* BRAND & TOGGLE */}
      <div className="sidebar-brand">
        {!isCollapsed && (
          <div className="brand-left">
            <div className="brand-icon-wrapper">
              <Plane size={18} />
            </div>
            <div className="brand-info">
              <span className="brand-title">GMAO CNS</span>
              <span className="brand-version">v1.0 Pro</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="btn-toggle-sidebar"
          title={isCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* LISTE DES MENUS */}
      <div className="sidebar-menu-wrapper">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="sidebar-group">
            {!isCollapsed && group.title && (
              <span className="sidebar-group-title">{group.title}</span>
            )}
            <ul className="sidebar-menu">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`sidebar-link ${active ? 'active' : ''}`}
                      title={isCollapsed ? item.label : ''}
                    >
                      <span className="sidebar-icon">
                        <Icon size={18} />
                      </span>
                      {!isCollapsed && (
                        <span className="sidebar-label">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* FOOTER USER & BOUTON DÉCONNEXION */}
      <div className="sidebar-footer">
        <div className="sidebar-user" title={isCollapsed ? user?.name : ''}>
          <div className="sidebar-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!isCollapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || 'Utilisateur'}</span>
              <span className="sidebar-user-role">{user?.role || 'Opérateur'}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={logout}
          className="sidebar-logout"
          title="Déconnexion"
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;