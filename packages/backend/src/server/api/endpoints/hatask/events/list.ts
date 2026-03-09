import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { MoreThanOrEqual } from 'typeorm';
import type { HataskEventsRepository, HataskRsvpsRepository, UsersRepository } from '@/models/_.js';

export const meta = {
	tags: ['hatask'],
	requireCredential: true,
	kind: 'read:account',
	res: { type: 'array', items: { type: 'object' } },
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 50, default: 30 },
		includeExpired: { type: 'boolean', default: false },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.hataskEventsRepository) private hataskEventsRepository: HataskEventsRepository,
		@Inject(DI.hataskRsvpsRepository) private hataskRsvpsRepository: HataskRsvpsRepository,
		@Inject(DI.usersRepository) private usersRepository: UsersRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const today = new Date().toISOString().slice(0, 10);
			const where: any = {};
			if (!ps.includeExpired) {
				where.date = MoreThanOrEqual(today);
			}

			const events = await this.hataskEventsRepository.find({
				where,
				order: { date: 'ASC', createdAt: 'DESC' },
				take: ps.limit ?? 30,
			});

			const result = [];
			for (const ev of events) {
				// RSVP回答を取得（rsvp有効なイベントのみ）
				let rsvpResponses: any[] = [];
				if (ev.rsvp) {
					const rsvps = await this.hataskRsvpsRepository.find({
						where: { eventId: ev.id },
					});
					for (const r of rsvps) {
						const user = await this.usersRepository.findOneBy({ id: r.userId });
						rsvpResponses.push({
							userId: r.userId,
							username: user?.username ?? 'unknown',
							avatarUrl: (user as any)?.avatarUrl ?? null,
							status: r.status,
							respondedAt: r.respondedAt.toISOString(),
						});
					}
				}

				const creator = await this.usersRepository.findOneBy({ id: ev.userId });

				result.push({
					id: ev.id,
					userId: ev.userId,
					username: creator?.username ?? 'unknown',
					avatarUrl: (creator as any)?.avatarUrl ?? null,
					title: ev.title,
					emoji: ev.emoji,
					date: ev.date,
					dateEnd: ev.dateEnd,
					timeStart: ev.timeStart,
					timeEnd: ev.timeEnd,
					allDay: ev.allDay,
					color: ev.color,
					rsvp: ev.rsvp,
					rsvpClosed: ev.rsvpClosed,
					createdAt: ev.createdAt.toISOString(),
					rsvpResponses,
					isOwner: ev.userId === me.id,
				});
			}

			return result;
		});
	}
}
