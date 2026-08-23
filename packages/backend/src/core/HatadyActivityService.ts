/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { In, type SelectQueryBuilder } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { HatadyLogsRepository, HatadyMediaSessionsRepository, HatadyMediaWorksRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { MiHatadyLog } from '@/models/HatadyLog.js';
import type { MiHatadyMediaSession } from '@/models/HatadyMediaSession.js';
import type { MiHatadyMediaWork } from '@/models/HatadyMediaWork.js';
import { bindThis } from '@/decorators.js';
import { HatadyService } from '@/core/HatadyService.js';
import { HatadyMediaService } from '@/core/HatadyMediaService.js';
import { HatadyEntityService } from '@/core/entities/HatadyEntityService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';

export const HATADY_ACTIVITY_SCOPES = ['mine', 'recent', 'popular', 'following'] as const;
export type HatadyActivityScope = typeof HATADY_ACTIVITY_SCOPES[number];
export const HATADY_ACTIVITY_KINDS = ['study', 'movie', 'game'] as const;
export type HatadyActivityKind = typeof HATADY_ACTIVITY_KINDS[number];

export type HatadyActivityOptions = {
	scope: HatadyActivityScope;
	kinds?: HatadyActivityKind[];
	sinceDate?: number | null;
	untilDate?: number | null;
	cursor?: string | null;
	limit: number;
};

type ActivitySource = 0 | 1;

type ActivityCursorPayload = {
	v: 1;
	f: string;
	t: number;
	s: ActivitySource;
	id: string;
	p?: number;
};

type StudyCandidate = {
	source: 1;
	id: string;
	occurredAt: Date;
	score: number;
	log: MiHatadyLog;
};

type MediaCandidate = {
	source: 0;
	id: string;
	occurredAt: Date;
	score: number;
	session: MiHatadyMediaSession;
	work: MiHatadyMediaWork;
};

export type HatadyActivityCandidate = StudyCandidate | MediaCandidate;

export const HATADY_ACTIVITY_INVALID_CURSOR = 'HATADY_ACTIVITY_INVALID_CURSOR';
export const HATADY_ACTIVITY_INVALID_FILTER = 'HATADY_ACTIVITY_INVALID_FILTER';

function normalizeKinds(kinds: HatadyActivityKind[] | undefined): HatadyActivityKind[] {
	if (kinds == null || kinds.length === 0) return [...HATADY_ACTIVITY_KINDS];
	const requested = new Set(kinds);
	if ([...requested].some(kind => !HATADY_ACTIVITY_KINDS.includes(kind))) throw new Error(HATADY_ACTIVITY_INVALID_FILTER);
	return HATADY_ACTIVITY_KINDS.filter(kind => requested.has(kind));
}

function normalizeTimestamp(value: number | null | undefined): number | null {
	if (value == null) return null;
	if (!Number.isSafeInteger(value) || value < 0 || value > 8_640_000_000_000_000) throw new Error(HATADY_ACTIVITY_INVALID_FILTER);
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) throw new Error(HATADY_ACTIVITY_INVALID_FILTER);
	return value;
}

export function createHatadyActivityFilterFingerprint(options: Pick<HatadyActivityOptions, 'scope' | 'kinds' | 'sinceDate' | 'untilDate'>): string {
	const normalized = {
		scope: options.scope,
		kinds: normalizeKinds(options.kinds),
		sinceDate: normalizeTimestamp(options.sinceDate),
		untilDate: normalizeTimestamp(options.untilDate),
	};
	return createHash('sha256').update(JSON.stringify(normalized)).digest('base64url').slice(0, 24);
}

