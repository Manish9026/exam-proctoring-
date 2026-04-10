import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, FileText, Clock, Users, Settings, Play, Pause, Eye,
  Calendar, MoreVertical, Search, Filter, Camera, Mic, Loader,
  ChevronLeft, CheckCircle, List, Shield, XCircle, Check
} from 'lucide-react';
import { Card, Badge, Button, Input } from '../../components/ui';
import { examService } from '../../services';

const statusColors = {
  draft: 'neutral',
  active: 'success',
  scheduled: 'primary',
  completed: 'primary',
  cancelled: 'danger',
};

const ExamManagement = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Detail/Manage View State
  const [selectedExam, setSelectedExam] = useState(null);
  const [activeTab, setActiveTab] = useState('questions'); // questions, settings
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  
  const [qFormData, setQFormData] = useState({
    question_text: '', question_type: 'mcq', marks: 1, 
    option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A',
  });
  
  const [editFormData, setEditFormData] = useState({});

  // Create Form State
  const [formData, setFormData] = useState({
    title: '', subject: '', duration_minutes: 60, passing_marks: 40, total_marks: 100,
    scheduled_at: '', camera_required: true, mic_required: false, max_tab_switches: 3, fullscreen_required: true,
  });

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await examService.listExams();
      setExams(data || []);
      
      if (selectedExam) {
        const detail = await examService.getExam(selectedExam.id);
        setSelectedExam(detail);
      }
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = { ...formData, duration_minutes: parseInt(formData.duration_minutes), passing_marks: parseInt(formData.passing_marks), total_marks: parseInt(formData.total_marks), max_tab_switches: parseInt(formData.max_tab_switches) };
      if (payload.scheduled_at) payload.scheduled_at = new Date(payload.scheduled_at).toISOString();
      else delete payload.scheduled_at;
      
      await examService.createExam(payload);
      setShowCreate(false);
      setFormData({ title: '', subject: '', duration_minutes: 60, passing_marks: 40, total_marks: 100, scheduled_at: '', camera_required: true, mic_required: false, max_tab_switches: 3, fullscreen_required: true });
      loadExams();
    } catch (err) {
      alert('Error creating exam: ' + (err.response?.data?.error || err.message));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (examId, newStatus) => {
    try {
      if (newStatus === 'active') {
        await examService.activateExam(examId);
      } else {
        await examService.updateExam(examId, { status: newStatus });
      }
      loadExams();
      if (selectedExam && selectedExam.id === examId) {
        setSelectedExam(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert(`Failed to change status to ${newStatus}`);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (window.confirm("Are you sure you want to permanently delete this exam and all its questions?")) {
      try {
        await examService.deleteExam(examId);
        if (selectedExam && selectedExam.id === examId) {
          setSelectedExam(null);
        }
        loadExams();
      } catch (err) {
        alert('Failed to delete exam: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handeSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editFormData };
      if (payload.scheduled_at) {
        payload.scheduled_at = new Date(payload.scheduled_at).toISOString();
      }
      const updated = await examService.updateExam(selectedExam.id, payload);
      setSelectedExam(updated);
      setEditingSettings(false);
      loadExams();
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  const openManage = async (exam) => {
    try {
      setLoading(true);
      const detail = await examService.getExam(exam.id);
      setSelectedExam(detail);
      setEditFormData({
        title: detail.title, subject: detail.subject, duration_minutes: detail.duration_minutes,
        passing_marks: detail.passing_marks, total_marks: detail.total_marks,
        scheduled_at: detail.scheduled_at ? detail.scheduled_at.slice(0, 16) : '',
        camera_required: detail.camera_required, mic_required: detail.mic_required,
        fullscreen_required: detail.fullscreen_required, max_tab_switches: detail.max_tab_switches,
      });
      setActiveTab('questions');
    } catch (err) {
      alert('Failed to load exam details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      await examService.addQuestion(selectedExam.id, { ...qFormData, marks: parseInt(qFormData.marks) });
      setAddingQuestion(false);
      setQFormData({ question_text: '', question_type: 'mcq', marks: 1, option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' });
      const detail = await examService.getExam(selectedExam.id);
      setSelectedExam(detail);
      const data = await examService.listExams();
      setExams(data || []);
    } catch (err) {
      alert('Error adding question');
    }
  };

  // --- DETAIL VIEW ---
  if (selectedExam && !loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={() => setSelectedExam(null)}>Back</Button>
            <div>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedExam.title}
                <Badge variant={statusColors[selectedExam.status]}>{selectedExam.status.toUpperCase()}</Badge>
              </h2>
              <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 4 }}>
                <span>{selectedExam.subject}</span>
                <span>•</span>
                <span>{selectedExam.duration_minutes} mins</span>
                <span>•</span>
                <span>{selectedExam.questions?.length || 0} Questions</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {selectedExam.status === 'draft' && <Button variant="success" size="sm" icon={Play} onClick={() => handleUpdateStatus(selectedExam.id, 'active')}>Activate</Button>}
            {selectedExam.status === 'scheduled' && <Button variant="success" size="sm" icon={Play} onClick={() => handleUpdateStatus(selectedExam.id, 'active')}>Start Now</Button>}
            {selectedExam.status === 'active' && <Button variant="warning" size="sm" icon={Pause} onClick={() => handleUpdateStatus(selectedExam.id, 'draft')}>Hold / Pause</Button>}
            {['draft', 'scheduled', 'active'].includes(selectedExam.status) && <Button variant="danger" size="sm" icon={XCircle} onClick={() => handleUpdateStatus(selectedExam.id, 'cancelled')}>Cancel</Button>}
            {selectedExam.status === 'active' && <Button variant="primary" size="sm" icon={Check} onClick={() => handleUpdateStatus(selectedExam.id, 'completed')}>Complete</Button>}
            <div style={{ width: '1px', background: 'var(--border-primary)', margin: '0 4px' }} />
            <Button variant="danger" size="sm" onClick={() => handleDeleteExam(selectedExam.id)}>Delete</Button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', borderBottom: '1px solid var(--border-primary)' }}>
          <button 
            onClick={() => setActiveTab('questions')} 
            style={{ padding: 'var(--space-3) var(--space-4)', background: 'transparent', border: 'none', color: activeTab === 'questions' ? 'var(--primary-400)' : 'var(--text-secondary)', borderBottom: activeTab === 'questions' ? '2px solid var(--primary-400)' : '2px solid transparent', fontWeight: 'var(--font-semibold)' }}
          >
            Questions
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            style={{ padding: 'var(--space-3) var(--space-4)', background: 'transparent', border: 'none', color: activeTab === 'settings' ? 'var(--primary-400)' : 'var(--text-secondary)', borderBottom: activeTab === 'settings' ? '2px solid var(--primary-400)' : '2px solid transparent', fontWeight: 'var(--font-semibold)' }}
          >
            Security & Settings
          </button>
        </div>

        {activeTab === 'questions' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" icon={Plus} onClick={() => setAddingQuestion(!addingQuestion)}>
                {addingQuestion ? 'Cancel' : 'Add Question'}
              </Button>
            </div>

            {/* Add Question Form */}
            <AnimatePresence>
              {addingQuestion && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <Card>
                    <Card.Header><Card.Title>Add New Question</Card.Title></Card.Header>
                    <form onSubmit={handleAddQuestion}>
                      <div style={{ marginBottom: 'var(--space-4)' }}>
                        <Input required label="Question Text" placeholder="What is the capital of..." value={qFormData.question_text} onChange={e => setQFormData({...qFormData, question_text: e.target.value})} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <Input required label="Option A" value={qFormData.option_a} onChange={e => setQFormData({...qFormData, option_a: e.target.value})} />
                        <Input required label="Option B" value={qFormData.option_b} onChange={e => setQFormData({...qFormData, option_b: e.target.value})} />
                        <Input required label="Option C" value={qFormData.option_c} onChange={e => setQFormData({...qFormData, option_c: e.target.value})} />
                        <Input required label="Option D" value={qFormData.option_d} onChange={e => setQFormData({...qFormData, option_d: e.target.value})} />
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Correct Answer</label>
                          <select value={qFormData.correct_answer} onChange={e => setQFormData({...qFormData, correct_answer: e.target.value})} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}>
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}><Input required label="Marks" type="number" min={1} value={qFormData.marks} onChange={e => setQFormData({...qFormData, marks: e.target.value})} /></div>
                        <div><Button type="submit" variant="primary">Save Question</Button></div>
                      </div>
                    </form>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {!selectedExam.questions || selectedExam.questions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>No questions added to this exam yet.</div>
                ) : (
                  selectedExam.questions.map((q, i) => (
                    <div key={i} style={{ padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                        <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Q{q.order || i+1}. {q.question_text}</div>
                        <Badge variant="neutral">{q.marks} marks</Badge>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{q.correct_answer === 'A' ? <CheckCircle size={14} style={{ color: 'var(--accent-500)', minWidth: 14 }}/> : <span style={{ width: 14 }}>A)</span>} <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{q.option_a}</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{q.correct_answer === 'B' ? <CheckCircle size={14} style={{ color: 'var(--accent-500)', minWidth: 14 }}/> : <span style={{ width: 14 }}>B)</span>} <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{q.option_b}</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{q.correct_answer === 'C' ? <CheckCircle size={14} style={{ color: 'var(--accent-500)', minWidth: 14 }}/> : <span style={{ width: 14 }}>C)</span>} <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{q.option_c}</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{q.correct_answer === 'D' ? <CheckCircle size={14} style={{ color: 'var(--accent-500)', minWidth: 14 }}/> : <span style={{ width: 14 }}>D)</span>} <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{q.option_d}</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </>
        )}

        {activeTab === 'settings' && (
          <Card>
            <Card.Header>
              <Card.Title>Exam Security & Details</Card.Title>
            </Card.Header>
            {!editingSettings ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Title</div><div style={{ fontWeight: 'var(--font-medium)' }}>{selectedExam.title}</div></div>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Subject</div><div style={{ fontWeight: 'var(--font-medium)' }}>{selectedExam.subject}</div></div>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Duration</div><div style={{ fontWeight: 'var(--font-medium)' }}>{selectedExam.duration_minutes} mins</div></div>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Marks (Passing / Total)</div><div style={{ fontWeight: 'var(--font-medium)' }}>{selectedExam.passing_marks} / {selectedExam.total_marks}</div></div>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Scheduled At</div><div style={{ fontWeight: 'var(--font-medium)' }}>{selectedExam.scheduled_at ? new Date(selectedExam.scheduled_at).toLocaleString() : 'N/A'}</div></div>
                </div>
                
                <div>
                  <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={14}/> Proctoring Rules Config</h4>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <Badge variant={selectedExam.camera_required ? 'success' : 'neutral'}>Camera {selectedExam.camera_required ? 'Required' : 'Off'}</Badge>
                    <Badge variant={selectedExam.mic_required ? 'success' : 'neutral'}>Microphone {selectedExam.mic_required ? 'Required' : 'Off'}</Badge>
                    <Badge variant={selectedExam.fullscreen_required ? 'success' : 'neutral'}>Fullscreen {selectedExam.fullscreen_required ? 'Enforced' : 'Optional'}</Badge>
                    <Badge variant="primary">Max Tab Switches: {selectedExam.max_tab_switches}</Badge>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)' }}>
                  <Button variant="secondary" icon={Settings} onClick={() => setEditingSettings(true)}>Edit Details & Policies</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handeSaveSettings}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
                  <Input required label="Exam Title" value={editFormData.title} onChange={e => setEditFormData({...editFormData, title: e.target.value})} />
                  <Input required label="Subject" value={editFormData.subject} onChange={e => setEditFormData({...editFormData, subject: e.target.value})} />
                  <Input required label="Duration (minutes)" type="number" min={1} value={editFormData.duration_minutes} onChange={e => setEditFormData({...editFormData, duration_minutes: parseInt(e.target.value)})} />
                  <Input required label="Total Marks" type="number" min={1} value={editFormData.total_marks} onChange={e => setEditFormData({...editFormData, total_marks: parseInt(e.target.value)})} />
                  <Input required label="Passing Marks" type="number" min={1} value={editFormData.passing_marks} onChange={e => setEditFormData({...editFormData, passing_marks: parseInt(e.target.value)})} />
                  <Input label="Scheduled Date/Time" type="datetime-local" value={editFormData.scheduled_at} onChange={e => setEditFormData({...editFormData, scheduled_at: e.target.value})} />
                </div>
                
                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>Proctoring Config</p>
                  <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}><input type="checkbox" checked={editFormData.camera_required} onChange={e => setEditFormData({...editFormData, camera_required: e.target.checked})} /> Camera Required</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}><input type="checkbox" checked={editFormData.mic_required} onChange={e => setEditFormData({...editFormData, mic_required: e.target.checked})} /> Mic Required</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}><input type="checkbox" checked={editFormData.fullscreen_required} onChange={e => setEditFormData({...editFormData, fullscreen_required: e.target.checked})} /> Fullscreen Required</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>Max Tab Switches: <input type="number" min={0} value={editFormData.max_tab_switches} onChange={e => setEditFormData({...editFormData, max_tab_switches: parseInt(e.target.value)})} style={{ width: 60 }}/></div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
                  <Button type="button" variant="ghost" onClick={() => setEditingSettings(false)}>Discard</Button>
                  <Button type="submit" variant="primary">Save Changes</Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </div>
    );
  }
  // --- END DETAIL VIEW ---

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 4 }}>Exam Management</h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Create, manage, and monitor examinations</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="secondary" size="sm" icon={Filter} onClick={loadExams}>Refresh</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Close Form' : 'Create Exam'}
          </Button>
        </div>
      </div>

      {/* Create Exam Form */}
      <AnimatePresence>
        {showCreate && (
           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <Card>
              <Card.Header><Card.Title>Create New Exam</Card.Title></Card.Header>
              <form onSubmit={handleCreate}>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
                  <Input required label="Exam Title" icon={FileText} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  <Input required label="Subject" icon={FileText} value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                  <Input required label="Duration (minutes)" type="number" min={1} icon={Clock} value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: e.target.value})} />
                  <Input required label="Total Marks" type="number" min={1} value={formData.total_marks} onChange={e => setFormData({...formData, total_marks: e.target.value})} />
                  <Input required label="Passing Marks" type="number" min={1} value={formData.passing_marks} onChange={e => setFormData({...formData, passing_marks: e.target.value})} />
                  <Input label="Scheduled Date/Time (Optional)" type="datetime-local" icon={Calendar} value={formData.scheduled_at} onChange={e => setFormData({...formData, scheduled_at: e.target.value})} />
                </div>
                
                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>Proctoring Rules Configuration</p>
                  <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}><input type="checkbox" checked={formData.camera_required} onChange={e => setFormData({...formData, camera_required: e.target.checked})} /> <Camera size={14} /> Camera Required</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}><input type="checkbox" checked={formData.mic_required} onChange={e => setFormData({...formData, mic_required: e.target.checked})} /> <Mic size={14} /> Microphone Required</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}><input type="checkbox" checked={formData.fullscreen_required} onChange={e => setFormData({...formData, fullscreen_required: e.target.checked})} /> Fullscreen Required</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>Max Tab Switches: <input type="number" min={0} max={10} value={formData.max_tab_switches} onChange={e => setFormData({...formData, max_tab_switches: e.target.value})} style={{ width: 60 }}/></div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
                  <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" icon={Plus} loading={creating}>Create Exam</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exams Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}><Loader className="spin" size={32} style={{ color: 'var(--primary-400)' }} /></div>
      ) : exams.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
          <h3 style={{ color: 'var(--text-secondary)' }}>No Exams Found</h3>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 'var(--space-5)' }}>
          {exams.map((exam, i) => (
            <motion.div key={exam.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <Card interactive>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 4 }}>{exam.title}</h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{exam.subject}</p>
                  </div>
                  <Badge variant={statusColors[exam.status] || 'neutral'} dot>{exam.status.toUpperCase()}</Badge>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}><Clock size={14} style={{ margin: '0 auto 4px', color: 'var(--text-muted)' }} /><div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{exam.duration_minutes}m</div><div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Duration</div></div>
                  <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}><List size={14} style={{ margin: '0 auto 4px', color: 'var(--text-muted)' }} /><div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{exam.question_count}</div><div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Questions</div></div>
                  <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}><Settings size={14} style={{ margin: '0 auto 4px', color: 'var(--text-muted)' }} /><div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{exam.camera_required ? '📷' : ''} {exam.mic_required ? '🎤' : ''}</div><div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Rules</div></div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span><Calendar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{exam.scheduled_at ? new Date(exam.scheduled_at).toLocaleString() : 'Not scheduled'}</span>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button variant="ghost" size="sm" icon={Eye} onClick={() => openManage(exam)}>Manage</Button>
                    <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.id); }}>Delete</Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
