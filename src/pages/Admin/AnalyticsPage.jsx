import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Users, FileText, Clock, ArrowUp, ArrowDown, Loader
} from 'lucide-react';
import { Card } from '../../components/ui';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { examService } from '../../services';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', fontSize: 'var(--text-sm)' }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (<p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>))}
    </div>
  );
};

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await examService.adminGetAnalytics();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader className="spin" size={32} style={{ color: 'var(--primary-400)' }} />
      </div>
    );
  }

  const { monthlyData, summary, typeDistribution } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 4 }}>Analytics & Reports</h2>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Comprehensive system analytics and performance metrics</p>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-5)' }}>
        {[
          { label: 'Total Exams', value: summary.totalExams, change: '+12%', up: true, icon: FileText, color: 'var(--primary-400)' },
          { label: 'Total Candidates', value: summary.totalCandidates, change: '+18%', up: true, icon: Users, color: 'var(--accent-400)' },
          { label: 'Avg Duration', value: summary.avgDuration, change: '-5%', up: false, icon: Clock, color: 'var(--violet-400)' },
          { label: 'Pass Rate', value: `${summary.passRate}%`, change: '+3%', up: true, icon: BarChart3, color: 'var(--cyan-400)' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card compact>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <s.icon size={18} style={{ color: s.color }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: s.up ? 'var(--accent-400)' : 'var(--danger-400)', display: 'flex', alignItems: 'center', gap: 2 }}>
                  {s.up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{s.change}
                </span>
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>{s.value}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{s.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <Card.Header><Card.Title subtitle="Monthly exam and candidate trends">Monthly Overview</Card.Title></Card.Header>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="candidates" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Candidates" />
                  <Bar dataKey="violations" fill="#ef4444" radius={[4, 4, 0, 0]} name="Violations" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <Card.Header><Card.Title subtitle="Distribution by type">Exam Types</Card.Title></Card.Header>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                    {typeDistribution.map((e, index) => <Cell key={index} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {typeDistribution.map((v, index) => (
                <span key={index} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, display: 'inline-block' }} />{v.name} ({v.value}%)
                </span>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
