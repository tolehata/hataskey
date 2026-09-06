/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, test } from 'vitest';
import { akatsukiDateKey, buildHataskAkatsukiModel } from './hatask-akatsuki.js';
import type { HataskAkatsukiSource } from './hatask-akatsuki.js';

function fixture(patch: Partial<HataskAkatsukiSource> = {}): HataskAkatsukiSource {
	return {
		now: new Date(2026, 8, 4, 13, 24), locale: 'ja-JP', loading: false,
		known: { planner: true, moods: true, meals: true, flower: true }, readOnly: false,
		events: [
			{ id: 'past', title: '午前の用事', date: '2026-09-04', timeStart: '09:00', timeEnd: '10:00' },
			{ id: 'next', title: 'レビュー', date: '2026-09-04', timeStart: '14:00', timeEnd: '15:00' },
			{ id: 'tomorrow', title: '買い物', date: '2026-09-05', timeStart: '10:00' },
		],
		todos: [{ id: 'remaining', text: '資料を読む', done: false, due: '2026-09-04' }, { id: 'done', text: '送信', done: true }, { id: 'archived', text: '保管済み', done: false, archivedAt: '2026-09-01' }],
		moods: [{ id: 'm1', date: '2026-09-04', time: '08:00', level: 3 }, { id: 'm2', date: '2026-09-04', time: '12:00', level: 4 }],
		meals: [{ id: 'meal1', date: '2026-09-04', time: '08:00', slot: 'breakfast', level: 'ate', note: 'パン' }],
		flower: { name: 'わかば', emoji: '🌱', progress: 50, remaining: '4時間' },
		loginDays: 12, loginRanking: 3, eyePhrase: 'ひと休みしよう', feedbackUnread: 2, settings: {},
		...patch,
	};
}

