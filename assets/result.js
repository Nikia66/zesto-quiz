(function () {
  const lang = window.getLang();
  document.documentElement.lang = lang;
  window.applyStatic();
  window.initLangSwitch();

  const result = JSON.parse(sessionStorage.getItem('zesto_result') || 'null');
  if (!result) { location.href = 'index.html'; return; }
  const L = lang;
  const box = document.getElementById('resultBox');

  const ratePct = (result.rate * 100).toFixed(1) + '%';
  const wrong = result.total - result.correct;
  const status = result.pass ? window.t('statusPass') : window.t('statusFail');
  const timeStr = window.fmtDuration(result.durationSec || 0);
  const dateStr = result.submittedAt ? new Date(result.submittedAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'pt-BR') : '-';

  const weakParts = result.partStats
    .filter((p) => p.correct < p.total)
    .sort((a, b) => (b.total - b.correct) - (a.total - a.correct));

  const banner = `
    <div class="score-banner ${result.pass ? 'pass' : 'fail'}">
      <div>
        <div class="lbl" data-i18n="yourScore"></div>
        <div class="big">${result.correct}/${result.total}</div>
        <div class="lbl">${window.t('rateLabel')}: ${ratePct}</div>
      </div>
      <div class="status-pill">${status}</div>
    </div>`;

  const dash = `
    <div class="card">
      <div class="dash-grid">
        <div class="dash"><div class="v" style="color:var(--ok)">${result.correct}</div><div class="k" data-i18n="dashCorrect"></div></div>
        <div class="dash"><div class="v" style="color:var(--zesto-red)">${wrong}</div><div class="k" data-i18n="dashWrong"></div></div>
        <div class="dash"><div class="v">${timeStr}</div><div class="k" data-i18n="dashTime"></div></div>
        <div class="dash"><div class="v" style="font-size:15px">${dateStr}</div><div class="k" data-i18n="dashDate"></div></div>
      </div>
    </div>`;

  let weakHtml = '';
  if (weakParts.length === 0) {
    weakHtml = `<div class="weak"><h3 data-i18n="weakTitle"></h3><p>${window.t('weakNone')}</p></div>`;
  } else {
    const weakList = weakParts.map((p) => `<li>${p.partName[L]} — ${window.t('dashWrong')} ${p.total - p.correct}/${p.total}</li>`).join('');
    const sugList = weakParts.map((p) => `<li>${p.partName[L]}</li>`).join('');
    weakHtml = `
      <div class="weak">
        <h3 data-i18n="weakTitle"></h3>
        <p>${window.t('weakIntro')}</p>
        <ul>${weakList}</ul>
      </div>
      <div class="card">
        <h3 data-i18n="suggestTitle"></h3>
        <p class="hint">${window.t('suggestIntro')}</p>
        <ul>${sugList}</ul>
      </div>`;
  }

  const expHtml = result.perQuestion.map((q, i) => {
    const cls = q.correct ? 'ok' : 'no';
    const your = Array.isArray(q.yourAnswer) ? q.yourAnswer.join(', ') : (q.yourAnswer || window.t('unanswered'));
    const yourCls = q.correct ? 'cor' : 'my';
    const stemText = (q.stemI18n && q.stemI18n[L]) || q.stem;
    const expText = (q.explanationI18n && q.explanationI18n[L]) || q.explanation;
    return `
      <div class="exp-item ${cls}">
        <div class="h"><span class="qn">${i + 1}. ${escapeHtml(stemText)}</span>
          <span class="tag part">${q.partName[L]}</span></div>
        <div class="ans">
          ${window.t('yourAns')}: <span class="${yourCls}">${your}</span> &nbsp;|&nbsp;
          ${window.t('corAns')}: <span class="cor">${q.correctAnswer}</span>
        </div>
        <div class="why">${escapeHtml(expText)}</div>
      </div>`;
  }).join('');

  box.innerHTML = banner + dash + weakHtml +
    `<div class="card"><h2 data-i18n="expTitle"></h2>${expHtml}</div>`;
  window.applyStatic(box);

  // 自动保存到本地历史记录（Plan B：即使服务端成绩同步失败，学员也能在 history.html 查看/下载）
  saveToHistory(result);

  // 不通过警告弹窗
  if (!result.pass) {
    const modal = document.getElementById('failModal');
    modal.innerHTML = `
      <div class="modal-mask">
        <div class="modal">
          <div class="ic">⚠️</div>
          <h3>${window.t('failTitle')}</h3>
          <p>${window.t('failText')}</p>
          <button class="btn" id="failOk">${window.t('failBtn')}</button>
        </div>
      </div>`;
    document.getElementById('failOk').onclick = () => { modal.innerHTML = ''; };
  }

  document.getElementById('backBtn').onclick = () => {
    sessionStorage.removeItem('zesto_result');
    location.href = 'index.html';
  };

  document.getElementById('downloadReportBtn').onclick = downloadReport;

  const historyBtn = document.getElementById('historyBtn');
  if (historyBtn) historyBtn.onclick = () => { location.href = 'history.html'; };

  function downloadReport() {
    const L = lang;
    const T = (k) => (window.I18N[L][k] !== undefined ? window.I18N[L][k] : k);
    const tUnanswered = T('unanswered');
    const nowStr = new Date().toLocaleString(L === 'zh' ? 'zh-CN' : 'pt-BR');

    // 题型分布聚合
    const typeAgg = { single: { total: 0, wrong: 0 }, multiple: { total: 0, wrong: 0 }, judge: { total: 0, wrong: 0 } };
    result.perQuestion.forEach((q) => {
      if (typeAgg[q.type]) { typeAgg[q.type].total++; if (!q.correct) typeAgg[q.type].wrong++; }
    });
    const typeNameMap = { single: T('reportSingle'), multiple: T('reportMultiple'), judge: T('reportJudge') };

    // 九大部曲正确率分布
    const partRows = result.partStats.map((p) => {
      const r = p.total ? Math.round((p.correct / p.total) * 100) : 100;
      return `<tr><td>${escapeHtml(p.partName[L])}</td><td>${p.correct}</td><td>${p.total - p.correct}</td>`
        + `<td><span class="bar"><span style="width:${r}%"></span></span><b>${r}%</b></td></tr>`;
    }).join('');

    const typeRows = Object.keys(typeAgg).map((t) =>
      `<tr><td>${typeNameMap[t]}</td><td>${typeAgg[t].total}</td><td class="err">${typeAgg[t].wrong}</td></tr>`
    ).join('');

    const weakHtml = weakParts.length === 0
      ? `<p class="good">${escapeHtml(T('weakNone'))}</p>`
      : `<ul>${weakParts.map((p) => `<li><b>${escapeHtml(p.partName[L])}</b> — ${T('dashWrong')} ${p.total - p.correct}/${p.total}</li>`).join('')}</ul>`;

    const detailRows = result.perQuestion.map((q, i) => {
      const your = Array.isArray(q.yourAnswer) ? q.yourAnswer.join(', ') : (q.yourAnswer == null ? tUnanswered : String(q.yourAnswer));
      const stemText = (q.stemI18n && q.stemI18n[L]) || q.stem;
      const expText = (q.explanationI18n && q.explanationI18n[L]) || q.explanation;
      return `<div class="q ${q.correct ? 'ok' : 'no'}">
        <div class="qh"><span class="qi">${i + 1}</span>${escapeHtml(stemText)}
          <span class="tag">${escapeHtml(q.partName[L])}</span></div>
        <div class="qa">${T('yourAns')}: <b class="${q.correct ? 'c' : 'm'}">${escapeHtml(your)}</b> &nbsp;|&nbsp; ${T('corAns')}: <b class="c">${escapeHtml(q.correctAnswer)}</b></div>
        <div class="qx">${escapeHtml(expText)}</div>
      </div>`;
    }).join('');

    const status = result.pass ? T('statusPass') : T('statusFail');

    const html = `<!DOCTYPE html><html lang="${L}"><head><meta charset="utf-8">
<title>${escapeHtml(T('reportTitle'))}</title>
<style>
  body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",Arial,sans-serif;color:#1f2329;line-height:1.6;margin:0;padding:32px;background:#fff}
  .brand{display:flex;align-items:center;gap:10px;margin-bottom:4px}
  .logo{width:34px;height:34px;border-radius:8px;background:#c0392b;color:#fff;font-weight:800;display:grid;place-items:center}
  h1{font-size:19px;margin:0}
  .sub{color:#6b7280;font-size:12px}
  h2{font-size:15px;border-left:4px solid #c0392b;padding-left:8px;margin:22px 0 10px}
  .kv{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:14px}
  .kv b{color:#6b7280;font-weight:500}
  .cards{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}
  .crd{flex:1;min-width:120px;border:1px solid #e5e7eb;border-radius:10px;padding:12px;text-align:center}
  .crd .v{font-size:22px;font-weight:800}
  .crd .k{font-size:12px;color:#6b7280}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
  th,td{border:1px solid #e5e7eb;padding:7px 10px;text-align:left}
  th{background:#f7f8fa;color:#374151}
  .err{color:#c0392b;font-weight:700}
  .bar{display:inline-block;width:90px;height:8px;background:#eee;border-radius:6px;overflow:hidden;vertical-align:middle;margin-right:6px}
  .bar span{display:block;height:100%;background:#c0392b}
  .q{border:1px solid #e5e7eb;border-left:4px solid #1a8f4a;border-radius:8px;padding:10px 12px;margin:8px 0}
  .q.no{border-left-color:#c0392b}
  .qi{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#c0392b;color:#fff;font-size:12px;margin-right:6px}
  .tag{font-size:11px;background:#fdecea;color:#c0392b;border-radius:6px;padding:1px 6px;margin-left:6px}
  .qa{font-size:13px;margin:4px 0}
  .qx{font-size:12px;color:#6b7280}
  .c{color:#1a8f4a}.m{color:#c0392b}.good{color:#1a8f4a}
  ul{margin:6px 0;padding-left:20px}li{margin:3px 0}
  @media print{body{padding:12px}}
</style></head><body>
  <div class="brand"><div class="logo">Z</div><div><h1>${escapeHtml(T('reportTitle'))}</h1>
    <div class="sub">Zesto Sales Training · 九部曲认证考试</div></div></div>

  <h2>${escapeHtml(T('reportStudent'))}</h2>
  <div class="kv">
    <b>${escapeHtml(T('nameLabel'))}</b><span>${escapeHtml(result.name)}</span>
    <b>${escapeHtml(T('idLabel'))}</b><span>${escapeHtml(result.employeeId)}</span>
    <b>${escapeHtml(T('reportGen'))}</b><span>${escapeHtml(nowStr)}</span>
  </div>

  <h2>${escapeHtml(T('reportSummary'))}</h2>
  <div class="cards">
    <div class="crd"><div class="v">${result.correct}/${result.total}</div><div class="k">${escapeHtml(T('yourScore'))}</div></div>
    <div class="crd"><div class="v">${(result.rate * 100).toFixed(1)}%</div><div class="k">${escapeHtml(T('rateLabel'))}</div></div>
    <div class="crd"><div class="v">${window.fmtDuration(result.durationSec || 0)}</div><div class="k">${escapeHtml(T('dashTime'))}</div></div>
    <div class="crd"><div class="v" style="color:${result.pass ? '#1a8f4a' : '#c0392b'}">${status}</div><div class="k">${escapeHtml(T('colStatus'))}</div></div>
  </div>

  <h2>${escapeHtml(T('reportDist'))} · ${escapeHtml(T('reportByPart'))}</h2>
  <table><thead><tr><th>${escapeHtml(T('reportPart'))}</th><th>${escapeHtml(T('reportCorrect'))}</th><th>${escapeHtml(T('reportWrong'))}</th><th>${escapeHtml(T('reportRate'))}</th></tr></thead>
  <tbody>${partRows}</tbody></table>

  <h2>${escapeHtml(T('reportDist'))} · ${escapeHtml(T('reportByType'))}</h2>
  <table><thead><tr><th>${escapeHtml(T('reportType'))}</th><th>${escapeHtml(T('reportCnt'))}</th><th>${escapeHtml(T('reportWrong'))}</th></tr></thead>
  <tbody>${typeRows}</tbody></table>

  <h2>${escapeHtml(T('reportSuggest'))}</h2>
  ${weakHtml}

  <h2>${escapeHtml(T('reportDetail'))}</h2>
  ${detailRows}
</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (L === 'zh' ? 'Zesto_成绩报告_' : 'Relatorio_Zesto_') + result.name + '_' + result.employeeId + '.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function saveToHistory(record) {
    try {
      const key = 'zesto_history';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      // 同一 id 不重复写入；限制保存最近 20 条
      if (!arr.find((r) => r.id === record.id)) {
        arr.unshift(record);
        if (arr.length > 20) arr.length = 20;
        localStorage.setItem(key, JSON.stringify(arr));
      }
    } catch {
      /* ignore */
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();
