/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 旗鯖fork: リンクとボタンを同じクラスで描く箇所で、ボタン既定の装飾が
 * 残っていないことを見張る。
 *
 * ⚠️<button> は指定しないと枠・背景・独自の字面が付く。テーマによっては
 *   濃い枠として出て「ボタンや表示枠に黒枠が出る」ように見える。
 *   ⚠️左ペインはポップアップを開く項目だけ <button>、それ以外は MkA(<a>) で
 *   描くため、同じクラスがどちらにも当たる。クラス側で必ず打ち消しておく。
 *
 * ⚠️対象はこの「リンクとボタンを兼ねるクラス」に絞る。
 *   画面全体を機械的に走査する検査も書いてみたが、親側の子孫指定
 *   (`.categoryLinks button { ... }`) を見落として偽陽性を出し、
 *   それを見るようにすると今度は何でも通ってしまい陽性対照が発火しなかった。
 *   ⚠️当てにならない検査を残すより、守れる範囲を確実に見張る。
 */

import { describe, expect, test } from 'vitest';
import shellSource from './index.vue?raw';

/**
 * そのクラス**単独**の宣言ブロックを、括弧を数えて取り出す。
 * ⚠️`.foo .navLink { ... }` のような子孫指定は、その要素の基本形ではないので選ばない。
 *   ここを間違えると、修飾用の短い宣言を基本形と誤読して偽陰性になる。
 */
function declarationFor(source: string, name: string): string {
	const pattern = new RegExp('(?:^|\\n)([^\\n{}]*)\\{', 'gu');
	for (const match of source.matchAll(pattern)) {
		const selector = match[1];
		if (!selector.split(',').some(part => part.trim() === '.' + name)) continue;
		let depth = 1;
		let cursor = match.index + match[0].length;
		while (cursor < source.length && depth > 0) {
			if (source[cursor] === '{') depth++;
			else if (source[cursor] === '}') depth--;
			cursor++;
		}
		return source.slice(match.index + match[0].length, cursor - 1);
	}
	return '';
}

const hasBorder = (declaration: string) => /(?:^|[;{\s])border\s*:/u.test(declaration);
const hasBackground = (declaration: string) => /(?:^|[;{\s])background\s*:/u.test(declaration);
const hasFontInherit = (declaration: string) => /(?:^|[;{\s])font\s*:\s*inherit/u.test(declaration);
const hasAppearanceNone = (declaration: string) => /appearance\s*:\s*none/u.test(declaration);

/** リンクとボタンの両方で描かれるクラス。 */
const DUAL_ROLE_CLASSES = ['navLink', 'quickItem'] as const;

describe('settings redesign button reset', () => {
	test('検出器が生きている', () => {
		// ⚠️陽性対照その1: 対象クラスの宣言を実際に読めていること。
		for (const name of DUAL_ROLE_CLASSES) {
			expect(declarationFor(shellSource, name).length).toBeGreaterThan(80);
		}
		// ⚠️陽性対照その2: 欠けた宣言を渡せば、ちゃんと違反と判定すること。
		expect(hasBorder('color: red;')).toBe(false);
		expect(hasBackground('color: red;')).toBe(false);
		expect(hasFontInherit('font-size: 1rem;')).toBe(false);
		expect(hasAppearanceNone('color: red;')).toBe(false);
		// ⚠️存在しないクラスなら空になること（読めていないのを見逃さない）。
		expect(declarationFor(shellSource, 'zzThisClassDoesNotExist')).toBe('');
	});

	test('リンクとボタンを兼ねるクラスは、既定の枠・背景・字面を打ち消している', () => {
		for (const name of DUAL_ROLE_CLASSES) {
			const declaration = declarationFor(shellSource, name);
			expect(hasAppearanceNone(declaration), `${name}: appearance`).toBe(true);
			expect(hasBorder(declaration), `${name}: border`).toBe(true);
			expect(hasBackground(declaration), `${name}: background`).toBe(true);
			expect(hasFontInherit(declaration), `${name}: font`).toBe(true);
			expect(/cursor\s*:\s*pointer/u.test(declaration), `${name}: cursor`).toBe(true);
			expect(/text-align\s*:\s*start/u.test(declaration), `${name}: text-align`).toBe(true);
		}
	});

	test('丸ボタンも字面を引き継がない', () => {
		// ⚠️border: 0 で枠は消えていたが font の指定が無く、既定のフォントのままだった。
		expect(hasFontInherit(declarationFor(shellSource, 'compactBack'))).toBe(true);
	});
});
