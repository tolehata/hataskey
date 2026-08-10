/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeEach, describe, expect, test } from 'vitest';
import {
	getEffectiveHatacordingRateLimit,
	hatacordingRateLimitSnapshot,
	readHatacordingRateLimitHeaders,
	updateHatacordingRateLimit,
} from './hatacording-rate-limit.js';

function headers(values: Record<string, string>): Headers {
	return new Headers(values);
}

describe('HataSNSCordUIの共通レートリミット表示', () => {
	beforeEach(() => {
		hatacordingRateLimitSnapshot.value = null;
	});

	test('サーバー応答の上限・残量・復活時刻を読み取る', () => {
		const snapshot = readHatacordingRateLimitHeaders(headers({
			'X-Hatacording-RateLimit-Limit': '180',
			'X-Hatacording-RateLimit-Remaining': '137',
			'X-Hatacording-RateLimit-Reset': '200000',
		}), 100000);

		expect(snapshot).toEqual({ limit: 180, remaining: 137, resetAt: 200000, observedAt: 100000 });
	});

	test('壊れた応答は無視し、残量は0から上限の範囲へ収める', () => {
		expect(readHatacordingRateLimitHeaders(headers({}))).toBeNull();
		expect(readHatacordingRateLimitHeaders(headers({
			'X-Hatacording-RateLimit-Limit': '20',
			'X-Hatacording-RateLimit-Remaining': '999',
			'X-Hatacording-RateLimit-Reset': '200000',
		}), 100000)?.remaining).toBe(20);
	});

	test('復活時刻を過ぎたら、次の応答を待たず表示上の残量を上限へ戻す', () => {
		updateHatacordingRateLimit(headers({
			'X-Hatacording-RateLimit-Limit': '180',
			'X-Hatacording-RateLimit-Remaining': '12',
			'X-Hatacording-RateLimit-Reset': '200000',
		}));
		const snapshot = { ...hatacordingRateLimitSnapshot.value!, resetAt: 200000 };

		expect(getEffectiveHatacordingRateLimit(snapshot, 199999)?.remaining).toBe(12);
		expect(getEffectiveHatacordingRateLimit(snapshot, 200000)?.remaining).toBe(180);
	});
});
