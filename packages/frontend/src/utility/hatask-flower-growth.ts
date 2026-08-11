/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Hataskのお花を、ページやアプリが前面にあるかに関係なく実経過時間で育てる。
 */

import { misskeyApi } from '@/utility/misskey-api.js';

export const HATASK_FLOWER_GROWTH_EVENT = 'hatask-flower:growth';
export const HATASK_FLOWER_TOTAL_MINUTES = 1200;

const SCOPE = ['client', 'hatask'];
const SYNC_INTERVAL_MS = 60_000;
const MINUTE_MS = 60_000;

export type HataskGrowingFlower = {
	emoji: string;
	name: string;
	progress: number;
	startedAt: number;
	totalMinutes: number;
	lastGrowthAt: number;
};

let started = false;
let seededFlower: HataskGrowingFlower | null = null;
let syncInFlight = false;

function safeText(value: unknown, fallback: string): string {
	return typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isNoSuchRegistryKey(error: unknown): boolean {
	return error != null && typeof error === 'object' && 'code' in error && error.code === 'NO_SUCH_KEY';
}

export function normalizeHataskGrowingFlower(value: unknown, now = Date.now()): HataskGrowingFlower | null {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
	const raw = value as Record<string, unknown>;
	const startedAt = Math.max(1, Math.min(now, Math.floor(safeNumber(raw.startedAt, now))));
	const totalMinutes = Math.max(0, Math.min(HATASK_FLOWER_TOTAL_MINUTES, Math.floor(safeNumber(raw.totalMinutes))));
	// 旧データには最終計算時刻が無い。開始時刻＋既に加算済みの分数を基準にすれば、
	// 既存の成長分を二重加算せず、これまで停止していた背景時間だけを追いつかせられる。
	const legacyLastGrowthAt = startedAt + totalMinutes * MINUTE_MS;
	const lastGrowthAt = Math.max(startedAt, Math.min(now, Math.floor(safeNumber(raw.lastGrowthAt, legacyLastGrowthAt))));

	return {
		emoji: safeText(raw.emoji, '🌱'),
		name: safeText(raw.name, 'わかば'),
		progress: Math.min(100, Math.floor((totalMinutes / HATASK_FLOWER_TOTAL_MINUTES) * 100)),
		startedAt,
		totalMinutes,
		lastGrowthAt,
	};
}

export function addHataskFlowerGrowth(value: unknown, minutes: number, now = Date.now()): HataskGrowingFlower | null {
	const flower = normalizeHataskGrowingFlower(value, now);
	if (flower == null) return null;
	const safeMinutes = Math.max(0, Math.floor(Number.isFinite(minutes) ? minutes : 0));
	const minutesUntilBloom = HATASK_FLOWER_TOTAL_MINUTES - flower.totalMinutes;
	const addedMinutes = Math.min(minutesUntilBloom, safeMinutes);
	flower.totalMinutes += addedMinutes;
	flower.lastGrowthAt = Math.min(now, flower.lastGrowthAt + addedMinutes * MINUTE_MS);
	flower.progress = Math.min(100, Math.floor((flower.totalMinutes / HATASK_FLOWER_TOTAL_MINUTES) * 100));
	return flower;
}

/** 最後に計算した時刻から、前面・背景・終了中を区別せず経過分を反映する。 */
export function advanceHataskFlowerGrowth(value: unknown, now = Date.now()): HataskGrowingFlower | null {
	const flower = normalizeHataskGrowingFlower(value, now);
	if (flower == null || flower.totalMinutes >= HATASK_FLOWER_TOTAL_MINUTES) return flower;
	const elapsedMinutes = Math.floor(Math.max(0, now - flower.lastGrowthAt) / MINUTE_MS);
	return elapsedMinutes > 0 ? addHataskFlowerGrowth(flower, elapsedMinutes, now) : flower;
}

function sameFlower(a: HataskGrowingFlower, b: HataskGrowingFlower): boolean {
	return a.emoji === b.emoji &&
		a.name === b.name &&
		a.progress === b.progress &&
		a.startedAt === b.startedAt &&
		a.totalMinutes === b.totalMinutes &&
		a.lastGrowthAt === b.lastGrowthAt;
}

function publishGrowth(flower: HataskGrowingFlower): void {
	seededFlower = flower;
	window.dispatchEvent(new CustomEvent<HataskGrowingFlower>(HATASK_FLOWER_GROWTH_EVENT, { detail: flower }));
}

async function flushGrowth(): Promise<void> {
	if (syncInFlight) return;
	syncInFlight = true;
	try {
		let stored: unknown;
		let missing = false;
		try {
			stored = await misskeyApi('i/registry/get', { key: 'flower', scope: SCOPE });
		} catch (error) {
			if (!isNoSuchRegistryKey(error)) return;
			missing = true;
			stored = seededFlower;
		}

		const current = normalizeHataskGrowingFlower(stored);
		if (current == null) return;
		const next = advanceHataskFlowerGrowth(current);
		if (next == null) return;
		if (missing || !sameFlower(current, next) || !(stored as Record<string, unknown>)?.lastGrowthAt) {
			await misskeyApi('i/registry/set', { key: 'flower', value: next, scope: SCOPE });
		}
		publishGrowth(next);
	} catch (error) {
		// レジストリの時刻は進めないため、一時的な失敗分は次回接続時に実経過から復元できる。
		console.warn('Failed to sync Hatask flower growth:', error);
	} finally {
		syncInFlight = false;
	}
}

function syncAfterResume(): void {
	if (!window.document.hidden) void flushGrowth();
}

/** Hatask初回表示時の花を、レジストリ未作成利用者向けの安全な初期値として渡す。 */
export function seedHataskFlowerGrowth(value: unknown): void {
	seededFlower = normalizeHataskGrowingFlower(value);
	void flushGrowth();
}

/**
 * メインUIごとに一度だけ開始する。Hataskページやウィジェットの有無には依存しない。
 * 背景・終了中にタイマーが停止しても、復帰または次回起動時に保存時刻からまとめて追いつく。
 */
export function startHataskFlowerGrowthTracker(): void {
	if (started || typeof window === 'undefined') return;
	started = true;
	window.document.addEventListener('visibilitychange', syncAfterResume);
	window.addEventListener('pageshow', syncAfterResume);
	window.addEventListener('online', syncAfterResume);
	window.setInterval(() => void flushGrowth(), SYNC_INTERVAL_MS);
	void flushGrowth();
}
