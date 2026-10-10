document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-login-form]');
  const feedback = document.querySelector('[data-login-feedback]');
  const submit = document.querySelector('[data-login-submit]');
  const params = new URLSearchParams(location.search);
  if (params.get('error') === 'config') feedback.textContent = 'O painel ainda não foi configurado no Cloudflare.';

  fetch('/api/admin/session', { credentials: 'same-origin' }).then(response => { if (response.ok) location.replace('/admin/'); }).catch(() => {});
  form.addEventListener('submit', async event => {
    event.preventDefault(); feedback.textContent = '';
    const password = form.elements.password.value;
    if (!password) { feedback.textContent = 'Informe a senha.'; feedback.focus(); return; }
    submit.disabled = true; submit.textContent = 'Entrando…';
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível entrar.');
      sessionStorage.setItem('sqr_csrf', result.csrfToken);
      location.replace('/admin/');
    } catch (error) { feedback.textContent = error.message || 'Falha de conexão.'; feedback.focus(); }
    finally { submit.disabled = false; submit.textContent = 'Entrar'; }
  });
});
