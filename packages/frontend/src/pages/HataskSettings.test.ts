/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { parse } from '@vue/compiler-sfc';
import { createApp, h, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import HataskSettings from './HataskSettings.vue';
import type { App, PropType } from 'vue';

vi.mock('@/i18n.js', async () => {
	const { readFileSync: readLocaleFile } = await import('node:fs');
	const { resolve: resolveLocalePath } = await import('node:path');
	const { load } = await import('js-yaml');
	const locale = load(readLocaleFile(resolveLocalePath(process.cwd(), '../../locales/ja-JP.yml'), 'utf8')) as { _hata: { _hatask: Record<string, Record<string, string>> } };
	const format = (strings: Record<string, string>) => new Proxy({}, { get: (_target, key) => (params: Record<string, string>) => strings[String(key)].replace(/\{(\w+)\}/gu, (_match, name: string) => params[name]) });
	return { i18n: { ts: locale, tsx: { _hata: { _hatask: { _settings: format(locale._hata._hatask._settings), _planner: format(locale._hata._hatask._planner) } } } } };
});
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn() }));
vi.mock('@/router.js', async () => {
	const { ref } = await import('vue');
	return { useRouter: () => ({ push: vi.fn(), currentRoute: ref({ path: '/hatask' }) }) };
});
vi.mock('@/os.js', () => ({ toast: vi.fn(), popupMenu: vi.fn(async () => undefined) }));
vi.mock('vuedraggable', async () => {
	const { defineComponent, Fragment, h: render } = await import('vue');
	return { default: defineComponent({
		inheritAttrs: false,
		props: {
			modelValue: { type: Array as PropType<string[]>, required: true },
			itemKey: { type: Function as PropType<(id: string) => string>, required: true },
			disabled: Boolean,
			handle: { type: String, default: undefined },
		},
		emits: ['update:modelValue'],
		setup: (props, { attrs, slots, emit }) => () => render('div', {
			...attrs,
			'data-test-draggable': '',
			'data-disabled': String(props.disabled),
			'data-handle': props.handle,
			// Exercise the component's actual model update boundary, including invalid
			// and concurrent emissions; the fixture does not sanitize these values.
			onHataskReorder: (event: Event) => emit('update:modelValue', (event as CustomEvent<unknown>).detail),
		}, props.modelValue.map((element, index) => render(Fragment, { key: props.itemKey(element) }, slots.item?.({ element, index })))),
	}) };
});
vi.mock('@/components/MkModalWindow.vue', async () => {
	const { defineComponent, h: render } = await import('vue');
	return { default: defineComponent({ setup: (_props, { slots, expose }) => { expose({ close: vi.fn() }); return () => render('div', { 'data-test-window': 'modal' }, slots.default?.()); } }) };
});
vi.mock('@/components/SettingsEmbeddedWindow.vue', async () => {
	const { defineComponent, h: render } = await import('vue');
	return { default: defineComponent({ setup: (_props, { slots, expose }) => { expose({ close: vi.fn() }); return () => render('div', { 'data-test-window': 'embedded' }, slots.default?.()); } }) };
});
vi.mock('@/components/MkButton.vue', async () => {
	const { defineComponent, h: render } = await import('vue');
	return { default: defineComponent({ setup: (_props, { slots }) => () => render('button', slots.default?.()) }) };
});

import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { popupMenu } from '@/os.js';

const copy = i18n.ts._hata._hatask._settings;
const mounted: Array<{ app: App<Element>; container: HTMLDivElement }> = [];
let readSettings: () => Promise<unknown>;
let writeSettings: (value: unknown) => Promise<unknown>;

async function flush(): Promise<void> { await Promise.resolve(); await nextTick(); await Promise.resolve(); await nextTick(); }

function textButton(container: HTMLElement, text: string): HTMLButtonElement {
	const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === text);
	if (!button) throw new Error(`Missing button: ${text}`);
	return button;
}

function themeButton(container: HTMLElement, name: string): HTMLButtonElement {
	const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
	if (!button) throw new Error(`Missing theme: ${name}`);
	return button;
}

async function mountSettings(embedded = true) {
	const changed = vi.fn();
	const container = window.document.createElement('div'); window.document.body.append(container);
	const app = createApp({ render: () => h(HataskSettings, { embedded, onChanged: changed }) });
	app.mount(container); mounted.push({ app, container });
	await flush();
	return { container, changed };
}

async function openThemes(container: HTMLElement): Promise<void> { textButton(container, copy.openThemeSettings).click(); await flush(); }

function writes() { return vi.mocked(misskeyApi).mock.calls.filter(([endpoint]) => endpoint === 'i/registry/set'); }

