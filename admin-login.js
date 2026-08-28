import { signToken, adminUser } from './_lib/auth.js';

// POST /api/admin/login  → 校验账号密码，签发无状态令牌
export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Bad JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  const user = (body && body.user) || '';
  const pass = (body && body.pass) || '';
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'zesto2026';
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    const token = signToken(ADMIN_USER);
    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  return new Response(JSON.stringify({ error: 'invalid credentials' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
