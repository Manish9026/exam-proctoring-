import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, Mail, Eye, Loader } from 'lucide-react';
import { Badge, Button, Input, Card } from '../../components/ui';
import { examService } from '../../services';
import { toast } from 'react-hot-toast';

const statusColors = { active: 'success', flagged: 'warning', suspended: 'danger' };
const getRiskColor = (r) => r >= 60 ? 'var(--danger-400)' : r >= 30 ? 'var(--warning-400)' : 'var(--accent-400)';

const CandidateHistoryDrawer = ({ candidate, onClose, onRefresh }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const all = await examService.listSessions();
        setSessions(all.filter(s => s.candidate_id === candidate.id));
      } catch (err) {
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    if (candidate) fetch();
  }, [candidate]);

  const handleRetake = async (sid) => {
    if (!confirm("Are you sure you want to allow a retake? This will clear current results for this session.")) return;
    try {
      await examService.resetSession(sid);
      toast.success("Retake enabled successfully");
      onRefresh();
      onClose();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 450, background: 'var(--bg-card)',
      borderLeft: '1px solid var(--border-primary)', zIndex: 1000, padding: 'var(--space-6)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', boxShadow: 'var(--shadow-2xl)',
      backdropFilter: 'blur(16px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>{candidate.name}'s History</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>&times;</Button>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader className="spin" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflowY: 'auto' }}>
          {sessions.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No exam attempts found.</p>
          ) : (
            sessions.map(s => (
              <Card key={s.id} style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-sm)' }}>{s.exam_title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                      Started: {new Date(s.started_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={s.status === 'submitted' ? 'success' : 'warning'}>{s.status}</Badge>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Score</div>
                    <div style={{ fontWeight: 'var(--font-bold)' }}>{s.score}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Risk</div>
                    <div style={{ fontWeight: 'var(--font-bold)', color: getRiskColor(s.risk_score) }}>{Math.round(s.risk_score)}%</div>
                  </div>
                </div>
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
                  <Button size="xs" variant="secondary" onClick={() => window.open(`/admin/violations?session=${s.id}`, '_blank')}>Audit</Button>
                  {(s.status === 'submitted' || s.status === 'terminated') && (
                    <Button size="xs" variant="danger" onClick={() => handleRetake(s.id)}>Allow Retake</Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const CandidatesPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const fetch = async () => {
    try {
      setLoading(true);
      const data = await examService.adminGetCandidates();
      setCandidates(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
          <Button variant="secondary" size="sm" icon={Filter} onClick={fetch}>Refresh</Button>
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
                    <span style={{ fontWeight: 'var(--font-semibold)', color: getRiskColor(c.avgRisk) }}>{c.avgRisk}%</span>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant={statusColors[c.status]} dot>{c.status}</Badge>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-tertiary)' }}>{c.lastExam}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Button variant="ghost" size="sm" icon={Eye} onClick={() => setSelectedCandidate(c)} />
                      <Button variant="ghost" size="sm" icon={Mail} />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {selectedCandidate && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={() => setSelectedCandidate(null)} />
          <CandidateHistoryDrawer
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
            onRefresh={fetch}
          />
        </>
      )}
    </div>
  );
};

export default CandidatesPage;
