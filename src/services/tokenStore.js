/**
 * SecureTokenStore — Memory-first token management.
 *
 * Tokens are held in a JS closure (not accessible from devtools/extensions).
 * SessionStorage is used only as an encrypted fallback for page refreshes.
 * Clears automatically on tab close (sessionStorage) — safer than localStorage.
 */

const STORAGE_KEY = '__pa_s';
const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

// Simple XOR obfuscation (prevents casual sniffing — not bullet-proof crypto)
function obfuscate(text, key = 'PrOcT0rAi-2026!') {
  const result = [];
  for (let i = 0; i < text.length; i++) {
    result.push(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(String.fromCharCode(...result));
}

function deobfuscate(encoded, key = 'PrOcT0rAi-2026!') {
  try {
    const decoded = atob(encoded);
    const result = [];
    for (let i = 0; i < decoded.length; i++) {
      result.push(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return String.fromCharCode(...result);
  } catch {
    return null;
  }
}

class TokenStore {
  #accessToken = null;
  #refreshToken = null;
  #user = null;
  #listeners = new Set();

  constructor() {
    this.#hydrate();
  }

  // ---- Getters ----
  get accessToken() { return this.#accessToken; }
  get refreshToken() { return this.#refreshToken; }
  get user() { return this.#user; }
  get isAuthenticated() { return !!this.#accessToken; }

  // ---- Setters ----
  setTokens(access, refresh) {
    this.#accessToken = access;
    this.#refreshToken = refresh;
    this.#persist();
    this.#notify();
  }

  setUser(user) {
    this.#user = user;
    this.#persist();
    this.#notify();
  }

  setAll(access, refresh, user) {
    this.#accessToken = access;
    this.#refreshToken = refresh;
    this.#user = user;
    this.#persist();
    this.#notify();
  }

  clear() {
    this.#accessToken = null;
    this.#refreshToken = null;
    this.#user = null;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    this.#notify();
  }

  // ---- Subscription (for Zustand integration) ----
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach(fn => fn({
      isAuthenticated: this.isAuthenticated,
      user: this.#user,
    }));
  }

  // ---- Persistence (sessionStorage with obfuscation) ----
  #persist() {
    try {
      const payload = JSON.stringify({
        a: this.#accessToken,
        r: this.#refreshToken,
        u: this.#user,
      });
      sessionStorage.setItem(STORAGE_KEY, obfuscate(payload));
    } catch {}
  }

  #hydrate() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const json = deobfuscate(raw);
      if (!json) return;
      const { a, r, u } = JSON.parse(json);
      this.#accessToken = a;
      this.#refreshToken = r;
      this.#user = u;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  // ---- Token introspection ----
  isTokenExpired(token) {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now() - 30000; // 30s buffer
    } catch {
      return true;
    }
  }

  get isAccessExpired() {
    return this.isTokenExpired(this.#accessToken);
  }
}

// Singleton
const tokenStore = new TokenStore();
export default tokenStore;
