/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref } from 'vue';
import { miLocalStorage } from '@/local-storage.js';

export const HATACORDING_RATE_LIMIT_REQUEST_HEADER = 'X-Hatacording-UI';
export const HATACORDING_RATE_LIMIT_HEADERS = {
	limit: 'X-Hatacording-RateLimit-Limit',
	remaining: 'X-Hatacording-RateLimit-Remaining',
	reset: 'X-Hatacording-RateLimit-Reset',
} as const;

export type HatacordingRateLimitSnapshot = {
	limit: number;
	remaining: number;
	resetAt: number;
	observedAt: number;
};

type HeaderReader = Pick<Headers, 'get'>;

export const hatacordingRateLimitSnapshot = ref<HatacordingRateLimitSnapshot | null>(null);

export function isHatacordingRateLimitTrackingActive(): boolean {
	return typeof window !== 'undefined' && miLocalStorage.getItem('ui') === 'hatacording';
}

export function readHatacordingRateLimitHeaders(headers: HeaderReader, observedAt = Date.now()): HatacordingRateLimitSnapshot | null {
	const limit = Number(headers.get(HATACORDING_RATE_LIMIT_HEADERS.limit));
	const remaining = Number(headers.get(HATACORDING_RATE_LIMIT_HEADERS.remaining));
	const resetAt = Number(headers.get(HATACORDING_RATE_LIMIT_HEADERS.reset));
	if (!Number.isFinite(limit) || !Number.isFinite(remaining) || !Number.isFinite(resetAt) || limit <= 0 || resetAt <= 0) return null;

	return {
		limit: Math.max(1, Math.floor(limit)),
		remaining: Math.max(0, Math.min(Math.floor(remaining), Math.floor(limit))),
		resetAt: Math.floor(resetAt),
		observedAt,
	};
}

export function updateHatacordingRateLimit(headers: HeaderReader): void {
	const snapshot = readHatacordingRateLimitHeaders(headers);
	if (snapshot != null) hatacordingRateLimitSnapshot.value = snapshot;
}

export function getEffectiveHatacordingRateLimit(snapshot: HatacordingRateLimitSnapshot | null, now = Date.now()): HatacordingRateLimitSnapshot | null {
	if (snapshot == null) return null;
	if (now < snapshot.resetAt) return snapshot;
	return {
		...snapshot,
		remaining: snapshot.limit,
		observedAt: snapshot.resetAt,
	};
}
