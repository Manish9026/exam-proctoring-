/**
 * AuthStore — Zustand store connected to authService.
 * Manages authentication state with real backend JWT flow.
 */
import { create } from 'zustand';
import { authService, tokenStore } from '../services';

const useAuthStore = create((set, get) => ({
  // State
  user: tokenStore.user,
  isAuthenticated: tokenStore.isAuthenticated,
  loading: false,
  error: null,

  // ---- Actions ----

  /**
   * Login with username & password.
   */
  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.login(username, password);
      set({
        user: data.user,
        isAuthenticated: true,
        loading: false,
      });
      return data.user;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Register new account.
   */
  register: async (formData) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.register(formData);
      set({
        user: data.user,
        isAuthenticated: true,
        loading: false,
      });
      return data.user;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Logout — clears all state and tokens.
   */
  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false, error: null });
  },

  /**
   * Fetch current user from API (validates token).
   */
  fetchUser: async () => {
    if (!tokenStore.isAuthenticated) return null;
    try {
      const user = await authService.getMe();
      tokenStore.setUser(user);
      set({ user, isAuthenticated: true });
      return user;
    } catch {
      // Token invalid
      authService.logout();
      set({ user: null, isAuthenticated: false });
      return null;
    }
  },

  /**
   * Update profile.
   */
  updateProfile: async (data) => {
    set({ loading: true, error: null });
    try {
      const user = await authService.updateProfile(data);
      set({ user, loading: false });
      return user;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Clear error state.
   */
  clearError: () => set({ error: null }),

  // ---- Computed ----
  get isAdmin() { return get().user?.role === 'admin'; },
  get isCandidate() { return get().user?.role === 'candidate'; },
}));

export default useAuthStore;
