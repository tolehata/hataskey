/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { AutoRenoteService } from '@/core/AutoRenoteService.js';
import { MiAutoRenoteSchedule, MiAutoRenoteUsage, MiAutoRenoteAttempt } from '@/models/AutoRenote.js';
import { MiUser } from '@/models/User.js';
import { MiNote } from '@/models/Note.js';
import { MiBlocking } from '@/models/Blocking.js';
import { MiChannel } from '@/models/Channel.js';
import { autoRenoteMonth, nextAutoRenoteAt } from '@/misc/auto-renote.js';

/* eslint-disable @typescript-eslint/no-explicit-any -- In-memory DB/queue boundaries exercise the real service without a live DB. */
const NOW = new Date('2026-11-04T09:00:30+09:00');
const timing = { frequency: 'daily' as const, time: '09:00', weekday: 0, day: 1 };
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function fixture() {
	vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW);
	const tables = new Map<any, Map<string, any>>([MiAutoRenoteSchedule, MiAutoRenoteUsage, MiAutoRenoteAttempt, MiUser, MiNote, MiBlocking, MiChannel].map(type => [type, new Map()]));
	const table = (type: any) => {
		const rows = tables.get(type);
		if (!rows) throw new Error('Unexpected entity in fixture');
		return rows;
	};
	const key = (row: any) => row.id ?? row.userId;
	const match = (row: any, where: any): boolean => typeof where === 'string' ? key(row) === where : Array.isArray(where) ? where.some(w => match(row, w)) : Object.entries(where).every(([k, v]: [string, any]) => {
		if (v?._type === 'in') return v._value.includes(row[k]);
		if (v?._type === 'not') return row[k] !== v._value;
		return row[k] === v;
	});
	const repositories = new Map<any, any>();
	let borrowCount = 0; let maxBorrowCount = 0; let serial = 0;
	const locks = new Map<string, Promise<void>>();
	const queryCalls: string[] = [];
	const repository = (type: any): any => {
		if (repositories.has(type)) return repositories.get(type);
		const rows = table(type);
		const repo: any = {
			create: (data: any) => structuredClone(data),
			insert: vi.fn(async (row: any) => { rows.set(key(row), structuredClone(row)); }),
			save: vi.fn(async (row: any) => { rows.set(key(row), structuredClone(row)); }),
			findOneBy: vi.fn(async (where: any) => structuredClone([...rows.values()].find(row => match(row, where)) ?? null)),
			findOneByOrFail: vi.fn(async (where: any) => structuredClone([...rows.values()].find(row => match(row, where)))),
			findBy: vi.fn(async (where: any) => structuredClone([...rows.values()].filter(row => match(row, where)))),
			find: vi.fn(async (opts: any) => structuredClone([...rows.values()].filter(row => match(row, opts.where)).slice(opts.skip ?? 0, (opts.skip ?? 0) + (opts.take ?? 1000)))),
			countBy: vi.fn(async (where: any) => [...rows.values()].filter(row => match(row, where)).length),
			existsBy: vi.fn(async (where: any) => [...rows.values()].some(row => match(row, where))),
			update: vi.fn(async (where: any, data: any) => {
				let affected = 0;
				for (const row of rows.values()) if (match(row, where)) { Object.assign(row, structuredClone(data)); affected++; }
				return { affected };
			}),
			createQueryBuilder: vi.fn(() => {
				const params: any = {}; let values: any = {};
				const builder: any = {
					select: () => builder, distinct: () => builder, orderBy: () => builder, addOrderBy: () => builder, limit: () => builder,
					update: () => builder, returning: () => builder,
					set: (data: any) => { values = data; return builder; },
					where: (sql: string, data: any) => { queryCalls.push(sql); Object.assign(params, data); return builder; },
					andWhere: (sql: string, data: any) => builder.where(sql, data),
					getMany: async () => structuredClone([...rows.values()].filter(row => row.userId === params.userId && row.status === params.status && row.nextRunAt <= params.now)),
					getRawMany: async () => [...new Set([...rows.values()].filter(row => row.status === 'active' || row.notificationPending === true || [...table(MiAutoRenoteAttempt).values()].some(a => a.userId === row.userId && !a.settled)).map(row => row.userId))]
						.filter(userId => userId > params.cursor).sort().slice(0, 100).map(userId => ({ userId })),
					execute: vi.fn(async () => {
						if (type === MiAutoRenoteUsage) {
							const row = rows.get(params.userId); row.lastUsedAt = new Date(); return { affected: 1 };
						}
						const row = rows.get(params.id);
						if (!row || row.settled) return { affected: 0, raw: [] };
						Object.assign(row, values); return { affected: 1, raw: [structuredClone(row)] };
					}),
				}; return builder;
			}),
		};
		repositories.set(type, repo); return repo;
	};
	const manager: any = {
		getRepository: repository,
		update: (type: any, where: any, data: any) => repository(type).update(where, data),
		increment: async (type: any, where: any, field: string, by: number) => { for (const row of table(type).values()) if (match(row, where)) row[field] += by; },
	};
	const db = {
		getRepository: repository,
		transaction: vi.fn(async (work: any) => {
			const snapshot = new Map([...tables].map(([type, rows]) => [type, structuredClone(rows)]));
			try { return await work(manager); } catch (err) {
				for (const [type, rows] of snapshot) { table(type).clear(); for (const [id, row] of rows) table(type).set(id, row); }
				throw err;
			}
		}),
		createQueryRunner: vi.fn(() => {
			let unlock: (() => void) | undefined;
			return {
				connect: async () => { borrowCount++; maxBorrowCount = Math.max(maxBorrowCount, borrowCount); },
				query: async (sql: string, params: string[]) => {
					queryCalls.push(sql);
					if (sql.includes('pg_advisory_lock')) {
						const previous = locks.get(params[1]) ?? Promise.resolve();
						locks.set(params[1], new Promise<void>(resolve => { unlock = resolve; })); await previous;
					} else unlock?.();
				},
				release: async () => { borrowCount--; },
			};
		}),
	};
	const policies = { canAutoRenote: true, canPublicNote: true, autoRenoteMonthlyLimit: 10, rateLimitFactor: 1 };
	const notification = { createNotificationAsync: vi.fn(async () => ({ id: 'notice' })) };
	const noteCreate = { fetchAndCreate: vi.fn(async (_user: any, data: any) => {
		table(MiAutoRenoteAttempt).get(data.autoRenoteAttemptId).posted = true;
		table(MiAutoRenoteUsage).get(_user.id).count++;
		return { id: data.autoRenoteAttemptId };
	}) };
	const noteEntity = { isVisibleForMe: vi.fn(async () => true), isChannelVisibleForMe: vi.fn(async () => true), pack: vi.fn(async (note: any) => note) };
	const limiter = { limit: vi.fn(async (): Promise<any> => null) };
	const logger = { error: vi.fn() };
	const createService = () => new AutoRenoteService(db as never, { getUserPolicies: async () => policies } as never,
		{ gen: () => `id-${++serial}` } as never, noteCreate as never, noteEntity as never,
		{ pack: async (id: string) => ({ id, username: id }) } as never, notification as never, limiter as never, { getLogger: () => logger } as never);
	for (const id of ['alice', 'bob']) table(MiUser).set(id, { id, host: null, isDeleted: false, isSuspended: false, movedToUri: null });
	table(MiNote).set('note', { id: 'note', userId: 'alice', visibility: 'public', localOnly: true, channelId: null, renoteId: null });
	table(MiAutoRenoteUsage).set('alice', { userId: 'alice', count: 0, month: '2026-11', lastUsedAt: NOW });
	const add = (id: string, data: any = {}) => {
		const row = {
			...timing, id, userId: 'alice', noteId: 'note', status: 'active', createdAt: NOW, updatedAt: NOW,
			nextRunAt: new Date('2026-11-04T09:00:00+09:00'), lastRunAt: null, adminReason: null, notificationPending: false, notificationId: null, notificationReason: null, ...data,
		};
		table(MiAutoRenoteSchedule).set(id, row); return row;
	};
	return { table, repository, db, policies, notification, noteCreate, noteEntity, limiter, logger, add, createService, service: createService(), queryCalls, maxBorrowCount: () => maxBorrowCount };
}

