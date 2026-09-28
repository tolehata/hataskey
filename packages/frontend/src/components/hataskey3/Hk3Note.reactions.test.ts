/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, inject, nextTick } from 'vue';
import type { entities } from 'cherrypick-js';
import Hk3Note from './Hk3Note.vue';
import { DI } from '@/di.js';

const mocks = vi.hoisted(() => ({
	me: { id: 'me' } as { id: string } | null,
	api: vi.fn(), dialog: vi.fn(), emit: vi.fn(), picker: vi.fn(), confirm: vi.fn(),
	login: vi.fn(), sound: vi.fn(), remoteEnabled: true,
	emojis: new Map<string, unknown>(), callbacks: new Map<string, (emoji: string) => void>(),
}));
vi.mock('@/i.js', () => ({ get $i() { return mocks.me; } }));
vi.mock('@/os.js', () => ({ apiWithDialog: mocks.dialog, confirm: mocks.confirm }));
vi.mock('@/custom-emojis.js', () => ({ customEmojisMap: mocks.emojis }));
vi.mock('@/preferences.js', async () => {
	const { ref } = await import('vue');
	return { prefer: {
		s: { animation: false, confirmOnReact: false, get reactableRemoteReactionEnabled() { return mocks.remoteEnabled; } },
		r: { disableNyaize: ref(false) },
	} };
});
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: mocks.api }));
vi.mock('@/utility/please-login.js', () => ({ pleaseLogin: mocks.login }));
vi.mock('@/utility/sound.js', () => ({ playMisskeySfx: mocks.sound }));
vi.mock('@/utility/reaction-picker.js', () => ({ reactionPicker: { show: mocks.picker } }));
vi.mock('@/utility/check-word-mute.js', () => ({ checkWordMute: () => false }));
vi.mock('@/utility/get-note-menu.js', () => ({ getNoteMenu: vi.fn(), getRenoteMenu: vi.fn(), getCopyNoteLinkMenu: vi.fn(), getAbuseNoteMenu: vi.fn() }));
vi.mock('@/events.js', () => ({ globalEvents: { emit: vi.fn() } }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	renote: 'Renote', quote: 'Quote', more: 'More', ok: 'OK', cancel: 'Cancel',
	changeReactionConfirm: 'Change reaction?', cancelReactionConfirm: 'Remove reaction?',
	_hata: { _hataskeyUi3: { reply: 'Reply', addReaction: 'React', conversation: 'Conversation' } },
} } }));
vi.mock('@/composables/use-note-capture.js', () => ({
	noteEvents: { emit: mocks.emit },
	useNoteCapture: ({ note }: { note: entities.Note }) => ({ $note: note, subscribe: vi.fn() }),
}));
vi.mock('./use-hk3-reactions.js', async () => {
	const { computed } = await import('vue');
	return { useHk3Reactions: (_id: string, source: () => Record<string, number>) => computed(source) };
});
vi.mock('@/filters/note.js', () => ({ notePage: (note: entities.Note) => `/notes/${note.id}` }));
vi.mock('@/filters/user.js', () => ({ userPage: (user: entities.UserLite) => `/users/${user.id}` }));
vi.mock('@/components/MkMediaList.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkPoll.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkReactionIcon.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkUtageStatus.vue', () => ({ default: { render: () => null } }));
vi.mock('./Hk3InstanceBadge.vue', () => ({ default: { render: () => null } }));
vi.mock('./Hk3ConfirmBubble.vue', () => ({ default: { emits: ['ok'], template: '<button data-confirm-unreact @click="$emit(\'ok\')">OK</button>' } }));
vi.mock('@/components/MkReactionsViewer.reaction.vue', () => ({ default: {
	props: ['reaction'], emits: ['activate'], template: '<button :data-reaction="reaction" @click="$emit(\'activate\', $event)"><slot /></button>',
} }));

function note(id: string, reactions: Record<string, number> = {}) {
	return {
		id, userId: 'author', user: { id: 'author', username: 'author', host: null },
		createdAt: '2026-09-27T00:00:00Z', text: id, cw: null, visibility: 'public',
		files: [], fileIds: [], renoteId: null, reactions, reactionEmojis: {},
		repliesCount: 0, renoteCount: 0, myReaction: null,
	} as unknown as entities.Note;
}

const cleanups: (() => void)[] = [];

