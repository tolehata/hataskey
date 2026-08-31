/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-FileCopyrightText: noridev and cherrypick-project
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { MiMeta, RegistrationApplicationsRepository } from '@/models/_.js';
import { assertRegistrationApplicationsEnabled, registrationApplicationsDisabledError } from '@/core/registration-application-policy.js';

export const meta = {
	tags: ['admin'],
	requireCredential: true,
	requireModerator: true,
	requireAdmin: true,
	secure: true,
	kind: 'read:admin:registration-applications',
	errors: { registrationApplicationsDisabled: registrationApplicationsDisabledError },

	res: {
		type: 'array',
		items: {
			type: 'object',
			properties: {
				id: { type: 'string' },
				// 旗鯖fork: reject 後は null になる
				username: { type: 'string', nullable: true },
				reason: { type: 'string' },
				// 旗鯖fork: 却下済み申請は申請日から90日経過後の定期削除まで保持
				email: { type: 'string', nullable: true },
				additionalContacts: { type: 'string', nullable: true },
				status: { type: 'string' },
				createdAt: { type: 'string' },
				// 旗鯖fork: 個人情報削除済みフラグと削除日時
				personalDataDeletedAt: { type: 'string', nullable: true },
				rejectedAt: { type: 'string', nullable: true },
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
		@Inject(DI.meta)
		private serverMeta: MiMeta,

		@Inject(DI.registrationApplicationsRepository)
		private registrationApplicationsRepository: RegistrationApplicationsRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			assertRegistrationApplicationsEnabled(this.serverMeta);
			const applications = await this.registrationApplicationsRepository.find({
				select: {
					id: true, username: true, reason: true, email: true, status: true,
					createdAt: true, personalDataDeletedAt: true, rejectedAt: true,
					additionalContacts: ps.status === 'pending',
				},
				where: { status: ps.status },
				order: { createdAt: 'DESC' },
				take: ps.limit,
				skip: ps.offset,
			});

			assertRegistrationApplicationsEnabled(this.serverMeta);
			return applications.map(app => ({
				id: app.id,
				username: app.username,
				reason: app.reason,
				email: app.email,
				additionalContacts: ps.status === 'pending' && app.status === 'pending' ? app.additionalContacts ?? null : null,
				status: app.status,
				createdAt: app.createdAt.toISOString(),
				personalDataDeletedAt: app.personalDataDeletedAt ? app.personalDataDeletedAt.toISOString() : null,
				rejectedAt: app.rejectedAt ? app.rejectedAt.toISOString() : null,
			}));
		});
	}
}
