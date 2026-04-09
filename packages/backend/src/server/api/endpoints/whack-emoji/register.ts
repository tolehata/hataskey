/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { IdService } from '@/core/IdService.js';
import type { WhackEmojiRecordsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	requireCredential: true,
	kind: 'write:account',
	limit: {
		duration: ms('1hour'),
		max: 120,
		minInterval: ms('10sec'),
	},
	errors: {},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		score: { type: 'integer', minimum: 0 },
		difficulty: { type: 'integer', minimum: 0, maximum: 10 },
		hits: { type: 'integer', minimum: 0 },
		misses: { type: 'integer', minimum: 0 },
	},
	required: ['score', 'difficulty'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.whackEmojiRecordsRepository)
		private whackEmojiRecordsRepository: WhackEmojiRecordsRepository,
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const now = new Date();
			await this.whackEmojiRecordsRepository.insert({
				id: this.idService.gen(now.getTime()),
				userId: me.id,
				createdAt: now,
				score: ps.score,
				difficulty: ps.difficulty,
				hits: ps.hits ?? 0,
				misses: ps.misses ?? 0,
			});
		});
	}
}
