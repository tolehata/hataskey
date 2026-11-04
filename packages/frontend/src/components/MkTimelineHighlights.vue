<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<section ref="rootEl" :class="$style.root" :data-variant="variant" :data-motion="motion" :data-glass="glassBg" :aria-label="copy.title">
	<div :class="$style.toolbar">
		<div :class="$style.dateControls">
			<button class="_button" :class="$style.iconButton" :aria-label="copy.previousDay" @click="shiftDay(-1)"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>
			<input :value="day" :class="$style.dateInput" type="date" :max="today" :aria-label="copy.date" @change="changeDate">
			<button class="_button" :class="$style.iconButton" :disabled="day >= today" :aria-label="copy.nextDay" @click="shiftDay(1)"><i class="ti ti-chevron-right" aria-hidden="true"></i></button>
		</div>
		<div :class="$style.zoomControls">
			<button class="_button" :class="$style.iconButton" :disabled="changingDay || refreshing || (selectedBand == null && overviewZoom === 2)" :aria-label="copy.zoomOut" :title="copy.zoomOut" @click="zoomOut"><i class="ti ti-minus" aria-hidden="true"></i></button>
			<button class="_button" :class="$style.iconButton" :disabled="changingDay || refreshing || focusedNote != null || (selectedBand != null && selectedNotes.length === 0)" :aria-label="copy.zoomIn" :title="copy.zoomIn" @click="zoomIn"><i class="ti ti-plus" aria-hidden="true"></i></button>
		</div>
	</div>
	<div v-if="sceneLoading" :class="$style.sceneLoading" :style="{ top: `${loadingTop}px` }" role="status" :aria-label="i18n.ts.loading" data-highlight-loading><MkLoading :colored="false"/></div>
	<div ref="dayStageEl" :class="$style.dayStage" :aria-busy="loading || changingDay || refreshing">
		<div :key="sceneRevision" ref="daySceneEl" :class="$style.dayScene" :style="{ visibility: refreshing ? 'hidden' : undefined }" :inert="changingDay || refreshing" :aria-hidden="changingDay || refreshing" :data-refreshing="refreshing" :data-highlight-day="displayedDay">
			<div :class="$style.status" :style="{ visibility: sceneLoading ? 'hidden' : undefined }" role="status" aria-live="polite">
				<span>{{ complete ? copyx.count({ count: visibleNotes.length }) : copyx.partialCount({ count: visibleNotes.length }) }}</span>
				<span v-if="!complete && notes.length > 0" :class="$style.partial">{{ copy.partial }}</span>
				<button v-if="!loading" class="_button" :class="$style.refresh" :aria-label="copy.retry" @click="resetLoader()"><i class="ti ti-refresh" aria-hidden="true"></i></button>
			</div>
			<div v-if="error" :class="$style.message" role="alert">
				<span>{{ stalled ? copy.cursorStalled : copy.loadFailed }}</span>
				<button class="_button" :class="$style.textButton" @click="stalled ? resetLoader() : loadMore()">{{ stalled ? copy.retry : i18n.ts.retry }}</button>
			</div>
			<div v-if="notes.length > 0 || complete || (refreshing && refreshHadWorkspace)" :class="$style.workspace" :data-detail="selectedBand != null">
				<nav :class="$style.rail" :style="{ height: `${railHeight}px` }" :aria-label="copy.overview">
					<MkTimelineHighlightSpine :class="$style.spine" :points="spinePoints" :height="railHeight" :motion="motion"/>
					<button
						v-for="(band, index) in bands" :key="band.start" class="_button" :class="$style.timeButton"
						:style="{ top: `${layouts[index]?.top ?? index * 52}px`, height: `${layouts[index]?.height ?? 52}px` }"
						:data-selected="selectedBand === index" :aria-current="selectedBand === index ? 'time' : undefined"
						:aria-label="`${copyx.density({ time: band.label, count: band.notes.length })}${band.partial ? `・${copy.partial}` : ''}`"
						:title="`${band.label} · ${countLabel(band)}`" @click="openBand(index)"
					><span>{{ band.hour }}</span><span v-if="band.partial" :class="$style.unknown" aria-hidden="true">···</span></button>
				</nav>
				<div ref="bodyEl" :class="$style.body">
					<div :class="$style.overview" :data-zoom="overviewZoom" :data-detail="selectedBand != null">
						<section v-for="(band, index) in bands" v-show="selectedBand == null || selectedBand === index" :key="band.start" :data-highlight-band="index" :class="$style.band">
							<button v-show="selectedBand == null" class="_button" :class="$style.bandHeader" @click="openBand(index)">
								<span :class="$style.bandTime">{{ band.label }}</span>
								<span :class="$style.bandCount">{{ countLabel(band) }}</span>
								<i class="ti ti-chevron-right" aria-hidden="true"></i>
							</button>
							<header v-if="selectedBand === index" :class="$style.detailHeader">
								<button class="_button" :class="$style.iconButton" :aria-label="focusedNote == null ? copy.overview : i18n.ts.goBack" @click="zoomOut"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>
								<strong>{{ focusedNote != null ? copy.note : band.label }}</strong><span>{{ countLabel(band) }}</span>
							</header>
							<div :class="$style.preview" :inert="selectedBand == null && overviewZoom !== 0" :aria-hidden="selectedBand == null && overviewZoom !== 0">
								<div :class="$style.previewInner">
									<!-- Keep each native note instance across zoom levels: actions live in MkNote's capture state. -->
									<div v-for="(note, noteIndex) in band.notes.slice(0, bandLimits[index])" v-show="selectedBand == null ? noteIndex === 0 : focusedNote == null || focusedNote === note.id" :key="note.id" :class="$style.detailNote" :data-note-removal-id="note.id">
										<slot name="note" :note="note">
											<div :class="$style.noteHost" data-bubble="on" :data-glass-bg="glassBg ? 'on' : undefined"><MkNote :note="note" :withHardMute="true"/></div>
										</slot>
										<div :class="$style.noteLinks">
											<time v-if="selectedBand != null" :datetime="note.createdAt">{{ formatTime(note.createdAt) }}</time>
											<button class="_button" :class="$style.textButton" @click="emit('navigate', note)"><i class="ti ti-history" aria-hidden="true"></i>{{ copy.toTimeline }}</button>
										</div>
									</div>
									<div v-if="band.notes.length === 0" :class="$style.emptyBand">{{ band.partial ? copy.unloaded : i18n.ts.noNotes }}</div>
									<button v-if="selectedBand === index && focusedNote == null && band.notes.length > bandLimits[index]" class="_button" :class="$style.more" @click="bandLimits[index] += 20">{{ i18n.ts.loadMore }}</button>
								</div>
							</div>
						</section>
					</div>
				</div>
			</div>
			<button v-if="!complete && !stalled && !error" class="_button" :class="$style.more" :style="{ visibility: sceneLoading ? 'hidden' : undefined }" :disabled="loading" @click="loadMore"><MkLoading v-if="loading && !sceneLoading" :inline="true"/><span v-else>{{ copy.loadMore }}</span></button>
		</div>
	</div>
