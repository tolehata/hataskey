/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-FileCopyrightText: noridev and cherrypick-project
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { MiMeta } from '@/models/_.js';
import { MiRegistrationApplication } from '@/models/RegistrationApplication.js';
import { ApiError } from '@/server/api/error.js';
import { assertRegistrationApplicationsEnabled, registrationApplicationsDisabledError } from '@/core/registration-application-policy.js';

export const meta = {
	tags: ['admin'],
	requireCredential: true,
	requireModerator: true,
	requireAdmin: true,
	secure: true,
	kind: 'write:admin:reject-registration',

	errors: {
		registrationApplicationsDisabled: registrationApplicationsDisabledError,
		noSuchApplication: {
			message: 'No such application.',
			code: 'NO_SUCH_APPLICATION',
			id: 'c0000001-0001-0001-0001-000000000001',
		},
		alreadyProcessed: {
			message: 'This application has already been processed.',
			code: 'ALREADY_PROCESSED',
			id: 'c0000001-0001-0001-0001-000000000002',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		applicationId: { type: 'string', minLength: 1, maxLength: 32 },
	},
	required: ['applicationId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.meta)
		private serverMeta: MiMeta,

		@Inject(DI.db)
		private db: DataSource,
	) {
		super(meta, paramDef, async (ps, me) => {
			assertRegistrationApplicationsEnabled(this.serverMeta);
			await this.db.transaction(async transactionalEntityManager => {
				const application = await transactionalEntityManager.findOne(MiRegistrationApplication, {
					where: { id: ps.applicationId },
					lock: { mode: 'pessimistic_write' },
					select: { id: true, status: true },
				});
				assertRegistrationApplicationsEnabled(this.serverMeta);

				if (!application) {
					throw new ApiError(meta.errors.noSuchApplication);
				}

				if (application.status !== 'pending') {
					throw new ApiError(meta.errors.alreadyProcessed);
				}

				// Keep email for the existing 90-day duplicate-application protection.
				// Delete credentials and review-only contacts in the same decision write.
				const now = new Date();
				await transactionalEntityManager.update(MiRegistrationApplication, application.id, {
					status: 'rejected',
					rejectedAt: now,
					username: null,
					hashedPassword: null,
					additionalContacts: null,
					personalDataDeletedAt: now,
				});
				assertRegistrationApplicationsEnabled(this.serverMeta);
			});

			return { success: true };
		});
	}
}
