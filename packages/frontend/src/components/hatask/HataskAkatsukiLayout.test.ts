/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp, defineComponent, h, nextTick, onMounted, onUnmounted, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import HataskAkatsukiLayout from './HataskAkatsukiLayout.vue';
import type { App } from 'vue';
import type { HataskAkatsukiLayoutProps } from './hatask-akatsuki-types.js';
import { getHataskDaylightStyle } from '@/utility/hatask-daylight.js';
import { globalEvents } from '@/events.js';

const mounted: { app: App<Element>; container: HTMLDivElement }[] = [];
let size = { width: 1200, height: 800 };
let prefersReducedMotion = false;
let resizeCallbacks: (() => void)[] = [];
let motionCallbacks: (() => void)[] = [];

beforeEach(() => {
	size = { width: 1200, height: 800 };
	prefersReducedMotion = false;
	resizeCallbacks = [];
	motionCallbacks = [];
	vi.stubGlobal('ResizeObserver', class {
		constructor(callback: () => void) { resizeCallbacks.push(callback); }
		observe() {}
		unobserve() {}
		disconnect() {}
	});
	vi.stubGlobal('matchMedia', vi.fn(() => ({ get matches() { return prefersReducedMotion; }, addEventListener: vi.fn((_type: string, callback: () => void) => { motionCallbacks.push(callback); }), removeEventListener: vi.fn() })));
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
		return { width: this.classList.contains('hak-body') ? size.width - 64 : size.width, height: size.height, x: 0, y: 0, top: 0, right: size.width, bottom: size.height, left: 0, toJSON: () => ({}) } as DOMRect;
	});
	vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
	for (const item of mounted.splice(0)) { item.app.unmount(); item.container.remove(); }
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

async function mountLayout(options: Partial<HataskAkatsukiLayoutProps> = {}) {
	const liveProps = reactive<HataskAkatsukiLayoutProps>({ enabled: true, activeTab: 'home', model: {}, now: new Date(2026, 8, 5, 13, 24), searchQuery: '', searchOpen: false, ...options });
	const handlers = { navigate: vi.fn(), settings: vi.fn(), search: vi.fn(), closeSearch: vi.fn(), action: vi.fn(), slotMounted: vi.fn(), slotUnmounted: vi.fn() };
	const Child = defineComponent({ setup() { onMounted(handlers.slotMounted); onUnmounted(handlers.slotUnmounted); return () => h('input', { 'data-draft': '', value: '' }); } });
	const app = createApp({ render: () => h(HataskAkatsukiLayout, { ...liveProps, 'onUpdate:searchQuery': (value: string) => { liveProps.searchQuery = value; }, onCloseSearch: () => { liveProps.searchOpen = false; handlers.closeSearch(); }, onNavigate: handlers.navigate, onSettings: handlers.settings, onSearch: handlers.search, onAction: handlers.action }, { default: () => h(Child), 'home-extra': () => h('div', { 'data-home-extra': '' }, '保存済みの補足'), 'search-results': () => h('div', { 'data-search-results': '' }, liveProps.searchQuery) }) });
	const container = window.document.createElement('div');
	window.document.body.append(container);
	app.mount(container);
	mounted.push({ app, container });
	await nextTick();
	await nextTick();
	return { container, liveProps, handlers };
}

function required<T extends Element = HTMLElement>(container: ParentNode, selector: string): T {
	const result = container.querySelector<T>(selector);
	if (!result) throw new Error(`Expected control: ${selector}`);
	return result;
}

function click(container: ParentNode, selector: string) { required<HTMLButtonElement>(container, selector).click(); }

function sideModel(): HataskAkatsukiLayoutProps['model'] {
	return {
		week: ['月', '火', '水', '木', '金', '土', '日'].map((label, index) => ({ id: `day-${index}`, label, description: index === 6 ? 'まだ記録していません' : '穏やかな一日', emoji: index === 6 ? undefined : '🙂', pending: index === 6, today: index === 6 })),
		flower: { name: '大切なお花', progress: 45, detail: '育てています' },
		mealSummary: '朝と昼を記録しました',
		streakLabel: '3日続いています',
		rankLabel: 'RANK 2',
		eye: { text: 'ひと息いれましょう', number: 3 },
		todos: [
			{ id: 'todo-open', title: '買い物', completed: false },
			{ id: 'todo-done', title: '散歩', completed: true },
			{ id: 'todo-readonly', title: '共有メモ', readOnly: true },
		],
		apps: [{ id: 'feed', label: 'HataFeed', icon: 'ti ti-message', description: '要望や不具合を送る' }],
	};
}

function searchDisclosure(container: ParentNode, opened: boolean): HTMLElement {
	const wrapper = required<HTMLElement>(container, '.hak-search-disclosure');
	expect(wrapper.getAttribute('data-open')).toBe(String(opened));
	expect(wrapper.getAttribute('aria-hidden')).toBe(String(!opened));
	expect(wrapper.hasAttribute('inert')).toBe(!opened);
	return wrapper;
}

