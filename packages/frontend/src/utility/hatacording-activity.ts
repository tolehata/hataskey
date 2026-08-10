/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type * as Misskey from 'cherrypick-js';
import { domesticTsunamiLabel, issueTypeLabel, scaleToLabel, tsunamiGradeLabel } from '@/utility/earthquake.js';

export type HatacordingActivityKind = 'notification' | 'external' | 'favorite' | 'clip' | 'earthquake' | 'tsunami' | 'connection';
export type HatacordingActivityIcon = 'bell' | 'user' | 'sparkles' | 'message' | 'activity' | 'unplug';
export type ServerDisconnectedBehavior = 'quiet' | 'reload' | 'dialog' | 'none';

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
	note?: Misskey.entities.Note;
	notificationType?: string;
};

export function createServerDisconnectedActivity(behavior: ServerDisconnectedBehavior): HatacordingActivityCopy {
	const detail: Record<ServerDisconnectedBehavior, string> = {
		reload: '自動でリロードする設定です。案内の表示後に画面を再読み込みします。',
		dialog: 'ダイアログ警告の代わりに、この案内から再接続できます。',
		quiet: '自動再接続を待っています。必要な場合は再接続してください。',
		none: '自動ではリロードしない設定です。必要な場合は再接続してください。',
	};
	return {
		kind: 'connection',
		title: 'サーバーから切断されました...',
		detail: detail[behavior],
		to: '',
		icon: 'unplug',
		emergency: false,
	};
}

export function createServerReconnectedActivity(autoReloadPending: boolean): HatacordingActivityCopy {
	return {
		kind: 'connection',
		title: 'サーバーへ再接続しました',
		detail: autoReloadPending ? '自動リロードの設定に従い、まもなく画面を再読み込みします。' : 'タイムラインのリアルタイム受信を再開しました。',
		to: '',
		icon: 'activity',
		emergency: false,
	};
}

