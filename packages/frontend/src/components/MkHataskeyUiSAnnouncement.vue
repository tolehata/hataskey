<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<Teleport to="body">
	<div
		v-if="visible"
		ref="bubbleEl"
		:class="$style.bubble"
		:data-side="side"
		:data-motion="prefer.r.animation.value && !reducedMotion ? 'on' : 'off'"
		:style="{ zIndex, left: `${position.left}px`, top: `${position.top}px`, '--tail-x': `${position.tailX}px`, visibility: position.ready ? 'visible' : 'hidden' }"
		role="dialog"
		aria-labelledby="hataskey-ui-s-announcement-title"
	>
		<p id="hataskey-ui-s-announcement-title" :class="$style.message"><span :class="$style.brand">Hataskey UI S</span>{{ copy.announcementAvailable }}<br>{{ copy.announcementTry }}</p>
		<div :class="$style.actions">
			<button type="button" :class="$style.dismiss" @click="dismiss(true)">{{ i18n.ts.close }}</button>
			<button type="button" :class="$style.switch" @click="switchUi">{{ copy.title }}</button>
		</div>
	</div>
</Teleport>
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const props = defineProps<{
	navRoot: HTMLElement | null;
	accountId: string | null;
}>();
const emit = defineEmits<{ (event: 'switch'): void }>();
const copy = i18n.ts._hata._uiSetup;

const MARGIN = 12;
const GAP = 10;
const bubbleEl = shallowRef<HTMLElement | null>(null);
const anchor = shallowRef<HTMLButtonElement | null>(null);
const visible = ref(false);
const side = ref<'top' | 'bottom'>('top');
const position = reactive({ left: 0, top: 0, tailX: 0, ready: false });
const reducedMotion = ref(false);
const zIndex = os.claimZIndex('high');

let state: 'untried' | 'pending' | 'granted' | 'done' = 'untried';
let disposed = false;
let accountGeneration = 0;
let intersectionObserver: IntersectionObserver | null = null;
let mutationObserver: MutationObserver | null = null;
let sizeObserver: ResizeObserver | null = null;
let motionQuery: MediaQueryList | null = null;
let observedRoot: HTMLElement | null = null;
const intersection = new Map<HTMLButtonElement, boolean>();

function isVisibleInNav(button: HTMLButtonElement): boolean {
	const root = props.navRoot;
	if (!root || !root.isConnected || !button.isConnected || !root.contains(button) || button.dataset.menuId !== 'uiSetup' || window.document.hidden) return false;
	let rect = button.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) return false;
	let left = Math.max(0, rect.left);
	let top = Math.max(0, rect.top);
	let right = Math.min(window.innerWidth, rect.right);
	let bottom = Math.min(window.innerHeight, rect.bottom);
	for (let element: HTMLElement | null = button; element; element = element.parentElement) {
		if (element.hidden) return false;
		const style = window.getComputedStyle(element);
		if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.opacity === '0') return false;
		if (element !== button && /(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)) {
			rect = element.getBoundingClientRect();
			left = Math.max(left, rect.left);
			top = Math.max(top, rect.top);
			right = Math.min(right, rect.right);
			bottom = Math.min(bottom, rect.bottom);
		}
	}
	return right > left && bottom > top;
}

function visibleCandidate(): HTMLButtonElement | null {
	for (const [button, intersects] of intersection) {
		if (intersects && isVisibleInNav(button)) return button;
	}
	return null;
}

function dismiss(force = false) {
	if (!visible.value) return;
	const wasDisplayed = position.ready;
	visible.value = false;
	position.ready = false;
	anchor.value = null;
	sizeObserver?.disconnect();
	state = force || wasDisplayed ? 'done' : 'granted';
}

function place() {
	if (!visible.value || !anchor.value || !isVisibleInNav(anchor.value)) {
		dismiss();
		return;
	}
	const bubble = bubbleEl.value;
	if (!bubble) return;
	const rect = anchor.value.getBoundingClientRect();
	const width = bubble.offsetWidth;
	const height = bubble.offsetHeight;
	const center = rect.left + rect.width / 2;
	const left = Math.max(MARGIN, Math.min(window.innerWidth - width - MARGIN, center - width / 2));
	const above = rect.top - GAP - height;
	const below = rect.bottom + GAP;
	side.value = above >= MARGIN || below + height > window.innerHeight - MARGIN ? 'top' : 'bottom';
	position.left = left;
	position.top = Math.max(MARGIN, Math.min(window.innerHeight - height - MARGIN, side.value === 'top' ? above : below));
	position.tailX = Math.max(14, Math.min(width - 14, center - left));
	position.ready = true;
}

async function show(button: HTMLButtonElement) {
	anchor.value = button;
	visible.value = true;
	position.ready = false;
	await nextTick();
	if (disposed || !visible.value || anchor.value !== button) return;
	if (typeof ResizeObserver !== 'undefined') {
		sizeObserver = new ResizeObserver(place);
		sizeObserver.observe(button);
		if (bubbleEl.value) sizeObserver.observe(bubbleEl.value);
	}
	place();
}

async function evaluate() {
	if (disposed || state === 'pending' || state === 'done') return;
	if (visible.value) {
		place();
		return;
	}
	const button = visibleCandidate();
	if (!button) return;
	if (state === 'granted') {
		void show(button);
		return;
	}
	if (!props.accountId || $i?.id !== props.accountId) return;
	state = 'pending';
	const generation = accountGeneration;
	try {
		const result = await misskeyApi<{ claimed: boolean }>('hata/ui-s-announcement/claim', {});
		if (disposed || generation !== accountGeneration) return;
		state = result.claimed ? 'granted' : 'done';
		if (state === 'granted') void evaluate();
	} catch {
		if (!disposed && generation === accountGeneration) state = 'done';
	}
}

