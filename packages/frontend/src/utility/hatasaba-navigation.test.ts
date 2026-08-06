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
} from './hatasaba-navigation.js';

describe('HatasabaUI navigation helpers', () => {
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
