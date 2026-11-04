/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource, In, Not } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { MiAutoRenoteSchedule, MiAutoRenoteUsage, MiAutoRenoteAttempt } from '@/models/AutoRenote.js';
import { MiUser } from '@/models/User.js';
import { MiNote } from '@/models/Note.js';
import { MiBlocking } from '@/models/Blocking.js';
import { MiChannel } from '@/models/Channel.js';
import { AUTO_RENOTE_INACTIVITY_MS, autoRenoteMonth, nextAutoRenoteAt, validateAutoRenoteTiming } from '@/misc/auto-renote.js';
import type { AutoRenoteStatus, AutoRenoteTiming } from '@/misc/auto-renote.js';
import { sqlLikeEscape } from '@/misc/sql-like-escape.js';
import { isRenote, isQuote } from '@/misc/is-renote.js';
import { RateLimiterService } from '@/server/api/RateLimiterService.js';
import { ApiError } from '@/server/api/error.js';
import { LoggerService } from './LoggerService.js';
import { RoleService } from './RoleService.js';
import { IdService } from './IdService.js';
import { NoteCreateService } from './NoteCreateService.js';
import { NotificationService } from './NotificationService.js';
import { NoteEntityService } from './entities/NoteEntityService.js';
import { UserEntityService } from './entities/UserEntityService.js';

export const autoRenoteErrors = {
	notFound: { message: 'No such auto-renote schedule.', code: 'NO_SUCH_AUTO_RENOTE', id: '0792d164-54ef-42f3-b37a-ce72a9e08930' },
	unavailable: { message: 'This note cannot be automatically renoted publicly.', code: 'AUTO_RENOTE_UNAVAILABLE', id: 'd6a71b21-9662-4a2b-8196-2655530eca8f' },
	blocked: { message: 'Auto-renote is currently unavailable.', code: 'AUTO_RENOTE_BLOCKED', id: '5335405a-9d47-4dde-b2f4-7bbff84b79a2' },
	invalid: { message: 'Invalid auto-renote schedule.', code: 'INVALID_AUTO_RENOTE', id: '531adcb4-7fe7-420e-a35f-ce1f76f63185' },
	limit: { message: 'Too many auto-renote schedules.', code: 'TOO_MANY_AUTO_RENOTES', id: '6b8c8ee8-393f-4305-81af-e4033d808173' },
} as const;

type StopReason = 'quota' | 'offline' | 'role' | 'unavailable' | 'error';
type TimingInput = Omit<AutoRenoteTiming, 'weekday' | 'day'> & Partial<Pick<AutoRenoteTiming, 'weekday' | 'day'>>;

@Injectable()
export class AutoRenoteService {
	// Do not let requests hold every pooled connection while waiting for an advisory
	// lock: the normal note pipeline needs another connection. Waiters use no DB slot.
	private lockTail: Promise<void> = Promise.resolve();
	private lockWaiters = 0;
	constructor(
		@Inject(DI.db) private db: DataSource,
		private roleService: RoleService,
		private idService: IdService,
		private noteCreateService: NoteCreateService,
		private noteEntityService: NoteEntityService,
		private userEntityService: UserEntityService,
		private notificationService: NotificationService,
		private rateLimiterService: RateLimiterService,
		private loggerService: LoggerService,
	) { }

	/** A dedicated connection holds this lock across short commits and the normal note creation path. */
	private async withOwner<T>(userId: string, work: () => Promise<T>): Promise<T> {
		if (this.lockWaiters >= 100) throw new ApiError(autoRenoteErrors.blocked, { reason: 'busy' });
		this.lockWaiters++;
		const previous = this.lockTail;
		let releaseQueue!: () => void;
		this.lockTail = new Promise<void>(resolve => { releaseQueue = resolve; });
		await previous;
		const runner = this.db.createQueryRunner();
		try {
			await runner.connect();
			try {
				await runner.query('SELECT pg_advisory_lock(hashtext($1), hashtext($2))', ['auto-renote', userId]);
				return await work();
			} finally {
				await runner.query('SELECT pg_advisory_unlock(hashtext($1), hashtext($2))', ['auto-renote', userId]);
			}
		} finally {
			try { await runner.release(); } finally {
				this.lockWaiters--;
				releaseQueue();
			}
		}
	}

