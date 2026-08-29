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

const ARROW_TRANSITION: Transition = {
	type: 'spring',
	stiffness: 250,
	damping: 25,
};

const ARROW_VARIANTS: Variants = {
	normal: {
		rotate: '0deg',
	},
	animate: {
		rotate: '-50deg',
	},
};

const HAND_TRANSITION: Transition = {
	duration: 0.6,
	ease: [0.4, 0, 0.2, 1],
};

const HAND_VARIANTS: Variants = {
	normal: {
		rotate: 0,
		originX: '0%',
		originY: '100%',
	},
	animate: {
		rotate: -360,
		originX: '0%',
		originY: '100%',
	},
};

const MINUTE_HAND_TRANSITION: Transition = {
	duration: 0.5,
	ease: 'easeInOut',
};

const MINUTE_HAND_VARIANTS: Variants = {
	normal: {
		rotate: 0,
		originX: '0%',
		originY: '0%',
	},
	animate: {
		rotate: -45,
		originX: '0%',
		originY: '0%',
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
		<motion.g :animate="controls" :transition="ARROW_TRANSITION" :variants="ARROW_VARIANTS">
			<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
			<path d="M3 3v5h5"/>
		</motion.g>
		<motion.line
			:animate="controls"
			initial="normal"
			:transition="HAND_TRANSITION"
			:variants="HAND_VARIANTS"
			x1="12"
			x2="12"
			y1="12"
			y2="7"
		/>
		<motion.line
			:animate="controls"
			initial="normal"
			:transition="MINUTE_HAND_TRANSITION"
			:variants="MINUTE_HAND_VARIANTS"
			x1="12"
			x2="16"
			y1="12"
			y2="14"
		/>
	</svg>
</span>
</template>
