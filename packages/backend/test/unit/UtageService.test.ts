/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
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
		...overrides,
	};
	const sut = new UtageService(
		defaults.utageSessionsRepository as never,
		defaults.idService as never,
		defaults.queueService as never,
		defaults.globalEventService as never,
	);
	return { sut, ...defaults };
}

function note(overrides: Record<string, unknown> = {}) {
	return { id: 'note-a', text: '今日は宴だ', cw: null, visibility: 'public', ...overrides } as never;
}

const localUser = { id: 'user-a', host: null };

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
		expect(source).toContain("innerJoin('session.note', 'note')");
		expect(source).toContain("andWhere('note.visibility = :visibility', { visibility: 'public' })");
		// 可視性を見ない素の件数取得へ戻っていないこと。
		expect(source).not.toMatch(/utageSessionsRepository\.countBy/);
	});

	// ⚠️「LTL は public だけ」という前提が崩れたらこのゲームの対象範囲を見直す必要がある。
	// 前提そのものを本体のコードに対して固定しておく。
	test('LTLが public 以外を流し始めていないこと(前提の固定)', () => {
		const rest = readFileSync(join(srcDir, 'server/api/endpoints/notes/local-timeline.ts'), 'utf8');
		expect(rest).toContain("note.visibility = \\'public\\'");
		const stream = readFileSync(join(srcDir, 'server/api/stream/channels/local-timeline.ts'), 'utf8');
		expect(stream).toContain("if (note.visibility !== 'public') return;");
	});
});
