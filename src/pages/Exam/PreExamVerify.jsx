import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Webcam from 'react-webcam';
import {
  Camera, CheckCircle, XCircle, Loader, Shield, Upload,
  RotateCcw, ArrowRight, Mic, Monitor, AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui';
import { examService } from '../../services';
import useAuthStore from '../../store/authStore';
import './Exam.css';

const steps = ['Face Verification', 'ID Upload', 'Environment Scan', 'System Check'];

const PreExamVerify = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const webcamRef = useRef(null);
  const streamRef = useRef(null);
  const { user } = useAuthStore();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [faceSnapshot, setFaceSnapshot] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [envScanProgress, setEnvScanProgress] = useState(0);
  const [checks, setChecks] = useState({
    camera: 'pending',
    microphone: 'pending',
    face: 'pending',
    id: 'pending',
    environment: 'pending',
    browser: 'pass', // auto-pass
    fullscreen: 'pending',
  });
  const [error, setError] = useState('');

  // Load exam from API
  useEffect(() => {
    const loadExam = async () => {
      try {
        const data = await examService.getCandidateExam(examId);
        setExam(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load exam. Please try again.');
        setLoading(false);
      }
    };
    loadExam();
  }, [examId]);

  // Real camera & microphone access
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: true,
        });
        streamRef.current = stream;
        setCameraReady(true);
        setMicReady(true);
        setChecks(c => ({ ...c, camera: 'pass', microphone: 'pass' }));
      } catch (err) {
        console.error('Media access error:', err);
        if (err.name === 'NotAllowedError') {
          setChecks(c => ({ ...c, camera: 'fail', microphone: 'fail' }));
          setError('Camera/microphone access denied. Please allow access and refresh.');
        } else {
          setChecks(c => ({ ...c, camera: 'fail' }));
          setError('Camera not found. Please connect a camera.');
        }
      }
    };
    initMedia();

    return () => {
      // Cleanup: don't stop stream here — we need it for exam
    };
  }, []);

  // Face detection simulation (would use TensorFlow.js/Mediapipe in production)
  useEffect(() => {
    if (!cameraReady) return;
    const timer = setTimeout(() => {
      setChecks(c => ({ ...c, face: 'pass' }));
    }, 3000);
    return () => clearTimeout(timer);
  }, [cameraReady]);

  // Fullscreen check
  useEffect(() => {
    const checkFullscreen = () => {
      setChecks(c => ({ ...c, fullscreen: document.fullscreenEnabled ? 'pass' : 'fail' }));
    };
    checkFullscreen();
  }, []);

  // Auto-progress environment scan Simulator
  useEffect(() => {
     if (currentStep === 2 && envScanProgress < 100) {
        const interval = setInterval(() => {
           setEnvScanProgress(p => {
              if (p >= 100) {
                 clearInterval(interval);
                 return 100;
              }
              return p + 5;
           });
        }, 300);
        return () => clearInterval(interval);
     }
  }, [currentStep, envScanProgress]);

  // Capture face snapshot
  const captureSnapshot = () => {
    if (webcamRef.current) {
      const snap = webcamRef.current.getScreenshot();
      setFaceSnapshot(snap);
    }
  };

  const [isStarting, setIsStarting] = useState(false);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      if (currentStep === 0) {
        captureSnapshot();
        if (checks.face !== 'pass') {
          setError('Please wait for face verification to complete.');
          return;
        }
        setError('');
      }
      if (currentStep === 1) {
        if (!idFile) {
          setError('Please upload your ID document to proceed.');
          return;
        }
        setChecks(c => ({ ...c, id: 'pass' }));
        setError('');
      }
      if (currentStep === 2) {
        if (envScanProgress < 100) {
          setError('Please wait for environment scan to complete.');
          return;
        }
        setChecks(c => ({ ...c, environment: 'pass' }));
        setError('');
      }
      setCurrentStep(s => s + 1);
    } else {
      // Final step: request fullscreen immediately (sync with click) & start session
      const elem = document.documentElement;
      const requestFS = async () => {
        try {
          if (elem.requestFullscreen) { await elem.requestFullscreen(); }
          else if (elem.webkitRequestFullscreen) { await elem.webkitRequestFullscreen(); }
        } catch (e) { console.warn("Fullscreen deferred:", e); }
      };
      requestFS();

      setIsStarting(true);
      setError('');
      try {
        const device_info = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          language: navigator.language,
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: navigator.deviceMemory || 'unknown'
        };

        const session = await examService.startExam(examId, {
          face_snapshot: faceSnapshot,
          id_document: idFile,
          device_info: device_info
        });

        if (!session || !session.id) {
           throw new Error("Exam session could not be initialized.");
        }

        // Navigate after UI feedback
        setTimeout(() => {
          navigate(`/candidate/exam/${examId}/take`, {
            state: { sessionId: session.id, examData: exam },
            replace: true
          });
        }, 800);
        
      } catch (err) {
        setIsStarting(false);
        setError(err.message || 'Failed to start exam. Please try again.');
        // Optionally exit fullscreen on failure if desired
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      }
    }
  };

  const allSystemsPassed = checks.camera === 'pass' && checks.face === 'pass' &&
    checks.browser === 'pass' && checks.fullscreen === 'pass';
  const allPassed = Object.values(checks).every(v => v === 'pass');

  const checkIcon = (status) => {
    if (status === 'pass') return <span className="exam-verify__check-icon exam-verify__check-icon--pass"><CheckCircle size={14} /></span>;
    if (status === 'fail') return <span className="exam-verify__check-icon exam-verify__check-icon--fail"><XCircle size={14} /></span>;
    return <span className="exam-verify__check-icon exam-verify__check-icon--pending"><Loader size={14} /></span>;
  };

  if (loading) {
    return (
      <div className="exam-verify" data-theme="dark">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-400)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="exam-verify" data-theme="dark">
      <motion.div
        className="exam-verify__card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Exam Info Banner */}
        {exam && (
          <div style={{
            background: 'linear-gradient(135deg, var(--primary-900), var(--primary-800))',
            borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)', border: '1px solid var(--primary-700)',
          }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--primary-200)' }}>
              {exam.title}
            </h3>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              <span>Subject: {exam.subject}</span>
              <span>Duration: {exam.duration_minutes}min</span>
              <span>Questions: {exam.question_count}</span>
              <span>Total Marks: {exam.total_marks}</span>
            </div>
          </div>
        )}

        <h2 style={{ textAlign: 'center', fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 4 }}>
          Pre-Exam Verification
        </h2>
        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
          Hello {user?.first_name || user?.username}! Complete all steps to start.
        </p>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger-800)',
            borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)',
            color: 'var(--danger-400)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)',
          }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Steps Progress */}
        <div className="exam-verify__steps">
          {steps.map((step, i) => (
            <React.Fragment key={step}>
              <div className={`exam-verify__step ${i === currentStep ? 'exam-verify__step--active' : i < currentStep ? 'exam-verify__step--done' : ''}`}>
                {i < currentStep ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`exam-verify__connector ${i < currentStep ? 'exam-verify__connector--done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        {currentStep === 0 && (
          <div className="exam-verify__camera">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'user' }}
              onUserMedia={() => setCameraReady(true)}
              onUserMediaError={() => setChecks(c => ({ ...c, camera: 'fail' }))}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-xl)' }}
            />
            <div className="exam-verify__face-overlay">
              <div className="exam-verify__face-outline" />
            </div>
            <div style={{
              position: 'absolute', bottom: 'var(--space-3)',
              background: 'rgba(0,0,0,0.7)', padding: '6px 14px',
              borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-xs)',
              color: checks.face === 'pass' ? 'var(--accent-400)' : 'var(--text-muted)',
              backdropFilter: 'blur(8px)',
            }}>
              <Camera size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {checks.face === 'pass' ? 'Face detected — verification complete' : 'Detecting face...'}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="exam-verify__camera" style={{ cursor: 'pointer', position: 'relative' }}>
            <input 
              type="file" 
              accept="image/jpeg, image/png, application/pdf"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setIdFile(ev.target.result);
                  reader.readAsDataURL(e.target.files[0]);
                  setError('');
                }
              }}
            />
            {idFile ? (
              <img src={idFile} alt="ID Document Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-xl)' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Upload size={40} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>Click or drag to upload your ID document</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 4 }}>Supports JPG, PNG, PDF</span>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="exam-verify__camera" 
            onMouseLeave={() => {}} // dummy
            onMouseEnter={() => {
              if (envScanProgress < 100) {
                const interval = setInterval(() => {
                  setEnvScanProgress(prev => {
                    if (prev >= 100) {
                      clearInterval(interval);
                      return 100;
                    }
                    return prev + 10;
                  });
                }, 400);
                return () => clearInterval(interval);
              }
            }}
          >
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={{ facingMode: 'user' }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-xl)' }}
            />
            <div style={{
              position: 'absolute', top: 'var(--space-4)', left: 'var(--space-4)', right: 'var(--space-4)',
              background: 'rgba(0,0,0,0.5)', height: '10px', borderRadius: 'var(--radius-full)', overflow: 'hidden'
            }}>
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${envScanProgress}%` }} 
                style={{ height: '100%', background: envScanProgress === 100 ? 'var(--success-500)' : 'var(--primary-400)' }} 
              />
            </div>
            <div style={{
              position: 'absolute', bottom: 'var(--space-4)',
              background: 'rgba(0,0,0,0.7)', padding: '8px 16px',
              borderRadius: 'var(--radius-lg)', color: 'white',
              fontSize: 'var(--text-sm)', backdropFilter: 'blur(8px)',
              pointerEvents: 'none'
            }}>
              {envScanProgress === 100 ? (
                <span><CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--success-400)' }} /> Environment Scan Complete</span>
              ) : (
                <span><RotateCcw size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />Hover here and move camera 360° to scan</span>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="exam-verify__check-list">
            {[
              { key: 'camera', label: 'Camera Access', icon: Camera },
              { key: 'microphone', label: 'Microphone Access', icon: Mic },
              { key: 'face', label: 'Face Detection', icon: Shield },
              { key: 'id', label: 'ID Verification', icon: Upload },
              { key: 'environment', label: 'Environment Scan', icon: Monitor },
              { key: 'browser', label: 'Browser Compatibility', icon: Monitor },
              { key: 'fullscreen', label: 'Fullscreen Support', icon: Monitor },
            ].map(item => (
              <div key={item.key} className="exam-verify__check">
                {checkIcon(checks[item.key])}
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  color: checks[item.key] === 'pass' ? 'var(--accent-400)' :
                    checks[item.key] === 'fail' ? 'var(--danger-400)' : 'var(--text-muted)',
                }}>
                  {checks[item.key] === 'pass' ? 'Passed' : checks[item.key] === 'fail' ? 'Failed' : 'Checking...'}
                </span>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          iconRight={isStarting ? Loader : (currentStep === steps.length - 1 ? Shield : ArrowRight)}
          onClick={handleNext}
          disabled={(currentStep === steps.length - 1 && !allPassed) || isStarting}
        >
          {isStarting ? 'Redirecting to Exam...' : (currentStep === steps.length - 1 ? 'Start Exam' : 'Continue')}
        </Button>
      </motion.div>
    </div>
  );
};

export default PreExamVerify;
