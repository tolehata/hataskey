<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only

旗鯖fork: 更新後に1回だけ出す「今回の更新内容」。
	- 中身は utility/hata-whats-new.ts（HATA-CHANGELOG.md の要約）。
	- ⚠️MkUpdated（本家の「更新されました！」）とは別物。あちらは版の告知＋キャッシュ削除、
	  こちらは**何が変わったか**の説明。⚠️同時に開くと重なるので、表示は
	  utility/hata-dialog-queue.ts の待ち行列を通す（呼び出し側の責任）。
	- ⚠️「表示済み」の記録は**閉じられたとき**に付ける（呼び出し側）。先に付けると、
	  MkUpdated のキャッシュ削除による再読み込みで消えたときに二度と出なくなる。
-->
<template>
<MkModal ref="modal" :preferType="'dialog'" :zPriority="'middle'" @click="modal?.close()" @closed="emit('closed')">
	<div ref="releaseRoot" :class="$style.root" :data-closing="closing" :data-motion="motionAllowed ? 'enabled' : 'static'" :data-page-visible="pageVisible" role="dialog" aria-modal="true" aria-labelledby="hata-whats-new-title">
		<header :class="$style.header">
			<div :class="$style.releaseIdentity">
				<span :class="$style.releaseDot" aria-hidden="true"></span>
				<span>{{ copy.releaseIdentity }}</span>
			</div>
			<div :class="$style.releaseVersion">{{ releaseVersion }}</div>
			<!-- Keep the existing decorative header illustration and modal controls. -->
			<MkHatakyuIllustration v-if="useHatakyuBranding()" asset="treasureFound" :size="96" :class="$style.headerIllustration"/>
			<div :class="$style.headerText">
				<h1 id="hata-whats-new-title" :class="$style.title">{{ copy.title }}</h1>
				<p :class="$style.headline">{{ whatsNew.headline }}</p>
			</div>
		</header>

		<div ref="itemsViewport" :class="$style.items" @scroll.passive="syncCarouselPosition" @pointerdown="carouselTarget = null" @wheel.passive="carouselTarget = null">
			<article v-for="(item, i) in whatsNew.items" :key="i" :class="$style.item">
				<div
					:class="$style.preview"
					:data-preview="item.preview"
					:data-preview-state="previewStates[item.preview] ?? 'ready'"
					:data-preview-visible="previewVisibility[item.preview] ?? false"
					aria-hidden="true"
					@animationend="finishPreview($event, item.preview)"
				>
					<!-- Decorative miniatures; the translated title and explanation below stay visible. -->
					<div v-if="item.preview === 'hataskPlanner'" :class="$style.plannerMock">
						<div :class="$style.plannerTabs"><i class="ti ti-calendar-event"></i><i class="ti ti-arrow-right"></i><i class="ti ti-checkbox"></i></div>
						<div :class="$style.plannerStage">
							<div :class="$style.plannerCalendar"><span v-for="n in 21" :key="n" :data-selected="n === 10"></span></div>
							<div :class="$style.plannerTodo"><span v-for="n in 3" :key="n"><i class="ti ti-check"></i><u></u></span></div>
						</div>
					</div>

					<div v-else-if="item.preview === 'hataskGarden'" :class="$style.gardenMock">
						<i :class="[$style.gardenBloom, 'ti', 'ti-flower']"></i>
						<div :class="$style.gardenCards"><span v-for="n in 3" :key="n" :class="$style.gardenCard" :data-flower="n"><i class="ti ti-flower"></i><u></u><u></u></span></div>
					</div>

					<div v-else-if="item.preview === 'externalBearBear'" :class="$style.bearMock">
						<div :class="$style.bearPanel">
							<div :class="$style.bearHeader"><i class="ti ti-link"></i><u></u></div>
							<div :class="$style.bearList">
								<span :class="$style.bearRow"><em></em><u></u></span>
								<span :class="$style.bearRow"><em></em><u></u></span>
								<span :class="$style.bearNew"><em></em><b :class="$style.bearHost">xiapopisland.top</b><i class="ti ti-check"></i></span>
							</div>
						</div>
					</div>

					<div v-else-if="item.preview === 'gameFarewell'" :class="$style.farewellMock">
						<div :class="$style.farewellBook"><span :class="$style.farewellBookmark"></span><span :class="$style.farewellCover"></span></div>
						<i :class="[$style.farewellFlower, 'ti', 'ti-flower']"></i>
					</div>

					<div v-else-if="item.preview === 'welcomeRenewal'" :class="$style.welcomeMock">
						<div :class="$style.welcomeWindow">
							<div :class="$style.welcomeLandscape"></div>
							<b :class="$style.welcomeLogo">Hataskey</b>
							<div :class="$style.welcomeActions"><span></span><span></span></div>
							<div :class="$style.welcomeNotes"><span><em></em><u></u></span><span><em></em><u></u></span></div>
						</div>
					</div>

					<div v-else-if="item.preview === 'serverChoice'" :class="$style.serverChoiceMock">
						<b :class="$style.serverChoiceLogo">Hataskey</b>
						<div :class="$style.serverWindows">
							<span v-for="n in 3" :key="n" :class="$style.serverWindow" :data-slot="n"><i class="ti ti-server"></i><u></u><u></u></span>
						</div>
					</div>

					<div v-else-if="item.preview === 'dailyPolish'" :class="$style.polishMock">
						<div :class="$style.polishList"><span v-for="n in 3" :key="n" :class="$style.polishRow" :data-row="n"><u></u><i class="ti ti-check"></i></span></div>
					</div>
				</div>

				<div :class="$style.itemBody">
					<div :class="$style.itemTitle"><i :class="item.icon" aria-hidden="true"></i>{{ item.title }}</div>
					<div :class="$style.itemText">{{ item.text }}</div>
					<button v-if="item.to" class="_button" :class="$style.itemLink" @click="go(item)">
						{{ item.linkLabel ?? copy.open }} <i class="ti ti-chevron-right"></i>
					</button>
				</div>
			</article>
		</div>
		<nav :class="$style.carouselControls" :aria-label="copy.carouselLabel">
			<button type="button" :disabled="carouselIndex === 0" :aria-label="copy.previousItem" @click="moveCarousel(-1)">&lt;</button>
			<div :class="$style.carouselDots" :aria-label="copy.currentPosition">
				<button v-for="(_, i) in whatsNew.items" :key="i" type="button" :aria-label="copyx.showItem({ number: (i + 1).toString() })" :aria-current="carouselIndex === i ? 'true' : undefined" @click="showCarouselItem(i)"></button>
			</div>
			<span :class="$style.carouselCount">{{ carouselIndex + 1 }} / {{ whatsNew.items.length }}</span>
			<button type="button" :disabled="carouselIndex === whatsNew.items.length - 1" :aria-label="copy.nextItem" @click="moveCarousel(1)">&gt;</button>
		</nav>

		<footer :class="$style.footer">
			<p>
				{{ whatsNew.footer.text }}
				<button v-if="whatsNew.footer.linkUrl" class="_button" :class="$style.footerLink" @click="openReleaseNotes">
					{{ whatsNew.footer.linkLabel }} <i class="ti ti-external-link"></i>
				</button>
			</p>
			<MkButton primary rounded :class="$style.gotIt" :disabled="closing" @click="dismiss">{{ copy.gotIt }}</MkButton>
		</footer>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import type { HataWhatsNewItem } from '@/utility/hata-whats-new.js';
