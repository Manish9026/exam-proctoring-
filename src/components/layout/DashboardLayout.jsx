import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import useThemeStore from '../../store/themeStore';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { sidebarCollapsed } = useThemeStore();

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'dashboard-layout--collapsed' : ''}`}>
      <Sidebar />
      <div className="dashboard-layout__content">
        <Navbar />
        <main className="dashboard-layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
