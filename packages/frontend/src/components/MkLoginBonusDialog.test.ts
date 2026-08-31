/*
 * SPDX-FileCopyrightText: syuilo and misskey-project & Hata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compileScript, compileStyleAsync, parse } from '@vue/compiler-sfc';
import { describe, expect, test } from 'vitest';

const componentPath = resolve(process.cwd(), 'src/components/MkLoginBonusDialog.vue');

function layoutViolations(rule: string): string[] {
	return [
		...(rule.match(/margin:\s*auto;/u) ? [] : ['親モーダル内で中央配置されない']),
		...(rule.match(/box-sizing:\s*border-box;/u) ? [] : ['paddingを含めた幅に収まらない']),
		...(rule.match(/width:\s*380px;/u) ? [] : ['既存の通常幅を維持しない']),
		...(rule.match(/max-width:\s*100%;/u) ? [] : ['親モーダルの余白を越える']),
	];
}

describe('login bonus dialog layout contract', () => {
	test('SFCとSCSSをコンパイルできる', async () => {
		const source = await readFile(componentPath, 'utf8');
		const parsed = parse(source, { filename: componentPath });
		expect(parsed.errors).toEqual([]);
		expect(() => compileScript(parsed.descriptor, { id: 'mk-login-bonus-dialog' })).not.toThrow();

		const style = await compileStyleAsync({
			source: parsed.descriptor.styles[0]!.content,
			filename: componentPath,
			id: 'mk-login-bonus-dialog',
			preprocessLang: 'scss',
		});
		expect(style.errors).toEqual([]);
	});

	test('親モーダル内で中央配置され、親の余白を越えない', async () => {
		const source = await readFile(componentPath, 'utf8');
		const parsed = parse(source, { filename: componentPath });
		const style = await compileStyleAsync({
			source: parsed.descriptor.styles[0]!.content,
			filename: componentPath,
			id: 'mk-login-bonus-dialog',
			preprocessLang: 'scss',
		});
		const rootRule = style.code.match(/\.root\s*\{(?<declarations>[^}]*)\}/u)?.groups?.declarations;

		expect(rootRule).toBeDefined();
		expect(layoutViolations(rootRule!)).toEqual([]);

		// 陽性対照: 中央寄せを外したCSSは検出器が必ず失敗として扱う。
		const withoutCentering = rootRule!.replace(/margin:\s*auto;/u, 'margin: 0;');
		expect(layoutViolations(withoutCentering)).toContain('親モーダル内で中央配置されない');
	});
});
