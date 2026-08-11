/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import { addHataskFlowerGrowth, advanceHataskFlowerGrowth, HATASK_FLOWER_TOTAL_MINUTES, normalizeHataskGrowingFlower } from './hatask-flower-growth.js';

vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn() }));

const read = (path: string) => readFileSync(`${process.cwd()}/src/${path}`, 'utf8');

describe('Hatask flower growth', () => {
	test('実経過分を加算して進捗を再計算し、満開を超えない', () => {
		const startedAt = 1_000;
		const lastGrowthAt = startedAt + 599 * 60_000;
		const flower = { emoji: '🌻', name: 'ひまわり', progress: 1, startedAt, totalMinutes: 599, lastGrowthAt };
		expect(addHataskFlowerGrowth(flower, 1, lastGrowthAt + 60_000)).toEqual({ ...flower, progress: 50, totalMinutes: 600, lastGrowthAt: lastGrowthAt + 60_000 });
		expect(addHataskFlowerGrowth(flower, HATASK_FLOWER_TOTAL_MINUTES, 1000)).toMatchObject({ progress: 100, totalMinutes: HATASK_FLOWER_TOTAL_MINUTES });
	});

	test('画面を閉じていた時間も保存時刻からまとめて成長へ反映する', () => {
		const startedAt = 1_000;
		const legacyFlower = { emoji: '🌷', name: 'チューリップ', progress: 0, startedAt, totalMinutes: 10 };
		const now = startedAt + 25 * 60_000;
		expect(advanceHataskFlowerGrowth(legacyFlower, now)).toEqual({
			...legacyFlower,
			progress: 2,
			totalMinutes: 25,
			lastGrowthAt: now,
		});
	});

	test('1分未満の端数を次回へ残し、再計算で二重加算しない', () => {
		const flower = { emoji: '🌱', name: 'わかば', progress: 0, startedAt: 1_000, totalMinutes: 2, lastGrowthAt: 121_000 };
		const first = advanceHataskFlowerGrowth(flower, 300_999);
		expect(first).toMatchObject({ totalMinutes: 4, lastGrowthAt: 241_000 });
		expect(advanceHataskFlowerGrowth(first, 300_999)).toEqual(first);
	});

	test('壊れた値を補正し、利用者データではない値を成長対象にしない', () => {
		expect(normalizeHataskGrowingFlower(null)).toBeNull();
		expect(normalizeHataskGrowingFlower({ emoji: '', name: '', progress: 999, startedAt: 0, totalMinutes: -3 }, 123)).toEqual({
			emoji: '🌱',
			name: 'わかば',
			progress: 0,
			startedAt: 1,
			totalMinutes: 0,
			lastGrowthAt: 1,
		});
	});

	test('成長処理はHataskページではなくメインUI起動時に開始する', () => {
		const boot = read('boot/main-boot.ts');
		const page = read('pages/hatask.vue');
		const growth = read('utility/hatask-flower-growth.ts');
		const widget = read('widgets/WidgetHataskFlowers.vue');
		const studioWidget = read('components/HataSideStudioFlowers.vue');
		expect(boot).toContain('if ($i) startHataskFlowerGrowthTracker();');
		expect(page).toContain('seedHataskFlowerGrowth(flower.value);');
		expect(page).toContain("if (loadResults[3].status === 'fulfilled') flower.value = loadResults[3].value as typeof flower.value;");
		expect(page).toContain('HATASK_FLOWER_GROWTH_EVENT');
		expect(page).not.toContain('growthInterval = setInterval');
		expect(page).not.toContain('onGrowthVisibility');
		expect(growth).toContain('now - flower.lastGrowthAt');
		expect(growth).not.toContain('activeCarryMs');
		expect(growth).not.toContain('wasVisible');
		expect(widget).toContain('window.addEventListener(HATASK_FLOWER_GROWTH_EVENT, onFlowerGrowth)');
		expect(studioWidget).toContain('window.addEventListener(HATASK_FLOWER_GROWTH_EVENT, onFlowerGrowth)');
	});
});
