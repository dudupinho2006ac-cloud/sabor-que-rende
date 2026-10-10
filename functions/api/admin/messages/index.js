import { requireAdmin } from '../../../_lib/auth.js';
import { json } from '../../../_lib/http.js';

export async function onRequestGet({ env, request }) {
  const auth = await requireAdmin(env.DB, request);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get('page') || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10_000) : 1;
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  const [messages, count, unread] = await Promise.all([
    env.DB.prepare(`
      SELECT id, name, subject, message, is_read, created_at, read_at
      FROM contact_messages ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
    `).bind(pageSize, offset).all(),
    env.DB.prepare('SELECT COUNT(*) AS total FROM contact_messages').first(),
    env.DB.prepare('SELECT COUNT(*) AS total FROM contact_messages WHERE is_read = 0').first()
  ]);

  return json({
    ok: true,
    messages: messages.results || [],
    pagination: { page, pageSize, total: Number(count?.total || 0) },
    unread: Number(unread?.total || 0)
  });
}
