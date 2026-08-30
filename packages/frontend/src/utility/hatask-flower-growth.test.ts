/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import { addHataskFlowerGrowth, advanceHataskFlowerGrowth, createHataskGrowingFlower, HATASK_FLOWER_MINUTES_MAX, HATASK_FLOWER_MINUTES_MIN, HATASK_FLOWER_TOTAL_MINUTES, normalizeHataskGrowingFlower, randomHataskFlowerTargetMinutes, sameFlower } from './hatask-flower-growth.js';

vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn() }));

const read = (path: string) => readFileSync(`${process.cwd()}/src/${path}`, 'utf8');

describe('Hatask flower growth', () => {
	test('実経過分を加算して進捗を再計算し、満開を超えない', () => {
		const startedAt = 1_000;
		const lastGrowthAt = startedAt + 599 * 60_000;
		const flower = { emoji: '🌻', name: 'ひまわり', progress: 1, startedAt, totalMinutes: 599, targetMinutes: HATASK_FLOWER_TOTAL_MINUTES, lastGrowthAt };
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
			targetMinutes: HATASK_FLOWER_TOTAL_MINUTES,
			lastGrowthAt: now,
		});
	});

	test('1分未満の端数を次回へ残し、再計算で二重加算しない', () => {
		const flower = { emoji: '🌱', name: 'わかば', progress: 0, startedAt: 1_000, totalMinutes: 2, targetMinutes: 600, lastGrowthAt: 121_000 };
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
			targetMinutes: HATASK_FLOWER_TOTAL_MINUTES,
			lastGrowthAt: 1,
		});
	});

	test('新しい花の成長時間は8〜32時間から一度だけ選ぶ', () => {
		expect(randomHataskFlowerTargetMinutes(() => 0)).toBe(HATASK_FLOWER_MINUTES_MIN);
		expect(randomHataskFlowerTargetMinutes(() => 1)).toBe(HATASK_FLOWER_MINUTES_MAX);
		expect(randomHataskFlowerTargetMinutes(() => Number.NaN)).toBe(HATASK_FLOWER_MINUTES_MIN);
		expect(randomHataskFlowerTargetMinutes(() => 2)).toBe(HATASK_FLOWER_MINUTES_MAX);
		const flower = createHataskGrowingFlower({ emoji: '🌼', name: '花', now: 100, rng: () => .5 });
		expect(flower.targetMinutes).toBeGreaterThanOrEqual(HATASK_FLOWER_MINUTES_MIN);
		expect(flower.targetMinutes).toBeLessThanOrEqual(HATASK_FLOWER_MINUTES_MAX);
		expect(normalizeHataskGrowingFlower(flower)).toMatchObject({ targetMinutes: flower.targetMinutes });
	});

	test('花ごとの目標時間で進捗を計算し、永続化された値を維持する', () => {
		const flower = { emoji: '🌷', name: '花', startedAt: 1_000, totalMinutes: 240, targetMinutes: 480, lastGrowthAt: 1_000 };
		expect(normalizeHataskGrowingFlower(flower)).toMatchObject({ progress: 50, targetMinutes: 480 });
		expect(advanceHataskFlowerGrowth(flower, 1_000 + 120 * 60_000)).toMatchObject({ totalMinutes: 360, targetMinutes: 480, progress: 75 });
		expect(sameFlower(normalizeHataskGrowingFlower(flower)!, normalizeHataskGrowingFlower({ ...flower, targetMinutes: 1920 })!)).toBe(false);
	});

	test('成長処理はHataskページではなくメインUI起動時に開始する', () => {
		const boot = read('boot/main-boot.ts');
		const page = read('pages/hatask.vue');
		const growth = read('utility/hatask-flower-growth.ts');
		const widget = read('widgets/WidgetHataskFlowers.vue');
		const studioWidget = read('components/HataSideStudioFlowers.vue');
		expect(boot).toContain('if ($i) startHataskFlowerGrowthTracker();');
		expect(page).toContain('seedHataskFlowerGrowth(flower.value);');
		expect(page).toContain("if (loadResults[3].status === 'fulfilled')");
		expect(page).toContain('HATASK_FLOWER_GROWTH_EVENT');
		expect(page).not.toContain('growthInterval = setInterval');
		expect(page).not.toContain('onGrowthVisibility');
		expect(growth).toContain('now - flower.lastGrowthAt');
		expect(growth).not.toContain('activeCarryMs');
		expect(growth).not.toContain('wasVisible');
		expect(widget).toContain('window.addEventListener(HATASK_FLOWER_GROWTH_EVENT, onFlowerGrowth)');
		expect(studioWidget).toContain('window.addEventListener(HATASK_FLOWER_GROWTH_EVENT, onFlowerGrowth)');
	});

	test('お花ギャラリーと活動情報を別セクションで表示する', () => {
		const page = read('pages/hatask.vue');
		expect(page).toMatch(/copy\.communityFlowerGallery/);
		expect(page).toMatch(/copy\.communityFlowerActivity/);
		expect(page).toMatch(/communityFlowers[\s\S]*htk-gal-card/);
		expect(page).toMatch(/communityFlowers[\s\S]*MkAvatar[\s\S]*forceShowDecoration/);
		expect(page).toMatch(/communityFlowers[\s\S]*MkUserName[\s\S]*HataskEmoji/);
		expect(page).toMatch(/htk-gal-community-gallery[\s\S]*htk-gal-pager/);
		expect(page).toMatch(/htk-gal-community-row[\s\S]*reportCommunityFlower\(item\)/);
		expect(page).toMatch(/htk-gal-vis-box[\s\S]*htk-gal-vis[\s\S]*aria-pressed/);
		expect(page).toMatch(/htk-gal-sort[\s\S]*htk-gal-sort-inner[\s\S]*htk-gal-sort-label[\s\S]*copy\.sort/);
		expect(page).toMatch(/htk-gal-sort-label[\s\S]*ti-arrows-sort/);
		expect(page).toMatch(/htk-gal-sort-btn[\s\S]*ti-sort-descending[\s\S]*ti-sort-ascending/);
		expect(page).toMatch(/htk-gal-vis \.htk-vis-o\{[^}]*border:1px solid transparent;[^}]*border-radius:999px;[^}]*background:transparent/);
		expect(page).toMatch(/htk-gal-vis \.htk-vis-o\{[^}]*color:var\(--fg-2\)/);
		expect(page).toMatch(/htk-gal-vis \.htk-vis-o:hover:not\(.on\)\{[^}]*color:var\(--fg\)/);
		expect(page).toMatch(/htk-gal-vis \.htk-vis-o:focus-visible/);
		expect(page).not.toMatch(/htk-gal-sort \.htk-btn/);
		expect(page).toMatch(/\.htk-root\[data-theme="kisetsu"\] \.htk-gal-sort,\.htk-root\[data-theme="kashin"\] \.htk-gal-sort,\.htk-root\[data-theme="suri"\] \.htk-gal-sort,\.htk-root\[data-theme="hatakyu"\] \.htk-gal-sort\{margin-bottom:12px\}/);
		expect(page).toMatch(/\.htk-gal-sort\{[^}]*margin-top:12px/);
	});

	test('ハタキュの写真列は狭幅でも4列を維持する', () => {
		const page = read('pages/hatask.vue');
		expect(page).toMatch(/\.hk-hangrow\{[^}]*display:grid;[^}]*grid-template-columns:repeat\(4,minmax\(0,118px\)\)/);
		expect(page).toMatch(/@media\(max-width:640px\)[\s\S]*\.hk-hangrow\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)/);
		expect(page).toMatch(/\.hk-hang\{[^}]*width:100%;[^}]*min-width:0/);
		expect(page).not.toMatch(/\.hk-hangrow\{[^}]*flex-wrap/);
	});
});
