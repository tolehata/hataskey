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

const PATH_VARIANTS: Variants = {
	normal: { d: 'M5 12h14' },
	animate: {
		d: ['M5 12h14', 'M5 12h9', 'M5 12h14'],
		transition: {
			duration: 0.4,
		},
	},
};

const SECONDARY_PATH_VARIANTS: Variants = {
	normal: { d: 'm12 5 7 7-7 7', translateX: 0 },
	animate: {
		d: 'm12 5 7 7-7 7',
		translateX: [0, -3, 0],
		transition: {
			duration: 0.4,
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
		<motion.path :animate="controls" d="M5 12h14" :variants="PATH_VARIANTS"/>
		<motion.path :animate="controls" d="m12 5 7 7-7 7" :variants="SECONDARY_PATH_VARIANTS"/>
	</svg>
</span>
</template>
