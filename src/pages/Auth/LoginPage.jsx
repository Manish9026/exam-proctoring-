import React, { useState, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, ArrowRight, GitBranch, Globe } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import './Auth.css';

const HeroScene = React.lazy(() => import('../../components/3d/HeroScene'));

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const user = await login(username, password);
      navigate(user.role === 'admin' ? '/admin' : '/candidate');
    } catch (err) {
      // Error is set in store
    }
  };


  return (
    <div className="auth-page" data-theme="dark">
      <div className="auth-page__bg">
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>
      </div>

      <motion.div
        className="auth-page__card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="auth-page__brand">
          <div className="auth-page__logo"><Shield size={22} /></div>
          <span className="auth-page__brand-name gradient-text">ProctorAI</span>
        </div>

        <h1 className="auth-page__title">Welcome Back</h1>
        <p className="auth-page__subtitle">Sign in to access your proctoring dashboard</p>

        <form className="auth-page__form" onSubmit={handleSubmit}>
          {error && <div style={{ color: 'var(--danger-400)', fontSize: '0.875rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '0.5rem' }}>{error}</div>}
          <Input
            id="login-username"
            label="Username"
            type="text"
            placeholder="admin"
            icon={Mail}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            id="login-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="auth-page__remember">
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <a href="#">Forgot password?</a>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            iconRight={ArrowRight}
          >
            Sign In
          </Button>
        </form>

        <div className="auth-page__divider">or continue with</div>

        <div className="auth-page__social">
          <Button variant="secondary" size="sm" icon={Globe}>Google</Button>
          <Button variant="secondary" size="sm" icon={GitBranch}>GitHub</Button>
        </div>

        <div className="auth-page__footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
