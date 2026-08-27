/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeEach, describe, expect, test } from 'vitest';
import {
	getEffectiveHatacordingRateLimit,
	hatacordingRateLimitSnapshot,
	isHatacordingRateLimitError,
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

		expect(snapshot).toEqual({ unlimited: false, limit: 180, remaining: 137, resetAt: 200000, observedAt: 100000 });
	});

	test('管理者が免除した利用者の応答は古い残量を制限なし状態へ置き換える', () => {
		updateHatacordingRateLimit(headers({
			'X-Hatacording-RateLimit-Limit': '180',
			'X-Hatacording-RateLimit-Remaining': '2',
			'X-Hatacording-RateLimit-Reset': '200000',
		}));
		updateHatacordingRateLimit(headers({
			'X-Hatacording-RateLimit-Unlimited': '1',
		}));

		expect(hatacordingRateLimitSnapshot.value).toMatchObject({ unlimited: true, limit: 0, remaining: 0, resetAt: 0 });
		expect(getEffectiveHatacordingRateLimit(hatacordingRateLimitSnapshot.value)?.unlimited).toBe(true);
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
		const storedSnapshot = hatacordingRateLimitSnapshot.value;
		expect(storedSnapshot).not.toBeNull();
		if (storedSnapshot == null) throw new Error('レート制限情報が保存されていません');
		const snapshot = { ...storedSnapshot, resetAt: 200000 };

		expect(getEffectiveHatacordingRateLimit(snapshot, 199999)?.remaining).toBe(12);
		expect(getEffectiveHatacordingRateLimit(snapshot, 200000)?.remaining).toBe(180);
	});

	test('APIのレート制限エラーだけを識別する', () => {
		expect(isHatacordingRateLimitError({ code: 'RATE_LIMIT_EXCEEDED' })).toBe(true);
		expect(isHatacordingRateLimitError({ code: 'BRIEF_REQUEST_INTERVAL' })).toBe(true);
		expect(isHatacordingRateLimitError({ code: 'INTERNAL_ERROR' })).toBe(false);
		expect(isHatacordingRateLimitError(new Error('RATE_LIMIT_EXCEEDED'))).toBe(false);
		expect(isHatacordingRateLimitError(null)).toBe(false);
	});
});
