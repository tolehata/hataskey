/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { notificationTypes as clientNotificationTypes } from 'cherrypick-js';
import { describe, expect, test } from 'vitest';
import { notificationFilterTypes } from '@/types.js';
import { paramDef as notificationsParamDef } from '@/server/api/endpoints/i/notifications.js';
import { paramDef as groupedNotificationsParamDef } from '@/server/api/endpoints/i/notifications-grouped.js';

describe('notification filter types', () => {
	test('フロントとバックエンドのフィルタ対象が一致する', () => {
		expect(new Set(notificationFilterTypes)).toEqual(new Set(clientNotificationTypes));
	});

	test.each([
		['i/notifications', notificationsParamDef],
		['i/notifications-grouped', groupedNotificationsParamDef],
	])('%s はプライベートチャンネル通知を除外指定できる', (_name, paramDef) => {
		const includeEnum = paramDef.properties.includeTypes.items.enum;
		const excludeEnum = paramDef.properties.excludeTypes.items.enum;

		for (const type of ['addedToPrivateChannel', 'removedFromPrivateChannel']) {
			expect(includeEnum).toContain(type);
			expect(excludeEnum).toContain(type);
		}
	});
});
