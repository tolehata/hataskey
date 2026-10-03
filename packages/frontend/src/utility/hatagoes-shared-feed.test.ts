/* SPDX-License-Identifier: AGPL-3.0-only */
import { describe, expect, test, vi } from 'vitest';
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn() }));
import { createHatagoesFeedPager, projectHatagoesFeed } from './hatagoes-shared-feed.js';

const empty = (endpoint: string) => endpoint.endsWith('/activities') ? { items: [], hasMore: false, nextCursor: null }
	: endpoint === 'hatask/flowers/list' ? { items: [], totalPages: 0 } : endpoint === 'hatask/recipes/list' ? { items: [], total: 0 } : [];

describe('shared feed pagination', () => {
	test('retains the permission endpoints and follows their independent cursors to a real end', async () => {
		const api = vi.fn(async (endpoint: string, data: Record<string, unknown>) => {
			if (endpoint.endsWith('/activities')) return data.cursor ? { items: [], hasMore: false, nextCursor: null } : { items: [{ id: 'activity1', study: { id: 'log1', title: '記録' }, occurredAt: '2026-10-03' }], hasMore: true, nextCursor: 'next' };
			return empty(endpoint);
		});
		const pager = createHatagoesFeedPager(api);
		const first = await pager.load();
		expect(first.items.map(item => item.id)).toEqual(['activity:activity1']);
		expect(first.ended).toBe(false);
		const final = await pager.load();
		expect(final).toEqual({ items: [], errors: [], ended: true });
		expect(api).toHaveBeenCalledWith('hata/hatady/activities', { scope: 'recent', limit: 6, cursor: 'next' });
		expect(api).toHaveBeenCalledWith('hata/feedback/issues', { projectId: null, includeClosed: true, order: 'recent', limit: 6 });
		const calls = api.mock.calls.length;
		await pager.load();
		expect(api).toHaveBeenCalledTimes(calls);
	});

	test('retries failed sources without treating errors as an empty end or repeating successful cards', async () => {
		let attempt = 0;
		const api = vi.fn(async (endpoint: string) => {
			if (endpoint === 'hatask/recipes/list') {
				if (++attempt === 1) throw new Error('offline');
				return { items: [{ id: 'r1', title: 'スープ' }], total: 1 };
			}
			if (endpoint === 'hata/feedback/issues') throw Object.assign(new Error('access denied'), { code: 'HATAFEED_ACCESS_DENIED' });
			return empty(endpoint);
		});
		const pager = createHatagoesFeedPager(api);
		expect(await pager.load()).toEqual({ items: [], errors: ['recipe'], ended: false });
		expect(await pager.load()).toMatchObject({ errors: [], ended: true, items: [{ id: 'recipe:r1' }] });
		expect(api.mock.calls.filter(([endpoint]) => endpoint === 'hata/feedback/issues')).toHaveLength(1);
	});

	test('coalesces simultaneous next requests and removes overlapping cards', async () => {
		let release!: () => void;
		const gate = new Promise<void>(resolve => { release = resolve; });
		let n = 0;
		const api = vi.fn(async (endpoint: string) => {
			await gate;
			if (endpoint === 'hatask/flowers/list') { n++; return { items: [{ id: 'same', name: '花' }], totalPages: 2 }; }
			return empty(endpoint);
		});
		const pager = createHatagoesFeedPager(api);
		const a = pager.load(), b = pager.load();
		expect(a).toBe(b); release();
		expect((await a).items).toHaveLength(1);
		expect((await pager.load()).items).toHaveLength(0);
		expect(n).toBe(2);
	});

	test('carries spoiler status and never relabels an issue as a release', () => {
		expect(projectHatagoesFeed('activity', { id: 'a', study: { id: 'l', body: 'ネタバレ', details: { spoiler: true } } })).toMatchObject({ spoiler: true, path: '/hatady?tab=records&hgKind=log&hgId=l' });
		expect(projectHatagoesFeed('issue', { id: 'issue', status: 'resolved', title: '修正' })).toMatchObject({ label: 'イシュー', chips: ['解決済み'] });
	});
});
