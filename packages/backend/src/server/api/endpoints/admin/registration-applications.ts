/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { RegistrationApplicationsRepository } from '@/models/_.js';

export const meta = {
	tags: ['admin'],
	requireCredential: true,
	requireModerator: true,

	res: {
		type: 'array',
		items: {
			type: 'object',
			properties: {
				id: { type: 'string' },
				username: { type: 'string' },
				reason: { type: 'string' },
				email: { type: 'string' },
				status: { type: 'string' },
				createdAt: { type: 'string' },
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		status: { type: 'string', enum: ['pending', 'approved', 'rejected'], default: 'pending' },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
		offset: { type: 'integer', minimum: 0, default: 0 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.registrationApplicationsRepository)
		private registrationApplicationsRepository: RegistrationApplicationsRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const applications = await this.registrationApplicationsRepository.find({
				where: { status: ps.status },
				order: { createdAt: 'DESC' },
				take: ps.limit,
				skip: ps.offset,
			});

			return applications.map(app => ({
				id: app.id,
				username: app.username,
				reason: app.reason,
				email: app.email,
				status: app.status,
				createdAt: app.createdAt.toISOString(),
			}));
		});
	}
}