export function createTimelineRealtimeActivity(enabled: boolean): HatacordingActivityCopy {
	return {
		kind: 'connection',
		title: enabled ? 'リアルタイム更新を開始しました' : 'リアルタイム更新を停止しました',
		detail: enabled
			? '新しいノートや更新を受信すると、タイムラインへすぐに反映します。'
			: '現在の表示はそのまま残ります。再開するまで新しいノートや更新は自動反映されません。',
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

function truncateInlineText(value: string, maxLength = 36): string {
	// カスタム絵文字のショートコードは画面上で1文字分になる。
	// コードポイント数で切ると `:emoji:` の途中で分断され、MFMが
	// 絵文字として解決できない。通常文字とショートコードを表示単位で数える。
	const displayUnits = value.match(/:[A-Za-z0-9_+-]+(?:@[A-Za-z0-9.-]+)?:|./gu) ?? [];
	return displayUnits.length > maxLength ? `${displayUnits.slice(0, maxLength).join('')}…` : value;
}

function inlineNoteLabel(note: string): string {
	return `ノート「${truncateInlineText(note || '本文なし')}」`;
}

function inlineReactionLabel(reaction: string): string {
	return reaction.length > 0 ? reaction : 'リアクション';
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

export function createNotificationActivity(notification: Record<string, any>, external = false, externalHost?: string | null): HatacordingActivityCopy {
	const type = String(notification.type ?? 'unknown');
	const firstReaction = Array.isArray(notification.reactions) ? notification.reactions[0] : undefined;
	const firstGroupedUser = Array.isArray(notification.users) ? notification.users[0] : undefined;
	const user = notificationUser(notification.user)
		?? notificationUser(firstReaction?.user)
		?? notificationUser(firstGroupedUser)
		?? (type === 'note' ? notificationUser(notification.note?.user) : undefined);
	const userName = compactText(user?.name) || compactText(user?.username) || 'だれか';
	const reaction = compactText(notification.reaction) || compactText(firstReaction?.reaction);
	const resolvedNote = (notification.note != null && typeof notification.note === 'object'
		? notification.note
		: firstReaction?.note) as Misskey.entities.Note | undefined;
	const normalized = reaction === compactText(notification.reaction) ? notification : { ...notification, user, note: resolvedNote, reaction };
	const note = noteDetail(normalized);
	const noteLabel = inlineNoteLabel(note);
	const reactionLabel = inlineReactionLabel(reaction);
	const groupedCount = Array.isArray(notification.reactions)
		? notification.reactions.length
		: Array.isArray(notification.users)
			? notification.users.length
			: Array.isArray(notification.noteIds)
				? notification.noteIds.length
				: 0;
	const actionMap: Record<string, string> = {
		note: `さんが${noteLabel}を投稿しました`,
		mention: `さんが${noteLabel}であなたをメンションしました`,
		reply: `さんが${noteLabel}へ返信しました`,
		renote: `さんが${noteLabel}をリノートしました`,
		quote: `さんが${noteLabel}を引用しました`,
		reaction: `さんが${noteLabel}に「${reactionLabel}」のリアクションを付けました`,
		follow: 'さんにフォローされました',
		receiveFollowRequest: 'さんからフォロー申請が届きました',
		followRequestAccepted: 'さんがフォロー申請を承認しました',
		groupInvited: 'さんからグループへ招待されました',
		'reaction:grouped': groupedCount > 1
			? `さんほか${groupedCount - 1}人が${noteLabel}にリアクションを付けました`
			: `さんが${noteLabel}にリアクションを付けました`,
		'reaction:groupedByUser': `さんが${groupedCount}件のノートにリアクションを付けました`,
		'renote:grouped': groupedCount > 1
			? `さんほか${groupedCount - 1}人が${noteLabel}をリノートしました`
			: `さんが${noteLabel}をリノートしました`,
	};
	const notePath = resolvedNote?.id ? `/notes/${resolvedNote.id}` : '/my/notifications';
	const typeMap: Record<string, { title: string; icon: HatacordingActivityIcon; to?: string; note?: Misskey.entities.Note }> = {
		note: { title: `${userName}が投稿しました`, icon: 'message', to: notePath, note: resolvedNote },
		mention: { title: `${userName}からメンション`, icon: 'message', to: notePath, note: resolvedNote },
		reply: { title: `${userName}から返信`, icon: 'message', to: notePath, note: resolvedNote },
		renote: { title: `${userName}がリノート`, icon: 'message', to: notePath, note: resolvedNote },
		quote: { title: `${userName}が引用しました`, icon: 'message', to: notePath, note: resolvedNote },
		reaction: { title: `${userName}がリアクションしました`, icon: 'sparkles', to: notePath, note: resolvedNote },
		pollEnded: { title: 'アンケートが終了しました', icon: 'message', to: notePath, note: resolvedNote },
		pollVote: { title: 'アンケートに投票されました', icon: 'message', to: notePath, note: resolvedNote },
		scheduledNotePosted: { title: '予約投稿を公開しました', icon: 'message', to: notePath, note: resolvedNote },
		scheduledNotePostFailed: { title: '予約投稿に失敗しました', icon: 'bell' },
		follow: { title: `${userName}にフォローされました`, icon: 'user', to: userPath(user) },
		receiveFollowRequest: { title: `${userName}からフォロー申請`, icon: 'user', to: '/my/follow-requests' },
		followRequestAccepted: { title: `${userName}がフォロー申請を承認しました`, icon: 'user', to: userPath(user) },
		// 承認・拒否の操作は通知カードにあるため、一覧ではなく通知画面へ結ぶ。
		groupInvited: { title: `${userName}からグループへの招待`, icon: 'user', to: '/my/notifications' },
		roleAssigned: { title: `ロール「${compactText(notification.role?.name) || '名称未設定'}」が付与されました`, icon: 'sparkles', to: notification.role?.id ? `/roles/${notification.role.id}` : '/my/notifications' },
		chatRoomInvitationReceived: { title: 'チャットルームへの招待が届きました', icon: 'message', to: notification.invitation?.roomId ? `/chat/room/${notification.invitation.roomId}` : '/chat' },
		achievementEarned: { title: '実績を獲得しました', icon: 'sparkles', to: '/my/achievements' },
		exportCompleted: { title: 'データの書き出しが完了しました', icon: 'bell', to: notification.fileId ? `/my/drive/file/${notification.fileId}` : '/my/drive' },
		login: { title: 'アカウントへのログインを検知しました', icon: 'bell', to: '/settings/security' },
		createToken: { title: 'アクセストークンが作成されました', icon: 'bell', to: '/settings/apps' },
		app: { title: compactText(notification.header) || 'アプリからのお知らせ', icon: 'bell', to: internalLink(notification.link, '/my/notifications') },
		hataFeed: { title: compactText(notification.header) || 'HataFeedからのお知らせ', icon: 'bell', to: internalLink(notification.link, '/hatafeed') },
		earthquake: { title: compactText(notification.header) || '地震・津波情報', icon: 'activity', to: internalLink(notification.link, '/earthquake') },
		addedToPrivateChannel: { title: compactText(notification.header) || 'プライベートチャンネルへの招待', icon: 'message', to: '/my/notifications' },
		removedFromPrivateChannel: { title: compactText(notification.header) || 'プライベートチャンネルから退出しました', icon: 'message', to: internalLink(notification.link, '/channels') },
		'reaction:grouped': { title: `${groupedCount}件のリアクションがあります`, icon: 'sparkles', to: notePath, note: resolvedNote },
		'reaction:groupedByUser': { title: `${userName}が${groupedCount}件の投稿にリアクションしました`, icon: 'sparkles', to: '/my/notifications' },
		'renote:grouped': { title: `${groupedCount}件のリノートがあります`, icon: 'message', to: notePath, note: resolvedNote },
		'note:grouped': { title: `${groupedCount}件の新しい投稿があります`, icon: 'message' },
		test: { title: 'テスト通知を受信しました', icon: 'bell' },
	};
	const mapped = typeMap[type] ?? { title: '新しい通知があります', icon: 'bell' as const };
	const detail = compactText(notification.body)
		|| compactText(notification.message)
		|| (reaction && note ? `${reaction} ${note}` : reaction || note)
		|| compactText(notification.invitation?.room?.name)
		|| compactText(notification.invitation?.group?.name)
		|| compactText(notification.role?.description)
		|| '通知画面で詳しい内容を確認できます。';

	return {
		kind: external ? 'external' : 'notification',
		title: external ? `外部アカウント・${mapped.title}` : mapped.title,
		detail,
		to: external ? '/my/external-notifications' : (mapped.to ?? '/my/notifications'),
		icon: mapped.icon,
		emergency: false,
		user: actionMap[type] ? user : undefined,
		action: user ? actionMap[type] : undefined,
		reaction: reaction || undefined,
		reactionEmojiUrl: reaction ? reactionEmojiUrl(normalized, externalHost) : undefined,
		note: mapped.note,
		notificationType: type,
	};
}

export function createApiActionActivity(endpoint: string): HatacordingActivityCopy | null {
	const actions: Record<string, Omit<HatacordingActivityCopy, 'emergency'>> = {
		'notes/favorites/create': {
			kind: 'favorite',
			title: 'お気に入りに追加しました',
			detail: 'お気に入り画面から、あとで読み返せます。',
			to: '/my/favorites',
			icon: 'sparkles',
		},
		'notes/favorites/delete': {
			kind: 'favorite',
			title: 'お気に入りから外しました',
			detail: 'お気に入りの一覧を更新しました。',
			to: '/my/favorites',
			icon: 'sparkles',
		},
		'clips/add-note': {
			kind: 'clip',
			title: 'クリップに追加しました',
			detail: 'クリップ画面から、保存したノートを確認できます。',
			to: '/my/clips',
			icon: 'message',
		},
		'clips/remove-note': {
			kind: 'clip',
			title: 'クリップから外しました',
			detail: 'クリップの一覧を更新しました。',
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
