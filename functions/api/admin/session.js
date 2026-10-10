import { requireAdmin } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';

export async function onRequestGet({ env, request }) {
  if (!env.DB) return json({ ok: false, error: 'Painel temporariamente indisponível.' }, 503);
  const auth = await requireAdmin(env.DB, request);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  return json({ ok: true, csrfToken: auth.session.csrf_token });
}
