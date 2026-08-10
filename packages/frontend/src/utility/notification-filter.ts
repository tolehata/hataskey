/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { notificationTypes } from 'cherrypick-js';

export type NotificationType = typeof notificationTypes[number];

export type NotificationFilterState = {
	excludeTypes: NotificationType[];
	knownTypes: string[];
};

export type StoredNotificationFilterState = {
	excludeTypes: string[];
	knownTypes: string[];
};

export const NOTIFICATION_FILTER_POLICY_NOTICE = {
	id: 'hata-notification-filter-policy-notice-12-1',
	header: '通知フィルタの挙動が変わりました',
	body: '今後、新しい通知種別が追加されても、通知フィルタを設定している場合は自動で有効になりません。必要な通知はフィルタ設定から手動でオンにしてください。',
} as const;

function unique(values: readonly string[]): string[] {
	return [...new Set(values)];
}

export function isNotificationType(value: string): value is NotificationType {
	return (notificationTypes as readonly string[]).includes(value);
}

export function hasConfiguredNotificationFilter(
	excludeTypes: readonly string[] | null | undefined,
	knownTypes: readonly string[] | null | undefined,
): boolean {
	return (excludeTypes?.length ?? 0) > 0 || (knownTypes?.length ?? 0) > 0;
}

/**
 * knownTypes を持たない旧フィルタへ、更新時点の通知種別を一度だけ記録する。
 * これにより次回以降に増えた通知種別だけを未選択として扱える。
 */
export function migrateNotificationFilterSnapshot(
	excludeTypes: readonly string[] | null | undefined,
	knownTypes: readonly string[] | null | undefined,
): StoredNotificationFilterState | null {
	if ((excludeTypes?.length ?? 0) === 0 || (knownTypes?.length ?? 0) > 0) return null;
	return {
		excludeTypes: [...(excludeTypes ?? [])],
		knownTypes: [...notificationTypes],
	};
}

/**
 * 保存時点では存在しなかった通知種別を、利用者の確認なしに自動でONにしないための初期状態を作る。
 * knownTypes が無い旧設定は従来どおり現在の全種別を既知として扱い、既存表示を勝手に変えない。
 */
export function resolveNotificationFilter(
	excludeTypes: readonly string[] | null | undefined,
	knownTypes: readonly string[] | null | undefined,
): NotificationFilterState {
	const currentTypes = new Set<string>(notificationTypes);
	const excluded = new Set<string>(excludeTypes ?? []);
	const hasSnapshot = (knownTypes?.length ?? 0) > 0;
	const known = new Set<string>(hasSnapshot ? knownTypes : notificationTypes);

	if (hasSnapshot) {
		for (const type of notificationTypes) {
			if (!known.has(type)) excluded.add(type);
		}
	}

	return {
		excludeTypes: unique([...excluded].filter(type => currentTypes.has(type))).filter(isNotificationType),
		knownTypes: unique(hasSnapshot ? (knownTypes ?? []) : notificationTypes),
	};
}

/**
 * ダイアログで確定した現在版の選択を保存形式へ戻す。
 * 新しい版で追加された未知の値は捨てず、古いクライアントから保存しても設定を壊さない。
 */
export function serializeNotificationFilter(
	disabledCurrentTypes: readonly string[],
	previousExcludeTypes: readonly string[] | null | undefined,
	previousKnownTypes: readonly string[] | null | undefined,
): StoredNotificationFilterState {
	const currentTypes = new Set<string>(notificationTypes);
	const unknownExcluded = (previousExcludeTypes ?? []).filter(type => !currentTypes.has(type));
	const unknownKnown = (previousKnownTypes ?? []).filter(type => !currentTypes.has(type));

	return {
		excludeTypes: unique([
			...unknownExcluded,
			...disabledCurrentTypes.filter(type => currentTypes.has(type)),
		]),
		knownTypes: unique([...unknownKnown, ...notificationTypes]),
	};
}
