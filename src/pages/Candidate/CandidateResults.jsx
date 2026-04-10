import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Calendar, CheckCircle, XCircle, 
  ChevronRight, ArrowUpRight, Search, Filter,
  TrendingUp, AlertCircle, Shield, Loader
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import { examService } from '../../services';

const anim = (i) => ({
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3, delay: i * 0.05 },
});

const CandidateResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await examService.getMyResults();
        setResults(data || []);
      } catch (err) {
        console.error('Failed to load results:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const submitted = results.filter(r => r.status === 'submitted');
  const filteredResults = filter === 'all' 
    ? submitted 
    : submitted.filter(r => filter === 'pass' ? r.is_passed : !r.is_passed);

  const stats = {
    total: submitted.length,
    passed: submitted.filter(r => r.is_passed).length,
    avgRisk: submitted.length > 0 
      ? Math.round(submitted.reduce((acc, r) => acc + (r.risk_score || 0), 0) / submitted.length)
      : 0
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-400)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', marginBottom: 4 }}>
          Examination <span className="gradient-text">Results</span>
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
          Detailed performance history and proctoring audit logs.
        </p>
      </div>

      {/* Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
        {[
          { label: 'Completion Rate', value: `${stats.total > 0 ? 100 : 0}%`, icon: CheckCircle, color: 'blue' },
          { label: 'Pass Ratio', value: `${stats.total > 0 ? Math.round((stats.passed/stats.total)*100) : 0}%`, icon: TrendingUp, color: 'green' },
          { label: 'Avg Integrity', value: `${100 - stats.avgRisk}%`, icon: Shield, color: 'cyan' },
        ].map((stat, i) => (
          <motion.div key={stat.label} {...anim(i)}>
            <Card compact>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: stat.color === 'blue' ? 'rgba(59,130,246,0.1)' : stat.color === 'green' ? 'rgba(34,197,94,0.1)' : 'rgba(6,182,212,0.1)',
                  color: stat.color === 'blue' ? 'var(--primary-400)' : stat.color === 'green' ? 'var(--accent-400)' : 'var(--cyan-400)',
                }}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>{stat.value}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{stat.label}</div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main List */}
      <Card>
        <Card.Header>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Card.Title subtitle="Audit of all past submissions">Performance History</Card.Title>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {['all', 'pass', 'fail'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-primary)',
                    fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', 
                    background: filter === f ? 'var(--primary-600)' : 'var(--bg-tertiary)',
                    color: filter === f ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </Card.Header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {filteredResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
              No result records found for this filter.
            </div>
          )}
          {filteredResults.map((result, i) => (
            <motion.div 
              key={result.id} 
              {...anim(i)}
              style={{
                display: 'grid', gridTemplateColumns: 'minmax(200px, 1.5fr) 1fr 1fr 1fr 80px',
                padding: 'var(--space-4)', alignItems: 'center',
                borderBottom: '1px solid var(--border-primary)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  <BarChart3 size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>{result.exam_title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={10} /> {new Date(result.submitted_at || result.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Score</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>
                  {result.score} pts
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 'normal', marginLeft: 4 }}>
                    ({Math.round((result.score / result.total_answered) * 100 || 0)}%)
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Security Profile</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge variant={result.risk_score < 30 ? 'success' : result.risk_score < 60 ? 'warning' : 'danger'}>
                    {100 - Math.round(result.risk_score)}% Integrity
                  </Badge>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{result.violation_count} Flags</span>
                </div>
              </div>

              <div>
                <Badge variant={result.is_passed ? 'success' : 'danger'} dot>
                  {result.is_passed ? 'COMPLETED' : 'FAILED'}
                </Badge>
              </div>

              <div style={{ textAlign: 'right' }}>
                <Button variant="ghost" size="sm" icon={ArrowUpRight}>Audit</Button>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Pro-Tips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
        <Card style={{ borderLeft: '4px solid var(--accent-500)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <AlertCircle size={20} style={{ color: 'var(--accent-400)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>Need a Retake?</div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
                If your exam was terminated due to network issues or accidental closure, please contact the administrator to reset your session.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CandidateResults;
