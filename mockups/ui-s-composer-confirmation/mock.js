const body = document.body;
const preview = document.getElementById('preview');
const composer = document.getElementById('composer');
const composerBody = document.getElementById('composer-body');
const draftView = document.getElementById('draft-view');
const confirmView = document.getElementById('confirm-view');
const draft = document.getElementById('draft');
const cancelButton = document.getElementById('cancel-confirm');
const commitButton = document.getElementById('commit-confirm');
const toast = document.getElementById('toast');

const choices = {
  delete: { title: 'ノートを削除しますか？', action: '削除する', done: 'ノートを削除しました（モック）', icon: 'i-trash', author: '花', handle: '@hana', excerpt: '帰り道の空がきれいだった。少し遠回りして帰ろう。', avatar: 'avatar-hana' },
  'delete-edit': { title: '削除して編集しますか？', action: '削除して編集', done: '削除して編集しました（モック）', icon: 'i-edit', author: '花', handle: '@hana', excerpt: '帰り道の空がきれいだった。少し遠回りして帰ろう。', avatar: 'avatar-hana' },
  unrenote: { title: 'リノートを解除しますか？', action: '解除する', done: 'リノートを解除しました（モック）', icon: 'i-repeat', author: '律', handle: '@ritsu', excerpt: '週末の喫茶店、窓際の席が空いていた。', avatar: 'avatar-ritsu' },
};
let active = null;
let returnFocus = null;
let toastTimer = 0;

function resizeDraft() {
  draft.style.height = 'auto';
  draft.style.height = `${Math.min(140, draft.scrollHeight)}px`;
  document.getElementById('draft-count').textContent = String([...draft.value].length);
  setHeight();
}

function setHeight() {
  const view = active ? confirmView : draftView;
  composerBody.style.setProperty('--body-height', `${Math.ceil(view.getBoundingClientRect().height)}px`);
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.dataset.show = 'true';
  toastTimer = window.setTimeout(() => { toast.dataset.show = 'false'; }, 2800);
}

function openConfirmation(kind, trigger) {
  const data = choices[kind];
  if (!data) return;
  if (!active) returnFocus = trigger;
  active = kind;
  document.getElementById('confirm-title').textContent = data.title;
  document.getElementById('target-name').textContent = data.author;
  document.getElementById('target-handle').textContent = data.handle;
  document.getElementById('target-excerpt').textContent = data.excerpt;
  document.getElementById('target-avatar').textContent = data.author;
  document.getElementById('target-avatar').className = `avatar ${data.avatar}`;
  document.querySelector('#confirm-icon use').setAttribute('href', `#${data.icon}`);
  document.querySelector('#commit-confirm use').setAttribute('href', `#${data.icon}`);
  commitButton.title = data.action;
  commitButton.setAttribute('aria-label', data.action);
  draftView.inert = true;
  draftView.setAttribute('aria-hidden', 'true');
  confirmView.inert = false;
  confirmView.setAttribute('aria-hidden', 'false');
  composer.dataset.state = 'confirm';
  // The surrounding mock is unavailable while the confirmation owns keyboard focus.
  document.querySelector('.app-top').inert = true;
  document.querySelector('.side-rail').inert = true;
  document.querySelector('.timeline').inert = true;
  document.querySelector('.right-pane').inert = true;
  document.querySelector('.review-bar').inert = true;
  setHeight();
  cancelButton.focus({ preventScroll: true });
}

function closeConfirmation({ success = false } = {}) {
  if (!active) return;
  const message = choices[active].done;
  active = null;
  composer.dataset.state = 'draft';
  confirmView.inert = true;
  confirmView.setAttribute('aria-hidden', 'true');
  draftView.inert = false;
  draftView.setAttribute('aria-hidden', 'false');
  for (const selector of ['.app-top', '.side-rail', '.timeline', '.right-pane', '.review-bar']) document.querySelector(selector).inert = false;
  setHeight();
  if (success) showToast(message);
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  else draft.focus({ preventScroll: true });
  returnFocus = null;
}

document.querySelectorAll('[data-confirm]').forEach(button => {
  button.addEventListener('click', () => openConfirmation(button.dataset.confirm, button));
});
cancelButton.addEventListener('click', () => closeConfirmation());
commitButton.addEventListener('click', () => closeConfirmation({ success: true }));
document.getElementById('mock-send').addEventListener('click', () => showToast('投稿は行いません（モック）'));
draft.addEventListener('input', resizeDraft);

document.addEventListener('keydown', event => {
  if (!active) return;
  if (event.key === 'Escape') { event.preventDefault(); closeConfirmation(); return; }
  // Enter only activates the button the user has explicitly focused.
  if (event.key === 'Enter' && event.target !== cancelButton && event.target !== commitButton) { event.preventDefault(); return; }
  if (event.key !== 'Tab') return;
  const focusables = [cancelButton, commitButton];
  const current = focusables.indexOf(document.activeElement);
  if (event.shiftKey && current <= 0) { event.preventDefault(); commitButton.focus(); }
  else if (!event.shiftKey && current >= focusables.length - 1) { event.preventDefault(); cancelButton.focus(); }
  else if (current === -1) { event.preventDefault(); cancelButton.focus(); }
}, true);

for (const property of ['device', 'position', 'theme']) {
  document.querySelectorAll(`[data-set-${property}]`).forEach(button => button.addEventListener('click', () => {
    body.dataset[property] = button.dataset[`set${property[0].toUpperCase()}${property.slice(1)}`];
    document.querySelectorAll(`[data-set-${property}]`).forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    requestAnimationFrame(setHeight);
  }));
}
document.getElementById('motion-toggle').addEventListener('click', event => {
  const on = body.dataset.motion === 'off';
  body.dataset.motion = on ? 'on' : 'off';
  event.currentTarget.setAttribute('aria-pressed', String(on));
  event.currentTarget.textContent = `動き ${on ? 'ON' : 'OFF'}`;
});

new ResizeObserver(setHeight).observe(draftView);
new ResizeObserver(setHeight).observe(confirmView);
new ResizeObserver(setHeight).observe(preview);
resizeDraft();
composer.dataset.state = 'draft';
