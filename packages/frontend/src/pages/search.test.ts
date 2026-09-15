/* SPDX-License-Identifier: AGPL-3.0-only */
/* eslint-disable vue/one-component-per-file -- Test doubles isolate the result list and form fields from network state. */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, KeepAlive, nextTick, provide, ref, Suspense } from 'vue';
import Search from './search.vue';
import type { App, PropType } from 'vue';
import type { PageHeaderItem } from '@/types/page-header.js';
import MkPageHeader from '@/components/global/MkPageHeader.vue';
import CPPageHeader from '@/components/global/CPPageHeader.vue';
import { DI } from '@/di.js';
import { prefer } from '@/preferences.js';

const requests = vi.hoisted(() => [] as { endpoint: string; params: Record<string, unknown> }[]);
vi.mock('@/utility/paginator.js', () => ({ Paginator: class {
	constructor(endpoint: string, options: { params: Record<string, unknown> }) { requests.push({ endpoint, params: options.params }); }
} }));
vi.mock('@/preferences.js', async () => {
	const { ref: state } = await import('vue');
	return { prefer: { r: { animation: state(false) }, s: { animation: false, useBlurEffect: false } } };
});
vi.mock('@/utility/device-kind.js', () => ({ deviceKind: 'desktop' }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	search: '検索', searchResult: '検索結果', clear: 'クリア', options: 'オプション', notes: 'ノート', users: 'ユーザー', events: 'イベント',
	all: 'すべて', local: 'ローカル', remote: 'リモート', reverseChronological: '新しい順',
	_search: { searchTarget: '検索対象', notePlaceholder: 'ノートを検索', userPlaceholder: 'ユーザーを検索', eventPlaceholder: 'イベントを検索', postFrom: '開始', postTo: '終了' },
	_event: { startDate: '開始日', endDate: '終了日' },
} } }));
vi.mock('@/instance.js', () => ({ instance: { federation: 'none', noteSearchableScope: 'local' } }));
vi.mock('@/i.js', () => ({ $i: null }));
vi.mock('@/page.js', () => ({ definePage: vi.fn() }));
vi.mock('@/os.js', () => ({ popupMenu: vi.fn(), confirm: vi.fn(async () => ({ canceled: true })) }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn(async () => ({ id: 'author', username: 'author', host: null })) }));
vi.mock('@/utility/check-permissions.js', () => ({ notesSearchAvailable: true, usersSearchAvailable: true }));
vi.mock('@/router.js', async () => {
	const { ref: state } = await import('vue');
	const router = { currentRoute: state({ name: 'search', path: '/search' }), push: vi.fn(), pushByPath: vi.fn() };
	return { mainRouter: router, useRouter: () => router };
});
vi.mock('@/local-storage.js', () => ({ miLocalStorage: { getItem: () => null } }));
vi.mock('@/accounts.js', () => ({ getAccountMenu: vi.fn() }));
vi.mock('@/events.js', () => ({ globalEvents: {} }));
vi.mock('@/utility/haptic.js', () => ({ haptic: vi.fn() }));
vi.mock('@/utility/scroll-to-visibility.js', async () => {
	const { ref: state } = await import('vue');
	return { scrollToVisibility: () => ({ showEl: state(false) }) };
});
vi.mock('@@/js/scroll.js', () => ({ getScrollPosition: () => 0, scrollToTop: vi.fn() }));
vi.mock('@@/js/config.js', () => ({ host: 'example.invalid' }));
vi.mock('@/components/global/MkPageHeader.tabs.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkFollowButton.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkInput.vue', async () => {
	const { defineComponent: component, h: render } = await import('vue');
	return { default: component({ props: { modelValue: { type: String, default: '' } }, emits: ['update:modelValue'], setup: (props, { emit }) => () => render('input', { value: props.modelValue, onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value) }) }) };
});
vi.mock('@/components/MkSelect.vue', async () => {
	const { defineComponent: component, h: render } = await import('vue');
	return { default: component({ props: { modelValue: { type: String, default: '' }, items: { type: Array as PropType<{ value: string; label: string }[]>, required: true } }, emits: ['update:modelValue'], setup: (props, { emit }) => () => render('select', { value: props.modelValue, onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLSelectElement).value) }, props.items.map(item => render('option', { value: item.value }, item.label))) }) };
});
vi.mock('@/components/MkButton.vue', () => ({ default: { template: '<button><slot/></button>' } }));
vi.mock('@/components/MkInfo.vue', () => ({ default: { template: '<p><slot/></p>' } }));
vi.mock('@/components/MkFoldableSection.vue', () => ({ default: { template: '<section><slot name="header"/><slot/></section>' } }));
vi.mock('@/components/MkNotesTimeline.vue', () => ({ default: { props: ['paginator', 'getDate'], template: '<article data-results>最後のノート<button>リアクション</button></article>' } }));
vi.mock('@/components/MkUserList.vue', () => ({ default: { props: ['paginator'], template: '<article data-results>ユーザー</article>' } }));
vi.mock('@/components/MkUserCardMini.vue', () => ({ default: { props: ['user'], template: '<span>{{ user.username }}</span>' } }));

