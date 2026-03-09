/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { RegistrationApplicationsRepository } from '@/models/_.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	tags: ['admin'],
	requireCredential: true,
	requireModerator: true,

	errors: {
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
		applicationId: { type: 'string' },
	},
	required: ['applicationId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.registrationApplicationsRepository)
		private registrationApplicationsRepository: RegistrationApplicationsRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const application = await this.registrationApplicationsRepository.findOneBy({
				id: ps.applicationId,
			});

			if (!application) {
				throw new ApiError(meta.errors.noSuchApplication);
			}

			if (application.status !== 'pending') {
				throw new ApiError(meta.errors.alreadyProcessed);
			}

			// 却下: ステータス更新のみ。メールは送信しない。
			await this.registrationApplicationsRepository.update(application.id, {
				status: 'rejected',
				rejectedAt: new Date(),
			});

			return { success: true };
		});
	}
}
