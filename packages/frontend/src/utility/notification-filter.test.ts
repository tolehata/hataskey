/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { notificationTypes } from 'cherrypick-js';
import { hasConfiguredNotificationFilter, migrateNotificationFilterSnapshot, resolveNotificationFilter, serializeNotificationFilter } from './notification-filter.js';

describe('notification filter persistence', () => {
	test('旧設定は現在の表示状態を勝手に変えない', () => {
		const result = resolveNotificationFilter(['reaction'], []);

		expect(result.excludeTypes).toEqual(['reaction']);
		expect(result.knownTypes).toEqual([...notificationTypes]);
	});

	test('除外項目がある旧設定だけを現在の通知種別スナップショットへ移行する', () => {
		const migrated = migrateNotificationFilterSnapshot(['reaction'], []);

		expect(migrated).toEqual({
			excludeTypes: ['reaction'],
			knownTypes: [...notificationTypes],
		});
		expect(migrateNotificationFilterSnapshot([], [])).toBeNull();
		expect(migrateNotificationFilterSnapshot(['reaction'], ['mention'])).toBeNull();
	});

	test('除外または既知種別が保存済みなら設定済みと判定する', () => {
		expect(hasConfiguredNotificationFilter(['reaction'], [])).toBe(true);
		expect(hasConfiguredNotificationFilter([], ['mention'])).toBe(true);
		expect(hasConfiguredNotificationFilter([], [])).toBe(false);
	});

	test('保存後に追加された通知種別は利用者が選ぶまでOFFにする', () => {
		const knownTypes = notificationTypes.filter(type => type !== 'addedToPrivateChannel' && type !== 'removedFromPrivateChannel');
		const result = resolveNotificationFilter([], knownTypes);

		expect(result.excludeTypes).toContain('addedToPrivateChannel');
		expect(result.excludeTypes).toContain('removedFromPrivateChannel');
	});

	test('古いクライアントで保存しても未知の通知設定を捨てない', () => {
		const result = serializeNotificationFilter(
			['reaction'],
			['futureNotification', 'mention'],
			['futureNotification'],
		);

		expect(result.excludeTypes).toEqual(['futureNotification', 'reaction']);
		expect(result.knownTypes).toContain('futureNotification');
		expect(result.knownTypes).toEqual(expect.arrayContaining([...notificationTypes]));
	});
});
