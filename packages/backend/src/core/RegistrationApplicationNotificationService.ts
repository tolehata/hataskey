/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull, MoreThan } from 'typeorm';
import locales from '../../../../locales/index.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import type { MiMeta, UsersRepository, UserProfilesRepository } from '@/models/_.js';
import type Logger from '@/logger.js';
import { LoggerService } from '@/core/LoggerService.js';
import { NotificationService } from '@/core/NotificationService.js';
import { RoleService } from '@/core/RoleService.js';

@Injectable()
export class RegistrationApplicationNotificationService {
	private logger: Logger;

	constructor(
		@Inject(DI.meta)
		private meta: MiMeta,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		private roleService: RoleService,
		private notificationService: NotificationService,
		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('registration-application-notification');
	}

	/** A saved application only triggers a generic notice; applicant data never enters this service. */
	@bindThis
	public async notifyNewApplication(): Promise<void> {
		try {
			const recipientIds = new Set(await this.roleService.getAdministratorIds());
			if (this.meta.rootUserId != null) recipientIds.add(this.meta.rootUserId);

			for (const id of recipientIds) {
				await this.notifyRecipient(id);
			}

			// Conditional roles have no assignment rows. Only enumerate users when one can grant administration.
			if (!(await this.roleService.getRoles()).some(role => role.target === 'conditional' && role.isAdministrator)) return;
			const pageSize = 100;
			let afterId: string | undefined;
			while (true) {
				const users = await this.usersRepository.find({
					where: {
						...(afterId == null ? {} : { id: MoreThan(afterId) }),
						host: IsNull(), isSuspended: false, isDeleted: false,
					},
					select: { id: true },
					order: { id: 'ASC' },
					take: pageSize,
				});
				for (const user of users) {
					if (!recipientIds.has(user.id)) await this.notifyRecipient(user.id);
				}
				if (users.length < pageSize) break;
				afterId = users[users.length - 1].id;
			}
		} catch {
			this.logger.warn('Failed to resolve registration application notification recipients.');
		}
	}

	@bindThis
	private async notifyRecipient(id: string): Promise<void> {
		try {
			const user = await this.usersRepository.findOne({
				where: { id, host: IsNull(), isSuspended: false, isDeleted: false },
				select: { id: true, host: true, isSuspended: true, isDeleted: true },
			});
			if (user == null || user.host !== null || user.isSuspended !== false || user.isDeleted !== false) return;
			if (!await this.roleService.isAdministrator(user)) return;

			const profile = await this.userProfilesRepository.findOne({ where: { userId: id }, select: { lang: true } });
			const lang = profile?.lang ?? 'ja-JP';
			const copy = (Object.hasOwn(locales, lang) ? locales[lang] : locales['ja-JP'])._hata._registrationApplications;

			// Recheck after loading the language: assignments or conditional eligibility may have changed.
			if (!await this.roleService.isAdministrator(user)) return;
			await this.notificationService.createNotificationAsync(id, 'app', {
				appAccessTokenId: null,
				customHeader: copy.notificationTitle,
				customBody: copy.notificationBody,
				customIcon: null,
				customLink: '/admin/registration-applications',
			});
		} catch {
			// Never expose raw errors or make an already saved application appear unsuccessful.
			this.logger.warn('Failed to deliver a registration application notification.');
		}
	}
}
