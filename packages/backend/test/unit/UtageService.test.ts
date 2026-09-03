/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { UtageService } from '@/core/UtageService.js';

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '../../src');

function service(overrides: Record<string, unknown> = {}) {
	const defaults = {
		utageSessionsRepository: { insert: vi.fn().mockResolvedValue(undefined), findOneBy: vi.fn(), update: vi.fn() },
		idService: {
			gen: vi.fn().mockReturnValue('generated'),
			parse: vi.fn().mockReturnValue({ date: new Date('2026-08-15T00:00:00.000Z') }),
		},
		queueService: { createUtageResolveJob: vi.fn().mockResolvedValue(undefined) },
		globalEventService: { publishNoteStream: vi.fn() },
		achievementService: {
			reconcileUtageAchievements: vi.fn().mockResolvedValue(undefined),
			create: vi.fn().mockResolvedValue(undefined),
		},
		...overrides,
	};
	const sut = new UtageService(
		defaults.utageSessionsRepository as never,
		defaults.idService as never,
		defaults.queueService as never,
		defaults.globalEventService as never,
		defaults.achievementService as never,
	);
	return { sut, ...defaults };
}

function note(overrides: Record<string, unknown> = {}) {
	return { id: 'note-a', text: '今日は宴だ', cw: null, visibility: 'public', ...overrides } as never;
}

const localUser = { id: 'user-a', host: null };

afterEach(() => {
	vi.useRealTimers();
});

/*
 * 旗鯖fork: 宴はLTL(ローカルタイムライン)の上で成立するゲーム。
 * ⚠️LTL は public しか流さない(notes/local-timeline.ts / stream/channels/local-timeline.ts)。
 *   home を対象に含めていた頃は、LTLに出ないため誰にも邪魔されず15分を通過して成功が積み増しされ、
 *   HTLやプロフィールから反応が付けば阻止としても数えていた。
 */
describe('宴のセッションはLTLに載る投稿だけで作られる', () => {
	test('public のローカル宴ノートはセッションを作る', async () => {
		const { sut, utageSessionsRepository, queueService } = service();
		await sut.onNoteCreated(note(), localUser);
		expect(utageSessionsRepository.insert).toHaveBeenCalledTimes(1);
		expect(queueService.createUtageResolveJob).toHaveBeenCalledTimes(1);
	});

	test('home はLTLに出ないのでセッションを作らない', async () => {
		const { sut, utageSessionsRepository, queueService } = service();
		await sut.onNoteCreated(note({ visibility: 'home' }), localUser);
		expect(utageSessionsRepository.insert).not.toHaveBeenCalled();
		expect(queueService.createUtageResolveJob).not.toHaveBeenCalled();
	});

	test('followers と specified も対象外', async () => {
		for (const visibility of ['followers', 'specified']) {
			const { sut, utageSessionsRepository } = service();
			await sut.onNoteCreated(note({ visibility }), localUser);
			expect(utageSessionsRepository.insert, visibility).not.toHaveBeenCalled();
		}
	});

	test('リモートユーザーと宴ワードなしは従来どおり対象外', async () => {
		const remote = service();
		await remote.sut.onNoteCreated(note(), { id: 'user-b', host: 'example.com' });
		expect(remote.utageSessionsRepository.insert).not.toHaveBeenCalled();

		const plain = service();
		await plain.sut.onNoteCreated(note({ text: 'ふつうの投稿' }), localUser);
		expect(plain.utageSessionsRepository.insert).not.toHaveBeenCalled();
	});

	/*
	 * ⚠️作成側を public 限定に直しても、既に積まれてしまった行は本番に残る。
	 *   利用者に見えるバッジを正しい値に戻すには集計側でも元ノートの可視性で絞る必要がある。
	 *   ⚠️DBを触らずに直す方針なので、ここが外れると水増しがそのまま表示に戻る。
	 */
	test('成功数・阻止数の集計が元ノートの可視性で絞られている', () => {
		const source = readFileSync(join(srcDir, 'core/entities/UserEntityService.ts'), 'utf8');
		expect(source).toContain('innerJoin(\'session.note\', \'note\')');
		expect(source).toContain('andWhere(\'note.visibility = :visibility\', { visibility: \'public\' })');
		// 可視性を見ない素の件数取得へ戻っていないこと。
		expect(source).not.toMatch(/utageSessionsRepository\.countBy/);

		const achievementSource = readFileSync(join(srcDir, 'core/AchievementService.ts'), 'utf8');
		expect(achievementSource).toContain('innerJoin(\'session.note\', \'note\')');
		expect(achievementSource).toContain('andWhere(\'note.visibility = :visibility\', { visibility: \'public\' })');
	});

	// ⚠️「LTL は public だけ」という前提が崩れたらこのゲームの対象範囲を見直す必要がある。
	// 前提そのものを本体のコードに対して固定しておく。
	test('LTLが public 以外を流し始めていないこと(前提の固定)', () => {
		const rest = readFileSync(join(srcDir, 'server/api/endpoints/notes/local-timeline.ts'), 'utf8');
		expect(rest).toContain('note.visibility = \\\'public\\\'');
		const stream = readFileSync(join(srcDir, 'server/api/stream/channels/local-timeline.ts'), 'utf8');
		expect(stream).toContain('if (note.visibility !== \'public\') return;');
	});
});