</section>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue';
import * as Misskey from 'cherrypick-js';
import { getScrollContainer } from '@@/js/scroll.js';
import MkNote from '@/components/MkNote.vue';
import MkTimelineHighlightSpine from '@/components/MkTimelineHighlightSpine.vue';
import { buildHighlightBins, createTimelineHighlightsLoader, filterHighlightNotes, getHighlightDayBounds } from '@/utility/timeline-highlights.js';
import type { HighlightSnapshot, HighlightSource } from '@/utility/timeline-highlights.js';
import { createTimelineHighlightDayMotion } from '@/utility/timeline-highlight-day-motion.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { prefer } from '@/preferences.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { useGlobalEvent } from '@/events.js';
import { isMutedUser } from '@/utility/muted-users.js';

const props = withDefaults(defineProps<{
	src: HighlightSource;
	withRenotes: boolean;
	withSensitive: boolean;
	onlyFiles: boolean;
	glassBg: boolean;
	active?: boolean;
	variant?: 'default' | 'uis';
	/** Space covered by navigation above the scroll viewport, measured when scrolling. */
	scrollInset?: number | (() => number);
	/** Observe floating navigation whose height can change independently of the viewport. */
	scrollInsetTarget?: HTMLElement | null;
}>(), { active: true, variant: 'default', scrollInset: 0, scrollInsetTarget: null });
defineSlots<{ note?: (props: { note: Misskey.entities.Note }) => unknown }>();
const emit = defineEmits<{ navigate: [note: Misskey.entities.Note]; invalidate: [] }>();
const copy = i18n.ts._hata._highlights;
const copyx = i18n.tsx._hata._highlights;
const rootEl = shallowRef<HTMLElement | null>(null);
const bodyEl = shallowRef<HTMLElement | null>(null);
const dayStageEl = shallowRef<HTMLElement | null>(null);
const daySceneEl = shallowRef<HTMLElement | null>(null);
const changingDay = ref(false);
const refreshing = ref(false);
const refreshHadWorkspace = ref(false);
const sceneRevision = ref(0);
// UI S's native notes apply edit events to this object; keep a stable reactive proxy.
const notes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const complete = ref(false);
const error = ref(false);
const stalled = ref(false);
const sceneLoading = computed(() => props.active && loading.value && (changingDay.value || refreshing.value || notes.value.length === 0));
const loadingTop = ref(0);
const overviewZoom = ref(0);
const selectedBand = ref<number | null>(null);
const focusedNote = ref<string | null>(null);
const bandLimits = ref([1, 1, 1, 1, 1, 1]);
const layouts = shallowRef<Array<{ top: number; height: number }>>([]);
const railHeight = ref(312);
const reducedMotion = ref(true);
const motion = computed(() => prefer.r.animation.value && !reducedMotion.value && props.active);
const day = ref(dateValue(new Date()));
const displayedDay = ref(day.value);
const today = ref(dateValue(new Date()));
const bounds = computed(() => getHighlightDayBounds(day.value));
const displayedBounds = computed(() => getHighlightDayBounds(displayedDay.value));
const dayMotion = createTimelineHighlightDayMotion({ stage: () => dayStageEl.value, scene: () => daySceneEl.value, motion: () => motion.value });
let dayExit: Promise<void> = Promise.resolve();
let loader: ReturnType<typeof createTimelineHighlightsLoader> | null = null;
let controller: AbortController | null = null;
let resizeObserver: ResizeObserver | null = null;
let motionQuery: MediaQueryList | null = null;
let measureFrame = 0;
let generation = 0;
let displayedPagesLoaded = 0;
let overviewScroll = 0;
let scrollRevision = 0;
let wasInactive = false;
let midnightTimer: number | undefined;
// Deletions remain filtered if a previously fetched loader snapshot is applied again.
const deletedIds = new Set<string>();
const removalVersion = ref(0);

