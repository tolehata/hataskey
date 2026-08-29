<!--
SPDX-FileCopyrightText: 2024-2026 pqoqubbw
SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
import { motion, useAnimationControls } from 'motion-v';
import { ref } from 'vue';
import type { Transition } from 'motion-v';
import type { HatacordingIconVariants as Variants } from './types.js';

interface Props {
	size?: number;
}

withDefaults(defineProps<Props>(), { size: 28 });

const CIRCLE_TRANSITION: Transition = {
	duration: 0.3,
	delay: 0.1,
	opacity: { delay: 0.15 },
};

const CIRCLE_VARIANTS: Variants = {
	normal: {
		pathLength: 1,
		opacity: 1,
	},
	animate: {
		pathLength: [0, 1],
		opacity: [0, 1],
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
		<motion.path
			:animate="controls"
			d="M21.54 15H17a2 2 0 0 0-2 2v4.54"
			:transition="{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }"
			:variants="{
				normal: {
					pathLength: 1,
					opacity: 1,
					pathOffset: 0,
				},
				animate: {
					pathLength: [0, 1],
					opacity: [0, 1],
					pathOffset: [1, 0],
				},
			}"
		/>
		<motion.path
			:animate="controls"
			d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17"
			:transition="{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }"
			:variants="{
				normal: {
					pathLength: 1,
					opacity: 1,
					pathOffset: 0,
				},
				animate: {
					pathLength: [0, 1],
					opacity: [0, 1],
					pathOffset: [1, 0],
				},
			}"
		/>
		<motion.path
			:animate="controls"
			d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"
			:transition="{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }"
			:variants="{
				normal: {
					pathLength: 1,
					opacity: 1,
					pathOffset: 0,
				},
				animate: {
					pathLength: [0, 1],
					opacity: [0, 1],
					pathOffset: [1, 0],
				},
			}"
		/>
		<motion.circle
			:animate="controls"
			cx="12"
			cy="12"
			r="10"
			:transition="CIRCLE_TRANSITION"
			:variants="CIRCLE_VARIANTS"
		/>
	</svg>
</span>
</template>