	private timing(input: TimingInput): AutoRenoteTiming {
		const timing = { frequency: input.frequency, time: input.time, weekday: input.weekday ?? 0, day: input.day ?? 1 };
		if (!validateAutoRenoteTiming(timing)) throw new ApiError(autoRenoteErrors.invalid);
		return timing;
	}

	private async usage(userId: string, now: Date): Promise<MiAutoRenoteUsage> {
		const repository = this.db.getRepository(MiAutoRenoteUsage);
		let usage = await repository.findOneBy({ userId });
		if (!usage) {
			usage = repository.create({ userId, month: autoRenoteMonth(now), count: 0, lastUsedAt: new Date(0) });
			await repository.insert(usage);
		} else if (usage.month !== autoRenoteMonth(now)) {
			await repository.update({ userId, month: usage.month }, { month: autoRenoteMonth(now), count: 0 });
			usage = await repository.findOneByOrFail({ userId });
		}
		return usage;
	}

	public async recordActivity(userId: string): Promise<void> {
		await this.withOwner(userId, async () => {
			await this.refresh(userId);
			await this.usage(userId, new Date());
			await this.db.getRepository(MiAutoRenoteUsage).createQueryBuilder().update()
				.set({ lastUsedAt: () => 'GREATEST("lastUsedAt", CURRENT_TIMESTAMP)' }).where('"userId" = :userId', { userId }).execute();
		});
	}

	private async ownerReason(user: MiUser | null, usage: MiAutoRenoteUsage, now: Date): Promise<StopReason | null> {
		if (!user || user.host != null || user.isDeleted || user.isSuspended || user.movedToUri) return 'role';
		const policies = await this.roleService.getUserPolicies(user.id);
		if (!policies.canAutoRenote || !policies.canPublicNote || !Number.isFinite(policies.autoRenoteMonthlyLimit) || policies.autoRenoteMonthlyLimit <= 0) return 'role';
		if (usage.count >= policies.autoRenoteMonthlyLimit) return 'quota';
		if (now.getTime() - usage.lastUsedAt.getTime() >= AUTO_RENOTE_INACTIVITY_MS) return 'offline';
		return null;
	}

	private async target(ownerId: string, noteId: string, viewerId = ownerId): Promise<MiNote | null> {
		const note = await this.db.getRepository(MiNote).findOneBy({ id: noteId });
		if (!note || note.userId !== ownerId || note.visibility !== 'public' || (isRenote(note) && !isQuote(note))) return null;
		const author = await this.db.getRepository(MiUser).findOneBy({ id: note.userId });
		if (!author || author.isDeleted || author.isSuspended) return null;
		if (!await this.noteEntityService.isVisibleForMe(note, viewerId) || !await this.noteEntityService.isChannelVisibleForMe(note, viewerId)) return null;
		if (note.userId !== viewerId && await this.db.getRepository(MiBlocking).existsBy([
			{ blockerId: note.userId, blockeeId: viewerId }, { blockerId: viewerId, blockeeId: note.userId },
		])) return null;
		if (note.channelId) {
			const channel = await this.db.getRepository(MiChannel).findOneBy({ id: note.channelId });
			if (!channel || channel.isPrivate || !channel.allowRenoteToExternal) return null;
		}
		return note;
	}

	private async stop(schedules: MiAutoRenoteSchedule[], reason: StopReason | 'admin', adminReason?: string): Promise<void> {
		if (schedules.length === 0) return;
		const notificationId = this.idService.gen();
		await this.db.getRepository(MiAutoRenoteSchedule).update({ id: In(schedules.map(s => s.id)) }, {
			status: reason === 'admin' ? 'cancelled' : reason,
			nextRunAt: null, updatedAt: new Date(), notificationPending: true, notificationId, notificationReason: reason,
			...(reason === 'admin' ? { adminReason: adminReason ?? '' } : {}),
		});
	}

