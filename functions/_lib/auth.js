import { randomToken, sha256 } from './crypto.js';

const SESSION_COOKIE = 'sqr_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;

function parseCookies(request) {
  const result = {};
  for (const item of (request.headers.get('cookie') || '').split(';')) {
    const separator = item.indexOf('=');
    if (separator > 0) result[item.slice(0, separator).trim()] = item.slice(separator + 1).trim();
  }
  return result;
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function createSession(db) {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const csrfToken = randomToken(24);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').bind(now).run();
  await db.prepare(`
    INSERT INTO admin_sessions (token_hash, csrf_token, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(tokenHash, csrfToken, now, now + SESSION_SECONDS).run();
  return { token, csrfToken };
}

export async function getSession(db, request) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const session = await db.prepare(`
    SELECT token_hash, csrf_token, expires_at
    FROM admin_sessions WHERE token_hash = ? AND expires_at > ?
  `).bind(tokenHash, now).first();
  return session ? { ...session, tokenHash } : null;
}

export async function deleteSession(db, request) {
  const session = await getSession(db, request);
  if (session) await db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(session.tokenHash).run();
}

export async function requireAdmin(db, request, checkCsrf = false) {
  const session = await getSession(db, request);
  if (!session) return { ok: false, status: 401, error: 'Sessão expirada ou inválida.' };
  if (checkCsrf && request.headers.get('x-csrf-token') !== session.csrf_token) {
    return { ok: false, status: 403, error: 'Token de segurança inválido.' };
  }
  return { ok: true, session };
}
