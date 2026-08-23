(function () {
  const lang = window.getLang();
  document.documentElement.lang = lang;
  window.applyStatic();
  window.initLangSwitch();

  const user = JSON.parse(sessionStorage.getItem('zesto_user') || 'null');
  if (!user || !user.name || !user.employeeId) {
    quizBox.innerHTML = `
      <div class="card" style="text-align:center;padding:36px 24px">
        <div style="font-size:42px;margin-bottom:12px">📋</div>
        <h2>${window.t('needInfo')}</h2>
        <p class="hint">${window.t('homeLead')}</p>
        <button class="btn block" style="margin-top:18px" onclick="location.href='index.html'">${window.t('backHome')}</button>
      </div>`;
    submitBtn.style.display = 'none';
    return;
  }

  const TOTAL_SEC = window.DURATION_MIN * 60;
  let remaining = TOTAL_SEC;
  let questions = []; // 服务端下发、已剔除答案的 35 题
  const answers = {}; // id -> string | string[]
  let timer = null;
  let submitted = false;

  const quizBox = document.getElementById('quizBox');
  const submitBtn = document.getElementById('submitBtn');
  const timerEl = document.getElementById('timer');
  const progressEl = document.getElementById('progress');

  async function load() {
    quizBox.innerHTML = `<div class="card"><p class="hint">${window.t('loading')}</p></div>`;
    try {
      const resp = await fetch(`/api/bank?lang=${lang}`, { cache: 'no-store' });
      if (!resp.ok) throw new Error('bad status ' + resp.status);
      const bank = await resp.json();
      // 随机抽取 35 题（答案不在下发内容中，学员无法在客户端获取）
      const picked = window.shuffleBank(bank).slice(0, window.TOTAL_QUESTIONS);
      questions = picked.map((q) => ({
        id: q.id,
        part: q.part,
        type: q.type,
        key: q.key,
        partName: q.partName[lang],
        typeName: q.typeName[lang],
        stem: q.stem,
        options: q.options,
      }));
      renderQuestions();
      updateProgress();
      submitBtn.style.display = 'block';
      startTimer();
    } catch (e) {
      quizBox.innerHTML = `<div class="card"><p class="hint">${window.t('loadErr')}</p></div>`;
      submitBtn.style.display = 'none';
    }
  }

  function renderQuestions() {
    quizBox.innerHTML = '';
    questions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'q';
      const typeName = q.typeName;
      const keyTag = q.key ? `<span class="tag key">★ ${lang === 'zh' ? '重点' : 'Essencial'}</span>` : '';
      card.innerHTML = `
        <div class="meta">
          <span class="tag part">${window.t('partLabel')}: ${escapeHtml(q.partName)}</span>
          <span class="tag">${window.t('typeLabel')}: ${typeName}</span>
          ${keyTag}
        </div>
        <div class="stem">${window.t('qLabel', { n: idx + 1 })}. ${escapeHtml(q.stem)}</div>
        <div class="opts" data-qid="${q.id}"></div>`;
      const optsBox = card.querySelector('.opts');
      q.options.forEach((o) => {
        const inputType = q.type === 'multiple' ? 'checkbox' : 'radio';
        const label = document.createElement('label');
        label.className = 'opt';
        label.innerHTML = `<input type="${inputType}" name="q${q.id}" value="${o.key}">
          <span class="mark">${o.key}</span><span>${escapeHtml(o.text)}</span>`;
        optsBox.appendChild(label);
      });
      quizBox.appendChild(card);
    });

    quizBox.querySelectorAll('.opts').forEach((box) => {
      const qid = box.getAttribute('data-qid');
      const q = questions.find((x) => String(x.id) === qid);
      box.addEventListener('change', (ev) => {
        const checked = Array.from(box.querySelectorAll('input:checked')).map((i) => i.value);
        answers[qid] = q.type === 'multiple' ? checked : (checked[0] || null);
        box.querySelectorAll('.opt').forEach((l) => l.classList.remove('sel'));
        box.querySelectorAll('input:checked').forEach((i) => i.closest('.opt').classList.add('sel'));
        updateProgress();
      });
    });
  }

  function answeredCount() {
    return questions.filter((q) => {
      const a = answers[q.id];
      if (Array.isArray(a)) return a.length > 0;
      return a != null && a !== '';
    }).length;
  }

  function updateProgress() {
    progressEl.textContent = window.t('progress', { a: answeredCount(), t: questions.length });
  }

  function startTimer() {
    timerEl.textContent = window.fmtDuration(remaining);
    timer = setInterval(() => {
      remaining--;
      timerEl.textContent = window.fmtDuration(remaining);
      if (remaining <= 300) timerEl.classList.add('warn');
      if (remaining <= 0) { clearInterval(timer); doSubmit(true); }
    }, 1000);
  }

  async function doSubmit(auto) {
    if (submitted) return;
    const unanswered = questions.length - answeredCount();
    if (!auto && unanswered > 0) {
      if (!confirm(window.t('confirmUnanswered', { n: unanswered }))) return;
    }
    submitted = true;
    clearInterval(timer);
    submitBtn.disabled = true;

    const ids = questions.map((q) => q.id);
    const payload = {
      name: user.name,
      employeeId: user.employeeId,
      lang: lang,
      ids: ids,
      answers: answers,
      durationSec: TOTAL_SEC - remaining,
    };

    try {
      const resp = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('submit failed ' + resp.status);
      const result = await resp.json();
      sessionStorage.setItem('zesto_result', JSON.stringify(result));
      location.href = 'result.html';
    } catch (e) {
      submitted = false;
      submitBtn.disabled = false;
      alert(window.t('submitErr') || '提交失败，请重试。');
    }
  }

  submitBtn.onclick = () => doSubmit(false);

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  load();
})();