	private async flushNotifications(userId: string): Promise<void> {
		const pending = await this.db.getRepository(MiAutoRenoteSchedule).findBy({ userId, notificationPending: true });
		for (const notificationId of new Set(pending.map(s => s.notificationId))) {
			if (notificationId == null) throw new Error('Missing auto-renote notification ID');
			const group = pending.filter(s => s.notificationId === notificationId);
			const reason = group[0].notificationReason as StopReason | 'admin';
			await this.notificationService.createNotificationAsync(userId, 'autoRenoteStopped', {
				reason, scheduleIds: group.map(s => s.id), count: group.length,
				...(reason === 'admin' ? { adminReason: group[0].adminReason ?? '' } : {}),
			}, undefined, `auto-renote-stop:${notificationId}`);
			await this.db.getRepository(MiAutoRenoteSchedule).update({ userId, notificationId }, { notificationPending: false });
		}
	}

	/** Settle the durable receipt exactly once, including after a worker restart. Never repeat an uncertain attempt. */
	private async settle(userId: string): Promise<void> {
		const attempts = await this.db.getRepository(MiAutoRenoteAttempt).findBy({ userId, settled: false });
		for (const attempt of attempts) {
			const schedule = await this.db.getRepository(MiAutoRenoteSchedule).findOneBy({ id: attempt.scheduleId, userId });
			if (!schedule) continue;
			const now = new Date();
			await this.usage(userId, now);
			await this.db.transaction(async manager => {
				const claimed = await manager.getRepository(MiAutoRenoteAttempt).createQueryBuilder().update()
					.set({ settled: true }).where('id = :id AND settled = false', { id: attempt.id }).returning('*').execute();
				const receipt = claimed.raw[0] as MiAutoRenoteAttempt | undefined;
				if (!receipt) return;
				if (receipt.posted) {
					await manager.update(MiAutoRenoteSchedule, schedule.id, {
						lastRunAt: attempt.createdAt, nextRunAt: schedule.status === 'active' ? nextAutoRenoteAt(schedule, now) : null, updatedAt: now,
					});
				} else {
					await manager.update(MiAutoRenoteSchedule, schedule.id, {
						status: 'error', nextRunAt: null, updatedAt: now, notificationPending: true,
						notificationId: this.idService.gen(), notificationReason: 'error',
					});
				}
			});
		}
	}

	private async refresh(userId: string): Promise<void> {
		await this.settle(userId);
		// Send previous events before a new state transition can replace their outbox fields.
		await this.flushNotifications(userId);
		const now = new Date();
		const usage = await this.usage(userId, now);
		const user = await this.db.getRepository(MiUser).findOneBy({ id: userId });
		const schedules = await this.db.getRepository(MiAutoRenoteSchedule).findBy({ userId, status: 'active' });
		const reason = await this.ownerReason(user, usage, now);
		if (reason) {
			await this.stop(schedules, reason);
		} else {
			const unavailable = [];
			for (const schedule of schedules) {
				if (!await this.target(userId, schedule.noteId)) unavailable.push(schedule);
			}
			await this.stop(unavailable, 'unavailable');
		}
		await this.flushNotifications(userId);
	}

