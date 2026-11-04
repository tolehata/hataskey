/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import type * as Misskey from 'cherrypick-js';
import type { MenuItem } from '@/types/menu.js';
import { getNoteMenu } from './get-note-menu.js';
import { noteCharmDisplay } from './hatasaba-device-prefs.js';

const mocks = vi.hoisted(() => ({ signedIn: true, account: { id: 'me', policies: { canEditNote: false, canAutoRenote: true, autoRenoteMonthlyLimit: 10, canPublicNote: true } }, api: vi.fn(), save: vi.fn(), popup: vi.fn() }));
vi.mock('@/i.js', () => ({ get $i() { return mocks.signedIn ? mocks.account : null; } }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: { note: 'Note', _autoRenote: { set: 'Automatic renotes', manage: 'Manage automatic renotes' }, _noteCharm: { hideOthers: '他のユーザーのチャームを非表示', showOthers: '他のユーザーのチャームを表示' }, _hata: { _favoriteFolders: {} } } } }));
vi.mock('@/os.js', () => ({ popup: mocks.popup }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: mocks.api }));
vi.mock('@/events.js', () => ({ globalEvents: { emit: vi.fn() } }));
vi.mock('./achievements.js', () => ({ claimAchievement: vi.fn() }));
vi.mock('@/utility/navigator.js', () => ({ isSupportShare: () => false }));
vi.mock('@/preferences.js', () => ({ prefer: { s: { devMode: false } } }));
vi.mock('@/plugin.js', () => ({ getPluginHandlers: () => [] }));
vi.mock('@/components/MkRippleEffect.vue', () => ({ default: { render: () => null } }));
vi.mock('@/utility/get-user-menu.js', () => ({ getUserMenu: () => [] }));
vi.mock('@/utility/favorite-folders.js', () => ({ openFavoriteFolderPicker: vi.fn(), removeFavoriteNote: vi.fn() }));
vi.mock('@/store.js', () => ({ store: { s: {} } }));
vi.mock('@/instance.js', () => ({ instance: {} }));
vi.mock('@/cache.js', () => ({ clipsCache: { fetch: vi.fn() }, favoritedChannelsCache: { fetch: vi.fn(async () => []) } }));
vi.mock('@/local-storage.js', () => ({ miLocalStorage: { getItem: () => null, setItem: mocks.save } }));

function fixture(author = 'other', charm = true): Misskey.entities.Note {
	return {
		id: `note-${author}`, userId: author, user: { id: author, username: author, host: null, noteCharm: charm ? { url: '/charm.png', size: 76, pattern: 'cutout', color: '#123456' } : null },
		createdAt: new Date().toISOString(), visibility: 'public', text: 'text',
		renote: null, reply: null, channel: null, renoteId: null, replyId: null, files: [], fileIds: [], poll: null, cw: null,
	} as unknown as Misskey.entities.Note;
}

function charmAction(note: Misskey.entities.Note, showing = true) {
	const { menu } = getNoteMenu({ note, viewTextSource: ref(false), noNyaize: ref(false) });
	const label = showing ? '他のユーザーのチャームを非表示' : '他のユーザーのチャームを表示';
	const item = menu.find(item => !(item instanceof Promise) && 'text' in item && item.text === label);
	return item && !(item instanceof Promise) && 'action' in item ? item.action : undefined;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.signedIn = true;
	mocks.popup.mockReturnValue({ dispose: vi.fn() });
	vi.stubGlobal('innerWidth', 1400);
	vi.stubGlobal('navigator', { userAgent: 'desktop', maxTouchPoints: 0 });
	noteCharmDisplay.value = { show: true, motion: true, showOthers: true, wind: true };
	mocks.api.mockImplementation(async () => ({ isFavorited: false, isMutedThread: false }));
});
afterEach(() => vi.unstubAllGlobals());

