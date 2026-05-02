/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Injectable } from '@nestjs/common';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { WhackEmojiRoomService } from '@/core/WhackEmojiRoomService.js';
import { ApiError } from '../../error.js';

export const meta = {
	requireCredential: true,
	kind: 'write:account',
	limit: {
		duration: ms('1hour'),
		max: 60,
		minInterval: ms('1sec'),
	},
	errors: {
		noSuchRoom: { message: 'No such room.', code: 'NO_SUCH_ROOM', id: 'b1c2d3e4-whack-room-not-found' },
		cannotJoinOwnRoom: { message: 'Cannot join own room.', code: 'CANNOT_JOIN_OWN_ROOM', id: 'b1c2d3e6-whack-own-room' },
		roomNotWaiting: { message: 'Room is not available.', code: 'ROOM_NOT_WAITING', id: 'b1c2d3e5-whack-room-full' },
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: { roomId: { type: 'string', format: 'misskey:id' } },
	required: ['roomId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(private svc: WhackEmojiRoomService) {
		super(meta, paramDef, async (ps, me) => {
			try {
				const room = await this.svc.joinRoom(ps.roomId, me);
				return await this.svc.packRoom(room, me);
			} catch (e: any) {
				if (e.message === 'Room not found') throw new ApiError(meta.errors.noSuchRoom);
				if (e.message === 'Cannot join own room') throw new ApiError(meta.errors.cannotJoinOwnRoom);
				throw new ApiError(meta.errors.roomNotWaiting);
			}
		});
	}
}
