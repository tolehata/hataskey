'use strict';

// All data and interactions stay in this page. No network, storage, or posting.
const notes = [
 {name:'花',handle:'@hana',initial:'花',tone:'a',text:'窓辺のガラスに、午後の光が重なった。きれいな影を見つけた日。'},
 {name:'律',handle:'@ritsu',initial:'律',tone:'b',text:'ガラス越しの雨を見ながら、喫茶店で本の続きを読んだ。'},
 {name:'空',handle:'@sora',initial:'空',tone:'c',text:'色ガラスの小さな花瓶。週末の市で見つけた。'},
 {name:'海',handle:'@umi',initial:'海',tone:'a',text:'海辺で撮った写真を整理中。波の音まで思い出す。'},
 {name:'結衣',handle:'@yui',initial:'結',tone:'b',text:'新しいペンで、散歩の記録を少しだけ書いた。'},
 {name:'麦',handle:'@mugi',initial:'麦',tone:'c',text:'今朝のパンは焼きたて。コーヒーと一緒に。'},
 {name:'花',handle:'@hana',initial:'花',tone:'a',text:'庭の植物に新しい葉が出ていた。'},
 {name:'律',handle:'@ritsu',initial:'律',tone:'b',text:'好きな本を友だちに貸した。感想が楽しみ。'}
];
const users = [
 {name:'ガラス工房 すず',handle:'@suzu',initial:'鈴',tone:'a',text:'小さなガラスの器をつくっています。'},
 {name:'花',handle:'@hana',initial:'花',tone:'b',text:'写真と散歩。窓辺の光が好き。'},
 {name:'律',handle:'@ritsu',initial:'律',tone:'c',text:'本と喫茶店の記録。'},
 {name:'ガラスと庭',handle:'@garden',initial:'庭',tone:'a',text:'植物と透明なものの記録。'},
 {name:'空',handle:'@sora',initial:'空',tone:'b',text:'週末は街を歩きます。'}
];
const events = [
 {name:'街の小さな市',handle:'@hana',initial:'市',tone:'a',text:'ガラスと本の小さな市を開きます。',start:'2026-10-12',created:'2026-09-19',origin:'local'},
 {name:'海辺の写真展',handle:'@umi@remote.example',initial:'海',tone:'c',text:'波と光を集めた写真展。',start:'2026-11-03',created:'2026-09-23',origin:'remote'},
 {name:'読書会',handle:'@ritsu',initial:'本',tone:'b',text:'喫茶店で今月の本について話しましょう。',start:'2026-10-26',created:'2026-09-25',origin:'local'}
];
notes.forEach((item, index) => {
 item.date = `2026-09-${String(10 + index).padStart(2, '0')}T12:00`;
 item.origin = index === 3 ? 'remote' : 'local';
 item.host = index === 3 ? 'remote.example' : '';
});
users.forEach((item, index) => { item.origin = index === 0 ? 'remote' : 'local'; });
const $ = (root, selector) => root.querySelector(selector);
const $$ = (root, selector) => [...root.querySelectorAll(selector)];
let activeSearch = null;
const make = (tag, className, value) => {
 const element = document.createElement(tag);
 if (className) element.className = className;
 if (value !== undefined) element.textContent = value;
 return element;
};

