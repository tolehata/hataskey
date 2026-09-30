/* SPDX-License-Identifier: AGPL-3.0-only */
import { createApp, defineComponent, h, nextTick } from 'vue';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { notificationTypes } from 'cherrypick-js';
import Notifications from './notifications.vue';
import { hataNotificationView, readHataNotificationView, setHataNotificationView } from '@/utility/hatasaba-device-prefs.js';
import { miLocalStorage } from '@/local-storage.js';
import type { App, PropType, WritableComputedRef } from 'vue';

const mocks = vi.hoisted(() => ({ popupMenu: vi.fn() }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	filter: 'filter', reload: 'reload', markAllAsRead: 'markAllAsRead', notifications: 'notifications',
	mentions: 'Mentions', directNotes: 'Direct notes',
	_notification: { _types: new Proxy({}, { get: (_, key) => String(key) }) },
	_hata: {
		_notificationBrands: { all: 'All', standard: 'Standard', hatady: 'Hatady', hatask: 'Hatask', hataFeed: 'HataFeed' },
		_hatady: { _notification: new Proxy({}, { get: (_, key) => String(key) }) },
		_notificationFilter: { botNotifications: 'bots', types: 'types', hatadyTypes: 'hatadyTypes', otherHatask: 'otherHatask', selectAll: 'selectAll', clearSelection: 'clearSelection' },
	},
} } }));
vi.mock('@/os.js', () => ({ popupMenu: mocks.popupMenu, apiWithDialog: vi.fn() }));
vi.mock('@/preferences.js', async () => { const { ref } = await import('vue'); return { prefer: { r: { notificationExcludeBots: ref(false) } } }; });
vi.mock('@/page.js', () => ({ definePage: vi.fn() }));
vi.mock('@/events.js', () => ({ globalEvents: { emit: vi.fn() } }));
vi.mock('@/utility/paginator.js', () => ({ Paginator: class {
	constructor(public endpoint: string, public options: { limit: number; params?: { visibility: string } }) {}
} }));
vi.mock('@/components/MkStreamingNotificationsTimeline.vue', () => ({ default: defineComponent({
	props: ['brand', 'includeBrands', 'includeHataskApp', 'excludeBots', 'excludeTypes', 'includeHatadySubtypes'],
	setup(props) {
		return () => h('div', {
			'data-timeline': '', 'data-brand': props.brand, 'data-bots': String(props.excludeBots),
			'data-brands': JSON.stringify(props.includeBrands), 'data-hatask-app': String(props.includeHataskApp),
			'data-exclude-types': JSON.stringify(props.excludeTypes),
			'data-hatady-subtypes': JSON.stringify(props.includeHatadySubtypes),
		});
	},
}) }));
vi.mock('@/components/MkNotesTimeline.vue', () => ({ default: defineComponent({
	props: ['paginator', 'notification'],
	setup(props) {
		return () => h('div', {
			'data-notes-timeline': '', 'data-endpoint': props.paginator.endpoint,
			'data-limit': String(props.paginator.options.limit),
			'data-visibility': props.paginator.options.params?.visibility ?? '',
			'data-notification': String(props.notification),
		});
	},
}) }));

type HeaderAction = { text: string; handler: (ev: MouseEvent) => void };
type FilterItem = { text?: string; type?: string; ref?: WritableComputedRef<boolean>; action?: () => void };
const PageWithHeader = defineComponent({
	props: { actions: { type: Array as PropType<HeaderAction[]>, required: true } },
	setup(props, { slots }) {
		return () => h('div', [
			...props.actions.map(action => h('button', { 'data-action': action.text, onClick: action.handler }, action.text)),
			slots.default?.(),
		]);
	},
});
const mounted: Array<{ app: App; container: HTMLDivElement }> = [];

function mountPage() {
	const app = createApp(Notifications, { disableRefreshButton: true });
	app.component('PageWithHeader', PageWithHeader);
	const container = window.document.createElement('div'); window.document.body.append(container); app.mount(container);
	mounted.push({ app, container });
	return {
		container,
		get timeline() { return container.querySelector<HTMLElement>('[data-timeline]')!; },
		get notesTimeline() { return container.querySelector<HTMLElement>('[data-notes-timeline]'); },
		get tabs() { return [...container.querySelectorAll<HTMLButtonElement>('button[aria-label]')]; },
		menu(): FilterItem[] {
			container.querySelector<HTMLButtonElement>('[data-action="filter"]')!.click();
			return mocks.popupMenu.mock.calls.at(-1)![0] as FilterItem[];
		},
	};
}

