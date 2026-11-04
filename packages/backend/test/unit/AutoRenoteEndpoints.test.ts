/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import Create, { meta as createMeta } from '@/server/api/endpoints/notes/auto-renote/create.js';
import Update, { meta as updateMeta } from '@/server/api/endpoints/notes/auto-renote/update.js';
import Pause, { meta as pauseMeta } from '@/server/api/endpoints/notes/auto-renote/pause.js';
import Resume, { meta as resumeMeta } from '@/server/api/endpoints/notes/auto-renote/resume.js';
import Cancel, { meta as cancelMeta } from '@/server/api/endpoints/notes/auto-renote/cancel.js';
import List, { meta as listMeta } from '@/server/api/endpoints/notes/auto-renote/list.js';
import Activity, { meta as activityMeta } from '@/server/api/endpoints/notes/auto-renote/activity.js';
import { meta as adminListMeta } from '@/server/api/endpoints/admin/auto-renote/list.js';
import { meta as adminCancelMeta } from '@/server/api/endpoints/admin/auto-renote/cancel.js';

/* eslint-disable @typescript-eslint/no-explicit-any -- Invoke endpoint callback directly; HTTP credential gating is separately asserted as metadata. */
describe('auto-renote API authorization contracts', () => {
	test('全操作は認証済みnativeアカウントに限定し、管理操作には専用scopeと管理者権限を要求する', () => {
		for (const meta of [createMeta, updateMeta, pauseMeta, resumeMeta, cancelMeta, listMeta, activityMeta, adminListMeta, adminCancelMeta]) {
			expect(meta.requireCredential).toBe(true); expect(meta.secure).toBe(true); expect(meta.limit.max).toBeGreaterThan(0);
		}
		expect(adminListMeta.requireAdmin).toBe(true); expect(adminCancelMeta.requireAdmin).toBe(true);
		expect(adminListMeta.kind).toBe('read:admin:auto-renote'); expect(adminCancelMeta.kind).toBe('write:admin:auto-renote');
	});

	test('利用者操作は入力のuserIdを信用せず認証済み本人をserviceへ渡す', async () => {
		const service = { create: vi.fn(), update: vi.fn(), change: vi.fn(), list: vi.fn(), recordActivity: vi.fn() };
		for (const Endpoint of [Create, Update, Pause, Resume, Cancel, List]) {
			const ep = new Endpoint(service as never);
			await (ep as any).exec({ userId: 'victim', noteId: 'note', scheduleId: 'schedule', frequency: 'daily', time: '09:00', limit: 10, offset: 0 }, { id: 'alice' }, null, null);
		}
		const activity = new Activity(service as never);
		await expect(activity.exec({ userId: 'victim' }, { id: 'alice' } as never, null, null)).rejects.toMatchObject({ code: 'INVALID_PARAM' });
		await activity.exec({}, { id: 'alice' } as never, null, null);
		for (const fn of Object.values(service)) for (const args of fn.mock.calls) expect(args[0]).toBe('alice');
	});
});
