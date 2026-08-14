/*
 * 旗鯖fork: Hatady(学習・読書記録)の中核ロジック。本・学習ログの作成、
 * ログに紐づく本の進捗(currentPage)更新、マイログ用の統計(連続日数・週間時間・
 * ヒートマップ・分野別フォーカス)の集計を担う。
 */

import { Inject, Injectable } from '@nestjs/common';
import { MoreThan } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { HatadyBooksRepository, HatadyLogsRepository, HatadyCommentsRepository, HatadyReactionsRepository, HatadyNotificationsRepository, HatadyFollowingsRepository, HatadyUserProfilesRepository, HatadyBookmarksRepository, HatadyBookMemosRepository, HatadySubjectsRepository, HatadyGoalsRepository, HatadyMediaSessionsRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { MiHatadyBook } from '@/models/HatadyBook.js';
import { MiHatadyLog } from '@/models/HatadyLog.js';
import { MiHatadyComment } from '@/models/HatadyComment.js';
import { MiHatadyNotification } from '@/models/HatadyNotification.js';
import type { MiHatadyBookmark } from '@/models/HatadyBookmark.js';
import type { MiHatadyBookMemo } from '@/models/HatadyBookMemo.js';
import type { MiHatadyGoal } from '@/models/HatadyGoal.js';
import { MiHatadyReaction } from '@/models/HatadyReaction.js';
import { MiHatadyFollowing } from '@/models/HatadyFollowing.js';
import { IdService } from '@/core/IdService.js';
import { RoleService } from '@/core/RoleService.js';
import { sqlLikeEscape } from '@/misc/sql-like-escape.js';
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
		@Inject(DI.hatadyBookMemosRepository)
		private hatadyBookMemosRepository: HatadyBookMemosRepository,
		@Inject(DI.hatadySubjectsRepository)
		private hatadySubjectsRepository: HatadySubjectsRepository,
		@Inject(DI.hatadyGoalsRepository)
		private hatadyGoalsRepository: HatadyGoalsRepository,
		@Inject(DI.hatadyMediaSessionsRepository)
		private hatadyMediaSessionsRepository: HatadyMediaSessionsRepository,

		private idService: IdService,
		private roleService: RoleService,
	) {
	}

	// ロール上限超過を表すエラーコード(エンドポイントで拾って ApiError に変換)。
	public static readonly ERR_BOOK_LIMIT = 'HATADY_BOOK_LIMIT';
	public static readonly ERR_BOOKMARK_LIMIT = 'HATADY_BOOKMARK_LIMIT';
	public static readonly ERR_MEMO_LIMIT = 'HATADY_MEMO_LIMIT';
	// 内容メモは本1冊あたりの上限(ロールポリシー化はせず一律の安全上限)。
	public static readonly MEMO_LIMIT_PER_BOOK = 500;

	// ===== 分野(subject)レジストリ(本人のみ。色は本人クライアント内でのみ反映) =====

	// 本人の分野一覧。学習ログの distinct subject(件数付き)とレジストリ(色/明示登録)をマージ。
	public async getSubjects(userId: MiUser['id']): Promise<{ name: string; color: string | null; logCount: number }[]> {
		const rows = await this.hatadyLogsRepository.createQueryBuilder('log')
			.select('log.subject', 'name')
			.addSelect('COUNT(*)', 'cnt')
			.where('log.userId = :userId', { userId })
			.groupBy('log.subject')
			.getRawMany() as { name: string | null; cnt: string }[];
		const counts = new Map<string, number>();
		for (const r of rows) {
			if (r.name != null && r.name !== '') counts.set(r.name, Number(r.cnt) || 0);
		}
		const regs = await this.hatadySubjectsRepository.findBy({ userId });
		const colors = new Map<string, string | null>();
		for (const s of regs) colors.set(s.name, s.color ?? null);
		const names = new Set<string>([...counts.keys(), ...colors.keys()]);
		const result = [...names].map(name => ({
			name,
			color: colors.get(name) ?? null,
			logCount: counts.get(name) ?? 0,
		}));
		// 件数降順 → 名前昇順
		result.sort((a, b) => (b.logCount - a.logCount) || a.name.localeCompare(b.name));
		return result;
	}

	// 分野の色を設定/明示登録(upsert)。color=null で自動割当に戻す(行は残す)。
	public async saveSubject(userId: MiUser['id'], name: string, color: string | null): Promise<{ name: string; color: string | null }> {
		const trimmed = name.trim();
		if (trimmed.length === 0) throw new Error('empty subject name');
		const normColor = this.normalizeSubjectColor(color);
		const now = new Date();
		const existing = await this.hatadySubjectsRepository.findOneBy({ userId, name: trimmed });
		if (existing) {
			await this.hatadySubjectsRepository.update({ id: existing.id }, { color: normColor, updatedAt: now });
		} else {
			await this.hatadySubjectsRepository.insertOne({
				id: this.idService.gen(now.getTime()),
				userId,
				name: trimmed,
				color: normColor,
				createdAt: now,
				updatedAt: now,
			});
		}
		return { name: trimmed, color: normColor };
	}

	// 分野を削除。reassignTo 指定時はその分野が付いた本人のログを付け替える(ログ自体は非破壊)。
	//   レジストリ行は削除する。
	public async deleteSubject(userId: MiUser['id'], name: string, reassignTo: string | null): Promise<{ reassigned: number }> {
		const from = name.trim();
		if (from.length === 0) throw new Error('empty subject name');
		let reassigned = 0;
		const to = (reassignTo ?? '').trim();
		if (to.length > 0 && to !== from) {
			const res = await this.hatadyLogsRepository.update({ userId, subject: from }, { subject: to });
			reassigned = res.affected ?? 0;
		}
		await this.hatadySubjectsRepository.delete({ userId, name: from });
		return { reassigned };
	}

	// 色の正規化: #rgb / #rrggbb のみ許可。それ以外・空は null(=自動割当)。
	private normalizeSubjectColor(color: string | null | undefined): string | null {
		if (color == null) return null;
		const c = color.trim().toLowerCase();
		if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(c)) return c;
		return null;
	}

	// ===== しおり(本の所有者のみ) =====

	@bindThis
	public async createBookmark(user: MiUser, params: { bookId: string; page: number; name?: string | null; color?: string | null; memo?: string | null }): Promise<MiHatadyBookmark> {
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
			memo: params.memo ?? null,
		});
	}

	// しおりの編集(名前・ページ・色・メモ)。所有者のみ。渡されたキーだけ更新する。
	@bindThis
	public async updateBookmark(user: MiUser, params: { bookmarkId: string; page?: number; name?: string | null; color?: string | null; memo?: string | null }): Promise<MiHatadyBookmark> {
		const bm = await this.hatadyBookmarksRepository.findOneBy({ id: params.bookmarkId, userId: user.id });
		if (bm == null) throw new Error('no such bookmark or access denied');
		const patch: Partial<MiHatadyBookmark> = {};
		if (params.page !== undefined) patch.page = Math.max(0, params.page);
		if (params.name !== undefined) patch.name = params.name;
		if (params.color !== undefined) patch.color = params.color;
		if (params.memo !== undefined) patch.memo = params.memo;
		if (Object.keys(patch).length > 0) await this.hatadyBookmarksRepository.update(bm.id, patch);
		return await this.hatadyBookmarksRepository.findOneByOrFail({ id: bm.id });
	}

	@bindThis
	public async deleteBookmark(user: MiUser, bookmarkId: string): Promise<void> {
		const bm = await this.hatadyBookmarksRepository.findOneBy({ id: bookmarkId, userId: user.id });
		if (bm == null) return;
		await this.hatadyBookmarksRepository.delete(bm.id);
	}

	// ===== 内容メモ(本の所有者のみ) =====

	@bindThis
	public async createMemo(user: MiUser, params: { bookId: string; text: string; page?: number | null }): Promise<MiHatadyBookMemo> {
		const book = await this.hatadyBooksRepository.findOneBy({ id: params.bookId, userId: user.id });
		if (book == null) throw new Error('no such book or access denied');
		const count = await this.hatadyBookMemosRepository.countBy({ bookId: book.id });
		if (count >= HatadyService.MEMO_LIMIT_PER_BOOK) throw new Error(HatadyService.ERR_MEMO_LIMIT);
		const now = new Date();
		return this.hatadyBookMemosRepository.insertOne({
			id: this.idService.gen(now.getTime()),
			createdAt: now,
			updatedAt: now,
			bookId: book.id,
			userId: user.id,
			text: params.text,
			page: params.page ?? null,
		});
	}

	// 内容メモの編集(本文・ページ)。所有者のみ。
	@bindThis
	public async updateMemo(user: MiUser, params: { memoId: string; text?: string; page?: number | null }): Promise<MiHatadyBookMemo> {
		const memo = await this.hatadyBookMemosRepository.findOneBy({ id: params.memoId, userId: user.id });
		if (memo == null) throw new Error('no such memo or access denied');
		const patch: Partial<MiHatadyBookMemo> = { updatedAt: new Date() };
		if (params.text !== undefined) patch.text = params.text;
		if (params.page !== undefined) patch.page = params.page;
		await this.hatadyBookMemosRepository.update(memo.id, patch);
		return await this.hatadyBookMemosRepository.findOneByOrFail({ id: memo.id });
	}

	@bindThis
	public async deleteMemo(user: MiUser, memoId: string): Promise<void> {
		const memo = await this.hatadyBookMemosRepository.findOneBy({ id: memoId, userId: user.id });
		if (memo == null) return;
		await this.hatadyBookMemosRepository.delete(memo.id);
	}

	// 本の内容メモ一覧(作成日時の昇順。並び替えはフロントで行う)。
	@bindThis
	public async getMemos(bookId: string): Promise<MiHatadyBookMemo[]> {
		return this.hatadyBookMemosRepository.createQueryBuilder('memo')
			.where('memo.bookId = :bookId', { bookId })
			.orderBy('memo.createdAt', 'ASC').addOrderBy('memo.id', 'ASC')
			.limit(HatadyService.MEMO_LIMIT_PER_BOOK).getMany();
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

	// プロフィール用の集計(統計 + 分野タグ)。表示中のログと同じ公開範囲を対象にする。
	// 旗鯖fork(Hatady次期: ゲーム/映画記録): streakDays は学習ログに加え、閲覧者から見える
	//   範囲の映画・ゲーム記録セッションも含めて数える(マイログのstreak判定と基準を揃える)。
	@bindThis
	public async getProfileAggregates(targetUserId: MiUser['id'], viewerId: MiUser['id'], tz = 0): Promise<{
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
		const viewerFollows = isMe ? false : await this.isFollowing(viewerId, targetUserId);

		const logQuery = this.hatadyLogsRepository.createQueryBuilder('log').where('log.userId = :uid', { uid: targetUserId });
		if (!isMe) {
			if (viewerFollows) logQuery.andWhere('log.visibility IN (:...vis)', { vis: ['public', 'followers'] });
			else logQuery.andWhere('log.isPublic = TRUE');
		}
		const logs = await logQuery.getMany();

		// 映画・ゲームの記録セッションも、ログと同じ可視性規則(本人は全件・フォロワーは public+followers・
		// それ以外は public のみ)で streak の対象にする。
		const sessionQuery = this.hatadyMediaSessionsRepository.createQueryBuilder('session').where('session.userId = :uid', { uid: targetUserId });
		if (!isMe) {
			if (viewerFollows) sessionQuery.andWhere("session.visibility IN ('public', 'followers')");
			else sessionQuery.andWhere("session.visibility = 'public'");
		}
		const mediaSessions = await sessionQuery.getMany();

		const totalMinutes = logs.reduce((a, l) => a + (l.durationMinutes || 0), 0);
		const bookCount = await this.hatadyBooksRepository.countBy({ userId: targetUserId });

		// 連続日数(記録がある日を遡って数える)。日付はユーザーのローカル基準(マイログの表示と一致させる)。
		const dayKey = (d: Date) => this.dayKeyTz(d, tz);
		const daySet = new Set([
			...logs.map(l => dayKey(new Date(l.studiedAt))),
			...mediaSessions.map(s => dayKey(new Date(s.occurredAt))),
		]);
		let streakDays = 0;
		let cursorMs = this.localMidnightMs(new Date(), tz);
		if (!daySet.has(dayKey(new Date(cursorMs)))) cursorMs -= 86400000;
		while (daySet.has(dayKey(new Date(cursorMs)))) { streakDays += 1; cursorMs -= 86400000; }

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
			Promise.resolve(viewerFollows),
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
		if (patch.status === 'reading' || patch.status === 'finished' || patch.status === 'want' || patch.status === 'tsundoku') {
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
			mediaWorkId: null,
			mediaCommentId: null,
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
		await this.notifyMilestoneIfReached(user.id);

		return log;
	}

	// 旗鯖fork(Hatady次期: ゲーム/映画記録): 学習ログとメディア(映画/ゲーム)セッションを合わせた
	//   「その日に記録があったか」の判定用データ。連続記録・ヒートマップ・週間集計は種別を問わず
	//   「記録した日」を数えるため、ここで一本化する(本人の全記録。可視性は絞らない)。
	@bindThis
	private async loadOwnActivityMoments(userId: MiUser['id'], since: Date): Promise<{ occurredAt: Date; minutes: number }[]> {
		const [logs, sessions] = await Promise.all([
			this.hatadyLogsRepository.createQueryBuilder('log')
				.select('log.studiedAt', 'occurredAt')
				.addSelect('log.durationMinutes', 'minutes')
				.where('log.userId = :uid', { uid: userId })
				.andWhere('log.studiedAt > :since', { since })
				.getRawMany<{ occurredAt: Date; minutes: number }>(),
			this.hatadyMediaSessionsRepository.createQueryBuilder('session')
				.select('session.occurredAt', 'occurredAt')
				.addSelect('session.durationMinutes', 'minutes')
				.where('session.userId = :uid', { uid: userId })
				.andWhere('session.occurredAt > :since', { since })
				.getRawMany<{ occurredAt: Date; minutes: number }>(),
		]);
		return [...logs, ...sessions].map(r => ({ occurredAt: new Date(r.occurredAt), minutes: Number(r.minutes) || 0 }));
	}

	// 連続記録日数を計算する(今日/昨日から遡って連続で記録がある日数)。
	// 旗鯖fork(Hatady次期): 学習ログだけでなく映画・ゲームの記録セッションも連続日数に含める。
	@bindThis
	private async computeStreak(userId: MiUser['id']): Promise<number> {
		const since = new Date();
		since.setHours(0, 0, 0, 0);
		since.setDate(since.getDate() - 400);
		const moments = await this.loadOwnActivityMoments(userId, since);
		const dayKey = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
		const daySet = new Set(moments.map(m => dayKey(m.occurredAt)));
		let streak = 0;
		const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
		if (!daySet.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
		while (daySet.has(dayKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
		return streak;
	}

	// 連続記録が節目(3/7/14/30/50/100/200/365日)に達したら1回だけ達成通知を出す。
	// 旗鯖fork(Hatady次期): 学習ログの作成時だけでなく、映画・ゲームのセッション作成時にも
	//   HatadyMediaService から呼べるよう、userId 直渡しの公開メソッドとして持つ
	//   (中身は user.id しか使っていなかったため、MiUser 丸ごとの受け渡しをやめて単純化した)。
	private static readonly MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
	@bindThis
	public async notifyMilestoneIfReached(userId: MiUser['id']): Promise<void> {
		const streak = await this.computeStreak(userId);
		if (streak <= 0) return;
		for (const m of HatadyService.MILESTONES) {
			if (m > streak) break;
			// その節目の達成通知が未発行なら発行(値が同じものが無ければ)。
			const already = await this.hatadyNotificationsRepository.countBy({ notifieeId: userId, type: 'milestone', value: m });
			if (already === 0) {
				await this.notify({ notifieeId: userId, notifierId: null, type: 'milestone', value: m });
			}
		}
	}

	// 旗鯖fork: マイログのヘッダ統計 + ヒートマップ + 分野別フォーカスを集計する。
	//   直近140日(20週)分の記録を1回取得し、JS 側で集計する(件数が限られるため十分)。
	// 旗鯖fork(Hatady次期: ゲーム/映画記録): streakDays・recordedToday・heatmap・weeklyMinutes・
	//   weeklySessions・totalLogs は学習ログに加え、映画・ゲームの記録セッションも合算する。
	//   focusBySubject だけは学習ログの「分野」に固有の集計のため学習ログのみを対象に残す
	//   (作品タイトルは分野ではないため、素朴に混ぜるとかえって意味を失う)。
	@bindThis
	public async getStats(userId: MiUser['id'], tz = 0): Promise<{
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
		// 起点はユーザーのローカル「今日 0:00」。そこから DAYS-1 日さかのぼる。
		const todayMs = this.localMidnightMs(new Date(), tz);
		const sinceMs = todayMs - (DAYS - 1) * 86400000;
		const since = new Date(sinceMs);

		const [logs, mediaSessions] = await Promise.all([
			this.hatadyLogsRepository.findBy({ userId, studiedAt: MoreThan(since) }),
			this.hatadyMediaSessionsRepository.findBy({ userId, occurredAt: MoreThan(since) }),
		]);

		const [logCount, mediaSessionCount, totalBooks] = await Promise.all([
			this.hatadyLogsRepository.countBy({ userId }),
			this.hatadyMediaSessionsRepository.countBy({ userId }),
			this.hatadyBooksRepository.countBy({ userId }),
		]);
		const totalLogs = logCount + mediaSessionCount;

		// 日付キー(ユーザーのローカル日付) → { minutes, count }。学習ログ・メディアセッション共通の集計先。
		const dayKey = (d: Date) => this.dayKeyTz(d, tz);
		const byDay = new Map<string, { minutes: number; count: number }>();
		const addToDay = (k: string, minutes: number) => {
			const cur = byDay.get(k) ?? { minutes: 0, count: 0 };
			cur.minutes += minutes;
			cur.count += 1;
			byDay.set(k, cur);
		};
		for (const log of logs) addToDay(dayKey(new Date(log.studiedAt)), log.durationMinutes);
		for (const session of mediaSessions) addToDay(dayKey(new Date(session.occurredAt)), session.durationMinutes ?? 0);

		// ヒートマップ(140日分、古い順)。ユーザーのローカル日で1日ずつ進める。
		const heatmap: { date: string; minutes: number; count: number }[] = [];
		for (let i = 0; i < DAYS; i++) {
			const k = dayKey(new Date(sinceMs + i * 86400000));
			const v = byDay.get(k) ?? { minutes: 0, count: 0 };
			heatmap.push({ date: k, minutes: v.minutes, count: v.count });
		}

		// 連続日数(今日または昨日から遡って連続で記録がある日数)。
		let streakDays = 0;
		const recordedToday = byDay.has(dayKey(new Date(todayMs)));
		// 今日に記録が無ければ昨日から数える(その日の途中でも途切れ扱いにしない)。
		let cursorMs = todayMs;
		if (!byDay.has(dayKey(new Date(cursorMs)))) cursorMs -= 86400000;
		while (byDay.has(dayKey(new Date(cursorMs)))) {
			streakDays += 1;
			cursorMs -= 86400000;
		}

		// 今週(過去7日)の時間・セッション・分野別フォーカス。
		const weekAgoMs = todayMs - 6 * 86400000;
		let weeklyMinutes = 0;
		let weeklySessions = 0;
		const subjectMinutes = new Map<string, number>();
		for (const log of logs) {
			// その記録がユーザーのローカルで何日にあたるかで週内判定する。
			if (this.localMidnightMs(new Date(log.studiedAt), tz) >= weekAgoMs) {
				weeklyMinutes += log.durationMinutes;
				weeklySessions += 1;
				subjectMinutes.set(log.subject, (subjectMinutes.get(log.subject) ?? 0) + log.durationMinutes);
			}
		}
		for (const session of mediaSessions) {
			if (this.localMidnightMs(new Date(session.occurredAt), tz) >= weekAgoMs) {
				weeklyMinutes += session.durationMinutes ?? 0;
				weeklySessions += 1;
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
		if (log.userId === viewerId) return true;
		if (log.visibility === 'public') return true;
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
		if (!target.logId && !target.commentId) throw new Error('no such target or access denied');

		await this.hatadyReactionsRepository.manager.transaction(async manager => {
			let targetComment: MiHatadyComment | null = null;
			let logId = target.logId ?? null;
			if (target.commentId) {
				const commentRef = await manager.getRepository(MiHatadyComment).findOneBy({ id: target.commentId });
				if (commentRef == null) throw new Error('no such target or access denied');
				logId = commentRef.logId;
			}
			const targetLog = logId == null
				? null
				: await manager.getRepository(MiHatadyLog).findOne({ where: { id: logId }, lock: { mode: 'pessimistic_write' } });
			if (targetLog == null) throw new Error('no such target or access denied');
			if (targetLog.userId !== user.id && targetLog.visibility !== 'public') {
				const follows = targetLog.visibility === 'followers'
					&& await manager.getRepository(MiHatadyFollowing).findOne({
						where: { followerId: user.id, followeeId: targetLog.userId },
						lock: { mode: 'pessimistic_read' },
					});
				if (!follows) throw new Error('no such target or access denied');
			}
			if (target.commentId) {
				targetComment = await manager.getRepository(MiHatadyComment).findOne({ where: { id: target.commentId, logId: targetLog.id }, lock: { mode: 'pessimistic_write' } });
				if (targetComment == null) throw new Error('no such target or access denied');
			}

			const reactionRepo = manager.getRepository(MiHatadyReaction);
			const existing = targetComment
				? await reactionRepo.findOneBy({ userId: user.id, commentId: targetComment.id })
				: await reactionRepo.findOneBy({ userId: user.id, logId: targetLog.id });
			if (existing?.reaction === reactionStr) return;
			const now = new Date();
			if (existing) {
				await reactionRepo.update(existing.id, { reaction: reactionStr, createdAt: now });
			} else {
				await reactionRepo.insert({
					id: this.idService.gen(now.getTime()),
					createdAt: now,
					userId: user.id,
					logId: targetComment ? null : targetLog.id,
					commentId: targetComment?.id ?? null,
					reaction: reactionStr,
				});
				if (targetComment) {
					const count = await reactionRepo.countBy({ commentId: targetComment.id });
					await manager.getRepository(MiHatadyComment).update(targetComment.id, { reactionsCount: count });
				} else {
					const count = await reactionRepo.countBy({ logId: targetLog.id });
					await manager.getRepository(MiHatadyLog).update(targetLog.id, { reactionsCount: count });
				}
			}

			const notifieeId = targetComment?.userId ?? targetLog.userId;
			if (notifieeId !== user.id) {
				await manager.getRepository(MiHatadyNotification).insert({
					id: this.idService.gen(now.getTime()), createdAt: now, notifieeId, notifierId: user.id,
					type: 'reaction', logId: targetLog.id, commentId: targetComment?.id ?? null,
					mediaWorkId: null, mediaCommentId: null, reaction: reactionStr, value: null, isRead: false,
				});
			}
		});
	}

	@bindThis
	public async unreact(user: MiUser, target: { logId?: string | null; commentId?: string | null }): Promise<void> {
		if (!target.logId && !target.commentId) return;
		await this.hatadyReactionsRepository.manager.transaction(async manager => {
			let targetComment: MiHatadyComment | null = null;
			let logId = target.logId ?? null;
			if (target.commentId) {
				const commentRef = await manager.getRepository(MiHatadyComment).findOneBy({ id: target.commentId });
				if (commentRef == null) return;
				logId = commentRef.logId;
			}
			const targetLog = logId == null
				? null
				: await manager.getRepository(MiHatadyLog).findOne({ where: { id: logId }, lock: { mode: 'pessimistic_write' } });
			if (targetLog == null) return;
			if (target.commentId) {
				targetComment = await manager.getRepository(MiHatadyComment).findOne({ where: { id: target.commentId, logId: targetLog.id }, lock: { mode: 'pessimistic_write' } });
				if (targetComment == null) return;
			}
			const reactionRepo = manager.getRepository(MiHatadyReaction);
			const existing = targetComment
				? await reactionRepo.findOneBy({ userId: user.id, commentId: targetComment.id })
				: await reactionRepo.findOneBy({ userId: user.id, logId: targetLog.id });
			if (existing == null) return;
			await reactionRepo.delete(existing.id);
			if (targetComment) {
				const count = await reactionRepo.countBy({ commentId: targetComment.id });
				await manager.getRepository(MiHatadyComment).update(targetComment.id, { reactionsCount: count });
			} else {
				const count = await reactionRepo.countBy({ logId: targetLog.id });
				await manager.getRepository(MiHatadyLog).update(targetLog.id, { reactionsCount: count });
			}
		});
	}

	// ===================================================================
	// 旗鯖fork(Hatady次期): 連続履歴 / 横断検索 / 統計深掘り / 目標
	// ===================================================================

	// ローカル日付キー(既存の getStats/computeStreak と同一規約)。
	@bindThis
	private dayKeyOf(d: Date): string {
		return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
	}

	// ===== タイムゾーン(ユーザーのローカル日付)ヘルパー =====
	//   サーバーは UTC で動くため、サーバーのローカル日付で集計するとユーザーの体感日付とズレる
	//   (例: 7/16 08:00 JST の記録が UTC では 7/15 23:00 → ヒートマップが前日に付く)。
	//   そこでクライアントの tzOffset(分。Date#getTimezoneOffset と同符号。JST は -540)を受け取り、
	//   instant を tz 分ずらした Date の UTC フィールドを読むことで「ユーザーの壁時計」を得る。
	//   固定オフセットのため DST 切替の境界は厳密ではないが、日付ズレの解消には十分。

	// instant → ユーザーの壁時計を UTC フィールドに載せた Date。
	private shiftToLocal(d: Date, tz: number): Date {
		return new Date(d.getTime() - tz * 60000);
	}
	// ユーザーのローカル日付キー(YYYY-MM-DD)。
	private dayKeyTz(d: Date, tz: number): string {
		const s = this.shiftToLocal(d, tz);
		return `${s.getUTCFullYear()}-${(s.getUTCMonth() + 1).toString().padStart(2, '0')}-${s.getUTCDate().toString().padStart(2, '0')}`;
	}
	// ユーザーのローカル月キー(YYYY-MM)。
	private monthKeyTz(d: Date, tz: number): string {
		const s = this.shiftToLocal(d, tz);
		return `${s.getUTCFullYear()}-${(s.getUTCMonth() + 1).toString().padStart(2, '0')}`;
	}
	// その instant が属する「ユーザーのローカル 0:00」の absolute instant(ms)。
	private localMidnightMs(d: Date, tz: number): number {
		const s = this.shiftToLocal(d, tz);
		return Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()) + tz * 60000;
	}

	// 旗鯖fork(P3): 連続記録の詳細履歴。現在・最長・過去の連続期間(降順)を返す。
	// 旗鯖fork(Hatady次期: ゲーム/映画記録): 学習ログに加え、映画・ゲームの記録セッションも
	//   「記録がある日」に含める(loadOwnActivityMoments と同じ判定基準)。
	@bindThis
	public async getStreaks(userId: MiUser['id'], tz = 0): Promise<{
		current: number;
		best: number;
		periods: { start: string; end: string; days: number }[];
	}> {
		// 過去2年分の記録日を取得(件数は限られるため十分)。起点はユーザーのローカル「今日 0:00」。
		const todayMs = this.localMidnightMs(new Date(), tz);
		const since = new Date(todayMs - 730 * 86400000);
		const moments = await this.loadOwnActivityMoments(userId, since);

		// 記録がある日を昇順のユニーク配列に(ユーザーのローカル日付で判定)。
		const daySet = new Set<string>(moments.map(m => this.dayKeyTz(m.occurredAt, tz)));
		const days = [...daySet].sort();
		if (days.length === 0) return { current: 0, best: 0, periods: [] };

		// 連続する日をまとめて期間化する。
		const periods: { start: string; end: string; days: number }[] = [];
		const parse = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
		let runStart = days[0];
		let prev = days[0];
		for (let i = 1; i < days.length; i++) {
			const cur = days[i];
			const expected = new Date(parse(prev)); expected.setDate(expected.getDate() + 1);
			if (this.dayKeyOf(expected) === cur) {
				prev = cur;
			} else {
				const len = Math.round((parse(prev).getTime() - parse(runStart).getTime()) / 86400000) + 1;
				periods.push({ start: runStart, end: prev, days: len });
				runStart = cur; prev = cur;
			}
		}
		const lastLen = Math.round((parse(prev).getTime() - parse(runStart).getTime()) / 86400000) + 1;
		periods.push({ start: runStart, end: prev, days: lastLen });

		// 現在の連続(今日/昨日から遡って途切れていないか)。判定はユーザーのローカル日付で行う。
		const todayKey = this.dayKeyTz(new Date(todayMs), tz);
		const yesterdayKey = this.dayKeyTz(new Date(todayMs - 86400000), tz);
		const last = periods[periods.length - 1];
		const current = (last.end === todayKey || last.end === yesterdayKey) ? last.days : 0;
		const best = periods.reduce((mx, p) => Math.max(mx, p.days), 0);

		// 新しい期間が上に来るよう降順にし、上限100。
		periods.reverse();
		return { current, best, periods: periods.slice(0, 100) };
	}

	// 旗鯖fork(P4): 自分の学習データを横断検索する(ログ/本/内容メモ/しおりメモ)。
	//   query は2文字以上想定。ILIKE の特殊文字は sqlLikeEscape で無害化する。
	@bindThis
	public async search(userId: MiUser['id'], query: string, types: string[] | null, limit: number): Promise<{
		logs: MiHatadyLog[];
		books: MiHatadyBook[];
		bookMemos: MiHatadyBookMemo[];
		bookmarks: MiHatadyBookmark[];
	}> {
		const q = `%${sqlLikeEscape(query.trim())}%`;
		const want = (t: string) => types == null || types.length === 0 || types.includes(t);
		const cap = Math.min(Math.max(limit, 1), 30);

		const logs = want('logs') ? await this.hatadyLogsRepository.createQueryBuilder('log')
			.where('log.userId = :uid', { uid: userId })
			.andWhere('(log.title ILIKE :q OR log.body ILIKE :q OR log.subject ILIKE :q)', { q })
			.orderBy('log.studiedAt', 'DESC')
			.limit(cap).getMany() : [];

		const books = want('books') ? await this.hatadyBooksRepository.createQueryBuilder('book')
			.where('book.userId = :uid', { uid: userId })
			.andWhere('(book.title ILIKE :q OR book.author ILIKE :q)', { q })
			.orderBy('book.updatedAt', 'DESC')
			.limit(cap).getMany() : [];

		// メモ・しおりは所属する本(タイトル/著者)も一緒に返す(検索結果で「◯◯のメモ」と出せるように)。
		const bookMemos = want('bookMemos') ? await this.hatadyBookMemosRepository.createQueryBuilder('memo')
			.leftJoinAndSelect('memo.book', 'book')
			.where('memo.userId = :uid', { uid: userId })
			.andWhere('memo.text ILIKE :q', { q })
			.orderBy('memo.updatedAt', 'DESC')
			.limit(cap).getMany() : [];

		const bookmarks = want('bookmarks') ? await this.hatadyBookmarksRepository.createQueryBuilder('bm')
			.leftJoinAndSelect('bm.book', 'book')
			.where('bm.userId = :uid', { uid: userId })
			.andWhere('(bm.memo ILIKE :q OR bm.name ILIKE :q)', { q })
			.orderBy('bm.createdAt', 'DESC')
			.limit(cap).getMany() : [];

		return { logs, books, bookMemos, bookmarks };
	}

	// 旗鯖fork(P6): 統計深掘り(月別/曜日/時間帯/分野推移/自己ベスト/月別読了)。
	//   直近 months ヶ月分のログを1回取得して JS 集計する。
	@bindThis
	public async getStatsDetail(userId: MiUser['id'], months: number, tz = 0): Promise<{
		monthlyTotals: { month: string; minutes: number; count: number }[];
		weekdayMinutes: number[];
		hourlyMinutes: number[];
		subjectTrend: { subject: string; monthly: { month: string; minutes: number }[] }[];
		bests: { longestSession: number; maxDayMinutes: number; longestStreak: number };
		monthlyFinished: { month: string; books: number; pages: number }[];
	}> {
		const m = Math.min(Math.max(months, 1), 24);
		// 起点はユーザーのローカルで (m-1) ヶ月前の1日 0:00。
		const nowLocal = this.shiftToLocal(new Date(), tz);
		const startIdx = nowLocal.getUTCFullYear() * 12 + nowLocal.getUTCMonth() - (m - 1);
		const sinceMs = Date.UTC(Math.floor(startIdx / 12), startIdx % 12, 1) + tz * 60000;
		const since = new Date(sinceMs);

		const logs = await this.hatadyLogsRepository.findBy({ userId, studiedAt: MoreThan(since) });
		const monthKey = (d: Date) => this.monthKeyTz(d, tz);

		// 月の並び(古い順)。ユーザーのローカル月で列挙する。
		const monthList: string[] = [];
		{
			const endIdx = nowLocal.getUTCFullYear() * 12 + nowLocal.getUTCMonth();
			for (let idx = startIdx; idx <= endIdx; idx++) {
				monthList.push(`${Math.floor(idx / 12)}-${(idx % 12 + 1).toString().padStart(2, '0')}`);
			}
		}

		const monthMap = new Map<string, { minutes: number; count: number }>();
		const weekdayMinutes = new Array(7).fill(0) as number[];
		const hourlyMinutes = new Array(24).fill(0) as number[];
		const dayMinutes = new Map<string, number>();
		const subjMonth = new Map<string, Map<string, number>>();
		let longestSession = 0;

		for (const log of logs) {
			const d = new Date(log.studiedAt);
			// 曜日・時間帯・日付はユーザーの壁時計で数える(UTC のままだと時間帯が9時間ズレる)。
			const w = this.shiftToLocal(d, tz);
			const mk = monthKey(d);
			const cur = monthMap.get(mk) ?? { minutes: 0, count: 0 };
			cur.minutes += log.durationMinutes; cur.count += 1; monthMap.set(mk, cur);
			weekdayMinutes[w.getUTCDay()] += log.durationMinutes;
			hourlyMinutes[w.getUTCHours()] += log.durationMinutes;
			const dk = this.dayKeyTz(d, tz);
			dayMinutes.set(dk, (dayMinutes.get(dk) ?? 0) + log.durationMinutes);
			if (log.durationMinutes > longestSession) longestSession = log.durationMinutes;
			if (!subjMonth.has(log.subject)) subjMonth.set(log.subject, new Map());
			const sm = subjMonth.get(log.subject)!;
			sm.set(mk, (sm.get(mk) ?? 0) + log.durationMinutes);
		}

		const monthlyTotals = monthList.map(mk => ({ month: mk, ...(monthMap.get(mk) ?? { minutes: 0, count: 0 }) }));
		const maxDayMinutes = [...dayMinutes.values()].reduce((mx, v) => Math.max(mx, v), 0);

		// 上位分野(合計時間)を最大5、各月推移。
		const subjTotals = [...subjMonth.entries()]
			.map(([subject, mm]) => ({ subject, total: [...mm.values()].reduce((a, b) => a + b, 0), mm }))
			.sort((a, b) => b.total - a.total).slice(0, 5);
		const subjectTrend = subjTotals.map(({ subject, mm }) => ({
			subject,
			monthly: monthList.map(mk => ({ month: mk, minutes: mm.get(mk) ?? 0 })),
		}));

		// 月別読了冊数 + 読了ページ数(pageFrom/To 差分の合計。読了本に限らずログのページ実績を月別集計)。
		const finishedBooks = await this.hatadyBooksRepository.createQueryBuilder('book')
			.select(['book.finishedAt AS "finishedAt"'])
			.where('book.userId = :uid', { uid: userId })
			.andWhere('book.status = :st', { st: 'finished' })
			.andWhere('book.finishedAt IS NOT NULL')
			.andWhere('book.finishedAt > :since', { since })
			.getRawMany();
		const finishedByMonth = new Map<string, number>();
		for (const r of finishedBooks) finishedByMonth.set(monthKey(new Date(r.finishedAt)), (finishedByMonth.get(monthKey(new Date(r.finishedAt))) ?? 0) + 1);
		const pagesByMonth = new Map<string, number>();
		for (const log of logs) {
			if (log.pageFrom != null && log.pageTo != null && log.pageTo > log.pageFrom) {
				const mk = monthKey(new Date(log.studiedAt));
				pagesByMonth.set(mk, (pagesByMonth.get(mk) ?? 0) + (log.pageTo - log.pageFrom));
			}
		}
		const monthlyFinished = monthList.map(mk => ({ month: mk, books: finishedByMonth.get(mk) ?? 0, pages: pagesByMonth.get(mk) ?? 0 }));

		const streaks = await this.getStreaks(userId, tz);

		return { monthlyTotals, weekdayMinutes, hourlyMinutes, subjectTrend, bests: { longestSession, maxDayMinutes, longestStreak: streaks.best }, monthlyFinished };
	}

	// ===== 目標(goal。本人のみ) =====

	// 旗鯖fork(P7): 目標の進捗を計算する。metricType が null なら手動(done)で判定。
	//   集計期間は createdAt 〜 (targetDate があればそれ、なければ現在)。
	@bindThis
	public async getGoalProgress(goal: MiHatadyGoal): Promise<{ current: number; target: number | null; percent: number | null }> {
		if (goal.metricType == null || goal.metricTarget == null) {
			return { current: goal.done ? 1 : 0, target: null, percent: goal.done ? 100 : null };
		}
		const from = goal.createdAt;
		const to = goal.targetDate ?? new Date();
		let current = 0;
		if (goal.metricType === 'minutes') {
			const raw = await this.hatadyLogsRepository.createQueryBuilder('log')
				.select('COALESCE(SUM(log.durationMinutes), 0)', 'sum')
				.where('log.userId = :uid', { uid: goal.userId })
				.andWhere('log.studiedAt >= :from', { from })
				.andWhere('log.studiedAt <= :to', { to })
				.getRawOne();
			current = Number(raw?.sum ?? 0);
		} else if (goal.metricType === 'logs') {
			current = await this.hatadyLogsRepository.createQueryBuilder('log')
				.where('log.userId = :uid', { uid: goal.userId })
				.andWhere('log.studiedAt >= :from', { from })
				.andWhere('log.studiedAt <= :to', { to })
				.getCount();
		} else if (goal.metricType === 'books') {
			current = await this.hatadyBooksRepository.createQueryBuilder('book')
				.where('book.userId = :uid', { uid: goal.userId })
				.andWhere('book.status = :st', { st: 'finished' })
				.andWhere('book.finishedAt IS NOT NULL')
				.andWhere('book.finishedAt >= :from', { from })
				.andWhere('book.finishedAt <= :to', { to })
				.getCount();
		}
		const percent = goal.metricTarget > 0 ? Math.min(100, Math.round((current / goal.metricTarget) * 100)) : null;
		return { current, target: goal.metricTarget, percent };
	}

	// 目標一覧(進捗込み)。短期→長期、期限昇順(なしは後ろ)、作成新しい順。
	@bindThis
	public async listGoals(userId: MiUser['id']): Promise<any[]> {
		const goals = await this.hatadyGoalsRepository.findBy({ userId });
		goals.sort((a, b) => {
			if (a.termType !== b.termType) return a.termType === 'short' ? -1 : 1;
			const at = a.targetDate ? a.targetDate.getTime() : Infinity;
			const bt = b.targetDate ? b.targetDate.getTime() : Infinity;
			if (at !== bt) return at - bt;
			return b.createdAt.getTime() - a.createdAt.getTime();
		});
		const out: any[] = [];
		for (const g of goals) {
			const progress = await this.getGoalProgress(g);
			// metric 目標が達成条件を満たしたら done を自動更新(冪等)。
			if (!g.done && g.metricType != null && progress.percent != null && progress.percent >= 100) {
				g.done = true; g.doneAt = new Date();
				await this.hatadyGoalsRepository.update(g.id, { done: true, doneAt: g.doneAt, updatedAt: new Date() });
				await this.notify({ notifieeId: userId, notifierId: null, type: 'goalDone', value: null }).catch(() => {});
			}
			out.push({
				id: g.id, title: g.title, description: g.description, termType: g.termType,
				targetDate: g.targetDate ? g.targetDate.toISOString() : null,
				metricType: g.metricType, metricTarget: g.metricTarget,
				done: g.done, doneAt: g.doneAt ? g.doneAt.toISOString() : null,
				createdAt: g.createdAt.toISOString(),
				progress,
			});
		}
		return out;
	}

	@bindThis
	public async createGoal(userId: MiUser['id'], data: {
		title: string; description?: string | null; termType: string;
		targetDate?: number | null; metricType?: string | null; metricTarget?: number | null;
	}): Promise<MiHatadyGoal> {
		const now = new Date();
		const goal = await this.hatadyGoalsRepository.insertOne({
			id: this.idService.gen(now.getTime()),
			userId,
			title: data.title.trim().slice(0, 256),
			description: data.description?.slice(0, 2048) ?? null,
			termType: data.termType === 'long' ? 'long' : 'short',
			targetDate: data.targetDate != null ? new Date(data.targetDate) : null,
			metricType: (data.metricType === 'minutes' || data.metricType === 'logs' || data.metricType === 'books') ? data.metricType : null,
			metricTarget: data.metricTarget != null ? Math.max(0, Math.floor(data.metricTarget)) : null,
			done: false,
			doneAt: null,
			createdAt: now,
			updatedAt: now,
		});
		return goal;
	}

	@bindThis
	public async updateGoal(userId: MiUser['id'], goalId: string, data: {
		title?: string; description?: string | null; termType?: string;
		targetDate?: number | null; metricType?: string | null; metricTarget?: number | null; done?: boolean;
	}): Promise<boolean> {
		const goal = await this.hatadyGoalsRepository.findOneBy({ id: goalId, userId });
		if (goal == null) return false;
		const patch: Partial<MiHatadyGoal> = { updatedAt: new Date() };
		if (data.title != null) patch.title = data.title.trim().slice(0, 256);
		if (data.description !== undefined) patch.description = data.description?.slice(0, 2048) ?? null;
		if (data.termType != null) patch.termType = data.termType === 'long' ? 'long' : 'short';
		if (data.targetDate !== undefined) patch.targetDate = data.targetDate != null ? new Date(data.targetDate) : null;
		if (data.metricType !== undefined) patch.metricType = (data.metricType === 'minutes' || data.metricType === 'logs' || data.metricType === 'books') ? data.metricType : null;
		if (data.metricTarget !== undefined) patch.metricTarget = data.metricTarget != null ? Math.max(0, Math.floor(data.metricTarget)) : null;
		if (data.done !== undefined) { patch.done = data.done; patch.doneAt = data.done ? new Date() : null; }
		await this.hatadyGoalsRepository.update(goal.id, patch);
		return true;
	}

	@bindThis
	public async deleteGoal(userId: MiUser['id'], goalId: string): Promise<boolean> {
		const goal = await this.hatadyGoalsRepository.findOneBy({ id: goalId, userId });
		if (goal == null) return false;
		await this.hatadyGoalsRepository.delete(goal.id);
		return true;
	}
}
