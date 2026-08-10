/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

const stored = vi.hoisted(() => new Map<string, unknown>());
const storage = vi.hoisted(() => ({
	getItemAsJson: vi.fn((key: string) => stored.get(key) ?? null),
	setItemAsJson: vi.fn((key: string, value: unknown) => stored.set(key, structuredClone(value))),
}));

vi.mock('@/local-storage.js', () => ({ miLocalStorage: storage }));

import {
	HATACORDING_ACTIVITY_CACHE_MAX,
	HATACORDING_ACTIVITY_CACHE_TTL_MS,
	readHatacordingActivityCache,
	writeHatacordingActivityCache,
} from './hatacording-activity-cache.js';
import type { HatacordingCachedActivity } from './hatacording-activity-cache.js';

function notification(id: string, createdAt: number): HatacordingCachedActivity {
	return {
		id,
		text: `通知${id}`,
		detail: '詳細',
		iconName: 'bell',
		to: '/my/notifications',
		createdAt: new Date(createdAt).toISOString(),
		kind: 'notification',
		emergency: false,
	};
}

describe('HataSNSCordUIの通知履歴キャッシュ', () => {
	beforeEach(() => {
		stored.clear();
		storage.getItemAsJson.mockClear();
		storage.setItemAsJson.mockClear();
	});

	test('アカウント別に保存し、重複を除いて時系列に復元する', () => {
		const now = Date.UTC(2026, 7, 10, 12);
		writeHatacordingActivityCache('user-a', [
			notification('b', now - 1000),
			notification('a', now - 2000),
			{ ...notification('a', now - 1500), text: '更新後' },
		], now);

		expect(readHatacordingActivityCache('user-a', now).map(item => [item.id, item.text])).toEqual([
			['a', '更新後'],
			['b', '通知b'],
		]);
		expect(readHatacordingActivityCache('user-b', now)).toEqual([]);
	});

	test('7日より古い履歴を捨て、最新80件だけを保持する', () => {
		const now = Date.UTC(2026, 7, 10, 12);
		const values = Array.from({ length: HATACORDING_ACTIVITY_CACHE_MAX + 5 }, (_, index) => notification(String(index), now - index * 1000));
		values.push(notification('expired', now - HATACORDING_ACTIVITY_CACHE_TTL_MS - 1));

		writeHatacordingActivityCache('user-a', values, now);
		const result = readHatacordingActivityCache('user-a', now);

		expect(result).toHaveLength(HATACORDING_ACTIVITY_CACHE_MAX);
		expect(result.some(item => item.id === 'expired')).toBe(false);
		expect(result.at(-1)?.id).toBe('0');
	});

	test('壊れた種類・外部URL・不正日時を復元しない', () => {
		const now = Date.UTC(2026, 7, 10, 12);
		stored.set('hatacordingActivityCache:user-a', {
			version: 1,
			items: [
				{ ...notification('safe', now), to: 'https://example.com' },
				{ ...notification('broken-kind', now), kind: 'connection' },
				{ ...notification('broken-date', now), createdAt: 'invalid' },
			],
		});

		expect(readHatacordingActivityCache('user-a', now)).toEqual([
			expect.objectContaining({ id: 'safe', to: '' }),
		]);
	});
});
