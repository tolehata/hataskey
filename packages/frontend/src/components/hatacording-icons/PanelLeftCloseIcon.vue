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

const DEFAULT_TRANSITION: Transition = {
	times: [0, 0.4, 1],
	duration: 0.5,
};

const PATH_VARIANTS: Variants = {
	normal: { x: 0 },
	animate: { x: [0, -1.5, 0] },
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
		<rect height="18" rx="2" width="18" x="3" y="3"/>
		<path d="M9 3v18"/>
		<motion.path
			:animate="controls"
			d="m16 15-3-3 3-3"
			:transition="DEFAULT_TRANSITION"
			:variants="PATH_VARIANTS"
		/>
	</svg>
</span>
</template>
