/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import Hk3Timeline from './Hk3Timeline.vue';
import { hk3Toasts, hk3PostedNote } from './hk3-state.js';
import { prefer } from '@/preferences.js';

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(), sound: vi.fn(), api: vi.fn(), channel: vi.fn(), dispose: vi.fn(), lists: vi.fn(), antennas: vi.fn(),
	note: null as null | ((note: unknown) => void), rssMounts: 0, live: false,
	storage: new Map<string, string>(),
	intersection: null as null | ((entries: { isIntersecting: boolean }[]) => void),
}));
vi.mock('@/cache.js', async () => {
	const { ref } = await import('vue');
	const lists = ref([]);
	const antennas = ref([]);
	return {
		userListsCache: { fetch: async () => (lists.value = await mocks.lists()), value: lists },
		antennasCache: { fetch: async () => (antennas.value = await mocks.antennas()), value: antennas },
	};
});
vi.mock('@/utility/sound.js', () => ({ playMisskeySfx: mocks.sound }));
vi.mock('@/router.js', () => ({ mainRouter: { pushByPath: mocks.navigate } }));
vi.mock('@/i.js', () => ({ $i: { id: 'me', mutedWords: [], hardMutedWords: [] } }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	options: 'Options', showRenotes: 'Renotes', fileAttachedOnly: 'Files', withSensitive: 'Sensitive', retry: 'Retry',
	_hata: {
		_hataskeyUi3: { tabHome: 'Home', tabLocal: 'Local', tabSocial: 'Social', tabGlobal: 'Global', tabTrending: 'Trending', tabExternalHome: 'External home', tabExternalLocal: 'External local', realtime: 'LIVE', retry: 'Retry', loadFailed: 'Load failed', _rss: { settings: 'RSS settings' } },
		_hatasabaUi: { _simple: { list: 'Lists', channel: 'Channels', antenna: 'Antennas', selectList: 'Select list', selectAntenna: 'Select antenna', switchList: 'Switch list', switchAntenna: 'Switch antenna', configureList: 'Configure list', configureAntenna: 'Configure antenna', noLists: 'No lists', noAntennas: 'No antennas', options: 'Options' } },
	},
} } }));
vi.mock('@/preferences.js', async () => {
	const { ref } = await import('vue');
	return { prefer: { r: {
		animation: ref(false), hataskeyUi3RssEnabled: ref(true), ltlEmojiVoteEnabled: ref(false), hataskeyUi3ComposerPosition: ref('bottom'),
		'external.enabled': ref(false), 'external.token': ref(null), 'external.host': ref(''),
		'external.enableOHTL': ref(false), 'external.enableOLTL': ref(false),
		'simpleUi.topNav': ref([{ id: 'local', icon: '', label: 'Local', visible: true }]), 'simpleUi.showTrendingTab': ref(false),
	} } };
});
vi.mock('./hk3-state.js', async () => {
	const { ref } = await import('vue');
	return { hk3Toasts: ref([]), hk3ComposerLink: ref(null), hk3PostedNote: ref(null), pushHk3Toast: vi.fn(), dismissHk3Toast: vi.fn() };
});
vi.mock('@/store.js', async () => {
	const { ref } = await import('vue');
	const filter = { withRenotes: true, onlyFiles: false, withSensitive: true };
	return { store: { r: { tl: ref({ filter }) }, s: { tl: { filter } } } };
});
vi.mock('@/stream.js', () => ({ useStream: () => ({ useChannel: mocks.channel }) }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: mocks.api }));
vi.mock('@/local-storage.js', () => ({ miLocalStorage: {
	getItem: (key: string) => key === 'hataskeyUi3Live' && mocks.live ? 'true' : mocks.storage.get(key) ?? null,
	setItem: (key: string, value: string) => mocks.storage.set(key, value),
} }));
vi.mock('@/utility/external-api.js', () => ({ getExternalEmojiUrlMapForHost: () => ({}) }));
vi.mock('@/events.js', () => ({ useGlobalEvent: vi.fn() }));
vi.mock('@/composables/use-note-removal.js', () => ({ useNoteRemoval: () => ({ cancelAll: vi.fn(), remove: vi.fn() }) }));
vi.mock('@/utility/hataskey-timeline-availability.js', () => ({ isHataskeyTimelineAllowed: () => true }));
vi.mock('@/utility/ltl-emoji-vote-anchor.js', () => ({ getLtlEmojiVoteAnchor: () => null }));
vi.mock('@/utility/ltl-emoji-vote.js', async () => {
	const { ref } = await import('vue');
	return { useLtlEmojiVote: () => ({ round: ref(null), phase: ref('idle'), refresh: vi.fn() }) };
});
vi.mock('@/utility/hataskey-timeline-new-notes.js', async () => {
	const { ref } = await import('vue');
	return { hataskeyTimelineNewNotesKey: Symbol(), createHataskeyTimelineNewNotes: () => ({ notice: ref(null) }) };
});
vi.mock('./Hk3RssReader.vue', () => ({ default: {
	props: ['interrupted', 'paused'],
	setup() { mocks.rssMounts++; },
	template: '<div data-rss-reader :data-interrupted="String(interrupted)" :data-paused="String(paused)">Reader</div>',
} }));
vi.mock('./Hk3Note.vue', () => ({ default: {
	props: ['note', 'instanceBadgePosition', 'showAudienceIcons', 'size'],
	template: '<div :data-rendered-note="note.id" :data-badge-position="instanceBadgePosition" :data-audience-enabled="String(showAudienceIcons)" :data-note-size="size" />',
} }));
vi.mock('./Hk3PostSuccess.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkExternalTimeline.vue', () => ({ default: { props: ['src'], template: '<div :data-external-timeline="src" />' } }));
vi.mock('@/components/MkLtlEmojiVote.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkNoteActionAnimation.vue', () => ({ default: { render: () => null } }));