import MkModal from '@/components/MkModal.vue';
import MkButton from '@/components/MkButton.vue';
import MkHatakyuIllustration from '@/components/MkHatakyuIllustration.vue';
import { useHatakyuBranding } from '@/utility/hatakyu-assets.js';
import { getHataWhatsNewDisplayVersion, HATA_WHATS_NEW as whatsNew } from '@/utility/hata-whats-new.js';
import { mainRouter } from '@/router.js';
import { prefer } from '@/preferences.js';
import { i18n } from '@/i18n.js';

const copy = i18n.ts._hata._whatsNew._window;
const copyx = i18n.tsx._hata._whatsNew._window;
const modal = useTemplateRef('modal');
const releaseRoot = useTemplateRef('releaseRoot');
const itemsViewport = useTemplateRef('itemsViewport');
const carouselIndex = ref(0);
const carouselTarget = ref<number | null>(null);
const closing = ref(false);
const releaseVersion = computed(() => getHataWhatsNewDisplayVersion(whatsNew.version));
const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const reducedMotion = ref(motionQuery?.matches ?? false);
const pageVisible = ref(!window.document.hidden);
const motionAllowed = computed(() => prefer.r.animation.value && !reducedMotion.value);
const previewStates = ref<Record<string, 'ready' | 'running' | 'complete'>>({});
const previewVisibility = ref<Record<string, boolean>>({});
let previewObserver: IntersectionObserver | undefined;
let dismissTimer: number | undefined;

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

function completePreviews() {
	for (const item of whatsNew.items) previewStates.value[item.preview] = 'complete';
}

