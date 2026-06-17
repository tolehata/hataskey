<!--
旗鯖fork: フローティングマスコット(段階C 土台)
どの画面でも最前面にマスコットを浮かべる。ドラッグで移動でき、位置は registry(displaySettings) に保存。
表示ON/OFFはデスクトップ/モバイルで別設定(displaySettings.floatingEnabledDesktop / floatingEnabledMobile)。
吹き出し連携・黒ぼかし背景は段階②、最小化は段階③、簡易/高度設定は段階④で追加する。
-->
<template>
<div
	v-if="visible && shownUrl"
	ref="rootEl"
	:class="$style.root"
	:style="rootStyle"
	@pointerdown="onPointerDown"
>
	<img :src="shownUrl" :class="$style.img" draggable="false" :alt="shownExpression?.label || 'mascot'" />
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { deviceKind } from '@/utility/device-kind.js';
import {
	mascotLoaded, loadMascot,
	currentExpression, pickRandomPhrase,
	expressionDisplayUrl,
	displaySettings, displaySettingsLoaded, loadDisplaySettings,
	saveFloatingPosition,
	mascotVisible,
} from '@/utility/mascot-store.js';

const isDesktop = deviceKind === 'desktop';

// 表示するか(デスクトップ/モバイルで別設定)
const visible = computed(() => {
	if (!mascotLoaded.value || !displaySettingsLoaded.value) return false;
	return isDesktop ? displaySettings.value.floatingEnabledDesktop : displaySettings.value.floatingEnabledMobile;
});

// 立ち絵(画像をデコードしてから表示)
const shownUrl = ref('');
const shownExpression = ref<typeof currentExpression.value>(null);
const pendingUrl = computed(() => expressionDisplayUrl(currentExpression.value));

let applyToken = 0;
async function applyPending() {
	const token = ++applyToken;
	const url = pendingUrl.value;
	if (url) {
		try { const img = new Image(); img.src = url; if (img.decode) await img.decode(); } catch { /* noop */ }
	}
	if (token !== applyToken) return;
	shownUrl.value = url;
	shownExpression.value = currentExpression.value;
}
watch(pendingUrl, () => { applyPending(); });

// ===== 位置(px、左上基準) =====
const SIZE = 140;
const posX = ref(0);
const posY = ref(0);

function initPosition() {
	const sx = displaySettings.value.floatingX;
	const sy = displaySettings.value.floatingY;
	if (typeof sx === 'number' && sx >= 0 && typeof sy === 'number' && sy >= 0) {
		posX.value = sx;
		posY.value = sy;
	} else {
		// 未設定(-1)は初期位置: 画面右下あたり
		posX.value = Math.max(0, window.innerWidth - SIZE - 24);
		posY.value = Math.max(0, window.innerHeight - SIZE - 96);
	}
	clampToViewport();
}

function clampToViewport() {
	const maxX = Math.max(0, window.innerWidth - 40);
	const maxY = Math.max(0, window.innerHeight - 40);
	posX.value = Math.min(Math.max(0, posX.value), maxX);
	posY.value = Math.min(Math.max(0, posY.value), maxY);
}

const rootStyle = computed(() => ({
	left: posX.value + 'px',
	top: posY.value + 'px',
}));

// ===== ドラッグ移動 =====
const rootEl = ref<HTMLElement | null>(null);
let dragging = false;
let startPX = 0, startPY = 0, startX = 0, startY = 0;
let moved = false;

function onPointerDown(ev: PointerEvent) {
	dragging = true;
	moved = false;
	startPX = ev.clientX;
	startPY = ev.clientY;
	startX = posX.value;
	startY = posY.value;
	window.addEventListener('pointermove', onPointerMove);
	window.addEventListener('pointerup', onPointerUp);
}
function onPointerMove(ev: PointerEvent) {
	if (!dragging) return;
	const dx = ev.clientX - startPX;
	const dy = ev.clientY - startPY;
	if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
	posX.value = startX + dx;
	posY.value = startY + dy;
}
function onPointerUp() {
	if (!dragging) return;
	dragging = false;
	window.removeEventListener('pointermove', onPointerMove);
	window.removeEventListener('pointerup', onPointerUp);
	if (moved) {
		clampToViewport();
		saveFloatingPosition(posX.value, posY.value);
	}
}

function onResize() { clampToViewport(); }

onMounted(async () => {
	await Promise.allSettled([loadMascot(), loadDisplaySettings()]);
	pickRandomPhrase();
	await applyPending();
	initPosition();
	mascotVisible.value = true;
	window.addEventListener('resize', onResize);
});
onBeforeUnmount(() => {
	window.removeEventListener('resize', onResize);
	window.removeEventListener('pointermove', onPointerMove);
	window.removeEventListener('pointerup', onPointerUp);
	mascotVisible.value = false;
});

watch(displaySettingsLoaded, (v) => { if (v) initPosition(); });
</script>

<style lang="scss" module>
.root {
	position: fixed;
	z-index: 2100;
	width: 140px;
	height: 140px;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	cursor: grab;
	user-select: none;
	touch-action: none;
}
.root:active { cursor: grabbing; }
.img {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
	filter: drop-shadow(0 4px 16px rgba(0,0,0,.3));
	-webkit-user-drag: none;
	pointer-events: none;
}
</style>
