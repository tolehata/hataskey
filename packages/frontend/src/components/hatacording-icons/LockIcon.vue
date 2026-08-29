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
		initial="normal"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		:transition="{
			duration: 1,
			ease: [0.4, 0, 0.2, 1],
		}"
		:variants="{
			normal: {
				rotate: 0,
				scale: 1,
			},
			animate: {
				rotate: [-3, 1, -2, 0],
				scale: [0.95, 1.05, 0.98, 1],
			},
		}"
		viewBox="0 0 24 24"
		:width="size"
	>
		<rect height="11" rx="2" ry="2" width="18" x="3" y="11"/>
		<motion.path
			:animate="controls"
			d="M7 11V7a5 5 0 0 1 10 0v4"
			initial="normal"
			:transition="{
				duration: 0.3,
				ease: [0.4, 0, 0.2, 1],
			}"
			:variants="{
				normal: {
					pathLength: 1,
				},
				animate: {
					pathLength: 0.7,
				},
			}"
		/>
	</motion.svg>
</span>
</template>
