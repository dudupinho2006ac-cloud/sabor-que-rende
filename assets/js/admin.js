document.addEventListener('DOMContentLoaded', async () => {
  const list = document.querySelector('[data-message-list]');
  const feedback = document.querySelector('[data-admin-feedback]');
  const unread = document.querySelector('[data-unread]');
  const pageOutput = document.querySelector('[data-page]');
  const previous = document.querySelector('[data-previous]');
  const next = document.querySelector('[data-next]');
  const dialog = document.querySelector('[data-delete-dialog]');
  let page = 1; let total = 0; let pageSize = 25; let csrfToken = sessionStorage.getItem('sqr_csrf') || '';

  function textElement(tag, className, value) { const element = document.createElement(tag); if (className) element.className = className; element.textContent = value; return element; }
  function showFeedback(text, error = false) { feedback.textContent = text; feedback.className = `form-feedback ${error ? 'is-error' : 'is-success'}`; if (text) feedback.focus(); }
  function formatDate(timestamp) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Rio_Branco' }).format(new Date(timestamp * 1000)); }
  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { accept: 'application/json', ...(options.headers || {}) } });
    if (response.status === 401) { sessionStorage.removeItem('sqr_csrf'); location.replace('/admin/login'); throw new Error('Sessão expirada.'); }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'A operação falhou.');
    return result;
  }
  async function ensureSession() { const session = await api('/api/admin/session'); csrfToken = session.csrfToken; sessionStorage.setItem('sqr_csrf', csrfToken); }
  function askDelete() { return new Promise(resolve => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }); dialog.showModal(); }); }
  function render(messages) {
    list.replaceChildren(); list.setAttribute('aria-busy', 'false');
    if (!messages.length) { list.appendChild(textElement('div', 'empty-state', 'Nenhuma mensagem nesta página.')); return; }
    for (const item of messages) {
      const article = document.createElement('article'); article.className = `message-card${item.is_read ? '' : ' is-unread'}`;
      const header = document.createElement('header');
      const heading = document.createElement('div'); heading.append(textElement('span', 'message-name', item.name), textElement('h2', '', item.subject), textElement('time', '', formatDate(item.created_at)));
      const status = textElement('span', 'message-status', item.is_read ? 'Lida' : 'Nova'); header.append(heading, status);
      const content = textElement('p', 'message-content', item.message);
      const actions = document.createElement('div'); actions.className = 'message-actions';
      if (!item.is_read) { const read = textElement('button', 'btn btn-secondary compact-button', 'Marcar como lida'); read.type = 'button'; read.addEventListener('click', async () => { try { await api(`/api/admin/messages/${item.id}`, { method: 'PATCH', headers: { 'x-csrf-token': csrfToken } }); await load(); } catch (error) { showFeedback(error.message, true); } }); actions.appendChild(read); }
      const remove = textElement('button', 'btn btn-danger compact-button', 'Excluir'); remove.type = 'button'; remove.addEventListener('click', async () => { if (!(await askDelete())) return; try { await api(`/api/admin/messages/${item.id}`, { method: 'DELETE', headers: { 'x-csrf-token': csrfToken } }); showFeedback('Mensagem excluída.'); if (page > 1 && total - 1 <= (page - 1) * pageSize) page -= 1; await load(); } catch (error) { showFeedback(error.message, true); } }); actions.appendChild(remove);
      article.append(header, content, actions); list.appendChild(article);
    }
  }
  async function load() {
    list.setAttribute('aria-busy', 'true');
    try { const result = await api(`/api/admin/messages?page=${page}`); total = result.pagination.total; pageSize = result.pagination.pageSize; unread.textContent = String(result.unread); pageOutput.textContent = `Página ${page}`; previous.disabled = page <= 1; next.disabled = page * pageSize >= total; render(result.messages); }
    catch (error) { list.setAttribute('aria-busy', 'false'); showFeedback(error.message, true); }
  }
  previous.addEventListener('click', () => { if (page > 1) { page -= 1; load(); } }); next.addEventListener('click', () => { if (page * pageSize < total) { page += 1; load(); } });
  document.querySelector('[data-logout]').addEventListener('click', async () => { try { await api('/api/admin/logout', { method: 'POST', headers: { 'x-csrf-token': csrfToken } }); } finally { sessionStorage.removeItem('sqr_csrf'); location.replace('/admin/login'); } });
  try { await ensureSession(); await load(); } catch (error) { showFeedback(error.message, true); }
});
