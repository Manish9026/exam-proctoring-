/**
 * AuthService — Authentication & user management API module.
 *
 * Endpoints:
 *   POST /api/auth/login/      — Login with email/password
 *   POST /api/auth/register/   — Create new account
 *   POST /api/auth/refresh/    — Refresh JWT token
 *   GET  /api/auth/me/         — Get current user
 *   PATCH /api/auth/profile/   — Update profile
 *   GET  /api/auth/candidates/ — List candidates (admin)
 */
import http from './api';
import tokenStore from './tokenStore';
import cache from './cache';

const authService = {
  /**
   * Login — authenticates and stores tokens securely.
   * @param {string} username
   * @param {string} password
   * @returns {{ user, access, refresh }}
   */
  async login(username, password) {
    const data = await http.post('/auth/login/', { username, password });
    tokenStore.setAll(data.access, data.refresh, data.user);
    cache.clear(); // Clear any stale cache from previous session
    return data;
  },

  /**
   * Register — creates account and auto-logs in.
   */
  async register({ username, email, password, password_confirm, first_name, last_name, role }) {
    const data = await http.post('/auth/register/', {
      username, email, password, password_confirm,
      first_name, last_name, role,
    });
    tokenStore.setAll(data.access, data.refresh, data.user);
    cache.clear();
    return data;
  },

  /**
   * Logout — clears all tokens and cache.
   */
  logout() {
    tokenStore.clear();
    cache.clear();
  },

  /**
   * Get current user (cached for 5 min).
   */
  async getMe() {
    return cache.fetch('auth:me', () => http.get('/auth/me/'), 5 * 60_000);
  },

  /**
   * Update profile.
   */
  async updateProfile(data) {
    const result = await http.patch('/auth/profile/', data);
    cache.invalidate('auth:me');
    tokenStore.setUser(result);
    return result;
  },

  /**
   * List all candidates (admin only, cached 2 min).
   */
  async getCandidates(params = {}) {
    const key = `auth:candidates:${JSON.stringify(params)}`;
    return cache.fetch(key, () => http.get('/auth/candidates/', params), 2 * 60_000);
  },

  /**
   * Check if user is authenticated.
   */
  isAuthenticated() {
    return tokenStore.isAuthenticated;
  },

  /**
   * Get stored user (no network call).
   */
  getUser() {
    return tokenStore.user;
  },
};

export default authService;
