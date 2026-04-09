/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { StackingGameRoomService } from '@/core/StackingGameRoomService.js';

export const meta = {
	requireCredential: true,
	kind: 'write:account',
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		gameMode: { type: 'string', default: 'custom' },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(private stackingGameRoomService: StackingGameRoomService) {
		super(meta, paramDef, async (ps, me) => {
			const room = await this.stackingGameRoomService.createRoom(me, ps.gameMode ?? 'custom');
			return await this.stackingGameRoomService.packRoom(room, me);
		});
	}
}
