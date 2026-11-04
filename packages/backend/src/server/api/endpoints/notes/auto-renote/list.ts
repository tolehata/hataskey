/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { AutoRenoteService, autoRenoteErrors } from '@/core/AutoRenoteService.js';
import { scheduleSchema, listProperties } from './common.js';

export const meta = {
	tags: ['notes'], requireCredential: true, secure: true,
	kind: 'read:account',
	limit: { duration: 60 * 1000, max: 60 },
	res: {
		type: 'object', optional: false, nullable: false,
		properties: {
			schedules: { type: 'array', optional: false, nullable: false, items: scheduleSchema },
			usage: { type: 'object', optional: false, nullable: false, properties: {
				month: { type: 'string', optional: false, nullable: false },
				count: { type: 'number', optional: false, nullable: false },
				limit: { type: 'number', optional: false, nullable: false },
			} },
			enabled: { type: 'boolean', optional: false, nullable: false },
			lastActiveAt: { type: 'string', optional: false, nullable: false, format: 'date-time' },
		},
	},
	errors: autoRenoteErrors,
} as const;

export const paramDef = {
	type: 'object',
	properties: { ...listProperties,
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(private service: AutoRenoteService) {
		super(meta, paramDef, async (ps, me) => service.list(me.id, ps));
	}
}
