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
			d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"
			:initial="{ opacity: 1 }"
			:variants="VARIANTS"
		/>
		<motion.path
			:animate="controls"
			:custom="0"
			d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"
			:initial="{ opacity: 1 }"
			:variants="VARIANTS"
		/>
		<circle cx="12" cy="9" r="2"/>
		<motion.path
			:animate="controls"
			:custom="0"
			d="M16.2 4.8c2 2 2.26 5.11.8 7.47"
			:initial="{ opacity: 1 }"
			:variants="VARIANTS"
		/>
		<motion.path
			:animate="controls"
			:custom="1"
			d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"
			:initial="{ opacity: 1 }"
			:variants="VARIANTS"
		/>
		<path d="M9.5 18h5"/>
		<path d="m8 22 4-11 4 11"/>
	</svg>
</span>
</template>