function switchFor(page: ReturnType<typeof mountPage>, text: string) {
	return page.menu().find(item => item.text === text)!.ref!;
}

beforeEach(() => {
	setHataNotificationView({ brand: 'all', includeBrands: null, includeTypes: null, includeHatadySubtypes: null, includeHataskApp: true, excludeBots: false });
});
afterEach(() => {
	for (const { app, container } of mounted.splice(0)) { app.unmount(); container.remove(); }
	miLocalStorage.removeItem('hataNotificationView');
	vi.clearAllMocks();
});

test('seven capsules show only the selected label and persist the selected brand on this device', async () => {
	const page = mountPage();
	const buttons = page.tabs;
	expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['All', 'Mentions', 'Direct notes', 'Standard', 'Hatady', 'Hatask', 'HataFeed']);
	expect(buttons.filter(button => button.textContent?.trim())).toHaveLength(1);
	buttons[4].click(); await nextTick();
	expect(page.timeline.dataset.brand).toBe('hatady');
	expect(buttons.filter(button => button.textContent?.trim()).map(button => button.textContent?.trim())).toEqual(['Hatady']);
	expect(buttons.filter(button => button.getAttribute('aria-current') === 'page')).toEqual([buttons[4]]);
	expect(JSON.parse(miLocalStorage.getItem('hataNotificationView')!).brand).toBe('hatady');
	expect(mountPage().timeline.dataset.brand).toBe('hatady');
});

test('mention and direct note tabs use their own paginator and preserve the saved brand and filters', async () => {
	const page = mountPage();
	page.tabs[4].click(); await nextTick();
	switchFor(page, 'bots').value = false;
	await nextTick();
	const savedBeforeNotes = miLocalStorage.getItem('hataNotificationView');
	page.tabs[1].click(); await nextTick();
	expect(page.timeline).toBeNull();
	expect(page.notesTimeline?.dataset).toMatchObject({ endpoint: 'notes/mentions', limit: '10', visibility: '', notification: 'false' });
	expect(page.tabs.filter(button => button.textContent?.trim()).map(button => button.textContent?.trim())).toEqual(['Mentions']);
	expect(page.tabs[1].getAttribute('aria-current')).toBe('page');
	expect(page.container.querySelector('[data-action="filter"]')).toBeNull();
	expect(page.container.querySelector('[data-action="markAllAsRead"]')).toBeNull();
	expect(miLocalStorage.getItem('hataNotificationView')).toBe(savedBeforeNotes);
	page.tabs[2].click(); await nextTick();
	expect(page.notesTimeline?.dataset).toMatchObject({ endpoint: 'notes/mentions', limit: '10', visibility: 'specified', notification: 'true' });
	expect(page.tabs.filter(button => button.textContent?.trim()).map(button => button.textContent?.trim())).toEqual(['Direct notes']);
	expect(page.container.querySelector('[data-action="filter"]')).toBeNull();
	expect(page.container.querySelector('[data-action="markAllAsRead"]')).toBeNull();
	expect(miLocalStorage.getItem('hataNotificationView')).toBe(savedBeforeNotes);
	page.tabs[4].click(); await nextTick();
	expect(page.timeline.dataset.brand).toBe('hatady');
	expect(page.timeline.dataset.bots).toBe('true');
	expect(page.container.querySelector('[data-action="filter"]')).not.toBeNull();
	expect(page.container.querySelector('[data-action="markAllAsRead"]')).not.toBeNull();
	page.tabs[1].click(); await nextTick();
	expect(mountPage().timeline.dataset.brand).toBe('hatady');
});

test('bot, standard type, and Hatady subtype switches persist together and preserve unknown saved fields', async () => {
	miLocalStorage.setItem('hataNotificationView', JSON.stringify({ futureOption: 'keep' }));
	const page = mountPage();
	switchFor(page, 'bots').value = false;
	switchFor(page, 'reaction').value = false;
	switchFor(page, 'mediaReaction').value = false;
	await nextTick();
	expect(page.timeline.dataset.bots).toBe('true');
	expect(JSON.parse(page.timeline.dataset.excludeTypes!)).toEqual(['reaction']);
	expect(JSON.parse(page.timeline.dataset.hatadySubtypes!)).not.toContain('mediaReaction');
	const saved = JSON.parse(miLocalStorage.getItem('hataNotificationView')!);
	expect(saved.futureOption).toBe('keep');
	expect(saved.excludeBots).toBe(true);
	expect(saved.includeTypes).not.toContain('reaction');
	expect(saved.includeHatadySubtypes).not.toContain('mediaReaction');
	expect(hataNotificationView.value.excludeBots).toBe(true);
});

