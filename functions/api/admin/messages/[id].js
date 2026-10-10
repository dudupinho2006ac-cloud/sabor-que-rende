import { requireAdmin } from '../../../_lib/auth.js';
import { json, methodNotAllowed, requireSameOrigin } from '../../../_lib/http.js';
import { parseMessageId } from '../../../_lib/validation.js';

export async function onRequest(context) {
  if (!['PATCH', 'DELETE'].includes(context.request.method)) return methodNotAllowed(['PATCH', 'DELETE']);
  if (!requireSameOrigin(context.request)) return json({ ok: false, error: 'Origem da solicitação inválida.' }, 403);
  const auth = await requireAdmin(context.env.DB, context.request, true);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const id = parseMessageId(context.params.id);
  if (!id) return json({ ok: false, error: 'Mensagem inválida.' }, 400);

  if (context.request.method === 'PATCH') {
    const result = await context.env.DB.prepare(`
      UPDATE contact_messages SET is_read = 1, read_at = ? WHERE id = ?
    `).bind(Math.floor(Date.now() / 1000), id).run();
    if (!result.meta.changes) return json({ ok: false, error: 'Mensagem não encontrada.' }, 404);
    return json({ ok: true });
  }

  const result = await context.env.DB.prepare('DELETE FROM contact_messages WHERE id = ?').bind(id).run();
  if (!result.meta.changes) return json({ ok: false, error: 'Mensagem não encontrada.' }, 404);
  return json({ ok: true });
}
