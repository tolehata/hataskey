// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
const E = globalThis.HataPunchEngine;
const G = globalThis.HataPunchGeometry;
const $ = id => document.getElementById(id);
const earned = new Set();
let state = E.create(8), lastTime = null, peerClock = 0, restoreClock = 0, peerCount = 0;
let motionOverride = null, guardClock = 0, particleClock = 0, failureElapsed = 0;
let geometry = [], fistPosition = { tip: -40 };
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
$('reduced').checked = motionPreference.matches;
const notes = [
  ['凪','nagi','散歩の帰りにパン屋へ。今日のおすすめ、まだ温かかった。','2分'],
  ['こはる','koharu','午後の作業のおともは、たっぷりのアイスコーヒー。','4分'],
  ['ゆず','yuzu','タイムラインが平和でいいね。今日は何か面白いこと起きるかな 👀','6分'],
  ['蒼','ao','新しい曲を聴きながら部屋の片づけ。ようやく机が見えてきた！','9分'],
  ['まめ','mame','猫がキーボードに乗ってきた。これは休憩の合図です。','12分'],
  ['灯','akari','おやつを半分こ。小さなよいことを集めていこう。','15分']
];
for (const [name, account, content, time] of notes) {
  const article = document.createElement('article'); article.className = 'note';
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = name[0]; avatar.setAttribute('aria-hidden','true');
  const body = document.createElement('div'), head = document.createElement('div'); head.className = 'note-head';
  const strong = document.createElement('strong'); strong.textContent = name;
  const acct = document.createElement('span'); acct.textContent = '@' + account + ' · 架空';
  const when = document.createElement('time'); when.textContent = time;
  const p = document.createElement('p'); p.textContent = content;
  const footer = document.createElement('div'); footer.className = 'note-footer'; const reply = document.createElement('button'); reply.type = 'button'; reply.textContent = '↩ 返信';
  const reaction = document.createElement('button'); reaction.type = 'button'; reaction.textContent = '♡ 2';
  reply.addEventListener('click',() => { if (blocked()) return; announce(`${name}への返信欄を開くモックです。実際の返信は行いません。`); });
  let liked = false;
  reaction.addEventListener('click',() => { if (blocked()) return; liked = !liked; reaction.textContent = liked ? '♥ 3' : '♡ 2'; reaction.setAttribute('aria-pressed',String(liked)); announce('架空のノートのリアクションを切り替えました。'); });
  reaction.setAttribute('aria-pressed','false'); footer.append(reply,reaction);
  head.append(strong,acct,when); body.append(head,p,footer); article.append(avatar,body); $('timeline').append(article);
}
const cards = [...document.querySelectorAll('.note')];
const active = () => ['charging','warning','falling'].includes(state.phase);
const reduced = () => motionOverride === null ? motionPreference.matches : motionOverride;
const blocked = () => active() || restoreClock > 0 || guardClock > 0;
function syncGuard() { const guard = blocked(); $('timeline').inert = guard; $('shield').hidden = !guard; document.querySelectorAll('.note-footer button').forEach(button => { button.disabled = guard; }); }
function measure() { geometry = cards.map(card => ({ top: card.offsetTop, height: card.offsetHeight })); const h = $('stage').clientHeight; cards.forEach((card,i) => { const r = G.rubble(geometry[i].top,h,i); card.style.setProperty('--rubble-x',r.x+'px'); card.style.setProperty('--rubble-y',r.y+'px'); card.style.setProperty('--rubble-angle',r.angle+'deg'); }); }
function motionMode() { $('reduced').checked = reduced(); document.body.classList.toggle('reduced', reduced()); $('motion-hint').textContent = reduced() ? '動きを控える：オン。降下・崩壊を確認するにはオフにしてください。' : '動きを控える：オフ。降下・崩壊の演出を表示します。'; }
function announce(text) { $('status').textContent = text; }
function restoreCards() { cards.forEach(card => card.removeAttribute('data-damage')); $('effects').replaceChildren(); $('stage').classList.remove('collapsed'); $('descent').hidden = true; particleClock = 0; }
function render() {
  motionMode(); syncGuard();
  const nav = document.querySelector('.app-nav');
  if (nav.dataset.phase !== state.phase) nav.dataset.phase = state.phase;
  $('encounter').setAttribute('aria-hidden',String(state.phase === 'idle'));
  const preparing = ['charging','warning'].includes(state.phase);
  $('prep-name').setAttribute('aria-hidden',String(!preparing));
  $('enemy-name').setAttribute('aria-hidden',String(preparing));
  $('fist').hidden = state.phase !== 'falling';
  $('fist').disabled = state.phase !== 'falling';
  const displayedHP = E.displayedHP(state);
  $('hp-label').textContent = `${displayedHP} / ${state.maxHP} HP`;
  $('hp-fill').style.width = `${displayedHP / state.maxHP * 100}%`;
  $('hp-meter').setAttribute('aria-valuemax',state.maxHP);
  $('hp-meter').setAttribute('aria-valuenow',displayedHP);
  $('enemy-name').textContent = state.phase === 'won' ? '撃退に成功！' : state.phase === 'escaped' ? '撃退に失敗...' : '巨大な拳を撃退しよう';
  $('online-label').textContent = `${state.people}人オンライン（仮）`;
  $('people-value').textContent = `${state.people}人`;
  const size = innerWidth <= 760 ? 600 : 720;
  fistPosition = G.position($('stage').clientHeight,size,state.progress,state.phase,reduced());
  $('fist').style.top = `${fistPosition.top}px`;
  $('fist').style.setProperty('--fist-size',`${size}px`);
  $('descent').hidden = state.phase !== 'falling' || reduced();
  $('descent').style.setProperty('--tip',`${fistPosition.tip}px`);
  if (state.phase === 'falling') cards.forEach((card,i) => {
    const level = G.damage(geometry[i].top, geometry[i].height, reduced() ? state.progress * $('stage').clientHeight : fistPosition.tip);
    if (level > Number(card.dataset.damage || 0)) card.dataset.damage = String(level);
  });

}
let victoryTimer = null;
const victoryAnimations = [];
function clearVictoryBurst() {
  clearTimeout(victoryTimer); victoryTimer = null;
  victoryAnimations.splice(0).forEach(animation => animation.cancel());
  $('victory-burst').replaceChildren();
}
function victoryOrigin() {
  const stageRect = $('stage').getBoundingClientRect();
  const margin = 40;
  const x = Math.max(margin, Math.min(innerWidth - margin, stageRect.left + stageRect.width / 2));
  const visibleTop = Math.max(margin, stageRect.top);
  const visibleBottom = Math.min(innerHeight - margin, stageRect.bottom);
  const tip = stageRect.top + Math.max(60, fistPosition.tip);
  const y = visibleBottom > visibleTop ? Math.max(visibleTop, Math.min(visibleBottom, tip)) : innerHeight * .45;
  return { x, y };
}
function victoryBurst(origin) {
  clearVictoryBurst();
  const calm = reduced(), count = calm ? 10 : innerWidth <= 760 ? 64 : 96;
  const files = ['1f91b','1f44a','1f91c'];
  const duration = calm ? 850 : 2700;
  for (let i = 0; i < count; i++) {
    const image = document.createElement('img'); image.src = `assets/twemoji/${files[i % 3]}.svg`; image.alt = '';
    image.draggable = false;
    const size = calm ? 30 + i % 3 * 8 : 24 + Math.random() * 48;
    image.style.width = image.style.height = `${size}px`;
    const angle = i / count * Math.PI * 2 + (Math.random() - .5) * .15;
    const distance = calm ? 42 + i % 3 * 24 : Math.hypot(innerWidth,innerHeight) * (.25 + Math.random() * .6);
    const dx = Math.cos(angle) * distance, dy = Math.sin(angle) * distance;
    const spin = (Math.random() - .5) * 900;
    image.style.left = `${origin.x - size/2 + (calm ? dx : 0)}px`;
    image.style.top = `${origin.y - size/2 + (calm ? dy : 0)}px`;
    $('victory-burst').append(image);
    const frames = calm ? [{opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.65},{opacity:0}] : [
      {transform:'translate(0,0) rotate(0deg) scale(.5)',opacity:1},
      {transform:`translate(${dx*.58}px,${dy*.58-90}px) rotate(${spin*.6}deg) scale(1)`,opacity:1,offset:.45},
      {transform:`translate(${dx}px,${dy+120}px) rotate(${spin}deg) scale(.8)`,opacity:0}
    ];
    victoryAnimations.push(image.animate(frames,{duration:calm ? duration : duration - Math.random()*450,easing:'cubic-bezier(.16,.7,.3,1)',fill:'forwards'}));
  }
  victoryTimer = setTimeout(clearVictoryBurst,duration + 60);
}
function finish(previous) {
  if (state.phase === previous || active()) return;
  if (!['won','escaped'].includes(state.phase)) return;
  const won = state.phase === 'won';
  const origin = won ? victoryOrigin() : null;
  clearVictoryBurst();
  if (!won) {
    $('effects').replaceChildren(); $('descent').hidden = true; particleClock = 0;
    measure(); $('stage').classList.add('collapsed'); restoreClock = 5; failureElapsed = 0;
  } else { restoreCards(); restoreClock = 0; guardClock = .38; victoryBurst(origin); }
  const title = won ? 'パンチは消えた...' : 'TLはパンチされた...';
  const description = won ? 'そもそも何この手は？' : 'パンチがあるゲームだったね...';
  if (!earned.has(state.phase)) {
    earned.add(state.phase);
    const item = document.createElement('p');
    const name = document.createElement('strong'); name.textContent = title;
    const detail = document.createElement('small'); detail.textContent = description;
    item.append(name,document.createElement('br'),detail); $('achievements').append(item);
    announce(`${won ? '撃退に成功！' : '撃退に失敗...'} 実績獲得：${title} ${description}`);
  } else announce(`${won ? '撃退に成功！' : '撃退に失敗...'} 実績は獲得済みです。`);
  $('activity').textContent = won ? '撃退成功 · もう一度モック投稿で遊べます' : '撃退失敗 · 5秒後にタイムラインが復元します';
  if (document.activeElement === $('fist')) $('draft').focus({ preventScroll: true });
  $('fist').hidden = true; syncGuard();
}
for (const [id,phase] of [['preview-win','won'],['preview-loss','escaped']]) {
  $(id).addEventListener('click',() => {
    clearVictoryBurst();
    document.querySelector('.app-nav').scrollIntoView({ behavior: 'instant', block: 'start' });
    restoreCards(); measure(); state = E.start(E.create(state.people));
    const previous = state.phase;
    state = E.tick(state,E.PREPARATION);
    render();
    state = phase === 'won' ? E.attack(state,state.maxHP) : E.tick(state,E.DURATIONS.falling);
    finish(previous); render();
  });
}