describe('暁の実データ表示モデル', () => {
	test('過ぎた予定をつぎの一件にしないが、今日の時間帯には残す', () => {
		const { model, counts } = buildHataskAkatsukiModel(fixture());
		expect(model.next?.id).toBe('next');
		expect(model.later?.map(event => event.id)).toEqual(['tomorrow']);
		expect(model.later?.[0].timeLabel).toBe('2026-09-05 10:00');
		expect(model.timeline?.map(event => event.id)).toEqual(['past', 'next']);
		expect(counts).toEqual({ calendar: 2, todo: 1, meal: 1, feedback: 2 });
		expect(model.stats?.find(stat => stat.id === 'mood')?.value).toBe(1);
		expect(model.todos?.map(todo => todo.id)).toEqual(['remaining']);
	});

	test('跨日の進行中予定と終日予定を残し、保管済み予定は出さない', () => {
		const { model } = buildHataskAkatsukiModel(fixture({
			events: [
				{ id: 'overnight', title: '出張', date: '2026-09-03', dateEnd: '2026-09-05', timeStart: '10:00', timeEnd: '18:00' },
				{ id: 'all-day', title: '記念日', date: '2026-09-04', allDay: true },
				{ id: 'archived', title: '保管', date: '2026-09-04', archivedAt: '2026-09-01' },
			],
		}));
		expect(model.next?.id).toBe('overnight');
		expect(model.timeline?.map(event => event.id)).toEqual(['overnight', 'all-day']);
		expect(model.timeline?.[0]).toMatchObject({ startMinute: 0, endMinute: 1440 });
		expect(model.timeline?.[1].startMinute).toBeUndefined();
	});

	test('読込失敗を0件と扱わず、別々に読み込めた記録は表示する', () => {
		const { model } = buildHataskAkatsukiModel(fixture({ known: { planner: false, moods: true, meals: false, flower: false } }));
		expect(model.summary).toContain('予定・ToDoの記録を読み込めません');
		expect(model.stats?.map(stat => stat.value)).toEqual(['—', '—', 1, '—']);
		expect(model.next).toBeNull();
		expect(model.flower).toBeNull();
		expect(model.meals?.[0].text).toBe('記録を読み込めません');
		expect(model.meals?.[0].unavailable).toBe(true);
	});

	test('空データに架空の予定や連続ログイン、花の水やりを補わない', () => {
		const { model } = buildHataskAkatsukiModel(fixture({ events: [], todos: [], moods: [], meals: [] }));
		expect(model.next).toBeNull();
		expect(model.todos).toEqual([]);
		expect(model.flower?.detail).toBe('開花まで 4時間');
		expect(model.streakLabel).toBe('ログイン累計 12 日');
		expect(model.eye?.number).toBeUndefined();
		expect(model.mealSummary).toBe('朝・昼・夜ごはんが未記録');
	});

	test('ローカル日付と設定された週初めで、同日の最後のきもちを並べる', () => {
		const { model } = buildHataskAkatsukiModel(fixture({ settings: { weekStart: 'sun' } }));
		expect(model.week?.[0].id).toBe('2026-08-30');
		expect(model.week?.find(day => day.today)).toMatchObject({ id: '2026-09-04', icon: 'ti ti-mood-smile' });
		expect(akatsukiDateKey(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01');
	});

	test('既存の非表示設定と読取専用を維持する', () => {
		const { model } = buildHataskAkatsukiModel(fixture({ readOnly: true, settings: { showClock: false, showEvents: false, showFlower: false, showMoodSummary: false, showMealSummary: false, showMealSection: false } }));
		expect(model).toMatchObject({ showClock: false, next: null, timeline: [], week: [], meals: [], flower: null });
		expect(model.mealSummary).toBeUndefined();
		expect(model.todos?.[0].readOnly).toBe(true);
	});

	test('並べ替えや集計は保存用配列を変更しない', () => {
		const data = fixture();
		const before = JSON.stringify(data);
		buildHataskAkatsukiModel(data);
		expect(JSON.stringify(data)).toBe(before);
	});
});

describe('暁の親結線', () => {
	const page = readFileSync(resolve(process.cwd(), 'src/pages/hatask.vue'), 'utf8');
	test('設定の読込中やテーマ欠落時も記録カードは暁になり、保存済みの旧テーマは変えない', () => {
		const body = page.match(/const plannerTheme=computed<HataskPlannerTheme>\(\(\)=>\{([\s\S]*?)\n\}\);/u)?.[1];
		if (!body) throw new Error('Missing planner theme computation');
		for (const theme of [undefined, null, '', 'akatsuki', 'kisetsu', 'kashin', 'suri', 'hatakyu']) {
			const settings = { value: { theme } };
			const result: unknown = runInNewContext(`(() => {${body}})()`, { settings }, { timeout: 100 });
			expect(result).toBe(theme || 'akatsuki');
			expect(settings.value.theme).toBe(theme);
		}
		const oldBody = body.replace('settings.value.theme || \'akatsuki\'', 'settings.value.theme');
		expect(oldBody).not.toBe(body);
		expect(runInNewContext(`(() => {${oldBody}})()`, { settings: { value: {} } }, { timeout: 100 })).toBe('kisetsu');
	});

	test('旧テーマのホームと保存済みテーマを残し、初回だけ暁を既定にする', () => {
		expect(page).toContain('theme:\'akatsuki\'');
		expect(page).toContain('theme: \'akatsuki\'');
		expect(page).toContain('activeTab===\'home\' && !isAkatsuki');
		for (const id of ['kisetsu', 'kashin', 'suri', 'hatakyu']) expect(page).toContain('id:\'' + id + '\'');
		expect(page).toContain('settings.value = { ...defaultSettings, ...settings.value }');
	});
	test('きもち・ごはんの同一インスタンスと既存保存関数を再利用する', () => {
		expect(page).toContain('v-show="activeTab===\'mood\'"');
		expect(page).toContain('v-show="activeTab===\'meal\'"');
		expect(page).toContain('registerCompletedUndo(await toggleTodo(action.id, true))');
		expect(page).toMatch(/if\s*\(isAkatsuki.value\)\s*return;/u);
		const forbiddenWrite = /(?:localStorage\.setItem|misskeyApi\(['"]i\/registry\/set)/;
		expect(forbiddenWrite.test('localStorage.setItem(\'todos\', \'[]\')')).toBe(true);
		expect(forbiddenWrite.test(readFileSync(resolve(process.cwd(), 'src/utility/hatask-akatsuki.ts'), 'utf8'))).toBe(false);
	});
});
