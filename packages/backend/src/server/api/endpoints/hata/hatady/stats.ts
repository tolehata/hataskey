/*
 * 旗鯖fork: Hatady マイログのヘッダ統計 + 学習ヒートマップ + 分野別フォーカスを取得する。
 */
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { HatadyService } from '@/core/HatadyService.js';

export const meta = {
	tags: ['hata'],
	requireCredential: true,
	kind: 'read:account',
	res: { type: 'object', optional: false, nullable: false },
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private hatadyService: HatadyService,
	) {
		super(meta, paramDef, async (ps, me) => {
			return await this.hatadyService.getStats(me.id);
		});
	}
}
