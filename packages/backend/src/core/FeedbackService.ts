/*
 * 旗鯖fork: HataFeed(フィードバックセンター)のビジネスロジック。
 * - アクセス可否(ロールポリシー canAccessHataFeed)とクローズ等の権限判定
 *   (クローズできるのは管理者、または Issue 個別に権限付与されたモデレーター)
 * - プロジェクト / Issue / 賛同 / コメント / コメントリアクション / 絵文字申請 / Issue個別モデレーター権限 の操作
 * - フィードバックセンター内通知(per-user)の生成。スタッフが処理した場合は他スタッフへも共有通知する。
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type {
	FeedbackProjectsRepository,
	FeedbackIssuesRepository,
	FeedbackAgreesRepository,
	FeedbackCommentsRepository,
	FeedbackCommentReactionsRepository,
	FeedbackIssueModeratorsRepository,
	FeedbackEmojiRequestsRepository,
	FeedbackNotificationsRepository,
	DriveFilesRepository,
} from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { MiFeedbackIssue } from '@/models/FeedbackIssue.js';
import type { MiFeedbackProject } from '@/models/FeedbackProject.js';
import type { MiFeedbackComment } from '@/models/FeedbackComment.js';
import type { MiFeedbackEmojiRequest } from '@/models/FeedbackEmojiRequest.js';
import { IdService } from '@/core/IdService.js';
import { RoleService } from '@/core/RoleService.js';
import { CustomEmojiService } from '@/core/CustomEmojiService.js';
import { NotificationService } from '@/core/NotificationService.js';
import { bindThis } from '@/decorators.js';

// 通知の簡潔メッセージ。
const NOTIFY_MESSAGE = {
	emojiApproved: '絵文字の申請が承認されました。',
	emojiRejected: '絵文字の申請がリジェクトされました。',
	newComment: '新しいコメントが来ています。',
	commentReaction: 'あなたのコメントにリアクションが付きました。',
	issueClosed: 'イシューがクローズされました。',
	issueReopened: 'イシューが再オープンされました。',
	issueStatusChanged: 'イシューのステータスが変更されました。',
	newEmojiRequest: '新しい絵文字の申請が来ています。',
	newIssue: '新しいイシューが投稿されました。',
	moderatorGranted: 'このイシューの対処権限が付与されました。',
	issueResolved: 'イシューが解決済みになりました。',
} as const;

type NotifyType = keyof typeof NOTIFY_MESSAGE;

// ステータスの日本語ラベル(通知文言用)。closed=受付終了 はクローズ時に自動設定する。
const STATUS_LABEL_JP: Record<string, string> = {
	open: '受付中',
	planned: '対応予定',
	inProgress: '対応中',
	resolved: '解決済み',
	wontfix: '見送り',
	unknown: '用途不明',
	closed: '受付終了',
};

@Injectable()
export class FeedbackService {
	constructor(
		@Inject(DI.feedbackProjectsRepository)
		private feedbackProjectsRepository: FeedbackProjectsRepository,
		@Inject(DI.feedbackIssuesRepository)
		private feedbackIssuesRepository: FeedbackIssuesRepository,
		@Inject(DI.feedbackAgreesRepository)
		private feedbackAgreesRepository: FeedbackAgreesRepository,
		@Inject(DI.feedbackCommentsRepository)
		private feedbackCommentsRepository: FeedbackCommentsRepository,
		@Inject(DI.feedbackCommentReactionsRepository)
		private feedbackCommentReactionsRepository: FeedbackCommentReactionsRepository,
		@Inject(DI.feedbackIssueModeratorsRepository)
		private feedbackIssueModeratorsRepository: FeedbackIssueModeratorsRepository,
		@Inject(DI.feedbackEmojiRequestsRepository)
		private feedbackEmojiRequestsRepository: FeedbackEmojiRequestsRepository,
		@Inject(DI.feedbackNotificationsRepository)
		private feedbackNotificationsRepository: FeedbackNotificationsRepository,
		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		private idService: IdService,
		private roleService: RoleService,
		private customEmojiService: CustomEmojiService,
		private notificationService: NotificationService,
	) {
	}

	//#region 権限判定

	// HataFeed を利用できるか(ロールポリシー canAccessHataFeed。スタッフは常に可)。
	@bindThis
	public async canAccess(userId: MiUser['id'] | null): Promise<boolean> {
		if (userId == null) return false;
		if (await this.roleService.isModerator({ id: userId })) return true;
		const policies = await this.roleService.getUserPolicies(userId);
		return policies.canAccessHataFeed === true;
	}

	// スタッフ(管理者 or モデレーター)か。
	@bindThis
	public async isStaff(userId: MiUser['id'] | null): Promise<boolean> {
		if (userId == null) return false;
		return this.roleService.isModerator({ id: userId });
	}

	// 旗鯖fork: そのプロジェクトのイシューをエクスポートできるか。
	//   鯖缶(管理者/モデレーター)は常に可。プロジェクト作成者(owner)は自分のプロジェクトのみ可。
	//   公式(projectId=null)は鯖缶のみ。
	@bindThis
	public async canExport(userId: MiUser['id'] | null, projectId: string | null): Promise<boolean> {
		if (userId == null) return false;
		if (await this.roleService.isModerator({ id: userId })) return true;
		if (projectId == null) return false;
		const project = await this.feedbackProjectsRepository.findOneBy({ id: projectId });
		return project != null && project.ownerId === userId;
	}

	// その Issue を対処(クローズ/再オープン/ステータス変更等)できるか。
	// 管理者・モデレーターは常に可。加えて、その Issue に個別権限を委任された一般ユーザーも可。
	// (それ以外のユーザーは不可)
	@bindThis
	public async canManageIssue(userId: MiUser['id'] | null, issue: MiFeedbackIssue): Promise<boolean> {
		if (userId == null) return false;
		if (await this.roleService.isModerator({ id: userId })) return true;
		// 個別に委任されたユーザーか
		const grant = await this.feedbackIssueModeratorsRepository.findOneBy({ feedbackId: issue.id, userId });
		return grant != null;
	}

	//#endregion

	//#region 通知

	// 単一ユーザーへ通知を作成する。message を渡すと固定文言の代わりにその文言を使う(イシュー名入り等)。
	@bindThis
	public async notify(userId: MiUser['id'], type: NotifyType, refs: { actorId?: MiUser['id'] | null; feedbackId?: string | null; emojiRequestId?: string | null; commentId?: string | null } = {}, message?: string): Promise<void> {
		const body = message ?? NOTIFY_MESSAGE[type];
		await this.feedbackNotificationsRepository.insert({
			id: this.idService.gen(),
			createdAt: new Date(),
			userId,
			type,
			message: body,
			isRead: false,
			actorId: refs.actorId ?? null,
			feedbackId: refs.feedbackId ?? null,
			emojiRequestId: refs.emojiRequestId ?? null,
			commentId: refs.commentId ?? null,
		});

		// 旗鯖fork: Misskey標準の通知ベルにも出す(HataFeed専用タイプ。通知フィルタで個別ON/OFF可)。
		// createNotification は内部で fire-and-forget 管理されるため await/catch 不要。
		this.notificationService.createNotification(userId, 'hataFeed', {
			customBody: body,
			customHeader: 'HataFeed',
			customIcon: null,
			customLink: refs.feedbackId ? `/hatafeed/${refs.feedbackId}` : '/hatafeed',
		});
	}

	// スタッフ全員(actor を除く)へ共有通知する。重複ID(管理者かつモデレーター等)は排除する。
	// 旗鯖fork: feedback_notifications への INSERT を bulk 化(notifyMany 経由)して 1クエリにまとめる。
	//   ベル通知(Redis xadd / WS publish 等)は per-user 副作用が必要なため個別呼び出しを維持。
	@bindThis
	public async notifyStaff(actorId: MiUser['id'] | null, type: NotifyType, refs: { feedbackId?: string | null; emojiRequestId?: string | null; commentId?: string | null } = {}, message?: string): Promise<void> {
		const staffIds = await this.roleService.getModeratorIds({ includeAdmins: true, includeRoot: true });
		const targets = [...new Set(staffIds)].filter(id => id !== actorId);
		await this.notifyMany(targets, type, { ...refs, actorId }, message);
	}

	// 表示名を取り出すヘルパー(通知文言用)。
	@bindThis
	private displayName(user: { name?: string | null; username: string } | null | undefined): string {
		if (user == null) return '誰か';
		return (user.name && user.name.length > 0) ? user.name : user.username;
	}

	// 旗鯖fork: 複数ユーザーへ同一文言の通知を bulk insert で配信する。
	//   DB の INSERT は 1クエリにまとめ、ベル通知(Redis xadd / WS publish)は per-user に並列発火する。
	//   呼び出し側で重複排除(actor 除外など)してから渡すこと。
	@bindThis
	private async notifyMany(userIds: MiUser['id'][], type: NotifyType, refs: { actorId?: MiUser['id'] | null; feedbackId?: string | null; emojiRequestId?: string | null; commentId?: string | null } = {}, message?: string): Promise<void> {
		if (userIds.length === 0) return;
		const body = message ?? NOTIFY_MESSAGE[type];
		const now = new Date();
		await this.feedbackNotificationsRepository.insert(userIds.map(uid => ({
			id: this.idService.gen(),
			createdAt: now,
			userId: uid,
			type,
			message: body,
			isRead: false,
			actorId: refs.actorId ?? null,
			feedbackId: refs.feedbackId ?? null,
			emojiRequestId: refs.emojiRequestId ?? null,
			commentId: refs.commentId ?? null,
		})));
		const linkRef = refs.feedbackId ? `/hatafeed/${refs.feedbackId}` : '/hatafeed';
		for (const uid of userIds) {
			this.notificationService.createNotification(uid, 'hataFeed', {
				customBody: body,
				customHeader: 'HataFeed',
				customIcon: null,
				customLink: linkRef,
			});
		}
	}

	@bindThis
	public async getUnreadCount(userId: MiUser['id']): Promise<number> {
		return this.feedbackNotificationsRepository.countBy({ userId, isRead: false });
	}

	@bindThis
	public async markAllNotificationsRead(userId: MiUser['id']): Promise<void> {
		await this.feedbackNotificationsRepository.update({ userId, isRead: false }, { isRead: true });
	}

	//#endregion

	//#region プロジェクト

	@bindThis
	public async createProject(owner: MiUser, params: { name: string; description?: string; url?: string | null; iconFileId?: string | null; color?: string | null; genre?: string | null }): Promise<string> {
		const now = new Date();
		const id = this.idService.gen();
		await this.feedbackProjectsRepository.insert({
			id,
			createdAt: now,
			updatedAt: now,
			ownerId: owner.id,
			name: params.name,
			description: params.description ?? '',
			url: params.url ?? null,
			genre: (params.genre != null && params.genre.length > 0) ? params.genre : null,
			iconFileId: params.iconFileId ?? null,
			color: (params.color != null && params.color.length > 0) ? params.color : null,
			isOfficial: false,
		});
		return id;
	}

	// 旗鯖fork: プロジェクトの更新(スタッフのみ)。指定されたフィールドだけ更新する。
	@bindThis
	public async updateProject(projectId: string, params: { name?: string; description?: string; url?: string | null; iconFileId?: string | null; color?: string | null; suspended?: boolean; genre?: string | null }): Promise<void> {
		await this.feedbackProjectsRepository.update(projectId, {
			updatedAt: new Date(),
			...(params.name !== undefined ? { name: params.name } : {}),
			...(params.description !== undefined ? { description: params.description } : {}),
			...(params.url !== undefined ? { url: params.url } : {}),
			...(params.genre !== undefined ? { genre: (params.genre != null && params.genre.length > 0) ? params.genre : null } : {}),
			...(params.iconFileId !== undefined ? { iconFileId: params.iconFileId } : {}),
			...(params.color !== undefined ? { color: (params.color != null && params.color.length > 0) ? params.color : null } : {}),
			...(params.suspended !== undefined ? { suspended: params.suspended } : {}),
		});
	}

	// 旗鯖fork: プロジェクトの削除(スタッフのみ・公式は不可)。
	//   このプロジェクトに紐づくイシューもすべて削除する(コメント・賛同・通知はFK CASCADEで連鎖削除)。
	@bindThis
	public async deleteProject(projectId: string): Promise<void> {
		// まず配下のイシューを全削除(関連データはDBのON DELETE CASCADEで連鎖)。
		await this.feedbackIssuesRepository.delete({ projectId });
		await this.feedbackProjectsRepository.delete({ id: projectId, isOfficial: false });
	}

	// 旗鯖fork: そのプロジェクト(およびその配下イシュー)を閲覧できるか。
	//   サスペンド中は作成者(owner)と鯖缶(管理者/モデレーター)のみ閲覧可。
	@bindThis
	public async canViewProject(userId: MiUser['id'] | null, project: MiFeedbackProject): Promise<boolean> {
		if (!project.suspended) return true;
		if (userId == null) return false;
		if (project.ownerId === userId) return true;
		return this.roleService.isModerator({ id: userId });
	}

	//#endregion

	//#region Issue

	@bindThis
	public async createIssue(creator: MiUser, params: {
		title: string;
		description?: string;
		category?: string;
		priority?: string;
		projectId?: string | null;
		fileIds?: string[];
		code?: string | null;
	}): Promise<string> {
		const now = new Date();
		const id = this.idService.gen();
		// 連番のイシュー番号を採番(低頻度なので max+1 方式)。
		const maxRow = await this.feedbackIssuesRepository.createQueryBuilder('issue')
			.select('MAX(issue.number)', 'max')
			.getRawOne<{ max: number | null }>();
		const number = (maxRow?.max ?? 0) + 1;
		await this.feedbackIssuesRepository.insert({
			id,
			number,
			createdAt: now,
			updatedAt: now,
			title: params.title,
			description: params.description ?? '',
			category: params.category ?? 'bug',
			status: 'open',
			priority: params.priority ?? 'normal',
			pinned: false,
			closed: false,
			agreementsCount: 0,
			commentsCount: 0,
			fileIds: params.fileIds ?? [],
			projectId: params.projectId ?? null,
			code: (params.code != null && params.code.length > 0) ? params.code : null,
			createdById: creator.id,
		});
		// 公式(インスタンス)フィードバックへの新規 Issue はスタッフへ共有通知。
		if ((params.projectId ?? null) == null) {
			await this.notifyStaff(creator.id, 'newIssue', { feedbackId: id }, `「${params.title}」のイシューが投稿されました。`);
		}
		return id;
	}

	// その Issue の会話に参加した(コメントした)ユーザーIDの一覧(重複排除)。
	@bindThis
	private async getCommenterIds(feedbackId: string): Promise<MiUser['id'][]> {
		const rows = await this.feedbackCommentsRepository.createQueryBuilder('comment')
			.select('comment.userId', 'userId')
			.where('comment.feedbackId = :feedbackId', { feedbackId })
			.distinct(true)
			.getRawMany<{ userId: string }>();
		return rows.map(r => r.userId);
	}

	// ステータス変更(対処権限が必要)。
	@bindThis
	public async setIssueStatus(actor: MiUser, issue: MiFeedbackIssue, status: string, resolutionNote?: string | null): Promise<void> {
		await this.feedbackIssuesRepository.update(issue.id, {
			status,
			resolutionNote: resolutionNote ?? issue.resolutionNote,
			updatedAt: new Date(),
		});
		// 起票者へ通知 + スタッフへ共有通知。状態名を明記する。
		const statusMsg = `イシュー「${issue.title}」の状態が「${STATUS_LABEL_JP[status] ?? status}」に変更されました。`;
		if (issue.createdById != null && issue.createdById !== actor.id) {
			await this.notify(issue.createdById, 'issueStatusChanged', { actorId: actor.id, feedbackId: issue.id }, statusMsg);
		}
		await this.notifyStaff(actor.id, 'issueStatusChanged', { feedbackId: issue.id }, statusMsg);

		// 解決済みになった場合は、会話に参加したユーザーへ解決通知(起票者・操作者は除く)。
		if (status === 'resolved') {
			const resolvedMsg = `「${issue.title}」のイシューが解決済みになりました。`;
			const commenterIds = await this.getCommenterIds(issue.id);
			const targets = commenterIds.filter(uid => uid !== actor.id && uid !== issue.createdById);
			await this.notifyMany(targets, 'issueResolved', { actorId: actor.id, feedbackId: issue.id }, resolvedMsg);
		}
	}

	@bindThis
	public async closeIssue(actor: MiUser, issue: MiFeedbackIssue): Promise<void> {
		await this.feedbackIssuesRepository.update(issue.id, {
			closed: true,
			closedAt: new Date(),
			closedById: actor.id,
			// クローズ時はステータスを自動的に「受付終了」にする。
			status: 'closed',
			updatedAt: new Date(),
		});
		const msg = `イシュー「${issue.title}」がクローズされました（受付終了）。`;
		if (issue.createdById != null && issue.createdById !== actor.id) {
			await this.notify(issue.createdById, 'issueClosed', { actorId: actor.id, feedbackId: issue.id }, msg);
		}
		// 会話に参加した人にも受付終了を通知(操作者・起票者は除く)。
		const commenterIds = await this.getCommenterIds(issue.id);
		const commenterTargets = commenterIds.filter(uid => uid !== actor.id && uid !== issue.createdById);
		await this.notifyMany(commenterTargets, 'issueClosed', { actorId: actor.id, feedbackId: issue.id }, msg);
		await this.notifyStaff(actor.id, 'issueClosed', { feedbackId: issue.id }, msg);
	}

	@bindThis
	public async reopenIssue(actor: MiUser, issue: MiFeedbackIssue): Promise<void> {
		await this.feedbackIssuesRepository.update(issue.id, {
			closed: false,
			closedAt: null,
			closedById: null,
			// 再オープン時はステータスを「受付中」に戻す。
			status: 'open',
			updatedAt: new Date(),
		});
		await this.notifyStaff(actor.id, 'issueReopened', { feedbackId: issue.id }, `イシュー「${issue.title}」が再オープンされました。`);
	}

	// イシューを削除する(関連するコメント・賛同・通知等は FK CASCADE で削除される)。スタッフ専用想定。
	@bindThis
	public async deleteIssue(issue: MiFeedbackIssue): Promise<void> {
		await this.feedbackIssuesRepository.delete(issue.id);
	}

	//#endregion

	//#region 賛同

	// 賛同のトグル。戻り値は操作後に賛同済みか。
	@bindThis
	public async toggleAgree(user: MiUser, issue: MiFeedbackIssue): Promise<boolean> {
		const existing = await this.feedbackAgreesRepository.findOneBy({ feedbackId: issue.id, userId: user.id });
		if (existing != null) {
			await this.feedbackAgreesRepository.delete(existing.id);
			await this.feedbackIssuesRepository.decrement({ id: issue.id }, 'agreementsCount', 1);
			return false;
		} else {
			await this.feedbackAgreesRepository.insert({
				id: this.idService.gen(),
				createdAt: new Date(),
				feedbackId: issue.id,
				userId: user.id,
			});
			await this.feedbackIssuesRepository.increment({ id: issue.id }, 'agreementsCount', 1);
			return true;
		}
	}

	//#endregion

	//#region コメント

	@bindThis
	public async addComment(user: MiUser, issue: MiFeedbackIssue, text: string, fileIds: string[] = [], replyToId: string | null = null): Promise<string> {
		const now = new Date();
		const id = this.idService.gen();
		// 旗鯖fork: 返信先コメントを検証(同じイシュー内のものだけ許可)。
		let replyTarget: MiFeedbackComment | null = null;
		if (replyToId != null) {
			replyTarget = await this.feedbackCommentsRepository.findOneBy({ id: replyToId, feedbackId: issue.id });
		}
		await this.feedbackCommentsRepository.insert({
			id,
			createdAt: now,
			updatedAt: null,
			feedbackId: issue.id,
			userId: user.id,
			text,
			fileIds,
			replyToId: replyTarget ? replyTarget.id : null,
		});
		await this.feedbackIssuesRepository.update(issue.id, { lastCommentedAt: now });
		await this.feedbackIssuesRepository.increment({ id: issue.id }, 'commentsCount', 1);
		const notified = new Set<MiUser['id']>([user.id]);
		// 旗鯖fork: 返信先コメントの投稿者へ「返信が来ています」通知。
		if (replyTarget != null && !notified.has(replyTarget.userId)) {
			notified.add(replyTarget.userId);
			await this.notify(replyTarget.userId, 'newComment', { actorId: user.id, feedbackId: issue.id, commentId: id }, `「${issue.title}」のイシューであなたのコメントに${this.displayName(user)}が返信しました。`);
		}
		// 起票者(コメント投稿者以外)へ「(イシュー名)に(投稿者)のコメントが来ています。」通知。
		if (issue.createdById != null && !notified.has(issue.createdById)) {
			await this.notify(issue.createdById, 'newComment', { actorId: user.id, feedbackId: issue.id, commentId: id }, `「${issue.title}」のイシューに${this.displayName(user)}のコメントが来ています。`);
		}
		return id;
	}

	// コメントへのリアクション(トグル)。付与(または差し替え)時はコメント投稿者へ通知。
	@bindThis
	public async toggleCommentReaction(user: MiUser, commentId: string, reaction: string): Promise<boolean> {
		const existing = await this.feedbackCommentReactionsRepository.findOneBy({ commentId, userId: user.id });
		if (existing != null && existing.reaction === reaction) {
			await this.feedbackCommentReactionsRepository.delete(existing.id);
			return false;
		}
		if (existing != null) {
			// 既存リアクションを差し替え
			await this.feedbackCommentReactionsRepository.update(existing.id, { reaction });
			await this.notifyCommentReaction(user, commentId);
			return true;
		}
		await this.feedbackCommentReactionsRepository.insert({
			id: this.idService.gen(),
			createdAt: new Date(),
			commentId,
			userId: user.id,
			reaction,
		});
		await this.notifyCommentReaction(user, commentId);
		return true;
	}

	// 旗鯖fork: コメントにリアクションが付いた時、コメント投稿者(自分以外)へ通知する。
	@bindThis
	private async notifyCommentReaction(actor: MiUser, commentId: string): Promise<void> {
		const comment = await this.feedbackCommentsRepository.findOneBy({ id: commentId });
		if (comment == null || comment.userId === actor.id) return;
		const issue = await this.feedbackIssuesRepository.findOneBy({ id: comment.feedbackId });
		const title = issue ? `「${issue.title}」の` : '';
		await this.notify(comment.userId, 'commentReaction', { actorId: actor.id, feedbackId: comment.feedbackId, commentId }, `${title}イシューであなたのコメントに${this.displayName(actor)}がリアクションしました。`);
	}

	// 旗鯖fork: コメントを管理(削除/マーク)できるか。コメント投稿者・イシュー対処権限者(スタッフ/委任)。
	@bindThis
	public async canManageComment(userId: MiUser['id'] | null, comment: MiFeedbackComment): Promise<boolean> {
		if (userId == null) return false;
		if (comment.userId === userId) return true;
		const issue = await this.feedbackIssuesRepository.findOneBy({ id: comment.feedbackId });
		if (issue == null) return false;
		return this.canManageIssue(userId, issue);
	}

	// 旗鯖fork: コメントのマークを設定する('important'/'question'/null)。
	@bindThis
	public async setCommentMark(commentId: string, mark: string | null): Promise<void> {
		await this.feedbackCommentsRepository.update(commentId, { mark: mark, updatedAt: new Date() });
	}

	// 旗鯖fork: コメントを削除する(関連リアクションはFK CASCADE)。commentsCountを減算する。
	@bindThis
	public async deleteComment(comment: MiFeedbackComment): Promise<void> {
		await this.feedbackCommentsRepository.delete(comment.id);
		await this.feedbackIssuesRepository.decrement({ id: comment.feedbackId }, 'commentsCount', 1);
	}

	//#endregion

	//#region Issue個別モデレーター権限(管理者のみ操作)

	@bindThis
	public async grantModerator(admin: MiUser, issue: MiFeedbackIssue, targetUserId: MiUser['id']): Promise<void> {
		const existing = await this.feedbackIssueModeratorsRepository.findOneBy({ feedbackId: issue.id, userId: targetUserId });
		if (existing != null) return;
		await this.feedbackIssueModeratorsRepository.insert({
			id: this.idService.gen(),
			createdAt: new Date(),
			feedbackId: issue.id,
			userId: targetUserId,
			grantedById: admin.id,
		});
		await this.notify(targetUserId, 'moderatorGranted', { actorId: admin.id, feedbackId: issue.id }, `「${issue.title}」のイシューの対処権限が付与されました。`);
	}

	@bindThis
	public async revokeModerator(issue: MiFeedbackIssue, targetUserId: MiUser['id']): Promise<void> {
		await this.feedbackIssueModeratorsRepository.delete({ feedbackId: issue.id, userId: targetUserId });
	}

	//#endregion

	//#region 絵文字申請

	// リモート絵文字の申請が可能か(ロールポリシー canRequestRemoteEmoji。スタッフは常に可)。
	@bindThis
	public async canRequestRemoteEmoji(userId: MiUser['id']): Promise<boolean> {
		if (await this.roleService.isModerator({ id: userId })) return true;
		const policies = await this.roleService.getUserPolicies(userId);
		return policies.canRequestRemoteEmoji === true;
	}

	// 週次クォータの使用量(過去7日間に作成した申請数)。
	@bindThis
	public async getEmojiRequestUsage(userId: MiUser['id']): Promise<number> {
		const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
		return this.feedbackEmojiRequestsRepository.createQueryBuilder('req')
			.where('req.requestedById = :userId', { userId })
			.andWhere('req.createdAt >= :weekAgo', { weekAgo })
			.getCount();
	}

	// 絵文字申請のクォータ情報。limit はロールポリシー(emojiRequestLimit、既定10)。
	// remaining は過去7日の使用量を差し引いた残数。resetAt は最古の申請が枠を空ける時刻。
	@bindThis
	public async getEmojiRequestQuota(userId: MiUser['id']): Promise<{ limit: number; used: number; remaining: number; canRemote: boolean; resetAt: string | null }> {
		const policies = await this.roleService.getUserPolicies(userId);
		const limit = policies.emojiRequestLimit;
		const used = await this.getEmojiRequestUsage(userId);
		const canRemote = await this.canRequestRemoteEmoji(userId);

		// 枠が埋まっている場合、最古(=7日窓の先頭)の申請が抜けて1枠空く時刻を案内する。
		let resetAt: string | null = null;
		if (used >= limit && limit > 0) {
			const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
			const oldest = await this.feedbackEmojiRequestsRepository.createQueryBuilder('req')
				.where('req.requestedById = :userId', { userId })
				.andWhere('req.createdAt >= :weekAgo', { weekAgo })
				.orderBy('req.createdAt', 'ASC')
				.getOne();
			if (oldest) resetAt = new Date(oldest.createdAt.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString();
		}

		return { limit, used, remaining: Math.max(0, limit - used), canRemote, resetAt };
	}

	@bindThis
	public async createEmojiRequest(user: MiUser, params: {
		name: string;
		category?: string | null;
		aliases?: string[];
		license?: string | null;
		localOnly?: boolean;
		isSensitive?: boolean;
		sourceType: 'remote' | 'image';
		originalUrl?: string | null;
		remoteHost?: string | null;
		fileId?: string | null;
	}): Promise<string> {
		const now = new Date();
		const id = this.idService.gen();
		await this.feedbackEmojiRequestsRepository.insert({
			id,
			createdAt: now,
			updatedAt: now,
			requestedById: user.id,
			name: params.name,
			category: params.category ?? null,
			aliases: params.aliases ?? [],
			license: params.license ?? null,
			localOnly: params.localOnly ?? false,
			isSensitive: params.isSensitive ?? false,
			sourceType: params.sourceType,
			originalUrl: params.originalUrl ?? null,
			remoteHost: params.remoteHost ?? null,
			fileId: params.fileId ?? null,
			status: 'pending',
		});
		// 新規申請はスタッフへ共有通知(未処理タブ + 未読バッジ)。
		await this.notifyStaff(user.id, 'newEmojiRequest', { emojiRequestId: id });
		return id;
	}

	// 申請を承認 → 実際のカスタム絵文字を作成。
	// overrides を渡すと、承認者が申請内容を修正したうえで登録できる。
	@bindThis
	public async approveEmojiRequest(actor: MiUser, req: MiFeedbackEmojiRequest, overrides?: {
		name?: string;
		category?: string | null;
		aliases?: string[];
		license?: string | null;
		localOnly?: boolean;
		isSensitive?: boolean;
	}): Promise<void> {
		if (req.status !== 'pending') return;

		// 承認者の修正を反映した最終値。
		const rawName = overrides?.name ?? req.name;
		// カスタム絵文字名は [a-zA-Z0-9_] のみ有効。無効文字を _ に整形し、空なら 'emoji'。
		const baseName = (rawName.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 120)) || 'emoji';
		// 同名が既にあると insert が失敗して「追加されない」ため、重複時は連番を付与して必ず登録する。
		let finalName = baseName;
		for (let n = 1; await this.customEmojiService.checkDuplicate(finalName); n++) {
			finalName = `${baseName}_${n}`;
		}
		const finalCategory = overrides?.category !== undefined ? overrides.category : req.category;
		const finalAliases = overrides?.aliases ?? req.aliases;
		const finalLicense = overrides?.license !== undefined ? overrides.license : req.license;
		const finalLocalOnly = overrides?.localOnly ?? req.localOnly;
		const finalIsSensitive = overrides?.isSensitive ?? req.isSensitive;

		// 画像を解決する。自前画像はドライブファイルから、リモートは originalUrl から。
		let originalUrl: string;
		let publicUrl: string;
		let fileType = 'image/png';
		if (req.fileId != null) {
			const file = await this.driveFilesRepository.findOneBy({ id: req.fileId });
			if (file == null) throw new Error('drive file not found');
			originalUrl = file.url;
			publicUrl = file.webpublicUrl ?? file.url;
			fileType = file.webpublicType ?? file.type ?? fileType;
		} else if (req.originalUrl != null) {
			originalUrl = req.originalUrl;
			publicUrl = req.originalUrl;
		} else {
			throw new Error('no image source');
		}

		const emojiData = {
			originalUrl,
			publicUrl,
			fileType,
			name: finalName,
			category: finalCategory,
			aliases: finalAliases,
			host: null,
			license: finalLicense,
			isSensitive: finalIsSensitive,
			localOnly: finalLocalOnly,
			roleIdsThatCanBeUsedThisEmojiAsReaction: [],
		};
		// 通常は add()(システムユーザーへ再アップロード)。再アップロードに失敗する環境
		// (ローカル開発でバックエンドが自分のドライブURLを取得できない等)では addDirect() にフォールバック。
		const emoji = await (async () => {
			try {
				return await this.customEmojiService.add(emojiData, actor);
			} catch {
				return await this.customEmojiService.addDirect(emojiData, actor);
			}
		})();

		await this.feedbackEmojiRequestsRepository.update(req.id, {
			status: 'approved',
			// 承認時に確定した内容を記録に残す。
			name: finalName,
			category: finalCategory,
			aliases: finalAliases,
			license: finalLicense,
			localOnly: finalLocalOnly,
			isSensitive: finalIsSensitive,
			resolvedById: actor.id,
			resolvedAt: new Date(),
			resolvedEmojiId: emoji.id,
			updatedAt: new Date(),
		});
		// 申請者へ承認通知(絵文字名入り) + 他スタッフへ共有通知。
		await this.notify(req.requestedById, 'emojiApproved', { actorId: actor.id, emojiRequestId: req.id }, `絵文字「:${finalName}:」の申請が承認されました。`);
		await this.notifyStaff(actor.id, 'emojiApproved', { emojiRequestId: req.id }, `${this.displayName(actor)}が絵文字「:${finalName}:」の申請を承認しました。`);
	}

	@bindThis
	public async rejectEmojiRequest(actor: MiUser, req: MiFeedbackEmojiRequest, comment?: string | null): Promise<void> {
		if (req.status !== 'pending') return;
		await this.feedbackEmojiRequestsRepository.update(req.id, {
			status: 'rejected',
			resolvedById: actor.id,
			resolvedAt: new Date(),
			resolvedComment: comment ?? null,
			updatedAt: new Date(),
		});
		// 申請者へリジェクト通知(絵文字名・理由入り) + 他スタッフへ共有通知。
		const rejectedMsg = comment
			? `絵文字「:${req.name}:」の申請がリジェクトされました。（理由: ${comment}）`
			: `絵文字「:${req.name}:」の申請がリジェクトされました。`;
		await this.notify(req.requestedById, 'emojiRejected', { actorId: actor.id, emojiRequestId: req.id }, rejectedMsg);
		await this.notifyStaff(actor.id, 'emojiRejected', { emojiRequestId: req.id }, `${this.displayName(actor)}が絵文字「:${req.name}:」の申請をリジェクトしました。`);
	}

	//#endregion
}
