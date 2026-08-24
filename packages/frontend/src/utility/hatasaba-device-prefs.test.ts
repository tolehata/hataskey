/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';

const storage = vi.hoisted(() => ({
	getItem: vi.fn(() => null as string | null),
	setItem: vi.fn(),
	removeItem: vi.fn(),
}));

vi.mock('@/local-storage.js', () => ({
	miLocalStorage: storage,
}));

import { setTabSwipeEnabled, tabSwipeEnabled } from './hatasaba-device-prefs.js';

describe('Hataskey UIの左右スワイプ設定', () => {
	test('未設定では有効で、無効化は端末ローカルに保存する', () => {
		expect(tabSwipeEnabled.value).toBe(true);

		setTabSwipeEnabled(false);

		expect(tabSwipeEnabled.value).toBe(false);
		expect(storage.setItem).toHaveBeenCalledWith('hatasabaTabSwipeEnabled', 'false');
	});
});