function startVisiblePreviews() {
	if (!motionAllowed.value || !pageVisible.value || closing.value) return;
	for (const item of whatsNew.items) {
		if (previewVisibility.value[item.preview] && (previewStates.value[item.preview] ?? 'ready') === 'ready') {
			previewStates.value[item.preview] = 'running';
		}
	}
}

function finishPreview(event: AnimationEvent, preview: HataWhatsNewItem['preview']) {
	// Only the preview clock itself completes the sequence, never a bubbling child animation.
	if (event.target === event.currentTarget) previewStates.value[preview] = 'complete';
}

function syncDocumentVisibility() {
	pageVisible.value = !window.document.hidden;
}

function syncReducedMotion() {
	reducedMotion.value = motionQuery?.matches ?? false;
}

watch([motionAllowed, pageVisible, closing], () => {
	if (!motionAllowed.value) completePreviews();
	else startVisiblePreviews();
}, { immediate: true, flush: 'sync' });

onMounted(() => {
	motionQuery?.addEventListener('change', syncReducedMotion);
	window.document.addEventListener('visibilitychange', syncDocumentVisibility);
	if (typeof IntersectionObserver === 'undefined' || !releaseRoot.value) {
		completePreviews();
		return;
	}
	previewObserver = new IntersectionObserver(entries => {
		for (const entry of entries) {
			const preview = (entry.target as HTMLElement).dataset.preview;
			if (preview) previewVisibility.value[preview] = entry.isIntersecting && entry.intersectionRatio >= 0.6;
		}
		startVisiblePreviews();
	}, { root: releaseRoot.value, threshold: [0, 0.6] });
	for (const preview of itemsViewport.value?.querySelectorAll('[data-preview]') ?? []) previewObserver.observe(preview);
});

onBeforeUnmount(() => {
	previewObserver?.disconnect();
	motionQuery?.removeEventListener('change', syncReducedMotion);
	window.document.removeEventListener('visibilitychange', syncDocumentVisibility);
	if (dismissTimer != null) window.clearTimeout(dismissTimer);
});

function go(item: HataWhatsNewItem) {
	if (item.to == null) return;
	// Close before navigation so the destination is never covered by this modal.
	modal.value?.close();
	mainRouter.push(item.to);
}

function dismiss() {
	if (closing.value) return;
	closing.value = true;
	dismissTimer = window.setTimeout(() => modal.value?.close(), motionAllowed.value ? 260 : 0);
}

function showCarouselItem(index: number) {
	const viewport = itemsViewport.value;
	const item = viewport?.children.item(index) as HTMLElement | null;
	const firstItem = viewport?.children.item(0) as HTMLElement | null;
	if (viewport == null || item == null || firstItem == null) return;
	carouselTarget.value = index;
	carouselIndex.value = index;
	viewport.scrollTo({ left: item.offsetLeft - firstItem.offsetLeft, behavior: motionAllowed.value ? 'smooth' : 'auto' });
}

function moveCarousel(direction: -1 | 1) {
	// Keep the requested destination while smooth scrolling reports intermediate cards.
	showCarouselItem(Math.max(0, Math.min(whatsNew.items.length - 1, (carouselTarget.value ?? carouselIndex.value) + direction)));
}

function syncCarouselPosition() {
	const viewport = itemsViewport.value;
	if (viewport == null) return;
	const children = [...viewport.children] as HTMLElement[];
	const firstOffset = children[0]?.offsetLeft ?? 0;
	let nearestIndex = 0;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const [index, item] of children.entries()) {
		const distance = Math.abs(item.offsetLeft - firstOffset - viewport.scrollLeft);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestIndex = index;
		}
	}
	carouselIndex.value = nearestIndex;
	if (carouselTarget.value === nearestIndex) carouselTarget.value = null;
}

// External release notes stay in a separate tab, leaving this guide open.
function openReleaseNotes() {
	if (whatsNew.footer.linkUrl == null) return;
	window.open(whatsNew.footer.linkUrl, '_blank', 'noopener,noreferrer');
}
</script>

<style lang="scss" module>
@font-face {
	font-family: 'HataWhatsNewRighteous';
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
}

.root {
	position: relative;
	box-sizing: border-box;
	width: 100%;
	max-width: 1180px;
	margin-inline: auto;
	max-height: calc(100dvh - 32px);
	overflow-y: auto;
	overscroll-behavior: contain;
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 18px;
	box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
	container-type: inline-size;
}

