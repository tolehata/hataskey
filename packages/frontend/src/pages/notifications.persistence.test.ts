/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick } from 'vue';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { notificationTypes } from 'cherrypick-js';
import Notifications from './notifications.vue';
import { PreferencesManager } from '@/preferences/manager.js';
import type { App, PropType, WritableComputedRef } from 'vue';
import type { PreferencesProfile, StorageProvider } from '@/preferences/manager.js';

// Exercise the actual page and manager; isolate only app IO and timeline fetching.
const mocks = vi.hoisted(() => ({
	prefer: null as PreferencesManager | null,
	popupMenu: vi.fn(),
}));
vi.mock('@/preferences.js', () => ({ get prefer() { return mocks.prefer; } }));
vi.mock('@@/js/config.js', () => ({ host: 'example.test', version: 'test', prefersReducedMotion: false }));
vi.mock('@@/js/intl-const.js', () => ({ hemisphere: 'N' }));
vi.mock('@/i18n.js', () => ({
	i18n: { ts: {
		filter: 'filter', clear: 'clear', all: 'all', mentions: 'mentions',
		directNotes: 'directNotes', markAllAsRead: 'markAllAsRead',
		_notification: { _types: new Proxy({}, { get: (_, key) => key }) },
		_hata: { _notificationFilter: { botNotifications: 'botNotifications' } },
	} },
}));
vi.mock('@/os.js', () => ({ popupMenu: mocks.popupMenu }));
vi.mock('@/utility/copy-to-clipboard.js', () => ({ copyToClipboard: vi.fn() }));
vi.mock('@/page.js', () => ({ definePage: vi.fn() }));
vi.mock('@/events.js', () => ({ globalEvents: { emit: vi.fn() } }));
vi.mock('@/utility/hatafeed.js', () => ({ markHataFeedNotificationsRead: vi.fn() }));
vi.mock('@/utility/paginator.js', () => ({ Paginator: class {} }));
vi.mock('@/components/MkNotesTimeline.vue', () => ({ default: defineComponent({ render: () => null }) }));
vi.mock('@/components/MkStreamingNotificationsTimeline.vue', () => ({
	default: defineComponent({
		props: ['excludeBots', 'excludeTypes'],
		setup(props) {
			return () => h('div', {
				'data-timeline': '',
				'data-exclude-bots': String(props.excludeBots),
				'data-exclude-types': JSON.stringify(props.excludeTypes),
			});
		},
	}),
}));

type HeaderAction = { text: string; highlighted?: boolean; handler: (ev: MouseEvent) => void; };
type FilterItem = { text?: string; type?: string; ref?: WritableComputedRef<boolean>; action?: () => void; };
const PageWithHeader = defineComponent({
	props: { actions: { type: Array as PropType<HeaderAction[]>, required: true } },
	setup(props, { slots }) {
		return () => h('div', [
			...props.actions.map(action => h('button', {
				'data-action': action.text,
				'data-highlighted': String(action.highlighted),
				onClick: action.handler,
			}, action.text)),
			slots.default?.(),
		]);
	},
});
const mounted: { app: App; container: HTMLDivElement; }[] = [];

function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function fixture() {
	let saved: PreferencesProfile | null = null;
	const io: StorageProvider = {
		load: () => copy(saved),
		save: ({ profile }) => { saved = copy(profile); },
		cloudGetBulk: async () => ({}),
		cloudGet: async () => null,
		cloudSet: async () => undefined,
	};
	return {
		async boot(account = 'first') {
			mocks.prefer = new PreferencesManager(io, { id: account });
			await mocks.prefer.cloudReady;
		},
		get saved() { return saved!; },
	};
}

