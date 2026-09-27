/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import Hk3Note from './Hk3Note.vue';
import type * as Misskey from 'cherrypick-js';

const mocks = vi.hoisted(() => ({
	apiWithDialog: vi.fn(),
	emit: vi.fn(),
	popupMenu: vi.fn(),
	copyLink: vi.fn(),
	abuse: vi.fn(),
	account: { id: 'me', isAdmin: false, isModerator: false },
}));

vi.mock('@/os.js', () => ({ apiWithDialog: mocks.apiWithDialog, popupMenu: mocks.popupMenu }));
vi.mock('@/events.js', () => ({ globalEvents: { emit: mocks.emit } }));
vi.mock('@/i.js', () => ({ $i: mocks.account }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	unrenote: 'Undo renote', cancel: 'Cancel',
	renote: 'Renote', quote: 'Quote', more: 'More',
	renoteDetails: 'Renote details', copyLinkRenote: 'Copy renote link', reportAbuseRenote: 'Report renote',
	_hata: { _hataskeyUi3: {
		reply: 'Reply', addReaction: 'React',
		unrenoteConfirm: 'Undo this renote?', unrenoteConfirmAction: 'Confirm undo',
	} },
} } }));
vi.mock('@/custom-emojis.js', () => ({ customEmojisMap: new Map() }));
vi.mock('@/preferences.js', async () => {
	const { ref } = await import('vue');
	return { prefer: { s: { animation: false }, r: { disableNyaize: ref(false) } } };
});
vi.mock('@/utility/check-word-mute.js', () => ({ checkWordMute: () => false }));
vi.mock('@/composables/use-note-capture.js', () => ({
	noteEvents: { emit: vi.fn() },
	useNoteCapture: ({ note: captured }: { note: { reactions: Record<string, number>; reactionEmojis: Record<string, string> } }) => ({
		$note: { reactions: captured.reactions, reactionEmojis: captured.reactionEmojis, myReaction: null },
		subscribe: vi.fn(),
	}),
}));
vi.mock('@/utility/reaction-picker.js', () => ({ reactionPicker: { show: vi.fn() } }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn() }));
vi.mock('@/utility/get-note-menu.js', () => ({ getNoteMenu: vi.fn(), getRenoteMenu: vi.fn(), getCopyNoteLinkMenu: mocks.copyLink, getAbuseNoteMenu: mocks.abuse }));
vi.mock('@/utility/please-login.js', () => ({ pleaseLogin: vi.fn() }));
vi.mock('@/utility/sound.js', () => ({ playMisskeySfx: vi.fn() }));
vi.mock('@/filters/note.js', () => ({ notePage: (linked: { id: string }) => `/notes/${linked.id}` }));
vi.mock('@/filters/user.js', () => ({ userPage: (user: { id: string }) => `/users/${user.id}` }));
vi.mock('@/components/MkMediaList.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkPoll.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkReactionIcon.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkReactionsViewer.reaction.vue', () => ({ default: {
	props: ['noteId', 'note', 'reaction', 'reactionEmojis', 'myReaction', 'count', 'isInitial', 'custom'],
	emits: ['activate'],
	template: '<button type="button" @click="$emit(\'activate\', $event)"><slot /></button>',
} }));
vi.mock('./use-hk3-reactions.js', async () => {
	const { computed } = await import('vue');
	return { useHk3Reactions: (_id: string, source: () => Record<string, number>) => computed(source) };
});
vi.mock('@/components/MkUtageStatus.vue', () => ({ default: { render: () => null } }));
vi.mock('./Hk3ConfirmBubble.vue', () => ({ default: { render: () => null } }));
vi.mock('./Hk3InstanceBadge.vue', () => ({ default: {
	props: ['host', 'instance'],
	template: '<span data-instance-badge>{{ instance?.name ?? host }}</span>',
} }));

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

function renote(userId = 'me'): NoteFixture {
	const original = note('original', 'author');
	return { ...note('wrapper', userId, null), renoteId: original.id, renote: original };
}

const cleanups: (() => void)[] = [];

function mount(current: NoteFixture, size: 'lg' | 'sm' = 'sm') {
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const app = createApp({ render: () => h(Hk3Note, { note: current as unknown as Misskey.entities.Note, size }) });
	for (const name of ['MkA', 'MkAvatar', 'MkUserName', 'MkTime', 'Mfm', 'MkLoading']) {
		app.component(name, { template: '<span><slot /></span>' });
	}
	app.directive('user-preview', {});
	app.mount(target);
	cleanups.push(() => { app.unmount(); target.remove(); });
	return {
		renoteMenu: () => target.querySelector<HTMLButtonElement>('button[data-renote-menu]'),
		button: () => target.querySelector<HTMLButtonElement>('button[aria-label="Undo renote"]'),
		confirmation: () => target.querySelector<HTMLElement>('[role="group"][aria-label="Undo this renote?"]'),
	};
}

