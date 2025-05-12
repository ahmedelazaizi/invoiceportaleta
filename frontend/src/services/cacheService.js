class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  set(key, value, ttl = this.defaultTTL) {
    const item = {
      value,
      expiry: Date.now() + ttl
    };
    this.cache.set(key, item);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    return this.get(key) !== null;
  }

  // Cache with automatic refresh
  async cacheWithRefresh(key, fetchFn, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached) return cached;

    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }

  // Cache with stale-while-revalidate pattern
  async cacheWithStaleWhileRevalidate(key, fetchFn, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached) {
      // Trigger background refresh
      fetchFn().then(data => this.set(key, data, ttl));
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }

  // Cache with automatic retry
  async cacheWithRetry(key, fetchFn, maxRetries = 3, ttl = this.defaultTTL) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const data = await fetchFn();
        this.set(key, data, ttl);
        return data;
      } catch (error) {
        retries++;
        if (retries === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
  }
}

export const cacheService = new CacheService(); 