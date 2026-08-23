/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type * as Misskey from 'cherrypick-js';
import { i18n } from '@/i18n.js';
import { domesticTsunamiLabel, issueTypeLabel, scaleToLabel, tsunamiGradeLabel } from '@/utility/earthquake.js';
import { hataFeedNotificationDisplayBody } from '@/utility/hatafeed-bell-group.js';
import { privateChannelNotificationDisplayBody } from '@/utility/private-channel-notification-copy.js';

const copy = i18n.ts._hata._hatacordingUi._activity;
const tx = i18n.tsx._hata._hatacordingUi._activity;

export type HatacordingActivityKind = 'notification' | 'external' | 'favorite' | 'clip' | 'earthquake' | 'tsunami' | 'connection';
export type HatacordingActivityIcon = 'bell' | 'user' | 'sparkles' | 'message' | 'activity' | 'unplug';
export type ServerDisconnectedBehavior = 'quiet' | 'reload' | 'dialog' | 'none';

export function hatacordingEarthquakeGroupLabel(items: Pick<HatacordingActivityCopy, 'kind'>[]): string {
	const hasEarthquake = items.some(item => item.kind === 'earthquake');
	const hasTsunami = items.some(item => item.kind === 'tsunami');
	if (hasEarthquake && !hasTsunami) return '地震情報';
	if (hasTsunami && !hasEarthquake) return '津波情報';
	return '地震・津波情報';
}

export type HatacordingNotificationActivitySource = {
	kind: 'notification';
	type: string;
	external: boolean;
	botOrigin?: boolean;
	user?: Misskey.entities.UserLite;
	/** Live reception only. The cache sanitizer deliberately never persists a full Note. */
	note?: Misskey.entities.Note;
	noteId?: string;
	noteText?: string;
	noteCw?: string;
	noteEmojiUrls?: Record<string, string>;
	reaction?: string;
	reactionEmojiUrl?: string;
	groupedCount: number;
	header?: string;
	body?: string;
	message?: string;
	link?: string;
	roleId?: string;
	roleName?: string;
	roleDescription?: string;
	chatRoomId?: string;
	invitationName?: string;
	fileId?: string;
};

export type HatacordingActivityCopy = {
	kind: HatacordingActivityKind;
	title: string;
	detail: string;
	to: string;
	icon: HatacordingActivityIcon;
	emergency: boolean;
	user?: Misskey.entities.UserLite;
	action?: string;
	reaction?: string;
	reactionEmojiUrl?: string;
	emojiUrls?: Record<string, string>;
	note?: Misskey.entities.Note;
	notificationType?: string;
	botOrigin?: boolean;
	cacheSource?: HatacordingNotificationActivitySource;
};

export function sharesHatacordingNotificationAudience(
	left: Pick<HatacordingActivityCopy, 'botOrigin'>,
	right: Pick<HatacordingActivityCopy, 'botOrigin'>,
): boolean {
	return (left.botOrigin === true) === (right.botOrigin === true);
}

export function createServerDisconnectedActivity(behavior: ServerDisconnectedBehavior): HatacordingActivityCopy {
	const detail: Record<ServerDisconnectedBehavior, string> = {
		reload: copy.disconnectedReload,
		dialog: copy.disconnectedDialog,
		quiet: copy.disconnectedQuiet,
		none: copy.disconnectedNone,
	};
	return {
		kind: 'connection',
		title: copy.disconnected,
		detail: detail[behavior],
		to: '',
		icon: 'unplug',
		emergency: false,
	};
}

export function createServerReconnectedActivity(autoReloadPending: boolean): HatacordingActivityCopy {
	return {
		kind: 'connection',
		title: copy.reconnected,
		detail: autoReloadPending ? copy.reconnectedReload : copy.reconnectedRealtime,
		to: '',
		icon: 'activity',
		emergency: false,
	};
}

export function createTimelineRealtimeActivity(enabled: boolean): HatacordingActivityCopy {
	return {
		kind: 'connection',
		title: enabled ? copy.realtimeStarted : copy.realtimeStopped,
		detail: enabled
			? copy.realtimeStartedDescription
			: copy.realtimeStoppedDescription,
		to: '',
		icon: 'activity',
		emergency: false,
	};
}

