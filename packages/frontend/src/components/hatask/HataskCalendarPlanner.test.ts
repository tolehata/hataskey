/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick } from 'vue';
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
				filters: [{ id: 'mine', label: '自分の予定', active: true }],
				labels,
				'onUpdate:view': handlers.view,
				onNavigate: handlers.navigate,
				onSelectDate: handlers.selectDate,
				onToggleFilter: handlers.filter,
				onActivateEvent: handlers.activate,
				onEditEvent: handlers.edit,
				onMoveRequest: handlers.move,
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

afterEach(() => {
	for (const item of mounted.splice(0)) {
		item.app.unmount();
		item.container.remove();
	}
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
});
