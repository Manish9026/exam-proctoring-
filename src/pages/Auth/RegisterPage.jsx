import React, { useState, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, ArrowRight, GitBranch, Globe } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import './Auth.css';

const HeroScene = React.lazy(() => import('../../components/3d/HeroScene'));

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('candidate');
  const { register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const user = await register({
        username, email, password, password_confirm: confirmPassword,
        first_name: firstName, last_name: lastName, role,
      });
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

        <h1 className="auth-page__title">Create Account</h1>
        <p className="auth-page__subtitle">Start your AI-powered proctoring journey</p>

        <form className="auth-page__form" onSubmit={handleSubmit}>
          {error && <div style={{ color: 'var(--danger-400)', fontSize: '0.875rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '0.5rem' }}>{error}</div>}
          <div className="auth-page__role-selector">
            <button
              type="button"
              className={`auth-page__role ${role === 'candidate' ? 'auth-page__role--active' : ''}`}
              onClick={() => setRole('candidate')}
            >
              Candidate
            </button>
            <button
              type="button"
              className={`auth-page__role ${role === 'admin' ? 'auth-page__role--active' : ''}`}
              onClick={() => setRole('admin')}
            >
              Administrator
            </button>
          </div>

          <Input
            id="register-username"
            label="Username"
            type="text"
            placeholder="johndoe"
            icon={User}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              id="register-first-name"
              label="First Name"
              type="text"
              placeholder="John"
              icon={User}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              id="register-last-name"
              label="Last Name"
              type="text"
              placeholder="Doe"
              icon={User}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <Input
            id="register-email"
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="register-password"
            label="Password"
            type="password"
            placeholder="Min. 6 characters"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            id="register-confirm-password"
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            icon={Lock}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            iconRight={ArrowRight}
          >
            Create Account
          </Button>
        </form>

        <div className="auth-page__divider">or continue with</div>

        <div className="auth-page__social">
          <Button variant="secondary" size="sm" icon={Globe}>Google</Button>
          <Button variant="secondary" size="sm" icon={GitBranch}>GitHub</Button>
        </div>

        <div className="auth-page__footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
