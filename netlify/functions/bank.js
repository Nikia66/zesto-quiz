import { buildPublicBank } from './_lib/core.js';

// GET /api/bank?lang=zh|pt  → 返回题库（已剔除 answer / explanation）
export async function handler(event) {
  const lang = (event.queryStringParameters && event.queryStringParameters.lang) === 'pt' ? 'pt' : 'zh';
  const bank = buildPublicBank(lang);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(bank),
  };
}
