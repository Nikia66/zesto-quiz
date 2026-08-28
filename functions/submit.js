import { grade } from './_lib/core.js';
import { writeResult, listResults, initStore } from './_lib/store.js';
import { randomUUID } from 'crypto';

// 同一工号最多可考次数（前端提示与后端强制一致）
const MAX_ATTEMPTS = 3;

// POST /api/submit  → 服务端判分（对照私有题库），仅回传正确答用于学习，成绩入库
export async function handler(event) {
  initStore(event);
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON' }) };
  }
  const { name, employeeId, lang = 'zh', ids = [], answers = {}, durationSec } = body || {};
  if (!name || !employeeId || !Array.isArray(ids) || !answers) {
    return { statusCode: 400, body: JSON.stringify({ error: 'missing fields' }) };
  }

  // 次数限制：同一工号已达上限则拒绝提交
  try {
    const all = await listResults();
    const used = all.filter((r) => r && String(r.employeeId) === String(employeeId)).length;
    if (used >= MAX_ATTEMPTS) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ error: 'attempt_limit', used, max: MAX_ATTEMPTS }),
      };
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

  // 返回给学员：含逐题解析（学习用），但 rely 服务端判分，不含题库答案源
  const result = {
    ...g,
    submittedAt,
    durationSec: Number(durationSec) || 0,
    name: String(name),
    employeeId: String(employeeId),
    lang: L,
  };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(result),
  };
}
