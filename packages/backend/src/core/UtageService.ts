/*
 * 旗鯖fork: 宴(うたげ)判定サービス。
 *
 * 従来はフロント(MkNote.vue)のメモリ上だけで「15分逃げ切り成功 / 反応されたら失敗」を
 * 判定していたため、リロードや別端末で状態が揺れる問題があった
 * (例: 成功確定後に付いたリアクションをリロード後に観測して失敗扱いになる等)。
 *
 * 本サービスは判定結果を utage_session テーブルに永続化する:
 *   - onNoteCreated: ローカル かつ 本文に宴ワードを含むノートで running セッションを作成し、
 *     15分後に成功確定するジョブ(連合先には配送しない)を予約する。
 *   - onReaction:    expiresAt 前の反応(リアクション/リプライ/リノート)で failed に確定。
 *   - resolveExpired: ジョブ発火時、まだ running なら succeeded に確定。
 * いずれも running 以外には遷移させない不可逆ガードを持つ(成功優先・二重確定防止)。
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { NotesRepository, UtageSessionsRepository } from '@/models/_.js';
import type { MiNote } from '@/models/Note.js';
import type { MiUser } from '@/models/User.js';
import { IdService } from '@/core/IdService.js';
import { QueueService } from '@/core/QueueService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { AchievementService } from '@/core/AchievementService.js';
import { MemoryKVCache } from '@/misc/cache.js';
import { isUtageEligible } from '@/misc/utage.js';
import { bindThis } from '@/decorators.js';

// 反応時の安価な足切り専用。参加可否はMFMを解析して判定する。
const UTAGE_REGEX = /宴|うたげ|ぅたげ|utage/i;
const UTAGE_FLASH_MS = 15 * 60 * 1000; // 15分

@Injectable()
export class UtageService {
	// 旗鯖fork: onReaction はリアクション/リプライ/リノートの超高頻度イベントから呼ばれる。
	//   宴ワード正規表現で先に足切りしてはいるが、宴ワードが偶然マッチする「非セッションノート」への
	//   反応も多く、毎回 DB を引いている。ここを noteId → セッション有無のキャッシュで吸収する。
	//   - 値: true  → セッション存在(running か確定済かは DB を引いて再確認する)
	//   - 値: false → セッション無し(短期キャッシュ。onNoteCreated で true に上書き)
	//   TTL は宴セッションの典型継続時間より短め(5分)に設定し、見落とし時も次回再フェッチで回復可能。
	private readonly sessionExistsCache = new MemoryKVCache<boolean>(1000 * 60 * 5);

	constructor(
		@Inject(DI.utageSessionsRepository)
		private utageSessionsRepository: UtageSessionsRepository,

		private idService: IdService,
		private queueService: QueueService,
		private globalEventService: GlobalEventService,
		private achievementService: AchievementService,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,
	) {
	}

	// 本文(+CW)に宴ワードを部分一致で含むか
	@bindThis
	private isUtageText(note: { text?: string | null; cw?: string | null }): boolean {
		const t = `${note.text ?? ''} ${note.cw ?? ''}`;
		return UTAGE_REGEX.test(t);
	}

	// ノート作成時。ローカル かつ 宴ワードを含む公開ノートなら running セッションを作成。
	@bindThis
	public async onNoteCreated(note: MiNote, user: { id: MiUser['id']; host: MiUser['host'] }): Promise<void> {
		if (user.host != null) return; // ローカルユーザーのみ
		// ⚠️宴はLTL上のゲームなので、対象は LTL に載る public だけ。
		//   LTL は REST・ストリーミングとも visibility = 'public' しか流さない
		//   (notes/local-timeline.ts / stream/channels/local-timeline.ts)。
		//   home を含めていた頃は、LTLに出ないので誰にも邪魔されず15分を通過して
		//   成功が積み増しされ、HTLやプロフィールから反応が付けば阻止まで数えていた。
		if (!isUtageEligible(note)) return;

		// 旗鯖fork: note.createdAt カラムは廃止された(IDに生成時刻が埋め込まれている)ため、
		// ノートIDから生成時刻を復元する。従来の note.createdAt 参照は undefined となり
		// startedAt/expiresAt が Invalid Date になって insert が NOT NULL 制約で失敗していた。
		const startedAt = this.idService.parse(note.id).date;
		const expiresAt = new Date(startedAt.getTime() + UTAGE_FLASH_MS);

		try {
			await this.utageSessionsRepository.insert({
				id: this.idService.gen(),
				noteId: note.id,
				userId: user.id,
				startedAt,
				expiresAt,
				status: 'running',
				resolvedAt: null,
			});
			// 旗鯖fork: 直後の onReaction でキャッシュ参照されるよう「存在」を即時記録。
			this.sessionExistsCache.set(note.id, true);
		} catch (err) {
			// noteId は unique。二重作成(競合)は無視する。
			// それ以外の例外(制約違反・型エラー等)は握り潰さずログに出す(原因特定のため)。
			const msg = err instanceof Error ? err.message : String(err);
			if (!/duplicate key|unique/i.test(msg)) {
				console.error('[utage] onNoteCreated insert failed:', msg);
			}
			return;
		}

		// 作成後処理は非同期なので、挿入を待つ間の編集を見落とさない。
		// 既に編集されていた場合は、可視に戻された可能性もあるため開始を取り消す。
		const currentNote = await this.notesRepository.findOneBy({ id: note.id });
		if (currentNote == null) return;
		if (currentNote.updatedAt != null || !isUtageEligible(currentNote)) {
			await this.failConcealedSession(note);
			return;
		}

		// 成功確定ジョブを残り時間で予約(連合先には何も配送しない)
		const delay = Math.max(0, expiresAt.getTime() - Date.now());
		await this.queueService.createUtageResolveJob(note.id, delay);
	}

	// 挑戦中に宣言を隠したら失敗を確定し、あとで本文を戻しても復活させない。
	// 阻止者は付けず、他人の阻止回数・実績にも加算しない。
	@bindThis
	public async onNoteUpdated(previous: MiNote, updated: MiNote): Promise<void> {
		if (previous.userHost != null) return;
		if (!this.isUtageText(previous) && !this.isUtageText(updated)) return;
		if (isUtageEligible(previous) && isUtageEligible(updated)) return;
		await this.failConcealedSession(previous);
	}

	@bindThis
	private async failConcealedSession(note: Pick<MiNote, 'id' | 'userId'>): Promise<void> {
		const resolvedAt = new Date();
		const result = await this.utageSessionsRepository.update(
			// DB保存後に期限を跨いでも、まだ未確定なら隠蔽を取り消し扱いにする。
			{ noteId: note.id, status: 'running' },
			{ status: 'failed', resolvedAt },
		);
		if (result.affected && result.affected > 0) {
			this.publishStatus(note.id, note.userId, 'failed');
		}
	}

	// 反応(リアクション/リプライ/リノート)着弾時。expiresAt 前 かつ running なら failed に確定。
	// 高頻度イベントから呼ばれるため、まず宴ワードの有無で安価に足切りしてから DB を引く。
	@bindThis
	public async onReaction(
		note: { id: MiNote['id']; text?: string | null; cw?: string | null; userId: MiNote['userId']; userHost: MiUser['host'] },
		interruptedByUser: Pick<MiUser, 'id' | 'host'>,
	): Promise<void> {
		if (note.userHost != null) return; // ローカルノートのみが宴対象
		if (!this.isUtageText(note)) return; // 宴ノートでなければ DB を引かない

		// 旗鯖fork: 「セッションが存在しない」ノートIDをキャッシュしてリアクション流入を素早く弾く。
		//   宴ワードが偶然マッチしただけの過去ノートが多数派なので、ここの効果が大きい。
		if (this.sessionExistsCache.get(note.id) === false) return;

		const session = await this.utageSessionsRepository.findOneBy({ noteId: note.id });
		if (session == null) {
			// 次回以降のリアクションは DB を引かずに即 return できる。
			this.sessionExistsCache.set(note.id, false);
			return;
		}
		// 取得できたら true として残しておく(短 TTL なので running→失敗確定後も問題なし。
		// 楽観ロック update が affected=0 となり副作用は出ない)。
		this.sessionExistsCache.set(note.id, true);
		if (session.status !== 'running') return; // 確定済みは不可逆
		if (Date.now() >= session.expiresAt.getTime()) return; // 15分超の反応は成功を覆さない

		const resolvedAt = new Date();
		const elapsedMs = resolvedAt.getTime() - session.startedAt.getTime();
		const interruptedWithin5Seconds = interruptedByUser.id !== session.userId && elapsedMs >= 0 && elapsedMs <= 5000;
		const result = await this.utageSessionsRepository.update(
			{ noteId: note.id, status: 'running' }, // 楽観ロック: running の時だけ更新
			{ status: 'failed', resolvedAt, interruptedByUserId: interruptedByUser.id, interruptedWithin5Seconds },
		);
		if (result.affected && result.affected > 0) {
			this.publishStatus(session.noteId, session.userId, 'failed');
			if (interruptedByUser.host == null) {
				await this.achievementService.reconcileUtageAchievements(interruptedByUser.id, 'interruption').catch(err => {
					console.error('[utage] interruption achievement reconciliation failed:', err);
				});
			}
		}
	}

	// 成功確定ジョブの本体。15分経過時にまだ running なら succeeded に確定。
	@bindThis
	public async resolveExpired(noteId: MiNote['id']): Promise<void> {
		const session = await this.utageSessionsRepository.findOneBy({ noteId });
		if (session == null) return;
		if (session.status !== 'running') return;
		if (Date.now() < session.expiresAt.getTime()) return;

		// 適用前に開始した不可視の宴や、編集中のノートも成功させない。
		const note = await this.notesRepository.findOneBy({ id: noteId });
		const status = note != null && isUtageEligible(note) ? 'succeeded' : 'failed';

		const result = await this.utageSessionsRepository.update(
			{ noteId, status: 'running' },
			{ status, resolvedAt: new Date() },
		);
		if (result.affected && result.affected > 0) {
			this.publishStatus(session.noteId, session.userId, status);
			if (status === 'succeeded') await this.achievementService.reconcileUtageAchievements(session.userId, 'success').catch(err => {
				console.error('[utage] success achievement reconciliation failed:', err);
			});
		}
	}

	// 宴ステータス確定をノート購読チャンネル(noteStream:${id})に配信。
	// 宴ノートは public 限定のため visibleUserIds は空で問題ない。
	@bindThis
	private publishStatus(noteId: MiNote['id'], userId: MiNote['userId'], status: 'succeeded' | 'failed'): void {
		this.globalEventService.publishNoteStream(
			{ id: noteId, userId, visibility: 'public', visibleUserIds: [] } as unknown as MiNote,
			'utageStatusUpdated',
			{ status },
		);
	}
}
