/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { GetterService } from '@/server/api/GetterService.js';
import { ChannelService } from '@/core/ChannelService.js';
import type { ChannelsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { MiMeta } from '@/models/Meta.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['notes'],

	requireCredential: false,

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'Note',
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '24fcbfc6-2e37-42b6-8388-c29b3861a08d',
		},

		contentRestrictedByUser: {
			message: 'Content restricted by user. Please sign in to view.',
			code: 'CONTENT_RESTRICTED_BY_USER',
			id: 'fbcc002d-37d9-4944-a6b0-d9e29f2d33ab',
		},

		contentRestrictedByServer: {
			message: 'Content restricted by server settings. Please sign in to view.',
			code: 'CONTENT_RESTRICTED_BY_SERVER',
			id: '145f88d2-b03d-4087-8143-a78928883c4b',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		noteId: { type: 'string', format: 'misskey:id' },
	},
	required: ['noteId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private serverSettings: MiMeta,

		@Inject(DI.channelsRepository)
		private channelsRepository: ChannelsRepository,

		private noteEntityService: NoteEntityService,
		private getterService: GetterService,
		private channelService: ChannelService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const note = await this.getterService.getNoteWithRelations(ps.noteId).catch(err => {
				if (err.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
				throw err;
			});

			// 旗鯖fork: プライベートチャンネルのノートは、閲覧権限が無ければ存在ごと隠す(noSuchNote)。
			if (note.channelId != null) {
				const channel = note.channel ?? await this.channelsRepository.findOneBy({ id: note.channelId });
				if (channel != null && channel.isPrivate && !await this.channelService.canView(channel, me?.id ?? null)) {
					throw new ApiError(meta.errors.noSuchNote);
				}
			}

			if (note.user!.requireSigninToViewContents && me == null) {
				throw new ApiError(meta.errors.contentRestrictedByUser);
			}

			if (this.serverSettings.ugcVisibilityForVisitor === 'none' && me == null) {
				throw new ApiError(meta.errors.contentRestrictedByServer);
			}

			if (this.serverSettings.ugcVisibilityForVisitor === 'local' && note.userHost != null && me == null) {
				throw new ApiError(meta.errors.contentRestrictedByServer);
			}

			return await this.noteEntityService.pack(note, me, {
				detail: true,
			});
		});
	}
}
