/* SPDX-License-Identifier: AGPL-3.0-only */
import { createApp, h, nextTick, ref } from 'vue';
import type { Slots } from 'vue';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import HatadyHome from './HatadyHome.vue';
import { HATA_GOES_HOST, HATA_GOES_SESSION } from '@/utility/hatagoes-context.js';

const dialog = vi.hoisted(() => ({ close: vi.fn(), finish: null as null | (() => void) }));

vi.mock('@@/js/locale.js', async () => {
	const { readFileSync } = await import('node:fs');
	const { resolve } = await import('node:path');
	const { load } = await import('js-yaml');
	return { locale: load(readFileSync(resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8')) };
});
vi.mock('@/account.js', () => ({ $i: null }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn(async (path: string) => path === 'hata/hatady/activities' ? { items: [], nextCursor: null, hasMore: false } : []) }));
vi.mock('@/preferences.js', async () => {
	const { ref } = await import('vue');
	return { prefer: { r: { animation: ref(false) }, s: {}, commit: vi.fn() } };
});
vi.mock('@/components/HyDialog.vue', async () => {
	const { h } = await import('vue');
	return { default: {
		setup(_props: unknown, { emit, expose, slots }: { emit: (event: string) => void; expose: (value: object) => void; slots: Slots }) {
			expose({ close: () => { dialog.close(); dialog.finish = () => emit('closed'); } });
			return () => h('div', { 'data-overview-dialog': '' }, [
				h('button', { class: 'dialog-close', onClick: () => emit('close') }, 'close'),
				...(slots.default?.() ?? []),
			]);
		},
	} };
});

let app: ReturnType<typeof createApp> | null = null;
let host: HTMLElement | null = null;
const active = ref(true);
const sessionActive = ref(true);
const records = vi.fn();

async function flush() { await nextTick(); await Promise.resolve(); await nextTick(); }

async function mount() {
	host = window.document.createElement('div');
	window.document.body.append(host);
	app = createApp({ render: () => h(HatadyHome, { revision: 0, onRecords: records }) });
	app.provide(HATA_GOES_HOST, { active, register: () => () => {}, changed: () => {} });
	app.provide(HATA_GOES_SESSION, { active: sessionActive, track: () => () => {}, preserveDraft: () => () => {} });
	app.component('MkUserName', { render: () => h('span') });
	app.component('MkTime', { render: () => h('time') });
	app.component('MkAvatar', { render: () => h('span') });
	app.component('Mfm', { render: () => h('span') });
	app.mount(host);
	await flush();
	host.querySelector<HTMLButtonElement>('header button.hy-secondary')!.click();
	await flush();
	return window.document.querySelector<HTMLElement>('[data-overview-dialog]')!;
}

beforeEach(() => {
	active.value = true;
	sessionActive.value = true;
	dialog.close.mockClear();
	dialog.finish = null;
	records.mockClear();
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
	vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => {
	app?.unmount();
	host?.remove();
	app = null;
	host = null;
	vi.unstubAllGlobals();
});

test('overview renders at body level and closes after the dialog transition', async () => {
	const overlay = await mount();
	expect(overlay.parentElement).toBe(window.document.body);
	expect(host!.contains(overlay)).toBe(false);
	overlay.querySelector<HTMLButtonElement>('.dialog-close')!.click();
	await flush();
	expect(dialog.close).toHaveBeenCalledOnce();
	expect(window.document.body.contains(overlay)).toBe(true);
	dialog.finish?.();
	await flush();
	expect(window.document.body.contains(overlay)).toBe(false);
});

test('selecting a ranked kind emits records after closure', async () => {
	const overlay = await mount();
	overlay.querySelector<HTMLButtonElement>('button:not(.dialog-close)')!.click();
	await flush();
	expect(dialog.close).toHaveBeenCalledOnce();
	expect(records).not.toHaveBeenCalled();
	dialog.finish?.();
	await flush();
	expect(records).toHaveBeenCalledWith('study');
});

test('inactive pane, session, and owner unmount remove the portal', async () => {
	await mount();
	active.value = false;
	await flush();
	expect(window.document.querySelector('[data-overview-dialog]')).toBeNull();
	active.value = true;
	host!.querySelector<HTMLButtonElement>('header button.hy-secondary')!.click();
	await flush();
	expect(window.document.querySelector('[data-overview-dialog]')).not.toBeNull();
	sessionActive.value = false;
	await flush();
	expect(window.document.querySelector('[data-overview-dialog]')).toBeNull();
	sessionActive.value = true;
	host!.querySelector<HTMLButtonElement>('header button.hy-secondary')!.click();
	await flush();
	expect(window.document.querySelector('[data-overview-dialog]')).not.toBeNull();
	app!.unmount();
	app = null;
	expect(window.document.querySelector('[data-overview-dialog]')).toBeNull();
});
