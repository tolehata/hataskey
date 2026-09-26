'use strict';

// Standalone fixtures: no API, production imports, or persistence.
const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  social: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M19 14a5 5 0 0 1 2 4v2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  local: '<rect x="4" y="3" width="16" height="7"/><rect x="4" y="14" width="16" height="7"/><path d="M8 6h.01M8 17h.01M12 6h5M12 17h5"/>',
  lock: '<rect x="5" y="10" width="14" height="11"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  mail: '<rect x="3" y="5" width="18" height="14"/><path d="m3 5 9 7 9-7"/>',
  rocket: '<path d="M9 15c-1-5 4-11 12-12 0 8-6 13-12 12ZM9 9H5l-3 5 7 1M15 15v4l-5 3-1-7M6 17l-3 4 4-2"/><circle cx="16" cy="8" r="2"/>',
  reply: '<path d="m9 4-6 6 6 6M3 10h11a7 7 0 0 1 7 7v3"/>',
  repeat: '<path d="m17 2 4 4-4 4M3 11V6h18M7 22l-4-4 4-4M21 13v5H3"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01M8 14a4 4 0 0 0 8 0"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  chat: '<path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4Z"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  send: '<path d="m3 3 19 9-19 9 4-9ZM7 12h15"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
icons.rocketOff = `${icons.rocket}<path d="m3 3 18 18"/>`;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scopes = { public: ['パブリック', 'globe'], home: ['ホーム', 'home'], followers: ['フォロワー', 'lock'], specified: ['指定', 'mail'] };
const tabs = {home:['ホーム','home'],social:['ソーシャル','social'],local:['ローカル','local'],global:['グローバル','globe']};
const notes = [
  {id:'spring',name:'小春',acct:'koharu',time:'2分',scope:'public',localOnly:false,color:'#e5b4c8',shape:'flower',text:'朝の散歩で、金木犀の香りがした。\n季節が少しずつ変わっていくね。',reactions:[['🌼',4],['❤️',2]],conversation:true},
  {id:'blue',name:'蒼',acct:'ao',time:'5分',scope:'home',localOnly:true,color:'#a8c8d9',shape:'mountain',text:'今日は家で読書。積んでいた短編集を、ようやく開いた。\nみんなの最近のお気に入りも知りたい。',reactions:[['📚',3],['☕',1]]},
  {id:'green',name:'葉月',acct:'hazuki',time:'9分',scope:'followers',localOnly:false,color:'#c3cfac',shape:'leaf',text:'週末の小さな展示、準備ができました。\nいつも見てくれるみんな、ありがとう。',reactions:[['👏',6],['✨',2]]},
  {id:'night',name:'澪',acct:'mio',time:'12分',scope:'specified',localOnly:true,color:'#c5b6da',shape:'moon',text:'@nagi 待ち合わせ、明日は14時でどうかな？\nいつもの喫茶店で。',replyTo:'nagi',reactions:[['👍',1]]},
];
let selectedTimeline = 'home';
let replyTarget = null;
let draftLocalOnly = false;
const timeline = document.querySelector('#timeline');
const draft = document.querySelector('#draft');
const status = document.querySelector('#status');

function avatar(note) {
  const shapes = {
    flower:'<path d="M22 35V23m0 8-7-4m7 2 7-4" stroke="#53674c" stroke-width="2"/><g fill="#fff6ed"><circle cx="22" cy="15" r="5"/><circle cx="16" cy="20" r="5"/><circle cx="18" cy="27" r="5"/><circle cx="26" cy="27" r="5"/><circle cx="28" cy="20" r="5"/></g><circle cx="22" cy="22" r="4" fill="#b67c41"/>',
    mountain:'<circle cx="32" cy="11" r="4" fill="#fff0bc"/><path d="m0 38 15-24 11 17 6-10 12 17" fill="#4f7887"/><path d="m10 22 5-8 5 8" fill="#e7f0ed"/>',
    leaf:'<path d="M11 32C5 11 22 8 35 10c-2 17-11 27-24 22Z" fill="#51734e"/><path d="m10 35 19-19M18 27v-8M23 23l7 1" stroke="#dce9c9" stroke-width="1.5"/>',
    moon:'<path d="M29 8A15 15 0 1 0 35 31 17 17 0 0 1 29 8" fill="#fcf0cc"/><path d="m10 9 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#fff"/>',
  };
  return `<div class="avatar" role="img" aria-label="${escapeHtml(note.name)}のアバター"><svg viewBox="0 0 44 44" aria-hidden="true"><path fill="${note.color}" d="M0 0h44v44H0z"/>${shapes[note.shape]}</svg></div>`;
}

