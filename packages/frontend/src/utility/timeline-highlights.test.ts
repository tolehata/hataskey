/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
// @vitest-environment node

import { afterEach, describe, expect, test, vi } from 'vitest';
import type { entities } from 'cherrypick-js';
import type { HighlightFetchPage, HighlightSource } from './timeline-highlights.js';
import {
	buildHighlightBins,
	clipHighlightNotes,
	createTimelineHighlightsLoader,
	filterHighlightNotes,
	getHighlightDayBounds,
} from './timeline-highlights.js';

const HOUR = 60 * 60 * 1000;
const day = { start: Date.parse('2026-10-28T00:00:00.000Z'), end: Date.parse('2026-10-29T00:00:00.000Z') };
const filters = { withRenotes: true, onlyFiles: false };

function note(id: string, hour = 12, patch: Partial<entities.Note> = {}): entities.Note {
	return {
		id,
		createdAt: new Date(day.start + hour * HOUR).toISOString(),
		userId: 'author',
		user: { id: 'author', username: 'author', host: null, isBot: false },
		text: 'いつもの投稿',
		cw: null,
		visibility: 'public',
		replyId: null,
		renoteId: null,
		fileIds: [],
		files: [],
		...patch,
	} as entities.Note;
}

function loader(fetchPage: HighlightFetchPage, source: HighlightSource = 'local') {
	return createTimelineHighlightsLoader({ source, day, filters, fetchPage });
}

afterEach(() => vi.unstubAllEnvs());

test('user mute changes also remove reply authors nested inside a pure renote', () => {
	const reply = note('reply', 5, { userId: 'muted-user' });
	const original = note('original', 6, { reply, replyId: reply.id });
	const renote = note('renote', 7, { text: null, renote: original, renoteId: original.id });
	expect(filterHighlightNotes([renote], { isMutedUser: () => false })).toHaveLength(1);
	expect(filterHighlightNotes([renote], { isMutedUser: id => id === 'muted-user' })).toHaveLength(0);
});

