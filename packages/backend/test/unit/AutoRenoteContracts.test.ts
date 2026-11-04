/* SPDX-License-Identifier: AGPL-3.0-only */
import { describe, expect, test, vi } from 'vitest';
import { DEFAULT_POLICIES, RoleService, normalizeAutoRenoteMonthlyLimit } from '@/core/RoleService.js';
import { NotificationEntityService } from '@/core/entities/NotificationEntityService.js';
import { matchesNotificationListFilter, notificationBrand } from '@/core/NotificationService.js';
import type { MiNotification } from '@/models/Notification.js';
import UpdateRoleEndpoint from '@/server/api/endpoints/admin/roles/update.js';
import UpdateBasePoliciesEndpoint from '@/server/api/endpoints/admin/roles/update-default-policies.js';

function roleService(policies: Record<string, unknown> = {}, rolePolicies: Record<string, unknown>[] = []) {
	const service = Object.create(RoleService.prototype) as RoleService;
	Object.defineProperties(service, {
		meta: { value: { policies } },
		config: { value: { maxFileSize: 100_000_000 } },
		getUserRoles: { value: async () => rolePolicies.map(policy => ({ policies: policy })) },
	});
	return service;
}

describe('automatic renote role policies', () => {
	test('defaults to enabled and ten successful executions per month', async () => {
		expect(DEFAULT_POLICIES).toMatchObject({ canAutoRenote: true, autoRenoteMonthlyLimit: 10 });
		expect(await roleService().getUserPolicies('owner')).toMatchObject({ canAutoRenote: true, autoRenoteMonthlyLimit: 10 });
	});

	test('highest-priority role can deny automatic renotes despite permissive lower roles', async () => {
		const policies = await roleService({}, [
			{ canAutoRenote: { priority: 0, useDefault: false, value: true }, autoRenoteMonthlyLimit: { priority: 0, useDefault: false, value: 100 } },
			{ canAutoRenote: { priority: 2, useDefault: false, value: false }, autoRenoteMonthlyLimit: { priority: 2, useDefault: false, value: 3 } },
		]).getUserPolicies('owner');
		expect(policies).toMatchObject({ canAutoRenote: false, autoRenoteMonthlyLimit: 3 });
	});

	test('equal-priority limits merge with max and useDefault inherits the administrator base value', async () => {
		const policies = await roleService({ autoRenoteMonthlyLimit: 25 }, [
			{ autoRenoteMonthlyLimit: { priority: 1, useDefault: true, value: 99 } },
			{ autoRenoteMonthlyLimit: { priority: 1, useDefault: false, value: 12 } },
		]).getUserPolicies('owner');
		expect(policies.autoRenoteMonthlyLimit).toBe(25);
	});

	test('malformed limits fail closed and fractional or overflowing counts remain safe', async () => {
		expect(normalizeAutoRenoteMonthlyLimit([NaN, Infinity, '100'])).toBe(0);
		expect(normalizeAutoRenoteMonthlyLimit([-10])).toBe(0);
		expect(normalizeAutoRenoteMonthlyLimit([5.9, 1])).toBe(5);
		expect(normalizeAutoRenoteMonthlyLimit([Number.MAX_SAFE_INTEGER])).toBe(2147483647);
		expect(await roleService({ canAutoRenote: 'true', autoRenoteMonthlyLimit: Infinity }).getUserPolicies(null))
			.toMatchObject({ canAutoRenote: false, autoRenoteMonthlyLimit: 0 });
	});

	test('role and base-policy APIs reject unsafe counts while preserving valid role priority and unrelated settings', async () => {
		const update = vi.fn();
		const endpoint = new UpdateRoleEndpoint({ findOneBy: async () => ({ id: 'role' }) } as never, { update } as never);
		const baseUpdate = vi.fn();
		const base = new UpdateBasePoliciesEndpoint({ fetch: async () => ({ policies: {} }), update: baseUpdate } as never,
			{ publishInternalEvent: vi.fn() } as never, { log: vi.fn() } as never);
		const owner = { id: 'admin' } as never;
		for (const value of [-1, 1.5, Infinity, '10', 2147483648]) {
			await expect(endpoint.exec({ roleId: 'role', policies: { autoRenoteMonthlyLimit: { value } } }, owner, null, null))
				.rejects.toMatchObject({ code: 'INVALID_PARAM' });
			await expect(base.exec({ policies: { autoRenoteMonthlyLimit: value } }, owner, null, null))
				.rejects.toMatchObject({ code: 'INVALID_PARAM' });
		}
		await expect(endpoint.exec({ roleId: 'role', policies: { canAutoRenote: { value: 'true' } } }, owner, null, null))
			.rejects.toMatchObject({ code: 'INVALID_PARAM' });
		await expect(endpoint.exec({ roleId: 'role', policies: { canAutoRenote: { value: true, priority: 3 } } }, owner, null, null))
			.rejects.toMatchObject({ code: 'INVALID_PARAM' });
		expect(update).not.toHaveBeenCalled();
		expect(baseUpdate).not.toHaveBeenCalled();
		await endpoint.exec({ roleId: 'role', policies: { autoRenoteMonthlyLimit: { value: 10, priority: 2, useDefault: false }, existing: { value: 'keep' } } }, owner, null, null);
		expect(update).toHaveBeenCalledWith({ id: 'role' }, expect.objectContaining({ policies: {
			autoRenoteMonthlyLimit: { value: 10, priority: 2, useDefault: false }, existing: { value: 'keep' },
		} }), owner);
		await base.exec({ policies: { canAutoRenote: false, autoRenoteMonthlyLimit: 0 } }, owner, null, null);
		expect(baseUpdate).toHaveBeenCalledWith({ policies: { canAutoRenote: false, autoRenoteMonthlyLimit: 0 } });
	});
});

describe('automatic renote stop notification contract', () => {
	const notice: Extract<MiNotification, { type: 'autoRenoteStopped' }> = {
		id: 'notice', createdAt: '2026-11-04T00:00:00.000Z', type: 'autoRenoteStopped',
		reason: 'admin', scheduleIds: ['schedule'], count: 1, adminReason: '<b>Reason</b>',
	};

	test('packs the explanation even after target notes become unavailable', async () => {
		const pack = vi.fn();
		const entity = new NotificationEntityService(
			{ get: () => ({ pack }) } as never,
			{} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
		);
		entity.onModuleInit();
		expect(await entity.pack(notice, 'owner', { checkValidNotifier: false })).toEqual({ ...notice, userId: undefined });
		expect(pack).not.toHaveBeenCalled();
	});

	test('belongs to standard notifications and follows the selected type and brand filters', () => {
		expect(notificationBrand(notice)).toBe('standard');
		expect(matchesNotificationListFilter(notice, { includeBrands: ['standard'], includeTypes: ['autoRenoteStopped'] })).toBe(true);
		expect(matchesNotificationListFilter(notice, { includeBrands: ['hatask'] })).toBe(false);
		expect(matchesNotificationListFilter(notice, { excludeTypes: ['autoRenoteStopped'] })).toBe(false);
	});
});
