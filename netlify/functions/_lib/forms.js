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
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) throw new Error('token 无权限或无效（HTTP ' + r.status + '）');
    if (r.status === 404) throw new Error('Site ID 不正确（HTTP 404）');
    throw new Error(`forms list HTTP ${r.status}`);
  }
  const list = await r.json();
  const form =
    (list || []).find((f) => f.name === FORM_NAME) || (list || [])[0];
  if (!form || !form.id) {
    throw new Error('表单 zesto-results 未被 Netlify 检测到（请先在 Forms 标签页点击 Enable form detection 并重新部署）');
  }
  return form.id;
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
