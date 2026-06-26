import ms from 'ms';
/*
 * 旗鯖fork: HataFeed のイシュー一覧(タイトル・本文・会話・ステータス等)を
 *   AIが読みやすい構造化JSONでエクスポートする。
 *   エクスポートできるのは鯖缶(管理者/モデレーター)とプロジェクト作成者のみ。
 */
import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { FeedbackIssuesRepository, FeedbackCommentsRepository, FeedbackProjectsRepository, UsersRepository } from '@/models/_.js';
import { FeedbackService } from '@/core/FeedbackService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	tags: ['hata'],
	requireCredential: true,
	kind: 'read:account',
	res: { type: 'object', optional: false, nullable: false },
	errors: {
		accessDenied: { message: 'HataFeed is not available for your account.', code: 'HATAFEED_ACCESS_DENIED', id: '5172e8df-1f3a-4b6c-8d9e-0a1b2c3d4e5f' },
		exportDenied: { message: 'Only the server staff or the project owner can export.', code: 'HATAFEED_EXPORT_DENIED', id: '628390e1-2a4b-4c7d-9e0f-1b2c3d4e5f60' },
	},
	limit: { duration: ms('1hour'), max: 10 },
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		// null/未指定 = 公式(インスタンス本体)のフィードバック。鯖缶のみエクスポート可。
		projectId: { type: 'string', format: 'misskey:id', nullable: true },
		includeClosed: { type: 'boolean', default: true },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.feedbackIssuesRepository)
		private feedbackIssuesRepository: FeedbackIssuesRepository,
		@Inject(DI.feedbackCommentsRepository)
		private feedbackCommentsRepository: FeedbackCommentsRepository,
		@Inject(DI.feedbackProjectsRepository)
		private feedbackProjectsRepository: FeedbackProjectsRepository,
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private feedbackService: FeedbackService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (!await this.feedbackService.canAccess(me.id)) throw new ApiError(meta.errors.accessDenied);

			const projectId = ps.projectId ?? null;
			if (!await this.feedbackService.canExport(me.id, projectId)) throw new ApiError(meta.errors.exportDenied);

			// 対象イシュー(番号順)。
			const issueQuery = this.feedbackIssuesRepository.createQueryBuilder('issue')
				.where(projectId != null ? 'issue.projectId = :projectId' : 'issue.projectId IS NULL', { projectId });
			if (!ps.includeClosed) issueQuery.andWhere('issue.closed = FALSE');
			const issues = await issueQuery.orderBy('issue.number', 'ASC').getMany();

			// 会話(コメント)を一括取得して issue ごとにまとめる。
			const issueIds = issues.map(i => i.id);
			const comments = issueIds.length > 0
				? await this.feedbackCommentsRepository.createQueryBuilder('c')
					.where('c.feedbackId IN (:...issueIds)', { issueIds })
					.orderBy('c.id', 'ASC')
					.getMany()
				: [];

			// 登場ユーザーの username を解決(AIが誰の発言か分かるように)。
			const userIds = new Set<string>();
			for (const i of issues) if (i.createdById) userIds.add(i.createdById);
			for (const c of comments) userIds.add(c.userId);
			const users = userIds.size > 0 ? await this.usersRepository.findBy({ id: In([...userIds]) }) : [];
			const userMap = new Map(users.map(u => [u.id, u.host ? `@${u.username}@${u.host}` : `@${u.username}`]));

			const commentsByIssue = new Map<string, typeof comments>();
			for (const c of comments) {
				const arr = commentsByIssue.get(c.feedbackId) ?? [];
				arr.push(c);
				commentsByIssue.set(c.feedbackId, arr);
			}

			const project = projectId != null ? await this.feedbackProjectsRepository.findOneBy({ id: projectId }) : null;

			return {
				schema: 'hatafeed-issues-export/v1',
				exportedAt: new Date().toISOString(),
				project: project != null
					? { id: project.id, name: project.name, description: project.description, url: project.url }
					: { id: null, name: '公式フィードバック (Hataskey)', description: '', url: null },
				issueCount: issues.length,
				issues: issues.map(issue => ({
					number: issue.number,
					title: issue.title,
					description: issue.description,
					category: issue.category,
					status: issue.status,
					priority: issue.priority,
					closed: issue.closed,
					pinned: issue.pinned,
					agreementsCount: issue.agreementsCount,
					commentsCount: issue.commentsCount,
					code: issue.code ?? null,
					resolutionNote: issue.resolutionNote ?? null,
					author: issue.createdById ? (userMap.get(issue.createdById) ?? null) : null,
					createdAt: issue.createdAt.toISOString(),
					updatedAt: issue.updatedAt.toISOString(),
					comments: (commentsByIssue.get(issue.id) ?? []).map(c => ({
						author: userMap.get(c.userId) ?? null,
						text: c.text,
						createdAt: c.createdAt.toISOString(),
					})),
				})),
			};
		});
	}
}
