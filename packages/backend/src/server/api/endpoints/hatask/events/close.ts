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
			id: 'hb5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
		},
		notOwner: {
			message: 'You are not the owner of this event.',
			code: 'NOT_OWNER',
			id: 'hc6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		eventId: { type: 'string', minLength: 1 },
		closed: { type: 'boolean' },
	},
	required: ['eventId', 'closed'],
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

			await this.hataskEventsRepository.update(event.id, {
				rsvpClosed: ps.closed,
			});

			return { id: event.id, rsvpClosed: ps.closed };
		});
	}
}
