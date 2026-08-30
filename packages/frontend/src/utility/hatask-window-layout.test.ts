/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

function frontendSource(path: string): string {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Hatask deck window layout contract', () => {
	test('Hataskだけ作業向けの初期寸法を使い、呼び出し側の明示寸法は上書きしない', () => {
		const osSource = frontendSource('src/os.ts');
		const windowSource = frontendSource('src/components/MkPageWindow.vue');
		expect(osSource).toContain('? { width: 760, height: 720 }');
		expect(osSource).toContain('initialWidth: options?.initialWidth ?? initialSize.width');
		expect(osSource).toContain('initialHeight: options?.initialHeight ?? initialSize.height');
		expect(windowSource).toContain(':initialWidth="initialWidth ?? 500"');
		expect(windowSource).toContain(':initialHeight="initialHeight ?? 500"');
	});

	test('小窓では標準ページ見出しを重ねず、Hatask自身の幅で一列化する', () => {
		const source = frontendSource('src/pages/hatask.vue');
		expect(source).toContain('<PageWithHeader :hideHeader="inPageWindow">');
		expect(source).toContain('container-name:hatask-root');
		expect(source).toMatch(/@container hatask-root \(max-width:900px\)\{[\s\S]*?\.htk-panels\{grid-template-columns:minmax\(0,1fr\)\}/u);
		expect(source).toMatch(/@container hatask-root \(max-width:640px\)\{[\s\S]*?\.htk-nav\.htk-nav-top\{overflow-x:auto/u);
	});

	test('クイック入力の選択パネルを枠内へ収め、開閉時に縦方向へ二重移動させない', () => {
		const pageSource = frontendSource('src/pages/hatask.vue');
		const captureSource = frontendSource('src/components/hatask/HataskQuickCapture.vue');
		expect(pageSource).toMatch(/\.htk-capture-detail\{box-sizing:border-box;width:min\(100%,760px\);min-width:0;margin:0 auto 14px;/u);
		expect(pageSource).toContain(':deep(.htk-capture-detail-enter-active),:deep(.htk-capture-detail-leave-active){transition:opacity .16s ease}');
		expect(pageSource).toContain(':deep(.htk-capture-detail-enter-from),:deep(.htk-capture-detail-leave-to){opacity:0}');
		expect(pageSource).not.toContain('transform:translateY(-8px) scale(.985)');
		expect(captureSource).toContain('transition: opacity .16s ease;');
		expect(captureSource).not.toContain('transform: translateY(-5px) scale(.985);');
	});

	test('カレンダーの詳細予定カードを隣のカレンダー高へ引き伸ばさない', () => {
		const source = frontendSource('src/pages/hatask.vue');
		expect(source).toContain('class="htk-tabpage htk-calendar-page"');
		expect(source).toContain('.htk-calendar-page{align-items:start}');
	});

	test('ハタキュのお庭でも並び替えと花カードの間隔を保つ', () => {
		const source = frontendSource('src/pages/hatask.vue');
		expect(source).toMatch(/\.htk-root\[data-theme="hatakyu"\] \.htk-gal-sort\{margin-bottom:12px\}/u);
	});
});
