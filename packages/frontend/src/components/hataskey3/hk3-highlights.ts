/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { entities } from 'cherrypick-js';
import type { HighlightSource } from '@/utility/timeline-highlights.js';

export type Hk3HighlightContextPage = {
	limit: number;
	untilDate?: number;
	untilId?: string;
	sinceId?: string;
};

export type Hk3HighlightContextOptions = {
	fetchPage: (params: Hk3HighlightContextPage, signal?: AbortSignal) => Promise<entities.Note[]>;
	isCurrent: () => boolean;
	accept: (note: entities.Note) => boolean;
	signal?: AbortSignal;
};

export type Hk3HighlightContext = {
	notes: entities.Note[];
	hasOlder: boolean;
	hasNewer: boolean;
};

/** These are UI S tab IDs, not API source names. External tabs must never fall back to home. */
export function resolveHk3HighlightSource(tab: string): HighlightSource | null {
	switch (tab) {
		case 'following': return 'home';
		case 'local': return 'local';
		case 'social': return 'social';
		case 'mixed': return 'global';
		default: return null;
	}
}

/** Build privately; callers may commit the result only while their generation is current. */
export async function prepareHk3HighlightContext(target: entities.Note, options: Hk3HighlightContextOptions): Promise<Hk3HighlightContext | null> {
	const current = (): boolean => {
		options.signal?.throwIfAborted();
		return options.isCurrent();
	};
	const fetchCurrent = async (params: Hk3HighlightContextPage): Promise<entities.Note[] | null> => {
		if (!current()) return null;
		try {
			const notes = await options.fetchPage(params, options.signal);
			return current() ? notes : null;
		} catch (error) {
			if (!current()) return null;
			throw error;
		}
	};

	if (!current()) return null;
	const targetTime = Date.parse(target.createdAt);
	if (!target.id || !Number.isFinite(targetTime)) return null;
	let cursor: string | undefined;
	let fresh: entities.Note | undefined;

	// A filtered API page can be short while older matching notes still exist.
	for (let pageIndex = 0; pageIndex < 8; pageIndex++) {
		const params: Hk3HighlightContextPage = cursor == null
			? { limit: 100, untilDate: targetTime + 1000 }
			: { limit: 100, untilId: cursor };
		const page = await fetchCurrent(params);
		if (!current() || page == null || page.length === 0) return null;
		fresh = page.find(note => note.id === target.id);
		if (fresh) break;
		const oldestId = page.reduce((oldest, note) => note.id < oldest ? note.id : oldest, page[0].id);
		if (oldestId <= target.id || (cursor != null && oldestId >= cursor)) return null;
		cursor = oldestId;
	}
	if (!fresh || !current() || !options.accept(fresh)) return null;

	const older = await fetchCurrent({ limit: 20, untilId: fresh.id });
	if (!current() || older == null) return null;
	const newer = await fetchCurrent({ limit: 20, sinceId: fresh.id });
	if (!current() || newer == null) return null;

	const unique = new Map<string, entities.Note>();
	for (const note of [...older, ...newer]) {
		if (note.id !== fresh.id && options.accept(note)) unique.set(note.id, note);
	}
	if (!current() || !options.accept(fresh)) return null;
	// The verified outer note wins over overlapping neighbor responses and keeps its renote time.
	unique.set(fresh.id, fresh);
	return {
		notes: [...unique.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id)),
		hasOlder: older.length > 0,
		hasNewer: newer.length > 0,
	};
}
