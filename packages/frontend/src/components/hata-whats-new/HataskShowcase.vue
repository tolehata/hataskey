<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<figure ref="figure" :class="$style.showcase" aria-hidden="true">
	<div ref="viewport" :class="$style.showcaseViewport" :data-format="mobile ? 'mobile' : 'desktop'" :data-fade-bottom="fadeBottom" :style="viewportStyle">
		<div ref="canvas" :class="[$style.showcaseCanvas, 'htk-root']" :data-theme="theme" :data-mode="mode" :style="canvasStyle" aria-hidden="true" inert>
			<HataskAkatsukiLayout :enabled="true" activeTab="home" :mode="mode" :animations="false" :model="previewModel" :now="previewNow"/>
		</div>
	</div>
</figure>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { previewModel, previewNow } from './hatask-sample.js';
import { createReveal } from './reveal.js';
import { useShowcaseFit } from './showcase-fit.js';
import type { HataskPlannerTheme } from '@/components/hatask/hatask-planner-types.js';
import HataskAkatsukiLayout from '@/components/hatask/HataskAkatsukiLayout.vue';
import { getHataskHatakyuStyle } from '@/utility/hatask-theme.js';

const props = defineProps<{ theme: HataskPlannerTheme; mode: 'light' | 'dark'; motion: boolean; }>();
const figure = ref<HTMLElement | null>(null);
const reveal = createReveal();
const viewport = ref<HTMLElement | null>(null);
const canvas = ref<HTMLElement | null>(null);
const { mobile, fadeBottom, viewportStyle, canvasStyle: fittedCanvasStyle } = useShowcaseFit(figure, canvas);
const canvasStyle = computed(() => ({
	...getHataskHatakyuStyle(),
	...fittedCanvasStyle.value,
}));

async function enter() {
	await nextTick();
	const parts = [...(figure.value?.querySelectorAll<HTMLElement>('.hak-focus-panel, .hak-stats, .hak-side-case') ?? [])];
	await reveal.play(parts.map((element, index) => ({ element, delay: 180 + index * 75, duration: 680, y: 20, scale: .98 })), props.motion);
}

function visibility() { if (window.document.hidden) reveal.cancel(); }

watch(() => props.motion, enabled => { if (!enabled) reveal.cancel(); });
watch(() => props.theme, async () => {
	await nextTick();
	await reveal.play([{ element: viewport.value, duration: 300, y: 0 }], props.motion);
});
onMounted(() => {
	window.document.addEventListener('visibilitychange', visibility);
	void enter();
});
onBeforeUnmount(() => { reveal.cancel(); window.document.removeEventListener('visibilitychange', visibility); });
</script>

<style module src="./release.module.css"></style>
<style lang="scss" src="../hatask/hatask-themes.scss"></style>
<style lang="scss" src="../hatask/hatask-hatakyu.scss"></style>