function compactText(value: unknown): string {
	return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function noteDetail(notification: Record<string, any>): string {
	const note = notification.note;
	if (note == null || typeof note !== 'object') return '';
	const cw = compactText(note.cw);
	const text = compactText(note.text);
	return [cw, text].filter(Boolean).join(' — ');
}

function noteSummary(source: Pick<HatacordingNotificationActivitySource, 'note' | 'noteText' | 'noteCw'>): string {
	return noteDetail({
		note: source.note ?? {
			text: source.noteText,
			cw: source.noteCw,
		},
	});
}

function referencedNoteEmojiUrls(note: Misskey.entities.Note | undefined, text: string): Record<string, string> | undefined {
	if (note == null || text.length === 0) return undefined;
	const names = new Set((text.match(/:([A-Za-z0-9_+-]+(?:@[A-Za-z0-9.-]+)?):/gu) ?? [])
		.map(shortcode => shortcode.slice(1, -1)));
	if (names.size === 0) return undefined;
	const result: Record<string, string> = {};
	for (const source of [note.emojis, note.reactionEmojis]) {
		if (source == null || typeof source !== 'object') continue;
		for (const name of names) {
			const pureName = name.split('@', 1)[0];
			for (const candidate of [name, pureName, `${pureName}@.`]) {
				const url = (source as Record<string, unknown>)[candidate];
				if (typeof url === 'string' && url.length > 0) {
					result[name] = url;
					break;
				}
			}
		}
	}
	return Object.keys(result).length > 0 ? result : undefined;
}

function truncateInlineText(value: string, maxLength = 36): string {
	// カスタム絵文字のショートコードは画面上で1文字分になる。
	// コードポイント数で切ると `:emoji:` の途中で分断され、MFMが
	// 絵文字として解決できない。通常文字とショートコードを表示単位で数える。
	const displayUnits = value.match(/:[A-Za-z0-9_+-]+(?:@[A-Za-z0-9.-]+)?:|./gu) ?? [];
	return displayUnits.length > maxLength ? `${displayUnits.slice(0, maxLength).join('')}…` : value;
}

function inlineNoteLabel(note: string): string {
	return tx.noteLabel({ note: truncateInlineText(note || copy.noContent) });
}

function inlineReactionLabel(reaction: string): string {
	return reaction.length > 0 ? reaction : copy.reaction;
}

function reactionEmojiUrl(notification: Record<string, any>, externalHost?: string | null): string | undefined {
	const reaction = compactText(notification.reaction);
	const matched = reaction.match(/^:([^:]+):$/);
	if (!matched) return undefined;
	const directUrl = compactText(notification.reactionEmojiUrl) || compactText(notification.emojiUrl);
	if (directUrl) return directUrl;
	const emojiName = matched[1];
	const pureName = emojiName.split('@', 1)[0];
	const candidates = [emojiName, pureName, `${pureName}@.`, externalHost ? `${pureName}@${externalHost}` : ''].filter(Boolean);
	for (const source of [notification.note?.reactionEmojis, notification.note?.emojis, notification.user?.emojis]) {
		if (Array.isArray(source)) {
			const found = source.find((emoji: any) => candidates.includes(compactText(emoji?.name)));
			if (typeof found?.url === 'string' && found.url.length > 0) return found.url;
			continue;
		}
		if (source == null || typeof source !== 'object') continue;
		for (const candidate of candidates) {
			const url = source[candidate];
			if (typeof url === 'string' && url.length > 0) return url;
		}
	}
	return externalHost ? `https://${externalHost}/emoji/${encodeURIComponent(pureName)}.webp` : undefined;
}

function internalLink(value: unknown, fallback: string): string {
	const link = compactText(value);
	return link.startsWith('/') && !link.startsWith('//') ? link : fallback;
}

function userPath(user: Misskey.entities.UserLite | undefined): string {
	if (!user) return '/my/notifications';
	return `/@${user.username}${user.host ? `@${user.host}` : ''}`;
}

function notificationUser(value: unknown): Misskey.entities.UserLite | undefined {
	return value != null && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string'
		? value as Misskey.entities.UserLite
		: undefined;
}

function notificationActivitySource(notification: Record<string, any>, external: boolean, externalHost?: string | null): HatacordingNotificationActivitySource {
	const type = String(notification.type ?? 'unknown');
	const firstReaction = Array.isArray(notification.reactions) ? notification.reactions[0] : undefined;
	const firstGroupedUser = Array.isArray(notification.users) ? notification.users[0] : undefined;
	const user = notificationUser(notification.user)
		?? notificationUser(firstReaction?.user)
		?? notificationUser(firstGroupedUser)
		?? (type === 'note' ? notificationUser(notification.note?.user) : undefined);
	const groupedUsers = [
		...(Array.isArray(notification.reactions) ? notification.reactions.map((item: Record<string, unknown>) => notificationUser(item.user)) : []),
		...(Array.isArray(notification.users) ? notification.users.map(notificationUser) : []),
	].filter((item): item is Misskey.entities.UserLite => item != null);
	const botOrigin = groupedUsers.length > 0
		? groupedUsers.every(item => item.isBot === true)
		: user?.isBot === true;
	const reaction = compactText(notification.reaction) || compactText(firstReaction?.reaction);
	const resolvedNote = (notification.note != null && typeof notification.note === 'object'
		? notification.note
		: firstReaction?.note) as Misskey.entities.Note | undefined;
	const normalized = reaction === compactText(notification.reaction) ? notification : { ...notification, user, note: resolvedNote, reaction };
	const noteText = compactText(resolvedNote?.text);
	const noteCw = compactText(resolvedNote?.cw);
	const noteEmojiUrls = referencedNoteEmojiUrls(resolvedNote, `${noteCw} ${noteText}`);
	const groupedCount = Array.isArray(notification.reactions)
		? notification.reactions.length
		: Array.isArray(notification.users)
			? notification.users.length
			: Array.isArray(notification.noteIds)
				? notification.noteIds.length
				: 0;
	return {
		kind: 'notification',
		type,
		external,
		botOrigin,
		user,
		note: resolvedNote,
		noteId: compactText(resolvedNote?.id) || undefined,
		noteText: noteText || undefined,
		noteCw: noteCw || undefined,
		noteEmojiUrls,
		reaction: reaction || undefined,
		reactionEmojiUrl: reaction ? reactionEmojiUrl(normalized, externalHost) : undefined,
		groupedCount,
		header: compactText(notification.header) || undefined,
		body: compactText(notification.body) || undefined,
		message: compactText(notification.message) || undefined,
		link: compactText(notification.link) || undefined,
		roleId: compactText(notification.role?.id) || undefined,
		roleName: compactText(notification.role?.name) || undefined,
		roleDescription: compactText(notification.role?.description) || undefined,
		chatRoomId: compactText(notification.invitation?.roomId) || undefined,
		invitationName: compactText(notification.invitation?.room?.name) || compactText(notification.invitation?.group?.name) || undefined,
		fileId: compactText(notification.fileId) || undefined,
	};
}

export function createNotificationActivityFromSource(source: HatacordingNotificationActivitySource): HatacordingActivityCopy {
	const type = source.type;
	const user = source.user;
	const userName = compactText(user?.name) || compactText(user?.username) || copy.someone;
	const reaction = compactText(source.reaction);
	const note = noteSummary(source);
	const noteLabel = inlineNoteLabel(note);
	const reactionLabel = inlineReactionLabel(reaction);
	const groupedCount = source.groupedCount;
	const actionMap: Record<string, string> = {
		note: tx.actionNote({ note: noteLabel }),
		mention: tx.actionMention({ note: noteLabel }),
		reply: tx.actionReply({ note: noteLabel }),
		renote: tx.actionRenote({ note: noteLabel }),
		quote: tx.actionQuote({ note: noteLabel }),
		reaction: tx.actionReaction({ note: noteLabel, reaction: reactionLabel }),
		follow: copy.actionFollow,
		receiveFollowRequest: copy.actionFollowRequest,
		followRequestAccepted: copy.actionFollowRequestAccepted,
		groupInvited: copy.actionGroupInvited,
		'reaction:grouped': groupedCount > 1
			? tx.actionGroupedReaction({ count: groupedCount - 1, note: noteLabel })
			: tx.actionSingleGroupedReaction({ note: noteLabel }),
		'reaction:groupedByUser': tx.actionGroupedByUserReaction({ count: groupedCount }),
		'renote:grouped': groupedCount > 1
			? tx.actionGroupedRenote({ count: groupedCount - 1, note: noteLabel })
			: tx.actionSingleGroupedRenote({ note: noteLabel }),
	};
	const noteId = compactText(source.note?.id) || compactText(source.noteId);
	const notePath = noteId ? `/notes/${noteId}` : '/my/notifications';
	const typeMap: Record<string, { title: string; icon: HatacordingActivityIcon; to?: string; note?: Misskey.entities.Note }> = {
		note: { title: tx.titleNote({ name: userName }), icon: 'message', to: notePath, note: source.note },
		mention: { title: tx.titleMention({ name: userName }), icon: 'message', to: notePath, note: source.note },
		reply: { title: tx.titleReply({ name: userName }), icon: 'message', to: notePath, note: source.note },
		renote: { title: tx.titleRenote({ name: userName }), icon: 'message', to: notePath, note: source.note },
		quote: { title: tx.titleQuote({ name: userName }), icon: 'message', to: notePath, note: source.note },
		reaction: { title: tx.titleReaction({ name: userName }), icon: 'sparkles', to: notePath, note: source.note },
		pollEnded: { title: copy.pollEnded, icon: 'message', to: notePath, note: source.note },
		pollVote: { title: copy.pollVote, icon: 'message', to: notePath, note: source.note },
		scheduledNotePosted: { title: copy.scheduledNotePosted, icon: 'message', to: notePath, note: source.note },
		scheduledNotePostFailed: { title: copy.scheduledNotePostFailed, icon: 'bell' },
		follow: { title: tx.titleFollow({ name: userName }), icon: 'user', to: userPath(user) },
		receiveFollowRequest: { title: tx.titleFollowRequest({ name: userName }), icon: 'user', to: '/my/follow-requests' },
		followRequestAccepted: { title: tx.titleFollowRequestAccepted({ name: userName }), icon: 'user', to: userPath(user) },
		// 承認・拒否の操作は通知カードにあるため、一覧ではなく通知画面へ結ぶ。
		groupInvited: { title: tx.titleGroupInvited({ name: userName }), icon: 'user', to: '/my/notifications' },
		roleAssigned: { title: tx.roleAssigned({ role: source.roleName || copy.unnamed }), icon: 'sparkles', to: source.roleId ? `/roles/${source.roleId}` : '/my/notifications' },
		chatRoomInvitationReceived: { title: copy.chatRoomInvitation, icon: 'message', to: source.chatRoomId ? `/chat/room/${source.chatRoomId}` : '/chat' },
		achievementEarned: { title: copy.achievementEarned, icon: 'sparkles', to: '/my/achievements' },
		exportCompleted: { title: copy.exportCompleted, icon: 'bell', to: source.fileId ? `/my/drive/file/${source.fileId}` : '/my/drive' },
		login: { title: copy.loginDetected, icon: 'bell', to: '/settings/security' },
		createToken: { title: copy.tokenCreated, icon: 'bell', to: '/settings/apps' },
		app: { title: source.header || copy.appNotification, icon: 'bell', to: internalLink(source.link, '/my/notifications') },
		hataFeed: { title: source.header || copy.hataFeedNotification, icon: 'bell', to: internalLink(source.link, '/hatafeed') },
		earthquake: { title: source.header || '地震・津波情報', icon: 'activity', to: internalLink(source.link, '/earthquake') },
		addedToPrivateChannel: { title: copy.privateChannelInvitation, icon: 'message', to: '/my/notifications' },
		removedFromPrivateChannel: { title: copy.privateChannelRemoved, icon: 'message', to: internalLink(source.link, '/channels') },
		'reaction:grouped': { title: tx.groupedReactions({ count: groupedCount }), icon: 'sparkles', to: notePath, note: source.note },
		'reaction:groupedByUser': { title: tx.groupedReactionsByUser({ name: userName, count: groupedCount }), icon: 'sparkles', to: '/my/notifications' },
		'renote:grouped': { title: tx.groupedRenotes({ count: groupedCount }), icon: 'message', to: notePath, note: source.note },
		'note:grouped': { title: tx.groupedNotes({ count: groupedCount }), icon: 'message' },
		test: { title: copy.testNotification, icon: 'bell' },
	};
	const mapped = typeMap[type] ?? { title: copy.newNotification, icon: 'bell' as const };
	const localizedBody = type === 'hataFeed' || (type === 'app' && source.header === 'HataFeed')
		? hataFeedNotificationDisplayBody(source.body ?? '')
		: type === 'addedToPrivateChannel' || type === 'removedFromPrivateChannel'
			? privateChannelNotificationDisplayBody(source.body ?? '')
			: source.body;
	const detail = localizedBody
		|| source.message
		|| (reaction && note ? `${reaction} ${note}` : reaction || note)
		|| source.invitationName
		|| source.roleDescription
		|| copy.notificationDetails;

	return {
		kind: source.external ? 'external' : 'notification',
		title: source.external ? tx.externalAccountTitle({ title: mapped.title }) : mapped.title,
		detail,
		to: source.external ? '/my/external-notifications' : (mapped.to ?? '/my/notifications'),
		icon: mapped.icon,
		emergency: false,
		user: actionMap[type] ? user : undefined,
		action: user ? actionMap[type] : undefined,
		reaction: reaction || undefined,
		reactionEmojiUrl: source.reactionEmojiUrl,
		emojiUrls: source.noteEmojiUrls,
		note: mapped.note,
		notificationType: type,
		botOrigin: source.botOrigin === true || source.user?.isBot === true,
		cacheSource: source,
	};
}

export function createNotificationActivity(notification: Record<string, any>, external = false, externalHost?: string | null): HatacordingActivityCopy {
	return createNotificationActivityFromSource(notificationActivitySource(notification, external, externalHost));
}

export function createApiActionActivity(endpoint: string): HatacordingActivityCopy | null {
	const actions: Record<string, Omit<HatacordingActivityCopy, 'emergency'>> = {
		'notes/favorites/create': {
			kind: 'favorite',
			title: copy.favoriteAdded,
			detail: copy.favoriteAddedDescription,
			to: '/my/favorites',
			icon: 'sparkles',
		},
		'notes/favorites/delete': {
			kind: 'favorite',
			title: copy.favoriteRemoved,
			detail: copy.favoriteRemovedDescription,
			to: '/my/favorites',
			icon: 'sparkles',
		},
		'clips/add-note': {
			kind: 'clip',
			title: copy.clipAdded,
			detail: copy.clipAddedDescription,
			to: '/my/clips',
			icon: 'message',
		},
		'clips/remove-note': {
			kind: 'clip',
			title: copy.clipRemoved,
			detail: copy.clipRemovedDescription,
			to: '/my/clips',
			icon: 'message',
		},
	};
	const action = actions[endpoint];
	return action == null ? null : { ...action, emergency: false };
}

export function createEarthquakeActivity(payload: { code: number; item: Record<string, any> }): HatacordingActivityCopy | null {
	const item = payload.item;
	if (payload.code === 551) {
		const earthquake = item.earthquake ?? {};
		const hypocenter = earthquake.hypocenter ?? {};
		const maxScale = typeof earthquake.maxScale === 'number' ? earthquake.maxScale : -1;
		const title = maxScale >= 10 ? `地震情報・最大震度${scaleToLabel(maxScale)}` : '地震情報を受信しました';
		const detailParts = [
			item.issue?.type ? issueTypeLabel(String(item.issue.type)) : '',
			hypocenter.name ? `震源 ${String(hypocenter.name)}` : '',
			typeof hypocenter.magnitude === 'number' && hypocenter.magnitude >= 0 ? `M${hypocenter.magnitude}` : '',
			typeof hypocenter.depth === 'number' && hypocenter.depth >= 0 ? `深さ${hypocenter.depth}km` : '',
			domesticTsunamiLabel(String(earthquake.domesticTsunami ?? '')) ?? (earthquake.domesticTsunami === 'None' ? '津波の心配なし' : ''),
		].filter(Boolean);
		return { kind: 'earthquake', title, detail: detailParts.join(' ／ ') || '地震・津波情報画面で詳細を確認してください。', to: '/earthquake', icon: 'activity', emergency: true };
	}

	if (payload.code === 552) {
		const areas = Array.isArray(item.areas) ? item.areas : [];
		const grades = [...new Set(areas.map((area: any) => compactText(area?.grade)).filter(Boolean))].map(tsunamiGradeLabel);
		const areaNames = areas.map((area: any) => compactText(area?.name)).filter(Boolean);
		const headline = compactText(item.headline);
		const detail = headline || [grades.join('・'), areaNames.join('、')].filter(Boolean).join(' ／ ') || '津波情報画面で発表地域を確認してください。';
		return { kind: 'tsunami', title: grades.length > 0 ? `津波情報・${grades.join('・')}` : '津波情報を受信しました', detail, to: '/earthquake', icon: 'activity', emergency: true };
	}

	return null;
}
