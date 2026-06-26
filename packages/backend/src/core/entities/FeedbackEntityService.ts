/*
 * 旗鯖fork: HataFeed の各エンティティを API レスポンス用に pack する。
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type {
	FeedbackIssuesRepository,
	FeedbackAgreesRepository,
	FeedbackCommentsRepository,
	FeedbackCommentReactionsRepository,
	FeedbackProjectsRepository,
	FeedbackIssueModeratorsRepository,
} from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { MiFeedbackIssue } from '@/models/FeedbackIssue.js';
import type { MiFeedbackComment } from '@/models/FeedbackComment.js';
import type { MiFeedbackEmojiRequest } from '@/models/FeedbackEmojiRequest.js';
import type { MiFeedbackNotification } from '@/models/FeedbackNotification.js';
import type { MiFeedbackProject } from '@/models/FeedbackProject.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { bindThis } from '@/decorators.js';

@Injectable()
export class FeedbackEntityService {
	constructor(
		@Inject(DI.feedbackIssuesRepository)
		private feedbackIssuesRepository: FeedbackIssuesRepository,
		@Inject(DI.feedbackAgreesRepository)
		private feedbackAgreesRepository: FeedbackAgreesRepository,
		@Inject(DI.feedbackCommentsRepository)
		private feedbackCommentsRepository: FeedbackCommentsRepository,
		@Inject(DI.feedbackCommentReactionsRepository)
		private feedbackCommentReactionsRepository: FeedbackCommentReactionsRepository,
		@Inject(DI.feedbackProjectsRepository)
		private feedbackProjectsRepository: FeedbackProjectsRepository,
		@Inject(DI.feedbackIssueModeratorsRepository)
		private feedbackIssueModeratorsRepository: FeedbackIssueModeratorsRepository,

		private userEntityService: UserEntityService,
		private driveFileEntityService: DriveFileEntityService,
	) {
	}

	@bindThis
	public async packProject(src: MiFeedbackProject['id'] | MiFeedbackProject): Promise<Record<string, unknown>> {
		const project = typeof src === 'object' ? src : await this.feedbackProjectsRepository.findOneByOrFail({ id: src });
		return {
			id: project.id,
			createdAt: project.createdAt.toISOString(),
			updatedAt: project.updatedAt.toISOString(),
			ownerId: project.ownerId,
			owner: await this.userEntityService.pack(project.ownerId),
			name: project.name,
			description: project.description,
			url: project.url,
			genre: project.genre ?? null,
			iconUrl: project.iconFileId ? (await this.driveFileEntityService.packManyByIds([project.iconFileId]))[0]?.url ?? null : null,
			isOfficial: project.isOfficial,
			color: project.color ?? null,
			suspended: project.suspended ?? false,
		};
	}

	@bindThis
	public async packIssue(src: MiFeedbackIssue['id'] | MiFeedbackIssue, me?: { id: MiUser['id'] } | null): Promise<Record<string, unknown>> {
		const issue = typeof src === 'object' ? src : await this.feedbackIssuesRepository.findOneByOrFail({ id: src });

		const isAgreed = me ? (await this.feedbackAgreesRepository.exists({ where: { feedbackId: issue.id, userId: me.id } })) : false;

		return {
			id: issue.id,
			number: issue.number,
			createdAt: issue.createdAt.toISOString(),
			updatedAt: issue.updatedAt.toISOString(),
			title: issue.title,
			description: issue.description,
			category: issue.category,
			status: issue.status,
			priority: issue.priority,
			pinned: issue.pinned,
			closed: issue.closed,
			closedAt: issue.closedAt ? issue.closedAt.toISOString() : null,
			// 旗鯖fork: 誰がクローズしたかも返す(「みんなの動き」でクローズを明記するため)。
			closedBy: issue.closedById ? await this.userEntityService.pack(issue.closedById) : null,
			agreementsCount: issue.agreementsCount,
			commentsCount: issue.commentsCount,
			lastCommentedAt: issue.lastCommentedAt ? issue.lastCommentedAt.toISOString() : null,
			resolutionNote: issue.resolutionNote,
			projectId: issue.projectId,
			code: issue.code ?? null,
			isAgreed,
			createdBy: issue.createdById ? await this.userEntityService.pack(issue.createdById) : null,
			files: issue.fileIds.length > 0 ? await this.driveFileEntityService.packManyByIds(issue.fileIds) : [],
		};
	}

	// 旗鯖fork: この Issue に対処権限を委任されたユーザー(委任者)を pack する。
	@bindThis
	public async packIssueModerators(feedbackId: string): Promise<Record<string, unknown>[]> {
		const rows = await this.feedbackIssueModeratorsRepository.findBy({ feedbackId });
		return Promise.all(rows.map(r => this.userEntityService.pack(r.userId)));
	}

	// 旗鯖fork: 会話に参加した(コメントした)ユーザー(参加者)を pack する。重複排除・最大20・参加順。
	@bindThis
	public async packIssueParticipants(feedbackId: string): Promise<Record<string, unknown>[]> {
		const rows = await this.feedbackCommentsRepository.createQueryBuilder('comment')
			.select('comment.userId', 'userId')
			.addSelect('MIN(comment.id)', 'firstId')
			.where('comment.feedbackId = :feedbackId', { feedbackId })
			.groupBy('comment.userId')
			.orderBy('"firstId"', 'ASC')
			.limit(20)
			.getRawMany<{ userId: string }>();
		return Promise.all(rows.map(r => this.userEntityService.pack(r.userId)));
	}

	@bindThis
	public async packComment(src: MiFeedbackComment, me?: { id: MiUser['id'] } | null): Promise<Record<string, unknown>> {
		const reactions = await this.feedbackCommentReactionsRepository.findBy({ commentId: src.id });
		const reactionCounts: Record<string, number> = {};
		let myReaction: string | null = null;
		for (const r of reactions) {
			reactionCounts[r.reaction] = (reactionCounts[r.reaction] ?? 0) + 1;
			if (me && r.userId === me.id) myReaction = r.reaction;
		}
		// 旗鯖fork: 返信先コメントの要約(誰の・何の返信か分かる程度)。
		let replyTo: Record<string, unknown> | null = null;
		if (src.replyToId != null) {
			const parent = await this.feedbackCommentsRepository.findOneBy({ id: src.replyToId });
			if (parent != null) {
				replyTo = {
					id: parent.id,
					user: await this.userEntityService.pack(parent.userId),
					text: parent.text.length > 80 ? parent.text.slice(0, 80) + '…' : parent.text,
				};
			}
		}
		return {
			id: src.id,
			createdAt: src.createdAt.toISOString(),
			updatedAt: src.updatedAt ? src.updatedAt.toISOString() : null,
			feedbackId: src.feedbackId,
			text: src.text,
			user: await this.userEntityService.pack(src.userId),
			files: src.fileIds.length > 0 ? await this.driveFileEntityService.packManyByIds(src.fileIds) : [],
			reactions: reactionCounts,
			myReaction,
			// 旗鯖fork: 返信先・マーク
			replyToId: src.replyToId ?? null,
			replyTo,
			mark: src.mark ?? null,
		};
	}

	@bindThis
	public async packEmojiRequest(src: MiFeedbackEmojiRequest): Promise<Record<string, unknown>> {
		return {
			id: src.id,
			createdAt: src.createdAt.toISOString(),
			updatedAt: src.updatedAt ? src.updatedAt.toISOString() : null,
			requestedBy: await this.userEntityService.pack(src.requestedById),
			name: src.name,
			category: src.category,
			aliases: src.aliases,
			license: src.license,
			localOnly: src.localOnly,
			isSensitive: src.isSensitive,
			sourceType: src.sourceType,
			originalUrl: src.originalUrl,
			remoteHost: src.remoteHost,
			fileId: src.fileId,
			imageUrl: src.fileId ? (await this.driveFileEntityService.packManyByIds([src.fileId]))[0]?.url ?? src.originalUrl : src.originalUrl,
			status: src.status,
			resolvedComment: src.resolvedComment,
			resolvedById: src.resolvedById,
			resolvedAt: src.resolvedAt ? src.resolvedAt.toISOString() : null,
			resolvedEmojiId: src.resolvedEmojiId,
		};
	}

	@bindThis
	public async packNotification(src: MiFeedbackNotification): Promise<Record<string, unknown>> {
		return {
			id: src.id,
			createdAt: src.createdAt.toISOString(),
			type: src.type,
			message: src.message,
			isRead: src.isRead,
			actor: src.actorId ? await this.userEntityService.pack(src.actorId) : null,
			feedbackId: src.feedbackId,
			emojiRequestId: src.emojiRequestId,
			commentId: src.commentId,
		};
	}
}