beforeEach(() => {
	vi.clearAllMocks();
	readSettings = async () => { throw Object.assign(new Error('Settings do not exist'), { code: 'NO_SUCH_KEY' }); };
	writeSettings = async () => undefined;
	vi.mocked(misskeyApi).mockImplementation((async (endpoint: string, params: Record<string, unknown>) => {
		if (endpoint === 'i/registry/get') return readSettings();
		if (endpoint === 'i/registry/set') return writeSettings(params.value);
		if (endpoint === 'hatask/planner/get') throw new Error('Planner backup is unavailable in this test');
		throw new Error(`Unexpected endpoint: ${endpoint}`);
	}) as typeof misskeyApi);
});
afterEach(() => { for (const { app, container } of mounted.splice(0)) { app.unmount(); container.remove(); } });

describe('Hatask theme settings and persistence safety', () => {
	test('only a missing settings key selects the new default without writing it', async () => {
		const { container, changed } = await mountSettings();
		expect(container.querySelector('[data-akatsuki-navigation]')).not.toBeNull();
		await openThemes(container);
		const names = [copy.themeAkatsuki, copy.themeKisetsu, copy.themeKashin, copy.themeSuri, copy.themeHatakyu];
		expect(names.map(name => themeButton(container, name).getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false', 'false']);
		expect(writes()).toHaveLength(0);
		expect(changed).not.toHaveBeenCalled();
	});

	test.each([
		['kisetsu', copy.themeKisetsu], ['kashin', copy.themeKashin], ['suri', copy.themeSuri], ['hatakyu', copy.themeHatakyu],
	])('keeps the saved %s selection and unrelated settings', async (theme, name) => {
		const saved = { theme, darkMode: true, autoTheme: false, weekStart: 'sun', custom: { keep: 'data' } };
		readSettings = async () => saved;
		const { container, changed } = await mountSettings();
		expect(container.querySelector('[data-akatsuki-navigation]')).toBeNull();
		await openThemes(container);
		expect(themeButton(container, name).getAttribute('aria-pressed')).toBe('true');
		expect(writes()).toHaveLength(0);
		themeButton(container, copy.themeAkatsuki).click(); await flush();
		expect(writes()).toHaveLength(1);
		expect(writes()[0][1]).toMatchObject({ key: 'settings', scope: ['client', 'hatask'], value: { ...saved, theme: 'akatsuki' } });
		expect(changed).toHaveBeenCalledWith(expect.objectContaining({ ...saved, theme: 'akatsuki' }));
	});

	test.each([{ value: null }, { value: [] }, { value: 'invalid' }])('does not enable or overwrite malformed settings: $value', async ({ value }) => {
		readSettings = async () => value;
		const { container, changed } = await mountSettings();
		expect(container.querySelector('[role="alert"]')?.textContent).toBe(i18n.ts._hata._hatask._planner.readFailure);
		expect(container.querySelector('[data-akatsuki-navigation]')).toBeNull();
		expect(container.querySelectorAll('select, [role="switch"]')).toHaveLength(0);
		expect(writes()).toHaveLength(0);
		expect(changed).not.toHaveBeenCalled();
	});

	test('a read failure stays locked until an explicit successful retry', async () => {
		readSettings = async () => { throw Object.assign(new Error('Settings could not be loaded'), { code: 'INTERNAL_ERROR' }); };
		const { container } = await mountSettings();
		expect(container.querySelector('[role="alert"]')).not.toBeNull();
		expect(container.querySelector('[data-akatsuki-navigation]')).toBeNull();
		expect(writes()).toHaveLength(0);
		readSettings = async () => ({ theme: 'suri' });
		textButton(container, i18n.ts._hata._hatask._planner.retry).click(); await flush();
		await openThemes(container);
		expect(themeButton(container, copy.themeSuri).getAttribute('aria-pressed')).toBe('true');
		expect(writes()).toHaveLength(0);
	});

	test('pending and failed writes never emit an unsaved theme or accept concurrent writes', async () => {
		readSettings = async () => ({ theme: 'kashin', autoTheme: false });
		let rejectSave: (error: Error) => void = () => { throw new Error('Save did not start'); };
		writeSettings = () => new Promise((_resolve, reject) => { rejectSave = reject; });
		const { container, changed } = await mountSettings(); await openThemes(container);
		themeButton(container, copy.themeAkatsuki).click(); await flush();
		expect(writes()).toHaveLength(1); // Positive control: the API write actually began.
		expect(changed).not.toHaveBeenCalled();
		expect(themeButton(container, copy.themeKashin).getAttribute('aria-pressed')).toBe('true');
		expect([...container.querySelectorAll<HTMLButtonElement>('[role="switch"], button[aria-pressed]')].every(button => button.disabled)).toBe(true);
		themeButton(container, copy.themeSuri).click(); await flush();
		expect(writes()).toHaveLength(1);
		rejectSave(new Error('Offline')); await flush();
		expect(container.querySelector('[role="alert"]')?.textContent).toBe(copy.saveFailure);
		expect(changed).not.toHaveBeenCalled();
		expect(themeButton(container, copy.themeKashin).getAttribute('aria-pressed')).toBe('true');
		writeSettings = async () => undefined;
		themeButton(container, copy.themeAkatsuki).click(); await flush();
		expect(writes()).toHaveLength(2);
		expect(changed).toHaveBeenCalledTimes(1);
		expect(themeButton(container, copy.themeAkatsuki).getAttribute('aria-pressed')).toBe('true');
	});
});

describe('テーマ選択カルーセルの内容高と説明文', () => {
	test('暁の日本語説明は指定箇所だけで改行し、翻訳の元の値や通常設定の説明は変えない', async () => {
		const description = copy.themeAkatsukiDescription;
		const { container } = await mountSettings();
		expect(container.textContent).toContain(description);
		await openThemes(container);
		expect(container.querySelector('[data-theme-description="akatsuki"]')?.textContent).toBe('朝焼けのグラデーションと、\n軽やかな3ペイン');
		expect(container.querySelector('[data-theme-description="kashin"]')?.textContent).toBe(copy.themeKashinDescription);
		expect(copy.themeAkatsukiDescription).toBe(description);
		expect(writes()).toHaveLength(0);
	});

	test('暁の説明が別言語なら句読点で機械的に分割せず、長い翻訳も全文を描画する', async () => {
		const description = copy.themeAkatsukiDescription;
		const translated = 'A sunrise gradient, with a light three-pane layout and a longer translated explanation';
		try {
			copy.themeAkatsukiDescription = translated;
			const { container } = await mountSettings(); await openThemes(container);
			expect(container.querySelector('[data-theme-description="akatsuki"]')?.textContent).toBe(translated);
			expect(container.querySelector('[data-theme-description="akatsuki"] br')).toBeNull();
			expect(writes()).toHaveLength(0);
		} finally {
			copy.themeAkatsukiDescription = description;
		}
	});

	test('高さ固定や絶対配置ではなく、重ねたカードの自然高と選択枠・フォーカス枠の余白を確保する', () => {
		// Source contract: Happy DOM cannot establish real font metrics or clipping.
		const filename = resolvePath(process.cwd(), 'src/pages/HataskSettings.vue');
		const parsed = parse(readFileSync(filename, 'utf8'), { filename });
		expect(parsed.errors).toEqual([]);
		const stylesheet = parsed.descriptor.styles[0].content;
		const viewportRules = [...stylesheet.matchAll(/\.carViewport\s*\{([^}]+)\}/gu)].map(match => match[1]);
		const cardRules = [...stylesheet.matchAll(/\.themeCard\s*\{([^}]+)\}/gu)].map(match => match[1]);
		expect(viewportRules.length).toBeGreaterThan(0);
		expect(cardRules.length).toBeGreaterThan(0);
		expect(viewportRules[0]).toContain('display:grid');
		expect(viewportRules[0]).toContain('grid-template-columns:minmax(0,1fr)');
		expect(viewportRules[0]).toContain('padding:8px');
		expect(viewportRules[0]).toContain('overflow:hidden');
		expect(cardRules[0]).toContain('grid-area:1 / 1');
		expect(cardRules[0]).toContain('box-sizing:border-box');
		for (const rule of viewportRules) expect(rule).not.toMatch(/(?:^|;)\s*(?:min-|max-)?height\s*:/u);
		for (const rule of cardRules) expect(rule).not.toMatch(/position\s*:\s*absolute/u);
		expect(stylesheet).toMatch(/\.themeJp\s*\{[^}]*white-space:pre-line;[^}]*overflow-wrap:anywhere/u);
		expect(stylesheet).toContain('outline:3px solid var(--MI_THEME-accent); outline-offset:2px');
		expect(stylesheet).toContain('@media (prefers-reduced-motion:reduce)');
	});

	test('自然高への変更後も矢印・ドット・スワイプで同じテーマを選択し、中央と隣接カードの変換を保つ', async () => {
		const { container, changed } = await mountSettings(); await openThemes(container);
		const card = (id: string): HTMLButtonElement => {
			const element = container.querySelector<HTMLButtonElement>(`[data-theme-card="${id}"]`);
			if (!element) throw new Error(`Missing theme card: ${id}`);
			return element;
		};
		expect(card('akatsuki').style.transform).toBe('translateX(0%) scale(1)');
		expect(card('kisetsu').style.transform).toBe('translateX(76%) scale(0.8)');
		expect(card('hatakyu').tabIndex).toBe(-1);
		expect(card('hatakyu').style.pointerEvents).toBe('none');
		container.querySelector<HTMLButtonElement>(`[aria-label="${copy.nextTheme}"]`)?.click(); await flush();
		expect(card('kisetsu').getAttribute('aria-pressed')).toBe('true');
		expect(card('akatsuki').style.transform).toBe('translateX(-76%) scale(0.8)');
		themeButton(container, copy.themeKashin).click(); await flush();
		expect(card('kashin').style.transform).toBe('translateX(0%) scale(1)');
		const viewport = container.querySelector('[data-theme-carousel]');
		if (!viewport) throw new Error('Missing carousel viewport');
		const start = new Event('touchstart'); Object.defineProperty(start, 'changedTouches', { value: [{ clientX: 100 }] });
		const end = new Event('touchend'); Object.defineProperty(end, 'changedTouches', { value: [{ clientX: 20 }] });
		viewport.dispatchEvent(start); viewport.dispatchEvent(end); await flush();
		expect(card('suri').getAttribute('aria-pressed')).toBe('true');
		expect(card('suri').style.transform).toBe('translateX(0%) scale(1)');
		expect(writes().map(([, params]) => (params as { value: { theme: string } }).value.theme)).toEqual(['kisetsu', 'kashin', 'suri']);
		expect(changed).toHaveBeenCalledTimes(3);
	});
});

