/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { WhackEmojiRecordsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';

export const meta = {
	allowGet: true,
	cacheSec: 60,
	limit: {
		duration: ms('1minute'),
		max: 60,
	},
	errors: {},
	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			properties: {
				id: { type: 'string', format: 'misskey:id', optional: false, nullable: false },
				score: { type: 'integer', optional: false, nullable: false },
				difficulty: { type: 'integer', optional: false, nullable: false },
				hits: { type: 'integer', optional: false, nullable: false },
				misses: { type: 'integer', optional: false, nullable: false },
				createdAt: { type: 'string', format: 'date-time', optional: false, nullable: false },
				user: { type: 'object', optional: true, nullable: false, ref: 'UserLite' },
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		difficulty: { type: 'integer', minimum: 1, maximum: 10 },
	},
	required: ['difficulty'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.whackEmojiRecordsRepository)
		private whackEmojiRecordsRepository: WhackEmojiRecordsRepository,
		private userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps) => {
			const records = await this.whackEmojiRecordsRepository
				.createQueryBuilder('r')
				.leftJoinAndSelect('r.user', 'user')
				.where('r.difficulty = :diff', { diff: ps.difficulty })
				.orderBy('r.score', 'DESC')
				.take(30)
				.getMany();

			const seen = new Set<string>();
			const unique = records.filter(r => {
				if (seen.has(r.userId)) return false;
				seen.add(r.userId);
				return true;
			}).slice(0, 10);

			const users = await this.userEntityService.packMany(unique.map(r => r.user!).filter(Boolean), null);

			return unique.map(r => ({
				id: r.id,
				score: r.score,
				difficulty: r.difficulty,
				hits: r.hits,
				misses: r.misses,
				createdAt: r.createdAt.toISOString(),
				user: users.find(u => u.id === r.userId),
			}));
		});
	}
}
