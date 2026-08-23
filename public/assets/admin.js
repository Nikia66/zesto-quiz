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

  keyHint.textContent = window.t('adminKeyHint');

  let token = sessionStorage.getItem(TOKEN_KEY) || '';

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

    totalRecords.textContent = window.t('totalRecords', { n: rows.length }) +
      (kw ? `（${window.t('adminSearchPh')}：${esc(kw)}）` : '');

    if (!filtered.length) {
      tableBox.innerHTML = `<p class="hint">${window.t('adminNoResults')}</p>`;
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
    </tr>`;

    const body = filtered.map((r) => {
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
      </tr>`;
    }).join('');

    tableBox.innerHTML = `<table class="tbl"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

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
