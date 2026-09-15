// SPDX-License-Identifier: AGPL-3.0-only
import type { HataskAkatsukiModel } from '@/components/hatask/hatask-akatsuki-types.js';

export const previewNow = new Date(2026, 8, 14, 10, 24);
export const previewModel: HataskAkatsukiModel = {
	dateLabel: '9月14日', weekdayLabel: '月曜日', clockLabel: '10:24',
	summary: '新しい一週間。きょうも、自分のペースで。',
	home: { recommended: 'calendar', hasUsage: true, favorites: ['calendar', 'todo'], sections: [
		{ id: 'calendar', label: '予定', icon: 'ti ti-calendar-event', summary: '14:00から、午後の読書', reason: 'このあとの予定', priority: 10, count: 2 },
		{ id: 'todo', label: 'ToDo', icon: 'ti ti-checkbox', summary: 'あと2つ、ゆっくり進めよう', reason: '次に進めたいこと', priority: 5, count: 2 },
		{ id: 'meal', label: 'ごはん', icon: 'ti ti-soup', summary: '朝ごはんを記録しました', reason: 'きょうの食事', priority: 1 },
	] },
	next: {
		id: 'example-reading', title: '午後の読書', timeLabel: '14:00', meta: '14:00 – 15:00 · 自分の予定',
		detail: '気になっていた一冊を、少しずつ。',
		buttons: [{ label: '予定を見る', icon: 'ti ti-arrow-up-right', primary: true, action: { type: 'open-event', id: 'example-reading' } }],
	},
	later: [{ id: 'example-walk', title: '夕方の散歩', timeLabel: '17:00' }],
	timeline: [
		{ id: 'example-reading', title: '午後の読書', timeLabel: '14:00', startMinute: 840, endMinute: 900 },
		{ id: 'example-walk', title: '夕方の散歩', timeLabel: '17:00', startMinute: 1020, endMinute: 1065 },
	],
	stats: [
		{ id: 'tasks', label: 'きょうのToDo', value: 2, unit: '件', tab: 'todo' },
		{ id: 'plans', label: 'きょうの予定', value: 2, unit: '件', tab: 'cal' },
		{ id: 'flowers', label: '咲いたおはな', value: 8, unit: '本', tab: 'garden' },
		{ id: 'days', label: 'つづいた日', value: 12, unit: '日', tab: 'ranking' },
	],
	week: '火水木金土日月'.split('').map((label, i) => ({ id: String(i), label, icon: 'ti ti-mood-smile', description: 'いい感じ', today: i === 6 })),
	todos: [
		{ id: 'example-todo-1', title: '観葉植物に水をあげる', completed: false, meta: '今日' },
		{ id: 'example-todo-2', title: '来週の予定を整える', completed: false, meta: '今日' },
	],
	meals: [
		{ id: 'breakfast', label: '朝', text: 'トーストとヨーグルト', recorded: true },
		{ id: 'lunch', label: '昼', text: 'まだ記録していません', recorded: false },
		{ id: 'dinner', label: '夜', text: 'まだ記録していません', recorded: false },
	],
	mealSummary: '昼ごはんは、これから',
	flower: { name: 'きょうの小さな楽しみ', progress: 72, detail: 'すくすく育っています' },
	streakLabel: '連続 12 日', rankLabel: '#8',
};
