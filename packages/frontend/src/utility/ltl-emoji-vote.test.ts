/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, KeepAlive, nextTick, ref } from 'vue';
import { createLtlEmojiVoteStore } from './ltl-emoji-vote-store.js';
import { getLtlEmojiVotePhase } from './ltl-emoji-vote-types.js';
import { useLtlEmojiVote } from './ltl-emoji-vote.js';
import type { LtlEmojiVoteResponse, LtlEmojiVoteRound } from './ltl-emoji-vote-types.js';

const wrapperDeps = vi.hoisted(() => ({ api: vi.fn(), listeners: new Set<() => void>(), account: { id: 'wrapper-account' } }));
vi.mock('@/i.js', () => ({ $i: wrapperDeps.account }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: wrapperDeps.api }));
vi.mock('@/stream.js', () => ({
	useStream: () => ({
		on: (_event: string, callback: () => void) => { wrapperDeps.listeners.add(callback); },
		off: (_event: string, callback: () => void) => { wrapperDeps.listeners.delete(callback); },
	}),
}));

const emoji = { id: 'emoji-a', name: 'local_a', url: 'https://example.test/emoji-a.webp', isSensitive: false };
const otherEmoji = { ...emoji, id: 'emoji-b', name: 'local_b' };

function makeRound(overrides: Partial<LtlEmojiVoteRound> = {}): LtlEmojiVoteRound {
	return {
		id: 'round-a', noteId: 'note-a', startedAt: 10000, closesAt: 25000, resolvedAt: 26800, expiresAt: 46800,
		candidates: [emoji, otherEmoji], rankings: [], choice: null, total: 0, phase: 'voting', ...overrides,
	};
}

async function flush() {
	for (let i = 0; i < 8; i++) await Promise.resolve();
}

type Pending = { noteId?: string; roundId?: string; emojiId?: string; signal: AbortSignal; resolve: (value: LtlEmojiVoteResponse) => void; reject: (reason: unknown) => void };

function takePending(queue: Pending[]): Pending {
	const request = queue.shift();
	if (!request) throw new Error('Expected a pending API request');
	return request;
}

const cleanups: (() => void)[] = [];

function fixture(accountId: string | null = 'self') {
	let liveAccountId = accountId;
	let hidden = false;
	const events = new EventTarget();
	const reconnect = new Set<() => void>();
	const shows: Pending[] = [];
	const votes: Pending[] = [];
	const show = vi.fn((noteId: string | undefined, signal: AbortSignal) => new Promise<LtlEmojiVoteResponse>((resolve, reject) => shows.push({ noteId, signal, resolve, reject })));
	const vote = vi.fn((roundId: string, emojiId: string, signal: AbortSignal) => new Promise<LtlEmojiVoteResponse>((resolve, reject) => votes.push({ roundId, emojiId, signal, resolve, reject })));
	const store = createLtlEmojiVoteStore({
		accountId, getAccountId: () => liveAccountId, show, vote,
		monotonicNow: () => performance.now(),
		ownerDocument: { get hidden() { return hidden; }, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) },
		subscribeReconnect: (callback) => { reconnect.add(callback); return () => { reconnect.delete(callback); }; },
	});
	cleanups.push(() => store.destroy());
	return {
		store, show, vote, shows, votes, reconnect,
		setAccount(value: string | null) { liveAccountId = value; },
		setHidden(value: boolean) { hidden = value; events.dispatchEvent(new Event('visibilitychange')); },
		async receive(value: LtlEmojiVoteRound | null, serverNow = 10000) {
			const pending = takePending(shows);
			expect(pending).toBeDefined();
			pending.resolve({ round: value, serverNow });
			await flush();
		},
		async acceptVote(value: LtlEmojiVoteRound, serverNow = 10000) {
			const pending = takePending(votes);
			expect(pending).toBeDefined();
			pending.resolve({ round: value, serverNow });
			await flush();
		},
	};
}

