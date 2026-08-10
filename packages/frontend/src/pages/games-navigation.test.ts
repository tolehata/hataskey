/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const cwd = process.cwd();
const gamesSource = readFileSync(`${cwd}/src/pages/games.vue`, 'utf8');
const desktopHeaderSource = readFileSync(`${cwd}/src/components/global/MkPageHeader.vue`, 'utf8');
const mobileHeaderSource = readFileSync(`${cwd}/src/components/global/CPPageHeader.vue`, 'utf8');
const hanaawaseSource = readFileSync(`${cwd}/src/pages/hanaawase/index.vue`, 'utf8');

describe('Hataskey Games の戻る導線', () => {
	test('PC・モバイルとも履歴上の花常ではなくホームへ戻る', () => {
		expect(gamesSource).toContain('<PageWithHeader backPath="/">');
		for (const source of [desktopHeaderSource, mobileHeaderSource]) {
			expect(source).toContain('backPath?: string;');
			expect(source).toMatch(/if \(props\.backPath\) \{\s*router\.pushByPath\(props\.backPath\);\s*return;\s*\}/);
		}
	});

	test('花常終了時にもゲーム一覧の後ろへ花常履歴を積まない', () => {
		expect(hanaawaseSource).toContain('router.replaceByPath("/games")');
		expect(hanaawaseSource).not.toContain('router.push("/games")');
	});
});
