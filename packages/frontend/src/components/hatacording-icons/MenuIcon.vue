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

const LINE_VARIANTS: Variants = {
	normal: {
		rotate: 0,
		y: 0,
		opacity: 1,
	},
	animate: (custom: number) => ({
		rotate: custom === 1 ? 45 : custom === 3 ? -45 : 0,
		y: custom === 1 ? 6 : custom === 3 ? -6 : 0,
		opacity: custom === 2 ? 0 : 1,
		transition: {
			type: 'spring',
			stiffness: 260,
			damping: 20,
		},
	}),
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
		<motion.line
			:animate="controls"
			:custom="1"
			:variants="LINE_VARIANTS"
			x1="4"
			x2="20"
			y1="6"
			y2="6"
		/>
		<motion.line
			:animate="controls"
			:custom="2"
			:variants="LINE_VARIANTS"
			x1="4"
			x2="20"
			y1="12"
			y2="12"
		/>
		<motion.line
			:animate="controls"
			:custom="3"
			:variants="LINE_VARIANTS"
			x1="4"
			x2="20"
			y1="18"
			y2="18"
		/>
	</svg>
</span>
</template>
