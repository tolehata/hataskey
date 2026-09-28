<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div ref="rootEl" class="feature" :data-motion="motion" :data-playing="playIntent && motion && pageVisible" :data-scene="scene">
  <div v-if="scene === 0" class="overview art" aria-label="PCとモバイルの新しい画面の説明用サンプル">
    <div class="overviewGlow"></div>
    <div class="desktopPreview" :style="{ zoom: overviewZoom }">
      <div class="appRail"><b>H</b><House/><Search/><Bell/><span>▢</span><span>✧</span><span>☼</span></div>
      <div class="previewTimeline"><div class="previewStream">
        <article class="previewNote"><span class="avatar">n</span><div><b>nagi <small>@nagi · 5分</small></b><p>帰り道、いい景色を見つけた。</p><span class="noteActions">↶　↻　❞　♡　···</span></div><span class="reaction">☺＋</span></article>
        <article class="previewNote"><span class="avatar green">m</span><div><b>mio <small>@mio · 12分</small></b><p>今日はゆっくり歩こう。</p><span class="noteActions">↶　↻　❞　♡　···</span></div><span class="reaction">☺＋</span></article>
      </div><div class="previewComposer">いま何してる？ <span>▦　♧　◎　↗</span></div></div>
      <div class="timelineRail"><House/><span>◉</span><span>◎</span><span>♧</span><span>☷</span><span>✦</span><span>···</span></div>
      <div class="rightPane"><div class="rightTabs"><span>▦ ウィジェット</span><b>▣ Hatask</b></div><div class="rightDay"><strong>9.29</strong><span>Hatask ›</span></div><div class="rightStats"><b>ToDo<em>0/0</em></b><b>予定<em>0</em></b><b>食事<em>0/3</em></b></div><div class="rightRow">きょうの予定 <span>0</span></div><div class="rightRow muted">きょうの予定はありません</div><div class="rightRow">ToDo <span>0/0</span></div></div>
    </div>
    <div class="overviewPhone"><article class="phoneNote"><span class="avatar">n</span><div><b>nagi <small>@nagi · 5分</small></b><p>帰り道、いい景色を見つけた。</p><span>↶　↻　❞　♡　···</span></div></article><article class="phoneNote"><span class="avatar green">m</span><div><b>mio <small>@mio · 12分</small></b><p>今日はゆっくり歩こう。</p><span>↶　↻　❞　♡　···</span></div></article><div class="overviewDock"><div>いま何してる？ <span>↗</span></div><nav>☰　⌕　⌂　♢　▣　▦</nav></div></div>
  </div>

  <div v-else-if="scene === 1" class="pcArt art">
    <div class="pcWindow" :data-mode="pcMode">
      <div class="pcRail"><b>H</b><button type="button" aria-label="ホームへ戻る" @click="onPcAction('home')"><House/></button><button type="button" aria-label="検索を開く" data-action="pc-search" @click="onPcAction('open')"><Search/></button><span><Bell/></span><span>▣</span><span class="railPen"><Pencil/></span></div>
      <div class="pcWorkspace"><div class="pcSide" :inert="pcMode === 'home'"><div class="paneHead"><strong>検索</strong><div><button type="button" data-action="pc-arrow" :aria-label="pcMode === 'full' ? '左右に並べる' : 'ページを広げる'" @click="onPcAction('toggle')"><ArrowLeftRight/></button><button type="button" data-action="pc-close" aria-label="ページを閉じる" @click="onPcAction('home')"><X/></button></div></div><div class="pcSearch">⌕　何を探しますか？</div><small class="resultLabel">おすすめの話題</small><div class="trend"># 今日の景色<small>3.2k ノート</small></div><div class="trend"># つくる時間<small>1.8k ノート</small></div><div class="trend"># Hataskey<small>新しいつながり</small></div></div>
      <div class="pcTimeline" :inert="pcMode === 'full'"><div class="pcTimelineMain"><div class="pcNotes"><article class="pcNote"><span class="avatar">n</span><div><b>nagi <small>@nagi · 5分</small></b><p>いつもの場所から、少し遠くへ。<br>ここで見つけた景色を残しておこう。</p><span class="noteActions">↶　↻　❞　♡　···</span></div><span class="reaction">☺＋</span></article><article class="pcNote"><span class="avatar green">m</span><div><b>mio <small>@mio · 12分</small></b><p>新しい発見がありそうな一日。</p><span class="noteActions">↶　↻　❞　♡　···</span></div><span class="reaction">☺＋</span></article></div><div class="pcComposer">いま何してる？ <span>▦　♧　◎　↗</span></div></div><div class="pcTimelineRail"><House/><span>◉</span><span>◎</span><span>♧</span><span>☷</span><span>✦</span><span>···</span></div></div></div>
    </div>
    <div ref="pcGhostEl" class="ghost arrowGhost" aria-hidden="true"><svg viewBox="0 0 20 25"><path class="cursorEdge" d="M0 0v18l5-4 4.3 8 3.3-1.8-4.3-8L16 12Z"/><path class="cursorFace" d="M0 0v18l5-4 4.3 8 3.3-1.8-4.3-8L16 12Z"/></svg></div>
    <p class="phaseCaption" aria-live="polite">{{ pcCaption }}</p>
  </div>

  <div v-else-if="scene === 2" class="mobileArt art">
    <div class="sideCaption"><span>長押し</span><strong aria-live="polite"><span v-for="(chunk, i) in mobileCaption" :key="i" class="captionChunk">{{ chunk }}</span></strong><small>ホームのタップで、表示中のタイムラインの上部へ。</small><small aria-live="polite">表示中：{{ currentTimeline }}</small></div>
    <div class="demoPhone"><div ref="timelineFeedEl" class="demoFeed"><article><span class="avatar">n</span><div><b>nagi <small>@nagi</small></b><p>お気に入りの道をひとつ増やした。</p><span>↶　↻　❞　☺＋　···</span></div></article><article><span class="avatar green">m</span><div><b>mio <small>@mio</small></b><p>今日の空、やさしい色。</p><span>↶　↻　❞　☺＋　···</span></div></article></div>
      <div class="glassDock" :data-open="timelineOpen"><div class="dockBody"><div class="dockComposer">いま何してる？ <span>＋　↗</span></div><div class="tlPicker" :inert="!timelineOpen"><div class="pickerTitle">タイムラインを選ぶ <span>↕</span></div><div v-if="!pickerBranch" class="pickerGrid"><button v-for="option in timelineOptions" :key="option" type="button" :data-timeline="option" :class="{ target: candidate === option }" @click="chooseTimeline(option)">{{ option }}{{ option === 'リスト' || option === 'アンテナ' ? ' ›' : '' }}</button></div><div v-else class="pickerBranch"><button type="button" @click="pickerBranch = null">← 戻る</button><button type="button" @click="chooseBranch">{{ pickerBranch === 'リスト' ? 'つくる人たち' : '写真のアンテナ' }}</button></div></div></div><nav class="dockNav" aria-label="モバイルナビゲーション"><span><Menu/></span><span><Search/></span><button ref="homeButtonEl" type="button" class="homeButton" :aria-label="timelineOpen ? 'タイムライン一覧を閉じる' : 'ホーム。長押しでタイムラインを選ぶ'" :aria-expanded="timelineOpen" @pointerdown="homePointerDown" @pointermove="homePointerMove" @pointerup="homePointerUp" @pointercancel="homePointerCancel" @click="homeClick" @keydown="homeKeydown"><X v-if="timelineOpen"/><House v-else/></button><span><Bell/></span><span>▣</span><span>▦</span></nav></div>
    </div>
    <div ref="mobileGhostEl" class="ghost touchGhost" aria-hidden="true"><span></span></div>
  </div>

  <div v-else class="searchArt art"><div class="sideCaption searchCaption"><span>検索</span><strong aria-live="polite"><span v-for="(chunk, i) in searchCaption" :key="i" class="captionChunk">{{ chunk }}</span></strong><small>思いついた言葉から、その場で。</small></div>
    <div class="demoPhone"><div class="demoFeed"><article><span class="avatar">n</span><div><b>nagi <small>@nagi</small></b><p>小さな発見を、ここに。</p><span>↶　↻　❞　☺＋　···</span></div></article><article><span class="avatar green">m</span><div><b>mio <small>@mio</small></b><p>新しいお気に入りを探そう。</p><span>↶　↻　❞　☺＋　···</span></div></article></div>
      <div class="glassDock" :data-open="searchOpen"><div class="dockBody"><div class="dockComposer">いま何してる？ <span>＋　↗</span></div><div class="searchPanel" :inert="!searchOpen"><label>Hataskey を検索<input ref="searchInputEl" v-model="searchDraft" type="search" placeholder="ノート、ユーザー、話題" autocomplete="off" @input="manualStop" @keydown.esc.prevent="closeSearchFromKeyboard"></label><div class="suggestions"><span>人気の話題</span><b># 今日の景色</b><b># つくる時間</b></div></div></div><nav class="dockNav" aria-label="検索の操作"><span><Menu/></span><button ref="searchButtonEl" type="button" :aria-label="searchOpen ? '検索を閉じる' : '検索を開く'" :aria-expanded="searchOpen" @click="toggleSearch"><X v-if="searchOpen"/><Search v-else/></button><span><House/></span><span><Bell/></span><span>▣</span><span>▦</span></nav></div>
    </div><div ref="searchGhostEl" class="ghost arrowGhost" aria-hidden="true"><svg viewBox="0 0 20 25"><path class="cursorEdge" d="M0 0v18l5-4 4.3 8 3.3-1.8-4.3-8L16 12Z"/><path class="cursorFace" d="M0 0v18l5-4 4.3 8 3.3-1.8-4.3-8L16 12Z"/></svg></div>
  </div>

  <div v-if="scene !== 0" class="demoControls"><span class="sampleLabel"><Sparkles/> 説明用のサンプル</span><div><button type="button" :aria-label="!motion ? '動きを減らして表示中' : !pageVisible ? '画面を離れている間は一時停止' : playIntent ? 'デモを一時停止' : 'デモを再生'" :title="!motion ? '動きを減らして表示中' : !pageVisible ? '画面を離れている間は一時停止' : playIntent ? 'デモを一時停止' : 'デモを再生'" :aria-pressed="playIntent && motion && pageVisible" :disabled="!motion || !pageVisible" @click="togglePlay"><Pause v-if="playIntent && motion && pageVisible"/><Play v-else/></button><button type="button" aria-label="この章をもう一度再生" :title="motion ? 'この章をもう一度再生' : '動きを減らして表示中'" :disabled="!motion" @click="replay"><RotateCcw/></button></div></div>
  <p class="artFoot">{{ scene === 0 ? 'ひと続きの、新しい UI S 2。' : scene === 1 ? '見たいものを、同時に見られる。' : scene === 2 ? '親指の近くで、タイムラインを選ぶ。' : 'やりたいことは、すぐ手元に。' }}</p>
