import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { HataskEventsRepository, HataskRsvpsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['hatask'],
	requireCredential: true,
	kind: 'write:account',
	limit: { duration: 1000 * 60, max: 30 },
	errors: {
		noSuchEvent: {
			message: 'No such event.',
			code: 'NO_SUCH_EVENT',
			id: 'h7a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5',
		},
		eventClosed: {
			message: 'RSVP is closed for this event.',
			code: 'EVENT_CLOSED',
			id: 'h8b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		eventId: { type: 'string', minLength: 1 },
		status: { type: 'string', enum: ['going', 'maybe', 'declined'] },
	},
	required: ['eventId', 'status'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.hataskEventsRepository) private hataskEventsRepository: HataskEventsRepository,
		@Inject(DI.hataskRsvpsRepository) private hataskRsvpsRepository: HataskRsvpsRepository,
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const event = await this.hataskEventsRepository.findOneBy({ id: ps.eventId });
			if (!event) {
				throw new ApiError(meta.errors.noSuchEvent);
			}
			if (event.rsvpClosed) {
				throw new ApiError(meta.errors.eventClosed);
			}

			// upsert: ユーザーの回答を上書き
			const existing = await this.hataskRsvpsRepository.findOneBy({
				eventId: ps.eventId,
				userId: me.id,
			});

			if (existing) {
				await this.hataskRsvpsRepository.update(existing.id, {
					status: ps.status,
					respondedAt: new Date(),
				});
				return { id: existing.id, status: ps.status };
			} else {
				const rsvp = {
					id: this.idService.gen(),
					eventId: ps.eventId,
					userId: me.id,
					status: ps.status,
					respondedAt: new Date(),
				};
				await this.hataskRsvpsRepository.insert(rsvp);
				return { id: rsvp.id, status: ps.status };
			}
		});
	}
}
