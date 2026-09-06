/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { HataskAkatsukiEvent, HataskAkatsukiModel } from '@/components/hatask/hatask-akatsuki-types.js';
import { normalizeHataskAkatsukiMobileTabs } from '@/utility/hatask-akatsuki-navigation.js';

type EventRow = { id: string; title: string; date: string; dateEnd?: string; timeStart?: string; timeEnd?: string; allDay?: boolean; archivedAt?: string | null };
type TodoRow = { id: string; text: string; done: boolean; due?: string; time?: string; archivedAt?: string | null };
type MoodRow = { id: string; date: string; time?: string; level: number };
type MealRow = { id: string; date: string; time?: string; slot?: string; note?: string; level?: string };

export interface HataskAkatsukiSource {
	now: Date;
	locale: string;
	loading: boolean;
	known: { planner: boolean; moods: boolean; meals: boolean; flower: boolean };
	readOnly: boolean;
	events: readonly EventRow[];
	todos: readonly TodoRow[];
	moods: readonly MoodRow[];
	meals: readonly MealRow[];
	flower: { name: string; emoji: string; progress: number; remaining: string };
	loginDays: number;
	loginRanking: number;
	eyePhrase: string;
	feedbackUnread: number;
	settings: { showClock?: boolean; showEvents?: boolean; showFlower?: boolean; showMoodSummary?: boolean; showMealSummary?: boolean; showMealSection?: boolean; weekStart?: string; akatsukiMobileTabs?: unknown; akatsukiShortcut?: unknown };
}

