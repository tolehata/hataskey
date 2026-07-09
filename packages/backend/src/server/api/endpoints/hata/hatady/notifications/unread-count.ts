/*
 * 旗鯖fork(1h): Hatady の未読通知件数を取得する(ヘッダーのベルバッジ用)。
 */
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { HatadyService } from '@/core/HatadyService.js';

export const meta = {
	tags: ['hata'],
	requireCredential: true,
	kind: 'read:account',
	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			count: { type: 'integer', optional: false, nullable: false },
		},
	},
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
			const count = await this.hatadyService.getUnreadNotificationCount(me.id);
			return { count };
		});
	}
}
