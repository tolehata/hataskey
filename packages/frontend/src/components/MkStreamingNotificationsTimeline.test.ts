/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';
import MkStreamingNotificationsTimeline from './MkStreamingNotificationsTimeline.vue';

const fixture = vi.hoisted(() => ({
	api: vi.fn(),
	events: new Map<string, (event: any) => void>(),
	streamEvents: new Map<string, () => void>(),
	intersection: null as IntersectionObserverCallback | null,
	observed: new Set<Element>(),
}));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: (...args: unknown[]) => fixture.api(...args) }));
vi.mock('@/preferences.js', () => ({ prefer: { s: { useGroupedNotifications: false, enablePullToRefresh: false, animation: false, enableInfiniteScroll: false, enableAbsoluteTime: false, pollingInterval: 3 } } }));
vi.mock('@/store.js', () => ({ store: { s: { realtimeMode: true } } }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: { noNotifications: 'empty', loadMore: 'more' } } }));
vi.mock('@/i.js', () => ({ $i: null }));
vi.mock('@/local-storage.js', () => ({ miLocalStorage: { getItem: () => null, setItem: vi.fn() } }));
vi.mock('@/events.js', () => ({ globalEvents: { on: vi.fn(), off: vi.fn() } }));
vi.mock('@/stream.js', () => ({ useStream: () => ({
	useChannel: () => ({ on: (name: string, listener: (event: any) => void) => fixture.events.set(name, listener), dispose: vi.fn() }),
	on: (name: string, listener: () => void) => fixture.streamEvents.set(name, listener),
	off: (name: string) => fixture.streamEvents.delete(name),
}) }));
vi.mock('@@/js/use-document-visibility.js', async () => { const { ref } = await import('vue'); return { useDocumentVisibility: () => ref('visible') }; });
vi.mock('@@/js/scroll.js', () => ({ getScrollContainer: () => null, scrollToTop: vi.fn() }));
vi.mock('@/components/MkPullToRefresh.vue', () => ({ default: defineComponent({ render() { return h('div', this.$slots.default?.()); } }) }));
vi.mock('@/components/MkNotification.vue', () => ({ default: defineComponent({ props: ['notification'], render() { return h('article', { 'data-title': this.notification.title }, this.notification.title); } }) }));
vi.mock('@/components/MkHataFeedNotificationGroup.vue', () => ({ default: defineComponent({ render: () => h('div') }) }));
vi.mock('@/components/MkNote.vue', () => ({ default: defineComponent({ render: () => h('div') }) }));

type Notification = { id: string; type: 'app'; title: string; header: string; body: string; createdAt: string };
const item = (id: string, title: string): Notification => ({ id, type: 'app', title, header: 'ordinary', body: '', createdAt: '2026-09-30T00:00:00.000Z' });

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(done => { resolve = done; });
	return { promise, resolve };
}

let app: ReturnType<typeof createApp> | null;
let host: HTMLElement;

async function settle() { for (let i = 0; i < 8; i++) { await Promise.resolve(); await nextTick(); } }

function mount() {
	host = window.document.createElement('div'); window.document.body.append(host);
	app = createApp(MkStreamingNotificationsTimeline, { active: true, notUseGrouped: true });
	for (const name of ['MkLoading', 'MkError', 'MkResult']) app.component(name, { render: () => h('div') });
	app.directive('appear', {});
	app.mount(host);
}

function changed(ids: string[]) { fixture.events.get('notificationChanged')!({ ids }); }

function title() { return host.querySelector('article')?.getAttribute('data-title') ?? null; }

