/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
旗鯖fork(#31): ミュートしたユーザーのリアクションを「チップごと」消すための共有ストア。

⚠️なぜ要るのか
  従来は `note.reactionAndUserPairCache` からミュート分を差し引いていたが、
  ⚠️**backend はこの項目をノート作成時のストリーム配信でしか返していない**
  （`withReactionAndUserPairCache: true` を渡すのは `NoteCreateService` だけ）。
  ⚠️つまりタイムラインでも詳細でも基本 `undefined` で、**差し引きがほぼ常に空振り**していた。
  ⚠️結果、「名前は隠れるがリアクション自体は出るので、誰が押したか察せる」状態だった。

⚠️取り方
  `notes/reactions` はログイン情報を含むPOSTで取得し、ノートの閲覧権限を確認する。
  通信量はこの共有ストアのキャッシュと同時実行数で抑える。
  - ⚠️**ノート1件につき1リクエストまで**（種別ごとに分けない＝`type` を渡さない）
  - ⚠️**同時実行を絞る**（スクロールで一気に走らせない）
  - ⚠️リアクションのstream更新世代が変わるまで再取得しない
  - ⚠️ミュートが空／設定が切のときは**1回も投げない**

⚠️限界（正直に）
  `limit` の上限が **100** なので、⚠️**リアクションが100件を超えるノートでは取りこぼす**。
  ⚠️取りこぼしたぶんは「消えないリアクション」として残る。0件にはできない。

⚠️**管理者・モデレーターのリアクションは隠さない**（2026-07-30 利用者の指示で確定）
  判定はすべて `isMutedUser()` 一本に通しており、⚠️**除外は取得元（`utility/muted-users.ts`）で
  1箇所だけ**行われている（`m.mutee.isAdmin || m.mutee.isModerator` ならミュート集合に入れない）。
  ⚠️**ここで独自に mute 判定を書かないこと。** 別経路で判定を書くと、この除外をすり抜けて
  管理者のリアクションまで隠れてしまう。⚠️ⓘ の件数も同じ集合から数えているので、
  管理者ぶんは「隠している件数」にも入らない（数と見た目が食い違わない）。

⚠️連合への影響は無い。ここでやっているのは**表示の間引き**だけで、
  保存内容・件数・配送（ActivityPub）には一切触らない。⚠️リモートや他クライアントからは従来どおり見える。
*/

import { ref } from 'vue';
import type * as Misskey from 'cherrypick-js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hasMutedUsers, isMutedUser, isMutedUsersReady, mutedUsersRevision } from '@/utility/muted-users.js';

/** `notes/reactions` の上限。⚠️これを超えるぶんは取りこぼす（endpoint 側の maximum: 100）。 */
const FETCH_LIMIT = 100;
/** ⚠️同時に走らせる数。スクロール時に何十本も同時に飛ばさないための蓋。 */
const MAX_PARALLEL = 4;

export type MutedReactionEntry = Readonly<{
	/** リアクションごとの「ミュートしたユーザーが押した数」。 */
	delta: Readonly<Record<string, number>>;
	/** 隠した総数。0なら ⓘ を出す必要がない。 */
	hidden: number;
	/** ⚠️取りこぼしの可能性があるか（総数が取得上限を超えていた）。 */
	truncated: boolean;
}>;

type CacheValue = MutedReactionEntry & { key: string };

const cache = new Map<string, CacheValue>();
const inflight = new Set<string>();
/** ノートごとに最後に要求された鍵。古い通信結果による後勝ちを防ぐ。 */
const latestKeyByNote = new Map<string, string>();
const noteRevisionById = new Map<string, number>();
const lastActorRefreshAtByNote = new Map<string, number>();
const failureAttempts = new Map<string, number>();
const retryTimers = new Map<string, number>();
const waiting: { key: string; noteId: string; generation: number; run: () => Promise<void> }[] = [];
let running = 0;
let generation = 0;

const RETRY_DELAYS_MS = [1500, 5000] as const;
const POLLING_ACTOR_REFRESH_MS = 60_000;

const EMPTY_ENTRY: MutedReactionEntry = Object.freeze({
	delta: Object.freeze({}),
	hidden: 0,
	truncated: false,
});

/**
 * 新しい結果が入るたびに増える。
 * ⚠️購読側（MkReactionsViewer）はこれを watch に混ぜて、届いた時点で描き直す。
 */
export const mutedReactionsRevision = ref(0);

const noteRevisionOf = (noteId: string) => noteRevisionById.get(noteId) ?? 0;
const cacheKeyOf = (noteId: string, reactionCount: number) => `${noteId}:${reactionCount}:${noteRevisionOf(noteId)}:${mutedUsersRevision.value}`;

/** pollingで受け取った集計が変わったかを、総数ではなく種別ごとの件数で比較する。 */
export function reactionCountsChanged(
	current: Readonly<Record<string, number>>,
	next: Readonly<Record<string, number>>,
): boolean {
	const currentKeys = Object.keys(current);
	const nextKeys = Object.keys(next);
	if (currentKeys.length !== nextKeys.length) return true;
	return nextKeys.some(key => current[key] !== next[key]);
}

/**
 * pollingの集計だけでは「同じ絵文字・同じ件数のまま反応者だけ交代」を検出できない。
 * activeなノートだけ、60秒間隔でリアクター詳細を再確認する。
 */
export function shouldRevalidateMutedReactionActors(noteId: string, now = Date.now()): boolean {
	const lastRefreshAt = lastActorRefreshAtByNote.get(noteId) ?? 0;
	if (now - lastRefreshAt < POLLING_ACTOR_REFRESH_MS) return false;
	lastActorRefreshAtByNote.set(noteId, now);
	return true;
}

/** ⚠️そもそも取りに行く価値があるか。ここで弾けるものは1回も通信しない。 */
function shouldFetch(reactionCount: number): boolean {
	if (reactionCount <= 0) return false;
	// ⚠️ミュートリストが未取得のうちは判断できない。取得後に revision が動いて再評価される。
	if (!isMutedUsersReady()) return false;
	return true;
}

function runNext(): void {
	while (running < MAX_PARALLEL) {
		const next = waiting.shift();
		if (!next) return;
		if (next.generation !== generation || latestKeyByNote.get(next.noteId) !== next.key) {
			inflight.delete(next.key);
			continue;
		}
		running++;
		void next.run().finally(() => {
			inflight.delete(next.key);
			running--;
			runNext();
		});
	}
}

function scheduleRetry(noteId: string, key: string, requestGeneration: number): boolean {
	const attempt = (failureAttempts.get(key) ?? 0) + 1;
	failureAttempts.set(key, attempt);
	if (attempt > RETRY_DELAYS_MS.length) return false;
	const delay = RETRY_DELAYS_MS[attempt - 1];
	const previous = retryTimers.get(key);
	if (previous != null) window.clearTimeout(previous);
	const timer = window.setTimeout(() => {
		retryTimers.delete(key);
		if (generation !== requestGeneration || latestKeyByNote.get(noteId) !== key) return;
		mutedReactionsRevision.value++;
	}, delay);
	retryTimers.set(key, timer);
	return true;
}

/**
 * 取得済みの結果を同期で読む。⚠️無ければ `undefined`（呼び出し側は直前の安定表示を保つ）。
 */
export function getMutedReactions(noteId: string, reactionCount: number): MutedReactionEntry | undefined {
	if (reactionCount <= 0) return EMPTY_ENTRY;
	if (!isMutedUsersReady()) return undefined;
	if (!hasMutedUsers()) return EMPTY_ENTRY;
	const hit = cache.get(noteId);
	return hit && hit.key === cacheKeyOf(noteId, reactionCount)
		? { delta: hit.delta, hidden: hit.hidden, truncated: hit.truncated }
		: undefined;
}

/**
 * 必要なら取得を予約する。⚠️同じノートで多重に飛ばさない。⚠️戻り値は無い（結果は revision 経由で届く）。
 */
export function requestMutedReactions(noteId: string, reactionCount: number): void {
	if (!shouldFetch(reactionCount)) return;
	const key = cacheKeyOf(noteId, reactionCount);
	latestKeyByNote.set(noteId, key);
	// ミュート対象が0人なら取得不要。getMutedReactions() が空の確定結果を返す。
	if (!hasMutedUsers()) return;
	if (cache.get(noteId)?.key === key) return;
	if (inflight.has(key)) return;
	// 失敗後の待機中は、ほかのノートがglobal revisionを進めても再試行を早送りしない。
	if (retryTimers.has(key)) return;
	inflight.add(key);
	lastActorRefreshAtByNote.set(noteId, Date.now());
	const requestGeneration = generation;

	const task = async () => {
		try {
			const rows = await misskeyApi('notes/reactions', {
				noteId,
				limit: FETCH_LIMIT,
			}) as Misskey.entities.NoteReaction[];

			const delta: Record<string, number> = {};
			let hidden = 0;
			for (const row of rows) {
				const userId = row.user.id;
				if (!isMutedUser(userId)) continue;
				// ⚠️`type` は `:name@host:` 形式。チップ側の見出しと同じ文字列なのでそのまま使う。
				delta[row.type] = (delta[row.type] ?? 0) + 1;
				hidden++;
			}
			if (requestGeneration === generation && latestKeyByNote.get(noteId) === key) {
				cache.set(noteId, { key, delta, hidden, truncated: rows.length >= FETCH_LIMIT });
				failureAttempts.delete(key);
				mutedReactionsRevision.value++;
			}
		} catch {
			if (requestGeneration === generation && latestKeyByNote.get(noteId) === key) {
				// 一時失敗では直前の安定表示を維持し、上限付きで再試行する。
				// 再試行を使い切った場合だけfail-openし、表示を永久に空にしない。
				if (!scheduleRetry(noteId, key, requestGeneration)) {
					cache.set(noteId, { key, ...EMPTY_ENTRY });
					mutedReactionsRevision.value++;
				}
			}
		}
	};

	waiting.push({ key, noteId, generation: requestGeneration, run: task });
	runNext();
}

/** streamでリアクター構成が変わったことを通知する（総数が同じ値へ戻る場合も区別する）。 */
export function notifyMutedReactionSourceChanged(noteId: string): void {
	noteRevisionById.set(noteId, noteRevisionOf(noteId) + 1);
	cache.delete(noteId);
	latestKeyByNote.delete(noteId);
	for (let i = waiting.length - 1; i >= 0; i--) {
		if (waiting[i].noteId !== noteId) continue;
		inflight.delete(waiting[i].key);
		waiting.splice(i, 1);
	}
}

/** ミュートの設定が変わったときに呼ぶ。⚠️持っている結果は全部作り直す。 */
export function invalidateMutedReactions(): void {
	generation++;
	cache.clear();
	latestKeyByNote.clear();
	noteRevisionById.clear();
	lastActorRefreshAtByNote.clear();
	failureAttempts.clear();
	for (const timer of retryTimers.values()) window.clearTimeout(timer);
	retryTimers.clear();
	for (const queued of waiting) inflight.delete(queued.key);
	waiting.length = 0;
	mutedReactionsRevision.value++;
}
