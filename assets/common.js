// 通用工具（后端版）：语言、翻译、出题洗牌、时长格式化。判分已移至服务端。
(function () {
  const LS_KEY = 'zesto_lang';

  window.getLang = function () {
    return localStorage.getItem(LS_KEY) === 'pt' ? 'pt' : 'zh';
  };
  window.setLang = function (l) {
    localStorage.setItem(LS_KEY, l === 'pt' ? 'pt' : 'zh');
  };

  window.t = function (key, vars) {
    const dict = (window.I18N && window.I18N[window.getLang()]) || {};
    let s = dict[key] != null ? dict[key] : key;
    if (vars) {
      for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    }
    return s;
  };

  window.applyStatic = function (root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = window.t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      el.setAttribute('placeholder', window.t(el.getAttribute('data-i18n-ph')));
    });
  };

  window.initLangSwitch = function () {
    const cur = window.getLang();
    document.querySelectorAll('.lang-switch button[data-lang]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-lang') === cur);
      b.onclick = () => {
        window.setLang(b.getAttribute('data-lang'));
        location.reload();
      };
    });
  };

  window.fmtDuration = function (sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  };

  // 考试常量（与后端一致）
  window.TOTAL_QUESTIONS = 35; // 每次从题库随机抽 35
  window.DURATION_MIN = 30;    // 时长 30 分钟
  window.PASS_RATE = 0.9;      // 合格线：完成率 ≥ 90%

  // Fisher-Yates 洗牌（仅用于从服务端下发的题目中随机抽取 35 题，不涉及答案）
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  window.shuffleBank = shuffle;
})();
