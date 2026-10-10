export async function verifyTurnstile({ secret, token, request }) {
  if (!secret) return { success: true, skipped: true };
  if (!token || typeof token !== 'string' || token.length > 2048) return { success: false };

  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  const remoteIp = request.headers.get('CF-Connecting-IP');
  if (remoteIp) form.set('remoteip', remoteIp);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  if (!response.ok) return { success: false };
  const result = await response.json();
  return { success: result.success === true };
}
