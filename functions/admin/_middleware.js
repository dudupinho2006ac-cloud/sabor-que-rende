import { getSession } from '../_lib/auth.js';

export async function onRequest(context) {
  const pathname = new URL(context.request.url).pathname.replace(/\/+$/, '');
  if (pathname === '/admin/login' || pathname === '/admin/login.html') return context.next();
  if (!context.env.DB) return Response.redirect(new URL('/admin/login?error=config', context.request.url), 302);
  const session = await getSession(context.env.DB, context.request);
  if (!session) return Response.redirect(new URL('/admin/login', context.request.url), 302);
  return context.next();
}
