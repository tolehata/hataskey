/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { AutoRenoteService } from '@/core/AutoRenoteService.js';
import AdminList from '@/server/api/endpoints/admin/auto-renote/list.js';

/* eslint-disable @typescript-eslint/no-explicit-any -- Query doubles exercise the pagination boundary without a live DB. */
function fixture(rows: any[]) {
	const conditions: string[] = [];
	const parameters: Record<string, unknown>[] = [];
	let reads = 0;
	const builder = (initial: Record<string, any> = {}) => {
		const params = { ...initial };
		let limit = 100;
		const q: any = {
			innerJoin: () => q, orderBy: () => q, addOrderBy: () => q,
			where: (condition: string, values?: Record<string, unknown>) => { conditions.push(condition); parameters.push(values ?? {}); Object.assign(params, values); return q; },
			andWhere: (condition: string, values?: Record<string, unknown>) => q.where(condition, values),
			clone: () => builder(params),
			take: (count: number) => { limit = count; return q; },
			getMany: async () => {
				reads++;
				const search = String(params.search).slice(1, -1).replace(/\\([\\%_])/gu, '$1').toLowerCase();
				return rows.filter(row => row.visibility === params.visibility && row.channelAllowed &&
					(String(row.text ?? '').toLowerCase().includes(search) || String(row.cw ?? '').toLowerCase().includes(search)) &&
					(!params.status || row.status === params.status) && (!params.userId || row.userId === params.userId) &&
					(!params.cursorId || row.id < params.cursorId)).slice(0, limit);
			},
		};
		return q;
	};
	const repository = { createQueryBuilder: builder, find: vi.fn(async () => rows.slice(0, 1)) };
	const pack = vi.fn(async (row: any, viewerId: string) => ({
		id: row.id,
		note: row.hidden === 'blocked' ? null : { text: row.text, isHidden: row.hidden === 'channel' },
		viewerId,
	}));
	const service = Object.assign(Object.create(AutoRenoteService.prototype), { db: { getRepository: () => repository }, pack }) as AutoRenoteService;
	return { service, conditions, parameters, reads: () => reads, pack, repository };
}

function row(id: number, extra: Record<string, unknown> = {}) {
	return {
		id: `s${String(id).padStart(3, '0')}`, noteId: `n${id}`, userId: 'alice', status: 'active', createdAt: new Date('2026-11-04T00:00:00Z'),
		visibility: 'public', channelAllowed: true, text: 'Flower diary', cw: null, ...extra,
	};
}

describe('auto-renote admin note search', () => {
	test('非表示の一致をoffsetへ数えず、候補の複数ページを跨いで表示できる予約を返す', async () => {
		const rows = Array.from({ length: 205 }, (_, i) => row(300 - i, { hidden: i < 105 ? i % 2 ? 'blocked' : 'channel' : undefined }));
		const f = fixture(rows);
		const result = await f.service.adminList('admin', { limit: 3, offset: 2, query: 'flower' });
		expect(result.schedules.map(s => s.id)).toEqual(['s193', 's192', 's191']);
		expect(f.reads()).toBe(2);
		expect(f.pack.mock.calls.every(args => args[1] === 'admin')).toBe(true);
	});

	test('非公開・チャンネル外不可・ブロックされた本文は検索結果へ露出しない', async () => {
		const f = fixture([
			row(10, { visibility: 'followers', text: 'private-keyword' }),
			row(9, { channelAllowed: false, text: 'private-keyword' }),
			row(8, { hidden: 'blocked', text: 'private-keyword' }),
			row(7, { hidden: 'channel', text: 'private-keyword' }),
		]);
		const result = await f.service.adminList('admin', { limit: 10, offset: 0, query: 'private-keyword' });
		expect(result.schedules).toEqual([]);
		expect(f.conditions).toContain('target.visibility = :visibility');
		expect(f.conditions.some(condition => condition.includes('c."isPrivate" = false') && condition.includes('c."allowRenoteToExternal" = true'))).toBe(true);
	});

	test('ユーザー・状態・本文またはCWを絞り込んでからページを切り、ワイルドカードは文字として扱う', async () => {
		const f = fixture([
			row(5, { userId: 'bob', text: '50%_\\' }),
			row(4, { status: 'paused', text: '50%_\\' }),
			row(3, { text: 'ordinary', cw: '50%_\\' }),
			row(2, { text: '50%_\\' }),
			row(1, { text: '500-other' }),
		]);
		const result = await f.service.adminList('admin', { limit: 1, offset: 1, query: ' 50%_\\ ', userId: 'alice', status: 'active' });
		expect(result.schedules.map(s => s.id)).toEqual(['s002']);
		expect(f.parameters).toContainEqual({ search: '%50\\%\\_\\\\%' });
		expect(f.conditions).toContain('(target.text ILIKE :search OR target.cw ILIKE :search)');
	});

	test('空の検索は従来の管理一覧を使い、APIは200文字を超える検索を拒否する', async () => {
		const f = fixture([row(1)]);
		await f.service.adminList('admin', { limit: 20, offset: 0, query: '   ' });
		expect(f.repository.find).toHaveBeenCalledWith(expect.objectContaining({ take: 20, skip: 0 }));
		const endpoint = new AdminList(f.service);
		await expect(endpoint.exec({ query: 'a'.repeat(201) }, { id: 'admin' } as never, null, null)).rejects.toMatchObject({ code: 'INVALID_PARAM' });
	});
});
