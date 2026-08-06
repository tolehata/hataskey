/*
 * 旗鯖fork: Hatady の学習ログを記録する。
 */
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { HATADY_RATE_LIMITS } from '@/misc/hatady-rate-limit.js';
import { HatadyService } from '@/core/HatadyService.js';
import { HatadyEntityService } from '@/core/entities/HatadyEntityService.js';

export const meta = {
	tags: ['hata'],
	requireCredential: true,
	kind: 'write:account',
	limit: HATADY_RATE_LIMITS.write,
	res: { type: 'object', optional: false, nullable: false },
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		title: { type: 'string', minLength: 1, maxLength: 512 },
		subject: { type: 'string', minLength: 1, maxLength: 64 },
		tag: { type: 'string', enum: ['strength', 'weak', 'interest'], nullable: true },
		body: { type: 'string', maxLength: 4096, nullable: true },
		bookId: { type: 'string', format: 'misskey:id', nullable: true },
		pageFrom: { type: 'integer', nullable: true },
		pageTo: { type: 'integer', nullable: true },
		durationMinutes: { type: 'integer', minimum: 0, maximum: 100000, default: 0 },
		studiedAt: { type: 'string', nullable: true },
		isPublic: { type: 'boolean' },
		visibility: { type: 'string', enum: ['public', 'followers', 'private'] },
	},
	required: ['title', 'subject'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private hatadyService: HatadyService,
		private hatadyEntityService: HatadyEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const studiedAt = ps.studiedAt ? new Date(ps.studiedAt) : null;
			const log = await this.hatadyService.createLog(me, {
				title: ps.title,
				subject: ps.subject,
				tag: ps.tag ?? null,
				body: ps.body ?? null,
				bookId: ps.bookId ?? null,
				pageFrom: ps.pageFrom ?? null,
				pageTo: ps.pageTo ?? null,
				durationMinutes: ps.durationMinutes,
				studiedAt: (studiedAt && !isNaN(studiedAt.getTime())) ? studiedAt : null,
				isPublic: ps.isPublic,
				visibility: ps.visibility,
			});
			return await this.hatadyEntityService.packLog(log, me);
		});
	}
}
