/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick, ref, shallowReactive } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import HataskFlowerDetail from './HataskFlowerDetail.vue';
import type { App } from 'vue';
import type { HataskFlowerDetailLabels } from './HataskFlowerDetail.vue';
import type { HataskFlowerView } from './hatask-flower-view.js';
import { hotkeyDirective } from '@/directives/hotkey.js';
import { claimZIndex } from '@/os.js';

vi.mock('@/os.js', () => ({ claimZIndex: vi.fn(() => 3000) }));
vi.mock('@/preferences.js', () => ({ prefer: { s: { animation: false, menuStyle: 'auto', useBlurEffectForModal: false, removeModalBgColorForBlur: false } } }));
vi.mock('@/components/HataskEmoji.vue', async () => {
	const { defineComponent: component, h: node } = await import('vue');
	return { default: component({ props: { emoji: { type: String, default: '' } }, setup: props => () => node('img', { 'data-test-emoji': props.emoji }) }) };
});
vi.mock('@/components/global/MkAvatar.vue', async () => {
	const { defineComponent: component, h: node } = await import('vue');
	return { default: component({ setup: () => () => node('span', { 'data-test-avatar': '' }) }) };
});
vi.mock('@/components/global/MkUserName.vue', async () => {
	const { defineComponent: component, h: node } = await import('vue');
	return { default: component({ setup: () => () => node('span', '育てた人') }) };
});

type Instance = InstanceType<typeof HataskFlowerDetail>;
const mounted: { app: App<Element>; container: HTMLDivElement; host: HTMLDivElement; close: () => void }[] = [];
const labels: HataskFlowerDetailLabels = { close: '閉じる', meaning: '花言葉', harvested: '収穫日', rename: '名前を変更', report: '通報', rare: 'レア', owner: '育てた人' };
const flower: HataskFlowerView = { id: 'flower-1', name: '朝のひかり', emoji: '🌼', variety: 'デイジー', hanakotoba: '希望', harvestedAt: '2026-09-08T01:00:00.000Z', dateLabel: '9月8日 10:00', rare: true, isOwner: false };

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal('ResizeObserver', class { observe = vi.fn(); disconnect = vi.fn(); });
});

async function settle(): Promise<void> {
	for (let tick = 0; tick < 4; tick++) await nextTick();
	await vi.advanceTimersByTimeAsync(350);
	for (let tick = 0; tick < 4; tick++) await nextTick();
}

afterEach(async () => {
	for (const item of mounted.splice(0).reverse()) {
		item.close();
		await settle();
		item.app.unmount(); item.container.remove(); item.host.remove();
	}
	vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function required<T extends HTMLElement = HTMLElement>(container: ParentNode, selector: string): T {
	const element = container.querySelector<T>(selector);
	if (!element) throw new Error(`Missing flower detail element: ${selector}`);
	return element;
}

async function mount(overrides: Partial<HataskFlowerView> = {}) {
	const host = window.document.createElement('div');
	host.setAttribute('data-hatask-flower-stream', '');
	const opener = window.document.createElement('button');
	opener.textContent = '正本のサムネイル';
	const source = window.document.createElement('button');
	source.textContent = '画面内の複製'; source.tabIndex = -1; source.setAttribute('aria-hidden', 'true');
	source.style.setProperty('--accent', '#e0567a'); source.style.setProperty('--accent-ink', '#b02e56'); source.style.setProperty('--masthead', '#fff7f2');
	let anchorTop = 100;
	vi.spyOn(source, 'getBoundingClientRect').mockImplementation(() => new DOMRect(20, anchorTop, 102, 122));
	host.append(opener, source);
	const container = window.document.createElement('div');
	window.document.body.append(host, container);
	opener.focus();
	const state = shallowReactive({ isOpen: true, flower: { ...flower, ...overrides } });
	const instance = ref<Instance>();
	const order: string[] = [];
	const actionFocus: Element[] = [];
	const shown = ref(true);
	const app = createApp(defineComponent({ setup: () => () => shown.value ? h(HataskFlowerDetail, {
		...state, ref: instance, source, returnFocusTo: opener, theme: 'akatsuki', mode: 'light', animations: false, labels,
		onClosed: () => { order.push('closed'); shown.value = false; },
		onAction: () => { order.push('action'); if (window.document.activeElement) actionFocus.push(window.document.activeElement); },
	}) : null }));
	app.directive('hotkey', hotkeyDirective);
	app.mount(container);
	mounted.push({ app, container, host, close: () => instance.value?.close() });
	await settle();
	return { container, opener, source, host, state, instance, order, actionFocus, moveAnchor: () => { anchorTop -= 40; } };
}

describe('HataskFlowerDetail', () => {
	test('uses the standard popup layer, copies Hatask ink, and renders escaped record data', async () => {
		const { container, instance } = await mount({ name: '<img src=x onerror=alert(1)>' });
		const panel = required(container, '[role="dialog"]');
		expect(claimZIndex).toHaveBeenCalledWith('high');
		expect(panel.style.getPropertyValue('--accent')).toBe('#e0567a');
		expect(panel.style.getPropertyValue('--accent-ink')).toBe('#b02e56');
		expect(panel.querySelector('h2')?.textContent).toBe('<img src=x onerror=alert(1)>');
		expect(panel.querySelector('h2 img')).toBeNull();
		expect(panel.querySelector('time')?.getAttribute('datetime')).toBe(flower.harvestedAt);
		expect(panel.querySelector('[data-test-emoji]')?.getAttribute('data-test-emoji')).toBe(flower.emoji);
		expect(required(container, '[data-flower-detail-action="primary"]').textContent).toContain(labels.report);
		expect(window.document.activeElement).toBe(required(container, '[data-flower-detail-action="close"]'));
		instance.value?.close(); await settle();
	});

	test('action waits for closing and restores the canonical opener before opening another dialog', async () => {
		const { container, opener, order, actionFocus } = await mount({ isOwner: true });
		const action = required<HTMLButtonElement>(container, '[data-flower-detail-action="primary"]');
		expect(action.textContent).toContain(labels.rename);
		action.click(); action.click();
		await settle();
		expect(order).toEqual(['closed', 'action']);
		expect(actionFocus).toEqual([opener]);
		expect(window.document.activeElement).toBe(opener);
	});

	test('Escape closes without action, using the canonical focus destination', async () => {
		const { container, opener, order } = await mount();
		required(container, '[data-flower-detail-action="close"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settle();
		expect(order).toEqual(['closed']);
		expect(window.document.activeElement).toBe(opener);
	});

	test('outside click and owner-requested close use the standard close lifecycle', async () => {
		const first = await mount();
		required(first.container, '[data-cy-bg]').click();
		await settle();
		expect(first.order).toEqual(['closed']);
		const second = await mount();
		second.state.isOpen = false;
		await settle();
		expect(second.order).toEqual(['closed']);
	});

	test('content and stale rail scroll events stay open; anchor movement, resize, or removal closes it', async () => {
		const first = await mount();
		required(first.container, '[role="dialog"] h2').dispatchEvent(new Event('scroll'));
		await settle();
		expect(first.order).toEqual([]);
		first.host.dispatchEvent(new Event('scroll'));
		await settle();
		expect(first.order).toEqual([]);
		first.moveAnchor();
		first.host.dispatchEvent(new Event('scroll'));
		await settle();
		expect(first.order).toEqual(['closed']);
		const second = await mount();
		window.dispatchEvent(new Event('resize'));
		await settle();
		expect(second.order).toEqual(['closed']);
		const third = await mount();
		third.source.remove();
		await settle();
		expect(third.order).toEqual(['closed']);
	});
});
