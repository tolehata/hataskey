import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { EmojiShootRecordsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';

export const meta = { requireCredential: true, kind: 'write:account' } as const;

export const paramDef = {
	type: 'object',
	properties: {
		score: { type: 'integer', minimum: 0 },
		wave: { type: 'integer', minimum: 0 },
		kills: { type: 'integer', minimum: 0 },
		mode: { type: 'string', enum: ['normal', 'debuff'], default: 'normal' },
	},
	required: ['score'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.emojiShootRecordsRepository) private repo: EmojiShootRecordsRepository,
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const now = new Date();
			await this.repo.insert({
				id: this.idService.gen(now.getTime()),
				userId: me.id,
				createdAt: now,
				score: ps.score,
				wave: ps.wave ?? 0,
				kills: ps.kills ?? 0,
				mode: ps.mode ?? 'normal',
			});
		});
	}
}
