const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/\r\n?/g, '\n') : '';
}

function validateField(value, label, min, max, multiline = false) {
  const normalized = clean(value);
  if (normalized.length < min) return { error: `${label} deve ter pelo menos ${min} caracteres.` };
  if (normalized.length > max) return { error: `${label} deve ter no máximo ${max} caracteres.` };
  if (CONTROL_CHARACTERS.test(normalized)) return { error: `${label} contém caracteres inválidos.` };
  if (!multiline && normalized.includes('\n')) return { error: `${label} deve ficar em uma linha.` };
  return { value: normalized };
}

export function validateContact(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Dados de contato inválidos.' };
  }
  if (input.website) return { ok: false, spam: true, error: 'Não foi possível enviar a mensagem.' };

  const name = validateField(input.name, 'Nome', 2, 80);
  if (name.error) return { ok: false, error: name.error };
  const subject = validateField(input.subject, 'Assunto', 3, 120);
  if (subject.error) return { ok: false, error: subject.error };
  const message = validateField(input.message, 'Mensagem', 10, 5000, true);
  if (message.error) return { ok: false, error: message.error };

  return { ok: true, value: { name: name.value, subject: subject.value, message: message.value } };
}

export function validatePasswordInput(input) {
  if (!input || typeof input.password !== 'string') return { ok: false, error: 'Informe a senha.' };
  if (input.password.length < 1 || input.password.length > 256) return { ok: false, error: 'Senha inválida.' };
  return { ok: true, value: input.password };
}

export function parseMessageId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0 ? Number(value) : null;
}