let app: App | undefined;
let host: HTMLElement;
let width = 390;
let reduced = false;
const warnings: string[] = [];
let resizeCallbacks: ResizeObserverCallback[];
type Motion = { frames: Keyframe[]; options: KeyframeAnimationOptions; cancel: ReturnType<typeof vi.fn>; finish: () => void };
let motions: Motion[];
const searchActive = ref(true);

async function flush() {
	for (let i = 0; i < 5; i++) await nextTick();
}

function element<T extends Element = HTMLElement>(selector: string): T {
	const found = host.querySelector<T>(selector) ?? window.document.body.querySelector<T>(selector);
	if (!found) throw new Error(`Missing ${selector}`);
	return found;
}

async function mount(mode: 'standard' | 'compact' = 'standard', props: Record<string, unknown> = {}, inWindow = false) {
	const PageWithHeader = defineComponent({
		props: { actions: { type: Array as PropType<PageHeaderItem[]>, required: true } },
		setup(header, { slots }) {
			provide(DI.pageMetadata, ref({ title: '検索', icon: 'ti ti-search' }));
			return () => h('main', { 'data-page': true }, [h(mode === 'standard' ? MkPageHeader : CPPageHeader, { actions: header.actions }), slots.default?.()]);
		},
	});
	const OtherPage = defineComponent({ render: () => h('p', '別のページ') });
	app = createApp({ render: () => h(KeepAlive, null, { default: () => h(Suspense, null, { default: () => searchActive.value ? h(Search, { query: '旗鯖', ...props }) : h(OtherPage) }) }) });
	app.provide('inWindow', inWindow);
	app.component('PageWithHeader', PageWithHeader);
	app.component('MkAvatar', { render: () => null });
	app.component('MkUserName', { render: () => null });
	app.directive('tooltip', {});
	app.config.warnHandler = message => warnings.push(message);
	app.mount(host);
	await flush();
}

async function submit() {
	element<HTMLInputElement>('input[type=search]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	await flush();
}

beforeEach(() => {
	width = 390; reduced = false; resizeCallbacks = []; motions = []; requests.length = 0; warnings.length = 0;
	prefer.r.animation.value = false;
	searchActive.value = true;
	host = window.document.createElement('div'); window.document.body.append(host);
	vi.spyOn(window, 'innerWidth', 'get').mockImplementation(() => width);
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => width);
	vi.stubGlobal('ResizeObserver', class {
		constructor(callback: ResizeObserverCallback) { resizeCallbacks.push(callback); }
		observe() {}
		disconnect() {}
	});
	vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; } }));
	// Geometry is synthetic: these tests verify transition/state handling, not browser layout.
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
		if (this.matches('button[aria-controls]')) return new DOMRect(width - 56, 4, 44, 44);
		if (this.matches('[role=search]')) return new DOMRect(12, this.dataset.docked === 'true' ? 56 : 700, width - 24, 64);
		return new DOMRect(0, 0, width, 844);
	});
	vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation((frames, options) => {
		let finish!: () => void;
		let reject!: (reason: Error) => void;
		const finished = new Promise<void>((resolve, failure) => { finish = resolve; reject = failure; });
		const cancel = vi.fn(() => reject(new Error('cancelled')));
		motions.push({ frames: frames as Keyframe[], options: options as KeyframeAnimationOptions, cancel, finish });
		return { finished, cancel } as unknown as Animation;
	});
});

afterEach(async () => {
	app?.unmount(); app = undefined; await flush(); host.remove();
	vi.restoreAllMocks(); vi.unstubAllGlobals();
	expect(warnings).toEqual([]);
});

