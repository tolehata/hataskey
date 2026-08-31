/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { resolve } from 'node:path';
import { compileScript, compileStyleAsync, parse } from '@vue/compiler-sfc';
import { describe, expect, test } from 'vitest';
import whatsNewSource from './MkHataWhatsNew.vue?raw';
import uiSetupSource from './MkUISetup.vue?raw';

describe('Hata update presentation', () => {
	const previews = ['hataskPlanner', 'hataskGarden', 'externalBearBear', 'gameFarewell', 'welcomeRenewal', 'serverChoice', 'dailyPolish'];
	const previewMarkup = whatsNewSource.slice(whatsNewSource.indexOf(':class="$style.preview"'), whatsNewSource.indexOf(':class="$style.itemBody"'));
	const newPreviewStyles = whatsNewSource.slice(whatsNewSource.indexOf('/* ===== Seven finite, viewport-triggered previews ===== */'));

	test('更新内容を7種類の専用プレビューに置き換え、PCでは3列にする', () => {
		expect(whatsNewSource).toContain(':data-preview="item.preview"');
		expect(whatsNewSource).toContain('@container (min-width: 940px)');
		expect(whatsNewSource).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
		expect([...previewMarkup.matchAll(/item\.preview === '([^']+)'/gu)].map(match => match[1])).toEqual(previews);
		expect(previewMarkup).not.toContain('<button');
		expect(previewMarkup).toContain('aria-hidden="true"');
		for (const mock of ['plannerMock', 'gardenMock', 'bearMock', 'farewellMock', 'welcomeMock', 'serverChoiceMock', 'polishMock']) {
			expect(previewMarkup).toContain(`$style.${mock}`);
		}
	});

	// Source contracts detect missing CSS, not actual browser layout or animation rendering.
	function moduleClassNames(source: string): Set<string> {
		const start = source.indexOf('<style lang="scss" module>');
		const block = start < 0 ? source.slice(source.indexOf('<style module>')) : source.slice(start);
		return new Set([...block.matchAll(/^\s*\.([A-Za-z_][\w-]*)/gmu)].map(match => match[1]));
	}

	function usedModuleClassNames(source: string): Set<string> {
		return new Set([...source.matchAll(/\$style\.([A-Za-z_][\w$]*)/gu)].map(match => match[1]));
	}

	function missingModuleClasses(source: string): string[] {
		const defined = moduleClassNames(source);
		return [...usedModuleClassNames(source)].filter(name => !defined.has(name)).sort();
	}

	test('実SFC・テンプレート・SCSSをコンパイルし、生成CSSモジュールへ全参照を結線する', async () => {
		const filename = resolve(process.cwd(), 'src/components/MkHataWhatsNew.vue');
		const parsed = parse(whatsNewSource, { filename });
		expect(parsed.errors).toEqual([]);
		expect(() => compileScript(parsed.descriptor, { id: 'mk-hata-whats-new', inlineTemplate: true })).not.toThrow();
		const style = await compileStyleAsync({
			source: parsed.descriptor.styles[0]!.content,
			filename,
			id: 'mk-hata-whats-new',
			preprocessLang: 'scss',
			modules: true,
		});
		expect(style.errors).toEqual([]);
		expect(style.modules?.preview).toBeTruthy();
		expect(style.modules?.gardenCard).toBeTruthy();
		const missingCompiledClasses = (template: string) => [...usedModuleClassNames(template)].filter(name => !style.modules?.[name]).sort();
		const template = parsed.descriptor.template!.content;
		expect(missingCompiledClasses(`${template}\n<div :class="$style.zzMissingCompiledClass"></div>`)).toEqual(['zzMissingCompiledClass']);
		expect(missingCompiledClasses(template)).toEqual([]);
	});

	test('テンプレートが参照するCSSモジュールのクラスは、すべて定義されている', () => {
		expect(moduleClassNames(whatsNewSource).has('gardenCard')).toBe(true);
		expect(missingModuleClasses(`${whatsNewSource}\n<div :class="$style.zzNoSuchClass"></div>`)).toEqual(['zzNoSuchClass']);
		expect(missingModuleClasses(whatsNewSource)).toEqual([]);
		expect(whatsNewSource).toContain(':data-closing="closing"');
		expect(whatsNewSource).not.toContain('$style[');
	});

	test('旧19項目の表示・専用CSS・UI強制切替を残さない', () => {
		const oldPreviews = ['branding', 'hatadyRecord', 'hatadyVisibility', 'hatacordingFix', 'utageBadge', 'muteReaction', 'cardMaker', 'hatasabaHome', 'sideStudioFix', 'mobileFix', 'hatalyze', 'hatakyuTheme', 'hatadyExport', 'foldable', 'uiMotion', 'langFix', 'externalDdoskey', 'fontUpload', 'settingsRenewal'];
		const oldMocks = ['brandingMock', 'recordMock', 'visibilityMock', 'cordFixMock', 'badgeMock', 'muteFixMock', 'cardMock', 'homeMock', 'studioMock', 'mobileMock', 'hatalyzeMock', 'hatakyuMock', 'exportMock', 'foldMock', 'popupMock', 'langMock', 'ddoskeyMock', 'fontUploadMock', 'settingsMock'];
		const detectsOldPreview = (source: string) => oldPreviews.some(name => source.includes(`item.preview === '${name}'`)) || oldMocks.some(name => source.includes(`.${name}`));
		expect(detectsOldPreview('<div v-if="item.preview === \'branding\'">')).toBe(true);
		expect(detectsOldPreview('.ddoskeyMock { display: grid; }')).toBe(true);
		expect(detectsOldPreview(whatsNewSource)).toBe(false);
		expect(whatsNewSource).not.toContain('activateUi');
		expect(whatsNewSource).not.toContain('setHatacordingUiEnabled');
		expect(whatsNewSource).not.toContain('ensureSignin');
		expect(whatsNewSource).toContain('if (item.to == null) return;');
		expect(whatsNewSource).toContain('mainRouter.push(item.to);');
	});

	test('見えているプレビューだけ一度開始し、完了後は再開始しない', () => {
		expect(whatsNewSource).toContain('new IntersectionObserver');
		expect(whatsNewSource).toContain('root: releaseRoot.value');
		expect(whatsNewSource).toContain('entry.isIntersecting && entry.intersectionRatio >= 0.6');
		expect(whatsNewSource).toContain("(previewStates.value[item.preview] ?? 'ready') === 'ready'");
		expect(whatsNewSource).toContain("previewStates.value[item.preview] = 'running'");
		expect(whatsNewSource).toContain("if (event.target === event.currentTarget) previewStates.value[preview] = 'complete'");
		expect(whatsNewSource).toContain('previewObserver?.disconnect()');
		const repeatedMotion = /\binfinite\b|\bsetInterval\s*\(/u;
		expect(repeatedMotion.test('animation: test 1s infinite')).toBe(true);
		expect(repeatedMotion.test(whatsNewSource)).toBe(false);
	});

	test('画面外・非表示タブ・操作中は進行を停止し、停止設定は完成形にする', () => {
		expect(whatsNewSource).toContain('prefer.r.animation.value && !reducedMotion.value');
		expect(whatsNewSource).toContain("if (!motionAllowed.value) completePreviews();");
		expect(whatsNewSource).toContain("window.document.addEventListener('visibilitychange', syncDocumentVisibility)");
		expect(whatsNewSource).toContain("window.document.removeEventListener('visibilitychange', syncDocumentVisibility)");
		expect(whatsNewSource).toContain('pageVisible.value = !window.document.hidden');
		for (const selector of ['.preview[data-preview-visible="false"]', '.root[data-page-visible="false"] .preview', '.item:focus-within .preview']) expect(newPreviewStyles).toContain(selector);
		expect(newPreviewStyles).toContain('animation-play-state: paused !important');
		expect(newPreviewStyles).toContain('.root[data-motion="static"] * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }');
		expect(newPreviewStyles).toContain('@media (prefers-reduced-motion: reduce)');
		expect(newPreviewStyles).toContain('.root, .root * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }');
	});

	test('本文と項目タイトルを出現演出で隠さず、見本だけを別々の意味で動かす', () => {
		expect(whatsNewSource).toContain('{{ item.title }}');
		expect(whatsNewSource).toContain('{{ item.text }}');
		for (const name of ['item', 'itemBody', 'itemTitle', 'itemText']) {
			const style = whatsNewSource.match(new RegExp(`\\.${name} \\{([^}]+)\\}`, 'u'))?.[1];
			expect(style, name).toBeDefined();
			expect(style, name).not.toMatch(/animation:|opacity:\s*0(?:[;\s])|visibility:\s*hidden/u);
		}
		for (const animation of ['hwnPlannerCalendar', 'hwnGardenBloom', 'hwnBearJoin', 'hwnFarewellClose', 'hwnWelcomeLogo', 'hwnServerFan', 'hwnPolishAlign']) {
			expect(newPreviewStyles).toContain(`@keyframes ${animation}`);
			expect(newPreviewStyles).toContain(`animation: ${animation} `);
		}
	});

	test('花は中央の専用枠へ収め、ゲーム素材や旧ロゴ図形を使わない', () => {
		expect(previewMarkup).toContain(':data-flower="n"');
		expect(newPreviewStyles).toContain('.gardenCard > i { display: grid; place-items: center; width: 32px; height: 36px;');
		expect(previewMarkup).toContain('$style.farewellBook');
		expect(previewMarkup).toContain('$style.farewellBookmark');
		expect(previewMarkup).toContain('xiapopisland.top');
		expect(previewMarkup.match(/>Hataskey</gu)).toHaveLength(2);
		expect(whatsNewSource).not.toMatch(/(?:from|import)\s*\(?['"][^'"]*hanaawase/u);
		expect(previewMarkup).not.toMatch(/○[×✕△□]|ti-shapes/u);
		expect(newPreviewStyles).not.toMatch(/#[\da-f]{3,8}\b|\brgba?\(/iu);
	});

	test('スマホではスワイプ・左右ボタン・現在位置ドットで一件ずつ確認できる', () => {
		expect(whatsNewSource).toContain('@scroll.passive="syncCarouselPosition"');
		expect(whatsNewSource).toContain('@click="moveCarousel(-1)"');
		expect(whatsNewSource).toContain('@click="moveCarousel(1)"');
		expect(whatsNewSource).toContain(':aria-current="carouselIndex === i ? \'true\' : undefined"');
		expect(whatsNewSource).toContain('scroll-snap-type: x mandatory');
		expect(whatsNewSource).toContain('flex: 0 0 100%');
		expect(whatsNewSource).toContain('(carouselTarget.value ?? carouselIndex.value) + direction');
		expect(whatsNewSource).toContain('@pointerdown="carouselTarget = null"');
		expect(whatsNewSource).toContain('@wheel.passive="carouselTarget = null"');
	});

	test('モバイルの矢印とdotの押下領域は固定し、dot列を下段へ分ける', () => {
		expect(whatsNewSource).toContain('grid-template-columns: 44px minmax(0, 1fr) 44px');
		expect(whatsNewSource).toMatch(/\.carouselControls > button \{[^}]*width: 44px;[^}]*height: 44px;/u);
		expect(whatsNewSource).toMatch(/\.carouselDots button \{[^}]*width: 24px;[^}]*height: 24px;/u);
		expect(whatsNewSource).toContain('.carouselDots { grid-column: 1 / -1; grid-row: 2;');
		expect(whatsNewSource).toContain('button::before { content: \'\'; width: 6px; height: 6px;');
		expect(whatsNewSource).toContain('button[aria-current="true"]::before { transform: scale(1.5);');
		expect(whatsNewSource).not.toMatch(/button\[aria-current="true"\]\s*\{[^}]*width:/u);
		expect(whatsNewSource).toContain('button:focus-visible { outline: 2px solid var(--MI_THEME-accent);');
		expect(newPreviewStyles).toContain('.root[data-motion="static"] *::before,');
		expect(newPreviewStyles).toContain('.root *::before, .root *::after { animation: none !important; transition: none !important; }');
	});

	test('装飾の文字は固有名・ドメインだけとし、説明は外の翻訳済み本文に置く', () => {
		expect(previewMarkup).not.toMatch(/\{\{\s*copy\./);
		expect(previewMarkup).not.toMatch(/\{\{\s*copyx\./);
		expect(previewMarkup).not.toMatch(/>@[a-z0-9_]/iu);
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
		expect(whatsNewSource).toContain('@closed="emit(\'closed\')"');
		expect(whatsNewSource).not.toContain('miLocalStorage.setItem');
	});

	test('わかったを押すと更新内容の窓だけを下へ滑らかに退場させる', () => {
		expect(whatsNewSource).toContain('@click="dismiss"');
		expect(whatsNewSource).toContain('animation: hata-whats-new-slide-down .26s');
		expect(whatsNewSource).toContain('transform: translateY(56px)');
		expect(whatsNewSource).toContain('motionAllowed.value ? 260 : 0');
	});
});
