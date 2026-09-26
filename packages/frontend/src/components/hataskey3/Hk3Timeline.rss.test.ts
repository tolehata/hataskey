/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import Hk3Timeline from './Hk3Timeline.vue';
import { hk3Toasts } from './hk3-state.js';
import { prefer } from '@/preferences.js';

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), note: null as null | ((note: unknown) => void), rssMounts: 0 }));
vi.mock('@/router.js', () => ({ mainRouter: { pushByPath: mocks.navigate } }));
vi.mock('@/i.js', () => ({ $i: { id: 'me', mutedWords: [], hardMutedWords: [] } }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	options: 'Options', showRenotes: 'Renotes', fileAttachedOnly: 'Files', withSensitive: 'Sensitive',
	_hata: { _hataskeyUi3: { tabHome: 'Home', tabLocal: 'Local', realtime: 'LIVE', _rss: { settings: 'RSS settings' } } },
} } }));
vi.mock('@/preferences.js', async () => {
	const { ref } = await import('vue');
	return { prefer: { r: {
		animation: ref(false), hataskeyUi3RssEnabled: ref(true), ltlEmojiVoteEnabled: ref(false), hataskeyUi3ComposerPosition: ref('bottom'),
		'external.enabled': ref(false), 'external.token': ref(null), 'external.host': ref(''),
		'simpleUi.topNav': ref([{ id: 'local' }]), 'simpleUi.showTrendingTab': ref(false),
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
vi.mock('@/stream.js', () => ({ useStream: () => ({ useChannel: () => ({
	on: (_name: string, handler: (note: unknown) => void) => { mocks.note = handler; }, dispose: vi.fn(),
}) }) }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn(async () => []) }));
vi.mock('@/local-storage.js', () => ({ miLocalStorage: { getItem: () => null, setItem: vi.fn() } }));
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
vi.mock('./Hk3Note.vue', () => ({ default: { render: () => null } }));
vi.mock('./Hk3PostSuccess.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkExternalTimeline.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkLtlEmojiVote.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkNoteActionAnimation.vue', () => ({ default: { render: () => null } }));

const cleanups: (() => void)[] = [];

async function settle() { for (let i = 0; i < 5; i++) { await Promise.resolve(); await nextTick(); } }

async function mount() {
	const host = window.document.createElement('div');
	host.dataset.hk3Theme = 'dark';
	window.document.body.append(host);
	const app = createApp({ render: () => h(Hk3Timeline) });
	for (const name of ['MkAvatar', 'MkLoading', 'Mfm']) app.component(name, { props: ['text'], template: '<span>{{ text }}</span>' });
	app.mount(host);
	cleanups.push(() => { app.unmount(); host.remove(); });
	await settle();
	return host;
}

beforeEach(() => {
	hk3Toasts.value = [];
	prefer.r.hataskeyUi3RssEnabled.value = true;
	mocks.rssMounts = 0;
	mocks.navigate.mockClear();
	vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
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
