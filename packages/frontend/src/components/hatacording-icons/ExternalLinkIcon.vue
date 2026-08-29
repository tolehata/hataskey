<!--
SPDX-FileCopyrightText: 2024-2026 pqoqubbw
SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { motion, useAnimationControls } from 'motion-v';
import { ref } from 'vue';
import type { HatacordingIconVariants as Variants } from './types.js';

withDefaults(defineProps<{ size?: number }>(), { size: 28 });

const ARROW_VARIANTS: Variants = {
	normal: { scale: 1, translateX: 0, translateY: 0 },
	animate: {
		scale: [1, 0.92, 1],
		translateX: [0, 2, 0],
		translateY: [0, -2, 0],
		originX: 1,
		originY: 0,
		transition: { duration: 0.5, ease: 'easeInOut' },
	},
};
const controls = useAnimationControls();
const isControlled = ref(false);

function startAnimation() {
	isControlled.value = true;
	controls.start('animate');
}

function stopAnimation() {
	isControlled.value = true;
	controls.start('normal');
}

defineExpose({ startAnimation, stopAnimation });

function handleMouseEnter() {
	if (!isControlled.value) controls.start('animate');
}

function handleMouseLeave() {
	if (!isControlled.value) controls.start('normal');
}
</script>

<template>
<span data-hatacording-animated-icon aria-hidden="true" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
	<svg focusable="false" fill="none" :height="size" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" :width="size" xmlns="http://www.w3.org/2000/svg">
		<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
		<motion.g :animate="controls" :variants="ARROW_VARIANTS"><path d="M15 3h6v6"/><path d="M10 14 21 3"/></motion.g>
	</svg>
</span>
</template>
