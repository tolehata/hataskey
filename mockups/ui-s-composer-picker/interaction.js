// UI review sample only. No files, requests, account settings, or posts are created.
(() => {
  'use strict';

  const asset = '../../packages/frontend/assets/drop-and-fusion/sweets_monos/';
  const custom = [
    { name: 'custard', aliases: ['プリン', 'pudding'], folder: 'スイーツ', image: asset + 'custard_color.svg' },
    { name: 'candy', aliases: ['あめ', 'sweet'], folder: 'スイーツ', image: asset + 'candy_color.svg' },
    { name: 'doughnut', aliases: ['ドーナツ', 'donut'], folder: 'スイーツ/焼き菓子', image: asset + 'doughnut_color.svg' },
    { name: 'pancakes', aliases: ['パンケーキ', 'hotcake'], folder: 'スイーツ/焼き菓子', image: asset + 'pancakes_color.svg' },
    { name: 'soft_ice_cream', aliases: ['ソフトクリーム', 'ice'], folder: 'スイーツ/冷たいもの', image: asset + 'soft_ice_cream_color.svg' },
    { name: 'shortcake', aliases: ['ケーキ', 'cake'], folder: 'その他', image: asset + 'shortcake_color.svg' },
  ];
  const unicode = [
    { value: '😀', name: 'grinning face', category: '顔・感情' },
    { value: '🥰', name: 'smiling face with hearts', category: '顔・感情' },
    { value: '😂', name: 'face with tears of joy', category: '顔・感情' },
    { value: '👍🏽', name: 'thumbs up medium skin tone', category: '人・体' },
    { value: '👩‍💻', name: 'woman technologist', category: '人・体' },
    { value: '🌸', name: 'cherry blossom', category: '動物・自然' },
    { value: '🌈', name: 'rainbow', category: '動物・自然' },
    { value: '🍮', name: 'custard', category: '食べ物・飲み物' },
    { value: '🍵', name: 'teacup without handle', category: '食べ物・飲み物' },
    { value: '🚃', name: 'railway car', category: '旅行・場所' },
    { value: '🎨', name: 'artist palette', category: '活動' },
    { value: '💡', name: 'light bulb', category: '物' },
    { value: '❤️', name: 'red heart', category: '記号' },
    { value: '🇯🇵', name: 'flag japan', category: '旗' },
  ];
  const unicodeCategories = ['顔・感情', '人・体', '動物・自然', '食べ物・飲み物', '旅行・場所', '活動', '物', '記号', '旗'];
  const pinned = [custom[0], unicode[5], unicode[1], custom[2], unicode[3]];
  let recent = [unicode[0], custom[1], unicode[6], unicode[12]];
  const attachmentNames = { upload: 'アップロード', drive: 'ドライブから', url: 'URLから' };
  const sampleNames = { upload: '写真の見本.jpg', drive: 'ドライブの見本.png', url: 'URLの見本.jpg' };

  const body = document.body;
  const composer = document.getElementById('composer');
  const draft = document.getElementById('draft');
  const count = document.getElementById('draft-count');
  const menuRegion = document.getElementById('menu-region');
  const emojiPage = document.getElementById('emoji-page');
  const attachPage = document.getElementById('attach-page');
  const emojiScroll = document.getElementById('emoji-scroll');
  const search = document.getElementById('emoji-search');
  const emojiTrigger = document.getElementById('emoji-trigger');
  const attachTrigger = document.getElementById('attach-trigger');
  const attachmentsEl = document.getElementById('attachments');
  const workspace = document.getElementById('workspace');
  const toast = document.getElementById('toast');
  let menu = 'none';
  let desktopPosition = body.dataset.position;
  let range = { start: draft.selectionStart, end: draft.selectionEnd };
  let attachments = [];
  let attachmentSerial = 0;
  let toastTimer;

  function symbol(name) {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    icon.append(use);
    return icon;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.dataset.show = 'true';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { delete toast.dataset.show; }, 2400);
  }

  function emojiKey(emoji) {
    return emoji.name && emoji.image ? ':' + emoji.name + ':' : emoji.value;
  }

  function emojiButton(emoji) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'emoji-item';
    button.title = emoji.name + (emoji.aliases ? ' · ' + emoji.aliases.join(', ') : '');
    button.setAttribute('aria-label', emoji.name);
    if (emoji.image) {
      const image = document.createElement('img');
      image.src = emoji.image;
      image.alt = '';
      button.append(image);
    } else {
      button.textContent = emoji.value;
    }
    button.addEventListener('click', () => chooseEmoji(emoji));
    return button;
  }

  function grid(items, includeGear = false) {
    const element = document.createElement('div');
    element.className = 'emoji-grid';
    items.forEach(item => element.append(emojiButton(item)));
    if (includeGear) {
      const gear = document.createElement('button');
      gear.type = 'button';
      gear.className = 'palette-gear';
      gear.title = 'パレット設定';
      gear.setAttribute('aria-label', 'パレット設定の見本');
      gear.append(symbol('gear'));
      gear.addEventListener('click', () => showToast('パレット設定の見本です'));
      element.append(gear);
    }
    return element;
  }

  function group(title, items, includeGear = false) {
    const element = document.createElement('section');
    element.className = 'emoji-group';
    if (title) {
      const heading = document.createElement('div');
      heading.className = 'emoji-group-title';
      heading.textContent = title;
      element.append(heading);
    }
    element.append(grid(items, includeGear));
    return element;
  }

  function folder(title, items, children = []) {
    const details = document.createElement('details');
    details.className = 'emoji-folder';
    const summary = document.createElement('summary');
    summary.append(document.createTextNode(title + ' '));
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.append(document.createTextNode('('));
    if (children.length) meta.append(symbol('folder'), document.createTextNode(': ' + children.length + '  '));
    meta.append(symbol('grid'), document.createTextNode(': ' + items.length + ')'));
    summary.append(meta);
    details.append(summary);
    for (const child of children) {
      const nested = folder(child.title, child.items);
      nested.classList.add('nested');
      details.append(nested);
    }
    if (items.length) details.append(grid(items));
    return details;
  }

  function renderEmojis() {
    const query = search.value.trim().replaceAll(':', '').toLowerCase();
    const priorScroll = emojiScroll.scrollTop;
    emojiScroll.replaceChildren();
    if (query) {
      const terms = query.split(/\s+/).filter(Boolean);
      const customMatches = custom.filter(item => terms.every(term => item.name.includes(term) || item.aliases.some(alias => alias.toLowerCase().includes(term))));
      const unicodeMatches = unicode.filter(item => terms.every(term => item.name.includes(term)));
      if (customMatches.length) emojiScroll.append(group('', customMatches));
      if (unicodeMatches.length) emojiScroll.append(group('', unicodeMatches));
      if (!customMatches.length && !unicodeMatches.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-result';
        empty.textContent = '見つかりませんでした';
        emojiScroll.append(empty);
      }
      emojiScroll.scrollTop = 0;
      return;
    }
    emojiScroll.append(group('', pinned, true));
    emojiScroll.append(group('◷  最近使った', recent));
    const customGroup = document.createElement('section');
    customGroup.className = 'emoji-group';
    const customTitle = document.createElement('div');
    customTitle.className = 'emoji-group-title';
    customTitle.textContent = 'カスタム絵文字';
    customGroup.append(customTitle);
    customGroup.append(folder('スイーツ', custom.filter(item => item.folder === 'スイーツ'), [
      { title: '焼き菓子', items: custom.filter(item => item.folder === 'スイーツ/焼き菓子') },
      { title: '冷たいもの', items: custom.filter(item => item.folder === 'スイーツ/冷たいもの') },
    ]));
    customGroup.append(folder('その他', custom.filter(item => item.folder === 'その他')));
    emojiScroll.append(customGroup);
    const unicodeGroup = document.createElement('section');
    unicodeGroup.className = 'emoji-group';
    const unicodeTitle = document.createElement('div');
    unicodeTitle.className = 'emoji-group-title';
    unicodeTitle.textContent = '絵文字';
    unicodeGroup.append(unicodeTitle);
    unicodeCategories.forEach(category => unicodeGroup.append(folder(category, unicode.filter(item => item.category === category))));
    emojiScroll.append(unicodeGroup);
    emojiScroll.scrollTop = priorScroll;
  }

  function saveRange() {
    range = { start: draft.selectionStart, end: draft.selectionEnd };
  }

  function updateCount() {
    count.textContent = String([...draft.value].length);
  }

  function chooseEmoji(emoji) {
    const value = emojiKey(emoji);
    const start = Math.min(range.start, draft.value.length);
    const end = Math.min(range.end, draft.value.length);
    const nextCaret = start + value.length;
    draft.setRangeText(value, start, end, 'end');
    updateCount();
    if (!pinned.some(item => emojiKey(item) === value)) {
      recent = [emoji, ...recent.filter(item => emojiKey(item) !== value)].slice(0, 12);
      if (!search.value) renderEmojis();
    }
    draft.focus({ preventScroll: true });
    draft.setSelectionRange(nextCaret, nextCaret);
    saveRange();
  }

  function resizePicker() {
    const baseHeight = composer.offsetHeight - menuRegion.offsetHeight;
    const availableHeight = workspace.clientHeight - (body.dataset.device === 'mobile' ? 72 : 84);
    const height = Math.max(24, Math.min(255, availableHeight - baseHeight - 50));
    menuRegion.style.setProperty('--picker-scroll-height', height + 'px');
    menuRegion.style.setProperty('--attach-choices-max-height', Math.max(42, availableHeight - baseHeight - 43) + 'px');
    if (menu !== 'none') menuRegion.style.height = (menu === 'emoji' ? emojiPage : attachPage).offsetHeight + 'px';
  }

  function setMenu(next, focus = true) {
    if (next === menu) next = 'none';
    if (next === 'emoji' && menu !== 'emoji') {
      search.value = '';
      renderEmojis();
      emojiScroll.scrollTop = 0;
    }
    menu = next;
    menuRegion.dataset.menu = menu;
    emojiPage.inert = menu !== 'emoji';
    attachPage.inert = menu !== 'attach';
    emojiPage.setAttribute('aria-hidden', String(menu !== 'emoji'));
    attachPage.setAttribute('aria-hidden', String(menu !== 'attach'));
    emojiTrigger.setAttribute('aria-expanded', String(menu === 'emoji'));
    attachTrigger.setAttribute('aria-expanded', String(menu === 'attach'));
    resizePicker();
    if (menu === 'none') menuRegion.style.height = '0px';
    if (focus) {
      if (menu === 'emoji') search.focus({ preventScroll: true });
      else if (menu === 'attach') attachPage.querySelector('[data-add-attachment]').focus({ preventScroll: true });
      else (document.activeElement === search || composer.contains(document.activeElement) ? draft : emojiTrigger).focus({ preventScroll: true });
    }
  }

  function renderAttachments() {
    attachmentsEl.replaceChildren();
    attachments.forEach(item => {
      const chip = document.createElement('div');
      chip.className = 'attachment';
      const name = document.createElement('span');
      name.textContent = item.name;
      const source = document.createElement('small');
      source.textContent = item.source;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', item.name + ' を削除');
      remove.append(symbol('close'));
      remove.addEventListener('click', () => {
        attachments = attachments.filter(file => file.id !== item.id);
        renderAttachments();
        resizePicker();
      });
      chip.append(name, source, remove);
      attachmentsEl.append(chip);
    });
  }

  function addAttachment(kind) {
    if (attachments.length >= 16) {
      showToast('添付は16件までです');
      return;
    }
    attachmentSerial += 1;
    const baseName = sampleNames[kind];
    const extension = baseName.lastIndexOf('.');
    const sampleName = baseName.slice(0, extension) + ' ' + String(attachmentSerial).padStart(2, '0') + baseName.slice(extension);
    attachments.push({ id: attachmentSerial, name: sampleName, source: attachmentNames[kind] });
    renderAttachments();
    setMenu('none', false);
    attachTrigger.focus({ preventScroll: true });
    showToast('見本の添付を追加しました');
  }

  composer.addEventListener('submit', event => event.preventDefault());
  draft.addEventListener('input', () => { saveRange(); updateCount(); });
  ['click', 'keyup', 'select', 'focus'].forEach(type => draft.addEventListener(type, saveRange));
  emojiTrigger.addEventListener('click', () => setMenu('emoji'));
  attachTrigger.addEventListener('click', () => setMenu('attach'));
  composer.querySelectorAll('[data-close-menu]').forEach(button => button.addEventListener('click', () => {
    const trigger = menu === 'emoji' ? emojiTrigger : attachTrigger;
    setMenu('none', false);
    trigger.focus({ preventScroll: true });
  }));
  composer.querySelectorAll('[data-add-attachment]').forEach(button => button.addEventListener('click', () => addAttachment(button.dataset.addAttachment)));
  search.addEventListener('input', renderEmojis);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu !== 'none') {
      event.preventDefault();
      const trigger = menu === 'emoji' ? emojiTrigger : attachTrigger;
      setMenu('none', false);
      trigger.focus({ preventScroll: true });
    }
  });
  document.getElementById('mock-send').addEventListener('click', () => showToast('投稿は行いません'));
  document.querySelectorAll('[data-set-device], [data-set-position], [data-set-theme]').forEach(button => button.addEventListener('click', () => {
    const kind = ['device', 'position', 'theme'].find(name => button.hasAttribute('data-set-' + name));
    const value = button.getAttribute('data-set-' + kind);
    if (kind === 'position') desktopPosition = value;
    if (kind === 'device') {
      body.dataset.device = value;
      body.dataset.position = value === 'mobile' ? 'bottom' : desktopPosition;
      document.querySelectorAll('[data-set-position]').forEach(peer => {
        peer.disabled = value === 'mobile';
        peer.setAttribute('aria-pressed', String(peer.dataset.setPosition === desktopPosition));
      });
    } else {
      body.dataset[kind] = value;
    }
    document.querySelectorAll('[data-set-' + kind + ']').forEach(peer => peer.setAttribute('aria-pressed', String(peer === button)));
    resizePicker();
  }));
  window.addEventListener('resize', resizePicker);
  renderEmojis();
  updateCount();
  resizePicker();
})();
