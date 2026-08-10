/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type * as Misskey from 'cherrypick-js';
import type { HatacordingActivityIcon, HatacordingActivityKind } from '@/utility/hatacording-activity.js';
import { miLocalStorage } from '@/local-storage.js';

export const HATACORDING_ACTIVITY_CACHE_MAX = 80;
export const HATACORDING_ACTIVITY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type HatacordingCachedActivity = {
	id: string;
	text: string;
	detail: string;
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
};

type HatacordingActivityCacheStore = {
	version: 1;
	items: HatacordingCachedActivity[];
};

const CACHEABLE_KINDS = ['notification', 'external', 'earthquake', 'tsunami'] as const;
const ICON_NAMES = ['bell', 'user', 'sparkles', 'message', 'activity', 'unplug'] as const;

function storageKey(accountId: string) {
	return `hatacordingActivityCache:${accountId}` as const;
}

function optionalString(value: unknown, maxLength: number): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value.slice(0, maxLength) : undefined;
}

function sanitizeActivity(value: unknown, now: number): HatacordingCachedActivity | null {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
	const raw = value as Partial<HatacordingCachedActivity>;
	if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
	if (typeof raw.text !== 'string' || typeof raw.detail !== 'string') return null;
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
	return {
		id: raw.id.slice(0, 160),
		text: raw.text.slice(0, 500),
		detail: raw.detail.slice(0, 1000),
		iconName: raw.iconName as HatacordingActivityIcon,
		to: typeof raw.to === 'string' && raw.to.startsWith('/') && !raw.to.startsWith('//') ? raw.to.slice(0, 500) : '',
		createdAt: new Date(createdAt).toISOString(),
		kind: raw.kind as HatacordingCachedActivity['kind'],
		emergency: raw.emergency === true,
		user,
		action: optionalString(raw.action, 1000),
		reaction: optionalString(raw.reaction, 160),
		reactionEmojiUrl: optionalString(raw.reactionEmojiUrl, 2000),
		notificationType: optionalString(raw.notificationType, 160),
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

export function readHatacordingActivityCache(accountId: string, now = Date.now()): HatacordingCachedActivity[] {
	try {
		const raw = miLocalStorage.getItemAsJson(storageKey(accountId)) as Partial<HatacordingActivityCacheStore> | null;
		if (raw?.version !== 1 || !Array.isArray(raw.items)) return [];
		return normalizeActivities(raw.items, now);
	} catch {
		return [];
	}
}

export function writeHatacordingActivityCache(accountId: string, values: HatacordingCachedActivity[], now = Date.now()): void {
	miLocalStorage.setItemAsJson(storageKey(accountId), {
		version: 1,
		items: normalizeActivities(values, now),
	} satisfies HatacordingActivityCacheStore);
}
