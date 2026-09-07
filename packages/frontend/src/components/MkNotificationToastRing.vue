<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<Teleport v-if="target" :to="target">
	<svg :class="$style.ring" :data-integrated="integrated" :viewBox="`0 0 ${size.width} ${size.height}`" aria-hidden="true">
		<path v-for="(path, index) in paths" :key="index" :d="path" pathLength="1" :stroke-dashoffset="integrated ? 1 - progress : -progress"/>
	</svg>
</Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, shallowRef, watch } from 'vue';
import { NOTIFICATION_TOAST_DURATION, notificationOutlinePaths } from '@/utility/hataskey-notification-toast.js';

const props = defineProps<{ target: HTMLElement | null; elapsed: number; integrated: boolean; motion: boolean }>();
const size = shallowRef({ width: 1, height: 1, radius: 24 });
const paths = computed(() => notificationOutlinePaths(size.value.width, size.value.height, size.value.radius, props.integrated));
const progress = computed(() => (props.motion ? props.elapsed : Math.floor(props.elapsed / 1000) * 1000) / NOTIFICATION_TOAST_DURATION);
const observer = new ResizeObserver(() => measure());

function measure() {
	if (!props.target) return;
	const rect = props.target.getBoundingClientRect();
	size.value = { width: rect.width, height: rect.height, radius: parseFloat(getComputedStyle(props.target).borderTopLeftRadius) || 24 };
}

watch(() => props.target, (target) => {
	observer.disconnect();
	if (target) observer.observe(target);
	measure();
}, { immediate: true, flush: 'post' });
onUnmounted(() => observer.disconnect());
</script>

<style module lang="scss">
.ring {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	color: var(--MI_THEME-accent);
	pointer-events: none;
	z-index: 2;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-dasharray: 1 1;
	stroke-linecap: butt;
	path { vector-effect: non-scaling-stroke; }
}
</style>