</div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ArrowLeftRight, Bell, House, Menu, Pause, Pencil, Play, RotateCcw, Search, Sparkles, X } from '@lucide/vue';

const props = defineProps<{ scene: 0 | 1 | 2 | 3; motion: boolean }>();
const rootEl = ref<HTMLElement | null>(null);
const pcGhostEl = ref<HTMLElement | null>(null);
const mobileGhostEl = ref<HTMLElement | null>(null);
const searchGhostEl = ref<HTMLElement | null>(null);
const homeButtonEl = ref<HTMLButtonElement | null>(null);
const searchButtonEl = ref<HTMLButtonElement | null>(null);
const searchInputEl = ref<HTMLInputElement | null>(null);
const timelineFeedEl = ref<HTMLElement | null>(null);
const overviewZoom = ref(1);
const playIntent = ref(true);
const pcMode = ref<'home' | 'split' | 'full'>('home');
const timelineOpen = ref(false);
const searchOpen = ref(false);
const pickerBranch = ref<'リスト' | 'アンテナ' | null>(null);
const candidate = ref<string | null>(null);
const currentTimeline = ref('ホーム');
const searchDraft = ref('');
const pcCaption = ref('サイドの「検索」へ。');
const mobileCaption = ref(['ホームに', '指を置きます。']);
const searchCaption = ref(['検索ボタンへ。']);
const timelineOptions = ['ホーム', 'ローカル', 'ソーシャル', 'グローバル', 'リスト', 'アンテナ'];

