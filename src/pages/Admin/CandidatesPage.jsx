import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, Mail, Eye, Loader } from 'lucide-react';
import { Badge, Button, Input } from '../../components/ui';
import { examService } from '../../services';

const statusColors = { active: 'success', flagged: 'warning', suspended: 'danger' };
const getRiskColor = (r) => r >= 60 ? 'var(--danger-400)' : r >= 30 ? 'var(--warning-400)' : 'var(--accent-400)';

const CandidatesPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await examService.adminGetCandidates();
        setCandidates(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}><Loader className="spin" size={32} style={{ color: 'var(--primary-400)' }} /></div>;
  }

  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 4 }}>Candidates</h2>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>{candidates.length} registered candidates</p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <div style={{ minWidth: 240 }}>
          <Input id="search-candidates" placeholder="Search candidates..." icon={Search} />
        </div>
        <Button variant="secondary" size="sm" icon={Filter}>Filter</Button>
      </div>
    </div>

    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div style={{
        overflow: 'auto', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-primary)',
        background: 'var(--bg-card)', backdropFilter: 'blur(12px)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr>
              {['Candidate', 'Email', 'Exams Taken', 'Avg Risk', 'Status', 'Last Exam', 'Actions'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: 'var(--space-4)', fontWeight: 'var(--font-semibold)',
                  fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: 'var(--text-muted)', borderBottom: '1px solid var(--border-primary)',
                  background: 'var(--bg-tertiary)', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => (
              <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                style={{ borderBottom: '1px solid var(--border-primary)' }}
              >
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)',
                    }}>{c.name.split(' ').map(n => n[0]).join('')}</div>
                    <span style={{ fontWeight: 'var(--font-semibold)' }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-tertiary)' }}>{c.email}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{c.exams}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <span style={{ fontWeight: 'var(--font-semibold)', color: getRiskColor(c.avgRisk) }}>{c.avgRisk}</span>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant={statusColors[c.status]} dot>{c.status}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-tertiary)' }}>{c.lastExam}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button variant="ghost" size="sm" icon={Eye} />
                    <Button variant="ghost" size="sm" icon={Mail} />
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  </div>
)};

export default CandidatesPage;
