/*
 * 旗鯖fork(Hatady): モデレーター/管理者が任意ユーザーの本を削除する(全本タブ用)。
 */
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { HATADY_RATE_LIMITS } from '@/misc/hatady-rate-limit.js';
import { HatadyService } from '@/core/HatadyService.js';

export const meta = {
	tags: ['hata'],
	requireCredential: true,
	requireModerator: true,
	secure: true,
	kind: 'write:account',
	limit: HATADY_RATE_LIMITS.adminDestructive,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		bookId: { type: 'string', format: 'misskey:id' },
	},
	required: ['bookId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private hatadyService: HatadyService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.hatadyService.forceDeleteBook(ps.bookId);
		});
	}
}
