/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, provide, ref } from 'vue';
import type { HatadyActivity, HatadyMediaSession } from './hatady-media.js';
import { HATA_GOES_HOST } from './hatagoes-context.js';

const fixture = vi.hoisted(() => ({ menu: vi.fn(), clipboard: vi.fn(), push: vi.fn() }));
vi.mock('@@/js/config.js', () => ({ url: 'https://example.test' }));
vi.mock('@/i.js', () => ({ $i: { id: 'me' } }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	copyLink: 'リンクをコピー', reactionsList: 'リアクション一覧',
	_hata: { _hatady: { _home: { openInHatady: 'Hatadyで開く', edit: '編集', delete: '削除', report: '通報', hatadyProfile: 'プロフィール' } } },
} } }));
vi.mock('@/router.js', () => ({ mainRouter: { pushByPath: fixture.push }, useRouter: () => ({ pushByPath: fixture.push }) }));
vi.mock('@/utility/hatady-home.js', () => ({ activityData: () => ({ title: '', body: '' }) }));
vi.mock('@/utility/hatady-prefs.js', () => ({ loadHatadyDisplay: vi.fn() }));
vi.mock('@/utility/hatady-record-delete.js', () => ({ confirmHatadyRecordDeletion: vi.fn() }));
vi.mock('@/utility/hatagoes-popup.js', () => ({ useHataGoesPopup: () => vi.fn(), useHataGoesPopupMenu: () => fixture.menu }));
vi.mock('@/utility/copy-to-clipboard.js', () => ({ copyToClipboard: fixture.clipboard }));
import { useHatadyActivityActions } from './hatady-activity-actions.js';

const cleanup: Array<() => void> = [];
type Menu = Array<{ text: string; action: () => void; danger?: boolean }>;
const record = (mine: boolean, media = false): HatadyActivity => ({
	id: 'activity', type: 'study', occurredAt: '2026-01-01T00:00:00Z', visibility: 'public', isMine: mine,
	user: { id: mine ? 'me' : 'other', username: 'other' } as HatadyActivity['user'],
	...(media ? { media: { work: null, session: { id: 'session-1', workId: 'work-1' } as HatadyMediaSession } } : { study: { id: 'log-1' } }),
});

function menu(host: boolean, activity: HatadyActivity): Menu {
	const element = window.document.createElement('div');
	const app = createApp(defineComponent({ setup() {
		if (host) provide(HATA_GOES_HOST, { active: ref(true), register: vi.fn(), changed: vi.fn() });
		return () => h(defineComponent({ setup() {
			const actions = useHatadyActivityActions({});
			return () => h('button', { onClick: (event: MouseEvent) => actions.openActivityMenu(activity, event) }, 'menu');
		} }));
	} }));
	app.mount(element);
	cleanup.push(() => app.unmount());
	element.querySelector('button')?.click();
	return fixture.menu.mock.lastCall?.[0] as Menu;
}

beforeEach(() => { fixture.menu.mockReset(); fixture.clipboard.mockReset(); fixture.push.mockReset(); });
afterEach(() => cleanup.splice(0).forEach(fn => fn()));

test('HataGoes owner menu orders edit, copy, breakdown and guarded delete', () => {
	const items = menu(true, record(true));
	expect(items.map(item => item.text)).toEqual(['編集', 'リンクをコピー', 'リアクション一覧', '削除']);
	expect(items.at(-1)?.danger).toBe(true);
	items.find(item => item.text === 'リンクをコピー')?.action();
	expect(fixture.clipboard).toHaveBeenCalledWith('https://example.test/hatagoes?view=%2Fhatady%3Ftab%3Drecords%26hgKind%3Dlog%26hgId%3Dlog-1', 'link');
});

test('HataGoes other-user menu offers report and a session-specific link', () => {
	const items = menu(true, record(false, true));
	expect(items.map(item => item.text)).toEqual(['リンクをコピー', 'リアクション一覧', 'プロフィール', '通報']);
	items[0].action();
	expect(fixture.clipboard).toHaveBeenCalledWith('https://example.test/hatagoes?view=%2Fhatady%3Ftab%3Drecords%26hgKind%3DmediaSession%26hgId%3Dsession-1', 'link');
	expect(items.some(item => item.text === '編集' || item.text === '削除')).toBe(false);
});

test('legacy menu does not gain HataGoes actions', () => {
	expect(menu(false, record(true)).map(item => item.text)).toEqual(['編集', '削除']);
	expect(menu(false, record(false)).map(item => item.text)).toEqual(['プロフィール', '通報']);
});