.header {
	display: grid;
	/* Hataskey fork: 1列目をハタキュ用に足した(元は `1fr auto` の2列)。 */
	grid-template-columns: auto 1fr auto;
	gap: 14px 20px;
	padding: 24px 24px 20px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

/* Hataskey fork: 装飾イラストは独立した列に置き、両方の行(識別子/バージョン行 + タイトル行)に
 * またがせて縦中央に配置する。既存の releaseIdentity/releaseVersion/headerText の配置・順序は変更しない。 */
.headerIllustration {
	grid-row: 1 / 3;
	grid-column: 1;
	align-self: start;
	justify-self: start;
	width: 96px;
	height: auto;
}

@container (max-width: 520px) {
	/* ⚠️狭い幅では隠さず縮める(ブランド表示なので消したくない)。 */
	.headerIllustration {
		width: 64px;
	}
}

.releaseIdentity { grid-column: 2; align-self: center; display: inline-flex; align-items: center; gap: 8px; font: 700 0.72em/1 ui-monospace, monospace; letter-spacing: .12em; opacity: .66; }
.releaseDot { width: 8px; height: 8px; border-radius: 50%; background: var(--MI_THEME-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--MI_THEME-accent) 13%, transparent); }
.releaseVersion { grid-column: 3; align-self: center; font: 600 .75em/1 ui-monospace, monospace; opacity: .58; }
/* Hataskey fork: 3列目(装飾イラスト)を追加したため、タイトル行がその列の下へ回り込んで
 * 重ならないよう、既存の 1〜2列目までに収める。 */
.headerText { grid-column: 2 / 4; min-width: 0; }
.title { margin: 0; font-size: clamp(1.45em, 4cqw, 2em); line-height: 1.15; font-weight: 800; letter-spacing: -.025em; }

.headline {
	margin: 7px 0 0;
	font-size: 0.92em;
	line-height: 1.55;
	opacity: 0.72;
}

.items { display: grid; grid-template-columns: 1fr; gap: 14px; padding: 18px; }

/* Item copy is always readable; only the decorative preview animates. */

.item {
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 14px;
	background: color-mix(in srgb, var(--MI_THEME-panel) 94%, var(--MI_THEME-fg));
}

.preview { height: 148px; position: relative; overflow: hidden; background: var(--MI_THEME-bg); border-bottom: 1px solid var(--MI_THEME-divider); }
.itemBody { display: flex; flex: 1; flex-direction: column; min-width: 0; padding: 15px 16px 14px; }
.itemTitle { display: flex; align-items: flex-start; gap: 7px; font-weight: 750; font-size: 0.93em; line-height: 1.45; }
.itemTitle > i { flex: none; margin-top: 2px; color: var(--MI_THEME-accent); }
.itemText { margin-top: 3px; font-size: 0.85em; line-height: 1.65; opacity: 0.75; }

.itemLink {
	align-self: flex-start;
	margin-top: auto;
	padding-top: 9px;
	border-bottom: 1px solid transparent;
	font-size: 0.83em;
	font-weight: 700;
	color: var(--MI_THEME-accent);
}
.itemLink:hover { border-bottom-color: currentColor; }

.carouselControls { display: none; }

.footer {
	display: flex;
	align-items: center;
	gap: 18px;
	position: sticky;
	bottom: 0;
	padding: 14px 18px;
	border-top: 1px solid var(--MI_THEME-divider);
	background: color-mix(in srgb, var(--MI_THEME-panel) 94%, transparent);
	backdrop-filter: blur(12px);
	box-shadow: 0 -10px 25px rgba(0,0,0,.05);
}
.footer p {
	flex: 1;
	margin: 0;
	font-size: 0.83em;
	line-height: 1.7;
	opacity: 0.75;
}

.footerLink {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin-left: 4px;
	padding: 0;
	font-size: 1em;
	font-weight: 700;
	color: var(--MI_THEME-accent);
}

.gotIt { flex: none; min-width: 120px; }
.root[data-closing="true"] { pointer-events: none; animation: hata-whats-new-slide-down .26s cubic-bezier(.22,.8,.24,1) forwards; }

@keyframes hata-whats-new-slide-down {
	to { opacity: 0; transform: translateY(56px); }
}

