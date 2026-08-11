/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type * as Misskey from 'cherrypick-js';
import type { HatacordingActivityIcon, HatacordingActivityKind, HatacordingNotificationActivitySource } from '@/utility/hatacording-activity.js';
import { miLocalStorage } from '@/local-storage.js';
import { versatileLang } from '@/utility/intl-const.js';

export const HATACORDING_ACTIVITY_CACHE_MAX = 80;
export const HATACORDING_ACTIVITY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type HatacordingCachedActivity = {
	id: string;
	text?: string;
	detail?: string;
	iconName: HatacordingActivityIcon;
	to: string;
	createdAt: string;
	kind: Extract<HatacordingActivityKind, 'notification' | 'external' | 'earthquake' | 'tsunami'>;
	emergency: boolean;
	user?: Misskey.entities.UserLite;
	action?: string;
	reaction?: string;
	reactionEmojiUrl?: string;
	notificationType?: string;
	cacheSource?: HatacordingNotificationActivitySource;
};

type HatacordingActivityCacheStoreV1 = {
	version: 1;
	items: HatacordingCachedActivity[];
};

type HatacordingActivityCacheStoreV2 = {
	version: 2;
	locale: string;
	items: HatacordingCachedActivity[];
};

type HatacordingActivityCacheStore = HatacordingActivityCacheStoreV1 | HatacordingActivityCacheStoreV2;

const CACHEABLE_KINDS = ['notification', 'external', 'earthquake', 'tsunami'] as const;
const ICON_NAMES = ['bell', 'user', 'sparkles', 'message', 'activity', 'unplug'] as const;

function storageKey(accountId: string) {
	return `hatacordingActivityCache:${accountId}` as const;
}

function optionalString(value: unknown, maxLength: number): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value.slice(0, maxLength) : undefined;
}

function localeKey(lang: string): string {
	return lang.trim().toLowerCase().replaceAll('_', '-');
}

function safeUser(value: unknown): Misskey.entities.UserLite | undefined {
	return value != null
		&& typeof value === 'object'
		&& typeof (value as { id?: unknown }).id === 'string'
		&& typeof (value as { username?: unknown }).username === 'string'
		? value as Misskey.entities.UserLite
		: undefined;
}

function safeNote(value: unknown): Misskey.entities.Note | undefined {
	return value != null && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string'
		? value as Misskey.entities.Note
		: undefined;
}

