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

function sourceNotification(id: string, createdAt: number): HatacordingCachedActivity {
	return {
		...notification(id, createdAt),
		action: 'さんが投稿しました',
		cacheSource: {
			kind: 'notification',
			type: 'follow',
			external: false,
			groupedCount: 0,
			user: { id: 'user-1', username: 'seal', host: null } as never,
		},
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

	test('通知は翻訳済み文言ではなく再解決可能なsourceだけをv2へ保存する', () => {
		const now = Date.UTC(2026, 7, 10, 12);
		writeHatacordingActivityCache('user-a', [sourceNotification('source', now)], now, 'en-US');

		const raw = stored.get('hatacordingActivityCache:user-a') as { version: number; locale: string; items: HatacordingCachedActivity[] };
		expect(raw).toMatchObject({ version: 2, locale: 'en-us' });
		expect(raw.items[0]).toMatchObject({ id: 'source', cacheSource: { kind: 'notification', type: 'follow' } });
		expect(raw.items[0]).not.toHaveProperty('text');
		expect(raw.items[0]).not.toHaveProperty('detail');
		expect(raw.items[0]).not.toHaveProperty('action');
	});

	test('Bot由来フラグをキャッシュへ保持する', () => {
		const now = Date.UTC(2026, 7, 10, 12);
		const item = sourceNotification('bot-source', now);
		item.cacheSource = {
			...item.cacheSource!,
			user: { id: 'bot-1', username: 'helper', host: null, isBot: true } as never,
		};

		writeHatacordingActivityCache('user-a', [item], now);
		expect(readHatacordingActivityCache('user-a', now)[0]).toMatchObject({
			cacheSource: { botOrigin: true, user: { id: 'bot-1', isBot: true } },
		});
	});

	test('添付を含む完全なNoteは保存せず、上限付きの要約だけを保持する', () => {
		const now = Date.UTC(2026, 7, 10, 12);
		const item = sourceNotification('source', now);
		item.cacheSource = {
			...item.cacheSource!,
			note: {
				id: 'note-1',
				text: 'x'.repeat(5000),
				cw: 'y'.repeat(1000),
				files: [{ id: 'file-1', comment: 'z'.repeat(200_000) }],
			} as never,
			noteId: 'note-1',
			noteText: 'x'.repeat(5000),
			noteCw: 'y'.repeat(1000),
			noteEmojiUrls: Object.fromEntries(Array.from({ length: 30 }, (_, index) => [`emoji${index}`, `https://example.test/${index}.webp`])),
		};

		writeHatacordingActivityCache('user-a', [item], now);
		const raw = stored.get('hatacordingActivityCache:user-a') as { items: HatacordingCachedActivity[] };
		const source = raw.items[0].cacheSource!;
		expect(source).not.toHaveProperty('note');
		expect(source.noteText).toHaveLength(1000);
		expect(source.noteCw).toHaveLength(500);
		expect(Object.keys(source.noteEmojiUrls ?? {})).toHaveLength(20);
		expect(JSON.stringify(raw).length).toBeLessThan(50_000);
	});

	test('言語変更時もsource付き通知と翻訳不能な旧履歴を削除しない', () => {
		const now = Date.UTC(2026, 7, 10, 12);
		writeHatacordingActivityCache('user-a', [
			sourceNotification('source', now),
			notification('legacy', now - 1000),
			{ ...notification('earthquake', now - 2000), kind: 'earthquake', emergency: true },
		], now, 'en-US');

		expect(readHatacordingActivityCache('user-a', now, 'zh-CN').map(item => item.id)).toEqual(['earthquake', 'legacy', 'source']);
	});

	test('v1キャッシュは表示言語にかかわらず互換読込する', () => {
		const now = Date.UTC(2026, 7, 10, 12);
		stored.set('hatacordingActivityCache:user-a', {
			version: 1,
			items: [
				notification('legacy', now),
				{ ...notification('earthquake', now - 1000), kind: 'earthquake', emergency: true },
			],
		});

		expect(readHatacordingActivityCache('user-a', now, 'ja-JP').map(item => item.id)).toEqual(['earthquake', 'legacy']);
		expect(readHatacordingActivityCache('user-a', now, 'en-US').map(item => item.id)).toEqual(['earthquake', 'legacy']);
	});
});