function action(group: HTMLElement, label: string): HTMLButtonElement {
	const button = Array.from(group.querySelectorAll<HTMLButtonElement>('button')).find(candidate => candidate.textContent?.trim() === label);
	expect(button, `button with text ${label}`).toBeDefined();
	return button!;
}

async function openConfirmation(view: ReturnType<typeof mount>): Promise<HTMLElement> {
	const opener = view.button();
	expect(opener).not.toBeNull();
	expect(opener!.textContent).toContain('Undo renote');
	opener!.click();
	await settle();
	expect(mocks.apiWithDialog).not.toHaveBeenCalled();
	const group = view.confirmation();
	expect(group).not.toBeNull();
	expect(group!.getAttribute('aria-label')).toBe('Undo this renote?');
	expect(group!.textContent).toContain('Undo this renote?');
	expect(window.document.activeElement).toBe(action(group!, 'Cancel'));
	return group!;
}

async function settle() {
	await Promise.resolve();
	await nextTick();
}

beforeEach(() => {
	mocks.apiWithDialog.mockReset();
	mocks.emit.mockReset();
	mocks.account.isAdmin = false;
	mocks.account.isModerator = false;
	mocks.popupMenu.mockReset().mockReturnValue(new Promise<void>(() => {}));
	mocks.copyLink.mockReset().mockReturnValue({ text: 'Copy renote link' });
	mocks.abuse.mockReset().mockReturnValue({ text: 'Report renote' });
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
	vi.stubGlobal('requestAnimationFrame', () => 1);
	vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
	cleanups.splice(0).forEach(cleanup => cleanup());
	vi.unstubAllGlobals();
});

