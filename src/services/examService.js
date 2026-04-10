/**
 * ExamService — Exam CRUD & candidate exam flow API module.
 *
 * Admin Endpoints:
 *   GET/POST      /api/exams/                     — List/Create exams
 *   GET/PUT/DEL   /api/exams/:id/                 — CRUD single exam
 *   POST          /api/exams/:id/questions/       — Add question
 *   POST          /api/exams/:id/activate/        — Activate exam
 *   GET           /api/exams/:id/sessions/        — Exam sessions
 *   GET           /api/sessions/                  — All sessions
 *   GET           /api/admin/stats/               — Dashboard stats
 *
 * Candidate Endpoints:
 *   GET           /api/candidate/exams/           — Available exams
 *   GET           /api/candidate/exams/:id/       — Exam detail
 *   POST          /api/candidate/exams/:id/start/ — Start session
 *   GET           /api/candidate/sessions/        — My results
 *   POST          /api/candidate/sessions/:id/answer/ — Submit answer
 *   POST          /api/candidate/sessions/:id/submit/ — Submit exam
 */
import http from './api';
import cache from './cache';

// Cache TTLs
const TTL = {
  LIST: 2 * 60_000,        // 2 min for lists
  DETAIL: 5 * 60_000,      // 5 min for details
  STATS: 30_000,           // 30s for live stats
  SESSIONS: 15_000,        // 15s for active sessions
};

const examService = {
  // ==========================================
  // ADMIN — Exam Management
  // ==========================================

  /** List all exams (cached). */
  async listExams(params = {}) {
    const key = `exams:list:${JSON.stringify(params)}`;
    return cache.fetch(key, () => http.get('/exams/', params), TTL.LIST);
  },

  /** Get single exam with questions (cached). */
  async getExam(examId) {
    const key = `exams:detail:${examId}`;
    return cache.fetch(key, () => http.get(`/exams/${examId}/`), TTL.DETAIL);
  },

  /** Create a new exam. */
  async createExam(data) {
    const result = await http.post('/exams/', data);
    cache.invalidatePrefix('exams:');
    return result;
  },

  /** Update an exam. */
  async updateExam(examId, data) {
    const result = await http.put(`/exams/${examId}/`, data);
    cache.invalidatePrefix('exams:');
    return result;
  },

  /** Delete an exam. */
  async deleteExam(examId) {
    await http.del(`/exams/${examId}/`);
    cache.invalidatePrefix('exams:');
  },

  /** Add question to exam. */
  async addQuestion(examId, questionData) {
    const result = await http.post(`/exams/${examId}/questions/`, questionData);
    cache.invalidate(`exams:detail:${examId}`);
    return result;
  },

  /** Activate an exam (make it live). */
  async activateExam(examId) {
    const result = await http.post(`/exams/${examId}/activate/`);
    cache.invalidatePrefix('exams:');
    return result;
  },

  /** Get all sessions for a specific exam. */
  async getExamSessions(examId) {
    return http.get(`/exams/${examId}/sessions/`);
  },

  // ==========================================
  // ADMIN — Session Management
  // ==========================================

  /** List all sessions across exams. */
  async listSessions(params = {}) {
    const key = `sessions:list:${JSON.stringify(params)}`;
    return cache.fetch(key, () => http.get('/sessions/', params), TTL.SESSIONS);
  },

  /** Get session detail. */
  async getSession(sessionId) {
    return http.get(`/sessions/${sessionId}/`);
  },

  /** Update session (e.g., terminate). */
  async updateSession(sessionId, data) {
    const result = await http.patch(`/sessions/${sessionId}/`, data);
    cache.invalidatePrefix('sessions:');
    return result;
  },

  /** Terminate a candidate's session. */
  async terminateSession(sessionId) {
    return this.updateSession(sessionId, { status: 'terminated' });
  },

  // ==========================================
  // ADMIN — Dashboard Stats
  // ==========================================

  /** Get aggregated dashboard stats (cached 30s). */
  async getDashboardStats() {
    return cache.fetch('admin:stats:v2', () => http.get('/admin/stats/'), TTL.STATS);
  },

  /** Get list of candidates with stats for admin. */
  async adminGetCandidates() {
    return http.get('/admin/candidates/');
  },

  /** Get deep analytics for admin. */
  async adminGetAnalytics() {
    return http.get('/admin/analytics/');
  },

  // ==========================================
  // CANDIDATE — Exam Flow
  // ==========================================

  /** Get available exams for candidates. */
  async getAvailableExams() {
    return cache.fetch('candidate:exams',
      () => http.get('/candidate/exams/'), TTL.LIST);
  },

  /** Get exam detail for candidate (hides answers). */
  async getCandidateExam(examId) {
    const key = `candidate:exam:${examId}`;
    return cache.fetch(key, () => http.get(`/candidate/exams/${examId}/`), TTL.DETAIL);
  },

  /** Start an exam session with verification metadata. */
  async startExam(examId, verificationData = {}) {
    const result = await http.post(`/candidate/exams/${examId}/start/`, verificationData);
    cache.invalidatePrefix('candidate:');
    return result;
  },

  /** Submit a single answer. */
  async submitAnswer(sessionId, { question_index, selected_answer, is_flagged }) {
    return http.post(`/candidate/sessions/${sessionId}/answer/`, {
      question_index, selected_answer, is_flagged,
    });
  },

  /** Submit (finish) the entire exam. */
  async submitExam(sessionId) {
    const result = await http.post(`/candidate/sessions/${sessionId}/submit/`);
    cache.invalidatePrefix('candidate:');
    cache.invalidatePrefix('sessions:');
    return result;
  },

  /** Get candidate's own sessions/results. */
  async getMyResults() {
    return cache.fetch('candidate:results',
      () => http.get('/candidate/sessions/'), TTL.LIST);
  },
};

export default examService;
