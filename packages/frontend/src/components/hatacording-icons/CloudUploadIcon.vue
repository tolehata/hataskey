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

const CLOUD_VARIANTS: Variants = {
	initial: { y: -2 },
	active: { y: 0 },
};

const controls = useAnimationControls();
const isControlled = ref(false);

function startAnimation() {
	isControlled.value = true;
	controls.start('initial');
}

function stopAnimation() {
	isControlled.value = true;
	controls.start('active');
}

defineExpose({ startAnimation, stopAnimation });

function handleMouseEnter() {
	if (!isControlled.value) {
		controls.start('initial');
	}
}

function handleMouseLeave() {
	if (!isControlled.value) {
		controls.start('active');
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
		<path d="M4.2 15.1A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.2"/>
		<motion.g
			:animate="controls"
			:transition="{
				duration: 0.3,
				ease: [0.68, -0.6, 0.32, 1.6],
			}"
			:variants="CLOUD_VARIANTS"
		>
			<path d="M12 13v8"/>
			<path d="m8 17 4-4 4 4"/>
		</motion.g>
	</svg>
</span>
</template>
