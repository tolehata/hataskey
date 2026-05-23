/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { StackingGameRecordsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	requireCredential: true,

	kind: 'read:account',

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
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 50 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.stackingGameRecordsRepository)
		private stackingGameRecordsRepository: StackingGameRecordsRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const where: any = { userId: me.id };

			const records = await this.stackingGameRecordsRepository.find({
				where,
				order: { score: 'DESC' },
				take: ps.limit ?? 20,
			});

			return records.map(r => ({
				id: r.id,
				score: r.score,
				blockCount: r.blockCount,
				createdAt: r.createdAt.toISOString(),
			}));
		});
	}
}
