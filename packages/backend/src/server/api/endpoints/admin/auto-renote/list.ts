/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { AutoRenoteService, autoRenoteErrors } from '@/core/AutoRenoteService.js';
import { scheduleSchema, listProperties } from '../../notes/auto-renote/common.js';

export const meta = {
	tags: ['admin'], requireCredential: true, requireAdmin: true, secure: true,
	kind: 'read:admin:auto-renote',
	limit: { duration: 60 * 1000, max: 60 },
	res: {
		type: 'object', optional: false, nullable: false,
		properties: {
			schedules: { type: 'array', optional: false, nullable: false, items: scheduleSchema },
		},
	},
	errors: autoRenoteErrors,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		...listProperties,
		userId: { type: 'string', format: 'misskey:id' },
		query: { type: 'string', maxLength: 200 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(private service: AutoRenoteService) {
		super(meta, paramDef, async (ps, me) => service.adminList(me.id, ps));
	}
}
