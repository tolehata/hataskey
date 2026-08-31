/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, expectTypeOf, test, vi } from 'vitest';
import locales from '../../../../locales/index.js';
import { RegistrationApplicationNotificationService } from '@/core/RegistrationApplicationNotificationService.js';
import { NotificationService } from '@/core/NotificationService.js';
import { RoleService } from '@/core/RoleService.js';
import type { MiNotification } from '@/models/Notification.js';
import type { MiRole } from '@/models/Role.js';

const link = '/admin/registration-applications';
const genericData = {
	appAccessTokenId: null,
	customHeader: 'A new application',
	customBody: 'Review applications in the control panel',
	customIcon: null,
	customLink: link,
};

function fixture() {
	const meta = { rootUserId: 'root' as string | null };
	const roleDefinitions: (Pick<MiRole, 'id' | 'target' | 'isAdministrator' | 'isModerator'> & { condFormula?: MiRole['condFormula'] })[] = [
		{ id: 'administrator', target: 'manual', isAdministrator: true, isModerator: false },
		{ id: 'moderator', target: 'manual', isAdministrator: false, isModerator: true },
	];
	const assignments = [
		{ userId: 'admin', roleId: 'administrator', expiresAt: null as Date | null },
		{ userId: 'admin', roleId: 'administrator', expiresAt: null as Date | null },
		{ userId: 'expired', roleId: 'administrator', expiresAt: new Date(Date.now() - 60000) },
		{ userId: 'moderator', roleId: 'moderator', expiresAt: null as Date | null },
	];
	const people = new Map(['root', 'admin', 'expired', 'moderator', 'ordinary'].map(id => [id, { id, host: null as string | null, isSuspended: false, isDeleted: false, isCat: false }]));
	// Use the real role candidate and expiry checks with in-memory repositories, not a DB.
	const roles = Object.assign(Object.create(RoleService.prototype), {
		meta,
		rolesCache: { fetch: vi.fn().mockResolvedValue(roleDefinitions) },
		cacheService: { findUserById: vi.fn(async (id: string) => people.get(id) ?? null) },
		roleAssignmentByUserIdCache: { fetch: vi.fn((_id, load: () => Promise<unknown>) => load()) },
		roleAssignmentsRepository: { findBy: vi.fn(async (where: { userId?: string }) => where.userId
			? assignments.filter(assignment => assignment.userId === where.userId)
			: assignments.filter(assignment => assignment.roleId === 'administrator')) },
	}) as RoleService;
	const users = {
		findOne: vi.fn(async ({ where }: { where: { id: string } }) => people.get(where.id) ?? null),
		find: vi.fn(async ({ where, take }: { where: { id?: { value: string } }; take: number }) => [...people.values()]
			.filter(user => user.host === null && !user.isSuspended && !user.isDeleted && (where.id == null || user.id > where.id.value))
			.sort((a, b) => a.id.localeCompare(b.id))
			.slice(0, take)),
	};
	const languages = new Map<string, string | null>();
	const profiles = { findOne: vi.fn(async ({ where }: { where: { userId: string } }) => ({ lang: languages.get(where.userId) ?? null })) };
	const notification = { createNotificationAsync: vi.fn().mockResolvedValue(null) };
	const logger = { warn: vi.fn() };
	const loggerService = { getLogger: vi.fn().mockReturnValue(logger) };
	const service = new RegistrationApplicationNotificationService(meta as never, users as never, profiles as never, roles, notification as never, loggerService as never);
	return { meta, roleDefinitions, assignments, roles, people, users, languages, profiles, notification, logger, service };
}

