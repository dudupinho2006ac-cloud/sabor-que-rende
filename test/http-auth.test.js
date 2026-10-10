import test from 'node:test';
import assert from 'node:assert/strict';
import { clearSessionCookie, sessionCookie } from '../functions/_lib/auth.js';
import { onRequest as contactHandler } from '../functions/api/contact/index.js';

test('cookie de sessão usa os atributos de segurança exigidos', () => {
  const cookie = sessionCookie('token-de-teste');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\//);
  assert.match(clearSessionCookie(), /Max-Age=0/);
});

test('endpoint de contato rejeita métodos diferentes de POST', async () => {
  const response = await contactHandler({ request: new Request('https://example.com/api/contact'), env: {} });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});

test('endpoint falha fechado sem D1 e salt configurados', async () => {
  const response = await contactHandler({ request: new Request('https://example.com/api/contact', { method: 'POST' }), env: {} });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).ok, false);
});
