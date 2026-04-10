import React, { useEffect } from 'react';
import AppRouter from './router';
import useThemeStore from './store/themeStore';
import { Toaster } from 'react-hot-toast';
import './styles/globals.css';

const App = () => {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)',
          backdropFilter: 'blur(8px)',
        }
      }} />
      <AppRouter />
    </>
  );
};

export default App;
