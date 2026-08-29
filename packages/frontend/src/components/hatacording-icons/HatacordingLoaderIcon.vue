<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import LoaderCircleIcon from './LoaderCircleIcon.vue';
import { prefer } from '@/preferences.js';

withDefaults(defineProps<{ size?: number }>(), { size: 28 });
const icon = ref<InstanceType<typeof LoaderCircleIcon>>();
const autoAnimationState = ref<'running' | 'stopped'>('stopped');
onMounted(() => {
	if (!prefer.s.animation || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	autoAnimationState.value = 'running';
	icon.value?.startAnimation();
});
</script>

<template>
<LoaderCircleIcon ref="icon" :size="size" :data-hatacording-loader-animation="autoAnimationState"/>
</template>