let timer: ReturnType<typeof setTimeout> | undefined;
let timerDeadline = 0;
let timerRemaining = 0;
let phase = 0;
let generation = 0;
const pageVisible = ref(true);
let mounted = false;
let holdTimer: ReturnType<typeof setTimeout> | undefined;
let focusTimer: ReturnType<typeof setTimeout> | undefined;
let holding = false;
let suppressHomeClick = false;
let pointerStart: { x: number; y: number } | null = null;
type Ghost = { el: HTMLElement | null; parent: HTMLElement | null; from: HTMLElement | null; target: HTMLElement | null; duration: number; elapsed: number; last: number; raf: number };
const ghost: Ghost = { el: null, parent: null, from: null, target: null, duration: 0, elapsed: 0, last: 0, raf: 0 };

function active() { return mounted && props.motion && pageVisible.value && playIntent.value; }
function clearTimer() { if (timer != null) clearTimeout(timer); timer = undefined; timerDeadline = 0; }
function pauseClock() { if (timer != null) timerRemaining = Math.max(0, timerDeadline - performance.now()); clearTimer(); if (ghost.raf) cancelAnimationFrame(ghost.raf); ghost.raf = 0; ghost.last = 0; }
function schedule(ms: number) {
  clearTimer(); timerRemaining = ms;
  if (!active()) return;
  const version = generation;
  timerDeadline = performance.now() + ms;
  timer = setTimeout(() => { timer = undefined; timerDeadline = 0; if (version === generation && active()) advance(); }, ms);
}
function resumeClock() { if (!active()) return; schedule(timerRemaining || 600); if (ghost.el && !ghost.raf) ghost.raf = requestAnimationFrame(tickGhost); }
function point(target: HTMLElement, parent: HTMLElement) {
  const r = target.getBoundingClientRect(), p = parent.getBoundingClientRect();
  const sx = p.width / (parent.offsetWidth || p.width || 1), sy = p.height / (parent.offsetHeight || p.height || 1);
  return { x: (r.left + r.width / 2 - p.left) / sx - parent.clientLeft + parent.scrollLeft, y: (r.top + r.height / 2 - p.top) / sy - parent.clientTop + parent.scrollTop };
}
function drawGhost() {
  if (!ghost.el || !ghost.parent || !ghost.target) return;
  const to = point(ghost.target, ghost.parent), from = ghost.from ? point(ghost.from, ghost.parent) : to;
  const t = ghost.duration ? Math.min(1, ghost.elapsed / ghost.duration) : 1;
  const q = t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2, u = 1 - q;
  const dx = to.x - from.x, dy = to.y - from.y, distance = Math.hypot(dx, dy), bend = Math.min(28, distance * .15);
  const nx = distance ? -dy / distance : 0, ny = distance ? dx / distance : 0;
  const clamp = (v: number, limit: number) => Math.max(5, Math.min(limit - 5, v));
  const c1 = { x: clamp(from.x + dx * .28 + nx * bend, ghost.parent.clientWidth), y: clamp(from.y + dy * .28 + ny * bend, ghost.parent.clientHeight) };
  const c2 = { x: clamp(from.x + dx * .72 + nx * bend, ghost.parent.clientWidth), y: clamp(from.y + dy * .72 + ny * bend, ghost.parent.clientHeight) };
  ghost.el.style.left = `${u ** 3 * from.x + 3 * u ** 2 * q * c1.x + 3 * u * q ** 2 * c2.x + q ** 3 * to.x}px`;
  ghost.el.style.top = `${u ** 3 * from.y + 3 * u ** 2 * q * c1.y + 3 * u * q ** 2 * c2.y + q ** 3 * to.y}px`;
}
function tickGhost(now: number) {
  ghost.raf = 0; if (!active() || !ghost.el) return;
  if (ghost.last) ghost.elapsed = Math.min(ghost.duration, ghost.elapsed + now - ghost.last);
  ghost.last = now; drawGhost(); ghost.raf = requestAnimationFrame(tickGhost);
}
function hideGhost() {
  if (ghost.raf) cancelAnimationFrame(ghost.raf);
  ghost.raf = 0; ghost.last = 0;
  rootEl.value?.querySelectorAll('.demoPressed, [data-demo-target]').forEach(el => { el.classList.remove('demoPressed'); el.removeAttribute('data-demo-target'); });
  ghost.el?.classList.remove('visible', 'pressed');
  ghost.el = ghost.parent = ghost.from = ghost.target = null;
  ghost.duration = ghost.elapsed = 0;
}
function placeGhost(el: HTMLElement | null, target: HTMLElement | null) {
  hideGhost(); if (!el || !target) return;
  ghost.el = el; ghost.parent = el.offsetParent as HTMLElement || rootEl.value; ghost.target = target;
  el.classList.add('visible'); target.setAttribute('data-demo-target', ''); drawGhost();
  if (active()) ghost.raf = requestAnimationFrame(tickGhost);
}
function moveGhost(target: HTMLElement | null, duration: number) {
  if (!ghost.el || !target) return;
  ghost.target?.removeAttribute('data-demo-target'); ghost.from = ghost.target; ghost.target = target;
  target.setAttribute('data-demo-target', ''); ghost.duration = duration; ghost.elapsed = ghost.last = 0; drawGhost();
}
function pressGhost(on: boolean) {
  ghost.el?.classList.toggle('pressed', on);
  rootEl.value?.querySelectorAll('.demoPressed').forEach(el => el.classList.remove('demoPressed'));
  if (on) ghost.target?.classList.add('demoPressed');
}
function target(selector: string) { return rootEl.value?.querySelector<HTMLElement>(selector) ?? null; }
function manualStop() { if (playIntent.value) { playIntent.value = false; pauseClock(); } hideGhost(); }
function reset() {
  generation++; pauseClock(); hideGhost();
  rootEl.value?.setAttribute('data-demo-phase', 'idle');
  if (holdTimer) clearTimeout(holdTimer); if (focusTimer) clearTimeout(focusTimer);
  holdTimer = focusTimer = undefined; holding = false; pointerStart = null; suppressHomeClick = false;
  pcMode.value = 'home'; timelineOpen.value = searchOpen.value = false; pickerBranch.value = null; candidate.value = null; currentTimeline.value = 'ホーム';
  pcCaption.value = 'サイドの「検索」へ。'; mobileCaption.value = ['ホームに', '指を置きます。']; searchCaption.value = ['検索ボタンへ。']; phase = 0;
  timerRemaining = 650; if (active()) schedule(650);
}
function togglePlay() { playIntent.value = !playIntent.value; if (playIntent.value) resumeClock(); else pauseClock(); }
function replay() { playIntent.value = true; reset(); }
function onPcAction(action: 'home' | 'open' | 'toggle') { manualStop(); if (action === 'home') pcMode.value = 'home'; else if (action === 'open') pcMode.value = 'split'; else pcMode.value = pcMode.value === 'full' ? 'split' : 'full'; }
function chooseTimeline(name: string) {
  manualStop(); if (name === 'リスト' || name === 'アンテナ') { pickerBranch.value = name; return; }
  currentTimeline.value = name; timelineOpen.value = false; pickerBranch.value = null;
}
function chooseBranch() { currentTimeline.value = pickerBranch.value === 'リスト' ? 'つくる人たち' : '写真のアンテナ'; pickerBranch.value = null; timelineOpen.value = false; }
function homePointerDown(event: PointerEvent) {
  if (event.button !== 0) return; manualStop(); holding = false; pointerStart = { x: event.clientX, y: event.clientY };
  homeButtonEl.value?.setPointerCapture(event.pointerId);
  holdTimer = setTimeout(() => { holding = true; suppressHomeClick = true; timelineOpen.value = true; }, 500);
}
function homePointerMove(event: PointerEvent) { if (!pointerStart || holding) return; if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 12) { if (holdTimer) clearTimeout(holdTimer); pointerStart = null; } }
function homePointerUp(event: PointerEvent) {
  if (holdTimer) clearTimeout(holdTimer); pointerStart = null; if (!holding) return;
  const choice = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-timeline]');
  if (choice && rootEl.value?.contains(choice)) chooseTimeline(choice.dataset.timeline || 'ホーム');
  holding = false;
}
function homePointerCancel() { if (holdTimer) clearTimeout(holdTimer); pointerStart = null; holding = false; }
function homeClick(event: MouseEvent) { if (suppressHomeClick) { event.preventDefault(); suppressHomeClick = false; return; } manualStop(); if (timelineOpen.value) timelineOpen.value = false; else timelineFeedEl.value?.scrollTo({ top: 0, behavior: props.motion ? 'smooth' : 'instant' }); }
function homeKeydown(event: KeyboardEvent) { if (event.key === 'ArrowUp' || event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey) { event.preventDefault(); manualStop(); timelineOpen.value = true; } }
function toggleSearch() { manualStop(); searchOpen.value = !searchOpen.value; if (focusTimer) clearTimeout(focusTimer); if (searchOpen.value) focusTimer = setTimeout(() => { if (props.scene === 3 && searchOpen.value) searchInputEl.value?.focus({ preventScroll: true }); }, props.motion ? 350 : 0); }
function closeSearchFromKeyboard() { searchOpen.value = false; searchButtonEl.value?.focus({ preventScroll: true }); }

