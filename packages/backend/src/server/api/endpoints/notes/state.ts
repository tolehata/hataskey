/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { NotesRepository, NoteThreadMutingsRepository, NoteFavoritesRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['notes'],

	requireCredential: true,
	kind: 'read:account',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			isFavorited: {
				type: 'boolean',
				optional: false, nullable: false,
			},
			favoriteFolderId: {
				type: 'string',
				optional: true, nullable: true,
				format: 'id',
			},
			isMutedThread: {
				type: 'boolean',
				optional: false, nullable: false,
			},
			isRenoted: {
				type: 'boolean',
				optional: false, nullable: false,
			},
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
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.noteThreadMutingsRepository)
		private noteThreadMutingsRepository: NoteThreadMutingsRepository,

		@Inject(DI.noteFavoritesRepository)
		private noteFavoritesRepository: NoteFavoritesRepository,
	) {
		super(meta, paramDef, async (ps, me, token) => {
			const note = await this.notesRepository.findOneByOrFail({ id: ps.noteId });

			const [favorite, threadMuting, renoted] = await Promise.all([
				this.noteFavoritesRepository.findOne({
					where: {
						userId: me.id,
						noteId: note.id,
					},
					select: { id: true, folderId: true },
				}),
				this.noteThreadMutingsRepository.count({
					where: {
						userId: me.id,
						threadId: note.threadId ?? note.id,
					},
					take: 1,
				}),
				this.notesRepository.count({
					where: {
						userId: me.id,
						renoteId: note.id,
					},
					take: 1,
				}),
			]);

			return {
				isFavorited: favorite !== null,
				...(favorite && (token === null || token.permission.includes('read:favorites')) ? { favoriteFolderId: favorite.folderId ?? null } : {}),
				isMutedThread: threadMuting !== 0,
				isRenoted: renoted !== 0,
			};
		});
	}
}
