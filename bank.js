import { buildPublicBank } from './_lib/core.js';

// GET /api/bank?lang=zh|pt  → 返回题库（已剔除 answer / explanation）
export default async function handler(request) {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang') === 'pt' ? 'pt' : 'zh';
  const bank = buildPublicBank(lang);
  return new Response(JSON.stringify(bank), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
