const requests = new Map<string, number[]>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (requests.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  timestamps.push(now);
  requests.set(ip, timestamps);
  return { allowed: true, remaining: MAX_REQUESTS - timestamps.length };
}
