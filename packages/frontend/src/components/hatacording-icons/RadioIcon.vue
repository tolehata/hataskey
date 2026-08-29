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

const VARIANTS: Variants = {
	normal: {
		opacity: 1,
		transition: {
			duration: 0.4,
		},
	},
	fadeOut: {
		opacity: 0,
		transition: { duration: 0.3 },
	},
	fadeIn: (i: number) => ({
		opacity: 1,
		transition: {
			type: 'spring',
			stiffness: 300,
			damping: 20,
			delay: i * 0.1,
		},
	}),
};

const controls = useAnimationControls();
const isControlled = ref(false);

async function startAnimation() {
	isControlled.value = true;
	await controls.start('fadeOut');
	controls.start('fadeIn');
}

function stopAnimation() {
	isControlled.value = true;
	controls.start('normal');
}

defineExpose({ startAnimation, stopAnimation });

async function handleMouseEnter() {
	if (!isControlled.value) {
		await controls.start('fadeOut');
		controls.start('fadeIn');
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
			:custom="1"
			d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"
			:initial="{ opacity: 1 }"
			:variants="VARIANTS"
		/>
		<motion.path
			:animate="controls"
			:custom="0"
			d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"
			:initial="{ opacity: 1 }"
			:variants="VARIANTS"
		/>
		<circle cx="12" cy="12" r="2"/>
		<motion.path
			:animate="controls"
			:custom="0"
			d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"
			:initial="{ opacity: 1 }"
			:variants="VARIANTS"
		/>
		<motion.path
			:animate="controls"
			:custom="1"
			d="M19.1 4.9C23 8.8 23 15.1 19.1 19"
			:initial="{ opacity: 1 }"
			:variants="VARIANTS"
		/>
	</svg>
</span>
</template>
