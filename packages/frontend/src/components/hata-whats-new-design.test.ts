/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
/* eslint-disable vue/one-component-per-file -- Fixtures replace only the surrounding modal, button and branding illustration. */

import { resolve } from 'node:path';
import { compileScript, compileStyleAsync, parse } from '@vue/compiler-sfc';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import MkHataWhatsNew from './MkHataWhatsNew.vue';
import whatsNewSource from './MkHataWhatsNew.vue?raw';
import uiSetupSource from './MkUISetup.vue?raw';
import type { App } from 'vue';
import type { Locale } from '../../../../locales/index.js';
import { getHataWhatsNewDisplayVersion, HATA_WHATS_NEW } from '@/utility/hata-whats-new.js';

vi.mock('@/i18n.js', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const yaml = await import('js-yaml');
	const { I18n } = await import('@@/js/i18n.js');
	const locale = yaml.load(fs.readFileSync(path.resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8'));
	return { i18n: new I18n<Locale>(locale as Locale) };
});
vi.mock('@/preferences.js', () => ({ prefer: { r: { animation: { value: true } } } }));
vi.mock('@/router.js', () => ({ mainRouter: { push: vi.fn() } }));
vi.mock('@/utility/hatakyu-assets.js', () => ({ useHatakyuBranding: () => false }));
vi.mock('@/components/MkModal.vue', async () => {
	const { defineComponent: component, h: render } = await import('vue');
	return { default: component({
		setup: (_props, { slots, expose }) => {
			expose({ ['close']: vi.fn() });
			return () => render('div', slots.default?.());
		},
	}) };
});
vi.mock('@/components/MkButton.vue', async () => {
	const { defineComponent: component, h: render } = await import('vue');
	return { default: component({ setup: (_props, { slots }) => () => render('button', { type: 'button' }, slots.default?.()) }) };
});
vi.mock('@/components/MkHatakyuIllustration.vue', async () => {
	const { defineComponent: component, h: render } = await import('vue');
	return { default: component({ setup: () => () => render('span') }) };
});

describe('Hata update presentation', () => {
	const previews = ['utageAchievements', 'externalSidebar', 'externalTimeline', 'timelineCollapse', 'hataskPlanner', 'hataskGarden', 'externalAccount', 'gameFarewell', 'welcomeRenewal', 'serverChoice', 'dailyPolish'];
	const previewMarkup = whatsNewSource.slice(whatsNewSource.indexOf(':class="$style.preview"'), whatsNewSource.indexOf(':class="$style.itemBody"'));
	const newPreviewStyles = whatsNewSource.slice(whatsNewSource.indexOf('/* ===== Eleven finite, viewport-triggered previews ===== */'));

	test('更新内容を11種類の専用プレビューに揃え、PCでは3列にする', () => {
		expect(whatsNewSource).toContain(':data-preview="item.preview"');
		expect(whatsNewSource).toContain('@container (min-width: 940px)');
		expect(whatsNewSource).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
		expect([...previewMarkup.matchAll(/item\.preview === '([^']+)'/gu)].map(match => match[1])).toEqual(previews);
		expect(previewMarkup).not.toContain('<button');
		expect(previewMarkup).toContain('aria-hidden="true"');
		for (const mock of ['utageMock', 'externalSidebarMock', 'externalTimelineMock', 'collapseMock', 'plannerMock', 'gardenMock', 'bearMock', 'farewellMock', 'welcomeMock', 'serverChoiceMock', 'polishMock']) {
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
		expect(style.modules?.utageMock).toBeTruthy();
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
		expect(whatsNewSource).toContain('(previewStates.value[key] ?? \'ready\') === \'ready\'');
		expect(whatsNewSource).toContain('previewStates.value[key] = \'running\'');
		expect(whatsNewSource).toContain('if (event.target === event.currentTarget) previewStates.value[key] = \'complete\'');
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
		for (const animation of ['hwnUtageMedal', 'hwnExternalSidebar', 'hwnExternalGhost', 'hwnCollapsePreview', 'hwnPlannerCalendar', 'hwnGardenBloom', 'hwnBearJoin', 'hwnFarewellClose', 'hwnWelcomeLogo', 'hwnServerFan', 'hwnPolishAlign']) {
			expect(newPreviewStyles).toContain(`@keyframes ${animation}`);
			expect(newPreviewStyles).toContain(`animation: ${animation} `);
		}
	});

	test('花は中央の専用枠へ収め、ゲーム素材や旧ロゴ図形を使わない', () => {
		expect(previewMarkup).toContain(':data-flower="n"');
		expect(newPreviewStyles).toContain('.gardenCard > i { display: grid; place-items: center; width: 32px; height: 36px;');
		expect(previewMarkup).toContain('$style.farewellBook');
		expect(previewMarkup).toContain('$style.farewellBookmark');
		expect(previewMarkup).toContain('{{ item.previewLabel }}');
		expect(previewMarkup).not.toContain('xiapopisland.top');
		expect(previewMarkup).not.toContain('mk-juice.dev');
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

	test('項目一覧の前に4世代の切替を置き、PC4列・狭い画面2列で省略せず表示する', () => {
		const scopeIndex = whatsNewSource.indexOf(':class="$style.releaseScope"');
		const itemsIndex = whatsNewSource.indexOf('ref="itemsViewport"');
		expect(scopeIndex).toBeGreaterThan(0);
		expect(scopeIndex).toBeLessThan(itemsIndex);
		expect(whatsNewSource).toContain('role="group" :aria-label="copy.releaseScope"');
		expect(whatsNewSource).toContain(':aria-pressed="activeRelease.id === release.id"');
		expect(whatsNewSource).toContain('{{ releaseLabels[release.id] }}');
		expect(whatsNewSource).toContain('latestRelease: copy.latestRelease');
		expect(whatsNewSource).toContain('previousRelease: copy.previousRelease');
		expect(whatsNewSource).toContain('const activeReleaseId = ref<HataWhatsNewReleaseId>(\'latestRelease\')');
		expect(whatsNewSource).toContain('v-for="item in activeRelease.items"');
		const hasFourColumns = (source: string) => /\.releaseScope \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/u.test(source);
		expect(hasFourColumns(whatsNewSource.replace('repeat(4, minmax(0, 1fr))', 'repeat(3, minmax(0, 1fr))'))).toBe(false);
		expect(hasFourColumns(whatsNewSource)).toBe(true);
		expect(whatsNewSource).toMatch(/@container \(max-width: 700px\) \{\s*\.releaseScope \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/u);
		expect(whatsNewSource).toMatch(/\.releaseScope button \{[^}]*min-height: 44px;/u);
		expect(whatsNewSource).toContain('.releaseScope button:focus-visible { outline: 2px solid var(--MI_THEME-accent);');
		expect(whatsNewSource).toMatch(/\.releaseScope span \{[^}]*max-width: 100%;[^}]*overflow-wrap: anywhere;[^}]*white-space: normal;/u);
		expect(whatsNewSource).toMatch(/\.releaseScope small \{[^}]*max-width: 100%;[^}]*overflow-wrap: anywhere;[^}]*text-align: center;/u);
	});

	test('リリース切替時にカルーセルと見本監視を先頭から結び直す', () => {
		const selectIndex = whatsNewSource.indexOf('async function selectRelease(releaseId: HataWhatsNewReleaseId)');
		const settleIndex = whatsNewSource.indexOf('if (previewStates.value[key] === \'running\') previewStates.value[key] = \'complete\'', selectIndex);
		const activateIndex = whatsNewSource.indexOf('activeReleaseId.value = releaseId', selectIndex);
		expect(selectIndex).toBeGreaterThan(0);
		expect(settleIndex).toBeGreaterThan(selectIndex);
		expect(settleIndex).toBeLessThan(activateIndex);
		expect(whatsNewSource).toContain('carouselIndex.value = 0');
		expect(whatsNewSource).toContain('carouselTarget.value = null');
		expect(whatsNewSource).toContain('itemsViewport.value?.scrollTo({ left: 0, behavior: \'auto\' })');
		expect(whatsNewSource).toContain('observeActivePreviews()');
		expect(whatsNewSource).toContain(':data-preview-key="previewKey(activeRelease.id, item.preview)"');
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

describe('更新内容の4リリース切替（実SFC）', () => {
	const mounted: Array<{ app: App<Element>; container: HTMLDivElement }> = [];
	const observers: Array<{ callback: IntersectionObserverCallback; targets: Element[]; disconnect: ReturnType<typeof vi.fn> }> = [];
	let reducedMotion = false;

	beforeEach(() => {
		reducedMotion = false;
		observers.splice(0);
		vi.spyOn(window.document, 'hidden', 'get').mockReturnValue(false);
		vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
			media: query,
			get matches() { return reducedMotion; },
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(() => true),
		}));
		vi.stubGlobal('IntersectionObserver', class {
			constructor(callback: IntersectionObserverCallback) { observers.push({ callback, targets: this.targets, disconnect: this.disconnect }); }
			targets: Element[] = [];
			observe = (target: Element): void => { this.targets.push(target); };
			disconnect = vi.fn();
		});
	});

	afterEach(() => {
		for (const { app, container } of mounted.splice(0)) { app.unmount(); container.remove(); }
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	async function mountGuide() {
		const container = window.document.createElement('div');
		window.document.body.append(container);
		const app = createApp(defineComponent({ setup: () => () => h(MkHataWhatsNew) }));
		app.mount(container);
		mounted.push({ app, container });
		await nextTick();
		const buttons = [...container.querySelectorAll<HTMLButtonElement>('[role="group"] > button')];
		const viewport = container.querySelector('[data-preview]')?.parentElement?.parentElement;
		if (!viewport) throw new Error('Release item viewport did not mount');
		const scrollTo = vi.fn();
		Object.defineProperty(viewport, 'scrollTo', { configurable: true, value: scrollTo });
		return { container, buttons, viewport, scrollTo };
	}

	async function select(buttons: HTMLButtonElement[], index: number) {
		const button = buttons.at(index);
		if (!button) throw new Error(`Missing release button ${index}`);
		button.click();
		await nextTick();
		await nextTick();
	}

	function showActivePreviews() {
		const observer = observers.at(-1);
		if (!observer) throw new Error('Release previews are not observed');
		observer.callback(observer.targets.map(target => ({ target, isIntersecting: true, intersectionRatio: 1 }) as IntersectionObserverEntry), {} as IntersectionObserver);
	}

	test('4タブの版番号・選択状態と各リリースの全項目を切り替えられる', async () => {
		const { container, buttons, scrollTo } = await mountGuide();
		expect(buttons).toHaveLength(4);
		expect(buttons.map(button => button.querySelector('small')?.textContent)).toEqual(['hata-12.5.3', 'hata-12.5.2', 'hata-12.5.1', 'hata-12.5']);
		expect(buttons.map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false']);
		for (const button of buttons) expect(button.querySelector('span')?.textContent.trim()).toBeTruthy();
		for (const index of [2, 1, 3, 0]) {
			await select(buttons, index);
			const release = HATA_WHATS_NEW.releases[index];
			expect(buttons.filter(button => button.getAttribute('aria-pressed') === 'true')).toEqual([buttons[index]]);
			expect(buttons[index].textContent).toContain(getHataWhatsNewDisplayVersion(release.version));
			expect(container.textContent).toContain(release.headline);
			expect([...container.querySelectorAll<HTMLElement>('[data-preview]')].map(preview => preview.dataset.previewKey)).toEqual(release.items.map(item => `${release.id}:${item.preview}`));
			for (const item of release.items) {
				expect(container.textContent).toContain(item.title);
				expect(container.textContent).toContain(item.text);
			}
			expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });
		}
		// Selecting the already-open release must not restart the carousel or observer.
		const count = observers.length;
		scrollTo.mockClear();
		await select(buttons, 0);
		expect(scrollTo).not.toHaveBeenCalled();
		expect(observers).toHaveLength(count);
	});

	test('復元したリリースでもカルーセルを先頭へ戻し、同じプレビューを世代別に一度だけ動かす', async () => {
		const { container, buttons, viewport } = await mountGuide();
		for (const [index, item] of [...viewport.children].entries()) Object.defineProperty(item, 'offsetLeft', { configurable: true, value: index * 320 });
		const next = container.querySelector<HTMLButtonElement>('nav > button:last-child');
		if (!next) throw new Error('Carousel next button did not mount');
		next.click();
		await nextTick();
		expect(container.querySelector('nav > span')?.textContent).toBe('2 / 3');
		showActivePreviews();
		await nextTick();
		expect(container.querySelector<HTMLElement>('[data-preview-key="latestRelease:hataskPlanner"]')?.dataset.previewState).toBe('running');
		await select(buttons, 2);
		expect(container.querySelector('nav > span')?.textContent).toBe('1 / 4');
		expect(container.querySelector<HTMLElement>('[data-preview-key="previousRelease:hataskPlanner"]')?.dataset.previewState).toBe('ready');
		showActivePreviews();
		await nextTick();
		expect(container.querySelector<HTMLElement>('[data-preview-key="previousRelease:hataskPlanner"]')?.dataset.previewState).toBe('running');
		await select(buttons, 0);
		expect(container.querySelector<HTMLElement>('[data-preview-key="latestRelease:hataskPlanner"]')?.dataset.previewState).toBe('complete');
		await select(buttons, 2);
		showActivePreviews();
		await nextTick();
		expect(container.querySelector<HTMLElement>('[data-preview-key="previousRelease:hataskPlanner"]')?.dataset.previewState).toBe('complete');
	});

	test('動きを減らす設定では復元したリリースも最初から完成形で表示する', async () => {
		reducedMotion = true;
		const { container, buttons } = await mountGuide();
		await select(buttons, 2);
		showActivePreviews();
		await nextTick();
		expect(container.querySelector('[data-motion]')?.getAttribute('data-motion')).toBe('static');
		expect([...container.querySelectorAll<HTMLElement>('[data-preview]')].map(preview => preview.dataset.previewState)).toEqual(['complete', 'complete', 'complete', 'complete']);
	});
});
