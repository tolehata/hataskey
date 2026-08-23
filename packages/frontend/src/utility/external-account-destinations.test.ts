/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

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

	test('追加先も既存のホスト検証と撤去先検査を通してからMiAuthへ進む', () => {
		expect(settingsPage).toContain('if (!host || !isAllowedExternalHost(host)) return');
		expect(externalApi).toContain('return isValidExternalHost(host) && !isRetiredExternalHost(host)');
		expect(settingsPage).not.toContain('https://ddoskey.com/');
	});
});