function mount(current: entities.Note, threadReply = false) {
	const host = window.document.createElement('div');
	window.document.body.append(host);
	const app = createApp({ render: () => h(Hk3Note, { note: current, size: 'sm', threadReply }) });
	app.component('Mfm', defineComponent({
		props: ['text', 'enableEmojiMenuReaction'],
		setup(props) {
			const callback = inject(DI.mfmEmojiReactCallback);
			if (callback) mocks.callbacks.set(props.text, callback);
			return () => h('span', { 'data-mfm': props.text, 'data-menu-reaction': String(props.enableEmojiMenuReaction) });
		},
	}));
	for (const name of ['MkA', 'MkAvatar', 'MkUserName', 'MkTime', 'MkLoading']) app.component(name, { template: '<span><slot /></span>' });
	app.directive('user-preview', {});
	app.mount(host);
	cleanups.push(() => { app.unmount(); host.remove(); });
	return host;
}

async function settle() { for (let n = 0; n < 5; n++) { await Promise.resolve(); await nextTick(); } }

function chip(host: Element, reaction: string) {
	const button = [...host.querySelectorAll<HTMLButtonElement>('button[data-reaction]')].find(el => el.dataset.reaction === reaction);
	expect(button).toBeDefined();
	return button!;
}

beforeEach(() => {
	vi.clearAllMocks(); mocks.me = { id: 'me' }; mocks.remoteEnabled = true;
	mocks.emojis.clear(); mocks.callbacks.clear();
	mocks.dialog.mockResolvedValue(undefined); mocks.confirm.mockResolvedValue({ canceled: false }); mocks.api.mockResolvedValue([]);
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
	vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.unstubAllGlobals(); });

