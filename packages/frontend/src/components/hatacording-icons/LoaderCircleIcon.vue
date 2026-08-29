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

const G_VARIANTS: Variants = {
	normal: { rotate: 0 },
	animate: {
		rotate: 360,
		transition: {
			repeat: Number.POSITIVE_INFINITY,
			duration: 0.8,
			ease: 'linear',
		},
	},
};

const DEFAULT_TRANSITION: Transition = {
	type: 'spring',
	stiffness: 50,
	damping: 10,
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
			d="M21 12a9 9 0 1 1-6.219-8.56"
			:style="{ transformOrigin: '12px 12px' }"
			:transition="DEFAULT_TRANSITION"
			:variants="G_VARIANTS"
		/>
	</svg>
</span>
</template>
