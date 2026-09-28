/* SPDX-FileCopyrightText: Tolehata and hatasaba-project */
/* SPDX-License-Identifier: AGPL-3.0-only */
'use strict';

const pill = document.querySelector('#pill');
const svg = document.querySelector('#loading-ring');
const trail = document.querySelector('#trail');
const status = document.querySelector('#status');
const continuousButton = document.querySelector('#continuous');
const reducedCheckbox = document.querySelector('#reduced');
const media = matchMedia('(prefers-reduced-motion: reduce)');
const svgNamespace = 'http://www.w3.org/2000/svg';

// Short adjacent dashes share one phase: light moves along the rounded path,
// with a soft tail covering 27% of its length. The frame itself never rotates.
for (let index = 0; index < 32; index++) {
  const segment = document.createElementNS(svgNamespace, 'rect');
  segment.setAttribute('pathLength', '100');
  const phase = (31 - index) * 27 / 31;
  segment.style.setProperty('--phase', `${phase}px`);
  segment.style.setProperty('--phase-end', `${phase - 100}px`);
  segment.style.setProperty('--strength', String(.02 + .63 * Math.pow(index / 31, 1.8)));
  trail.append(segment);
}

function resizeRing() {
  const width = pill.clientWidth;
  const height = pill.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  for (const rectangle of svg.querySelectorAll('rect')) {
    rectangle.setAttribute('x', '1');
    rectangle.setAttribute('y', '1');
    rectangle.setAttribute('width', String(Math.max(0, width - 2)));
    rectangle.setAttribute('height', String(Math.max(0, height - 2)));
    rectangle.setAttribute('rx', '23');
    rectangle.setAttribute('ry', '23');
  }
}
const observer = new ResizeObserver(resizeRing);
observer.observe(pill);
resizeRing();

const timers = new Set();
let revision = 0;
let running = false;
let continuous = false;
let revealedAt = 0;
let visible = false;

function later(callback, delay, token = revision) {
  const timer = setTimeout(() => {
    timers.delete(timer);
    if (token === revision) callback();
  }, delay);
  timers.add(timer);
}

function clearTimers() {
  timers.forEach(timer => clearTimeout(timer));
  timers.clear();
}

function updateButton() {
  continuousButton.setAttribute('aria-pressed', String(continuous));
  continuousButton.textContent = continuous ? '読み込みを止める' : '継続する';
}

function reveal() {
  if (!running) return;
  visible = true;
  revealedAt = performance.now();
  pill.dataset.visible = 'true';
  pill.dataset.active = 'true';
  pill.dataset.paused = String(document.hidden);
  status.textContent = continuous ? '読み込み中 · 停止するまで続きます' : '読み込み中';
}

function finish() {
  running = false;
  continuous = false;
  pill.setAttribute('aria-busy', 'false');
  updateButton();
  if (!visible) {
    status.textContent = '読み込み完了 · 短い待ち時間は静かに';
    return;
  }
  later(() => {
    pill.dataset.visible = 'false';
    status.textContent = '読み込み完了';
    // Keep the moving trail alive through its fade, then remove its animation.
    later(() => { visible = false; pill.dataset.active = 'false'; pill.dataset.paused = 'true'; }, 250);
  }, Math.max(0, 500 - (performance.now() - revealedAt)));
}

function start(duration = null) {
  ++revision;
  clearTimers();
  running = true;
  continuous = duration === null;
  pill.setAttribute('aria-busy', 'true');
  pill.dataset.paused = String(document.hidden);
  updateButton();
  status.textContent = '読み込み中';
  if (visible) {
    pill.dataset.visible = 'true';
    revealedAt = performance.now();
  } else {
    later(reveal, 200);
  }
  if (duration !== null) later(finish, duration);
}

function stop() {
  ++revision;
  clearTimers();
  finish();
}

document.querySelector('#play').addEventListener('click', () => start(6000));
document.querySelector('#short').addEventListener('click', () => start(100));
continuousButton.addEventListener('click', () => continuous && running ? stop() : start());
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.classList.toggle('selected', tab === button);
    if (tab === button) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  start(6000);
}));
document.querySelector('#layout').addEventListener('change', event => { document.body.dataset.layout = event.target.value; });
document.querySelector('#theme').addEventListener('change', event => { document.body.dataset.theme = event.target.value; });
document.querySelector('#new-notes').addEventListener('change', event => { pill.dataset.newNotes = String(event.target.checked); });

function setColor(color) {
  document.body.style.setProperty('--accent', color);
  document.querySelector('#color').value = color;
  document.querySelectorAll('.swatch').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color.toLowerCase() === color.toLowerCase())));
}
document.querySelectorAll('.swatch').forEach(button => button.addEventListener('click', () => setColor(button.dataset.color)));
document.querySelector('#color').addEventListener('input', event => setColor(event.target.value));

function updateMotion() {
  document.body.dataset.motion = reducedCheckbox.checked || media.matches ? 'reduced' : 'full';
}
reducedCheckbox.checked = media.matches;
reducedCheckbox.addEventListener('change', updateMotion);
media.addEventListener('change', updateMotion);
updateMotion();
document.addEventListener('visibilitychange', () => { pill.dataset.paused = String(document.hidden || !visible); });
window.addEventListener('pagehide', () => { ++revision; clearTimers(); observer.disconnect(); });

// The first visit demonstrates the border without requiring another action.
start(6000);
