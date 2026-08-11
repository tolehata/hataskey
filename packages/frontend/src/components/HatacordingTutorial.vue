<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<Teleport to="body">
	<div :class="$style.backdrop">
		<section :class="$style.window" role="dialog" aria-modal="true" aria-labelledby="hatacording-tutorial-title" @keydown.esc.prevent>
			<header :class="$style.header">
				<div :class="$style.wordmark">HataSNSCordUI</div>
				<span>{{ stepIndex + 1 }} / {{ copy.steps.length }}</span>
			</header>
			<div :class="$style.progress" aria-hidden="true"><i :style="{ width: `${((stepIndex + 1) / copy.steps.length) * 100}%` }"></i></div>
			<div :class="$style.body">
				<div :class="$style.illustration" aria-hidden="true">
					<component :is="stepIcon" :size="34"/>
					<div><span></span><span></span><span></span></div>
				</div>
				<div :class="$style.copy">
					<p v-if="stepIndex === 0" :class="$style.lead">{{ copy.lead }}</p>
					<h2 id="hatacording-tutorial-title">{{ currentStep.title }}</h2>
					<p>{{ currentStep.body }}</p>
				</div>
			</div>
			<footer :class="$style.footer">
				<button type="button" :class="$style.secondary" :disabled="stepIndex === 0" @click="stepIndex--"><ArrowLeft :size="16"/>{{ copy.previous }}</button>
				<button v-if="stepIndex < copy.steps.length - 1" type="button" :class="$style.primary" @click="stepIndex++">{{ copy.next }}<ArrowRight :size="16"/></button>
				<button v-else type="button" :class="$style.primary" @click="emit('done')"><Check :size="16"/>{{ copy.start }}</button>
			</footer>
			<p :class="$style.required">{{ copy.required }}</p>
		</section>
	</div>
</Teleport>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { Activity, ArrowLeft, ArrowRight, Check, LayoutList, MessageCircle, PanelRight, SlidersHorizontal } from '@lucide/vue';
import { HATACORDING_TUTORIAL_COPY } from '@/utility/hatacording-copy.js';

const emit = defineEmits<{ (ev: 'done'): void }>();
const copy = HATACORDING_TUTORIAL_COPY;
const stepIndex = ref(0);
const currentStep = computed(() => copy.steps[stepIndex.value]);
const icons = [MessageCircle, LayoutList, SlidersHorizontal, PanelRight, Activity] as const;
const stepIcon = computed(() => icons[stepIndex.value] ?? MessageCircle);
</script>

<style lang="scss" module>
.backdrop{container-type:inline-size;display:grid;position:fixed;inset:0;z-index:2147483000;place-items:center;padding:18px;background:rgb(5 8 14 / 68%);backdrop-filter:blur(10px)}
.window{width:min(520px,100%);max-height:calc(100dvh - 36px);overflow:auto;border:1px solid color-mix(in srgb,var(--MI_THEME-accent) 35%,var(--MI_THEME-divider));border-radius:22px;background:color-mix(in srgb,var(--MI_THEME-panel) 97%,var(--MI_THEME-accent) 3%);color:var(--MI_THEME-fg);box-shadow:0 28px 90px rgb(0 0 0 / 42%);font-family:'Noto Sans JP Variable','Noto Sans JP',system-ui,sans-serif}
.header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 11px}.header>span{font-size:.76rem;font-variant-numeric:tabular-nums;opacity:.62}.wordmark{color:var(--MI_THEME-accent);font-family:'HataSNSCordRighteous',system-ui,sans-serif;font-size:1.45rem}
.progress{height:3px;margin-inline:20px;overflow:hidden;border-radius:999px;background:var(--MI_THEME-divider)}.progress i{display:block;height:100%;border-radius:inherit;background:var(--MI_THEME-accent);transition:width .25s ease}
.body{display:grid;grid-template-columns:118px minmax(0,1fr);gap:18px;align-items:center;padding:26px 24px 18px}.illustration{display:grid;min-height:118px;place-items:center;border:1px solid color-mix(in srgb,var(--MI_THEME-accent) 26%,var(--MI_THEME-divider));border-radius:18px;background:color-mix(in srgb,var(--MI_THEME-accent) 10%,var(--MI_THEME-bg));color:var(--MI_THEME-accent)}.illustration>div{display:flex;gap:4px}.illustration span{width:8px;height:8px;border-radius:50%;background:currentColor;opacity:.25}.illustration span:first-child{opacity:1}
.copy h2{margin:0 0 8px;font-size:1.2rem;line-height:1.35}.copy p{margin:0;line-height:1.75;opacity:.76}.lead{margin-bottom:9px!important;color:var(--MI_THEME-accent);font-weight:700;opacity:1!important}
.footer{display:flex;justify-content:space-between;gap:10px;padding:8px 20px}.footer button{display:flex;min-height:40px;align-items:center;justify-content:center;gap:7px;padding:8px 15px;border-radius:11px;font:inherit;font-weight:750;cursor:pointer}.secondary{border:1px solid var(--MI_THEME-divider);background:transparent;color:inherit}.secondary:disabled{opacity:.3;cursor:default}.primary{margin-left:auto;border:0;background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent)}
.required{margin:5px 20px 18px;text-align:center;font-size:.72rem;opacity:.54}
@container(max-width:480px){.body{grid-template-columns:1fr;padding:20px}.illustration{min-height:84px}.window{border-radius:18px}.footer{padding-inline:16px}}
@media(prefers-reduced-motion:reduce){.progress i{transition:none}}
</style>
