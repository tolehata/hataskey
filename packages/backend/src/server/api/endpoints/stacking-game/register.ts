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
import { ApiError } from '@/server/api/error.js';

// 改ざん防止のための実用上限
const MAX_REASONABLE_SCORE = 1_000_000;
const MAX_REASONABLE_BLOCK_COUNT = 100_000;

// gameMode は許可リスト方式に絞る
// (任意文字列を許すとランキング集計時に未知モードが混入する可能性がある)
const ALLOWED_GAME_MODES = new Set<string>([
	'sprint', 'marathon', 'endless', 'battle', 'training', 'classic',
]);

export const meta = {
	requireCredential: true,

	kind: 'write:account',

	limit: {
		duration: ms('1hour'),
		max: 120,
		minInterval: ms('10sec'),
	},

	errors: {
		invalidScore: {
			message: 'Score is out of acceptable range or inconsistent.',
			code: 'INVALID_SCORE',
			id: 'e0000001-0001-0001-0001-000000000001',
		},
		invalidGameMode: {
			message: 'Invalid game mode.',
			code: 'INVALID_GAME_MODE',
			id: 'e0000001-0001-0001-0001-000000000002',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		score: { type: 'integer', minimum: 0, maximum: MAX_REASONABLE_SCORE },
		gameMode: { type: 'string', minLength: 1, maxLength: 32 },
		blockCount: { type: 'integer', minimum: 0, maximum: MAX_REASONABLE_BLOCK_COUNT },
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
			if (!ALLOWED_GAME_MODES.has(ps.gameMode)) {
				throw new ApiError(meta.errors.invalidGameMode);
			}

			const blockCount = ps.blockCount ?? 0;
			// 整合性: ブロック数 0 でスコア > 0 はあり得ない
			if (blockCount === 0 && ps.score > 0) {
				throw new ApiError(meta.errors.invalidScore);
			}

			const now = new Date();

			await this.stackingGameRecordsRepository.insert({
				id: this.idService.gen(now.getTime()),
				userId: me.id,
				createdAt: now,
				score: ps.score,
				gameMode: ps.gameMode,
				blockCount,
			});
		});
	}
}
