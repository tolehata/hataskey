/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import {
	getFirstListTimelinePath,
	getPreferredTimelinePath,
	getTimelineCollectionId,
	getVisibleBottomNav,
	HATASABA_BOTTOM_NAV_MAX,
	isAntennaTimelinePath,
	isListTimelinePath,
	mergeMissingNavItems,
	normalizeUiSBottomNav,
	getUiSBottomNavDefaults,
	resolveUiSBottomNav,
	UI_S_BOTTOM_NAV_MAX,
} from './hatasaba-navigation.js';

describe('Hataskey UI navigation helpers', () => {
	test('既存の並びと表示状態を保ち、新しい下部ナビ候補だけを末尾へ補う', () => {
		const saved = [
			{ id: 'home', icon: 'ti ti-home', label: 'ホーム', visible: true },
			{ id: 'hatask', icon: 'ti ti-eye', label: '独自機能', visible: false },
		];
		const defaults = [
			...saved,
			{ id: 'hatady', icon: 'ti ti-book-2', label: 'Hatady', visible: false },
			{ id: 'hatafeed', icon: 'ti ti-message-report', label: 'HataFeed', visible: false },
		];

		expect(mergeMissingNavItems(saved, defaults)).toEqual(defaults);
	});

	test('端末に記憶したリストとアンテナを優先し、削除済みなら先頭へ戻す', () => {
		const items = [{ id: 'first' }, { id: 'remembered' }];
		expect(getPreferredTimelinePath(items, 'remembered', 'list')).toBe('/timeline/list/remembered');
		expect(getPreferredTimelinePath(items, 'deleted', 'list')).toBe('/timeline/list/first');
		expect(getPreferredTimelinePath(items, 'remembered', 'antenna')).toBe('/timeline/antenna/remembered');
		expect(getPreferredTimelinePath([], 'remembered', 'antenna')).toBeNull();
	});

	test('リスト・アンテナのタイムラインパスから選択IDを取り出す', () => {
		expect(getTimelineCollectionId('/timeline/list/list-id', 'list')).toBe('list-id');
		expect(getTimelineCollectionId('/timeline/antenna/antenna-id/', 'antenna')).toBe('antenna-id');
		expect(getTimelineCollectionId('/my/lists', 'list')).toBeNull();
		expect(isAntennaTimelinePath('/timeline/antenna/antenna-id')).toBe(true);
		expect(isAntennaTimelinePath('/my/antennas')).toBe(false);
	});

	test('下部ナビの表示上限は4つのまま', () => {
		const items = Array.from({ length: 6 }, (_, i) => ({ id: String(i), icon: '', label: String(i), visible: true }));
		expect(HATASABA_BOTTOM_NAV_MAX).toBe(4);
		expect(getVisibleBottomNav(items).map(item => item.id)).toEqual(['0', '1', '2', '3']);
	});

	test('リスト本体ボタンは一覧先頭へ直接遷移し、空なら遷移先を返さない', () => {
		expect(getFirstListTimelinePath([{ id: 'first' }, { id: 'second' }])).toBe('/timeline/list/first');
		expect(getFirstListTimelinePath([])).toBeNull();
		expect(isListTimelinePath('/timeline/list/first')).toBe(true);
		expect(isListTimelinePath('/my/lists')).toBe(false);
	});
});

describe('UI S bottom navigation normalization', () => {
	test.each([
		{ name: 'missing home', items: [{ id: 'search' }, { id: 'notifications' }], expected: ['search', 'notifications', 'home'] },
		{ name: 'hidden home in its saved position', items: [{ id: 'search' }, { id: 'home', visible: false }, { id: 'hatask' }], expected: ['search', 'home', 'hatask'] },
		{ name: 'home beyond five visible slots', items: ['search', 'notifications', 'hatask', 'widgets', 'hatady', 'home'].map(id => ({ id })), expected: ['search', 'notifications', 'hatask', 'widgets', 'home'] },
		{ name: 'missing home with five occupied slots', items: ['search', 'notifications', 'hatask', 'widgets', 'hatady'].map(id => ({ id })), expected: ['search', 'notifications', 'hatask', 'widgets', 'home'] },
		{ name: 'reordered home and hidden alternatives', items: [{ id: 'home' }, { id: 'search', visible: false }, { id: 'widgets' }, { id: 'notifications' }], expected: ['home', 'widgets', 'notifications'] },
		{ name: 'unknown and duplicate entries', items: [{ id: 'future' }, { id: 'search' }, { id: 'search' }, { id: 'home', visible: false }, { id: 'home' }, { id: 'widgets' }], expected: ['search', 'home', 'widgets'] },
	])('$name', ({ items, expected }) => {
		const saved = items.map(item => Object.freeze({ ...item }));
		const before = getVisibleBottomNav(saved);
		const result = normalizeUiSBottomNav(Object.freeze(saved));
		expect(result.map(item => item.id)).toEqual(expected);
		expect(result.find(item => item.id === 'home')?.visible).toBe(true);
		expect(UI_S_BOTTOM_NAV_MAX).toBe(5);
		expect(result.length + 1).toBeLessThanOrEqual(6);
		expect(getVisibleBottomNav(saved)).toEqual(before);
		expect(normalizeUiSBottomNav(result)).toEqual(result);
	});

	const sharedDefaults = ['search', 'home', 'notifications', 'hatask', 'hatady', 'hatafeed', 'widgets'].map((id, index) => ({ id, visible: index < 4 }));
	test('enables five UI S defaults with Widgets immediately after Hatask, preserving legacy defaults and custom order', () => {
		const before = sharedDefaults.map(item => ({ ...item }));
		expect(normalizeUiSBottomNav(resolveUiSBottomNav(null, sharedDefaults, sharedDefaults)).map(item => item.id)).toEqual(['search', 'home', 'notifications', 'hatask', 'widgets']);
		expect(getUiSBottomNavDefaults(sharedDefaults).find(item => item.id === 'hatask')?.visible).toBe(true);
		const custom = [{ id: 'hatask', visible: true, label: 'custom' }, { id: 'home', visible: false }, { id: 'search', visible: true }];
		const inherited = resolveUiSBottomNav(null, custom, sharedDefaults);
		expect(inherited.slice(0, custom.length)).toEqual(custom);
		expect(normalizeUiSBottomNav(inherited).map(item => item.id)).toEqual(['hatask', 'home', 'search']);
		expect(sharedDefaults).toEqual(before);
	});

	test('dedicated settings take precedence and reset to null resumes legacy fallback', () => {
		const own = [{ id: 'widgets', visible: true }, { id: 'home', visible: true }];
		expect(normalizeUiSBottomNav(resolveUiSBottomNav(own, sharedDefaults, sharedDefaults)).map(item => item.id)).toEqual(['widgets', 'home']);
		expect(normalizeUiSBottomNav(resolveUiSBottomNav([], sharedDefaults, sharedDefaults)).map(item => item.id)).toEqual(['home']);
		expect(normalizeUiSBottomNav(resolveUiSBottomNav(null, [{ id: 'hatask' }], sharedDefaults)).map(item => item.id)).toEqual(['hatask', 'home']);
	});
});
