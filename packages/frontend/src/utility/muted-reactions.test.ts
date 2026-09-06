/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	api: vi.fn(),
	ready: true,
	hasMuted: true,
	revision: { value: 1 },
	mutedIds: new Set(['muted-user']),
}));

vi.mock('@/utility/misskey-api.js', () => ({
	misskeyApi: mocks.api,
}));

vi.mock('@/utility/muted-users.js', () => ({
	hasMutedUsers: () => mocks.hasMuted,
	isMutedUser: (userId: string) => mocks.mutedIds.has(userId),
	isMutedUsersReady: () => mocks.ready,
	mutedUsersRevision: mocks.revision,
}));

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

const reaction = (userId: string, type: string) => ({
	id: `${userId}-${type}`,
	type,
	user: { id: userId },
});

describe('ミュートユーザーのリアクション表示キャッシュ', () => {
	beforeEach(() => {
		vi.resetModules();
		mocks.api.mockReset();
		mocks.ready = true;
		mocks.hasMuted = true;
		mocks.revision.value = 1;
		mocks.mutedIds = new Set(['muted-user']);
	});

	test('ミュートした利用者の件数だけをリアクション別に集計する', async () => {
		mocks.api.mockResolvedValueOnce([
			reaction('muted-user', ':wave:'),
			reaction('visible-user', ':wave:'),
			reaction('muted-user', ':star:'),
		]);
		const subject = await import('./muted-reactions.js');

		subject.requestMutedReactions('note-1', 3);

		await vi.waitFor(() => expect(subject.getMutedReactions('note-1', 3)).toEqual({
			delta: { ':wave:': 1, ':star:': 1 },
			hidden: 2,
			truncated: false,
		}));
	});

	test('通信結果が逆順に届いても古い件数で最新キャッシュを上書きしない', async () => {
		const older = deferred<unknown[]>();
		const newer = deferred<unknown[]>();
		mocks.api
			.mockImplementationOnce(() => older.promise)
			.mockImplementationOnce(() => newer.promise);
		const subject = await import('./muted-reactions.js');

		subject.requestMutedReactions('note-1', 1);
		subject.requestMutedReactions('note-1', 2);
		await vi.waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(2));

		newer.resolve([reaction('muted-user', ':new:')]);
		await vi.waitFor(() => expect(subject.getMutedReactions('note-1', 2)?.delta).toEqual({ ':new:': 1 }));

		older.resolve([]);
		await vi.waitFor(() => expect(subject.getMutedReactions('note-1', 2)?.delta).toEqual({ ':new:': 1 }));
		expect(subject.getMutedReactions('note-1', 1)).toBeUndefined();
	});

	test('取得失敗は空の確定結果にして同じ鍵で再要求を繰り返さない', async () => {
		vi.useFakeTimers();
		mocks.api.mockRejectedValue(new Error('network'));
		const subject = await import('./muted-reactions.js');

		subject.requestMutedReactions('note-1', 1);
		await vi.waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(1));
		expect(subject.getMutedReactions('note-1', 1)).toBeUndefined();

		await vi.advanceTimersByTimeAsync(1500);
		subject.requestMutedReactions('note-1', 1);
		await vi.waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(2));
		expect(subject.getMutedReactions('note-1', 1)).toBeUndefined();

		await vi.advanceTimersByTimeAsync(5000);
		subject.requestMutedReactions('note-1', 1);
		await vi.waitFor(() => expect(subject.getMutedReactions('note-1', 1)).toEqual({
			delta: {},
			hidden: 0,
			truncated: false,
		}));
		expect(mocks.api).toHaveBeenCalledTimes(3);
		vi.useRealTimers();
	});

	test('ミュート対象が0人なら通信せず空の確定結果を返す', async () => {
		mocks.hasMuted = false;
		const subject = await import('./muted-reactions.js');

		subject.requestMutedReactions('note-1', 4);

		expect(subject.getMutedReactions('note-1', 4)).toEqual({
			delta: {},
			hidden: 0,
			truncated: false,
		});
		expect(mocks.api).not.toHaveBeenCalled();
	});

	test('ミュート一覧の世代が変わると同じリアクション数でも再取得する', async () => {
		mocks.api.mockResolvedValue([]);
		const subject = await import('./muted-reactions.js');

		subject.requestMutedReactions('note-1', 2);
		await vi.waitFor(() => expect(subject.getMutedReactions('note-1', 2)).toBeDefined());
		mocks.revision.value++;
		expect(subject.getMutedReactions('note-1', 2)).toBeUndefined();

		subject.requestMutedReactions('note-1', 2);
		await vi.waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(2));
	});

	test('総数が同じ値へ戻ってもstream更新世代で古いリアクターを再利用しない', async () => {
		mocks.api
			.mockResolvedValueOnce([reaction('muted-user', ':old:')])
			.mockResolvedValueOnce([reaction('muted-user', ':new:')]);
		const subject = await import('./muted-reactions.js');

		subject.requestMutedReactions('note-1', 1);
		await vi.waitFor(() => expect(subject.getMutedReactions('note-1', 1)?.delta).toEqual({ ':old:': 1 }));

		subject.notifyMutedReactionSourceChanged('note-1');
		subject.requestMutedReactions('note-1', 1);
		await vi.waitFor(() => expect(subject.getMutedReactions('note-1', 1)?.delta).toEqual({ ':new:': 1 }));

		expect(mocks.api).toHaveBeenCalledTimes(2);
		expect(mocks.api).toHaveBeenNthCalledWith(2, 'notes/reactions', { noteId: 'note-1', limit: 100 });
	});

	test('polling集計は総数が同じでもリアクション種別の入れ替わりを検出する', async () => {
		const subject = await import('./muted-reactions.js');

		expect(subject.reactionCountsChanged({ ':old:': 1 }, { ':new:': 1 })).toBe(true);
		expect(subject.reactionCountsChanged({ ':same:': 2 }, { ':same:': 2 })).toBe(false);
	});

	test('pollingは同種同数の別actorも60秒ごとに再照合する', async () => {
		const subject = await import('./muted-reactions.js');

		expect(subject.shouldRevalidateMutedReactionActors('note-1', 100_000)).toBe(true);
		expect(subject.shouldRevalidateMutedReactionActors('note-1', 159_999)).toBe(false);
		expect(subject.shouldRevalidateMutedReactionActors('note-1', 160_000)).toBe(true);
	});

	test('別ノートの完了通知では失敗ノートの再試行待機を早送りしない', async () => {
		vi.useFakeTimers();
		mocks.api.mockImplementation((_endpoint, params) => params.noteId === 'failed-note'
			? Promise.reject(new Error('network'))
			: Promise.resolve([]));
		const subject = await import('./muted-reactions.js');

		subject.requestMutedReactions('failed-note', 1);
		subject.requestMutedReactions('successful-note', 1);
		await vi.waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(2));

		// successful-noteの完了でglobal revisionが変わった想定で再評価しても待機中は通信しない。
		subject.requestMutedReactions('failed-note', 1);
		await vi.advanceTimersByTimeAsync(1499);
		subject.requestMutedReactions('failed-note', 1);
		expect(mocks.api).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(1);
		subject.requestMutedReactions('failed-note', 1);
		await vi.waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(3));
		vi.useRealTimers();
	});
});
