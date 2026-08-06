/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

const local = new Map<string, string>();
const commits: [string, unknown][] = [];
const api = vi.fn();

vi.mock('@@/js/config.js', () => ({ version: '2026.7.0-hata.12.0' }));
vi.mock('@/local-storage.js', () => ({
	miLocalStorage: {
		getItem: (key: string) => local.get(key) ?? null,
		setItem: (key: string, value: string) => local.set(key, value),
		removeItem: (key: string) => local.delete(key),
	},
}));
vi.mock('@/preferences.js', () => ({
	prefer: {
		s: new Proxy({}, { get: (_target, key) => `value:${String(key)}` }),
		commit: (key: string, value: unknown) => commits.push([key, value]),
	},
}));
vi.mock('@/preferences/manager.js', () => ({
	getInitialPrefValue: (key: string) => key === 'postFormVisibilityBorder.width' ? 3 : key.endsWith('Nav') || key.endsWith('sidebar') ? [] : key.includes('enabled') || key.includes('show') || key.includes('Effect') || key.includes('Consent') ? false : '',
}));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: (...args: unknown[]) => api(...args) }));
vi.mock('@/i.js', () => ({ $i: {
	showUtageSuccessCount: true,
	showUtageInterruptionCount: false,
	showHataskFlowerCount: true,
} }));

import {
	applyHataSettingsTransfer,
	createHataSettingsTransfer,
	getVersionMismatchMessage,
	HATA_SETTINGS_TRANSFER_FORMAT,
	parseHataSettingsTransfer,
} from './hata-settings-transfer.js';

