import { listResults } from './_lib/store.js';
import { checkAdmin } from './_lib/auth.js';

// GET /api/admin/results?token=...  → 返回全部成绩（需有效管理员令牌）
export default async function handler(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  if (!(await checkAdmin(token))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  const rows = (await listResults()).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  return new Response(JSON.stringify({ results: rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
