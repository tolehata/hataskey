/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// @vitest-environment node

import { describe, expect, test, vi } from 'vitest';
import type { entities } from 'cherrypick-js';
import { prepareHk3HighlightContext, resolveHk3HighlightSource } from './hk3-highlights.js';
import type { Hk3HighlightContextPage } from './hk3-highlights.js';

function note(id: string, patch: Partial<entities.Note> = {}): entities.Note {
	return {
		id,
		createdAt: new Date(Date.UTC(2026, 10, 1) + Number(id) * 1000).toISOString(),
		userId: 'author',
		user: { id: 'author', username: 'author', host: null, isBot: false },
		text: 'いつもの投稿', cw: null, visibility: 'public',
		replyId: null, renoteId: null, fileIds: [], files: [],
		...patch,
	} as entities.Note;
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(done => { resolve = done; });
	return { promise, resolve };
}

const defaults = { isCurrent: () => true, accept: () => true };

describe('resolveHk3HighlightSource', () => {
	test.each([
		['following', 'home'], ['local', 'local'], ['social', 'social'], ['mixed', 'global'],
	])('maps native tab %s to %s', (tab, source) => {
		expect(resolveHk3HighlightSource(tab)).toBe(source);
	});

	test.each(['home', 'global', 'external', 'ohtl', 'oltl', 'ctl', 'trending', 'list', 'antenna', '', 'unknown'])('does not substitute home for %s', tab => {
		expect(resolveHk3HighlightSource(tab)).toBeNull();
	});
});

describe('prepareHk3HighlightContext', () => {
	test('continues after a short verification page and uses the freshly returned target', async () => {
		const target = note('020', { text: 'stale' });
		const fresh = note('020', { text: 'fresh' });
		const fetchPage = vi.fn()
			.mockResolvedValueOnce([note('022'), note('021')])
			.mockResolvedValueOnce([fresh, note('019')])
			.mockResolvedValueOnce([note('018')])
			.mockResolvedValueOnce([note('023')]);
		const result = await prepareHk3HighlightContext(target, { ...defaults, fetchPage });
		expect(fetchPage.mock.calls.map(call => call[0])).toEqual([
			{ limit: 100, untilDate: Date.parse(target.createdAt) + 1000 },
			{ limit: 100, untilId: '021' },
			{ limit: 20, untilId: '020' },
			{ limit: 20, sinceId: '020' },
		]);
		expect(result?.notes.map(value => value.id)).toEqual(['023', '020', '018']);
		expect(result?.notes[1]).toBe(fresh);
		expect(result).toMatchObject({ hasOlder: true, hasNewer: true });
	});

	test('never manufactures a target absent from its current timeline', async () => {
		const fetchPage = vi.fn().mockResolvedValue([note('021'), note('019')]);
		expect(await prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage })).toBeNull();
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	test('rejects a freshly hidden target before fetching neighbors', async () => {
		const fresh = note('020', { text: 'hidden' });
		const fetchPage = vi.fn().mockResolvedValue([fresh]);
		expect(await prepareHk3HighlightContext(note('020'), {
			...defaults, fetchPage, accept: value => value.text !== 'hidden',
		})).toBeNull();
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	test('deduplicates neighbors, preserves the fresh outer renote and sorts newest first', async () => {
		const fresh = note('020', { renoteId: '001', renote: note('001'), text: null });
		const fetchPage = vi.fn()
			.mockResolvedValueOnce([fresh])
			.mockResolvedValueOnce([note('018'), note('019'), note('020', { text: 'wrong' })])
			.mockResolvedValueOnce([note('023'), note('021'), note('019'), note('020')]);
		const result = await prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage });
		expect(result?.notes.map(value => value.id)).toEqual(['023', '021', '020', '019', '018']);
		expect(result?.notes[2]).toBe(fresh);
		expect(result?.notes[2].createdAt).toBe(fresh.createdAt);
	});

	test('returns raw nonempty-page flags even if all neighboring notes are filtered', async () => {
		const fetchPage = vi.fn()
			.mockResolvedValueOnce([note('020')])
			.mockResolvedValueOnce([note('019')])
			.mockResolvedValueOnce([]);
		const result = await prepareHk3HighlightContext(note('020'), {
			...defaults, fetchPage, accept: value => value.id === '020',
		});
		expect(result?.notes.map(value => value.id)).toEqual(['020']);
		expect(result).toMatchObject({ hasOlder: true, hasNewer: false });
	});

	test('rejects a late verification response after the source changes', async () => {
		const pending = deferred<entities.Note[]>();
		let current = true;
		const fetchPage = vi.fn(() => pending.promise);
		const result = prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage, isCurrent: () => current });
		current = false;
		pending.resolve([note('020')]);
		expect(await result).toBeNull();
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	test('rejects a late neighbor response after cancellation without fetching further pages', async () => {
		const pending = deferred<entities.Note[]>();
		let current = true;
		const fetchPage = vi.fn(async (params: Hk3HighlightContextPage) => {
			if (params.untilDate != null) return [note('020')];
			current = false;
			return pending.promise;
		});
		const result = prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage, isCurrent: () => current });
		pending.resolve([note('019')]);
		expect(await result).toBeNull();
		expect(fetchPage).toHaveBeenCalledTimes(2);
	});

	test('honors an abort even when the fetcher returns a late response', async () => {
		const pending = deferred<entities.Note[]>();
		const controller = new AbortController();
		const fetchPage = vi.fn(() => pending.promise);
		const result = prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage, signal: controller.signal });
		controller.abort();
		pending.resolve([note('020')]);
		await expect(result).rejects.toMatchObject({ name: 'AbortError' });
		expect(fetchPage).toHaveBeenCalledWith(expect.any(Object), controller.signal);
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	test('does not issue any request for a cancelled or already aborted operation', async () => {
		const fetchPage = vi.fn();
		expect(await prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage, isCurrent: () => false })).toBeNull();
		const controller = new AbortController();
		controller.abort();
		await expect(prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage, signal: controller.signal }))
			.rejects.toMatchObject({ name: 'AbortError' });
		expect(fetchPage).not.toHaveBeenCalled();
	});

	test('rechecks target visibility after both neighboring pages arrive', async () => {
		let visible = true;
		const fetchPage = vi.fn(async (params: Hk3HighlightContextPage) => {
			if (params.untilDate != null) return [note('020')];
			if (params.sinceId) visible = false;
			return [];
		});
		expect(await prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage, accept: () => visible })).toBeNull();
		expect(fetchPage).toHaveBeenCalledTimes(3);
	});

	test('stops verification at an empty page or a stalled cursor', async () => {
		const empty = vi.fn().mockResolvedValue([]);
		expect(await prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage: empty })).toBeNull();
		expect(empty).toHaveBeenCalledTimes(1);
		const stalled = vi.fn().mockResolvedValue([note('021')]);
		expect(await prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage: stalled })).toBeNull();
		expect(stalled).toHaveBeenCalledTimes(2);
	});

	test('bounds verification to eight progressing pages', async () => {
		let id = 100;
		const fetchPage = vi.fn(async () => [note(String(--id).padStart(3, '0'))]);
		expect(await prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage })).toBeNull();
		expect(fetchPage).toHaveBeenCalledTimes(8);
	});

	test('propagates a current API failure without turning it into an empty timeline', async () => {
		const error = new Error('request failed');
		const fetchPage = vi.fn().mockRejectedValue(error);
		await expect(prepareHk3HighlightContext(note('020'), { ...defaults, fetchPage })).rejects.toBe(error);
	});
});
