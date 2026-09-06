<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModal
	v-if="showModal"
	ref="modal"
	class="hatask-akatsuki-notice-modal"
	:data-notice-motion="animation ? 'on' : 'off'"
	preferType="dialog"
	zPriority="middle"
	:returnFocusTo="returnFocusTo"
	@click="choose(false)"
	@esc="dismissWithEscape"
	@keydown.stop
	@keydown.esc.stop.prevent="dismissWithEscape"
	@opened="onOpened"
	@closed="emit('closed')"
>
	<section
		:class="$style.root"
		:data-mode="mode"
		:data-motion="animation ? 'on' : 'off'"
		:data-title-motion="titleMotion"
		:style="daylightStyle"
		role="dialog"
		aria-modal="true"
		:aria-labelledby="titleId"
		:aria-describedby="descriptionId"
		:aria-busy="busy"
		@keydown.stop
		@keydown.esc.prevent="dismissWithEscape"
	>
		<header :class="$style.hero">
			<button type="button" :class="$style.close" :aria-label="copy.close" :disabled="busy || closing" data-notice-action="close" @click="choose(false)"><i class="ti ti-x" aria-hidden="true"></i></button>
			<h1 :id="titleId" ref="heading" :class="$style.title" tabindex="-1" aria-label="Hatask V3 Akatsuki">
				<span :class="$style.brandVersion">Hatask V3</span>
				<span :class="$style.brandStage" aria-hidden="true">
					<span :class="$style.brandFrom">Hatask</span>
					<span :class="$style.brandWord" @animationend.self="finishTitleMotion">Akatsuki</span>
					<span :class="$style.brandDoor"></span>
				</span>
			</h1>
			<!-- An abstract three-pane composition, not an interactive tool preview. -->
			<div :class="$style.panes" aria-hidden="true">
				<div :class="$style.rail"><span></span><span></span><span></span><span></span></div>
				<div :class="$style.canvas"><span :class="$style.sun"></span><span :class="$style.horizon"></span><span :class="$style.horizon"></span></div>
				<div :class="$style.cases"><span></span><span></span><span></span></div>
			</div>
		</header>
		<div :class="$style.body">
			<p :id="descriptionId" :class="$style.description">{{ copy.description }}</p>
			<div :class="$style.features">
				<section :class="$style.feature">
					<i class="ti ti-layout-columns" aria-hidden="true"></i>
					<div><h2>{{ copy.overviewTitle }}</h2><p>{{ copy.overviewDescription }}</p></div>
				</section>
				<section :class="$style.feature">
					<i class="ti ti-sunrise" aria-hidden="true"></i>
					<div><h2>{{ copy.themeTitle }}</h2><p>{{ copy.themeDescription }}</p></div>
				</section>
			</div>
			<p :class="$style.preserved"><i class="ti ti-check" aria-hidden="true"></i><span>{{ copy.preserved }}</span></p>
			<p v-if="failed" :class="$style.error" role="alert">{{ copy.saveError }}</p>
			<p v-if="busy && !closing" :class="$style.status" role="status">{{ copy.saving }}</p>
			<footer :class="$style.actions">
				<button ref="primary" type="button" :class="$style.primary" :disabled="busy || closing" data-notice-action="apply" @click="choose(true)">
					{{ failed ? copy.retry : active ? copy.continue : copy.apply }}<i class="ti ti-arrow-right" aria-hidden="true"></i>
				</button>
				<button type="button" :class="$style.secondary" :disabled="busy || closing" data-notice-action="later" @click="choose(false)">{{ active ? copy.close : copy.later }}</button>
			</footer>
		</div>
	</section>
</MkModal>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef, watch } from 'vue';
import MkModal from '@/components/MkModal.vue';
import { i18n } from '@/i18n.js';
import { getHataskDaylightStyle } from '@/utility/hatask-daylight.js';

