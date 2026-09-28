<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<component :is="embedded ? SettingsEmbeddedWindow : MkModal" ref="modal" :preferType="'dialog'" @click="onBackdropClick" @esc="onEscape" @closed="emit('closed')">
	<div ref="panel" :class="$style.root" role="dialog" :aria-modal="embedded ? undefined : true" aria-labelledby="mkuisetup-title" :data-animation="prefer.s.animation ? 'true' : 'false'" :data-glass="prefer.s.useBlurEffect && prefer.s.useBlurEffectForModal ? 'true' : 'false'" :data-embedded-scroll="embedded ? '' : undefined" @click.stop @keydown.esc.stop.prevent="onEscape">
		<header :class="$style.header">
			<h1 id="mkuisetup-title" :class="$style.title"><ChevronsLeftRight :size="16" aria-hidden="true" :class="$style.swapIcon"/>{{ copy.title }}</h1>
			<button type="button" :class="$style.close" :aria-label="i18n.ts.close" :disabled="busy" @click="close"><X :size="20" aria-hidden="true"/></button>
		</header>

		<div v-show="pending === null" :class="$style.body">
			<p :class="$style.hint">{{ copy.hint }}</p>
			<div :class="$style.options">
				<button type="button" data-ui="simple" :class="[$style.option, { [$style.selected]: currentUi === 'simple' }]" :aria-pressed="currentUi === 'simple'" :disabled="busy" @click="choose('simple')">
					<LayoutTemplate :size="22" aria-hidden="true" :class="$style.optionIcon"/>
					<span :class="[$style.optionName, $style.brandName]">Hataskey UI<span :class="$style.recommended">{{ i18n.ts.recommended }}</span></span>
					<span :class="$style.description">{{ copy.standardDescription }}</span>
					<span :class="$style.optionEnd"><span v-if="currentUi === 'simple'">{{ i18n.ts.inUse }}</span><ChevronRight v-else :size="16" aria-hidden="true"/></span>
				</button>
				<button type="button" data-ui="hataskey3" :class="[$style.option, { [$style.selected]: currentUi === 'hataskey3' }]" :aria-pressed="currentUi === 'hataskey3'" :disabled="busy" @click="choose('hataskey3')">
					<PanelsTopLeft :size="22" aria-hidden="true" :class="$style.optionIcon"/>
					<span :class="[$style.optionName, $style.brandName]">Hataskey UI S</span>
					<span :class="$style.description">{{ copy.ui3Description }}</span>
					<span :class="$style.optionEnd"><span v-if="currentUi === 'hataskey3'">{{ i18n.ts.inUse }}</span><ChevronRight v-else :size="16" aria-hidden="true"/></span>
				</button>
			</div>
			<details :class="$style.legacy" :open="legacyOpen" @toggle="legacyOpen = ($event.target as HTMLDetailsElement).open">
				<summary :class="$style.legacySummary" @click="busy && $event.preventDefault()"><ChevronDown :size="16" aria-hidden="true"/>{{ copy.otherUis }}<span :class="$style.deprecatedBadge">{{ copy.notRecommended }}</span></summary>
				<p :class="$style.legacyNote">{{ copy.conflictNote }}</p>
				<div :class="$style.options">
					<button type="button" data-ui="default" :class="[$style.option, $style.legacyOption, { [$style.selected]: currentUi === 'default' }]" :aria-pressed="currentUi === 'default'" :disabled="busy" @click="askDeprecated('default')">
						<LayoutList :size="22" aria-hidden="true" :class="$style.optionIcon"/><span :class="$style.optionName">Misskey UI</span><span :class="$style.optionEnd"><span v-if="currentUi === 'default'">{{ i18n.ts.inUse }}</span><ChevronRight v-else :size="16" aria-hidden="true"/></span>
					</button>
					<button type="button" data-ui="deck" :class="[$style.option, $style.legacyOption, { [$style.selected]: currentUi === 'deck' }]" :aria-pressed="currentUi === 'deck'" :disabled="busy" @click="askDeprecated('deck')">
						<Columns3 :size="22" aria-hidden="true" :class="$style.optionIcon"/><span :class="$style.optionName">{{ copy.legacyDeck }}</span><span :class="$style.optionEnd"><span v-if="currentUi === 'deck'">{{ i18n.ts.inUse }}</span><ChevronRight v-else :size="16" aria-hidden="true"/></span>
					</button>
				</div>
			</details>
		</div>

		<div v-show="pending !== null" :class="$style.confirm">
			<span :class="$style.deprecatedBadge">{{ copy.notRecommended }}</span>
			<h2>{{ i18n.tsx._hata._uiSetup.switchConfirm({ ui: pending === 'default' ? 'Misskey UI' : copy.legacyDeck }) }}</h2>
			<p>{{ copy.deprecatedWarning }}</p>
			<div :class="$style.actions">
				<button type="button" data-confirm-back :class="$style.action" :disabled="busy" @click="backFromConfirm">{{ i18n.ts.goBack }}</button>
				<button type="button" :class="[$style.action, $style.accept]" :disabled="busy" @click="submitDeprecated">{{ copy.switchAction }}</button>
			</div>
		</div>
	</div>