const cleanups: (() => void)[] = [];

async function settle() { for (let i = 0; i < 10; i++) { await Promise.resolve(); await nextTick(); } }

async function mount(compact = false) {
	const host = window.document.createElement('div');
	host.dataset.hk3Theme = 'dark';
	window.document.body.append(host);
	const app = createApp({ render: () => h(Hk3Timeline, { compact }) });
	for (const name of ['MkAvatar', 'MkLoading', 'Mfm']) app.component(name, { props: ['text'], template: '<span>{{ text }}</span>' });
	app.mount(host);
	cleanups.push(() => { app.unmount(); host.remove(); });
	await settle();
	return host;
}

beforeEach(() => {
	hk3Toasts.value = [];
	prefer.r.hataskeyUi3RssEnabled.value = true;
	prefer.r['simpleUi.topNav'].value = [{ id: 'local', icon: '', label: 'Local', visible: true }];
	prefer.r['simpleUi.showTrendingTab'].value = false;
	prefer.r['external.enabled'].value = false;
	prefer.r['external.token'].value = null;
	prefer.r['external.host'].value = '';
	prefer.r['external.enableOHTL'].value = false;
	prefer.r['external.enableOLTL'].value = false;
	mocks.rssMounts = 0;
	mocks.navigate.mockClear();
	mocks.sound.mockClear();
	mocks.live = false;
	mocks.storage.clear();
	mocks.api.mockReset().mockResolvedValue([]);
	mocks.lists.mockReset().mockResolvedValue([]);
	mocks.antennas.mockReset().mockResolvedValue([]);
	mocks.dispose.mockReset();
	mocks.channel.mockReset().mockImplementation(() => ({
		on: (_name: string, handler: (note: unknown) => void) => { mocks.note = handler; }, dispose: mocks.dispose,
	}));
	hk3PostedNote.value = null;
	vi.stubGlobal('IntersectionObserver', class {
		constructor(callback: (entries: { isIntersecting: boolean }[]) => void) { mocks.intersection = callback; }
		observe() {} disconnect() {}
	});
});

function navButton(host: Element, title: string) {
	const button = host.querySelector<HTMLButtonElement>(`button[title="${title}"], button[aria-label="${title}"]`);
	expect(button, title).not.toBeNull();
	return button!;
}