@container (min-width: 620px) {
	.items { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@container (min-width: 940px) {
	.items { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@container (max-width: 520px) {
	.header { padding: 19px 18px 16px; }
	.items {
		display: flex;
		gap: 10px;
		overflow-x: auto;
		overflow-y: hidden;
		padding: 12px 12px 7px;
		scroll-behavior: smooth;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		touch-action: pan-x pan-y;
	}
	.items::-webkit-scrollbar { display: none; }
	.item { flex: 0 0 100%; scroll-snap-align: start; scroll-snap-stop: always; }
	.carouselControls {
		display: grid;
		grid-template-columns: 44px minmax(0, 1fr) 44px;
		align-items: center;
		gap: 2px 8px;
		padding: 1px 13px 11px;
	}
	.carouselControls > button {
		display: grid;
		width: 44px;
		height: 44px;
		place-items: center;
		border: 1px solid var(--MI_THEME-divider);
		border-radius: 50%;
		color: var(--MI_THEME-fg);
		background: var(--MI_THEME-panel);
		font: 800 16px/1 ui-monospace, monospace;
		cursor: pointer;
	}
	.carouselControls > button:first-child { grid-column: 1; grid-row: 1; }
	.carouselControls > button:last-child { grid-column: 3; grid-row: 1; }
	.carouselControls > button:disabled { opacity: .28; cursor: default; }
	.carouselControls button:focus-visible { outline: 2px solid var(--MI_THEME-accent); outline-offset: 2px; }
	.carouselDots { grid-column: 1 / -1; grid-row: 2; display: flex; min-width: 0; justify-content: center; gap: 4px; }
	.carouselDots button {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: transparent;
		cursor: pointer;
	}
	.carouselDots button::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: color-mix(in srgb, var(--MI_THEME-fg) 22%, transparent); transition: transform .18s ease, background-color .18s ease; }
	.carouselDots button[aria-current="true"]::before { transform: scale(1.5); background: var(--MI_THEME-accent); }
	.carouselCount { grid-column: 2; grid-row: 1; justify-self: center; font: 650 11px/1 ui-monospace, monospace; opacity: .65; white-space: nowrap; }
	.footer { align-items: stretch; flex-direction: column; gap: 9px; }
	.gotIt { width: 100%; }
}
/* ===== Seven finite, viewport-triggered previews ===== */
.preview {
	--preview-ease: cubic-bezier(.2,.8,.25,1);
	color: var(--MI_THEME-fg);
	isolation: isolate;
}
.preview * { box-sizing: border-box; }
.preview u { text-decoration: none; }
.root[data-motion="enabled"] .preview[data-preview-state="ready"] > * { visibility: hidden; }
.preview[data-preview-state="running"] { animation: hwnPreviewClock 1.6s linear 1 both; }
@keyframes hwnPreviewClock { from, to { opacity: 1; } }

/* Calendar changes to ToDo in the same fixed-size frame. */
.plannerMock { height: 100%; display: grid; align-content: center; justify-items: center; gap: 9px; }
.plannerTabs { display: flex; align-items: center; gap: 16px; color: var(--MI_THEME-accent); font-size: 16px; }
.plannerTabs > i:nth-child(2) { color: var(--MI_THEME-fg); opacity: .5; font-size: 12px; }
.plannerStage { position: relative; width: 180px; height: 82px; border: 1px solid var(--MI_THEME-divider); border-radius: 10px; background: var(--MI_THEME-panel); }
.plannerCalendar { position: absolute; inset: 10px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; opacity: 0; }
.plannerCalendar > span { border-radius: 3px; background: color-mix(in srgb, var(--MI_THEME-fg) 12%, var(--MI_THEME-panel)); }
.plannerCalendar > span[data-selected="true"] { background: var(--MI_THEME-accent); }
.plannerTodo { position: absolute; inset: 10px 14px; display: flex; flex-direction: column; justify-content: space-between; }
.plannerTodo > span { display: flex; align-items: center; gap: 9px; color: var(--MI_THEME-success); font-size: 13px; }
.plannerTodo u { height: 5px; width: 76%; border-radius: 8px; background: color-mix(in srgb, var(--MI_THEME-fg) 20%, var(--MI_THEME-panel)); }
.plannerTodo > span:nth-child(2) u { width: 58%; }
.preview[data-preview-state="running"] .plannerCalendar { animation: hwnPlannerCalendar 1.05s var(--preview-ease) 1 both; }
.preview[data-preview-state="running"] .plannerTodo { animation: hwnPlannerTodo 1.05s var(--preview-ease) 1 both; }
@keyframes hwnPlannerCalendar { 0%, 35% { opacity: 1; transform: none; } 65%, 100% { opacity: 0; transform: translateY(-9px) scale(.96); } }
@keyframes hwnPlannerTodo { 0%, 38% { opacity: 0; transform: translateY(10px); } 80%, 100% { opacity: 1; transform: none; } }

/* A single bloom unfolds into the shared flower gallery. */
.gardenMock { position: relative; height: 100%; display: grid; place-items: center; }
.gardenBloom { position: absolute; top: 50%; left: 50%; display: grid; place-items: center; width: 52px; height: 52px; margin: -26px 0 0 -26px; font-size: 48px; color: var(--MI_THEME-accent); opacity: 0; }
.gardenCards { display: flex; align-items: center; justify-content: center; gap: 9px; }
.gardenCard { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 56px; padding: 12px 8px 9px; border: 1px solid var(--MI_THEME-divider); border-radius: 10px; background: var(--MI_THEME-panel); }
.gardenCard > i { display: grid; place-items: center; width: 32px; height: 36px; font-size: 28px; color: var(--MI_THEME-accent); }
.gardenCard[data-flower="2"] > i { color: var(--MI_THEME-success); }
.gardenCard[data-flower="3"] > i { color: var(--MI_THEME-warn); }
.gardenCard > u { height: 4px; width: 28px; border-radius: 8px; background: color-mix(in srgb, var(--MI_THEME-fg) 18%, var(--MI_THEME-panel)); }
.gardenCard > u:last-child { width: 18px; opacity: .6; }
.preview[data-preview-state="running"] .gardenBloom { animation: hwnGardenBloom 1.1s var(--preview-ease) 1 both; }
.preview[data-preview-state="running"] .gardenCard { animation: hwnGardenCards 1.3s var(--preview-ease) 1 both; }
.preview[data-preview-state="running"] .gardenCard[data-flower="1"] { --garden-x: 50px; }
.preview[data-preview-state="running"] .gardenCard[data-flower="2"] { --garden-x: 0px; }
.preview[data-preview-state="running"] .gardenCard[data-flower="3"] { --garden-x: -50px; }
@keyframes hwnGardenBloom { 0% { opacity: 0; transform: scale(.3) rotate(-20deg); } 28%, 45% { opacity: 1; transform: scale(1); } 80%, 100% { opacity: 0; transform: scale(1.15); } }
@keyframes hwnGardenCards { 0%, 38% { opacity: 0; transform: translateX(var(--garden-x)) scale(.75); } 82%, 100% { opacity: 1; transform: none; } }

/* A destination joins the existing list; this is an illustration, not a connection. */
.bearMock { height: 100%; display: grid; place-items: center; }
.bearPanel { width: 198px; padding: 10px; border: 1px solid var(--MI_THEME-divider); border-radius: 11px; background: var(--MI_THEME-panel); }
.bearHeader { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; color: var(--MI_THEME-accent); font-size: 14px; }
.bearHeader > u { width: 50%; height: 5px; border-radius: 8px; background: color-mix(in srgb, var(--MI_THEME-fg) 18%, var(--MI_THEME-panel)); }
.bearList { display: flex; flex-direction: column; gap: 5px; }
.bearRow { display: flex; align-items: center; gap: 7px; padding: 5px 7px; border-radius: 6px; background: var(--MI_THEME-bg); }
.bearRow > em { width: 5px; height: 5px; border-radius: 50%; background: color-mix(in srgb, var(--MI_THEME-fg) 25%, var(--MI_THEME-bg)); }
.bearRow > u { width: 64%; height: 4px; border-radius: 8px; background: color-mix(in srgb, var(--MI_THEME-fg) 14%, var(--MI_THEME-bg)); }
.bearRow:nth-child(2) > u { width: 48%; }
.bearNew { display: flex; align-items: center; gap: 7px; padding: 6px 7px; border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 55%, var(--MI_THEME-divider)); border-radius: 6px; background: var(--MI_THEME-accentedBg); }
.bearNew > em { width: 5px; height: 5px; flex: none; border-radius: 50%; background: var(--MI_THEME-accent); }
.bearNew > i { margin-left: auto; color: var(--MI_THEME-accent); font-size: 13px; }
.bearHost { min-width: 0; font: 600 10px/1.3 ui-monospace, monospace; color: var(--MI_THEME-fg); }
.preview[data-preview-state="running"] .bearNew { animation: hwnBearJoin .65s var(--preview-ease) .12s 1 both; }
.preview[data-preview-state="running"] .bearNew > i { animation: hwnBearCheck .36s var(--preview-ease) .65s 1 both; }
@keyframes hwnBearJoin { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: none; } }
@keyframes hwnBearCheck { from { opacity: 0; transform: scale(.4); } to { opacity: 1; transform: scale(1); } }

/* A quiet farewell: a closed book, bookmark and flower. No game assets. */
.farewellMock { position: relative; height: 100%; display: grid; place-items: center; background: linear-gradient(150deg, var(--MI_THEME-panel), var(--MI_THEME-bg)); }
.farewellBook { position: relative; width: 91px; height: 104px; border: 1px solid var(--MI_THEME-divider); border-left: 7px solid color-mix(in srgb, var(--MI_THEME-accent) 55%, var(--MI_THEME-panel)); border-radius: 4px 10px 10px 4px; background: var(--MI_THEME-accentedBg); transform: rotate(-5deg); box-shadow: 5px 7px 0 color-mix(in srgb, var(--MI_THEME-fg) 7%, transparent); }
.farewellBookmark { position: absolute; top: -1px; right: 14px; width: 12px; height: 38px; background: color-mix(in srgb, var(--MI_THEME-warn) 75%, var(--MI_THEME-panel)); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%); }
.farewellCover { position: absolute; left: 17px; right: 17px; top: 49px; height: 1px; background: color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); }
.farewellFlower { position: absolute; left: calc(50% + 22px); top: 83px; font-size: 32px; color: var(--MI_THEME-accent); transform: rotate(12deg); }
.preview[data-preview-state="running"] .farewellBook { animation: hwnFarewellClose 1s var(--preview-ease) 1 both; }
.preview[data-preview-state="running"] .farewellBookmark { animation: hwnFarewellBookmark .7s var(--preview-ease) .12s 1 both; }
.preview[data-preview-state="running"] .farewellFlower { animation: hwnFarewellFlower 1s var(--preview-ease) .25s 1 both; }
@keyframes hwnFarewellClose { from { transform: translateY(-5px) rotate(-9deg); } to { transform: rotate(-5deg); } }
@keyframes hwnFarewellBookmark { from { transform: scaleY(.2); opacity: .2; } to { transform: scaleY(1); opacity: 1; } }
@keyframes hwnFarewellFlower { from { opacity: 0; transform: translate(-9px, -6px) rotate(-12deg); } to { opacity: 1; transform: rotate(12deg); } }

