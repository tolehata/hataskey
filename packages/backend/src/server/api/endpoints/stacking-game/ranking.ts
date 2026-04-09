/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { StackingGameRecordsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';

export const meta = {
	allowGet: true,
	cacheSec: 60,

	errors: {
	},

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			properties: {
				id: {
					type: 'string', format: 'misskey:id',
					optional: false, nullable: false,
				},
				score: {
					type: 'integer',
					optional: false, nullable: false,
				},
				blockCount: {
					type: 'integer',
					optional: false, nullable: false,
				},
				createdAt: {
					type: 'string', format: 'date-time',
					optional: false, nullable: false,
				},
				user: {
					type: 'object',
					optional: true, nullable: false,
					ref: 'UserLite',
				},
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		gameMode: { type: 'string' },
	},
	required: ['gameMode'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.stackingGameRecordsRepository)
		private stackingGameRecordsRepository: StackingGameRecordsRepository,

		private userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps) => {
			// 各ユーザーのベストスコアのみ取得（サブクエリで最高スコアのレコードIDを取得）
			const records = await this.stackingGameRecordsRepository
				.createQueryBuilder('r')
				.innerJoin(
					(qb) => qb
						.select('r2."userId"', 'uid')
						.addSelect('MAX(r2.score)', 'maxScore')
						.from('stacking_game_record', 'r2')
						.where('r2."gameMode" = :mode', { mode: ps.gameMode })
						.groupBy('r2."userId"'),
					'best',
					'r."userId" = best.uid AND r.score = best."maxScore"',
				)
				.leftJoinAndSelect('r.user', 'user')
				.where('r."gameMode" = :mode', { mode: ps.gameMode })
				.orderBy('r.score', 'DESC')
				.take(20)
				.getMany();

			// ユーザーごとに1件だけに絞る（同スコアの場合最新を優先）
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
				blockCount: r.blockCount,
				createdAt: r.createdAt.toISOString(),
				user: users.find(u => u.id === r.userId),
			}));
		});
	}
}