function navigationOrder(container: HTMLElement): string[] {
	return [...container.querySelectorAll<HTMLElement>('[data-ak-slot]')].map(item => item.dataset.tab!);
}

function navButton(container: HTMLElement, selector: string): HTMLButtonElement {
	const button = container.querySelector<HTMLButtonElement>(selector);
	if (!button) throw new Error(`Missing navigation control: ${selector}`);
	return button;
}

type NavigationMenuItem = { type?: string; text?: string; active?: boolean; action?: (event: MouseEvent) => void; children?: NavigationMenuItem[] };

function openTabMenu(container: HTMLElement, tab: string): NavigationMenuItem[] {
	const button = navButton(container, `[data-ak-menu="${tab}"]`);
	const before = vi.mocked(popupMenu).mock.calls.length;
	button.click();
	expect(popupMenu).toHaveBeenCalledTimes(before + 1);
	const call = vi.mocked(popupMenu).mock.calls[before];
	expect(call[1]).toBe(button);
	return call[0] as unknown as NavigationMenuItem[];
}

function menuAction(items: NavigationMenuItem[], text: string): void {
	const item = items.find(candidate => candidate.text === text);
	if (!item?.action) throw new Error(`Missing menu action: ${text}`);
	item.action(new MouseEvent('click'));
}