	public async create(userId: string, input: TimingInput & { noteId: string }) {
		const timing = this.timing(input);
		return this.withOwner(userId, async () => {
			await this.refresh(userId);
			const now = new Date();
			const usage = await this.usage(userId, now);
			// This secure, explicit user action counts as account use; background jobs never do.
			usage.lastUsedAt = now;
			await this.db.getRepository(MiAutoRenoteUsage).update(userId, { lastUsedAt: now });
			const reason = await this.ownerReason(await this.db.getRepository(MiUser).findOneBy({ id: userId }), usage, now);
			if (reason) throw new ApiError(autoRenoteErrors.blocked, { reason });
			if (!await this.target(userId, input.noteId)) throw new ApiError(autoRenoteErrors.unavailable);
			const repository = this.db.getRepository(MiAutoRenoteSchedule);
			if (await repository.countBy({ userId, status: Not('cancelled') }) >= 100) throw new ApiError(autoRenoteErrors.limit);
			const schedule = repository.create({
				...timing, id: this.idService.gen(), userId, noteId: input.noteId,
				status: 'active', createdAt: now, updatedAt: now, nextRunAt: nextAutoRenoteAt(timing, now), lastRunAt: null,
				adminReason: null, notificationPending: false, notificationId: null, notificationReason: null,
			});
			await repository.insert(schedule);
			return this.pack(schedule, userId);
		});
	}

	public async update(userId: string, scheduleId: string, input: TimingInput & { noteId?: string }) {
		const timing = this.timing(input);
		return this.withOwner(userId, async () => {
			await this.refresh(userId);
			const schedule = await this.owned(userId, scheduleId);
			if (schedule.status === 'cancelled') throw new ApiError(autoRenoteErrors.blocked, { reason: 'cancelled' });
			const noteId = input.noteId ?? schedule.noteId;
			if (!await this.target(userId, noteId)) throw new ApiError(autoRenoteErrors.unavailable);
			Object.assign(schedule, timing, { noteId, updatedAt: new Date() });
			if (schedule.status === 'active') schedule.nextRunAt = nextAutoRenoteAt(timing, new Date());
			await this.db.getRepository(MiAutoRenoteSchedule).save(schedule);
			return this.pack(schedule, userId);
		});
	}

	private async owned(userId: string, scheduleId: string) {
		const schedule = await this.db.getRepository(MiAutoRenoteSchedule).findOneBy({ id: scheduleId, userId });
		if (!schedule) throw new ApiError(autoRenoteErrors.notFound);
		return schedule;
	}

	public async change(userId: string, scheduleId: string, action: 'pause' | 'resume' | 'cancel') {
		return this.withOwner(userId, async () => {
			await this.refresh(userId);
			const schedule = await this.owned(userId, scheduleId);
			if (schedule.status === 'cancelled') {
				if (action === 'cancel') return this.pack(schedule, userId);
				throw new ApiError(autoRenoteErrors.blocked, { reason: 'cancelled' });
			}
			if (action === 'resume') {
				const now = new Date();
				const usage = await this.usage(userId, now);
				usage.lastUsedAt = now;
				await this.db.getRepository(MiAutoRenoteUsage).update(userId, { lastUsedAt: now });
				const reason = await this.ownerReason(await this.db.getRepository(MiUser).findOneBy({ id: userId }), usage, now);
				if (reason) throw new ApiError(autoRenoteErrors.blocked, { reason });
				if (!await this.target(userId, schedule.noteId)) throw new ApiError(autoRenoteErrors.unavailable);
				schedule.status = 'active';
				schedule.nextRunAt = nextAutoRenoteAt(schedule, now);
			} else {
				schedule.status = action === 'cancel' ? 'cancelled' : 'paused';
				schedule.nextRunAt = null;
			}
			schedule.updatedAt = new Date();
			await this.db.getRepository(MiAutoRenoteSchedule).save(schedule);
			return this.pack(schedule, userId);
		});
	}

	public async adminCancel(scheduleId: string, reason: string, viewerId: string) {
		const found = await this.db.getRepository(MiAutoRenoteSchedule).findOneBy({ id: scheduleId });
		if (!found) throw new ApiError(autoRenoteErrors.notFound);
		return this.withOwner(found.userId, async () => {
			await this.refresh(found.userId);
			const schedule = await this.owned(found.userId, scheduleId);
			if (schedule.status !== 'cancelled') {
				await this.stop([schedule], 'admin', reason.slice(0, 500));
				await this.flushNotifications(found.userId);
			}
			return this.pack(await this.owned(found.userId, scheduleId), viewerId);
		});
	}

