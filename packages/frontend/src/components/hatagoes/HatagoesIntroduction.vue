<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<HatagoesDialog :open="open" preferType="dialog" @close="finish" @closed="closed">
	<section :class="$style.panel" :data-mode="mode" role="dialog" aria-modal="true" aria-labelledby="hatagoes-introduction-title">
		<header :class="[$style.header, ended && $style.headerEnded]"><h2 id="hatagoes-introduction-title">HataGoes へようこそ</h2><button v-if="ended" type="button" @click="replay"><i class="ti ti-reload" aria-hidden="true"></i>もう一度</button><button v-else type="button" :class="$style.close" aria-label="紹介をスキップ" @click="finish"><i class="ti ti-x" aria-hidden="true"></i></button></header>
		<div :class="$style.body">
			<div :class="$style.stage"><HatagoesStoryMotion ref="story" :active="motionActive" :loop="false" :mode="mode" :showCharacter="true" @complete="complete"/></div>
		</div>
		<footer :class="$style.footer">
			<button v-if="!ended" type="button" @click="finish"><i class="ti ti-player-skip-forward" aria-hidden="true"></i>スキップ</button><button v-else type="button" :class="$style.primary" @click="finish">はじめる <i class="ti ti-arrow-right" aria-hidden="true"></i></button>
		</footer>
	</section>
</HatagoesDialog>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import HatagoesDialog from './HatagoesDialog.vue';
import HatagoesStoryMotion from './motion/HatagoesStoryMotion.vue';

const props = defineProps<{ open: boolean; active: boolean; mode: 'light' | 'dark' }>();
const emit = defineEmits<{ finish: []; closed: [] }>();
const story = ref<InstanceType<typeof HatagoesStoryMotion> | null>(null);
const ended = ref(false);
const motionActive = computed(() => props.open && props.active && !ended.value);
let returnFocus: HTMLElement | null = null;
watch(() => props.open, open => {
	if (open) { returnFocus = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null; ended.value = false; }
}, { immediate: true });

function finish() { if (props.open) emit('finish'); }

function closed() {
	if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
	returnFocus = null;
	emit('closed');
}

function complete() { ended.value = true; }

function replay() { ended.value = false; story.value?.replay(); }

onBeforeUnmount(() => { returnFocus = null; });
</script>
<style module>
.panel { --intro-bg:#fff7f2; --intro-ink:#2b1f2c; --intro-muted:#6a5566; --intro-line:#e8d5d8; width:min(960px,calc(100vw - 24px)); max-height:min(94dvh,850px); display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--intro-line); border-radius:22px; background:var(--intro-bg); color:var(--intro-ink); box-shadow:0 24px 70px #20152e38; }
.panel[data-mode='dark'] { --intro-bg:#17141a; --intro-ink:#fff7f2; --intro-muted:#cbbdc7; --intro-line:#4d3f4c; }
.header { flex:none; display:grid; grid-template-columns:minmax(44px,1fr) minmax(0,auto) minmax(44px,1fr); align-items:center; padding:20px 24px 14px; }
.header h2 { grid-column:2; margin:0; text-align:center; font-size:clamp(16px,3vw,28px); line-height:1.4; }
.header button { grid-column:3; justify-self:end; min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:8px 12px; border:1px solid var(--intro-line); border-radius:999px; background:var(--intro-bg); color:var(--intro-ink); font-size:14px; font-weight:700; white-space:nowrap; }
.header button.close { width:44px; padding:0; border-radius:50%; font-size:24px; }
.body { min-height:0; overflow:auto; padding:0 24px 12px; }
.stage { width:100%; aspect-ratio:16 / 9; overflow:hidden; border-radius:14px; }
.footer { flex:none; display:flex; align-items:center; justify-content:center; padding:16px 24px; border-top:1px solid var(--intro-line); }
.footer button { min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:8px 16px; border:1px solid var(--intro-line); border-radius:999px; background:var(--intro-bg); color:var(--intro-ink); font-weight:700; }
.footer button.primary { border-color:#e0567a; background:#e0567a; color:#fff; }
@media (max-width:600px) { .panel { max-height:96dvh; }.header { padding:14px 16px 10px; }.body { padding:0 16px 10px; }.footer { padding:10px 16px; }.footer button { padding-inline:12px; } }
@media (max-width:420px) { .headerEnded h2 { grid-column:1 / -1; }.headerEnded button { grid-row:2; margin-top:8px; } }
</style>
