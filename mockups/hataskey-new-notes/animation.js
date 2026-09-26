'use strict';
const people = [
  {name:'こはる', handle:'koharu', color:'#c6a2b2', hair:'#625164', text:'少し涼しくなったので、遠回りして帰ってきました。秋の空、きれい。'},
  {name:'青井', handle:'aoi', color:'#98b1bf', hair:'#435b70', text:'今日のコーヒーはいつもより深煎り。読みかけの本と、ひと息。'},
  {name:'なつめ', handle:'natsume', color:'#b3bda4', hair:'#536455', text:'散歩で見つけた小さな景色。週末も晴れるといいな。'},
  {name:'ゆう', handle:'yuu', color:'#c9b38e', hair:'#756347', text:'新しいプレイリストを作っていたら、もうこんな時間。おすすめの一曲ありますか？'},
];
const arrow = '<span class="rise" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 20V4m-6 6 6-6 6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
function decoration(person) {
  const index=people.indexOf(person);
  const artwork=index%2 ? '<path d="m12 7 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#f7d784"/><path d="m62 43 2 4 4 1-3 3 1 4-4-2-3 2 1-4-3-3 4-1z" fill="#f7d784"/><path d="M53 61q8-3 14 2m-5-5 1 11" fill="none" stroke="#f7d784" stroke-width="2"/>' : '<g fill="#e9afc9"><circle cx="17" cy="16" r="4"/><circle cx="23" cy="16" r="4"/><circle cx="20" cy="11" r="4"/><circle cx="20" cy="20" r="4"/></g><circle cx="20" cy="16" r="2.5" fill="#f7d784"/><path d="M57 58q5-7 10-2l-7 7 8 5-10 1-4-8z" fill="#e9afc9"/><path d="m58 62-6 10m8-8 1 9" stroke="#e9afc9" stroke-width="3"/>';
  return `<svg class="avatar-decoration" aria-hidden="true" viewBox="0 0 80 80" style="--deco-angle:${index===2 ? -8 : 0}deg;--deco-flip:${index===3 ? -1 : 1};--deco-x:${index===1 ? 2 : 0}%;--deco-y:0%;--deco-scale:1;--deco-opacity:1">${artwork}</svg>`;
}
function portrait(person) {
  return `<span class="avatar-base"><svg aria-hidden="true" viewBox="0 0 40 40"><rect width="40" height="40" fill="${person.color}"/><path d="M6 40c0-14 28-14 28 0" fill="${person.hair}"/><ellipse cx="20" cy="20" rx="11" ry="13" fill="#f1d9c7"/><path d="M8 20C4 2 35 0 32 22l-4-11-9 5-8-2z" fill="${person.hair}"/><path d="M16 22h1m7 0h1" stroke="#5c4c4b" stroke-width="2" stroke-linecap="round"/><path d="M18 28q3 2 5-1" fill="none" stroke="#a97973" stroke-linecap="round"/></svg></span>${decoration(person)}`;
}
function note(person, index, fresh = false) {
  return `<article class="note${fresh ? ' new-note' : ''}"><div class="avatar">${portrait(person)}</div><div class="note-body"><div class="note-meta"><b>${person.name}</b><span class="handle">@${person.handle}</span><time>${fresh ? 'いま' : `${(index + 1) * 8}分前`}</time></div><p>${person.text}</p>${!fresh && index === 2 ? '<div class="photo" role="img" aria-label="架空の夕景イラスト"></div>' : ''}<div class="note-actions"><span>♡　${index + 2}</span><span>↻</span><span>↩</span><span>•••</span></div></div></article>`;
}
let nextNoteId = 3;
const state = {queue:[0,1,2].map(id => ({id,personId:id})), count:3, external:false, motion:!matchMedia('(prefers-reduced-motion: reduce)').matches, revision:0, stream:null};
const slots = [...document.querySelectorAll('.banner-slot')];
const timelines = [...document.querySelectorAll('.timeline')];
let animations = [];
timelines.forEach(timeline => { timeline.innerHTML = people.map((person,index) => note(person,index)).join(''); });
function cancelAnimations() { animations.forEach(animation => animation.cancel()); animations = []; document.querySelectorAll('.face-ghost').forEach(face => face.remove()); }
function animate(element, frames, options) {
  if (!state.motion) return null;
  const animation = element.animate(frames, options);
  animations.push(animation);
  // A finished forwards effect still overrides the element's CSS. Keep it
  // tracked until the state transition explicitly cancels it.
  animation.finished.catch(() => {}).then(() => {
    if (options.fill !== 'forwards' && options.fill !== 'both') {
      animations = animations.filter(item => item !== animation);
    }
  });
  return animation;
}
const ease = 'cubic-bezier(.22,1,.36,1)';
function updateDOM() {
  document.body.dataset.count = String(state.count);
  document.body.dataset.external = String(state.external);
  document.body.dataset.motion = String(state.motion);
  slots.forEach(slot => {
    const button = slot.querySelector('button');
    button.disabled = state.count === 0;
    button.inert = state.count === 0;
    button.setAttribute('aria-hidden', String(state.count === 0));
    button.setAttribute('aria-label', `新しいノート${state.count}件を表示`);
    const content = slot.querySelector('.banner-content');
    if(!content.querySelector('.faces')) content.innerHTML = `${arrow}<span class="faces" aria-hidden="true"></span><span class="count" aria-hidden="true"></span><span class="external-text" aria-hidden="true"></span>`;
    const faces = content.querySelector('.faces');
    const visible = state.queue.slice(0,3);
    const wanted = new Set(visible.map(item => String(item.id)));
    [...faces.children].forEach(face => { if(!wanted.has(face.dataset.noteId)) face.remove(); });
    visible.forEach(item => {
      let face = [...faces.children].find(element => element.dataset.noteId === String(item.id));
      if(!face) { face = document.createElement('span'); face.className = 'face'; face.dataset.noteId=String(item.id); face.dataset.personId=String(item.personId); face.innerHTML=portrait(people[item.personId]); }
      faces.append(face);
    });
    content.querySelector('.count').innerHTML=`<span class="count-value">${state.count}</span>`;
    content.querySelector('.count').hidden=state.external;
    content.querySelector('.external-text').textContent = `${people[visible[0]?.personId ?? 0].name}さんたちの新しい投稿`;
    content.querySelector('.external-text').hidden=!state.external;
  });
  document.querySelector('#status').textContent = state.count ? `新しいノート ${state.count}件 · すべて架空の表示です` : '新着を表示しました · すべて架空の表示です';
}
function setVisible() {
  slots.forEach(slot => {
    slot.hidden = state.count === 0;
    slot.dataset.state = state.count ? 'visible' : 'hidden';
  });
}
function flash(slot, delay = 0) {
  animate(slot.querySelector('.flash'), [{clipPath:'inset(0 50%)',opacity:.55},{clipPath:'inset(0)',opacity:.3,offset:.55},{clipPath:'inset(0)',opacity:0}], {duration:720,delay,easing:ease});
}
function captureFaces() {
  return slots.map(slot => new Map([...slot.querySelectorAll('.face, .rise, .count, .external-text')].filter(element => !element.hidden).map(element => [element.dataset.noteId ?? `part:${element.className}`, {rect:element.getBoundingClientRect(),opacity:getComputedStyle(element).opacity,html:element.innerHTML}])));
}
function moveFaces(before) {
  slots.forEach((slot,index) => {
    const previous=before[index];
    const current=[...slot.querySelectorAll('.face')];
    const currentIds=new Set(current.map(face => face.dataset.noteId));
    current.forEach(face => {
      const to=face.getBoundingClientRect();
      const from=previous.get(face.dataset.noteId);
      const x=from ? (from.rect.left+from.rect.width/2)-(to.left+to.width/2) : -14;
      const scale=from ? from.rect.width/26 : .3;
      animate(face,[{transform:`translateX(${x}px) scale(${scale})`,opacity:from?.opacity ?? 0},{transform:'translateX(0) scale(1)',opacity:1}],{duration:520,easing:ease});
    });
    [...slot.querySelectorAll('.rise, .count, .external-text')].filter(element => !element.hidden).forEach(element => {
      const from=previous.get(`part:${element.className}`);
      const to=element.getBoundingClientRect();
      const x=from ? (from.rect.left+from.rect.width/2)-(to.left+to.width/2) : 0;
      const y=from ? (from.rect.top+from.rect.height/2)-(to.top+to.height/2) : 0;
      animate(element,[{transform:`translate(${x}px,${y}px)`,opacity:from?.opacity ?? 1},{transform:'translate(0,0)',opacity:1}],{duration:520,easing:ease});
    });
    if(state.motion) previous.forEach((from,id) => {
      if(id.startsWith('part:') || currentIds.has(id)) return;
      const origin=slot.querySelector('button').getBoundingClientRect();
      const ghost=document.createElement('span'); ghost.className='face face-ghost'; ghost.innerHTML=from.html;
      ghost.style.left=`${from.rect.left-origin.left}px`; ghost.style.top=`${from.rect.top-origin.top}px`;
      ghost.style.width=`${from.rect.width}px`; ghost.style.height=`${from.rect.height}px`;
      slot.querySelector('button').append(ghost);
      const animation=animate(ghost,[{opacity:from.opacity,transform:'translateX(0) scale(1)'},{opacity:0,transform:'translateX(12px) scale(.65)'}],{duration:300,easing:ease});
      animation?.finished.catch(() => {}).then(() => ghost.remove());
    });
  });
}
function receive(amount) {
  if (state.count === 99) return;
  const entering = state.count === 0;
  const before=captureFaces();
  const heights=slots.map(slot => ({height:slot.getBoundingClientRect().height,opacity:getComputedStyle(slot).opacity}));
  ++state.revision;
  cancelAnimations();
  const accepted=Math.min(amount,99-state.count);
  for(let i=0;i<accepted;i++) { const id=nextNoteId++; state.queue.unshift({id,personId:id%people.length}); }
  state.count=state.queue.length;
  updateDOM();
  setVisible();
  moveFaces(before);
  slots.forEach((slot,index) => {
    if (entering) {
      animate(slot, [{height:`${heights[index].height}px`,opacity:heights[index].opacity},{height:`${slot.offsetHeight}px`,opacity:1}], {duration:460,easing:ease});
      flash(slot,180);
    } else {
      const value=slot.querySelector('.count-value');
      if(!slot.querySelector('.count').hidden) animate(value,[{transform:'translateY(8px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:380,easing:ease});
      flash(slot);
    }
  });
}
async function release() {
  if (!state.count) return;
  const revision = ++state.revision;
  const released = [...state.queue];
  cancelAnimations();
  // Keep the old visual content for the exit; it is inert immediately.
  state.count = 0;
  state.queue = [];
  document.body.dataset.count = '0';
  slots.forEach(slot => {
    slot.dataset.state = 'exiting';
    const button = slot.querySelector('button');
    button.inert = true; button.disabled = true; button.setAttribute('aria-hidden','true');
  });
  const newCards = released.slice(0,4).map((item,index) => note(people[item.personId],index,true)).join('');
  timelines.forEach(timeline => { timeline.insertAdjacentHTML('afterbegin',newCards); while(timeline.children.length > 8) timeline.lastElementChild.remove(); });
  const exits = slots.map(slot => {
    animate(slot.querySelector('.banner-content'),[{transform:'translateY(0) scale(1)',opacity:1,filter:'blur(0)'},{transform:'translateY(-40%) scale(.92)',opacity:0,filter:'blur(2px)'}],{duration:300,easing:'cubic-bezier(.55,0,.8,.2)',fill:'forwards'});
    return animate(slot,[{height:`${slot.offsetHeight}px`,opacity:1},{height:'0px',opacity:0}],{duration:420,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'});
  });
  await Promise.all(exits.map(animation => animation ? animation.finished.catch(() => {}) : Promise.resolve()));
  if(revision !== state.revision) return;
  cancelAnimations(); updateDOM(); setVisible();
}
slots.forEach(slot => slot.querySelector('button').addEventListener('click',release));
document.querySelector('#receive-one').addEventListener('click',() => receive(1));
document.querySelector('#receive-batch').addEventListener('click',() => receive(12));
document.querySelector('#receive-stream').addEventListener('click',() => {
  clearInterval(state.stream); let remaining = 8;
  document.querySelector('#receive-stream').textContent = '受信中…';
  state.stream = setInterval(() => { receive(1); if(--remaining === 0) { clearInterval(state.stream); state.stream = null; document.querySelector('#receive-stream').textContent = '連続受信'; } },140);
});
document.querySelector('#replay').addEventListener('click',() => {
  clearInterval(state.stream); state.stream=null; document.querySelector('#receive-stream').textContent='連続受信';
  ++state.revision; cancelAnimations();
  state.queue = [{id:nextNoteId++,personId:0}];
  state.count=1;
  updateDOM(); setVisible();
  slots.forEach(slot => { animate(slot,[{height:'0px',opacity:0,clipPath:'inset(100% 0 0)'},{height:`${slot.offsetHeight}px`,opacity:1,clipPath:'inset(0)'}],{duration:460,easing:ease}); flash(slot,180); });
});
document.querySelector('#external-toggle').addEventListener('change',event => { ++state.revision; cancelAnimations(); state.external=event.target.checked; updateDOM();setVisible(); });
document.querySelector('#decoration-toggle').addEventListener('change',event => { document.body.dataset.decorations=String(event.target.checked); });
document.querySelector('#theme-toggle').addEventListener('change',event => { document.body.dataset.theme=event.target.checked?'dark':'light'; });
document.querySelector('#motion-toggle').checked=state.motion;
document.querySelector('#motion-toggle').addEventListener('change',event => { ++state.revision;cancelAnimations();state.motion=event.target.checked;updateDOM();setVisible(); });
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event => { if(event.matches) {++state.revision;cancelAnimations();state.motion=false;document.querySelector('#motion-toggle').checked=false;updateDOM();setVisible();} });
updateDOM();setVisible();
