import test from 'node:test';
import assert from 'node:assert/strict';
import { makePasswordHash, verifyPassword } from '../functions/_lib/crypto.js';
import { parseMessageId, validateContact } from '../functions/_lib/validation.js';

test('aceita e normaliza uma mensagem válida', () => {
  const result = validateContact({ name: '  Maria  ', subject: ' Sugestão ', message: '  Uma mensagem válida para o site.  ' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { name: 'Maria', subject: 'Sugestão', message: 'Uma mensagem válida para o site.' });
});

test('rejeita limites inválidos e honeypot', () => {
  assert.equal(validateContact({ name: 'A', subject: 'Ok', message: 'curta' }).ok, false);
  assert.equal(validateContact({ name: 'Maria', subject: 'Assunto', message: 'Mensagem suficientemente longa', website: 'bot' }).spam, true);
  assert.equal(validateContact({ name: 'M'.repeat(81), subject: 'Assunto', message: 'Mensagem suficientemente longa' }).ok, false);
});

test('valida identificadores de mensagem', () => {
  assert.equal(parseMessageId('42'), 42);
  assert.equal(parseMessageId('0'), null);
  assert.equal(parseMessageId('1 OR 1=1'), null);
});

test('hash PBKDF2 valida apenas a senha correta', async () => {
  const hash = await makePasswordHash('uma-senha-de-teste', 100_000);
  assert.equal(await verifyPassword('uma-senha-de-teste', hash), true);
  assert.equal(await verifyPassword('senha-incorreta', hash), false);
  assert.equal(await verifyPassword('qualquer', 'hash-invalido'), false);
});
