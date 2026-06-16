<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: マスコット専用ページ(P3 段階3-1)。サイドメニューから開く。
  立ち絵+名前+文言を大きく表示し、一定時間ごとに文言(と紐づく表情)が切り替わる。
  画像は mascot-store の IndexedDB キャッシュ経由(ObjectURL)で表示。
-->
<template>
<MkStickyContainer>
	<template #header><MkPageHeader :actions="headerActions" :title="'マスコット'" :icon="'ti ti-mood-smile'"/></template>
	<MkSpacer :contentMax="700">
		<div v-if="!mascotLoaded" :class="$style.center">読み込み中…</div>

		<div v-else-if="!hasMascot" :class="$style.empty">
			<i class="ti ti-mood-empty" :class="$style.emptyIcon"></i>
			<div :class="$style.emptyText">まだマスコットが設定されていません。</div>
			<MkButton primary rounded @click="openSettings"><i class="ti ti-settings"></i> マスコットを設定する</MkButton>
		</div>

		<div v-else :class="$style.stage">
			<div :class="$style.imgWrap">
				<Transition name="mascotImgFade" mode="out-in">
					<img v-if="expUrl" :key="expUrl" :src="expUrl" :style="motionVarStyle" :class="[$style.img, currentExpression?.motion==='bounce' ? $style.motionBounce : currentExpression?.motion==='shake' ? $style.motionShake : currentExpression?.motion==='sway' ? $style.motionSway : currentExpression?.motion==='spin' ? $style.motionSpin : '']" :alt="expLabel" draggable="false" />
					<div v-else :class="$style.noImg"><i class="ti ti-photo"></i></div>
				</Transition>
				<!-- 吹き出しを立ち絵の上に、表情ごとの位置(bubbleX/Y)で重ねる -->
				<Transition name="mascotBubble">
					<div v-if="phraseText" :key="phraseText" :class="[$style.bubble, bubbleTail==='right' ? $style.tail_right : $style.tail_left]" :style="bubbleStyle" @click="next">
						{{ phraseText }}
					</div>
				</Transition>
			</div>
			<div v-if="character && (mascotData?.showName) && character.name" :class="$style.name">{{ character.name }}</div>
			<div v-if="!phraseText" :class="$style.bubbleEmpty">（文言が設定されていません）</div>
			<div :class="$style.controls">
				<MkButton rounded @click="next"><i class="ti ti-refresh"></i> 次の文言</MkButton>
				<MkButton rounded @click="openSettings"><i class="ti ti-settings"></i> 設定</MkButton>
			</div>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed, onMounted, onActivated, onDeactivated, onUnmounted } from 'vue';
import MkButton from '@/components/MkButton.vue';
import * as os from '@/os.js';
import { definePage } from '@/page.js';
import {
	mascotData, mascotLoaded, loadMascot,
	activeCharacter, currentPhrase, currentExpression,
	pickRandomPhrase, expressionDisplayUrl, escapeText,
	displayText, displaySettings, loadDisplaySettings,
} from '@/utility/mascot-store.js';

const IDLE_MIN_MS = 5000; // 文言切替の最短間隔
const IDLE_MAX_MS = 12000; // 文言切替の最長間隔

const character = computed(() => activeCharacter.value);
const hasMascot = computed(() => !!character.value);
const phraseText = computed(() => displayText.value ? escapeText(displayText.value) : '');
const expUrl = computed(() => expressionDisplayUrl(currentExpression.value));
const expLabel = computed(() => currentExpression.value?.label ?? '');
// 吹き出し位置(表情ごとのbubbleX/Y、未設定は上中央寄り)
const bubbleStyle = computed(() => {
	const e = currentExpression.value;
	const x = (typeof e?.bubbleX === 'number' ? e.bubbleX : 0.5);
	const y = (typeof e?.bubbleY === 'number' ? e.bubbleY : 0.1);
	const scale = (typeof e?.bubbleScale === 'number' ? e.bubbleScale : 1);
	return { left: (x * 100) + '%', top: (y * 100) + '%', fontSize: (1 * scale) + 'rem' };
});
const bubbleTail = computed<'left' | 'right'>(() => (currentExpression.value?.bubbleTail === 'right' ? 'right' : 'left'));
const motionVarStyle = computed(() => ({ '--htk-motion-i': String(typeof currentExpression.value?.motionIntensity === 'number' ? currentExpression.value.motionIntensity : 1) }));

let timer: ReturnType<typeof setTimeout> | null = null;
function startTimer() {
	stopTimer();
	const delay = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
	timer = setTimeout(() => { pickRandomPhrase(); startTimer(); }, delay);
}
function stopTimer() { if (timer) { clearTimeout(timer); timer = null; } }

function next() { pickRandomPhrase(); startTimer(); }

function openSettings() {
	import('@/pages/MkMascotSettings.vue').then(x => {
		os.popup(x.default, {}, {}, 'closed');
	});
}