describe('highlight timeline pagination', () => {
	test.each([
		['home', 'notes/timeline'],
		['local', 'notes/local-timeline'],
		['social', 'notes/hybrid-timeline'],
		['global', 'notes/global-timeline'],
	] as const)('%s requests the native endpoint with its supported filters', async (source, endpoint) => {
		const fetchPage = vi.fn<HighlightFetchPage>().mockResolvedValue([]);
		await createTimelineHighlightsLoader({ source, day, filters: { withRenotes: false, onlyFiles: true }, fetchPage }).load();
		expect(fetchPage).toHaveBeenCalledWith(endpoint, {
			limit: 100,
			withRenotes: false,
			withFiles: true,
			untilDate: day.end,
			...(source === 'local' || source === 'social' ? { withReplies: false } : {}),
		}, undefined);
	});

	test.each(['local', 'social'] as const)('%s supports replies but never sends the incompatible files/replies combination', async source => {
		const fetchPage = vi.fn<HighlightFetchPage>().mockResolvedValue([]);
		await createTimelineHighlightsLoader({ source, day, filters: { ...filters, withReplies: true }, fetchPage }).load();
		expect(fetchPage.mock.calls[0][1].withReplies).toBe(true);
		await createTimelineHighlightsLoader({ source, day, filters: { withRenotes: true, onlyFiles: true, withReplies: true }, fetchPage }).load();
		expect(fetchPage.mock.calls[1][1].withReplies).toBe(false);
	});

	test('short pages remain partial and can continue until an actually empty page', async () => {
		const fetchPage = vi.fn<HighlightFetchPage>()
			.mockResolvedValueOnce([note('newer', 23)])
			.mockResolvedValueOnce([note('older', 20)])
			.mockResolvedValueOnce([]);
		const reader = loader(fetchPage);
		expect(await reader.load({ maxPages: 1 })).toMatchObject({ complete: false, pagesLoaded: 1, cursor: 'newer', stopReason: null });
		const result = await reader.load({ maxPages: 2 });
		expect(result.notes.map(item => item.id)).toEqual(['newer', 'older']);
		expect(result).toMatchObject({ complete: true, pagesLoaded: 3, stopReason: 'empty' });
		expect(fetchPage.mock.calls[1][1]).toMatchObject({ untilId: 'newer' });
		expect(fetchPage.mock.calls[1][1]).not.toHaveProperty('untilDate');
		await reader.load();
		expect(fetchPage).toHaveBeenCalledTimes(3);
	});

	test('clips both day boundaries and stops on the raw oldest timestamp even if the note is hidden', async () => {
		const fetchPage = vi.fn<HighlightFetchPage>().mockResolvedValue([
			note('next-day', 24), note('inside', 12), note('midnight', 0), note('previous-day', -1, { isHidden: true }),
		]);
		const result = await loader(fetchPage).load();
		expect(result.notes.map(item => item.id)).toEqual(['inside', 'midnight']);
		expect(result).toMatchObject({ complete: true, pagesLoaded: 1, stopReason: 'before-day' });
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	test('a note exactly at midnight does not discard more notes at that same millisecond', async () => {
		const fetchPage = vi.fn<HighlightFetchPage>()
			.mockResolvedValueOnce([note('z', 0)])
			.mockResolvedValueOnce([note('a', 0), note('old', -1)]);
		const result = await loader(fetchPage).load();
		expect(result.notes.map(item => item.id)).toEqual(['z', 'a']);
		expect(fetchPage).toHaveBeenCalledTimes(2);
	});

	test('deduplicates overlapping pages without treating a progressing cursor as completion', async () => {
		const fetchPage = vi.fn<HighlightFetchPage>()
			.mockResolvedValueOnce([note('a', 22), note('b', 20)])
			.mockResolvedValueOnce([note('b', 20), note('c', 18)])
			.mockResolvedValueOnce([]);
		const result = await loader(fetchPage).load();
		expect(result.notes.map(item => item.id)).toEqual(['a', 'b', 'c']);
		expect(result.complete).toBe(true);
		expect(fetchPage.mock.calls[2][1].untilId).toBe('c');
	});

	test('a repeated cursor is an explicit incomplete stop and cannot loop on load more', async () => {
		const fetchPage = vi.fn<HighlightFetchPage>()
			.mockResolvedValueOnce([note('a', 22), note('b', 20)])
			.mockResolvedValueOnce([note('c', 21), note('b', 20)]);
		const reader = loader(fetchPage);
		const result = await reader.load();
		expect(result).toMatchObject({ complete: false, stopReason: 'cursor-stalled', pagesLoaded: 2 });
		expect(result.notes).toHaveLength(3);
		await reader.load();
		expect(fetchPage).toHaveBeenCalledTimes(2);
	});

	test('a page containing only previously seen IDs is also an explicit stalled stop', async () => {
		const fetchPage = vi.fn<HighlightFetchPage>()
			.mockResolvedValueOnce([note('a', 22), note('b', 20), note('c', 18)])
			.mockResolvedValueOnce([note('a', 22), note('b', 20)]);
		expect(await loader(fetchPage).load()).toMatchObject({ complete: false, stopReason: 'cursor-stalled', pagesLoaded: 2 });
	});

	test('uses an outer renote timestamp and cursor even when its original is from another day', async () => {
		const original = note('original', -100);
		const renote = note('renote-today', 20, { text: null, renoteId: original.id, renote: original });
		const fetchPage = vi.fn<HighlightFetchPage>().mockResolvedValueOnce([renote]).mockResolvedValueOnce([]);
		const result = await loader(fetchPage).load();
		expect(result.notes).toEqual([renote]);
		expect(fetchPage.mock.calls[1][1].untilId).toBe('renote-today');
		expect(buildHighlightBins(result.notes, day).find(bin => bin.count > 0)?.start).toBe(day.start + 20 * HOUR);
	});

	test('does not issue a request for an already aborted signal', async () => {
		const controller = new AbortController();
		controller.abort();
		const fetchPage = vi.fn<HighlightFetchPage>();
		await expect(loader(fetchPage).load({ signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
		expect(fetchPage).not.toHaveBeenCalled();
	});

	test('passes the signal through and discards a late response after cancellation', async () => {
		let resolve: (notes: entities.Note[]) => void = () => {};
		const fetchPage = vi.fn<HighlightFetchPage>()
			.mockResolvedValueOnce([note('committed', 22)])
			.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
		const reader = loader(fetchPage);
		await reader.load({ maxPages: 1 });
		const controller = new AbortController();
		const pending = reader.load({ signal: controller.signal });
		expect(fetchPage.mock.calls[1][2]).toBe(controller.signal);
		controller.abort();
		resolve([note('stale', 20)]);
		await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
		expect(reader.snapshot()).toMatchObject({ pagesLoaded: 1, cursor: 'committed', complete: false });
		expect(reader.snapshot().notes.map(item => item.id)).toEqual(['committed']);
	});

	test('an API error preserves progress and releases the loader for a retry', async () => {
		const fetchPage = vi.fn<HighlightFetchPage>()
			.mockResolvedValueOnce([note('a', 22)])
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValueOnce([]);
		const reader = loader(fetchPage);
		await expect(reader.load()).rejects.toThrow('offline');
		expect(reader.snapshot()).toMatchObject({ cursor: 'a', pagesLoaded: 1, complete: false });
		expect(await reader.load()).toMatchObject({ complete: true, pagesLoaded: 2 });
		expect(fetchPage.mock.calls[2][1].untilId).toBe('a');
	});

	test('invalid timestamps cannot masquerade as a complete empty day', async () => {
		const fetchPage = vi.fn<HighlightFetchPage>().mockResolvedValue([note('bad', 12, { createdAt: 'invalid' })]);
		const reader = loader(fetchPage);
		await expect(reader.load()).rejects.toThrow('Invalid highlight note timestamp');
		expect(reader.snapshot()).toMatchObject({ complete: false, pagesLoaded: 0 });
	});
});

describe('local days and hourly density', () => {
	test('a date input is local midnight, and date arithmetic crosses a month boundary', () => {
		vi.stubEnv('TZ', 'Asia/Tokyo');
		const bounds = getHighlightDayBounds('2026-10-31');
		expect(new Date(bounds.start).toISOString()).toBe('2026-10-30T15:00:00.000Z');
		expect(new Date(bounds.end).toISOString()).toBe('2026-10-31T15:00:00.000Z');
		expect(getHighlightDayBounds(new Date(bounds.start + 12 * HOUR))).toEqual(bounds);
	});

	test.each(['2026-02-30', '2026-13-01', '2026-00-01', '2026-10-32', '2026-1-1', 'invalid'])('rejects invalid local date %s', value => {
		expect(() => getHighlightDayBounds(value)).toThrow(RangeError);
	});

	test('spring DST has 23 bins and skips the nonexistent local hour', () => {
		vi.stubEnv('TZ', 'America/New_York');
		const bounds = getHighlightDayBounds('2026-03-08');
		expect(new Date(bounds.start).getTimezoneOffset()).toBe(300);
		expect(bounds.end - bounds.start).toBe(23 * HOUR);
		const bins = buildHighlightBins([], bounds);
		expect(bins).toHaveLength(23);
		expect(bins.map(bin => new Date(bin.start).getHours())).not.toContain(2);
		expect(bins[22].end).toBe(bounds.end);
	});

	test('autumn DST keeps both occurrences of the repeated hour and assigns notes to each', () => {
		vi.stubEnv('TZ', 'America/New_York');
		const bounds = getHighlightDayBounds('2026-11-01');
		expect(bounds.end - bounds.start).toBe(25 * HOUR);
		const bins = buildHighlightBins([
			note('first-hour', 0, { createdAt: '2026-11-01T05:30:00.000Z' }),
			note('second-hour', 0, { createdAt: '2026-11-01T06:30:00.000Z' }),
		], bounds);
		expect(bins).toHaveLength(25);
		const repeated = bins.filter(bin => new Date(bin.start).getHours() === 1);
		expect(repeated.map(bin => bin.notes[0].id)).toEqual(['first-hour', 'second-hour']);
		expect(repeated[1].start - repeated[0].start).toBe(HOUR);
	});

	test('half-hour DST leaves no gap or overlap between bins', () => {
		vi.stubEnv('TZ', 'Australia/Lord_Howe');
		const bounds = getHighlightDayBounds('2026-04-05');
		expect(bounds.end - bounds.start).toBe(24.5 * HOUR);
		const bins = buildHighlightBins([], bounds);
		expect(bins.reduce((duration, bin) => duration + bin.end - bin.start, 0)).toBe(bounds.end - bounds.start);
		expect(bins.every((bin, index) => bin.end > bin.start && (index === 0 || bins[index - 1].end === bin.start))).toBe(true);
	});

	test('counts unique in-day notes and normalizes the hourly peak', () => {
		vi.stubEnv('TZ', 'UTC');
		const notes = [note('a', 12.1), note('a', 12.1), note('b', 12.5), note('c', 4), note('outside', 24)];
		const bins = buildHighlightBins(notes, day);
		expect(bins[12]).toMatchObject({ count: 2, density: 1 });
		expect(bins[4]).toMatchObject({ count: 1, density: .5 });
		expect(bins[0]).toMatchObject({ count: 0, density: 0 });
		expect(clipHighlightNotes(notes, day).map(item => item.id)).toEqual(['b', 'a', 'c']);
	});
});

describe('highlight overview visibility', () => {
	test.each(['note', 'reply', 'renote'] as const)('removes a hard-mute match in the %s before counts or author previews', location => {
		const blocked = note('blocked', 12, { text: '伏せたい言葉' });
		const candidate = location === 'note' ? blocked : note('outer', 13, { [location]: blocked });
		expect(filterHighlightNotes([candidate, note('safe')], { hardMutedWords: [['伏せたい']] }).map(item => item.id)).toEqual(['safe']);
	});

	test('keeps the native own-note word-mute exception but still checks other authors in a renote', () => {
		const own = note('own', 12, { text: '伏せたい', userId: 'me' });
		const me = { ...own.user, id: 'me' };
		expect(filterHighlightNotes([own], { me, hardMutedWords: [['伏せたい']] })).toEqual([own]);
		const renote = note('renote', 13, { text: null, userId: 'me', renote: note('original', 12, { text: '伏せたい' }) });
		expect(filterHighlightNotes([renote], { me, hardMutedWords: [['伏せたい']] })).toEqual([]);
	});

	test('hides bot notes and pure renotes of bots while honoring the native allowlist', () => {
		const bot = note('bot-note', 12, { user: { ...note('safe').user, id: 'bot', isBot: true }, userId: 'bot' });
		const renote = note('renote', 13, { text: null, renoteId: bot.id, renote: bot });
		const human = note('human');
		expect(filterHighlightNotes([bot, renote, human], { hideBots: true })).toEqual([human]);
		expect(filterHighlightNotes([bot, renote], { hideBots: true, botAllowlist: ['bot'] })).toEqual([bot, renote]);
		expect(filterHighlightNotes([bot], { hideBots: false })).toEqual([bot]);
	});

	test('preserves soft muted, CW and sensitive notes for the native note reveal controls', () => {
		const soft = note('soft', 12, { text: '伏せたい本文' });
		const cw = note('cw', 12, { cw: '' });
		const sensitive = note('sensitive', 12, { files: [{ isSensitive: true } as entities.DriveFile] });
		expect(filterHighlightNotes([soft, cw, sensitive], {})).toEqual([soft, cw, sensitive]);
		expect(filterHighlightNotes([note('hidden', 12, { isHidden: true })], {})).toEqual([]);
	});

	test('checks nested quoted replies and tolerates a cyclic packed note graph', () => {
		const root = note('root');
		const nested = note('nested', 12, { reply: root, cw: '隠す' });
		root.renote = note('quote', 12, { reply: nested });
		expect(filterHighlightNotes([root], { hardMutedWords: [['隠す']] })).toEqual([]);
	});
});
