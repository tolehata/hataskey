/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
vi.mock('@/i18n.js', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const yaml = await import('js-yaml');
	const { I18n } = await import('@@/js/i18n.js');
	const locale = yaml.load(fs.readFileSync(path.resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8'));
	return { i18n: new I18n(locale as any) };
});
import shellSource from './index.vue?raw';
import mobileSource from './SettingsMobileOverview.vue?raw';
import searchSource from './SettingsSearchPanel.vue?raw';
import { settingsDestinationSections, settingsDestinations } from './settings-destinations.js';
import routerSource from '@/router.definition.ts?raw';

function navigationPathKey(item: (typeof settingsDestinations)[number]): string {
	const activation = item.activation;
	const activationKey = activation == null
		? ''
		: `#${activation.kind}:${activation.category}:${'popup' in activation ? activation.popup : ''}`;
	const query = item.route === '/settings/preferences' ? `?destination=${encodeURIComponent(item.id)}` : '';
	return `${item.route}${query}${activationKey}`;
}

describe('settings redesign destination contract', () => {
	test('categories are complete, non-empty, and uniquely identified', () => {
		// ⚠️Misskey UI から画面と関係ない設定を「その他」節へ切り出したので9->10。
		// 旗鯖fork: ⚠️用途ごとに節を割り直した（10 → 15）。
		//   「データと連携」に17項目が積まれていて、どこに何があるか読めなかった。
		// 旗鯖fork: ⚠️プロフィールだけの節は畳んだ（左上に常設の入口があるため）。
		expect(settingsDestinationSections).toHaveLength(14);
		expect(settingsDestinationSections.every(section => section.items.length > 0)).toBe(true);
		expect(new Set(settingsDestinations.map(item => item.id)).size).toBe(settingsDestinations.length);
		expect(settingsDestinations.length).toBeGreaterThan(0);
		expect(settingsDestinations.every(item => item.route.trim() !== '')).toBe(true);
	});
	test('manifest navigation paths do not collide', () => {
		const paths = settingsDestinations.map(navigationPathKey);
		expect(new Set(paths).size).toBe(paths.length);
	});
	test('active, brand, search, and route contracts are wired', () => {
		for (const source of [shellSource, mobileSource]) expect(source).toContain('aria-current');
		expect(searchSource).toContain('aria-selected');
		for (const source of [shellSource, mobileSource, searchSource]) expect(source).toContain('settingsBrand');
		for (const id of ['hataskey-ui', 'hataskey-tools', 'hatasnscord-ui']) {
			expect(settingsDestinationSections.find(section => section.id === id)?.brand).toBeTruthy();
		}
		expect(shellSource).toContain('sectionHasActiveItem');
		expect(searchSource).toContain('[aria-selected=\'true\']:hover');
		expect(searchSource).toContain('hasSettingsBrand(item.label)');
		expect(routerSource).toContain('name: \'hatafeed-settings\'');
		expect(routerSource).toContain('name: \'hatasnscord-ui-settings\'');
		expect(routerSource).toContain('import(\'@/pages/settings/preferences.vue\')');
	});
});