test('select all and clear selection act on saved device filters', async () => {
	const page = mountPage();
	page.menu().find(item => item.text === 'clearSelection')!.action!();
	await nextTick();
	expect(page.timeline.dataset.excludeTypes).toBe(JSON.stringify(notificationTypes.filter(type => type !== 'hatady')));
	expect(page.timeline.dataset.hatadySubtypes).toBe('[]');
	expect(page.timeline.dataset.brands).toBe('[]');
	expect(page.timeline.dataset.hataskApp).toBe('false');
	page.menu().find(item => item.text === 'selectAll')!.action!();
	await nextTick();
	expect(page.timeline.dataset.excludeTypes).toBe('null');
	expect(page.timeline.dataset.hatadySubtypes).toBe('null');
	expect(page.timeline.dataset.brands).toBe('null');
	expect(page.timeline.dataset.hataskApp).toBe('true');
});

test('four category switches precede their own children and restore child choices after parent re-enable', async () => {
	const page = mountPage();
	const menu = page.menu();
	const labels = menu.map(item => item.text).filter(Boolean);
	expect(labels.indexOf('Standard')).toBeLessThan(labels.indexOf('app'));
	expect(labels.indexOf('Hatady')).toBeLessThan(labels.indexOf('mediaReaction'));
	expect(labels.indexOf('Hatask')).toBeLessThan(labels.indexOf('otherHatask'));
	expect(labels.indexOf('HataFeed')).toBeLessThan(labels.indexOf('hataFeed'));
	switchFor(page, 'mediaReaction').value = false;
	switchFor(page, 'Hatady').value = false;
	await nextTick();
	expect(JSON.parse(page.timeline.dataset.brands!)).not.toContain('hatady');
	expect(JSON.parse(page.timeline.dataset.hatadySubtypes!)).not.toContain('mediaReaction');
	switchFor(page, 'Hatady').value = true;
	await nextTick();
	expect(JSON.parse(page.timeline.dataset.brands!)).toContain('hatady');
	expect(JSON.parse(page.timeline.dataset.hatadySubtypes!)).not.toContain('mediaReaction');
});

test('the legacy Hatask app choice remains separate from the standard app choice', async () => {
	const page = mountPage();
	switchFor(page, 'app').value = false;
	await nextTick();
	expect(JSON.parse(page.timeline.dataset.excludeTypes!)).toContain('app');
	expect(page.timeline.dataset.hataskApp).toBe('true');
	switchFor(page, 'otherHatask').value = false;
	await nextTick();
	expect(page.timeline.dataset.hataskApp).toBe('false');
});

test('old saved child exclusions migrate to the Hatady parent gate and Hatask app child without enabling either', () => {
	miLocalStorage.setItem('hataNotificationView', JSON.stringify({ includeTypes: ['app', 'follow'] }));
	const first = readHataNotificationView();
	expect(first.includeBrands).toEqual(['standard', 'hatask', 'hataFeed']);
	expect(first.includeHataskApp).toBe(true);
	miLocalStorage.setItem('hataNotificationView', JSON.stringify({ includeTypes: ['follow'] }));
	const second = readHataNotificationView();
	expect(second.includeBrands).toEqual(['standard', 'hatask', 'hataFeed']);
	expect(second.includeHataskApp).toBe(false);
	miLocalStorage.setItem('hataNotificationView', JSON.stringify({ includeBrands: null, includeTypes: ['follow'], includeHataskApp: true }));
	expect(readHataNotificationView().includeBrands).toBeNull();
});

test('an unset device filter inherits the current account’s previous Bot choice once', async () => {
	const { prefer } = await import('@/preferences.js');
	prefer.r.notificationExcludeBots.value = true;
	miLocalStorage.removeItem('hataNotificationView');
	const page = mountPage(); await nextTick();
	expect(page.timeline.dataset.bots).toBe('true');
	expect(JSON.parse(miLocalStorage.getItem('hataNotificationView')!).excludeBots).toBe(true);
	prefer.r.notificationExcludeBots.value = false;
	expect(mountPage().timeline.dataset.bots).toBe('true');
});