/* The new entrance gathers its own elements within a landscape window. */
.welcomeMock { height: 100%; display: grid; place-items: center; }
.welcomeWindow { position: relative; isolation: isolate; width: min(234px, 88%); height: 126px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; overflow: hidden; border: 1px solid var(--MI_THEME-divider); border-radius: 10px; background: var(--MI_THEME-panel); }
.welcomeLandscape { position: absolute; z-index: -1; inset: 0; opacity: .7; background: radial-gradient(ellipse at 16% 4%, color-mix(in srgb, var(--MI_THEME-success) 28%, transparent), transparent 67%), radial-gradient(ellipse at 95% 82%, color-mix(in srgb, var(--MI_THEME-accent) 24%, transparent), transparent 70%), linear-gradient(160deg, var(--MI_THEME-bg), var(--MI_THEME-panel)); }
.welcomeLogo { font: 400 23px/1.15 'HataWhatsNewRighteous', sans-serif; color: var(--MI_THEME-fg); }
.welcomeActions { display: flex; gap: 5px; }
.welcomeActions > span { width: 62px; height: 12px; border: 1px solid var(--MI_THEME-accent); border-radius: 999px; }
.welcomeActions > span:last-child { background: var(--MI_THEME-accent); }
.welcomeNotes { display: flex; flex-direction: column; gap: 4px; width: 146px; }
.welcomeNotes > span { display: flex; align-items: center; gap: 6px; padding: 5px 7px; border: 1px solid var(--MI_THEME-divider); border-radius: 6px; background: var(--MI_THEME-panel); }
.welcomeNotes em { width: 9px; height: 9px; flex: none; border-radius: 50%; background: var(--MI_THEME-accentedBg); }
.welcomeNotes u { width: 78%; height: 4px; border-radius: 8px; background: color-mix(in srgb, var(--MI_THEME-fg) 18%, var(--MI_THEME-panel)); }
.preview[data-preview-state="running"] .welcomeLogo { animation: hwnWelcomeLogo .6s var(--preview-ease) 1 both; }
.preview[data-preview-state="running"] .welcomeActions { animation: hwnWelcomeActions .5s var(--preview-ease) .3s 1 both; }
.preview[data-preview-state="running"] .welcomeNotes > span { animation: hwnWelcomeNotes .55s var(--preview-ease) .6s 1 both; }
.preview[data-preview-state="running"] .welcomeNotes > span:last-child { --note-x: 18px; animation-delay: .72s; }
@keyframes hwnWelcomeLogo { from { opacity: 0; transform: translateY(-12px) scale(.92); } to { opacity: 1; transform: none; } }
@keyframes hwnWelcomeActions { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: none; } }
@keyframes hwnWelcomeNotes { from { opacity: 0; transform: translateX(var(--note-x, -18px)); } to { opacity: 1; transform: none; } }

