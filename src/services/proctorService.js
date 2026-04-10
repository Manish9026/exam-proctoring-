/**
 * ProctorService — AI Proctoring & Monitoring API module.
 *
 * Endpoints:
 *   POST  /api/proctoring/report-violation/       — Report AI violation
 *   GET   /api/proctoring/violations/             — All violations (admin)
 *   GET   /api/proctoring/timeline/:sessionId/    — Session timeline (admin)
 *   GET   /api/proctoring/live/                   — Live monitoring data (admin)
 */
import http from './api';
import cache from './cache';

const TTL = {
  LIVE: 2_000,          // 2s — true real-time
  TIMELINE: 30_000,     // 30s
};

const proctorService = {
  // ==========================================
  // CANDIDATE — Violation Reporting
  // ==========================================

  /**
   * Report a violation detected by client-side AI.
   * Returns { violation, risk_score, warning, terminated }.
   */
  async reportViolation({ session_id, violation_type, severity = 'medium', description = '', snapshot, metadata = {} }) {
    const result = await http.post('/proctoring/report-violation/', {
      session_id, violation_type, severity, description, snapshot, metadata,
    });
    // Invalidate caches that depend on risk/violation data
    cache.invalidatePrefix('proctor:');
    cache.invalidatePrefix('sessions:');
    cache.invalidate('admin:stats');
    return result;
  },

  /**
   * Report a violation with a snapshot image.
   */
  async reportViolationWithSnapshot({ session_id, violation_type, severity, description, snapshot }) {
    const formData = new FormData();
    formData.append('session_id', session_id);
    formData.append('violation_type', violation_type);
    formData.append('severity', severity || 'medium');
    formData.append('description', description || '');
    if (snapshot) formData.append('snapshot', snapshot);
    
    const result = await http.upload('/proctoring/report-violation/', formData);
    cache.invalidatePrefix('proctor:');
    return result;
  },

  // ==========================================
  // ADMIN — Violation Logs
  // ==========================================

  /** Get all violations (admin, cached 30s). */
  async getViolations(params = {}) {
    const key = `proctor:violations:${JSON.stringify(params)}`;
    return cache.fetch(key, () => http.get('/proctoring/violations/', params), TTL.VIOLATIONS);
  },

  /** Get session event timeline (admin, cached 1 min). */
  async getSessionTimeline(sessionId) {
    const key = `proctor:timeline:${sessionId}`;
    return cache.fetch(key, () => http.get(`/proctoring/timeline/${sessionId}/`), TTL.TIMELINE);
  },

  // ==========================================
  // ADMIN — Live Monitoring
  // ==========================================

  /**
   * Get all active sessions with risk data (cached 2s).
   * Used by the admin live monitoring grid.
   */
  async getLiveData() {
    return cache.fetch('proctor:live', () => http.get('/proctoring/live/'), TTL.LIVE);
  },

  /**
   * Force-refresh live monitoring data (bypasses cache).
   */
  async refreshLiveData() {
    cache.invalidate('proctor:live');
    return http.get('/proctoring/live/');
  },

  // ==========================================
  // ADMIN — System Configuration
  // ==========================================

  /** Get proctoring config (file-based). */
  async getConfig() {
    return http.get('/proctoring/config/');
  },

  /** Update proctoring config (file-based). */
  async updateConfig(config) {
    const res = await http.post('/proctoring/config/', config);
    cache.invalidatePrefix('proctor:');
    return res;
  },

  // ==========================================
  // CLIENT-SIDE VIOLATION TYPES
  // ==========================================
  VIOLATION_TYPES: {
    FACE_MISSING: 'face_missing',
    FACE_MISMATCH: 'face_mismatch',
    MULTIPLE_FACES: 'multiple_faces',
    EYE_MOVEMENT: 'eye_movement',
    TAB_SWITCH: 'tab_switch',
    PHONE_DETECTED: 'phone_detected',
    OBJECT_DETECTED: 'object_detected',
    AUDIO_DETECTED: 'audio_detected',
    COPY_PASTE: 'copy_paste',
    DEVTOOLS: 'devtools',
    FULLSCREEN_EXIT: 'fullscreen_exit',
  },

  SEVERITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
};

export default proctorService;