function observeTabMotion(container: ParentNode) {
	const animations: { cancel: ReturnType<typeof vi.fn>; onfinish: (() => void) | null }[] = [];
	const animate = vi.fn(() => {
		const animation = { cancel: vi.fn(), onfinish: null as (() => void) | null };
		animations.push(animation);
		return animation;
	});
	Object.defineProperty(required(container, '.hak-center'), 'animate', { configurable: true, value: animate });
	return { animate, animations };
}

describe('HataskAkatsukiLayout', () => {
	test('all categories fade without remounting the draft or making visibility depend on finish', async () => {
		const { container, liveProps, handlers } = await mountLayout();
		const { animate, animations } = observeTabMotion(container);
		const draft = required<HTMLInputElement>(container, '[data-draft]');
		draft.value = 'カテゴリを移っても残る入力';
		for (const tab of ['cal', 'todo', 'garden', 'eye', 'mood', 'meal', 'hataskapps', 'apps', 'home'] as const) {
			liveProps.activeTab = tab;
			await nextTick();
			await nextTick();
			expect(required(container, '.htk-akatsuki-layout').getAttribute('data-tab')).toBe(tab);
			expect(required(container, '[data-draft]')).toBe(draft);
			expect(draft.value).toBe('カテゴリを移っても残る入力');
		}
		expect(animate).toHaveBeenCalledTimes(9);
		for (const animation of animations.slice(0, -1)) expect(animation.cancel).toHaveBeenCalledTimes(1);
		expect(animate).toHaveBeenLastCalledWith([{ opacity: expect.any(Number) }, { opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2, 0, 0, 1)' });
		expect(required<HTMLElement>(container, '.hak-center').style.opacity).toBe('');
		expect(handlers.slotMounted).toHaveBeenCalledTimes(1);
		expect(handlers.slotUnmounted).not.toHaveBeenCalled();
	});

	test('an interrupted fade starts at its current opacity and releases itself on finish', async () => {
		const { container, liveProps } = await mountLayout();
		const { animate, animations } = observeTabMotion(container);
		liveProps.activeTab = 'cal';
		await nextTick();
		await nextTick();
		vi.spyOn(window, 'getComputedStyle').mockReturnValue({ opacity: '.64' } as CSSStyleDeclaration);
		liveProps.activeTab = 'todo';
		await nextTick();
		await nextTick();
		expect(animations[0].cancel).toHaveBeenCalledTimes(1);
		expect(animate).toHaveBeenLastCalledWith([{ opacity: .64 }, { opacity: 1 }], expect.any(Object));
		animations[1].onfinish?.();
		liveProps.activeTab = 'eye';
		await nextTick();
		await nextTick();
		expect(animations[1].cancel).not.toHaveBeenCalled();
		expect(animate).toHaveBeenLastCalledWith([{ opacity: .2 }, { opacity: 1 }], expect.any(Object));
	});

	test('motion settings, reduced motion and unmount cancel a running category fade', async () => {
		const { container, liveProps } = await mountLayout({ animations: false });
		const { animate, animations } = observeTabMotion(container);
		liveProps.activeTab = 'cal';
		await nextTick();
		await nextTick();
		expect(animate).not.toHaveBeenCalled();
		liveProps.animations = true;
		liveProps.activeTab = 'todo';
		await nextTick();
		await nextTick();
		liveProps.animations = false;
		await nextTick();
		expect(animations[0].cancel).toHaveBeenCalledTimes(1);
		liveProps.animations = true;
		liveProps.activeTab = 'garden';
		await nextTick();
		await nextTick();
		prefersReducedMotion = true;
		motionCallbacks.forEach(callback => callback());
		await nextTick();
		expect(animations[1].cancel).toHaveBeenCalledTimes(1);
		expect(required(container, '.htk-akatsuki-layout').getAttribute('data-motion')).toBe('off');
		prefersReducedMotion = false;
		motionCallbacks.forEach(callback => callback());
		liveProps.activeTab = 'eye';
		await nextTick();
		await nextTick();
		mounted[0].app.unmount();
		mounted.shift()?.container.remove();
		expect(animations[2].cancel).toHaveBeenCalledTimes(1);
	});

	test('clock colors blend between ticks, pair with dark mode and do not leak into old themes', async () => {
		const { container, liveProps } = await mountLayout({ now: new Date(2026, 8, 5, 6), mode: 'light' });
		const root = required<HTMLElement>(container, '.htk-akatsuki-layout');
		const checkColors = () => {
			if (!liveProps.now || !liveProps.mode) throw new Error('Clock test requires an explicit date and mode');
			for (const [name, value] of Object.entries(getHataskDaylightStyle(liveProps.now, liveProps.mode))) expect(root.style.getPropertyValue(name)).toBe(value);
		};
		checkColors();
		expect(root.style.getPropertyValue('--hak-daylight-duration')).toBe('0s');
		liveProps.now = new Date(2026, 8, 5, 12);
		await nextTick();
		checkColors();
		expect(root.style.getPropertyValue('--hak-daylight-duration')).toBe('30s');
		liveProps.mode = 'dark';
		await nextTick();
		checkColors();
		expect(root.style.getPropertyValue('--hak-daylight-duration')).toBe('220ms');
		liveProps.animations = false;
		await nextTick();
		expect(root.style.getPropertyValue('--hak-daylight-duration')).toBe('0s');
		liveProps.enabled = false;
		await nextTick();
		expect(root.getAttribute('style') ?? '').not.toContain('--hak-daylight-');
	});

	test('user theme changes blend promptly and release the existing event subscription on disable/unmount', async () => {
		const listeners = globalEvents.listenerCount('themeChanging');
		const { container, liveProps } = await mountLayout({ now: new Date(2026, 8, 5, 6), mode: 'light' });
		const root = required<HTMLElement>(container, '.htk-akatsuki-layout');
		expect(globalEvents.listenerCount('themeChanging')).toBe(listeners + 1);
		liveProps.now = new Date(2026, 8, 5, 7);
		await nextTick();
		expect(root.style.getPropertyValue('--hak-daylight-duration')).toBe('30s');
		globalEvents.emit('themeChanging');
		expect(root.style.getPropertyValue('--hak-daylight-duration')).toBe('220ms');
		await nextTick();
		expect(root.style.getPropertyValue('--hak-daylight-duration')).toBe('220ms');
		expect(root.style.getPropertyValue('--hak-daylight-start')).toContain('var(--MI_THEME-accent,');
		liveProps.animations = false;
		globalEvents.emit('themeChanging');
		await nextTick();
		expect(root.style.getPropertyValue('--hak-daylight-duration')).toBe('0s');
		liveProps.enabled = false;
		await nextTick(); await nextTick();
		expect(globalEvents.listenerCount('themeChanging')).toBe(listeners);
		liveProps.enabled = true;
		await nextTick(); await nextTick();
		expect(globalEvents.listenerCount('themeChanging')).toBe(listeners + 1);
		const item = mounted.pop();
		item?.app.unmount(); item?.container.remove();
		expect(globalEvents.listenerCount('themeChanging')).toBe(listeners);
	});

	test('disabled layout keeps one original child and does not render Akatsuki controls', async () => {
		const { container, handlers } = await mountLayout({ enabled: false });
		expect(container.querySelectorAll('[data-draft]')).toHaveLength(1);
		expect(required(container, '.htk-akatsuki-layout').getAttribute('data-enabled')).toBe('false');
		expect(container.querySelector('.hak-rail')).toBeNull();
		expect(container.querySelector('.hak-home')).toBeNull();
		expect(container.querySelector('.hak-bottom')).toBeNull();
		expect(handlers.slotMounted).toHaveBeenCalledTimes(1);
	});

	test('Akatsuki and legacy theme switches preserve the exact draft node and slot instance', async () => {
		const { container, liveProps, handlers } = await mountLayout({ enabled: false, activeTab: 'mood' });
		const draft = required<HTMLInputElement>(container, '[data-draft]');
		draft.value = 'テーマを切り替えても残す下書き';
		for (const enabled of [true, false, true, false]) {
			liveProps.enabled = enabled;
			await nextTick();
			await nextTick();
			expect(required(container, '[data-draft]')).toBe(draft);
			expect(draft.value).toBe('テーマを切り替えても残す下書き');
		}
		expect(handlers.slotMounted).toHaveBeenCalledTimes(1);
		expect(handlers.slotUnmounted).not.toHaveBeenCalled();
	});

	test('tab changes keep the single default slot and its draft input mounted', async () => {
		const { container, liveProps, handlers } = await mountLayout({ activeTab: 'todo' });
		const draft = required<HTMLInputElement>(container, '[data-draft]');
		draft.value = 'まだ保存していない記録';
		liveProps.activeTab = 'mood';
		await nextTick();
		liveProps.activeTab = 'home';
		await nextTick();
		liveProps.activeTab = 'meal';
		await nextTick();
		expect(required(container, '[data-draft]')).toBe(draft);
		expect(draft.value).toBe('まだ保存していない記録');
		expect(container.querySelectorAll('[data-draft]')).toHaveLength(1);
		expect(handlers.slotMounted).toHaveBeenCalledTimes(1);
		expect(handlers.slotUnmounted).not.toHaveBeenCalled();
	});

	test('portrait non-home hides the aside and home restores it using element size', async () => {
		size = { width: 820, height: 1180 };
		const { container, liveProps } = await mountLayout({ activeTab: 'todo' });
		const root = required(container, '.htk-akatsuki-layout');
		expect(root.getAttribute('data-hide-aside')).toBe('true');
		liveProps.activeTab = 'home';
		await nextTick();
		expect(root.getAttribute('data-hide-aside')).toBe('false');
		size = { width: 1180, height: 820 };
		resizeCallbacks.forEach(callback => callback());
		liveProps.activeTab = 'todo';
		await nextTick();
		expect(root.getAttribute('data-hide-aside')).toBe('false');
	});

	test('narrow app body hides the aside without hiding a wide landscape home', async () => {
		size = { width: 820, height: 600 };
		const { container, liveProps } = await mountLayout({ activeTab: 'apps' });
		expect(required(container, '.htk-akatsuki-layout').getAttribute('data-hide-aside')).toBe('true');
		liveProps.activeTab = 'home';
		await nextTick();
		expect(required(container, '.htk-akatsuki-layout').getAttribute('data-hide-aside')).toBe('false');
	});

	test('右ペインは記録・お花・ごはん・継続・EYE・ToDo・Appsをそれぞれ一つのケースで包む', async () => {
		const { container } = await mountLayout({ model: sideModel() });
		const aside = required(container, '.hak-side');
		const cases = [...aside.querySelectorAll('.hak-side-case')];
		expect(cases).toHaveLength(7);
		for (const item of cases) expect(item.parentElement).toBe(aside);
		for (const [index, selector] of ['.hak-record-case', '.hak-flower-row', '.hak-meal-row', '.hak-streak', '.hak-side-eye', '.hak-todo-block', '.hak-side-apps'].entries()) {
			expect(cases[index]).toBe(required(aside, selector));
		}
		const recordCase = required(aside, '.hak-record-case');
		expect(required(recordCase, 'h2').textContent).toBe('きろく');
		expect(recordCase.querySelectorAll('.hak-week-day')).toHaveLength(7);
		expect(required(recordCase, '.hak-week').getAttribute('aria-label')).toBe('今週のきもち');
		expect(required(aside, '.hak-todo-block h3').textContent).toBe('ToDo');
		expect(required(aside, '.hak-side-apps h3').textContent).toBe('Apps');
		expect(required(aside, '.hak-side-apps .hak-side-row').classList.contains('hak-side-case')).toBe(false);
	});

	test('右ペインのケース化で既存操作・完了状態・読み取り専用の制約を変えない', async () => {
		const model = sideModel();
		const original = JSON.stringify(model);
		const { container, liveProps, handlers } = await mountLayout({ model });
		const aside = required(container, '.hak-side');
		for (const day of aside.querySelectorAll<HTMLButtonElement>('.hak-week-day')) day.click();
		click(aside, '.hak-flower-row');
		expect(handlers.navigate.mock.calls).toEqual([...Array.from({ length: 7 }, () => ['mood']), ['garden']]);
		click(aside, '.hak-meal-row button');
		click(aside, '.hak-side-eye');
		const todos = [...aside.querySelectorAll<HTMLButtonElement>('.hak-todo-row')];
		expect(todos.map(todo => todo.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
		expect(todos.map(todo => todo.disabled)).toEqual([false, false, true]);
		for (const todo of todos) todo.click();
		click(aside, '.hak-side-apps button');
		expect(handlers.action.mock.calls).toEqual([
			[{ type: 'record-meal' }],
			[{ type: 'open-eye' }],
			[{ type: 'toggle-todo', id: 'todo-open', value: true }],
			[{ type: 'toggle-todo', id: 'todo-done', value: false }],
			[{ type: 'open-app', id: 'feed' }],
		]);
		expect(JSON.stringify(liveProps.model)).toBe(original);
	});

	test('読込中は記録ケース内の案内だけを表示し、読込後に保存済みの内容を戻す', async () => {
		const { container, liveProps, handlers } = await mountLayout({ model: { ...sideModel(), loading: true } });
		const aside = required(container, '.hak-side');
		const recordCase = required(aside, '.hak-record-case');
		expect(aside.querySelectorAll('.hak-side-case')).toHaveLength(1);
		expect(recordCase.textContent).toContain('記録を読み込んでいます');
		expect(aside.querySelector('button')).toBeNull();
		liveProps.model.loading = false;
		await nextTick();
		expect(required(aside, '.hak-record-case')).toBe(recordCase);
		expect(aside.querySelectorAll('.hak-side-case')).toHaveLength(7);
		expect(aside.textContent).not.toContain('記録を読み込んでいます');
		expect(handlers.action).not.toHaveBeenCalled();
		expect(handlers.navigate).not.toHaveBeenCalled();
		liveProps.model = {};
		await nextTick();
		expect(aside.querySelectorAll('.hak-side-case')).toHaveLength(1);
		expect(aside.querySelector('button')).toBeNull();
	});

	test('both app destinations are reachable from the desktop rail', async () => {
		const { container, handlers } = await mountLayout();
		click(container, '.hak-rail [aria-label="Hatask App"]');
		click(container, '.hak-rail [aria-label="Hataskey App"]');
		expect(handlers.navigate.mock.calls).toEqual([['hataskapps'], ['apps']]);
	});

	test('the desktop brand sits immediately right of the hamburger in one vertically centered row', async () => {
		const { container } = await mountLayout();
		const header = required(container, '.hak-rail > .hak-rail-head');
		expect([...header.children].map(element => element.className)).toEqual(['hak-rail-menu hak-icon', 'hak-rail-brand hak-brand']);
		expect(required(header, '.hak-rail-brand').textContent).toBe('Hatask');
		expect(required(header, '.hak-rail-menu').getAttribute('aria-label')).toBe('メニューを開閉');
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiLayout.vue'), 'utf8');
		expect(source).toMatch(/\.hak-rail-head\s*\{\s*display:\s*flex;\s*align-items:\s*center;/u);
		expect(source).toMatch(/\.hak-rail-brand\s*\{\s*font-size:\s*20px;\s*white-space:\s*nowrap;\s*\}/u);
		expect(source).toMatch(/\.hak-brand\s*\{[^}]*font-family:\s*'Righteous'/u);
	});

	test('the expanded hamburger and tab icon columns share a horizontal center', async () => {
		const { container } = await mountLayout();
		expect(required(container, '.htk-akatsuki-layout').getAttribute('data-rail-collapsed')).toBe('false');
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiLayout.vue'), 'utf8');
		const menu = source.match(/\.htk-akatsuki-layout \.hak-rail-menu\s*\{([^}]+)\}/u)?.[1];
		const tab = source.match(/\.hak-rail-tab\s*\{([^}]+)\}/u)?.[1];
		const icon = source.match(/\.hak-rail-tab > \.ti\s*\{([^}]+)\}/u)?.[1];
		if (!menu || !tab || !icon) throw new Error('Actual rail layout rules are required');
		const menuWidth = Number(menu.match(/\bwidth:\s*(\d+)px;/u)?.[1]);
		const tabPadding = Number(tab.match(/\bpadding:\s*0 (\d+)px !important;/u)?.[1]);
		const iconWidth = Number(icon.match(/\bwidth:\s*(\d+)px;/u)?.[1]);
		const iconHeight = Number(icon.match(/\bheight:\s*(\d+)px;/u)?.[1]);
		expect(Number.isFinite(menuWidth + tabPadding + iconWidth)).toBe(true);
		const tabIconCenter = tabPadding + iconWidth / 2;
		expect(40 / 2, 'the previous 40px hamburger reproduces the left offset').not.toBe(tabIconCenter);
		expect(menuWidth / 2).toBe(tabIconCenter);
		expect(icon).toMatch(/\bdisplay:\s*grid;/u);
		expect(icon).toMatch(/\bplace-items:\s*center;/u);
		expect(icon).toContain(`flex: 0 0 ${iconWidth}px;`);
		expect(iconHeight).toBe(iconWidth);
	});

	test('railのアイコンは意味をボタン側に残し、ハンバーガーも正方形の字形枠を使う', async () => {
		const { container } = await mountLayout();
		const buttons = [...container.querySelectorAll<HTMLButtonElement>('.hak-rail button')];
		expect(buttons).toHaveLength(11);
		for (const button of buttons) {
			expect(button.getAttribute('aria-label')?.length).toBeGreaterThan(0);
			const icons = [...button.querySelectorAll('.ti')];
			expect(icons).toHaveLength(1);
			expect(icons[0].parentElement).toBe(button);
			expect(icons[0].getAttribute('aria-hidden')).toBe('true');
		}
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiLayout.vue'), 'utf8');
		const menuIcon = source.match(/\.hak-rail-menu > \.ti\s*\{([^}]+)\}/u)?.[1];
		if (!menuIcon) throw new Error('Actual hamburger icon rule is required');
		expect(menuIcon).toContain('width: 21px;');
		expect(menuIcon).toContain('height: 21px;');
		expect(menuIcon).toContain('display: grid;');
		expect(menuIcon).toContain('place-items: center;');
	});

	test('the collapsed hamburger centers within the same rail as its tab buttons', async () => {
		const { container } = await mountLayout();
		const menu = required<HTMLButtonElement>(container, '.hak-rail-menu');
		menu.click();
		await nextTick();
		expect(required(container, '.htk-akatsuki-layout').getAttribute('data-rail-collapsed')).toBe('true');
		expect(menu.getAttribute('aria-expanded')).toBe('false');
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiLayout.vue'), 'utf8');
		expect(source).toMatch(/\[data-rail-collapsed='true'\] \.hak-rail-head\s*\{\s*justify-content:\s*center;/u);
		expect(source).toMatch(/\[data-rail-collapsed='true'\] \.hak-rail-brand,[^}]*display:\s*none;/u);
		expect(source).toMatch(/\[data-rail-collapsed='true'\] \.hak-rail-tab\s*\{[^}]*justify-content:\s*center;[^}]*padding-inline:\s*0 !important;/u);
		menu.click();
		await nextTick();
		expect(required(container, '.htk-akatsuki-layout').getAttribute('data-rail-collapsed')).toBe('false');
		expect(menu.getAttribute('aria-expanded')).toBe('true');
	});

	test('Hatask App stays in mobile navigation and the optional Hataskey App retains its home return link', async () => {
		size = { width: 390, height: 790 };
		const { container, liveProps, handlers } = await mountLayout({ model: { mobileTabs: ['home', 'cal', 'hataskapps', 'mood'] } });
		const returnIds = () => [...container.querySelectorAll('[data-app-return]')].map(button => button.getAttribute('data-app-return'));
		expect(returnIds()).toEqual(['apps']);
		click(container, '.hak-mobile-tab[aria-label="Hatask App"]');
		click(container, '[data-app-return="apps"]');
		expect(handlers.navigate.mock.calls).toEqual([['hataskapps'], ['apps']]);
		expect(liveProps.model.mobileTabs).toEqual(['home', 'cal', 'hataskapps', 'mood']);
		liveProps.model.mobileTabs = ['hataskapps', 'apps', 'cal', 'home'];
		await nextTick();
		expect(returnIds()).toEqual([]);
		expect([...container.querySelectorAll('.hak-mobile-tab')].map(button => button.getAttribute('aria-label'))).toEqual(['Hatask App', 'Hataskey App', 'カレンダー', 'ホーム']);
		expect(liveProps.model.mobileTabs).toEqual(['hataskapps', 'apps', 'cal', 'home']);
		liveProps.model.mobileTabs = ['home', 'cal', 'todo', 'hataskapps'];
		size = { width: 1200, height: 800 };
		resizeCallbacks.forEach(callback => callback());
		await nextTick();
		expect(container.querySelector('.hak-app-return')).toBeNull();
		expect(liveProps.model.mobileTabs).toEqual(['home', 'cal', 'todo', 'hataskapps']);
	});

	test.each([
		{ saved: ['home', 'cal', 'todo', 'mood'], labels: ['ホーム', 'カレンダー', 'ToDo', 'Hatask App'] },
		{ saved: ['cal', 'todo', 'mood', 'home'], labels: ['カレンダー', 'ToDo', 'Hatask App', 'ホーム'] },
		{ saved: ['home', 'todo', 'todo', 'apps'], labels: ['ホーム', 'ToDo', 'Hatask App', 'Hataskey App'] },
		{ saved: ['cal', 'todo', 'hataskapps', 'apps'], labels: ['ホーム', 'ToDo', 'Hatask App', 'Hataskey App'] },
	] satisfies { saved: NonNullable<HataskAkatsukiLayoutProps['model']['mobileTabs']>; labels: string[] }[])('mobile navigation repairs missing mandatory tabs or duplicates only for display: $saved', async ({ saved, labels }) => {
		size = { width: 390, height: 790 };
		const original = [...saved];
		const { container, liveProps } = await mountLayout({ model: { mobileTabs: saved } });
		const rendered = [...container.querySelectorAll('.hak-mobile-tab')].map(button => button.getAttribute('aria-label'));
		expect(rendered).toEqual(labels);
		expect(new Set(rendered).size).toBe(4);
		expect(rendered).toContain('ホーム');
		expect(rendered).toContain('Hatask App');
		expect(container.querySelector('[data-app-return="hataskapps"]')).toBeNull();
		expect(liveProps.model.mobileTabs).toEqual(original);
		expect(saved).toEqual(original);
	});

	test('the live timed events define markers and extend the range beyond 8–22', async () => {
		const { container } = await mountLayout({ model: { timeline: [{ id: 'early', title: '早朝の予定', timeLabel: '06:00', startMinute: 360, endMinute: 420 }, { id: 'late', title: '夜の予定', timeLabel: '23:00', startMinute: 1380, endMinute: 1440 }, { id: 'all-day', title: '終日の予定', timeLabel: '終日' }] } });
		const markers = [...container.querySelectorAll<HTMLButtonElement>('.hak-time-block')];
		expect(markers.map(marker => marker.getAttribute('aria-label'))).toEqual(['06:00 早朝の予定', '23:00 夜の予定']);
		expect(markers[0].style.left).toBe('0%');
		expect(markers[1].style.left).toBe('94.44444444444444%');
		const labels = [...container.querySelectorAll('.hak-time-tick')].map(tick => tick.textContent);
		expect(labels[0]).toBe('6');
		expect(labels.at(-1)).toBe('24');
	});

	test('does not present loading or failed retrieval as an empty schedule', async () => {
		const { container, liveProps } = await mountLayout({ model: { loading: true } });
		expect(container.textContent).toContain('記録を読み込んでいます');
		expect(container.textContent).not.toContain('つぎの予定は、まだありません');
		liveProps.model = { scheduleUnavailable: true };
		await nextTick();
		expect(container.textContent).toContain('予定を読み込めませんでした');
		expect(container.textContent).not.toContain('つぎの予定は、まだありません');
		liveProps.model = {};
		await nextTick();
		expect(container.textContent).toContain('つぎの予定は、まだありません');
	});

	test('the empty schedule heading breaks after its complete lead, not inside the phrase', async () => {
		const { container } = await mountLayout();
		const heading = required(container, '.hak-next h1');
		expect([...heading.children].map(element => [element.className, element.textContent])).toEqual([
			['hak-next-lead', 'つぎの予定は、'],
			['hak-next-title', 'まだありません'],
		]);
		expect(heading.textContent).toBe('つぎの予定は、まだありません');
	});

	test.each([
		'病院に行く',
		'午前の打ち合わせのあとに図書館で資料を受け取る',
		'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(3),
	])('event headings separate the lead without inserting breaks into saved titles: %s', async title => {
		const { container, liveProps, handlers } = await mountLayout({ model: { next: { id: 'next', title, timeLabel: '14:00', meta: '今日 ・ 14:00 – 15:00' } } });
		const heading = required(container, '.hak-next h1');
		expect([...heading.children].map(element => [element.className, element.textContent])).toEqual([
			['hak-next-lead', 'つぎは、'],
			['hak-next-title', title],
		]);
		expect(heading.textContent).toBe(`つぎは、${title}`);
		expect(required(container, '.hak-next-title').childNodes).toHaveLength(1);
		expect(required(container, '.hak-next p').textContent).toBe('今日 ・ 14:00 – 15:00');
		expect(liveProps.model.next?.title).toBe(title);
		click(container, '.hak-next .hak-action-button');
		expect(handlers.action).toHaveBeenCalledWith({ type: 'open-event', id: 'next' });
	});

	test('heading line blocks keep the lead together and allow long titles to wrap within the pane', () => {
		const source = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiLayout.vue'), 'utf8');
		expect(source).toMatch(/\.hak-next-lead\s*\{[^}]*display:\s*block;[^}]*white-space:\s*nowrap;/u);
		expect(source).toMatch(/\.hak-next-title\s*\{[^}]*display:\s*block;[^}]*overflow-wrap:\s*anywhere;[^}]*word-break:\s*normal;/u);
		expect(source).toMatch(/\.hak-next\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*44ch;/u);
		expect(source).toMatch(/\.hak-next h1\s*\{[^}]*text-wrap:\s*balance;/u);
	});

	test('the saved showEvents switch hides the schedule sections', async () => {
		const { container } = await mountLayout({ model: { showEvents: false } });
		expect(container.querySelector('.hak-next')).toBeNull();
		expect(container.querySelector('.hak-later')).toBeNull();
		expect(container.querySelector('.hak-timeline')).toBeNull();
	});

	test('failed meal retrieval is not labeled as an unrecorded meal', async () => {
		const { container } = await mountLayout({ model: { meals: [{ id: 'dinner', label: '夜', text: '記録を読み込めません', recorded: false, unavailable: true }] } });
		const row = required<HTMLButtonElement>(container, '.hak-rich-grid button');
		expect(row.textContent).toContain('記録を読み込めません');
		expect(row.querySelector('.hak-rich-status')).toBeNull();
		expect(row.textContent).not.toContain('未記録');
		expect(row.disabled).toBe(true);
	});

	test('loading blocks mutating actions but still permits exit', async () => {
		const { container, handlers } = await mountLayout({ model: { loading: true } });
		click(container, '.hak-sheet-action');
		click(container, '.hak-exit');
		expect(handlers.action.mock.calls).toEqual([[{ type: 'exit' }]]);
	});

	test('reduced motion leaves the mobile navigation expanded on scroll', async () => {
		size = { width: 390, height: 790 };
		prefersReducedMotion = true;
		const { container } = await mountLayout();
		required(container, '.hak-scroll').dispatchEvent(new Event('scroll'));
		await nextTick();
		const root = required(container, '.htk-akatsuki-layout');
		expect(root.getAttribute('data-motion')).toBe('off');
		expect(root.getAttribute('data-nav-hidden')).toBe('false');
	});

	test('the saved animation switch also leaves navigation expanded', async () => {
		size = { width: 390, height: 790 };
		const { container } = await mountLayout({ animations: false });
		required(container, '.hak-scroll').dispatchEvent(new Event('scroll'));
		await nextTick();
		expect(required(container, '.htk-akatsuki-layout').getAttribute('data-nav-hidden')).toBe('false');
	});

	test('mobile scroll hides tabs and restores them after 420 ms', async () => {
		size = { width: 390, height: 790 };
		const { container } = await mountLayout();
		vi.useFakeTimers();
		required(container, '.hak-scroll').dispatchEvent(new Event('scroll'));
		await nextTick();
		expect(required(container, '.htk-akatsuki-layout').getAttribute('data-nav-hidden')).toBe('true');
		expect(required(container, '.hak-mobile-tab').getAttribute('tabindex')).toBe('-1');
		vi.advanceTimersByTime(420);
		await nextTick();
		expect(required(container, '.htk-akatsuki-layout').getAttribute('data-nav-hidden')).toBe('false');
	});

	test('FAB names only actual operations and its choices emit intentions', async () => {
		size = { width: 390, height: 790 };
		const { container, handlers } = await mountLayout();
		expect(required(container, '.hak-fab-sheet').textContent).not.toContain('水やり');
		expect(required(container, '.hak-fab-sheet').textContent).toContain('おはなの様子を見る');
		click(container, '.hak-fab');
		await nextTick();
		expect(required(container, '.hak-fab').getAttribute('aria-expanded')).toBe('true');
		click(container, '.hak-sheet-action');
		await nextTick();
		expect(handlers.action).toHaveBeenCalledWith({ type: 'create-event' });
		expect(required(container, '.hak-fab').getAttribute('aria-expanded')).toBe('false');
	});

	test('submitting search emits the entered query instead of a mock result', async () => {
		const { container, handlers } = await mountLayout();
		const input = required<HTMLInputElement>(container, '.hak-desktop-search input');
		input.value = '  保存済みの予定  ';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await nextTick();
		required(container, '.hak-desktop-case').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		expect(handlers.search).toHaveBeenCalledWith('保存済みの予定');
	});

	test('mobile search is focusable only while open and Escape restores the toggle', async () => {
		size = { width: 390, height: 790 };
		const { container } = await mountLayout();
		const input = required<HTMLInputElement>(container, '.hak-mobile-search input');
		expect(input.disabled).toBe(true);
		click(container, '.hak-search-toggle');
		await nextTick();
		await nextTick();
		expect(input.disabled).toBe(false);
		expect(window.document.activeElement).toBe(input);
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await nextTick();
		expect(input.disabled).toBe(true);
		expect(window.document.activeElement).toBe(required(container, '.hak-search-toggle'));
	});

	test('検索結果だけを表示し、元の入力欄と共有クエリを維持する', async () => {
		const { container, liveProps, handlers } = await mountLayout();
		const input = required<HTMLInputElement>(container, '.hak-desktop-search input');
		const disclosure = searchDisclosure(container, false);
		const results = required(container, '.hak-search-results');
		expect(results.parentElement).toBe(required(disclosure, '.hak-search-disclosure-clip'));
		const originalInputs = Array.from(container.querySelectorAll('input[type="search"]'));
		input.focus();
		input.value = '予定';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await nextTick();
		expect(liveProps.searchQuery).toBe('予定');
		liveProps.searchOpen = true;
		await nextTick();
		expect(searchDisclosure(container, true)).toBe(disclosure);
		expect(required(container, '[data-search-results]').textContent).toBe('予定');
		expect(container.querySelectorAll('.hak-search-results input')).toHaveLength(0);
		expect(Array.from(container.querySelectorAll('input[type="search"]'))).toEqual(originalInputs);
		expect(window.document.activeElement).toBe(input);
		expect(input.getAttribute('aria-controls')).toBe(required(container, '.hak-search-results').id);
		input.value = '更新';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await nextTick();
		expect(required(container, '[data-search-results]').textContent).toBe('更新');
		click(container, '.hak-search-results-head button');
		await nextTick();
		expect(handlers.closeSearch).toHaveBeenCalledOnce();
		expect(searchDisclosure(container, false)).toBe(disclosure);
		expect(required(container, '.hak-search-results')).toBe(results);
		expect(input.getAttribute('aria-controls')).toBeNull();
		expect(window.document.activeElement).toBe(input);
		expect(input.value).toBe('更新');
	});

	test.each([
		{ animations: true, reducedMotion: false },
		{ animations: false, reducedMotion: false },
		{ animations: true, reducedMotion: true },
	])('検索の上下開閉は同じ結果DOMで反転し、動きの設定にかかわらず閉状態を即座に操作対象外にする: %o', async ({ animations, reducedMotion }) => {
		prefersReducedMotion = reducedMotion;
		const { container, liveProps } = await mountLayout({ animations, searchQuery: '保存済みの検索語' });
		const wrapper = searchDisclosure(container, false);
		const results = required(container, '.hak-search-results');
		const contents = required(container, '[data-search-results]');
		for (const opened of [true, false, true, false, true]) {
			liveProps.searchOpen = opened;
			await nextTick();
			expect(searchDisclosure(container, opened)).toBe(wrapper);
			expect(required(container, '.hak-search-results')).toBe(results);
			expect(required(container, '[data-search-results]')).toBe(contents);
			expect(container.querySelectorAll('.hak-search-results')).toHaveLength(1);
			expect(contents.textContent).toBe('保存済みの検索語');
		}
		expect(required(container, '.htk-akatsuki-layout').getAttribute('data-motion')).toBe(animations && !reducedMotion ? 'on' : 'off');
	});

	test.each([390, 1200])('%dpx: 結果はEscapeで閉じ、入力文字を残す', async width => {
		size = { width, height: 790 };
		const { container, liveProps } = await mountLayout({ searchOpen: true, searchQuery: '保存した検索語' });
		const ancestorKeydown = vi.fn();
		container.addEventListener('keydown', ancestorKeydown);
		const input = required<HTMLInputElement>(container, width < 600 ? '.hak-mobile-search input' : '.hak-desktop-search input');
		expect(input.disabled).toBe(false);
		input.focus();
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await nextTick();
		expect(liveProps.searchOpen).toBe(false);
		searchDisclosure(container, false);
		expect(input.value).toBe('保存した検索語');
		expect(window.document.activeElement).toBe(input);
		expect(ancestorKeydown).not.toHaveBeenCalled();
		if (width > 599) {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			expect(ancestorKeydown).toHaveBeenCalledOnce();
		}
	});

	test('旧テーマでは暁検索結果を描画しない', async () => {
		const { container } = await mountLayout({ enabled: false, searchOpen: true });
		expect(container.querySelector('.hak-search-results')).toBeNull();
		expect(container.querySelector('.hak-search-disclosure')).toBeNull();
	});

	test('next-event metadata is not repeated and existing home supplements remain available', async () => {
		const { container } = await mountLayout({ model: { next: { id: 'event', title: '保存済みの予定', timeLabel: '14:00', meta: '今日 ・ 14:00 – 15:00' } } });
		expect(required(container, '.hak-next p').textContent).toBe('今日 ・ 14:00 – 15:00');
		expect(required(container, '.hak-home-extra').textContent).toBe('保存済みの補足');
	});
});
