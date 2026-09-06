/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileStyleAsync, parse } from '@vue/compiler-sfc';
import { createApp, defineComponent, h, nextTick, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import HataskAkatsukiApps from './HataskAkatsukiApps.vue';
import type { App } from 'vue';

type Props = {
	kind: 'hatask' | 'tools';
	animations: boolean;
	counts: { calendar: number; todo: number; meal: number; feedback: number };
	countsKnown?: boolean;
	canAccessHataFeed: boolean;
	canUseMascot: boolean;
};
type Mounted = { app: App<Element>; container: HTMLDivElement };
const mounted: Mounted[] = [];
const observers: { callback: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }[] = [];
type MotionListener = EventListenerOrEventListenerObject | NonNullable<MediaQueryList['onchange']>;
const motionListeners = new Set<MotionListener>();
const mediaQueries: MediaQueryList[] = [];
let reducedMotion = false;
let hasLayout = true;
let pageVisibility: DocumentVisibilityState = 'visible';

beforeEach(() => {
	vi.useFakeTimers();
	reducedMotion = false;
	hasLayout = true;
	pageVisibility = 'visible';
	motionListeners.clear();
	mediaQueries.splice(0);
	observers.splice(0);
	vi.spyOn(window.document, 'visibilityState', 'get').mockImplementation(() => pageVisibility);
	vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => (hasLayout ? [new DOMRect(0, 0, 600, 900)] : []) as unknown as DOMRectList);
	vi.spyOn(window, 'matchMedia').mockImplementation(query => {
		const listeners = new Set<MotionListener>();
		const mediaQuery: MediaQueryList = {
			media: query,
			get matches() { return reducedMotion; },
			onchange: null,
			addListener(callback): void {
				if (callback) mediaQuery.addEventListener('change', callback);
			},
			removeListener(callback): void {
				if (callback) mediaQuery.removeEventListener('change', callback);
			},
			addEventListener(type, callback): void {
				if (type !== 'change') return;
				listeners.add(callback);
				motionListeners.add(callback);
			},
			removeEventListener(type, callback): void {
				if (type !== 'change') return;
				listeners.delete(callback);
				motionListeners.delete(callback);
			},
			dispatchEvent(event): boolean {
				if (event.type !== 'change') return !event.defaultPrevented;
				const changeEvent = Object.assign(event, { media: query, matches: reducedMotion });
				for (const listener of listeners) {
					if (typeof listener === 'function') listener.call(mediaQuery, changeEvent);
					else listener.handleEvent(changeEvent);
				}
				mediaQuery.onchange?.call(mediaQuery, changeEvent);
				return !event.defaultPrevented;
			},
		};
		mediaQueries.push(mediaQuery);
		return mediaQuery;
	});
	vi.stubGlobal('IntersectionObserver', class {
		constructor(callback: IntersectionObserverCallback) { observers.push({ callback, disconnect: this.disconnect }); }
		observe = vi.fn();
		disconnect = vi.fn();
	});
});