describe('UI S note reaction actions', () => {
	it.each(['create', 'change', 'delete'] as const)('suppresses the success dialog for %s while retaining reaction events and sound', async operation => {
		const current = note('target', { '👍': 1 });
		if (operation !== 'create') current.myReaction = operation === 'delete' ? '👍' : ':old@.:';
		const host = mount(current);
		if (operation === 'delete') {
			// Clicking my own reaction opens the inline cancellation confirmation.
			chip(host, '👍').click(); await settle();
			host.querySelector<HTMLButtonElement>('[data-confirm-unreact]')!.click();
		} else {
			chip(host, '👍').click();
		}
		await settle();
		expect(mocks.dialog).toHaveBeenCalledTimes(operation === 'change' ? 2 : 1);
		const options = { showSuccess: false };
		if (operation !== 'create') {
			expect(mocks.dialog).toHaveBeenNthCalledWith(1, 'notes/reactions/delete', { noteId: 'target' }, undefined, undefined, options);
		}
		if (operation !== 'delete') {
			expect(mocks.dialog).toHaveBeenNthCalledWith(operation === 'change' ? 2 : 1, 'notes/reactions/create', { noteId: 'target', reaction: '👍' }, undefined, undefined, options);
		}
		expect(mocks.emit).toHaveBeenCalledTimes(operation === 'change' ? 2 : 1);
		expect(mocks.sound).toHaveBeenCalledTimes(operation === 'delete' ? 0 : 1);
		if (operation === 'change') expect(mocks.confirm).toHaveBeenCalledOnce();
	});

	it.each(['note', 'renote', 'thread'] as const)('provides the body emoji reaction callback for the %s target', async kind => {
		const original = note('original');
		const wrapper = { ...note('wrapper'), text: null, renoteId: original.id, renote: original };
		mount(kind === 'renote' ? wrapper : original, kind === 'thread');
		expect(mocks.callbacks.get('original')).toBeTypeOf('function');
		mocks.callbacks.get('original')!(':wave:');
		await settle();
		expect(mocks.dialog).toHaveBeenCalledExactlyOnceWith('notes/reactions/create', { noteId: 'original', reaction: ':wave:' }, undefined, undefined, { showSuccess: false });
		expect(mocks.emit).toHaveBeenCalledExactlyOnceWith('reacted:original', { userId: 'me', reaction: ':wave:' });
	});

	it('gives an expanded thread reply its own body emoji callback', async () => {
		const parent = note('parent'); parent.repliesCount = 1;
		mocks.api.mockResolvedValue([note('reply')]);
		const host = mount(parent);
		host.querySelector<HTMLButtonElement>('button[title="Conversation"]')!.click();
		await settle();
		mocks.callbacks.get('reply')!(':wave:');
		await settle();
		expect(mocks.dialog).toHaveBeenCalledExactlyOnceWith('notes/reactions/create', { noteId: 'reply', reaction: ':wave:' }, undefined, undefined, { showSuccess: false });
	});

	it('converts a remote chip to a same-name local emoji when the setting allows it', async () => {
		mocks.emojis.set('wave', { name: 'wave' });
		chip(mount(note('target', { ':wave@remote.example:': 2 })), ':wave@remote.example:').click();
		await settle();
		expect(mocks.dialog).toHaveBeenCalledExactlyOnceWith('notes/reactions/create', { noteId: 'target', reaction: ':wave:' }, undefined, undefined, { showSuccess: false });
		expect(mocks.picker).not.toHaveBeenCalled();
	});

	it.each(['body', 'remote'] as const)('uses direct create for %s even when I already reacted', async action => {
		mocks.emojis.set('wave', { name: 'wave' });
		const current = note('target', { ':wave@remote.example:': 2 }); current.myReaction = ':old@.:';
		const host = mount(current);
		if (action === 'body') mocks.callbacks.get('target')!(':wave:');
		else chip(host, ':wave@remote.example:').click();
		await settle();
		expect(mocks.dialog).toHaveBeenCalledExactlyOnceWith('notes/reactions/create', { noteId: 'target', reaction: ':wave:' }, undefined, undefined, { showSuccess: false });
		expect(mocks.confirm).not.toHaveBeenCalled();
	});

	it.each(['disabled', 'missing'] as const)('opens the picker without sending a remote literal when %s', async reason => {
		mocks.remoteEnabled = reason !== 'disabled';
		if (reason === 'disabled') mocks.emojis.set('wave', { name: 'wave' });
		chip(mount(note('target', { ':wave@remote.example:': 2 })), ':wave@remote.example:').click();
		await settle();
		expect(mocks.dialog).not.toHaveBeenCalled();
		expect(mocks.picker).toHaveBeenCalledOnce();
	});

	it('keeps legacy local :name: chips usable without the remote alternative setting', async () => {
		mocks.remoteEnabled = false;
		chip(mount(note('target', { ':wave:': 1 })), ':wave:').click();
		await settle();
		expect(mocks.dialog).toHaveBeenCalledWith('notes/reactions/create', { noteId: 'target', reaction: ':wave:' }, undefined, undefined, { showSuccess: false });
		expect(mocks.picker).not.toHaveBeenCalled();
	});

	it('confirms removing my remote reaction before considering a replacement', async () => {
		mocks.remoteEnabled = false;
		const current = note('target', { ':wave@remote.example:': 1 }); current.myReaction = ':wave@remote.example:';
		const host = mount(current); chip(host, current.myReaction).click(); await settle();
		expect(mocks.dialog).not.toHaveBeenCalled(); expect(mocks.picker).not.toHaveBeenCalled();
		host.querySelector<HTMLButtonElement>('[data-confirm-unreact]')!.click(); await settle();
		expect(mocks.dialog).toHaveBeenCalledExactlyOnceWith('notes/reactions/delete', { noteId: 'target' }, undefined, undefined, { showSuccess: false });
	});

	it('guards the callback and chip and disables the body reaction menu when logged out', async () => {
		mocks.me = null;
		const host = mount(note('target', { ':wave@remote.example:': 1 }));
		expect(host.querySelector('[data-mfm="target"]')?.getAttribute('data-menu-reaction')).toBe('false');
		mocks.callbacks.get('target')!(':wave:'); chip(host, ':wave@remote.example:').click(); await settle();
		expect(mocks.dialog).not.toHaveBeenCalled(); expect(mocks.emit).not.toHaveBeenCalled(); expect(mocks.picker).not.toHaveBeenCalled();
	});

	it.each(['create', 'remote', 'delete'] as const)('handles repeated %s failures through the dialog without success events', async operation => {
		mocks.dialog.mockRejectedValue(new Error('request failed'));
		mocks.emojis.set('wave', { name: 'wave' });
		const current = note('target', { ':wave@remote.example:': 1, '👍': 1 });
		if (operation === 'delete') current.myReaction = ':old@.:';
		const host = mount(current);
		const invoke = () => {
			if (operation === 'delete') chip(host, '👍').click();
			else if (operation === 'remote') chip(host, ':wave@remote.example:').click();
			else mocks.callbacks.get('target')!(':wave:');
		};
		invoke(); await settle(); invoke(); await settle();
		expect(mocks.dialog).toHaveBeenCalledTimes(2);
		const endpoint = operation === 'delete' ? 'delete' : 'create';
		expect(mocks.dialog).toHaveBeenCalledWith(`notes/reactions/${endpoint}`, endpoint === 'create' ? { noteId: 'target', reaction: ':wave:' } : { noteId: 'target' }, undefined, undefined, { showSuccess: false });
		expect(mocks.emit).not.toHaveBeenCalled(); expect(mocks.sound).not.toHaveBeenCalled();
	});
});
