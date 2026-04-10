import React, { useState, useEffect, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, Eye, Brain, Monitor, Lock, BarChart3, 
  ArrowRight, Play, Zap, Scan, Mic, Fingerprint, 
  ChevronRight, Globe
} from 'lucide-react';
import { Button } from '../../components/ui';
import './Landing.css';

const HeroScene = React.lazy(() => import('../../components/3d/HeroScene'));

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const features = [
  {
    icon: <Eye size={24} />,
    color: 'blue',
    title: 'Face Detection & Recognition',
    desc: 'Real-time identity verification with continuous face matching. Detects multiple faces, face absence, and mismatches instantly.',
    tags: ['TensorFlow.js', 'DeepFace', 'Real-time'],
  },
  {
    icon: <Scan size={24} />,
    color: 'violet',
    title: 'Eye & Head Tracking',
    desc: 'Advanced gaze detection using Mediapipe. Monitors suspicious eye movements and head pose changes during examination.',
    tags: ['Mediapipe', 'OpenCV', 'Pose Detection'],
  },
  {
    icon: <Brain size={24} />,
    color: 'green',
    title: 'AI Risk Scoring Engine',
    desc: 'Dynamic risk score (0-100) calculated from multiple behavioral factors. Auto-triggers warnings and exam termination.',
    tags: ['Machine Learning', 'Behavioral AI', 'Auto-Actions'],
  },
  {
    icon: <Monitor size={24} />,
    color: 'cyan',
    title: 'Live Admin Monitoring',
    desc: 'Real-time grid view of all candidates with color-coded risk indicators. Timeline replay with violation snapshots.',
    tags: ['WebRTC', 'Socket.IO', 'Grid View'],
  },
  {
    icon: <Lock size={24} />,
    color: 'red',
    title: 'Anti-Cheat Security',
    desc: 'Fullscreen enforcement, copy/paste blocking, VM detection, browser fingerprinting, and session protection.',
    tags: ['Fingerprinting', 'VM Detection', 'Session Lock'],
  },
  {
    icon: <Mic size={24} />,
    color: 'orange',
    title: 'Voice & Object Detection',
    desc: 'Detects talking, background voices, phone usage, books, and notes using YOLO object detection and audio analysis.',
    tags: ['YOLO', 'Audio Analysis', 'Object Detection'],
  },
];

const steps = [
  { num: '01', title: 'Login & Verify', desc: 'Face recognition + ID upload' },
  { num: '02', title: 'Environment Scan', desc: '360° room scanning' },
  { num: '03', title: 'Start Exam', desc: 'Secure fullscreen mode' },
  { num: '04', title: 'AI Monitoring', desc: 'Real-time proctoring active' },
  { num: '05', title: 'Risk Scoring', desc: 'Dynamic score calculation' },
  { num: '06', title: 'Report & Replay', desc: 'Complete behavioral timeline' },
];

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing" data-theme="dark">
      {/* Navigation */}
      <nav className={`landing-nav ${scrolled ? 'landing-nav--scrolled' : ''}`}>
        <Link to="/" className="landing-nav__brand">
          <div className="landing-nav__logo"><Shield size={18} /></div>
          ProctorAI
        </Link>
        <ul className="landing-nav__links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#security">Security</a></li>
        </ul>
        <div className="landing-nav__actions">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Sign In</Button>
          <Button variant="primary" size="sm" icon={Zap} onClick={() => navigate('/register')}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero__canvas-wrapper">
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
        </div>

        <motion.div
          className="hero__content"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div variants={fadeUp} className="hero__badge">
            <span className="hero__badge-dot" />
            AI-Powered Exam Proctoring Platform
          </motion.div>

          <motion.h1 variants={fadeUp} className="hero__title">
            Intelligent Exam
            <br />
            <span className="gradient-text text-glow">Proctoring System</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="hero__subtitle">
            This system doesn't just monitor students — it intelligently evaluates behavioral
            patterns using AI and assigns a dynamic risk score, enabling automated and 
            human-assisted proctoring.
          </motion.p>

          <motion.div variants={fadeUp} className="hero__actions">
            <Button variant="primary" size="xl" icon={ArrowRight} iconRight={ArrowRight}
              onClick={() => navigate('/register')}>
              Start Free Trial
            </Button>
            <Button variant="secondary" size="xl" icon={Play}>
              Watch Demo
            </Button>
          </motion.div>

          <motion.div variants={fadeUp} className="hero__stats">
            <div className="hero__stat">
              <div className="hero__stat-value">99.7%</div>
              <div className="hero__stat-label">Detection Accuracy</div>
            </div>
            <div className="hero__stat">
              <div className="hero__stat-value">&lt;200ms</div>
              <div className="hero__stat-label">Response Time</div>
            </div>
            <div className="hero__stat">
              <div className="hero__stat-value">50K+</div>
              <div className="hero__stat-label">Exams Proctored</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="features__header">
          <div className="features__tag">Extraordinary Features</div>
          <h2 className="features__title">AI That Sees Everything</h2>
          <p className="features__subtitle">
            Multi-layered AI detection system with real-time behavioral analysis and risk scoring.
          </p>
        </div>

        <div className="features__grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className={`feature-card__icon feature-card__icon--${feature.color}`}>
                {feature.icon}
              </div>
              <h3 className="feature-card__title">{feature.title}</h3>
              <p className="feature-card__desc">{feature.desc}</p>
              <div className="feature-card__tags">
                {feature.tags.map(tag => (
                  <span key={tag} className="feature-card__tag">{tag}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="how-it-works__header">
          <div className="features__tag">Process</div>
          <h2 className="features__title">How It Works</h2>
          <p className="features__subtitle">
            From verification to report — a seamless AI-powered proctoring flow.
          </p>
        </div>

        <div className="how-it-works__steps">
          {steps.map((step, index) => (
            <motion.div
              key={step.num}
              className="step"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="step__number">{step.num}</div>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__desc">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta__content">
          <motion.h2
            className="cta__title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Ready to <span className="gradient-text">Secure</span> Your Exams?
          </motion.h2>
          <motion.p
            className="cta__subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Join thousands of institutions using AI-powered proctoring for fair examinations.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Button variant="primary" size="xl" icon={Zap} onClick={() => navigate('/register')}>
              Get Started Now
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 ProctorAI — AI-Powered Exam Proctoring System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
