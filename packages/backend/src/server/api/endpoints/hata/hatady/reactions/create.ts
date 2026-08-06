/*
 * 旗鯖fork: Hatady の学習ログ / コメントにリアクションする(hataskey 共通の絵文字ピッカー由来の文字列)。
 *   logId か commentId のどちらか一方を指定。1ユーザー1対象1リアクション(再指定で置き換え)。
 */
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { HATADY_RATE_LIMITS } from '@/misc/hatady-rate-limit.js';
import { ApiError } from '@/server/api/error.js';
import { HatadyService } from '@/core/HatadyService.js';

export const meta = {
	tags: ['hata'],
	requireCredential: true,
	kind: 'write:account',
	limit: HATADY_RATE_LIMITS.write,
	errors: {
		invalidTarget: {
			message: 'Specify exactly one of logId or commentId.',
			code: 'INVALID_TARGET',
			id: 'd2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		logId: { type: 'string', format: 'misskey:id', nullable: true },
		commentId: { type: 'string', format: 'misskey:id', nullable: true },
		reaction: { type: 'string', minLength: 1, maxLength: 260 },
	},
	required: ['reaction'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private hatadyService: HatadyService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const hasLog = ps.logId != null;
			const hasComment = ps.commentId != null;
			if (hasLog === hasComment) throw new ApiError(meta.errors.invalidTarget); // 両方 or 両方無しはNG
			await this.hatadyService.react(me, { logId: ps.logId ?? null, commentId: ps.commentId ?? null }, ps.reaction);
		});
	}
}
