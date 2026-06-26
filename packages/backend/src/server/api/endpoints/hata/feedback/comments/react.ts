import ms from 'ms';
/*
 * 旗鯖fork: HataFeed のコメントへのリアクションをトグルする(同じ絵文字なら解除、別なら差し替え)。
 */
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { FeedbackService } from '@/core/FeedbackService.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	tags: ['hata'],
	requireCredential: true,
	kind: 'write:account',
	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: { reacted: { type: 'boolean', optional: false, nullable: false } },
	},
	errors: {
		accessDenied: { message: 'HataFeed is not available for your account.', code: 'HATAFEED_ACCESS_DENIED', id: 'c8d7f819-e477-4587-e1a3-708192031425' },
	},
	limit: { duration: ms('1min'), max: 60 },
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		commentId: { type: 'string', format: 'misskey:id' },
		reaction: { type: 'string', minLength: 1, maxLength: 260 },
	},
	required: ['commentId', 'reaction'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private feedbackService: FeedbackService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (!await this.feedbackService.canAccess(me.id)) throw new ApiError(meta.errors.accessDenied);
			const reacted = await this.feedbackService.toggleCommentReaction(me, ps.commentId, ps.reaction);
			return { reacted };
		});
	}
}
