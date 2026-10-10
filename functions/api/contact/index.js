import { json, methodNotAllowed, readJson, requireSameOrigin } from '../../_lib/http.js';
import { enforceRateLimit } from '../../_lib/rate-limit.js';
import { verifyTurnstile } from '../../_lib/turnstile.js';
import { validateContact } from '../../_lib/validation.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed(['POST']);
  if (!context.env.DB || !context.env.RATE_LIMIT_SALT) {
    return json({ ok: false, error: 'Serviço de contato temporariamente indisponível.' }, 503);
  }
  if (!requireSameOrigin(context.request)) return json({ ok: false, error: 'Origem da solicitação inválida.' }, 403);

  const rate = await enforceRateLimit({
    db: context.env.DB,
    request: context.request,
    salt: context.env.RATE_LIMIT_SALT,
    scope: 'contact',
    limit: 5,
    windowSeconds: 15 * 60
  });
  if (!rate.allowed) {
    return json({ ok: false, error: 'Muitas mensagens foram enviadas. Tente novamente mais tarde.' }, 429, {
      'retry-after': String(rate.retryAfter)
    });
  }

  const body = await readJson(context.request);
  if (body.error) return body.error;
  const validation = validateContact(body.value);
  if (!validation.ok) return json({ ok: false, error: validation.error }, validation.spam ? 400 : 422);

  const turnstile = await verifyTurnstile({
    secret: context.env.TURNSTILE_SECRET_KEY,
    token: body.value.turnstileToken,
    request: context.request
  });
  if (!turnstile.success) return json({ ok: false, error: 'Não foi possível confirmar que o envio é legítimo. Atualize a página e tente novamente.' }, 403);

  const now = Math.floor(Date.now() / 1000);
  await context.env.DB.prepare(`
    INSERT INTO contact_messages (name, subject, message, is_read, created_at)
    VALUES (?, ?, ?, 0, ?)
  `).bind(validation.value.name, validation.value.subject, validation.value.message, now).run();

  return json({ ok: true, message: 'Mensagem enviada com sucesso.' }, 201);
}