</component>
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, ref } from 'vue';
import { ChevronsLeftRight, ChevronDown, ChevronRight, LayoutTemplate, PanelsTopLeft, LayoutList, Columns3, X } from '@lucide/vue';
import SettingsEmbeddedWindow from '@/components/SettingsEmbeddedWindow.vue';
import MkModal from '@/components/MkModal.vue';
import { miLocalStorage } from '@/local-storage.js';
import { prefer } from '@/preferences.js';
import { i18n } from '@/i18n.js';

type Ui = 'simple' | 'hataskey3' | 'default' | 'deck';
const props = defineProps<{ embedded?: boolean }>();
const emit = defineEmits<{ (e: 'closed'): void }>();
const modal = ref<{ close: () => void } | null>(null);
const panel = ref<HTMLElement | null>(null);
const copy = i18n.ts._hata._uiSetup;
const storedUi = miLocalStorage.getItem('ui');
const currentUi: Ui = storedUi === 'hataskey3' || storedUi === 'default' || storedUi === 'deck' ? storedUi : 'simple';
const legacyOpen = ref(currentUi === 'default' || currentUi === 'deck');
const pending = ref<'default' | 'deck' | null>(null);
const busy = ref(false);
let previousChoice: 'default' | 'deck' | null = null;
let exitAnimation: Animation | null = null;
let disposed = false;
let navigating = false;

// 設定検索のハンドラー解析に合わせ、戻り値は型推論に任せる。
function close() {
	if (busy.value) return;
	modal.value?.close();
}

function onBackdropClick() {
	if (!props.embedded) close();
}

async function backFromConfirm() {
	if (busy.value) return;
	pending.value = null;
	await nextTick();
	if (!disposed && previousChoice) panel.value?.querySelector<HTMLButtonElement>(`[data-ui="${previousChoice}"]`)?.focus();
}

function onEscape() {
	if (pending.value) backFromConfirm();
	else close();
}

function askDeprecated(type: 'default' | 'deck') {
	if (busy.value) return;
	if (type === currentUi) {
		finishCurrent();
		return;
	}
	previousChoice = type;
	pending.value = type;
	void nextTick(() => panel.value?.querySelector<HTMLButtonElement>('[data-confirm-back]')?.focus());
}

function finishCurrent() {
	if (busy.value) return;
	miLocalStorage.setItem('ui_setup_completed', 'true');
	close();
}

async function playExit() {
	if (!prefer.s.animation || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !panel.value?.animate) return true;
	exitAnimation = panel.value.animate([
		{ opacity: 1, transform: 'scaleY(1)' },
		{ opacity: 0, transform: 'scaleY(.88)' },
	], { duration: 220, easing: 'cubic-bezier(.4, 0, .8, .35)', fill: 'forwards' });
	try {
		await exitAnimation.finished;
		return !disposed;
	} catch {
		return false;
	}
}

async function choose(type: Ui) {
	if (busy.value) return;
	if (type === currentUi) {
		finishCurrent();
		return;
	}
	busy.value = true;
	try {
		if (!await playExit() || disposed) return;
		miLocalStorage.setItem('ui', type);
		miLocalStorage.setItem('ui_setup_completed', 'true');
		navigating = true;
		if (type === 'hataskey3') window.location.assign('/');
		else window.location.reload();
	} catch (error) {
		navigating = false;
		exitAnimation?.cancel();
		exitAnimation = null;
		throw error;
	} finally {
		if (!disposed && !navigating) busy.value = false;
	}
}

function submitDeprecated() {
	if (pending.value && !busy.value) void choose(pending.value);
}

onBeforeUnmount(() => {
	disposed = true;
	exitAnimation?.cancel();
	exitAnimation = null;
});
</script>

