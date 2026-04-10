import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, Eye, Camera, X, Clock, Filter, 
  Download, RefreshCw, User, ShieldAlert, ChevronRight, 
  ChevronDown, Activity, Trash2, ExternalLink
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import useProctorStore from '../../store/proctorStore';
import './Violations.css';

const getRiskColor = (risk) => {
  if (risk >= 60) return 'var(--danger-500)';
  if (risk >= 30) return 'var(--warning-500)';
  return 'var(--accent-500)';
};

const ViolationsPage = () => {
  const { violations, loading, fetchViolations } = useProctorStore();
  const [viewSnapshot, setViewSnapshot] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState(new Set());

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  // Group violations by session
  const sessionGroups = useMemo(() => {
    const groups = {};
    violations.forEach(v => {
      if (!groups[v.session_id]) {
        groups[v.session_id] = {
          session_id: v.session_id,
          candidate_name: v.candidate_name,
          exam_title: v.exam_title,
          violations: [],
          max_severity: 'low',
          latest_v: v,
          total_risk_delta: 0
        };
      }
      groups[v.session_id].violations.push(v);
      groups[v.session_id].total_risk_delta += (v.risk_delta || 0);
      
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      if (severityOrder[v.severity] > severityOrder[groups[v.session_id].max_severity]) {
        groups[v.session_id].max_severity = v.severity;
      }
      
      if (new Date(v.timestamp) > new Date(groups[v.session_id].latest_v.timestamp)) {
        groups[v.session_id].latest_v = v;
      }
    });
    return Object.values(groups).sort((a, b) => 
      new Date(b.latest_v.timestamp) - new Date(a.latest_v.timestamp)
    );
  }, [violations]);

  const latestViolation = violations.length > 0 ? violations[0] : null;

  const toggleSession = (sessionId) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) newExpanded.delete(sessionId);
    else newExpanded.add(sessionId);
    setExpandedSessions(newExpanded);
  };

  return (
    <div className="violations-page">
      <div className="violations-page__header">
        <div>
          <h2 className="page-title">AI Security Logs</h2>
          <p className="page-subtitle">Real-time incident tracking & activity grouping</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => fetchViolations()} loading={loading}>Sync</Button>
          <Button variant="secondary" size="sm" icon={Download}>Export Reports</Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {latestViolation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="security-spotlight"
          >
            <div className="spotlight-content">
              <div className="spotlight-badge">
                <AlertTriangle size={14} />
                LATEST BREACH
              </div>
              <div className="spotlight-main">
                <div className="spotlight-user">
                  <div className="spotlight-avatar">
                   <User size={20} />
                  </div>
                  <div>
                    <h4>{latestViolation.candidate_name}</h4>
                    <span>{latestViolation.exam_title}</span>
                  </div>
                </div>
                <div className="spotlight-info">
                  <Badge variant="danger" dot>{latestViolation.violation_label}</Badge>
                  <div className="spotlight-time">
                    <Clock size={12} /> {new Date(latestViolation.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
            {latestViolation.snapshot_path && (
               <div className="spotlight-snapshot" onClick={() => setViewSnapshot(latestViolation.snapshot_path)}>
                 <img src={latestViolation.snapshot_path} alt="Latest" />
                 <div className="snapshot-overlay"><Camera size={16} /></div>
               </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sessions-list">
        {sessionGroups.length === 0 && !loading ? (
          <Card className="empty-state">
            <ShieldAlert size={48} />
            <h3>All Clear</h3>
            <p>No behavioral violations recorded in the system.</p>
          </Card>
        ) : (
          sessionGroups.map((group) => (
            <div key={group.session_id} className={`session-card ${expandedSessions.has(group.session_id) ? 'active' : ''}`}>
              <div className="session-card__header" onClick={() => toggleSession(group.session_id)}>
                <div className="session-card__user">
                  {expandedSessions.has(group.session_id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <div className="session-avatar">
                    <User size={16} />
                  </div>
                  <div>
                    <div className="user-name">{group.candidate_name}</div>
                    <div className="user-exam">{group.exam_title}</div>
                  </div>
                </div>

                <div className="session-card__stats">
                  <Badge variant={group.max_severity === 'critical' ? 'danger' : group.max_severity === 'high' ? 'danger' : 'warning'}>
                    {group.violations.length} INCIDENTS
                  </Badge>
                  <div className="session-risk">
                    <div className="risk-dot" style={{ background: getRiskColor(group.total_risk_delta) }} />
                    Score Delta: +{group.total_risk_delta}
                  </div>
                  <div className="session-card__btn">
                    Details
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedSessions.has(group.session_id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="session-card__body"
                  >
                    <div className="violations-timeline">
                      {group.violations.map((v, idx) => (
                        <div key={v.id || idx} className="violation-item">
                          <div className="violation-item__line" />
                          <div className={`violation-item__dot severity--${v.severity}`}>
                            <Activity size={12} />
                          </div>
                          <div className="violation-item__content">
                            <div className="violation-item__header">
                              <span className="v-label">{v.violation_label}</span>
                              <span className="v-time">{new Date(v.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="v-desc">{v.description}</p>
                            <div className="v-footer">
                               <Badge variant={v.severity === 'critical' ? 'danger' : 'warning'} size="sm">
                                 {v.severity.toUpperCase()}
                               </Badge>
                               {v.metadata?.audio_blob && (
                                 <div className="v-evidence v-evidence--audio" style={{ marginTop: '12px', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                   <audio 
                                     controls 
                                     preload="metadata"
                                     src={v?.metadata?.audio_blob} 
                                     style={{ height: '32px', width: '100%' }} 
                                   />
                                   <span style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                     <Activity size={10} /> Audio forensic evidence cached
                                   </span>
                                 </div>
                               )}
                               {v.snapshot_path && (
                                 <button className="v-snapshot-btn" onClick={() => setViewSnapshot(v.snapshot_path)}>
                                   <Camera size={12} /> View Snapshot
                                 </button>
                               )}
                            </div>
                          </div>
                          <div className="violation-item__delta">
                            +{v.risk_delta}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Snapshot Modal */}
      <AnimatePresence>
        {viewSnapshot && (
          <div className="modal-overlay" onClick={() => setViewSnapshot(null)}>
            <motion.div 
              className="snapshot-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Incident Evidence</h3>
                <button onClick={() => setViewSnapshot(null)}><X size={20} /></button>
              </div>
              <div className="modal-body">
                <img src={viewSnapshot} alt="Violation" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViolationsPage;