describe('宴の確定時にサーバー側で実績を解除する', () => {
	const now = new Date('2026-09-03T12:00:00.000Z');
	const runningSession = (startedAt: Date) => ({
		noteId: 'note-a',
		userId: 'user-a',
		status: 'running',
		startedAt,
		expiresAt: new Date(now.getTime() + 60_000),
	});

	test('ローカル利用者が他人の宴を5秒以内に阻止すると阻止回数と早期阻止の実績を解除する', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
		const { sut, utageSessionsRepository, achievementService } = service();
		utageSessionsRepository.findOneBy.mockResolvedValue(runningSession(new Date(now.getTime() - 5000)));
		utageSessionsRepository.update.mockResolvedValue({ affected: 1 });

		await sut.onReaction(note({ userId: 'user-a', userHost: null }), { id: 'user-b', host: null });

		expect(utageSessionsRepository.update).toHaveBeenCalledWith(
			{ noteId: 'note-a', status: 'running' },
			expect.objectContaining({ status: 'failed', interruptedByUserId: 'user-b', interruptedWithin5Seconds: true }),
		);
		expect(achievementService.reconcileUtageAchievements).toHaveBeenCalledWith('user-b', 'interruption');
	});

	test('5秒超・自己阻止・リモート阻止者には早期阻止実績を付与しない', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(now);

		const afterFiveSeconds = service();
		afterFiveSeconds.utageSessionsRepository.findOneBy.mockResolvedValue(runningSession(new Date(now.getTime() - 5001)));
		afterFiveSeconds.utageSessionsRepository.update.mockResolvedValue({ affected: 1 });
		await afterFiveSeconds.sut.onReaction(note({ userId: 'user-a', userHost: null }), { id: 'user-b', host: null });
		expect(afterFiveSeconds.utageSessionsRepository.update).toHaveBeenCalledWith(
			{ noteId: 'note-a', status: 'running' },
			expect.objectContaining({ interruptedWithin5Seconds: false }),
		);

		const self = service();
		self.utageSessionsRepository.findOneBy.mockResolvedValue(runningSession(new Date(now.getTime() - 1000)));
		self.utageSessionsRepository.update.mockResolvedValue({ affected: 1 });
		await self.sut.onReaction(note({ userId: 'user-a', userHost: null }), { id: 'user-a', host: null });
		expect(self.utageSessionsRepository.update).toHaveBeenCalledWith(
			{ noteId: 'note-a', status: 'running' },
			expect.objectContaining({ interruptedWithin5Seconds: false }),
		);

		const remote = service();
		remote.utageSessionsRepository.findOneBy.mockResolvedValue(runningSession(new Date(now.getTime() - 1000)));
		remote.utageSessionsRepository.update.mockResolvedValue({ affected: 1 });
		await remote.sut.onReaction(note({ userId: 'user-a', userHost: null }), { id: 'user-c', host: 'remote.example' });
		expect(remote.achievementService.reconcileUtageAchievements).not.toHaveBeenCalled();
		expect(remote.utageSessionsRepository.update).toHaveBeenCalledWith(
			{ noteId: 'note-a', status: 'running' },
			expect.objectContaining({ interruptedWithin5Seconds: true }),
		);
	});

	test('楽観更新に負けた処理は実績を二重解除しない', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
		const { sut, utageSessionsRepository, achievementService } = service();
		utageSessionsRepository.findOneBy.mockResolvedValue(runningSession(new Date(now.getTime() - 1000)));
		utageSessionsRepository.update.mockResolvedValue({ affected: 0 });

		await sut.onReaction(note({ userId: 'user-a', userHost: null }), { id: 'user-b', host: null });

		expect(achievementService.reconcileUtageAchievements).not.toHaveBeenCalled();
	});

	test('宴の成功確定時は投稿者の成功回数実績を照合する', async () => {
		const { sut, utageSessionsRepository, achievementService } = service();
		utageSessionsRepository.findOneBy.mockResolvedValue(runningSession(new Date(now.getTime() - 60_000)));
		utageSessionsRepository.update.mockResolvedValue({ affected: 1 });

		await sut.resolveExpired('note-a');

		expect(achievementService.reconcileUtageAchievements).toHaveBeenCalledWith('user-a', 'success');
	});
});
