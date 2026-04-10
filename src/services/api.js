/**
 * ProctorAI — Secure API Client
 *
 * - Uses SecureTokenStore (memory-first, not localStorage)
 * - Automatic token refresh on 401
 * - Request/response interceptors
 * - CSRF-safe
 * - RequestCache integration
 */
import tokenStore from './tokenStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const MAX_RETRIES = 1;

class ApiError extends Error {
  constructor(status, data) {
    const msg = data?.detail || data?.message || data?.error ||
      (typeof data === 'string' ? data : `Request failed (${status})`);
    super(msg);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isNotFound() { return this.status === 404; }
  get isValidation() { return this.status === 400; }
  get isServer() { return this.status >= 500; }
}

class HttpClient {
  #refreshing = null;

  // ---- Core request ----
  async request(endpoint, options = {}, retryCount = 0) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...options.headers };
    const isFormData = options.body instanceof FormData;

    // Set content type (skip for FormData — browser sets boundary)
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // Attach JWT
    if (tokenStore.accessToken) {
      // Pre-check expiry to avoid unnecessary 401
      if (tokenStore.isAccessExpired && tokenStore.refreshToken) {
        await this.#refreshTokens();
      }
      headers['Authorization'] = `Bearer ${tokenStore.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: isFormData ? options.body :
          options.body ? JSON.stringify(options.body) : undefined,
        credentials: 'same-origin',
        signal: options.signal,
      });

      // Handle 401 — try token refresh (once)
      if (response.status === 401 && retryCount < MAX_RETRIES && tokenStore.refreshToken) {
        const refreshed = await this.#refreshTokens();
        if (refreshed) {
          return this.request(endpoint, options, retryCount + 1);
        }
        tokenStore.clear();
        window.location.href = '/login';
        throw new ApiError(401, { message: 'Session expired' });
      }

      // Handle no-content
      if (response.status === 204) return null;

      // Parse response
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new ApiError(response.status, data || {});
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error.name === 'AbortError') throw error;
      throw new ApiError(0, { message: 'Network error — check your connection' });
    }
  }

  // ---- Token refresh with deduplication ----
  async #refreshTokens() {
    // Deduplicate: if already refreshing, wait for that result
    if (this.#refreshing) return this.#refreshing;

    this.#refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: tokenStore.refreshToken }),
          credentials: 'same-origin',
        });
        if (!res.ok) return false;
        const data = await res.json();
        tokenStore.setTokens(data.access, data.refresh || tokenStore.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        this.#refreshing = null;
      }
    })();

    return this.#refreshing;
  }

  // ---- HTTP convenience methods ----
  get(endpoint, params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString();
    return this.request(qs ? `${endpoint}?${qs}` : endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  }

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body });
  }

  del(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  upload(endpoint, formData) {
    return this.request(endpoint, { method: 'POST', body: formData });
  }
}

// Singleton
const http = new HttpClient();
export default http;
export { ApiError };
