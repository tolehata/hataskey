/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { StackingGameRoomService } from '@/core/StackingGameRoomService.js';
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
		noSuchRoom: { message: 'No such room.', code: 'NO_SUCH_ROOM', id: 'a1b2c3d4-stacking-room-not-found' },
		cannotJoinOwnRoom: { message: 'Cannot join own room.', code: 'CANNOT_JOIN_OWN_ROOM', id: 'a1b2c3d6-stacking-own-room' },
		roomNotWaiting: { message: 'Room is not available.', code: 'ROOM_NOT_WAITING', id: 'a1b2c3d5-stacking-room-full' },
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		roomId: { type: 'string', format: 'misskey:id' },
	},
	required: ['roomId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(private stackingGameRoomService: StackingGameRoomService) {
		super(meta, paramDef, async (ps, me) => {
			try {
				const room = await this.stackingGameRoomService.joinRoom(ps.roomId, me);
				return await this.stackingGameRoomService.packRoom(room, me);
			} catch (e: any) {
				if (e.message === 'Room not found') throw new ApiError(meta.errors.noSuchRoom);
				if (e.message === 'Cannot join own room') throw new ApiError(meta.errors.cannotJoinOwnRoom);
				throw new ApiError(meta.errors.roomNotWaiting);
			}
		});
	}
}
