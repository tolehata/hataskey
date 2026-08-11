/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

const stored = vi.hoisted(() => new Map<string, unknown>());
const storage = vi.hoisted(() => ({
	getItemAsJson: vi.fn((key: string) => stored.get(key) ?? null),
	setItemAsJson: vi.fn((key: string, value: unknown) => stored.set(key, structuredClone(value))),
}));

vi.mock('@/local-storage.js', () => ({
	miLocalStorage: storage,
}));

import {
	defaultHatacordingUiPreferences,
	HATACORDING_UI_PREFERENCES_CHANGE_EVENT,
	readHatacordingUiPreferences,
	setHatacordingUiEnabled,
	writeHatacordingUiPreferences,
} from './hatacording-ui.js';

describe('HataSNSCordUIの端末ローカル設定', () => {
	beforeEach(() => {
		stored.clear();
		storage.getItemAsJson.mockClear();
		storage.setItemAsJson.mockClear();
	});

	test('未設定では有効で、詳細とウィジェットの既定タブを持つ', () => {
		const prefs = readHatacordingUiPreferences('user-a');

		expect(prefs.enabled).toBe(true);
		expect(prefs.colorMode).toBe('theme');
		expect(prefs.uiScale).toBe('medium');
		expect(prefs.timelineRealtime).toBe(true);
		expect(prefs.showRateLimitNumber).toBe(false);
		expect(prefs.showCharacterCounter).toBe(false);
		expect(prefs.showFoilAnimation).toBe(true);
		expect(prefs.tutorialCompleted).toBe(false);
		expect(prefs.composerShortcuts).toEqual([]);
		expect(prefs.currentTimelineId).toBe('timeline:local');
		expect(prefs.subpaneTabs.map(tab => tab.kind)).toEqual(['detail', 'widgets']);
		expect(prefs.reuseSubpaneTab).toBe(false);
		expect(prefs.rightPaneWidth).toBe(360);
		expect(storage.getItemAsJson).toHaveBeenCalledWith('hatacordingUi:user-a');
	});

	test('旧版の保存値へ右ペインとカテゴリ開閉の既定値を補う', () => {
		stored.set('hatacordingUi:user-old', {
			version: 1,
			menu: {},
			currentTimelineId: 'timeline:home',
			subpaneTabs: [],
		});

		const prefs = readHatacordingUiPreferences('user-old');

		expect(prefs.version).toBe(7);
		expect(prefs.enabled).toBe(true);
		expect(prefs.colorMode).toBe('theme');
		expect(prefs.uiScale).toBe('medium');
		expect(prefs.timelineRealtime).toBe(true);
		expect(prefs.showRateLimitNumber).toBe(false);
		expect(prefs.showCharacterCounter).toBe(false);
		expect(prefs.showFoilAnimation).toBe(true);
		expect(prefs.tutorialCompleted).toBe(false);
		expect(prefs.rightPaneCollapsed).toBe(false);
		expect(prefs.collectionExpanded).toEqual({ lists: false, antennas: false, channels: false });
		expect(prefs.collectionIcons).toEqual({ lists: 'list', antennas: 'radio', channels: 'tv' });
		expect(prefs.composerShortcuts).toEqual([]);
	});

	test('投稿欄ショートカットは既知の項目だけを重複なく2個まで復元し、常設化した絵文字は除く', () => {
		stored.set('hatacordingUi:user-shortcuts', {
			...defaultHatacordingUiPreferences(),
			composerShortcuts: ['poll', 'emoji', 'poll', 'unknown', 'mfm', 'event', 'drawing', 'reaction', 'full'],
		});
		expect(readHatacordingUiPreferences('user-shortcuts').composerShortcuts).toEqual(['poll', 'mfm']);
	});

	test('有効なカラーモードだけを復元し、壊れた値はテーマカラーへ戻す', () => {
		stored.set('hatacordingUi:user-color', {
			...defaultHatacordingUiPreferences(),
			colorMode: 'dark',
		});
		expect(readHatacordingUiPreferences('user-color').colorMode).toBe('dark');

		stored.set('hatacordingUi:user-broken-color', {
			...defaultHatacordingUiPreferences(),
			colorMode: 'neon',
		});
		expect(readHatacordingUiPreferences('user-broken-color').colorMode).toBe('theme');
	});

	test('UI倍率とリアルタイム更新は端末ごとに復元し、未知の倍率を中へ戻す', () => {
		stored.set('hatacordingUi:user-scale', {
			...defaultHatacordingUiPreferences(),
			uiScale: 'large',
			timelineRealtime: false,
		});
		expect(readHatacordingUiPreferences('user-scale')).toMatchObject({ uiScale: 'large', timelineRealtime: false });

		stored.set('hatacordingUi:user-broken-scale', {
			...defaultHatacordingUiPreferences(),
			uiScale: 'huge',
		});
		expect(readHatacordingUiPreferences('user-broken-scale').uiScale).toBe('medium');
	});

	test('文字数チェッカーは明示的に有効化した端末だけで復元する', () => {
		stored.set('hatacordingUi:user-counter', {
			...defaultHatacordingUiPreferences(),
			showCharacterCounter: true,
		});

		expect(readHatacordingUiPreferences('user-counter').showCharacterCounter).toBe(true);
	});

	test('shimmer演出は旧foil設定を引き継ぎ、明示的に無効化した端末では復元しない', () => {
		stored.set('hatacordingUi:user-no-foil', {
			...defaultHatacordingUiPreferences(),
			showFoilAnimation: false,
		});

		expect(readHatacordingUiPreferences('user-no-foil').showFoilAnimation).toBe(false);
	});

	test('右ペイン幅はコンパクトUIの安全範囲へ収める', () => {
		stored.set('hatacordingUi:user-wide', {
			...defaultHatacordingUiPreferences(),
			rightPaneWidth: 900,
		});
		stored.set('hatacordingUi:user-narrow', {
			...defaultHatacordingUiPreferences(),
			rightPaneWidth: 100,
		});

		expect(readHatacordingUiPreferences('user-wide').rightPaneWidth).toBe(560);
		expect(readHatacordingUiPreferences('user-narrow').rightPaneWidth).toBe(280);
	});

	test('壊れた値を読み飛ばし、必須の詳細タブを復元する', () => {
		stored.set('hatacordingUi:user-b', {
			enabled: true,
			menu: {
				valid: { pinned: true, hidden: false, order: 2 },
				broken: 'invalid',
			},
			subpaneTabs: [{ id: 'custom', title: '長いタブ名'.repeat(10), kind: 'widgets', widgets: [{ id: 'w1', name: 'clock', data: {} }, null] }],
			activeSubpaneTabId: 'missing',
		});

		const prefs = readHatacordingUiPreferences('user-b');

		expect(prefs.enabled).toBe(true);
		expect(prefs.menu).toEqual({ valid: { pinned: true, hidden: false, order: 2 } });
		expect(prefs.subpaneTabs[0].kind).toBe('detail');
		expect(prefs.subpaneTabs.map(tab => tab.title)).toEqual(['detail', 'widgets']);
		expect(prefs.subpaneTabs[1].widgets).toHaveLength(1);
		expect(prefs.activeSubpaneTabId).toBe(prefs.subpaneTabs[0].id);
	});

	test('重複した右ペインのタブIDを除き、詳細タブを正規IDへ自己修復する', () => {
		stored.set('hatacordingUi:user-tabs', {
			...defaultHatacordingUiPreferences(),
			subpaneTabs: [
				{ id: 'legacy-detail', title: '詳細', kind: 'detail', widgets: [] },
				{ id: 'same', title: '時計', kind: 'widgets', widgets: [] },
				{ id: 'same', title: '重複', kind: 'widgets', widgets: [] },
				{ id: 'detail', title: '壊れたタブ', kind: 'widgets', widgets: [] },
			],
			activeSubpaneTabId: 'missing',
		});

		const prefs = readHatacordingUiPreferences('user-tabs');

		expect(prefs.subpaneTabs.map(tab => tab.id)).toEqual(['detail', 'same']);
		expect(prefs.subpaneTabs.map(tab => tab.title)).toEqual(['detail', 'widgets']);
		expect(prefs.activeSubpaneTabId).toBe('detail');
	});

	test('有効化と設定保存はアカウント別キーだけを書き換える', () => {
		const enabled = setHatacordingUiEnabled('user-c', true);
		expect(enabled.enabled).toBe(true);
		expect(storage.setItemAsJson).toHaveBeenLastCalledWith('hatacordingUi:user-c', enabled);

		const customized = defaultHatacordingUiPreferences();
		customized.sidebarCollapsed = true;
		writeHatacordingUiPreferences('user-d', customized);
		expect(stored.get('hatacordingUi:user-d')).toMatchObject({ sidebarCollapsed: true });
		expect(stored.get('hatacordingUi:user-c')).toMatchObject({ enabled: true });
	});

	test('保存後の検証済み設定を同一端末内の設定画面へ通知する', () => {
		const listener = vi.fn();
		window.addEventListener(HATACORDING_UI_PREFERENCES_CHANGE_EVENT, listener);
		const customized = { ...defaultHatacordingUiPreferences(), colorMode: 'dark' as const, uiScale: 'small' as const };

		writeHatacordingUiPreferences('user-sync', customized);

		expect(listener).toHaveBeenCalledTimes(1);
		expect((listener.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
			accountId: 'user-sync',
			preferences: { colorMode: 'dark', uiScale: 'small' },
		});
		window.removeEventListener(HATACORDING_UI_PREFERENCES_CHANGE_EVENT, listener);
	});
});
