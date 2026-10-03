<!--
SPDX-FileCopyrightText: tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->
<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { createHatagoesCompositionClock } from '@/utility/hatagoes-composition.js';
import {
	STORY_DURATION,
	renderHatagoesStory,
	storyCaptionAt,
	storySceneAt,
} from './hatagoes-story-artwork.js';

type Mode = 'light' | 'dark';
const props = withDefaults(defineProps<{
	active?: boolean;
	loop?: boolean;
	mode: Mode;
	showCharacter: boolean;
}>(), {
	active: true,
	loop: false,
});
const emit = defineEmits<{
	'caption-change': [caption: string];
	'scene-change': [scene: string];
	complete: [];
}>();

const host = ref<HTMLElement | null>(null);
const seconds = ref(0);
const scale = ref(1);
const currentCaption = computed(() => storyCaptionAt(seconds.value));
const scene = computed(() => storySceneAt(seconds.value));
const artworkStyle = computed(() => ({
	transform: `translate(-50%, -50%) scale(${scale.value})`,
}));

const Artwork = defineComponent({
	props: {
		mode: { type: String, required: true },
		seconds: { type: Number, required: true },
		showCharacter: { type: Boolean, required: true },
		loop: { type: Boolean, required: true },
	},
	setup(artProps) {
		return () => h('div', { class: 'hatagoes-story-artwork' }, [
			renderHatagoesStory(artProps.mode, artProps.seconds, artProps.showCharacter, artProps.loop),
		]);
	},
});

let clock: ReturnType<typeof createHatagoesCompositionClock> | undefined;
let resizeObserver: ResizeObserver | undefined;
let mounted = false;

function updateScale() {
	if (!host.value) return;
	scale.value = Math.min(host.value.clientWidth / 1920, host.value.clientHeight / 1080);
}

function onVisibilityChange() {
	clock?.setVisible(window.document.visibilityState === 'visible');
}

function createClock() {
	clock?.destroy();
	seconds.value = 0;
	clock = createHatagoesCompositionClock({
		duration: STORY_DURATION,
		loop: props.loop,
		onFrame: time => { seconds.value = time; },
		onComplete: () => emit('complete'),
	});
	clock.setVisible(window.document.visibilityState === 'visible');
	if (props.active) clock.play();
}

function play() { clock?.play(); }

function pause() { clock?.pause(); }

function replay() { clock?.replay(); }

function seek(time: number) { clock?.seek(time); }

defineExpose({ currentCaption, scene, seconds, play, pause, replay, seek });
watch(currentCaption, caption => emit('caption-change', caption), { immediate: true });
watch(scene, value => emit('scene-change', value), { immediate: true });
watch(() => props.active, active => {
	if (active) clock?.play();
	else clock?.pause();
});
watch(() => props.loop, () => { if (mounted) createClock(); });

onMounted(() => {
	mounted = true;
	updateScale();
	resizeObserver = new ResizeObserver(updateScale);
	if (host.value) resizeObserver.observe(host.value);
	window.document.addEventListener('visibilitychange', onVisibilityChange);
	createClock();
});
onBeforeUnmount(() => {
	resizeObserver?.disconnect();
	window.document.removeEventListener('visibilitychange', onVisibilityChange);
	clock?.destroy();
});
</script>

<template>
	<div ref="host" class="hatagoes-story-motion" :style="{ background: mode === 'dark' ? '#17141a' : '#fff7f2' }" :aria-label="currentCaption || 'HataGoes へようこそ。'">
		<Artwork class="hatagoes-story-stage" :style="artworkStyle" :mode="mode" :seconds="seconds" :showCharacter="showCharacter" :loop="loop" aria-hidden="true" />
	</div>
</template>

<style>
@font-face {
	font-family: HataStoryRighteous;
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
	font-weight: 400;
	font-display: swap;
}
@font-face {
	font-family: HataStoryZenKaku;
	src: url('/client-assets/fonts/zkgn-jp-400.woff2') format('woff2');
	font-weight: 400;
	font-display: swap;
}
@font-face {
	font-family: HataStoryZenKaku;
	src: url('/client-assets/fonts/zkgn-jp-700.woff2') format('woff2');
	font-weight: 700;
	font-display: swap;
}
@font-face {
	font-family: HataStoryZenMaru;
	src: url('/client-assets/fonts/zmg-jp-700.woff2') format('woff2');
	font-weight: 700;
	font-display: swap;
}
@font-face {
	font-family: HataStoryArchivo;
	src: url('/client-assets/fonts/archivo-latin-wght.woff2') format('woff2');
	font-weight: 800;
	font-display: swap;
}
.hatagoes-story-motion {
	position: relative;
	width: 100%;
	height: 100%;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}
.hatagoes-story-stage {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 1920px;
	height: 1080px;
	transform-origin: center;
}
</style>