	public async list(userId: string, options: { limit: number; offset: number; status?: AutoRenoteStatus }) {
		return this.withOwner(userId, async () => {
			await this.refresh(userId);
			const usage = await this.usage(userId, new Date());
			const policies = await this.roleService.getUserPolicies(userId);
			const schedules = await this.db.getRepository(MiAutoRenoteSchedule).find({
				where: { userId, ...(options.status ? { status: options.status } : {}) },
				order: { createdAt: 'DESC', id: 'DESC' }, take: options.limit, skip: options.offset,
			});
			return {
				schedules: await Promise.all(schedules.map(s => this.pack(s, userId))),
				usage: { month: usage.month, count: usage.count, limit: policies.autoRenoteMonthlyLimit },
				enabled: policies.canAutoRenote && policies.canPublicNote && policies.autoRenoteMonthlyLimit > 0,
				lastActiveAt: usage.lastUsedAt.toISOString(),
			};
		});
	}

	public async adminList(viewerId: string, options: { limit: number; offset: number; status?: AutoRenoteStatus; userId?: string; query?: string }) {
		const search = options.query?.trim();
		if (search) {
			const query = this.db.getRepository(MiAutoRenoteSchedule).createQueryBuilder('schedule')
				.innerJoin(MiNote, 'target', 'target.id = schedule.noteId')
				.where('target.visibility = :visibility', { visibility: 'public' })
				.andWhere('(target.text ILIKE :search OR target.cw ILIKE :search)', { search: `%${sqlLikeEscape(search)}%` })
				.andWhere('(target.channelId IS NULL OR EXISTS (SELECT 1 FROM channel c WHERE c.id = target."channelId" AND c."isPrivate" = false AND c."allowRenoteToExternal" = true))')
				.orderBy('schedule.createdAt', 'DESC').addOrderBy('schedule.id', 'DESC');
			if (options.status) query.andWhere('schedule.status = :status', { status: options.status });
			if (options.userId) query.andWhere('schedule.userId = :userId', { userId: options.userId });
			const schedules: Awaited<ReturnType<AutoRenoteService['pack']>>[] = [];
			let skipped = 0;
			let cursor: MiAutoRenoteSchedule | undefined;
			while (schedules.length < options.limit) {
				const page = query.clone();
				if (cursor) page.andWhere('(schedule.createdAt < :cursorAt OR (schedule.createdAt = :cursorAt AND schedule.id < :cursorId))', { cursorAt: cursor.createdAt, cursorId: cursor.id });
				const candidates = await page.take(100).getMany();
				if (candidates.length === 0) break;
				for (const schedule of candidates) {
					// Packing rechecks blocks, the author, and nested channel visibility. Hidden
					// matches must not affect either returned rows or the visible pagination offset.
					const packed = await this.pack(schedule, viewerId);
					if (packed.note == null || packed.note.isHidden) continue;
					if (skipped < options.offset) { skipped++; continue; }
					schedules.push(packed);
					if (schedules.length === options.limit) break;
				}
				cursor = candidates[candidates.length - 1];
			}
			return { schedules };
		}
		const schedules = await this.db.getRepository(MiAutoRenoteSchedule).find({
			where: { ...(options.status ? { status: options.status } : {}), ...(options.userId ? { userId: options.userId } : {}) },
			order: { createdAt: 'DESC', id: 'DESC' }, take: options.limit, skip: options.offset,
		});
		return { schedules: await Promise.all(schedules.map(s => this.pack(s, viewerId))) };
	}

	private async pack(schedule: MiAutoRenoteSchedule, viewerId: string) {
		const note = await this.target(schedule.userId, schedule.noteId, viewerId);
		return {
			id: schedule.id, userId: schedule.userId, noteId: schedule.noteId,
			user: await this.userEntityService.pack(schedule.userId, { id: viewerId }, { schema: 'UserLite' }),
			note: note ? await this.noteEntityService.pack(note, { id: viewerId }) : null,
			frequency: schedule.frequency, time: schedule.time, weekday: schedule.weekday, day: schedule.day,
			status: schedule.status, stopReason: ['active', 'paused'].includes(schedule.status) ? null : schedule.status,
			nextRunAt: schedule.nextRunAt?.toISOString() ?? null, lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
			createdAt: schedule.createdAt.toISOString(), adminReason: schedule.adminReason,
		};
	}