/* Hataskey is a wordmark; three distinct windows share the platform. */
.serverChoiceMock { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 13px; }
.serverChoiceLogo { font: 400 24px/1.15 'HataWhatsNewRighteous', sans-serif; color: var(--MI_THEME-fg); }
.serverWindows { position: relative; width: 222px; height: 64px; }
.serverWindow { --server-x: 0px; --server-y: 5px; --server-r: 0deg; position: absolute; top: 0; left: calc(50% - 32px); width: 64px; height: 54px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 8px; border: 1px solid var(--MI_THEME-divider); border-radius: 8px; background: var(--MI_THEME-panel); transform: translate(var(--server-x), var(--server-y)) rotate(var(--server-r)); }
.serverWindow[data-slot="1"] { --server-x: -75px; --server-y: 0px; --server-r: -5deg; }
.serverWindow[data-slot="3"] { --server-x: 75px; --server-y: 0px; --server-r: 5deg; }
.serverWindow > i { font-size: 12px; color: var(--MI_THEME-accent); }
.serverWindow > u { width: 100%; height: 3px; border-radius: 8px; background: color-mix(in srgb, var(--MI_THEME-fg) 18%, var(--MI_THEME-panel)); }
.serverWindow > u:last-child { width: 62%; }
.preview[data-preview-state="running"] .serverChoiceLogo { animation: hwnServerWord .5s var(--preview-ease) 1 both; }
.preview[data-preview-state="running"] .serverWindow { animation: hwnServerFan 1s var(--preview-ease) .22s 1 both; }
@keyframes hwnServerWord { from { transform: translateY(12px); } to { transform: none; } }
@keyframes hwnServerFan { from { opacity: 0; transform: translate(0, -28px) scale(.55); } to { opacity: 1; transform: translate(var(--server-x), var(--server-y)) rotate(var(--server-r)); } }

