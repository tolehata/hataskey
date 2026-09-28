// UI S 2 release-story prototype. Local DOM state only: no network or persistence.
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const body = document.body;
  const titles = ['新しい景色', 'PCで並べる', '指先で選ぶ', '探す・書く'];
  const scenes = $$('.scene');
  const tabs = $$('.scene-tabs [role="tab"]');
  const scrollArea = $('#scrollArea');
  const pc = $('#pcWindow');
  const timelineDock = $('#timelineDock');
  const searchDock = $('#searchDock');
  const homeHold = $('#homeHold');
  const searchToggle = $('#searchToggle');
  const mobileArt = $('.mobile-art');
  const searchArt = $('.search-art');
  const pickerGrid = $('.picker-grid');
  const pickerBranch = $('.picker-branch');
  let chapter = 0;
  let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reduceMotion = !playing;
  let visible = !document.hidden;
  let timer = 0;
  let deadline = 0;
  let remaining = 0;
  let step = 0;
  let loopToken = 0;
  let holdTimer = 0;
  let focusTimer = 0;
  let endTimer = 0;
  let held = false;
  let startPoint = null;
  let ignoreHomeClick = false;
  let branchKind = '';
  const ghost = { element: null, art: null, from: null, target: null, duration: 0, elapsed: 0, last: 0, raf: 0, active: false };
  const pcSearch = $('.pc-rail [data-pc="open"]');
  const pcArrow = $('.pc-side [data-pc="toggle"]');
  const pcClose = $('.pc-side [data-pc="home"]');
  const localChoice = $('.picker-grid [data-timeline="ローカル"]');
  function fitOverview() {
    const art = $('.overview');
    if (!art.clientWidth) return;
    const desktop = $('.overview .desktop-preview');
    const phone = $('.overview .phone-preview');
    const phoneWidth = phone.getBoundingClientRect().width;
    const overlap = parseFloat(getComputedStyle(phone).marginLeft) || 0;
    desktop.style.zoom = String(Math.min(1, Math.max(.24, (art.clientWidth - phoneWidth - overlap - 5) / 760)));
  }
  function setCurrentTimeline(name) { $('#feedLabel').textContent = `表示中：${name}`; }

  function centerInArt(element, art) {
    const target = element.getBoundingClientRect();
    const frame = art.getBoundingClientRect();
    const scaleX = frame.width / (art.offsetWidth || frame.width || 1);
    const scaleY = frame.height / (art.offsetHeight || frame.height || 1);
    return {
      x: (target.left + target.width / 2 - frame.left) / scaleX - art.clientLeft + art.scrollLeft,
      y: (target.top + target.height / 2 - frame.top) / scaleY - art.clientTop + art.scrollTop,
    };
  }
  function renderGhost() {
    if (!ghost.active || !ghost.target) return;
    const to = centerInArt(ghost.target, ghost.art);
    const from = ghost.from ? centerInArt(ghost.from, ghost.art) : to;
    const t = ghost.duration ? Math.min(1, ghost.elapsed / ghost.duration) : 1;
    const eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const bend = Math.min(28, distance * .15);
    const normalX = distance ? -dy / distance : 0;
    const normalY = distance ? dx / distance : 0;
    const clamp = (value, limit) => Math.max(5, Math.min(limit - 5, value));
    const c1 = { x: clamp(from.x + dx * .28 + normalX * bend, ghost.art.clientWidth), y: clamp(from.y + dy * .28 + normalY * bend, ghost.art.clientHeight) };
    const c2 = { x: clamp(from.x + dx * .72 + normalX * bend, ghost.art.clientWidth), y: clamp(from.y + dy * .72 + normalY * bend, ghost.art.clientHeight) };
    const u = 1 - eased;
    const x = u ** 3 * from.x + 3 * u ** 2 * eased * c1.x + 3 * u * eased ** 2 * c2.x + eased ** 3 * to.x;
    const y = u ** 3 * from.y + 3 * u ** 2 * eased * c1.y + 3 * u * eased ** 2 * c2.y + eased ** 3 * to.y;
    ghost.element.style.left = `${x}px`;
    ghost.element.style.top = `${y}px`;
  }
  function tickGhost(now) {
    ghost.raf = 0;
    if (!ghost.active || !playing || !visible || reduceMotion) return;
    if (ghost.last) ghost.elapsed = Math.min(ghost.duration, ghost.elapsed + now - ghost.last);
    ghost.last = now;
    renderGhost();
    ghost.raf = requestAnimationFrame(tickGhost);
  }
  function pauseGhost() {
    if (ghost.raf) cancelAnimationFrame(ghost.raf);
    ghost.raf = 0;
    ghost.last = 0;
  }
  function resumeGhost() {
    if (ghost.active && !ghost.raf && playing && visible && !reduceMotion) ghost.raf = requestAnimationFrame(tickGhost);
  }
  function clearPress() { $$('.is-demo-pressed').forEach(el => el.classList.remove('is-demo-pressed')); }
  function markTarget(target) {
    $$('[data-demo-target]').forEach(el => el.removeAttribute('data-demo-target'));
    target?.setAttribute('data-demo-target', '');
    if (ghost.element) ghost.element.dataset.target = target?.id || target?.getAttribute('data-timeline') || target?.getAttribute('data-pc') || target?.className || '';
  }
  function hideGhost() {
    pauseGhost();
    clearPress();
    $$('.pc-pointer, .finger, .search-pointer').forEach(el => el.classList.remove('is-visible', 'is-pressed'));
    markTarget(null);
    ghost.active = false;
    ghost.element = ghost.art = ghost.from = ghost.target = null;
    ghost.duration = ghost.elapsed = 0;
  }
  function placeGhost(art, element, target) {
    hideGhost();
    ghost.art = element.offsetParent || art;
    ghost.element = element;
    ghost.target = target;
    ghost.active = true;
    element.classList.add('is-visible');
    markTarget(target);
    renderGhost();
    resumeGhost();
  }
  function moveGhost(target, duration) {
    ghost.from = ghost.target;
    ghost.target = target;
    markTarget(target);
    ghost.duration = duration;
    ghost.elapsed = 0;
    ghost.last = 0;
    renderGhost();
    resumeGhost();
  }
  function pressGhost(pressed) {
    if (!ghost.element) return;
    ghost.element.classList.toggle('is-pressed', pressed);
    clearPress();
    if (pressed) ghost.target?.classList.add('is-demo-pressed');
  }
  const captionChunks = {
    'ホームに指を置く': ['ホームに', '指を置く'],
    'ホームに指を置きます。': ['ホームに', '指を置きます。'],
    'ホームを長押しします。': ['ホームを', '長押しします。'],
    '指を置いたまま、一覧へ。': ['指を置いたまま、', '一覧へ。'],
    'ローカルへ滑らせます。': ['ローカルへ', '滑らせます。'],
    '行き先で、指を離します。': ['行き先で、', '指を離します。'],
    'ローカルに切り替わります。': ['ローカルに', '切り替わります。'],
    'ホームのタップで上部へ。': ['ホームのタップで', '上部へ。'],
    '検索ボタンへ。': ['検索ボタンへ。'],
    '検索を開きます。': ['検索を', '開きます。'],
    'ドックの中に検索が現れます。': ['ドックの中に', '検索が現れます。'],
    '気になる話題を、その場で。': ['気になる話題を、', 'その場で。'],
    '同じボタンから戻れます。': ['同じボタンから', '戻れます。'],
    '×で検索を閉じます。': ['×で検索を', '閉じます。'],
    'いつもの投稿フォームへ。': ['いつもの', '投稿フォームへ。'],
  };
  function caption(id, value) {
    const element = $(id);
    if (id === '#pcPhaseCaption') { element.textContent = value; return; }
    element.replaceChildren(...(captionChunks[value] || [value]).map(part => {
      const chunk = document.createElement('span');
      chunk.className = 'caption-chunk';
      chunk.textContent = part;
      return chunk;
    }));
  }

  function renderTitle() {
    const title = $('#heroTitle');
    title.replaceChildren();
    let index = 0;
    for (const word of ['Hataskey', 'UI S', '2']) {
      const span = document.createElement('span');
      span.className = 'title-word';
      for (const char of word) {
        const letter = document.createElement('span');
        letter.className = 'title-char';
        letter.style.setProperty('--i', index++);
        letter.textContent = char;
        span.append(letter);
      }
      title.append(span);
    }
  }

  function clearDemoTimer() {
    if (timer) clearTimeout(timer);
    timer = 0;
    deadline = 0;
  }
  function schedule(ms) {
    clearDemoTimer();
    remaining = ms;
    if (!playing || !visible || reduceMotion || !$('#finale').hidden) return;
    const token = loopToken;
    deadline = performance.now() + remaining;
    timer = setTimeout(() => {
      timer = 0;
      deadline = 0;
      if (token !== loopToken || !playing || !visible || reduceMotion) return;
      advanceDemo();
    }, remaining);
  }
  function pauseTimer() {
    if (timer) remaining = Math.max(0, deadline - performance.now());
    clearDemoTimer();
  }
  function renderPlayControl() {
    const button = $('#playBtn');
    const label = playing ? 'デモを一時停止' : 'デモを再生';
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', label);
    button.title = label;
    $('use', button).setAttribute('href', playing ? '#i-pause' : '#i-play');
  }
  function renderMotionControl() {
    const button = $('#motionBtn');
    const label = reduceMotion ? '動きを戻す' : '動きを減らす';
    button.setAttribute('aria-pressed', String(reduceMotion));
    button.setAttribute('aria-label', label);
    button.title = label;
    $('use', button).setAttribute('href', reduceMotion ? '#i-motion-off' : '#i-motion');
  }
  function setPlaying(value) {
    playing = Boolean(value) && !reduceMotion;
    body.dataset.playing = String(playing && visible);
    renderPlayControl();
    if (playing && visible) { schedule(remaining || 600); resumeGhost(); }
    else { pauseTimer(); pauseGhost(); }
  }
  function manual() { if (playing) setPlaying(false); hideGhost(); }
  function setPcMode(mode) {
    pc.dataset.mode = mode;
    $('.pc-side').inert = mode === 'home';
    $('.pc-timeline').inert = mode === 'full';
    pcArrow?.setAttribute('aria-label', mode === 'full' ? '左右に並べる' : 'ページを広げる');
  }
  function setTimelineOpen(open) {
    timelineDock.dataset.open = String(open);
    $('.tl-picker').inert = !open;
    homeHold.setAttribute('aria-expanded', String(open));
    homeHold.setAttribute('aria-label', open ? 'タイムライン一覧を閉じる' : 'ホーム。長押しでタイムラインを選ぶ');
    homeHold.innerHTML = `<svg><use href="#i-${open ? 'x' : 'home'}"/></svg>`;
  }
  function setSearchOpen(open) {
    searchDock.dataset.open = String(open);
    $('.search-panel').inert = !open;
    searchToggle.setAttribute('aria-expanded', String(open));
    searchToggle.setAttribute('aria-label', open ? '検索を閉じる' : '検索を開く');
    searchToggle.innerHTML = `<svg><use href="#i-${open ? 'x' : 'search'}"/></svg>`;
  }
  function resetDemo() {
    loopToken++;
    clearDemoTimer();
    hideGhost();
    clearTimeout(holdTimer);
    clearTimeout(focusTimer);
    holdTimer = 0;
    focusTimer = 0;
    held = false;
    startPoint = null;
    step = 0;
    body.dataset.demoPhase = 'idle';
    setPcMode('home');
    setTimelineOpen(false);
    setSearchOpen(false);
    mobileArt.dataset.step = '';
    searchArt.dataset.step = '';
    pickerGrid.hidden = false;
    pickerBranch.hidden = true;
    branchKind = '';
    setCurrentTimeline('ホーム');
    caption('#pcPhaseCaption', 'サイドの「検索」へ。');
    caption('#mobilePhaseCaption', 'ホームに指を置く');
    caption('#searchPhaseCaption', '検索ボタンへ。');
    $$('.picker-grid button').forEach(b => b.classList.remove('is-target'));
    remaining = 600;
    if (playing && visible && !reduceMotion) schedule(600);
  }
  function advanceDemo() {
    if (chapter === 0) {
      schedule(3000);
      return;
    }
    if (chapter === 1) {
      const phase = step % 12;
      body.dataset.demoPhase = `pc:${phase}`;
      let wait = 800;
      if (phase === 0) { placeGhost($('.pc-art'), $('.pc-pointer'), $('.pc-rail [data-pc="home"]')); moveGhost(pcSearch, 1180); caption('#pcPhaseCaption', 'サイドの「検索」へ。'); wait = 1230; }
      if (phase === 1) { pressGhost(true); caption('#pcPhaseCaption', '「検索」を開きます。'); wait = 440; }
      if (phase === 2) { setPcMode('split'); pressGhost(false); caption('#pcPhaseCaption', '検索は左に。タイムラインは右に。'); wait = 2200; }
      if (phase === 3) { moveGhost(pcArrow, 1080); caption('#pcPhaseCaption', '左右矢印へ。'); wait = 1130; }
      if (phase === 4) { pressGhost(true); caption('#pcPhaseCaption', 'ページを広げます。'); wait = 440; }
      if (phase === 5) { setPcMode('full'); pressGhost(false); caption('#pcPhaseCaption', 'ページいっぱいに、じっくりと。'); wait = 2400; }
      if (phase === 6) { pressGhost(true); caption('#pcPhaseCaption', '同じ矢印でもう一度。'); wait = 440; }
      if (phase === 7) { setPcMode('split'); pressGhost(false); caption('#pcPhaseCaption', 'ふたつの画面が並びます。'); wait = 2200; }
      if (phase === 8) { moveGhost(pcClose, 860); caption('#pcPhaseCaption', '×へ。'); wait = 910; }
      if (phase === 9) { pressGhost(true); caption('#pcPhaseCaption', '×でページを閉じます。'); wait = 440; }
      if (phase === 10) { pressGhost(false); hideGhost(); setPcMode('home'); caption('#pcPhaseCaption', 'いつものホームに戻ります。'); wait = 2000; }
      if (phase === 11) { hideGhost(); wait = 900; }
      step++;
      schedule(wait);
      return;
    }
    if (chapter === 2) {
      const phase = step % 7;
      body.dataset.demoPhase = `mobile:${phase}`;
      let wait = 850;
      if (phase === 0) { placeGhost(mobileArt, $('.finger'), homeHold); caption('#mobilePhaseCaption', 'ホームに指を置きます。'); wait = 1000; }
      if (phase === 1) { pressGhost(true); caption('#mobilePhaseCaption', 'ホームを長押しします。'); wait = 1400; }
      if (phase === 2) { setTimelineOpen(true); caption('#mobilePhaseCaption', '指を置いたまま、一覧へ。'); wait = 2500; }
      if (phase === 3) { moveGhost(localChoice, 1600); caption('#mobilePhaseCaption', 'ローカルへ滑らせます。'); wait = 1750; }
      if (phase === 4) { pressGhost(false); localChoice.classList.add('is-target'); caption('#mobilePhaseCaption', '行き先で、指を離します。'); wait = 1100; }
      if (phase === 5) { hideGhost(); pickTimeline('ローカル'); localChoice.classList.remove('is-target'); caption('#mobilePhaseCaption', 'ローカルに切り替わります。'); wait = 4000; }
      if (phase === 6) { hideGhost(); caption('#mobilePhaseCaption', 'ホームのタップで上部へ。'); wait = 2000; }
      step++;
      schedule(wait);
      return;
    }
    const phase = step % 8;
    body.dataset.demoPhase = `search:${phase}`;
    let wait = 850;
    if (phase === 0) { placeGhost(searchArt, $('.search-pointer'), $('.search-dock .dock-composer')); moveGhost(searchToggle, 1600); caption('#searchPhaseCaption', '検索ボタンへ。'); wait = 1750; }
    if (phase === 1) { pressGhost(true); caption('#searchPhaseCaption', '検索を開きます。'); wait = 650; }
    if (phase === 2) { setSearchOpen(true); pressGhost(false); caption('#searchPhaseCaption', 'ドックの中に検索が現れます。'); wait = 3000; }
    if (phase === 3) { caption('#searchPhaseCaption', '気になる話題を、その場で。'); wait = 3500; }
    if (phase === 4) { moveGhost(searchToggle, 850); caption('#searchPhaseCaption', '同じボタンから戻れます。'); wait = 1200; }
    if (phase === 5) { pressGhost(true); caption('#searchPhaseCaption', '×で検索を閉じます。'); wait = 650; }
    if (phase === 6) { setSearchOpen(false); pressGhost(false); caption('#searchPhaseCaption', 'いつもの投稿フォームへ。'); wait = 4000; }
    if (phase === 7) { hideGhost(); wait = 1800; }
    step++;
    schedule(wait);
  }
  function showChapter(index) {
    if (index < 0 || index > 3) return;
    chapter = index;
    body.dataset.chapter = String(index);
    scenes.forEach((scene, i) => { scene.classList.toggle('is-active', i === index); scene.inert = i !== index; });
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    $('#chapterCount').textContent = `0${index + 1} / 04`;
    $('#chapterName').textContent = titles[index];
    $('.topline span:last-child').textContent = `0${index + 1} / 04`;
    $('#progressFill').style.width = `${(index + 1) * 25}%`;
    $('#prevBtn').disabled = index === 0;
    $('#nextBtn').innerHTML = index === 3 ? '特集を終える <svg><use href="#i-arrow"/></svg>' : '次のシーンへ <svg><use href="#i-arrow"/></svg>';
    scrollArea.scrollTo({ top: 0, behavior: 'instant' });
    resetDemo();
    if (index === 0) requestAnimationFrame(fitOverview);
  }
  function endFeature() {
    pauseTimer();
    body.dataset.playing = 'false';
    $('.modal').classList.add('is-dissolving');
    clearTimeout(endTimer);
    endTimer = setTimeout(() => { $('#finale').hidden = false; }, reduceMotion ? 0 : 640);
  }
  function restartFeature() {
    clearTimeout(endTimer);
    $('#finale').hidden = true;
    $('.modal').classList.remove('is-dissolving');
    renderTitle();
    showChapter(0);
    if (!reduceMotion) setPlaying(true);
  }

  function openTimeline() {
    setTimelineOpen(true);
  }
  function closeTimeline() {
    setTimelineOpen(false);
    branchKind = '';
    pickerGrid.hidden = false;
    pickerBranch.hidden = true;
  }
  function pickTimeline(name) {
    if (name === 'リスト' || name === 'アンテナ') {
      branchKind = name;
      pickerGrid.hidden = true;
      pickerBranch.hidden = false;
      $('[data-branch-choice]').textContent = name === 'リスト' ? 'つくる人たち' : '写真のアンテナ';
      return;
    }
    setCurrentTimeline(name);
    closeTimeline();
  }

  tabs.forEach(tab => tab.addEventListener('click', () => showChapter(Number(tab.dataset.chapter))));
  $('.scene-tabs').addEventListener('keydown', e => {
    const next = e.key === 'ArrowRight' ? (chapter + 1) % 4 : e.key === 'ArrowLeft' ? (chapter + 3) % 4 : -1;
    if (next >= 0) { e.preventDefault(); showChapter(next); tabs[next].focus(); }
  });
  $('#prevBtn').addEventListener('click', () => showChapter(chapter - 1));
  $('#nextBtn').addEventListener('click', () => chapter === 3 ? endFeature() : showChapter(chapter + 1));
  $('#againBtn').addEventListener('click', restartFeature);
  $('#playBtn').addEventListener('click', () => setPlaying(!playing));
  $('#replayBtn').addEventListener('click', () => { resetDemo(); if (reduceMotion) advanceDemo(); else setPlaying(true); });
  $('#themeBtn').addEventListener('click', () => {
    const dark = body.dataset.theme !== 'dark';
    body.dataset.theme = dark ? 'dark' : 'light';
    const label = dark ? 'ライトモードに切り替え' : 'ダークモードに切り替え';
    $('#themeBtn').setAttribute('aria-label', label);
    $('#themeBtn').title = label;
    $('#themeBtn').innerHTML = `<svg><use href="#i-${dark ? 'sun' : 'moon'}"/></svg>`;
  });
  $('#motionBtn').addEventListener('click', () => {
    reduceMotion = !reduceMotion;
    body.dataset.motion = reduceMotion ? 'off' : 'on';
    renderMotionControl();
    if (reduceMotion) { setPlaying(false); hideGhost(); }
  });
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (!visible) { pauseTimer(); pauseGhost(); }
    else if (playing && !reduceMotion) { schedule(remaining || 600); resumeGhost(); }
    body.dataset.playing = String(playing && visible);
  });
  window.addEventListener('resize', renderGhost, { passive: true });
  scrollArea.addEventListener('scroll', renderGhost, { passive: true });

  $$('.pc-rail [data-pc], .pc-side [data-pc]').forEach(button => button.addEventListener('click', () => {
    manual();
    if (button.dataset.pc === 'home') setPcMode('home');
    if (button.dataset.pc === 'open') setPcMode('split');
    if (button.dataset.pc === 'toggle') setPcMode(pc.dataset.mode === 'full' ? 'split' : 'full');
  }));
  homeHold.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    manual();
    held = false;
    startPoint = { x: e.clientX, y: e.clientY };
    homeHold.setPointerCapture(e.pointerId);
    holdTimer = setTimeout(() => { held = true; ignoreHomeClick = true; openTimeline(); }, 500);
  });
  homeHold.addEventListener('pointermove', e => {
    if (!startPoint || held) return;
    if (Math.hypot(e.clientX - startPoint.x, e.clientY - startPoint.y) > 12) { clearTimeout(holdTimer); startPoint = null; }
  });
  homeHold.addEventListener('pointerup', e => {
    clearTimeout(holdTimer);
    startPoint = null;
    if (!held) return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-timeline]');
    if (target && timelineDock.contains(target)) pickTimeline(target.dataset.timeline);
    held = false;
  });
  homeHold.addEventListener('pointercancel', () => { clearTimeout(holdTimer); startPoint = null; held = false; });
  homeHold.addEventListener('click', e => {
    if (ignoreHomeClick) { e.preventDefault(); ignoreHomeClick = false; return; }
    manual();
    if (timelineDock.dataset.open === 'true') closeTimeline();
    else $('#timelinePhone .demo-feed').scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });
  });
  homeHold.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'ContextMenu' || e.key === 'F10' && e.shiftKey) { e.preventDefault(); manual(); openTimeline(); }
  });
  pickerGrid.addEventListener('click', e => { const choice = e.target.closest('[data-timeline]'); if (choice) { manual(); pickTimeline(choice.dataset.timeline); } });
  $('[data-back]').addEventListener('click', () => { manual(); pickerGrid.hidden = false; pickerBranch.hidden = true; branchKind = ''; });
  $('[data-branch-choice]').addEventListener('click', () => { manual(); setCurrentTimeline(branchKind === 'リスト' ? 'つくる人たち' : '写真のアンテナ'); closeTimeline(); });
  $('[data-go="3"]').addEventListener('click', () => showChapter(3));
  searchToggle.addEventListener('click', () => {
    manual();
    const open = searchDock.dataset.open !== 'true';
    setSearchOpen(open);
    clearTimeout(focusTimer);
    if (open) focusTimer = setTimeout(() => { if (chapter === 3 && searchDock.dataset.open === 'true') $('#searchInput').focus({ preventScroll: true }); }, reduceMotion ? 0 : 300);
  });
  $('#searchInput').addEventListener('input', manual);
  $('#searchInput').addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); setSearchOpen(false); searchToggle.focus(); } });

  renderTitle();
  if (reduceMotion) {
    body.dataset.motion = 'off';
  }
  body.dataset.playing = String(playing);
  renderMotionControl();
  renderPlayControl();
  showChapter(0);
  window.addEventListener('resize', fitOverview, { passive: true });
  new ResizeObserver(fitOverview).observe($('.overview'));
})();
