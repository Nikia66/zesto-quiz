import { checkAdmin } from './_lib/auth.js';
import { listFormResults, formsConfigured, formsDiag } from './_lib/forms.js';

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

  const diag = formsDiag();

  // 主数据源：Netlify Forms（submit.js 已写入，这里内联拉回，管理页可直接查看）
  if (formsConfigured()) {
    try {
      const rows = await listFormResults();
      if (rows && rows.length) {
        return new Response(JSON.stringify({ results: rows, source: 'forms' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
      // Forms 配置正确但为空：不报错，继续尝试 Blobs 兜底
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('[admin] Forms API error:', e && e.message);
      // 把真实错误暴露给管理页，便于定位（Site ID 错 / token 无权限 / 表单未检测）
      return new Response(
        JSON.stringify({
          results: [],
          source: 'forms-error',
          error: String((e && e.message) || e),
          diag,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }
      );
    }
  }

  // 兜底：Blobs（若已正确配置）
  try {
    const { listResults } = await import('./_lib/store.js');
    const rows = (await listResults()).sort((a, b) =>
      (b.submittedAt || '').localeCompare(a.submittedAt || '')
    );
    return new Response(
      JSON.stringify({
        results: rows,
        source: 'blobs',
        diag: formsConfigured() ? null : diag,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      }
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('[admin] blobs error:', e && e.message);
    return new Response(
      JSON.stringify({
        results: [],
        source: 'blobs-error',
        error: String((e && e.message) || e),
        diag,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }
    );
  }
}
