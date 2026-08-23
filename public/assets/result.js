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
    return `
      <div class="exp-item ${cls}">
        <div class="h"><span class="qn">${i + 1}. ${escapeHtml(q.stem)}</span>
          <span class="tag part">${q.partName[L]}</span></div>
        <div class="ans">
          ${window.t('yourAns')}: <span class="${yourCls}">${your}</span> &nbsp;|&nbsp;
          ${window.t('corAns')}: <span class="cor">${q.correctAnswer}</span>
        </div>
        <div class="why">${escapeHtml(q.explanation)}</div>
      </div>`;
  }).join('');

  box.innerHTML = banner + dash + weakHtml +
    `<div class="card"><h2 data-i18n="expTitle"></h2>${expHtml}</div>`;
  window.applyStatic(box);

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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();
