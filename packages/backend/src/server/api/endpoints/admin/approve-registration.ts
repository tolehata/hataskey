/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { MiMeta, RegistrationApplicationsRepository, UserProfilesRepository } from '@/models/_.js';
import type { Config } from '@/config.js';
import { ApiError } from '@/server/api/error.js';
import { SignupService } from '@/core/SignupService.js';
import { EmailService } from '@/core/EmailService.js';

export const meta = {
	tags: ['admin'],
	requireCredential: true,
	requireModerator: true,

	errors: {
		noSuchApplication: {
			message: 'No such application.',
			code: 'NO_SUCH_APPLICATION',
			id: 'b0000001-0001-0001-0001-000000000001',
		},
		alreadyProcessed: {
			message: 'This application has already been processed.',
			code: 'ALREADY_PROCESSED',
			id: 'b0000001-0001-0001-0001-000000000002',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		applicationId: { type: 'string' },
	},
	required: ['applicationId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.meta)
		private serverMeta: MiMeta,

		@Inject(DI.registrationApplicationsRepository)
		private registrationApplicationsRepository: RegistrationApplicationsRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		private signupService: SignupService,
		private emailService: EmailService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const application = await this.registrationApplicationsRepository.findOneBy({
				id: ps.applicationId,
			});

			if (!application) {
				throw new ApiError(meta.errors.noSuchApplication);
			}

			if (application.status !== 'pending') {
				throw new ApiError(meta.errors.alreadyProcessed);
			}

			// SignupService.signup() に passwordHash を渡してユーザー作成
			// （SignupService は既に passwordHash パラメータをサポート済み）
			const { account } = await this.signupService.signup({
				username: application.username,
				passwordHash: application.hashedPassword,
			});

			// メールアドレスをプロフィールに設定
			await this.userProfilesRepository.update({ userId: account.id }, {
				email: application.email,
				emailVerified: true,
			});

			// 申請を承認済みに更新
			await this.registrationApplicationsRepository.update(application.id, {
				status: 'approved',
				approvedAt: new Date(),
				userId: account.id,
			});

			// ★ 承認時のみメール送信
			const serverName = this.serverMeta.name ?? 'Misskey';
			const serverUrl = this.config.url;

			await this.emailService.sendEmail(
				application.email,
				`【${serverName}】アカウント登録申請が承認されました`,
				// HTML
				[
					`<h2>アカウント登録申請が承認されました</h2>`,
					`<p><b>${serverName}</b> へのアカウント登録申請が承認されました。</p>`,
					`<p><strong>ユーザーID:</strong> @${application.username}</p>`,
					`<p>サーバーにログインしてご利用を開始してください。</p>`,
					`<p><a href="${serverUrl}">${serverUrl}</a></p>`,
					`<hr>`,
					`<p style="color:#888;font-size:0.9em;">`,
					`※このメールアドレスは今後、ログインやセキュリティに関連する操作が行われた際の通知先として使用されます。`,
					`</p>`,
				].join('\n'),
				// plaintext
				[
					`${serverName} へのアカウント登録申請が承認されました。`,
					`ユーザーID: @${application.username}`,
					`ログインURL: ${serverUrl}`,
					`※このメールアドレスは今後、セキュリティ通知の送信先として使用されます。`,
				].join('\n'),
			);

			return { success: true };
		});
	}
}