describe('Hk3Note pure renote undo', () => {
	it.each(['lg', 'sm'] as const)('confirms before deleting only the wrapper ID in %s and emits after success', async size => {
		let finish!: () => void;
		mocks.apiWithDialog.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
		const view = mount(renote(), size);
		expect(view.button()?.title).toBe('Undo renote');
		const group = await openConfirmation(view);
		action(group, 'Confirm undo').click();
		expect(mocks.apiWithDialog).toHaveBeenCalledWith('notes/delete', { noteId: 'wrapper' });
		expect(mocks.apiWithDialog).not.toHaveBeenCalledWith('notes/delete', { noteId: 'original' });
		expect(mocks.emit).not.toHaveBeenCalled();
		finish();
		await settle();
		expect(mocks.emit).toHaveBeenCalledExactlyOnceWith('noteDeleted', 'wrapper');
		expect(view.confirmation()).toBe(group);
		expect(group.getAttribute('aria-busy')).toBe('true');
		expect(view.button()?.disabled).toBe(true);
		expect(action(group, 'Cancel').disabled).toBe(true);
		expect(action(group, 'Confirm undo').disabled).toBe(true);
		action(group, 'Confirm undo').dispatchEvent(new MouseEvent('click', { bubbles: true }));
		action(group, 'Cancel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
		group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settle();
		expect(view.confirmation()).toBe(group);
		expect(mocks.apiWithDialog).toHaveBeenCalledTimes(1);
		expect(mocks.emit).toHaveBeenCalledTimes(1);
	});

	it('Cancel closes confirmation without deleting and returns focus to the opener', async () => {
		const view = mount(renote());
		const opener = view.button();
		const group = await openConfirmation(view);
		action(group, 'Cancel').click();
		await settle();
		expect(view.confirmation()).toBeNull();
		expect(window.document.activeElement).toBe(opener);
		expect(mocks.apiWithDialog).not.toHaveBeenCalled();
		expect(mocks.emit).not.toHaveBeenCalled();
	});

	it('Escape closes confirmation without deleting and returns focus to the opener', async () => {
		const view = mount(renote());
		const opener = view.button();
		await openConfirmation(view);
		window.document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settle();
		expect(view.confirmation()).toBeNull();
		expect(window.document.activeElement).toBe(opener);
		expect(mocks.apiWithDialog).not.toHaveBeenCalled();
		expect(mocks.emit).not.toHaveBeenCalled();
	});

	it('does not offer undo on own normal or quote notes, or another user’s pure renote', () => {
		const normal = note('normal');
		const quote = { ...note('quote'), renoteId: 'original', renote: note('original', 'author') };
		for (const candidate of [normal, quote, renote('someone-else')]) {
			expect(mount(candidate).button()).toBeNull();
		}
		expect(mocks.apiWithDialog).not.toHaveBeenCalled();
	});

	it('guards duplicate confirmation, disables Cancel and ignores Escape while pending, then allows retry after failure', async () => {
		let fail!: (reason: Error) => void;
		mocks.apiWithDialog
			.mockImplementationOnce(() => new Promise<void>((_, reject) => { fail = reject; }))
			.mockResolvedValueOnce(undefined);
		const view = mount(renote());
		const group = await openConfirmation(view);
		const confirm = action(group, 'Confirm undo');
		const cancel = action(group, 'Cancel');
		confirm.click();
		confirm.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(mocks.apiWithDialog).toHaveBeenCalledTimes(1);
		await nextTick();
		expect(cancel.disabled).toBe(true);
		cancel.click();
		cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settle();
		expect(view.confirmation()).not.toBeNull();
		expect(mocks.apiWithDialog).toHaveBeenCalledTimes(1);
		fail(new Error('request failed'));
		await settle();
		expect(mocks.emit).not.toHaveBeenCalled();
		expect(view.confirmation()).not.toBeNull();
		expect(action(view.confirmation()!, 'Cancel').disabled).toBe(false);
		action(view.confirmation()!, 'Confirm undo').click();
		await settle();
		expect(mocks.apiWithDialog).toHaveBeenCalledTimes(2);
		expect(mocks.apiWithDialog).toHaveBeenLastCalledWith('notes/delete', { noteId: 'wrapper' });
		expect(mocks.apiWithDialog).not.toHaveBeenCalledWith('notes/delete', { noteId: 'original' });
		expect(mocks.emit).toHaveBeenCalledExactlyOnceWith('noteDeleted', 'wrapper');
	});
	it.each(['user', 'admin', 'moderator'] as const)('offers wrapper details/report to %s and limits delete to privileged roles', async role => {
		mocks.account.isAdmin = role === 'admin';
		mocks.account.isModerator = role === 'moderator';
		const wrapper = renote('someone-else');
		const view = mount(wrapper);
		expect(view.button()).toBeNull();
		view.renoteMenu()!.click();
		const menu = mocks.popupMenu.mock.calls[0][0] as { text?: string; to?: string; action?: () => Promise<void> }[];
		expect(menu[0]).toMatchObject({ text: 'Renote details', to: '/notes/wrapper' });
		expect(mocks.copyLink).toHaveBeenCalledWith(wrapper, 'Copy renote link');
		expect(mocks.abuse).toHaveBeenCalledWith(wrapper, 'Report renote');
		const remove = menu.find(item => item.text === 'Undo renote');
		if (role === 'user') {
			expect(remove).toBeUndefined();
		} else {
			mocks.apiWithDialog.mockResolvedValueOnce(undefined);
			await remove!.action!();
			expect(mocks.apiWithDialog).toHaveBeenCalledExactlyOnceWith('notes/delete', { noteId: 'wrapper' });
			expect(mocks.emit).toHaveBeenCalledExactlyOnceWith('noteDeleted', 'wrapper');
		}
	});

	it('rechecks privileges when the wrapper delete action runs and emits nothing on failure', async () => {
		mocks.account.isAdmin = true;
		const view = mount(renote('someone-else'));
		view.renoteMenu()!.click();
		const menu = mocks.popupMenu.mock.calls[0][0] as { text?: string; action?: () => Promise<void> }[];
		const remove = menu.find(item => item.text === 'Undo renote')!.action!;
		mocks.account.isAdmin = false;
		await remove();
		expect(mocks.apiWithDialog).not.toHaveBeenCalled();
		mocks.account.isModerator = true;
		mocks.apiWithDialog.mockRejectedValueOnce(new Error('denied'));
		await remove();
		expect(mocks.emit).not.toHaveBeenCalled();
		expect(mocks.apiWithDialog).toHaveBeenCalledExactlyOnceWith('notes/delete', { noteId: 'wrapper' });
		mocks.apiWithDialog.mockResolvedValueOnce(undefined);
		await remove();
		expect(mocks.emit).toHaveBeenCalledExactlyOnceWith('noteDeleted', 'wrapper');
	});

	it('keeps the own-renote confirmation without adding a duplicate wrapper menu', () => {
		mocks.account.isAdmin = true;
		const view = mount(renote());
		expect(view.button()).not.toBeNull();
		expect(view.renoteMenu()).toBeNull();
	});
});
