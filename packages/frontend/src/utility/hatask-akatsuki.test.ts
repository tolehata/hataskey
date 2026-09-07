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
	test('近い予定・締切・未読・食事の時間帯の順で状況に合う内容を選ぶ', () => {
		const source = fixture({ feedback: { allowed: true, known: true }, todos: [{ id: 'due', text: '提出', done: false, due: '2026-09-03' }] });
		expect(buildHataskAkatsukiModel(source).model.home?.recommended).toBe('calendar');
		source.events = [];
		expect(buildHataskAkatsukiModel(source).model.home?.recommended).toBe('todo');
		source.todos = [];
		expect(buildHataskAkatsukiModel(source).model.home?.recommended).toBe('feedback');
		source.feedbackUnread = 0;
		expect(buildHataskAkatsukiModel(source).model.home?.recommended).toBe('meal');
		source.meals = [...source.meals, { id: 'lunch', date: '2026-09-04', slot: 'lunch', note: '食べた' }];
		expect(buildHataskAkatsukiModel(source).model.home?.recommended).toBe('tools');
	});

	test('午前に夕食を勧めず、記録済みの時間帯の食事も催促しない', () => {
		const source = fixture({ now: new Date(2026, 8, 4, 8), events: [], todos: [] });
		expect(buildHataskAkatsukiModel(source).model.home?.recommended).toBe('tools');
		source.meals = [];
		expect(buildHataskAkatsukiModel(source).model.home?.sections.find(section => section.id === 'meal')?.reason).toBe('朝ごはんの記録');
	});

	test('権限・非表示設定・読込失敗を優先表示でも守る', () => {
		const source = fixture({ known: { planner: false, meals: false, moods: true, flower: true }, feedback: { allowed: false, known: true } });
		const { home } = buildHataskAkatsukiModel(source).model;
		expect(home?.recommended).toBe('tools');
		expect(home?.sections.find(section => section.id === 'feedback')).toBeUndefined();
		expect(home?.sections.find(section => section.id === 'todo')?.summary).toContain('読み込めません');
		source.settings = { showEvents: false, showFeedbackNotif: false, showMealSection: false };
		source.feedback = { allowed: true, known: true };
		expect(buildHataskAkatsukiModel(source).model.home?.sections.map(section => section.id)).toEqual(['tools', 'todo']);
	});

	test('終日予定に隠れていた直近の時刻付き予定を先頭にする', () => {
		const source = fixture();
		source.events = [{ id: 'all', title: '記念日', date: '2026-09-04', allDay: true }, ...source.events];
		const { model } = buildHataskAkatsukiModel(source);
		expect(model.next?.id).toBe('next');
		expect(model.later?.map(event => event.id)).toContain('all');
	});

	test('使ったツールを頻度と最近の利用で並べ、元の一覧を変更しない', () => {
		const source = fixture({ apps: [{ id: 'cal', label: 'カレンダー', icon: 'ti ti-calendar' }, { id: 'drawing', label: 'お絵描き', icon: 'ti ti-brush' }], usage: { drawing: { score: 3, lastUsedAt: new Date(2026, 8, 4, 12).getTime() } } });
		expect(buildHataskAkatsukiModel(source).model.apps?.[0].id).toBe('drawing');
		expect(buildHataskAkatsukiModel(source).model.home?.hasUsage).toBe(true);
		expect(source.apps?.[0].id).toBe('cal');
	});

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
		const forbiddenWrite = /(?:localStorage\.setItem|misskeyApi\(['"]i\/registry\/set)/;
		expect(forbiddenWrite.test('localStorage.setItem(\'todos\', \'[]\')')).toBe(true);
		expect(forbiddenWrite.test(readFileSync(resolve(process.cwd(), 'src/utility/hatask-akatsuki.ts'), 'utf8'))).toBe(false);
	});
	test('暁と花ストリーム内の横操作をページ送りに奪わせず、旧テーマの通常領域では送り始める', () => {
		const body = page.match(/function htkTouchStart\(e:TouchEvent\)\{([\s\S]*?)\n\}/u)?.[1];
		if (!body) throw new Error('Missing Hatask touch-start handler');
		const ordinary = window.document.createElement('div');
		const stream = window.document.createElement('div');
		stream.dataset.hataskFlowerStream = '';
		const flowerButton = window.document.createElement('button');
		stream.append(flowerButton);
		for (const [akatsuki, target, startsPageSwipe] of [
			[true, ordinary, false],
			[false, flowerButton, false],
			[false, ordinary, true],
		] as const) {
			const state = {
				isAkatsuki: { value: akatsuki },
				htkTouchStartPos: { value: { x: 90, y: 80 } as { x: number; y: number } | null },
				htkTouchLastPos: { value: { x: 70, y: 60 } as { x: number; y: number } | null },
				htkSwipeLocked: true,
				Element: window.Element,
				e: { target, touches: [{ clientX: 12, clientY: 34 }] },
			};
			runInNewContext(`(() => {${body}})()`, state, { timeout: 100 });
			const expected = startsPageSwipe ? { x: 12, y: 34 } : null;
			expect(state.htkTouchStartPos.value).toEqual(expected);
			expect(state.htkTouchLastPos.value).toEqual(expected);
			expect(state.htkSwipeLocked).toBe(!startsPageSwipe);
		}
	});
});
