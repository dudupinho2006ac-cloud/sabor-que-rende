export const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff'
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

export function methodNotAllowed(allowed) {
  return json({ ok: false, error: 'Método não permitido.' }, 405, { allow: allowed.join(', ') });
}

export async function readJson(request, maxBytes = 16_384) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('application/json')) {
    return { error: json({ ok: false, error: 'Envie os dados como JSON.' }, 415) };
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) {
    return { error: json({ ok: false, error: 'A solicitação é muito grande.' }, 413) };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { error: json({ ok: false, error: 'A solicitação é muito grande.' }, 413) };
  }

  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: json({ ok: false, error: 'JSON inválido.' }, 400) };
  }
}

export function requireSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function noStore(response) {
  const copy = new Response(response.body, response);
  copy.headers.set('cache-control', 'no-store');
  copy.headers.set('x-content-type-options', 'nosniff');
  return copy;
}
