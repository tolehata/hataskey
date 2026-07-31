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
  `notes/reactions` は **`allowGet: true` ＋ `cacheSec: 60`** なので **GET でキャッシュに乗る**。
  ⚠️だから素朴に叩いても毎回サーバーまで飛ぶわけではない。それでも:
  - ⚠️**ノート1件につき1リクエストまで**（種別ごとに分けない＝`type` を渡さない）
  - ⚠️**同時実行を絞る**（スクロールで一気に走らせない）
  - ⚠️**リアクション総数が変わるまで再取得しない**（キャッシュ鍵に総数を混ぜる）
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
import { misskeyApiGet } from '@/utility/misskey-api.js';
import { isMutedUser, isMutedUsersReady } from '@/utility/muted-users.js';

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
const waiting: (() => void)[] = [];
let running = 0;

/**
 * 新しい結果が入るたびに増える。
 * ⚠️購読側（MkReactionsViewer）はこれを watch に混ぜて、届いた時点で描き直す。
 */
export const mutedReactionsRevision = ref(0);

const cacheKeyOf = (noteId: string, reactionCount: number) => `${noteId}:${reactionCount}`;

/** ⚠️そもそも取りに行く価値があるか。ここで弾けるものは1回も通信しない。 */
function shouldFetch(reactionCount: number): boolean {
	if (reactionCount <= 0) return false;
	// ⚠️ミュートリストが未取得のうちは判断できない。取得後に revision が動いて再評価される。
	if (!isMutedUsersReady()) return false;
	return true;
}

function runNext(): void {
	if (running >= MAX_PARALLEL) return;
	const next = waiting.shift();
	if (!next) return;
	running++;
	next();
}

/**
 * 取得済みの結果を同期で読む。⚠️無ければ `undefined`（呼び出し側は素の件数を出す）。
 */
export function getMutedReactions(noteId: string, reactionCount: number): MutedReactionEntry | undefined {
	const hit = cache.get(noteId);
	return hit && hit.key === cacheKeyOf(noteId, reactionCount) ? hit : undefined;
}

/**
 * 必要なら取得を予約する。⚠️同じノートで多重に飛ばさない。⚠️戻り値は無い（結果は revision 経由で届く）。
 */
export function requestMutedReactions(noteId: string, reactionCount: number): void {
	if (!shouldFetch(reactionCount)) return;
	const key = cacheKeyOf(noteId, reactionCount);
	if (cache.get(noteId)?.key === key) return;
	if (inflight.has(key)) return;
	inflight.add(key);

	const task = async () => {
		try {
			const rows = await misskeyApiGet('notes/reactions', {
				noteId,
				limit: FETCH_LIMIT,
				// ⚠️総数を鍵に混ぜて、増減したときだけ取り直す（tooltip 側の `_cacheKey_` と同じ考え方）。
				_cacheKey_: reactionCount,
			}) as Misskey.entities.NoteReaction[];

			const delta: Record<string, number> = {};
			let hidden = 0;
			for (const row of rows) {
				const userId = row.user?.id;
				if (userId == null || !isMutedUser(userId)) continue;
				// ⚠️`type` は `:name@host:` 形式。チップ側の見出しと同じ文字列なのでそのまま使う。
				delta[row.type] = (delta[row.type] ?? 0) + 1;
				hidden++;
			}
			cache.set(noteId, { key, delta, hidden, truncated: rows.length >= FETCH_LIMIT });
			mutedReactionsRevision.value++;
		} catch {
			// ⚠️失敗しても素の件数を出すだけ。⚠️ここで例外を投げるとノートが描けなくなる。
			// ⚠️再取得は総数が動いたときに自然に起きる（ここでは何も記録しない）。
		} finally {
			inflight.delete(key);
			running--;
			runNext();
		}
	};

	waiting.push(() => { void task(); });
	runNext();
}

/** ミュートの設定が変わったときに呼ぶ。⚠️持っている結果は全部作り直す。 */
export function invalidateMutedReactions(): void {
	cache.clear();
	mutedReactionsRevision.value++;
}
