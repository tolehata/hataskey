<!--
SPDX-FileCopyrightText: 2024-2026 pqoqubbw
SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
import { motion, useAnimationControls } from 'motion-v';
import { ref } from 'vue';
import type { HatacordingIconVariants as Variants } from './types.js';

interface Props {
	size?: number;
}

withDefaults(defineProps<Props>(), { size: 28 });

const RECT_1_VARIANTS: Variants = {
	normal: { translateX: 0, translateY: 0 },
	animate: {
		translateX: [0, 11, 11, 0],
		translateY: [0, 0, 0, 0],
		transition: { duration: 0.8, ease: 'easeInOut', times: [0, 0.4, 0.6, 1] },
	},
};

const RECT_2_VARIANTS: Variants = {
	normal: { translateX: 0, translateY: 0 },
	animate: {
		translateX: [0, 0, 0, 0],
		translateY: [0, 11, 11, 0],
		transition: { duration: 0.8, ease: 'easeInOut', times: [0, 0.4, 0.6, 1] },
	},
};

const RECT_3_VARIANTS: Variants = {
	normal: { translateX: 0, translateY: 0 },
	animate: {
		translateX: [0, -11, -11, 0],
		translateY: [0, 0, 0, 0],
		transition: { duration: 0.8, ease: 'easeInOut', times: [0, 0.4, 0.6, 1] },
	},
};

const RECT_4_VARIANTS: Variants = {
	normal: { translateX: 0, translateY: 0 },
	animate: {
		translateX: [0, 0, 0, 0],
		translateY: [0, -11, -11, 0],
		transition: { duration: 0.8, ease: 'easeInOut', times: [0, 0.4, 0.6, 1] },
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
	if (!isControlled.value) {
		controls.start('animate');
	}
}

function handleMouseLeave() {
	if (!isControlled.value) {
		controls.start('normal');
	}
}
</script>

<template>
<span data-hatacording-animated-icon aria-hidden="true" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
	<svg
		focusable="false"
		fill="none"
		:height="size"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		viewBox="0 0 24 24"
		:width="size"
		xmlns="http://www.w3.org/2000/svg"
	>
		<motion.rect
			:animate="controls"
			height="7"
			initial="normal"
			rx="1"
			:variants="RECT_1_VARIANTS"
			width="7"
			x="3"
			y="3"
		/>
		<motion.rect
			:animate="controls"
			height="7"
			initial="normal"
			rx="1"
			:variants="RECT_2_VARIANTS"
			width="7"
			x="14"
			y="3"
		/>
		<motion.rect
			:animate="controls"
			height="7"
			initial="normal"
			rx="1"
			:variants="RECT_3_VARIANTS"
			width="7"
			x="14"
			y="14"
		/>
		<motion.rect
			:animate="controls"
			height="7"
			initial="normal"
			rx="1"
			:variants="RECT_4_VARIANTS"
			width="7"
			x="3"
			y="14"
		/>
	</svg>
</span>
</template>