beforeEach(() => {
	fixture.api.mockReset(); fixture.events.clear(); fixture.streamEvents.clear(); fixture.intersection = null; fixture.observed.clear();
	vi.stubGlobal('IntersectionObserver', class {
		constructor(callback: IntersectionObserverCallback) { fixture.intersection = callback; }
		observe(target: Element) { fixture.observed.add(target); }
		disconnect() { fixture.observed.clear(); }
	});
});
afterEach(() => { app?.unmount(); app = null; host?.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

test('an intersecting row that leaves before the read delay remains unread', async () => {
	vi.useFakeTimers();
	fixture.api.mockImplementation((endpoint: string) => endpoint === 'i/notifications' ? Promise.resolve([item('one', 'shown')]) : Promise.resolve());
	mount(); await settle();
	const row = [...fixture.observed].find(element => element.hasAttribute('data-notification-ids'))!;
	const entry = (isIntersecting: boolean) => ({ target: row, isIntersecting } as IntersectionObserverEntry);
	fixture.intersection!([entry(true)], {} as IntersectionObserver);
	fixture.intersection!([entry(false)], {} as IntersectionObserver);
	vi.advanceTimersByTime(80); await settle();
	expect(fixture.api.mock.calls.filter(([endpoint]) => endpoint === 'notifications/mark-as-read')).toHaveLength(0);
});

test('out-of-order show responses cannot replace a newer notification revision', async () => {
	const first = deferred<Notification[]>();
	let showCalls = 0;
	fixture.api.mockImplementation((endpoint: string) => endpoint === 'i/notifications' ? Promise.resolve([item('one', 'initial')]) : endpoint === 'notifications/show' ? ++showCalls === 1 ? first.promise : Promise.resolve([item('one', 'newest')]) : Promise.resolve());
	mount(); await settle();
	changed(['one']); changed(['one']); await settle();
	expect(title()).toBe('newest');
	first.resolve([item('one', 'stale')]); await settle();
	expect(title()).toBe('newest');
});

test('a deleted sole row restores at its recorded position without treating it as a new arrival', async () => {
	let showCalls = 0;
	fixture.api.mockImplementation((endpoint: string) => endpoint === 'i/notifications' ? Promise.resolve([item('one', 'before')]) : endpoint === 'notifications/show' ? Promise.resolve(++showCalls === 1 ? [] : [item('one', 'restored')]) : Promise.resolve());
	mount(); await settle();
	changed(['one']); await settle(); expect(title()).toBeNull();
	changed(['one']); await settle(); expect(title()).toBe('restored');
	expect(fixture.api.mock.calls.filter(([endpoint]) => endpoint === 'notifications/mark-as-read')).toHaveLength(0);
});

test('an old list response stays hidden until its changed ID is revalidated after commit', async () => {
	const oldList = deferred<Notification[]>();
	const recheck = deferred<Notification[]>();
	let showCalls = 0;
	fixture.api.mockImplementation((endpoint: string) => endpoint === 'i/notifications' ? oldList.promise : endpoint === 'notifications/show' ? ++showCalls === 1 ? Promise.resolve([]) : recheck.promise : Promise.resolve());
	mount(); await settle();
	changed(['one']); await settle();
	oldList.resolve([item('one', 'deleted title')]); await settle();
	expect(title()).toBeNull();
	expect(showCalls).toBe(2);
	recheck.resolve([]); await settle();
	expect(title()).toBeNull();
});

test('a stale initial response cannot overwrite a completed reload after a deletion', async () => {
	const stale = deferred<Notification[]>();
	let listCalls = 0;
	fixture.api.mockImplementation((endpoint: string) => endpoint === 'i/notifications' ? ++listCalls === 1 ? stale.promise : Promise.resolve([]) : endpoint === 'notifications/show' ? Promise.resolve([]) : Promise.resolve());
	mount(); await settle();
	changed(['one']); await settle();
	fixture.events.get('notificationFlushed')!({ unreadNotificationsCount: 0, revision: '2' });
	await settle();
	expect(title()).toBeNull();
	stale.resolve([item('one', 'deleted title')]); await settle();
	expect(title()).toBeNull();
});

test('reconnection reloads the authorized page to drop stale loaded rows', async () => {
	let listCalls = 0;
	fixture.api.mockImplementation((endpoint: string) => endpoint === 'i/notifications' ? Promise.resolve(++listCalls === 1 ? [item('one', 'before')] : []) : Promise.resolve());
	mount(); await settle();
	expect(title()).toBe('before');
	fixture.streamEvents.get('_connected_')!(); await settle();
	expect(title()).toBeNull();
	expect(listCalls).toBe(2);
});
