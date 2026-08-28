import { revokeToken } from './_lib/auth.js';

// POST /api/admin/logout  → 吊销当前令牌（登出后立即使其失效）
export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  await revokeToken(body && body.token);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
