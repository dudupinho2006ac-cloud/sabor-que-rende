import { createSession, sessionCookie } from '../../_lib/auth.js';
import { verifyPassword } from '../../_lib/crypto.js';
import { json, methodNotAllowed, readJson, requireSameOrigin } from '../../_lib/http.js';
import { enforceRateLimit } from '../../_lib/rate-limit.js';
import { validatePasswordInput } from '../../_lib/validation.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed(['POST']);
  const { DB, ADMIN_PASSWORD_HASH, RATE_LIMIT_SALT } = context.env;
  if (!DB || !ADMIN_PASSWORD_HASH || !RATE_LIMIT_SALT) {
    return json({ ok: false, error: 'Painel temporariamente indisponível.' }, 503);
  }
  if (!requireSameOrigin(context.request)) return json({ ok: false, error: 'Origem da solicitação inválida.' }, 403);

  const rate = await enforceRateLimit({ db: DB, request: context.request, salt: RATE_LIMIT_SALT, scope: 'admin-login', limit: 5, windowSeconds: 15 * 60 });
  if (!rate.allowed) return json({ ok: false, error: 'Muitas tentativas. Aguarde antes de tentar novamente.' }, 429, { 'retry-after': String(rate.retryAfter) });

  const body = await readJson(context.request, 2_048);
  if (body.error) return body.error;
  const validation = validatePasswordInput(body.value);
  if (!validation.ok) return json({ ok: false, error: validation.error }, 422);

  const valid = await verifyPassword(validation.value, ADMIN_PASSWORD_HASH);
  if (!valid) return json({ ok: false, error: 'Senha inválida.' }, 401);

  const session = await createSession(DB);
  return json({ ok: true, csrfToken: session.csrfToken }, 200, { 'set-cookie': sessionCookie(session.token) });
}
