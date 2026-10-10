import { json } from '../../_lib/http.js';

export function onRequestGet({ env }) {
  const enabled = Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY);
  return json({ ok: true, turnstile: { enabled, siteKey: enabled ? env.TURNSTILE_SITE_KEY : null } });
}
