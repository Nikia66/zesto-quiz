// 核心逻辑：题库读取、对外发题（剔除答案）、服务端判分。
// 仅供 Netlify Function 内部调用；完整题库（含答案）只存在于服务端，永不下发客户端。
import BANK from './bank.mjs';

const BY_ID = Object.fromEntries(BANK.map((q) => [q.id, q]));

export const TOTAL_QUESTIONS = 35; // 每次考试题量（从 50 题题库抽取）
export const DURATION_MIN = 30; // 考试时长（分钟）
export const PASS_RATE = 0.9; // 合格线：完成率 ≥ 90%

export function getBank() {
  return BANK;
}

// 对外发题：剔除 answer / explanation，学员无法在客户端获取任何答案
export function buildPublicBank(lang = 'zh') {
  const L = lang === 'pt' ? 'pt' : 'zh';
  return BANK.map((q) => ({
    id: q.id,
    part: q.part,
    type: q.type,
    key: !!q.key,
    partName: q.partName, // {zh, pt}
    typeName: q.typeName, // {zh, pt}
    stem: q[L].stem,
    options: q[L].options,
  }));
}

// 答案归一化：多选题按字母排序整串比对；漏选/多选/错选均判错
function normAnswer(type, sel) {
  if (sel == null) return '';
  if (type === 'multiple') {
    const arr = Array.isArray(sel) ? sel : String(sel).split(',');
    return arr
      .map((s) => String(s).trim())
      .filter(Boolean)
      .sort()
      .join(',');
  }
  return Array.isArray(sel) ? String(sel[0] ?? '') : String(sel ?? '').trim();
}

// 服务端校验计分：按 ids（本次抽中的题）逐题比对，未作答计为错
export function grade({ lang = 'zh', ids = [], answers = {} }) {
  const L = lang === 'pt' ? 'pt' : 'zh';
  let correct = 0;
  let total = 0;
  const partStats = {};
  const perQuestion = [];
  for (const rawId of ids || []) {
    const id = Number(rawId);
    const q = BY_ID[id];
    if (!q) continue;
    total++;
    const sel = answers[id] ?? answers[String(id)] ?? answers[rawId];
    const want = normAnswer(q.type, q.zh.answer); // 答案字母与语言无关
    const given = normAnswer(q.type, sel);
    const ok = want === given;
    if (ok) correct++;
    const p = q.part;
    if (!partStats[p]) partStats[p] = { part: p, partName: q.partName, total: 0, correct: 0 };
    partStats[p].total++;
    if (ok) partStats[p].correct++;
    perQuestion.push({
      id: q.id,
      part: p,
      partName: q.partName,
      type: q.type,
      key: !!q.key,
      stem: q[L].stem,
      options: q[L].options,
      yourAnswer: sel ?? null,
      correctAnswer: q.zh.answer,
      explanation: q[L].explanation,
      correct: ok,
    });
  }
  const rate = total ? correct / total : 0;
  return {
    total,
    correct,
    rate,
    pass: rate >= PASS_RATE,
    partStats: Object.values(partStats).sort((a, b) => a.part - b.part),
    perQuestion,
  };
}
