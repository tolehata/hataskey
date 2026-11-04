<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<svg
	:class="$style.root"
	:width="HIGHLIGHT_SPINE_WIDTH"
	:height="displayed.height"
	:viewBox="`0 0 ${HIGHLIGHT_SPINE_WIDTH} ${Math.max(1, displayed.height)}`"
	aria-hidden="true"
	focusable="false"
>
	<defs>
		<linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
			<stop v-for="(stop, index) in stops" :key="index" :class="$style.densityStop" :offset="stop.offset" :stop-opacity="stop.opacity"/>
		</linearGradient>
	</defs>
	<rect :class="$style.baseline" :x="HIGHLIGHT_SPINE_WIDTH / 2 - HIGHLIGHT_SPINE_MIN_RADIUS" :width="HIGHLIGHT_SPINE_MIN_RADIUS * 2" :height="displayed.height" :rx="Math.min(HIGHLIGHT_SPINE_MIN_RADIUS, displayed.height / 2)"/>
	<path :d="path" :fill="`url(#${gradientId})`"/>
</svg>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue';
import {
	createTimelineHighlightSpine,
	createTimelineHighlightSpineTransition,
	HIGHLIGHT_SPINE_MIN_RADIUS,
	HIGHLIGHT_SPINE_WIDTH,
	interpolateTimelineHighlightSpine,
	timelineHighlightSpinePath,
	timelineHighlightSpinesEqual,
	timelineHighlightSpineStops,
} from '@/utility/timeline-highlight-spine.js';
import type { TimelineHighlightPoint } from '@/utility/timeline-highlight-spine.js';

const props = defineProps<{
	points: TimelineHighlightPoint[];
	height: number;
	motion: boolean;
}>();

const gradientId = `timeline-highlight-density-${useId()}`;
const displayed = shallowRef(createTimelineHighlightSpine(props.points, props.height));
const path = computed(() => timelineHighlightSpinePath(displayed.value));
const stops = computed(() => timelineHighlightSpineStops(displayed.value));
let target = displayed.value;
let mounted = false;
let frame: number | null = null;
let generation = 0;

function cancel(): void {
	generation++;
	if (frame !== null) window.cancelAnimationFrame(frame);
	frame = null;
}

watch(() => [props.points, props.height, props.motion], () => {
	const next = createTimelineHighlightSpine(props.points, props.height);
	if (props.motion && frame !== null && timelineHighlightSpinesEqual(next, target)) return;
	target = next;
	cancel();
	if (!mounted || !props.motion || timelineHighlightSpinesEqual(displayed.value, next)) {
		displayed.value = next;
		return;
	}
	const transition = createTimelineHighlightSpineTransition(displayed.value, next);
	if (!transition) {
		displayed.value = next;
		return;
	}
	const token = generation;
	let start: number | null = null;
	const tick = (now: number): void => {
		if (token !== generation || !mounted) return;
		if (start === null) start = now;
		const progress = Math.min(1, Math.max(0, (now - start) / 480));
		const eased = 1 - (1 - progress) ** 3;
		displayed.value = progress === 1 ? next : interpolateTimelineHighlightSpine(transition, eased);
		frame = progress < 1 ? window.requestAnimationFrame(tick) : null;
	};
	frame = window.requestAnimationFrame(tick);
}, { deep: true, flush: 'post' });

onMounted(() => { mounted = true; });
onBeforeUnmount(() => {
	mounted = false;
	cancel();
});
</script>

<style lang="scss" module>
.root {
	display: block;
	width: 20px;
	flex-shrink: 0;
	overflow: visible;
	pointer-events: none;
	--highlight-spine-color: color-mix(in srgb, var(--MI_THEME-accent) 88%, var(--MI_THEME-fg));
	--highlight-spine-color: light-dark(
		color-mix(in srgb, var(--MI_THEME-accent) 82%, var(--MI_THEME-fg)),
		color-mix(in srgb, var(--MI_THEME-accent) 90%, var(--MI_THEME-fg))
	);
}

.baseline {
	fill: color-mix(in srgb, var(--MI_THEME-divider) 88%, var(--MI_THEME-fg));
	fill: light-dark(
		color-mix(in srgb, var(--MI_THEME-divider) 88%, var(--MI_THEME-fg)),
		color-mix(in srgb, var(--MI_THEME-divider) 76%, var(--MI_THEME-fg))
	);
}

.densityStop {
	stop-color: var(--highlight-spine-color);
}
</style>
