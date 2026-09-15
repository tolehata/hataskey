<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<figure ref="figure" :class="$style.showcase" :data-arrival="arrival" aria-hidden="true">
	<div :class="$style.hatafeedPreviewViewport" :data-format="mobile ? 'mobile' : 'desktop'" :data-fade-bottom="fadeBottom" :style="viewportStyle">
		<div ref="canvas" :class="$style.hatafeedPreviewCanvas" :style="canvasStyle" aria-hidden="true" inert>
			<div :class="feedStyle.root" :style="{ minHeight: '0px' }" class="hatady-scope hatafeed-scope" :data-hatady-theme="mode">
				<div :class="feedStyle.page">
					<HataFeedHeader preview tab="home" projectName="Hataskey" :staff="false" :unread="0"/>
					<main :class="feedStyle.main"><HataFeedHome :isStaff="false" :roadmap="[sampleIssues[0], sampleIssues[2]]" :ownEmojiRequests="sampleRequests" :emojiRequests="[]" :emojiQuota="{ remaining: 4, limit: 5 }" :activity="sampleActivity" :issues="sampleIssues"/></main>
				</div>
			</div>
		</div>
	</div>
</figure>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { sampleIssues, sampleRequests, sampleActivity } from './samples.js';
import { createReveal } from './reveal.js';
import { useShowcaseFit } from './showcase-fit.js';
import HataFeedHeader from '@/components/HataFeedHeader.vue';
import HataFeedHome from '@/components/HataFeedHome.vue';
import feedStyle from '@/components/hatafeed-page.module.css';
import '@/components/hatafeed-ui.css';

const props = defineProps<{ mode: 'light' | 'dark'; motion: boolean }>();
const figure = ref<HTMLElement | null>(null);
const canvas = ref<HTMLElement | null>(null);
const { mobile, fadeBottom, viewportStyle, canvasStyle } = useShowcaseFit(figure, canvas);
const reveal = createReveal();
const arrival = ref('settled');
let revision = 0;

async function enter() {
	const ticket = ++revision;
	await nextTick();
	if (!figure.value) return;
	arrival.value = props.motion && !window.document.hidden ? 'arriving' : 'settled';
	const panels = [...figure.value.querySelectorAll<HTMLElement>('[data-hatafeed-home-panel]')];
	await reveal.play(panels.map((element, index) => ({ element, delay: 190 + index * 100, duration: 620, y: 18, scale: .98 })), props.motion);
	if (ticket === revision) arrival.value = 'settled';
}

function settle() { revision++; reveal.cancel(); arrival.value = 'settled'; }

function visibility() { if (window.document.hidden) settle(); }

watch(() => props.motion, enabled => { if (!enabled) settle(); });
onMounted(() => { window.document.addEventListener('visibilitychange', visibility); void enter(); });
onBeforeUnmount(() => { settle(); window.document.removeEventListener('visibilitychange', visibility); });
</script>

<style module src="./release.module.css"></style>
