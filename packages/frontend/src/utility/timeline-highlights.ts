/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { entities } from 'cherrypick-js';
import { checkWordMute } from '@/utility/check-word-mute.js';

export type HighlightSource = 'home' | 'local' | 'social' | 'global';
export type HighlightDayBounds = { start: number; end: number };
export type HighlightFilters = { withRenotes: boolean; onlyFiles: boolean; withReplies?: boolean };
export type HighlightEndpoint = 'notes/timeline' | 'notes/local-timeline' | 'notes/hybrid-timeline' | 'notes/global-timeline';
export type HighlightRequest = {
	limit: number;
	withRenotes: boolean;
	withFiles: boolean;
	withReplies?: boolean;
	untilDate?: number;
	untilId?: string;
};
export type HighlightFetchPage = (endpoint: HighlightEndpoint, params: HighlightRequest, signal?: AbortSignal) => Promise<entities.Note[]>;
export type HighlightSnapshot = {
	notes: entities.Note[];
	complete: boolean;
	pagesLoaded: number;
	cursor: string | null;
	stopReason: null | 'empty' | 'before-day' | 'cursor-stalled';
};
export type HighlightBin = HighlightDayBounds & { count: number; notes: entities.Note[]; density: number };
export type HighlightVisibility = {
	me?: entities.UserLite | null;
	hardMutedWords?: Array<string | string[]>;
	hideBots?: boolean;
	botAllowlist?: readonly string[];
	isMutedUser?: (userId: string) => boolean;
};

const HOUR = 60 * 60 * 1000;
const ENDPOINTS: Record<HighlightSource, HighlightEndpoint> = {
	home: 'notes/timeline',
	local: 'notes/local-timeline',
	social: 'notes/hybrid-timeline',
	global: 'notes/global-timeline',
};

function assertDay(day: HighlightDayBounds): void {
	if (!Number.isFinite(day.start) || !Number.isFinite(day.end) || day.end <= day.start) {
		throw new RangeError('Invalid highlight day bounds');
	}
}

/** Calendar dates use local midnight, including 23-hour and 25-hour DST days. */
export function getHighlightDayBounds(value: Date | string): HighlightDayBounds {
	let start: Date;
	if (typeof value === 'string') {
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
		if (!match) throw new RangeError('Expected a local YYYY-MM-DD date');
		const [, year, month, day] = match.map(Number);
		start = new Date(0);
		start.setFullYear(year, month - 1, day);
		start.setHours(0, 0, 0, 0);
		if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) {
			throw new RangeError('Invalid highlight date');
		}
	} else {
		start = new Date(value.getTime());
		start.setHours(0, 0, 0, 0);
	}
	const end = new Date(start.getTime());
	end.setDate(end.getDate() + 1);
	const bounds = { start: start.getTime(), end: end.getTime() };
	assertDay(bounds);
	return bounds;
}

function newestFirst(a: entities.Note, b: entities.Note): number {
	return Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id);
}

/** Keep the outer note: a renote belongs to the time and ID at which it was renoted. */
export function clipHighlightNotes(notes: readonly entities.Note[], day: HighlightDayBounds): entities.Note[] {
	assertDay(day);
	const unique = new Map<string, entities.Note>();
	for (const note of notes) {
		const time = Date.parse(note.createdAt);
		if (time >= day.start && time < day.end) unique.set(note.id, note);
	}
	return [...unique.values()].sort(newestFirst);
}

/** Each bin is at most one elapsed hour; repeated local hours remain distinct. */
export function buildHighlightBins(notes: readonly entities.Note[], day: HighlightDayBounds): HighlightBin[] {
	assertDay(day);
	const bins: HighlightBin[] = [];
	for (let start = day.start; start < day.end;) {
		const nextLocalHour = new Date(start);
		nextLocalHour.setHours(nextLocalHour.getHours() + 1, 0, 0, 0);
		const end = Math.min(day.end, start + HOUR, nextLocalHour.getTime());
		bins.push({ start, end, count: 0, notes: [], density: 0 });
		start = end;
	}
	for (const note of clipHighlightNotes(notes, day)) {
		const time = Date.parse(note.createdAt);
		const bin = bins.find(item => time >= item.start && time < item.end);
		if (bin) bin.notes.push(note);
	}
	const peak = Math.max(1, ...bins.map(bin => bin.notes.length / ((bin.end - bin.start) / HOUR)));
	for (const bin of bins) {
		bin.count = bin.notes.length;
		bin.density = (bin.count / ((bin.end - bin.start) / HOUR)) / peak;
	}
	return bins;
}