function advance() {
  if (props.scene === 0) return;
  rootEl.value?.setAttribute('data-demo-phase', `${props.scene}:${phase}`);
  if (props.scene === 1) {
    const n = phase % 12; let wait = 800;
    if (n === 0) { placeGhost(pcGhostEl.value, target('.pcRail button')); moveGhost(target('[data-action="pc-search"]'), 1180); pcCaption.value = 'サイドの「検索」へ。'; wait = 1230; }
    if (n === 1) { pressGhost(true); pcCaption.value = '「検索」を開きます。'; wait = 440; }
    if (n === 2) { pcMode.value = 'split'; pressGhost(false); pcCaption.value = '検索は左に。タイムラインは右に。'; wait = 2200; }
    if (n === 3) { moveGhost(target('[data-action="pc-arrow"]'), 1080); pcCaption.value = '左右矢印へ。'; wait = 1130; }
    if (n === 4) { pressGhost(true); pcCaption.value = 'ページを広げます。'; wait = 440; }
    if (n === 5) { pcMode.value = 'full'; pressGhost(false); pcCaption.value = 'ページいっぱいに、じっくりと。'; wait = 2400; }
    if (n === 6) { pressGhost(true); pcCaption.value = '同じ矢印でもう一度。'; wait = 440; }
    if (n === 7) { pcMode.value = 'split'; pressGhost(false); pcCaption.value = 'ふたつの画面が並びます。'; wait = 2200; }
    if (n === 8) { moveGhost(target('[data-action="pc-close"]'), 860); pcCaption.value = '×へ。'; wait = 910; }
    if (n === 9) { pressGhost(true); pcCaption.value = '×でページを閉じます。'; wait = 440; }
    if (n === 10) { pressGhost(false); hideGhost(); pcMode.value = 'home'; pcCaption.value = 'いつものホームに戻ります。'; wait = 2000; }
    if (n === 11) { hideGhost(); wait = 900; }
    phase++; schedule(wait); return;
  }
  if (props.scene === 2) {
    const n = phase % 7; let wait = 850;
    if (n === 0) { placeGhost(mobileGhostEl.value, homeButtonEl.value); mobileCaption.value = ['ホームに', '指を置きます。']; wait = 1000; }
    if (n === 1) { pressGhost(true); mobileCaption.value = ['ホームを', '長押しします。']; wait = 1400; }
    if (n === 2) { timelineOpen.value = true; mobileCaption.value = ['指を置いたまま、', '一覧へ。']; wait = 2500; }
    if (n === 3) { moveGhost(target('[data-timeline="ローカル"]'), 1600); mobileCaption.value = ['ローカルへ', '滑らせます。']; wait = 1750; }
    if (n === 4) { pressGhost(false); candidate.value = 'ローカル'; mobileCaption.value = ['行き先で、', '指を離します。']; wait = 1100; }
    if (n === 5) { hideGhost(); currentTimeline.value = 'ローカル'; timelineOpen.value = false; candidate.value = null; mobileCaption.value = ['ローカルに', '切り替わります。']; wait = 4000; }
    if (n === 6) { hideGhost(); mobileCaption.value = ['ホームのタップで', '上部へ。']; wait = 2000; }
    phase++; schedule(wait); return;
  }
  const n = phase % 8; let wait = 850;
  if (n === 0) { placeGhost(searchGhostEl.value, target('.searchArt .dockComposer')); moveGhost(searchButtonEl.value, 1600); searchCaption.value = ['検索ボタンへ。']; wait = 1750; }
  if (n === 1) { pressGhost(true); searchCaption.value = ['検索を', '開きます。']; wait = 650; }
  if (n === 2) { searchOpen.value = true; pressGhost(false); searchCaption.value = ['ドックの中に', '検索が現れます。']; wait = 3000; }
  if (n === 3) { searchCaption.value = ['気になる話題を、', 'その場で。']; wait = 3500; }
  if (n === 4) { moveGhost(searchButtonEl.value, 850); searchCaption.value = ['同じボタンから', '戻れます。']; wait = 1200; }
  if (n === 5) { pressGhost(true); searchCaption.value = ['×で検索を', '閉じます。']; wait = 650; }
  if (n === 6) { searchOpen.value = false; pressGhost(false); searchCaption.value = ['いつもの', '投稿フォームへ。']; wait = 4000; }
  if (n === 7) { hideGhost(); wait = 1800; }
  phase++; schedule(wait);
}
function fitOverview() {
  const art = rootEl.value?.querySelector<HTMLElement>('.overview');
  const phone = rootEl.value?.querySelector<HTMLElement>('.overviewPhone');
  if (!art || !phone || !art.clientWidth) return;
  const margin = parseFloat(getComputedStyle(phone).marginLeft) || 0;
  overviewZoom.value = Math.min(1, Math.max(.24, (art.clientWidth - phone.getBoundingClientRect().width - margin - 5) / 760));
}
function onVisibility() { pageVisible.value = !document.hidden; if (!pageVisible.value) pauseClock(); else resumeClock(); }
function onResize() { fitOverview(); drawGhost(); }
watch(() => props.scene, async () => { reset(); await nextTick(); fitOverview(); if (active()) resumeClock(); });
watch(() => props.motion, value => { if (!value) pauseClock(); else resumeClock(); });
onMounted(() => { mounted = true; pageVisible.value = !document.hidden; document.addEventListener('visibilitychange', onVisibility); window.addEventListener('resize', onResize); reset(); nextTick(fitOverview); });
onBeforeUnmount(() => { mounted = false; generation++; pauseClock(); hideGhost(); if (holdTimer) clearTimeout(holdTimer); if (focusTimer) clearTimeout(focusTimer); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('resize', onResize); });
</script>

