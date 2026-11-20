/* ============ 職想瑜你 Find Your Balance — app.js ============
 * 純前端、無登入、無資料庫。
 * 回饋透過 Google Forms 收集（見 README.md）。本檔案不放任何 API Key 或機密。
 *
 * 重要限制：Google Forms 不允許跨網域讀取回應，因此以 fetch + mode:'no-cors' 送出時，
 * 網頁「只能知道請求有沒有發出去」，無法確認 Google 是否真的收錄。
 * 若選項文字與表單不一致、表單關閉收件或設為必填，Google 會拒收，但網頁看不到。
 * 請以 Google 試算表實際收到的資料為準（測試方式見 README.md）。
 */
(function () {
  'use strict';

  /* ---------- 設定（請依實際情況修改） ---------- */
  var CONFIG = {
    instagramUrl: 'https://www.instagram.com/yulin__aerial.ot/', // 玉霖 空中瑜伽 Instagram（index.html 內的連結也要一致）
    googleForm: {
      // 留空＝示範模式（不送出）
      actionUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSf8yn_rEqmRI5LkfUHthGq5G1Ei2_tZibB-GF-HYQZcJO_Upg/formResponse',
      fields: {
        fb1: 'entry.1002705716',            // 單選：今天的體驗，有沒有讓你重新注意到某個生活面向？
        fb2: 'entry.598118299',             // 單選：今天哪個部分對你最有幫助？
        fb3: 'entry.636037644',             // 段落：想留給我們的一句話
        interests: 'entry.371229210',       // 核取方塊：未來你對哪些內容有興趣？
        email: 'entry.722374935',           // 簡答：Email
        consentContact: 'entry.1387084582', // 核取方塊：聯絡同意（選項「同意」）
        consentNotify: 'entry.167847248'    // 核取方塊：活動通知同意（選項「同意」）
      }
    },
    breathSeconds: 60,
    submitTimeoutMs: 10000
  };

  /* ---------- 內容資料 ---------- */
  var MOODS = [
    { id: 'tired', label: '有點疲憊', note: '今天的你有點疲憊，記得對自己溫柔一點。' },
    { id: 'busy', label: '腦袋很忙', note: '腦袋很忙的時候，一分鐘的停頓也很珍貴。' },
    { id: 'lost', label: '有點迷惘', note: '有點迷惘的時候，慢慢來，也是一種前進。' },
    { id: 'good', label: '還不錯，想更認識自己', note: '狀態不錯的時候，正適合多認識自己一點。' }
  ];

  var NEGLECTS = [
    { id: 'body', label: '身體的疲累與休息需求' },
    { id: 'emotion', label: '自己真正的情緒' },
    { id: 'leisure', label: '休閒與興趣' },
    { id: 'relation', label: '人際關係與陪伴' },
    { id: 'wants', label: '自己想做的事情' },
    { id: 'none', label: '目前沒有特別忽略的事' }
  ];

  var GUIDE = [
    '感受身體與地面、椅子接觸的地方。',
    '注意自然的呼吸，不需要改變它。',
    '留意肩膀、下巴和雙手，此刻是什麼感覺？',
    '感受目前身體整體的狀態，不評價，只是看見。',
    '問問自己：現在的我，需要什麼？'
  ];

  var STATUSES = [
    { id: 'good', label: '目前還不錯' },
    { id: 'neglect', label: '最近比較忽略' },
    { id: 'curious', label: '想多了解這個面向' },
    { id: 'unsure', label: '不太確定' }
  ];

  var AREAS = [
    {
      id: 'work', cat: 'life', name: '工作／學習',
      q: '最近的工作或學習節奏，讓你還能喘口氣嗎？',
      insight: '工作與學習佔了生活很大一塊。照顧這個面向，不一定是做得更多，也可以是重新找回節奏感，讓努力和休息都有自己的位置。',
      actions: ['今天專心做事 25 分鐘後，起身走動 5 分鐘', '寫下明天最重要的一件事就好，其他先放著', '下班或下課後，給自己 10 分鐘不看訊息'],
      cheer: '節奏找回來了，努力也會更輕盈。'
    },
    {
      id: 'health', cat: 'body', name: '健康／自我照顧',
      q: '最近有好好吃飯、睡覺、讓身體休息嗎？',
      insight: '身體一直默默陪著我們。照顧它，可以從很小的地方開始：一杯水、一頓好好坐下來吃的飯、一段早一點的睡眠。',
      actions: ['今晚比平常早 15 分鐘放下手機準備睡覺', '每天替自己倒一杯水，慢慢喝完', '找一段時間伸展肩頸，感受身體的變化'],
      cheer: '願意聽見身體的聲音，就是很好的照顧。'
    },
    {
      id: 'social', cat: 'emo', name: '人際／社交',
      q: '最近有和讓你感到自在的人聊聊天嗎？',
      insight: '好的連結會讓人感到被支持。照顧這個面向，不需要很多人，有時候一段真誠的對話就很足夠。',
      actions: ['傳一則訊息給一位想念的朋友', '和家人或朋友吃一頓不滑手機的飯', '對今天幫助過你的人說聲謝謝'],
      cheer: '一點點的連結，也能讓心變得溫暖。'
    },
    {
      id: 'leisure', cat: 'care', name: '興趣／休閒',
      q: '最近有做一件純粹讓自己開心的事嗎？',
      insight: '休閒不是浪費時間，而是讓自己重新充電的方式。那些讓你眼睛發亮的小事，值得被放進行事曆裡。',
      actions: ['這週安排 30 分鐘，做一件只為了開心的事', '聽一首喜歡的歌，什麼都不做，只是聽', '去一個想去很久的地方散步'],
      cheer: '讓自己開心，本來就是重要的事。'
    },
    {
      id: 'daily', cat: 'life', name: '日常生活',
      q: '你的日常步調與生活環境，讓你感到舒服嗎？',
      insight: '日常是生活的底色。一個整理過的角落、一段固定的晨間儀式，都能讓每天多一點安穩的感覺。',
      actions: ['花 10 分鐘整理書桌或床邊的一個角落', '早上起床後，先慢慢喝一杯溫水再開始一天', '出門時刻意放慢腳步，觀察路上的風景'],
      cheer: '把日常照顧好，生活就多了一點餘裕。'
    },
    {
      id: 'growth', cat: 'emo', name: '自我探索／成長',
      q: '最近有停下來想想，自己想往哪裡走嗎？',
      insight: '認識自己是一段持續的旅程。不急著找到答案，願意好奇、願意提問，就已經在路上了。',
      actions: ['寫下三件最近讓你有感覺的小事', '睡前問自己：今天我做了什麼喜歡的事？', '讀一篇文章或聽一集節目，主題是自己好奇的事'],
      cheer: '每一次好奇，都讓你更靠近自己一點。'
    }
  ];

  var STATUS_LINES = {
    good: '你說這個面向目前還不錯，代表你已經有一些照顧自己的方法。可以想想：怎麼讓它持續下去？',
    neglect: '你注意到最近比較忽略它。能夠察覺，本身就是重新照顧的開始。',
    curious: '你想多了解這個面向，好奇心是很好的起點，可以先從小小的觀察開始。',
    unsure: '不太確定也沒關係，有些答案需要多一點時間慢慢浮現。'
  };

  /* 回饋選項：label 會原文送到 Google 表單，必須與表單選項「一字不差」 */
  var FB1 = [
    { id: 'new', label: '有，而且有新的發現' },
    { id: 'slight', label: '稍微提醒到自己' },
    { id: 'none', label: '沒有特別感覺' },
    { id: 'unsure', label: '不確定' }
  ];
  var FB2 = [
    { id: 'body', label: '一分鐘身體覺察' },
    { id: 'balance', label: '六大生活面向探索' },
    { id: 'action', label: '個人化小行動' },
    { id: 'other', label: '其他或目前沒有特別感覺' }
  ];
  var INTERESTS = [
    { id: 'stretch', label: '身體覺察與伸展' },
    { id: 'aerial', label: '空中瑜伽與動作探索' },
    { id: 'time', label: '生活平衡與時間安排' },
    { id: 'selfcare', label: '壓力調適與自我照顧' },
    { id: 'diary', label: '職能日記與生活紀錄' },
    { id: 'workshop', label: '小型體驗工作坊' }
  ];

  var TOTAL_STEPS = 5;            // 進度條只計算 page 1–5
  var STORE_KEY = 'balance-mvp-v2';

  /* ---------- 狀態 ---------- */
  function freshState() {
    return {
      step: 0,
      mood: null, neglect: null,
      bodyStatus: 'none',        // 'none' 尚未完成｜'completed' 完整 60 秒｜'skipped' 跳過
      balance: {},               // { areaId: statusId }，可只回答部分面向
      focus: null,
      action: null,              // 選用的預設行動文字
      customWhen: '', customWhat: '',
      actionConfirmed: false,
      fb1: null, fb2: null, interests: []
      // Email、留言、同意勾選不存入瀏覽器暫存
    };
  }
  var state = freshState();

  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 私密模式等情況忽略 */ }
  }
  function ids(list) { return list.map(function (x) { return x.id; }); }
  function load() {
    try {
      sessionStorage.removeItem('balance-mvp-v1'); // 清掉舊版暫存
      var raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;
      var s = freshState();
      Object.keys(s).forEach(function (k) { if (k in data) s[k] = data[k]; });
      // 逐欄檢查，避免舊資料或被竄改的暫存讓流程壞掉
      if (typeof s.step !== 'number' || s.step < 0 || s.step > 6) s.step = 0;
      if (ids(MOODS).indexOf(s.mood) < 0) s.mood = null;
      if (ids(NEGLECTS).indexOf(s.neglect) < 0) s.neglect = null;
      if (['none', 'completed', 'skipped'].indexOf(s.bodyStatus) < 0) s.bodyStatus = 'none';
      if (!s.balance || typeof s.balance !== 'object' || Array.isArray(s.balance)) s.balance = {};
      Object.keys(s.balance).forEach(function (k) {
        if (!findArea(k) || ids(STATUSES).indexOf(s.balance[k]) < 0) delete s.balance[k];
      });
      if (!findArea(s.focus)) s.focus = null;
      if (typeof s.action !== 'string') s.action = null;
      s.customWhen = typeof s.customWhen === 'string' ? s.customWhen : '';
      s.customWhat = typeof s.customWhat === 'string' ? s.customWhat : '';
      s.actionConfirmed = !!s.actionConfirmed;
      if (ids(FB1).indexOf(s.fb1) < 0) s.fb1 = null;
      if (ids(FB2).indexOf(s.fb2) < 0) s.fb2 = null;
      s.interests = Array.isArray(s.interests) ? s.interests.filter(function (i) { return ids(INTERESTS).indexOf(i) > -1; }) : [];
      state = s;
    } catch (e) { state = freshState(); }
  }

  /* ---------- 工具 ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0] || null; }
  function findArea(id) { return byId(AREAS, id); }
  function showError(id, msg) { var e = $('#' + id); if (!e) return; e.textContent = msg; e.hidden = !msg; }

  /* 單選元件（卡片或膠囊），支援方向鍵 */
  function renderRadio(container, items, current, onPick, cls) {
    container.innerHTML = '';
    items.forEach(function (it) {
      var b = el('button', { type: 'button', role: 'radio', 'class': cls, 'data-id': it.id });
      if (cls === 'option') b.appendChild(el('span', { 'class': 'option-text' }, it.label));
      else b.textContent = it.label;
      b.addEventListener('click', function () { onPick(it.id); });
      b.addEventListener('keydown', function (ev) {
        var keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (!(ev.key in keys)) return;
        ev.preventDefault();
        var btns = $$('[role="radio"]', container);
        var i = (btns.indexOf(b) + keys[ev.key] + btns.length) % btns.length;
        btns[i].focus();
        if (btns[i].getAttribute('aria-checked') !== 'true') btns[i].click();
      });
      container.appendChild(b);
    });
    refreshRadio(container, current);
  }
  function refreshRadio(container, current) {
    $$('[role="radio"]', container).forEach(function (b, i) {
      var on = b.getAttribute('data-id') === current;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on || (!current && i === 0) ? 0 : -1;
    });
  }

  /* ---------- 導覽 ---------- */
  /* 每一頁的前置條件；不符合就退回最早缺資料的那一頁 */
  function allowedStep(step) {
    if (step >= 2 && (!state.mood || !state.neglect)) return 1;
    if (step >= 3 && state.bodyStatus === 'none') return 2;
    if (step >= 4 && !state.focus) return 3;
    if (step >= 5 && !(state.actionConfirmed && chosenActionText())) return 4;
    return step;
  }

  function go(step, opts) {
    step = allowedStep(step);
    if (step !== 2) pauseTimer();
    state.step = step;
    save();
    $$('.page').forEach(function (p) { p.hidden = Number(p.getAttribute('data-page')) !== step; });
    var top = $('#topbar');
    top.hidden = step === 0 || step === 6;
    if (!top.hidden) {
      $('#progress-text').textContent = '第 ' + step + ' / ' + TOTAL_STEPS + ' 步';
      $('#progress-name').textContent = $('.page[data-page="' + step + '"]').getAttribute('data-name');
      $('#progress-fill').style.width = (step / TOTAL_STEPS * 100) + '%';
    }
    onEnter(step);
    window.scrollTo(0, 0);
    var page = $('.page[data-page="' + step + '"]');
    var h = page && page.querySelector('h1, h2');
    if (h && !(opts && opts.initial)) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function onEnter(step) {
    if (step === 2) renderTimer();
    if (step === 3) renderFocusResult();
    if (step === 4) renderActions();
    if (step === 6) renderSummary();
  }

  function validate(step) {
    if (step === 1) {
      if (!state.mood && !state.neglect) return showError('err-1', '請選擇此刻的狀態，以及最近最常忽略的事。'), false;
      if (!state.mood) return showError('err-1', '請先選擇「此刻的你，最接近哪種狀態」。'), false;
      if (!state.neglect) return showError('err-1', '請選擇「最近，你最常忽略的是」。'), false;
      showError('err-1', '');
    }
    if (step === 2 && (state.bodyStatus === 'none' || timer.running)) return false;
    if (step === 3) {
      if (!state.focus) return showError('err-3', '請選出一個你目前最想重新照顧的面向。'), false;
      showError('err-3', '');
    }
    if (step === 4 && !(state.actionConfirmed && chosenActionText())) return false;
    return true;
  }

  /* ---------- Page 1：Check-in ---------- */
  function renderCheckin() {
    var moodBox = $('[data-field="mood"]');
    var negBox = $('[data-field="neglect"]');
    renderRadio(moodBox, MOODS, state.mood, function (id) {
      state.mood = id; save(); refreshRadio(moodBox, id); if (state.neglect) showError('err-1', '');
    }, 'option');
    renderRadio(negBox, NEGLECTS, state.neglect, function (id) {
      state.neglect = id; save(); refreshRadio(negBox, id); if (state.mood) showError('err-1', '');
    }, 'option');
  }

  /* ---------- Page 2：一分鐘覺察 ----------
   * bodyStatus：'none' → 計時中或未開始；'completed' → 真正跑完 60 秒；'skipped' → 按了跳過。
   * 只有 completed / skipped 且計時器沒在跑時，才能進入下一頁。
   */
  var timer = { remaining: CONFIG.breathSeconds, id: null, running: false };

  function setupTimer() {
    var list = $('#guide-steps');
    GUIDE.forEach(function (t, i) {
      var li = el('li');
      li.appendChild(el('span', { 'class': 'num' }, String(i + 1)));
      li.appendChild(el('span', null, t));
      list.appendChild(li);
    });
    $('#btn-timer').addEventListener('click', function () {
      if (timer.running) pauseTimer();
      else startTimer();
    });
    $('#btn-skip').addEventListener('click', skipTimer);
    resetTimerFromState();
  }
  function resetTimerFromState() {
    stopInterval();
    timer.running = false;
    timer.remaining = state.bodyStatus === 'none' ? CONFIG.breathSeconds : 0;
  }

  function guideIndex() {
    var per = CONFIG.breathSeconds / GUIDE.length;
    var elapsed = CONFIG.breathSeconds - timer.remaining;
    return Math.min(GUIDE.length - 1, Math.floor(elapsed / per));
  }

  function renderTimer() {
    var circle = $('#breath-circle');
    var btn = $('#btn-timer');
    var finished = timer.remaining <= 0 && state.bodyStatus !== 'none';
    var started = timer.remaining < CONFIG.breathSeconds;
    $('#breath-time').textContent = String(Math.max(0, timer.remaining));
    circle.classList.toggle('running', timer.running);
    circle.classList.toggle('paused', !timer.running && started && !finished);

    var idx = started && !finished ? guideIndex() : -1;
    $$('#guide-steps li').forEach(function (li, i) {
      li.classList.toggle('current', i === idx);
      li.classList.toggle('done', state.bodyStatus === 'completed' || (idx > -1 && i < idx));
    });

    if (finished) {
      btn.textContent = '再做一次';
      $('#btn-skip').hidden = true;
      $('#guide-now').textContent = state.bodyStatus === 'skipped'
        ? '這次先跳過也沒關係，等你需要的時候，隨時可以回來給自己一分鐘。'
        : '完成了。謝謝你，給了自己這一分鐘。';
    } else if (timer.running) {
      btn.textContent = '暫停';
      $('#btn-skip').hidden = false;
      $('#guide-now').textContent = GUIDE[idx];
    } else {
      btn.textContent = started ? '繼續' : '開始';
      $('#btn-skip').hidden = false;
      $('#guide-now').textContent = started ? '已暫停。準備好時，按下「繼續」。' : '準備好時，按下「開始」。';
    }
    $('#btn-next-2').disabled = state.bodyStatus === 'none' || timer.running;
  }

  function stopInterval() {
    if (timer.id !== null) { clearInterval(timer.id); timer.id = null; }
  }
  function startTimer() {
    if (timer.remaining <= 0) {
      // 重新開始：舊的完成／跳過狀態作廢，必須重新完成或跳過才能前進
      timer.remaining = CONFIG.breathSeconds;
      state.bodyStatus = 'none';
      save();
    }
    stopInterval(); // 確保同時只有一個計時器
    timer.running = true;
    timer.id = setInterval(tick, 1000);
    renderTimer();
  }
  function tick() {
    timer.remaining -= 1;
    if (timer.remaining <= 0) {
      stopInterval();
      timer.running = false;
      timer.remaining = 0;
      state.bodyStatus = 'completed';
      save();
    }
    renderTimer();
  }
  function pauseTimer() {
    stopInterval();
    if (timer.running) {
      timer.running = false;
      if (state.step === 2) renderTimer();
    }
  }
  function skipTimer() {
    stopInterval();
    timer.running = false;
    timer.remaining = 0;
    state.bodyStatus = 'skipped';
    save();
    renderTimer();
  }

  /* ---------- Page 3：生活配置 ---------- */
  function renderAreas() {
    var wrap = $('#areas');
    wrap.innerHTML = '';
    AREAS.forEach(function (a) {
      var card = el('div', { 'class': 'area', 'data-cat': a.cat }); // 柔光覺察分類色
      var head = el('div', { 'class': 'area-head' });
      var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('class', 'area-icon'); icon.setAttribute('aria-hidden', 'true');
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#i-sparkle'); icon.appendChild(use);
      head.appendChild(icon);
      head.appendChild(el('span', { 'class': 'area-name', id: 'area-' + a.id }, a.name));
      card.appendChild(head);
      card.appendChild(el('p', { 'class': 'area-q' }, a.q));
      var chips = el('div', { 'class': 'chips', role: 'radiogroup', 'aria-labelledby': 'area-' + a.id });
      renderRadio(chips, STATUSES, state.balance[a.id], function (id) {
        if (state.balance[a.id] === id) delete state.balance[a.id]; // 再點一次可取消
        else state.balance[a.id] = id;
        save(); refreshRadio(chips, state.balance[a.id]);
        if (state.focus === a.id) renderFocusResult();
      }, 'chip');
      card.appendChild(chips);
      wrap.appendChild(card);
    });

    var focusBox = $('#focus-chips');
    renderRadio(focusBox, AREAS.map(function (a) { return { id: a.id, label: a.name }; }), state.focus, function (id) {
      if (state.focus !== id) { state.action = null; state.actionConfirmed = false; }
      state.focus = id; save(); refreshRadio(focusBox, id); showError('err-3', ''); renderFocusResult();
    }, 'chip');
    renderFocusResult();
  }

  function renderFocusResult() {
    var box = $('#focus-result');
    var a = findArea(state.focus);
    if (!a) { box.hidden = true; box.innerHTML = ''; return; }
    box.innerHTML = '';
    box.appendChild(el('h4', null, '關於「' + a.name + '」'));
    box.appendChild(el('p', null, a.insight));
    var st = state.balance[a.id];
    if (st && STATUS_LINES[st]) box.appendChild(el('p', null, STATUS_LINES[st]));
    box.hidden = false;
  }

  /* ---------- Page 4：小行動 ---------- */
  function setupActions() {
    var when = $('#custom-when'), what = $('#custom-what');
    function onType() {
      state.customWhen = when.value; state.customWhat = what.value;
      if (when.value.trim() || what.value.trim()) {
        state.action = null;
        refreshRadio($('#action-options'), null);
      }
      updateCustomActive(); save(); showError('err-4', '');
    }
    when.addEventListener('input', onType);
    what.addEventListener('input', onType);
  }
  function syncCustomInputs() {
    $('#custom-when').value = state.customWhen || '';
    $('#custom-what').value = state.customWhat || '';
  }
  function updateCustomActive() {
    var on = !state.action && (state.customWhen.trim() || state.customWhat.trim());
    $('.custom-action').classList.toggle('active', !!on);
  }

  function renderActions() {
    var a = findArea(state.focus);
    if (!a) return; // go() 已保證 focus 存在
    $('#action-area-hint').textContent = '為「' + a.name + '」準備的三個小行動：';
    var box = $('#action-options');
    if (state.action && a.actions.indexOf(state.action) === -1) state.action = null;
    renderRadio(box, a.actions.map(function (t) { return { id: t, label: t }; }), state.action, function (id) {
      state.action = id;
      state.customWhen = ''; state.customWhat = '';
      syncCustomInputs();
      refreshRadio(box, id); updateCustomActive(); save(); showError('err-4', '');
    }, 'option');
    syncCustomInputs();
    updateCustomActive();
    showActionResult(state.actionConfirmed);
  }

  function chosenActionText() {
    if (state.action) return state.action;
    var w = (state.customWhen || '').trim(), d = (state.customWhat || '').trim();
    if (w && d) return '我想在' + w + '之前，嘗試' + d + '。';
    return null;
  }

  function confirmAction() {
    var w = state.customWhen.trim(), d = state.customWhat.trim();
    if (!state.action && !w && !d) return showError('err-4', '請選擇一個小行動，或自己寫一句。');
    if (!state.action && !w) return showError('err-4', '自己寫的句子還差一點：請填寫「什麼時候之前」。');
    if (!state.action && !d) return showError('err-4', '自己寫的句子還差一點：請填寫「想嘗試的事」。');
    showError('err-4', '');
    state.actionConfirmed = true; save();
    showActionResult(true);
    window.scrollTo(0, 0);
  }

  function showActionResult(on) {
    var a = findArea(state.focus);
    var text = chosenActionText();
    if (on && !text) { on = false; state.actionConfirmed = false; save(); }
    $('#action-picker').hidden = on;
    $('#action-result').hidden = !on;
    if (on) {
      $('#result-action').textContent = text;
      $('#result-encourage').textContent = (a ? a.cheer : '') + '不需要做到完美，記得的時候做一點點，就很好。';
    }
  }

  /* ---------- Page 5：回饋 ---------- */
  function renderFeedbackChoices() {
    var fb1 = $('[data-field="fb1"]');
    renderRadio(fb1, FB1, state.fb1, function (id) {
      state.fb1 = state.fb1 === id ? null : id; save(); sent.feedback = false; refreshRadio(fb1, state.fb1);
    }, 'option');
    var fb2 = $('[data-field="fb2"]');
    renderRadio(fb2, FB2, state.fb2, function (id) {
      state.fb2 = state.fb2 === id ? null : id; save(); sent.feedback = false; refreshRadio(fb2, state.fb2);
    }, 'option');

    var ib = $('[data-field="interests"]');
    ib.innerHTML = '';
    INTERESTS.forEach(function (it) {
      var b = el('button', { type: 'button', 'class': 'chip', 'aria-pressed': state.interests.indexOf(it.id) > -1 ? 'true' : 'false' }, it.label);
      b.addEventListener('click', function () {
        var i = state.interests.indexOf(it.id);
        if (i > -1) state.interests.splice(i, 1); else state.interests.push(it.id);
        b.setAttribute('aria-pressed', i > -1 ? 'false' : 'true'); save(); sent.feedback = false;
      });
      ib.appendChild(b);
    });
  }

  function setupFeedback() {
    $('#ig-link').href = CONFIG.instagramUrl;
    $('#email').addEventListener('input', function () { this.classList.remove('invalid'); showError('err-5', ''); });
    $('#consent-contact').addEventListener('change', function () { showError('err-5', ''); });
    $('#consent-notify').addEventListener('change', function () { showError('err-5', ''); });
    $('#fb3').addEventListener('input', function () { sent.feedback = false; });
    $('#email').addEventListener('input', function () { sent.contact = false; });
    $('#feedback-form').addEventListener('submit', function (ev) { ev.preventDefault(); submitFeedback(); });
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var submitStatus = '';
  var sending = false;
  var sent = { feedback: false, contact: false }; // 重試時不重複送出已發出的部分

  function postToForm(params) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, CONFIG.submitTimeoutMs);
    return fetch(CONFIG.googleForm.actionUrl, {
      method: 'POST', mode: 'no-cors', body: params, signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { clearTimeout(to); return r; }, function (e) { clearTimeout(to); throw e; });
  }

  function submitFeedback() {
    if (sending) return;
    var email = $('#email').value.trim();
    var cContact = $('#consent-contact').checked;
    var cNotify = $('#consent-notify').checked;
    var fb3 = $('#fb3').value.trim();

    if (email && !EMAIL_RE.test(email)) { $('#email').classList.add('invalid'); return showError('err-5', 'Email 格式看起來不太對，請再確認一次；或清空欄位，以匿名方式送出。'); }
    if (email && !cContact) return showError('err-5', '若要留下 Email，請勾選聯絡同意；不想留也沒關係，清空 Email 欄位即可。');
    if (!email && (cContact || cNotify)) return showError('err-5', '你勾選了聯絡或活動通知，請填寫 Email，或取消勾選。');
    showError('err-5', '');

    var gf = CONFIG.googleForm;
    function field(key) { return gf.fields[key]; }

    // 匿名回饋與聯絡資料分成兩筆送出，回饋紀錄中不含 Email
    var feedback = new URLSearchParams();
    var fb1 = byId(FB1, state.fb1), fb2 = byId(FB2, state.fb2);
    if (fb1) feedback.append(field('fb1'), fb1.label);
    if (fb2) feedback.append(field('fb2'), fb2.label);
    if (fb3) feedback.append(field('fb3'), fb3);
    state.interests.forEach(function (id) { var it = byId(INTERESTS, id); if (it) feedback.append(field('interests'), it.label); });
    var hasFeedback = !!(fb1 || fb2 || fb3 || state.interests.length);

    var contact = new URLSearchParams();
    if (email) {
      contact.append(field('email'), email);
      contact.append(field('consentContact'), '同意');
      if (cNotify) contact.append(field('consentNotify'), '同意');
    }
    var hasContact = !!email;

    if (!hasFeedback && !hasContact) { submitStatus = ''; return go(6); }

    if (!gf.actionUrl) {
      console.info('[示範模式] 尚未設定 Google Form，資料未送出。');
      submitStatus = '（示範模式：回饋表單尚未連線，這次的回饋沒有被送出。）';
      clearPersonalFields();
      return go(6);
    }
    if (navigator.onLine === false) {
      return showError('err-5', '目前沒有網路連線，回饋還沒送出。可以連上網路後再按一次「送出並完成」，或選擇「略過，直接完成」。');
    }

    var jobs = [];
    if (hasFeedback && !sent.feedback) jobs.push(postToForm(feedback).then(function () { sent.feedback = true; }));
    if (hasContact && !sent.contact) jobs.push(postToForm(contact).then(function () { sent.contact = true; }));

    sending = true;
    var btn = $('#btn-submit');
    btn.disabled = true; btn.textContent = '送出中…';

    Promise.all(jobs)
      .then(function () {
        // no-cors 只代表請求已發出，不代表 Google 已收錄，因此不使用「成功送出」的說法
        submitStatus = '謝謝你的分享。回饋已從這個網頁寄出；受限於技術，網頁無法即時確認 Google 表單的收件結果。';
        clearPersonalFields();
        go(6);
      })
      .catch(function () {
        showError('err-5', '網路似乎不太穩定，回饋可能沒有寄出。可以稍後再按一次「送出並完成」，或選擇「略過，直接完成」。');
      })
      .then(function () { sending = false; btn.disabled = false; btn.textContent = '送出並完成'; });
  }

  function clearPersonalFields() {
    $('#email').value = ''; $('#fb3').value = '';
    $('#email').classList.remove('invalid');
    $('#consent-contact').checked = false; $('#consent-notify').checked = false;
  }

  /* ---------- Page 6：成果卡（只使用使用者實際的選擇與輸入） ---------- */
  function renderSummary() {
    var a = findArea(state.focus), m = byId(MOODS, state.mood);
    $('#sum-mood').textContent = m ? m.label : '';
    $('#sum-mood-row').hidden = !m;
    $('#sum-focus').textContent = a ? a.name : '';
    $('#sum-focus-row').hidden = !a;
    $('#sum-action').textContent = chosenActionText() || '';
    var note = [];
    if (m) note.push(m.note);
    if (a) note.push(a.cheer);
    $('#sum-note').textContent = note.join('');
    $('#submit-status').textContent = submitStatus;
    $('#submit-status').hidden = !submitStatus;
  }

  /* ---------- 全域按鈕（只綁定一次） ---------- */
  function bindActions() {
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-action]');
      if (!t) return;
      var act = t.getAttribute('data-action');
      if (act === 'start') go(1);
      else if (act === 'next') { if (validate(state.step)) go(state.step + 1); }
      else if (act === 'confirm-action') confirmAction();
      else if (act === 'edit-action') { state.actionConfirmed = false; save(); showActionResult(false); }
      else if (act === 'finish-skip') { if (sending) return; submitStatus = ''; showError('err-5', ''); clearPersonalFields(); go(6); }
      else if (act === 'restart') restart();
    });
    $('#btn-back').addEventListener('click', function () {
      if (state.step === 4 && state.actionConfirmed) { state.actionConfirmed = false; save(); showActionResult(false); return; }
      if (state.step > 0) go(state.step - 1);
    });
  }

  function restart() {
    stopInterval();
    state = freshState();
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
    resetTimerFromState();
    submitStatus = '';
    sent = { feedback: false, contact: false };
    clearPersonalFields();
    syncCustomInputs();
    ['err-1', 'err-3', 'err-4', 'err-5'].forEach(function (id) { showError(id, ''); });
    $('#action-picker').hidden = false;
    $('#action-result').hidden = true;
    renderCheckin();
    renderAreas();
    renderFeedbackChoices();
    go(0);
  }

  /* ---------- 啟動 ---------- */
  function init() {
    load();
    if (state.step === 6) state = freshState(); // 重新整理完成頁：視為新的一輪
    syncCustomInputs();
    renderCheckin();
    setupTimer();
    renderAreas();
    setupActions();
    renderFeedbackChoices();
    setupFeedback();
    bindActions();
    go(state.step, { initial: true });
  }

  try { init(); }
  catch (err) {
    console.error(err);
    var main = document.getElementById('main');
    if (main) main.innerHTML = '<section class="page"><h2 class="page-title">頁面載入時發生問題</h2><p class="hint">請重新整理頁面再試一次。若仍無法使用，請向攤位工作人員反應，謝謝你。</p><button class="btn btn-primary" onclick="try{sessionStorage.clear()}catch(e){};location.reload()">重新載入</button></section>';
  }
})();
