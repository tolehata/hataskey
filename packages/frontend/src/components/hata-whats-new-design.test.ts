/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import whatsNewSource from './MkHataWhatsNew.vue?raw';
import uiSetupSource from './MkUISetup.vue?raw';

describe('Hata update presentation', () => {
	test('更新内容を3列対応のプレビュー付きで表示する', () => {
		expect(whatsNewSource).toContain(':data-preview="item.preview"');
		expect(whatsNewSource).toContain('@container (min-width: 940px)');
		expect(whatsNewSource).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
		expect(whatsNewSource).not.toContain('$style.previewChrome');
		const previewMarkup = whatsNewSource.slice(whatsNewSource.indexOf(':class="$style.preview"'), whatsNewSource.indexOf(':class="$style.itemBody"'));
		// ⚠️プレビューは飾りなので、押せる要素を入れない(読み上げ対象にもしない)。
		expect(previewMarkup).not.toContain('<button');
		expect(whatsNewSource).toContain('aria-hidden="true"');
		// 項目ごとに専用のモックがあること(使い回しで済ませない)。
		for (const mock of ['brandingMock', 'recordMock', 'visibilityMock', 'cordFixMock', 'badgeMock', 'muteFixMock', 'cardMock', 'homeMock', 'studioMock', 'mobileMock']) {
			expect(previewMarkup).toContain(`$style.${mock}`);
		}
	});

	// ⚠️`$style.foo` は、`<style module>` に `.foo` が無いと**空文字**になる。
	//   クラスが一つも付かないので、寸法も中央寄せも当たらず、中身が左上へ潰れて出る。
	//   ⚠️実際に mobileMock / mobilePhone / mobileNote がこれで崩れていた。
	//   ⚠️見た目の検査ではなく「定義の有無」で捕まえる。
	function moduleClassNames(source: string): Set<string> {
		const start = source.indexOf('<style lang="scss" module>');
		const block = start < 0 ? source.slice(source.indexOf('<style module>')) : source.slice(start);
		return new Set([...block.matchAll(/^\s*\.([A-Za-z_][\w-]*)/gmu)].map(match => match[1]));
	}
	function usedModuleClassNames(source: string): Set<string> {
		return new Set([...source.matchAll(/\$style\.([A-Za-z_][\w$]*)/gu)].map(match => match[1]));
	}

	test('テンプレートが参照するCSSモジュールのクラスは、すべて定義されている', () => {
		// ⚠️陽性対照。検出器が実際に読めていて、欠落を欠落と言えること。
		const defined = moduleClassNames(whatsNewSource);
		const used = usedModuleClassNames(whatsNewSource);
		expect(defined.size).toBeGreaterThan(60);
		expect(used.size).toBeGreaterThan(60);
		expect(defined.has('zzNoSuchClass')).toBe(false);

		const missing = [...used].filter(name => !defined.has(name)).sort();
		expect(missing).toEqual([]);
	});

	test('スマホではスワイプ・左右ボタン・現在位置ドットで一件ずつ確認できる', () => {
		expect(whatsNewSource).toContain('@scroll.passive="syncCarouselPosition"');
		expect(whatsNewSource).toContain('@click="moveCarousel(-1)"');
		expect(whatsNewSource).toContain('@click="moveCarousel(1)"');
		expect(whatsNewSource).toContain(':aria-current="carouselIndex === i ? \'true\' : undefined"');
		expect(whatsNewSource).toContain('scroll-snap-type: x mandatory');
		expect(whatsNewSource).toContain('flex: 0 0 100%');
	});

	test('プレビューに文言を持たせない(翻訳漏れで空欄にしない)', () => {
		const previewMarkup = whatsNewSource.slice(whatsNewSource.indexOf(':class="$style.preview"'), whatsNewSource.indexOf(':class="$style.itemBody"'));
		// ⚠️ここに copy.* を入れると、訳が無い言語で空欄のモックが出る。形と色だけで伝える方針。
		expect(previewMarkup).not.toMatch(/\{\{\s*copy\./);
		expect(previewMarkup).not.toMatch(/\{\{\s*copyx\./);
		// 実在利用者を思わせる例示名も置かない。
		expect(previewMarkup).not.toContain('@');
		expect(previewMarkup).not.toContain('旗茶');
	});

	test('MkUISetupの左上に装飾用の星アイコンを置かない', () => {
		expect(uiSetupSource).not.toContain('$style.headerChip');
		expect(uiSetupSource).not.toContain('.headerChip');
	});

	test('PC幅ではUI設定と更新内容のモーダルを中央に置く', () => {
		expect(uiSetupSource).toContain('max-width: 720px;\n\tmargin-inline: auto;');
		expect(whatsNewSource).toContain('max-width: 1180px;\n\tmargin-inline: auto;');
	});

	test('表示済み判定用の完全な版とは別に旗鯖の表示版を出す', () => {
		expect(whatsNewSource).toContain('{{ releaseVersion }}');
		expect(whatsNewSource).toContain('getHataWhatsNewDisplayVersion(whatsNew.version)');
		expect(whatsNewSource).not.toContain('{{ whatsNew.version }}');
	});

	test('わかったを押すと更新内容の窓だけを下へ滑らかに退場させる', () => {
		expect(whatsNewSource).toContain('@click="dismiss"');
		expect(whatsNewSource).toContain('animation: hata-whats-new-slide-down .26s');
		expect(whatsNewSource).toContain('transform: translateY(56px)');
	});
});
