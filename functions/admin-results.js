import { listResults, initStore } from './_lib/store.js';
import { checkAdmin } from './_lib/auth.js';

// GET /api/admin/results?token=...  → 返回全部成绩（需有效管理员令牌）
export async function handler(event) {
  initStore(event);
  const token = (event.queryStringParameters && event.queryStringParameters.token) || '';
  if (!(await checkAdmin(token))) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'unauthorized' }),
    };
  }
  const rows = (await listResults()).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ results: rows }),
  };
}
