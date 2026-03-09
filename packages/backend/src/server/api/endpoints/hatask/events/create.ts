import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { HataskEventsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';

export const meta = {
	tags: ['hatask'],
	requireCredential: true,
	kind: 'write:account',
	limit: { duration: 1000 * 60, max: 20 },
	res: { type: 'object' },
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		title: { type: 'string', minLength: 1, maxLength: 256 },
		emoji: { type: 'string', maxLength: 32, default: '📅' },
		date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
		dateEnd: { type: 'string', default: '' },
		timeStart: { type: 'string', default: '' },
		timeEnd: { type: 'string', default: '' },
		allDay: { type: 'boolean', default: false },
		color: { type: 'string', default: '#e27d60' },
		rsvp: { type: 'boolean', default: false },
	},
	required: ['title', 'date'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.hataskEventsRepository) private hataskEventsRepository: HataskEventsRepository,
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const ev = {
				id: this.idService.gen(),
				userId: me.id,
				title: ps.title,
				emoji: ps.emoji ?? '📅',
				date: ps.date,
				dateEnd: ps.dateEnd ?? '',
				timeStart: ps.timeStart ?? '',
				timeEnd: ps.timeEnd ?? '',
				allDay: ps.allDay ?? false,
				color: ps.color ?? '#e27d60',
				rsvp: ps.rsvp ?? false,
				rsvpClosed: false,
				createdAt: new Date(),
			};

			await this.hataskEventsRepository.insert(ev);

			return {
				id: ev.id,
				userId: ev.userId,
				title: ev.title,
				emoji: ev.emoji,
				date: ev.date,
				dateEnd: ev.dateEnd,
				timeStart: ev.timeStart,
				timeEnd: ev.timeEnd,
				allDay: ev.allDay,
				color: ev.color,
				rsvp: ev.rsvp,
				rsvpClosed: false,
				createdAt: ev.createdAt.toISOString(),
				rsvpResponses: [],
			};
		});
	}
}
