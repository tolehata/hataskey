<!--
SPDX-FileCopyrightText: 2024-2026 pqoqubbw
SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
import { motion, useAnimationControls } from 'motion-v';
import { ref } from 'vue';
import type { Transition } from 'motion-v';

interface Props {
	size?: number;
}

withDefaults(defineProps<Props>(), { size: 28 });

const DEFAULT_TRANSITION: Transition = {
	type: 'spring',
	stiffness: 100,
	damping: 14,
	mass: 1,
};

const controls = useAnimationControls();
const isControlled = ref(false);

async function startAnimation() {
	isControlled.value = true;
	await controls.start('firstState');
	await controls.start('secondState');
}

function stopAnimation() {
	isControlled.value = true;
	controls.start('normal');
}

defineExpose({ startAnimation, stopAnimation });

async function handleMouseEnter() {
	if (!isControlled.value) {
		await controls.start('firstState');
		await controls.start('secondState');
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
		<path
			d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"
		/>
		<motion.path
			:animate="controls"
			d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"
			:transition="DEFAULT_TRANSITION"
			:variants="{
				normal: { y: 0 },
				firstState: { y: -9 },
				secondState: { y: 0 },
			}"
		/>
		<motion.path
			:animate="controls"
			d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"
			:transition="DEFAULT_TRANSITION"
			:variants="{
				normal: { y: 0 },
				firstState: { y: -5 },
				secondState: { y: 0 },
			}"
		/>
	</svg>
</span>
</template>
