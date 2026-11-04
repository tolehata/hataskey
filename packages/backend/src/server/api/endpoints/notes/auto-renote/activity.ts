/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { AutoRenoteService } from '@/core/AutoRenoteService.js';

export const meta = {
	tags: ['notes'],
	requireCredential: true,
	secure: true,
	kind: 'write:notes',
	limit: { duration: 60_000, max: 10 },
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	additionalProperties: false,
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(private autoRenoteService: AutoRenoteService) {
		super(meta, paramDef, async (_ps, me) => {
			await this.autoRenoteService.recordActivity(me.id);
		});
	}
}
