/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { groupHataFeedBellNotifications } from './hatafeed-bell-group.js';
import type * as Misskey from 'cherrypick-js';

const hataFeed = (id: string, body: string) => ({
	id,
	createdAt: `2026-08-04T10:00:0${id}.000Z`,
	type: 'hataFeed',
	body,
	header: 'HataFeed',
	icon: null,
	link: `/hatafeed/${id}`,
}) as Extract<Misskey.entities.Notification, { type: 'hataFeed' }>;

describe('groupHataFeedBellNotifications', () => {
	test('複数の HataFeed 通知を最新の位置に1グループとしてまとめる', () => {
		const normal = { id: 'normal', createdAt: '2026-08-04T09:59:59.000Z', type: 'test' } as Misskey.entities.Notification;
		const result = groupHataFeedBellNotifications([hataFeed('2', '二件目'), normal, hataFeed('1', '一件目')]);

		expect(result.map(item => item.type)).toEqual(['hataFeed:grouped', 'test']);
		expect(result[0]).toMatchObject({
			id: 'hatafeed-group:2',
			createdAt: '2026-08-04T10:00:02.000Z',
			items: [{ id: '2' }, { id: '1' }],
		});
	});

	test('同じ本文とリンクの別申請も失わず1グループにまとめる', () => {
		const first = { ...hataFeed('1', '新しい絵文字の申請が来ています。'), link: '/hatafeed' };
		const second = { ...hataFeed('2', '新しい絵文字の申請が来ています。'), link: '/hatafeed' };
		const result = groupHataFeedBellNotifications([second, first]);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			type: 'hataFeed:grouped',
			items: [{ id: '2' }, { id: '1' }],
		});
	});

	test('HataFeed 通知が1件だけなら元の行を変えない', () => {
		const only = hataFeed('1', '一件だけ');
		const result = groupHataFeedBellNotifications([only]);

		expect(result).toEqual([only]);
	});
});
