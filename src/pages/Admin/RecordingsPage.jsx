import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, Play, Download, Eye, Clock, Calendar, Filter, Loader } from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import { examService } from '../../services';

const statusColors = { flagged: 'danger', review: 'warning', clean: 'success', submitted: 'success', terminated: 'danger', in_progress: 'primary' };

const RecordingsPage = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const data = await examService.listSessions();
      setRecordings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}><Loader className="spin" size={32} style={{ color: 'var(--primary-400)' }} /></div>;
  }
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 4 }}>Recordings & Replay</h2>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Watch recorded sessions with AI violation timeline</p>
      </div>
      <Button variant="secondary" size="sm" icon={Filter} onClick={fetchRecordings}>Refresh</Button>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-5)' }}>
      {recordings.map((rec, i) => (
        <motion.div key={rec.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <Card interactive>
            <div style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', 
              marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <Video size={36} style={{ color: 'var(--text-muted)' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                background: 'rgba(0,0,0,0.3)', opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={20} style={{ color: 'white', marginLeft: 2 }} />
                </div>
              </div>
              <div style={{ position: 'absolute', top: 8, right: 8 }}>
                <Badge variant={statusColors[rec.status]}>{rec.status.toUpperCase()}</Badge>
              </div>
              <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: '11px', color: 'white', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 'var(--radius-full)', backdropFilter: 'blur(8px)' }}>
                <Clock size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />{new Date(rec.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 2 }}>{rec.candidate_name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{rec.exam_title}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 8 }}>
                  <span>Risk: <strong style={{ color: rec.risk_score >= 60 ? 'var(--danger-400)' : rec.risk_score >= 30 ? 'var(--warning-400)' : 'var(--accent-400)' }}>{Math.round(rec.risk_score)}%</strong></span>
                  <span>Violations: <strong>{rec.violation_count}</strong></span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button variant="ghost" size="sm" icon={Eye} />
                <Button variant="ghost" size="sm" icon={Download} />
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  </div>
)};

export default RecordingsPage;
