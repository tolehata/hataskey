/*
 * 旗鯖fork: Hatady の学習ログを編集する(本人のみ)。
 */
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { HATADY_RATE_LIMITS } from '@/misc/hatady-rate-limit.js';
import { ApiError } from '@/server/api/error.js';
import { HatadyService } from '@/core/HatadyService.js';
import { HatadyEntityService } from '@/core/entities/HatadyEntityService.js';

export const meta = {
	tags: ['hata'],
	requireCredential: true,
	kind: 'write:account',
	limit: HATADY_RATE_LIMITS.write,
	res: { type: 'object', optional: false, nullable: false },
	errors: {
		noSuchLog: {
			message: 'No such log or access denied.',
			code: 'NO_SUCH_LOG',
			id: 'a2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		logId: { type: 'string', format: 'misskey:id' },
		title: { type: 'string', minLength: 1, maxLength: 512 },
		subject: { type: 'string', minLength: 1, maxLength: 64 },
		tag: { type: 'string', enum: ['strength', 'weak', 'interest'], nullable: true },
		body: { type: 'string', maxLength: 4096, nullable: true },
		durationMinutes: { type: 'integer', minimum: 0, maximum: 100000 },
		isPublic: { type: 'boolean' },
		visibility: { type: 'string', enum: ['public', 'followers', 'private'] },
	},
	required: ['logId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private hatadyService: HatadyService,
		private hatadyEntityService: HatadyEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			try {
				const log = await this.hatadyService.updateLog(me, ps.logId, {
					title: ps.title,
					subject: ps.subject,
					tag: ps.tag,
					body: ps.body,
					durationMinutes: ps.durationMinutes,
					isPublic: ps.isPublic,
					visibility: ps.visibility,
				});
				return await this.hatadyEntityService.packLog(log, me);
			} catch {
				throw new ApiError(meta.errors.noSuchLog);
			}
		});
	}
}
