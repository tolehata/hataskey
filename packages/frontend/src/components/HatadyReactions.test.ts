/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';

const fixture = vi.hoisted(() => ({ api: vi.fn(), notify: vi.fn(), picker: vi.fn() }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: fixture.api, misskeyApiGet: fixture.api }));
vi.mock('@/utility/hatady-ui.js', () => ({ hatadyNotify: fixture.notify }));
vi.mock('@/utility/reaction-picker.js', () => ({ reactionPicker: { show: fixture.picker } }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: { _hata: { _hatady: { _reactions: { add: 'リアクションする', remove: '取り消す' } } } } } }));
vi.mock('@/i.js', () => ({ $i: null }));
vi.mock('@/os.js', () => ({ popup: vi.fn(), popupMenu: vi.fn(), confirm: vi.fn() }));
vi.mock('@/preferences.js', async () => {
	const { ref } = await import('vue');
	return { prefer: { s: { showingAnimatedImages: 'always' }, r: { emojiStyle: ref('twemoji') } } };
});
vi.mock('@/custom-emojis.js', async () => {
	const { ref } = await import('vue');
	return { customEmojis: ref([]), customEmojisMap: new Map([['hatady_yatta', { url: '/emoji/hatady_yatta.webp' }]]) };
});
vi.mock('@/utility/emoji-mute.js', async () => {
	const { ref } = await import('vue');
	return { checkMuted: () => ref(false), makeEmojiMuteKey: () => '', mute: vi.fn(), unmute: vi.fn() };
});
vi.mock('@/utility/media-proxy.js', () => ({ getProxiedImageUrl: (url: string) => url, getStaticImageUrl: (url: string) => url }));
vi.mock('@/utility/copy-to-clipboard.js', () => ({ copyToClipboard: vi.fn() }));
vi.mock('@/utility/emoji-palette.js', () => ({ addToEmojiPalette: vi.fn() }));
vi.mock('@/components/MkCustomEmojiDetailedDialog.vue', () => ({ default: {} }));
import HatadyReactions from './HatadyReactions.vue';
import MkCustomEmoji from './global/MkCustomEmoji.vue';
import MkEmoji from './global/MkEmoji.vue';
import { DI } from '@/di.js';

type ReactionState = { reactions: Record<string, number>; myReaction: string | null };
type ReactionTarget = { logId?: string; commentId?: string; sessionId?: string; mediaCommentId?: string };
const cleanups: Array<() => void> = [];

async function settle() {
	await Promise.resolve();
	await nextTick();
}

async function mountReactions(target: ReactionTarget, reactions: Record<string, number>, myReaction: string | null = null) {
	const host = window.document.createElement('div');
	window.document.body.append(host);
	const changed = vi.fn<(value: ReactionState) => void>();
	const app = createApp({ render: () => h(HatadyReactions, { target, reactions, myReaction, onChanged: changed }) });
	app.component('MkCustomEmoji', MkCustomEmoji);
	app.component('MkEmoji', MkEmoji);
	app.provide(DI.mfmEmojiReactCallback, () => {});
	app.mount(host);
	cleanups.push(() => { app.unmount(); host.remove(); });
	await settle();
	return { host, changed };
}

function pill(host: HTMLElement, index = 0) {
	return host.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')[index];
}

beforeEach(() => {
	vi.useFakeTimers();
	fixture.api.mockReset().mockResolvedValue(undefined);
	fixture.notify.mockReset();
	fixture.picker.mockReset();
});

afterEach(() => {
	cleanups.splice(0).forEach(cleanup => cleanup());
	vi.clearAllTimers();
	vi.useRealTimers();
});

