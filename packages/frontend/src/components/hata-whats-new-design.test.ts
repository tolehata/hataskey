/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import whatsNewSource from './MkHataWhatsNew.vue?raw';
import uiSetupSource from './MkUISetup.vue?raw';

describe('Hata update presentation', () => {
	test('更新内容を3列対応の実画面風プレビューで表示する', () => {
		expect(whatsNewSource).toContain(':data-preview="item.preview"');
		expect(whatsNewSource).toContain('@container (min-width: 940px)');
		expect(whatsNewSource).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
		expect(whatsNewSource).not.toContain('$style.previewChrome');
		const previewMarkup = whatsNewSource.slice(whatsNewSource.indexOf(':class="$style.preview"'), whatsNewSource.indexOf(':class="$style.itemBody"'));
		expect(previewMarkup).not.toContain('<button');
		for (const actualScreenCopy of ['学習の記録', 'GARDEN', 'スタジオ設定', '季節の花を合わせて、一年をめぐる。', '絵文字申請', 'ベータ機能を試す', 'プライベートチャンネル', '招待拒否', '宴の成功', '二要素認証']) {
			expect(whatsNewSource).toContain(actualScreenCopy);
		}
		expect(whatsNewSource).not.toContain('ti ti-sparkles"></i></div>');
	});

	test('スマホではスワイプ・左右ボタン・現在位置ドットで一件ずつ確認できる', () => {
		expect(whatsNewSource).toContain('@scroll.passive="syncCarouselPosition"');
		expect(whatsNewSource).toContain('@click="moveCarousel(-1)"');
		expect(whatsNewSource).toContain('@click="moveCarousel(1)"');
		expect(whatsNewSource).toContain(':aria-current="carouselIndex === i ? \'true\' : undefined"');
		expect(whatsNewSource).toContain('scroll-snap-type: x mandatory');
		expect(whatsNewSource).toContain('flex: 0 0 100%');
	});

	test('実在利用者を思わせない例示名と各モック固有の表示補正を使う', () => {
		expect(whatsNewSource).toContain('例えば、アザラシ');
		expect(whatsNewSource).toContain('@example_seal');
		expect(whatsNewSource).not.toContain('<b>旗茶</b>');
		expect(whatsNewSource).toContain('font-family: \'HataWhatsNewRighteous\'');
		expect(whatsNewSource).toContain('grid-template-columns: repeat(7, minmax(0, 1fr))');
		expect(whatsNewSource).toContain('.muteBody > span { font-size: 10px; line-height: 1.5; }');
		expect(whatsNewSource).toContain('.muteBody div { display: flex; gap: 6px; margin-top: 3px; }');
	});

	test('MkUISetupの左上に装飾用の星アイコンを置かない', () => {
		expect(uiSetupSource).not.toContain('$style.headerChip');
		expect(uiSetupSource).not.toContain('.headerChip');
	});

	test('PC幅ではUI設定と更新内容のモーダルを中央に置く', () => {
		expect(uiSetupSource).toContain('max-width: 720px;\n\tmargin-inline: auto;');
		expect(whatsNewSource).toContain('max-width: 1180px;\n\tmargin-inline: auto;');
	});

	test('わかったを押すと更新内容の窓だけを下へ滑らかに退場させる', () => {
		expect(whatsNewSource).toContain('@click="dismiss"');
		expect(whatsNewSource).toContain('animation: hata-whats-new-slide-down .26s');
		expect(whatsNewSource).toContain('transform: translateY(56px)');
	});
});
