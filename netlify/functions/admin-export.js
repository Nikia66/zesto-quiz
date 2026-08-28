import { checkAdmin } from './_lib/auth.js';
import { listFormResults, formsConfigured } from './_lib/forms.js';

function csvCell(v) {
  const s = String(v == null ? '' : v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// GET /api/admin/export?token=...&fmt=csv  → CSV 导出（带 BOM，Excel 中文不乱码）
export default async function handler(request) {
  const url = new URL(request.url);
  const q = Object.fromEntries(url.searchParams.entries());
  const token = q.token || '';
  if (!(await checkAdmin(token))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  let rows = [];
  if (formsConfigured()) {
    try {
      rows = (await listFormResults()) || [];
    } catch (e) {
      // 落到 Blobs
    }
  }
  if (!rows.length) {
    const { listResults } = await import('./_lib/store.js');
    rows = await listResults();
  }

  if ((q.fmt || 'csv') !== 'csv') {
    return new Response(JSON.stringify({ results: rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const header = 'name,employeeId,lang,correct,total,rate,pass,durationSec,submittedAt,weakParts\n';
  const body = rows
    .map((r) =>
      [
        r.name,
        r.employeeId,
        r.lang,
        r.correct,
        r.total,
        (r.rate * 100).toFixed(1) + '%',
        r.pass ? 1 : 0,
        r.durationSec,
        r.submittedAt,
        (r.weakParts || []).map((w) => (w && w.zh ? w.zh : w || '')).join(' / '),
      ]
        .map(csvCell)
        .join(',')
    )
    .join('\n');
  const csv = '﻿' + header + body;
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="zesto_results.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
