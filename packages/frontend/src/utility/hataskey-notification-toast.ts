/* SPDX-License-Identifier: AGPL-3.0-only */
import { computed, shallowReactive, shallowRef } from 'vue';
import type { ComputedRef, InjectionKey } from 'vue';
import type { entities } from 'cherrypick-js';

export const NOTIFICATION_TOAST_DURATION = 5000;

export type HataskeyToast = {
	id: number;
	source: 'local' | 'external';
	notification: entities.Notification;
	host?: string;
	elapsed: number;
	updatedAt: number;
};

/** One queue for both accounts; changing presentation never restarts a timer. */
export function createHataskeyNotificationToasts(mobile: ComputedRef<boolean>, navbarVisible: ComputedRef<boolean>) {
	const items = shallowRef<HataskeyToast[]>([]);
	const target = shallowRef<HTMLElement | null>(null);
	const outline = shallowRef<HTMLElement | null>(null);
	const height = shallowRef(0);
	const integrated = computed(() => mobile.value || navbarVisible.value);
	let sequence = 0;

	function enqueue(notification: entities.Notification, source: HataskeyToast['source'], now = performance.now(), host?: string) {
		const item = shallowReactive({ id: ++sequence, notification, source, host, elapsed: 0, updatedAt: now });
		const previous = items.value.filter(x => !(x.source === source && x.host === host && x.notification.id === notification.id));
		items.value = [item, ...previous].slice(0, integrated.value ? 1 : 3);
	}

	function dismiss(id: number) {
		items.value = items.value.filter(item => item.id !== id);
	}

	function tick(now: number, paused: ReadonlySet<number>) {
		for (const item of items.value) {
			if (!paused.has(item.id)) item.elapsed = Math.min(NOTIFICATION_TOAST_DURATION, item.elapsed + Math.max(0, now - item.updatedAt));
			item.updatedAt = now;
		}
		const expired = items.value.filter(item => item.elapsed >= NOTIFICATION_TOAST_DURATION);
		if (expired.length) items.value = items.value.filter(item => item.elapsed < NOTIFICATION_TOAST_DURATION);
	}

	function clear() {
		items.value = [];
	}

	return { mobile, integrated, items, target, outline, height, enqueue, dismiss, tick, clear };
}

export type HataskeyNotificationToasts = ReturnType<typeof createHataskeyNotificationToasts>;
export const hataskeyNotificationToastsKey: InjectionKey<HataskeyNotificationToasts> = Symbol('hataskeyNotificationToasts');

/** Open paths meet at the bottom; floating cards start at the top-right arc. */
export function notificationOutlinePaths(width: number, height: number, radius: number, integrated: boolean): string[] {
	const right = Math.max(1, width - 1);
	const bottom = Math.max(1, height - 1);
	const r = Math.max(0, Math.min(radius - 1, (right - 1) / 2, (bottom - 1) / 2));
	if (integrated) {
		return [
			`M ${width / 2} 1 H ${right - r} A ${r} ${r} 0 0 1 ${right} ${1 + r} V ${bottom - r} A ${r} ${r} 0 0 1 ${right - r} ${bottom} H ${width / 2}`,
			`M ${width / 2} 1 H ${1 + r} A ${r} ${r} 0 0 0 1 ${1 + r} V ${bottom - r} A ${r} ${r} 0 0 0 ${1 + r} ${bottom} H ${width / 2}`,
		];
	}
	const x = right - r + r * Math.SQRT1_2;
	const y = 1 + r - r * Math.SQRT1_2;
	return [`M ${x} ${y} A ${r} ${r} 0 0 1 ${right} ${1 + r} V ${bottom - r} A ${r} ${r} 0 0 1 ${right - r} ${bottom} H ${1 + r} A ${r} ${r} 0 0 1 1 ${bottom - r} V ${1 + r} A ${r} ${r} 0 0 1 ${1 + r} 1 H ${right - r} A ${r} ${r} 0 0 1 ${x} ${y} Z`];
}
