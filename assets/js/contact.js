document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const feedback = form.querySelector('[data-form-feedback]');
  const submit = form.querySelector('[data-submit]');
  const message = form.elements.message;
  const count = form.querySelector('[data-message-count]');
  const turnstileContainer = form.querySelector('[data-turnstile-container]');
  let turnstileWidget = null;
  let turnstileEnabled = false;

  function setFeedback(text, type = '') {
    feedback.textContent = text;
    feedback.className = `form-feedback${type ? ` ${type}` : ''}`;
    if (text) feedback.focus();
  }
  function fieldError(name, text) {
    const output = form.querySelector(`[data-error-for="${name}"]`);
    output.textContent = text;
    form.elements[name].setAttribute('aria-invalid', String(Boolean(text)));
  }
  function validate() {
    const values = { name: form.elements.name.value.trim(), subject: form.elements.subject.value.trim(), message: form.elements.message.value.trim() };
    const errors = {
      name: values.name.length < 2 ? 'Informe pelo menos 2 caracteres.' : values.name.length > 80 ? 'Use no máximo 80 caracteres.' : '',
      subject: values.subject.length < 3 ? 'Informe pelo menos 3 caracteres.' : values.subject.length > 120 ? 'Use no máximo 120 caracteres.' : '',
      message: values.message.length < 10 ? 'Informe pelo menos 10 caracteres.' : values.message.length > 5000 ? 'Use no máximo 5000 caracteres.' : ''
    };
    Object.entries(errors).forEach(([name, error]) => fieldError(name, error));
    return { valid: !Object.values(errors).some(Boolean), values };
  }
  async function configureTurnstile() {
    try {
      const response = await fetch('/api/contact/config', { headers: { accept: 'application/json' } });
      if (!response.ok) return;
      const config = await response.json();
      if (!config.turnstile?.enabled || !config.turnstile.siteKey) return;
      turnstileEnabled = true;
      turnstileContainer.hidden = false;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true; script.defer = true;
      script.addEventListener('load', () => { turnstileWidget = window.turnstile.render(turnstileContainer, { sitekey: config.turnstile.siteKey, theme: 'light', size: 'flexible' }); });
      document.head.appendChild(script);
    } catch { /* A API informará um erro real caso a proteção seja obrigatória. */ }
  }
  message.addEventListener('input', () => { count.textContent = String(message.value.length); });
  ['name', 'subject', 'message'].forEach(name => form.elements[name].addEventListener('input', () => fieldError(name, '')));
  form.addEventListener('submit', async event => {
    event.preventDefault(); setFeedback('');
    const validation = validate();
    if (!validation.valid) return;
    const turnstileToken = turnstileEnabled && window.turnstile && turnstileWidget !== null ? window.turnstile.getResponse(turnstileWidget) : '';
    if (turnstileEnabled && !turnstileToken) { setFeedback('Conclua a verificação de segurança.', 'is-error'); return; }
    submit.disabled = true; submit.textContent = 'Enviando…';
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ ...validation.values, website: form.elements.website.value, turnstileToken }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível enviar a mensagem. Tente novamente.');
      form.reset(); count.textContent = '0';
      if (turnstileEnabled && window.turnstile && turnstileWidget !== null) window.turnstile.reset(turnstileWidget);
      setFeedback(result.message || 'Mensagem enviada com sucesso.', 'is-success');
    } catch (error) {
      setFeedback(error.message || 'Falha de conexão. Verifique sua internet e tente novamente.', 'is-error');
      if (turnstileEnabled && window.turnstile && turnstileWidget !== null) window.turnstile.reset(turnstileWidget);
    } finally { submit.disabled = false; submit.textContent = 'Enviar mensagem'; }
  });
  configureTurnstile();
});
