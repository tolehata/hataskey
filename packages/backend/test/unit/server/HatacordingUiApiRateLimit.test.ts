/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { ApiCallService, HATACORDING_UI_RATE_LIMIT, HATACORDING_UI_RATE_LIMIT_HEADERS } from '@/server/api/ApiCallService.js';

function createReply() {
	return { code: vi.fn(), header: vi.fn(), send: vi.fn() };
}

function createService(
	consumption: { exceeded: boolean; info: { total: number; remaining: number; reset: number; resetMs: number } },
	roleLimit = 500,
	accessToken: Record<string, unknown> | null = null,
) {
	const user = { id: 'user-a', isSuspended: false };
	const authenticateService = { authenticate: vi.fn().mockResolvedValue([user, accessToken, null]) };
	const rateLimiterService = { consume: vi.fn().mockResolvedValue(consumption), limit: vi.fn() };
	const roleService = { getUserPolicies: vi.fn().mockResolvedValue({ hatacordingUiRateLimit: roleLimit }), getUserRoles: vi.fn() };
	const telemetryService = { startSpan: vi.fn((_name: string, callback: () => unknown) => callback()), captureMessage: vi.fn() };
	const apiLoggerService = { logger: { warn: vi.fn(), write: vi.fn() } };
	const service = new ApiCallService(
		{ enableIpLogging: false } as never,
		{} as never,
		{} as never,
		authenticateService as never,
		rateLimiterService as never,
		roleService as never,
		apiLoggerService as never,
		telemetryService as never,
	);
	return { service, rateLimiterService };
}

function createRequest(withMarker = true) {
	return {
		method: 'POST',
		body: { i: 'native-token' },
		query: {},
		headers: withMarker ? { [HATACORDING_UI_RATE_LIMIT_HEADERS.request]: '1' } : {},
		ip: '127.0.0.1',
	};
}

function createEndpoint() {
	return { name: 'users/show', meta: {}, params: {}, exec: vi.fn().mockResolvedValue({ ok: true }) };
}

describe('HataSNSCordUI API共通枠の適用範囲', () => {
	test('共通枠の計測期間は1時間', () => {
		expect(HATACORDING_UI_RATE_LIMIT.duration).toBe(3_600_000);
	});

	test('専用ヘッダー付きのネイティブ操作だけを数え、残量ヘッダーを返す', async () => {
		const { service, rateLimiterService } = createService({ exceeded: false, info: { total: 500, remaining: 457, reset: 200, resetMs: 200000 } });
		try {
			const reply = createReply();
			await service.handleRequest(createEndpoint() as never, createRequest() as never, reply as never);

			expect(rateLimiterService.consume).toHaveBeenCalledWith({ ...HATACORDING_UI_RATE_LIMIT, max: 500 }, 'user-a');
			expect(reply.header).toHaveBeenCalledWith(HATACORDING_UI_RATE_LIMIT_HEADERS.limit, '500');
			expect(reply.header).toHaveBeenCalledWith(HATACORDING_UI_RATE_LIMIT_HEADERS.remaining, '457');
			expect(reply.header).toHaveBeenCalledWith(HATACORDING_UI_RATE_LIMIT_HEADERS.reset, '200000');
		} finally {
			service.dispose();
		}
	});

	test('ロールに設定した上限を1時間の共通枠へ反映する', async () => {
		const { service, rateLimiterService } = createService({ exceeded: false, info: { total: 750, remaining: 749, reset: 200, resetMs: 200000 } }, 750);
		try {
			await service.handleRequest(createEndpoint() as never, createRequest() as never, createReply() as never);
			expect(rateLimiterService.consume).toHaveBeenCalledWith({ ...HATACORDING_UI_RATE_LIMIT, max: 750 }, 'user-a');
		} finally {
			service.dispose();
		}
	});

	test('通常UIと同じ専用ヘッダーなしの操作には共通枠を適用しない', async () => {
		const { service, rateLimiterService } = createService({ exceeded: false, info: { total: 500, remaining: 457, reset: 200, resetMs: 200000 } });
		try {
			await service.handleRequest(createEndpoint() as never, createRequest(false) as never, createReply() as never);
			expect(rateLimiterService.consume).not.toHaveBeenCalled();
		} finally {
			service.dispose();
		}
	});

	test('外部アプリ用トークンは専用ヘッダーを付けても共通枠へ入れない', async () => {
		const { service, rateLimiterService } = createService(
			{ exceeded: false, info: { total: 500, remaining: 457, reset: 200, resetMs: 200000 } },
			500,
			{ id: 'third-party-token' },
		);
		try {
			await service.handleRequest(createEndpoint() as never, createRequest() as never, createReply() as never);
			expect(rateLimiterService.consume).not.toHaveBeenCalled();
		} finally {
			service.dispose();
		}
	});

	test('共通枠が尽きた操作は429にし、復活時刻も返す', async () => {
		const { service } = createService({ exceeded: true, info: { total: 500, remaining: 0, reset: 200, resetMs: Date.now() + 30_000 } });
		try {
			const reply = createReply();
			const endpoint = createEndpoint();
			await service.handleRequest(endpoint as never, createRequest() as never, reply as never);

			expect(endpoint.exec).not.toHaveBeenCalled();
			expect(reply.code).toHaveBeenCalledWith(429);
			expect(reply.header).toHaveBeenCalledWith('Retry-After', expect.any(String));
		} finally {
			service.dispose();
		}
	});
});