provide('inTimeline', true);
provide('tl_withSensitive', computed(() => props.withSensitive));
provide('inChannel', false);
provide('inLocalTimeline', computed(() => props.src === 'local'));
provide('noteBubbleEnabled', computed(() => true));
provide('noteTimelineGlassBg', computed(() => props.glassBg));

const visibleNotes = computed(() => {
	removalVersion.value;
	return filterHighlightNotes(notes.value, {
		me: $i,
		hardMutedWords: $i?.hardMutedWords,
		hideBots: prefer.r['simpleUi.hideBotsInTimeline'].value,
		botAllowlist: prefer.r['simpleUi.botAllowlist'].value,
		isMutedUser,
	}).filter(note => !deletedIds.has(note.id) && !(Misskey.note.isPureRenote(note) && deletedIds.has(note.renoteId!)));
});
const bins = computed(() => buildHighlightBins(visibleNotes.value, displayedBounds.value));
const loadedSince = computed(() => complete.value ? displayedBounds.value.start : notes.value.reduce((earliest, note) => Math.min(earliest, Date.parse(note.createdAt)), displayedBounds.value.end));
const bands = computed(() => Array.from({ length: 6 }, (_, index) => {
	const start = new Date(displayedBounds.value.start);
	start.setHours(index * 4);
	const end = new Date(displayedBounds.value.start);
	end.setHours((index + 1) * 4);
	const bandNotes = visibleNotes.value.filter(note => Date.parse(note.createdAt) >= start.getTime() && Date.parse(note.createdAt) < end.getTime());
	return {
		start: start.getTime(), end: end.getTime(), notes: bandNotes,
		hour: `${String(index * 4).padStart(2, '0')}:00`,
		label: `${String(index * 4).padStart(2, '0')}:00–${String((index + 1) * 4).padStart(2, '0')}:00`,
		partial: !complete.value && start.getTime() < loadedSince.value,
	};
}));
const spinePoints = computed(() => bins.value.map(bin => {
	const bandIndex = Math.min(5, Math.floor(new Date(bin.start).getHours() / 4));
	const band = bands.value[bandIndex];
	const layout = layouts.value[bandIndex] ?? { top: bandIndex * 52, height: 52 };
	return { y: layout.top + ((bin.start + bin.end) / 2 - band.start) / (band.end - band.start) * layout.height, density: bin.density };
}));
const selectedNotes = computed(() => selectedBand.value == null ? [] : bands.value[selectedBand.value].notes);

