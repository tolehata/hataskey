/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { StackingGameRoomService } from '@/core/StackingGameRoomService.js';
import { ApiError } from '../../error.js';

const ALLOWED_GAME_MODES = new Set<string>([
	'custom', 'sprint', 'marathon', 'endless', 'battle', 'training', 'classic',
]);

export const meta = {
	requireCredential: true,
	kind: 'write:account',
	limit: {
		duration: ms('1hour'),
		max: 30,
		minInterval: ms('5sec'),
	},
	errors: {
		invalidGameMode: { message: 'Invalid game mode.', code: 'INVALID_GAME_MODE', id: 'a1b2c3d4-stacking-create-mode' },
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		gameMode: { type: 'string', minLength: 1, maxLength: 32, default: 'custom' },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(private stackingGameRoomService: StackingGameRoomService) {
		super(meta, paramDef, async (ps, me) => {
			const mode = ps.gameMode ?? 'custom';
			if (!ALLOWED_GAME_MODES.has(mode)) {
				throw new ApiError(meta.errors.invalidGameMode);
			}
			const room = await this.stackingGameRoomService.createRoom(me, mode);
			return await this.stackingGameRoomService.packRoom(room, me);
		});
	}
}
