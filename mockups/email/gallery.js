(() => {
  'use strict';

  const groups = [
    ['account', 'ACCOUNT', '✦'],
    ['security', 'SECURITY', '⌁'],
    ['moderation', 'MODERATION', '◇'],
    ['admin', 'ADMIN', '▣'],
    ['reference', 'REFERENCE', '◌'],
    ['stress', 'STRESS TESTS', '↔'],
  ];
  const groupMap = new Map(groups.map(([key, label, icon]) => [key, { label, icon }]));
  const groupAliases = {
    '登録・アカウント': 'account',
    'セキュリティ': 'security',
    '運営・モデレーション': 'moderation',
    '管理者メール': 'admin',
    '停止中の通知（参考）': 'reference',
    '表示の確認': 'stress',
  };
  const categoryOf = (item) => groupAliases[item.group] ?? item.group;
  const statusLabels = { active: '現行', reference: '参考', edge: '境界ケース' };
  const widths = { desktop: 680, mobile: 375, narrow: 320 };
  const state = { cases: [], selected: null, query: '', width: 'desktop', theme: 'light', lang: 'ja', format: 'html', images: true };
  const $ = (id) => document.getElementById(id);
  const els = {
    list: $('case-list'), count: $('case-count'), search: $('case-search'),
    id: $('case-id'), heading: $('preview-heading'), summary: $('case-summary'),
    status: $('case-status'), group: $('case-group'), source: $('case-source'), notes: $('case-notes'),
    rulerLabel: $('ruler-label'), rulerWidth: $('ruler-width'), frame: $('message-frame'),
    subject: $('message-subject'), html: $('html-preview'), text: $('text-preview'), empty: $('preview-empty'),
    images: $('show-images'), htmlDownload: $('download-html'), textDownload: $('download-text'),
  };
  let previewResizeObserver = null;

  function resizeEmailPreview() {
    const doc = els.html.contentDocument;
    if (!doc) return;
    const height = Math.max(520, doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0);
    els.html.style.height = `${height}px`;
  }

  els.html.addEventListener('load', () => {
    previewResizeObserver?.disconnect();
    previewResizeObserver = null;
    const doc = els.html.contentDocument;
    if (!doc) return;
    // The iframe has no script permission. Parent-side access lets us preserve scrolling
    // and text selection while making every email link inert.
    for (const link of doc.querySelectorAll('a[href]')) {
      link.removeAttribute('href');
      link.setAttribute('tabindex', '-1');
      link.setAttribute('aria-disabled', 'true');
    }
    for (const form of doc.querySelectorAll('form')) {
      form.addEventListener('submit', (event) => event.preventDefault());
    }
    resizeEmailPreview();
    if (typeof ResizeObserver !== 'undefined' && doc.body) {
      previewResizeObserver = new ResizeObserver(resizeEmailPreview);
      previewResizeObserver.observe(doc.body);
    }
  });

  function visibleCases() {
    const query = state.query.trim().toLocaleLowerCase();
    if (!query) return state.cases;
    return state.cases.filter((item) => [item.id, item.label, item.group, item.notes, item.source].join(' ').toLocaleLowerCase().includes(query));
  }

  function renderList() {
    const visible = visibleCases();
    els.list.replaceChildren();
    els.count.textContent = String(state.cases.length);
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'list-empty';
      empty.textContent = state.cases.length ? '一致するメールがありません。' : 'メールがありません。';
      els.list.append(empty);
      return;
    }
    const keys = [...groups.map(([key]) => key), ...new Set(visible.map(categoryOf).filter((key) => !groupMap.has(key)))];
    for (const key of keys) {
      const items = visible.filter((item) => categoryOf(item) === key);
      if (!items.length) continue;
      const section = document.createElement('section');
      section.className = 'case-group';
      const title = document.createElement('h3');
      title.className = 'case-group-title';
      title.textContent = groupMap.get(key)?.label ?? key.toUpperCase();
      section.append(title);
      for (const item of items) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'case-item';
        button.setAttribute('aria-current', String(item.id === state.selected?.id));
        button.dataset.id = item.id;
        const icon = document.createElement('span');
        icon.className = 'case-item-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = groupMap.get(key)?.icon ?? '✉';
        const label = document.createElement('span');
        label.className = 'case-item-label';
        label.textContent = item.label;
        const dot = document.createElement('span');
        dot.className = `case-item-status ${item.status ?? ''}`;
        dot.setAttribute('aria-hidden', 'true');
        button.append(icon, label, dot);
        button.addEventListener('click', () => selectCase(item));
        section.append(button);
      }
      els.list.append(section);
    }
  }

  function variant() {
    const variants = state.selected?.variants;
    return variants?.[state.lang]?.[state.theme] ?? variants?.[state.lang]?.light ?? variants?.ja?.[state.theme] ?? variants?.ja?.light ?? null;
  }

  function safeSrcdoc(html, showImages) {
    // The sandbox also blocks scripts and navigation. CSP prevents remote email assets from loading.
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'">`;
    const noImages = showImages ? '' : '<style>img,picture,svg image,.email-brand-icon{display:none!important}</style>';
    const prefix = csp + noImages;
    if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, (match) => match + prefix);
    if (/<html\b[^>]*>/i.test(html)) return html.replace(/<html\b[^>]*>/i, (match) => match + '<head>' + prefix + '</head>');
    return '<!doctype html><html><head>' + prefix + '</head><body>' + html + '</body></html>';
  }

  function renderPreview() {
    const item = state.selected;
    const current = variant();
    els.id.textContent = item?.id ?? '—';
    els.heading.textContent = item?.label ?? 'メールを選択';
    els.summary.textContent = item ? '実際のメール本文を、表示環境を変えて確認できます。' : '左の一覧からメールを選択してください。';
    els.status.textContent = statusLabels[item?.status] ?? item?.status ?? '—';
    els.status.className = `status-tag ${item?.status ?? ''}`;
    els.group.textContent = item?.group ?? '—';
    els.source.textContent = item?.source ?? '—';
    els.notes.textContent = Array.isArray(item?.notes) ? item.notes.join('\n') : item?.notes ?? '—';
    els.rulerLabel.textContent = `${state.width.toUpperCase()} VIEW`;
    els.frame.style.width = `min(100%, ${widths[state.width]}px)`;
    els.rulerWidth.parentElement.style.maxWidth = `${widths[state.width]}px`;
    updateRulerWidth();
    els.subject.textContent = current?.subject ?? '—';
    els.html.hidden = state.format !== 'html' || !current;
    els.text.hidden = state.format !== 'text' || !current;
    els.empty.hidden = Boolean(current);
    els.empty.textContent = item ? 'この言語・テーマの本文がありません。' : 'メールを読み込んでいます…';
    els.htmlDownload.disabled = !current?.html;
    els.textDownload.disabled = !current?.text;
    if (current) {
      els.html.style.height = '520px';
      els.html.srcdoc = safeSrcdoc(String(current.previewHtml ?? current.html ?? ''), state.images);
      els.text.textContent = String(current.text ?? '');
    } else {
      els.html.style.height = '520px';
      els.html.srcdoc = '';
      els.text.textContent = '';
    }
  }

  function updateRulerWidth() {
    els.rulerWidth.textContent = `${Math.round(els.frame.getBoundingClientRect().width)}px`;
  }

  function selectCase(item) {
    state.selected = item;
    renderList();
    renderPreview();
  }

  function setChoice(key, value) {
    state[key] = value;
    document.querySelectorAll(`[data-${key}]`).forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset[key] === value));
    });
    renderPreview();
  }

  function download(kind) {
    const current = variant();
    const content = current?.[kind];
    if (typeof content !== 'string') return;
    const blob = new Blob([content], { type: kind === 'html' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${String(state.selected.id).replace(/[^a-z0-9._-]/gi, '-')}-${state.lang}-${state.theme}.${kind === 'html' ? 'html' : 'txt'}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  for (const key of ['width', 'theme', 'lang', 'format']) {
    document.querySelectorAll(`[data-${key}]`).forEach((button) => button.addEventListener('click', () => setChoice(key, button.dataset[key])));
  }
  els.images.addEventListener('change', () => { state.images = els.images.checked; renderPreview(); });
  els.search.addEventListener('input', () => { state.query = els.search.value; renderList(); });
  window.addEventListener('resize', updateRulerWidth);
  els.htmlDownload.addEventListener('click', () => download('html'));
  els.textDownload.addEventListener('click', () => download('text'));
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')) {
      event.preventDefault();
      els.search.focus();
    }
  });

  fetch('./generated/catalog.json', { cache: 'no-store' })
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then((catalog) => {
      if (!Array.isArray(catalog.cases)) throw new Error('Invalid catalog');
      state.cases = catalog.cases;
      state.selected = state.cases[0] ?? null;
      renderList();
      renderPreview();
    })
    .catch((error) => {
      els.empty.textContent = 'カタログを読み込めませんでした。ローカルサーバーから開いてください。';
      els.summary.textContent = 'generated/catalog.json を確認してください。';
      console.error('Email catalog load failed:', error);
    });
})();