function dateValue(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function countLabel(band: { notes: Misskey.entities.Note[]; partial: boolean }): string {
	return band.partial ? (band.notes.length ? copyx.partialCount({ count: band.notes.length }) : copy.unloaded) : copyx.count({ count: band.notes.length });
}

function formatTime(value: string): string {
	return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function changeDate(event: Event) {
	const value = (event.target as HTMLInputElement).value;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today.value) return;
	try {
		getHighlightDayBounds(value);
		day.value = value;
	} catch { /* Ignore incomplete or invalid native date input. */ }
}

function shiftDay(amount: number) {
	const date = new Date(bounds.value.start);
	date.setDate(date.getDate() + amount);
	day.value = dateValue(date);
}

async function loadMore() {
	if (!loader || loading.value || !props.active || complete.value || stalled.value) return;
	const current = loader;
	const ownGeneration = generation;
	const exit = dayExit;
	const maxPages = refreshing.value ? Math.max(5, displayedPagesLoaded) : 5;
	const request = new AbortController();
	controller = request;
	loading.value = true;
	error.value = false;
	try {
		const result = await current.load({ maxPages, signal: request.signal });
		if (ownGeneration !== generation || request.signal.aborted) return;
		await applySnapshot(result, false, ownGeneration, exit);
	} catch {
		if (ownGeneration !== generation || request.signal.aborted) return;
		await applySnapshot(current.snapshot(), true, ownGeneration, exit);
	} finally {
		if (ownGeneration === generation) loading.value = false;
	}
}

async function applySnapshot(snapshot: HighlightSnapshot, failed: boolean, ownGeneration: number, exit: Promise<void>) {
	await exit;
	if (ownGeneration !== generation || !props.active) return;
	// Native note components capture their initial object; a newly fetched day needs fresh instances,
	// including when a reversed date change returns to the same note IDs.
	if (changingDay.value || refreshing.value) sceneRevision.value++;
	if (displayedDay.value !== day.value) resetSelection();
	displayedDay.value = day.value;
	notes.value = snapshot.notes;
	displayedPagesLoaded = snapshot.pagesLoaded;
	if (focusedNote.value != null && !selectedNotes.value.some(note => note.id === focusedNote.value)) focusedNote.value = null;
	complete.value = snapshot.complete;
	stalled.value = snapshot.stopReason === 'cursor-stalled';
	error.value = failed || stalled.value;
	if (!changingDay.value && !refreshing.value) return;
	await nextTick();
	if (ownGeneration !== generation || !props.active) return;
	measureLayout();
	await nextTick();
	if (ownGeneration !== generation || !props.active) return;
	if (changingDay.value) await dayMotion.enter();
	if (ownGeneration === generation && props.active) {
		changingDay.value = false;
		refreshing.value = false;
	}
}

function resetSelection() {
	selectedBand.value = null;
	focusedNote.value = null;
	bandLimits.value = [1, 1, 1, 1, 1, 1];
}

function resetLoader(animateDay = false, direction: -1 | 1 = 1, preserveScene = false) {
	emit('invalidate');
	generation++;
	controller?.abort();
	const wasRefreshing = refreshing.value;
	refreshHadWorkspace.value = notes.value.length > 0 || complete.value || (wasRefreshing && refreshHadWorkspace.value);
	refreshing.value = preserveScene && props.active && !changingDay.value && displayedDay.value === day.value && daySceneEl.value != null;
	if (!refreshing.value) displayedPagesLoaded = 0;
	changingDay.value = !refreshing.value && !wasRefreshing && animateDay && props.active && motion.value && (displayedDay.value !== day.value || changingDay.value) && daySceneEl.value != null;
	if (changingDay.value) {
		dayExit = dayMotion.leave(direction);
	} else {
		dayMotion.cancel();
		dayExit = Promise.resolve();
		if (!refreshing.value) {
			notes.value = [];
			displayedDay.value = day.value;
			resetSelection();
		}
	}
	complete.value = false;
	loading.value = false;
	error.value = false;
	stalled.value = false;
	loader = createTimelineHighlightsLoader({
		source: props.src, day: bounds.value,
		filters: { withRenotes: props.withRenotes, onlyFiles: props.onlyFiles },
		fetchPage: (endpoint, params, signal) => misskeyApi<Misskey.entities.Note[]>(endpoint, params, undefined, signal),
	});
	void loadMore();
}

function scrollWorkspace(restore?: number) {
	const revision = ++scrollRevision;
	const ownGeneration = generation;
	nextTick(() => {
		const root = rootEl.value;
		if (revision !== scrollRevision || ownGeneration !== generation || !props.active || changingDay.value || refreshing.value || !root?.isConnected) return;
		const container = getScrollContainer(root);
		if (!container) return;
		const requestedInset = typeof props.scrollInset === 'function' ? props.scrollInset() : props.scrollInset;
		const inset = Number.isFinite(requestedInset) ? Math.max(0, requestedInset) : 0;
		// The toolbar must land below floating navigation; saved overview positions are absolute.
		const top = restore ?? container.scrollTop + root.getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientTop - inset;
		container.scrollTo({ top: Math.max(0, top), behavior: motion.value ? 'smooth' : 'instant' });
	});
}

function openBand(index: number) {
	if (selectedBand.value == null) overviewScroll = getScrollContainer(rootEl.value)?.scrollTop ?? 0;
	selectedBand.value = index;
	focusedNote.value = null;
	bandLimits.value[index] = Math.max(20, bandLimits.value[index]);
	scrollWorkspace();
}

function showOverview() {
	const hadDetail = selectedBand.value != null;
	selectedBand.value = null;
	focusedNote.value = null;
	if (hadDetail) scrollWorkspace(overviewScroll);
}

function zoomOut() {
	if (focusedNote.value != null) focusedNote.value = null;
	else if (selectedBand.value != null) showOverview();
	else overviewZoom.value = Math.min(2, overviewZoom.value + 1);
}

function zoomIn() {
	if (selectedBand.value != null) {
		focusedNote.value = selectedNotes.value[0]?.id ?? null;
	} else if (overviewZoom.value > 0) {
		overviewZoom.value--;
	} else {
		const index = bands.value.findLastIndex(band => band.notes.length > 0);
		openBand(index < 0 ? 0 : index);
	}
}

function measure() {
	cancelAnimationFrame(measureFrame);
	measureFrame = requestAnimationFrame(measureLayout);
}

function measureLayout() {
	if (!props.active || !bodyEl.value || bodyEl.value.offsetWidth === 0) return;
	if (selectedBand.value != null) {
		layouts.value = bands.value.map((_, index) => ({ top: index * 56, height: 56 }));
		railHeight.value = 336;
		return;
	}
	const bodyTop = bodyEl.value.getBoundingClientRect().top;
	const rows = [...bodyEl.value.querySelectorAll<HTMLElement>('[data-highlight-band]')];
	if (rows.length !== 6) return;
	layouts.value = rows.map(row => ({ top: row.getBoundingClientRect().top - bodyTop, height: row.getBoundingClientRect().height }));
	railHeight.value = bodyEl.value.offsetHeight;
}

function updateMotion() { reducedMotion.value = motionQuery?.matches ?? true; }

function updateToday() {
	window.clearTimeout(midnightTimer);
	const now = new Date();
	today.value = dateValue(now);
	const midnight = new Date(now);
	midnight.setHours(24, 0, 0, 50);
	midnightTimer = window.setTimeout(updateToday, midnight.getTime() - now.getTime());
}

watch([() => props.src, () => props.withRenotes, () => props.withSensitive, () => props.onlyFiles, day], (next, previous) => {
	resetLoader(previous.length > 0 && next[4] !== previous[4] && next.slice(0, 4).every((value, index) => value === previous[index]), next[4] > (previous[4] ?? next[4]) ? 1 : -1);
}, { immediate: true });
watch(() => props.active, active => {
	if (!active) {
		wasInactive = true;
		generation++;
		controller?.abort();
		loading.value = false;
		dayMotion.cancel();
		if (changingDay.value) {
			changingDay.value = false;
			notes.value = [];
			displayedDay.value = day.value;
			resetSelection();
		}
	} else {
		today.value = dateValue(new Date());
		// Refresh visibility after background time: blocks, mutes and deletions may have changed.
		if (wasInactive) { wasInactive = false; resetLoader(false, 1, true); } else void loadMore();
		measure();
	}
});
watch(motion, enabled => {
	if (enabled) return;
	dayMotion.finish();
	if (changingDay.value && displayedDay.value !== day.value) {
		notes.value = [];
		displayedDay.value = day.value;
		resetSelection();
	}
});
// Center in the visible timeline viewport, including when a tall cached scene is scrolled.
watch([sceneLoading, () => props.scrollInset, () => props.scrollInsetTarget], ([show], _previous, onCleanup) => {
	if (!show) return;
	let disposed = false;
	let viewport: HTMLElement | null = null;
	let observer: ResizeObserver | undefined;

	function positionLoading() {
		const root = rootEl.value;
		if (!root || disposed) return;
		const requestedInset = typeof props.scrollInset === 'function' ? props.scrollInset() : props.scrollInset;
		const height = viewport?.clientHeight ?? window.innerHeight;
		const inset = Number.isFinite(requestedInset) ? Math.min(height, Math.max(0, requestedInset)) : 0;
		const top = viewport ? viewport.getBoundingClientRect().top + viewport.clientTop : 0;
		loadingTop.value = top + inset + (height - inset) / 2 - root.getBoundingClientRect().top;
	}

	nextTick(() => {
		if (disposed) return;
		viewport = getScrollContainer(rootEl.value);
		observer = new ResizeObserver(positionLoading);
		if (viewport) observer.observe(viewport);
		if (rootEl.value) observer.observe(rootEl.value);
		if (props.scrollInsetTarget) observer.observe(props.scrollInsetTarget);
		(viewport ?? window).addEventListener('scroll', positionLoading, { passive: true });
		window.addEventListener('resize', positionLoading);
		positionLoading();
	});
	onCleanup(() => {
		disposed = true;
		observer?.disconnect();
		(viewport ?? window).removeEventListener('scroll', positionLoading);
		window.removeEventListener('resize', positionLoading);
	});
}, { immediate: true, flush: 'post' });
watch([bodyEl, selectedBand, overviewZoom, notes], async () => {
	await nextTick();
	resizeObserver?.disconnect();
	if (bodyEl.value) resizeObserver?.observe(bodyEl.value);
	for (const row of bodyEl.value?.querySelectorAll('[data-highlight-band]') ?? []) resizeObserver?.observe(row);
	measure();
});
useGlobalEvent('noteDeleted', id => { deletedIds.add(id); removalVersion.value++; });
useGlobalEvent('userBlockingChanged', () => resetLoader());
onMounted(() => {
	updateToday();
	motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	motionQuery.addEventListener('change', updateMotion);
	updateMotion();
	resizeObserver = new ResizeObserver(measure);
	if (bodyEl.value) resizeObserver.observe(bodyEl.value);
	measure();
});
onBeforeUnmount(() => {
	generation++;
	controller?.abort();
	dayMotion.cancel();
	resizeObserver?.disconnect();
	motionQuery?.removeEventListener('change', updateMotion);
	cancelAnimationFrame(measureFrame);
	window.clearTimeout(midnightTimer);
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	--highlight-tint: 18%;
	--highlight-surface: var(--MI_THEME-panel);
	container-type: inline-size;
	padding: 16px 18px 40px;
	color: var(--MI_THEME-fg);
	&[data-glass=true] { --highlight-surface: color-mix(in srgb, color-mix(in srgb, var(--MI_THEME-accent) var(--highlight-tint), var(--MI_THEME-panel)) var(--htk-glass-card-opacity, 55%), transparent); }
}
:global(html[data-color-scheme=light]) .root { --highlight-tint: 8%; }
.root[data-variant=uis] {
	--highlight-surface: var(--hk3-glass-pane, var(--hk3-bg));
	--MI_THEME-fgTransparentWeak: var(--hk3-neutral-500);
	padding-inline: 0;
	.toolbar, .status { padding-inline: 12px; }
}
.toolbar, .dateControls, .zoomControls, .status, .detailHeader, .noteLinks { display: flex; align-items: center; }
.iconButton { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; font-size: 17px; }
.iconButton:hover, .refresh:hover { color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); }
.iconButton:disabled { opacity: .3; cursor: default; }
.root button:focus-visible, .dateInput:focus-visible { outline: 2px solid var(--MI_THEME-accent); outline-offset: 3px; }
.toolbar { justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.dateControls { gap: 2px; }
.dateInput { border: 0; background: transparent; color: inherit; font: inherit; font-size: 13px; font-weight: 600; width: 126px; padding: 7px 0; border-radius: 6px; color-scheme: inherit; }
.zoomControls { border: 1px solid var(--MI_THEME-divider); border-radius: 22px; padding: 2px; background: var(--highlight-surface); }
.dayStage { position: relative; }
.dayScene { display: flow-root; }
.sceneLoading { position: absolute; left: 50%; transform: translate(-50%, -50%); z-index: 1; pointer-events: none; }
.status { gap: 8px; flex-wrap: wrap; min-height: 32px; padding: 8px 3px 14px; font-size: 11px; color: var(--MI_THEME-fgTransparentWeak); }
.partial { margin-inline-start: auto; }
.refresh { padding: 4px; border-radius: 50%; }
.workspace { position: relative; display: grid; grid-template-columns: 58px minmax(0, 1fr); align-items: start; }
.rail { position: relative; }
.workspace[data-detail=true] .rail { position: sticky; top: 12px; }
.spine { position: absolute; left: 38px; top: 0; }
.timeButton { position: absolute; left: 0; width: 58px; text-align: start; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; padding-top: 18px; font-variant-numeric: tabular-nums; font-size: 10px; color: var(--MI_THEME-fgTransparentWeak); border-radius: 8px; }
.timeButton:hover, .timeButton[data-selected=true] { color: var(--MI_THEME-accent); }
.timeButton[data-selected=true]::after { content: ''; position: absolute; left: 45px; top: 19px; width: 6px; height: 6px; border-radius: 50%; background: var(--MI_THEME-accent); outline: 3px solid var(--MI_THEME-panel); }
.unknown { letter-spacing: 2px; opacity: .65; line-height: 1; }
.body { min-width: 0; }
.band { border-bottom: 1px solid var(--MI_THEME-divider); }
.band:last-child { border-bottom: 0; }
.bandHeader { width: 100%; display: flex; gap: 8px; align-items: center; padding: 14px 8px; box-sizing: border-box; min-height: 56px; text-align: start; border-radius: 12px; }
.bandHeader:hover { background: var(--MI_THEME-accentedBg); }
.bandTime { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.bandCount { margin-inline-start: auto; font-size: 11px; color: var(--MI_THEME-fgTransparentWeak); }
.bandHeader > i { font-size: 12px; opacity: .5; }
.preview { display: grid; grid-template-rows: 1fr; opacity: 1; }
.previewInner { min-height: 0; overflow: hidden; }
.overview[data-detail=false][data-zoom='1'] .preview, .overview[data-detail=false][data-zoom='2'] .preview { grid-template-rows: 0fr; opacity: 0; }
.overview[data-detail=false][data-zoom='1'] .bandHeader { min-height: 72px; }
.overview[data-detail=false][data-zoom='2'] .bandHeader { min-height: 44px; padding-block: 8px; }
.noteHost { min-width: 0; }
.noteLinks { justify-content: flex-end; gap: 10px; padding: 0 12px 14px; font-size: 11px; color: var(--MI_THEME-fgTransparentWeak); }
.noteLinks time { margin-inline-end: auto; font-variant-numeric: tabular-nums; }
.textButton { display: inline-flex; align-items: center; gap: 5px; padding: 6px 7px; border-radius: 8px; color: var(--MI_THEME-accent); font-size: 12px; }
.textButton:hover { background: var(--MI_THEME-accentedBg); }
.detailHeader { gap: 8px; min-height: 56px; padding-right: 8px; strong { font-size: 13px; } > span { margin-left: auto; font-size: 11px; opacity: .65; } }
.detailNote { padding-bottom: 8px; }
.emptyBand { padding: 20px 12px 32px; font-size: 12px; color: var(--MI_THEME-fgTransparentWeak); }
.message { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; padding: 16px 8px; font-size: 12px; }
.more { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 48px; margin-top: 12px; font-size: 13px; color: var(--MI_THEME-accent); border-radius: 12px; background: var(--highlight-surface); }
.more:disabled { opacity: .6; }
.root[data-motion=true] {
	.preview { transition: grid-template-rows 480ms cubic-bezier(.2,.75,.15,1), opacity 240ms ease; }
	.bandHeader { transition: min-height 480ms cubic-bezier(.2,.75,.15,1), padding 480ms cubic-bezier(.2,.75,.15,1), background 160ms ease; }
	.overview[data-detail=true] .preview { animation: detailEnter 320ms cubic-bezier(.2,.75,.15,1); }
	.iconButton, .textButton { transition: color 160ms ease, background 160ms ease; }
}
@keyframes detailEnter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@container (max-width: 420px) {
	.workspace { grid-template-columns: 46px minmax(0, 1fr); }
	.spine { left: 29px; }
	.timeButton { width: 46px; font-size: 9px; }
	.timeButton[data-selected=true]::after { left: 36px; }
	.bandHeader { gap: 5px; padding-inline: 4px; }
	.bandTime { font-size: 11px; }
	.bandCount { font-size: 10px; }
	.partial { flex-basis: 100%; margin: 0; }
}
</style>
