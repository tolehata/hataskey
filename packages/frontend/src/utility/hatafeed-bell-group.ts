/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type * as Misskey from 'cherrypick-js';

export type HataFeedBellNotification = Extract<Misskey.entities.Notification, { type: 'hataFeed' }>;

export type HataFeedBellGroup = {
	type: 'hataFeed:grouped';
	id: string;
	createdAt: string;
	items: HataFeedBellNotification[];
};

export type BellNotificationForDisplay = Misskey.entities.Notification | HataFeedBellGroup;

/**
 * 本体の通知一覧にある HataFeed 通知を、時系列上の最初の位置へ1つにまとめる。
 * 単独の場合は従来の通知行をそのまま返す。
 */
export function groupHataFeedBellNotifications(
	notifications: Misskey.entities.Notification[],
): BellNotificationForDisplay[] {
	const hataFeedItems = notifications.filter((notification): notification is HataFeedBellNotification => notification.type === 'hataFeed');
	if (hataFeedItems.length < 2) return notifications;

	const group: HataFeedBellGroup = {
		type: 'hataFeed:grouped',
		id: `hatafeed-group:${hataFeedItems[0].id}`,
		createdAt: hataFeedItems[0].createdAt,
		items: hataFeedItems,
	};
	const result: BellNotificationForDisplay[] = [];
	let emitted = false;
	for (const notification of notifications) {
		if (notification.type === 'hataFeed') {
			if (!emitted) {
				result.push(group);
				emitted = true;
			}
			continue;
		}
		result.push(notification);
	}
	return result;
}
