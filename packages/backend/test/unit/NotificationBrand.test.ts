/* SPDX-License-Identifier: AGPL-3.0-only */
import { describe, expect, test, vi } from 'vitest';
import { matchesNotificationListFilter, notificationBrand } from '@/core/NotificationService.js';
import type { MiNotification } from '@/models/Notification.js';
import NotificationsEndpoint from '@/server/api/endpoints/i/notifications.js';
import GroupedNotificationsEndpoint from '@/server/api/endpoints/i/notifications-grouped.js';

function app(customHeader: string | null, customLink: string | null): MiNotification {
	return { id: 'a', createdAt: new Date().toISOString(), type: 'app', appAccessTokenId: null, customBody: '', customIcon: null, customHeader, customLink };
}

describe('notification brand classification', () => {
	test('keeps legacy HataFeed and exact Hatask routes in their own brands', () => {
		expect(notificationBrand(app('HataFeed', null))).toBe('hataFeed');
		expect(notificationBrand(app('今日の気持ち', '/hatask?tab=mood'))).toBe('hatask');
		expect(notificationBrand(app('Hataskのお花', null))).toBe('hatask');
		expect(notificationBrand(app('Hatask', '/hatask/garden'))).toBe('hatask');
	});

	test('does not claim another app from a similar header or route prefix', () => {
		expect(notificationBrand(app('新しい記録', '/hatask-other'))).toBe('standard');
		expect(notificationBrand(app('Hataskのお花', '/another'))).toBe('standard');
		expect(notificationBrand(app('HataFeedのお知らせ', null))).toBe('standard');
	});

	test('uses the same boundaries for packed live app notifications', () => {
		expect(notificationBrand({ type: 'app', header: 'HataFeed', link: null })).toBe('hataFeed');
		expect(notificationBrand({ type: 'app', header: '今日の気持ち', link: '/hatask?tab=mood' })).toBe('hatask');
		expect(notificationBrand({ type: 'app', header: 'Hataskのお花', link: '/other' })).toBe('standard');
	});
});

describe('notification list brand and type filters', () => {
	test('multiple brands and the legacy single brand intersect without changing old requests', () => {
		const standard = app('Other app', null);
		const hatask = app('Hatask', '/hatask/garden');
		const feed = app('HataFeed', null);
		const hatady = { id: 'hatady', type: 'hatady', sourceNotificationId: 'source', subtype: 'follow', targetType: 'none', targetId: null, createdAt: '' } as MiNotification;
		expect([standard, hatask, feed, hatady].filter(notification => matchesNotificationListFilter(notification, { includeBrands: ['standard', 'hatady'] }))).toEqual([standard, hatady]);
		expect([standard, hatask, feed, hatady].filter(notification => matchesNotificationListFilter(notification, { brand: 'hatask', includeBrands: ['standard', 'hatady'] }))).toEqual([]);
		expect(matchesNotificationListFilter(feed, { includeTypes: ['hataFeed'] })).toBe(true);
		expect(matchesNotificationListFilter(hatask, { includeTypes: ['app'] })).toBe(true);
		expect(matchesNotificationListFilter(hatask, { includeBrands: [] })).toBe(false);
	});

	test('explicit Hatask app toggle is independent of the standard app type and remains behind brand gates', () => {
		const standard = app('Other app', null);
		const hatask = app('Hatask', '/hatask/garden');
		expect(matchesNotificationListFilter(hatask, { includeTypes: ['app'], includeHataskApp: false })).toBe(false);
		expect(matchesNotificationListFilter(standard, { includeTypes: ['app'], includeHataskApp: false })).toBe(true);
		expect(matchesNotificationListFilter(hatask, { includeTypes: [], excludeTypes: ['app'], includeHataskApp: true })).toBe(true);
		expect(matchesNotificationListFilter(standard, { includeTypes: [], includeHataskApp: true })).toBe(false);
		expect(matchesNotificationListFilter(hatask, { includeBrands: ['standard'], includeHataskApp: true })).toBe(false);
		expect(matchesNotificationListFilter(hatask, { brand: 'standard', includeHataskApp: true })).toBe(false);
	});

	test.each([NotificationsEndpoint, GroupedNotificationsEndpoint])('API forwards parent brands and explicit Hatask app independently of empty type lists', async EndpointClass => {
		const getNotifications = vi.fn().mockResolvedValue([]);
		const endpoint = new EndpointClass({ gen: vi.fn() } as never, { packMany: vi.fn().mockResolvedValue([]) } as never, { getNotifications } as never);
		const me = { id: 'owner' } as never;
		await endpoint.exec({ limit: 10, markAsRead: false, includeTypes: [], includeBrands: ['hatask', 'standard'], includeHataskApp: true }, me, null, null);
		expect(getNotifications).toHaveBeenCalledWith('owner', expect.objectContaining({ includeTypes: [], includeBrands: ['hatask', 'standard'], includeHataskApp: true }));
		getNotifications.mockClear();
		await endpoint.exec({ limit: 10, markAsRead: false, includeBrands: [] }, me, null, null);
		expect(getNotifications).not.toHaveBeenCalled();
	});
});
