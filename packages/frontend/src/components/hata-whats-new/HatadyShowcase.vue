<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<figure ref="figure" :class="$style.showcase" :data-arrival="arrival" aria-hidden="true">
	<div :class="$style.hatadyPreviewViewport" :data-format="mobile ? 'mobile' : 'desktop'" :data-fade-bottom="fadeBottom" :style="viewportStyle">
		<div ref="canvas" :class="[$style.hatadyPreviewCanvas, $style.hatadyScreen, 'hatady-scope']" :data-hatady-theme="mode" :style="canvasStyle" aria-hidden="true" inert>
			<header :class="$style.hatadyHeader">
				<button :class="$style.hatadyBrand" type="button">Hatady</button>
				<HyNav :class="$style.hatadyNav" preview modelValue="home" :options="tabs"/>
				<div :class="$style.hatadyHeaderActions"><button class="hy-primary" aria-label="記録する"><i class="ti ti-plus"></i></button><button class="hy-icon-button" aria-label="検索"><i class="ti ti-search"></i></button><button class="hy-icon-button" aria-label="通知"><i class="ti ti-bell"></i></button><button class="hy-icon-button" aria-label="設定"><i class="ti ti-settings"></i></button></div>
				<button :class="[$style.hatadyMobileMenu, 'hy-secondary']" aria-label="メニュー"><i class="ti ti-dots"></i></button>
			</header>
			<main :class="$style.hatadyMain">
				<HatadyHome :revision="0" :preview="hatadySample" @ready="ready">
					<template #greetingActions><div :class="$style.hatadyMobileRecord"><button class="hy-icon-button" aria-label="通知"><i class="ti ti-bell"></i></button><button class="hy-primary" aria-label="記録する"><i class="ti ti-plus"></i></button></div></template>
				</HatadyHome>
			</main>
		</div>
	</div>
</figure>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { hatadySample } from './samples.js';
import { createReveal } from './reveal.js';
import { useShowcaseFit } from './showcase-fit.js';
import HyNav from '@/components/HyNav.vue';
import HatadyHome from '@/components/HatadyHome.vue';
import '@/components/hatady-ui.css';

const props = defineProps<{ mode: 'light' | 'dark'; motion: boolean }>();
const figure = ref<HTMLElement | null>(null);
const canvas = ref<HTMLElement | null>(null);
const { mobile, fadeBottom, viewportStyle, canvasStyle } = useShowcaseFit(figure, canvas);
const tabs = [
	{ value: 'home', label: 'ホーム', icon: 'ti ti-home' }, { value: 'records', label: '記録', icon: 'ti ti-notebook' },
	{ value: 'collection', label: 'コレクション', icon: 'ti ti-books' }, { value: 'profile', label: 'プロフィール', icon: 'ti ti-user' },
];
const reveal = createReveal();
const loaded = ref(false);
const arrival = ref('settled');
let revision = 0;

async function enter() {
	const ticket = ++revision;
	await nextTick();
	if (!loaded.value || !figure.value) return;
	arrival.value = props.motion && !window.document.hidden ? 'arriving' : 'settled';
	const cards = [...figure.value.querySelectorAll<HTMLElement>('[data-hy-entrance="home"]')];
	await reveal.play(cards.map((element, index) => ({ element, delay: 200 + index * 85, duration: 700, y: 24, scale: .975 })), props.motion);
	if (ticket === revision) arrival.value = 'settled';
}

async function ready() { loaded.value = true; await enter(); }

function settle() { revision++; reveal.cancel(); arrival.value = 'settled'; }

function visibility() { if (window.document.hidden) settle(); }

watch(() => props.motion, enabled => { if (!enabled) settle(); });
onMounted(() => {
	window.document.addEventListener('visibilitychange', visibility);
});
onBeforeUnmount(() => { settle(); window.document.removeEventListener('visibilitychange', visibility); });
</script>

<style module src="./release.module.css"></style>
