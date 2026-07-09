/*
 * 旗鯖fork: Hatady の各エンティティ(本 / 学習ログ)を API レスポンス用に pack する。
 *   N+1 を避けるため packLogs は関連ユーザー・本をまとめて取得して埋める。
 *   表紙は保持せずタイトルから自動生成するため、pack では title/coverColorIndex を返すのみ。
 */

import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { HatadyBooksRepository, HatadyLogsRepository, HatadyReactionsRepository, HatadyCommentsRepository, HatadyFollowingsRepository, HatadyBookmarksRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { MiHatadyBook } from '@/models/HatadyBook.js';
import type { MiHatadyLog } from '@/models/HatadyLog.js';
import type { MiHatadyComment } from '@/models/HatadyComment.js';
import type { MiHatadyNotification } from '@/models/HatadyNotification.js';
import type { MiHatadyBookmark } from '@/models/HatadyBookmark.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { bindThis } from '@/decorators.js';

@Injectable()
export class HatadyEntityService {
	constructor(
		@Inject(DI.hatadyBooksRepository)
		private hatadyBooksRepository: HatadyBooksRepository,
		@Inject(DI.hatadyLogsRepository)
		private hatadyLogsRepository: HatadyLogsRepository,
		@Inject(DI.hatadyReactionsRepository)
		private hatadyReactionsRepository: HatadyReactionsRepository,
		@Inject(DI.hatadyCommentsRepository)
		private hatadyCommentsRepository: HatadyCommentsRepository,
		@Inject(DI.hatadyFollowingsRepository)
		private hatadyFollowingsRepository: HatadyFollowingsRepository,
		@Inject(DI.hatadyBookmarksRepository)
		private hatadyBookmarksRepository: HatadyBookmarksRepository,

		private userEntityService: UserEntityService,
	) {
	}

	@bindThis
	public packBookmark(bm: MiHatadyBookmark): Record<string, unknown> {
		return {
			id: bm.id,
			bookId: bm.bookId,
			page: bm.page,
			name: bm.name,
			color: bm.color,
			createdAt: bm.createdAt.toISOString(),
		};
	}

	// 対象(ログ/コメント)群のリアクションを1クエリで集計し、対象ID → { reactions: {絵文字:数}, myReaction } を返す。
	@bindThis
	private async aggregateReactions(
		kind: 'log' | 'comment',
		targetIds: string[],
		meId?: MiUser['id'] | null,
	): Promise<Map<string, { reactions: Record<string, number>; myReaction: string | null }>> {
		const out = new Map<string, { reactions: Record<string, number>; myReaction: string | null }>();
		for (const id of targetIds) out.set(id, { reactions: {}, myReaction: null });
		if (targetIds.length === 0) return out;

		const col = kind === 'log' ? 'logId' : 'commentId';
		const rows = await this.hatadyReactionsRepository.createQueryBuilder('r')
			.where(`r.${col} IN (:...ids)`, { ids: targetIds })
			.getMany();

		for (const r of rows) {
			const key = (kind === 'log' ? r.logId : r.commentId) as string;
			const entry = out.get(key);
			if (!entry) continue;
			entry.reactions[r.reaction] = (entry.reactions[r.reaction] ?? 0) + 1;
			if (meId && r.userId === meId) entry.myReaction = r.reaction;
		}
		return out;
	}

	@bindThis
	public packBook(book: MiHatadyBook): Record<string, unknown> {
		return {
			id: book.id,
			createdAt: book.createdAt.toISOString(),
			updatedAt: book.updatedAt.toISOString(),
			userId: book.userId,
			title: book.title,
			author: book.author,
			totalPages: book.totalPages,
			currentPage: book.currentPage,
			status: book.status,
			coverColorIndex: book.coverColorIndex,
			isFavorite: book.isFavorite,
			isRecommended: book.isRecommended,
			finishedAt: book.finishedAt ? book.finishedAt.toISOString() : null,
			// 進捗率(総ページ数がある時のみ)。
			progress: (book.totalPages && book.totalPages > 0)
				? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
				: null,
		};
	}

	@bindThis
	public async packBooks(books: MiHatadyBook[]): Promise<Record<string, unknown>[]> {
		if (books.length === 0) return [];
		// しおりを一括取得して本ごとに付与(本棚の「しおりが挟まっている」演出用)。
		const bmRows = await this.hatadyBookmarksRepository.createQueryBuilder('bm')
			.where('bm.bookId IN (:...ids)', { ids: books.map(b => b.id) })
			.orderBy('bm.page', 'ASC').getMany();
		const bmMap = new Map<string, MiHatadyBookmark[]>();
		for (const bm of bmRows) {
			const arr = bmMap.get(bm.bookId) ?? [];
			arr.push(bm);
			bmMap.set(bm.bookId, arr);
		}
		return books.map(b => ({
			...this.packBook(b),
			bookmarks: (bmMap.get(b.id) ?? []).map(bm => this.packBookmark(bm)),
		}));
	}

	// 旗鯖fork: 学習ログを一括 pack。N+1 解消のため:
	//   1. 投稿者ユーザーを packMany で一括取得
	//   2. 紐づく本を In() で 1 クエリにまとめて取得
	@bindThis
	public async packLogs(logs: MiHatadyLog[], me?: { id: MiUser['id'] } | null): Promise<Record<string, unknown>[]> {
		if (logs.length === 0) return [];

		// 1. ユーザーを一括 pack。
		const userIds = [...new Set(logs.map(l => l.userId))];
		const packedUsers = await this.userEntityService.packMany(userIds);
		const usersMap = new Map(packedUsers.map(u => [u.id, u]));

		// 2. 本を一括取得。
		const bookIds = [...new Set(logs.map(l => l.bookId).filter((x): x is string => x != null))];
		const booksMap = new Map<string, MiHatadyBook>();
		if (bookIds.length > 0) {
			const books = await this.hatadyBooksRepository.findBy({ id: In(bookIds) });
			for (const b of books) booksMap.set(b.id, b);
		}

		// 3. リアクションを一括集計。
		const reactionsMap = await this.aggregateReactions('log', logs.map(l => l.id), me?.id);

		return logs.map(log => {
			const book = log.bookId ? booksMap.get(log.bookId) : null;
			const rx = reactionsMap.get(log.id) ?? { reactions: {}, myReaction: null };
			return {
				id: log.id,
				createdAt: log.createdAt.toISOString(),
				studiedAt: log.studiedAt.toISOString(),
				userId: log.userId,
				user: usersMap.get(log.userId) ?? null,
				title: log.title,
				subject: log.subject,
				tag: log.tag,
				body: log.body,
				bookId: log.bookId,
				book: book ? this.packBook(book) : null,
				pageFrom: log.pageFrom,
				pageTo: log.pageTo,
				durationMinutes: log.durationMinutes,
				isPublic: log.isPublic,
				visibility: log.visibility,
				reactionsCount: log.reactionsCount,
				commentsCount: log.commentsCount,
				reactions: rx.reactions,
				myReaction: rx.myReaction,
				isMine: me ? log.userId === me.id : false,
			};
		});
	}

	// 旗鯖fork: コメント(会話ページの返信)を一括 pack。ユーザー・リアクションをまとめて取得。
	@bindThis
	public async packComments(comments: MiHatadyComment[], me?: { id: MiUser['id'] } | null): Promise<Record<string, unknown>[]> {
		if (comments.length === 0) return [];

		const userIds = [...new Set(comments.map(c => c.userId))];
		const packedUsers = await this.userEntityService.packMany(userIds);
		const usersMap = new Map(packedUsers.map(u => [u.id, u]));

		const reactionsMap = await this.aggregateReactions('comment', comments.map(c => c.id), me?.id);

		return comments.map(c => {
			const rx = reactionsMap.get(c.id) ?? { reactions: {}, myReaction: null };
			return {
				id: c.id,
				createdAt: c.createdAt.toISOString(),
				logId: c.logId,
				userId: c.userId,
				user: usersMap.get(c.userId) ?? null,
				replyId: c.replyId,
				text: c.text,
				reactionsCount: c.reactionsCount,
				reactions: rx.reactions,
				myReaction: rx.myReaction,
				isMine: me ? c.userId === me.id : false,
			};
		});
	}

	@bindThis
	public async packLog(log: MiHatadyLog, me?: { id: MiUser['id'] } | null): Promise<Record<string, unknown>> {
		const [packed] = await this.packLogs([log], me);
		return packed;
	}

	// 旗鯖fork(1h): 通知を一括 pack。通知者・関連ログのタイトル・関連コメント本文をまとめて埋める。
	//   viewerId(=受信者) を渡すと、フォロー通知に「フォロー返し済みか(isFollowingBack)」を付与する。
	@bindThis
	public async packNotifications(notifications: MiHatadyNotification[], viewerId?: MiUser['id'] | null): Promise<Record<string, unknown>[]> {
		if (notifications.length === 0) return [];

		const notifierIds = [...new Set(notifications.map(n => n.notifierId).filter((x): x is string => x != null))];
		const packedUsers = notifierIds.length > 0 ? await this.userEntityService.packMany(notifierIds) : [];
		const usersMap = new Map(packedUsers.map(u => [u.id, u]));

		// フォロー通知用: 受信者が通知者をフォローしているか(フォロー返し済みか)を一括判定。
		const followBackSet = new Set<string>();
		if (viewerId) {
			const followTargetIds = [...new Set(notifications.filter(n => n.type === 'follow' && n.notifierId).map(n => n.notifierId as string))];
			if (followTargetIds.length > 0) {
				const rows = await this.hatadyFollowingsRepository.createQueryBuilder('f')
					.where('f.followerId = :me', { me: viewerId })
					.andWhere('f.followeeId IN (:...ids)', { ids: followTargetIds })
					.getMany();
				for (const r of rows) followBackSet.add(r.followeeId);
			}
		}

		const logIds = [...new Set(notifications.map(n => n.logId).filter((x): x is string => x != null))];
		const logsMap = new Map<string, MiHatadyLog>();
		if (logIds.length > 0) {
			const logs = await this.hatadyLogsRepository.findBy({ id: In(logIds) });
			for (const l of logs) logsMap.set(l.id, l);
		}

		const commentIds = [...new Set(notifications.map(n => n.commentId).filter((x): x is string => x != null))];
		const commentsMap = new Map<string, MiHatadyComment>();
		if (commentIds.length > 0) {
			const comments = await this.hatadyCommentsRepository.findBy({ id: In(commentIds) });
			for (const c of comments) commentsMap.set(c.id, c);
		}

		return notifications.map(n => {
			const log = n.logId ? logsMap.get(n.logId) : null;
			const comment = n.commentId ? commentsMap.get(n.commentId) : null;
			return {
				id: n.id,
				createdAt: n.createdAt.toISOString(),
				type: n.type,
				isRead: n.isRead,
				user: n.notifierId ? (usersMap.get(n.notifierId) ?? null) : null,
				logId: n.logId,
				logTitle: log?.title ?? null,
				commentId: n.commentId,
				commentText: comment?.text ?? null,
				reaction: n.reaction,
				value: n.value,
				isFollowingBack: n.type === 'follow' && n.notifierId ? followBackSet.has(n.notifierId) : false,
			};
		});
	}
}