/* Small uneven details settle into a clean, checked list. */
.polishMock { height: 100%; display: grid; place-items: center; }
.polishList { width: 180px; display: flex; flex-direction: column; gap: 8px; }
.polishRow { --row-offset: -14px; --row-tilt: -3deg; display: flex; align-items: center; justify-content: space-between; gap: 12px; height: 27px; padding: 5px 9px; border: 1px solid var(--MI_THEME-divider); border-radius: 7px; background: var(--MI_THEME-panel); }
.polishRow[data-row="2"] { --row-offset: 11px; --row-tilt: 3deg; }
.polishRow[data-row="3"] { --row-offset: -7px; --row-tilt: -2deg; }
.polishRow > u { width: 68%; height: 5px; border-radius: 8px; background: color-mix(in srgb, var(--MI_THEME-fg) 18%, var(--MI_THEME-panel)); }
.polishRow > i { color: var(--MI_THEME-success); font-size: 14px; }
.preview[data-preview-state="running"] .polishRow { animation: hwnPolishAlign .65s var(--preview-ease) 1 both; }
.preview[data-preview-state="running"] .polishRow[data-row="2"] { animation-delay: .12s; }
.preview[data-preview-state="running"] .polishRow[data-row="3"] { animation-delay: .24s; }
.preview[data-preview-state="running"] .polishRow > i { animation: hwnPolishCheck .35s var(--preview-ease) .65s 1 both; }
.preview[data-preview-state="running"] .polishRow[data-row="2"] > i { animation-delay: .77s; }
.preview[data-preview-state="running"] .polishRow[data-row="3"] > i { animation-delay: .89s; }
@keyframes hwnPolishAlign { from { transform: translateX(var(--row-offset)) rotate(var(--row-tilt)); } to { transform: none; } }
@keyframes hwnPolishCheck { from { opacity: 0; transform: scale(.5); } to { opacity: 1; transform: scale(1); } }

/* Pausing preserves progress; revisiting a finished preview never starts it again. */
.preview[data-preview-visible="false"],
.preview[data-preview-visible="false"] *,
.root[data-page-visible="false"] .preview,
.root[data-page-visible="false"] .preview *,
.root[data-closing="true"] .preview,
.root[data-closing="true"] .preview *,
.item:focus-within .preview,
.item:focus-within .preview * { animation-play-state: paused !important; }

/* Base styles are the completed composition, including when motion is switched off mid-run. */
.root[data-motion="static"],
.root[data-motion="static"] * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
.root[data-motion="static"] *::before,
.root[data-motion="static"] *::after { animation: none !important; transition: none !important; }

@media (prefers-reduced-motion: reduce) {
	.root, .root * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
	.root *::before, .root *::after { animation: none !important; transition: none !important; }
	.preview > * { visibility: visible !important; }
}
</style>
