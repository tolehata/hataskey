/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { isInstanceMuted, isUserFromMutedInstance } from '@/misc/is-instance-muted.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { bindThis } from '@/decorators.js';
import type { JsonObject } from '@/misc/json-value.js';
import type { EventTypesToEventPayload, MainEventTypes } from '@/core/GlobalEventService.js';
import Channel, { type MiChannelService } from '../channel.js';

// Native Registry and sign-in events have no third-party API equivalent.
// Keep this exhaustive so new events require an explicit authorization decision.
const eventPermissions = {
	notification: 'read:notifications',
	mention: 'read:notifications',
	reply: 'read:notifications',
	renote: 'read:notifications',
	follow: 'read:following',
	followed: 'read:following',
	unfollow: 'read:following',
	meUpdated: 'read:account',
	pageEvent: 'read:pages',
	urlUploadFinished: 'read:drive',
	readAllNotifications: 'read:notifications',
	readNotification: 'read:notifications',
	notificationChanged: 'read:notifications',
	notificationFlushed: 'read:notifications',
	unreadNotification: 'read:notifications',
	unreadAntenna: 'read:account',
	newChatMessage: 'read:chat',
	readAllAnnouncements: 'read:account',
	myTokenRegenerated: null,
	signin: null,
	registryUpdated: null,
	driveFileCreated: 'read:drive',
	readAntenna: 'read:account',
	receiveFollowRequest: 'read:following',
	announcementCreated: 'read:account',
	mutingImportCompleted: 'read:mutes',
} satisfies Record<keyof MainEventTypes, string | null>;

class MainChannel extends Channel {
	public readonly chName = 'main';
	public static shouldShare = true;
	public static requireCredential = true as const;
	public static kind = 'read:account';

	constructor(
		private noteEntityService: NoteEntityService,

		id: string,
		connection: Channel['connection'],
	) {
		super(id, connection);
	}

	@bindThis
	public async init(params: JsonObject) {
		// Subscribe main stream channel
		this.subscriber.on(`mainStream:${this.user!.id}`, this.onData);
	}

	@bindThis
	private async onData(data: EventTypesToEventPayload<MainEventTypes>) {
		// Unknown events fail closed for scoped tokens, including Play tokens.
		const permission = Object.hasOwn(eventPermissions, data.type) ? eventPermissions[data.type] : null;
		if (!this.connection.hasPermission(permission)) return;
		switch (data.type) {
			case 'notification': {
				// Ignore notifications from instances the user has muted
				if (isUserFromMutedInstance(data.body, new Set<string>(this.userProfile?.mutedInstances ?? []))) return;
				if (data.body.userId && this.userIdsWhoMeMuting.has(data.body.userId)) return;

				if (data.body.note && data.body.note.isHidden) {
					const note = await this.noteEntityService.pack(data.body.note.id, this.user, {
						detail: true,
					});
					data.body.note = note;
				}
				break;
			}
			case 'mention': {
				if (isInstanceMuted(data.body, new Set<string>(this.userProfile?.mutedInstances ?? []))) return;

				if (this.userIdsWhoMeMuting.has(data.body.userId)) return;
				if (data.body.isHidden) {
					const note = await this.noteEntityService.pack(data.body.id, this.user, {
						detail: true,
					});
					data.body = note;
				}
				break;
			}
		}

		this.send(data.type, data.body);
	}

	@bindThis
	public dispose() {
		this.subscriber.off(`mainStream:${this.user?.id}`, this.onData);
	}
}

@Injectable()
export class MainChannelService implements MiChannelService<true> {
	public readonly shouldShare = MainChannel.shouldShare;
	public readonly requireCredential = MainChannel.requireCredential;
	public readonly kind = MainChannel.kind;

	constructor(
		private noteEntityService: NoteEntityService,
	) {
	}

	@bindThis
	public create(id: string, connection: Channel['connection']): MainChannel {
		return new MainChannel(
			this.noteEntityService,
			id,
			connection,
		);
	}
}
