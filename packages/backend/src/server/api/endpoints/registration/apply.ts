/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { IsNull } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { IdService } from '@/core/IdService.js';
import { CaptchaService } from '@/core/CaptchaService.js';
import { DI } from '@/di-symbols.js';
import type {
	MiMeta,
	RegistrationApplicationsRepository,
	UsedUsernamesRepository,
	UsersRepository,
} from '@/models/_.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	tags: ['registration'],
	requireCredential: false,

	// レートリミット: 1IP / 1時間2回
	limit: {
		duration: 60 * 60 * 1000,
		max: 2,
	},

	errors: {
		usernameAlreadyExists: {
			message: 'This username is already taken or has a pending application.',
			code: 'USERNAME_ALREADY_EXISTS',
			id: 'a0000001-0001-0001-0001-000000000001',
		},
		invalidUsername: {
			message: 'Invalid username.',
			code: 'INVALID_USERNAME',
			id: 'a0000001-0001-0001-0001-000000000002',
		},
		passwordTooShort: {
			message: 'Password is too short.',
			code: 'PASSWORD_TOO_SHORT',
			id: 'a0000001-0001-0001-0001-000000000003',
		},
		reasonRequired: {
			message: 'Reason is required.',
			code: 'REASON_REQUIRED',
			id: 'a0000001-0001-0001-0001-000000000004',
		},
		captchaFailed: {
			message: 'CAPTCHA verification failed.',
			code: 'CAPTCHA_FAILED',
			id: 'a0000001-0001-0001-0001-000000000005',
		},
	},

	res: {
		type: 'object',
		properties: {
			success: { type: 'boolean' },
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		username: { type: 'string', minLength: 1, maxLength: 128 },
		password: { type: 'string', minLength: 1 },
		reason: { type: 'string', minLength: 1, maxLength: 1024 },
		email: { type: 'string', minLength: 1, maxLength: 256 },
		'hcaptcha-response': { type: 'string', nullable: true },
		'g-recaptcha-response': { type: 'string', nullable: true },
		'turnstile-response': { type: 'string', nullable: true },
		'm-captcha-response': { type: 'string', nullable: true },
		'testcaptcha-response': { type: 'string', nullable: true },
	},
	required: ['username', 'password', 'reason', 'email'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.meta)
		private serverMeta: MiMeta,

		@Inject(DI.registrationApplicationsRepository)
		private registrationApplicationsRepository: RegistrationApplicationsRepository,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.usedUsernamesRepository)
		private usedUsernamesRepository: UsedUsernamesRepository,

		private idService: IdService,
		private captchaService: CaptchaService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// ========================================
			// CAPTCHA検証（SignupApiService.ts と同じパターン）
			// ========================================
			if (process.env.NODE_ENV !== 'test') {
				if (this.serverMeta.enableHcaptcha && this.serverMeta.hcaptchaSecretKey) {
					await this.captchaService.verifyHcaptcha(
						this.serverMeta.hcaptchaSecretKey,
						ps['hcaptcha-response'],
					).catch(() => {
						throw new ApiError(meta.errors.captchaFailed);
					});
				}

				if (this.serverMeta.enableMcaptcha && this.serverMeta.mcaptchaSecretKey && this.serverMeta.mcaptchaSitekey && this.serverMeta.mcaptchaInstanceUrl) {
					await this.captchaService.verifyMcaptcha(
						this.serverMeta.mcaptchaSecretKey,
						this.serverMeta.mcaptchaSitekey,
						this.serverMeta.mcaptchaInstanceUrl,
						ps['m-captcha-response'],
					).catch(() => {
						throw new ApiError(meta.errors.captchaFailed);
					});
				}

				if (this.serverMeta.enableRecaptcha && this.serverMeta.recaptchaSecretKey) {
					await this.captchaService.verifyRecaptcha(
						this.serverMeta.recaptchaSecretKey,
						ps['g-recaptcha-response'],
					).catch(() => {
						throw new ApiError(meta.errors.captchaFailed);
					});
				}

				if (this.serverMeta.enableTurnstile && this.serverMeta.turnstileSecretKey) {
					await this.captchaService.verifyTurnstile(
						this.serverMeta.turnstileSecretKey,
						ps['turnstile-response'],
					).catch(() => {
						throw new ApiError(meta.errors.captchaFailed);
					});
				}

				if (this.serverMeta.enableTestcaptcha) {
					await this.captchaService.verifyTestcaptcha(
						ps['testcaptcha-response'],
					).catch(() => {
						throw new ApiError(meta.errors.captchaFailed);
					});
				}
			}

			// ========================================
			// バリデーション
			// ========================================
			if (!/^[a-zA-Z0-9_]{1,20}$/.test(ps.username)) {
				throw new ApiError(meta.errors.invalidUsername);
			}

			if (ps.password.length < 8) {
				throw new ApiError(meta.errors.passwordTooShort);
			}

			if (ps.reason.trim().length === 0) {
				throw new ApiError(meta.errors.reasonRequired);
			}

			// 既存ユーザーとの重複
			if (await this.usersRepository.exists({
				where: { usernameLower: ps.username.toLowerCase(), host: IsNull() },
			})) {
				throw new ApiError(meta.errors.usernameAlreadyExists);
			}

			// 過去に使用されたユーザー名
			if (await this.usedUsernamesRepository.exists({
				where: { username: ps.username.toLowerCase() },
			})) {
				throw new ApiError(meta.errors.usernameAlreadyExists);
			}

			// 予約済みユーザー名
			const isPreserved = this.serverMeta.preservedUsernames
				.map(x => x.toLowerCase())
				.includes(ps.username.toLowerCase());
			if (isPreserved) {
				throw new ApiError(meta.errors.usernameAlreadyExists);
			}

			// pending申請との重複
			if (await this.registrationApplicationsRepository.exists({
				where: { username: ps.username.toLowerCase(), status: 'pending' },
			})) {
				throw new ApiError(meta.errors.usernameAlreadyExists);
			}

			// パスワードハッシュ化
			const salt = await bcrypt.genSalt(8);
			const hashedPassword = await bcrypt.hash(ps.password, salt);

			// 申請作成
			await this.registrationApplicationsRepository.insert({
				id: this.idService.gen(),
				username: ps.username.toLowerCase(),
				hashedPassword,
				reason: ps.reason.trim(),
				email: ps.email.trim(),
				status: 'pending',
				createdAt: new Date(),
			});

			return { success: true };
		});
	}
}
