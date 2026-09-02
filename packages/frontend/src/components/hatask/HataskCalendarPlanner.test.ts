/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from '@vue/compiler-sfc';
import { createApp, defineComponent, h, nextTick, reactive } from 'vue';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/components/HataskEmoji.vue', async () => {
	const { defineComponent: defineMockComponent, h: renderNode } = await import('vue');
	return { default: defineMockComponent({ props: { emoji: { type: String, default: '' } }, setup: props => () => renderNode('span', { 'data-test-emoji': '' }, props.emoji) }) };
});

import HataskCalendarPlanner from './HataskCalendarPlanner.vue';
import type { App } from 'vue';
import type { HataskCalendarDay, HataskCalendarLabels, HataskCalendarWeekday } from './hatask-planner-types.js';

type Mounted = { app: App<Element>; container: HTMLDivElement };
const mounted: Mounted[] = [];

const labels: HataskCalendarLabels = {
	calendar: '予定表',
	viewSelector: '表示',
	views: { month: '月', week: '週', day: '日', agenda: '予定一覧' },
	previousPeriod: '前へ',
	nextPeriod: '次へ',
	today: '今日',
	filters: '絞り込み',
	allDay: '終日',
	loading: '読み込み中',
	empty: '予定はありません',
	readOnly: '読み取り専用',
	selectedDay: '選択した日の予定',
	dragHint: '日付や時刻へ移動',
	trashHint: 'ここへ運んで削除',
	selectDate: date => `${date}を選択`,
	openEvent: title => `${title}を開く`,
	editEvent: title => `${title}を編集`,
	moveEvent: title => `${title}を移動または複製`,
	showMore: count => `ほか${count}件`,
};

const weekdays: HataskCalendarWeekday[] = [
	{ id: 'mon', label: '月' },
	{ id: 'tue', label: '火' },
	{ id: 'wed', label: '水' },
	{ id: 'thu', label: '木' },
	{ id: 'fri', label: '金' },
	{ id: 'sat', label: '土', isWeekend: true },
	{ id: 'sun', label: '日', isWeekend: true },
];

const days: HataskCalendarDay[] = Array.from({ length: 7 }, (_, index) => ({
	key: `2026-08-${24 + index}`,
	date: `2026-08-${24 + index}`,
	label: `8月${24 + index}日`,
	dayNumber: 24 + index,
	weekdayLabel: weekdays[index].label,
	isToday: index === 1,
	isSelected: index === 2,
	events: index === 2 ? [{ id: 'event-1', title: '打ち合わせ', emoji: '📅', date: '2026-08-26', dateEnd: '2026-08-26', timeStart: '10:00', timeEnd: '11:00', timeLabel: '10:00', color: '#1677aa' }] : [],
}));

function mountCalendar(options: Record<string, unknown> = {}) {
	const handlers = {
		view: vi.fn(),
		navigate: vi.fn(),
		selectDate: vi.fn(),
		filter: vi.fn(),
		activate: vi.fn(),
		edit: vi.fn(),
		move: vi.fn(),
		showMore: vi.fn(),
		drop: vi.fn(),
		trash: vi.fn(),
	};
	const app = createApp(defineComponent({
		setup() {
			return () => h(HataskCalendarPlanner, {
				theme: 'kashin',
				view: 'month',
				title: '2026年8月',
				weekdays,
				days,
				filters: [{ id: 'mine', icon: 'ti ti-lock', label: '自分の予定', active: true }, { id: 'public', icon: 'ti ti-world', label: '公開', active: false }],
				labels,
				'onUpdate:view': handlers.view,
				onNavigate: handlers.navigate,
				onSelectDate: handlers.selectDate,
				onToggleFilter: handlers.filter,
				onActivateEvent: handlers.activate,
				onEditEvent: handlers.edit,
				onMoveRequest: handlers.move,
				onShowMore: handlers.showMore,
				onDropEvent: handlers.drop,
				onTrashEvent: handlers.trash,
				...options,
			});
		},
	}));
	const container = window.document.createElement('div');
	window.document.body.append(container);
	app.mount(container);
	mounted.push({ app, container });
	return { container, handlers };
}

