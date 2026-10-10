import { clearSessionCookie, deleteSession, requireAdmin } from '../../_lib/auth.js';
import { json, methodNotAllowed, requireSameOrigin } from '../../_lib/http.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed(['POST']);
  if (!requireSameOrigin(context.request)) return json({ ok: false, error: 'Origem da solicitação inválida.' }, 403);
  const auth = await requireAdmin(context.env.DB, context.request, true);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  await deleteSession(context.env.DB, context.request);
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}
