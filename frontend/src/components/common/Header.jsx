import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './Header.css';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'light'
  );

  // =========================
  // NOTIFICATIONS
  // =========================
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const notificationRef = useRef(null);

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : 'A';

  // =========================
  // THEME
  // =========================
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  // =========================
  // RECUPERER NOMBRE NOTIFICATIONS
  // =========================
  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data?.count || 0);
    } catch (error) {
      console.error('Erreur récupération nombre notifications :', error);
    }
  };

  // =========================
  // RECUPERER NOTIFICATIONS
  // =========================
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoadingNotifications(true);
      const response = await api.get('/notifications');
      const data = response.data?.data || [];
      setNotifications(data);
    } catch (error) {
      console.error('Erreur récupération notifications :', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const toggleNotifications = async () => {
    const newState = !showNotifications;
    setShowNotifications(newState);
    if (newState) {
      await fetchNotifications();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const markAsRead = async (notification) => {
    try {
      if (!notification.read_at) {
        await api.put(`/notifications/${notification.id}/read`);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id
              ? { ...item, read_at: new Date().toISOString() }
              : item
          )
        );
        setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
      }
    } catch (error) {
      console.error('Erreur marquage notification :', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read_at: notification.read_at || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur marquage toutes notifications :', error);
    }
  };

  const deleteNotification = async (notificationId, event) => {
    event.stopPropagation();
    try {
      const notification = notifications.find((item) => item.id === notificationId);
      await api.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
      if (notification && !notification.read_at) {
        setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
      }
    } catch (error) {
      console.error('Erreur suppression notification :', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification);
    setShowNotifications(false);

    if (notification.type === 'intervention' && notification.related_id) {
      navigate(`/interventions/${notification.related_id}`);
      return;
    }
    if (notification.type === 'ticket' && notification.related_id) {
      navigate(`/tickets/${notification.related_id}`);
      return;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'intervention': return '🔧';
      case 'ticket': return '🎫';
      case 'planning': return '📅';
      case 'maintenance': return '🛠️';
      case 'alert': return '⚠️';
      default: return '🔔';
    }
  };

  const getNotificationTime = (date) => {
    if (!date) return '';
    const notificationDate = new Date(date);
    const now = new Date();
    const difference = now.getTime() - notificationDate.getTime();
    const minutes = Math.floor(difference / (1000 * 60));

    if (minutes < 1) return 'À l’instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days} j`;

    return notificationDate.toLocaleDateString('fr-FR');
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">
          GMAO CNS
          <span className="service-badge">
            Service Radar & Radionavigation
          </span>
        </h1>
      </div>

      <div className="header-right">
        {/* BOUTON THEME */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          type="button"
        >
          {theme === 'dark' ? (
            <svg className="theme-icon sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg className="theme-icon moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>

        {/* NOTIFICATIONS */}
        <div className="notification-wrapper" ref={notificationRef}>
          <button
            type="button"
            className="notification-button"
            onClick={toggleNotifications}
            title="Notifications"
          >
            <svg className="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>

            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <div>
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <span>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button type="button" className="mark-all-button" onClick={markAllAsRead}>
                    Tout lire
                  </button>
                )}
              </div>

              <div className="notification-list">
                {loadingNotifications ? (
                  <div className="notification-empty">
                    <div className="notification-loader"></div>
                    <p>Chargement...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty">
                    <div className="empty-notification-icon">🔔</div>
                    <p>Aucune notification</p>
                    <span>Vous êtes à jour.</span>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${!notification.read_at ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="notification-item-icon">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="notification-item-content">
                        <div className="notification-item-top">
                          <strong>{notification.title}</strong>
                          {!notification.read_at && <span className="unread-dot"></span>}
                        </div>
                        <p>{notification.message}</p>
                        <span className="notification-time">
                          {getNotificationTime(notification.created_at)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="notification-delete"
                        title="Supprimer"
                        onClick={(event) => deleteNotification(notification.id, event)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* PROFIL UTILISATEUR */}
        <div className="user-profile-card">
          <div className="user-avatar-circle">
            {userInitial}
          </div>
          <div className="user-details">
            <span className="user-name">
              {user?.name || 'Ahmed'}
            </span>
            <span className="user-status">
              <span className="status-dot"></span>
              En ligne
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;