describe('UI S collection navigation', () => {
	it.each([false, true])('opens the remembered list with UI S notes and its own stream (compact=%s)', async compact => {
		mocks.lists.mockResolvedValue([{ id: 'first', name: 'First list' }, { id: 'saved', name: 'Saved list' }]);
		mocks.storage.set('hatasabaLastListId', 'saved');
		mocks.api.mockImplementation(async (endpoint: string) => endpoint === 'notes/user-list-timeline' ? [{ id: 'list-note', userId: 'other', user: { id: 'other' }, text: 'body' }] : []);
		const host = await mount(compact);
		navButton(host, 'Lists').click();
		await settle();
		expect(mocks.api).toHaveBeenLastCalledWith('notes/user-list-timeline', expect.objectContaining({ listId: 'saved', limit: 20 }));
		expect(mocks.channel).toHaveBeenLastCalledWith('userList', expect.objectContaining({ listId: 'saved' }));
		expect(mocks.dispose).toHaveBeenCalled();
		expect(host.querySelector('[data-rendered-note="list-note"]')).not.toBeNull();
		expect(host.querySelector('[data-rendered-note="list-note"]')?.getAttribute('data-badge-position')).toBe('left');
		expect(host.textContent).toContain('Saved list');
		mocks.intersection?.([{ isIntersecting: true }]);
		await settle();
		expect(mocks.api).toHaveBeenLastCalledWith('notes/user-list-timeline', expect.objectContaining({ listId: 'saved', untilId: 'list-note' }));
		hk3PostedNote.value = { id: 'unrelated-own-note', userId: 'me' } as NonNullable<typeof hk3PostedNote.value>;
		await settle();
		expect(host.querySelector('[data-rendered-note="unrelated-own-note"]')).toBeNull();
		navButton(host, 'Configure list').click();
		expect(mocks.navigate).toHaveBeenCalledWith('/my/lists/saved');
	});

	it('falls back from a deleted antenna and opens channels through the existing page', async () => {
		mocks.antennas.mockResolvedValue([{ id: 'available', name: 'My antenna' }]);
		mocks.storage.set('hatasabaLastAntennaId', 'deleted');
		const host = await mount();
		navButton(host, 'Antennas').click();
		await settle();
		expect(mocks.api).toHaveBeenLastCalledWith('antennas/notes', expect.objectContaining({ antennaId: 'available' }));
		expect(mocks.channel).toHaveBeenLastCalledWith('antenna', { antennaId: 'available' });
		expect(mocks.storage.get('hatasabaLastAntennaId')).toBe('available');
		navButton(host, 'Channels').click();
		expect(mocks.navigate).toHaveBeenCalledWith('/channels');
	});

	it('restores a saved collection tab only after validating its remembered ID', async () => {
		mocks.storage.set('hataskeyUi3Tab', 'list');
		mocks.storage.set('hatasabaLastListId', 'removed');
		mocks.lists.mockResolvedValue([{ id: 'valid', name: 'Valid list' }]);
		await mount();
		expect(mocks.api).toHaveBeenCalledWith('notes/user-list-timeline', expect.objectContaining({ listId: 'valid' }));
		expect(mocks.api.mock.calls.some(([, params]) => params?.listId === 'removed')).toBe(false);
	});

	it('keeps the current timeline when no collection exists and offers management', async () => {
		const host = await mount();
		navButton(host, 'Lists').click();
		await settle();
		expect(host.textContent).toContain('No lists');
		expect(mocks.api.mock.calls.some(([endpoint]) => endpoint === 'notes/user-list-timeline')).toBe(false);
		expect(mocks.channel).toHaveBeenLastCalledWith('localTimeline', expect.anything());
	});

	it('switches between lists and persists the new selection', async () => {
		mocks.lists.mockResolvedValue([{ id: 'one', name: 'List one' }, { id: 'two', name: 'List two' }]);
		const host = await mount();
		navButton(host, 'Lists').click();
		await settle();
		navButton(host, 'Switch list').click();
		await settle();
		const second = [...host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'List two');
		expect(second).toBeDefined();
		second!.click();
		await settle();
		expect(mocks.api).toHaveBeenLastCalledWith('notes/user-list-timeline', expect.objectContaining({ listId: 'two' }));
		expect(mocks.storage.get('hatasabaLastListId')).toBe('two');
		expect(mocks.dispose).toHaveBeenCalledTimes(2);
	});

	it('does not switch back when a dismissed selection request finishes late', async () => {
		let finish!: (items: { id: string; name: string }[]) => void;
		mocks.lists.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
		const host = await mount();
		navButton(host, 'Lists').click();
		await settle();
		navButton(host, 'Local').click();
		finish([{ id: 'late', name: 'Late list' }]);
		await settle();
		expect(mocks.api.mock.calls.some(([endpoint]) => endpoint === 'notes/user-list-timeline')).toBe(false);
		expect(mocks.channel).toHaveBeenLastCalledWith('localTimeline', expect.anything());
	});

	it('distinguishes a fetch failure from an empty list and retries without losing the current timeline', async () => {
		mocks.lists.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([{ id: 'recovered', name: 'Recovered list' }]);
		const host = await mount();
		navButton(host, 'Lists').click();
		await settle();
		expect(host.querySelector('[data-collection-picker]')?.getAttribute('data-state')).toBe('error');
		expect(host.textContent).not.toContain('No lists');
		host.querySelector<HTMLButtonElement>('[data-collection-retry]')!.click();
		await settle();
		expect(mocks.api).toHaveBeenLastCalledWith('notes/user-list-timeline', expect.objectContaining({ listId: 'recovered' }));
	});

	it('closes an empty picker with Escape and returns focus to the navigation button', async () => {
		const host = await mount();
		const opener = navButton(host, 'Lists');
		opener.click();
		await settle();
		expect(host.querySelector('[data-collection-picker]')).not.toBeNull();
		window.document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settle();
		expect(host.querySelector('[data-collection-picker]')).toBeNull();
		expect(window.document.activeElement).toBe(opener);
	});
});