function positions(items: NavigationMenuItem[]): NavigationMenuItem[] {
	const parent = items.find(item => item.type === 'parent' && item.text === '位置を変更');
	if (!Array.isArray(parent?.children)) throw new Error('Missing position submenu');
	return parent.children;
}

function dragTabs(container: HTMLElement, value: unknown): void {
	const list = container.querySelector('[data-test-draggable]');
	if (!list) throw new Error('Missing draggable tab list');
	list.dispatchEvent(new CustomEvent('hatask-reorder', { detail: value }));
}

function deferMenuClose(): () => void {
	let resolveClosed: () => void = () => { throw new Error('Menu did not open'); };
	vi.mocked(popupMenu).mockImplementationOnce(() => new Promise<void>(resolve => { resolveClosed = resolve; }));
	return () => resolveClosed();
}

describe('下部ナビバー設定は有効な暁テーマだけに表示する', () => {
	test.each([true, false])('embedded=%sでも本体の有効テーマと同じ条件で表示し、保存済み順序は読むだけ', async embedded => {
		const savedOrder = ['apps', 'hataskapps', 'home', 'cal'];
		const themes = ['akatsuki', 'kisetsu', 'kashin', 'suri', 'hatakyu', 'unknown', undefined, null, ''];
		const visible: boolean[] = [];
		for (const theme of themes) {
			const saved = { theme, akatsukiMobileTabs: [...savedOrder], akatsukiShortcut: 'meal', custom: 'keep' };
			readSettings = async () => saved;
			const { container, changed } = await mountSettings(embedded);
			expect(container.querySelector('[data-test-window]')?.getAttribute('data-test-window')).toBe(embedded ? 'embedded' : 'modal');
			const section = container.querySelector('[data-akatsuki-navigation]');
			visible.push(section != null);
			expect(navigationOrder(container)).toEqual(section ? savedOrder : []);
			if (!section) expect(container.textContent).not.toContain('スマホの下部タブ');
			expect(saved).toEqual({ theme, akatsukiMobileTabs: savedOrder, akatsukiShortcut: 'meal', custom: 'keep' });
			expect(changed).not.toHaveBeenCalled();
		}
		// Explicit 暁 is the positive control. Empty legacy values use Hatask's
		// existing default; unknown nonempty values never activate this editor.
		expect(visible).toEqual([true, false, false, false, false, false, true, true, true]);
		expect(writes()).toHaveLength(0);
	});

	test('本体が暁として扱う空のテーマ値でも並び替えを保存でき、元のテーマ値を補正保存しない', async () => {
		const saved = { theme: null, akatsukiMobileTabs: ['apps', 'hataskapps', 'home', 'cal'], custom: 'keep' };
		readSettings = async () => saved;
		const { container, changed } = await mountSettings();
		expect(navigationOrder(container)).toEqual(saved.akatsukiMobileTabs);
		expect(writes()).toHaveLength(0);
		const reordered = ['home', 'apps', 'hataskapps', 'cal'];
		dragTabs(container, reordered); await flush();
		expect(writes()).toHaveLength(1);
		expect(writes()[0][1]).toMatchObject({ value: { ...saved, akatsukiMobileTabs: reordered } });
		expect(changed).toHaveBeenCalledWith(expect.objectContaining({ ...saved, akatsukiMobileTabs: reordered }));
	});

	test('テーマ変更の保存成功後だけ表示を切り替え、失敗・往復切替でも下部タブ順を保持する', async () => {
		const saved = { theme: 'kashin', akatsukiMobileTabs: ['apps', 'hataskapps', 'home', 'cal'], akatsukiShortcut: 'meal', custom: 'keep' };
		readSettings = async () => saved;
		const { container, changed } = await mountSettings();
		let rejectSave: (error: Error) => void = () => { throw new Error('Save did not start'); };
		writeSettings = () => new Promise((_resolve, reject) => { rejectSave = reject; });
		await openThemes(container); themeButton(container, copy.themeAkatsuki).click(); await flush();
		textButton(container, copy.backToSettings).click(); await flush();
		expect(writes()).toHaveLength(1);
		expect(container.querySelector('[data-akatsuki-navigation]')).toBeNull();
		rejectSave(new Error('Offline')); await flush();
		expect(container.querySelector('[data-akatsuki-navigation]')).toBeNull();
		expect(changed).not.toHaveBeenCalled();
		writeSettings = async () => undefined;
		await openThemes(container); themeButton(container, copy.themeAkatsuki).click(); await flush();
		textButton(container, copy.backToSettings).click(); await flush();
		expect(navigationOrder(container)).toEqual(saved.akatsukiMobileTabs);
		let resolveSave: () => void = () => { throw new Error('Save did not start'); };
		writeSettings = () => new Promise<void>(resolve => { resolveSave = resolve; });
		await openThemes(container); themeButton(container, copy.themeHatakyu).click(); await flush();
		textButton(container, copy.backToSettings).click(); await flush();
		expect(navigationOrder(container)).toEqual(saved.akatsukiMobileTabs);
		expect(navButton(container, '[data-ak-menu="home"]').disabled).toBe(true);
		resolveSave(); await flush();
		expect(container.querySelector('[data-akatsuki-navigation]')).toBeNull();
		expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ ...saved, theme: 'hatakyu' }));
		writeSettings = async () => undefined;
		await openThemes(container); themeButton(container, copy.themeAkatsuki).click(); await flush();
		textButton(container, copy.backToSettings).click(); await flush();
		expect(navigationOrder(container)).toEqual(saved.akatsukiMobileTabs);
		expect(writes()).toHaveLength(4);
		for (const [, params] of writes()) expect(params).toMatchObject({ value: { akatsukiMobileTabs: saved.akatsukiMobileTabs, akatsukiShortcut: 'meal', custom: 'keep' } });
	});

	test('暁を無効にしたあとに残ったメニュー操作では順序を書き換えない', async () => {
		const saved = { theme: 'akatsuki', akatsukiMobileTabs: ['home', 'todo', 'hataskapps', 'apps'] };
		readSettings = async () => saved;
		const { container } = await mountSettings();
		const anchor = navButton(container, '[data-ak-menu="todo"]');
		const menu = openTabMenu(container, 'todo');
		await openThemes(container); themeButton(container, copy.themeSuri).click(); await flush();
		textButton(container, copy.backToSettings).click(); await flush();
		expect(container.querySelector('[data-akatsuki-navigation]')).toBeNull();
		expect(writes()).toHaveLength(1);
		menuAction(menu, 'カレンダー'); await flush();
		anchor.click(); await flush();
		expect(popupMenu).toHaveBeenCalledTimes(1);
		expect(writes()).toHaveLength(1);
		expect(writes()[0][1]).toMatchObject({ value: { ...saved, theme: 'suri' } });
	});
});

