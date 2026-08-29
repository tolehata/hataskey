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

const controls = useAnimationControls();
const isControlled = ref(false);

const faceVariants: Variants = {
	normal: { scale: 1 },
	animate: {
		scale: 1.1,
		transition: { type: 'spring', stiffness: 200, damping: 20 },
	},
};

const plusVariants: Variants = {
	normal: { rotate: 0, scale: 1 },
	animate: {
		rotate: 90,
		scale: 1.2,
		transition: { type: 'spring', stiffness: 200, damping: 20, delay: 0.1 },
	},
};

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
		:variants="faceVariants"
		viewBox="0 0 24 24"
		:width="size"
	>
		<path d="M22 11v1a10 10 0 1 1-9-10"/>
		<path d="M8 14s1.5 2 4 2 4-2 4-2"/>
		<line x1="9" x2="9.01" y1="9" y2="9"/>
		<line x1="15" x2="15.01" y1="9" y2="9"/>
		<motion.path :animate="controls" d="M16 5h6" :variants="plusVariants"/>
		<motion.path :animate="controls" d="M19 2v6" :variants="plusVariants"/>
	</motion.svg>
</span>
</template>
