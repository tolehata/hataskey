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
	_visibility: { public: 'Public', home: 'Home', followers: 'Followers', specified: 'Direct' },
	_hata: { _hataskeyUi3: {
		conversation: 'Conversation', reply: 'Reply', addReaction: 'React',
		federateTitle: 'Federated', localOnlyTitle: 'Local only (this server)',
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
	user: { id: string; username: string; host: string | null; instance?: { name: string } };
	createdAt: string;
	text: string | null;
	cw: null;
	renoteId: string | null;
	renote?: NoteFixture;
	fileIds: string[];
	files: never[];
	visibility: Misskey.entities.Note['visibility'];
	localOnly?: boolean;
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

function mount(size: 'lg' | 'sm', instanceBadgePosition?: 'left' | 'right', remote = false, audience: { showAudienceIcons?: boolean; note?: NoteFixture } = {}) {
	const parent = audience.note ?? { ...note('parent', 'author'), repliesCount: 2 };
	if (remote) parent.user = { ...parent.user, host: 'remote.example', instance: { name: 'Remote Garden' } };
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const app = createApp({ render: () => h(Hk3Note, { note: parent as unknown as Misskey.entities.Note, size, instanceBadgePosition, showAudienceIcons: audience.showAudienceIcons }) });
	app.component('MkA', { props: { to: String }, template: '<a :href="to"><slot /></a>' });
	app.component('MkAvatar', { props: ['user'], template: '<span :data-avatar-user="user.id" />' });
	for (const name of ['MkUserName', 'MkTime', 'Mfm', 'MkLoading']) {
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
	it.each([
		['lg', 'left'], ['sm', 'left'], ['sm', undefined],
	] as const)('keeps the server badge placement for notes and replies (%s, %s)', async (size, position) => {
		const remoteReply = note('remote-reply');
		remoteReply.user = { ...remoteReply.user, host: 'remote.example', instance: { name: 'Remote Garden' } };
		mocks.api.mockResolvedValue([remoteReply]);
		const target = mount(size, position, true);
		button(target, 'Conversation').click();
		await settle();
		const badges = [...target.querySelectorAll('[data-instance-badge]')];
		expect(badges).toHaveLength(2);
		for (const badge of badges) {
			expect(badge.getAttribute('data-position')).toBe(position ?? 'right');
			expect(badge.textContent).toBe('Remote Garden');
		}
	});

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

describe('Hk3Note audience icons', () => {
	it.each(['lg', 'sm'] as const)('renders every scope and federation state under the main avatar (%s)', size => {
		for (const [visibility, label, icon] of [
			['public', 'Public', 'globe'], ['home', 'Home', 'house'],
			['followers', 'Followers', 'lock'], ['specified', 'Direct', 'mail'],
		] as const) {
			for (const localOnly of [false, true]) {
				const target = mount(size, undefined, false, {
					showAudienceIcons: true, note: { ...note('audience', 'author'), visibility, localOnly },
				});
				const row = target.querySelector('[data-audience-icons]')!;
				expect(row).not.toBeNull();
				expect(row.previousElementSibling?.getAttribute('data-avatar-user')).toBe('author');
				expect(row.querySelectorAll('[role="img"]')).toHaveLength(2);
				expect(row.textContent).toBe('');
				expect(row.querySelector('button, a, [tabindex]')).toBeNull();
				const federation = row.querySelector('[data-local-only]')!;
				const federationLabel = localOnly ? 'Local only (this server)' : 'Federated';
				expect(federation.getAttribute('title')).toBe(federationLabel);
				expect(federation.getAttribute('aria-label')).toBe(federationLabel);
				expect(federation.querySelector('svg[class*="lucide-rocket"]')).not.toBeNull();
				expect(federation.querySelector('line') !== null).toBe(localOnly);
				const scope = row.querySelector('[data-visibility]')!;
				expect(scope.getAttribute('data-visibility')).toBe(visibility);
				expect(scope.getAttribute('title')).toBe(label);
				expect(scope.getAttribute('aria-label')).toBe(label);
				expect(scope.querySelector(`svg[class*="lucide-${icon}"]`)).not.toBeNull();
				for (const svg of row.querySelectorAll('svg')) {
					expect(svg.getAttribute('width')).toBe('16');
					expect(svg.getAttribute('aria-hidden')).toBe('true');
				}
				expect(target.querySelector('header svg')).toBeNull();
			}
		}
	});

	it('uses the original note and author for a pure renote', () => {
		const original = { ...note('original', 'original-author'), visibility: 'followers' as const, localOnly: true };
		const renote = { ...note('renote', 'renoter', null), renoteId: original.id, renote: original };
		const target = mount('lg', undefined, false, { showAudienceIcons: true, note: renote });
		const row = target.querySelector('[data-audience-icons]')!;
		expect(row.previousElementSibling?.getAttribute('data-avatar-user')).toBe('original-author');
		expect(row.querySelector('[data-visibility="followers"]')).not.toBeNull();
		expect(row.querySelector('[data-local-only="true"]')).not.toBeNull();
		expect(target.querySelector('header svg')).toBeNull();
	});

	it.each(['lg', 'sm'] as const)('keeps deck/default note headers without audience rows (%s)', async size => {
		const target = mount(size, undefined, false, {
			note: { ...note('default'), visibility: 'home', localOnly: true, repliesCount: 1 },
		});
		button(target, 'Conversation').click();
		await settle();
		expect(target.querySelector('[data-audience-icons]')).toBeNull();
		expect(target.querySelector('[data-note-id="default"] > article header')?.querySelectorAll('svg')).toHaveLength(2);
	});

	it.each(['lg', 'sm'] as const)('renders tiny reply icons by the external avatar and removes duplicate headers (%s)', async size => {
		mocks.api.mockResolvedValue([{ ...note('private-reply', 'reply-author'), visibility: 'specified', localOnly: true }]);
		const target = mount(size, undefined, false, { showAudienceIcons: true });
		button(target, 'Conversation').click();
		await settle();
		const child = target.querySelector('[data-note-id="private-reply"]')!;
		const avatarCol = child.previousElementSibling!;
		expect(avatarCol.querySelector('[data-avatar-user="reply-author"]')).not.toBeNull();
		const row = avatarCol.querySelector('[data-audience-icons][data-tiny]')!;
		expect(row).not.toBeNull();
		expect(row.querySelector('[data-visibility="specified"]')).not.toBeNull();
		expect(row.querySelector('[data-local-only="true"]')).not.toBeNull();
		for (const svg of row.querySelectorAll('svg')) expect(svg.getAttribute('width')).toBe('13');
		expect(child.querySelector('[data-audience-icons], header svg')).toBeNull();
		expect(target.querySelectorAll('[data-audience-icons]')).toHaveLength(2);
	});
});
