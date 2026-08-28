// 从 Netlify Forms API 读取成绩。submit.js 已把每条成绩 POST 到 zesto-results 表单，
// 这里用服务端凭证（NETLIFY_SITE_ID + NETLIFY_API_TOKEN）拉回全部提交，供管理页内联展示。
// 这是稳定的存储层，不依赖一直不工作的 Blobs 自动上下文。
const SITE_ID = process.env.NETLIFY_SITE_ID || '';
const TOKEN =
  process.env.NETLIFY_API_TOKEN ||
  process.env.NETLIFY_PAT ||
  process.env.NETLIFY_TOKEN ||
  '';
const FORM_NAME = 'zesto-results';

export function formsConfigured() {
  return Boolean(SITE_ID && TOKEN);
}

export function formsDiag() {
  return { siteId: Boolean(SITE_ID), token: Boolean(TOKEN) };
}

async function getFormId() {
  const r = await fetch(
    `https://api.netlify.com/api/v1/sites/${SITE_ID}/forms?access_token=${TOKEN}`
  );
  if (!r.ok) throw new Error(`forms list ${r.status}`);
  const list = await r.json();
  const form =
    (list || []).find((f) => f.name === FORM_NAME) || (list || [])[0];
  return form && form.id ? form.id : null;
}

export async function listFormResults() {
  if (!formsConfigured()) return null;
  const formId = await getFormId();
  if (!formId) return [];
  const r = await fetch(
    `https://api.netlify.com/api/v1/sites/${SITE_ID}/forms/${formId}/submissions?access_token=${TOKEN}`
  );
  if (!r.ok) throw new Error(`submissions ${r.status}`);
  const arr = await r.json();
  return (arr || [])
    .map((s) => {
      try {
        const raw =
          s.data && s.data.data !== undefined ? s.data.data : s.data;
        const rec = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return rec && rec.employeeId ? rec : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) =>
      (b.submittedAt || '').localeCompare(a.submittedAt || '')
    );
}
