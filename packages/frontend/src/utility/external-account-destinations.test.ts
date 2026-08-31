/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { isAllowedExternalHost } from './external-api.js';

vi.mock('@/preferences.js', () => ({ prefer: { s: {} } }));

function readFrontendFile(relativePath: string): string {
	return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('外部アカウント連携の接続先', () => {
	const settingsPage = readFrontendFile('src/pages/settings/external-account.vue');
	const externalApi = readFrontendFile('src/utility/external-api.ts');

	test('㐂五亭をSharkey互換の外部接続先として表示する', () => {
		expect(settingsPage).toContain('const KIGOTEI = \'ddoskey.com\'');
		expect(settingsPage).toContain('㐂五亭 (${KIGOTEI})');
		expect(settingsPage).toContain('currentHost !== KIGOTEI');
	});

	test('BearBearの表示名と接続先を登録し、自ホストでは候補から除外する', () => {
		expect(settingsPage).toContain('const BEARBEAR = \'xiapopisland.top\'');
		const selfHostGuard = /if \(currentHost !== BEARBEAR\) \{\s*options\.push\(\{ value: BEARBEAR, label: `BearBear \(\$\{BEARBEAR\}\)` \}\);\s*\}/u;
		expect(selfHostGuard.test(settingsPage)).toBe(true);
		// 条件が取り除かれた場合に検出できることも確かめる。
		expect(selfHostGuard.test(settingsPage.replace('currentHost !== BEARBEAR', 'true'))).toBe(false);
	});

	test('BearBearにも一般外部サーバーの免責と共通MiAuth処理を適用する', () => {
		expect(settingsPage).toMatch(/function isHataSaba\(host: string\): boolean \{\s*return host === HATACHI_2;\s*\}/u);
		const authFlow = settingsPage.slice(settingsPage.indexOf('async function startMiAuth()'), settingsPage.indexOf('async function unlinkAccount()'));
		const validation = authFlow.indexOf('if (!host || !isAllowedExternalHost(host)) return');
		const disclaimer = authFlow.indexOf('text: accountCopyx.externalDisclaimer({ host })');
		const redirect = authFlow.indexOf('window.location.href = miAuthUrl');
		expect(validation).toBeGreaterThan(-1);
		expect(disclaimer).toBeGreaterThan(validation);
		expect(redirect).toBeGreaterThan(disclaimer);
		expect(authFlow).toContain('if (canceled || result === \'cancel\') return');
		expect(authFlow).toContain('`https://${host}/miauth/${sessionId}?');
		const hardcodedDestination = /https:\/\/(?:xiapopisland\.top|ddoskey\.com)\//u;
		expect(hardcodedDestination.test('https://xiapopisland.top/miauth/example')).toBe(true);
		expect(hardcodedDestination.test(authFlow)).toBe(false);
	});

	test('BearBearを許可しつつ不正な接続先や撤去済みホストは共通検証で拒否する', () => {
		expect(isAllowedExternalHost('xiapopisland.top')).toBe(true);
		for (const host of ['https://xiapopisland.top', 'xiapopisland.top/miauth', 'xiapopisland.top@localhost', '127.0.0.1', 'o.hata.blog']) {
			expect(isAllowedExternalHost(host), host).toBe(false);
		}
	});

	test('追加先も既存のホスト検証と撤去先検査を通してからMiAuthへ進む', () => {
		expect(settingsPage).toContain('if (!host || !isAllowedExternalHost(host)) return');
		expect(externalApi).toContain('return isValidExternalHost(host) && !isRetiredExternalHost(host)');
		expect(settingsPage).not.toContain('https://ddoskey.com/');
	});
});
