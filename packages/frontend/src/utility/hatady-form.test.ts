/* SPDX-License-Identifier: AGPL-3.0-only */
import { describe, expect, test, vi } from 'vitest';
import { commitFormLists, formField, formTimestamp, formValidation, localDateTime, restoreLegacyTime, saveBookNotes } from './hatady-form.js';
import { initialSessionDetails, sessionDetailPages, sessionDetailsPayload } from './hatady-session-form.js';
import { HATADY_STAT_FIELDS, MEDIA_SESSION_DETAIL_KEYS } from './hatady-media.js';
import type { HatadyMediaSession, HatadyMediaSessionKind } from './hatady-media.js';

describe('Hatady form value migration', () => {
	test('old drafts keep their category tag, arrays and seconds instead of reducing them to minutes', () => {
		const old = { tag: 'movie', durationMinutes: 12.5, studiedAtLocal: '2026-09-10T12:34:56.789', selectedBook: { id: 'book' }, unknown: ['a,b'] };
		expect(restoreLegacyTime(old)).toMatchObject({ tag: 'movie', tags: ['movie'], durationSeconds: 750, date: '2026-09-10', startedAt: '12:34:56.789', unknown: ['a,b'] });
		expect(restoreLegacyTime({ ...old, durationSeconds: null, tags: ['effort', 'future'] })).toMatchObject({ durationSeconds: null, tags: ['effort', 'future'] });
	});
	test('pending chip input on a hidden page is committed once without splitting commas', () => {
		const values = { genres: ['Drama'], __listDrafts: { genres: 'Action, Adventure' } };
		const pages = [{ id: 'details', title: '', fields: [formField('genres', 'ジャンル', { type: 'list' })] }];
		commitFormLists(pages, values); commitFormLists(pages, values);
		expect(values.genres).toEqual(['Drama', 'Action, Adventure']);
		expect(values.__listDrafts.genres).toBe('');
	});
	test('changing another field preserves the complete timestamp', () => {
		const iso = '2026-09-10T14:23:45.987Z';
		expect(formTimestamp(localDateTime(iso).slice(0, 10), iso)).toBe(iso);
		expect(formTimestamp('2026-09-12', iso)).toContain(':23:45.987Z');
	});
	test('validation distinguishes zero, blank, fractional seconds and invalid numeric fields', () => {
		expect(formValidation(formField('n', '人数', { type: 'number', min: 0 }), { n: '-1' })).toContain('0以上');
		expect(formValidation(formField('n', '人数', { type: 'number', min: 0 }), { n: '0.5' })).toContain('正しく');
		expect(formValidation(formField('n', '秒', { type: 'duration', min: 0, step: 'any' }), { n: 0.125 })).toBeNull();
		expect(formValidation(formField('n', '人数', { type: 'number', min: 0 }), { n: 0 })).toBeNull();
		expect(formValidation(formField('n', '人数', { type: 'number', min: 0 }), { n: '' })).toBeNull();
	});
});

