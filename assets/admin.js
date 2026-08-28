(function () {
  const lang = window.getLang();
  document.documentElement.lang = lang;
  window.applyStatic();
  window.initLangSwitch();

  const TOKEN_KEY = 'zesto_admin_token';
  const loginBox = document.getElementById('loginBox');
  const adminBox = document.getElementById('adminBox');
  const userIn = document.getElementById('adminUser');
  const passIn = document.getElementById('adminPass');
  const loginBtn = document.getElementById('loginBtn');
  const loginErr = document.getElementById('loginErr');
  const logoutBtn = document.getElementById('logoutBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const exportBtn = document.getElementById('exportBtn');
  const searchInput = document.getElementById('searchInput');
  const tableBox = document.getElementById('tableBox');
  const totalRecords = document.getElementById('totalRecords');
  const keyHint = document.getElementById('keyHint');
  const detailMask = document.getElementById('detailMask');
  const detailTitle = document.getElementById('detailTitle');
  const detailBody = document.getElementById('detailBody');
  const detailCloseBtn = document.getElementById('detailCloseBtn');

  keyHint.textContent = window.t('adminKeyHint');

  let token = sessionStorage.getItem(TOKEN_KEY) || '';
  let currentRows = [];
  let lastDiag = null;

  function showAdmin() {
    loginBox.style.display = 'none';
    adminBox.style.display = '';
    loadResults();
  }
  function showLogin() {
    loginBox.style.display = '';
    adminBox.style.display = 'none';
    sessionStorage.removeItem(TOKEN_KEY);
    token = '';
  }

  async function login() {
    const u = userIn.value.trim();
    const p = passIn.value;
    loginErr.textContent = '';
    loginBtn.disabled = true;
    loginBtn.textContent = window.t('adminLoginWait');
    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: u, pass: p }),
      });
      if (resp.ok) {
        const data = await resp.json();
        token = data.token;
        sessionStorage.setItem(TOKEN_KEY, token);
        showAdmin();
      } else {
        loginErr.textContent = window.t('adminInvalid');
      }
    } catch (e) {
      loginErr.textContent = window.t('adminLoadErr');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = window.t('adminLoginBtn');
    }
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleString(lang === 'zh' ? 'zh-CN' : 'pt-BR');
    } catch (e) {
      return iso || '-';
    }
  }
  function fmtTime(sec) {
    sec = Number(sec) || 0;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  async function loadResults() {
    if (!token) { showLogin(); return; }
    tableBox.innerHTML = `<p class="hint">${window.t('loading')}</p>`;
    try {
      const resp = await fetch(`/api/admin/results?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      if (resp.status === 401) { showLogin(); return; }
      if (!resp.ok) throw new Error('bad status ' + resp.status);
      const data = await resp.json();
      lastDiag = data.diag || null;
      renderTable(data.results || []);
    } catch (e) {
      tableBox.innerHTML = `<p class="hint">${window.t('adminLoadErr')}</p>`;
    }
  }

  function renderTable(rows) {
    const kw = (searchInput.value || '').trim().toLowerCase();
    const filtered = kw
      ? rows.filter((r) => (r.name || '').toLowerCase().includes(kw) || (r.employeeId || '').toLowerCase().includes(kw))
      : rows;
    currentRows = filtered;

    totalRecords.textContent = window.t('totalRecords', { n: rows.length }) +
      (kw ? `（${window.t('adminSearchPh')}：${esc(kw)}）` : '');

    if (!filtered.length) {
      const host = location.host || '';
      const slug = host.replace(/\.netlify\.app.*$/, '').replace(/:\d+$/, '');
      const formsUrl = slug && slug !== host
        ? `https://app.netlify.com/sites/${slug}/forms`
        : 'https://app.netlify.com/';
      // 未配置 Forms API 凭证（NETLIFY_SITE_ID / NETLIFY_API_TOKEN）时给出明确指引
      if (lastDiag && (!lastDiag.siteId || !lastDiag.token)) {
        const miss = [];
        if (!lastDiag.siteId) miss.push('NETLIFY_SITE_ID');
        if (!lastDiag.token) miss.push('NETLIFY_API_TOKEN');
        tableBox.innerHTML = `
          <p class="hint">${window.t('adminNoResults')}</p>
          <p class="hint" style="margin-top:10px">${window.t('adminNeedConfig', { v: miss.join('、') })}</p>
          <p style="margin-top:8px"><a class="btn secondary" href="${esc(formsUrl)}" target="_blank" rel="noopener">${esc(window.t('adminFormsLink'))}</a></p>`;
        return;
      }
      tableBox.innerHTML = `
        <p class="hint">${window.t('adminNoResults')}</p>
        <p class="hint" style="margin-top:10px">${window.t('adminFormsFallback')}</p>
        <p style="margin-top:8px"><a class="btn secondary" href="${esc(formsUrl)}" target="_blank" rel="noopener">${esc(window.t('adminFormsLink'))}</a></p>`;
      return;
    }

    const head = `<tr>
      <th>${esc(window.t('colName'))}</th>
      <th>${esc(window.t('colId'))}</th>
      <th>${esc(window.t('colLang'))}</th>
      <th>${esc(window.t('colScore'))}</th>
      <th>${esc(window.t('colRate'))}</th>
      <th>${esc(window.t('colStatus'))}</th>
      <th>${esc(window.t('colTime'))}</th>
      <th>${esc(window.t('colDate'))}</th>
      <th>${esc(window.t('colWeak') || '薄弱项')}</th>
      <th>${esc(window.t('detailBtn'))}</th>
    </tr>`;

    const body = filtered.map((r, idx) => {
      const rate = ((r.rate || 0) * 100).toFixed(1) + '%';
      const badge = r.pass
        ? `<span class="badge p">${esc(window.t('statusPass'))}</span>`
        : `<span class="badge f">${esc(window.t('statusFail'))}</span>`;
      const weak = (r.weakParts || []).map((w) => w[lang] || w.zh || w).join('、') || '—';
      return `<tr>
        <td>${esc(r.name)}</td>
        <td>${esc(r.employeeId)}</td>
        <td>${esc(r.lang === 'pt' ? 'PT' : 'ZH')}</td>
        <td>${esc(r.correct)}/${esc(r.total)}</td>
        <td>${rate}</td>
        <td>${badge}</td>
        <td>${fmtTime(r.durationSec)}</td>
        <td>${esc(fmtDate(r.submittedAt))}</td>
        <td style="white-space:normal">${esc(weak)}</td>
        <td><button class="btn secondary sm" onclick="window.__zqOpenDetail(${idx})">${esc(window.t('detailBtn'))}</button></td>
      </tr>`;
    }).join('');

    tableBox.innerHTML = `<table class="tbl"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  function fmtAnswer(a) {
    if (a == null) return window.t('unanswered');
    if (Array.isArray(a)) return a.join(', ');
    return String(a);
  }

  function openDetail(r) {
    if (!r || !Array.isArray(r.perQuestion)) return;
    const pq = r.perQuestion;
    const wrong = pq.filter((p) => !p.correct);
    const typeMap = { single: window.t('reportSingle'), multiple: window.t('reportMultiple'), judge: window.t('reportJudge') };
    const partNameOf = (p) => (p.partName && (p.partName[lang] || p.partName.zh)) || ('部曲 ' + p.part);

    const byPart = {};
    pq.forEach((p) => {
      const k = p.part;
      if (!byPart[k]) byPart[k] = { name: partNameOf(p), total: 0, wrong: 0 };
      byPart[k].total++;
      if (!p.correct) byPart[k].wrong++;
    });
    const partRows = Object.values(byPart)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh'))
      .map((o) => {
        const pct = o.total ? Math.round((o.wrong / o.total) * 100) : 0;
        return `<tr><td>${esc(o.name)}</td><td>${o.total}</td><td>${o.wrong}</td><td><div class="bar"><span style="width:${pct}%"></span></div></td></tr>`;
      }).join('');

    const byType = {};
    pq.forEach((p) => {
      const k = p.type;
      if (!byType[k]) byType[k] = { name: typeMap[k] || k, total: 0, wrong: 0 };
      byType[k].total++;
      if (!p.correct) byType[k].wrong++;
    });
    const typeRows = Object.values(byType)
      .map((o) => `<tr><td>${esc(o.name)}</td><td>${o.total}</td><td>${o.wrong}</td></tr>`)
      .join('');

    const wrongList = wrong.length
      ? wrong
          .map(
            (p) => `<div class="q-item">
          <div class="q-stem">${esc(p.stem)}</div>
          <div class="q-meta">
            <span class="badge w">${esc(window.t('detailYourAns'))}：${esc(fmtAnswer(p.yourAnswer))}</span>
            <span class="badge ok">${esc(window.t('detailCorrectAns'))}：${esc(fmtAnswer(p.correctAnswer))}</span>
          </div>
          <div class="q-exp">${esc(p.explanation || '')}</div>
        </div>`
          )
          .join('')
      : `<p class="hint">${esc(window.t('detailNoWrong'))}</p>`;

    detailTitle.textContent = window.t('detailTitle') + ' · ' + esc(r.name) + '（' + esc(r.employeeId) + '）';
    detailBody.innerHTML = `
      <p class="hint">${esc(window.t('detailCount', { n: pq.length, w: wrong.length }))}</p>
      <h4>${esc(window.t('distByPart'))}</h4>
      <table class="tbl"><thead><tr><th>${esc(window.t('detailPart'))}</th><th>${esc(window.t('reportCnt'))}</th><th>${esc(window.t('reportWrong'))}</th><th>%</th></tr></thead><tbody>${partRows}</tbody></table>
      <h4>${esc(window.t('distByType'))}</h4>
      <table class="tbl"><thead><tr><th>${esc(window.t('detailType'))}</th><th>${esc(window.t('reportCnt'))}</th><th>${esc(window.t('reportWrong'))}</th></tr></thead><tbody>${typeRows}</tbody></table>
      <h4>${esc(window.t('detailWrongList'))}</h4>
      ${wrongList}
    `;
    detailMask.style.display = 'flex';
  }

  window.__zqOpenDetail = (i) => openDetail(currentRows[i]);

  detailCloseBtn.onclick = () => { detailMask.style.display = 'none'; };
  detailMask.addEventListener('click', (e) => { if (e.target === detailMask) detailMask.style.display = 'none'; });

  // 事件
  loginBtn.onclick = login;
  logoutBtn.onclick = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch (e) {}
    showLogin();
  };
  refreshBtn.onclick = loadResults;
  exportBtn.onclick = () => {
    if (!token) { showLogin(); return; }
    window.open(`/api/admin/export?token=${encodeURIComponent(token)}&fmt=csv`, '_blank');
  };
  searchInput.addEventListener('input', () => loadResults());
  passIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  userIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });

  // 进入页面：有 token 先尝试拉取，失败则回到登录
  if (token) {
    loadResults();
  } else {
    showLogin();
  }
})();