describe('auto-renote calendar', () => {
	test('日本時間の月境界、毎日・毎週・欠けた月日を扱う', () => {
		expect(autoRenoteMonth(new Date('2026-11-30T15:00:00Z'))).toBe('2026-12');
		expect(nextAutoRenoteAt(timing, NOW).toISOString()).toBe('2026-11-05T00:00:00.000Z');
		expect(nextAutoRenoteAt({ ...timing, frequency: 'weekly', weekday: 0 }, NOW).toISOString()).toBe('2026-11-08T00:00:00.000Z');
		expect(nextAutoRenoteAt({ ...timing, frequency: 'monthly', day: 31 }, NOW).toISOString()).toBe('2026-12-31T00:00:00.000Z');
		expect(() => nextAutoRenoteAt({ ...timing, time: '25:00' }, NOW)).toThrow();
	});
});

describe('auto-renote persistence and controls', () => {
	test('本人の公開ノートは予約できる', async () => {
		const f = fixture();
		const schedule = await f.service.create('alice', { ...timing, noteId: 'note' });
		expect(schedule).toMatchObject({ userId: 'alice', noteId: 'note', status: 'active', note: { userId: 'alice' } });
		expect(f.repository(MiAutoRenoteSchedule).insert).toHaveBeenCalledOnce();
	});

	test.each([null, 'remote.example'])('他人の公開ノートはブロックがなくても登録・対象変更できない（host=%s）', async host => {
		const f = fixture();
		f.table(MiUser).get('bob').host = host;
		f.table(MiNote).set('other-note', { ...f.table(MiNote).get('note'), id: 'other-note', userId: 'bob' });
		await expect(f.service.create('alice', { ...timing, noteId: 'other-note' })).rejects.toMatchObject({ code: 'AUTO_RENOTE_UNAVAILABLE' });
		expect(f.repository(MiAutoRenoteSchedule).insert).not.toHaveBeenCalled();
		f.add('schedule');
		await expect(f.service.update('alice', 'schedule', { ...timing, noteId: 'other-note', time: '12:00' })).rejects.toMatchObject({ code: 'AUTO_RENOTE_UNAVAILABLE' });
		expect(f.table(MiAutoRenoteSchedule).get('schedule')).toMatchObject({ noteId: 'note', time: '09:00', status: 'active' });
		expect(f.repository(MiAutoRenoteSchedule).save).not.toHaveBeenCalled();
	});

	test('既存の他人ノート予約は投稿・回数加算せずに停止理由を通知し、再開も拒否する', async () => {
		const f = fixture();
		f.table(MiNote).get('note').userId = 'bob';
		f.add('legacy');
		await f.service.process();
		expect(f.noteCreate.fetchAndCreate).not.toHaveBeenCalled();
		expect(f.table(MiAutoRenoteUsage).get('alice').count).toBe(0);
		expect(f.table(MiAutoRenoteSchedule).get('legacy')).toMatchObject({ status: 'unavailable', nextRunAt: null, notificationPending: false });
		expect((f.notification.createNotificationAsync.mock.calls[0] as any).slice(0, 3)).toMatchObject(['alice', 'autoRenoteStopped', { reason: 'unavailable', scheduleIds: ['legacy'], count: 1 }]);
		await expect(f.service.change('alice', 'legacy', 'resume')).rejects.toMatchObject({ code: 'AUTO_RENOTE_UNAVAILABLE' });
		expect(f.table(MiAutoRenoteSchedule).get('legacy').status).toBe('unavailable');
		expect(f.notification.createNotificationAsync).toHaveBeenCalledOnce();
	});

	test('一時停止していた他人ノート予約も再開できない', async () => {
		const f = fixture();
		f.table(MiNote).get('note').userId = 'bob';
		f.add('legacy', { status: 'paused', nextRunAt: null });
		await expect(f.service.change('alice', 'legacy', 'resume')).rejects.toMatchObject({ code: 'AUTO_RENOTE_UNAVAILABLE' });
		expect(f.table(MiAutoRenoteSchedule).get('legacy')).toMatchObject({ status: 'paused', nextRunAt: null });
		expect(f.noteCreate.fetchAndCreate).not.toHaveBeenCalled();
	});

	test('管理一覧は予約者の本人ノートを表示し、閲覧者のブロックと可視性を別に判定する', async () => {
		const f = fixture(); f.add('schedule');
		const result = await f.service.adminList('bob', { limit: 20, offset: 0 });
		expect(result.schedules[0]).toMatchObject({ userId: 'alice', note: { id: 'note', userId: 'alice' } });
		expect(f.noteEntity.isVisibleForMe).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'note' }), 'bob');
		expect(f.noteEntity.isChannelVisibleForMe).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'note' }), 'bob');
		f.table(MiBlocking).set('blocked', { id: 'blocked', blockerId: 'alice', blockeeId: 'bob' });
		expect((await f.service.adminList('bob', { limit: 20, offset: 0 })).schedules[0].note).toBeNull();
		f.table(MiBlocking).clear();
		f.noteEntity.isVisibleForMe.mockResolvedValue(false);
		expect((await f.service.adminList('bob', { limit: 20, offset: 0 })).schedules[0].note).toBeNull();
	});

	test('パブリック固定・ローカル限定維持で通常作成経路を使い、成功だけを数える', async () => {
		const f = fixture(); f.add('schedule'); await f.service.process();
		expect(f.noteCreate.fetchAndCreate).toHaveBeenCalledOnce();
		expect(f.noteCreate.fetchAndCreate.mock.calls[0][1]).toMatchObject({ visibility: 'public', localOnly: true, renoteId: 'note', text: null });
		expect(f.table(MiAutoRenoteUsage).get('alice').count).toBe(1);
		expect(f.table(MiAutoRenoteSchedule).get('schedule').nextRunAt.toISOString()).toBe('2026-11-05T00:00:00.000Z');
		await f.service.process(); expect(f.noteCreate.fetchAndCreate).toHaveBeenCalledOnce();
	});

	test('複数ワーカー・複数予約の同時実行でも共通月間上限を越えず、まとめて停止する', async () => {
		const f = fixture(); f.policies.autoRenoteMonthlyLimit = 1; f.add('s1'); f.add('s2');
		await Promise.all([f.service.process(), f.createService().process()]);
		expect(f.noteCreate.fetchAndCreate).toHaveBeenCalledOnce();
		expect([...f.table(MiAutoRenoteSchedule).values()].map(s => s.status)).toEqual(['quota', 'quota']);
		expect((f.notification.createNotificationAsync.mock.calls[0] as any).slice(0, 3)).toMatchObject(['alice', 'autoRenoteStopped', { reason: 'quota', count: 2 }]);
	});

	test('72時間ちょうどで停止し、活動更新や翌月だけでは再開せず、本人の再開を待つ', async () => {
		const f = fixture(); f.add('s1'); f.table(MiAutoRenoteUsage).get('alice').lastUsedAt = new Date(NOW.getTime() - 72 * 3600000);
		await f.service.recordActivity('alice');
		expect(f.table(MiAutoRenoteSchedule).get('s1').status).toBe('offline');
		expect(f.noteCreate.fetchAndCreate).not.toHaveBeenCalled();
		await f.service.change('alice', 's1', 'resume'); expect(f.table(MiAutoRenoteSchedule).get('s1').status).toBe('active');
		f.table(MiAutoRenoteSchedule).get('s1').status = 'quota';
		vi.setSystemTime(new Date('2026-12-01T09:00:00+09:00')); await f.service.recordActivity('alice');
		expect(f.table(MiAutoRenoteSchedule).get('s1').status).toBe('quota');
	});

	test('本人以外は変更・解除できず、管理者解除は理由を通知し再開できない', async () => {
		const f = fixture(); f.add('s1');
		await expect(f.service.change('bob', 's1', 'cancel')).rejects.toMatchObject({ code: 'NO_SUCH_AUTO_RENOTE' });
		await expect(f.service.update('bob', 's1', timing)).rejects.toMatchObject({ code: 'NO_SUCH_AUTO_RENOTE' });
		const cancelled = await f.service.adminCancel('s1', '重複した予約', 'bob');
		expect(cancelled).toMatchObject({ userId: 'alice', status: 'cancelled', note: { id: 'note', userId: 'alice' } });
		expect(f.table(MiAutoRenoteSchedule).get('s1').status).toBe('cancelled');
		expect((f.notification.createNotificationAsync.mock.calls[0] as any).slice(0, 3)).toMatchObject(['alice', 'autoRenoteStopped', { reason: 'admin', adminReason: '重複した予約' }]);
		await expect(f.service.change('alice', 's1', 'resume')).rejects.toMatchObject({ code: 'AUTO_RENOTE_BLOCKED' });
	});

	test('本人の一時停止と解除は通知せず、過去の実行回数を残す', async () => {
		const f = fixture(); f.add('s1'); f.table(MiAutoRenoteUsage).get('alice').count = 3;
		await f.service.change('alice', 's1', 'pause'); await f.service.change('alice', 's1', 'cancel');
		expect(f.notification.createNotificationAsync).not.toHaveBeenCalled();
		expect(f.table(MiAutoRenoteUsage).get('alice').count).toBe(3);
	});

	test('公開不可、他人のノート、凍結、引っ越し、権限制限は実行前に拒否する', async () => {
		for (const mutate of [
			(f: ReturnType<typeof fixture>) => { f.table(MiNote).get('note').visibility = 'home'; },
			(f: ReturnType<typeof fixture>) => { f.table(MiNote).delete('note'); },
			(f: ReturnType<typeof fixture>) => { f.table(MiUser).get('alice').isSuspended = true; },
			(f: ReturnType<typeof fixture>) => { f.table(MiUser).get('alice').movedToUri = 'https://example.invalid'; },
			(f: ReturnType<typeof fixture>) => { f.policies.canAutoRenote = false; },
			(f: ReturnType<typeof fixture>) => { f.policies.canPublicNote = false; },
			(f: ReturnType<typeof fixture>) => { f.table(MiNote).get('note').userId = 'bob'; },
			(f: ReturnType<typeof fixture>) => { f.table(MiNote).get('note').channelId = 'c'; f.table(MiChannel).set('c', { id: 'c', isPrivate: true, allowRenoteToExternal: true }); },
		]) {
			const f = fixture(); f.add('s1'); mutate(f); await f.service.process();
			expect(f.noteCreate.fetchAndCreate).not.toHaveBeenCalled();
			expect(f.table(MiAutoRenoteSchedule).get('s1').status).not.toBe('active');
		}
	});

	test('未確定の実行は再試行せずエラー停止、保存後の例外は成功として一度だけ数える', async () => {
		const f = fixture(); f.add('s1');
		f.table(MiAutoRenoteAttempt).set('pending', { id: 'pending', userId: 'alice', scheduleId: 's1', createdAt: NOW, posted: false, settled: false });
		await f.service.process(); expect(f.noteCreate.fetchAndCreate).not.toHaveBeenCalled();
		expect(f.table(MiAutoRenoteSchedule).get('s1').status).toBe('error'); expect(f.table(MiAutoRenoteUsage).get('alice').count).toBe(0);
		await f.service.change('alice', 's1', 'resume'); f.table(MiAutoRenoteSchedule).get('s1').nextRunAt = NOW;
		f.noteCreate.fetchAndCreate.mockImplementationOnce(async (_user, data) => {
			f.table(MiAutoRenoteAttempt).get(data.autoRenoteAttemptId).posted = true;
			f.table(MiAutoRenoteUsage).get(_user.id).count++;
			throw new Error('after commit');
		});
		await f.service.process(); await f.service.process(); expect(f.table(MiAutoRenoteUsage).get('alice').count).toBe(1);
	});

	test('送信障害は停止イベントを保存して再試行し、他ユーザーを止めない', async () => {
		const f = fixture();
		f.table(MiNote).set('bob-note', { ...f.table(MiNote).get('note'), id: 'bob-note', userId: 'bob' });
		f.add('s1'); f.add('s2', { userId: 'bob', noteId: 'bob-note' }); f.policies.canAutoRenote = false;
		f.notification.createNotificationAsync.mockRejectedValueOnce(new Error('PRIVATE DATA'));
		await expect(f.service.process()).rejects.toThrow('Some auto-renote');
		expect(f.table(MiAutoRenoteSchedule).get('s1').notificationPending).toBe(true);
		expect(f.table(MiAutoRenoteSchedule).get('s2').notificationPending).toBe(false);
		const eventId = f.table(MiAutoRenoteSchedule).get('s1').notificationId;
		await f.service.process(); expect(f.table(MiAutoRenoteSchedule).get('s1').notificationPending).toBe(false);
		expect((f.notification.createNotificationAsync.mock.calls as any).at(-1)[4]).toBe(`auto-renote-stop:${eventId}`);
		expect(JSON.stringify(f.logger.error.mock.calls)).not.toContain('PRIVATE DATA');
	});

	test('同時50要求の待機者はDB接続を借りず、終わった後も次要求を処理できる', async () => {
		const f = fixture();
		await Promise.all(Array.from({ length: 50 }, (_, i) => (f.service as any).withOwner(`owner${i}`, async () => { await Promise.resolve(); })));
		expect(f.maxBorrowCount()).toBe(1);
		await expect((f.service as any).withOwner('alice', async () => { throw new Error('test'); })).rejects.toThrow('test');
		await expect((f.service as any).withOwner('alice', async () => 42)).resolves.toBe(42);
	});

	test('停止中の月間回数は月替わりで更新するが、最終利用日時は書き換えない', async () => {
		const f = fixture(); f.add('s1', { status: 'quota' }); const usage = f.table(MiAutoRenoteUsage).get('alice'); usage.month = '2026-10'; usage.count = 10;
		const before = usage.lastUsedAt;
		const result = await f.service.list('alice', { limit: 100, offset: 0 });
		expect(result.usage).toEqual({ month: '2026-11', count: 0, limit: 10 }); expect(result.lastActiveAt).toBe(before.toISOString());
		expect(result.schedules[0].status).toBe('quota');
	});

	test('停止期間・障害で過ぎた予定はまとめて実行せず、レート制限にも従う', async () => {
		const f = fixture(); f.add('s1', { nextRunAt: new Date(NOW.getTime() - 6 * 60000) });
		await f.service.process(); expect(f.noteCreate.fetchAndCreate).not.toHaveBeenCalled();
		f.table(MiAutoRenoteSchedule).get('s1').nextRunAt = NOW; f.limiter.limit.mockResolvedValue({ code: 'RATE_LIMIT_EXCEEDED' });
		await f.service.process(); expect(f.noteCreate.fetchAndCreate).not.toHaveBeenCalled(); expect(f.table(MiAutoRenoteSchedule).get('s1').status).toBe('error');
		expect(f.limiter.limit).toHaveBeenCalledWith({ key: 'notes/create', duration: 3600000, max: 300 }, 'alice', 1);
	});
});
