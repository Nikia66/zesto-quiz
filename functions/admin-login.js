import { signToken, adminUser } from './_lib/auth.js';

// POST /api/admin/login  → 校验账号密码，签发无状态令牌
export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON' }) };
  }
  const user = (body && body.user) || '';
  const pass = (body && body.pass) || '';
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'zesto2026';
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    const token = signToken(ADMIN_USER);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ token }),
    };
  }
  return {
    statusCode: 401,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ error: 'invalid credentials' }),
  };
}
