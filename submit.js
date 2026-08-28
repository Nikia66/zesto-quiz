import { grade } from './_lib/core.js';
import { writeResult, listResults } from './_lib/store.js';
import { randomUUID } from 'crypto';

// 同一工号最多可考次数（前端提示与后端强制一致）
const MAX_ATTEMPTS = 3;

// POST /api/submit  → 服务端判分（对照私有题库），仅回传正确答用于学习，成绩入库
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
  const { name, employeeId, lang = 'zh', ids = [], answers = {}, durationSec } = body || {};
  if (!name || !employeeId || !Array.isArray(ids) || !answers) {
    return new Response(JSON.stringify({ error: 'missing fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // 次数限制：同一工号已达上限则拒绝提交
  try {
    const all = await listResults();
    const used = all.filter((r) => r && String(r.employeeId) === String(employeeId)).length;
    if (used >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({ error: 'attempt_limit', used, max: MAX_ATTEMPTS }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  } catch {
    // 读取失败不阻断提交，避免因存储异常误伤考生
  }

  const L = lang === 'pt' ? 'pt' : 'zh';
  const g = grade({ lang: L, ids, answers });
  const submittedAt = new Date().toISOString();
  const weakParts = g.partStats.filter((ps) => ps.correct < ps.total).map((ps) => ps.partName);

  // 入库记录（含逐题明细，供管理员查看每个学员的错题分布）
  const record = {
    id: randomUUID(),
    name: String(name),
    employeeId: String(employeeId),
    lang: L,
    correct: g.correct,
    total: g.total,
    rate: g.rate,
    pass: g.pass,
    durationSec: Number(durationSec) || 0,
    submittedAt,
    weakParts,
    perQuestion: g.perQuestion,
  };
  await writeResult(record.id, record);

  // 兜底：同时提交到 Netlify Forms（无需 API Token，管理员直接在 Netlify 后台 Forms 查看）
  try {
    await submitToNetlifyForm(request, record);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('[submit] Netlify Forms fallback failed:', err && err.message ? err.message : err);
  }

  // 返回给学员：含逐题解析（学习用），但 rely 服务端判分，不含题库答案源
  const result = {
    ...g,
    submittedAt,
    durationSec: Number(durationSec) || 0,
    name: String(name),
    employeeId: String(employeeId),
    lang: L,
  };
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function submitToNetlifyForm(request, record) {
  const host = request.headers.get('host') || 'localhost';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const origin = `${proto}://${host}`;
  const params = new URLSearchParams({
    'form-name': 'zesto-results',
    employeeId: String(record.employeeId),
    name: String(record.name),
    lang: String(record.lang),
    score: `${record.correct}/${record.total}`,
    rate: String((record.rate * 100).toFixed(1)),
    submittedAt: String(record.submittedAt),
    data: JSON.stringify(record),
  });
  const res = await fetch(origin + '/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': origin + '/',
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Netlify Forms ${res.status}: ${text.slice(0, 200)}`);
  }
}
