/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { notificationTypes } from 'cherrypick-js';
import { describe, expect, test, vi } from 'vitest';
import type { Locale } from '../../../../locales/index.js';

vi.mock('@/i18n.js', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const yaml = await import('js-yaml');
	const { I18n } = await import('@@/js/i18n.js');
	const locale = yaml.load(fs.readFileSync(path.resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8'));
	return { i18n: new I18n<Locale>(locale as Locale) };
});

import { createApiActionActivity, createEarthquakeActivity, createNotificationActivity, createNotificationActivityFromSource, createServerDisconnectedActivity, createServerReconnectedActivity, createTimelineRealtimeActivity, hatacordingEarthquakeGroupLabel, sharesHatacordingNotificationAudience } from './hatacording-activity.js';

describe('HataSNSCordUIの受信イベント表示', () => {
	test('通常通知は本文を保持し、外部通知だけ専用画面へ結ぶ', () => {
		const notification = {
			type: 'reaction',
			user: {
				id: 'user-1',
				username: 'seal',
				name: 'アザラシ :name_emoji:',
				host: null,
				emojis: { name_emoji: 'https://example.test/name.webp' },
				avatarDecorations: [{ id: 'decoration-1', url: 'https://example.test/decoration.webp', angle: 0.1 }],
			},
			reaction: ':seal:',
			note: {
				id: 'note-1',
				text: 'こんにちは :flower:',
				emojis: { flower: 'https://example.test/flower.webp' },
				reactionEmojis: { seal: 'https://example.test/seal.webp' },
			},
		};
		expect(createNotificationActivity(notification)).toMatchObject({
			title: 'アザラシ :name_emoji:がリアクションしました',
			detail: ':seal: こんにちは :flower:',
			to: '/notes/note-1',
			action: 'さんがノート「こんにちは :flower:」に「:seal:」のリアクションを付けました',
			reaction: ':seal:',
			reactionEmojiUrl: 'https://example.test/seal.webp',
			notificationType: 'reaction',
			emergency: false,
			user: {
				name: 'アザラシ :name_emoji:',
				emojis: { name_emoji: 'https://example.test/name.webp' },
				avatarDecorations: [{ id: 'decoration-1', url: 'https://example.test/decoration.webp', angle: 0.1 }],
			},
			note: {
				emojis: { flower: 'https://example.test/flower.webp' },
				reactionEmojis: { seal: 'https://example.test/seal.webp' },
			},
			cacheSource: {
				kind: 'notification',
				type: 'reaction',
				external: false,
				reaction: ':seal:',
				groupedCount: 0,
			},
		});
		expect(createNotificationActivity(notification, true)).toMatchObject({
			title: '外部アカウント・アザラシ :name_emoji:がリアクションしました',
			to: '/my/external-notifications',
			cacheSource: { external: true },
		});
	});

	test('Bot通知を判別し、人間の通知とは別の集約対象にする', () => {
		const botNotification = createNotificationActivity({
			type: 'follow',
			user: { id: 'bot-1', username: 'helper', name: 'お手伝いBot', host: null, isBot: true },
		});
		const humanNotification = createNotificationActivity({
			type: 'follow',
			user: { id: 'user-1', username: 'person', name: '利用者', host: null, isBot: false },
		});

		expect(botNotification).toMatchObject({ botOrigin: true, cacheSource: { botOrigin: true } });
		expect(humanNotification).toMatchObject({ botOrigin: false, cacheSource: { botOrigin: false } });
		expect(sharesHatacordingNotificationAudience(botNotification, humanNotification)).toBe(false);
		expect(sharesHatacordingNotificationAudience(botNotification, { botOrigin: true })).toBe(true);
	});

	test('通知本文を一行用に整形し、長いノートだけ省略する', () => {
		const longText = 'あ'.repeat(50);
		const copy = createNotificationActivity({
			type: 'reaction',
			user: { id: 'user-1', username: 'seal', name: 'アザラシ', host: null },
			reaction: '👍',
			note: { id: 'note-1', text: longText },
		});
		expect(copy.action).toBe(`さんがノート「${'あ'.repeat(36)}…」に「👍」のリアクションを付けました`);
		expect(copy.action).not.toContain('\n');

		const customEmoji = createNotificationActivity({
			type: 'reaction',
			user: { id: 'user-1', username: 'seal', name: 'アザラシ', host: null },
			reaction: ':seal:',
			note: { id: 'note-1', text: `${'あ'.repeat(35)}:flower:続き`, reactionEmojis: { seal: 'https://example.test/seal.webp' }, emojis: { flower: 'https://example.test/flower.webp' } },
		});
		expect(customEmoji.action).toContain(`${'あ'.repeat(35)}:flower:…`);
		expect(customEmoji.action).not.toContain(':flow…');
	});

	test('キャッシュ用の最小要約から本文と遷移先を復元し、完全なNoteを要求しない', () => {
		const copy = createNotificationActivityFromSource({
			kind: 'notification',
			type: 'reaction',
			external: false,
			groupedCount: 0,
			user: { id: 'user-1', username: 'seal', name: 'アザラシ', host: null } as never,
			noteId: 'note-1',
			noteText: '保存後も残る :flower:',
			noteEmojiUrls: { flower: 'https://example.test/flower.webp' },
			reaction: '👍',
		});

		expect(copy).toMatchObject({
			to: '/notes/note-1',
			action: 'さんがノート「保存後も残る :flower:」に「👍」のリアクションを付けました',
			emojiUrls: { flower: 'https://example.test/flower.webp' },
			note: undefined,
		});
	});

	test('通知種別ごとの操作先を保ち、危険なアプリリンクは通知画面へ戻す', () => {
		const user = { id: 'user-1', username: 'seal', name: 'アザラシ', host: null };
		expect(createNotificationActivity({ type: 'receiveFollowRequest', user })).toMatchObject({ to: '/my/follow-requests' });
		expect(createNotificationActivity({ type: 'groupInvited', user })).toMatchObject({ to: '/my/notifications' });
		expect(createNotificationActivity({ type: 'roleAssigned', role: { id: 'role-1', name: 'お手伝い' } })).toMatchObject({ to: '/roles/role-1' });
		expect(createNotificationActivity({ type: 'chatRoomInvitationReceived', invitation: { roomId: 'room-1' } })).toMatchObject({ to: '/chat/room/room-1' });
		expect(createNotificationActivity({ type: 'achievementEarned' })).toMatchObject({ to: '/my/achievements' });
		expect(createNotificationActivity({ type: 'exportCompleted', fileId: 'file-1' })).toMatchObject({ to: '/my/drive/file/file-1' });
		expect(createNotificationActivity({ type: 'login' })).toMatchObject({ to: '/settings/security' });
		expect(createNotificationActivity({ type: 'createToken' })).toMatchObject({ to: '/settings/apps' });
		expect(createNotificationActivity({ type: 'app', link: 'https://evil.example/' })).toMatchObject({ to: '/my/notifications' });
	});

	test('設定可能な全通知型を固有の表示へ変換する', () => {
		for (const type of notificationTypes) {
			const copy = createNotificationActivity({ type });
			expect(copy.notificationType).toBe(type);
			expect(copy.title, type).not.toBe('新しい通知があります');
			expect(copy.to, type).toMatch(/^\//);
		}
	});

	test('地震・津波は緊急表示として判定し、電文由来の詳細を残す', () => {
		const earthquake = createEarthquakeActivity({ code: 551, item: { issue: { type: 'DetailScale' }, earthquake: { maxScale: 50, hypocenter: { name: 'テスト沖', magnitude: 5.2, depth: 20 }, domesticTsunami: 'None' } } });
		const tsunami = createEarthquakeActivity({ code: 552, item: { areas: [{ grade: 'Warning', name: 'テスト沿岸' }] } });

		expect(earthquake).toMatchObject({ title: '地震情報・最大震度5強', emergency: true, to: '/earthquake' });
		expect(earthquake?.detail).toContain('各地の震度');
		expect(tsunami).toMatchObject({ title: '津波情報・津波警報', emergency: true, to: '/earthquake' });
	});

	test('概要の種別は受信内容に存在する情報だけを記載する', () => {
		expect(hatacordingEarthquakeGroupLabel([{ kind: 'earthquake' }, { kind: 'earthquake' }])).toBe('地震情報');
		expect(hatacordingEarthquakeGroupLabel([{ kind: 'tsunami' }])).toBe('津波情報');
		expect(hatacordingEarthquakeGroupLabel([{ kind: 'earthquake' }, { kind: 'tsunami' }])).toBe('地震・津波情報');
	});

	test('お気に入りとクリップの成功操作だけを遷移可能な表示へ変換する', () => {
		expect(createApiActionActivity('notes/favorites/create')).toMatchObject({ kind: 'favorite', to: '/my/favorites', emergency: false });
		expect(createApiActionActivity('clips/add-note')).toMatchObject({ kind: 'clip', to: '/my/clips', emergency: false });
		expect(createApiActionActivity('notes/show')).toBeNull();
	});

	test('切断設定ごとにfoilの説明を変え、再接続後の状態も区別する', () => {
		expect(createServerDisconnectedActivity('reload')).toMatchObject({
			kind: 'connection',
			title: 'サーバーから切断されました...',
			icon: 'unplug',
		});
		expect(createServerDisconnectedActivity('reload').detail).toContain('自動でリロード');
		expect(createServerDisconnectedActivity('none').detail).toContain('自動ではリロードしない');
		expect(createServerDisconnectedActivity('dialog').detail).toContain('ダイアログ警告の代わり');
		expect(createServerDisconnectedActivity('quiet').detail).toContain('自動再接続');
		expect(createServerReconnectedActivity(false).detail).toContain('リアルタイム受信を再開');
		expect(createServerReconnectedActivity(true).detail).toContain('自動リロード');
	});

	test('リアルタイム切替は右下トーストではなくタイムライン表示用の案内へ変換する', () => {
		expect(createTimelineRealtimeActivity(true)).toMatchObject({
			kind: 'connection',
			title: 'リアルタイム更新を開始しました',
			icon: 'activity',
			emergency: false,
		});
		expect(createTimelineRealtimeActivity(true).detail).toContain('すぐに反映');
		expect(createTimelineRealtimeActivity(false)).toMatchObject({
			kind: 'connection',
			title: 'リアルタイム更新を停止しました',
		});
		expect(createTimelineRealtimeActivity(false).detail).toContain('自動反映されません');
	});
});
