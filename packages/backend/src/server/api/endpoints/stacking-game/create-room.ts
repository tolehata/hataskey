/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { StackingGameRoomService } from '@/core/StackingGameRoomService.js';

export const meta = {
	requireCredential: true,
	kind: 'write:account',
	limit: {
		duration: ms('1hour'),
		max: 30,
		minInterval: ms('5sec'),
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(private stackingGameRoomService: StackingGameRoomService) {
		super(meta, paramDef, async (ps, me) => {
			const room = await this.stackingGameRoomService.createRoom(me);
			return await this.stackingGameRoomService.packRoom(room, me);
		});
	}
}
