/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import Hk3Note from './Hk3Note.vue';
import type * as Misskey from 'cherrypick-js';

const mocks = vi.hoisted(() => ({
	apiWithDialog: vi.fn(),
	emit: vi.fn(),
	post: vi.fn(),
	popupMenu: vi.fn(),
	api: vi.fn(),
	picker: vi.fn(),
	menu: vi.fn(),
}));

vi.mock('@/os.js', () => ({ apiWithDialog: mocks.apiWithDialog, post: mocks.post, popupMenu: mocks.popupMenu }));
vi.mock('@/events.js', () => ({ globalEvents: { emit: mocks.emit } }));
vi.mock('@/i.js', () => ({ $i: { id: 'me' } }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	unrenote: 'Undo renote', cancel: 'Cancel',
	renote: 'Renote', quote: 'Quote', more: 'More',
	_hata: { _hataskeyUi3: {
		conversation: 'Conversation', reply: 'Reply', addReaction: 'React',
		unrenoteConfirm: 'Undo this renote?', unrenoteConfirmAction: 'Confirm undo',
	} },
} } }));
vi.mock('@/preferences.js', () => ({ prefer: { s: { animation: false } } }));
vi.mock('@/utility/check-word-mute.js', () => ({ checkWordMute: () => false }));
vi.mock('@/composables/use-note-capture.js', () => ({
	noteEvents: { emit: vi.fn() },
	useNoteCapture: ({ note: captured }: { note: { reactions: Record<string, number>; reactionEmojis: Record<string, string> } }) => ({
		$note: { reactions: captured.reactions, reactionEmojis: captured.reactionEmojis, myReaction: null },
		subscribe: vi.fn(),
	}),
}));
vi.mock('@/utility/reaction-picker.js', () => ({ reactionPicker: { show: mocks.picker } }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: mocks.api }));
vi.mock('@/utility/get-note-menu.js', () => ({ getNoteMenu: mocks.menu, getRenoteMenu: vi.fn() }));
vi.mock('@/utility/please-login.js', () => ({ pleaseLogin: vi.fn() }));
vi.mock('@/utility/sound.js', () => ({ playMisskeySfx: vi.fn() }));
vi.mock('@/filters/note.js', () => ({ notePage: (linked: { id: string }) => `/notes/${linked.id}` }));
vi.mock('@/filters/user.js', () => ({ userPage: (user: { id: string }) => `/users/${user.id}` }));
vi.mock('@/components/MkMediaList.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkPoll.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkReactionIcon.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkUtageStatus.vue', () => ({ default: { render: () => null } }));
vi.mock('./Hk3ConfirmBubble.vue', () => ({ default: { render: () => null } }));

type NoteFixture = {
	id: string;
	userId: string;
	user: { id: string; username: string; host: null };
	createdAt: string;
	text: string | null;
	cw: null;
	renoteId: string | null;
	renote?: NoteFixture;
	fileIds: string[];
	files: never[];
	visibility: 'public';
	reactions: Record<string, number>;
	reactionEmojis: Record<string, string>;
	repliesCount: number;
	renoteCount: number;
};

function note(id: string, userId = 'me', text: string | null = 'body'): NoteFixture {
	return {
		id, userId, user: { id: userId, username: userId, host: null },
		createdAt: '2026-09-26T00:00:00.000Z', text, cw: null, renoteId: null,
		fileIds: [], files: [], visibility: 'public', reactions: {}, reactionEmojis: {},
		repliesCount: 0, renoteCount: 0,
	};
}

const cleanups: (() => void)[] = [];

async function settle() {
	await Promise.resolve();
	await nextTick();
	await nextTick();
}

function mount(size: 'lg' | 'sm') {
	const parent = { ...note('parent', 'author'), repliesCount: 2 };
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const app = createApp({ render: () => h(Hk3Note, { note: parent as unknown as Misskey.entities.Note, size }) });
	app.component('MkA', { props: { to: String }, template: '<a :href="to"><slot /></a>' });
	for (const name of ['MkAvatar', 'MkUserName', 'MkTime', 'Mfm', 'MkLoading']) {
		app.component(name, { template: '<span><slot /></span>' });
	}
	app.directive('user-preview', {});
	app.mount(target);
	cleanups.push(() => { app.unmount(); target.remove(); });
	return target;
}

function button(root: Element, label: string) {
	const found = root.querySelector<HTMLButtonElement>(`button[title="${label}"]`);
	expect(found).not.toBeNull();
	return found!;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.api.mockImplementation((endpoint: string) => Promise.resolve(endpoint === 'notes/replies'
		? [{ ...note('reply-b', 'b'), reactions: { '👍': 1 } }, note('reply-a', 'a')]
		: undefined));
	mocks.popupMenu.mockResolvedValue(undefined);
	mocks.menu.mockReturnValue({ menu: [], cleanup: vi.fn() });
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
	vi.stubGlobal('requestAnimationFrame', () => 1);
	vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
	cleanups.splice(0).forEach(cleanup => cleanup());
	vi.unstubAllGlobals();
});

describe('Hk3Note expanded replies', () => {
	it.each(['lg', 'sm'] as const)('targets each reply independently in %s', async size => {
		const target = mount(size);
		button(target, 'Conversation').click();
		await settle();
		expect(mocks.api).toHaveBeenCalledWith('notes/replies', { noteId: 'parent', limit: 10 });
		for (const id of ['reply-a', 'reply-b']) {
			const child = target.querySelector<HTMLElement>(`[data-note-id="${id}"]`)!;
			expect(child).not.toBeNull();
			button(child, 'Reply').focus();
			await settle();
			button(child, 'Reply').click();
			expect(mocks.post.mock.lastCall?.[0].reply.id).toBe(id);
			button(child, 'More').click();
			expect(mocks.menu.mock.lastCall?.[0].note.id).toBe(id);
			await settle();
			button(child, 'React').click();
			expect(mocks.picker.mock.lastCall?.[1].id).toBe(id);
			await mocks.picker.mock.lastCall?.[2]('❤️');
			await settle();
			expect(mocks.api).toHaveBeenLastCalledWith('notes/reactions/create', { noteId: id, reaction: '❤️' });
		}
		const chip = target.querySelector<HTMLButtonElement>('[data-note-id="reply-b"] button[data-reaction="👍"]')!;
		chip.click();
		await settle();
		expect(mocks.api).toHaveBeenLastCalledWith('notes/reactions/create', { noteId: 'reply-b', reaction: '👍' });
		expect(target.querySelector('a button')).toBeNull();
		expect(mocks.post.mock.calls.every(([options]) => options.reply.id !== 'parent')).toBe(true);
	});
});
