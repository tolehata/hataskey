/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { IdService } from '@/core/IdService.js';
import type { StackingGameRecordsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	requireCredential: true,

	kind: 'write:account',

	limit: {
		duration: ms('1hour'),
		max: 120,
		minInterval: ms('10sec'),
	},

	errors: {
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		score: { type: 'integer', minimum: 0 },
		gameMode: { type: 'string', minLength: 1, maxLength: 128 },
		blockCount: { type: 'integer', minimum: 0 },
	},
	required: ['score', 'gameMode'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.stackingGameRecordsRepository)
		private stackingGameRecordsRepository: StackingGameRecordsRepository,

		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const now = new Date();

			await this.stackingGameRecordsRepository.insert({
				id: this.idService.gen(now.getTime()),
				userId: me.id,
				createdAt: now,
				score: ps.score,
				gameMode: ps.gameMode,
				blockCount: ps.blockCount ?? 0,
			});
		});
	}
}