function safeEmojiUrls(value: unknown): Record<string, string> | undefined {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const entries = Object.entries(value)
		.filter((entry): entry is [string, string] => entry[0].length > 0 && typeof entry[1] === 'string' && entry[1].length > 0)
		.slice(0, 20)
		.map(([name, url]) => [name.slice(0, 160), url.slice(0, 2000)] as const);
	return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function sanitizeCacheSource(value: unknown): HatacordingNotificationActivitySource | undefined {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const raw = value as Partial<HatacordingNotificationActivitySource>;
	if (raw.kind !== 'notification' || typeof raw.type !== 'string' || raw.type.length === 0) return undefined;
	const legacyNote = safeNote(raw.note);
	const user = safeUser(raw.user);
	return {
		kind: 'notification',
		type: raw.type.slice(0, 160),
		external: raw.external === true,
		botOrigin: raw.botOrigin === true || user?.isBot === true,
		user,
		// Full Notes can contain files, reactions and nested renotes. Persist only the
		// bounded fields required to rebuild the one-line notification after reload.
		noteId: optionalString(raw.noteId, 160) ?? optionalString(legacyNote?.id, 160),
		noteText: optionalString(raw.noteText, 1000) ?? optionalString(legacyNote?.text, 1000),
		noteCw: optionalString(raw.noteCw, 500) ?? optionalString(legacyNote?.cw, 500),
		noteEmojiUrls: safeEmojiUrls(raw.noteEmojiUrls),
		reaction: optionalString(raw.reaction, 160),
		reactionEmojiUrl: optionalString(raw.reactionEmojiUrl, 2000),
		groupedCount: typeof raw.groupedCount === 'number' && Number.isFinite(raw.groupedCount)
			? Math.max(0, Math.min(100_000, Math.trunc(raw.groupedCount)))
			: 0,
		header: optionalString(raw.header, 500),
		body: optionalString(raw.body, 1000),
		message: optionalString(raw.message, 1000),
		link: optionalString(raw.link, 500),
		roleId: optionalString(raw.roleId, 160),
		roleName: optionalString(raw.roleName, 500),
		roleDescription: optionalString(raw.roleDescription, 1000),
		chatRoomId: optionalString(raw.chatRoomId, 160),
		invitationName: optionalString(raw.invitationName, 500),
		fileId: optionalString(raw.fileId, 160),
	};
}

function sanitizeActivity(value: unknown, now: number): HatacordingCachedActivity | null {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
	const raw = value as Partial<HatacordingCachedActivity>;
	if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
	if (typeof raw.createdAt !== 'string') return null;
	const createdAt = new Date(raw.createdAt).getTime();
	if (!Number.isFinite(createdAt) || now - createdAt > HATACORDING_ACTIVITY_CACHE_TTL_MS) return null;
	if (!CACHEABLE_KINDS.includes(raw.kind as typeof CACHEABLE_KINDS[number])) return null;
	if (!ICON_NAMES.includes(raw.iconName as typeof ICON_NAMES[number])) return null;
	const user = raw.user != null
		&& typeof raw.user === 'object'
		&& typeof (raw.user as { id?: unknown }).id === 'string'
		? raw.user as Misskey.entities.UserLite
		: undefined;
	const cacheSource = sanitizeCacheSource(raw.cacheSource);
	if (cacheSource == null && (typeof raw.text !== 'string' || typeof raw.detail !== 'string')) return null;
	const common = {
		id: raw.id.slice(0, 160),
		iconName: raw.iconName as HatacordingActivityIcon,
		to: typeof raw.to === 'string' && raw.to.startsWith('/') && !raw.to.startsWith('//') ? raw.to.slice(0, 500) : '',
		createdAt: new Date(createdAt).toISOString(),
		kind: raw.kind as HatacordingCachedActivity['kind'],
		emergency: raw.emergency === true,
		reaction: optionalString(raw.reaction, 160),
		reactionEmojiUrl: optionalString(raw.reactionEmojiUrl, 2000),
		notificationType: optionalString(raw.notificationType, 160),
	};
	return cacheSource != null
		? { ...common, cacheSource }
		: {
			...common,
			user,
			text: raw.text!.slice(0, 500),
			detail: raw.detail!.slice(0, 1000),
			action: optionalString(raw.action, 1000),
		};
}

function normalizeActivities(values: unknown[], now: number): HatacordingCachedActivity[] {
	const byId = new Map<string, HatacordingCachedActivity>();
	for (const value of values) {
		const activity = sanitizeActivity(value, now);
		if (activity != null) byId.set(activity.id, activity);
	}
	return [...byId.values()]
		.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
		.slice(-HATACORDING_ACTIVITY_CACHE_MAX);
}

export function readHatacordingActivityCache(accountId: string, now = Date.now(), _lang = versatileLang): HatacordingCachedActivity[] {
	try {
		const raw = miLocalStorage.getItemAsJson(storageKey(accountId)) as Partial<HatacordingActivityCacheStore> | null;
		if ((raw?.version !== 1 && raw?.version !== 2) || !Array.isArray(raw.items)) return [];
		// source 付き通知は復元側で現在のlocaleへ再解決する。旧v1やsource無しの履歴は
		// 翻訳不能でも削除せず、保存されていた原文を互換表示する。
		return normalizeActivities(raw.items, now);
	} catch {
		return [];
	}
}

export function writeHatacordingActivityCache(accountId: string, values: HatacordingCachedActivity[], now = Date.now(), lang = versatileLang): void {
	miLocalStorage.setItemAsJson(storageKey(accountId), {
		version: 2,
		locale: localeKey(lang),
		items: normalizeActivities(values, now),
	} satisfies HatacordingActivityCacheStoreV2);
}