	public async process(): Promise<void> {
		let cursor = '';
		let failed = false;
		for (;;) {
			const owners = await this.db.getRepository(MiAutoRenoteSchedule).createQueryBuilder('schedule')
				.select('schedule.userId', 'userId').distinct(true)
				.where('(schedule.status = :active OR schedule.notificationPending = true OR EXISTS (SELECT 1 FROM auto_renote_attempt a WHERE a."userId" = schedule."userId" AND a.settled = false))', { active: 'active' })
				.andWhere('schedule.userId > :cursor', { cursor }).orderBy('schedule.userId', 'ASC').limit(100)
				.getRawMany<{ userId: string }>();
			if (owners.length === 0) break;
			for (const { userId } of owners) {
				try { await this.withOwner(userId, () => this.runOwner(userId)); } catch {
					failed = true;
					this.loggerService.getLogger('auto-renote').error('Owner processing failed; will retry', { userId });
				}
			}
			cursor = owners[owners.length - 1].userId;
		}
		if (failed) throw new Error('Some auto-renote owners could not be processed');
	}

	private async runOwner(userId: string): Promise<void> {
		await this.refresh(userId);
		const due = await this.db.getRepository(MiAutoRenoteSchedule).createQueryBuilder('schedule')
			.where('schedule.userId = :userId AND schedule.status = :status AND schedule.nextRunAt <= :now', { userId, status: 'active', now: new Date() })
			.orderBy('schedule.nextRunAt', 'ASC').addOrderBy('schedule.id', 'ASC').getMany();
		for (const schedule of due) {
			await this.refresh(userId);
			const current = await this.owned(userId, schedule.id);
			if (current.status !== 'active' || !current.nextRunAt || current.nextRunAt > new Date()) continue;
			const now = new Date();
			// Do not catch up missed slots after outages; allow the minute worker a small delivery window.
			if (now.getTime() - current.nextRunAt.getTime() > 5 * 60 * 1000) {
				await this.db.getRepository(MiAutoRenoteSchedule).update(current.id, { nextRunAt: nextAutoRenoteAt(current, now), updatedAt: now });
				continue;
			}
			const user = await this.db.getRepository(MiUser).findOneBy({ id: userId });
			const note = await this.target(userId, current.noteId);
			if (!user || !note) { await this.stop([current], 'unavailable'); continue; }
			const policies = await this.roleService.getUserPolicies(userId);
			if (policies.rateLimitFactor > 0 && await this.rateLimiterService.limit({ key: 'notes/create', duration: 60 * 60 * 1000, max: 300 }, userId, policies.rateLimitFactor)) {
				await this.stop([current], 'error');
				continue;
			}
			const attempt = this.db.getRepository(MiAutoRenoteAttempt).create({
				id: this.idService.gen(), userId, scheduleId: current.id, scheduledAt: current.nextRunAt, createdAt: now, posted: false, settled: false,
			});
			await this.db.getRepository(MiAutoRenoteAttempt).insert(attempt);
			try {
				await this.noteCreateService.fetchAndCreate(user, {
					autoRenoteAttemptId: attempt.id, createdAt: now, renoteId: note.id, visibility: 'public', localOnly: note.localOnly,
					replyId: null, fileIds: [], text: null, cw: null, visibleUserIds: [], channelId: null,
					reactionAcceptance: null, disableRightClick: false, poll: null, event: null,
				});
			} catch {
				// No retry: a durable posted receipt is authoritative even if later side effects failed.
			}
			await this.settle(userId);
			await this.refresh(userId);
		}
		await this.flushNotifications(userId);
	}
}
