/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

const local = new Map<string, string>();
const api = vi.fn();

vi.mock('@/local-storage.js', () => ({
	miLocalStorage: {
		getItem: (key: string) => local.get(key) ?? null,
		setItem: (key: string, value: string) => local.set(key, value),
	},
}));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: (...args: unknown[]) => api(...args) }));

async function loadModule() {
	vi.resetModules();
	return import('./hatady-prefs.js');
}

describe('Hatadyの共通言語化後の表示設定', () => {
	beforeEach(() => {
		local.clear();
		api.mockReset();
	});

	test('テーマ保存時に既存の旧言語値と将来フィールドを維持する', async () => {
		api.mockImplementation((endpoint: string, data: { value?: unknown }) => {
			if (endpoint === 'i/registry/get') return Promise.resolve({ theme: 'paper', lang: 'en', futureDisplay: true });
			if (endpoint === 'i/registry/set') return Promise.resolve(data.value);
			return Promise.reject(new Error('unexpected'));
		});
		const prefs = await loadModule();

		await prefs.saveHatadyDisplay('espresso');

		expect(local.get('hatadyTheme')).toBe('espresso');
		expect(local.has('hatadyLang')).toBe(false);
		expect(api).toHaveBeenCalledWith('i/registry/set', {
			scope: ['client', 'hatady'],
			key: 'display',
			value: { theme: 'espresso', lang: 'en', futureDisplay: true },
		});
	});

	test('旧言語値が一度もない利用者には言語フィールドを新設しない', async () => {
		api.mockImplementation((endpoint: string, data: { value?: unknown }) => {
			if (endpoint === 'i/registry/get') return Promise.reject(new Error('not found'));
			if (endpoint === 'i/registry/set') return Promise.resolve(data.value);
			return Promise.reject(new Error('unexpected'));
		});
		const prefs = await loadModule();

		await prefs.saveHatadyDisplay('hataskey');

		expect(api).toHaveBeenCalledWith('i/registry/set', {
			scope: ['client', 'hatady'],
			key: 'display',
			value: { theme: 'hataskey' },
		});
	});

	test('サーバー取得不能時も端末に残る旧言語値は消さない', async () => {
		local.set('hatadyLang', 'auto');
		api.mockImplementation((endpoint: string, data: { value?: unknown }) => {
			if (endpoint === 'i/registry/get') return Promise.reject(new Error('offline'));
			if (endpoint === 'i/registry/set') return Promise.resolve(data.value);
			return Promise.reject(new Error('unexpected'));
		});
		const prefs = await loadModule();

		await prefs.saveHatadyDisplay('paper');

		expect(local.get('hatadyLang')).toBe('auto');
		expect(api).toHaveBeenCalledWith('i/registry/set', expect.objectContaining({
			value: { theme: 'paper', lang: 'auto' },
		}));
	});
});
