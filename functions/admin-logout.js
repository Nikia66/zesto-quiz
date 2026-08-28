import { revokeToken } from './_lib/auth.js';

// POST /api/admin/logout  → 吊销当前令牌（登出后立即使其失效）
export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    body = {};
  }
  await revokeToken(body && body.token);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ok: true }),
  };
}
