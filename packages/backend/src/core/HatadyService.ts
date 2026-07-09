/*
 * 旗鯖fork: Hatady(学習・読書記録)の中核ロジック。本・学習ログの作成、
 * ログに紐づく本の進捗(currentPage)更新、マイログ用の統計(連続日数・週間時間・
 * ヒートマップ・分野別フォーカス)の集計を担う。
 */

import { Inject, Injectable } from '@nestjs/common';
import { MoreThan } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { HatadyBooksRepository, HatadyLogsRepository, HatadyCommentsRepository, HatadyReactionsRepository, HatadyNotificationsRepository, HatadyFollowingsRepository, HatadyUserProfilesRepository, HatadyBookmarksRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { MiHatadyBook } from '@/models/HatadyBook.js';
import type { MiHatadyLog } from '@/models/HatadyLog.js';
import type { MiHatadyComment } from '@/models/HatadyComment.js';
import type { MiHatadyNotification } from '@/models/HatadyNotification.js';
import type { MiHatadyBookmark } from '@/models/HatadyBookmark.js';
import { IdService } from '@/core/IdService.js';
import { RoleService } from '@/core/RoleService.js';
import { bindThis } from '@/decorators.js';

@Injectable()
export class HatadyService {
	constructor(
		@Inject(DI.hatadyBooksRepository)
		private hatadyBooksRepository: HatadyBooksRepository,
		@Inject(DI.hatadyLogsRepository)
		private hatadyLogsRepository: HatadyLogsRepository,
		@Inject(DI.hatadyCommentsRepository)
		private hatadyCommentsRepository: HatadyCommentsRepository,
		@Inject(DI.hatadyReactionsRepository)
		private hatadyReactionsRepository: HatadyReactionsRepository,
		@Inject(DI.hatadyNotificationsRepository)
		private hatadyNotificationsRepository: HatadyNotificationsRepository,
		@Inject(DI.hatadyFollowingsRepository)
		private hatadyFollowingsRepository: HatadyFollowingsRepository,
		@Inject(DI.hatadyUserProfilesRepository)
		private hatadyUserProfilesRepository: HatadyUserProfilesRepository,
		@Inject(DI.hatadyBookmarksRepository)
		private hatadyBookmarksRepository: HatadyBookmarksRepository,

		private idService: IdService,
		private roleService: RoleService,
	) {
	}

	// ロール上限超過を表すエラーコード(エンドポイントで拾って ApiError に変換)。
	public static readonly ERR_BOOK_LIMIT = 'HATADY_BOOK_LIMIT';
	public static readonly ERR_BOOKMARK_LIMIT = 'HATADY_BOOKMARK_LIMIT';

	// ===== しおり(本の所有者のみ) =====

	@bindThis
	public async createBookmark(user: MiUser, params: { bookId: string; page: number; name?: string | null; color?: string | null }): Promise<MiHatadyBookmark> {
		const book = await this.hatadyBooksRepository.findOneBy({ id: params.bookId, userId: user.id });
		if (book == null) throw new Error('no such book or access denied');
		// ロールポリシー: 本1冊あたりのしおりの最大数。
		const policies = await this.roleService.getUserPolicies(user.id);
		const bmCount = await this.hatadyBookmarksRepository.countBy({ bookId: book.id });
		if (bmCount >= policies.hatadyBookmarkLimit) throw new Error(HatadyService.ERR_BOOKMARK_LIMIT);
		const now = new Date();
		return this.hatadyBookmarksRepository.insertOne({
			id: this.idService.gen(now.getTime()),
			createdAt: now,
			bookId: book.id,
			userId: user.id,
			page: Math.max(0, params.page ?? 0),
			name: params.name ?? null,
			color: params.color ?? null,
		});
	}

	@bindThis
	public async deleteBookmark(user: MiUser, bookmarkId: string): Promise<void> {
		const bm = await this.hatadyBookmarksRepository.findOneBy({ id: bookmarkId, userId: user.id });
		if (bm == null) return;
		await this.hatadyBookmarksRepository.delete(bm.id);
	}

	@bindThis
	public async getBookmarks(bookId: string): Promise<MiHatadyBookmark[]> {
		return this.hatadyBookmarksRepository.createQueryBuilder('bm')
			.where('bm.bookId = :bookId', { bookId })
			.orderBy('bm.page', 'ASC').addOrderBy('bm.id', 'ASC')
			.limit(100).getMany();
	}

	// 複数の本のしおりを一括取得(本棚のしおり演出用)。bookId → しおり配列。
	@bindThis
	public async getBookmarksForBooks(bookIds: string[]): Promise<Map<string, MiHatadyBookmark[]>> {
		const out = new Map<string, MiHatadyBookmark[]>();
		if (bookIds.length === 0) return out;
		const rows = await this.hatadyBookmarksRepository.createQueryBuilder('bm')
			.where('bm.bookId IN (:...ids)', { ids: bookIds })
			.orderBy('bm.page', 'ASC').getMany();
		for (const r of rows) {
			const arr = out.get(r.bookId) ?? [];
			arr.push(r);
			out.set(r.bookId, arr);
		}
		return out;
	}

	// ===== ユーザー個別設定(バナー色) =====

	@bindThis
	public async getBannerColor(userId: MiUser['id']): Promise<string | null> {
		const p = await this.hatadyUserProfilesRepository.findOneBy({ userId });
		return p?.bannerColor ?? null;
	}

	@bindThis
	public async setBannerColor(user: MiUser, color: string | null): Promise<void> {
		const now = new Date();
		const existing = await this.hatadyUserProfilesRepository.findOneBy({ userId: user.id });
		if (existing) {
			await this.hatadyUserProfilesRepository.update({ userId: user.id }, { bannerColor: color, updatedAt: now });
		} else {
			await this.hatadyUserProfilesRepository.insert({ userId: user.id, bannerColor: color, updatedAt: now });
		}
	}

	// ===== フォロー(Hatady 内で完結・hataskey 本体と非連動) =====

	@bindThis
	public async follow(follower: MiUser, followeeId: MiUser['id']): Promise<void> {
		if (follower.id === followeeId) throw new Error('cannot follow yourself');
		const existing = await this.hatadyFollowingsRepository.findOneBy({ followerId: follower.id, followeeId });
		if (existing) return;
		const now = new Date();
		await this.hatadyFollowingsRepository.insertOne({
			id: this.idService.gen(now.getTime()),
			createdAt: now,
			followerId: follower.id,
			followeeId,
		});
		await this.notify({ notifieeId: followeeId, notifierId: follower.id, type: 'follow' });
	}

	@bindThis
	public async unfollow(follower: MiUser, followeeId: MiUser['id']): Promise<void> {
		const existing = await this.hatadyFollowingsRepository.findOneBy({ followerId: follower.id, followeeId });
		if (existing == null) return;
		await this.hatadyFollowingsRepository.delete(existing.id);
	}

	@bindThis
	public async isFollowing(followerId: MiUser['id'], followeeId: MiUser['id']): Promise<boolean> {
		return (await this.hatadyFollowingsRepository.countBy({ followerId, followeeId })) > 0;
	}

	// フォロワーを外す(相手が自分をフォローしている関係を、通知なしで解除する)。
	@bindThis
	public async removeFollower(me: MiUser, followerId: MiUser['id']): Promise<void> {
		const existing = await this.hatadyFollowingsRepository.findOneBy({ followerId, followeeId: me.id });
		if (existing == null) return;
		await this.hatadyFollowingsRepository.delete(existing.id);
	}

	// プロフィール用の集計(統計 + 分野タグ)。自分以外は公開ログのみ対象。
	@bindThis
	public async getProfileAggregates(targetUserId: MiUser['id'], viewerId: MiUser['id']): Promise<{
		totalMinutes: number;
		streakDays: number;
		bookCount: number;
		logCount: number;
		fields: { strength: string[]; weak: string[]; interest: string[] };
		followersCount: number;
		followingCount: number;
		isFollowing: boolean;
		isMe: boolean;
		bannerColor: string | null;
	}> {
		const isMe = targetUserId === viewerId;

		const logQuery = this.hatadyLogsRepository.createQueryBuilder('log').where('log.userId = :uid', { uid: targetUserId });
		if (!isMe) logQuery.andWhere('log.isPublic = TRUE');
		const logs = await logQuery.getMany();

		const totalMinutes = logs.reduce((a, l) => a + (l.durationMinutes || 0), 0);
		const bookCount = await this.hatadyBooksRepository.countBy({ userId: targetUserId });

		// 連続日数(記録がある日を遡って数える)。
		const dayKey = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
		const daySet = new Set(logs.map(l => dayKey(new Date(l.studiedAt))));
		let streakDays = 0;
		const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
		if (!daySet.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
		while (daySet.has(dayKey(cursor))) { streakDays += 1; cursor.setDate(cursor.getDate() - 1); }

		// 分野タグ(得意/苦手/興味)を tag ごとに集計し、頻度順に distinct subject を返す。
		const buckets: Record<'strength' | 'weak' | 'interest', Map<string, number>> = {
			strength: new Map(), weak: new Map(), interest: new Map(),
		};
		for (const l of logs) {
			if (l.tag === 'strength' || l.tag === 'weak' || l.tag === 'interest') {
				const m = buckets[l.tag];
				m.set(l.subject, (m.get(l.subject) ?? 0) + 1);
			}
		}
		const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]);

		const [followersCount, followingCount, isFollowing, bannerColor] = await Promise.all([
			this.hatadyFollowingsRepository.countBy({ followeeId: targetUserId }),
			this.hatadyFollowingsRepository.countBy({ followerId: targetUserId }),
			isMe ? Promise.resolve(false) : this.isFollowing(viewerId, targetUserId),
			this.getBannerColor(targetUserId),
		]);

		return {
			totalMinutes,
			streakDays,
			bookCount,
			logCount: logs.length,
			fields: { strength: top(buckets.strength), weak: top(buckets.weak), interest: top(buckets.interest) },
			followersCount,
			followingCount,
			isFollowing,
			isMe,
			bannerColor,
		};
	}

	// プロフィール本棚: 対象ユーザーの本を新しい順に取得。
	@bindThis
	public async getUserBooks(targetUserId: MiUser['id'], limit: number): Promise<MiHatadyBook[]> {
		return this.hatadyBooksRepository.createQueryBuilder('b')
			.where('b.userId = :uid', { uid: targetUserId })
			.orderBy('b.id', 'DESC')
			.limit(limit)
			.getMany();
	}

	// ===== 本の詳細 / 編集 / 削除(本人のみ) =====

	@bindThis
	public async getBook(bookId: MiHatadyBook['id']): Promise<MiHatadyBook | null> {
		return this.hatadyBooksRepository.findOneBy({ id: bookId });
	}

	// 本に紐づくログを新しい順に取得。自分=全部 / フォロワー=公開+フォロワー限定 / それ以外=公開のみ。
	@bindThis
	public async getBookLogs(bookId: MiHatadyBook['id'], viewerId: MiUser['id'], ownerId: MiUser['id'], limit: number): Promise<MiHatadyLog[]> {
		const q = this.hatadyLogsRepository.createQueryBuilder('log').where('log.bookId = :bookId', { bookId });
		if (viewerId !== ownerId) {
			const viewerFollows = await this.isFollowing(viewerId, ownerId);
			if (viewerFollows) q.andWhere('log.visibility IN (:...vis)', { vis: ['public', 'followers'] });
			else q.andWhere('log.isPublic = TRUE');
		}
		return q.orderBy('log.studiedAt', 'DESC').addOrderBy('log.id', 'DESC').limit(limit).getMany();
	}

	@bindThis
	public async updateBook(user: MiUser, bookId: MiHatadyBook['id'], patch: {
		title?: string;
		author?: string | null;
		totalPages?: number | null;
		currentPage?: number;
		status?: string;
		coverColorIndex?: number | null;
		isFavorite?: boolean;
		isRecommended?: boolean;
	}): Promise<MiHatadyBook> {
		const book = await this.hatadyBooksRepository.findOneBy({ id: bookId, userId: user.id });
		if (book == null) throw new Error('no such book or access denied');
		const now = new Date();
		const set: Record<string, unknown> = { updatedAt: now };
		if (patch.title != null) set.title = patch.title;
		if (patch.author !== undefined) set.author = patch.author;
		if (patch.totalPages !== undefined) set.totalPages = patch.totalPages;
		if (patch.currentPage != null) set.currentPage = Math.max(0, patch.currentPage);
		if (patch.status === 'reading' || patch.status === 'finished' || patch.status === 'want') {
			set.status = patch.status;
			// 読了日: finished になったら記録(未設定時)、finished から外れたらクリア。
			if (patch.status === 'finished') { if (book.finishedAt == null) set.finishedAt = now; } else set.finishedAt = null;
		}
		if (patch.coverColorIndex !== undefined) set.coverColorIndex = patch.coverColorIndex;
		if (patch.isFavorite !== undefined) set.isFavorite = patch.isFavorite;
		if (patch.isRecommended !== undefined) set.isRecommended = patch.isRecommended;
		await this.hatadyBooksRepository.update(book.id, set);
		return await this.hatadyBooksRepository.findOneByOrFail({ id: book.id });
	}

	@bindThis
	public async deleteBook(user: MiUser, bookId: MiHatadyBook['id']): Promise<void> {
		const book = await this.hatadyBooksRepository.findOneBy({ id: bookId, userId: user.id });
		if (book == null) throw new Error('no such book or access denied');
		// ログの bookId は FK の ON DELETE SET NULL で自動的に外れる。
		await this.hatadyBooksRepository.delete(book.id);
	}

	// モデレーター/管理者による強制削除(所有者を問わない。呼び出し側で権限チェック済みであること)。
	@bindThis
	public async forceDeleteBook(bookId: MiHatadyBook['id']): Promise<void> {
		await this.hatadyBooksRepository.delete(bookId);
	}

	// プロフィール用: 対象ユーザーのログを新しい順に取得。
	//   自分=全ログ / フォロワー(=viewerがtargetをフォロー)=公開+フォロワー限定 / それ以外=公開のみ。
	@bindThis
	public async getUserLogs(targetUserId: MiUser['id'], viewerId: MiUser['id'], limit: number): Promise<MiHatadyLog[]> {
		const q = this.hatadyLogsRepository.createQueryBuilder('log').where('log.userId = :uid', { uid: targetUserId });
		if (targetUserId !== viewerId) {
			const viewerFollows = await this.isFollowing(viewerId, targetUserId);
			if (viewerFollows) q.andWhere('log.visibility IN (:...vis)', { vis: ['public', 'followers'] });
			else q.andWhere('log.isPublic = TRUE');
		}
		return q.orderBy('log.studiedAt', 'DESC').addOrderBy('log.id', 'DESC').limit(limit).getMany();
	}

	// フォロー中 / フォロワーのユーザーID一覧(新しい順)。
	@bindThis
	public async getFollowingUserIds(userId: MiUser['id'], limit = 100): Promise<MiUser['id'][]> {
		const rows = await this.hatadyFollowingsRepository.createQueryBuilder('f')
			.where('f.followerId = :uid', { uid: userId })
			.orderBy('f.id', 'DESC').limit(limit).getMany();
		return rows.map(r => r.followeeId);
	}

	@bindThis
	public async getFollowerUserIds(userId: MiUser['id'], limit = 100): Promise<MiUser['id'][]> {
		const rows = await this.hatadyFollowingsRepository.createQueryBuilder('f')
			.where('f.followeeId = :uid', { uid: userId })
			.orderBy('f.id', 'DESC').limit(limit).getMany();
		return rows.map(r => r.followerId);
	}

	// フォロー中タイムライン: 自分がフォローしているユーザーのログ(公開 or フォロワー限定)を新しい順に。
	@bindThis
	public async getFollowingTimeline(viewerId: MiUser['id'], opts: { limit: number; untilId?: string | null; subject?: string | null }): Promise<MiHatadyLog[]> {
		const followeeIds = await this.getFollowingUserIds(viewerId, 1000);
		if (followeeIds.length === 0) return [];
		const q = this.hatadyLogsRepository.createQueryBuilder('log')
			.where('log.userId IN (:...ids)', { ids: followeeIds })
			.andWhere('log.visibility IN (:...vis)', { vis: ['public', 'followers'] });
		if (opts.subject != null) q.andWhere('log.subject = :subject', { subject: opts.subject });
		if (opts.untilId != null) q.andWhere('log.id < :untilId', { untilId: opts.untilId });
		return q.orderBy('log.studiedAt', 'DESC').addOrderBy('log.id', 'DESC').limit(opts.limit).getMany();
	}

	// ===== 学習ログの編集 / 削除(本人のみ) =====

	@bindThis
	public async updateLog(user: MiUser, logId: MiHatadyLog['id'], patch: {
		title?: string;
		subject?: string;
		tag?: string | null;
		body?: string | null;
		durationMinutes?: number;
		isPublic?: boolean;
		visibility?: string;
	}): Promise<MiHatadyLog> {
		const log = await this.hatadyLogsRepository.findOneBy({ id: logId });
		if (log == null || log.userId !== user.id) throw new Error('no such log or access denied');
		const set: Record<string, unknown> = {};
		if (patch.title != null) set.title = patch.title;
		if (patch.subject != null) set.subject = patch.subject;
		if (patch.tag !== undefined) set.tag = patch.tag;
		if (patch.body !== undefined) set.body = patch.body;
		if (patch.durationMinutes != null) set.durationMinutes = patch.durationMinutes;
		// 公開範囲: visibility 優先。isPublic も同期する。
		if (patch.visibility === 'public' || patch.visibility === 'followers' || patch.visibility === 'private') {
			set.visibility = patch.visibility;
			set.isPublic = patch.visibility === 'public';
		} else if (patch.isPublic != null) {
			set.isPublic = patch.isPublic;
			set.visibility = patch.isPublic ? 'public' : 'private';
		}
		if (Object.keys(set).length > 0) await this.hatadyLogsRepository.update(log.id, set);
		return await this.hatadyLogsRepository.findOneByOrFail({ id: log.id });
	}

	@bindThis
	public async deleteLog(user: MiUser, logId: MiHatadyLog['id']): Promise<void> {
		const log = await this.hatadyLogsRepository.findOneBy({ id: logId });
		if (log == null || log.userId !== user.id) throw new Error('no such log or access denied');
		// リアクション/コメント/通知は FK の ON DELETE CASCADE で自動削除される。
		await this.hatadyLogsRepository.delete(log.id);
	}

	// 通知を1件作成する(受信者=発生者 の自己通知は作らない)。
	@bindThis
	private async notify(params: {
		notifieeId: MiUser['id'];
		notifierId: MiUser['id'] | null;
		type: string;
		logId?: string | null;
		commentId?: string | null;
		reaction?: string | null;
		value?: number | null;
	}): Promise<void> {
		if (params.notifierId && params.notifieeId === params.notifierId) return;
		const now = new Date();
		await this.hatadyNotificationsRepository.insertOne({
			id: this.idService.gen(now.getTime()),
			createdAt: now,
			notifieeId: params.notifieeId,
			notifierId: params.notifierId ?? null,
			type: params.type,
			logId: params.logId ?? null,
			commentId: params.commentId ?? null,
			reaction: params.reaction ?? null,
			value: params.value ?? null,
			isRead: false,
		});
	}

	// ===== 通知の取得/既読 =====

	@bindThis
	public async getNotifications(userId: MiUser['id'], opts: { limit: number; untilId?: string | null }): Promise<MiHatadyNotification[]> {
		const q = this.hatadyNotificationsRepository.createQueryBuilder('n')
			.where('n.notifieeId = :userId', { userId });
		if (opts.untilId) q.andWhere('n.id < :untilId', { untilId: opts.untilId });
		return q.orderBy('n.createdAt', 'DESC').limit(opts.limit).getMany();
	}

	@bindThis
	public async getUnreadNotificationCount(userId: MiUser['id']): Promise<number> {
		return this.hatadyNotificationsRepository.countBy({ notifieeId: userId, isRead: false });
	}

	@bindThis
	public async markAllNotificationsRead(userId: MiUser['id']): Promise<void> {
		await this.hatadyNotificationsRepository.update({ notifieeId: userId, isRead: false }, { isRead: true });
	}

	@bindThis
	public async createBook(user: MiUser, params: {
		title: string;
		author?: string | null;
		totalPages?: number | null;
		status?: string;
		coverColorIndex?: number | null;
	}): Promise<MiHatadyBook> {
		// ロールポリシー: 追加できる本の最大数。
		const policies = await this.roleService.getUserPolicies(user.id);
		const bookCount = await this.hatadyBooksRepository.countBy({ userId: user.id });
		if (bookCount >= policies.hatadyBookLimit) throw new Error(HatadyService.ERR_BOOK_LIMIT);

		const now = new Date();
		const book = await this.hatadyBooksRepository.insertOne({
			id: this.idService.gen(now.getTime()),
			createdAt: now,
			updatedAt: now,
			userId: user.id,
			title: params.title,
			author: params.author ?? null,
			totalPages: params.totalPages ?? null,
			currentPage: 0,
			status: params.status ?? 'reading',
			coverColorIndex: params.coverColorIndex ?? null,
			finishedAt: params.status === 'finished' ? now : null,
		});
		return book;
	}

	@bindThis
	public async createLog(user: MiUser, params: {
		title: string;
		subject: string;
		tag?: string | null;
		body?: string | null;
		bookId?: string | null;
		pageFrom?: number | null;
		pageTo?: number | null;
		durationMinutes?: number;
		studiedAt?: Date | null;
		isPublic?: boolean;
		visibility?: string;
	}): Promise<MiHatadyLog> {
		const now = new Date();
		const studiedAt = params.studiedAt ?? now;
		// 公開範囲: visibility 優先。無ければ isPublic から導出(後方互換)。
		const visibility = (params.visibility === 'public' || params.visibility === 'followers' || params.visibility === 'private')
			? params.visibility
			: (params.isPublic ? 'public' : 'private');
		const isPublic = visibility === 'public';

		// 本が指定されていれば所有権を確認し、進捗(currentPage)を pageTo で更新する。
		let bookId: string | null = null;
		if (params.bookId) {
			const book = await this.hatadyBooksRepository.findOneBy({ id: params.bookId, userId: user.id });
			if (book) {
				bookId = book.id;
				if (params.pageTo != null && params.pageTo > book.currentPage) {
					await this.hatadyBooksRepository.update(book.id, { currentPage: params.pageTo, updatedAt: now });
				}
			}
		}

		const log = await this.hatadyLogsRepository.insertOne({
			id: this.idService.gen(now.getTime()),
			createdAt: now,
			studiedAt,
			userId: user.id,
			title: params.title,
			subject: params.subject,
			tag: params.tag ?? null,
			body: params.body ?? null,
			bookId,
			pageFrom: params.pageFrom ?? null,
			pageTo: params.pageTo ?? null,
			durationMinutes: params.durationMinutes ?? 0,
			isPublic,
			visibility,
			reactionsCount: 0,
			commentsCount: 0,
		});

		// 継続・達成(マイルストーン)通知の判定。
		await this.maybeNotifyMilestone(user);

		return log;
	}

	// 連続記録日数を計算する(今日/昨日から遡って連続で記録がある日数)。
	@bindThis
	private async computeStreak(userId: MiUser['id']): Promise<number> {
		const since = new Date();
		since.setHours(0, 0, 0, 0);
		since.setDate(since.getDate() - 400);
		const logs = await this.hatadyLogsRepository.createQueryBuilder('log')
			.select('log.studiedAt', 'studiedAt')
			.where('log.userId = :uid', { uid: userId })
			.andWhere('log.studiedAt > :since', { since })
			.getRawMany();
		const dayKey = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
		const daySet = new Set(logs.map(r => dayKey(new Date(r.studiedAt))));
		let streak = 0;
		const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
		if (!daySet.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
		while (daySet.has(dayKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
		return streak;
	}

	// 連続記録が節目(3/7/14/30/50/100/200/365日)に達したら1回だけ達成通知を出す。
	private static readonly MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
	@bindThis
	private async maybeNotifyMilestone(user: MiUser): Promise<void> {
		const streak = await this.computeStreak(user.id);
		if (streak <= 0) return;
		for (const m of HatadyService.MILESTONES) {
			if (m > streak) break;
			// その節目の達成通知が未発行なら発行(値が同じものが無ければ)。
			const already = await this.hatadyNotificationsRepository.countBy({ notifieeId: user.id, type: 'milestone', value: m });
			if (already === 0) {
				await this.notify({ notifieeId: user.id, notifierId: null, type: 'milestone', value: m });
			}
		}
	}

	// 旗鯖fork: マイログのヘッダ統計 + ヒートマップ + 分野別フォーカスを集計する。
	//   直近140日(20週)分のログを1回取得し、JS 側で集計する(件数が限られるため十分)。
	@bindThis
	public async getStats(userId: MiUser['id']): Promise<{
		streakDays: number;
		recordedToday: boolean;
		weeklyMinutes: number;
		weeklySessions: number;
		totalLogs: number;
		totalBooks: number;
		heatmap: { date: string; minutes: number; count: number }[];
		focusBySubject: { subject: string; minutes: number }[];
	}> {
		const DAYS = 140;
		const since = new Date();
		since.setHours(0, 0, 0, 0);
		since.setDate(since.getDate() - (DAYS - 1));

		const logs = await this.hatadyLogsRepository.findBy({
			userId,
			studiedAt: MoreThan(since),
		});

		const totalLogs = await this.hatadyLogsRepository.countBy({ userId });
		const totalBooks = await this.hatadyBooksRepository.countBy({ userId });

		// 日付キー(ローカル日付) → { minutes, count }
		const dayKey = (d: Date) => {
			const y = d.getFullYear();
			const m = (d.getMonth() + 1).toString().padStart(2, '0');
			const day = d.getDate().toString().padStart(2, '0');
			return `${y}-${m}-${day}`;
		};
		const byDay = new Map<string, { minutes: number; count: number }>();
		for (const log of logs) {
			const k = dayKey(new Date(log.studiedAt));
			const cur = byDay.get(k) ?? { minutes: 0, count: 0 };
			cur.minutes += log.durationMinutes;
			cur.count += 1;
			byDay.set(k, cur);
		}

		// ヒートマップ(140日分、古い順)。
		const heatmap: { date: string; minutes: number; count: number }[] = [];
		for (let i = 0; i < DAYS; i++) {
			const d = new Date(since);
			d.setDate(since.getDate() + i);
			const k = dayKey(d);
			const v = byDay.get(k) ?? { minutes: 0, count: 0 };
			heatmap.push({ date: k, minutes: v.minutes, count: v.count });
		}

		// 連続日数(今日または昨日から遡って連続で記録がある日数)。
		let streakDays = 0;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const recordedToday = byDay.has(dayKey(today));
		// 今日に記録が無ければ昨日から数える(その日の途中でも途切れ扱いにしない)。
		let cursor = new Date(today);
		if (!byDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
		while (byDay.has(dayKey(cursor))) {
			streakDays += 1;
			cursor.setDate(cursor.getDate() - 1);
		}

		// 今週(過去7日)の時間・セッション・分野別フォーカス。
		const weekAgo = new Date(today);
		weekAgo.setDate(today.getDate() - 6);
		let weeklyMinutes = 0;
		let weeklySessions = 0;
		const subjectMinutes = new Map<string, number>();
		for (const log of logs) {
			const d = new Date(log.studiedAt);
			d.setHours(0, 0, 0, 0);
			if (d >= weekAgo) {
				weeklyMinutes += log.durationMinutes;
				weeklySessions += 1;
				subjectMinutes.set(log.subject, (subjectMinutes.get(log.subject) ?? 0) + log.durationMinutes);
			}
		}
		const focusBySubject = [...subjectMinutes.entries()]
			.map(([subject, minutes]) => ({ subject, minutes }))
			.sort((a, b) => b.minutes - a.minutes)
			.slice(0, 6);

		return { streakDays, recordedToday, weeklyMinutes, weeklySessions, totalLogs, totalBooks, heatmap, focusBySubject };
	}

	// ===== 会話(コメント) =====

	@bindThis
	public async getLog(logId: MiHatadyLog['id']): Promise<MiHatadyLog | null> {
		return this.hatadyLogsRepository.findOneBy({ id: logId });
	}

	// ログを閲覧できるか: 公開 or 本人 or (フォロワー限定 かつ 閲覧者がフォロー中)。
	@bindThis
	public async canViewLog(log: MiHatadyLog, viewerId: MiUser['id']): Promise<boolean> {
		if (log.isPublic) return true;
		if (log.userId === viewerId) return true;
		if (log.visibility === 'followers') return this.isFollowing(viewerId, log.userId);
		return false;
	}

	// 公開ログのみコメント可(自分のログは非公開でも可)。存在/権限チェックを行う。
	@bindThis
	public async createComment(user: MiUser, params: {
		logId: MiHatadyLog['id'];
		replyId?: MiHatadyComment['id'] | null;
		text: string;
	}): Promise<MiHatadyComment> {
		const log = await this.hatadyLogsRepository.findOneBy({ id: params.logId });
		if (log == null) throw new Error('no such log');
		if (!(await this.canViewLog(log, user.id))) throw new Error('access denied');

		// 返信先が指定されていれば、同じログのコメントであることを確認する。
		let replyId: string | null = null;
		if (params.replyId) {
			const parent = await this.hatadyCommentsRepository.findOneBy({ id: params.replyId, logId: params.logId });
			if (parent) replyId = parent.id;
		}

		const now = new Date();
		const comment = await this.hatadyCommentsRepository.insertOne({
			id: this.idService.gen(now.getTime()),
			createdAt: now,
			logId: log.id,
			userId: user.id,
			replyId,
			text: params.text,
			reactionsCount: 0,
		});

		// 非正規化コメント数を更新。
		const count = await this.hatadyCommentsRepository.countBy({ logId: log.id });
		await this.hatadyLogsRepository.update(log.id, { commentsCount: count });

		// 通知: ログの所有者へ。返信先がある場合は親コメントの投稿者へも(重複回避)。
		await this.notify({ notifieeId: log.userId, notifierId: user.id, type: 'comment', logId: log.id, commentId: comment.id });
		if (replyId) {
			const parent = await this.hatadyCommentsRepository.findOneBy({ id: replyId });
			if (parent && parent.userId !== log.userId) {
				await this.notify({ notifieeId: parent.userId, notifierId: user.id, type: 'comment', logId: log.id, commentId: comment.id });
			}
		}

		return comment;
	}

	@bindThis
	public async getComments(logId: MiHatadyLog['id']): Promise<MiHatadyComment[]> {
		return this.hatadyCommentsRepository.createQueryBuilder('c')
			.where('c.logId = :logId', { logId })
			.orderBy('c.createdAt', 'ASC')
			.limit(200)
			.getMany();
	}

	// ===== リアクション(hataskey 共通の絵文字ピッカーから来た reaction 文字列を保存) =====

	// 対象は logId か commentId のどちらか。既にリアクション済みなら内容を更新(1ユーザー1対象1つ)。
	@bindThis
	public async react(user: MiUser, target: { logId?: string | null; commentId?: string | null }, reaction: string): Promise<void> {
		const reactionStr = reaction.trim().slice(0, 260);
		if (reactionStr.length === 0) throw new Error('empty reaction');

		const where = target.commentId
			? { userId: user.id, commentId: target.commentId }
			: { userId: user.id, logId: target.logId };

		const existing = await this.hatadyReactionsRepository.findOneBy(where);
		if (existing) {
			// 同じ絵文字の再指定は何もしない。付け替え(絵文字変更)時は通知を送る。
			if (existing.reaction === reactionStr) return;
			await this.hatadyReactionsRepository.update(existing.id, { reaction: reactionStr, createdAt: new Date() });
		} else {
			const now = new Date();
			await this.hatadyReactionsRepository.insertOne({
				id: this.idService.gen(now.getTime()),
				createdAt: now,
				userId: user.id,
				logId: target.commentId ? null : (target.logId ?? null),
				commentId: target.commentId ?? null,
				reaction: reactionStr,
			});
			await this.refreshReactionCount(target);
		}

		// 通知: 対象の所有者へ(新規付与・付け替えの両方)。
		if (target.commentId) {
			const comment = await this.hatadyCommentsRepository.findOneBy({ id: target.commentId });
			if (comment) await this.notify({ notifieeId: comment.userId, notifierId: user.id, type: 'reaction', logId: comment.logId, commentId: comment.id, reaction: reactionStr });
		} else if (target.logId) {
			const log = await this.hatadyLogsRepository.findOneBy({ id: target.logId });
			if (log) await this.notify({ notifieeId: log.userId, notifierId: user.id, type: 'reaction', logId: log.id, reaction: reactionStr });
		}
	}

	@bindThis
	public async unreact(user: MiUser, target: { logId?: string | null; commentId?: string | null }): Promise<void> {
		const where = target.commentId
			? { userId: user.id, commentId: target.commentId }
			: { userId: user.id, logId: target.logId };
		const existing = await this.hatadyReactionsRepository.findOneBy(where);
		if (existing == null) return;
		await this.hatadyReactionsRepository.delete(existing.id);
		await this.refreshReactionCount(target);
	}

	// 対象の非正規化リアクション数を再計算する。
	@bindThis
	private async refreshReactionCount(target: { logId?: string | null; commentId?: string | null }): Promise<void> {
		if (target.commentId) {
			const count = await this.hatadyReactionsRepository.countBy({ commentId: target.commentId });
			await this.hatadyCommentsRepository.update(target.commentId, { reactionsCount: count });
		} else if (target.logId) {
			const count = await this.hatadyReactionsRepository.countBy({ logId: target.logId });
			await this.hatadyLogsRepository.update(target.logId, { reactionsCount: count });
		}
	}
}