function refreshCandidates() {
	const root = props.navRoot;
	if (!root || !intersectionObserver) return;
	const buttons = new Set(root.querySelectorAll<HTMLButtonElement>('button[data-menu-id="uiSetup"]'));
	for (const button of intersection.keys()) {
		if (buttons.has(button)) continue;
		intersectionObserver.unobserve(button);
		intersection.delete(button);
	}
	for (const button of buttons) {
		if (intersection.has(button)) continue;
		intersection.set(button, false);
		intersectionObserver.observe(button);
	}
	if (visible.value && (!anchor.value || !buttons.has(anchor.value))) dismiss();
	else void evaluate();
}

function disconnectRoot() {
	observedRoot?.removeEventListener('transitionend', onGeometryChange);
	observedRoot?.removeEventListener('animationend', onGeometryChange);
	observedRoot = null;
	mutationObserver?.disconnect();
	mutationObserver = null;
	intersectionObserver?.disconnect();
	intersectionObserver = null;
	intersection.clear();
	if (visible.value) dismiss();
}

function onOutsidePointer(event: PointerEvent) {
	if (!visible.value) return;
	const target = event.target as Node | null;
	if (target && bubbleEl.value?.contains(target)) return;
	dismiss(true);
}

function onKeydown(event: KeyboardEvent) {
	if (visible.value && event.key === 'Escape') dismiss(true);
}

function onGeometryChange() {
	if (visible.value) place();
	else void evaluate();
}

function onMotionChange(event: MediaQueryListEvent) {
	reducedMotion.value = event.matches;
}

function switchUi() {
	dismiss(true);
	emit('switch');
}

watch(() => props.accountId, () => {
	accountGeneration++;
	if (visible.value) dismiss();
	state = 'untried';
	void evaluate();
});

watch(() => props.navRoot, (root) => {
	disconnectRoot();
	if (!root || disposed) return;
	observedRoot = root;
	root.addEventListener('transitionend', onGeometryChange);
	root.addEventListener('animationend', onGeometryChange);
	intersectionObserver = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			const button = entry.target as HTMLButtonElement;
			if (intersection.has(button)) intersection.set(button, entry.isIntersecting);
		}
		void evaluate();
	});
	mutationObserver = new MutationObserver(refreshCandidates);
	mutationObserver.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'data-menu-id'] });
	refreshCandidates();
}, { immediate: true, flush: 'post' });

onMounted(() => {
	motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	reducedMotion.value = motionQuery.matches;
	motionQuery.addEventListener('change', onMotionChange);
	window.addEventListener('resize', onGeometryChange, { passive: true });
	window.addEventListener('scroll', onGeometryChange, { passive: true, capture: true });
	window.visualViewport?.addEventListener('resize', onGeometryChange, { passive: true });
	window.visualViewport?.addEventListener('scroll', onGeometryChange, { passive: true });
	window.document.addEventListener('visibilitychange', onGeometryChange);
	window.document.addEventListener('pointerdown', onOutsidePointer, true);
	window.document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
	disposed = true;
	accountGeneration++;
	disconnectRoot();
	sizeObserver?.disconnect();
	motionQuery?.removeEventListener('change', onMotionChange);
	window.removeEventListener('resize', onGeometryChange);
	window.removeEventListener('scroll', onGeometryChange, true);
	window.visualViewport?.removeEventListener('resize', onGeometryChange);
	window.visualViewport?.removeEventListener('scroll', onGeometryChange);
	window.document.removeEventListener('visibilitychange', onGeometryChange);
	window.document.removeEventListener('pointerdown', onOutsidePointer, true);
	window.document.removeEventListener('keydown', onKeydown);
});
</script>

<style lang="scss" module>
@font-face {
	font-family: 'HataskeyUiSAnnouncementRighteous';
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
	font-style: normal;
	font-weight: 400;
	font-display: swap;
}

.bubble {
	position: fixed;
	box-sizing: border-box;
	width: max-content;
	max-width: min(320px, calc(100vw - 24px));
	padding: 14px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 12px;
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	box-shadow: 0 12px 36px rgb(0 0 0 / 24%);
	font-size: 13px;
	line-height: 1.6;
	user-select: text;

	&::after {
		content: '';
		position: absolute;
		left: calc(var(--tail-x) - 7px);
		width: 14px;
		height: 8px;
		background: var(--MI_THEME-panel);
	}

	&[data-side='top']::after { top: 100%; clip-path: polygon(0 0, 100% 0, 50% 100%); }
	&[data-side='bottom']::after { bottom: 100%; clip-path: polygon(50% 0, 100% 100%, 0 100%); }
	&[data-motion='on'] { animation: uiSAnnouncementIn 220ms ease-out; }
}

@keyframes uiSAnnouncementIn {
	from { opacity: 0; transform: translateY(5px); }
	to { opacity: 1; transform: none; }
}

.message { margin: 0; overflow-wrap: anywhere; }
.brand { font-family: 'HataskeyUiSAnnouncementRighteous', sans-serif; font-weight: 400; font-synthesis: none; }
.actions { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.actions button { min-height: 32px; padding: 4px 10px; border-radius: 7px; cursor: pointer; font: inherit; }
.dismiss { border: 1px solid var(--MI_THEME-divider); background: transparent; color: var(--MI_THEME-fg); }
.switch { border: 1px solid var(--MI_THEME-accent); background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); font-weight: 700 !important; }

@media (prefers-reduced-motion: reduce) {
	.bubble[data-motion='on'] { animation: none; }
}
</style>