function standardNotificationFixture() {
	const profile = { notificationRecieveConfig: {} as Record<string, { type: string }> };
	const cache = { userProfileCache: { fetch: vi.fn().mockResolvedValue(profile) } };
	const redis = { xadd: vi.fn().mockResolvedValue('1000-0'), get: vi.fn().mockResolvedValue(null) };
	const packed = { id: 'notice', type: 'app', header: genericData.customHeader, body: genericData.customBody, link };
	const entity = { pack: vi.fn().mockResolvedValue(packed) };
	const id = { gen: vi.fn().mockReturnValue('notice'), parseFull: vi.fn().mockReturnValue({ date: 1000, additional: 0n }) };
	const stream = { publishMainStream: vi.fn() };
	const push = { pushNotification: vi.fn() };
	const service = new NotificationService({ perUserNotificationsMaxCount: 50 } as never, redis as never, {} as never, entity as never, id as never, stream as never, push as never, cache as never, {} as never);
	return { service, profile, cache, redis, entity, stream, push };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('registration application administrator notifications', () => {
	test('実RoleServiceの期限再判定を通し、rootと管理者だけへ重複なく送る', async () => {
		const f = fixture();
		expect(await f.roles.getAdministratorIds()).toEqual(['admin', 'expired']);
		expect(await f.roles.isAdministrator({ id: 'expired' })).toBe(false);
		expect(await f.roles.isAdministrator({ id: 'moderator' })).toBe(false);
		await f.service.notifyNewApplication();
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toEqual(['admin', 'root']);
		expect(f.users.find).not.toHaveBeenCalled();
		expect(f.users.findOne).toHaveBeenCalledWith(expect.objectContaining({
			where: expect.objectContaining({ isSuspended: false, isDeleted: false }),
			select: { id: true, host: true, isSuspended: true, isDeleted: true },
		}));
	});

	test('手動・rootと重複する条件付き管理者も、割当行のない条件付き管理者も一度だけ送る', async () => {
		const f = fixture();
		f.roleDefinitions.push({ id: 'conditional-admin', target: 'conditional', isAdministrator: true, isModerator: false, condFormula: { type: 'isCat' } });
		for (const id of ['admin', 'root', 'ordinary']) f.people.get(id)!.isCat = true;
		expect(await f.roles.getAdministratorIds()).not.toContain('ordinary');
		expect(await f.roles.isAdministrator({ id: 'ordinary' })).toBe(true);
		expect(await f.roles.isAdministrator({ id: 'moderator' })).toBe(false);
		await f.service.notifyNewApplication();
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toEqual(['admin', 'root', 'ordinary']);
		expect(f.profiles.findOne.mock.calls.map(([query]) => query.where.userId)).toEqual(['admin', 'root', 'ordinary']);
		expect(f.users.find).toHaveBeenCalledExactlyOnceWith({
			where: { host: expect.objectContaining({ type: 'isNull' }), isSuspended: false, isDeleted: false },
			select: { id: true }, order: { id: 'ASC' }, take: 100,
		});
	});

	test('条件付きモデレーターロールだけではユーザー列挙も通知拡大もしない', async () => {
		const f = fixture();
		f.roleDefinitions.push({ id: 'conditional-moderator', target: 'conditional', isAdministrator: false, isModerator: true, condFormula: { type: 'isCat' } });
		f.people.get('ordinary')!.isCat = true;
		expect(await f.roles.isModerator({ id: 'ordinary' })).toBe(true);
		await f.service.notifyNewApplication();
		expect(f.users.find).not.toHaveBeenCalled();
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toEqual(['admin', 'root']);
	});

	test('条件付き候補をIDカーソル100件ずつ取得し、ページ境界でも抜け・重複を作らない', async () => {
		const f = fixture();
		f.meta.rootUserId = null;
		f.assignments.splice(0);
		f.people.clear();
		f.roleDefinitions.push({ id: 'conditional-admin', target: 'conditional', isAdministrator: true, isModerator: false, condFormula: { type: 'isCat' } });
		for (let index = 0; index < 205; index++) {
			const id = `scan-${index.toString().padStart(3, '0')}`;
			f.people.set(id, { id, host: null, isSuspended: false, isDeleted: false, isCat: [99, 100, 204].includes(index) });
		}
		await f.service.notifyNewApplication();
		expect(f.users.find).toHaveBeenCalledTimes(3);
		expect(f.users.find.mock.calls.map(([query]) => query.where.id?.value)).toEqual([undefined, 'scan-099', 'scan-199']);
		for (const [query] of f.users.find.mock.calls.slice(1)) expect(query.where.id).toMatchObject({ type: 'moreThan' });
		for (const [query] of f.users.find.mock.calls) expect(query).toMatchObject({ take: 100, select: { id: true }, order: { id: 'ASC' } });
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toEqual(['scan-099', 'scan-100', 'scan-204']);
		expect(f.profiles.findOne).toHaveBeenCalledTimes(3);
	});

	test.each([
		['remote', { host: 'other.example' }],
		['suspended', { isSuspended: true }],
		['deleted', { isDeleted: true }],
	] as const)('条件付き管理者でも%sなら対象外とし、候補取得後の状態変更も再確認する', async (_name, flags) => {
		const f = fixture();
		f.roleDefinitions.push({ id: 'conditional-admin', target: 'conditional', isAdministrator: true, isModerator: false, condFormula: { type: 'isCat' } });
		f.people.get('ordinary')!.isCat = true;
		Object.assign(f.people.get('ordinary')!, flags);
		await f.service.notifyNewApplication();
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toEqual(['admin', 'root']);
		// Deliberately pollute the page to prove the delivery guard does not trust its earlier filter.
		f.notification.createNotificationAsync.mockClear();
		f.users.find.mockResolvedValue([f.people.get('ordinary')!]);
		await f.service.notifyNewApplication();
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toEqual(['admin', 'root']);
	});

	test('言語取得中に条件を満たさなくなった管理者は送信直前の実RoleService判定で除く', async () => {
		const f = fixture();
		f.roleDefinitions.push({ id: 'conditional-admin', target: 'conditional', isAdministrator: true, isModerator: false, condFormula: { type: 'isCat' } });
		f.people.get('ordinary')!.isCat = true;
		f.profiles.findOne.mockImplementation(async ({ where }) => {
			if (where.userId === 'ordinary') f.people.get('ordinary')!.isCat = false;
			return { lang: null };
		});
		await f.service.notifyNewApplication();
		expect(f.profiles.findOne).toHaveBeenCalledWith({ where: { userId: 'ordinary' }, select: { lang: true } });
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toEqual(['admin', 'root']);
	});

	test('条件付き候補のページ取得失敗は固定ログだけにし、送信済みの申請案内を失敗表示にしない', async () => {
		const f = fixture();
		f.roleDefinitions.push({ id: 'conditional-admin', target: 'conditional', isAdministrator: true, isModerator: false, condFormula: { type: 'isCat' } });
		f.users.find.mockRejectedValue(new Error('PRIVATE_REASON applicant@example.test'));
		await expect(f.service.notifyNewApplication()).resolves.toBeUndefined();
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toEqual(['admin', 'root']);
		expect(f.logger.warn).toHaveBeenCalledExactlyOnceWith('Failed to resolve registration application notification recipients.');
	});

	test('root自身も管理ロールを持つ場合の重複を除く', async () => {
		const f = fixture();
		f.assignments.push({ userId: 'root', roleId: 'administrator', expiresAt: null });
		await f.service.notifyNewApplication();
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toEqual(['admin', 'root']);
	});

	test('未来期限の管理者は対象に含み、候補取得後に期限を迎えた管理者は除く', async () => {
		const f = fixture();
		f.assignments[0].expiresAt = new Date(Date.now() + 60000);
		f.assignments.splice(1, 1);
		await f.service.notifyNewApplication();
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toContain('admin');
		f.notification.createNotificationAsync.mockClear();
		f.profiles.findOne.mockImplementation(async () => {
			f.assignments[0].expiresAt = new Date(Date.now() - 1);
			return { lang: null };
		});
		await f.service.notifyNewApplication();
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toEqual(['root']);
	});

	test.each([
		['remote', { host: 'other.example' }],
		['suspended', { isSuspended: true }],
		['deleted', { isDeleted: true }],
	] as const)('%sの管理者とrootを通知対象から除く', async (_name, flags) => {
		const f = fixture();
		Object.assign(f.people.get('admin')!, flags);
		Object.assign(f.people.get('root')!, flags);
		await f.service.notifyNewApplication();
		expect(f.notification.createNotificationAsync).not.toHaveBeenCalled();
	});

	test('欠損ユーザー・通常利用者・モデレーターが候補に混入しても送らない', async () => {
		const f = fixture();
		f.people.delete('root');
		vi.spyOn(f.roles, 'getAdministratorIds').mockResolvedValue(['ordinary', 'moderator', 'missing']);
		await f.service.notifyNewApplication();
		expect(f.notification.createNotificationAsync).not.toHaveBeenCalled();
	});

	test.each(['ja-JP', 'en-US', 'zh-CN', 'fr-FR', 'unknown-language', 'constructor', null])('利用者の言語 %s と既存fallback辞書を使う', async lang => {
		const f = fixture();
		f.meta.rootUserId = null;
		f.languages.set('admin', lang);
		await f.service.notifyNewApplication();
		const copy = (lang != null && Object.hasOwn(locales, lang) ? locales[lang] : locales['ja-JP'])._hata._registrationApplications;
		expect(typeof copy.notificationTitle).toBe('string');
		expect(copy.notificationTitle.length).toBeGreaterThan(0);
		expect(typeof copy.notificationBody).toBe('string');
		expect(copy.notificationBody.length).toBeGreaterThan(0);
		expect(f.notification.createNotificationAsync).toHaveBeenCalledExactlyOnceWith('admin', 'app', {
			appAccessTokenId: null, customIcon: null, customLink: link,
			customHeader: copy.notificationTitle, customBody: copy.notificationBody,
		});
		expect(f.profiles.findOne).toHaveBeenCalledWith({ where: { userId: 'admin' }, select: { lang: true } });
	});

	test('引数なしの固定payload以外を許さず、PII混入を陽性対照で検出する', async () => {
		const f = fixture();
		await f.service.notifyNewApplication();
		const payloads = f.notification.createNotificationAsync.mock.calls.map(([, , data]) => data);
		const pii = ['applicant-id', 'applicant@example.test', 'PRIVATE_REASON', 'PRIVATE_CONTACT'];
		const containsPii = (value: unknown) => pii.some(sentinel => JSON.stringify(value).includes(sentinel));
		for (const sentinel of pii) expect(containsPii([{ ...payloads[0], customBody: sentinel }])).toBe(true);
		expect(containsPii(payloads)).toBe(false);
		for (const data of payloads) expect(Object.keys(data).sort()).toEqual(['appAccessTokenId', 'customBody', 'customHeader', 'customIcon', 'customLink']);
		const source = readFileSync(resolve(process.cwd(), 'src/core/RegistrationApplicationNotificationService.ts'), 'utf8');
		expect(source).toContain('public async notifyNewApplication(): Promise<void>');
	});

	test('通知の非同期失敗は固定ログだけにし、ほかの管理者への通知を続ける', async () => {
		const f = fixture();
		f.notification.createNotificationAsync.mockRejectedValueOnce(new Error('PRIVATE_CONTACT applicant@example.test'));
		await expect(f.service.notifyNewApplication()).resolves.toBeUndefined();
		expect(f.notification.createNotificationAsync.mock.calls.map(([id]) => id)).toEqual(['admin', 'root']);
		expect(f.logger.warn).toHaveBeenCalledExactlyOnceWith('Failed to deliver a registration application notification.');
	});

	test.each(['users', 'profiles', 'roles'] as const)('%sの取得失敗は申請へ伝播せず、取得失敗した相手には送らない', async target => {
		const f = fixture();
		const error = new Error('PRIVATE_REASON applicant@example.test');
		if (target === 'users') f.users.findOne.mockRejectedValue(error);
		else if (target === 'profiles') f.profiles.findOne.mockRejectedValue(error);
		else vi.spyOn(f.roles, 'isAdministrator').mockRejectedValue(error);
		await expect(f.service.notifyNewApplication()).resolves.toBeUndefined();
		expect(f.notification.createNotificationAsync).not.toHaveBeenCalled();
		for (const args of f.logger.warn.mock.calls) expect(args).toEqual(['Failed to deliver a registration application notification.']);
	});

	test('管理者候補取得の失敗も固定ログだけで終了する', async () => {
		const f = fixture();
		vi.spyOn(f.roles, 'getAdministratorIds').mockRejectedValue(new Error('private database detail'));
		await expect(f.service.notifyNewApplication()).resolves.toBeUndefined();
		expect(f.notification.createNotificationAsync).not.toHaveBeenCalled();
		expect(f.logger.warn).toHaveBeenCalledExactlyOnceWith('Failed to resolve registration application notification recipients.');
	});
});

describe('awaitable standard app notifications', () => {
	test('引数なしの新着案内とawait可能な標準通知の型契約を保つ', () => {
		expectTypeOf<RegistrationApplicationNotificationService['notifyNewApplication']>().parameters.toEqualTypeOf<[]>();
		expectTypeOf<ReturnType<RegistrationApplicationNotificationService['notifyNewApplication']>>().toEqualTypeOf<Promise<void>>();
		expectTypeOf<ReturnType<NotificationService['createNotificationAsync']>>().toEqualTypeOf<Promise<MiNotification | null>>();
		expectTypeOf<ReturnType<NotificationService['createNotification']>>().toEqualTypeOf<void>();
	});

	test('標準app通知の受信しない設定を尊重して保存・配信をしない', async () => {
		const f = standardNotificationFixture();
		f.profile.notificationRecieveConfig.app = { type: 'never' };
		try {
			await expect(f.service.createNotificationAsync('admin', 'app', genericData)).resolves.toBeNull();
			expect(f.cache.userProfileCache.fetch).toHaveBeenCalledWith('admin');
			expect(f.redis.xadd).not.toHaveBeenCalled();
			expect(f.stream.publishMainStream).not.toHaveBeenCalled();
		} finally { f.service.onApplicationShutdown(); }
	});

	test('受信する陽性対照は既存Redis保存と標準stream配信を通る', async () => {
		const f = standardNotificationFixture();
		try {
			await expect(f.service.createNotificationAsync('admin', 'app', genericData)).resolves.toMatchObject({ type: 'app', ...genericData });
			expect(f.redis.xadd).toHaveBeenCalledOnce();
			expect(f.redis.xadd.mock.calls[0][0]).toBe('notificationTimeline:admin');
			expect(f.stream.publishMainStream).toHaveBeenCalledWith('admin', 'notification', expect.objectContaining({ link }));
		} finally { f.service.onApplicationShutdown(); }
	});

	test('Redisの非同期失敗をawait元が捕捉できる', async () => {
		const f = standardNotificationFixture();
		const error = new Error('private redis failure');
		f.redis.xadd.mockRejectedValue(error);
		try {
			await expect(f.service.createNotificationAsync('admin', 'app', genericData)).rejects.toBe(error);
			expect(f.stream.publishMainStream).not.toHaveBeenCalled();
		} finally { f.service.onApplicationShutdown(); }
	});
});