function initPhone(phone) {
 const shell = $(phone, '.morph-shell');
 const scrim = $(phone, '.scrim');
 const searchBody = $(phone, '.search-body');
 const searchToggle = $(phone, '.search-toggle');
 const input = $(phone, 'input[name="query"]');
 const form = $(phone, '.search-form');
 const targetSelect = $(phone, '[name="target"]');
 const targetIcon = $(phone, '.target-icon use');
 const clearButton = $(phone, '.clear-button');
 const optionsButton = $(phone, '.options-button');
 const options = $(phone, '.search-options');
 const results = $(phone, '.results');
 const searchExtra = $(phone, '.search-extra');
 const pickerPanel = make('div', 'choice-panel');
 pickerPanel.id = `${phone.dataset.variant}-choices`;
 pickerPanel.hidden = true;
 pickerPanel.setAttribute('role', 'group');
 const pickerHeading = make('div', 'choice-heading');
 const pickerBack = make('button', 'choice-back', '＜');
 pickerBack.type = 'button';
 pickerBack.setAttribute('aria-label', '戻る');
 const pickerTitle = make('strong', 'choice-title');
 pickerHeading.append(pickerBack, pickerTitle);
 const pickerList = make('div', 'choice-list');
 pickerPanel.append(pickerHeading, pickerList);
 searchExtra.prepend(pickerPanel);
 const composer = $(phone, '.composer');
 const mockActions = $$(phone, '.mock-action');
 const timelineMenu = $(phone, '.timeline-menu');
 const home = $(phone, '.home-hold');
 let open = false;
 let timer = 0;
 let generation = 0;
 let lastSubmitted = '';
 let opener = searchToggle;
 let holdTimer = 0;
 let held = false;
 let scrimHideTimer = 0;
 let composing = false;
 let activePicker = null;
 let pickerTrigger = null;

 input.value = 'ガラス';
 clearButton.hidden = !input.value;

 function refreshOptions() {
  const target = targetSelect.value;
  $$(options, '[data-for]').forEach(section => { section.hidden = section.dataset.for !== target; });
  const noteScope = $(options, '[name="note-scope"]').value;
  $(options, '.server-condition').hidden = target !== 'note' || noteScope !== 'server';
  $(options, '.user-condition').hidden = target !== 'note' || noteScope !== 'user';
  optionsButton.setAttribute('aria-expanded', String(!options.hidden));
  updateHeight();
 }

 function updateHeight() {
  const controls = 59;
  const max = parseInt(phone.style.getPropertyValue('--max-search-body')) || 386;
  if (activePicker) {
   // Measure the intrinsic choices, not the flex panel stretched to the previous results height.
   const choicesHeight = pickerHeading.offsetHeight + pickerList.scrollHeight + 13;
   phone.style.setProperty('--search-body-height', `${Math.min(controls + choicesHeight, max)}px`);
   return;
  }
  const conditions = options.hidden ? 0 : Math.min(200, options.scrollHeight + 8);
  const resultsHeight = phone.dataset.phase === 'results' ? 170 : phone.dataset.phase === 'loading' ? 60 : 0;
  const desired = controls + conditions + resultsHeight;
  phone.style.setProperty('--search-body-height', `${Math.min(desired, max)}px`);
 }

 function closePicker(focus = true) {
  if (!activePicker) return;
  activePicker = null;
  pickerPanel.hidden = true;
  searchBody.dataset.pickerOpen = 'false';
  options.inert = false;
  results.inert = false;
  pickerTrigger.setAttribute('aria-expanded', 'false');
  const trigger = pickerTrigger;
  pickerTrigger = null;
  updateHeight();
  if (focus && open) trigger.focus({preventScroll:true});
 }

 function openPicker(select, trigger) {
  if (activePicker === select) { closePicker(); return; }
  if (activePicker) closePicker(false);
  activePicker = select;
  pickerTrigger = trigger;
  pickerTitle.textContent = select === targetSelect ? '検索対象' : select.getAttribute('aria-label');
  pickerPanel.setAttribute('aria-label', `${pickerTitle.textContent}の選択肢`);
  pickerList.replaceChildren();
  for (const option of select.options) {
   const choice = make('button', 'choice-item');
   choice.type = 'button';
   choice.dataset.value = option.value;
   choice.setAttribute('aria-pressed', String(option.selected));
   choice.append(make('span', '', option.textContent), make('span', 'choice-check', option.selected ? '✓' : ''));
   choice.addEventListener('click', () => {
    if (select.value !== option.value) {
     select.value = option.value;
     select.dispatchEvent(new Event('change', {bubbles:true}));
    }
    closePicker();
   });
   pickerList.append(choice);
  }
  pickerPanel.hidden = false;
  searchBody.dataset.pickerOpen = 'true';
  options.inert = true;
  results.inert = true;
  trigger.setAttribute('aria-expanded', 'true');
  updateHeight();
  const selected = $(pickerList, '[aria-pressed="true"]') || pickerList.firstElementChild;
  selected?.focus({preventScroll:true});
 }

 for (const select of $$(searchBody, 'select')) {
  const trigger = make('button', select === targetSelect ? 'select-trigger target-trigger' : 'select-trigger');
  trigger.type = 'button';
  trigger.setAttribute('aria-label', `${select === targetSelect ? '検索対象' : select.getAttribute('aria-label')}：${select.selectedOptions[0].textContent}`);
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', pickerPanel.id);
  trigger.textContent = select.selectedOptions[0].textContent;
  select.hidden = true;
  select.after(trigger);
  trigger.addEventListener('click', () => openPicker(select, trigger));
  trigger.addEventListener('keydown', event => {
   if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
   event.preventDefault();
   if (!activePicker) openPicker(select, trigger);
  });
  select.addEventListener('change', () => {
   trigger.textContent = select.selectedOptions[0].textContent;
   trigger.setAttribute('aria-label', `${select === targetSelect ? '検索対象' : select.getAttribute('aria-label')}：${trigger.textContent}`);
  });
 }
 pickerBack.addEventListener('click', () => closePicker());
 pickerPanel.addEventListener('keydown', event => {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const choices = $$(pickerList, '.choice-item');
  const index = choices.indexOf(document.activeElement);
  if (!choices.length || index < 0) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1
   : (index + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
  choices[next].focus({preventScroll:true});
  choices[next].scrollIntoView({block:'nearest'});
 });

 function updateViewport() {
  const vv = window.visualViewport;
  const rect = phone.getBoundingClientRect();
  const occlusion = vv && window.innerWidth <= 735 && searchBody.contains(document.activeElement)
   ? Math.max(0, rect.bottom - (vv.offsetTop + vv.height)) : 0;
  const inset = Math.min(occlusion, Math.max(0, phone.clientHeight - 300));
  phone.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
  const available = Math.max(300, phone.clientHeight - inset);
  phone.style.setProperty('--available-height', `${available}px`);
  phone.style.setProperty('--max-search-body', `${Math.max(105, Math.min(386, Math.floor(available * .65 - 60)))}px`);
  updateHeight();
 }

 function cancelSearch() {
  generation += 1;
  window.clearTimeout(timer);
  timer = 0;
 }

 function clearResults() {
  results.replaceChildren();
  phone.dataset.phase = 'idle';
  updateHeight();
 }

 function showScrim() {
  window.clearTimeout(scrimHideTimer);
  scrim.hidden = false;
  requestAnimationFrame(() => {
   if (open || (timelineMenu && !timelineMenu.hidden)) scrim.dataset.visible = 'true';
  });
 }

 function hideScrim() {
  scrim.dataset.visible = 'false';
  window.clearTimeout(scrimHideTimer);
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300;
  scrimHideTimer = window.setTimeout(() => {
   if (!open && (!timelineMenu || timelineMenu.hidden)) scrim.hidden = true;
  }, duration);
 }

 function setOpen(next, trigger = searchToggle) {
  if (next === open) return;
  if (next) {
   if (activeSearch && activeSearch.phone !== phone) activeSearch.close();
   closeTimelineMenu();
   opener = trigger;
   open = true;
   activeSearch = {phone, close: () => setOpen(false)};
   $(document, '.page-head').inert = true;
   $$(document, '.phone').filter(other => other !== phone).forEach(other => { other.inert = true; });
   phone.dataset.open = 'true';
   shell.dataset.open = 'true';
   shell.setAttribute('role', 'dialog');
   shell.setAttribute('aria-modal', 'true');
   shell.setAttribute('aria-label', '検索');
   searchToggle.setAttribute('aria-expanded', 'true');
   searchToggle.setAttribute('aria-label', '検索を閉じる');
   searchBody.inert = false;
   searchBody.setAttribute('aria-hidden', 'false');
   refreshOptions();
   if (composer) { composer.inert = true; composer.setAttribute('aria-hidden', 'true'); }
   for (const action of mockActions) action.disabled = true;
   if (home) home.disabled = true;
   for (const background of $$(phone, '.app-head, .upper, .feed')) background.inert = true;
   showScrim();
   requestAnimationFrame(() => {
    if (!open) return;
    updateViewport();
    input.focus({preventScroll:true});
   });
  } else {
   closePicker(false);
   cancelSearch();
   open = false;
   if (activeSearch?.phone === phone) activeSearch = null;
   $(document, '.page-head').inert = false;
   $$(document, '.phone').filter(other => other !== phone).forEach(other => { other.inert = false; });
   phone.dataset.open = 'false';
   shell.dataset.open = 'false';
   shell.removeAttribute('role');
   shell.removeAttribute('aria-modal');
   shell.removeAttribute('aria-label');
   searchToggle.setAttribute('aria-expanded', 'false');
   searchToggle.setAttribute('aria-label', '検索を開く');
   searchBody.inert = true;
   searchBody.setAttribute('aria-hidden', 'true');
   if (composer) { composer.inert = false; composer.setAttribute('aria-hidden', 'false'); }
   for (const action of mockActions) action.disabled = false;
   if (home) home.disabled = false;
   for (const background of $$(phone, '.app-head, .upper, .feed')) background.inert = false;
   hideScrim();
   clearResults();
   options.hidden = true;
   optionsButton.setAttribute('aria-expanded', 'false');
   lastSubmitted = '';
   updateViewport();
   if (opener?.isConnected) opener.focus({preventScroll:true});
  }
 }

 function renderItems(items, query) {
  results.replaceChildren();
  if (!items.length) {
   results.append(make('p', 'result-status result-empty', `「${query}」に一致する${targetSelect.selectedOptions[0].textContent}はありません`));
   return;
  }
  for (const item of items) {
   const row = make('article', 'result');
   row.append(make('b', `avatar ${item.tone}`, item.initial));
   const main = make('div', 'result-main');
   const heading = make('div', 'result-head');
   heading.append(make('strong', '', item.name), make('span', '', item.handle));
   main.append(heading, make('p', '', item.text));
   if (item.start) main.append(make('small', 'event-date', `開催日 ${item.start}`));
   row.append(main);
   results.append(row);
  }
  results.scrollTop = 0;
 }

 function search() {
  const query = input.value.trim();
  cancelSearch();
  if (!query && targetSelect.value !== 'event') {
   lastSubmitted = '';
   clearResults();
   input.focus();
   return;
  }
  lastSubmitted = query || ' ';
  results.replaceChildren(make('p', 'result-status', '検索中…'));
  phone.dataset.phase = 'loading';
  updateHeight();
  const current = generation;
  timer = window.setTimeout(() => {
   if (!open || current !== generation) return;
   const target = targetSelect.value;
   const source = target === 'note' ? notes : target === 'user' ? users : events;
   const normalized = query.normalize('NFKC').toLocaleLowerCase('ja');
   const scope = $(options, '[name="note-scope"]').value;
   const host = $(options, '[name="server-host"]').value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
   const selectedUser = $(options, '[name="note-user"]').value;
   const origin = $(options, `[data-for="${target}"] [name="origin"]`)?.value;
   const from = $(options, '[name="note-from"]').value;
   const to = $(options, '[name="note-to"]').value;
   const eventFrom = $(options, '[name="event-from"]').value;
   const eventTo = $(options, '[name="event-to"]').value;
   const matches = source.filter(item => {
    if (normalized && !`${item.name} ${item.handle} ${item.text}`.normalize('NFKC').toLocaleLowerCase('ja').includes(normalized)) return false;
    if (target === 'note') {
     if (scope === 'local' && item.origin !== 'local') return false;
     if (scope === 'server' && (!host || item.host !== host)) return false;
     if (scope === 'user' && item.handle !== selectedUser) return false;
     if (from && item.date < from) return false;
     if (to && item.date > to) return false;
    } else {
     if (origin && origin !== 'combined' && item.origin !== origin) return false;
     if (target === 'event') {
      if (eventFrom && item.start < eventFrom) return false;
      if (eventTo && item.start > eventTo) return false;
     }
    }
    return true;
   });
   if (target === 'event') matches.sort((a,b) => $(options, '[name="event-sort"]').value === 'startDate' ? a.start.localeCompare(b.start) : b.created.localeCompare(a.created));
   renderItems(matches, query);
   phone.dataset.phase = 'results';
   updateHeight();
   timer = 0;
  }, 350);
 }

 searchToggle.addEventListener('click', () => setOpen(!open, searchToggle));
 scrim.addEventListener('click', () => { if (open) setOpen(false); else closeTimelineMenu(); });
 form.addEventListener('submit', event => { event.preventDefault(); if (!composing) search(); });
 input.addEventListener('compositionstart', () => { composing = true; });
 input.addEventListener('compositionend', () => { composing = false; });
 input.addEventListener('keydown', event => { if (event.key === 'Enter' && (event.isComposing || composing || event.keyCode === 229)) event.preventDefault(); });
 input.addEventListener('input', () => { clearButton.hidden = !input.value; cancelSearch(); lastSubmitted = ''; clearResults(); });
 input.addEventListener('focus', updateViewport);
 input.addEventListener('blur', () => window.setTimeout(updateViewport, 30));
 clearButton.addEventListener('click', () => { input.value = ''; clearButton.hidden = true; cancelSearch(); lastSubmitted = ''; clearResults(); input.focus(); });
 targetSelect.addEventListener('change', () => {
  targetIcon.setAttribute('href', {note:'#i-pen',user:'#i-users',event:'#i-calendar'}[targetSelect.value]);
  cancelSearch(); lastSubmitted = ''; clearResults(); refreshOptions();
 });
 optionsButton.addEventListener('click', () => { closePicker(false); options.hidden = !options.hidden; refreshOptions(); });
 $(options, '[name="note-scope"]').addEventListener('change', refreshOptions);
 options.addEventListener('change', () => { if (lastSubmitted) search(); });
 searchBody.addEventListener('focusin', updateViewport);
 searchBody.addEventListener('focusout', () => window.setTimeout(updateViewport, 30));
 searchBody.addEventListener('focusout', () => window.setTimeout(() => {
  if (activePicker && !pickerPanel.contains(document.activeElement) && document.activeElement !== pickerTrigger) closePicker(false);
 }, 0));

 shell.addEventListener('keydown', event => {
  if (!open) return;
  if (event.key === 'Escape') {
   event.preventDefault();
   event.stopPropagation();
   if (activePicker) closePicker();
   else if (!options.hidden) { options.hidden = true; refreshOptions(); optionsButton.focus(); }
   else setOpen(false);
   return;
  }
  if (event.key !== 'Tab') return;
  const focusable = $$(shell, 'button:not([disabled]), input:not([disabled]), select:not([disabled])').filter(item => !item.closest('[inert]') && !item.closest('[hidden]') && item.getClientRects().length);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
 });
 document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && open && phone.contains(document.activeElement)) { event.preventDefault(); setOpen(false); }
  if (event.key === 'Escape' && timelineMenu && !timelineMenu.hidden && phone.contains(document.activeElement)) closeTimelineMenu();
 });
 document.addEventListener('focusin', event => {
  if (open && activeSearch?.phone === phone && !shell.contains(event.target)) input.focus({preventScroll:true});
 });

 function closeTimelineMenu() {
  if (!timelineMenu || timelineMenu.hidden) return;
  timelineMenu.hidden = true;
  home.setAttribute('aria-expanded', 'false');
  hideScrim();
  home.focus({preventScroll:true});
 }

 if (home) {
  home.addEventListener('pointerdown', event => {
   if (event.button !== 0 || open) return;
   held = false;
   holdTimer = window.setTimeout(() => {
    held = true;
    timelineMenu.hidden = false;
    home.setAttribute('aria-expanded', 'true');
    showScrim();
    requestAnimationFrame(() => { timelineMenu.querySelector('button').focus({preventScroll:true}); });
   }, 500);
  });
  const cancelHold = () => { window.clearTimeout(holdTimer); holdTimer = 0; };
  home.addEventListener('pointerup', cancelHold);
  home.addEventListener('pointercancel', cancelHold);
  home.addEventListener('pointerleave', cancelHold);
  home.addEventListener('contextmenu', event => event.preventDefault());
  home.addEventListener('click', () => {
   if (held) { held = false; return; }
   if (!timelineMenu.hidden) { closeTimelineMenu(); return; }
   $(phone, '.feed').scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  });
  $$(timelineMenu, '[data-timeline]').forEach(button => button.addEventListener('click', () => {
   $(phone, '.feed-heading b').textContent = button.dataset.timeline;
   closeTimelineMenu();
  }));
 }

 for (const action of mockActions) action.addEventListener('click', () => {
  if (action.closest('.hata-dock') || action.closest('.uis-dock')) action.blur();
 });
 window.addEventListener('resize', updateViewport);
 window.visualViewport?.addEventListener('resize', updateViewport);
 window.visualViewport?.addEventListener('scroll', updateViewport);
 updateViewport();
}

document.querySelectorAll('.phone').forEach(initPhone);
document.querySelectorAll('[data-theme-button]').forEach(button => button.addEventListener('click', () => {
 document.body.dataset.theme = button.dataset.themeButton;
 document.querySelectorAll('[data-theme-button]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
}));
