/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 * Hatady の映画・ゲーム作品記録で共有する型と表示用ヘルパー。
 * API の値は保存値のまま扱い、表示文言だけ共通 locale の _hata._hatady._media から解決する。
 */

import { i18n } from '@/i18n.js';
import type * as Misskey from 'cherrypick-js';

export type HatadyMediaKind = 'movie' | 'game';
export type HatadyMediaStatus =
	| 'planned'
	| 'in_progress'
	| 'completed'
	| 'mastered'
	| 'on_hold'
	| 'dropped';
export type HatadyMediaSessionKind = 'movie_viewing' | 'game_play' | 'game_match' | 'game_roguelike';
export type HatadyMediaVisibility = 'private' | 'followers' | 'public';
export type HatadyMediaSort = 'updatedAt' | 'title' | 'releaseDate' | 'recommendationRating' | 'status';
export type HatadyMovieOrigin = 'domestic' | 'foreign' | 'co_production' | 'other';
export type HatadyMovieViewingMode = 'original' | 'subtitled' | 'dubbed';

export interface HatadyMediaWork {
	id: string;
	createdAt: string;
	updatedAt: string;
	userId: string;
	user?: Misskey.entities.UserLite | null;
	kind: HatadyMediaKind;
	title: string;
	originalTitle?: string | null;
	status: HatadyMediaStatus;
	visibility: HatadyMediaVisibility;
	creator?: string | null;
	coverColorIndex?: number | null;
	isFavorite?: boolean;
	isRecommended?: boolean;
	recommendationRating?: number | null;
	releaseDate?: string | null;
	releaseYear?: number | null;
	officialUrl?: string | null;
	synopsis?: string | null;
	synopsisSpoiler?: boolean;
	review?: string | null;
	reviewSpoiler?: boolean;
	// 映画固有
	genres?: string[] | null;
	primaryLanguage?: string | null;
	runtimeMinutes?: number | null;
	origin?: HatadyMovieOrigin | null;
	viewingMode?: HatadyMovieViewingMode | null;
	highlights?: string[] | null;
	highlightsSpoiler?: boolean;
	// ゲーム固有
	platforms?: string[] | null;
	developer?: string | null;
	publisher?: string | null;
	reactions?: Array<{ reaction: string; count: number }>;
	myReaction?: string | null;
	commentsCount?: number;
	[key: string]: unknown;
}

export interface HatadyMediaSession {
	id: string;
	workId: string;
	createdAt: string;
	updatedAt: string;
	kind: HatadyMediaSessionKind;
	occurredAt: string;
	durationMinutes?: number | null;
	note?: string | null;
	noteSpoiler?: boolean;
	visibility: HatadyMediaVisibility;
	details?: Record<string, unknown> | null;
	[key: string]: unknown;
}

export type HatadyActivityType = 'study' | HatadyMediaSessionKind;

export interface HatadyActivity {
	id: string;
	type: HatadyActivityType;
	occurredAt: string;
	visibility: HatadyMediaVisibility;
	user?: Misskey.entities.UserLite | null;
	isMine: boolean;
	study?: Record<string, any> | null;
	media?: {
		work: HatadyMediaWork;
		session: HatadyMediaSession;
	} | null;
}

export interface HatadyActivityPage {
	items: HatadyActivity[];
	nextCursor: string | null;
	hasMore: boolean;
}

export interface HatadyMediaComment {
	id: string;
	workId: string;
	text: string;
	createdAt: string;
	replyId?: string | null;
	userId?: string;
	spoiler?: boolean;
	reactions?: Array<{ reaction: string; count: number }>;
	myReaction?: string | null;
	user?: Misskey.entities.UserLite | null;
	[key: string]: unknown;
}

type CopyTree = Record<string, any>;

export function hatadyMediaCopy(): CopyTree {
	return (i18n.ts._hata._hatady as unknown as { _media: CopyTree })._media;
}

export function mediaStatusOptions(kind: HatadyMediaKind): HatadyMediaStatus[] {
	return kind === 'movie'
		? ['planned', 'in_progress', 'completed', 'on_hold', 'dropped']
		: ['planned', 'in_progress', 'completed', 'mastered', 'on_hold', 'dropped'];
}

export function mediaSessionTypes(kind: HatadyMediaKind): HatadyMediaSessionKind[] {
	return kind === 'movie' ? ['movie_viewing'] : ['game_play', 'game_match', 'game_roguelike'];
}

export function mediaStatusCopyKey(kind: HatadyMediaKind, status: HatadyMediaStatus): string {
	if (status === 'in_progress' || status === 'completed') return `${kind}_${status}`;
	return status;
}

