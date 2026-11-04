/* SPDX-License-Identifier: AGPL-3.0-only */
import type { entities } from 'cherrypick-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Paginator } from './paginator.js';

const api = vi.hoisted(() => vi.fn());
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: api }));
afterEach(() => api.mockReset());

function note(id: string) {
	return { id, createdAt: '2026-09-27T00:00:00Z', user: { id: `user-${id}`, avatarDecorations: [{ id: 'deco', url: 'https://example.com/deco.png' }] } } as entities.Note;
}

describe('paginator new notes preview snapshot', () => {
	it.each(['init', 'older', 'newer'] as const)('replacing a timeline invalidates an outstanding %s response and its paging flags', async operation => {
		const paginator = new Paginator('notes/local-timeline', {});
		api.mockResolvedValueOnce([note('original')]);
		await paginator.init();
		let finish!: (notes: entities.Note[]) => void;
		api.mockReturnValueOnce(new Promise<entities.Note[]>(resolve => { finish = resolve; }));
		const pending = operation === 'init' ? paginator.init() : operation === 'older' ? paginator.fetchOlder() : paginator.fetchNewer();
		paginator.enqueue(note('queued'));
		paginator.replaceItems([note('selected')], { canFetchOlder: false, canFetchNewer: true, initialId: 'anchor' });
		expect(paginator.items.value.map(item => item.id)).toEqual(['selected']);
		expect(paginator.queuedAheadItems.value).toEqual([]);
		expect(paginator.queuedAheadItemsCount.value).toBe(0);
		expect(paginator.fetching.value || paginator.fetchingOlder.value || paginator.fetchingNewer.value).toBe(false);
		expect(paginator.initialId).toBe('anchor');
		finish([note('stale')]);
		await pending;
		expect(paginator.items.value.map(item => item.id)).toEqual(['selected']);
		expect(paginator.canFetchOlder.value).toBe(false);
		expect(paginator.canFetchNewer.value).toBe(true);
	});

	it('updates metadata at the queue limit even when its count stays unchanged', () => {
		const paginator = new Paginator('notes/local-timeline', {});
		for (let n = 0; n < 100; n++) paginator.enqueue(note(String(n)));
		const old = paginator.queuedAheadItems.value;
		const latest = note('latest');
		paginator.enqueue(latest);
		expect(paginator.queuedAheadItemsCount.value).toBe(100);
		expect(paginator.queuedAheadItems.value).toHaveLength(100);
		expect(paginator.queuedAheadItems.value[0]).toBe(latest);
		expect(paginator.queuedAheadItems.value[0].user.avatarDecorations).toEqual(latest.user.avatarDecorations);
		expect(paginator.queuedAheadItems.value.at(-1)?.id).toBe('1');
		expect(old[0].id).toBe('99');
	});

	it('publishes fetched queue metadata and clears it when the original queue is released', async () => {
		const paginator = new Paginator('notes/local-timeline', {});
		const fetched = [note('second'), note('first')];
		api.mockResolvedValueOnce(fetched);
		await paginator.fetchNewer({ toQueue: true });
		expect(paginator.queuedAheadItems.value.map(item => item.id)).toEqual(['first', 'second']);
		expect(paginator.queuedAheadItemsCount.value).toBe(2);
		paginator.releaseQueue();
		expect(paginator.queuedAheadItems.value).toEqual([]);
		expect(paginator.queuedAheadItemsCount.value).toBe(0);
		expect(new Set(paginator.items.value.map(item => item.id))).toEqual(new Set(['first', 'second']));
	});

	it('caps fetched previews and clears them immediately when reloading', async () => {
		const paginator = new Paginator('notes/local-timeline', {});
		api.mockResolvedValueOnce(Array.from({ length: 110 }, (_, n) => note(String(n))));
		await paginator.fetchNewer({ toQueue: true });
		expect(paginator.queuedAheadItems.value).toHaveLength(100);
		expect(paginator.queuedAheadItemsCount.value).toBe(100);
		let finish!: (notes: entities.Note[]) => void;
		api.mockReturnValueOnce(new Promise<entities.Note[]>(resolve => { finish = resolve; }));
		const reloading = paginator.reload();
		expect(paginator.queuedAheadItems.value).toEqual([]);
		expect(paginator.queuedAheadItemsCount.value).toBe(0);
		finish([]);
		await reloading;
	});

	it('removes and replaces queued notifications before they can be released', () => {
		const paginator = new Paginator('i/notifications', {});
		const first = { id: 'first', createdAt: '2026-09-27T00:00:00Z', type: 'app', body: 'old' } as entities.Notification;
		const second = { id: 'second', createdAt: '2026-09-27T00:01:00Z', type: 'app', body: 'second' } as entities.Notification;
		paginator.enqueue(first);
		paginator.enqueue(second);
		paginator.updateItem('first', item => ({ ...item, body: 'new' }));
		paginator.removeItem('second');
		expect(paginator.queuedAheadItemsCount.value).toBe(1);
		expect(paginator.queuedAheadItems.value.map(item => [item.id, item.type === 'app' ? item.body : null])).toEqual([['first', 'new']]);
		paginator.releaseQueue();
		expect(paginator.items.value.map(item => [item.id, item.type === 'app' ? item.body : null])).toEqual([['first', 'new']]);
	});
});
