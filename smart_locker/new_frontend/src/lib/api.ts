// Lightweight API client with in-memory caching and request deduplication.
// - Cached responses are served instantly on repeated navigations.
// - Shared data (e.g. stations) is fetched once and reused across pages.
// - Identical in-flight requests are deduplicated into a single network call.

const API_BASE = 'http://localhost:3001/api';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<any>>();

// Default TTL: 30 seconds — keeps data fresh while avoiding redundant calls
const DEFAULT_TTL_MS = 30_000;

function getToken(): string {
  return localStorage.getItem('token') || '';
}

/**
 * Cached GET request. Returns cached data if fresh, otherwise fetches.
 * Deduplicates identical in-flight requests.
 */
export async function apiGet<T = any>(
  path: string,
  opts?: { ttl?: number; skipCache?: boolean }
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const ttl = opts?.ttl ?? DEFAULT_TTL_MS;

  // Return cached data if still fresh
  if (!opts?.skipCache) {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }
  }

  // Deduplicate identical in-flight requests
  if (inflight.has(url)) {
    return inflight.get(url)! as Promise<T>;
  }

  const promise = fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
    .then(async (res) => {
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Request failed');
      // Cache the successful response
      cache.set(url, { data: json, timestamp: Date.now() });
      return json;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, promise);
  return promise as Promise<T>;
}

/**
 * Non-cached POST/PATCH request for mutations.
 * Optionally invalidates cache keys after success.
 */
export async function apiMutate<T = any>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: any,
  invalidate?: string[]
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');

  // Invalidate related cache entries after a mutation
  if (invalidate) {
    for (const pattern of invalidate) {
      for (const key of cache.keys()) {
        if (key.includes(pattern)) cache.delete(key);
      }
    }
  }

  return json as T;
}

/** Clear all cache (e.g. on logout) */
export function clearApiCache() {
  cache.clear();
}