function burst(click = true) {
  if (reduced() || $('effects').children.length >= 30) return;
  const y = Math.max(0, Math.min($('stage').clientHeight, fistPosition.tip));
  const ring = document.createElement('i'); ring.className = 'ring'; ring.style.top = `${y}px`; $('effects').append(ring);
  const elements = [ring];
  for(let i = 0, count = Math.min(click ? 5 : 3, 30 - $('effects').children.length); i < count; i++) {
    const chip = document.createElement('i'); chip.className = 'chip'; chip.style.top = `${y}px`;
    chip.style.left = `${i%2 ? 85 : 15}%`; chip.style.setProperty('--x',`${(i-2)*35}px`); chip.style.setProperty('--y',`${20+i%2*35}px`); $('effects').append(chip); elements.push(chip);
  }
  setTimeout(() => elements.forEach(el => el.remove()),550);
}

$('fist').addEventListener('click',() => { if(state.phase !== 'falling') return; const before = state.phase; state = E.attack(state); burst(); $('activity').textContent = 'あなたの攻撃！ −8 HP · 架空の仲間と協力中'; finish(before); render(); });
$('composer').addEventListener('submit',event => {
  event.preventDefault();
  if (!E.trigger($('draft').value,'local')) { announce('発動しません。同じ拳を3つ以上、空白を入れずに続けてください。実際の投稿は行っていません。'); return; }
  if(active()) { announce('すでに拳が降下中です。タップで撃退しよう！'); return; }
  clearVictoryBurst(); restoreCards(); measure(); restoreClock = 0; guardClock = 0; peerClock = 0; peerCount = 0; state = E.start(state);
  $('activity').textContent = '拳を発見！ みんなでタップして撃退しよう'; announce('上から何か来る...?? HPが満タンになってから2秒後に拳が現れます。'); render();
});
document.querySelectorAll('[data-emoji]').forEach(button => button.addEventListener('click',() => { const draft = $('draft'), start = draft.selectionStart, end = draft.selectionEnd; draft.setRangeText(button.dataset.emoji,start,end,'end'); draft.focus(); }));
$('people').addEventListener('input',() => { state = E.setPeople(state,$('people').value); render(); });
$('reduced').addEventListener('change',() => { motionOverride = $('reduced').checked; clearVictoryBurst(); $('effects').replaceChildren(); render(); }); motionPreference.addEventListener('change',() => { clearVictoryBurst(); render(); });
window.addEventListener('resize',() => { measure(); render(); });
$('reset').addEventListener('click',() => { clearVictoryBurst(); if (document.activeElement === $('fist')) $('draft').focus({ preventScroll: true }); state = E.create(state.people); peerClock = 0; restoreClock = 0; guardClock = .38; restoreCards(); $('activity').textContent = '待機中 · 同じ拳を3つ連続で投稿すると発動'; announce('演出を閉じて、タイムラインを元に戻しました。'); render(); });
document.addEventListener('visibilitychange',() => { lastTime = null; });
function frame(now) {
  const delta = lastTime === null || document.hidden ? 0 : (now - lastTime) / 1000;
  lastTime = document.hidden ? null : now;
  const needsRender = active() || restoreClock > 0 || guardClock > 0;
  if (guardClock > 0) guardClock = Math.max(0,guardClock - delta);
  if(active()) {
    const previous = state.phase; state = E.tick(state,delta);
    if (previous !== 'falling' && state.phase === 'falling') { render(); announce('巨大な拳が現れました。タップ、クリック、Enter、Spaceで攻撃できます。'); if (document.activeElement === $('draft') || document.activeElement === document.querySelector('#composer .primary')) $('fist').focus({ preventScroll: true }); }
    if(state.phase === 'falling' && $('others').checked) {
      peerClock += delta;
      while(peerClock >= 1.6 && active()) { peerClock -= 1.6; state = E.attack(state,Math.min(12,state.people*1.5)); peerCount++; $('activity').textContent = `架空の仲間の攻撃 ${peerCount}回 · あなたもタップで参加`; }
    }
    if (state.phase === 'falling') { particleClock += delta; if (particleClock >= .24) { particleClock %= .24; burst(false); } }
    finish(previous);
  } else if (restoreClock > 0) { restoreClock -= delta; failureElapsed += delta; cards.forEach((card,i) => { if(failureElapsed >= i*.12 && card.dataset.damage !== '3') card.dataset.damage = '3'; }); if(restoreClock <= 0) { restoreCards(); syncGuard(); } }
  if (needsRender) render(); requestAnimationFrame(frame);
}
measure(); render(); requestAnimationFrame(frame);
