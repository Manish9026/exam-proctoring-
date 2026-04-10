import React, { useEffect } from 'react';
import AppRouter from './router';
import useThemeStore from './store/themeStore';
import './styles/globals.css';

const App = () => {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <AppRouter />;
};

export default App;