onMounted(async () => {
	await Promise.allSettled([loadMascot(), loadDisplaySettings()]);
	pickRandomPhrase();
	startTimer();
});
onActivated(() => startTimer());
onDeactivated(() => stopTimer());
onUnmounted(() => stopTimer());

const headerActions = computed(() => [{
	icon: 'ti ti-settings',
	text: '設定',
	handler: openSettings,
}]);

definePage(() => ({
	title: 'マスコット',
	icon: 'ti ti-mood-smile',
}));
</script>

<style lang="scss" module>
.center { text-align:center; padding:40px 0; opacity:.6; }
.empty { display:flex; flex-direction:column; align-items:center; gap:14px; padding:48px 0; }
.emptyIcon { font-size:3rem; opacity:.4; }
.emptyText { opacity:.7; }
.stage { display:flex; flex-direction:column; align-items:center; gap:18px; padding:20px 0 40px; }
.imgWrap { position:relative; width:min(70vw, 320px); height:min(70vw, 320px); display:flex; align-items:center; justify-content:center; }
.img { max-width:100%; max-height:100%; object-fit:contain; filter:drop-shadow(0 8px 24px rgba(0,0,0,.25)); user-select:none; -webkit-user-drag:none; }
.noImg { width:100%; height:100%; display:flex; align-items:center; justify-content:center; border:1px dashed var(--MI_THEME-divider); border-radius:16px; opacity:.4; font-size:2rem; }
.motionBounce { animation: htkMascotBounce 1s ease-in-out infinite; }
.motionShake { animation: htkMascotShake .35s linear infinite; }
.motionSway { animation: htkMascotSway 2s ease-in-out infinite; }
.motionSpin { animation: htkMascotSpin 3s linear infinite; }
:global {
	@keyframes htkMascotBounce { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(calc(-8% * var(--htk-motion-i, 1))); } }
	@keyframes htkMascotShake { 0%,100%{ transform:translateX(0); } 25%{ transform:translateX(calc(-4px * var(--htk-motion-i, 1))); } 75%{ transform:translateX(calc(4px * var(--htk-motion-i, 1))); } }
	@keyframes htkMascotSway { 0%,100%{ transform:rotate(calc(-4deg * var(--htk-motion-i, 1))); } 50%{ transform:rotate(calc(4deg * var(--htk-motion-i, 1))); } }
	@keyframes htkMascotSpin { from{ transform:rotate(0); } to{ transform:rotate(360deg); } }
}
.name { font-size:1.1rem; font-weight:700; }
.bubble { position:absolute; transform:translate(-50%,-50%); max-width:min(80%, 320px); background: var(--MI_THEME-panel); border:1px solid var(--MI_THEME-divider); border-radius:16px; padding:12px 18px; font-size:1rem; line-height:1.6; text-align:center; cursor:pointer; transition:transform .1s; word-break:break-word; box-shadow:0 4px 16px rgba(0,0,0,.22); }
.bubble:active { transform:translate(-50%,-50%) scale(.97); }
.bubble::after, .bubble::before { content:''; position:absolute; top:50%; width:0; height:0; border-style:solid; }
/* 左辺から左向き */
.tail_left::before { right:100%; transform:translateY(-50%); border-width:9px 12px 9px 0; border-color:transparent var(--MI_THEME-divider) transparent transparent; margin-right:-1px; }
.tail_left::after { right:100%; transform:translateY(-50%); border-width:8px 11px 8px 0; border-color:transparent var(--MI_THEME-panel) transparent transparent; }
/* 右辺から右向き */
.tail_right::before { left:100%; transform:translateY(-50%); border-width:9px 0 9px 12px; border-color:transparent transparent transparent var(--MI_THEME-divider); margin-left:-1px; }
.tail_right::after { left:100%; transform:translateY(-50%); border-width:8px 0 8px 11px; border-color:transparent transparent transparent var(--MI_THEME-panel); }
.bubbleEmpty { opacity:.5; font-size:.9rem; }
.controls { display:flex; gap:10px; }
/* 画像フェード切替 */
:global(.mascotImgFade-enter-active), :global(.mascotImgFade-leave-active) { transition: opacity .45s ease; }
:global(.mascotImgFade-enter-from), :global(.mascotImgFade-leave-to) { opacity: 0; }
/* 吹き出し表示アニメ(フェード+ふわっと) */
:global(.mascotBubble-enter-active) { transition: opacity .35s ease, transform .35s cubic-bezier(0.34,1.56,0.64,1); }
:global(.mascotBubble-leave-active) { transition: opacity .2s ease; }
:global(.mascotBubble-enter-from) { opacity: 0; transform: translate(-50%, calc(-50% + 8px)) scale(.92); }
:global(.mascotBubble-leave-to) { opacity: 0; }
</style>