beforeEach(() => {
	vi.useFakeTimers({ now: 1730000000000, toFake: ['Date', 'performance', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
});
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
	vi.useRealTimers();
});

describe('shared LTL emoji vote state', () => {
	it('shares candidates, initial request, one poll and one clock between LTL subscribers', async () => {
		const f = fixture();
		const first = f.store.subscribe();
		const second = f.store.subscribe();
		expect(f.show).toHaveBeenCalledTimes(1);
		await f.receive(makeRound());
		expect(first.round.value).toBe(second.round.value);
		expect(vi.getTimerCount()).toBe(2);
		expect(f.reconnect.size).toBe(1);
		await vi.advanceTimersByTimeAsync(1000);
		expect(f.show).toHaveBeenCalledTimes(2);
		await Promise.all([first.refresh(), second.refresh(), Promise.resolve(f.receive(makeRound(), 11000))]);
		expect(f.show).toHaveBeenCalledTimes(2);
		first.release();
		expect(vi.getTimerCount()).toBe(2);
		second.release();
		expect(vi.getTimerCount()).toBe(0);
		expect(f.reconnect.size).toBe(0);
	});

	it('does not poll while idle and refreshes once on stream reconnection', async () => {
		const f = fixture();
		f.store.subscribe();
		await f.receive(null);
		await vi.advanceTimersByTimeAsync(60000);
		expect(f.show).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
		for (const callback of f.reconnect) callback();
		expect(f.show).toHaveBeenCalledTimes(2);
		await f.receive(makeRound({ startedAt: 70000, closesAt: 85000, resolvedAt: 86800, expiresAt: 106800 }), 70000);
		expect(vi.getTimerCount()).toBe(2);
	});

	it('retries a failed initial lookup at most twice, and stops idle retries after an empty success', async () => {
		const f = fixture();
		f.store.subscribe();
		for (let attempt = 0; attempt < 3; attempt++) {
			takePending(f.shows).reject(new Error('temporarily offline'));
			await flush();
			await vi.advanceTimersByTimeAsync(2000);
		}
		expect(f.show).toHaveBeenCalledTimes(3);
		expect(vi.getTimerCount()).toBe(0);
		for (const callback of f.reconnect) callback();
		await f.receive(null);
		await vi.advanceTimersByTimeAsync(10000);
		expect(f.show).toHaveBeenCalledTimes(4);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('uses server time and monotonic elapsed time despite a changed device clock', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound(), 12000);
		vi.setSystemTime(new Date('2040-01-01'));
		await vi.advanceTimersByTimeAsync(900);
		expect(member.now.value).toBe(12900);
		await vi.advanceTimersByTimeAsync(100);
		await f.receive(makeRound(), 15000);
		expect(member.now.value).toBe(15000);
		await vi.advanceTimersByTimeAsync(100);
		expect(member.now.value).toBe(15100);
	});

	it('allows one vote and gives rain ownership only to the LTL where it was selected', async () => {
		const f = fixture();
		const first = f.store.subscribe();
		const second = f.store.subscribe();
		await f.receive(makeRound());
		const pending = second.vote(emoji.id);
		expect(second.submitting.value).toBe(true);
		expect(await first.vote(otherEmoji.id)).toBe(false);
		expect(f.vote).toHaveBeenCalledTimes(1);
		await f.acceptVote(makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 }, total: 1 }));
		expect(await pending).toBe(true);
		expect(second.phase.value).toBe('rain');
		expect(first.phase.value).toBe('waiting');
		expect(first.claimEffect('rain', 'round-a')).toBe(false);
		expect(second.claimEffect('rain', 'round-a')).toBe(true);
		expect(second.claimEffect('rain', 'round-a')).toBe(false);
		expect(await second.vote(otherEmoji.id)).toBe(false);
		await vi.advanceTimersByTimeAsync(1600);
		expect(second.phase.value).toBe('waiting');
	});

	it('does not replay rain for a choice recovered from another page or device', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 } }));
		expect(member.phase.value).toBe('waiting');
		expect(member.claimEffect('rain', 'round-a')).toBe(false);
	});

	it('does not start an unclaimed rain after switching away from and back to its LTL', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound());
		const pending = member.vote(emoji.id);
		await f.acceptVote(makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 } }));
		await pending;
		expect(member.phase.value).toBe('rain');
		member.setActive(false);
		member.setActive(true);
		await f.receive(makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 } }), 10100);
		expect(member.phase.value).toBe('waiting');
		expect(member.claimEffect('rain', 'round-a')).toBe(false);
	});

	it('keeps the full rain duration after a delayed vote reply without extending result expiry', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound(), 24500);
		const pending = member.vote(emoji.id);
		await vi.advanceTimersByTimeAsync(3000);
		await f.acceptVote(makeRound({ phase: 'result', choice: { emojiId: emoji.id, votedAt: 24900 } }), 27500);
		expect(await pending).toBe(true);
		expect(member.phase.value).toBe('rain');
		await vi.advanceTimersByTimeAsync(1500);
		expect(member.phase.value).toBe('rain');
		await vi.advanceTimersByTimeAsync(100);
		expect(member.phase.value).toBe('result');
		expect(member.round.value?.expiresAt).toBe(46800);
	});

	it('rejects unsigned users, non-candidates and votes at the server deadline without sending requests', async () => {
		const anonymous = fixture(null);
		const guest = anonymous.store.subscribe();
		await anonymous.receive(makeRound());
		expect(await guest.vote(emoji.id)).toBe(false);
		expect(anonymous.vote).not.toHaveBeenCalled();
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound());
		expect(await member.vote('foreign-emoji')).toBe(false);
		await vi.advanceTimersByTimeAsync(15000);
		expect(member.phase.value).toBe('tallying');
		expect(await member.vote(emoji.id)).toBe(false);
		expect(f.vote).not.toHaveBeenCalled();
	});

	it('aborts a pre-vote show and ignores its late reply after the accepted vote', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound());
		void member.refresh();
		const stale = takePending(f.shows);
		const pending = member.vote(emoji.id);
		expect(stale.signal.aborted).toBe(true);
		await f.acceptVote(makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 }, total: 1 }));
		await pending;
		stale.resolve({ serverNow: 11000, round: makeRound() });
		await flush();
		expect(member.choice.value?.emojiId).toBe(emoji.id);
		expect(member.round.value?.total).toBe(1);
	});

	it('checks a lost vote response before a second attempt and restores the server choice', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound());
		const pending = member.vote(emoji.id);
		takePending(f.votes).reject(new Error('connection lost after server accepted'));
		await flush();
		expect(await pending).toBe(false);
		expect(member.submitting.value).toBe(true);
		expect(await member.vote(otherEmoji.id)).toBe(false);
		expect(f.show).toHaveBeenCalledTimes(2);
		await f.receive(makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 }, total: 1 }), 10500);
		expect(member.submitting.value).toBe(false);
		expect(member.choice.value?.emojiId).toBe(emoji.id);
		expect(member.phase.value).toBe('waiting');
		expect(member.voteError.value).toBeNull();
		expect(f.vote).toHaveBeenCalledTimes(1);
	});

	it('queues a trigger note that arrives while the initial empty lookup is in flight', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		void member.refresh('note-a');
		void member.refresh('note-a');
		expect(f.show).toHaveBeenCalledTimes(1);
		await f.receive(null);
		expect(f.show).toHaveBeenCalledTimes(2);
		expect(f.shows[0].noteId).toBeUndefined();
		await f.receive(makeRound());
		expect(member.round.value?.noteId).toBe('note-a');
	});

	it('retries a hinted empty lookup only three times with 200/700/1600 ms backoff', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(null);
		void member.refresh('saved-trigger');
		await f.receive(null);
		for (const delay of [200, 700, 1600]) {
			const calls = f.show.mock.calls.length;
			await vi.advanceTimersByTimeAsync(delay - 1);
			expect(f.show).toHaveBeenCalledTimes(calls);
			await vi.advanceTimersByTimeAsync(1);
			expect(f.show).toHaveBeenCalledTimes(calls + 1);
			expect(f.shows[0].noteId).toBeUndefined();
			await f.receive(null, 10000 + performance.now());
		}
		expect(f.show).toHaveBeenCalledTimes(5);
		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(60000);
		expect(f.show).toHaveBeenCalledTimes(5);
		// Another surface's same hint does not replenish the exhausted budget.
		void member.refresh('saved-trigger');
		await f.receive(null, 10000 + performance.now());
		await vi.advanceTimersByTimeAsync(3000);
		expect(f.show).toHaveBeenCalledTimes(6);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('recovers the round created after its saved note and cancels remaining trigger retries', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		void member.refresh('note-a');
		await f.receive(null);
		await f.receive(null);
		await vi.advanceTimersByTimeAsync(200);
		await f.receive(makeRound(), 10200);
		expect(member.phase.value).toBe('voting');
		expect(member.round.value?.noteId).toBe('note-a');
		expect(vi.getTimerCount()).toBe(2);
		await vi.advanceTimersByTimeAsync(700);
		expect(f.show).toHaveBeenCalledTimes(3);
	});

	it('cancels hinted retries while inactive and keeps an ordinary empty resume lookup idle', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(null);
		void member.refresh('note-a');
		await f.receive(null);
		expect(vi.getTimerCount()).toBe(1);
		member.setActive(false);
		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(5000);
		expect(f.show).toHaveBeenCalledTimes(2);
		member.setActive(true);
		await f.receive(null, 15000);
		await vi.advanceTimersByTimeAsync(5000);
		expect(f.show).toHaveBeenCalledTimes(3);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('pauses requests and clocks when hidden, ignores aborted replies, then fetches fresh server time', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		const old = takePending(f.shows);
		f.setHidden(true);
		expect(old.signal.aborted).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
		expect(f.reconnect.size).toBe(0);
		await vi.advanceTimersByTimeAsync(30000);
		old.resolve({ serverNow: 10000, round: makeRound() });
		await flush();
		expect(member.round.value).toBeNull();
		f.setHidden(false);
		expect(f.show).toHaveBeenCalledTimes(2);
		await f.receive(makeRound({ phase: 'result', rankings: [{ emoji, count: 1, rank: 1, tied: false }] }), 40000);
		expect(member.now.value).toBe(40000);
		expect(member.phase.value).toBe('result');
	});

	it('suspends an inactive deck tab, keeps other active columns running, and refreshes on return', async () => {
		const f = fixture();
		const first = f.store.subscribe();
		const second = f.store.subscribe();
		await f.receive(makeRound());
		first.setActive(false);
		expect(vi.getTimerCount()).toBe(2);
		expect(await first.vote(emoji.id)).toBe(false);
		second.setActive(false);
		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(5000);
		first.setActive(true);
		expect(first.now.value).toBe(15000);
		expect(f.show).toHaveBeenCalledTimes(2);
		await f.receive(makeRound(), 15000);
		expect(vi.getTimerCount()).toBe(2);
	});

	it('recovers a vote aborted by navigation without granting rain to the remounted component', async () => {
		const f = fixture();
		const oldMember = f.store.subscribe();
		await f.receive(makeRound());
		const result = oldMember.vote(emoji.id);
		const oldVote = takePending(f.votes);
		oldMember.release();
		expect(oldVote.signal.aborted).toBe(true);
		const next = f.store.subscribe();
		await f.receive(makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 } }), 10100);
		oldVote.resolve({ serverNow: 10000, round: makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 } }) });
		expect(await result).toBe(false);
		expect(next.submitting.value).toBe(false);
		expect(next.phase.value).toBe('waiting');
		expect(next.claimEffect('rain', 'round-a')).toBe(false);
	});

	it('shows authoritative rankings, claims confetti once, and never replays it after remount', async () => {
		const f = fixture();
		const first = f.store.subscribe();
		const rankings = [
			{ emoji, count: 3, rank: 1, tied: false },
			{ emoji: otherEmoji, count: 0, rank: 2, tied: false },
		];
		await f.receive(makeRound({ phase: 'result', rankings }), 26800);
		expect(first.phase.value).toBe('result');
		expect(first.round.value?.rankings).toEqual(rankings);
		expect(first.claimEffect('confetti', 'round-a')).toBe(true);
		first.release();
		const next = f.store.subscribe();
		await f.receive(makeRound({ phase: 'result', rankings }), 27000);
		expect(next.claimEffect('confetti', 'round-a')).toBe(false);
	});

	it('leaves after 20 seconds, collapses for 480 ms, and rejects a delayed expired response', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		const result = makeRound({ phase: 'result', rankings: [{ emoji, count: 2, rank: 1, tied: false }] });
		await f.receive(result, 26800);
		await vi.advanceTimersByTimeAsync(20000);
		expect(member.phase.value).toBe('leaving');
		await vi.advanceTimersByTimeAsync(400);
		expect(member.round.value?.id).toBe('round-a');
		await vi.advanceTimersByTimeAsync(100);
		expect(member.phase.value).toBe('idle');
		expect(member.round.value).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
		await f.receive(result, 28000);
		expect(member.round.value).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('preserves the collapse when the server removes an expired round', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound({ phase: 'result' }), 46000);
		void member.refresh();
		await f.receive(null, 46800);
		expect(member.phase.value).toBe('leaving');
		await vi.advanceTimersByTimeAsync(500);
		expect(member.round.value).toBeNull();
	});

	it('keeps a late tally as tallying until the server provides final rankings', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound(), 26000);
		await vi.advanceTimersByTimeAsync(1000);
		expect(member.phase.value).toBe('tallying');
		await f.receive(makeRound({ phase: 'result', rankings: [{ emoji, count: 1, rank: 1, tied: false }] }), 27000);
		expect(member.phase.value).toBe('result');
	});

	it('does not replace an accepted choice or final rankings with an older replicated state', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		const rankings = [{ emoji, count: 1, rank: 1, tied: false }];
		await f.receive(makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 }, phase: 'result', rankings, total: 1 }), 26800);
		void member.refresh();
		await f.receive(makeRound(), 26800);
		expect(member.choice.value?.emojiId).toBe(emoji.id);
		expect(member.round.value?.rankings).toEqual(rankings);
		expect(member.round.value?.total).toBe(1);
	});

	it('does not restore a removed round from a later stale response', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound());
		void member.refresh();
		await f.receive(null, 11000);
		void member.refresh();
		await f.receive(makeRound(), 12000);
		expect(member.round.value).toBeNull();
	});

	it('cannot leak the previous account choice or apply its in-flight response after account switching', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 } }));
		void member.refresh();
		const stale = takePending(f.shows);
		f.setAccount('other-account');
		f.setHidden(false);
		expect(member.round.value).toBeNull();
		expect(stale.signal.aborted).toBe(true);
		stale.resolve({ serverNow: 11000, round: makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 } }) });
		await flush();
		expect(member.choice.value).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('destroy aborts both read and write requests and removes all timers and reconnect callbacks', async () => {
		const f = fixture();
		const member = f.store.subscribe();
		await f.receive(makeRound());
		void member.refresh();
		const read = takePending(f.shows);
		const result = member.vote(emoji.id);
		const write = takePending(f.votes);
		f.store.destroy();
		expect(read.signal.aborted).toBe(true);
		expect(write.signal.aborted).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
		expect(f.reconnect.size).toBe(0);
		write.resolve({ serverNow: 10000, round: makeRound({ choice: { emojiId: emoji.id, votedAt: 10000 } }) });
		expect(await result).toBe(false);
		f.setHidden(false);
		expect(f.show).toHaveBeenCalledTimes(2);
		expect(member.round.value).toBeNull();
	});
});

