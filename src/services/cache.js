/**
 * RequestCache — Lightweight TTL cache with stale-while-revalidate.
 *
 * Features:
 * - Configurable TTL per cache key
 * - Stale-while-revalidate: returns stale data instantly, refreshes in background
 * - Deduplication: concurrent identical requests share one network call
 * - Manual invalidation by key or prefix
 * - Memory-only (no persistence — cache dies with the tab)
 */

class RequestCache {
  #cache = new Map();
  #inflight = new Map();  // Deduplication of concurrent requests

  /**
   * Get cached value if fresh.
   * @returns {{ data, stale: boolean } | null}
   */
  get(key) {
    const entry = this.#cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const fresh = age < entry.ttl;
    const usable = age < entry.ttl * 3; // Stale data usable up to 3x TTL

    if (!usable) {
      this.#cache.delete(key);
      return null;
    }

    return { data: entry.data, stale: !fresh };
  }

  /**
   * Set cache entry.
   * @param {string} key
   * @param {any} data
   * @param {number} ttl — milliseconds (default 60s)
   */
  set(key, data, ttl = 60_000) {
    this.#cache.set(key, { data, ttl, timestamp: Date.now() });
  }

  /**
   * Fetch with cache — the main method.
   * Returns cached data if fresh, or fetches and caches.
   */
  async fetch(key, fetchFn, ttl = 60_000) {
    // 1. Check cache
    const cached = this.get(key);
    if (cached && !cached.stale) {
      return cached.data;
    }

    // 2. Deduplicate concurrent identical requests
    if (this.#inflight.has(key)) {
      return this.#inflight.get(key);
    }

    // 3. If stale, return stale data and revalidate in background
    const promise = fetchFn().then(data => {
      this.set(key, data, ttl);
      this.#inflight.delete(key);
      return data;
    }).catch(err => {
      this.#inflight.delete(key);
      // If we have stale data, return it on error
      if (cached) return cached.data;
      throw err;
    });

    this.#inflight.set(key, promise);

    if (cached?.stale) {
      // Return stale data now, refresh happens in background
      promise.catch(() => {}); // Suppress unhandled rejection
      return cached.data;
    }

    return promise;
  }

  /** Invalidate a single key */
  invalidate(key) {
    this.#cache.delete(key);
  }

  /** Invalidate all keys starting with prefix */
  invalidatePrefix(prefix) {
    for (const key of this.#cache.keys()) {
      if (key.startsWith(prefix)) this.#cache.delete(key);
    }
  }

  /** Clear all cache */
  clear() {
    this.#cache.clear();
    this.#inflight.clear();
  }

  /** Debug: current cache size */
  get size() {
    return this.#cache.size;
  }
}

const cache = new RequestCache();
export default cache;