describe('book note difference saving', () => {
	test('a failed later request retains successful IDs and retries without creating duplicates', async () => {
		const values: Record<string, any> = { bookmarks: [{ page: 10, name: '途中', color: 'green', memo: '覚える' }], memos: [{ page: 11, text: '内容' }], _bookmarksBaseline: [], _memosBaseline: [] };
		let fail = true;
		const api = vi.fn(async (endpoint: string, payload: Record<string, unknown>) => {
			if (endpoint.includes('memos') && fail) throw new Error('offline');
			return { id: endpoint.includes('bookmarks') ? 'bookmark-1' : 'memo-1', ...payload };
		});
		await expect(saveBookNotes(values, 'book-1', api)).rejects.toThrow('offline');
		expect(values.bookmarks[0].id).toBe('bookmark-1');
		expect(values._bookmarksBaseline[0].memo).toBe('覚える');
		fail = false;
		await saveBookNotes(values, 'book-1', api);
		expect(api.mock.calls.filter(([endpoint]) => endpoint.endsWith('bookmarks/create'))).toHaveLength(1);
		expect(api.mock.calls.filter(([endpoint]) => endpoint.endsWith('memos/create'))).toHaveLength(2);
		expect(values.memos[0].id).toBe('memo-1');
	});
	test('updates independent rows, keeps zero pages, and acknowledges deletions immediately', async () => {
		const values: Record<string, any> = { bookmarks: [{ id: 'keep', page: 0, name: '', color: 'blue', memo: '' }], memos: [], _bookmarksBaseline: [{ id: 'keep', page: 8, name: 'old', color: 'red', memo: 'old' }, { id: 'remove' }], _memosBaseline: [] };
		const api = vi.fn(async (_endpoint: string, payload: Record<string, unknown>) => ({ id: payload.bookmarkId, ...payload }));
		await saveBookNotes(values, 'book', api);
		expect(api.mock.calls).toEqual([
			['hata/hatady/bookmarks/delete', { bookmarkId: 'remove' }],
			['hata/hatady/bookmarks/update', { bookmarkId: 'keep', page: 0, name: null, color: 'blue', memo: null }],
		]);
		await saveBookNotes(values, 'book', api);
		expect(api).toHaveBeenCalledTimes(2);
	});
	test('a cleared memo cannot silently leave old server text behind', async () => {
		const api = vi.fn();
		await expect(saveBookNotes({ bookmarks: [], memos: [{ id: 'memo', text: '' }], _memosBaseline: [{ id: 'memo', text: 'old' }] }, 'book', api)).rejects.toThrow('メモが空欄');
		expect(api).not.toHaveBeenCalled();
	});
});

describe('every media recording category retains its existing details', () => {
	for (const kind of Object.keys(MEDIA_SESSION_DETAIL_KEYS) as HatadyMediaSessionKind[]) {
		test(`${kind}: every stored detail has an editable field or a derived stat field`, () => {
			const workKind = kind === 'movie_viewing' ? 'movie' : 'game';
			const pages = sessionDetailPages(workKind).filter(page => !page.when || page.when({ sessionKind: kind }));
			const fields = new Set(pages.flatMap(page => page.fields.map(field => field.key)));
			if (fields.has('weaponStats')) for (const key of ['statFields', ...HATADY_STAT_FIELDS]) fields.add(key);
			expect(MEDIA_SESSION_DETAIL_KEYS[kind].filter(key => !fields.has(key))).toEqual([]);
			expect(pages.every(page => page.fields.length <= 3)).toBe(true);
		});
	}
	test('editing known fields preserves unknown values and array ordering while permitting clear', () => {
		const original = { theaterName: 'old', companions: ['B, C', 'A'], viewingMode: 'future-mode', future: { value: 9 }, rewatch: true };
		const source = { details: original } as unknown as HatadyMediaSession;
		const values = initialSessionDetails(source);
		values.theaterName = '';
		expect(sessionDetailsPayload('movie', 'movie_viewing', values, original)).toMatchObject({ companions: ['B, C', 'A'], viewingMode: 'future-mode', future: { value: 9 }, rewatch: true });
		expect(sessionDetailsPayload('movie', 'movie_viewing', values, original)).toHaveProperty('theaterName', null);
	});
	test('unnamed legacy totals and unknown row fields survive, with zero distinct from unrecorded', () => {
		const source = { details: { kills: 4, deaths: 0, statFields: ['kills', 'deaths'] } } as unknown as HatadyMediaSession;
		const values = initialSessionDetails(source);
		values.weaponStats[0].future = 'retained';
		const saved = sessionDetailsPayload('game', 'game_match', values, source.details!);
		expect(saved.kills).toBe(4);
		expect(saved.deaths).toBe(0);
		expect(saved.assists).toBeNull();
		expect(saved.weaponStats).toEqual([]);
		const stored = { weaponStats: [{ weapon: '', kills: 4, deaths: 0, future: 'retained' }] };
		expect(sessionDetailsPayload('game', 'game_match', values, stored).weaponStats).toEqual([{ weapon: '', kills: 4, deaths: 0, assists: null, specials: null, rescues: null, future: 'retained' }]);
	});
});
