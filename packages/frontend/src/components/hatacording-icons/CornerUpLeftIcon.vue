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

const STRETCH_VARIANTS: Variants = {
	normal: { scaleX: 1, x: 0, opacity: 1 },
	animate: {
		scaleX: [1, 1.15, 1],
		x: [0, -2, 0],
		transition: {
			duration: 0.45,
			ease: 'easeInOut',
		},
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
	<motion.svg
		focusable="false"
		:animate="controls"
		fill="none"
		:height="size"
		initial="normal"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		:variants="STRETCH_VARIANTS"
		viewBox="0 0 24 24"
		:width="size"
	>
		<path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
		<path d="M9 14 4 9l5-5"/>
	</motion.svg>
</span>
</template>