function renderTimeline() {
  const showBadges = ['home','social'].includes(selectedTimeline);
  // Public-only fixtures for local/global; these are illustrative, not API results.
  const visibleNotes = showBadges ? notes : notes.filter((note) => note.scope === 'public');
  timeline.innerHTML = visibleNotes.map((note) => {
    const [label, icon] = scopes[note.scope];
    return `<article class="note" data-note="${note.id}" aria-label="${escapeHtml(note.name)}のノート">
      <div class="note-grid"><div class="avatar-column">${avatar(note)}${showBadges ? `<div class="note-badges"><span class="note-badge federation" role="img" aria-label="連合${note.localOnly ? 'なし' : 'あり'}" title="連合${note.localOnly ? 'なし' : 'あり'}">${svg(note.localOnly ? 'rocketOff' : 'rocket')}</span><span class="note-badge scope" role="img" aria-label="公開範囲：${label}" title="公開範囲：${label}">${svg(icon)}</span></div>` : ''}</div>
      <div class="note-body"><header class="note-header"><strong class="note-name">${escapeHtml(note.name)}</strong><span class="note-acct">@${escapeHtml(note.acct)}</span><time>${note.time}</time></header>
      ${note.replyTo ? `<div class="reply-to">${svg('reply')}@${note.replyTo} への返信</div>` : ''}<p class="note-text">${escapeHtml(note.text)}</p>
      <div class="note-actions"><button type="button" data-action="reply" aria-label="${note.name}に返信">${svg('reply')}</button>${['public','home'].includes(note.scope) ? `<button type="button" data-action="repeat" aria-pressed="${Boolean(note.renoted)}" aria-label="${note.name}のノートをリノート">${svg('repeat')}</button>` : ''}<button type="button" data-action="react" aria-label="${note.name}にリアクション">${svg('smile')}</button><button type="button" data-action="more" aria-label="${note.name}のノートの詳細">${svg('more')}</button></div>
      ${note.conversation ? `<button type="button" class="conversation" data-action="thread" aria-expanded="${Boolean(note.threadOpen)}" aria-controls="thread-${note.id}"><span class="mini-avatar">凪</span>${svg('chat')}1${svg('down')}<span class="sr-only">返信を表示</span></button>` : ''}</div>
      <div class="reactions" aria-label="${note.name}のリアクション">${note.reactions.map(([emoji,count,mine],index) => `<button type="button" class="reaction" data-reaction="${index}" aria-pressed="${Boolean(mine)}" aria-label="${emoji} ${count}件、リアクションを切り替え"><span class="emoji" aria-hidden="true">${emoji}</span><span>${count}</span></button>`).join('')}<button type="button" class="reaction reaction-add" data-action="react" aria-label="${note.name}にいいねを追加">${svg('smile')}</button></div></div>
      ${note.conversation ? `<div class="thread" id="thread-${note.id}" ${note.threadOpen ? '' : 'hidden'}><strong>凪 <span class="note-acct">@nagi · 1分</span></strong><p>こちらも秋の香りがしてきたよ。散歩にいい季節だね。</p></div>` : ''}</article>`;
  }).join('');
  timeline.setAttribute('aria-label', `${tabs[selectedTimeline][0]}のノート`);
  document.querySelector('#timeline-label').textContent = tabs[selectedTimeline][0];
  document.querySelector('#scope-caption').textContent = showBadges ? 'ホーム／ソーシャル：アバター下に連合・公開範囲のアイコンを表示' : 'ローカル／グローバル：アバター下の公開範囲・連合表示なし';
}

