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
import type { UtageSessionsRepository } from '@/models/_.js';
import type { MiNote } from '@/models/Note.js';
import type { MiUser } from '@/models/User.js';
import { IdService } from '@/core/IdService.js';
import { QueueService } from '@/core/QueueService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { bindThis } from '@/decorators.js';

// フロント(MkNote.vue)と同一の判定基準
const UTAGE_REGEX = /宴|うたげ|ぅたげ|utage/i;
const UTAGE_FLASH_MS = 15 * 60 * 1000; // 15分

@Injectable()
export class UtageService {
	constructor(
		@Inject(DI.utageSessionsRepository)
		private utageSessionsRepository: UtageSessionsRepository,

		private idService: IdService,
		private queueService: QueueService,
		private globalEventService: GlobalEventService,
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
		if (note.visibility !== 'public' && note.visibility !== 'home') return; // LTLに乗る範囲
		if (!this.isUtageText(note)) return;

		const startedAt = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
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
		} catch (err) {
			// noteId は unique。二重作成(競合)は無視する。
			return;
		}

		// 成功確定ジョブを残り時間で予約(連合先には何も配送しない)
		const delay = Math.max(0, expiresAt.getTime() - Date.now());
		await this.queueService.createUtageResolveJob(note.id, delay);
	}

	// 反応(リアクション/リプライ/リノート)着弾時。expiresAt 前 かつ running なら failed に確定。
	// 高頻度イベントから呼ばれるため、まず宴ワードの有無で安価に足切りしてから DB を引く。
	@bindThis
	public async onReaction(note: { id: MiNote['id']; text?: string | null; cw?: string | null; userId: MiNote['userId']; userHost: MiUser['host'] }): Promise<void> {
		if (note.userHost != null) return; // ローカルノートのみが宴対象
		if (!this.isUtageText(note)) return; // 宴ノートでなければ DB を引かない

		const session = await this.utageSessionsRepository.findOneBy({ noteId: note.id });
		if (session == null) return;
		if (session.status !== 'running') return; // 確定済みは不可逆
		if (Date.now() >= session.expiresAt.getTime()) return; // 15分超の反応は成功を覆さない

		const result = await this.utageSessionsRepository.update(
			{ noteId: note.id, status: 'running' }, // 楽観ロック: running の時だけ更新
			{ status: 'failed', resolvedAt: new Date() },
		);
		if (result.affected && result.affected > 0) {
			this.publishStatus(session.noteId, session.userId, 'failed');
		}
	}

	// 成功確定ジョブの本体。15分経過時にまだ running なら succeeded に確定。
	@bindThis
	public async resolveExpired(noteId: MiNote['id']): Promise<void> {
		const session = await this.utageSessionsRepository.findOneBy({ noteId });
		if (session == null) return;
		if (session.status !== 'running') return;

		const result = await this.utageSessionsRepository.update(
			{ noteId, status: 'running' },
			{ status: 'succeeded', resolvedAt: new Date() },
		);
		if (result.affected && result.affected > 0) {
			this.publishStatus(session.noteId, session.userId, 'succeeded');
		}
	}

	// 宴ステータス確定をノート購読チャンネル(noteStream:${id})に配信。
	// 宴ノートは public/home 前提のため visibleUserIds は空で問題ない。
	@bindThis
	private publishStatus(noteId: MiNote['id'], userId: MiNote['userId'], status: 'succeeded' | 'failed'): void {
		this.globalEventService.publishNoteStream(
			{ id: noteId, userId, visibility: 'public', visibleUserIds: [] } as unknown as MiNote,
			'utageStatusUpdated',
			{ status },
		);
	}
}
