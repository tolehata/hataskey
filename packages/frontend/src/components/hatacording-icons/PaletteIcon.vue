<!--
SPDX-FileCopyrightText: 2024-2026 pqoqubbw
SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { motion, useAnimationControls } from 'motion-v';
import { ref } from 'vue';
import type { HatacordingIconVariants as Variants } from './types.js';

withDefaults(defineProps<{ size?: number }>(), { size: 28 });

const DASH_LENGTH = 70;
const DRAW_DURATION = 0.45;
const DOT_STAGGER = 0.08;
const DOTS = [{ cx: 6.5, cy: 12.5 }, { cx: 8.5, cy: 7.5 }, { cx: 13.5, cy: 6.5 }, { cx: 17.5, cy: 10.5 }];
const OUTLINE_VARIANTS: Variants = {
	normal: { strokeDashoffset: 0 },
	animate: { strokeDashoffset: [DASH_LENGTH, 0], transition: { duration: DRAW_DURATION, ease: [0.65, 0, 0.35, 1] } },
};
const DOTS_GROUP_VARIANTS: Variants = { normal: {}, animate: { transition: { delayChildren: DRAW_DURATION, staggerChildren: DOT_STAGGER } } };
const DOT_VARIANTS: Variants = {
	normal: { scale: 1, transition: { duration: 0.2 } },
	animate: { scale: [0, 1], transition: { damping: 10, stiffness: 300, type: 'spring' } },
};
const controls = useAnimationControls();
const isControlled = ref(false);
const isAnimating = ref(false);

async function playAnimation() {
	if (isAnimating.value) return;
	isAnimating.value = true;
	try { await controls.start('animate'); } finally { isAnimating.value = false; }
}

async function resetAnimation() {
	isAnimating.value = false;
	await controls.start('normal');
}

function startAnimation() {
	isControlled.value = true;
	void playAnimation();
}

function stopAnimation() {
	isControlled.value = true;
	void resetAnimation();
}

defineExpose({ startAnimation, stopAnimation });

function handleMouseEnter() {
	if (!isControlled.value) void playAnimation();
}

function handleMouseLeave() {
	if (!isControlled.value) void resetAnimation();
}
</script>

<template>
<span data-hatacording-animated-icon aria-hidden="true" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
	<svg focusable="false" fill="none" :height="size" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" :width="size" xmlns="http://www.w3.org/2000/svg">
		<motion.path :animate="controls" d="M12 2a1 1 0 0 0 0 20l.25 0a1.75 1.75 0 0 0 1.4-2.8l-.3-.4a1.75 1.75 0 0 1 1.4-2.8h2.25a5 5 0 0 0 5-5 10 9 0 0 0-10-9z" initial="normal" :stroke-dasharray="DASH_LENGTH" :variants="OUTLINE_VARIANTS"/>
		<motion.g :animate="controls" initial="normal" :variants="DOTS_GROUP_VARIANTS">
			<motion.circle v-for="dot in DOTS" :key="`${dot.cx}-${dot.cy}`" :cx="dot.cx" :cy="dot.cy" fill="currentColor" r=".5" :style="{ transformBox: 'fill-box', transformOrigin: 'center' }" :variants="DOT_VARIANTS"/>
		</motion.g>
	</svg>
</span>
</template>
