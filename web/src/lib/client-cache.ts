export type CachedEntry<T> = {
  value: T;
  cachedAt: number; // epoch ms
  ttlMs: number;
};

function makeKey(url: string): string {
  return `abj:cache:${url}`;
}

export function getCachedJson<T>(url: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(makeKey(url));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry<T>;
    if (!entry || typeof entry.cachedAt !== "number" || typeof entry.ttlMs !== "number") return null;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      window.localStorage.removeItem(makeKey(url));
      return null;
    }
    return entry.value as T;
  } catch {
    return null;
  }
}

export function setCachedJson<T>(url: string, value: T, ttlMs: number): void {
  try {
    if (typeof window === "undefined") return;
    const entry: CachedEntry<T> = { value, cachedAt: Date.now(), ttlMs };
    window.localStorage.setItem(makeKey(url), JSON.stringify(entry));
  } catch {
    // ignore quota/security errors
  }
}

export async function cachedJsonFetch<T = unknown>(url: string, ttlMs = 120_000): Promise<T> {
  const cached = getCachedJson<T>(url);
  if (cached != null) return cached;
  const res = await fetch(url);
  const data = (await res.json()) as T;
  if (res.ok) setCachedJson(url, data, ttlMs);
  return data;
}


