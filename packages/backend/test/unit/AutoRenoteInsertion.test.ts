/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { NoteCreateService } from '@/core/NoteCreateService.js';
import { MiNote } from '@/models/Note.js';
import { MiAutoRenoteAttempt, MiAutoRenoteUsage } from '@/models/AutoRenote.js';

/* eslint-disable @typescript-eslint/no-explicit-any -- Exercise the private insertion boundary with transaction doubles. */
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function fixture() {
	vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-04T09:00:00+09:00'));
	vi.spyOn(console, 'error').mockImplementation(() => {});
	const receipt = { posted: false, settled: false };
	const usage = { month: '2026-11', count: 0, lastUsedAt: new Date() };
	const policies = { canAutoRenote: true, canPublicNote: true, autoRenoteMonthlyLimit: 10 };
	const user = { id: 'alice', host: null, isSuspended: false, isDeleted: false, movedToUri: null };
	const notes: any[] = [];
	const manager = {
		findOne: vi.fn(async () => usage),
		update: vi.fn(async (_type, _where, values) => {
			if (_type === MiAutoRenoteUsage) { Object.assign(usage, values); return { affected: 1 }; }
			if (receipt.posted || receipt.settled) return { affected: 0 };
			Object.assign(receipt, values); return { affected: 1 };
		}),
		insert: vi.fn(async (_type, note) => { notes.push(note); }),
	};
	const transaction = vi.fn(async (work: any) => {
		const saved = { ...receipt }; const savedUsage = { ...usage }; const size = notes.length;
		try { return await work(manager); } catch (error) { Object.assign(receipt, saved); Object.assign(usage, savedUsage); notes.splice(size); throw error; }
	});
	const service = Object.assign(Object.create(NoteCreateService.prototype), {
		db: { transaction },
		idService: { gen: () => 'generated' },
		usersRepository: { findOneBy: async () => user },
		roleService: { getUserPolicies: async () => policies },
		utageService: { isCandidate: () => false, onNoteSaved: async () => [], afterCommit: async () => {} },
		notesRepository: { insert: vi.fn() },
	});
	const data = { autoRenoteAttemptId: 'attempt', visibility: 'public', renote: { id: 'target', userId: 'alice', userHost: null, visibility: 'public' }, localOnly: true };
	const insert = () => service.insertNote(user, data, [], [], []);
	return { service, data, insert, manager, receipt, usage, policies, user, notes, transaction };
}

describe('normal note insertion with auto-renote receipt', () => {
	test('ノートと成功の証拠を同じトランザクションで保存する', async () => {
		const f = fixture(); const note = await f.insert();
		expect(note.id).toBe('attempt'); expect(f.receipt.posted).toBe(true); expect(f.usage.count).toBe(1);
		expect(f.manager.update).toHaveBeenCalledWith(MiAutoRenoteAttempt, { id: 'attempt', userId: 'alice', posted: false, settled: false }, { posted: true });
		expect(f.manager.insert).toHaveBeenCalledWith(MiNote, expect.objectContaining({ id: 'attempt', visibility: 'public', localOnly: true }));
	});

	test('保存失敗は証拠もロールバックし、同じ証拠の再使用を拒否する', async () => {
		const f = fixture(); f.manager.insert.mockRejectedValueOnce(new Error('insert failed'));
		await expect(f.insert()).rejects.toThrow('insert failed'); expect(f.receipt.posted).toBe(false); expect(f.notes).toHaveLength(0); expect(f.usage.count).toBe(0);
		f.receipt.settled = true; await expect(f.insert()).rejects.toThrow('already handled'); expect(f.notes).toHaveLength(0);
	});

	test('挿入直前の上限変更・非公開化・72時間経過・凍結を拒否する', async () => {
		for (const mutate of [
			(f: ReturnType<typeof fixture>) => { f.policies.autoRenoteMonthlyLimit = 0; },
			(f: ReturnType<typeof fixture>) => { f.usage.count = 3; f.policies.autoRenoteMonthlyLimit = 2; },
			(f: ReturnType<typeof fixture>) => { f.policies.canAutoRenote = false; },
			(f: ReturnType<typeof fixture>) => { f.policies.canPublicNote = false; },
			(f: ReturnType<typeof fixture>) => { f.data.visibility = 'home'; },
			(f: ReturnType<typeof fixture>) => { f.usage.lastUsedAt = new Date(Date.now() - 72 * 3600000); },
			(f: ReturnType<typeof fixture>) => { f.user.isSuspended = true; },
		]) {
			const f = fixture(); mutate(f); await expect(f.insert()).rejects.toThrow();
			expect(f.receipt.posted).toBe(false); expect(f.manager.insert).not.toHaveBeenCalled();
		}
	});
});
