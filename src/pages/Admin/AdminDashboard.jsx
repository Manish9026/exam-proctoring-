import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, FileText, AlertTriangle, Brain, TrendingUp, TrendingDown,
  Monitor, Eye, Clock, Shield, Activity, Zap, RefreshCw
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import examService from '../../services/examService';
import './AdminDashboard.css';

const anim = (i) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.08 },
});

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-secondary)',
      borderRadius: 'var(--radius-lg)',
      padding: '12px 16px',
      fontSize: 'var(--text-sm)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const stats = await examService.getDashboardStats();
      setData(stats);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <RefreshCw size={48} className="spin" style={{ color: 'var(--primary-500)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Analyzing security telemetry...</p>
      </div>
    );
  }

  // Safety check for backend response structure
  const stats = data.stats || {};
  const trends = data.trends || [];
  const activity = data.recent_activity || [];
  const grid = data.live_grid || [];
  const riskDist = data.risk_distribution || [];
  const breakDown = data.violations_breakdown || [];

  const statCards = [
    { label: 'Active Exams', value: stats.active_exams || 0, trend: '+2', up: true, icon: FileText, color: 'blue', glow: '#3b82f6' },
    { label: 'Online Candidates', value: stats.online_candidates || 0, trend: '+12%', up: true, icon: Users, color: 'green', glow: '#22c55e' },
    { label: 'High Risk Alerts', value: stats.high_risk_alerts || 0, trend: '-1', up: true, icon: Shield, color: 'red', glow: '#ef4444' },
    { label: 'Avg Risk Score', value: `${Math.round(stats.avg_risk_score || 0)}%`, trend: '-4%', up: true, icon: Activity, color: 'orange', glow: '#f59e0b' },
  ];

  const VIOLATION_COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#22d3ee'];

  return (
    <div className="admin-dash">
      {/* Stats */}
      <div className="admin-dash__stats">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} {...anim(i)} className="stat-card">
            <div className="stat-card__header">
              <div className={`stat-card__icon stat-card__icon--${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div className={`stat-card__trend stat-card__trend--${stat.up ? 'up' : 'down'}`}>
                {stat.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {stat.trend}
              </div>
            </div>
            <div className="stat-card__value">{stat.value}</div>
            <div className="stat-card__label">{stat.label}</div>
            <div className="stat-card__glow" style={{ background: stat.glow }} />
          </motion.div>
        ))}
      </div>

      {/* Row: Chart + Activity */}
      <div className="admin-dash__row">
        <motion.div {...anim(4)} style={{ flex: 2 }}>
          <Card>
            <Card.Header>
              <Card.Title subtitle="Session volume & incidents analysis">AI Security Trend</Card.Title>
              <Badge variant="success" dot>Real-time</Badge>
            </Card.Header>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="gradCandidates" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradViolations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="candidates" stroke="#3b82f6" fill="url(#gradCandidates)" strokeWidth={2} name="Active Users" />
                  <Area type="monotone" dataKey="violations" stroke="#ef4444" fill="url(#gradViolations)" strokeWidth={2} name="Risk Incidents" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div {...anim(5)} style={{ flex: 1 }}>
          <Card>
            <Card.Header>
              <Card.Title subtitle="Live behavioral feed">Recent Activity</Card.Title>
            </Card.Header>
            <div className="activity-list">
              {activity.map((item, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-item__icon">
                     {item.type === 'danger' ? '🔴' : item.type === 'warning' ? '🟡' : '🟢'}
                  </div>
                  <div className="activity-item__content">
                    <div className="activity-item__text" dangerouslySetInnerHTML={{ __html: item.text }} />
                    <div className="activity-item__time">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Row: Live Grid + Risk Distribution */}
      <div className="admin-dash__row--equal admin-dash__row">
        <motion.div {...anim(6)}>
          <Card>
            <Card.Header>
              <Card.Title subtitle="Real-time flagged feeds">Security Grid</Card.Title>
              <Badge variant="danger" dot>{grid.length} Flagged</Badge>
            </Card.Header>
            <div className="live-grid">
              {grid.map((c, i) => (
                <div key={i} className="live-grid__item">
                  <div className="live-grid__item-status" style={{
                    background: c.status === 'danger' ? 'var(--danger-500)' :
                      c.status === 'warning' ? 'var(--warning-500)' : 'var(--accent-500)',
                    boxShadow: `0 0 8px ${c.status === 'danger' ? 'var(--danger-500)' :
                      c.status === 'warning' ? 'var(--warning-500)' : 'var(--accent-500)'}`,
                  }} />
                  <Monitor size={48} style={{ color: 'var(--text-muted)', marginBottom: 8, opacity: 0.3 }} />
                  <div className="live-grid__item-name">{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>Risk Projection: {c.score}%</div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div {...anim(7)}>
          <Card>
            <Card.Header>
              <Card.Title subtitle="Session integrity breakdown">Risk & Violations</Card.Title>
            </Card.Header>
            <div className="risk-bars">
              {riskDist.map((r) => (
                <div key={r.label} className="risk-bar">
                  <span className="risk-bar__label" style={{ minWidth: 100 }}>{r.label}</span>
                  <div className="risk-bar__track">
                    <div
                      className={`risk-bar__fill risk-bar__fill--${r.level}`}
                      style={{ width: `${r.percentage}%` }}
                    />
                  </div>
                  <span className="risk-bar__value">{r.percentage}%</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'var(--space-6)', height: 220 }}>
              <Card.Title subtitle="Incident frequency by type" style={{ marginBottom: 12 }}>Violations Mix</Card.Title>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakDown}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {breakDown.map((entry, index) => (
                      <Cell key={entry.name} fill={VIOLATION_COLORS[index % VIOLATION_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: -10 }}>
                {breakDown.map((v, i) => (
                  <span key={v.name} style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: VIOLATION_COLORS[i % VIOLATION_COLORS.length], display: 'inline-block' }} />
                    {v.name}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