export function akatsukiDateKey(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function minute(value?: string): number | undefined {
	if (!value || !/^\d{2}:\d{2}$/.test(value)) return undefined;
	const [hours, minutes] = value.split(':').map(Number);
	return hours < 24 && minutes < 60 ? hours * 60 + minutes : undefined;
}

/** A read-only projection: never normalize or write the account's source collections here. */
export function buildHataskAkatsukiModel(source: HataskAkatsukiSource): { model: HataskAkatsukiModel; counts: { calendar: number; todo: number; meal: number; feedback: number } } {
	const { now, known, settings } = source;
	const today = akatsukiDateKey(now);
	const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() - (settings.weekStart === 'sun' ? 0 : 1) + 7) % 7));
	const weekDates = Array.from({ length: 7 }, (_, i) => {
		const day = new Date(weekStart);
		day.setDate(day.getDate() + i);
		return day;
	});
	const keys = weekDates.map(akatsukiDateKey);
	const events = source.events.filter(event => !event.archivedAt);
	const todayEvents = events.filter(event => event.date <= today && (event.dateEnd || event.date) >= today);
	const todos = source.todos.filter(todo => !todo.archivedAt);
	const remainingTodos = todos.filter(todo => !todo.done).sort((a, b) => `${a.due || '9999'}${a.time || '23:59'}`.localeCompare(`${b.due || '9999'}${b.time || '23:59'}`));
	const todayMeals = source.meals.filter(meal => meal.date === today);
	const mealSlots = [{ id: 'breakfast', label: '朝' }, { id: 'lunch', label: '昼' }, { id: 'dinner', label: '夜' }];
	const mealRows = mealSlots.map(slot => {
		const entry = todayMeals.filter(meal => meal.slot === slot.id).sort((a, b) => (a.time || '').localeCompare(b.time || '')).at(-1);
		return { ...slot, recorded: Boolean(entry), unavailable: !known.meals, text: !known.meals ? '記録を読み込めません' : entry ? entry.note || (entry.level === 'none' ? '食事なしを記録' : entry.level === 'little' ? '少し食べた' : '記録済み') : 'まだ記録がありません' };
	});
	const missingMeals = mealRows.filter(meal => !meal.recorded);
	const mealSummary = !known.meals ? 'ごはんの記録を読み込めません' : missingMeals.length ? `${missingMeals.map(meal => meal.label).join('・')}ごはんが未記録` : '朝・昼・夜のごはんを記録済み';
	const md = new Intl.DateTimeFormat(source.locale, { month: 'long', day: 'numeric' });
	const weekday = new Intl.DateTimeFormat(source.locale, { weekday: 'long' });
	const shortWeekday = new Intl.DateTimeFormat(source.locale, { weekday: 'short' });
	const eventModel = (event: EventRow): HataskAkatsukiEvent => ({
		id: event.id,
		title: event.title,
		timeLabel: `${event.date === today ? '' : event.date + ' '}${event.allDay ? '終日' : event.timeStart || '時刻未定'}`,
		meta: `${event.date === today ? '今日' : event.date}${event.dateEnd && event.dateEnd !== event.date ? ` – ${event.dateEnd}` : ''} ・ ${event.allDay ? '終日' : [event.timeStart, event.timeEnd].filter(Boolean).join(' – ') || '時刻未定'}`,
		startMinute: event.allDay ? undefined : event.date < today ? 0 : minute(event.timeStart),
		endMinute: event.allDay ? undefined : event.dateEnd && event.dateEnd > today ? 1440 : minute(event.timeEnd),
		action: { type: 'open-event', id: event.id },
		buttons: [{ label: '予定を開く', icon: 'ti ti-calendar-event', primary: true, action: { type: 'open-event', id: event.id } }],
	});
	const time = now.getHours() * 60 + now.getMinutes();
	const upcoming = events.filter(event => {
		const endDate = event.dateEnd || event.date;
		if (endDate < today) return false;
		if (event.date > today || endDate > today || event.allDay) return true;
		const end = minute(event.timeEnd) ?? minute(event.timeStart);
		return end === undefined || end >= time;
	}).sort((a, b) => `${a.date}T${a.timeStart || '00:00'}`.localeCompare(`${b.date}T${b.timeStart || '00:00'}`));
	const moodIcons = ['ti ti-mood-cry', 'ti ti-mood-sad', 'ti ti-mood-neutral', 'ti ti-mood-smile', 'ti ti-mood-heart'];
	const model: HataskAkatsukiModel = {
		loading: source.loading,
		mobileTabs: normalizeHataskAkatsukiMobileTabs(settings.akatsukiMobileTabs, settings.akatsukiShortcut),
		dateLabel: md.format(now),
		weekdayLabel: weekday.format(now),
		clockLabel: new Intl.DateTimeFormat(source.locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(now),
		showClock: settings.showClock !== false,
		showEvents: settings.showEvents !== false,
		scheduleUnavailable: !known.planner,
		dayCountLabel: `ログイン ${source.loginDays} 日`,
		summary: source.loading ? '記録を読み込んでいます' : `${known.planner ? `予定 ${todayEvents.length} 件、ToDo 残り ${remainingTodos.length} 件` : '予定・ToDoの記録を読み込めません'}${settings.showMealSummary !== false ? ` · ${mealSummary}` : ''}`,
		next: known.planner && settings.showEvents !== false && upcoming[0] ? eventModel(upcoming[0]) : null,
		later: known.planner && settings.showEvents !== false ? upcoming.slice(1, 4).map(eventModel) : [],
		timeline: known.planner && settings.showEvents !== false ? todayEvents.map(eventModel) : [],
		stats: [
			{ id: 'events', label: '今週の予定', value: known.planner ? events.filter(event => event.date <= keys[6] && (event.dateEnd || event.date) >= keys[0]).length : '—', unit: '件', tab: 'cal' },
			{ id: 'todo', label: 'ToDo 完了', value: known.planner ? todos.filter(todo => todo.done).length : '—', unit: known.planner ? `/ ${todos.length}` : '', tab: 'todo' },
			{ id: 'mood', label: 'きもち記録', value: known.moods ? new Set(source.moods.filter(mood => keys.includes(mood.date)).map(mood => mood.date)).size : '—', unit: '日', tab: 'mood' },
			{ id: 'meal', label: 'ごはん記録', value: known.meals ? source.meals.filter(meal => keys.includes(meal.date)).length : '—', unit: '食', tab: 'meal' },
		],
		week: settings.showMoodSummary === false ? [] : weekDates.map(day => {
			const date = akatsukiDateKey(day);
			const last = source.moods.filter(mood => mood.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || '')).at(-1);
			return { id: date, label: shortWeekday.format(day), today: date === today, pending: !known.moods || !last, icon: known.moods && last ? moodIcons[last.level - 1] : undefined, description: `${md.format(day)} ${!known.moods ? '読み込めません' : last ? `きもち ${last.level}` : '未記録'}` };
		}),
		meals: settings.showMealSection === false ? [] : mealRows,
		mealSummary: settings.showMealSummary === false ? undefined : mealSummary,
		flower: settings.showFlower === false || !known.flower ? null : { name: source.flower.name, emoji: source.flower.emoji, progress: source.flower.progress, detail: source.flower.progress >= 100 ? '開花しました' : `開花まで ${source.flower.remaining}` },
		streakLabel: `ログイン累計 ${source.loginDays} 日`,
		rankLabel: source.loginRanking > 0 ? `#${source.loginRanking}` : undefined,
		eye: { text: source.eyePhrase },
		todos: known.planner ? remainingTodos.slice(0, 3).map(todo => ({ id: todo.id, title: todo.text, meta: todo.due ? `${todo.due === today ? '今日' : todo.due}${todo.time ? ` ${todo.time}` : ''}` : '期限なし', completed: false, readOnly: source.readOnly })) : [],
	};
	return { model, counts: { calendar: known.planner ? todayEvents.length : 0, todo: known.planner ? remainingTodos.length : 0, meal: known.meals ? todayMeals.length : 0, feedback: source.feedbackUnread } };
}
