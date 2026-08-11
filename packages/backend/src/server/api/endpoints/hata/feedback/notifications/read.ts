import ms from 'ms';
/*
 * 旗鯖fork: HataFeed のフィードバックセンター内通知を既読にする。
 * notificationId 指定時は本人のその通知だけ、省略時は従来どおり本人の通知をすべて既読にする。
 */
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { FeedbackService } from '@/core/FeedbackService.js';

export const meta = {
	tags: ['hata'],
	requireCredential: true,
	kind: 'write:account',
	limit: { duration: ms('1min'), max: 30 },
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		notificationId: { type: 'string', format: 'misskey:id' },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private feedbackService: FeedbackService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (ps.notificationId != null) {
				await this.feedbackService.markNotificationRead(me.id, ps.notificationId);
			} else {
				await this.feedbackService.markAllNotificationsRead(me.id);
			}
		});
	}
}
