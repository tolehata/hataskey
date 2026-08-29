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

const ICON_VARIANTS: Variants = {
	normal: {
		scale: 1,
		rotate: 0,
	},
	animate: {
		scale: 1.05,
		rotate: [0, -7, 7, 0],
		transition: {
			rotate: {
				duration: 0.5,
				ease: 'easeInOut',
			},
			scale: {
				type: 'spring',
				stiffness: 400,
				damping: 10,
			},
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
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		:variants="ICON_VARIANTS"
		viewBox="0 0 24 24"
		:width="size"
	>
		<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
	</motion.svg>
</span>
</template>
