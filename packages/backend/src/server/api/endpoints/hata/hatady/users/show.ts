/*
 * 旗鯖fork(1c): Hatady のユーザープロフィールを取得する。
 *   対象ユーザーの packed user + 学習統計 + 得意/苦手/興味 + 本棚 + フォロー状態。
 *   userId 省略時は自分のプロフィール。
 */
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import type { UsersRepository } from '@/models/_.js';
import { HatadyService } from '@/core/HatadyService.js';
import { HatadyEntityService } from '@/core/entities/HatadyEntityService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['hata'],
	requireCredential: true,
	kind: 'read:account',
	res: { type: 'object', optional: false, nullable: false },
	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		userId: { type: 'string', format: 'misskey:id', nullable: true },
		// 旗鯖fork: 連続日数をユーザーのローカル日付で数えるためのオフセット(分。JST は -540)。
		tzOffset: { type: 'integer', minimum: -840, maximum: 840, default: 0 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private hatadyService: HatadyService,
		private hatadyEntityService: HatadyEntityService,
		private userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const targetId = ps.userId ?? me.id;
			const user = await this.usersRepository.findOneBy({ id: targetId });
			if (user == null) throw new ApiError(meta.errors.noSuchUser);

			const [packedUser, aggregates, books, logs] = await Promise.all([
				this.userEntityService.pack(user, me, { schema: 'UserDetailed' }),
				this.hatadyService.getProfileAggregates(targetId, me.id, ps.tzOffset),
				this.hatadyService.getUserBooks(targetId, 60),
				this.hatadyService.getUserLogs(targetId, me.id, 30),
			]);

			return {
				user: packedUser,
				...aggregates,
				books: await this.hatadyEntityService.packBooks(books),
				logs: await this.hatadyEntityService.packLogs(logs, me),
			};
		});
	}
}
