/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { AutoRenoteService, autoRenoteErrors } from '@/core/AutoRenoteService.js';
import { scheduleSchema } from './common.js';

export const meta = {
	tags: ['notes'], requireCredential: true, secure: true, prohibitMoved: true,
	kind: 'write:notes',
	limit: { duration: 60 * 60 * 1000, max: 120 },
	res: scheduleSchema,
	errors: autoRenoteErrors,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		scheduleId: { type: 'string', format: 'misskey:id' },
	},
	required: ['scheduleId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(private service: AutoRenoteService) {
		super(meta, paramDef, async (ps, me) => service.change(me.id, ps.scheduleId, 'resume'));
	}
}