<style scoped>
.feature{--ui-bg:var(--MI_THEME-bg,#f7f4f1);--ui-panel:var(--MI_THEME-panel,#fff);--ui-soft:var(--MI_THEME-panelHeaderBg,#f2eeec);--ui-line:var(--MI_THEME-divider,#ded5d7);--ui-text:var(--MI_THEME-fg,#28232a);--ui-muted:var(--MI_THEME-fgMuted,#837881);--ui-accent:var(--MI_THEME-accent,#db6b9c);--ui-tint:color-mix(in srgb,var(--ui-accent) 15%,var(--ui-panel));display:block;container:uis-feature / inline-size;width:100%;min-width:0;color:var(--ui-text);font-family:'LINE Seed JP',system-ui,sans-serif;font-size:12px;line-height:1.5}.feature *{box-sizing:border-box}.feature button{font:inherit;cursor:pointer}.feature button:focus-visible,.feature input:focus-visible{outline:2px solid var(--ui-accent);outline-offset:2px}.feature svg{width:18px;height:18px;flex:none;stroke-width:1.8}.art{position:relative;width:100%;min-width:0}.overview{display:flex;align-items:center;justify-content:center;min-height:326px;overflow:hidden}.overviewGlow{position:absolute;width:70%;height:88%;border-radius:50%;background:radial-gradient(ellipse,color-mix(in srgb,var(--ui-accent) 18%,transparent),transparent 70%);filter:blur(24px);pointer-events:none}.desktopPreview,.overviewPhone,.pcWindow,.demoPhone{position:relative;border:1px solid var(--ui-line);background:var(--ui-panel);box-shadow:0 17px 40px color-mix(in srgb,var(--ui-text) 18%,transparent)}.desktopPreview{display:flex;flex:none;width:760px;height:290px;overflow:hidden;border-radius:13px;transform:rotate(-3deg) translateX(25px);transform-origin:center}.feature[data-motion=true] .desktopPreview{animation:deskFloat 6s ease-in-out infinite}.appRail,.pcRail{display:flex;flex:none;flex-direction:column;align-items:center;gap:16px;width:46px;padding:12px 5px;background:var(--ui-soft);border-right:1px solid var(--ui-line);color:var(--ui-muted)}.appRail b,.pcRail b{font:26px Righteous,sans-serif;color:var(--ui-accent)}.appRail svg,.pcRail svg{width:17px;height:17px}.appRail svg:first-of-type{color:var(--ui-accent)}.appRail span{font-size:17px;line-height:1}.previewTimeline{display:flex;flex:1;flex-direction:column;min-width:0}.previewStream{flex:1;min-height:0;overflow:hidden}.previewNote,.pcNote{position:relative;display:flex;gap:10px;min-width:0;min-height:98px;padding:14px 45px 12px 13px;border-bottom:1px solid var(--ui-line);font-size:11px}.previewNote>div,.pcNote>div{min-width:0}.previewNote b,.pcNote b{white-space:nowrap}.previewNote small,.pcNote small{font-size:9px;color:var(--ui-muted);font-weight:400}.previewNote p,.pcNote p{margin:8px 0 10px;line-height:1.6}.noteActions{color:var(--ui-muted);white-space:nowrap;letter-spacing:.1em;font-size:10px}.avatar{display:grid;place-items:center;flex:none;width:30px;height:30px;border-radius:50%;background:color-mix(in srgb,var(--ui-accent) 25%,var(--ui-panel));color:var(--ui-accent);font:17px Righteous,sans-serif}.avatar.green{background:#d3dfc5;color:#58724b}.reaction{position:absolute;top:15px;right:10px;display:grid;place-items:center;width:27px;height:31px;border-left:1px solid var(--ui-line);color:var(--ui-muted);font-size:13px}.previewComposer,.pcComposer{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:51px;margin:4px 7px 7px;padding:9px 12px;border:1px solid var(--ui-line);border-radius:10px;background:var(--ui-soft);color:var(--ui-muted);font-size:11px;white-space:nowrap}.previewComposer span,.pcComposer span{color:var(--ui-accent)}.timelineRail,.pcTimelineRail{display:flex;flex:none;flex-direction:column;align-items:center;justify-content:center;gap:13px;width:46px;border-left:1px solid var(--ui-line);background:var(--ui-soft);color:var(--ui-muted);font-size:15px}.timelineRail svg,.pcTimelineRail svg{color:var(--ui-accent)}.rightPane{flex:none;width:178px;overflow:hidden;border-left:1px solid var(--ui-line);background:var(--ui-soft);font-size:9px}.rightTabs{display:flex;justify-content:space-around;align-items:center;height:40px;border-bottom:1px solid var(--ui-line);color:var(--ui-muted);white-space:nowrap}.rightTabs b{font:11px Righteous,sans-serif;color:var(--ui-accent)}.rightDay{display:flex;justify-content:space-between;align-items:center;padding:13px 11px;border-bottom:1px solid var(--ui-line)}.rightDay strong{font:22px Righteous,sans-serif}.rightDay span{color:var(--ui-accent)}.rightStats{display:flex;border-bottom:1px solid var(--ui-line)}.rightStats b{display:flex;flex:1;flex-direction:column;padding:8px 7px;border-right:1px solid var(--ui-line);font-size:9px}.rightStats em{font:15px Righteous,sans-serif;color:var(--ui-accent);font-style:normal}.rightRow{display:flex;justify-content:space-between;padding:10px 11px;border-bottom:1px solid var(--ui-line);font-weight:700}.rightRow.muted{color:var(--ui-muted);font-weight:400;font-size:8px}.overviewPhone{flex:none;width:175px;height:324px;margin-left:-34px;overflow:hidden;border:5px solid var(--ui-text);border-radius:27px;transform:rotate(7deg) translateY(14px)}.feature[data-motion=true] .overviewPhone{animation:phoneFloat 5.6s ease-in-out infinite}.phoneNote{display:flex;gap:5px;min-height:94px;padding:12px 7px;border-bottom:1px solid var(--ui-line);font-size:8px}.phoneNote .avatar{width:22px;height:22px;font-size:12px}.phoneNote>div{min-width:0}.phoneNote small{color:var(--ui-muted);font-size:6px}.phoneNote p{margin:7px 0}.phoneNote div>span{color:var(--ui-muted);white-space:nowrap;font-size:7px}.overviewDock{position:absolute;right:6px;bottom:6px;left:6px;padding:8px 8px 5px;border:1px solid var(--ui-line);border-radius:17px;background:color-mix(in srgb,var(--ui-panel) 86%,transparent);box-shadow:0 7px 20px color-mix(in srgb,var(--ui-text) 25%,transparent);backdrop-filter:blur(12px);font-size:9px}.overviewDock>div{display:flex;justify-content:space-between;color:var(--ui-muted)}.overviewDock nav{margin-top:8px;text-align:center;white-space:nowrap;font-size:14px;color:var(--ui-text)}@keyframes deskFloat{50%{transform:rotate(-2deg) translate(25px,-6px)}}@keyframes phoneFloat{50%{transform:rotate(6deg) translateY(7px)}}
.pcArt{min-height:335px;padding:20px 20px 0}.pcWindow{display:flex;width:min(780px,100%);height:290px;margin:auto;border-radius:12px;overflow:hidden}.pcRail{align-items:stretch;gap:4px;width:64px;padding:10px 8px}.pcRail b{text-align:center;min-height:40px}.pcRail button,.pcRail>span{display:grid;place-items:center;width:44px;height:43px;padding:0;border:0;border-radius:10px;background:transparent;color:var(--ui-muted)}.pcRail button:hover,.pcRail button.demoPressed{background:var(--ui-tint);color:var(--ui-accent)}.pcRail .railPen{margin-top:auto;color:var(--ui-accent)}.pcWorkspace{display:grid;grid-template-columns:0fr minmax(0,1fr);flex:1;min-width:0;transition:grid-template-columns .58s cubic-bezier(.22,1,.36,1)}.pcWindow[data-mode=split] .pcWorkspace{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.pcWindow[data-mode=full] .pcWorkspace{grid-template-columns:minmax(0,1fr) 0fr}.pcSide,.pcTimeline{min-width:0;overflow:hidden}.pcSide{background:var(--ui-soft);border-right:1px solid var(--ui-line)}.paneHead{display:flex;align-items:center;justify-content:space-between;gap:3px;height:49px;min-width:0;padding:0 12px;border-bottom:1px solid var(--ui-line)}.paneHead strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.paneHead>div{display:flex;flex:none}.paneHead button{display:grid;place-items:center;width:34px;height:34px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--ui-muted)}.paneHead button:hover,.paneHead button.demoPressed{background:var(--ui-tint);color:var(--ui-accent)}.paneHead button svg{width:15px;height:15px}.pcSearch{min-width:165px;margin:12px;padding:10px;border:1px solid var(--ui-line);border-radius:9px;color:var(--ui-muted);font-size:10px}.resultLabel{display:block;min-width:165px;padding:4px 13px;color:var(--ui-muted);font-size:10px}.trend{min-width:165px;padding:9px 13px;border-bottom:1px solid var(--ui-line);font-size:10px}.trend small{display:block;color:var(--ui-muted);font-size:9px}.pcTimeline{display:flex}.pcTimelineMain{display:flex;flex:1;flex-direction:column;min-width:0}.pcNotes{flex:1;min-height:0;overflow:hidden}.pcNote{min-height:94px}.pcComposer{flex:none}.pcTimelineRail{gap:10px;width:40px;font-size:13px}.pcTimelineRail svg{width:16px;height:16px}.phaseCaption{min-height:30px;margin:10px auto 0;text-align:center;color:var(--ui-accent);font-size:11px;text-wrap:balance}
.mobileArt,.searchArt{display:flex;justify-content:center;align-items:center;gap:45px;min-height:355px}.sideCaption{display:flex;flex-direction:column;gap:10px;width:180px;min-width:0}.sideCaption>span{color:var(--ui-accent);font:11px Righteous,'LINE Seed JP',sans-serif;letter-spacing:.1em}.sideCaption strong{display:block;min-height:3.2em;font-size:18px;line-height:1.5;text-wrap:balance}.captionChunk{display:inline-block;max-width:100%;white-space:nowrap}.sideCaption small{color:var(--ui-muted);font-size:11px;line-height:1.6;text-wrap:pretty}.demoPhone{flex:none;width:222px;height:345px;overflow:hidden;border:5px solid var(--ui-text);border-radius:29px}.demoFeed{height:280px;overflow:hidden}.demoFeed article{display:flex;gap:8px;min-height:96px;padding:13px 9px;border-bottom:1px solid var(--ui-line);font-size:10px}.demoFeed article>div{min-width:0}.demoFeed article .avatar{width:26px;height:26px;font-size:15px}.demoFeed article small{font-size:9px;color:var(--ui-muted)}.demoFeed article p{margin:8px 0 10px}.demoFeed article div>span{color:var(--ui-muted);font-size:9px;white-space:nowrap}.glassDock{position:absolute;right:6px;bottom:7px;left:6px;z-index:2;border:1px solid var(--ui-line);border-radius:26px;background:color-mix(in srgb,var(--ui-panel) 83%,transparent);box-shadow:0 8px 24px color-mix(in srgb,var(--ui-text) 26%,transparent);backdrop-filter:blur(20px);transition:border-radius .8s,box-shadow .8s}.glassDock[data-open=true]{border-radius:23px;box-shadow:0 13px 35px color-mix(in srgb,var(--ui-text) 32%,transparent)}.dockBody{height:39px;overflow:hidden;transition:height .9s cubic-bezier(.22,1,.36,1)}.glassDock[data-open=true] .dockBody{height:170px}.dockComposer{display:flex;justify-content:space-between;padding:12px;color:var(--ui-muted);font-size:10px;white-space:nowrap;transition:opacity .3s,transform .45s}.dockComposer span{color:var(--ui-accent)}.glassDock[data-open=true] .dockComposer{height:0;padding:0;opacity:0;transform:translateY(-15px)}.tlPicker,.searchPanel{padding:10px;opacity:0;transform:translateY(15px);transition:opacity .5s .1s,transform .65s .1s}.glassDock[data-open=true] .tlPicker,.glassDock[data-open=true] .searchPanel{opacity:1;transform:none}.pickerTitle{display:flex;justify-content:space-between;margin:0 3px 8px;font-size:11px;font-weight:700}.pickerTitle span{color:var(--ui-accent)}.pickerGrid{display:grid;grid-template-columns:1fr 1fr;gap:5px}.pickerGrid button,.pickerBranch button{height:38px;padding:0 7px;border:1px solid var(--ui-line);border-radius:10px;background:var(--ui-soft);color:var(--ui-text);text-align:left;font-size:9px}.pickerGrid button:hover,.pickerGrid button.target,.pickerBranch button:hover{background:var(--ui-tint);color:var(--ui-accent)}.pickerBranch{display:grid;gap:7px}.dockNav{display:flex;align-items:center;justify-content:space-evenly;height:42px;border-top:1px solid var(--ui-line)}.dockNav>span,.dockNav button{display:grid;place-items:center;flex:none;width:29px;height:38px;padding:0;border:0;border-radius:10px;background:transparent;color:var(--ui-muted)}.dockNav button:hover,.dockNav button[aria-expanded=true],.dockNav button.demoPressed{background:var(--ui-tint);color:var(--ui-accent)}.dockNav svg{width:17px;height:17px}.homeButton{touch-action:none}.searchCaption{width:135px}.searchPanel label{display:block;font-size:11px;font-weight:700}.searchPanel input{display:block;width:100%;height:36px;min-width:0;margin-top:8px;padding:0 8px;border:1px solid var(--ui-line);border-radius:10px;background:var(--ui-soft);color:var(--ui-text);font-size:10px}.suggestions{display:grid;gap:5px;margin-top:8px;font-size:9px}.suggestions span{color:var(--ui-muted)}.suggestions b{font-weight:400}
.ghost{position:absolute;left:0;top:0;z-index:4;width:0;height:0;opacity:0;pointer-events:none;transition:opacity .35s}.ghost.visible{opacity:1}.ghost svg{position:absolute;left:0;top:0;width:19px;height:25px;overflow:visible;filter:drop-shadow(0 2px 3px #2b1c2b45)}.cursorEdge{fill:#fffafc;stroke:#fffafc;stroke-width:3.3;stroke-linejoin:round}.cursorFace{fill:color-mix(in srgb,var(--ui-accent) 35%,#422c3c);stroke:color-mix(in srgb,var(--ui-accent) 35%,#422c3c);stroke-width:.5}.touchGhost>span{position:absolute;left:-7px;top:-7px;width:14px;height:14px;border:1.5px solid #fff;border-radius:50%;background:color-mix(in srgb,var(--ui-accent) 70%,transparent);box-shadow:0 0 0 2px color-mix(in srgb,var(--ui-text) 45%,transparent)}.ghost::after{content:'';position:absolute;left:-9px;top:-9px;width:18px;height:18px;border:1px solid var(--ui-accent);border-radius:50%;opacity:0;transform:scale(.55)}.ghost.pressed::after{animation:contact .42s ease-out both}@keyframes contact{0%{opacity:.65;transform:scale(.5)}100%{opacity:0;transform:scale(1.45)}}.demoPressed{background:var(--ui-tint)!important;color:var(--ui-accent)!important;box-shadow:inset 0 0 0 1px var(--ui-accent)}.demoControls{display:flex;align-items:center;justify-content:space-between;gap:8px;max-width:830px;margin:9px auto 5px}.sampleLabel{display:flex;align-items:center;gap:6px;color:var(--ui-muted);font-size:10px}.sampleLabel svg{width:15px;height:15px;color:var(--ui-accent)}.demoControls>div{display:flex;gap:8px}.demoControls button{display:grid;place-items:center;width:44px;height:44px;min-width:44px;padding:0;border:1px solid var(--ui-line);border-radius:50%;background:var(--ui-panel);color:var(--ui-text)}.demoControls button:hover,.demoControls button[aria-pressed=false]{background:var(--ui-tint);color:var(--ui-accent)}.demoControls button svg{width:18px;height:18px}.artFoot{display:flex;align-items:center;gap:12px;margin:12px 0 0;color:var(--ui-muted);font-size:11px}.artFoot::before{content:'';height:1px;flex:1;background:var(--ui-line)}.feature[data-motion=false] *{animation:none!important;transition-duration:.001ms!important}
@container uis-feature (max-width:620px){.overview{min-height:268px}.overviewPhone{width:150px;height:278px}.pcArt{min-height:285px;padding:15px 5px 0}.pcWindow{height:255px}.pcRail{width:48px;padding:7px 4px}.pcRail b{font-size:21px;min-height:29px}.pcRail button,.pcRail>span{width:38px;height:36px}.pcSide .paneHead{height:40px;padding:0 6px}.paneHead button{width:29px;height:29px}.pcSearch,.resultLabel,.trend{min-width:135px;font-size:9px}.pcTimelineRail{width:30px;gap:7px}.pcNote{min-height:80px;padding:9px 27px 7px 8px;font-size:9px}.pcNote .avatar{width:23px;height:23px;font-size:13px}.pcNote .reaction{right:2px;font-size:9px}.pcComposer{min-height:38px;margin:3px;font-size:9px}.mobileArt,.searchArt{gap:15px;min-height:338px}.sideCaption{width:115px;gap:7px}.sideCaption strong{min-height:4.7em;font-size:12px}.sideCaption small{font-size:9px}.demoPhone{width:206px;height:325px}.overviewPhone{width:120px;height:228px;margin-left:-27px}.phoneNote{min-height:75px;padding:8px 5px}.phoneNote p{font-size:7px}.overviewDock nav{font-size:11px}.demoControls{margin-top:7px}.artFoot{font-size:10px}}
@container uis-feature (max-width:340px){.mobileArt,.searchArt{flex-direction:column;gap:10px;padding-top:8px}.sideCaption{width:min(100%,210px);gap:3px}.sideCaption strong{min-height:0;font-size:12px}.sideCaption small{display:none}.demoPhone{width:200px}.overviewPhone{width:108px;height:212px}.overview{min-height:230px}.pcRail{width:40px}.pcRail button,.pcRail>span{width:30px}.pcTimelineRail{width:23px}.pcTimelineRail span{font-size:10px}.sampleLabel{font-size:9px}}
.feature[data-playing=false] *{animation-play-state:paused!important}
.feature[data-motion=false] .ghost{visibility:hidden!important}
</style>