describe('UI S streamed note sounds', () => {
	it.each([false, true])('plays once for a new note (LIVE=%s), without replaying duplicates or released queues', async live => {
		mocks.live = live;
		const host = await mount();
		expect(mocks.sound).not.toHaveBeenCalled();
		const note = { id: 'new-note', userId: 'other', user: { id: 'other' }, text: 'hello' };
		mocks.note?.(note);
		await settle();
		expect(mocks.sound).toHaveBeenCalledExactlyOnceWith('note');
		mocks.note?.(note);
		host.querySelector<HTMLButtonElement>('[data-kind="queue"]')?.click();
		await settle();
		mocks.note?.(note);
		expect(mocks.sound).toHaveBeenCalledTimes(1);
	});

	it('uses the configured own-note sound for an own note received from the stream', async () => {
		await mount();
		mocks.note?.({ id: 'own-note', userId: 'me', user: { id: 'me' }, text: 'hello' });
		expect(mocks.sound).toHaveBeenCalledExactlyOnceWith('noteMy');
	});
});
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.unstubAllGlobals(); });

describe('UI S shared RSS banner', () => {
	it('keeps the reader mounted through a notice, queued notes, and their dismissal', async () => {
		const host = await mount();
		const reader = host.querySelector('[data-rss-reader]');
		expect(reader?.getAttribute('data-interrupted')).toBe('false');
		mocks.note?.({ id: 'new-note', user: { id: 'other' }, text: 'hello' });
		hk3Toasts.value = [{ id: 'notice', icon: 'star', text: 'Saved' }];
		await settle();
		expect(host.querySelector('[data-kind="toast"]')?.textContent).toContain('Saved');
		expect(reader?.getAttribute('data-interrupted')).toBe('true');
		hk3Toasts.value = [];
		await settle();
		const queued = host.querySelector<HTMLButtonElement>('[data-kind="queue"]');
		expect(queued).not.toBeNull();
		queued?.click();
		await settle();
		expect(reader?.getAttribute('data-interrupted')).toBe('false');
		expect(host.querySelector('[data-rss-reader]')).toBe(reader);
		expect(mocks.rssMounts).toBe(1);
	});
	it('pauses RSS for timeline collapse and exposes settings even when RSS is disabled', async () => {
		const host = await mount();
		host.setAttribute('data-hata-timeline-collapse-active', 'true');
		await settle();
		expect(host.querySelector('[data-rss-reader]')?.getAttribute('data-paused')).toBe('true');
		host.removeAttribute('data-hata-timeline-collapse-active');
		await settle();
		expect(host.querySelector('[data-rss-reader]')?.getAttribute('data-paused')).toBe('false');
		prefer.r.hataskeyUi3RssEnabled.value = false;
		await settle();
		expect(host.querySelector('[data-rss-reader]')).toBeNull();
		host.querySelector<HTMLButtonElement>('[aria-label="Options"]')?.click();
		await settle();
		host.querySelector<HTMLButtonElement>('[role="menuitem"]')?.click();
		expect(mocks.navigate).toHaveBeenCalledWith('/settings/preferences?destination=hataskey-ui-s#hataskey-ui-s-rss-heading');
	});
});