describe('mobile search toolbar', () => {
	test.each(['standard', 'compact'] as const)('%s header opens the same query and leaves the results intact', async mode => {
		await mount(mode);
		const input = element<HTMLInputElement>('input[type=search]');
		await submit();
		const results = element('[data-results]');
		const panel = element('[role=search]');
		const toggle = element<HTMLButtonElement>('button[aria-controls]');
		expect(requests).toEqual([{ endpoint: 'notes/search', params: { query: '旗鯖', host: '.' } }]);
		expect(panel.style.display).toBe('none');
		expect(panel.hasAttribute('inert')).toBe(true);
		expect(toggle.getAttribute('aria-controls')).toBe(panel.id);
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		expect(toggle.getAttribute('aria-label')).toBe('検索');
		expect(toggle.textContent).toBe('');
		expect(window.document.activeElement).toBe(toggle);
		toggle.click(); await flush();
		expect(element('input[type=search]')).toBe(input);
		expect(input.value).toBe('旗鯖');
		expect(element('[data-results]')).toBe(results);
		expect(requests).toHaveLength(1);
		expect(panel.style.display).toBe('');
		expect(panel.dataset.docked).toBe('true');
		expect(panel.style.getPropertyValue('--search-dock-top')).toBe('56px');
		expect(window.document.activeElement).toBe(input);
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await flush();
		expect(panel.style.display).toBe('none');
		expect(window.document.activeElement).toBe(toggle);
	});

	test('author and date filters survive collapse and reopening', async () => {
		await mount('standard', { userId: 'author' });
		const date = element<HTMLInputElement>('input[type=datetime-local]');
		date.value = '2026-09-01T12:00'; date.dispatchEvent(new Event('input')); await flush();
		await submit();
		expect(requests[0].params).toMatchObject({ query: '旗鯖', userId: 'author', rangeStartAt: new Date('2026-09-01T12:00').getTime() });
		element<HTMLButtonElement>('button[aria-controls]').click(); await flush();
		expect(element('input[type=datetime-local]')).toBe(date);
		expect(date.value).toBe('2026-09-01T12:00');
	});

	test('empty input and Japanese conversion do not collapse or start a search', async () => {
		await mount('standard', { query: '' });
		await submit();
		const input = element<HTMLInputElement>('input[type=search]');
		input.value = '変換中'; input.dispatchEvent(new Event('input')); await flush();
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })); await flush();
		expect(requests).toEqual([]);
		expect(element('[role=search]').style.display).toBe('');
		expect(host.querySelector('button[aria-controls]')).toBeNull();
	});

	test.each(['user', 'event'] as const)('%s results also allow editing the query in the header', async type => {
		await mount('standard', { type }); await submit();
		expect(element('[data-results]')).toBeTruthy();
		expect(element('[role=search]').style.display).toBe('none');
		element<HTMLButtonElement>('button[aria-controls]').click(); await flush();
		expect(element('[role=search]').style.display).toBe('');
	});

	test('rapid reversals cancel old animations without hiding the reopened field', async () => {
		prefer.r.animation.value = true;
		await mount(); await submit();
		const closing = motions[0];
		expect(closing.options.duration).toBe(240);
		expect(closing.frames[1].transform).toContain('translate(322px, -696px)');
		element<HTMLButtonElement>('button[aria-controls]').click(); await flush();
		expect(closing.cancel).toHaveBeenCalledOnce();
		motions.at(-1)?.finish(); await flush();
		expect(element('[role=search]').style.display).toBe('');
		expect(element('[role=search]').hasAttribute('inert')).toBe(false);
		expect(element('button[aria-controls]').getAttribute('aria-expanded')).toBe('true');
	});

	test('reduced motion settles the controls without animation', async () => {
		prefer.r.animation.value = true; reduced = true;
		await mount(); await submit();
		expect(motions).toEqual([]);
		expect(element('[role=search]').style.display).toBe('none');
		element<HTMLButtonElement>('button[aria-controls]').click(); await flush();
		expect(motions).toEqual([]);
		expect(element('[role=search]').style.display).toBe('');
	});

	test('a wider pane keeps the query inline and returning to mobile restores the toggle', async () => {
		await mount(); await submit();
		width = 1200;
		for (const callback of resizeCallbacks) callback([{ contentRect: { width } }] as ResizeObserverEntry[], {} as ResizeObserver);
		await flush();
		expect(element('[role=search]').dataset.mobile).toBe('false');
		expect(element('[role=search]').style.display).toBe('');
		expect(host.querySelector('button[aria-controls]')).toBeNull();
		width = 390;
		for (const callback of resizeCallbacks) callback([{ contentRect: { width } }] as ResizeObserverEntry[], {} as ResizeObserver);
		await flush();
		expect(element('[role=search]').style.display).toBe('none');
		expect(element('button[aria-controls]').getAttribute('aria-expanded')).toBe('false');
	});

	test('leaving a cached search page removes its floating controls and restores the query on return', async () => {
		await mount(); await submit();
		element<HTMLButtonElement>('button[aria-controls]').click(); await flush();
		const input = element<HTMLInputElement>('input[type=search]');
		expect(host.contains(input)).toBe(false);
		searchActive.value = false; await flush();
		expect(window.document.body.querySelector('[role=search]')).toBeNull();
		searchActive.value = true; await flush();
		expect(element('input[type=search]')).toBe(input);
		expect(input.value).toBe('旗鯖');
		expect(element('[role=search]').style.display).toBe('none');
		expect(requests).toHaveLength(1);
	});

	test('a narrow page window retains its search field inside the window', async () => {
		await mount('standard', {}, true);
		await submit();
		const panel = element('[role=search]');
		expect(host.contains(panel)).toBe(true);
		expect(panel.dataset.mobile).toBe('false');
		expect(panel.style.display).toBe('');
		expect(host.querySelector('button[aria-controls]')).toBeNull();
		expect(element('[data-results]')).toBeTruthy();
	});
});
