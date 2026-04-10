import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import useNetworkQueue from '../../hooks/useNetworkQueue'; 

import { 
  Clock, ChevronLeft, ChevronRight, Flag, Send, AlertTriangle, 
  Camera, Shield, Brain, Wifi, Monitor, X 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button, Badge, Card } from '../../components/ui';
import { examService, proctorService } from '../../services';
import './Exam.css';

const ExamTaking = () => {
  const DEBUG_MODE = true; // Set to true to enable on-screen dev logs and disable anti-cheat blocks
  const [debugLogs, setDebugLogs] = useState([]);

  const addDebugLog = useCallback((msg) => {
    if (!DEBUG_MODE) return;
    setDebugLogs(prev => {
      const newLogs = [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`];
      return newLogs.slice(-15); // keep last 15
    });
  }, [DEBUG_MODE]);

  const [cameraStream, setCameraStream] = useState(null);
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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
  const riskScoreRef = useRef(0); // For loop access without stale state
  const [lastSync, setLastSync] = useState(Date.now());
  const [canvasDetections, setCanvasDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState(null); // 'terminated' | 'time_out'
  const terminalStatusRef = useRef(null);
  const [countdown, setCountdown] = useState(15);
  const [latestViolation, setLatestViolation] = useState(null);
  const seenReasonsRef = useRef(new Set()); 
  
  // Mobile & Camera States
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [cameraMode, setCameraMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const tickCount = useRef(0);
  const countdownTimerRef = useRef(null);

  // 1. Initialize Exam & Devices
  useEffect(() => {
    const init = async () => {
      try {
        // Check for multiple cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);

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
        
        // Restore previous answers if any
        if (sess.answers && sess.answers.length > 0) {
          const restored = {};
          sess.answers.forEach(a => {
            const qObj = ex.questions[a.question_index];
            if (qObj) restored[qObj.id] = a.selected_answer;
          });
          setAnswers(restored);
        }

        setLoading(false);
      } catch (err) {
        console.error('Init failed:', err);
        navigate('/candidate');
      }
    };
    init();

    const handleResize = () => setSidebarOpen(window.innerWidth > 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [examId]);

  // Handle auto-termination countdown
  useEffect(() => {
    terminalStatusRef.current = terminalStatus;
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
    if (DEBUG_MODE) return; // Disable anti-cheat behaviors in developer mode

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
  }, [reportBehavior, DEBUG_MODE]);

  const canvasRef = useRef(null);

  // 5. ASYNC ENTERPRISE AI LOOP (Server-Driven Visualization)
  useEffect(() => {
    let active = true;

    const captureLoop = async () => {
      console.info("[AI Engine] Capture loop initialized and looping.");
      addDebugLog("Capture loop mounted.");
      while (active && !terminalStatusRef.current) {
        if (webcamRef.current && webcamRef.current.video) {
          const video = webcamRef.current.video;
          const canvas = canvasRef.current;
          
          if (video.readyState >= 2 && video.videoWidth > 0) {
              if (canvas && canvas.width !== video.videoWidth) {
                 canvas.width = video.videoWidth;
                 canvas.height = video.videoHeight;
              }

              const imageSrc = webcamRef.current.getScreenshot({ width: 640, height: 480, quality: 0.5 });
              
              if (imageSrc) {
                try {
                   tickCount.current += 1;
                   const currentAudioLevel = audioLevelRef.current || 0;
                   const shouldSendAudio = (currentAudioLevel > 40) || (tickCount.current % 50 === 0);
                   
                   addDebugLog(`Invoking API sendFrame for tick ${tickCount.current}...`);
                   
                   const response = await sendFrame(
                     imageSrc, 
                     session?.id || session?._id, 
                     currentAudioLevel,
                     shouldSendAudio ? audioSnapshotRef.current : null
                   );
                   
                   addDebugLog(`API Response: ${JSON.stringify(response || {error: 'No response'})}`);
                  
                  if (response && response.risk_score !== undefined) {
                      const newScore = response.risk_score;
                      setRiskScore(newScore);
                      riskScoreRef.current = newScore;
                      setLastSync(Date.now());

                      if (newScore >= 100) {
                        setTerminalStatus('terminated');
                        active = false;
                        break;
                      }
                   }

                  if (response?.detections?.boxes) {
                     setCanvasDetections(response.detections.boxes);
                  }
                  
                  if (response?.reasons?.length > 0) {
                     response.reasons.forEach(reason => {
                        const reasonKey = `${reason}_${Math.floor(Date.now() / 10000)}`; // unique per 10s
                        if (!seenReasonsRef.current.has(reasonKey)) {
                           toast.error(reason, { 
                             id: reasonKey,
                             duration: 5000,
                             icon: '⚠️'
                           });
                           seenReasonsRef.current.add(reasonKey);
                           setTimeout(() => seenReasonsRef.current.delete(reasonKey), 10000);
                        }
                     });
                  }

                   if (response?.status === 'terminated') {
                     setTerminalStatus('terminated');
                     active = false;
                  }

                } catch (err) {
                  addDebugLog(`Transmission Catch ER: ${err.message || 'Unknown'}`);
                  if (err.status === 403 || err.status === 401) {
                    setTerminalStatus('terminated');
                    active = false;
                  }
                }
              } else {
                 addDebugLog("getScreenshot returned null.");
              }
          } else {
             // addDebugLog(`Video waiting. ReadyState: ${video.readyState}`);
          }
        } else {
           // addDebugLog("Webcam ref not ready.");
        }
        
        // Final fallback safeguard
        if (riskScoreRef.current >= 100) {
           setTerminalStatus('terminated');
           active = false;
        }

        await new Promise(r => setTimeout(r, 400));
      }
      addDebugLog("Capture loop exited.");
    };

    if (session && !terminalStatusRef.current) captureLoop();
    return () => { active = false; };
  }, [sendFrame, session]);

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

  // 6. Interactions (Isolated & Persistent)
  const handleAnswer = async (qid, val) => {
    // 1. Update UI immediately
    setAnswers(prev => ({ ...prev, [qid]: val }));
    
    // 2. Sync to Database (Isolation)
    try {
      if (session) {
        await examService.submitAnswer(session.id, {
          question_index: questions.findIndex(ques => ques.id === qid),
          selected_answer: val,
          is_flagged: flagged.has(qid)
        });
      }
    } catch (err) {
      console.warn('Answer sync failed, will retry on submission or next answer');
    }
  };

  const toggleFlag = async (qid) => {
    const isNowFlagged = !flagged.has(qid);
    
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid); else next.add(qid);
      return next;
    });

    // Save flag state
    try {
      if (session && answers[qid]) {
        await examService.submitAnswer(session.id, {
          question_index: questions.findIndex(ques => ques.id === qid),
          selected_answer: answers[qid],
          is_flagged: isNowFlagged
        });
      }
    } catch (e) {
       console.debug('Flag state sync deferred');
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit exam? All your answers have been auto-saved.')) return;
    setSubmitting(true);
    try {
      await examService.submitExam(session.id);
      navigate('/candidate', { state: { msg: 'Exam completed successfully' } });
    } catch (err) {
      alert('Failed to final submit exam. Please try again.');
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

  const toggleCamera = () => {
    setCameraMode(prev => prev === 'user' ? 'environment' : 'user');
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
    <div className={`exam-layout ${!sidebarOpen ? 'is-sidebar-collapsed' : ''}`}>
      
      {/* DEVELOPER HUD OVERLAY */}
      {DEBUG_MODE && (
        <div style={{
          position: 'fixed', top: 10, left: 10, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)', color: '#0f0',
          fontFamily: 'monospace', fontSize: '11px', padding: '10px',
          borderRadius: '4px', maxWidth: '400px', pointerEvents: 'none'
        }}>
          <h4 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #0f0' }}>AI ENGINE DEBUGGER</h4>
          <div>Session ID: {session?.id || session?._id || 'null'}</div>
          <div>Terminal Status: {String(terminalStatusRef.current)}</div>
          <br/>
          {debugLogs.map((lg, i) => <div key={i}>{lg}</div>)}
        </div>
      )}

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

      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20}/> : <Shield size={20}/>}
      </button>

      {/* Persistent AI Surveillance Engine (Off-screen rendering) */}
      <div style={{ position: 'fixed', right: -9999, bottom: -9999, width: 640, height: 480, pointerEvents: 'none' }}>
        <Webcam 
          ref={webcamRef} 
          audio={false} 
          screenshotFormat="image/jpeg" 
          onUserMedia={(s) => setCameraStream(s)}
          videoConstraints={{ 
            width: 640, 
            height: 480, 
            facingMode: cameraMode 
          }} 
        />
        <canvas ref={canvasRef} />
      </div>

      {/* Main Examination Dashboard */}
      <main className="exam-main">
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
              <Clock size={16} />
              <span>{formatTime(timeLeft)}</span>
            </div>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={submitting}>
              Submit
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

        {/* Global Warning Overlay for Critical Risk */}
        <AnimatePresence>
          {riskScore > 60 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="exam-danger-overlay"
            />
          )}
        </AnimatePresence>

        {/* Question Area */}
        <div className="exam-question-container">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="exam-question-card"
            >
              <div className="exam-question-card__header">
                <Badge variant="neutral">Q{currentQ + 1} / {questions.length}</Badge>
                <button 
                  className={`exam-question-flag ${flagged.has(q.id) ? 'is-flagged' : ''}`}
                  onClick={() => toggleFlag(q.id)}
                >
                  <Flag size={14} fill={flagged.has(q.id) ? "currentColor" : "none"} />
                  <span>{flagged.has(q.id) ? 'Flagged' : 'Review'}</span>
                </button>
              </div>

              <h2 className="exam-question-text">{q.text}</h2>

              <div className="exam-options-grid">
                {['A', 'B', 'C', 'D'].map((opt) => (
                  q[`option_${opt.toLowerCase()}`] && (
                    <motion.button
                      key={opt}
                      whileTap={{ scale: 0.98 }}
                      className={`exam-option-card ${answers[q.id] === opt ? 'is-selected' : ''}`}
                      onClick={() => handleAnswer(q.id, opt)}
                    >
                      <span className="exam-option-indicator">{opt}</span>
                      <span className="exam-option-content">{q[`option_${opt.toLowerCase()}`]}</span>
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
            variant="ghost" 
            size="sm"
            onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
            disabled={currentQ === 0}
            icon={ChevronLeft}
          >Prev</Button>

          <Button 
            variant="primary" 
            size="sm"
            onClick={() => currentQ === questions.length - 1 ? handleSubmit() : setCurrentQ(prev => prev + 1)}
          >
            {currentQ === questions.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight size={16} />
          </Button>
        </footer>
      </main>

      {/* Surveillance Sidebar (Visual Monitor Only) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside 
            initial={{ x: 280 }}
            animate={{ x: 0 }}
            exit={{ x: 280 }}
            className="exam-sidebar"
          >
            <section className="exam-proctor-module">
              <div className="exam-hud">
                {/* Mirror the main webcam feed visually using reactive stream */}
                <video 
                   autoPlay 
                   muted 
                   playsInline 
                   ref={(el) => { if(el && cameraStream) el.srcObject = cameraStream; }}
                   className="exam-hud__video"
                   style={{ transform: cameraMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />
                <canvas 
                  className="exam-hud__canvas" 
                  ref={(el) => {
                    if (el && canvasRef.current) {
                      const ctx = el.getContext('2d');
                      const render = () => {
                         if (!canvasRef.current || canvasRef.current.width === 0) return;
                         if (!el || el.width === 0) return;
                         ctx.clearRect(0,0, el.width, el.height);
                         ctx.drawImage(canvasRef.current, 0, 0, el.width, el.height);
                         requestAnimationFrame(render);
                      };
                      render();
                    }
                  }}
                />
                
                {hasMultipleCameras && (
                  <button className="camera-switch-btn" onClick={toggleCamera}>
                    <Camera size={14} />
                  </button>
                )}

                <div className="exam-hud__status">
                  <div className={`status-dot ${isConnected ? 'is-online' : 'is-error'}`} />
                  <span>{isConnected ? 'SECURE' : 'CONNECTING'}</span>
                </div>
              </div>

              <div className="exam-security-stats">
                <div className="security-stat">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="security-stat__label">Integrity Index</span>
                    <span className="security-stat__value">{100 - Math.round(riskScore)}%</span>
                  </div>
                  <div className="security-stat__bar">
                    <motion.div 
                      className={`security-stat__fill security-stat__fill--${riskScore > 60 ? 'danger' : 'safe'}`}
                      animate={{ width: `${100 - riskScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="exam-nav-module">
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
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};


export default ExamTaking;
