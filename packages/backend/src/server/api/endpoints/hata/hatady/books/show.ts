/*
 * 旗鯖fork(1c/1m): Hatady の本の詳細を取得する(本 + 紐づく学習ログ)。
 */
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import { HatadyService } from '@/core/HatadyService.js';
import { HatadyEntityService } from '@/core/entities/HatadyEntityService.js';

export const meta = {
	tags: ['hata'],
	requireCredential: true,
	kind: 'read:account',
	res: { type: 'object', optional: false, nullable: false },
	errors: {
		noSuchBook: {
			message: 'No such book.',
			code: 'NO_SUCH_BOOK',
			id: 'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		bookId: { type: 'string', format: 'misskey:id' },
	},
	required: ['bookId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private hatadyService: HatadyService,
		private hatadyEntityService: HatadyEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const book = await this.hatadyService.getBook(ps.bookId);
			if (book == null) throw new ApiError(meta.errors.noSuchBook);
			const [logs, bookmarks] = await Promise.all([
				this.hatadyService.getBookLogs(book.id, me.id, book.userId, 50),
				this.hatadyService.getBookmarks(book.id),
			]);
			return {
				book: this.hatadyEntityService.packBook(book),
				isMine: book.userId === me.id,
				logs: await this.hatadyEntityService.packLogs(logs, me),
				bookmarks: bookmarks.map(bm => this.hatadyEntityService.packBookmark(bm)),
			};
		});
	}
}
