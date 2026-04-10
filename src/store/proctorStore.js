/**
 * ProctorStore — Zustand store for AI proctoring state.
 * Connected to proctorService for real API calls.
 */
import { create } from 'zustand';
import { proctorService } from '../services';

const useProctorStore = create((set, get) => ({
  // Real-time monitoring state
  riskScore: 0,
  violations: [],
  liveData: [],           // Active sessions for admin monitoring
  timeline: [],           // Session event timeline
  isMonitoring: false,

  // AI detection state
  faceDetected: true,
  faceCount: 1,
  eyesFocused: true,
  audioLevel: 0,
  objectsDetected: [],

  // Loading
  loading: false,
  error: null,

  // ==========================================
  // CANDIDATE — Violation Reporting
  // ==========================================

  /**
   * Report a violation detected by client-side AI.
   * Updates local risk score from server response.
   */
  reportViolation: async ({ session_id, violation_type, severity, description, snapshot, metadata }) => {
    try {
      const result = await proctorService.reportViolation({
        session_id, violation_type, severity, description, snapshot, metadata,
      });

      set((state) => ({
        riskScore: result.risk_score,
        violations: [result.violation, ...state.violations],
      }));

      return result;
    } catch (err) {
      console.error('Violation report failed:', err);
      // Still track locally even if API fails
      set((state) => ({
        violations: [{
          violation_type, severity, description,
          timestamp: new Date().toISOString(),
          local: true,
        }, ...state.violations],
      }));
    }
  },

  /**
   * Report tab switch violation (convenience method).
   */
  reportTabSwitch: (sessionId) => {
    return get().reportViolation({
      session_id: sessionId,
      violation_type: proctorService.VIOLATION_TYPES.TAB_SWITCH,
      severity: 'high',
      description: 'Candidate switched browser tab',
    });
  },

  /**
   * Report copy/paste attempt.
   */
  reportCopyPaste: (sessionId) => {
    return get().reportViolation({
      session_id: sessionId,
      violation_type: proctorService.VIOLATION_TYPES.COPY_PASTE,
      severity: 'medium',
      description: 'Copy/paste attempt detected',
    });
  },

  /**
   * Report devtools opened.
   */
  reportDevtools: (sessionId) => {
    return get().reportViolation({
      session_id: sessionId,
      violation_type: proctorService.VIOLATION_TYPES.DEVTOOLS,
      severity: 'critical',
      description: 'Developer tools opened',
    });
  },

  // ==========================================
  // AI Detection State Updates (local)
  // ==========================================

  setFaceState: (detected, count = 1) => set({ faceDetected: detected, faceCount: count }),
  setEyesFocused: (focused) => set({ eyesFocused: focused }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  setObjectsDetected: (objects) => set({ objectsDetected: objects }),

  // ==========================================
  // ADMIN — Live Monitoring
  // ==========================================

  /** Fetch live monitoring data. */
  fetchLiveData: async () => {
    set({ loading: true });
    try {
      const data = await proctorService.getLiveData();
      set({ liveData: data, loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  /** Force refresh (bypasses cache). */
  refreshLiveData: async () => {
    try {
      const data = await proctorService.refreshLiveData();
      set({ liveData: data });
      return data;
    } catch (err) {
      set({ error: err.message });
    }
  },

  // ==========================================
  // ADMIN — Violations & Timeline
  // ==========================================

  /** Fetch all violations. */
  fetchViolations: async (params) => {
    set({ loading: true });
    try {
      const violations = await proctorService.getViolations(params);
      set({ violations, loading: false });
      return violations;
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  /** Fetch session timeline. */
  fetchTimeline: async (sessionId) => {
    set({ loading: true });
    try {
      const timeline = await proctorService.getSessionTimeline(sessionId);
      set({ timeline, loading: false });
      return timeline;
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ==========================================
  // Monitoring Controls
  // ==========================================

  startMonitoring: () => set({ isMonitoring: true, riskScore: 0, violations: [] }),
  stopMonitoring: () => set({ isMonitoring: false }),

  resetProctor: () => set({
    riskScore: 0, violations: [], liveData: [], timeline: [],
    isMonitoring: false, faceDetected: true, faceCount: 1,
    eyesFocused: true, audioLevel: 0, objectsDetected: [],
    loading: false, error: null,
  }),
}));

export default useProctorStore;