export function normalizeMediaSortForKind(kind: HatadyMediaKind, sort: HatadyMediaSort): HatadyMediaSort {
	return kind === 'game' && sort === 'recommendationRating' ? 'updatedAt' : sort;
}

export type HatadyMediaAdvancedFilters = {
	origin?: HatadyMovieOrigin | '';
	viewingMode?: HatadyMovieViewingMode | '';
	isRecommended?: boolean | null;
	minRecommendation?: number | null;
	sessionKind?: HatadyMediaSessionKind | '';
	result?: string;
	weapon?: string;
	rank?: string;
	route?: string;
	since?: string;
	until?: string;
};

export function mediaAdvancedFilterPayload(kind: HatadyMediaKind, filters: HatadyMediaAdvancedFilters): Record<string, unknown> {
	if (kind === 'movie') {
		return {
			...(filters.origin ? { origin: filters.origin } : {}),
			...(filters.viewingMode ? { viewingMode: filters.viewingMode } : {}),
			...(typeof filters.isRecommended === 'boolean' ? { isRecommended: filters.isRecommended } : {}),
			...(filters.minRecommendation != null ? { minRecommendation: Math.max(0, Math.min(10, Math.round(filters.minRecommendation))) } : {}),
		};
	}
	return {
		...(filters.sessionKind ? { sessionKind: filters.sessionKind } : {}),
		...(filters.result?.trim() ? { result: filters.result.trim() } : {}),
		...(filters.weapon?.trim() ? { weapon: filters.weapon.trim() } : {}),
		...(filters.rank?.trim() ? { rank: filters.rank.trim() } : {}),
		...(filters.route?.trim() ? { route: filters.route.trim() } : {}),
		...(filters.since ? { since: filters.since } : {}),
		...(filters.until ? { until: filters.until } : {}),
	};
}

/**
 * 複数値は1行1項目で編集する。項目名に含まれるカンマを区切りとして扱わないため、
 * APIから受け取った配列を編集しても内容を可逆に保てる。
 */
export function normalizeMediaList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String).map(x => x.trim()).filter(Boolean);
	if (typeof value !== 'string') return [];
	return value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
}

export function normalizeMediaWorks(value: unknown): HatadyMediaWork[] {
	const source = Array.isArray(value)
		? value
		: (value && typeof value === 'object' && Array.isArray((value as any).items) ? (value as any).items : []);
	return source.filter((item: unknown): item is HatadyMediaWork => {
		if (!item || typeof item !== 'object') return false;
		const work = item as Partial<HatadyMediaWork>;
		return typeof work.id === 'string' && (work.kind === 'movie' || work.kind === 'game') && typeof work.title === 'string';
	});
}

export function normalizeMediaSessions(value: unknown): HatadyMediaSession[] {
	const source = Array.isArray(value)
		? value
		: (value && typeof value === 'object' && Array.isArray((value as any).items) ? (value as any).items : []);
	return source.filter((item: unknown): item is HatadyMediaSession => !!item && typeof item === 'object' && typeof (item as any).id === 'string');
}

export function normalizeHatadyActivityPage(value: unknown): HatadyActivityPage {
	const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
	const rawItems = Array.isArray(source.items) ? source.items : [];
	const items = rawItems.filter((item: unknown): item is HatadyActivity => {
		if (!item || typeof item !== 'object') return false;
		const activity = item as Partial<HatadyActivity>;
		if (typeof activity.id !== 'string' || typeof activity.occurredAt !== 'string') return false;
		if (!['study', 'movie_viewing', 'game_play', 'game_match', 'game_roguelike'].includes(String(activity.type))) return false;
		return activity.type === 'study'
			? !!activity.study && typeof activity.study === 'object'
			: !!activity.media?.work && !!activity.media?.session;
	});
	return {
		items,
		nextCursor: typeof source.nextCursor === 'string' ? source.nextCursor : null,
		hasMore: source.hasMore === true,
	};
}

export function mediaDashboardSessions(sessions: readonly HatadyMediaSession[], isMine: boolean): HatadyMediaSession[] {
	return isMine ? [...sessions] : sessions.filter(session => !session.noteSpoiler);
}

export function formatMediaMinutes(minutes: number | null | undefined): string {
	const total = Math.max(0, Number(minutes ?? 0));
	if (!Number.isFinite(total)) return '';
	const hours = Math.floor(total / 60);
	const rest = total % 60;
	const copyx = i18n.tsx._hata._hatady._home;
	return hours > 0
		? copyx.durationHoursMinutes({ hours: hours.toString(), minutes: rest.toString() })
		: copyx.durationMinutes({ minutes: rest.toString() });
}