describe('暁のドラッグと項目別メニューによる4枠設定', () => {
	test('4行にそれぞれつまみと↓を用意し、旧ショートカット・左右UIを重複表示しない', async () => {
		const { container, changed } = await mountSettings();
		const section = container.querySelector('[data-akatsuki-navigation]');
		if (!section) throw new Error('Missing navigation section');
		expect(section.querySelectorAll('[data-ak-slot]')).toHaveLength(4);
		expect(section.querySelectorAll('[data-ak-menu] .ti-chevron-down')).toHaveLength(4);
		expect(section.querySelectorAll('[data-ak-drag] .ti-grip-vertical')).toHaveLength(4);
		expect(section.querySelectorAll('[data-ak-shortcut], [data-ak-move], [data-ak-replacement]')).toHaveLength(0);
		expect(section.querySelectorAll('[aria-haspopup="menu"]')).toHaveLength(4);
		expect(section.querySelector('[data-test-draggable]')?.getAttribute('data-handle')).toBe('[data-ak-drag]');
		expect(section.querySelector('[data-test-draggable]')?.getAttribute('data-disabled')).toBe('false');
		expect(navigationOrder(container)).toEqual(['home', 'todo', 'hataskapps', 'apps']);
		expect(writes()).toHaveLength(0);
		expect(changed).not.toHaveBeenCalled();
	});

	test.each([
		{ tab: 'home', active: 0, destination: '4番目（右端）', expected: ['todo', 'hataskapps', 'apps', 'home'] },
		{ tab: 'hataskapps', active: 2, destination: '1番目（左端）', expected: ['hataskapps', 'home', 'todo', 'apps'] },
	])('必須の$tabは置換項目を持たず、位置メニューからだけ並べ替える', async ({ tab, active, destination, expected }) => {
		const { container, changed } = await mountSettings();
		const menu = openTabMenu(container, tab);
		expect(menu.map(item => item.type)).toEqual(['label', 'parent']);
		expect(menu[0].text).toBe('常に表示・並べ替えのみ');
		const children = positions(menu);
		expect(children.map(item => item.text)).toEqual(['1番目（左端）', '2番目', '3番目', '4番目（右端）']);
		expect(children.map(item => item.active)).toEqual([0, 1, 2, 3].map(index => index === active));
		menuAction(children, destination);
		await flush();
		expect(navigationOrder(container)).toEqual(expected);
		expect(writes()).toHaveLength(1);
		expect(changed).toHaveBeenCalledWith(expect.objectContaining({ akatsukiMobileTabs: expected }));
	});

	test.each(['todo', 'apps'])('任意の%sには未使用の5機能だけを置換候補に出す', async tab => {
		const { container } = await mountSettings();
		const menu = openTabMenu(container, tab);
		expect(menu.filter(item => item.action).map(item => item.text)).toEqual(['カレンダー', 'きもち', 'ごはん', 'おはな', 'EYE']);
		expect(positions(menu)).toHaveLength(4);
		menuAction(menu, 'カレンダー');
		await flush();
		expect(navigationOrder(container)).toEqual(['home', 'todo', 'hataskapps', 'apps'].map(id => id === tab ? 'cal' : id));
		expect(new Set(navigationOrder(container)).size).toBe(4);
		expect(writes()).toHaveLength(1);
	});

	test('保存済みの順序・legacy shortcut・無関係な設定を保って明示した枠だけ保存する', async () => {
		const saved = { theme: 'akatsuki', akatsukiShortcut: 'mood', akatsukiMobileTabs: ['apps', 'home', 'cal', 'hataskapps'], custom: { keep: 'data' } };
		const before = JSON.stringify(saved);
		readSettings = async () => saved;
		const { container, changed } = await mountSettings();
		expect(navigationOrder(container)).toEqual(saved.akatsukiMobileTabs);
		expect(writes()).toHaveLength(0);
		menuAction(openTabMenu(container, 'cal'), 'ごはん');
		await flush();
		const expected = { ...saved, akatsukiMobileTabs: ['apps', 'home', 'meal', 'hataskapps'] };
		expect(writes()).toHaveLength(1);
		expect(writes()[0][1]).toMatchObject({ key: 'settings', scope: ['client', 'hatask'], value: expected });
		expect(changed).toHaveBeenCalledWith(expect.objectContaining(expected));
		expect(JSON.stringify(saved)).toBe(before);
	});

	test('表示用の旧設定補完は自動保存せず、壊れた配列もlegacy shortcutで表示する', async () => {
		readSettings = async () => ({ theme: 'akatsuki', akatsukiMobileTabs: ['apps', 'mood', 'cal', 'home'], akatsukiShortcut: 'meal' });
		const legacy = await mountSettings();
		expect(navigationOrder(legacy.container)).toEqual(['apps', 'mood', 'hataskapps', 'home']);
		readSettings = async () => ({ theme: 'akatsuki', akatsukiMobileTabs: ['home', 'home'], akatsukiShortcut: 'meal' });
		const invalid = await mountSettings();
		expect(navigationOrder(invalid.container)).toEqual(['home', 'meal', 'hataskapps', 'apps']);
		expect(writes()).toHaveLength(0);
		expect(legacy.changed).not.toHaveBeenCalled();
		expect(invalid.changed).not.toHaveBeenCalled();
	});

	test('読込失敗は並べ替え部品を出さず、明示的な再読込後にも自動保存しない', async () => {
		readSettings = async () => { throw new Error('Offline'); };
		const { container, changed } = await mountSettings();
		expect(container.querySelector('[data-test-draggable]')).toBeNull();
		readSettings = async () => ({ theme: 'akatsuki', akatsukiMobileTabs: ['home', 'meal', 'hataskapps', 'apps'] });
		textButton(container, i18n.ts._hata._hatask._planner.retry).click();
		await flush();
		expect(navigationOrder(container)).toEqual(['home', 'meal', 'hataskapps', 'apps']);
		expect(writes()).toHaveLength(0);
		expect(changed).not.toHaveBeenCalled();
	});

	test.each([
		{ order: ['todo', 'hataskapps', 'apps', 'home'] },
		{ order: ['todo', 'home', 'hataskapps', 'apps'] },
		{ order: ['hataskapps', 'home', 'todo', 'apps'] },
		{ order: ['apps', 'home', 'todo', 'hataskapps'] },
	])('必須を含む各項目をドラッグで移動でき、tab IDに対応する行DOMを維持する: $order', async ({ order }) => {
		const { container, changed } = await mountSettings();
		const rows = new Map([...container.querySelectorAll<HTMLElement>('[data-ak-slot]')].map(row => [row.dataset.tab, row]));
		dragTabs(container, Object.freeze([...order]));
		await flush();
		expect(navigationOrder(container)).toEqual(order);
		for (const row of container.querySelectorAll<HTMLElement>('[data-ak-slot]')) expect(row).toBe(rows.get(row.dataset.tab));
		expect(writes()).toHaveLength(1);
		expect(writes()[0][1]).toMatchObject({ value: { akatsukiMobileTabs: order } });
		expect(changed).toHaveBeenCalledTimes(1);
	});

	test.each([
		null, 'home', [], ['home', 'todo', 'hataskapps'], ['home', 'todo', 'hataskapps', 'apps', 'cal'],
		['home', 'todo', 'todo', 'apps'], ['home', 'todo', 'cal', 'apps'], ['home', 'todo', 'hataskapps', 'games'],
	].map(value => ({ value })))('不正なdrag入力を既定に置換保存せず拒否する: $value', async ({ value }) => {
		const { container, changed } = await mountSettings();
		dragTabs(container, value);
		await flush();
		expect(navigationOrder(container)).toEqual(['home', 'todo', 'hataskapps', 'apps']);
		expect(writes()).toHaveLength(0);
		expect(changed).not.toHaveBeenCalled();
	});

	test('同順序のdragと現在位置の選択は保存せず、古いメニューからの重複選択も拒否する', async () => {
		const { container, changed } = await mountSettings();
		dragTabs(container, ['home', 'todo', 'hataskapps', 'apps']);
		menuAction(positions(openTabMenu(container, 'home')), '1番目（左端）');
		await flush();
		expect(writes()).toHaveLength(0);
		const stale = openTabMenu(container, 'todo');
		menuAction(openTabMenu(container, 'apps'), 'カレンダー');
		await flush();
		expect(writes()).toHaveLength(1);
		menuAction(stale, 'カレンダー');
		await flush();
		expect(navigationOrder(container)).toEqual(['home', 'todo', 'hataskapps', 'cal']);
		expect(writes()).toHaveLength(1);
		expect(changed).toHaveBeenCalledTimes(1);
	});

	test('drag保存中は仮の並びだけ表示して全操作を止め、失敗時は元へ戻し成功後だけchangedを通知する', async () => {
		let rejectSave: (error: Error) => void = () => { throw new Error('Save did not start'); };
		writeSettings = () => new Promise((_resolve, reject) => { rejectSave = reject; });
		const { container, changed } = await mountSettings();
		const stale = openTabMenu(container, 'todo');
		const order = ['todo', 'hataskapps', 'apps', 'home'];
		dragTabs(container, order);
		await flush();
		expect(writes()).toHaveLength(1); // Positive control: the API write actually began.
		expect(navigationOrder(container)).toEqual(order);
		expect(container.querySelector('[data-test-draggable]')?.getAttribute('data-disabled')).toBe('true');
		expect([...container.querySelectorAll<HTMLButtonElement>('[data-akatsuki-navigation] button')].every(button => button.disabled)).toBe(true);
		dragTabs(container, ['apps', 'hataskapps', 'todo', 'home']);
		menuAction(stale, 'カレンダー');
		navButton(container, '[data-ak-menu="home"]').click();
		await flush();
		expect(popupMenu).toHaveBeenCalledTimes(1);
		expect(writes()).toHaveLength(1);
		expect(navigationOrder(container)).toEqual(order);
		expect(changed).not.toHaveBeenCalled();
		rejectSave(new Error('Offline'));
		await flush();
		expect(container.querySelector('[role="alert"]')?.textContent).toBe(copy.saveFailure);
		expect(navigationOrder(container)).toEqual(['home', 'todo', 'hataskapps', 'apps']);
		expect(container.querySelector('[data-test-draggable]')?.getAttribute('data-disabled')).toBe('false');
		expect(changed).not.toHaveBeenCalled();
		writeSettings = async () => undefined;
		dragTabs(container, order);
		await flush();
		expect(writes()).toHaveLength(2);
		expect(changed).toHaveBeenCalledTimes(1);
		expect(changed).toHaveBeenCalledWith(expect.objectContaining({ akatsukiMobileTabs: order }));
		expect(navigationOrder(container)).toEqual(order);
	});

	test('メニューの置換は保存成功まで表示を変えず、失敗後もlegacy shortcutと無関係な設定を保つ', async () => {
		const saved = { theme: 'akatsuki', akatsukiShortcut: 'eye', akatsukiMobileTabs: ['home', 'todo', 'hataskapps', 'apps'], custom: 'keep' };
		readSettings = async () => saved;
		let rejectSave: (error: Error) => void = () => { throw new Error('Save did not start'); };
		writeSettings = () => new Promise((_resolve, reject) => { rejectSave = reject; });
		const { container, changed } = await mountSettings();
		menuAction(openTabMenu(container, 'todo'), 'ごはん');
		await flush();
		expect(writes()).toHaveLength(1);
		expect(navigationOrder(container)).toEqual(saved.akatsukiMobileTabs);
		expect(changed).not.toHaveBeenCalled();
		rejectSave(new Error('Offline'));
		await flush();
		expect(navigationOrder(container)).toEqual(saved.akatsukiMobileTabs);
		expect(changed).not.toHaveBeenCalled();
		writeSettings = async () => undefined;
		menuAction(openTabMenu(container, 'todo'), 'ごはん');
		await flush();
		expect(writes()).toHaveLength(2);
		expect(writes()[1][1]).toMatchObject({ value: { ...saved, akatsukiMobileTabs: ['home', 'meal', 'hataskapps', 'apps'] } });
		expect(changed).toHaveBeenCalledTimes(1);
	});

	test('メニュー閉鎖後も保存中はフォーカスを戻さず、成功後に新しい項目の↓へ戻す', async () => {
		let finishSave: () => void = () => { throw new Error('Save did not start'); };
		writeSettings = () => new Promise<void>(resolve => { finishSave = resolve; });
		const closeMenu = deferMenuClose();
		const { container, changed } = await mountSettings();
		const anchor = navButton(container, '[data-ak-menu="todo"]');
		anchor.focus();
		const restoreFocus = vi.spyOn(anchor, 'focus');
		menuAction(openTabMenu(container, 'todo'), 'カレンダー');
		await flush();
		expect(writes()).toHaveLength(1);
		expect(anchor.disabled).toBe(true);
		anchor.blur();
		closeMenu();
		await flush();
		// Happy DOM can retain a disabled anchor after blur; assert that the
		// application has not attempted focus restoration before saving settles.
		expect(restoreFocus).not.toHaveBeenCalled();
		expect(changed).not.toHaveBeenCalled();
		finishSave();
		await flush(); await flush();
		expect(anchor.isConnected).toBe(false);
		expect(window.document.activeElement).toBe(navButton(container, '[data-ak-menu="cal"]'));
		expect(changed).toHaveBeenCalledTimes(1);
	});

	test('メニューでの保存失敗時は元の項目の↓へフォーカスを戻す', async () => {
		let rejectSave: (error: Error) => void = () => { throw new Error('Save did not start'); };
		writeSettings = () => new Promise((_resolve, reject) => { rejectSave = reject; });
		const closeMenu = deferMenuClose();
		const { container, changed } = await mountSettings();
		const anchor = navButton(container, '[data-ak-menu="todo"]');
		anchor.focus();
		menuAction(openTabMenu(container, 'todo'), 'カレンダー');
		await flush();
		expect(writes()).toHaveLength(1);
		anchor.blur(); closeMenu();
		await flush();
		rejectSave(new Error('Offline'));
		await flush(); await flush();
		expect(window.document.activeElement).toBe(anchor);
		expect(anchor.disabled).toBe(false);
		expect(navigationOrder(container)).toEqual(['home', 'todo', 'hataskapps', 'apps']);
		expect(changed).not.toHaveBeenCalled();
	});

	test('保存中に利用者が別の操作へ移したフォーカスは奪わない', async () => {
		let finishSave: () => void = () => { throw new Error('Save did not start'); };
		writeSettings = () => new Promise<void>(resolve => { finishSave = resolve; });
		const closeMenu = deferMenuClose();
		const { container } = await mountSettings();
		menuAction(openTabMenu(container, 'todo'), 'カレンダー');
		await flush();
		const other = textButton(container, copy.openThemeSettings);
		other.focus(); closeMenu();
		await flush();
		finishSave();
		await flush(); await flush();
		expect(navigationOrder(container)).toEqual(['home', 'cal', 'hataskapps', 'apps']);
		expect(window.document.activeElement).toBe(other);
	});

	test('位置だけ変えた場合は同じ項目の↓を新しい位置でフォーカスする', async () => {
		const closeMenu = deferMenuClose();
		const { container } = await mountSettings();
		const anchor = navButton(container, '[data-ak-menu="home"]');
		anchor.focus();
		menuAction(positions(openTabMenu(container, 'home')), '4番目（右端）');
		anchor.blur();
		await flush();
		closeMenu();
		await flush(); await flush();
		expect(navigationOrder(container)).toEqual(['todo', 'hataskapps', 'apps', 'home']);
		expect(navButton(container, '[data-ak-menu="home"]')).toBe(anchor);
		expect(window.document.activeElement).toBe(anchor);
	});
});