describe('Hatady reaction pills', () => {
	test.each([
		{ target: { logId: 'log' }, payload: { logId: 'log' }, prefix: 'hata/hatady', emoji: '👍' },
		{ target: { commentId: 'comment' }, payload: { commentId: 'comment' }, prefix: 'hata/hatady', emoji: ':hatady_yatta:' },
		{ target: { sessionId: 'session' }, payload: { targetType: 'session', targetId: 'session' }, prefix: 'hata/hatady/media', emoji: '👍' },
		{ target: { mediaCommentId: 'media-comment' }, payload: { targetType: 'comment', targetId: 'media-comment' }, prefix: 'hata/hatady/media', emoji: ':hatady_yatta:' },
	])('$prefix $emoji: the decorative emoji yields to the button and its count toggles the same target', async ({ target, payload, prefix, emoji }) => {
		const { host, changed } = await mountReactions(target, { [emoji]: 2 });
		const button = pill(host);
		const image = button.querySelector('img')!;
		expect(image).not.toBeNull();
		// Happy DOM has no pointer hit testing. Verify the actual renderer's computed
		// hit-target contract separately, then activate the native button it exposes.
		expect(getComputedStyle(image).pointerEvents).toBe('none');
		button.focus();
		expect(window.document.activeElement).toBe(button);
		button.click();
		await settle();
		expect(fixture.api.mock.calls).toEqual([[`${prefix}/reactions/create`, { ...payload, reaction: emoji }]]);
		expect(button.getAttribute('aria-pressed')).toBe('true');
		expect(changed).toHaveBeenLastCalledWith({ reactions: { [emoji]: 3 }, myReaction: emoji });
		button.querySelector<HTMLElement>('span')!.click();
		await settle();
		expect(fixture.api.mock.calls.at(-1)).toEqual([`${prefix}/reactions/delete`, payload]);
		expect(fixture.api).toHaveBeenCalledTimes(2);
		expect(button.getAttribute('aria-pressed')).toBe('false');
		expect(changed).toHaveBeenLastCalledWith({ reactions: { [emoji]: 2 }, myReaction: null });
	});

	test('Unicode native fallback and a missing custom emoji retain the same non-interactive icon contract', async () => {
		const { host } = await mountReactions({ logId: 'log' }, { '👍': 1, ':missing:': 1 });
		pill(host).querySelector('img')!.dispatchEvent(new Event('error'));
		await settle();
		const nativeEmoji = pill(host).querySelector<HTMLElement>('[alt="👍"]')!;
		expect(nativeEmoji.tagName).toBe('SPAN');
		expect(getComputedStyle(nativeEmoji).pointerEvents).toBe('none');
		const missingEmoji = pill(host, 1).querySelector('img')!;
		expect(missingEmoji.getAttribute('src')).toMatch(/\/dummy\.png$/);
		expect(getComputedStyle(missingEmoji).pointerEvents).toBe('none');
	});

	test('busy blocks duplicate actions, and a rejected request keeps the existing reaction and count', async () => {
		let rejectRequest!: (error: Error) => void;
		fixture.api.mockImplementationOnce(() => new Promise((_, reject) => { rejectRequest = reject; }));
		const { host, changed } = await mountReactions({ logId: 'log' }, { '👍': 2 }, '👍');
		const button = pill(host);
		button.click();
		button.click();
		await settle();
		expect(fixture.api).toHaveBeenCalledTimes(1);
		expect(Array.from(host.querySelectorAll('button')).every(item => item.disabled)).toBe(true);
		rejectRequest(new Error('offline'));
		await settle();
		expect(button.disabled).toBe(false);
		expect(button.getAttribute('aria-pressed')).toBe('true');
		expect(button.textContent?.trim()).toBe('2');
		expect(changed).not.toHaveBeenCalled();
		expect(fixture.notify).toHaveBeenCalledWith('リアクションを変更できませんでした');
		button.click();
		await settle();
		expect(changed).toHaveBeenLastCalledWith({ reactions: { '👍': 1 }, myReaction: null });
	});

	test('choosing another emoji still replaces only the current user reaction', async () => {
		const { host, changed } = await mountReactions({ sessionId: 'session' }, { '👍': 2, ':hatady_yatta:': 3 }, '👍');
		const add = host.querySelector<HTMLButtonElement>('button:not([aria-pressed])')!;
		add.click();
		expect(fixture.picker).toHaveBeenCalledWith(add, null, expect.any(Function));
		fixture.picker.mock.calls[0][2](':hatady_yatta:');
		await settle();
		expect(fixture.api).toHaveBeenCalledWith('hata/hatady/media/reactions/create', { targetType: 'session', targetId: 'session', reaction: ':hatady_yatta:' });
		expect(changed).toHaveBeenLastCalledWith({ reactions: { '👍': 1, ':hatady_yatta:': 4 }, myReaction: ':hatady_yatta:' });
	});
});
