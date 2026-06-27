import ms from 'ms';
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { HataskEventsRepository } from '@/models/_.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['hatask'],
	requireCredential: true,
	kind: 'write:account',
	errors: {
		noSuchEvent: {
			message: 'No such event.',
			code: 'NO_SUCH_EVENT',
			id: 'h9c3d4e5-f6a7-b8c9-d0e1-f2a3b4c5d6e7',
		},
		notOwner: {
			message: 'You are not the owner of this event.',
			code: 'NOT_OWNER',
			id: 'ha4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
		},
	},
	// 旗鯖fork(セキュリティ): イベント削除は CASCADE で関連 RSVP も消す破壊的操作。1時間30回。
	limit: { duration: ms('1hour'), max: 30 },
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		eventId: { type: 'string', minLength: 1 },
	},
	required: ['eventId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.hataskEventsRepository) private hataskEventsRepository: HataskEventsRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const event = await this.hataskEventsRepository.findOneBy({ id: ps.eventId });
			if (!event) {
				throw new ApiError(meta.errors.noSuchEvent);
			}
			if (event.userId !== me.id) {
				throw new ApiError(meta.errors.notOwner);
			}

			// CASCADE で hatask_rsvp も自動削除
			await this.hataskEventsRepository.delete(event.id);
		});
	}
}
