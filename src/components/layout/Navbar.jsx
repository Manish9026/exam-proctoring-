import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Moon, Sun, Menu } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import './Navbar.css';

const Navbar = () => {
  const { theme, toggleTheme, sidebarCollapsed, toggleMobileSidebar } = useThemeStore();
  const location = useLocation();

  const getPageTitle = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length <= 1) return 'Dashboard';
    const last = segments[segments.length - 1];
    if (last === 'candidate') return 'Dashboard';
    return last
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <header className={`navbar ${sidebarCollapsed ? 'navbar--collapsed' : 'navbar--with-sidebar'}`}>
      <div className="navbar__left">
        <button className="navbar__mobile-toggle" onClick={toggleMobileSidebar}>
          <Menu size={20} />
        </button>
        <h1 className="navbar__title">{getPageTitle()}</h1>
      </div>

      <div className="navbar__right">
        <div className="navbar__search">
          <Search size={16} className="navbar__search-icon" />
          <input type="text" placeholder="Search..." />
        </div>

        <div className="navbar__divider" />

        <button className="navbar__icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="navbar__icon-btn" title="Notifications">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