afterEach(() => {
	for (const item of mounted.splice(0)) {
		item.app.unmount();
		item.container.remove();
	}
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function mountApps(options: Partial<Props> = {}) {
	const props = reactive<Props>({ kind: 'hatask', animations: true, counts: { calendar: 4, todo: 3, meal: 1, feedback: 2 }, canAccessHataFeed: true, canUseMascot: true, ...options });
	const open = vi.fn();
	const app = createApp(defineComponent({ setup: () => () => h(HataskAkatsukiApps, { ...props, onOpen: open }) }));
	const container = window.document.createElement('div');
	window.document.body.append(container);
	app.mount(container);
	mounted.push({ app, container });
	setIntersecting(true);
	return { app, container, props, open };
}

function setIntersecting(value: boolean): void {
	for (const observer of observers) observer.callback([{ isIntersecting: value } as IntersectionObserverEntry], {} as IntersectionObserver);
}

function setReducedMotion(value: boolean): void {
	reducedMotion = value;
	for (const mediaQuery of mediaQueries) mediaQuery.dispatchEvent(new window.Event('change'));
}

function activeSlide(container: HTMLElement): HTMLElement {
	const slide = container.querySelector<HTMLElement>('[data-feature-id][aria-hidden="false"]');
	if (!slide) throw new Error('active feature was not rendered');
	return slide;
}

function action(container: HTMLElement, name: string): HTMLButtonElement {
	const button = container.querySelector<HTMLButtonElement>(`[data-feature-controls] [data-carousel-action="${name}"]`);
	if (!button) throw new Error(`carousel control ${name} was not rendered`);
	return button;
}

function appIds(container: HTMLElement, layout: 'mobile' | 'desktop'): string[] {
	return [...container.querySelectorAll<HTMLElement>(`[data-app-layout="${layout}"] [data-app-id]`)].map(item => item.dataset.appId!);
}

async function tick(): Promise<void> { await vi.advanceTimersByTimeAsync(4200); await nextTick(); }

describe('HataskAkatsukiApps', () => {
	test.each(['hatask', 'tools'] as const)('%sのPC・モバイル見出しはApp名だけを表示し、分類の階層を保つ', kind => {
		const { container } = mountApps({ kind });
		const title = kind === 'hatask' ? 'Hatask App' : 'Hataskey App';
		const root = container.querySelector('section[data-kind]');
		expect(root?.getAttribute('data-kind')).toBe(kind);
		expect(root?.getAttribute('aria-label')).toBe(title);
		for (const layout of ['mobile', 'desktop'] as const) {
			const list = root?.querySelector(`[data-app-layout="${layout}"]`);
			if (!list) throw new Error('App list is missing');
			const heading = list.querySelector('h2');
			expect(list.parentElement).toBe(root);
			expect(heading?.parentElement).toBe(list);
			expect(heading?.textContent).toBe(title);
			expect(heading?.getAttribute('aria-hidden')).not.toBe('true');
			expect(list.querySelectorAll('h2')).toHaveLength(1);
			const categories = [...list.querySelectorAll('h3')];
			expect(categories).toHaveLength(layout === 'desktop' && kind === 'tools' ? 5 : 0);
			for (const category of categories) {
				expect(category.parentElement?.tagName).toBe('SECTION');
				expect(category.parentElement?.parentElement).toBe(list);
				expect(category.textContent.trim().length).toBeGreaterThan(0);
			}
		}
	});

	test('Hataskey Appの見出し線だけをPC・モバイルで外し、Hataskと分類の線を保つ', async () => {
		const filename = resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiApps.vue');
		const parsed = parse(readFileSync(filename, 'utf8'), { filename });
		expect(parsed.errors).toEqual([]);
		const style = parsed.descriptor.styles.find(item => item.module);
		if (!style) throw new Error('Apps CSS module was not found');
		const compiled = await compileStyleAsync({ source: style.content, filename, id: 'hatask-app-heading', modules: true });
		expect(compiled.errors).toEqual([]);
		const classes = compiled.modules;
		const css = compiled.rawResult?.root;
		if (!classes || !css) throw new Error('Apps CSS module did not produce selectors');
		const rules: { selector: string; value: string; container?: string }[] = [];
		css.walkRules(rule => {
			rule.walkDecls('border-bottom', declaration => {
				const parent = rule.parent;
				rules.push({ selector: rule.selector, value: declaration.value, container: parent?.type === 'atrule' && parent.name === 'container' ? parent.params : undefined });
			});
		});
		for (const [name, condition] of [['desktopTitle', undefined], ['mobileTitle', 'hatask-akatsuki (max-width: 599px)']] as const) {
			const base = rules.find(rule => rule.selector === `.${classes[name]}`);
			if (!base) throw new Error('Base heading divider rule is missing');
			expect(base.value).toBe('1px solid var(--rule2)');
			expect(base.container).toBe(condition);
			const titleRule = (rule: typeof rules[number]): boolean => rule.value === 'none' && rule.selector.endsWith(` .${classes[name]}`);
			const overrides = rules.filter(titleRule);
			expect(overrides).toHaveLength(1);
			const override = overrides[0];
			expect(override.container).toBe(condition);
			for (const kind of ['hatask', 'tools'] as const) {
				const fixture = window.document.createElement('section');
				fixture.className = classes.root;
				fixture.dataset.kind = kind;
				const heading = window.document.createElement('h2');
				heading.className = classes[name];
				fixture.append(heading);
				expect(heading.matches(base.selector)).toBe(true);
				expect(heading.matches(override.selector)).toBe(kind === 'tools');
				// Removing the kind restriction must be detected for Hatask as well.
				expect(heading.matches(`.${classes.root} .${classes[name]}`)).toBe(true);
			}
		}
		expect(rules.find(rule => rule.selector === `.${classes.category}`)?.value).toBe('1px solid var(--rule2)');
		expect(rules.filter(rule => rule.selector.includes(`.${classes.category}`))).toHaveLength(1);
	});

	test('Hatask AppとHataskey Appの全PC項目は同じ角丸ケースを使う', () => {
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiApps.vue'), 'utf8');
		const sharedCase = (css: string): string => css.match(/^\.desktopRow\s*\{([^}]*)\}/m)?.[1] ?? '';
		// ケースをHataskeyだけに限定した旧セレクターを検出できることも確認する。
		expect(sharedCase('.root[data-kind=\'tools\'] .desktopRow { border-radius: 22px; }')).toBe('');
		for (const declaration of ['margin-top: 12px', 'padding: 18px 20px', 'border: var(--border)', 'border-radius: 22px', 'background: var(--masthead)', 'box-shadow: var(--shadow)']) {
			expect(sharedCase(source)).toContain(declaration);
		}
		const hatask = mountApps({ kind: 'hatask' });
		const tools = mountApps({ kind: 'tools' });
		const hataskRows = [...hatask.container.querySelectorAll('[data-app-layout="desktop"] [data-app-id]')];
		const toolRows = [...tools.container.querySelectorAll('[data-app-layout="desktop"] [data-app-id]')];
		expect(hataskRows).toHaveLength(7);
		expect(toolRows).toHaveLength(12);
		for (const row of [...hataskRows, ...toolRows]) expect(row.className).toBe(hataskRows[0].className);
	});

	test('両AppのPC・モバイルの件数バッジは白い数字で表示する', () => {
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiApps.vue'), 'utf8');
		const whiteBadge = (css: string): boolean => /(?:^|;)\s*color:\s*#fff\s*;/.test(css.match(/^\.countBadge\s*\{([^}]*)\}/m)?.[1] ?? '');
		expect(whiteBadge('.countBadge { color: var(--feature-accent-small); }')).toBe(false);
		expect(whiteBadge(source)).toBe(true);
		const badges = (['hatask', 'tools'] as const).flatMap(kind => [...mountApps({ kind }).container.querySelectorAll('[data-count-badge]')]);
		expect(badges).toHaveLength(8);
		for (const badge of badges) expect(badge.className).toBe(badges[0].className);
	});

	test('PCの狭い中央列でも分類を保ち、モバイル意匠は親の599pxで切り替える', () => {
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiApps.vue'), 'utf8');
		const localMobileBreakpoint = /@container\s+ak-apps\s*\(max-width:\s*599px\)/;
		expect(localMobileBreakpoint.test('@container ak-apps (max-width: 599px) { .desktopList { display: none; } }')).toBe(true);
		expect(localMobileBreakpoint.test(source)).toBe(false);
		expect(source).toContain('@container hatask-akatsuki (max-width: 599px)');
		expect(source).toContain('@container ak-feature (max-width: 270px)');
	});

	test('Hataskの7入口と3特集を保ち、一覧・特集はopenだけを親へ通知する', () => {
		const { container, open } = mountApps();
		const ids = ['cal', 'todo', 'mood', 'meal', 'garden', 'eye', 'settings'];
		for (const layout of ['mobile', 'desktop'] as const) {
			expect(appIds(container, layout)).toEqual(ids);
			for (const id of ids) container.querySelector<HTMLButtonElement>(`[data-app-layout="${layout}"] [data-app-id="${id}"] button`)!.click();
		}
		expect([...container.querySelectorAll<HTMLElement>('[data-feature-id]')].map(item => item.dataset.featureId)).toEqual(['todo', 'garden', 'mood']);
		container.querySelector<HTMLButtonElement>('[data-feature-open="todo"]')!.click();
		expect(open.mock.calls.map(args => args[0])).toEqual([...ids, ...ids, 'todo']);
	});

	test('Hataskeyの10入口と旧2入口、3特集を保ち、PCの5分類へ配置する', () => {
		const { container, open } = mountApps({ kind: 'tools' });
		expect(appIds(container, 'mobile')).toEqual(['feed', 'hatady', 'card', 'analyze', 'studio', 'earthquake', 'mascot', 'games', 'guide', 'drawing', 'whatsnew', 'hatasettings']);
		expect(appIds(container, 'desktop')).toEqual(['card', 'analyze', 'drawing', 'feed', 'hatady', 'earthquake', 'mascot', 'games', 'studio', 'guide', 'whatsnew', 'hatasettings']);
		expect(container.querySelectorAll('[data-app-layout="desktop"] h3')).toHaveLength(5);
		expect([...container.querySelectorAll<HTMLElement>('[data-feature-id]')].map(item => item.dataset.featureId)).toEqual(['analyze', 'hatady', 'card']);
		for (const button of container.querySelectorAll<HTMLButtonElement>('[data-feature-open]')) button.click();
		expect(open.mock.calls.map(args => args[0])).toEqual(['analyze', 'hatady', 'card']);
		expect(container.textContent).toContain('映画・ゲーム・学びの記録');
		expect(container.textContent).toContain('ドライブから選んで添付');
	});

	test('HataFeedとマスコットの入口は親の権限変更に追従して両一覧で隠れる', async () => {
		const { container, props } = mountApps({ kind: 'tools' });
		expect(container.querySelectorAll('[data-app-id="feed"]')).toHaveLength(2);
		expect(container.querySelectorAll('[data-app-id="mascot"]')).toHaveLength(2);
		props.canAccessHataFeed = false;
		props.canUseMascot = false;
		await nextTick();
		expect(appIds(container, 'mobile')).toHaveLength(10);
		expect(appIds(container, 'desktop')).toHaveLength(10);
		expect(container.querySelector('[data-app-id="feed"]')).toBeNull();
		expect(container.querySelector('[data-app-id="mascot"]')).toBeNull();
		props.canAccessHataFeed = true;
		props.canUseMascot = true;
		await nextTick();
		expect(appIds(container, 'mobile')).toHaveLength(12);
	});

	test('件数は実値から表示し、読込未完了ではバッジも残件数の断定も隠す', async () => {
		const { container, props } = mountApps();
		// Omitted optional Boolean props otherwise cast to false in Vue. Keep the
		// fixture omitted so this exercises the component's explicit default.
		expect(props.countsKnown).toBeUndefined();
		expect([...container.querySelectorAll('[data-count-badge]')].map(item => item.textContent)).toEqual(['4', '3', '1', '4', '3', '1']);
		expect(activeSlide(container).textContent).toContain('残り 3 件を、');
		props.countsKnown = false;
		await nextTick();
		expect(container.querySelector('[data-count-badge]')).toBeNull();
		expect(activeSlide(container).textContent).toContain('きょうのタスクを、');
		expect(activeSlide(container).textContent).not.toContain('残り');
		props.countsKnown = true;
		props.counts = { calendar: -1, todo: 0, meal: Number.NaN, feedback: 3 };
		await nextTick();
		expect(container.querySelector('[data-count-badge]')).toBeNull();
		expect(props.counts.calendar).toBe(-1);
		expect(props.counts.meal).toBeNaN();
		props.kind = 'tools';
		await nextTick();
		expect([...container.querySelectorAll('[data-count-badge]')].map(item => item.textContent)).toEqual(['3', '3']);
	});

	test('次・前・ドットで循環し、アクティブ以外の2枚はinertになる', async () => {
		const { container } = mountApps();
		expect(activeSlide(container).dataset.featureId).toBe('todo');
		action(container, 'prev').click();
		await nextTick();
		expect(activeSlide(container).dataset.featureId).toBe('mood');
		action(container, 'next').click();
		await nextTick();
		expect(activeSlide(container).dataset.featureId).toBe('todo');
		container.querySelector<HTMLButtonElement>('[data-dot-index="1"]')!.click();
		await nextTick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		expect(container.querySelectorAll('[data-feature-id][inert]')).toHaveLength(2);
		expect(activeSlide(container).hasAttribute('inert')).toBe(false);
		expect(container.querySelector('[data-dot-index="1"]')?.getAttribute('aria-pressed')).toBe('true');
	});

	test.each(['hatask', 'tools'] as const)('%sの制御は1組だけ固定し、前後・停止・ドット操作でも項目だけを動かす', async kind => {
		const { container } = mountApps({ kind });
		const feature = container.querySelector('[aria-roledescription="カルーセル"]')!;
		const track = feature.querySelector<HTMLElement>('[data-feature-track]')!;
		const controls = feature.querySelector<HTMLElement>('[data-feature-controls]')!;
		const buttons = [...controls.querySelectorAll<HTMLButtonElement>('button')];
		expect(controls.parentElement).toBe(feature);
		expect(track.parentElement).toBe(feature);
		expect(feature.querySelectorAll('[data-feature-controls]')).toHaveLength(1);
		expect(buttons).toHaveLength(6);
		expect(track.contains(controls)).toBe(false);
		expect(track.querySelector('[data-carousel-action]')).toBeNull();
		expect(track.style.transform).toBe('translateX(-0%)');

		for (const [name, index] of [['next', 1], ['pause', 1], ['prev', 0], ['pause', 0]] as const) {
			action(container, name).click();
			await nextTick();
			expect(track.style.transform).toBe(`translateX(-${index * 100}%)`);
			expect(controls.dataset.tone).toBe(activeSlide(container).dataset.tone);
			expect(controls.style.transform).toBe('');
			expect(feature.querySelector('[data-feature-controls]')).toBe(controls);
			for (const [buttonIndex, button] of [...controls.querySelectorAll('button')].entries()) expect(button).toBe(buttons[buttonIndex]);
		}
		container.querySelector<HTMLButtonElement>('[data-dot-index="2"]')!.click();
		await nextTick();
		expect(track.style.transform).toBe('translateX(-200%)');
		expect(controls.dataset.tone).toBe('accent2');
		expect(feature.querySelector('[data-feature-controls]')).toBe(controls);
	});

	test('広い特集ではアプリと固定制御を同段にし、狭い特集だけ制御用の段を確保する', () => {
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiApps.vue'), 'utf8');
		const fixedControls = (css: string): boolean => /\.controls\s*\{[^}]*position:\s*absolute;[^}]*inset-inline:\s*0;[^}]*bottom:\s*0;/.test(css);
		expect(fixedControls('.controls { position: relative; bottom: 0; }')).toBe(false);
		expect(fixedControls(source)).toBe(true);
		expect(source).toMatch(/\.feature\s*\{[^}]*position:\s*relative;/);
		expect(source).toContain('grid-template-areas: \'kicker kicker\' \'title title\' \'app .\'');
		expect(source).toMatch(/\.root \.featureApp\s*\{[^}]*grid-area:\s*app;/);
		expect(source).toMatch(/@container ak-feature \(max-width: 500px\)\s*\{\s*\.featureBody\s*\{[^}]*grid-template-areas: 'kicker app' 'title title';[^}]*padding:\s*12px 16px 54px;/);
		expect(source).toMatch(/@container ak-feature \(max-width: 227px\)\s*\{\s*\.featureBody\s*\{[^}]*grid-template-areas: 'kicker' 'title' 'app';[^}]*padding-bottom:\s*86px;/);
	});

	test('特集だけの余白と見出しを縮め、文字量が増えた場合は高さを固定しない', () => {
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiApps.vue'), 'utf8');
		const mobile = source.slice(source.indexOf('@container hatask-akatsuki (max-width: 599px)'));
		expect(source).toContain('min-height: 160px; padding: 14px 18px');
		expect(source).toContain('font-size: clamp(22px, 4cqi, 26px)');
		expect(mobile).toContain('font-size: clamp(20px, calc((100cqi - 32px) / 12), 22px)');
		expect(source).toMatch(/\.featureMark\s*\{[^}]*width:\s*132px !important;[^}]*height:\s*132px !important;/);
		const growingLabel = (css: string): boolean => /\.root \.featureApp\s*\{[^}]*min-height:\s*44px;[^}]*height:\s*auto;[^}]*min-width:\s*0;[^}]*white-space:\s*normal;/.test(css);
		// The old fixed-height, non-wrapping pill must not pass this content-reflow contract.
		expect(growingLabel('.root .featureApp { height: 42px; white-space: nowrap; }')).toBe(false);
		expect(growingLabel(source)).toBe(true);
		expect(source).toMatch(/\.featureApp \.brand\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/);
		expect(source).toMatch(/\.featureTitle\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/);
		const fixedHeight = (css: string): boolean => [...css.matchAll(/\.(?:feature|slide|featureBody)\s*\{([^}]*)\}/g)]
			.some(match => /(?:^|;)\s*(?:height|max-height)\s*:/.test(match[1]));
		expect(fixedHeight('.featureBody { max-height: 160px; overflow: hidden; }')).toBe(true);
		expect(fixedHeight(source)).toBe(false);
	});

	test('操作領域を縮めず、通常幅と細いペインの固定制御用スペースを確保する', () => {
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiApps.vue'), 'utf8');
		const compactStart = source.indexOf('@container ak-feature (max-width: 500px)');
		const mobileStart = source.indexOf('@container hatask-akatsuki (max-width: 599px)');
		const narrowStart = source.indexOf('@container ak-feature (max-width: 227px)');
		const base = source.slice(0, compactStart);
		const compact = source.slice(compactStart, mobileStart);
		const mobile = source.slice(mobileStart, narrowStart);
		const narrow = source.slice(narrowStart);
		const rule = (css: string, selector: string): string => {
			const start = css.indexOf(`${selector} {`);
			if (start < 0) throw new Error(`Required feature rule is missing: ${selector}`);
			return css.slice(start + selector.length + 2, css.indexOf('}', start));
		};
		const pixels = (declaration: string, property: string): number => {
			const match = declaration.match(new RegExp(`(?:^|;)\\s*${property}:\\s*(\\d+)px\\s*;`));
			if (!match) throw new Error(`Required pixel declaration is missing: ${property}`);
			return Number(match[1]);
		};
		const desktopButton = pixels(rule(base, '.root .carouselButton'), 'height');
		const mobileButton = pixels(rule(mobile, '.root .carouselButton'), 'height');
		const dotsHeight = pixels(rule(base, '.root .dotTarget'), 'height');
		expect(desktopButton).toBe(34);
		expect(mobileButton).toBe(32);
		expect(dotsHeight).toBe(32);
		// CSS budget checks, not measurements from a layout-capable browser.
		const reserveFits = (reserve: number, rows: number): boolean => reserve >= rows;
		expect(reserveFits(20, desktopButton + 19)).toBe(false);
		expect(rule(base, '.featureBody')).toContain('grid-template-columns: minmax(0, 1fr) 196px');
		expect(rule(base, '.featureBody')).toContain('gap: 6px 16px');
		expect(rule(base, '.featureBody')).toContain('padding: 14px 18px');
		expect(rule(base, '.controls')).toContain('padding: 0 18px 19px');
		expect(reserveFits(pixels(rule(base, '.root .featureApp'), 'min-height') + 14, desktopButton + 19)).toBe(true);
		const controlsWidth = 3 * desktopButton + 3 * 8 + 2 * 10 + 26 + 2 * 5;
		expect(controlsWidth).toBeLessThanOrEqual(196);
		// The full-width stationary overlay must not intercept the app on its left.
		expect(rule(base, '.controls')).toContain('pointer-events: none');
		expect(rule(base, '.controls > *')).toContain('pointer-events: auto');
		expect(rule(compact, '.featureBody')).toContain('padding: 12px 16px 54px');
		expect(rule(compact, '.controls')).toContain('padding: 0 16px 12px');
		expect(reserveFits(54, Math.max(desktopButton, mobileButton) + 12 + 8)).toBe(true);
		expect(rule(narrow, '.controls')).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
		expect(rule(narrow, '.controls')).toContain('gap: 4px 8px');
		expect(rule(narrow, '.controls')).toContain('padding: 0 12px 12px');
		expect(rule(narrow, '.dots')).toContain('grid-column: 1 / -1');
		expect(reserveFits(pixels(rule(narrow, '.featureBody'), 'padding-bottom'), Math.max(desktopButton, mobileButton) + 4 + dotsHeight + 12)).toBe(true);
		for (const width of [160, 200, 227]) expect((width - 24 - 16) / 3).toBeGreaterThanOrEqual(desktopButton);
	});

	test.each([
		{ width: 520, mobile: false },
		{ width: 760, mobile: false },
		{ width: 1200, mobile: false },
		{ width: 320, mobile: true },
		{ width: 375, mobile: true },
		{ width: 414, mobile: true },
	])('幅$widthの通常2行コピーはコンパクトなCSS高さ予算に収まり、長文は自然に伸ばせる', ({ width, mobile }) => {
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiApps.vue'), 'utf8');
		// These are source-level layout budgets, not visual/browser measurements.
		expect(source).toContain('min-height: 160px; padding: 14px 18px');
		expect(source).toContain('min-height: 166px; padding: 12px 16px 54px');
		expect(source).toContain('font-size: clamp(22px, 4cqi, 26px)');
		expect(source).toContain('font-size: clamp(20px, calc((100cqi - 32px) / 12), 22px)');
		const fontSize = mobile ? Math.min(22, Math.max(20, (width - 32) / 12)) : Math.min(26, Math.max(22, width * 0.04));
		const lineHeight = mobile ? 1.18 : 1.15;
		const contentHeight = (lines: number): number => mobile
			? Math.max(166, 12 + 44 + 6 + fontSize * lineHeight * lines + 54)
			: Math.max(160, 28 + 11 * 1.55 + 12 + fontSize * lineHeight * lines + 44);
		expect(contentHeight(2)).toBeGreaterThanOrEqual(mobile ? 150 : 140);
		expect(contentHeight(2)).toBeLessThanOrEqual(mobile ? 180 : 170);
		expect(contentHeight(6)).toBeGreaterThan(contentHeight(2));
	});

	test.each(['hatask', 'tools'] as const)('%sのコンパクト特集でも全文・改行・アイコン・開く操作を保つ', async kind => {
		const { container, open: openApp } = mountApps({ kind, counts: { calendar: 0, todo: Number.MAX_SAFE_INTEGER, meal: 0, feedback: 0 } });
		const expected = kind === 'hatask' ? [
			{ id: 'todo', title: `残り ${Number.MAX_SAFE_INTEGER} 件を、先に片づける。`, label: 'ToDo' },
			{ id: 'garden', title: '花の育ちぐあいを、そっと見に行く。', label: 'おはな' },
			{ id: 'mood', title: 'いまの気分を、ひとこと残そう。', label: 'きもち' },
		] : [
			{ id: 'analyze', title: '自分の言葉から、気分の波を読む。', label: 'HATAlyze（感情分析）' },
			{ id: 'hatady', title: '映画もゲームも、学びもひとつに。', label: 'Hatady' },
			{ id: 'card', title: '自分の一枚を、カードにする。', label: 'HataCardMaker' },
		];
		for (const item of expected) {
			const slide = activeSlide(container);
			expect(slide.dataset.featureId).toBe(item.id);
			const title = slide.querySelector('[data-feature-title]');
			expect(title?.textContent).toBe(item.title);
			expect(title?.querySelectorAll('br')).toHaveLength(1);
			expect(slide.querySelectorAll('svg')).toHaveLength(2);
			const button = slide.querySelector<HTMLButtonElement>('[data-feature-open]');
			if (!button) throw new Error('Featured app button is missing');
			expect(button.textContent).toBe(item.label);
			button.click();
			action(container, 'next').click();
			await nextTick();
		}
		expect(openApp.mock.calls.map(args => args[0])).toEqual(expected.map(item => item.id));
	});

	test('キーボード操作後も同じ制御DOMにフォーカスを保つ', async () => {
		const { container } = mountApps();
		const next = action(container, 'next');
		next.focus();
		next.click();
		await nextTick();
		await nextTick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		expect(window.document.activeElement).toBe(action(container, 'next'));
		expect(action(container, 'next')).toBe(next);
		const dot = container.querySelector<HTMLButtonElement>('[data-dot-index="2"]')!;
		dot.focus();
		dot.click();
		await nextTick();
		await nextTick();
		expect(activeSlide(container).dataset.featureId).toBe('mood');
		expect(window.document.activeElement).toBe(dot);
	});

	test('表示中は4200msごとに循環し、手動一時停止と再生が効く', async () => {
		const { container } = mountApps();
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		action(container, 'pause').click();
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		expect(action(container, 'pause').getAttribute('aria-pressed')).toBe('true');
		action(container, 'pause').click();
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('mood');
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('todo');
	});

	test('hover中とフォーカス中は自動送りを止め、離れると再開する', async () => {
		const { container } = mountApps();
		const feature = container.querySelector('[aria-roledescription="カルーセル"]')!;
		feature.dispatchEvent(new Event('pointerenter'));
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('todo');
		feature.dispatchEvent(new Event('pointerleave'));
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		const button = action(container, 'next');
		button.focus();
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		button.blur();
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('mood');
	});

	test('再生クリックのフォーカス停止は解除し、hoverと新しいキーボードフォーカスは止める', async () => {
		const { container } = mountApps();
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		const feature = container.querySelector('[aria-roledescription="カルーセル"]')!;
		feature.dispatchEvent(new Event('pointerenter'));
		const pause = action(container, 'pause');
		pause.focus();
		pause.click();
		await nextTick();
		pause.click();
		await nextTick();
		expect(action(container, 'pause').getAttribute('aria-pressed')).toBe('false');
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		feature.dispatchEvent(new Event('pointerleave'));
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('mood');
		action(container, 'next').focus();
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('mood');
	});

	test('画面外・v-show非表示・ブラウザー非表示のいずれでも自動送りを止める', async () => {
		const { container } = mountApps();
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		setIntersecting(false);
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		setIntersecting(true);
		hasLayout = false;
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		hasLayout = true;
		pageVisibility = 'hidden';
		window.document.dispatchEvent(new Event('visibilitychange'));
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		pageVisibility = 'visible';
		window.document.dispatchEvent(new Event('visibilitychange'));
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('mood');
	});

	test('動きOFFとOSの動きを減らす設定に追従し、手動切替は保つ', async () => {
		const { container, props } = mountApps({ animations: false });
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('todo');
		expect(action(container, 'pause').disabled).toBe(true);
		action(container, 'next').click();
		await nextTick();
		expect(activeSlide(container).dataset.featureId).toBe('garden');
		props.animations = true;
		await nextTick();
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('mood');
		setReducedMotion(true);
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('mood');
		expect(container.querySelector('section')?.dataset.motion).toBe('false');
		setReducedMotion(false);
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('todo');
	});

	test('同じインスタンスで種類を変えたら先頭特集に戻る', async () => {
		const { container, props } = mountApps();
		action(container, 'next').click();
		await nextTick();
		action(container, 'pause').click();
		props.kind = 'tools';
		await nextTick();
		expect(activeSlide(container).dataset.featureId).toBe('analyze');
		expect(action(container, 'pause').getAttribute('aria-pressed')).toBe('false');
		await tick();
		expect(activeSlide(container).dataset.featureId).toBe('hatady');
	});

	test('アンマウントでタイマー・交差監視・メディア変更リスナーを解除する', () => {
		const { app } = mountApps();
		const removeListener = vi.spyOn(window.document, 'removeEventListener');
		expect(vi.getTimerCount()).toBe(1);
		expect(motionListeners.size).toBe(1);
		app.unmount();
		expect(vi.getTimerCount()).toBe(0);
		expect(observers[0].disconnect).toHaveBeenCalledOnce();
		expect(motionListeners.size).toBe(0);
		expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
		mounted[0].container.remove();
		mounted.splice(0);
	});
});
