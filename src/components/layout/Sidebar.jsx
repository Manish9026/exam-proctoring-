import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Shield, Users, FileText, BarChart3, Settings, 
  Monitor, AlertTriangle, Clock, Brain, Video, Bell,
  ChevronLeft, ChevronRight, LogOut, Eye
} from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import './Sidebar.css';

const adminNav = [
  { section: 'Overview', items: [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/monitoring', icon: Monitor, label: 'Live Monitoring', badge: 3 },
  ]},
  { section: 'Management', items: [
    { path: '/admin/exams', icon: FileText, label: 'Exams' },
    { path: '/admin/candidates', icon: Users, label: 'Candidates' },
  ]},
  { section: 'AI & Security', items: [
    { path: '/admin/violations', icon: AlertTriangle, label: 'Violations', badge: 7 },
    { path: '/admin/risk-analytics', icon: Brain, label: 'Risk Analytics' },
    { path: '/admin/recordings', icon: Video, label: 'Recordings' },
  ]},
  { section: 'System', items: [
    { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ]},
];

const candidateNav = [
  { section: 'Exam', items: [
    { path: '/candidate', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/candidate/exams', icon: FileText, label: 'My Exams' },
    { path: '/candidate/results', icon: BarChart3, label: 'Results' },
  ]},
  { section: 'Account', items: [
    { path: '/candidate/profile', icon: Users, label: 'Profile' },
    { path: '/candidate/settings', icon: Settings, label: 'Settings' },
  ]},
];

const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebar } = useThemeStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const role = user?.role || 'candidate';
  const navConfig = role === 'admin' ? adminNav : candidateNav;

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <Shield size={20} />
        </div>
        <span className="sidebar__brand-text gradient-text">ProctorAI</span>
      </div>

      <nav className="sidebar__nav">
        {navConfig.map((section) => (
          <div key={section.section}>
            <div className="sidebar__section-title">{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin' || item.path === '/candidate'}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
              >
                <span className="sidebar__link-icon"><item.icon size={18} /></span>
                <span>{item.label}</span>
                {item.badge && <span className="sidebar__link-badge">{item.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user" onClick={logout}>
          <div className="sidebar__avatar">
            {user?.full_name?.charAt(0) || user?.first_name?.charAt(0) || 'U'}
          </div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{user?.full_name || user?.username || 'User'}</div>
            <div className="sidebar__user-role">{role}</div>
          </div>
        </div>
      </div>

      <button
        onClick={toggleSidebar}
        style={{
          position: 'absolute',
          right: '-12px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          color: 'var(--text-tertiary)',
        }}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
};

export default Sidebar;