describe('旗鯖独自設定の入出力', () => {
	beforeEach(() => {
		local.clear();
		commits.length = 0;
		api.mockReset();
		api.mockRejectedValue(new Error('未設定'));
	});

	test('未知カテゴリを残した新しい版のファイルも解析し、警告対象にする', () => {
		const parsed = parseHataSettingsTransfer(JSON.stringify({
			format: HATA_SETTINGS_TRANSFER_FORMAT,
			formatVersion: 99,
			serverVersion: '2099.1.0-hata.99.0',
			exportedAt: '2099-01-01T00:00:00.000Z',
			categories: { general: {}, futureTool: { setting: true } },
		}));
		expect(parsed.unknownCategories).toEqual(['futureTool']);
		expect(getVersionMismatchMessage(parsed.file)).toContain('2099.1.0-hata.99.0');
		expect(getVersionMismatchMessage(parsed.file)).toContain('スキップ');
	});

	test('書き出しは許可した設定だけを含み、外部ログイン情報を含めない', async () => {
		local.set('hatasabaTabSwipeEnabled', 'false');
		local.set('hataSideStudio', JSON.stringify({ version: 5, activeProfileId: 'p1', profiles: [{ id: 'p1', name: '持ち運び', expanded: { nodes: [], columns: 1, width: 'normal', parallax: false }, collapsed: { buttons: [] }, updatedAt: '2026-08-07T00:00:00.000Z' }] }));
		local.set('account', JSON.stringify({ token: 'SECRET' }));
		const file = await createHataSettingsTransfer(['hatasabaUi', 'hataSideStudio']);
		const text = JSON.stringify(file);
		expect(file.categories.hatasabaUi?.device?.hatasabaTabSwipeEnabled).toBe('false');
		expect(file.categories.hatasabaUi?.device).not.toHaveProperty('hataSideStudio');
		expect(JSON.parse(String(file.categories.hataSideStudio?.device?.hataSideStudio)).profiles[0].name).toBe('持ち運び');
		expect(text).not.toContain('external.token');
		expect(text).not.toContain('SECRET');
		expect(text).not.toContain('account');
	});

	test('端末設定を先に適用し、型の合わない項目だけをスキップする', async () => {
		const file = parseHataSettingsTransfer(JSON.stringify({
			format: HATA_SETTINGS_TRANSFER_FORMAT,
			formatVersion: 1,
			serverVersion: '2026.7.0-hata.12.0',
			exportedAt: '2026-08-06T00:00:00.000Z',
			categories: {
				hatasabaUi: {
					device: { hatasabaTabSwipeEnabled: 'false', hatasabaLastListId: 123 },
					preferences: { 'simpleUi.showTrendingTab': false },
				},
			},
		})).file;
		const result = await applyHataSettingsTransfer(file, ['hatasabaUi']);
		expect(local.get('hatasabaTabSwipeEnabled')).toBe('false');
		expect(local.has('hatasabaLastListId')).toBe(false);
		expect(commits).toContainEqual(['simpleUi.showTrendingTab', false]);
		expect(result.applied).toBe(2);
		expect(result.skipped).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'hatasabaLastListId' })]));
	});

	test('ナビ配列の壊れた要素と未知フィールドだけを落とし、正常な要素を読み込む', async () => {
		const file = parseHataSettingsTransfer(JSON.stringify({
			format: HATA_SETTINGS_TRANSFER_FORMAT,
			formatVersion: 2,
			serverVersion: '2026.7.0-hata.12.0',
			exportedAt: '2026-08-07T00:00:00.000Z',
			categories: {
				hatasabaUi: {
					preferences: {
						'simpleUi.topNav': [
							{ id: 'local', icon: 'ti ti-planet', label: 'ローカル', visible: true, futureOption: 'skip-me' },
							{ id: 123, icon: 'ti ti-home', label: '壊れた項目', visible: true },
							'not-an-item',
						],
					},
				},
			},
		})).file;
		const result = await applyHataSettingsTransfer(file, ['hatasabaUi']);
		expect(commits).toContainEqual(['simpleUi.topNav', [{ id: 'local', icon: 'ti ti-planet', label: 'ローカル', visible: true }]]);
		expect(result.applied).toBe(1);
		expect(result.skipped).toEqual(expect.arrayContaining([
			expect.objectContaining({ key: 'simpleUi.topNav[0].futureOption', reason: 'この版では扱わない項目です' }),
			expect.objectContaining({ key: 'simpleUi.topNav[1].id' }),
			expect.objectContaining({ key: 'simpleUi.topNav[2]' }),
		]));
	});

	test('新デッキのネストした壊れたタブだけを落とし、既知の設定と兄弟タブを残す', async () => {
		const file = parseHataSettingsTransfer(JSON.stringify({
			format: HATA_SETTINGS_TRANSFER_FORMAT,
			formatVersion: 2,
			serverVersion: '2027.1.0-hata.13.0',
			exportedAt: '2027-01-01T00:00:00.000Z',
			categories: {
				hatasabaUi: {
					preferences: {
						'simpleUi.deckProfilesV2': [{
							id: 'profile-1', name: '持ち込み', layout: 'row', futureProfileField: true,
							slots: [{
								id: 'slot-1', width: 380,
								frames: [{
									id: 'frame-1', activeTab: 'tab-ok', height: 420,
									tabs: [
										{ id: 'tab-ok', type: 'local', tabColor: '#336699', excludeTypes: ['reaction'] },
										{ id: 'tab-broken', type: 42 },
									],
								}],
							}],
						}],
					},
				},
			},
		})).file;
		const result = await applyHataSettingsTransfer(file, ['hatasabaUi']);
		const imported = commits.find(([key]) => key === 'simpleUi.deckProfilesV2')?.[1] as Array<Record<string, unknown>>;
		expect(imported).toHaveLength(1);
		expect(imported[0]).not.toHaveProperty('futureProfileField');
		expect((((imported[0].slots as Array<Record<string, unknown>>)[0].frames as Array<Record<string, unknown>>)[0].tabs as unknown[])).toEqual([
			{ id: 'tab-ok', type: 'local', tabColor: '#336699', excludeTypes: ['reaction'] },
		]);
		expect(result.applied).toBe(1);
		expect(result.skipped).toEqual(expect.arrayContaining([
			expect.objectContaining({ key: 'simpleUi.deckProfilesV2[0].futureProfileField' }),
			expect.objectContaining({ key: 'simpleUi.deckProfilesV2[0].slots[0].frames[0].tabs[1].type' }),
		]));
	});

	test('配列の全要素が壊れている設定は現在値を空配列で上書きしない', async () => {
		const file = parseHataSettingsTransfer(JSON.stringify({
			format: HATA_SETTINGS_TRANSFER_FORMAT,
			formatVersion: 2,
			serverVersion: '2026.7.0-hata.12.0',
			exportedAt: '2026-08-07T00:00:00.000Z',
			categories: { hatasabaUi: { preferences: { 'simpleUi.deckRssFeeds': [{ id: 1, url: false }] } } },
		})).file;
		const result = await applyHataSettingsTransfer(file, ['hatasabaUi']);
		expect(commits.some(([key]) => key === 'simpleUi.deckRssFeeds')).toBe(false);
		expect(result.applied).toBe(0);
		expect(result.skipped).toEqual(expect.arrayContaining([
			expect.objectContaining({ key: 'simpleUi.deckRssFeeds[0].id' }),
			expect.objectContaining({ key: 'simpleUi.deckRssFeeds[0].url' }),
		]));
	});

	test('v1のHataSideStudio設定を独立カテゴリへ移し、JSON形状を検査して端末へ読み込む', async () => {
		const studio = JSON.stringify({
			version: 1,
			activeProfileId: 'p1',
			profiles: [{ id: 'p1', name: '持ち込み', expanded: { nodes: [], columns: 1, parallax: false }, collapsed: { buttons: [] }, updatedAt: '2026-08-06T00:00:00.000Z' }],
		});
		const file = parseHataSettingsTransfer(JSON.stringify({
			format: HATA_SETTINGS_TRANSFER_FORMAT,
			formatVersion: 1,
			serverVersion: '2026.7.0-hata.12.0',
			exportedAt: '2026-08-06T00:00:00.000Z',
			categories: { hatasabaUi: { device: { hataSideStudio: studio } } },
		})).file;
		expect(file.categories.hataSideStudio?.device?.hataSideStudio).toBe(studio);
		const result = await applyHataSettingsTransfer(file, ['hataSideStudio']);
		expect(JSON.parse(local.get('hataSideStudio') ?? '{}').profiles[0].name).toBe('持ち込み');
		expect(result.applied).toBe(1);
	});

	test('新しいHatask設定の未知項目は捨て、既存項目を残して既知項目だけを上書きする', async () => {
		api.mockImplementation((endpoint: string, data: { value?: unknown }) => {
			if (endpoint === 'i/registry/get') return Promise.resolve({ showClock: true, theme: 'kisetsu' });
			if (endpoint === 'i/registry/set') return Promise.resolve(data.value);
			return Promise.reject(new Error('unexpected'));
		});
		const file = parseHataSettingsTransfer(JSON.stringify({
			format: HATA_SETTINGS_TRANSFER_FORMAT,
			formatVersion: 2,
			serverVersion: '2027.1.0-hata.13.0',
			exportedAt: '2027-01-01T00:00:00.000Z',
			categories: { hatask: { registry: { settings: { showClock: false, futureSetting: 'unknown' } } } },
		})).file;
		const result = await applyHataSettingsTransfer(file, ['hatask']);
		const setCall = api.mock.calls.find(call => call[0] === 'i/registry/set');
		expect(setCall?.[1].value).toEqual({ showClock: false, theme: 'kisetsu' });
		expect(result.applied).toBe(1);
		expect(result.skipped).toContainEqual(expect.objectContaining({ key: 'settings.futureSetting' }));
	});
});
