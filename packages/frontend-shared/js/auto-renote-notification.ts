/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Locale } from '../../../locales/index.js';
import type { I18n } from './i18n.js';

export type AutoRenoteStopNotice = {
	reason: 'quota' | 'offline' | 'role' | 'unavailable' | 'admin' | 'error';
	count: number;
	adminReason?: string;
};

/** Shared by the in-app notification and the service worker; render as plain text. */
export function autoRenoteStoppedBody(notification: AutoRenoteStopNotice, i18n: I18n<Locale>): string {
	const parts = [
		i18n.tsx._autoRenote.stoppedCount({ count: notification.count }),
		i18n.ts._autoRenote._reasons[notification.reason],
	];
	if (notification.reason === 'admin' && notification.adminReason) {
		parts.push(i18n.tsx._autoRenote.notificationAdminReason({ reason: notification.adminReason }));
	}
	return parts.join(' ');
}
