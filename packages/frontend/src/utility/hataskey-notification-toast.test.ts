/* SPDX-License-Identifier: AGPL-3.0-only */
import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import type { entities } from 'cherrypick-js';
import { createHataskeyNotificationToasts, notificationOutlinePaths } from './hataskey-notification-toast.js';
import { splitNotificationText } from './notification-text.js';

const notification = (id: string): entities.Notification => ({ id, type: 'test', createdAt: '2026-09-07T00:00:00Z' });

describe('Hataskey notification queue', () => {
	it('expires at five seconds of visible, unpaused time', () => {
		const queue = createHataskeyNotificationToasts(computed(() => false), computed(() => false));
		queue.enqueue(notification('first'), 'local', 0);
		queue.tick(2000, new Set());
		queue.tick(12000, new Set([queue.items.value[0].id]));
		expect(queue.items.value[0].elapsed).toBe(2000);
		queue.tick(14999, new Set());
		expect(queue.items.value).toHaveLength(1);
		queue.tick(15000, new Set());
		expect(queue.items.value).toHaveLength(0);
	});
	it('keeps three desktop cards, with the newest at the bottom, without mixing account IDs', () => {
		const queue = createHataskeyNotificationToasts(computed(() => false), computed(() => false));
		queue.enqueue(notification('same'), 'local', 0);
		queue.enqueue(notification('same'), 'external', 0, 'example.test');
		expect(queue.items.value).toHaveLength(2);
		queue.enqueue(notification('third'), 'local', 0);
		queue.enqueue(notification('fourth'), 'local', 0);
		expect(queue.items.value.map(item => item.notification.id)).toEqual(['fourth', 'third', 'same']);
	});
	it.each([true, false])('uses one shared latest notification in the navbar (mobile=%s)', (mobile) => {
		const queue = createHataskeyNotificationToasts(computed(() => mobile), computed(() => !mobile));
		queue.enqueue(notification('local'), 'local', 0);
		queue.enqueue(notification('remote'), 'external', 100);
		expect(queue.items.value.map(item => item.source)).toEqual(['external']);
		queue.enqueue(notification('flower'), 'local', 200);
		expect(queue.items.value.map(item => item.notification.id)).toEqual(['flower']);
	});
	it('preserves the active timer when the navbar disappears or the device changes', () => {
		const mobile = ref(false);
		const navbarVisible = ref(true);
		const queue = createHataskeyNotificationToasts(computed(() => mobile.value), computed(() => navbarVisible.value));
		queue.enqueue(notification('first'), 'local', 0);
		queue.tick(1900, new Set());
		navbarVisible.value = false;
		expect(queue.integrated.value).toBe(false);
		mobile.value = true;
		expect(queue.integrated.value).toBe(true);
		expect(queue.items.value[0].elapsed).toBe(1900);
	});
});

describe('notification outline and copy', () => {
	it('uses two symmetric open paths from top centre to bottom centre', () => {
		const paths = notificationOutlinePaths(360, 120, 24, true);
		expect(paths).toHaveLength(2);
		for (const path of paths) {
			expect(path.startsWith('M 180 1 H ')).toBe(true);
			expect(path.endsWith('119 H 180')).toBe(true);
			expect(path.includes('Z')).toBe(false);
		}
		expect(paths[0]).toContain('0 0 1 359 24');
		expect(paths[1]).toContain('0 0 0 1 24');
	});
	it('starts the closed floating outline on the top-right arc', () => {
		const [path] = notificationOutlinePaths(300, 80, 16, false);
		const [, x, y] = path.split(' ').map(Number);
		expect(x).toBeGreaterThan(284);
		expect(y).toBeLessThan(16);
		expect(path.endsWith('Z')).toBe(true);
	});
	it('breaks after punctuation and attached closing quotes, without changing text', () => {
		const text = 'お花が咲いたよ、見てね。「収穫できます！」明日も。';
		const parts = splitNotificationText(text);
		expect(parts).toEqual(['お花が咲いたよ、', '見てね。', '「収穫できます！」', '明日も。']);
		expect(parts.join('')).toBe(text);
		expect(splitNotificationText('長い名前やhttps://example.test/path')).toEqual(['長い名前やhttps://example.test/path']);
	});
});