<style lang="scss" module>
.root {
	--surface: var(--MI_THEME-panel);
	--foreground: var(--MI_THEME-fg);
	--muted: color-mix(in srgb, var(--MI_THEME-fg) 70%, transparent);
	--line: var(--MI_THEME-divider);
	--accent: var(--MI_THEME-accent);
	--soft: color-mix(in srgb, var(--MI_THEME-accent) 12%, var(--MI_THEME-panel));
	box-sizing: border-box;
	width: min(520px, 100%);
	max-height: calc(100dvh - 32px);
	overflow-y: auto;
	overscroll-behavior: contain;
	margin: auto;
	border: 1px solid color-mix(in srgb, var(--MI_THEME-panel) 48%, var(--line));
	border-radius: 20px;
	background: var(--surface);
	color: var(--foreground);
	box-shadow: 0 22px 64px color-mix(in srgb, var(--MI_THEME-fg) 18%, transparent);
	text-align: center;
	caret-color: transparent;
	transform-origin: center;
}
.root[data-glass='true'] {
	--surface: color-mix(in srgb, var(--MI_THEME-panel) 86%, transparent);
	--soft: color-mix(in srgb, var(--MI_THEME-accent) 12%, var(--MI_THEME-panel) 58%);
	-webkit-backdrop-filter: blur(22px) saturate(1.16);
	backdrop-filter: blur(22px) saturate(1.16);
}
@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
	.root[data-glass='true'] { --surface: var(--MI_THEME-panel); }
}
.root * { box-sizing: border-box; }
.root svg { stroke-width: 1.7; }
.root button { font: inherit; color: inherit; cursor: pointer; }
.root button:disabled { cursor: default; }
.header { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--line); }
.title { grid-column: 2; display: flex; align-items: center; justify-content: center; gap: 7px; margin: 0; font-size: 16px; font-weight: 700; }
.swapIcon { color: var(--accent); flex: none; }
.close { grid-column: 3; display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 50%; background: transparent; color: var(--muted) !important; }
.close:hover { background: var(--soft); }
.body { padding: 18px; }
.hint { margin: 0 0 12px; color: var(--muted); font-size: 12px; }
.options { display: flex; flex-direction: column; gap: 6px; }
.option { display: flex; width: 100%; min-height: 58px; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 17px 14px; border: 1px solid transparent; border-radius: 12px; background: transparent; text-align: center; }
.option:hover:not(:disabled), .selected { background: var(--soft); }
.selected { border-color: color-mix(in srgb, var(--accent) 38%, var(--surface)); }
.optionIcon { flex: none; color: var(--muted); stroke-width: 1.7; }
.optionName { position: relative; font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
.brandName { font-family: 'Righteous', system-ui, sans-serif; font-size: 17px; font-weight: 400; }
.recommended { position: absolute; top: 50%; left: 100%; transform: translateY(-50%); margin-left: 6px; padding: 2px 5px; border-radius: 4px; background: var(--surface); color: var(--muted); font-family: system-ui, sans-serif; font-size: 10px; font-weight: 500; white-space: nowrap; }
.description { color: var(--muted); font-size: 12px; line-break: strict; text-wrap: pretty; }
.optionEnd { display: inline-flex; align-items: center; min-height: 19px; color: var(--muted); font-size: 12px; }
.selected .optionEnd { color: var(--foreground); font-weight: 700; }
.legacy { margin-top: 20px; padding-top: 8px; border-top: 1px solid var(--line); }
.legacySummary { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 4px; color: var(--muted); font-size: 12px; cursor: pointer; list-style: none; }
.legacySummary::-webkit-details-marker { display: none; }
.legacySummary > svg { color: var(--accent); stroke-width: 1.7; }
.deprecatedBadge { display: inline-block; padding: 0 5px; border: 1px solid var(--line); border-radius: 4px; color: var(--muted); font-size: 10px; white-space: nowrap; }
.legacyNote { margin: 0 4px 8px; color: var(--muted); font-size: 12px; }
.legacyOption { padding-block: 12px; }
.legacyOption .optionName { font-size: 13px; font-weight: 500; }
.confirm { padding: 24px; }
.confirm h2 { margin: 12px 0; font-size: 16px; }
.confirm p { margin: 0 0 24px; font-size: 13px; }
.actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; }
.action { min-height: 44px; padding: 10px 20px; border: 0; border-radius: 999px; background: var(--soft); }
.accept { background: var(--accent); color: var(--MI_THEME-fgOnAccent) !important; font-weight: 700 !important; }
@media (max-width: 380px) {
	.body { padding: 12px; }
	.option { gap: 5px; padding-inline: 10px; }
	.brandName { font-size: 16px; }
	.description { font-size: 11px; }
}
@media (prefers-reduced-motion: no-preference) {
	.root[data-animation='true'] .swapIcon { animation: swapNudge 620ms ease-out both; }
}
@keyframes swapNudge { 0%, 100% { transform: translateX(0); } 35% { transform: translateX(4px); } 70% { transform: translateX(-3px); } }
</style>

<style>
@font-face {
	font-family: 'Righteous';
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
}
</style>
