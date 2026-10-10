import { hmacIdentifier } from './crypto.js';

function clientAddress(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function enforceRateLimit({ db, request, salt, scope, limit, windowSeconds }) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);
  const key = await hmacIdentifier(salt, `${scope}:${clientAddress(request)}`);

  await db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now).run();
  await db.prepare(`
    INSERT INTO rate_limits (rate_key, scope, window_start, count, expires_at)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(rate_key, scope, window_start)
    DO UPDATE SET count = count + 1
  `).bind(key, scope, windowStart, windowStart + windowSeconds + 60).run();

  const row = await db.prepare(`
    SELECT count FROM rate_limits WHERE rate_key = ? AND scope = ? AND window_start = ?
  `).bind(key, scope, windowStart).first();

  return {
    allowed: Number(row?.count || 0) <= limit,
    retryAfter: windowStart + windowSeconds - now
  };
}