export function encodeHatadyActivityCursor(candidate: Pick<HatadyActivityCandidate, 'source' | 'id' | 'occurredAt' | 'score'>, fingerprint: string, scope: HatadyActivityScope): string {
	const payload: ActivityCursorPayload = {
		v: 1,
		f: fingerprint,
		t: candidate.occurredAt.getTime(),
		s: candidate.source,
		id: candidate.id,
		...(scope === 'popular' ? { p: candidate.score } : {}),
	};
	return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeHatadyActivityCursor(cursor: string, fingerprint: string, scope: HatadyActivityScope): ActivityCursorPayload {
	try {
		if (cursor.length === 0 || cursor.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
		const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<ActivityCursorPayload>;
		if (payload.v !== 1 || payload.f !== fingerprint) throw new Error();
		if (typeof payload.t !== 'number' || !Number.isSafeInteger(payload.t) || payload.t < 0 || payload.t > 8_640_000_000_000_000 || (payload.s !== 0 && payload.s !== 1)) throw new Error();
		if (typeof payload.id !== 'string' || payload.id.length === 0 || payload.id.length > 128) throw new Error();
		if (scope === 'popular' && (!Number.isSafeInteger(payload.p) || payload.p! < 0 || payload.s !== 1)) throw new Error();
		if (scope !== 'popular' && payload.p !== undefined) throw new Error();
		return payload as ActivityCursorPayload;
	} catch {
		throw new Error(HATADY_ACTIVITY_INVALID_CURSOR);
	}
}

export function compareHatadyActivities(a: HatadyActivityCandidate, b: HatadyActivityCandidate, scope: HatadyActivityScope): number {
	if (scope === 'popular' && a.score !== b.score) return b.score - a.score;
	const time = b.occurredAt.getTime() - a.occurredAt.getTime();
	if (time !== 0) return time;
	if (a.source !== b.source) return b.source - a.source;
	return a.id === b.id ? 0 : (a.id < b.id ? 1 : -1);
}

function addTimelineCursorCondition<T extends MiHatadyLog | MiHatadyMediaSession>(qb: SelectQueryBuilder<T>, alias: 'log' | 'session', timeColumn: 'studiedAt' | 'occurredAt', source: ActivitySource, cursor: ActivityCursorPayload): void {
	const timePath = `${alias}.${timeColumn}`;
	if (source < cursor.s) {
		qb.andWhere(`${timePath} <= :activityCursorTime`, { activityCursorTime: new Date(cursor.t) });
	} else if (source > cursor.s) {
		qb.andWhere(`${timePath} < :activityCursorTime`, { activityCursorTime: new Date(cursor.t) });
	} else {
		qb.andWhere(`(${timePath} < :activityCursorTime OR (${timePath} = :activityCursorTime AND ${alias}.id < :activityCursorId))`, {
			activityCursorTime: new Date(cursor.t),
			activityCursorId: cursor.id,
		});
	}
}

@Injectable()
export class HatadyActivityService {
	constructor(
		@Inject(DI.hatadyLogsRepository)
		private hatadyLogsRepository: HatadyLogsRepository,
		@Inject(DI.hatadyMediaSessionsRepository)
		private hatadyMediaSessionsRepository: HatadyMediaSessionsRepository,
		@Inject(DI.hatadyMediaWorksRepository)
		private hatadyMediaWorksRepository: HatadyMediaWorksRepository,
		private hatadyService: HatadyService,
		private hatadyMediaService: HatadyMediaService,
		private hatadyEntityService: HatadyEntityService,
		private userEntityService: UserEntityService,
	) {}

	@bindThis
	public async list(viewer: MiUser, options: HatadyActivityOptions): Promise<{ items: Record<string, unknown>[]; nextCursor: string | null; hasMore: boolean }> {
		if (!HATADY_ACTIVITY_SCOPES.includes(options.scope)) throw new Error(HATADY_ACTIVITY_INVALID_FILTER);
		const requestedKinds = normalizeKinds(options.kinds);
		// 人気順は学習ログの非正規化リアクション数だけを正本にしている。
		// 作品リアクションをセッションへ重複適用しないため、APIでも曖昧なmedia-only指定を拒否する。
		if (options.scope === 'popular' && options.kinds != null && requestedKinds.some(kind => kind !== 'study')) throw new Error(HATADY_ACTIVITY_INVALID_FILTER);
		const kinds: HatadyActivityKind[] = options.scope === 'popular' ? ['study'] : requestedKinds;
		const sinceDate = normalizeTimestamp(options.sinceDate);
		const untilDate = normalizeTimestamp(options.untilDate);
		if (sinceDate != null && untilDate != null && sinceDate > untilDate) throw new Error(HATADY_ACTIVITY_INVALID_FILTER);
		const limit = Math.min(100, Math.max(1, Math.trunc(options.limit)));
		const fingerprint = createHatadyActivityFilterFingerprint({ scope: options.scope, kinds, sinceDate, untilDate });
		const cursor = options.cursor ? decodeHatadyActivityCursor(options.cursor, fingerprint, options.scope) : null;

		const candidates: HatadyActivityCandidate[] = [];
		if (kinds.includes('study')) candidates.push(...await this.loadStudyCandidates(viewer.id, options.scope, sinceDate, untilDate, cursor, limit + 1));
		if (options.scope !== 'popular' && (kinds.includes('movie') || kinds.includes('game'))) {
			candidates.push(...await this.loadMediaCandidates(viewer.id, options.scope, kinds, sinceDate, untilDate, cursor, limit + 1));
		}

		candidates.sort((a, b) => compareHatadyActivities(a, b, options.scope));
		const hasMore = candidates.length > limit;
		const page = candidates.slice(0, limit);
		const items = await this.packActivities(page, viewer);
		const last = page.at(-1);
		return {
			items,
			nextCursor: hasMore && last ? encodeHatadyActivityCursor(last, fingerprint, options.scope) : null,
			hasMore,
		};
	}

	private async loadStudyCandidates(viewerId: string, scope: HatadyActivityScope, sinceDate: number | null, untilDate: number | null, cursor: ActivityCursorPayload | null, take: number): Promise<StudyCandidate[]> {
		const qb = this.hatadyLogsRepository.createQueryBuilder('log');
		const excludedUserIds = scope === 'mine' ? [] : [...await this.hatadyService.getTimelineExcludedUserIds(viewerId)];
		if (scope === 'mine') {
			qb.where('log.userId = :viewerId', { viewerId });
		} else if (scope === 'following') {
			qb.where(`EXISTS (
				SELECT 1 FROM "hatady_following" "activity_follow"
				WHERE "activity_follow"."followerId" = :viewerId
				AND "activity_follow"."followeeId" = log."userId"
			)`, { viewerId });
			qb.andWhere("log.visibility IN ('public', 'followers')");
		} else {
			qb.where("log.visibility = 'public'").andWhere('log.isPublic = TRUE');
		}
		if (excludedUserIds.length > 0) qb.andWhere('log.userId NOT IN (:...activityExcludedUserIds)', { activityExcludedUserIds: excludedUserIds });
		if (sinceDate != null) qb.andWhere('log.studiedAt >= :activitySince', { activitySince: new Date(sinceDate) });
		if (untilDate != null) qb.andWhere('log.studiedAt <= :activityUntil', { activityUntil: new Date(untilDate) });
		if (cursor != null) {
			if (scope === 'popular') {
				qb.andWhere(`(log.reactionsCount < :activityCursorScore OR (
					log.reactionsCount = :activityCursorScore AND (
						log.studiedAt < :activityCursorTime OR
						(log.studiedAt = :activityCursorTime AND log.id < :activityCursorId)
					)
				))`, { activityCursorScore: cursor.p, activityCursorTime: new Date(cursor.t), activityCursorId: cursor.id });
			} else {
				addTimelineCursorCondition(qb, 'log', 'studiedAt', 1, cursor);
			}
		}
		if (scope === 'popular') qb.andWhere('log.reactionsCount > 0');
		if (scope === 'popular') qb.orderBy('log.reactionsCount', 'DESC').addOrderBy('log.studiedAt', 'DESC').addOrderBy('log.id', 'DESC');
		else qb.orderBy('log.studiedAt', 'DESC').addOrderBy('log.id', 'DESC');
		const rows = await qb.take(take).getMany();
		const allowed = await Promise.all(rows.map(async log => (
			await this.hatadyService.canAppearInTimeline(log.userId, viewerId)
			&& await this.hatadyService.canViewLog(log, viewerId)
		)));
		return rows.filter((_, index) => allowed[index]).map(log => ({ source: 1, id: log.id, occurredAt: log.studiedAt, score: log.reactionsCount, log }));
	}

	private async loadMediaCandidates(viewerId: string, scope: Exclude<HatadyActivityScope, 'popular'>, kinds: HatadyActivityKind[], sinceDate: number | null, untilDate: number | null, cursor: ActivityCursorPayload | null, take: number): Promise<MediaCandidate[]> {
		const qb = this.hatadyMediaSessionsRepository.createQueryBuilder('session')
			.innerJoin('hatady_media_work', 'activity_work', 'activity_work.id = session.workId');
		const excludedUserIds = scope === 'mine' ? [] : [...await this.hatadyService.getTimelineExcludedUserIds(viewerId)];
		if (scope === 'mine') {
			qb.where('session.userId = :viewerId', { viewerId });
		} else if (scope === 'following') {
			qb.where(`EXISTS (
				SELECT 1 FROM "hatady_following" "activity_follow"
				WHERE "activity_follow"."followerId" = :viewerId
				AND "activity_follow"."followeeId" = session."userId"
			)`, { viewerId });
			qb.andWhere("session.visibility IN ('public', 'followers')");
			qb.andWhere("activity_work.visibility IN ('public', 'followers')");
		} else {
			qb.where("session.visibility = 'public'");
			qb.andWhere("activity_work.visibility = 'public'");
		}
		if (excludedUserIds.length > 0) qb.andWhere('session.userId NOT IN (:...activityExcludedUserIds)', { activityExcludedUserIds: excludedUserIds });
		const workKinds = kinds.filter((kind): kind is 'movie' | 'game' => kind === 'movie' || kind === 'game');
		qb.andWhere('activity_work.kind IN (:...activityWorkKinds)', { activityWorkKinds: workKinds });
		if (sinceDate != null) qb.andWhere('session.occurredAt >= :activitySince', { activitySince: new Date(sinceDate) });
		if (untilDate != null) qb.andWhere('session.occurredAt <= :activityUntil', { activityUntil: new Date(untilDate) });
		if (cursor != null) addTimelineCursorCondition(qb, 'session', 'occurredAt', 0, cursor);
		const sessions = await qb.orderBy('session.occurredAt', 'DESC').addOrderBy('session.id', 'DESC').take(take).getMany();
		if (sessions.length === 0) return [];
		const works = await this.hatadyMediaWorksRepository.findBy({ id: In([...new Set(sessions.map(session => session.workId))]) });
		const worksMap = new Map(works.map(work => [work.id, work]));
		const allowed = await Promise.all(sessions.map(async session => {
			const work = worksMap.get(session.workId);
			return work != null
				&& await this.hatadyService.canAppearInTimeline(session.userId, viewerId)
				&& await this.hatadyMediaService.canViewSession(session, work, viewerId);
		}));
		return sessions.flatMap((session, index) => {
			const work = worksMap.get(session.workId);
			if (!allowed[index] || work == null) return [];
			return [{ source: 0, id: session.id, occurredAt: session.occurredAt, score: 0, session, work } satisfies MediaCandidate];
		});
	}

	private async packActivities(candidates: HatadyActivityCandidate[], viewer: MiUser): Promise<Record<string, unknown>[]> {
		const studyCandidates = candidates.filter((candidate): candidate is StudyCandidate => candidate.source === 1);
		const mediaCandidates = candidates.filter((candidate): candidate is MediaCandidate => candidate.source === 0);
		const packedLogs = await this.hatadyEntityService.packLogs(studyCandidates.map(candidate => candidate.log), viewer);
		const packedLogsMap = new Map(packedLogs.map(log => [log.id as string, log]));
		const mediaUsers = mediaCandidates.length > 0
			? await this.userEntityService.packMany([...new Set(mediaCandidates.map(candidate => candidate.session.userId))], viewer, { schema: 'UserLite' })
			: [];
		const mediaUsersMap = new Map(mediaUsers.map(user => [user.id, user]));

		return candidates.map(candidate => {
			if (candidate.source === 1) {
				const study = packedLogsMap.get(candidate.id) ?? null;
				return {
					id: candidate.id,
					type: 'study',
					occurredAt: candidate.occurredAt.toISOString(),
					visibility: candidate.log.visibility,
					user: study?.user ?? null,
					isMine: candidate.log.userId === viewer.id,
					study,
					media: null,
				};
			}
			const packedWork = this.hatadyMediaService.packWork(candidate.work);
			const packedSession = this.hatadyMediaService.packSession(candidate.session);
			const isMine = candidate.session.userId === viewer.id;
			return {
				id: candidate.id,
				type: candidate.session.kind,
				occurredAt: candidate.occurredAt.toISOString(),
				visibility: candidate.session.visibility,
				user: mediaUsersMap.get(candidate.session.userId) ?? null,
				isMine,
				study: null,
				media: {
					work: {
						...packedWork,
						synopsis: !isMine && candidate.work.synopsisSpoiler ? null : packedWork.synopsis,
						review: !isMine && candidate.work.reviewSpoiler ? null : packedWork.review,
						highlights: !isMine && candidate.work.highlightsSpoiler ? [] : packedWork.highlights,
					},
					session: {
						...packedSession,
						note: !isMine && candidate.session.noteSpoiler ? null : packedSession.note,
						details: !isMine && candidate.session.noteSpoiler ? {} : packedSession.details,
					},
				},
			};
		});
	}
}
