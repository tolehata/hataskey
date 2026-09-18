/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { escapeHtml } from '@/misc/escape-html.js';
import { registrationReviewErrors } from '@/core/registration-review-policy.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { MiMeta } from '@/models/_.js';
import type { Config } from '@/config.js';
import { SignupService } from '@/core/SignupService.js';
import { EmailService } from '@/core/EmailService.js';
import { assertRegistrationApplicationsEnabled, registrationApplicationApprovalErrors, registrationApplicationsDisabledError } from '@/core/registration-application-policy.js';

export const meta = {
	tags: ['admin'],
	requireCredential: true,
	requireModerator: true,
	requireAdmin: true,
	secure: true,
	kind: 'write:admin:approve-registration',
	limit: { duration: 60 * 1000, max: 10 },
	res: { type: 'object', properties: { success: { type: 'boolean' }, emailSent: { type: 'boolean' } } },

	errors: {
		...registrationReviewErrors,
		registrationApplicationsDisabled: registrationApplicationsDisabledError,
		...registrationApplicationApprovalErrors,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		applicationId: { type: 'string', minLength: 1, maxLength: 32 },
		revision: { type: 'string', minLength: 64, maxLength: 64 },
	},
	required: ['applicationId', 'revision'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.meta)
		private serverMeta: MiMeta,

		private signupService: SignupService,
		private emailService: EmailService,
	) {
		super(meta, paramDef, async (ps, me) => {
			assertRegistrationApplicationsEnabled(this.serverMeta);
			// Account, verified email and decision/contact deletion commit together.
			const { account, applicationEmail } = await this.signupService.signup({ registrationApplicationId: ps.applicationId, reviewerId: me.id, revision: ps.revision });
			if (applicationEmail == null) throw new Error('Missing approved application email');
			const username = account.username;
			const email = applicationEmail;

			// ★ 承認時のみメール送信
			const serverName = this.serverMeta.name ?? 'Misskey';
			const serverUrl = this.config.url;

			const emailSent = await this.emailService.sendEmail(
				email,
				`【${serverName}】アカウント登録申請が承認されました`,
				// HTML
				[
					'<h2>アカウント登録申請が承認されました</h2>',
					`<p><b>${escapeHtml(serverName)}</b> へのアカウント登録申請が承認されました。</p>`,
					`<p><strong>ユーザーID:</strong> @${escapeHtml(username)}</p>`,
					'<p>サーバーにログインしてご利用を開始してください。</p>',
					`<p><a href="${escapeHtml(serverUrl)}">${escapeHtml(serverUrl)}</a></p>`,
					'<hr>',
					'<p style="color:#888;font-size:0.9em;">',
					'※このメールアドレスは今後、ログインやセキュリティに関連する操作が行われた際の通知先として使用されます。',
					'</p>',
				].join('\n'),
				// plaintext
				[
					`${serverName} へのアカウント登録申請が承認されました。`,
					`ユーザーID: @${username}`,
					`ログインURL: ${serverUrl}`,
					'※このメールアドレスは今後、セキュリティ通知の送信先として使用されます。',
				].join('\n'),
			).then(() => true, () => false);

			return { success: true, emailSent };
		});
	}
}
