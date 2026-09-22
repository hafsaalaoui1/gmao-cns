import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  User,
  Monitor,
  Database,
  CheckCircle2,
  Sun,
  Moon,
  Languages,
  ShieldCheck,
  Check,
  Smartphone,
  Mail,
  Sliders,
  Server
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('general');
  const [theme, setTheme] = useState(
    localStorage.getItem('gmao_theme') || 'light'
  );

  const [language, setLanguage] = useState(
    localStorage.getItem('gmao_language') || 'fr'
  );

  const [notifs, setNotifs] = useState({
    interventions: true,
    tickets: true,
    email: true,
    push: false,
  });

  const toggleNotif = (key) => {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* =========================================================
     TRADUCTIONS
  ========================================================= */

  const translations = {
    fr: {
      settings: 'Paramètres système',
      subtitle: 'Gérez la configuration et les préférences de votre espace GMAO CNS',
      general: 'Général',
      notifications: 'Notifications & Alertes',

      application: 'Informations Application',
      applicationName: 'GMAO CNS - ONDA',
      version: 'Version 1.0.0',
      environment: 'Environnement',
      production: 'Production',

      account: 'Compte utilisateur',
      name: 'Nom complet',
      email: 'Adresse email',
      role: 'Rôle d\'accès',
      administrator: 'Administrateur',
      responsable: 'Responsable',
      intervenant: 'Intervenant',

      appearance: 'Apparence & Région',
      theme: 'Thème d\'affichage',
      light: 'Clair',
      dark: 'Sombre',

      language: 'Langue de l\'interface',
      french: 'Français',
      english: 'English',
      arabic: 'العربية',

      timezone: 'Fuseau horaire',
      morocco: 'Afrique/Casablanca (GMT+1)',

      backendNotifications: 'Canaux de notification',
      backendDescription: 'Les notifications système sont traitées et distribuées par le serveur Laravel.',

      interventions: 'Alertes d\'interventions',
      interventionsDescription: 'Notifications pour interventions planifiées, rappels et changements de statut.',

      tickets: 'Suivi des tickets',
      ticketsDescription: 'Mises à jour instantanées sur la création, l\'affectation et le traitement des tickets.',

      emailNotifs: 'Notifications par email',
      emailDescription: 'Recevoir un récapitulatif des interventions critiques par courrier électronique.',

      pushNotifs: 'Notifications Push web',
      pushDescription: 'Recevoir des alertes visuelles directement sur votre navigateur.',

      active: 'Opérationnel',
      backendConnected: 'Serveur synchronisé',

      information: 'Infra & Technique',
      frontend: 'Interface Frontend',
      backend: 'API Backend',
      database: 'Base de données',
      mysql: 'MySQL 8.0',
    },

    en: {
      settings: 'System Settings',
      subtitle: 'Manage configuration and preferences for your GMAO CNS workspace',
      general: 'General',
      notifications: 'Notifications & Alerts',

      application: 'Application Information',
      applicationName: 'GMAO CNS - ONDA',
      version: 'Version 1.0.0',
      environment: 'Environment',
      production: 'Production',

      account: 'User Account',
      name: 'Full Name',
      email: 'Email Address',
      role: 'Access Role',
      administrator: 'Administrator',
      responsable: 'Manager',
      intervenant: 'Technician',

      appearance: 'Appearance & Region',
      theme: 'Display Theme',
      light: 'Light',
      dark: 'Dark',

      language: 'Language',
      french: 'French',
      english: 'English',
      arabic: 'Arabic',

      timezone: 'Timezone',
      morocco: 'Africa/Casablanca (GMT+1)',

      backendNotifications: 'Notification Channels',
      backendDescription: 'System notifications are processed and delivered by the Laravel backend.',

      interventions: 'Intervention Alerts',
      interventionsDescription: 'Notifications for scheduled interventions, reminders, and status changes.',

      tickets: 'Ticket Tracking',
      ticketsDescription: 'Instant updates on ticket creation, assignment, and processing.',

      emailNotifs: 'Email Notifications',
      emailDescription: 'Receive summaries of critical interventions by email.',

      pushNotifs: 'Web Push Notifications',
      pushDescription: 'Receive visual pop-up alerts directly in your browser.',

      active: 'Operational',
      backendConnected: 'Server Synchronized',

      information: 'Infra & Tech Stack',
      frontend: 'Frontend Interface',
      backend: 'Backend API',
      database: 'Database Engine',
      mysql: 'MySQL 8.0',
    },

    ar: {
      settings: 'إعدادات النظام',
      subtitle: 'إدارة إعدادات وتفضيلات مساحة العمل GMAO CNS',
      general: 'عام',
      notifications: 'الإشعارات والتنبيهات',

      application: 'معلومات التطبيق',
      applicationName: 'GMAO CNS - ONDA',
      version: 'الإصدار 1.0.0',
      environment: 'بيئة العمل',
      production: 'الإنتاج',

      account: 'حساب المستخدم',
      name: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      role: 'الصلاحية',
      administrator: 'مسؤول',
      responsable: 'مسؤول الصيانة',
      intervenant: 'تقني متدخل',

      appearance: 'المظهر والمنطقة',
      theme: 'نمط العرض',
      light: 'فاتح',
      dark: 'داكن',

      language: 'اللغة',
      french: 'الفرنسية',
      english: 'الإنجليزية',
      arabic: 'العربية',

      timezone: 'المنطقة الزمنية',
      morocco: 'Africa/Casablanca (GMT+1)',

      backendNotifications: 'قنوات الإشعارات',
      backendDescription: 'يتم معالجة وإرسال إشعارات النظام مباشرة عبر الخادم.',

      interventions: 'تنبيهات التدخلات',
      interventionsDescription: 'إشعارات التدخلات المبرمجة والتذكيرات وتغييرات الحالة.',

      tickets: 'متابعة التذاكر',
      ticketsDescription: 'تحديثات فورية حول إنشاء التذاكر وتعيينها ومراحل معالجتها.',

      emailNotifs: 'إشعارات البريد الإلكتروني',
      emailDescription: 'تلقي ملخص للتدخلات الهامة عبر البريد الإلكتروني.',

      pushNotifs: 'إشعارات المتصفح (Push)',
      pushDescription: 'تلقي تنبيهات منبثقة مباشرة على المتصفح الخاص بك.',

      active: 'يعمل',
      backendConnected: 'متصل بالخادم',

      information: 'البنية التحتية والتقنية',
      frontend: 'واجهة المستخدم',
      backend: 'الخادم الخلفي',
      database: 'قاعدة البيانات',
      mysql: 'MySQL 8.0',
    },
  };

  const t = translations[language] || translations.fr;

  /* =========================================================
     EFFECTS
  ========================================================= */

  useEffect(() => {
    localStorage.setItem('gmao_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f8fafc';
    } else {
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('gmao_language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return t.administrator;
      case 'responsable':
        return t.responsable;
      case 'intervenant':
        return t.intervenant;
      default:
        return role || '-';
    }
  };

  /* =========================================================
     STYLES DYNAMIQUES EN JSX
  ========================================================= */

  const isDark = theme === 'dark';

  const colors = {
    bg: isDark ? '#0f172a' : '#f8fafc',
    cardBg: isDark ? '#1e293b' : '#ffffff',
    border: isDark ? '#334155' : '#e2e8f0',
    textMain: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    primary: isDark ? '#3b82f6' : '#2563eb',
    primaryLight: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
    success: isDark ? '#22c55e' : '#16a34a',
    successBg: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4',
    tabBg: isDark ? '#334155' : '#f1f5f9',
  };

  const styles = {
    wrapper: {
      minHeight: '100vh',
      backgroundColor: colors.bg,
      color: colors.textMain,
      padding: '32px 24px',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'all 0.3s ease',
    },
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '28px',
      flexWrap: 'wrap',
      gap: '16px',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    headerIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      backgroundColor: colors.primary,
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
    },
    title: {
      fontSize: '24px',
      fontWeight: 700,
      margin: 0,
    },
    subtitle: {
      fontSize: '14px',
      color: colors.textMuted,
      margin: '4px 0 0 0',
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 14px',
      borderRadius: '99px',
      backgroundColor: colors.successBg,
      color: colors.success,
      fontSize: '13px',
      fontWeight: 600,
      border: `1px solid ${colors.success}33`,
    },
    statusDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: colors.success,
    },
    tabsNav: {
      display: 'inline-flex',
      backgroundColor: colors.tabBg,
      padding: '4px',
      borderRadius: '12px',
      marginBottom: '28px',
      gap: '4px',
    },
    tabBtn: (active) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: active ? colors.cardBg : 'transparent',
      color: active ? colors.primary : colors.textMuted,
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      boxShadow: active ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
      transition: 'all 0.2s ease',
    }),
    grid: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    card: {
      backgroundColor: colors.cardBg,
      border: `1px solid ${colors.border}`,
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px',
    },
    cardIcon: {
      width: '38px',
      height: '38px',
      borderRadius: '10px',
      backgroundColor: colors.primaryLight,
      color: colors.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: '17px',
      fontWeight: 600,
      margin: 0,
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
    },
    infoBox: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '14px 16px',
      backgroundColor: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: '10px',
    },
    techBox: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 16px',
      backgroundColor: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: '10px',
    },
    infoLabel: {
      fontSize: '12px',
      color: colors.textMuted,
      fontWeight: 500,
    },
    infoValue: {
      fontSize: '14px',
      color: colors.textMain,
      wordBreak: 'break-word',
    },
    rolePill: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      fontWeight: 600,
      color: colors.primary,
    },
    settingRow: (isLast) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px',
      padding: '18px 0',
      borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
      flexWrap: 'wrap',
    }),
    rowInfo: {
      flex: 1,
      minWidth: '250px',
    },
    flexRowCenter: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    },
    rowTitle: {
      fontSize: '15px',
      fontWeight: 600,
      margin: 0,
    },
    rowDesc: {
      fontSize: '13px',
      color: colors.textMuted,
      margin: '4px 0 0 0',
      lineHeight: 1.4,
    },
    themeSelector: {
      display: 'flex',
      gap: '10px',
    },
    themeOption: (isSelected) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 18px',
      borderRadius: '10px',
      border: `1px solid ${isSelected ? colors.primary : colors.border}`,
      backgroundColor: isSelected ? colors.primaryLight : colors.cardBg,
      color: isSelected ? colors.primary : colors.textMain,
      fontSize: '13px',
      fontWeight: isSelected ? 600 : 500,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
    select: {
      padding: '10px 16px',
      borderRadius: '10px',
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.bg,
      color: colors.textMain,
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
      minWidth: '150px',
    },
    banner: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      padding: '16px 20px',
      backgroundColor: colors.primaryLight,
      border: `1px solid ${colors.primary}33`,
      borderRadius: '12px',
    },
    switchTrack: (checked) => ({
      width: '46px',
      height: '24px',
      borderRadius: '34px',
      backgroundColor: checked ? colors.primary : colors.border,
      position: 'relative',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
      display: 'inline-block',
      flexShrink: 0,
    }),
    switchThumb: (checked) => ({
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      backgroundColor: '#ffffff',
      position: 'absolute',
      top: '3px',
      left: checked ? '25px' : '3px',
      transition: 'left 0.3s ease',
    }),
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        
        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <Sliders size={24} />
            </div>
            <div>
              <h1 style={styles.title}>{t.settings}</h1>
              <p style={styles.subtitle}>{t.subtitle}</p>
            </div>
          </div>
          <div style={styles.statusBadge}>
            <span style={styles.statusDot}></span>
            {t.backendConnected}
          </div>
        </header>

        {/* NAVIGATION TABS */}
        <nav style={styles.tabsNav}>
          <button
            onClick={() => setActiveTab('general')}
            style={styles.tabBtn(activeTab === 'general')}
          >
            <SettingsIcon size={18} />
            <span>{t.general}</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            style={styles.tabBtn(activeTab === 'notifications')}
          >
            <Bell size={18} />
            <span>{t.notifications}</span>
          </button>
        </nav>

        {/* TAB 1: GENERAL */}
        {activeTab === 'general' && (
          <div style={styles.grid}>
            
            {/* ACCOUNT CARD */}
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>
                  <User size={20} />
                </div>
                <h2 style={styles.cardTitle}>{t.account}</h2>
              </div>

              <div style={styles.infoGrid}>
                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>{t.name}</span>
                  <span style={{ ...styles.infoValue, fontWeight: 600 }}>{user?.name || '-'}</span>
                </div>

                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>{t.email}</span>
                  <span style={styles.infoValue}>{user?.email || '-'}</span>
                </div>

                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>{t.role}</span>
                  <span style={styles.rolePill}>
                    <ShieldCheck size={14} />
                    {getRoleLabel(user?.role)}
                  </span>
                </div>
              </div>
            </section>

            {/* APPEARANCE CARD */}
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>
                  <Sun size={20} />
                </div>
                <h2 style={styles.cardTitle}>{t.appearance}</h2>
              </div>

              {/* Theme Selector */}
              <div style={styles.settingRow(false)}>
                <div style={styles.rowInfo}>
                  <h3 style={styles.rowTitle}>{t.theme}</h3>
                  <p style={styles.rowDesc}>Choisissez l'apparence visuelle adaptée à votre environnement de travail.</p>
                </div>

                <div style={styles.themeSelector}>
                  <button
                    onClick={() => setTheme('light')}
                    style={styles.themeOption(theme === 'light')}
                  >
                    <Sun size={18} />
                    <span>{t.light}</span>
                    {theme === 'light' && <Check size={14} />}
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    style={styles.themeOption(theme === 'dark')}
                  >
                    <Moon size={18} />
                    <span>{t.dark}</span>
                    {theme === 'dark' && <Check size={14} />}
                  </button>
                </div>
              </div>

              {/* Language Selector */}
              <div style={styles.settingRow(true)}>
                <div style={{ ...styles.rowInfo, ...styles.flexRowCenter }}>
                  <Languages size={20} color={colors.primary} />
                  <div>
                    <h3 style={styles.rowTitle}>{t.language}</h3>
                    <p style={styles.rowDesc}>Langue utilisée dans les menus et tableaux de bord.</p>
                  </div>
                </div>

                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={styles.select}
                >
                  <option value="fr">{t.french}</option>
                  <option value="en">{t.english}</option>
                  <option value="ar">{t.arabic}</option>
                </select>
              </div>
            </section>

            {/* APPLICATION CARD */}
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>
                  <Monitor size={20} />
                </div>
                <h2 style={styles.cardTitle}>{t.application}</h2>
              </div>

              <div style={styles.infoGrid}>
                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>{t.application}</span>
                  <span style={styles.infoValue}>{t.applicationName}</span>
                </div>

                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>Version</span>
                  <span style={styles.infoValue}>v1.0.0</span>
                </div>

                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>{t.environment}</span>
                  <span style={{ ...styles.infoValue, color: colors.primary, fontWeight: 600 }}>
                    {t.production}
                  </span>
                </div>

                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>{t.timezone}</span>
                  <span style={styles.infoValue}>{t.morocco}</span>
                </div>
              </div>
            </section>

            {/* TECH STACK CARD */}
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>
                  <Database size={20} />
                </div>
                <h2 style={styles.cardTitle}>{t.information}</h2>
              </div>

              <div style={styles.infoGrid}>
                <div style={styles.techBox}>
                  <Monitor size={18} color={colors.primary} />
                  <div>
                    <span style={styles.infoLabel}>{t.frontend}</span>
                    <div style={styles.infoValue}>React.js</div>
                  </div>
                </div>

                <div style={styles.techBox}>
                  <Server size={18} color={colors.primary} />
                  <div>
                    <span style={styles.infoLabel}>{t.backend}</span>
                    <div style={styles.infoValue}>Laravel API</div>
                  </div>
                </div>

                <div style={styles.techBox}>
                  <Database size={18} color={colors.primary} />
                  <div>
                    <span style={styles.infoLabel}>{t.database}</span>
                    <div style={styles.infoValue}>{t.mysql}</div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        )}

        {/* TAB 2: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div style={styles.grid}>
            
            <div style={styles.banner}>
              <CheckCircle2 size={22} color={colors.primary} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{t.backendConnected}</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textMuted }}>
                  {t.backendDescription}
                </p>
              </div>
            </div>

            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>
                  <Bell size={20} />
                </div>
                <h2 style={styles.cardTitle}>{t.backendNotifications}</h2>
              </div>

              {/* Interventions */}
              <div style={styles.settingRow(false)}>
                <div style={{ ...styles.rowInfo, ...styles.flexRowCenter }}>
                  <Bell size={20} color={colors.primary} />
                  <div>
                    <h3 style={styles.rowTitle}>{t.interventions}</h3>
                    <p style={styles.rowDesc}>{t.interventionsDescription}</p>
                  </div>
                </div>
                <div
                  style={styles.switchTrack(notifs.interventions)}
                  onClick={() => toggleNotif('interventions')}
                >
                  <div style={styles.switchThumb(notifs.interventions)} />
                </div>
              </div>

              {/* Tickets */}
              <div style={styles.settingRow(false)}>
                <div style={{ ...styles.rowInfo, ...styles.flexRowCenter }}>
                  <Bell size={20} color={colors.primary} />
                  <div>
                    <h3 style={styles.rowTitle}>{t.tickets}</h3>
                    <p style={styles.rowDesc}>{t.ticketsDescription}</p>
                  </div>
                </div>
                <div
                  style={styles.switchTrack(notifs.tickets)}
                  onClick={() => toggleNotif('tickets')}
                >
                  <div style={styles.switchThumb(notifs.tickets)} />
                </div>
              </div>

              {/* Email */}
              
              {/* Push */}
              

            </section>

          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;