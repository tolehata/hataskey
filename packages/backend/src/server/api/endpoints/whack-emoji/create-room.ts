/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Injectable } from '@nestjs/common';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { WhackEmojiRoomService } from '@/core/WhackEmojiRoomService.js';

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
	properties: { difficulty: { type: 'integer', minimum: 1, maximum: 10, default: 5 } },
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(private svc: WhackEmojiRoomService) {
		super(meta, paramDef, async (ps, me) => {
			const room = await this.svc.createRoom(me, ps.difficulty ?? 5);
			return await this.svc.packRoom(room, me);
		});
	}
}