const props = defineProps<{
	active: boolean;
	ownerActive: boolean;
	animation: boolean;
	mode: 'light' | 'dark';
	onChoose: (apply: boolean) => Promise<boolean>;
}>();
const emit = defineEmits<{ closed: [] }>();
const copy = i18n.ts._hata._hatask._akatsukiNotice;
const modal = useTemplateRef('modal');
const heading = useTemplateRef('heading');
const primary = useTemplateRef('primary');
const titleId = `hatask-akatsuki-notice-title-${useId()}`;
const descriptionId = `hatask-akatsuki-notice-description-${useId()}`;
const previousFocus = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
const returnFocusTo = computed(() => props.ownerActive ? previousFocus : null);
// eslint-disable-next-line vue/no-setup-props-reactivity-loss -- Keep the initial mount decision; later owner changes must close MkModal before unmounting it.
const showModal = props.ownerActive;
const openedAt = new Date();
const daylightStyle = computed(() => getHataskDaylightStyle(openedAt, props.mode));
const busy = ref(false);
const failed = ref(false);
const closing = ref(false);
const titleMotion = ref<'pending' | 'playing' | 'done'>('pending');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let disposed = false;

function finishTitleMotion(): void {
	titleMotion.value = 'done';
}

function onMotionPreferenceChange(event: MediaQueryListEvent): void {
	if (event.matches) finishTitleMotion();
}

function onOpened(): void {
	if (titleMotion.value === 'pending') {
		titleMotion.value = props.ownerActive && !closing.value && props.animation && !reducedMotion.matches ? 'playing' : 'done';
	}
	focusHeading();
}

function focusHeading(): void {
	if (props.ownerActive && !closing.value && !busy.value) heading.value?.focus({ preventScroll: true });
}

function dismissWithEscape(event: KeyboardEvent): void {
	event.preventDefault();
	event.stopPropagation();
	void choose(false);
}

async function choose(apply: boolean): Promise<void> {
	if (!props.ownerActive || busy.value || closing.value) return;
	busy.value = true;
	failed.value = false;
	let saved = false;
	try {
		saved = await props.onChoose(apply);
	} catch {
		// Applying needs a confirmed save; dismissal must remain possible after failure.
	}
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- The owner watcher can set closing while the save promise is pending.
	if (disposed || closing.value) return;
	if (apply && !saved) {
		failed.value = true;
		busy.value = false;
		await nextTick();
		primary.value?.focus({ preventScroll: true });
		return;
	}
	closeWithoutSaving();
}

/** The owner can leave Hatask without marking this introduction as read. */
function closeWithoutSaving(): void {
	if (closing.value) return;
	closing.value = true;
	finishTitleMotion();
	modal.value?.close();
}

onBeforeUnmount(() => {
	disposed = true;
	reducedMotion.removeEventListener('change', onMotionPreferenceChange);
});
onMounted(() => {
	reducedMotion.addEventListener('change', onMotionPreferenceChange);
	if (!showModal) emit('closed');
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ownerActive can change between the setup snapshot and this mounted hook.
	else if (!props.ownerActive) closeWithoutSaving();
});
watch(() => props.ownerActive, active => {
	if (!active) closeWithoutSaving();
}, { flush: 'post' });
watch(() => props.animation, enabled => {
	if (!enabled || reducedMotion.matches) finishTitleMotion();
}, { immediate: true });
defineExpose({ closeWithoutSaving });
</script>

