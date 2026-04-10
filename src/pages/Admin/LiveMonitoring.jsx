import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Maximize2, MessageSquare, Ban, RefreshCw, AlertCircle, Shield } from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import useProctorStore from '../../store/proctorStore';
import './LiveMonitoring.css';

const LiveMonitoring = () => {
  const { liveData, loading, fetchLiveData, refreshLiveData } = useProctorStore();
  const [filter, setFilter] = useState('all');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // Poll for live updates
  useEffect(() => {
    fetchLiveData();
    
    let interval;
    if (isAutoRefresh) {
      interval = setInterval(() => {
        fetchLiveData();
      }, 2000); // 2s poll
    }
    
    return () => clearInterval(interval);
  }, [isAutoRefresh, fetchLiveData]);

  const filtered = filter === 'all' ? liveData :
    liveData.filter(c => c.risk_level === filter || (filter === 'low' && c.risk_level === 'normal'));

  const stats = {
    all: liveData.length,
    high: liveData.filter(c => c.risk_level === 'high').length,
    medium: liveData.filter(c => c.risk_level === 'medium').length,
    low: liveData.filter(c => c.risk_level === 'low' || c.risk_level === 'normal').length,
  };

  return (
    <div className="monitoring">
      <div className="monitoring__header">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="live-dot" />
            Live Monitoring Center
          </h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
            Surveillance Dashboard — {liveData.length} active sessions
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="monitoring__filters">
            {[
              { key: 'all', label: 'All', count: stats.all },
              { key: 'high', label: '🔴 Critical', count: stats.high },
              { key: 'medium', label: '🟡 Warning', count: stats.medium },
              { key: 'low', label: '🟢 Stable', count: stats.low },
            ].map(f => (
              <button
                key={f.key}
                className={`monitoring__filter-btn ${filter === f.key ? 'monitoring__filter-btn--active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <Badge variant={f.key === 'high' ? 'danger' : f.key === 'medium' ? 'warning' : 'success'} size="sm">
                  {f.count}
                </Badge>
              </button>
            ))}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refreshLiveData()} 
            icon={RefreshCw}
            loading={loading}
          >
            Force Sync
          </Button>
        </div>
      </div>

      {liveData.length === 0 && !loading ? (
        <div className="monitoring__empty">
          <Shield size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h3>No Active Sessions</h3>
          <p>Candidates currently verified but not in exam will appear here.</p>
        </div>
      ) : (
        <div className="monitor-grid">
          <AnimatePresence>
            {filtered.map((c) => (
              <motion.div
                key={c.session_id}
                layout
                className={`monitor-cell monitor-cell--${c.risk_level}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <div className="monitor-cell__video">
                  {c.last_frame ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <img 
                        src={c.last_frame.startsWith('data:') ? c.last_frame : `data:image/jpeg;base64,${c.last_frame}`} 
                        alt="Candidate Feed" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <svg 
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                        viewBox="0 0 640 480"
                      >
                        {c.last_detections?.boxes?.map((box, bIdx) => (
                           <g key={bIdx}>
                             <rect 
                               x={box.x} y={box.y} width={box.w} height={box.h} 
                               fill="none" 
                               stroke={box.label === 'PHONE' ? '#ef4444' : '#22c55e'} 
                               strokeWidth="10"
                             />
                             <text 
                               x={box.x} y={box.y - 10} 
                               fill={box.label === 'PHONE' ? '#ef4444' : '#22c55e'} 
                               fontSize="24" fontWeight="bold"
                             >
                               {box.label}
                             </text>
                           </g>
                        ))}
                      </svg>
                    </div>
                  ) : (
                    <div className="monitor-cell__video-placeholder">
                      <Video size={32} />
                      <span style={{ fontSize: 'var(--text-xs)', marginTop: 8 }}>WAITING FOR STREAM</span>
                    </div>
                  )}
                  <div className="monitor-cell__overlay">
                    <div className="monitor-cell__top-bar">
                      <span className="monitor-cell__live-dot">LIVE</span>
                      <span className={`monitor-cell__risk-badge monitor-cell__risk-badge--${c.risk_level}`}>
                        RISK: {Math.round(c.risk_score)}
                      </span>
                    </div>
                    <div className="monitor-cell__bottom-bar">
                      <span className="monitor-cell__violation-count">
                        <AlertCircle size={10} style={{ marginRight: 4 }} />
                        {c.violation_count} incidents logged
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="monitor-cell__info">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="monitor-cell__name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.candidate.name}
                    </div>
                    <div className="monitor-cell__exam">
                      {c.exam.title}
                    </div>
                    
                    {c.recent_flags && c.recent_flags.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        {c.recent_flags.slice(0, 3).map((f, idx) => (
                          <Badge key={idx} variant="danger" size="sm" style={{ textTransform: 'uppercase', fontSize: '9px' }}>
                            {f.type} (+{f.delta})
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div style={{ marginTop: 8 }}>
                        <Badge variant="success" size="sm">CLEAR BEHAVIOR</Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="monitor-cell__actions">
                    <button className="monitor-cell__action-btn" title="View Console"><Maximize2 size={14} /></button>
                    <button className="monitor-cell__action-btn" title="Chat/Warning"><MessageSquare size={14} /></button>
                    <button className="monitor-cell__action-btn monitor-cell__action-btn--danger" title="Evict Session"><Ban size={14} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default LiveMonitoring;
