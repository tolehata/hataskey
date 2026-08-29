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
	times: [0, 0.4, 1],
	duration: 0.5,
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
			d="m9 18 6-6-6-6"
			:transition="DEFAULT_TRANSITION"
			:variants="{
				normal: { x: 0 },
				animate: { x: [0, 2, 0] },
			}"
		/>
	</svg>
</span>
</template>