describe('note menu viewer charm visibility', () => {
	test.each([true, false])('smartphones omit the charm action without changing display settings: showing=%s', showing => {
		vi.stubGlobal('navigator', { userAgent: 'iPhone', maxTouchPoints: 5 });
		noteCharmDisplay.value.showOthers = showing;
		const before = { ...noteCharmDisplay.value };
		expect(charmAction(fixture(), showing)).toBeUndefined();
		expect(noteCharmDisplay.value).toEqual(before);
		expect(mocks.save).not.toHaveBeenCalled();
	});

	test('omits the action in a narrow desktop window and restores it without changing preferences', () => {
		const before = { ...noteCharmDisplay.value };
		expect(charmAction(fixture())).toBeDefined();
		vi.stubGlobal('innerWidth', 390);
		expect(charmAction(fixture())).toBeUndefined();
		vi.stubGlobal('innerWidth', 1400);
		expect(charmAction(fixture())).toBeDefined();
		expect(noteCharmDisplay.value).toEqual(before);
		expect(mocks.save).not.toHaveBeenCalled();
	});

	test.each([true, false])('他人のチャームは本人設定を更新せず端末で一括非表示・再表示できる signedIn=%s', signedIn => {
		mocks.signedIn = signedIn;
		const note = fixture();
		const saved = structuredClone(note.user.noteCharm);
		const hide = charmAction(note);
		expect(hide).toBeDefined();
		mocks.api.mockClear();
		hide!(new MouseEvent('click'));
		expect(noteCharmDisplay.value).toEqual({ show: true, motion: true, showOthers: false, wind: true });
		expect(mocks.save).toHaveBeenLastCalledWith('noteCharmDisplay', JSON.stringify(noteCharmDisplay.value));
		expect(mocks.api).not.toHaveBeenCalled();
		expect(note.user.noteCharm).toEqual(saved);
		const show = charmAction(note, false);
		expect(show).toBeDefined();
		show!(new MouseEvent('click'));
		expect(noteCharmDisplay.value.showOthers).toBe(true);
	});

	test('本人・チャームなし・全表示OFFでは操作を出さない', () => {
		expect(charmAction(fixture('me'))).toBeUndefined();
		expect(charmAction(fixture('other', false))).toBeUndefined();
		noteCharmDisplay.value.show = false;
		expect(charmAction(fixture())).toBeUndefined();
	});

	test('リノートした人ではなく実際に表示されるノートの作者で判定する', () => {
		const other = fixture();
		const mine = fixture('me');
		expect(charmAction({ ...mine, text: null, renoteId: other.id, renote: other })).toBeDefined();
		expect(charmAction({ ...other, text: null, renoteId: mine.id, renote: mine })).toBeUndefined();
	});
});

describe('note ellipsis automatic renote entry', () => {
	async function noteChildren(menu: MenuItem[]): Promise<MenuItem[]> {
		const parent = menu.find(item => !(item instanceof Promise) && 'type' in item && item.type === 'parent' && item.text === 'Note');
		if (!parent || parent instanceof Promise || !('children' in parent)) throw new Error('Missing note submenu');
		return typeof parent.children === 'function' ? await parent.children() : parent.children;
	}

	test('keeps automatic renote actions inside the Note submenu and targets my displayed original', async () => {
		const original = fixture('me');
		const outer = { ...fixture('other'), text: null, renoteId: original.id, renote: original };
		const { menu } = getNoteMenu({ note: outer, viewTextSource: ref(false), noNyaize: ref(false) });
		expect(menu.some(item => !(item instanceof Promise) && 'text' in item && item.text === 'Automatic renotes')).toBe(false);
		expect(menu.some(item => !(item instanceof Promise) && 'to' in item && item.to === '/my/auto-renote')).toBe(false);
		const children = await noteChildren(menu);
		const item = children.find(item => !(item instanceof Promise) && 'text' in item && item.text === 'Automatic renotes');
		expect(item).toBeDefined();
		if (!item || item instanceof Promise || !('action' in item)) throw new Error('Missing automatic renote action');
		expect('disabled' in item && item.disabled).toBe(false);
		item.action(new MouseEvent('click'));
		expect(mocks.popup.mock.calls[0][1]).toEqual({ note: original });
		expect(children.some(item => !(item instanceof Promise) && 'to' in item && item.to === '/my/auto-renote')).toBe(true);
	});
	test('keeps management inside the submenu while disabling my nonpublic note', async () => {
		const note = { ...fixture('me'), visibility: 'followers' } as Misskey.entities.Note;
		const { menu } = getNoteMenu({ note, viewTextSource: ref(false), noNyaize: ref(false) });
		const children = await noteChildren(menu);
		const item = children.find(item => !(item instanceof Promise) && 'text' in item && item.text === 'Automatic renotes');
		expect(item && !(item instanceof Promise) && 'disabled' in item && item.disabled).toBe(true);
		expect(children.some(item => !(item instanceof Promise) && 'to' in item && item.to === '/my/auto-renote')).toBe(true);
	});
	test('my pure renote does not enable scheduling another author’s original', async () => {
		const original = fixture('other');
		const outer = { ...fixture('me'), text: null, renoteId: original.id, renote: original };
		const { menu } = getNoteMenu({ note: outer, viewTextSource: ref(false), noNyaize: ref(false) });
		const children = await noteChildren(menu);
		const item = children.find(item => !(item instanceof Promise) && 'text' in item && item.text === 'Automatic renotes');
		expect(item && !(item instanceof Promise) && 'disabled' in item && item.disabled).toBe(true);
		expect(mocks.popup).not.toHaveBeenCalled();
	});
	test('signed-out note menus omit both automatic renote actions', async () => {
		mocks.signedIn = false;
		const { menu } = getNoteMenu({ note: fixture(), viewTextSource: ref(false), noNyaize: ref(false) });
		const all = [...menu, ...await noteChildren(menu)];
		expect(all.some(item => !(item instanceof Promise) && 'text' in item && item.text === 'Automatic renotes')).toBe(false);
		expect(all.some(item => !(item instanceof Promise) && 'to' in item && item.to === '/my/auto-renote')).toBe(false);
	});
});