function mountPage(notification = false) {
	const app = createApp(Notifications, { notification, disableRefreshButton: true });
	app.component('PageWithHeader', PageWithHeader);
	const container = window.document.createElement('div');
	window.document.body.append(container);
	app.mount(container);
	const item = { app, container };
	mounted.push(item);
	return {
		get excluded() { return container.querySelector('[data-timeline]')?.getAttribute('data-exclude-bots'); },
		get excludedTypes() { return JSON.parse(container.querySelector('[data-timeline]')!.getAttribute('data-exclude-types')!); },
		get highlighted() { return container.querySelector('[data-action="filter"]')?.getAttribute('data-highlighted'); },
		menu() {
			container.querySelector<HTMLButtonElement>('[data-action="filter"]')!.click();
			return mocks.popupMenu.mock.calls.at(-1)![0] as FilterItem[];
		},
		unmount() {
			app.unmount();
			container.remove();
			mounted.splice(mounted.indexOf(item), 1);
		},
	};
}

function botSwitch(page: ReturnType<typeof mountPage>) {
	return page.menu().find(item => item.text === 'botNotifications')!.ref!;
}

afterEach(() => {
	for (const { app, container } of mounted.splice(0)) {
		app.unmount();
		container.remove();
	}
	vi.clearAllMocks();
});

describe('通知ページのBotフィルター永続化', () => {
	test.each([false, true])('notification=%sでも既定は表示し、操作直後に保存して再作成と再読込で保持する', async notification => {
		const f = fixture();
		await f.boot();
		const page = mountPage(notification);
		expect(botSwitch(page).value).toBe(true);
		expect(page.excluded).toBe('false');
		botSwitch(page).value = false;
		// Save is synchronous: an immediate reload must not lose the selection.
		expect(f.saved.preferences.notificationExcludeBots.find(([scope]) => scope.account === 'first')?.[1]).toBe(true);
		await nextTick();
		expect(page.excluded).toBe('true');
		expect(page.highlighted).toBe('true');
		page.unmount();
		const remounted = mountPage(notification);
		expect(remounted.excluded).toBe('true');
		remounted.unmount();
		await f.boot();
		const reloaded = mountPage(notification);
		expect(reloaded.excluded).toBe('true');
		expect(botSwitch(reloaded).value).toBe(false);
	});

	test('同じアカウントで開いている通知ページと埋め込みペインへ変更を反映する', async () => {
		await fixture().boot();
		const page = mountPage();
		const embedded = mountPage(true);
		const embeddedSwitch = botSwitch(embedded);
		botSwitch(page).value = false;
		await nextTick();
		expect(embedded.excluded).toBe('true');
		expect(embeddedSwitch.value).toBe(false);
		embeddedSwitch.value = true;
		await nextTick();
		expect(page.excluded).toBe('false');
		expect(page.highlighted).toBe('false');
	});

	test('別アカウントは既定値から始まり、元のアカウントの除外設定を変えない', async () => {
		const f = fixture();
		await f.boot();
		const first = mountPage();
		botSwitch(first).value = false;
		first.unmount();
		await f.boot('second');
		const second = mountPage();
		expect(botSwitch(second).value).toBe(true);
		botSwitch(second).value = false;
		botSwitch(second).value = true;
		second.unmount();
		await f.boot();
		expect(mountPage().excluded).toBe('true');
	});

	test('種類の絞り込みは一時設定のまま保持し、クリアはBotの保存値も解除する', async () => {
		const f = fixture();
		await f.boot();
		const page = mountPage();
		botSwitch(page).value = false;
		page.menu().find(item => item.text === 'reaction')!.action!();
		await nextTick();
		expect(page.excludedTypes).toEqual(notificationTypes.filter(type => type !== 'reaction'));
		expect(page.excluded).toBe('true');
		page.unmount();
		const remounted = mountPage();
		expect(remounted.excludedTypes).toBeNull();
		expect(remounted.excluded).toBe('true');
		remounted.menu().find(item => item.text === 'reaction')!.action!();
		remounted.menu().find(item => item.text === 'clear')!.action!();
		await nextTick();
		expect(remounted.excludedTypes).toBeNull();
		expect(remounted.excluded).toBe('false');
		expect(remounted.highlighted).toBe('false');
		remounted.unmount();
		await f.boot();
		expect(botSwitch(mountPage()).value).toBe(true);
	});
});