function selectTimeline(value) {
  selectedTimeline = value;
  document.querySelectorAll('[data-timeline]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.timeline === value)));
  renderTimeline();
}

document.querySelector('#timeline-nav').innerHTML = Object.entries(tabs).map(([id,[label,icon]]) => `<button type="button" data-timeline="${id}" aria-pressed="${id === selectedTimeline}">${svg(icon)}<span>${label}</span></button>`).join('');
document.querySelectorAll('[data-timeline]').forEach((button) => button.addEventListener('click', () => selectTimeline(button.dataset.timeline)));
document.querySelectorAll('[data-side]').forEach((button) => {
  const target = button.dataset.side;
  button.innerHTML = svg(target === 'compose' ? 'send' : target);
  button.addEventListener('click', () => target === 'compose' ? draft.focus() : selectTimeline(target));
});
document.querySelectorAll('#device-controls button').forEach((button) => button.addEventListener('click', () => {
  document.body.dataset.device = button.dataset.device;
  document.querySelector('#preview').dataset.compact = String(button.dataset.device === 'phone');
  document.querySelectorAll('#device-controls button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
}));
document.querySelectorAll('#theme-controls button').forEach((button) => button.addEventListener('click', () => {
  document.body.dataset.theme = button.dataset.theme;
  document.querySelectorAll('#theme-controls button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
}));
document.querySelector('#live-toggle').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const active = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(active));
  status.textContent = active ? 'LIVE表示をオンにしました（モック）。' : 'LIVE表示を一時停止しました（モック）。';
});

timeline.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const note = notes.find((item) => item.id === button.closest('.note').dataset.note);
  if (button.hasAttribute('data-reaction') || button.dataset.action === 'react') {
    let index = Number(button.dataset.reaction);
    if (!button.hasAttribute('data-reaction')) {
      index = note.reactions.findIndex(([emoji]) => emoji === '❤️');
      if (index < 0) index = note.reactions.push(['❤️',0,false]) - 1;
    }
    const reaction = note.reactions[index];
    reaction[1] += reaction[2] ? -1 : 1;
    reaction[2] = !reaction[2];
    status.textContent = `${note.name}のノートの${reaction[0]}を${reaction[2] ? '追加' : '取り消し'}しました（モック）。`;
    renderTimeline();
    timeline.querySelector(`[data-note="${note.id}"] [data-reaction="${index}"]`).focus({preventScroll:true});
  } else if (button.dataset.action === 'reply') {
    replyTarget = note;
    document.querySelector('#reply-label').textContent = `@${note.acct} への返信`;
    document.querySelector('#reply-context').hidden = false;
    draft.focus();
  } else if (button.dataset.action === 'thread') {
    note.threadOpen = !note.threadOpen;
    button.setAttribute('aria-expanded', String(note.threadOpen));
    document.querySelector(`#thread-${note.id}`).hidden = !note.threadOpen;
  } else if (button.dataset.action === 'repeat') {
    note.renoted = !note.renoted;
    button.setAttribute('aria-pressed', String(note.renoted));
    status.textContent = `リノートを${note.renoted ? 'オン' : 'オフ'}にしました（モック）。`;
  } else if (button.dataset.action === 'more') {
    status.textContent = `${note.name} · ${scopes[note.scope][0]} · 連合${note.localOnly ? 'なし' : 'あり'}。連合設定は配信完了を示すものではありません。`;
  }
});

document.querySelector('#cancel-reply').addEventListener('click', () => {
  replyTarget = null;
  document.querySelector('#reply-context').hidden = true;
  draft.focus();
});
document.querySelector('#emoji-button').innerHTML = svg('smile');
document.querySelector('#send').innerHTML = svg('send');
function updateSend() { document.querySelector('#send').disabled = !draft.value.trim(); }
draft.addEventListener('input', updateSend);
document.querySelector('#emoji-button').addEventListener('click', () => {
  draft.setRangeText(' 🌸', draft.selectionStart, draft.selectionEnd, 'end');
  updateSend();
  draft.focus();
});
document.querySelector('#draft-federation').addEventListener('click', (event) => {
  draftLocalOnly = !draftLocalOnly;
  event.currentTarget.textContent = draftLocalOnly ? '連合なし' : '連合あり';
  event.currentTarget.setAttribute('aria-pressed', String(draftLocalOnly));
});
document.querySelector('#composer').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!draft.value.trim()) return;
  const visibility = document.querySelector('#draft-visibility').value;
  status.textContent = `投稿プレビュー${replyTarget ? `（@${replyTarget.acct}への返信）` : ''}：${scopes[visibility][0]} · 連合${draftLocalOnly ? 'なし' : 'あり'}「${draft.value.trim()}」`;
});
renderTimeline();