describe('UI S audience icon tab gating', () => {
	it.each([false, true])('passes the audience flag only for home/social through tab switches (compact=%s)', async compact => {
		mocks.storage.set('hataskeyUi3Tab', 'following');
		prefer.r['simpleUi.topNav'].value = ['following', 'social', 'local', 'mixed'].map(id => ({ id, icon: '', label: id, visible: true }));
		prefer.r['simpleUi.showTrendingTab'].value = true;
		prefer.r['external.enabled'].value = true;
		prefer.r['external.token'].value = 'test-token';
		prefer.r['external.host'].value = 'external.example';
		prefer.r['external.enableOHTL'].value = true;
		prefer.r['external.enableOLTL'].value = true;
		mocks.lists.mockResolvedValue([{ id: 'list', name: 'My list' }]);
		mocks.antennas.mockResolvedValue([{ id: 'antenna', name: 'My antenna' }]);
		mocks.api.mockResolvedValue([{ id: 'same-note', userId: 'other', user: { id: 'other' }, text: 'body' }]);
		const host = await mount(compact);
		const assertAudience = (enabled: boolean) => {
			const rendered = host.querySelector('[data-rendered-note="same-note"]');
			expect(rendered).not.toBeNull();
			expect(rendered?.getAttribute('data-audience-enabled')).toBe(String(enabled));
			expect(rendered?.getAttribute('data-note-size')).toBe(compact ? 'sm' : 'lg');
		};
		assertAudience(true);
		for (const [label, enabled] of [
			['Social', true], ['Local', false], ['Global', false], ['Trending', false],
			['Lists', false], ['Antennas', false], ['Home', true],
		] as const) {
			navButton(host, label).click();
			await settle();
			assertAudience(enabled);
		}
		for (const [label, src] of [['External home', 'ohtl'], ['External local', 'oltl']] as const) {
			navButton(host, label).click();
			await settle();
			expect(host.querySelector(`[data-external-timeline="${src}"]`)).not.toBeNull();
			expect(host.querySelector('[data-rendered-note]')).toBeNull();
		}
		navButton(host, 'Social').click();
		await settle();
		assertAudience(true);
	});

	it.each(['following', 'social', 'local', 'mixed', 'trending', 'list', 'antenna'])('applies gating on a restored %s tab', async tab => {
		prefer.r['simpleUi.topNav'].value = ['following', 'social', 'local', 'mixed'].map(id => ({ id, icon: '', label: id, visible: true }));
		prefer.r['simpleUi.showTrendingTab'].value = true;
		mocks.storage.set('hataskeyUi3Tab', tab);
		mocks.lists.mockResolvedValue([{ id: 'list', name: 'My list' }]);
		mocks.antennas.mockResolvedValue([{ id: 'antenna', name: 'My antenna' }]);
		mocks.api.mockResolvedValue([{ id: 'restored-note', userId: 'other', user: { id: 'other' }, text: 'body' }]);
		const host = await mount();
		expect(host.querySelector('[data-rendered-note="restored-note"]')?.getAttribute('data-audience-enabled')).toBe(String(tab === 'following' || tab === 'social'));
	});
});
