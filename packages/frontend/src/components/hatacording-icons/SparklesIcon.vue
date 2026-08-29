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

const SPARKLE_VARIANTS: Variants = {
	initial: {
		y: 0,
		fill: 'none',
	},
	hover: {
		y: [0, -1, 0, 0],
		fill: 'currentColor',
		transition: {
			duration: 1,
			bounce: 0.3,
		},
	},
};

const STAR_VARIANTS: Variants = {
	initial: {
		opacity: 1,
		x: 0,
		y: 0,
	},
	blink: () => ({
		opacity: [0, 1, 0, 0, 0, 0, 1],
		transition: {
			duration: 2,
			type: 'spring',
			stiffness: 70,
			damping: 10,
			mass: 0.4,
		},
	}),
};

const starControls = useAnimationControls();
const sparkleControls = useAnimationControls();
const isControlled = ref(false);

function startAnimation() {
	isControlled.value = true;
	sparkleControls.start('hover');
	starControls.start('blink', { delay: 1 });
}

function stopAnimation() {
	isControlled.value = true;
	sparkleControls.start('initial');
	starControls.start('initial');
}

defineExpose({ startAnimation, stopAnimation });

function handleMouseEnter() {
	if (!isControlled.value) {
		sparkleControls.start('hover');
		starControls.start('blink', { delay: 1 });
	}
}

function handleMouseLeave() {
	if (!isControlled.value) {
		sparkleControls.start('initial');
		starControls.start('initial');
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
			:animate="sparkleControls"
			d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
			:variants="SPARKLE_VARIANTS"
		/>
		<motion.path :animate="starControls" d="M20 3v4" :variants="STAR_VARIANTS"/>
		<motion.path :animate="starControls" d="M22 5h-4" :variants="STAR_VARIANTS"/>
		<motion.path :animate="starControls" d="M4 17v2" :variants="STAR_VARIANTS"/>
		<motion.path :animate="starControls" d="M5 18H3" :variants="STAR_VARIANTS"/>
	</svg>
</span>
</template>
