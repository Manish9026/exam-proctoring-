import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Clock, Search, Filter, BookOpen, 
  ChevronRight, Calendar, ArrowRight, Loader,
  Star, Award, Info
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import { examService } from '../../services';

const anim = (i) => ({
  initial: { opacity: 0, scale: 0.98, y: 15 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.05 },
});

const CandidateExams = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const data = await examService.getAvailableExams();
        setExams(data || []);
      } catch (err) {
        console.error('Failed to load exams:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const filteredExams = exams.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         e.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || e.subject === filter;
    return matchesSearch && matchesFilter;
  });

  const subjects = ['all', ...new Set(exams.map(e => e.subject))];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-400)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', marginBottom: 4 }}>
            Available <span className="gradient-text">Exams</span>
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
            Find and take scheduled examinations. All sessions are proctored.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)', padding: '10px 12px 10px 36px',
                fontSize: 'var(--text-sm)', color: 'var(--text-primary)', width: 240,
                outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Filter size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)', padding: '10px 12px 10px 36px',
                fontSize: 'var(--text-sm)', color: 'var(--text-primary)', width: 140,
                outline: 'none', appearance: 'none'
              }}
            >
              {subjects.map(s => <option key={s} value={s}>{s === 'all' ? 'All Subjects' : s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
        <AnimatePresence>
          {filteredExams.map((exam, i) => (
            <motion.div key={exam.id} {...anim(i)} layout>
              <Card hoverable glow style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 'var(--radius-xl)',
                    background: 'rgba(59,130,246,0.1)', color: 'var(--primary-400)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BookOpen size={22} />
                  </div>
                  <Badge variant={exam.status === 'active' ? 'success' : 'primary'}>
                    {exam.status === 'active' ? 'Active Now' : 'Scheduled'}
                  </Badge>
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 8 }}>{exam.title}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <Clock size={12} /> {exam.duration_minutes} Minutes
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <Award size={12} /> {exam.total_marks} Marks
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <FileText size={12} /> {exam.question_count} Questions
                    </div>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                    {exam.description || 'This examination will be conducted under strict AI proctoring surveillance. Ensure your environment is secure.'}
                  </p>
                </div>

                <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-primary)', margin: '0 calc(-1 * var(--space-6)) -16px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--primary-400)' }}>
                      {exam.subject.toUpperCase()}
                    </span>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => navigate(`/candidate/exam/${exam.id}/verify`)}
                    >
                      Start Exam <ArrowRight size={14} style={{ marginLeft: 6 }} />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredExams.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-12)' }}>
            <div style={{ marginBottom: 'var(--space-4)', color: 'var(--text-muted)' }}>
              <Search size={48} strokeWidth={1} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)' }}>No exams found</h3>
            <p style={{ color: 'var(--text-tertiary)' }}>Try adjusting your search or category filters.</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card style={{ background: 'rgba(59,130,246,0.03)', border: '1px dashed var(--primary-800)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div style={{ color: 'var(--primary-400)' }}><Info size={24} /></div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>Proctoring Requirement</div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
              Ensure your camera and microphone are functional before starting. Multiple face detection, browser tab switching, or using external aids will lead to immediate disqualification.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CandidateExams;
