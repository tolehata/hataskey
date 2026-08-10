/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { RateLimiterService } from '@/server/api/RateLimiterService.js';

const limiterOptions = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const limiterResults = vi.hoisted(() => [] as Array<{ total: number; remaining: number; reset: number; resetMs: number }>);

vi.mock('ratelimiter', () => ({
	default: class FakeLimiter {
		constructor(options: Record<string, unknown>) {
			limiterOptions.push(options);
		}

		public get(callback: (error: null, info: { total: number; remaining: number; reset: number; resetMs: number }) => void) {
			callback(null, limiterResults.shift() ?? { total: 180, remaining: 180, reset: 200, resetMs: 200000 });
		}
	},
}));

describe('HataSNSCordUIの共通レートリミット', () => {
	const originalNodeEnv = process.env.NODE_ENV;

	beforeEach(() => {
		process.env.NODE_ENV = 'production';
		limiterOptions.length = 0;
		limiterResults.length = 0;
	});

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
	});

	test('ロール倍率を上限と期間へ反映し、現在の操作を引いた残量を返す', async () => {
		limiterResults.push({ total: 90, remaining: 42, reset: 200, resetMs: 200000 });
		const service = new RateLimiterService({} as never, { getLogger: () => ({ debug: vi.fn() }) } as never);

		const result = await service.consume({ duration: 60_000, max: 180, key: 'hatacording-ui:all-actions' }, 'user-a', 2);

		expect(limiterOptions[0]).toMatchObject({ id: 'user-a:hatacording-ui:all-actions', duration: 120_000, max: 90 });
		expect(result).toEqual({ exceeded: false, info: { total: 90, remaining: 41, reset: 200, resetMs: 200000 } });
	});

	test('残量0は超過として返し、負の残量を公開しない', async () => {
		limiterResults.push({ total: 180, remaining: 0, reset: 200, resetMs: 200000 });
		const service = new RateLimiterService({} as never, { getLogger: () => ({ debug: vi.fn() }) } as never);

		const result = await service.consume({ duration: 60_000, max: 180, key: 'hatacording-ui:all-actions' }, 'user-a');

		expect(result?.exceeded).toBe(true);
		expect(result?.info.remaining).toBe(0);
	});
});
