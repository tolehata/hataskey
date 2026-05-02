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
import { ApiError } from '@/server/api/error.js';

// クライアント側ゲームロジック上の現実的な最大スコア
// (難易度10エンドレスで6分間ノーミス完走しても 50,000 を超えない想定)
// 改ざん防止のため強めの上限を設ける
const MAX_REASONABLE_SCORE = 200_000;
const MAX_REASONABLE_HITS = 5_000;
const MAX_REASONABLE_MISSES = 5_000;

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
			message: 'Score is out of acceptable range or inconsistent with hit/miss counts.',
			code: 'INVALID_SCORE',
			id: 'd0000001-0001-0001-0001-000000000001',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		score: { type: 'integer', minimum: 0, maximum: MAX_REASONABLE_SCORE },
		difficulty: { type: 'integer', minimum: 0, maximum: 10 },
		hits: { type: 'integer', minimum: 0, maximum: MAX_REASONABLE_HITS },
		misses: { type: 'integer', minimum: 0, maximum: MAX_REASONABLE_MISSES },
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
			const hits = ps.hits ?? 0;
			const misses = ps.misses ?? 0;

			// サニティチェック: スコアと hits の整合性
			// クライアント側のスコア上限は scorePerHit = 10 + (difficulty-1)*5 = 最大 55/hit、
			// エンドレスのレベル乗数も加味し、実用上 hits * 200 を上限と見なす
			const sanityMaxScore = Math.max(100, hits * 200);
			if (ps.score > sanityMaxScore) {
				throw new ApiError(meta.errors.invalidScore);
			}
			// hits=0 で score>0 もあり得ない
			if (hits === 0 && ps.score > 0) {
				throw new ApiError(meta.errors.invalidScore);
			}

			const now = new Date();
			await this.whackEmojiRecordsRepository.insert({
				id: this.idService.gen(now.getTime()),
				userId: me.id,
				createdAt: now,
				score: ps.score,
				difficulty: ps.difficulty,
				hits,
				misses,
			});
		});
	}
}