function mockCalendarWidth(initialWidth: number) {
	const observers = new Set<{ callback: ResizeObserverCallback; observer: ResizeObserver }>();
	let width = initialWidth;
	class CalendarResizeObserver {
		private readonly entry: { callback: ResizeObserverCallback; observer: ResizeObserver };

		constructor(callback: ResizeObserverCallback) {
			this.entry = { callback, observer: this as unknown as ResizeObserver };
		}

		observe(): void {
			observers.add(this.entry);
			this.entry.callback([{ contentRect: { width } } as ResizeObserverEntry], this.entry.observer);
		}

		disconnect(): void { observers.delete(this.entry); }
	}
	vi.stubGlobal('ResizeObserver', CalendarResizeObserver);
	return (nextWidth: number) => {
		width = nextWidth;
		for (const entry of observers) entry.callback([{ contentRect: { width } } as ResizeObserverEntry], entry.observer);
	};
}

function dispatchTouchPointer(target: EventTarget, type: string): void {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.defineProperties(event, {
		pointerType: { value: 'touch' }, pointerId: { value: 1 },
		clientX: { value: 10 }, clientY: { value: 10 },
	});
	target.dispatchEvent(event);
}

afterEach(async () => {
	for (const item of mounted.splice(0)) {
		item.app.unmount();
		item.container.remove();
	}
	// Teleported leave transitions must finish before the next fixture starts.
	await vi.waitFor(() => expect(window.document.querySelector('[data-calendar-trash]')).toBeNull());
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('HataskCalendarPlanner', () => {
	test('テーマと月グリッドの意味を公開し、操作をデータ変更なしで通知する', async () => {
		const { container, handlers } = mountCalendar();
		await nextTick();
		const root = container.querySelector<HTMLElement>('[data-hatask-component="calendar"]');
		expect(root?.dataset.hataskTheme).toBe('kashin');
		expect(root?.dataset.view).toBe('month');
		expect(container.querySelector('[role="grid"]')).not.toBeNull();
		expect(container.querySelectorAll('[role="columnheader"]')).toHaveLength(7);
		expect(container.querySelectorAll('[data-calendar-week][role="row"]')).toHaveLength(1);
		expect(container.querySelectorAll('[role="rowgroup"] > [role="row"] > [role="gridcell"]')).toHaveLength(7);
		expect(container.querySelectorAll('[data-calendar-day-button][tabindex="0"]')).toHaveLength(1);
		expect(container.querySelector<HTMLButtonElement>('[aria-label="8月26日を選択"]')?.tabIndex).toBe(0);
		expect(container.querySelector('[data-calendar-event="event-1"]')?.textContent).toContain('10:00');

		(container.querySelector('[aria-label="次へ"]') as HTMLButtonElement).click();
		(container.querySelector('[aria-label="週"]') as HTMLButtonElement).click();
		(container.querySelector('[aria-label="8月26日を選択"]') as HTMLButtonElement).click();
		(container.querySelector('[aria-label="自分の予定"]') as HTMLButtonElement).click();
		(container.querySelector('[aria-label="打ち合わせを開く"]') as HTMLButtonElement).click();

		expect(handlers.navigate).toHaveBeenCalledWith('next');
		expect(container.querySelector('[aria-label="予定を追加"]')).toBeNull();
		expect(handlers.view).toHaveBeenCalledWith('week');
		expect(handlers.selectDate).toHaveBeenCalledWith(days[2]);
		expect(handlers.filter).toHaveBeenCalledWith('mine');
		expect(container.querySelector('[aria-label="自分の予定"] i')?.className).toContain('ti-lock');
		const publicFilter = container.querySelector<HTMLButtonElement>('[aria-label="公開"]');
		expect(publicFilter?.querySelector('i')?.className).toContain('ti-world');
		expect(publicFilter?.getAttribute('aria-pressed')).toBe('false');
		publicFilter?.click();
		expect(handlers.filter).toHaveBeenCalledWith('public');
		expect(handlers.activate).toHaveBeenCalledWith(days[2].events[0], days[2]);
	});

	test('月グリッドは矢印キーで隣の日付へフォーカスを移せる', async () => {
		const { container } = mountCalendar();
		await nextTick();
		const first = container.querySelector<HTMLButtonElement>('[aria-label="8月24日を選択"]');
		const second = container.querySelector<HTMLButtonElement>('[aria-label="8月25日を選択"]');
		first?.focus();
		first?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		await nextTick();
		expect(window.document.activeElement).toBe(second);
		expect(first?.tabIndex).toBe(-1);
		expect(second?.tabIndex).toBe(0);
	});

	test('週表示では移動と編集の代替操作があり、読み取り専用時は無効になる', async () => {
		const { container, handlers } = mountCalendar({ view: 'week', readOnly: true });
		await nextTick();
		expect(container.textContent).toContain(labels.readOnly);
		expect(container.querySelectorAll('[role="status"]')).toHaveLength(0);
		expect(container.querySelector('[aria-label="予定を追加"]')).toBeNull();
		const move = container.querySelector<HTMLButtonElement>('[aria-label="打ち合わせを移動または複製"]');
		expect(move?.disabled).toBe(true);
		const edit = container.querySelector<HTMLButtonElement>('[aria-label="打ち合わせを編集"]');
		expect(edit?.disabled).toBe(true);
		edit?.click();
		expect(handlers.edit).not.toHaveBeenCalled();
		move?.click();
		expect(handlers.move).not.toHaveBeenCalled();
	});

	test('重なる予定を同じ時間軸の別レーンに配置する', async () => {
		const overlapping = [{
			...days[2],
			events: [
				...days[2].events,
				{ id: 'event-2', title: 'レビュー', date: '2026-08-26', dateEnd: '2026-08-26', timeStart: '10:30', timeEnd: '11:30', timeLabel: '10:30', color: '#aa5516' },
			],
		}];
		const { container } = mountCalendar({ view: 'day', days: overlapping });
		await nextTick();
		const first = container.querySelector<HTMLElement>('[data-calendar-event="event-1"]');
		const second = container.querySelector<HTMLElement>('[data-calendar-event="event-2"]');
		expect(first?.style.left).toBe('0%');
		expect(second?.style.left).toBe('50%');
		expect(first?.style.width).toContain('50%');
	});

	test.each(['day', 'trash'] as const)('予定を%sへドラッグしてもpointercancelでは確定せず、次のドラッグは使える', async targetKind => {
		vi.useFakeTimers();
		try {
			mockCalendarWidth(1100);
			const original = JSON.stringify(days);
			const { container, handlers } = mountCalendar();
			await nextTick();
			const source = container.querySelector<HTMLButtonElement>('[data-calendar-day-pane] [aria-label="打ち合わせを開く"]');
			if (!source) throw new Error('day pane event drag source was not rendered');
			const hitTest = vi.spyOn(window.document, 'elementFromPoint');
			const beginDrag = async () => {
				dispatchTouchPointer(source, 'pointerdown');
				vi.advanceTimersByTime(380);
				await nextTick();
				const target = targetKind === 'trash'
					? window.document.querySelector('[data-calendar-trash]')
					: container.querySelector(`[data-calendar-drop-date="${days[3].date}"]`);
				if (!target) throw new Error(`required ${targetKind} drop target was not rendered`);
				hitTest.mockReturnValue(target);
				dispatchTouchPointer(window, 'pointermove');
			};
			const expectNormalDrop = () => {
				if (targetKind === 'trash') expect(handlers.trash).toHaveBeenCalledWith(days[2].events[0]);
				else expect(handlers.drop).toHaveBeenCalledWith(days[2].events[0], days[3], undefined);
			};

			// Positive control: the same source and target can produce a normal drop.
			await beginDrag();
			dispatchTouchPointer(window, 'pointerup');
			expectNormalDrop();
			handlers.drop.mockClear();
			handlers.trash.mockClear();

			await beginDrag();
			dispatchTouchPointer(window, 'pointercancel');
			dispatchTouchPointer(window, 'pointerup');
			expect(handlers.drop).not.toHaveBeenCalled();
			expect(handlers.trash).not.toHaveBeenCalled();

			await beginDrag();
			dispatchTouchPointer(window, 'pointerup');
			expectNormalDrop();
			expect(JSON.stringify(days)).toBe(original);
		} finally {
			await nextTick();
			await vi.advanceTimersByTimeAsync(500);
			vi.useRealTimers();
		}
	});

	test('長押し成立前のpointercancelでも開始待ちを解除する', async () => {
		vi.useFakeTimers();
		try {
			const { container, handlers } = mountCalendar();
			await nextTick();
			const source = container.querySelector('[aria-label="打ち合わせを開く"]');
			if (!source) throw new Error('calendar event drag source was not rendered');
			expect(window.document.querySelector('[data-calendar-trash]')).toBeNull();
			dispatchTouchPointer(source, 'pointerdown');
			vi.advanceTimersByTime(100);
			dispatchTouchPointer(window, 'pointercancel');
			vi.advanceTimersByTime(1000);
			await nextTick();
			expect(window.document.querySelector('[data-calendar-trash]')).toBeNull();
			dispatchTouchPointer(window, 'pointerup');
			expect(handlers.drop).not.toHaveBeenCalled();
			expect(handlers.trash).not.toHaveBeenCalled();
			// Positive control: without cancellation the same long press starts.
			dispatchTouchPointer(source, 'pointerdown');
			vi.advanceTimersByTime(380);
			await nextTick();
			expect(window.document.querySelector('[data-calendar-trash]')).not.toBeNull();
			dispatchTouchPointer(window, 'pointercancel');
		} finally {
			await nextTick();
			await vi.advanceTimersByTimeAsync(500);
			vi.useRealTimers();
		}
	});

	test('読み込み表示は親のライブリージョンと重複せず、busy状態だけを公開する', async () => {
		const { container } = mountCalendar({ loading: true });
		await nextTick();
		const root = container.querySelector<HTMLElement>('[data-hatask-component="calendar"]');
		expect(root?.getAttribute('aria-busy')).toBe('true');
		expect(container.textContent).toContain(labels.loading);
		expect(container.querySelectorAll('[role="status"]')).toHaveLength(0);
	});

	test('デッキの細い列ではブラウザ幅ではなく実際の表示幅でコンパクト化する', async () => {
		class CompactResizeObserver {
			private readonly callback: ResizeObserverCallback;

			constructor(callback: ResizeObserverCallback) {
				this.callback = callback;
			}

			observe(): void {
				this.callback([{ contentRect: { width: 480 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
			}

			disconnect(): void {}
		}

		vi.stubGlobal('ResizeObserver', CompactResizeObserver);
		const { container } = mountCalendar();
		await nextTick();
		expect(container.querySelector<HTMLElement>('[data-hatask-component="calendar"]')?.dataset.compact).toBe('true');
	});

	test.each(['kisetsu', 'kashin', 'suri', 'hatakyu'])('PCの%sテーマは選択日の全予定を右ペインへ併置する', async theme => {
		mockCalendarWidth(1100);
		const selected = {
			...days[2],
			events: Array.from({ length: 5 }, (_, index) => ({ ...days[2].events[0], id: `event-${index + 1}`, title: `予定${index + 1}` })),
		};
		const calendarDays = days.map(day => day.isSelected ? selected : day);
		const original = JSON.stringify(calendarDays);
		const { container, handlers } = mountCalendar({ theme, days: calendarDays });
		await nextTick();
		expect(container.querySelector<HTMLElement>('[data-hatask-component="calendar"]')?.dataset.layout).toBe('split');
		expect(container.querySelector<HTMLElement>('[data-hatask-component="calendar"]')?.dataset.hataskTheme).toBe(theme);
		expect(container.querySelectorAll('[role="gridcell"]')).toHaveLength(7);
		const pane = container.querySelector<HTMLElement>('[data-calendar-day-pane]');
		expect(pane?.dataset.desktopPane).toBe('true');
		expect(pane?.dataset.date).toBe(selected.date);
		expect(pane?.getAttribute('aria-label')).toBe(`${labels.selectedDay}: ${selected.label}`);
		expect(pane?.querySelectorAll('[data-calendar-event]')).toHaveLength(5);
		expect(pane?.textContent).toContain('予定5');
		expect(JSON.stringify(calendarDays)).toBe(original);
		expect(handlers.selectDate).not.toHaveBeenCalled();
	});

	test('右ペインの詳細・編集・移動・日表示は既存の親イベントへ通知する', async () => {
		mockCalendarWidth(1100);
		const { container, handlers } = mountCalendar();
		await nextTick();
		const pane = container.querySelector('[data-calendar-day-pane]');
		pane?.querySelector<HTMLButtonElement>('[aria-label="打ち合わせを開く"]')?.click();
		pane?.querySelector<HTMLButtonElement>('[aria-label="打ち合わせを編集"]')?.click();
		pane?.querySelector<HTMLButtonElement>('[aria-label="打ち合わせを移動または複製"]')?.click();
		pane?.querySelector<HTMLButtonElement>('[data-calendar-pane-open-day]')?.click();
		expect(handlers.activate).toHaveBeenCalledWith(days[2].events[0], days[2]);
		expect(handlers.edit).toHaveBeenCalledWith(days[2].events[0], days[2]);
		expect(handlers.move).toHaveBeenCalledWith(days[2].events[0], days[2]);
		expect(handlers.showMore).toHaveBeenCalledWith(days[2]);
		expect(handlers.view).not.toHaveBeenCalled();
	});

	test('右ペインの日付送りは無効日を飛ばし、親の選択更新へ追従する', async () => {
		mockCalendarWidth(1100);
		const state = reactive({ days: days.map((day, index) => ({ ...day, isDisabled: index === 3 })) });
		const { container, handlers } = mountCalendar(state);
		await nextTick();
		container.querySelector<HTMLButtonElement>('[data-calendar-pane-previous]')?.click();
		expect(handlers.selectDate).toHaveBeenLastCalledWith(state.days[1]);
		container.querySelector<HTMLButtonElement>('[data-calendar-pane-next]')?.click();
		expect(handlers.selectDate).toHaveBeenLastCalledWith(state.days[4]);
		state.days = state.days.map((day, index) => ({ ...day, isSelected: index === 4 }));
		await nextTick();
		expect(container.querySelector<HTMLElement>('[data-calendar-day-pane]')?.dataset.date).toBe(state.days[4].date);
		expect(container.querySelector('[data-calendar-day-pane]')?.textContent).toContain(labels.empty);
		state.days = state.days.map((day, index) => ({ ...day, isSelected: index === 0 }));
		await nextTick();
		expect(container.querySelector<HTMLButtonElement>('[data-calendar-pane-previous]')?.disabled).toBe(true);
	});

	test('ウィンドウ幅の往復では月の選択日と予定を保持し、モバイルへPC操作を持ち込まない', async () => {
		const resize = mockCalendarWidth(1100);
		const original = JSON.stringify(days);
		const { container, handlers } = mountCalendar();
		await nextTick();
		const pane = container.querySelector('[data-calendar-day-pane]');
		resize(480);
		await nextTick();
		expect(container.querySelector<HTMLElement>('[data-hatask-component="calendar"]')?.dataset.layout).toBe('single');
		expect(container.querySelector<HTMLElement>('[data-hatask-component="calendar"]')?.dataset.compact).toBe('true');
		expect(container.querySelector('[data-calendar-day-pane]')).toBe(pane);
		expect(container.querySelector<HTMLElement>('[data-calendar-day-pane]')?.dataset.desktopPane).toBe('false');
		expect(container.querySelector('[data-calendar-pane-open-day]')).toBeNull();
		resize(1100);
		await nextTick();
		expect(container.querySelector('[data-calendar-day-pane]')).toBe(pane);
		expect(container.querySelector<HTMLElement>('[data-calendar-day-pane]')?.dataset.date).toBe(days[2].date);
		expect(JSON.stringify(days)).toBe(original);
		expect(handlers.selectDate).not.toHaveBeenCalled();
	});

	test('週表示は充分な幅があるときだけ右ペインを開いて七日分の時間軸を保つ', async () => {
		const resize = mockCalendarWidth(1100);
		const { container } = mountCalendar({ view: 'week' });
		await nextTick();
		expect(container.querySelector<HTMLElement>('[data-hatask-component="calendar"]')?.dataset.layout).toBe('single');
		expect(container.querySelector('[data-calendar-day-pane]')).toBeNull();
		resize(1140);
		await nextTick();
		expect(container.querySelector<HTMLElement>('[data-hatask-component="calendar"]')?.dataset.layout).toBe('split');
		expect(container.querySelectorAll('[data-calendar-time-canvas]')).toHaveLength(7);
		expect(container.querySelector('[data-calendar-day-pane]')).not.toBeNull();
		resize(640);
		await nextTick();
		expect(container.querySelector('[data-calendar-day-pane]')).toBeNull();
		expect(container.querySelectorAll('[data-calendar-time-canvas]')).toHaveLength(7);
	});

	test.each([
		{ view: 'month', layout: 'split', pane: true, eventCopies: 2 },
		{ view: 'week', layout: 'split', pane: true, eventCopies: 2 },
		{ view: 'day', layout: 'single', pane: false, eventCopies: 1 },
		{ view: 'agenda', layout: 'single', pane: false, eventCopies: 1 },
	] as const)('PC幅の$view表示は$layoutレイアウトとなり右ペイン=$paneで予定を描画する', async ({ view, layout, pane, eventCopies }) => {
		mockCalendarWidth(1200);
		const { container } = mountCalendar({ view });
		await nextTick();
		expect(container.querySelector<HTMLElement>('[data-hatask-component="calendar"]')?.dataset.layout).toBe(layout);
		expect(container.querySelector('[data-calendar-day-pane]') != null).toBe(pane);
		expect(container.querySelectorAll('[data-calendar-event="event-1"]')).toHaveLength(eventCopies);
	});

	test('PCで選択が未指定なら今日の予定を参照し、選択や元データを書き換えない', async () => {
		mockCalendarWidth(1100);
		const calendarDays = days.map(day => ({ ...day, isSelected: false }));
		const original = JSON.stringify(calendarDays);
		const { container, handlers } = mountCalendar({ days: calendarDays });
		await nextTick();
		expect(container.querySelector<HTMLElement>('[data-calendar-day-pane]')?.dataset.date).toBe(days[1].date);
		expect(JSON.stringify(calendarDays)).toBe(original);
		expect(handlers.selectDate).not.toHaveBeenCalled();
	});

	test('読み取り専用でも右ペインは読めるが、編集や移動は無効のままにする', async () => {
		mockCalendarWidth(1100);
		const { container, handlers } = mountCalendar({ readOnly: true });
		await nextTick();
		const pane = container.querySelector('[data-calendar-day-pane]');
		const edit = pane?.querySelector<HTMLButtonElement>('[aria-label="打ち合わせを編集"]');
		const move = pane?.querySelector<HTMLButtonElement>('[aria-label="打ち合わせを移動または複製"]');
		expect(pane?.textContent).toContain('打ち合わせ');
		expect(edit?.disabled).toBe(true);
		expect(move?.disabled).toBe(true);
		edit?.click();
		move?.click();
		expect(handlers.edit).not.toHaveBeenCalled();
		expect(handlers.move).not.toHaveBeenCalled();
	});

	test('PC月表示は日付セルを一件と続きの導線へ圧縮し、小窓では従来の件数を保つ', async () => {
		const resize = mockCalendarWidth(1100);
		const selected = {
			...days[2],
			events: Array.from({ length: 4 }, (_, index) => ({ ...days[2].events[0], id: `dense-event-${index + 1}`, title: `予定${index + 1}` })),
		};
		const calendarDays = days.map(day => day.isSelected ? selected : day);
		const { container } = mountCalendar({ days: calendarDays });
		await nextTick();
		const selectedCell = container.querySelector('[role="gridcell"][aria-selected="true"]');
		expect(selectedCell?.querySelectorAll('[data-calendar-event]')).toHaveLength(1);
		expect(selectedCell?.textContent).toContain('ほか3件');
		resize(480);
		await nextTick();
		expect(selectedCell?.querySelectorAll('[data-calendar-event]')).toHaveLength(3);
		expect(selectedCell?.textContent).toContain('ほか1件');
	});

	test('二ペインは名前付きコンテナと縮められる列を使い、小窓と縮小モーションを保持する', () => {
		// Source contract only; Happy DOM does not verify rendered container layout.
		const filename = resolve(process.cwd(), 'src/components/hatask/HataskCalendarPlanner.vue');
		const parsed = parse(readFileSync(filename, 'utf8'), { filename });
		expect(parsed.errors).toEqual([]);
		const stylesheet = parsed.descriptor.styles[0].content;
		expect(stylesheet).toContain('container-name: hatask-calendar;');
		expect(stylesheet).toContain('@container hatask-calendar (min-width: 960px)');
		expect(stylesheet).toContain('@container hatask-calendar (min-width: 900px)');
		expect(stylesheet).toContain('@container hatask-calendar (min-width: 1120px)');
		expect(stylesheet).toContain('height: 600px;');
		expect(stylesheet).toContain('grid-template-columns: minmax(0, 1fr) minmax(280px, .43fr)');
		expect(stylesheet).toContain('grid-template-columns: minmax(0, 1fr) 280px');
		expect(stylesheet).toContain('grid-template-columns: minmax(0, 1.35fr) repeat(6, minmax(0, 1fr))');
		expect(stylesheet).toContain('@container (max-width: 720px)');
		expect(stylesheet).toContain('@media (prefers-reduced-motion: reduce)');
	});
});
