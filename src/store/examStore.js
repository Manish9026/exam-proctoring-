/**
 * ExamStore — Zustand store for exam state during exam-taking.
 * Connected to examService for real API calls.
 */
import { create } from 'zustand';
import { examService } from '../services';

const useExamStore = create((set, get) => ({
  // State
  currentExam: null,
  currentSession: null,
  questions: [],
  answers: {},           // { questionIndex: selectedAnswer }
  flagged: new Set(),
  currentQuestionIndex: 0,
  timeRemaining: 0,
  status: 'idle',        // idle | loading | in_progress | submitted | terminated
  error: null,

  // Admin state
  exams: [],
  sessions: [],
  stats: null,
  adminLoading: false,

  // ==========================================
  // CANDIDATE — Exam Flow
  // ==========================================

  /** Fetch available exams. */
  fetchAvailableExams: async () => {
    set({ adminLoading: true });
    try {
      const exams = await examService.getAvailableExams();
      set({ exams, adminLoading: false });
      return exams;
    } catch (err) {
      set({ error: err.message, adminLoading: false });
    }
  },

  /** Load exam detail for taking. */
  loadExam: async (examId) => {
    set({ status: 'loading', error: null });
    try {
      const exam = await examService.getCandidateExam(examId);
      set({
        currentExam: exam,
        questions: exam.questions || [],
        timeRemaining: (exam.duration_minutes || 60) * 60,
        currentQuestionIndex: 0,
        answers: {},
        flagged: new Set(),
      });
      return exam;
    } catch (err) {
      set({ status: 'idle', error: err.message });
      throw err;
    }
  },

  /** Start an exam session. */
  startExam: async (examId) => {
    try {
      const session = await examService.startExam(examId);
      set({ currentSession: session, status: 'in_progress' });
      return session;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  /** Save answer to backend + local state. */
  saveAnswer: async (questionIndex, selectedAnswer) => {
    const { currentSession, answers } = get();
    const newAnswers = { ...answers, [questionIndex]: selectedAnswer };
    set({ answers: newAnswers });

    if (currentSession) {
      try {
        await examService.submitAnswer(currentSession.id, {
          question_index: questionIndex,
          selected_answer: selectedAnswer,
          is_flagged: get().flagged.has(questionIndex),
        });
      } catch (err) {
        console.error('Failed to sync answer:', err);
      }
    }
  },

  /** Toggle flag on a question. */
  toggleFlag: (index) => {
    const { flagged } = get();
    const next = new Set(flagged);
    next.has(index) ? next.delete(index) : next.add(index);
    set({ flagged: next });
  },

  /** Navigate to question. */
  goToQuestion: (index) => set({ currentQuestionIndex: index }),

  /** Submit the exam. */
  submitExam: async () => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({ status: 'loading' });
    try {
      const result = await examService.submitExam(currentSession.id);
      set({
        status: 'submitted',
        currentSession: result.session,
      });
      return result;
    } catch (err) {
      set({ status: 'in_progress', error: err.message });
      throw err;
    }
  },

  /** Decrement timer (called every second). */
  tick: () => {
    const { timeRemaining } = get();
    if (timeRemaining <= 0) return;
    set({ timeRemaining: timeRemaining - 1 });
  },

  /** Reset exam state. */
  resetExam: () => set({
    currentExam: null, currentSession: null, questions: [],
    answers: {}, flagged: new Set(), currentQuestionIndex: 0,
    timeRemaining: 0, status: 'idle', error: null,
  }),

  // ==========================================
  // ADMIN — Exam Management
  // ==========================================

  /** Fetch all exams (admin). */
  fetchExams: async (params) => {
    set({ adminLoading: true });
    try {
      const exams = await examService.listExams(params);
      set({ exams, adminLoading: false });
      return exams;
    } catch (err) {
      set({ error: err.message, adminLoading: false });
    }
  },

  /** Create exam (admin). */
  createExam: async (data) => {
    const result = await examService.createExam(data);
    const exams = [...get().exams, result];
    set({ exams });
    return result;
  },

  /** Add question to exam. */
  addQuestion: async (examId, questionData) => {
    return examService.addQuestion(examId, questionData);
  },

  /** Activate exam. */
  activateExam: async (examId) => {
    return examService.activateExam(examId);
  },

  /** Fetch all sessions (admin). */
  fetchSessions: async (params) => {
    set({ adminLoading: true });
    try {
      const sessions = await examService.listSessions(params);
      set({ sessions, adminLoading: false });
      return sessions;
    } catch (err) {
      set({ error: err.message, adminLoading: false });
    }
  },

  /** Terminate a session (admin). */
  terminateSession: async (sessionId) => {
    return examService.terminateSession(sessionId);
  },

  /** Fetch dashboard stats (admin). */
  fetchStats: async () => {
    try {
      const stats = await examService.getDashboardStats();
      set({ stats });
      return stats;
    } catch (err) {
      set({ error: err.message });
    }
  },

  /** Fetch candidate's own results. */
  fetchMyResults: async () => {
    set({ adminLoading: true });
    try {
      const sessions = await examService.getMyResults();
      set({ sessions, adminLoading: false });
      return sessions;
    } catch (err) {
      set({ error: err.message, adminLoading: false });
    }
  },
}));

export default useExamStore;