<style lang="scss" module>
.root {
	--notice-paper: #fff7f2;
	--notice-fg: #2b1f2c;
	--notice-muted: #6a5566;
	--notice-ink: #b02e56;
	--notice-glass: rgba(255, 255, 255, .82);
	--notice-rule: rgba(80, 50, 70, .18);
	--notice-border: rgba(255, 255, 255, .7);
	container: hatask-akatsuki-notice / inline-size;
	position: relative;
	width: min(100%, 800px);
	min-width: 0;
	max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
	margin: auto;
	flex: 0 1 800px;
	box-sizing: border-box;
	overflow: auto;
	overscroll-behavior: contain;
	border: 1px solid var(--notice-border);
	border-radius: 32px;
	background: var(--notice-paper);
	color: var(--notice-fg);
	box-shadow: 0 30px 100px -30px rgba(0, 0, 0, .35);
	font: 14px/1.65 'Zen Kaku Gothic New', system-ui, sans-serif;
	line-break: strict;
	overflow-wrap: anywhere;
	color-scheme: light;

	&[data-mode='dark'] {
		--notice-paper: #1b1424;
		--notice-fg: #f6ecf3;
		--notice-muted: #c8b5c6;
		--notice-ink: #ff7fa3;
		--notice-glass: rgba(255, 255, 255, .1);
		--notice-rule: rgba(255, 255, 255, .18);
		--notice-border: rgba(255, 255, 255, .16);
		color-scheme: dark;
	}

	*, *::before, *::after { box-sizing: border-box; }
	button { font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
	button:disabled { opacity: .55; cursor: wait; }
	button:focus-visible { outline: 3px solid var(--notice-ink); outline-offset: 3px; }
	:global(.ti) { display: grid; place-items: center; width: 1em; height: 1em; flex: 0 0 auto; }
	:global(.ti)::before { display: block; font-size: 1em; line-height: 1; }
}

.hero {
	position: relative;
	padding: 44px 48px 28px;
	overflow: hidden;
	background: linear-gradient(168deg, var(--hak-daylight-start), var(--hak-daylight-middle) 46%, var(--hak-daylight-end));
}
.close {
	position: absolute;
	z-index: 1;
	top: 14px;
	right: 14px;
	display: grid;
	place-items: center;
	width: 44px;
	height: 44px;
	padding: 0;
	border: 1px solid var(--notice-rule);
	border-radius: 50%;
	background: var(--notice-glass);
	color: var(--notice-fg);
	font-size: 20px !important;
}
.title {
	position: relative;
	margin: 0;
	font-family: 'Righteous', 'Zen Kaku Gothic New', sans-serif;
	font-weight: 400;
	font-synthesis: none;
	line-height: 1;
	letter-spacing: -.025em;
	outline: none;
}
.brandVersion { display: block; padding-right: 34px; font-size: 19px; letter-spacing: .02em; }
.brandStage {
	// Both words pass through the same opening below H, with A on the same axis.
	--notice-title-duration: 1800ms;
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	margin-top: 8px;
	height: 1.18em;
	overflow: hidden;
	font-size: clamp(2rem, 17cqi, 136px);
	line-height: 1.18;
	pointer-events: none;
	isolation: isolate;
}
.brandFrom, .brandWord {
	grid-area: 1 / 1;
	min-width: 0;
	white-space: nowrap;
	transform-origin: .35em 100%;
}
// Static styles are the final frame, including when animations are interrupted.
.brandFrom { opacity: 0; transform: translateY(112%) scale(.08); }
.brandWord { opacity: 1; transform: none; }
.brandDoor {
	position: absolute;
	left: .02em;
	bottom: .015em;
	width: .66em;
	height: .86em;
	border: max(1px, .012em) solid var(--notice-ink);
	border-bottom: 0;
	border-radius: .33em .33em 0 0;
	opacity: 0;
	transform: scaleY(.08);
	transform-origin: .33em 100%;
}
.panes {
	display: grid;
	grid-template-columns: .18fr 1fr .38fr;
	gap: 14px;
	height: 88px;
	margin-top: 25px;
}
.rail, .canvas, .cases > span { border: 1px solid var(--notice-border); border-radius: 20px; background: var(--notice-glass); }
.rail { display: grid; align-content: center; justify-content: center; gap: 8px; }
.rail > span { width: 6px; height: 6px; border-radius: 50%; background: var(--notice-muted); opacity: .5; }
.rail > span:first-child { background: var(--MI_THEME-accent); opacity: 1; }
.canvas { position: relative; display: flex; justify-content: flex-end; flex-direction: column; gap: 8px; padding: 15px 20px; overflow: hidden; }
.sun { position: absolute; width: 40px; height: 40px; top: 14px; right: 20px; border-radius: 50%; background: color-mix(in srgb, var(--MI_THEME-accent) 25%, var(--notice-paper)); }
.horizon { z-index: 1; width: 44%; height: 5px; border-radius: 99px; background: var(--notice-rule); }
.horizon:last-child { width: 70%; }
.cases { display: grid; gap: 8px; }
.cases > span { border-radius: 99px; }
.body { padding: 26px 40px 30px; }
.description { margin: 0; max-width: 36em; font-size: 17px; font-weight: 700; }
.features { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-top: 24px; }
.feature { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.feature > :global(.ti) { margin-top: 3px; color: var(--notice-ink); font-size: 23px; }
.feature h2 { margin: 0; font-size: 14px; font-weight: 700; }
.feature p { margin: 6px 0 0; color: var(--notice-muted); font-size: 13px; }
.preserved { display: flex; align-items: flex-start; gap: 7px; margin: 24px 0 0; color: var(--notice-muted); font-size: 12px; }
.preserved > :global(.ti) { margin-top: 4px; font-size: 14px; }
.error { margin: 18px 0 0; color: var(--MI_THEME-error, var(--notice-ink)); font-weight: 700; }
.status { margin: 18px 0 0; color: var(--notice-muted); }
.actions { display: flex; align-items: stretch; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
.primary, .secondary { display: flex; justify-content: center; align-items: center; gap: 12px; min-width: 0; min-height: 48px; margin: 0; padding: 12px 22px; border-radius: 99px; text-align: center; line-height: 1.5; }
.primary { flex: 1 1 220px; border: 1px solid transparent; background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); font-weight: 700 !important; }
.primary > :global(.ti) { font-size: 18px; }
.secondary { flex: 0 1 auto; border: 1px solid var(--notice-rule); background: transparent; color: var(--notice-fg); }
.primary:hover:not(:disabled) { filter: brightness(1.06); }
.secondary:hover:not(:disabled), .close:hover:not(:disabled) { background: var(--notice-rule); }

@container hatask-akatsuki-notice (max-width: 520px) {
	.hero { padding: 46px 24px 22px; }
	.brandVersion { font-size: 16px; }
	.panes { gap: 9px; height: 65px; margin-top: 20px; }
	.rail, .canvas { border-radius: 16px; }
	.rail { gap: 6px; }
	.rail > span { width: 4px; height: 4px; }
	.canvas { padding: 12px 14px; }
	.sun { width: 30px; height: 30px; top: 10px; right: 14px; }
	.cases { gap: 6px; }
	.body { padding: 22px 24px 24px; }
	.description { font-size: 15px; }
	.features { grid-template-columns: minmax(0, 1fr); gap: 18px; margin-top: 22px; }
	.actions { flex-direction: column; }
	.primary, .secondary { flex: 0 0 auto; width: 100%; }
}

@keyframes notice-hatask-through-door {
	0%, 24% { opacity: 1; transform: none; }
	42% { opacity: 1; transform: translateY(-6%) scale(.08); }
	54%, 100% { opacity: 0; transform: translateY(112%) scale(.08); }
}
@keyframes notice-akatsuki-through-door {
	0%, 40% { opacity: 0; transform: translateY(112%) scale(.08); }
	46% { opacity: 1; transform: translateY(112%) scale(.08); }
	60% { opacity: 1; transform: translateY(-6%) scale(.08); }
	94%, 100% { opacity: 1; transform: none; }
}
@keyframes notice-letter-door {
	0%, 16% { opacity: 0; transform: scaleY(.08); }
	28%, 60% { opacity: .65; transform: scaleY(1); }
	86%, 100% { opacity: 0; transform: scaleY(.08); }
}
@media (prefers-reduced-motion: no-preference) {
	.root[data-motion='on'][data-title-motion='pending'] {
		.brandFrom { opacity: 1; transform: none; }
		.brandWord { opacity: 0; transform: translateY(112%) scale(.08); }
	}
	.root[data-motion='on'][data-title-motion='playing'] {
		.brandFrom { animation: notice-hatask-through-door var(--notice-title-duration) cubic-bezier(.65, 0, .35, 1) 1 both; }
		.brandWord { animation: notice-akatsuki-through-door var(--notice-title-duration) cubic-bezier(.22, .68, .18, 1) 1 both; }
		.brandDoor { animation: notice-letter-door var(--notice-title-duration) ease-in-out 1 both; }
	}
}
</style>

<style lang="scss">
/* Local overrides also stop MkModal's own entrance when this notice is static. */
.hatask-akatsuki-notice-modal > div:not([data-cy-bg]) {
	padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
}
.hatask-akatsuki-notice-modal[data-notice-motion='off'] > div {
	animation: none !important;
	transition: none !important;
	transform: none !important;
	opacity: 1 !important;
}
@media (prefers-reduced-motion: reduce) {
	.hatask-akatsuki-notice-modal[data-notice-motion] > div {
		animation: none !important;
		transition: none !important;
		transform: none !important;
		opacity: 1 !important;
	}
}
</style>