export function mediaWorkSpecificPayload(kind: HatadyMediaKind, values: {
	genres?: string[];
	origin?: HatadyMovieOrigin | null;
	viewingMode?: HatadyMovieViewingMode | null;
	primaryLanguage?: string | null;
	runtimeMinutes?: number | null;
	highlights?: string[];
	highlightsSpoiler?: boolean;
	platforms?: string[];
	developer?: string | null;
	publisher?: string | null;
}): Record<string, unknown> {
	return kind === 'movie' ? {
		genres: values.genres ?? [], origin: values.origin ?? null, viewingMode: values.viewingMode ?? null,
		primaryLanguage: values.primaryLanguage ?? null, runtimeMinutes: values.runtimeMinutes ?? null,
		highlights: values.highlights ?? [], highlightsSpoiler: values.highlightsSpoiler ?? false,
	} : {
		platforms: values.platforms ?? [], developer: values.developer ?? null, publisher: values.publisher ?? null,
	};
}

const MEDIA_SESSION_DETAIL_KEYS: Record<HatadyMediaSessionKind, readonly string[]> = {
	movie_viewing: ['theaterName', 'screeningFormat', 'companions', 'rewatch', 'viewingMode'],
	game_play: ['playMode', 'matchmaking', 'progress', 'difficulty', 'device', 'rank', 'rating', 'mood', 'achievements', 'character', 'weapon', 'weaponOrder'],
	game_match: ['result', 'reason', 'matchmaking', 'opponentType', 'opponent', 'score', 'mode', 'map', 'character', 'weapon', 'weaponOrder', 'roundResults', 'bestOf', 'kills', 'deaths', 'assists', 'rank', 'ratingBefore', 'ratingAfter', 'overtime', 'mood', 'device'],
	game_roguelike: ['result', 'seed', 'floor', 'route', 'branches', 'build', 'runNumber', 'difficulty', 'character', 'weapon', 'weaponOrder', 'mood', 'device', 'cause'],
};

export function mediaSessionDetailsPayload(workKind: HatadyMediaKind, sessionKind: HatadyMediaSessionKind, values: Record<string, unknown>): Record<string, unknown> {
	const canonicalKind: HatadyMediaSessionKind = workKind === 'movie' ? 'movie_viewing' : sessionKind;
	return Object.fromEntries(MEDIA_SESSION_DETAIL_KEYS[canonicalKind]
		.filter(key => values[key] !== undefined)
		.map(key => [key, values[key]]));
}

export type HatadyMediaSessionDisplayFact = { key: string; value: unknown };

/** APIへ保存したdetailsを、セッション種別ごとに漏れなく再表示するための正本。 */
export function mediaSessionDisplayFacts(session: Pick<HatadyMediaSession, 'kind' | 'details'>): HatadyMediaSessionDisplayFact[] {
	const details = session.details ?? {};
	const keys = MEDIA_SESSION_DETAIL_KEYS[session.kind];
	const facts: HatadyMediaSessionDisplayFact[] = [];
	for (const key of keys) {
		if (['kills', 'deaths', 'assists', 'ratingBefore', 'ratingAfter'].includes(key)) continue;
		const value = details[key];
		if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
		facts.push({ key, value });
	}
	if (session.kind === 'game_match') {
		if (details.kills != null || details.deaths != null || details.assists != null) {
			facts.push({ key: 'killsDeathsAssists', value: [details.kills ?? '—', details.deaths ?? '—', details.assists ?? '—'].join(' / ') });
		}
		if (details.ratingBefore != null || details.ratingAfter != null) {
			facts.push({ key: 'ratingBeforeAfter', value: `${details.ratingBefore ?? '—'} → ${details.ratingAfter ?? '—'}` });
		}
	}
	return facts;
}

export function mediaReactionPayload(targetType: 'work' | 'comment', targetId: string, reaction?: string): Record<string, string> {
	return reaction == null ? { targetType, targetId } : { targetType, targetId, reaction };
}

export function mediaCommentCreatePayload(workId: string, text: string, spoiler: boolean, replyId?: string | null): Record<string, unknown> {
	return { workId, text: text.trim(), spoiler, ...(replyId ? { replyId } : {}) };
}

export function hatadyViewingEventPayload(titleTemplate: string, workTitle: string, date: string, timeStart: string): Record<string, unknown> {
	return {
		title: titleTemplate.replace('{title}', workTitle),
		emoji: '🎬',
		date,
		dateEnd: '',
		timeStart,
		timeEnd: '',
		allDay: false,
		color: '#d9824a',
		rsvp: true,
	};
}
