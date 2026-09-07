<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<Teleport :to="integrated && context.target.value ? context.target.value : 'body'">
	<TransitionGroup
		tag="div" :class="$style.stack" :data-integrated="integrated" :data-mobile="context.mobile.value" :css="motion"
		:enterActiveClass="$style.enterActive" :leaveActiveClass="$style.leaveActive" :enterFromClass="$style.enterFrom" :leaveToClass="$style.leaveTo" :moveClass="$style.move"
		aria-live="polite" aria-relevant="additions" :aria-label="i18n.ts.notifications"
	>
		<MkHataskeyNotificationToast
			v-for="item in context.items.value" :key="item.id" :item="item" :integrated="integrated" :motion="motion"
			@close="context.dismiss(item.id)" @pause="pause(item.id, $event)" @resize="resize(item.id, $event)"
		/>
	</TransitionGroup>
</Teleport>
<MkNotificationToastRing v-if="integrated && active" :target="context.outline.value" :elapsed="active.elapsed" integrated :motion="motion"/>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { entities } from 'cherrypick-js';
import type { HataskeyNotificationToasts } from '@/utility/hataskey-notification-toast.js';
import MkHataskeyNotificationToast from '@/components/MkHataskeyNotificationToast.vue';
import MkNotificationToastRing from '@/components/MkNotificationToastRing.vue';
import { notificationToastsSuppressed } from '@/utility/notification-toast-suppression.js';
import { prefer } from '@/preferences.js';
import { popups } from '@/os.js';
import { i18n } from '@/i18n.js';

const props = defineProps<{ context: HataskeyNotificationToasts }>();
const context = props.context;
const integrated = computed(() => context.integrated.value && !!context.target.value);
const active = computed(() => context.items.value[0]);
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = ref(reducedMotionQuery.matches);
const motion = computed(() => prefer.r.animation.value && !reducedMotion.value);
const paused = new Set<number>();
const heights = new Map<number, number>();
let frame = 0;

function pause(id: number, value: boolean) {
	if (value) paused.add(id);
	else paused.delete(id);
}

function resize(id: number, height: number) {
	heights.set(id, height);
	if (id === active.value?.id) context.height.value = height;
}

function tick(now: number) {
	frame = 0;
	const allPaused = window.document.hidden || popups.value.length > 0;
	context.tick(now, allPaused ? new Set(context.items.value.map(item => item.id)) : paused);
	if (context.items.value.length) frame = requestAnimationFrame(tick);
}

watch(context.items, (items) => {
	for (const id of paused) if (!items.some(item => item.id === id)) paused.delete(id);
	for (const id of heights.keys()) if (!items.some(item => item.id === id)) heights.delete(id);
	context.height.value = items.length ? (heights.get(items[0].id) ?? context.height.value) : 0;
	if (items.length && !frame) frame = requestAnimationFrame(tick);
});
watch(integrated, value => {
	if (value && context.items.value.length > 1) context.items.value = context.items.value.slice(0, 1);
});
watch(notificationToastsSuppressed, value => { if (value) context.clear(); });
watch(() => prefer.r['external.disableNotificationToast'].value, value => {
	if (value) context.items.value = context.items.value.filter(item => item.source !== 'external');
});

function onVisibilityChange() {
	// Browsers suspend rAF in background tabs: discard that elapsed wall time.
	const now = performance.now();
	for (const item of context.items.value) item.updatedAt = now;
}

function onReducedMotion(event: MediaQueryListEvent) { reducedMotion.value = event.matches; }

function onExternalNotification(event: Event) {
	if (notificationToastsSuppressed.value || prefer.s['external.disableNotificationToast'] || window.document.hidden) return;
	const notification = (event as CustomEvent<entities.Notification>).detail;
	if (notification) context.enqueue(notification, 'external', performance.now(), prefer.s['external.host'] ?? undefined);
}

onMounted(() => {
	window.addEventListener('external-notification', onExternalNotification);
	window.document.addEventListener('visibilitychange', onVisibilityChange);
	reducedMotionQuery.addEventListener('change', onReducedMotion);
});
onUnmounted(() => {
	cancelAnimationFrame(frame);
	context.clear();
	context.height.value = 0;
	window.removeEventListener('external-notification', onExternalNotification);
	window.document.removeEventListener('visibilitychange', onVisibilityChange);
	reducedMotionQuery.removeEventListener('change', onReducedMotion);
});
</script>

<style module lang="scss">
.stack {
	position: fixed;
	bottom: max(20px, env(safe-area-inset-bottom, 0px));
	right: max(20px, env(safe-area-inset-right, 0px));
	width: min(300px, calc(100dvw - 32px));
	display: flex;
	flex-direction: column-reverse;
	gap: 8px;
	z-index: 3900000;
	pointer-events: none;
	&[data-integrated='true'] {
		position: relative;
		inset: auto;
		width: 100%;
		gap: 0;
		z-index: auto;
	}
}
.enterActive { transition: opacity .28s ease; }
.leaveActive { transition: opacity .26s ease; pointer-events: none; }
.enterFrom, .leaveTo { opacity: 0; }
.move { transition: transform .3s cubic-bezier(.22, 1, .36, 1); }
.stack[data-integrated='true'] {
	.enterActive, .leaveActive { transition: opacity .28s ease, transform .3s cubic-bezier(.22, 1, .36, 1); }
	.enterFrom { transform: translateY(-12px); }
	.leaveActive { position: absolute; top: 0; left: 0; width: 100%; }
	.leaveTo { transform: translateY(calc(100% + 12px)); }
}
</style>
