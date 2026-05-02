/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Injectable } from '@nestjs/common';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { WhackEmojiRoomService } from '@/core/WhackEmojiRoomService.js';

export const meta = {
	allowGet: true,
	cacheSec: 5,
	limit: {
		duration: ms('1minute'),
		max: 120,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: { roomId: { type: 'string', format: 'misskey:id' } },
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(private svc: WhackEmojiRoomService) {
		super(meta, paramDef, async (ps, me) => {
			if (ps.roomId) {
				const room = await this.svc.getRoom(ps.roomId);
				if (!room) return null;
				return await this.svc.packRoom(room, me ?? null);
			}
			const rooms = await this.svc.getWaitingRooms();
			return await Promise.all(rooms.map(r => this.svc.packRoom(r, me ?? null)));
		});
	}
}