describe('LTL emoji vote Vue lifecycle', () => {
	it('stops on KeepAlive deactivation even when active props remain true, and resumes on activation', async () => {
		wrapperDeps.api.mockImplementation(() => Promise.resolve({ serverNow: 10000, round: makeRound() }));
		const visible = ref(true);
		let subscription: ReturnType<typeof useLtlEmojiVote> | undefined;
		const getSubscription = () => {
			if (!subscription) throw new Error('Expected a mounted LTL subscription');
			return subscription;
		};
		const Ltl = { setup() { subscription = useLtlEmojiVote(true); return () => h('div', 'local'); } };
		const Other = { render: () => h('div', 'other') };
		const app = createApp({ render: () => h(KeepAlive, null, { default: () => visible.value ? h(Ltl) : h(Other) }) });
		const container = window.document.createElement('div');
		let mounted = true;
		cleanups.push(() => { if (mounted) app.unmount(); });
		app.mount(container);
		await flush();
		expect(wrapperDeps.api).toHaveBeenCalledTimes(1);
		expect(wrapperDeps.api.mock.calls[0].slice(0, 2)).toEqual(['hata/emoji-vote/show', {}]);
		visible.value = false;
		await nextTick();
		expect(wrapperDeps.listeners.size).toBe(0);
		const pausedTime = getSubscription().now.value;
		await vi.advanceTimersByTimeAsync(5000);
		expect(getSubscription().now.value).toBe(pausedTime);
		expect(wrapperDeps.api).toHaveBeenCalledTimes(1);
		visible.value = true;
		await nextTick();
		await flush();
		expect(wrapperDeps.api).toHaveBeenCalledTimes(2);
		expect(getSubscription().now.value).toBe(pausedTime + 5000);
		app.unmount();
		mounted = false;
		expect(wrapperDeps.listeners.size).toBe(0);
		const unmountedTime = getSubscription().now.value;
		await vi.advanceTimersByTimeAsync(5000);
		expect(getSubscription().now.value).toBe(unmountedTime);
		expect(wrapperDeps.api).toHaveBeenCalledTimes(2);
	});
});

describe('LTL emoji vote presentation deadlines', () => {
	it('finishes a just-in-time vote rain before the tally message, and uses all server deadlines', () => {
		const round = makeRound({ choice: { emojiId: emoji.id, votedAt: 24999 } });
		expect(getLtlEmojiVotePhase(round, 25000, true)).toBe('rain');
		expect(getLtlEmojiVotePhase(round, 26549, true)).toBe('tallying');
		expect(getLtlEmojiVotePhase({ ...round, phase: 'result' }, 26800, true)).toBe('result');
		expect(getLtlEmojiVotePhase({ ...round, phase: 'result' }, 46800, true)).toBe('leaving');
		expect(getLtlEmojiVotePhase(round, 47280, true)).toBe('idle');
	});
});
