import { listResults } from './_lib/store.js';
import { checkAdmin } from './_lib/auth.js';

function csvCell(v) {
  const s = String(v == null ? '' : v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// GET /api/admin/export?token=...&fmt=csv  → CSV 导出（带 BOM，Excel 中文不乱码）
export async function handler(event) {
  const q = event.queryStringParameters || {};
  const token = q.token || '';
  if (!(await checkAdmin(token))) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'unauthorized' }),
    };
  }
  if ((q.fmt || 'csv') !== 'csv') {
    const rows = await listResults();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ results: rows }),
    };
  }
  const rows = await listResults();
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
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="zesto_results.csv"',
      'Cache-Control': 'no-store',
    },
    body: csv,
  };
}
