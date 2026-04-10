import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Clock, BarChart3, Shield, CheckCircle, AlertTriangle,
  ChevronRight, Calendar, ArrowRight, Brain, Eye, Loader
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import { examService } from '../../services';
import useAuthStore from '../../store/authStore';

const anim = (i) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.08 },
});

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [availableExams, myResults] = await Promise.all([
          examService.getAvailableExams(),
          examService.getMyResults(),
        ]);
        setExams(availableExams || []);
        setResults(myResults || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const submitted = results.filter(r => r.status === 'submitted');
  const passed = submitted.filter(r => r.is_passed);
  const avgScore = submitted.length > 0
    ? Math.round(submitted.reduce((acc, r) => acc + (r.score || 0), 0) / submitted.length)
    : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-400)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Welcome */}
      <motion.div {...anim(0)}>
        <Card glow style={{ background: 'var(--gradient-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 4 }}>
                Welcome back, <span className="gradient-text">{user?.first_name || user?.username}</span>
              </h2>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                You have {exams.length} available exams. {exams.filter(e => e.status === 'active').length > 0 ? 'Start your exam now.' : ''}
              </p>
            </div>
            {exams.length > 0 && (
              <Button variant="primary" icon={ArrowRight} onClick={() => navigate(`/candidate/exam/${exams[0].id}/verify`)}>
                Start Next Exam
              </Button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-5)' }}>
        {[
          { icon: FileText, label: 'Total Exams', value: user?.total_exams_taken || submitted.length, color: 'blue' },
          { icon: CheckCircle, label: 'Passed', value: passed.length, color: 'green' },
          { icon: BarChart3, label: 'Avg. Score', value: `${avgScore}`, color: 'violet' },
          { icon: Shield, label: 'Risk Rating', value: (user?.avg_risk_score || 0) < 30 ? 'Low' : (user?.avg_risk_score || 0) < 60 ? 'Medium' : 'High', color: 'cyan' },
        ].map((stat, i) => (
          <motion.div key={stat.label} {...anim(i + 1)}>
            <Card compact>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-lg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: stat.color === 'blue' ? 'rgba(59,130,246,0.12)' :
                    stat.color === 'green' ? 'rgba(34,197,94,0.12)' :
                    stat.color === 'violet' ? 'rgba(139,92,246,0.12)' : 'rgba(6,182,212,0.12)',
                  color: stat.color === 'blue' ? 'var(--primary-400)' :
                    stat.color === 'green' ? 'var(--accent-400)' :
                    stat.color === 'violet' ? 'var(--violet-400)' : 'var(--cyan-400)',
                }}>
                  <stat.icon size={18} />
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-6)' }}>
        {/* Available Exams */}
        <motion.div {...anim(5)}>
          <Card>
            <Card.Header>
              <Card.Title subtitle="Click an exam to start verification">Available Exams</Card.Title>
              <Badge variant="primary">{exams.length}</Badge>
            </Card.Header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {exams.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                  No exams available right now.
                </div>
              )}
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => navigate(`/candidate/exam/${exam.id}/verify`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 'var(--space-4)', background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                    transition: 'all 0.2s', border: '1px solid transparent',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-700)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 'var(--radius-lg)',
                      background: 'rgba(59,130,246,0.12)', color: 'var(--primary-400)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{exam.title}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span><Clock size={10} /> {exam.duration_minutes}m</span>
                        <span>{exam.subject}</span>
                        <span>{exam.question_count} Q</span>
                        <span>{exam.total_marks} marks</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Badge variant={exam.status === 'active' ? 'success' : 'primary'} dot>
                      {exam.status === 'active' ? 'Ready' : 'Scheduled'}
                    </Badge>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Recent Results */}
        <motion.div {...anim(6)}>
          <Card>
            <Card.Header>
              <Card.Title subtitle="Your exam performance">Results</Card.Title>
            </Card.Header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {submitted.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                  No results yet. Take an exam!
                </div>
              )}
              {submitted.map((result) => (
                <div key={result.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-3)', borderBottom: '1px solid var(--border-primary)',
                }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{result.exam_title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Risk: {Math.round(result.risk_score)} | Violations: {result.violation_count}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{
                      fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)',
                      color: result.is_passed ? 'var(--accent-400)' : 'var(--danger-400)',
                    }}>
                      {result.score}/{result.correct_answers !== undefined ? result.total_answered : '?'}
                    </span>
                    <Badge variant={result.is_passed ? 'success' : 'danger'}>
                      {result.is_passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* AI Proctoring Info */}
      <motion.div {...anim(7)}>
        <Card>
          <Card.Header>
            <Card.Title subtitle="AI monitoring active during exams">Proctoring Guidelines</Card.Title>
          </Card.Header>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
            {[
              { icon: Eye, title: 'Face Detection', desc: 'Keep your face visible at all times. Multiple faces will trigger alerts.', color: '#3b82f6' },
              { icon: Brain, title: 'Eye Tracking', desc: 'Avoid looking away from the screen frequently. AI monitors gaze patterns.', color: '#8b5cf6' },
              { icon: Shield, title: 'Secure Environment', desc: 'Fullscreen mode is mandatory. Tab switching is monitored and limited.', color: '#22c55e' },
              { icon: AlertTriangle, title: 'Risk Scoring', desc: 'Violations accumulate to a risk score. High risk may terminate your exam.', color: '#f59e0b' },
            ].map((item) => (
              <div key={item.title} style={{
                padding: 'var(--space-4)', background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-lg)', display: 'flex', gap: 'var(--space-3)',
              }}>
                <item.icon size={20} style={{ color: item.color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default CandidateDashboard;
