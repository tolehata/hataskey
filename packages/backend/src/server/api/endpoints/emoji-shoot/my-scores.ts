import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { EmojiShootRecordsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';

export const meta = { requireCredential: true } as const;
export const paramDef = { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 30, default: 10 } }, required: [] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(@Inject(DI.emojiShootRecordsRepository) private repo: EmojiShootRecordsRepository) {
		super(meta, paramDef, async (ps, me) => {
			return await this.repo.find({ where: { userId: me.id }, order: { score: 'DESC' }, take: ps.limit ?? 10 });
		});
	}
}
