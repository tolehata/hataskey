<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div :class="$style.notificationPreview" aria-hidden="true" @pointerenter="paused = true" @pointerleave="paused = false">
	<div ref="outline" :class="$style.notificationOutline">
		<div :class="$style.notificationContent"><span :class="$style.notificationAvatar">こ</span><span><strong>こはる <small>たった今</small></strong><span>きょうの記録にリアクションが届きました</span></span><i class="ti ti-heart" aria-hidden="true"></i></div>
	</div>
	<MkNotificationToastRing :target="outline" :elapsed="motion ? elapsed : 1000" :integrated="true" :motion="motion"/>
</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import MkNotificationToastRing from '@/components/MkNotificationToastRing.vue';
import { NOTIFICATION_TOAST_DURATION } from '@/utility/hataskey-notification-toast.js';
const props = defineProps<{ motion: boolean }>();
const outline = ref<HTMLElement | null>(null);
const elapsed = ref(0);
const paused = ref(false);
let frame = 0;
let lastTime = 0;
const tick = (now: number) => {
	if (lastTime && !window.document.hidden && !paused.value && props.motion) elapsed.value = Math.min(NOTIFICATION_TOAST_DURATION, elapsed.value + Math.min(now - lastTime, 80));
	lastTime = now;
	// One play per visit; the example stays readable after its glow finishes.
	if (elapsed.value < NOTIFICATION_TOAST_DURATION) frame = requestAnimationFrame(tick);
};

function syncClock() {
	cancelAnimationFrame(frame);
	lastTime = 0;
	if (props.motion && !paused.value && !window.document.hidden && elapsed.value < NOTIFICATION_TOAST_DURATION) frame = requestAnimationFrame(tick);
}

watch([() => props.motion, paused], syncClock, { immediate: true });
onMounted(() => window.document.addEventListener('visibilitychange', syncClock));
onBeforeUnmount(() => { cancelAnimationFrame(frame); window.document.removeEventListener('visibilitychange', syncClock); });
</script>

<style module src="./release.module.css"></style>