function noteTree(note: entities.Note): entities.Note[] {
	const visited = new Set<entities.Note>();
	const pending = [note];
	while (pending.length > 0) {
		const target = pending.pop()!;
		if (visited.has(target)) continue;
		visited.add(target);
		if (target.reply) pending.push(target.reply);
		if (target.renote) pending.push(target.renote);
	}
	return [...visited];
}

/** Match the native note's displayed author without replacing the outer timeline ID. */
function displayedNote(note: entities.Note): entities.Note {
	const pureRenote = note.renoteId != null && note.replyId == null && note.text == null && note.cw == null &&
		(note.fileIds?.length ?? 0) === 0 && note.poll == null && note.event == null;
	return pureRenote && note.renote ? note.renote : note;
}

export function filterHighlightNotes(notes: readonly entities.Note[], options: HighlightVisibility): entities.Note[] {
	return notes.filter(note => {
		if (note.isHidden) return false;
		if (noteTree(note).some(target => options.isMutedUser?.(target.userId) || checkWordMute(target, options.me, options.hardMutedWords ?? []))) return false;
		const author = displayedNote(note).user;
		return !options.hideBots || !author.isBot || (options.botAllowlist ?? []).includes(author.id);
	});
}

/** A short API page can be filtered by the server; only an empty page or day boundary completes a day. */
export function createTimelineHighlightsLoader(options: {
	source: HighlightSource;
	day: HighlightDayBounds;
	filters: HighlightFilters;
	fetchPage: HighlightFetchPage;
}): {
	load: (options?: { maxPages?: number; signal?: AbortSignal }) => Promise<HighlightSnapshot>;
	snapshot: () => HighlightSnapshot;
} {
	assertDay(options.day);
	const day = { ...options.day };
	const source = options.source;
	const filters = { ...options.filters };
	const notes = new Map<string, entities.Note>();
	const seenRawIds = new Set<string>();
	const cursors = new Set<string>();
	let cursor: string | null = null;
	let pagesLoaded = 0;
	let complete = false;
	let loading = false;
	let stopReason: HighlightSnapshot['stopReason'] = null;

	function snapshot(): HighlightSnapshot {
		return { notes: [...notes.values()].sort(newestFirst), complete, pagesLoaded, cursor, stopReason };
	}

	async function load({ maxPages = 5, signal }: { maxPages?: number; signal?: AbortSignal } = {}): Promise<HighlightSnapshot> {
		signal?.throwIfAborted();
		if (!Number.isInteger(maxPages) || maxPages < 1) throw new RangeError('maxPages must be a positive integer');
		if (loading) throw new Error('Highlight loading is already in progress');
		if (complete || stopReason === 'cursor-stalled') return snapshot();
		loading = true;
		try {
			for (let page = 0; page < maxPages; page++) {
				signal?.throwIfAborted();
				const params: HighlightRequest = {
					limit: 100,
					withRenotes: filters.withRenotes,
					withFiles: filters.onlyFiles,
					...(source === 'local' || source === 'social' ? { withReplies: !filters.onlyFiles && (filters.withReplies ?? false) } : {}),
					...(cursor ? { untilId: cursor } : { untilDate: day.end }),
				};
				const raw = await options.fetchPage(ENDPOINTS[source], params, signal);
				// A transport may resolve after cancellation; never commit that stale response.
				signal?.throwIfAborted();
				const times = raw.map(note => Date.parse(note.createdAt));
				if (times.some(time => !Number.isFinite(time))) throw new Error('Invalid highlight note timestamp');
				pagesLoaded++;
				if (raw.length === 0) {
					complete = true;
					stopReason = 'empty';
					break;
				}
				const nextCursor = raw[raw.length - 1].id;
				const stalled = cursors.has(nextCursor) || raw.every(note => seenRawIds.has(note.id));
				for (const note of raw) seenRawIds.add(note.id);
				for (const note of clipHighlightNotes(raw, day)) notes.set(note.id, note);
				cursor = nextCursor;
				cursors.add(nextCursor);
				if (times.some(time => time < day.start)) {
					complete = true;
					stopReason = 'before-day';
					break;
				}
				if (stalled) {
					stopReason = 'cursor-stalled';
					break;
				}
			}
			return snapshot();
		} finally {
			loading = false;
		}
	}

	return { load, snapshot };
}
