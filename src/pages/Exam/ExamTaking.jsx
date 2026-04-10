import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import useNetworkQueue from '../../hooks/useNetworkQueue'; 

import { 
  Clock, ChevronLeft, ChevronRight, Flag, Send, AlertTriangle, 
  Camera, Shield, Brain, Wifi, Monitor,X 
} from 'lucide-react';
import { Button, Badge, Card } from '../../components/ui';
import { examService, proctorService } from '../../services';
import './Exam.css';

const ExamTaking = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const location = useLocation();
  const webcamRef = useRef(null);

  // Use the new highly scalable Network Queue hook pointing to the Django REST endpoint
  const initialSessionId = location.state?.sessionId || null;
  const { sendFrame, isConnected } = useNetworkQueue(); 

  const initialExamData = location.state?.examData || null;

  const [exam, setExam] = useState(initialExamData);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(3600);
  const [riskScore, setRiskScore] = useState(0);
  const [lastSync, setLastSync] = useState(Date.now());
  const [canvasDetections, setCanvasDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState(null); // 'terminated' | 'time_out'
  const [countdown, setCountdown] = useState(15);
  const [latestViolation, setLatestViolation] = useState(null);
  const tickCount = useRef(0);
  const countdownTimerRef = useRef(null);

  // 1. Initialize Exam
  useEffect(() => {
    const init = async () => {
      try {
        let ex = exam;
        if (!ex) {
          ex = await examService.getCandidateExam(examId);
          setExam(ex);
        }
        setQuestions(ex.questions || []);
        setTimeLeft((ex.duration_minutes || 60) * 60);

        let sess;
        if (initialSessionId) {
          sess = await examService.getSession(initialSessionId);
        } else {
          sess = await examService.startExam(examId);
        }
        setSession(sess);
        setLoading(false);
      } catch (err) {
        console.error('Init failed:', err);
        navigate('/candidate');
      }
    };
    init();
  }, [examId]);

  // Handle auto-termination countdown
  useEffect(() => {
    if (terminalStatus) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            navigate('/candidate');
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownTimerRef.current);
  }, [terminalStatus, navigate]);

  const audioLevelRef = useRef(0);
  const audioContextRef = useRef(null);
  const audioSnapshotRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Initialize Audio Monitor
  useEffect(() => {
    let micStream;
    let analyzer;
    let dataArray;
    let animationFrame;

    const startAudioMonitor = async () => {
      let isMounted = true;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) return;
        
        // --- 1. Audio Level Monitoring ---
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(micStream);
        analyzer = audioContextRef.current.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);
        dataArray = new Uint8Array(analyzer.frequencyBinCount);

        const checkAudio = () => {
          if (!isMounted) return;
          analyzer.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const average = sum / dataArray.length;
          audioLevelRef.current = Math.round(average);
          animationFrame = requestAnimationFrame(checkAudio);
        };
        checkAudio();

        // --- 2. Forensic Audio Buffering (15-Second Rolling Window) ---
        let audioSegments = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm;codecs=opus';

        const startNewCycle = () => {
          if (!isMounted) return;
          
          const recorder = new MediaRecorder(micStream, { mimeType });
          const internalChunks = [];
          
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) internalChunks.push(e.data);
          };
          
          recorder.onstop = () => {
            if (!isMounted) return;
            const segmentBlob = new Blob(internalChunks, { type: mimeType });
            audioSegments.push(segmentBlob);
            if (audioSegments.length > 3) audioSegments.shift(); // Keep last 15s (3 * 5s)
            
            // Periodically prepare the combined blob for the telemetry loop
            const combinedBlob = new Blob(audioSegments, { type: mimeType });
            const reader = new FileReader();
            reader.onloadend = () => { audioSnapshotRef.current = reader.result; };
            reader.readAsDataURL(combinedBlob);

            setTimeout(startNewCycle, 100);
          };

          mediaRecorderRef.current = recorder;
          recorder.start();
          setTimeout(() => {
            if (recorder.state === 'recording') recorder.stop();
          }, 5000); 
        };

        startNewCycle();

      } catch (err) {
        console.warn("Mic access denied or unavailable", err);
      }
      return () => { isMounted = false; };
    };

    const cleanupMonitor = startAudioMonitor();
    return () => {
       cleanupMonitor.then(cleanup => cleanup && cleanup());
       if (micStream) micStream.getTracks().forEach(t => t.stop());
       if (animationFrame) cancelAnimationFrame(animationFrame);
       if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // 2. Timer
  useEffect(() => {
    if (loading || terminalStatus) return;
    const t = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) {
        setTerminalStatus('time_out');
        clearInterval(t);
      }
      return prev - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [loading, terminalStatus]);

  // 3. Centralized API Violation Reporter (for behavioral events)
  const reportBehavior = useCallback((type, severity, desc, displayTime = 5000) => {
    setLatestViolation({ type, severity, description: desc });
    setTimeout(() => {
      setLatestViolation(current => current?.type === type ? null : current);
    }, displayTime);
    
    if (session) {
      proctorService.reportViolation({ 
        session_id: session.id, 
        violation_type: type, 
        severity, 
        description: desc 
      }).then(res => {
         if (res.terminated) setTerminalStatus('terminated');
         if (res.risk_score !== undefined) setRiskScore(res.risk_score);
      }).catch(e => console.warn('Violation sync delayed'));
    }
  }, [session]);

  // 4. Behavioral Monitoring (Keyboard, Tab Switch, Focus)
  useEffect(() => {
    const handleVis = () => { if (document.hidden) reportBehavior('tab_switch', 'critical', 'Tab switch / Minimized window', 2000); };
    const handleBlur = () => { reportBehavior('tab_switch', 'critical', 'Navigation out of exam window', 2000); };
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c','v','x','p'].includes(e.key.toLowerCase())) {
        e.preventDefault(); reportBehavior('copy_paste', 'medium', 'Keyboard shortcut blocked', 5000);
      }
      if (e.key === 'Escape' || e.key === 'F11') {
         reportBehavior('fullscreen_exit', 'medium', 'Suspicious key pattern used', 5000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('contextmenu', e => e.preventDefault());
    };
  }, [reportBehavior]);

  const canvasRef = useRef(null);

  // 5. ASYNC ENTERPRISE AI LOOP (Server-Driven Visualization)
  useEffect(() => {
    let active = true;

    const captureLoop = async () => {
      while (active && !terminalStatus) {
        if (webcamRef.current) {
          const video = webcamRef.current.video;
          const canvas = canvasRef.current;
          
          if (video && canvas) {
             if (canvas.width !== video.videoWidth) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
             }
          }

          const imageSrc = webcamRef.current.getScreenshot({ width: 640, height: 480, quality: 0.5 });
          
          if (imageSrc) {
            try {
               tickCount.current += 1;
               const currentAudioLevel = audioLevelRef.current || 0;
               
               const shouldSendAudio = (currentAudioLevel > 40) || (tickCount.current % 50 === 0);
               
               const response = await sendFrame(
                 imageSrc, 
                 session?.id, 
                 currentAudioLevel,
                 shouldSendAudio ? audioSnapshotRef.current : null
               );
              
              if (response && response.risk_score !== undefined) {
                  setRiskScore(response.risk_score);
                  setLastSync(Date.now());
               }

              if (response?.detections) {
                 setCanvasDetections(response.detections.boxes || []);
              }
              
              if (response?.reasons?.length > 0) {
                 const latestIssue = response.reasons[response.reasons.length - 1];
                 setLatestViolation({ 
                   type: 'ai_signal', 
                   severity: 'medium', 
                   description: `AI Warning: ${latestIssue}` 
                 });
                 setTimeout(() => setLatestViolation(null), 3000);
              }

              if (response?.status === 'terminated') {
                 setTerminalStatus('terminated');
                 active = false;
              }

            } catch (err) {
              if (err.status === 403 || err.status === 401) {
                console.error("Session Terminated by Server");
                setTerminalStatus('terminated');
                active = false;
              }
              console.warn("Telemetry transmission error:", err);
            }
          }
        }
        
        if (riskScore >= 100) {
           setTerminalStatus('terminated');
           active = false;
        }

        // Reduced throttle for real-time responsiveness
        await new Promise(r => setTimeout(r, 400));
      }
    };

    if (session && isConnected) captureLoop();
    return () => { active = false; };
  }, [isConnected, sendFrame, session, riskScore, terminalStatus]);

  // Canvas Drawing Effect
  useEffect(() => {
     const canvas = canvasRef.current;
     if (!canvas || !canvas.width) return;
     const ctx = canvas.getContext('2d');
     ctx.clearRect(0, 0, canvas.width, canvas.height);

     // Detection frame was 640x480
     const scaleX = canvas.width / 640;
     const scaleY = canvas.height / 480;

     canvasDetections.forEach(box => {
        let color = '#10b981'; // Green for normal
        if (['PHONE', 'BOOK', 'TABLET/LAPTOP', 'BAGGAGE'].includes(box.label)) {
           color = '#ef4444'; // Red for violations
        }
        
        // Scale the box coordinates
        const x = box.x * scaleX;
        const y = box.y * scaleY;
        const w = box.w * scaleX;
        const h = box.h * scaleY;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.strokeRect(x, y, w, h);
        
        ctx.fillStyle = color;
        ctx.font = 'bold 14px Inter';
        ctx.shadowBlur = 0;
        ctx.fillText(box.label, x, y > 20 ? y - 5 : y + 20);
     });
  }, [canvasDetections]);

  // 6. Interactions
  const handleAnswer = (qid, val) => setAnswers(prev => ({ ...prev, [qid]: val }));
  const toggleFlag = (qid) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid); else next.add(qid);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit exam?')) return;
    setSubmitting(true);
    try {
      await examService.submitExam(session.id, answers);
      navigate('/candidate', { state: { msg: 'Exam completed successfully' } });
    } catch (err) {
      alert('Failed to submit exam');
      setSubmitting(false);
    }
  };

  // Setup formatting
  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || !questions.length) {
    return (
      <div className="exam-taking__loading">
        <div className="exam-taking__spinner" />
        <p>Initializing Secure Environment...</p>
      </div>
    );
  }

  const q = questions[currentQ];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="exam-layout">
      {/* Dynamic Security Overlays (Termination/Timeout) */}
      <AnimatePresence>
        {terminalStatus && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="exam-terminal-overlay"
          >
            <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="exam-terminal-card"
            >
              <div className={`exam-terminal-card__icon ${terminalStatus === 'terminated' ? 'is-danger' : 'is-warning'}`}>
                {terminalStatus === 'terminated' ? <AlertTriangle size={48} /> : <Clock size={48} />}
              </div>
              <h2 className="exam-terminal-card__title">
                {terminalStatus === 'terminated' ? 'Session Terminated' : 'Time Expired'}
              </h2>
              <p className="exam-terminal-card__desc">
                {terminalStatus === 'terminated' 
                  ? 'Your session has been terminated due to serious proctoring policy violations. All events have been logged for administrative review.'
                  : 'The examination time limit has been reached. Your current progress has been automatically saved.'
                }
              </p>
              
              <div className="exam-terminal-countdown">
                <div className="exam-terminal-countdown__label">Auto-redirecting in</div>
                <div className="exam-terminal-countdown__value">{countdown}s</div>
              </div>

              <Button 
                variant="primary" 
                className="w-full" 
                onClick={() => navigate('/candidate')}
              >
                Return to Dashboard Now
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Dynamic Security Toast */}
      <AnimatePresence mode="wait">
        {latestViolation && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -50, opacity: 0 }} 
            className="exam-security-toast"
          >
            <div className="exam-security-toast__icon">
              <AlertTriangle size={20} />
            </div>
            <div className="exam-security-toast__content">
              <span className="exam-security-toast__title">AI Security Alert</span>
              <p>{latestViolation.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Examination Dashboard */}
      <main className="exam-main">
        {/* Superior Header */}
        <header className="exam-header">
          <div className="exam-header__left">
            <div className="exam-header__badge">
              <Monitor size={14} />
              <span>Secure Session</span>
            </div>
            <h1 className="exam-header__title">{exam?.title}</h1>
          </div>

          <div className="exam-header__right">
            <div className={`exam-timer ${timeLeft < 300 ? 'exam-timer--urgent' : ''}`}>
              <Clock size={18} />
              <span>{formatTime(timeLeft)}</span>
            </div>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={submitting}>
              Finish Exam
            </Button>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="exam-progress-bar">
          <motion.div 
            className="exam-progress-bar__fill" 
            initial={{ width: 0 }}
            animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>

        {/* Question Area */}
        <div className="exam-question-container">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQ}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="exam-question-card"
            >
              <div className="exam-question-card__header">
                <Badge variant="neutral">Question {currentQ + 1} of {questions.length}</Badge>
                <button 
                  className={`exam-question-flag ${flagged.has(q.id) ? 'is-flagged' : ''}`}
                  onClick={() => toggleFlag(q.id)}
                >
                  <Flag size={16} fill={flagged.has(q.id) ? "currentColor" : "none"} />
                  <span>{flagged.has(q.id) ? 'Flagged' : 'Flag for review'}</span>
                </button>
              </div>

              <h2 className="exam-question-text">{q.text}</h2>

              <div className="exam-options-grid">
                {['A', 'B', 'C', 'D'].map((opt) => (
                  q[`option_${opt.toLowerCase()}`] && (
                    <motion.button
                      key={opt}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`exam-option-card ${answers[q.id] === opt ? 'is-selected' : ''}`}
                      onClick={() => handleAnswer(q.id, opt)}
                    >
                      <span className="exam-option-indicator">{opt}</span>
                      <span className="exam-option-content">{q[`option_${opt.toLowerCase()}`]}</span>
                      {answers[q.id] === opt && <motion.div layoutId="check" className="exam-option-check"><Shield size={12} /></motion.div>}
                    </motion.button>
                  )
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <footer className="exam-footer">
          <Button 
            variant="outline" 
            onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
            disabled={currentQ === 0}
          >
            <ChevronLeft size={18} /> Previous
          </Button>

          <div className="exam-footer__info">
            {answeredCount} of {questions.length} attempted
          </div>

          <Button 
            variant="primary" 
            onClick={() => currentQ === questions.length - 1 ? handleSubmit() : setCurrentQ(prev => prev + 1)}
          >
            {currentQ === questions.length - 1 ? 'Final Submission' : 'Next Question'}
            <ChevronRight size={18} />
          </Button>
        </footer>
      </main>

      {/* Surveillance Sidebar */}
      <aside className="exam-sidebar">
        <section className="exam-proctor-module">
          <div className="exam-hud">
            <Webcam 
              ref={webcamRef} 
              audio={false} 
              screenshotFormat="image/jpeg" 
              videoConstraints={{ width: 320, height: 240 }} 
              className="exam-hud__video"
            />
            <canvas ref={canvasRef} className="exam-hud__canvas" />
            
            <div className={`exam-hud__vignette ${riskScore > 60 ? 'is-critical' : ''}`} />
            <div className="exam-hud__scanning-line" />
            
            <div className="exam-hud__status">
              <div className={`status-dot ${isConnected ? 'is-online' : 'is-error'}`} />
              <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>

          <div className="exam-security-stats">
            <div className="security-stat">
              <span className="security-stat__label">Security Index</span>
              <div className="security-stat__bar">
                <motion.div 
                  className={`security-stat__fill security-stat__fill--${riskScore > 60 ? 'danger' : 'safe'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${riskScore}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="security-stat__value">
                  {riskScore}%
                  <motion.span 
                    key={lastSync}
                    initial={{ scale: 1.5, opacity: 1 }}
                    animate={{ scale: 1, opacity: 0.3 }}
                    style={{ color: '#10b981', marginLeft: '6px', fontSize: '0.8rem' }}
                  >●</motion.span>
                </span>
                <span style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isConnected ? 'Telemetry Stable' : 'Syncing...'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="exam-nav-module">
          <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Navigation</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{answeredCount}/{questions.length} Done</span>
          </header>
          <div className="exam-palette">
            {questions.map((qItem, idx) => {
              const isAnswered = !!answers[qItem.id];
              const isFlagged = flagged.has(qItem.id);
              const isCurrent = idx === currentQ;
              
              return (
                <button 
                  key={qItem.id}
                  onClick={() => setCurrentQ(idx)}
                  className={`exam-palette__item ${isCurrent ? 'is-current' : ''} ${isAnswered ? 'is-answered' : ''} ${isFlagged ? 'is-flagged' : ''}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </section>

        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
           <p style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
             Proctor monitoring active.<br/>Session ID: {session?.id?.slice(-8)}
           </p>
        </div>
      </aside>
    </div>
  );
};

export default ExamTaking;
