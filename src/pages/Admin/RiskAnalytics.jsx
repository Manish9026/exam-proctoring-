import React from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, Shield, Users, Activity } from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  ScatterChart, Scatter, ZAxis
} from 'recharts';

const riskScoreData = [
  { range: '0-10', count: 145, fill: '#22c55e' },
  { range: '11-20', count: 112, fill: '#22c55e' },
  { range: '21-30', count: 89, fill: '#86efac' },
  { range: '31-40', count: 56, fill: '#fbbf24' },
  { range: '41-50', count: 38, fill: '#f59e0b' },
  { range: '51-60', count: 24, fill: '#f97316' },
  { range: '61-70', count: 18, fill: '#ef4444' },
  { range: '71-80', count: 12, fill: '#ef4444' },
  { range: '81-90', count: 7, fill: '#dc2626' },
  { range: '91-100', count: 3, fill: '#b91c1c' },
];

const trendData = [
  { day: 'Mon', avgRisk: 18, violations: 45, exams: 12 },
  { day: 'Tue', avgRisk: 22, violations: 52, exams: 15 },
  { day: 'Wed', avgRisk: 15, violations: 38, exams: 10 },
  { day: 'Thu', avgRisk: 28, violations: 67, exams: 18 },
  { day: 'Fri', avgRisk: 20, violations: 41, exams: 14 },
  { day: 'Sat', avgRisk: 12, violations: 22, exams: 6 },
  { day: 'Sun', avgRisk: 8, violations: 15, exams: 4 },
];

const radarData = [
  { factor: 'Face', current: 85, previous: 78 },
  { factor: 'Eye Track', current: 72, previous: 68 },
  { factor: 'Audio', current: 65, previous: 71 },
  { factor: 'Tab Switch', current: 90, previous: 85 },
  { factor: 'Object Det.', current: 55, previous: 45 },
  { factor: 'Behavior', current: 78, previous: 72 },
];

const topSuspicious = [
  { name: 'Rahul S.', score: 92, violations: 8, exam: 'Advanced Math' },
  { name: 'Amit K.', score: 78, violations: 6, exam: 'Advanced Math' },
  { name: 'Arjun S.', score: 65, violations: 4, exam: 'Advanced Math' },
  { name: 'Dev P.', score: 55, violations: 3, exam: 'Chemistry' },
  { name: 'Priya M.', score: 45, violations: 3, exam: 'Physics' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-secondary)',
      borderRadius: 'var(--radius-lg)', padding: '12px 16px', fontSize: 'var(--text-sm)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

const anim = (i) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: i * 0.1 } });

const RiskAnalytics = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
    <div>
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 4 }}>
        Risk Analytics
      </h2>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
        AI-powered behavioral analysis and risk scoring insights
      </p>
    </div>

    {/* Row 1: Distribution + Trend */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
      <motion.div {...anim(0)}>
        <Card>
          <Card.Header>
            <Card.Title subtitle="Distribution of candidate risk scores">Risk Score Distribution</Card.Title>
          </Card.Header>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskScoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="range" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Candidates">
                  {riskScoreData.map((entry, i) => (
                    <motion.rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <motion.div {...anim(1)}>
        <Card>
          <Card.Header>
            <Card.Title subtitle="Highest risk scores today">Top Suspicious</Card.Title>
            <Badge variant="danger">{topSuspicious.length}</Badge>
          </Card.Header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {topSuspicious.map((s, i) => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-tertiary)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)',
                    background: s.score >= 60 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                    color: s.score >= 60 ? 'var(--danger-400)' : 'var(--warning-400)',
                  }}>#{i + 1}</span>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{s.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{s.exam}</div>
                  </div>
                </div>
                <Badge variant={s.score >= 60 ? 'danger' : 'warning'}>{s.score}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>

    {/* Row 2: Weekly Trend + Radar */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
      <motion.div {...anim(2)}>
        <Card>
          <Card.Header>
            <Card.Title subtitle="Average risk and violations per day">Weekly Trend</Card.Title>
          </Card.Header>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avgRisk" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Avg Risk" />
                <Line type="monotone" dataKey="violations" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Violations" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <motion.div {...anim(3)}>
        <Card>
          <Card.Header>
            <Card.Title subtitle="AI detection accuracy by factor">Detection Factors</Card.Title>
          </Card.Header>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border-primary)" />
                <PolarAngleAxis dataKey="factor" stroke="var(--text-muted)" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--border-primary)" fontSize={10} />
                <Radar name="Current" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Radar name="Previous" dataKey="previous" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>
    </div>
  </div>
);

export default RiskAnalytics;
