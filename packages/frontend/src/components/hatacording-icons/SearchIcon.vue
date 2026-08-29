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
		:transition="{
			duration: 1,
			bounce: 0.3,
		}"
		:variants="{
			normal: { x: 0, y: 0 },
			animate: {
				x: [0, 0, -3, 0],
				y: [0, -4, 0, 0],
			},
		}"
		viewBox="0 0 24 24"
		:width="size"
	>
		<circle cx="11" cy="11" r="8"/>
		<path d="m21 21-4.3-4.3"/>
	</motion.svg>
</span>
</template>
