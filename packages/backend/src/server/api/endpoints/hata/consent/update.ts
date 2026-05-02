/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { UserProfilesRepository } from '@/models/_.js';

export const meta = {
	tags: ['hata'],

	requireCredential: true,

	kind: 'write:account',

	limit: {
		duration: ms('1hour'),
		max: 60,
		minInterval: ms('1sec'),
	},

	res: {
		type: 'object',
		nullable: false, optional: false,
		properties: {
			ok: { type: 'boolean', nullable: false, optional: false },
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		type: {
			type: 'string',
			enum: ['externalTl', 'customFont'],
		},
		agree: { type: 'boolean' },
	},
	required: ['type', 'agree'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const now = new Date();

			if (ps.type === 'externalTl') {
				await this.userProfilesRepository.update(me.id, {
					hataConsentExternalTl: ps.agree,
					hataConsentExternalTlDate: ps.agree ? now : null,
				});
			} else if (ps.type === 'customFont') {
				await this.userProfilesRepository.update(me.id, {
					hataConsentCustomFont: ps.agree,
					hataConsentCustomFontDate: ps.agree ? now : null,
				});
			}

			return { ok: true };
		});
	}
}
