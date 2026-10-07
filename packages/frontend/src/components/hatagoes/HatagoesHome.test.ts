/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, h, nextTick, ref } from 'vue';
import type { HatagoesCardV3, HatagoesCardV3Id } from '@/utility/hatagoes-preferences.js';
import type { HatagoesCatalogEntry } from '@/utility/hatagoes-catalog.js';

const loaders = vi.hoisted(() => ({ planner: vi.fn(), flower: vi.fn(), journal: vi.fn(), daily: vi.fn(), reading: vi.fn(), stats: vi.fn() }));
vi.mock('@/components/HyBookCover.vue', async () => { const { h: makeNode } = await import('vue'); return { default: { props: ['title', 'author', 'colorIndex', 'width', 'showTitle'], setup: (props: { title: string; author?: string; colorIndex?: number; width: number; showTitle: boolean }) => () => makeNode('span', { 'data-book-cover': props.title, 'data-author': props.author, 'data-color-index': props.colorIndex, 'data-width': props.width, 'data-show-title': props.showTitle }) } }; });
vi.mock('@/components/HataskEmoji.vue', () => ({ default: { props: ['emoji'], render: () => null } }));
vi.mock('./HatagoesSharedFeed.vue', () => ({ default: { render: () => null } }));
vi.mock('@/utility/hatagoes-home.js', () => ({
	HATAGOES_HOME_PATHS: { schedule: '/hatask?tab=cal', todo: '/hatask?tab=todo', flower: '/hatask?tab=garden' },
	HATAGOES_HOME_TITLES: { schedule: '予定', todo: '優先 ToDo', flower: 'おはな' },
	loadHatagoesPlanner: loaders.planner, loadHatagoesFlower: loaders.flower, loadHatagoesStats: loaders.stats,
	loadHatagoesJournal: loaders.journal, loadHatagoesReading: loaders.reading, loadHatagoesIssues: vi.fn(), loadHatagoesCommunity: vi.fn(), loadHatagoesRoadmap: vi.fn(),
}));
vi.mock('@/utility/hatagoes-home-v3.js', () => ({ loadHatagoesDaily: loaders.daily, loadHatagoesJournalV3: loaders.journal }));
import HatagoesHome from './HatagoesHome.vue';

async function settle() { await Promise.resolve(); await nextTick(); await nextTick(); }

let cleanup: (() => void) | undefined;

function mount(cards: Array<{ id: string; hidden: boolean }>, busyTodoIds: string[] = [], initiallyActive = true, order?: HatagoesCardV3Id[], launcherApps: HatagoesCatalogEntry[] = []) {
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const toggled: string[] = [];
	const navigated: string[] = [];
	const moods: number[] = [];
	const meals: string[] = [];
	const waters: string[] = [];
	const openedApps: string[] = [];
	const allApps = vi.fn();
	const home = ref<InstanceType<typeof HatagoesHome> | null>(null);
	const active = ref(initiallyActive);
	const revision = ref(0);
	const all: HatagoesCardV3Id[] = order ?? ['daily', 'schedule', 'flower', 'todo', 'mood', 'meal', 'reading', 'issues', 'history', 'feed'];
	const cardsV3: HatagoesCardV3[] = all.map(id => ({ id, hidden: cards.find(card => card.id === id)?.hidden ?? true }));
	const app = createApp({ render: () => h(HatagoesHome, { ref: home, cardsV3, launcherApps, revision: revision.value, active: active.value, busyTodoIds, onToggleTodo: (id: string) => toggled.push(id), onNavigate: (path: string) => navigated.push(path), onRecordMood: (level: number) => moods.push(level), onRecordMeal: (slot: string) => meals.push(slot), onWater: (day: string) => waters.push(day), onOpenApp: (id: string) => openedApps.push(id), onAllApps: allApps }) });
	app.component('MkUserName', { props: ['user', 'nowrap'], render: () => h('span') });
	app.mount(target);
	cleanup = () => { app.unmount(); target.remove(); };
	return { target, toggled, navigated, moods, meals, waters, openedApps, allApps, active, revision, home };
}

beforeEach(() => { loaders.planner.mockReset(); loaders.flower.mockReset(); loaders.journal.mockReset(); loaders.daily.mockReset(); loaders.reading.mockReset(); loaders.stats.mockReset(); loaders.flower.mockResolvedValue({ rows: [] }); loaders.reading.mockResolvedValue({ rows: [] }); loaders.journal.mockResolvedValue({ today: '2026-10-03', week: [], meals: [], history: { date: '2026-09-26', meals: [] } }); loaders.daily.mockResolvedValue({ today: '2026-10-03', timezone: 'Asia/Tokyo', days: [{ date: '2026-10-03', known: true, completed: [], count: 0, complete: false }], streakDays: 0 }); vi.useFakeTimers(); });
afterEach(() => { cleanup?.(); cleanup = undefined; vi.useRealTimers(); });

describe('HataGoes Home', () => {
	test('renders ranked launcher entries in the mock desktop and mobile slots and emits catalog IDs', () => {
		const launcherApps: HatagoesCatalogEntry[] = Array.from({ length: 14 }, (_, index) => ({ id: `hatask.screen-${index}`, app: 'hatask', label: `画面${index}`, icon: 'ti ti-apps', path: '/hatask' }));
		const view = mount([{ id: 'daily', hidden: false }], [], true, undefined, launcherApps);
		const desktop = view.target.querySelector('.hgh-launcher-desktop')!;
		const mobile = view.target.querySelector('.hgh-launcher-mobile')!;
		expect([...desktop.querySelectorAll('.hgh-launcher-app')]).toHaveLength(12);
		expect([...mobile.querySelectorAll('.hgh-launcher-app')]).toHaveLength(8);
		expect(desktop.querySelector('.hgh-launcher-app')?.textContent).toContain('画面0');
		expect(mobile.querySelectorAll('.hgh-launcher-app')[6]?.textContent).toContain('画面6');
		expect(mobile.querySelectorAll('.hgh-launcher-app')[7]?.textContent).toContain('すべて');
		expect(desktop.nextElementSibling?.classList.contains('hgh-card-daily')).toBe(true);
		expect(mobile.previousElementSibling?.classList.contains('hgh-card-daily')).toBe(true);
		(mobile.querySelector('.hgh-launcher-app') as HTMLButtonElement).click();
		expect(view.openedApps).toEqual(['hatask.screen-0']);
		(mobile.querySelector('.hgh-launcher-app-all') as HTMLButtonElement).click();
		(desktop.querySelector('.hgh-launcher-all') as HTMLButtonElement).click();
		expect(view.allApps).toHaveBeenCalledTimes(2);
	});

	test('places the mobile launcher first when the daily card is hidden', () => {
		const view = mount([]);
		expect(view.target.querySelector('.hgh-card-daily')).toBeNull();
		expect((view.target.querySelector('.hgh-launcher-mobile') as HTMLElement).style.order).toBe('-1');
	});
	test('keeps the default narrow flower and reading pair together', () => {
		const view = mount([{ id: 'flower', hidden: false }, { id: 'reading', hidden: false }]);
		expect(view.target.querySelector('.hgh')?.classList.contains('hgh-mobile-half-pair')).toBe(true);
		expect(view.target.querySelector('.hgh')?.classList.contains('hgh-tablet-half-pair')).toBe(true);
	});

	test('expands a lone flower card instead of leaving a half-width gap', () => {
		const view = mount([{ id: 'flower', hidden: false }]);
		expect(view.target.querySelector('.hgh')?.classList.contains('hgh-mobile-half-pair')).toBe(false);
		expect(view.target.querySelector('.hgh')?.classList.contains('hgh-tablet-half-pair')).toBe(false);
	});

	test('expands separated cards and accounts for mobile-only history hiding', () => {
		const order: HatagoesCardV3Id[] = ['daily', 'schedule', 'flower', 'history', 'reading', 'todo', 'mood', 'meal', 'issues', 'feed'];
		const view = mount([{ id: 'flower', hidden: false }, { id: 'history', hidden: false }, { id: 'reading', hidden: false }], [], true, order);
		expect(view.target.querySelector('.hgh')?.classList.contains('hgh-tablet-half-pair')).toBe(false);
		expect(view.target.querySelector('.hgh')?.classList.contains('hgh-mobile-half-pair')).toBe(true);
	});

	test('expands flower and reading when another mobile card separates them', () => {
		const order: HatagoesCardV3Id[] = ['daily', 'schedule', 'flower', 'mood', 'reading', 'todo', 'meal', 'issues', 'history', 'feed'];
		const view = mount([{ id: 'flower', hidden: false }, { id: 'mood', hidden: false }, { id: 'reading', hidden: false }], [], true, order);
		expect(view.target.querySelector('.hgh')?.classList.contains('hgh-mobile-half-pair')).toBe(false);
	});
	test('only renders visible cards and emits the requested ToDo toggle without writing', async () => {
		loaders.planner.mockResolvedValue({ schedule: { rows: [] }, todo: { rows: [{ id: 'todo-1', title: '手紙を出す', path: '/hatask?tab=todo&hgKind=todo&hgId=todo-1', priority: 'high' }], total: 1 } });
		const view = mount([{ id: 'schedule', hidden: true }, { id: 'todo', hidden: false }]);
		await settle();
		expect(view.target.querySelector('.hgh-card-schedule')).toBeNull();
		expect(view.target.textContent).toContain('手紙を出す');
		const check = view.target.querySelector('.hgh-check') as HTMLButtonElement;
		check.click();
		expect(view.toggled).toEqual(['todo-1']);
		expect(loaders.planner).toHaveBeenCalledTimes(1);
	});

	test('keeps a failed flower source separate and retries it', async () => {
		loaders.flower.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ rows: [], flower: { emoji: '🌼', name: '花', progress: 72, drops: 2, canWater: true, harvestedCount: 2 } });
		const view = mount([{ id: 'flower', hidden: false }]);
		await settle();
		expect(view.target.textContent).toContain('読み込めませんでした');
		const retry = [...view.target.querySelectorAll('button')].find(button => button.textContent.includes('再試行'));
		expect(retry).toBeDefined();
		retry?.click();
		await settle();
		expect(view.target.textContent).toContain('成長 72%');
		expect(view.target.querySelector('.hgh-harvested')?.textContent).toContain('2');
		expect(loaders.flower).toHaveBeenCalledTimes(2);
	});

	test('refreshes once on return to home after changes while hidden', async () => {
		loaders.flower.mockResolvedValueOnce({ rows: [], flower: { emoji: '🌼', name: '最初の花', progress: 20, drops: 1, canWater: false } })
			.mockResolvedValueOnce({ rows: [], flower: { emoji: '🌷', name: '新しい花', progress: 60, drops: 2, canWater: true } });
		const view = mount([{ id: 'flower', hidden: false }]);
		await settle();
		expect(view.target.textContent).toContain('最初の花');
		view.active.value = false;
		view.revision.value += 1;
		view.revision.value += 1;
		await settle();
		expect(loaders.flower).toHaveBeenCalledTimes(1);
		view.active.value = true;
		await settle();
		expect(loaders.flower).toHaveBeenCalledTimes(2);
		expect(view.target.textContent).toContain('新しい花');
	});

	test('shows the next event once and keeps the compact flower tile navigable', async () => {
		loaders.planner.mockResolvedValue({ schedule: { rows: [{ id: 'e1', title: '図書館へ', path: '/event/e1', detail: '今日 · 16:30' }], nextEvent: { id: 'e1', title: '図書館へ', path: '/event/e1', date: '2026-10-02', timeStart: '16:30', allDay: false } }, todo: { rows: [] } });
		loaders.flower.mockResolvedValue({ rows: [], flower: { emoji: '🌼', name: '花', progress: 72, drops: 2, canWater: true, pourMinutes: 120 } });
		const view = mount([{ id: 'schedule', hidden: false }, { id: 'flower', hidden: false }]);
		await settle();
		expect(view.target.textContent).toContain('1回で花しずく1個を使い、2時間育ちます');
		expect(view.target.textContent?.match(/図書館へ/g)).toHaveLength(1);
		expect(view.target.textContent).not.toContain('今後30日の予定はありません');
		(view.target.querySelector('.hgh-card-flower .hgh-tile-body') as HTMLButtonElement).click();
		expect(view.navigated).toEqual(['/hatask?tab=garden']);
	});

	test('shows the date of a future timed event', async () => {
		loaders.planner.mockResolvedValue({ schedule: { rows: [], nextEvent: { id: 'e2', title: '通院', path: '/event/e2', date: '2099-11-03', timeStart: '09:00', allDay: false } }, todo: { rows: [] } });
		const view = mount([{ id: 'schedule', hidden: false }]);
		await settle();
		expect(view.target.querySelector('.hgh-kicker')?.textContent).toContain('2099-11-03 · 09:00');
	});

	test('keeps tile status in accessible button text and direct record actions visible', async () => {
		loaders.flower.mockResolvedValue({ rows: [], flower: { emoji: '🌼', name: 'ヒナギク', progress: 72, drops: 2, canWater: true } });
		loaders.journal.mockResolvedValue({ today: '2026-10-03', mood: { id: 'm1', date: '2026-10-03', time: '07:40', level: 4, emoji: '😊', note: 'いい感じ' }, week: [], meals: [{ slot: 'breakfast', entry: { id: 'e1', date: '2026-10-03', time: '08:10', level: 'cooked', note: '朝ごはん' } }], history: { date: '2026-09-26', meals: [] } });
		const view = mount([{ id: 'flower', hidden: false }, { id: 'mood', hidden: false }, { id: 'meal', hidden: false }]);
		await settle();
		expect(view.target.querySelector('.hgh-card-flower .hgh-tile-body')?.textContent).toContain('72%');
		expect(view.target.querySelector('.hgh-card-mood')?.textContent).toContain('いい感じ');
		expect(view.target.querySelector('.hgh-card-meal')?.textContent).toContain('朝ごはん');
		expect(view.target.querySelectorAll('.hgh-mood-choices button')).toHaveLength(5);
		(view.target.querySelector('.hgh-mood-choices button:nth-child(4)') as HTMLButtonElement).click();
		(view.target.querySelector('.hgh-meal-choices button') as HTMLButtonElement).click();
		(view.target.querySelector('.hgh-water-action') as HTMLButtonElement).click();
		expect(view.moods).toEqual([4]);
		expect(view.meals).toEqual(['breakfast']);
		expect(view.waters).toEqual(['2026-10-03']);
	});

	test('flower water waits for the hidden daily summary and stays completed through a stale refresh', async () => {
		let resolveDaily!: (value: unknown) => void;
		loaders.daily.mockReturnValueOnce(new Promise(resolve => { resolveDaily = resolve; }));
		loaders.flower.mockResolvedValue({ rows: [], flower: { emoji: '🌼', name: '花', progress: 72, drops: 2, canWater: true, pourMinutes: 30, harvestedCount: 0 } });
		const view = mount([{ id: 'flower', hidden: false }, { id: 'daily', hidden: true }]);
		await settle();
		expect(view.target.querySelector('.hgh-water-action')).toBeNull();
		resolveDaily({ today: '2026-10-03', timezone: 'Asia/Tokyo', days: [{ date: '2026-10-03', known: true, completed: [], count: 0, complete: false }], streakDays: 0 });
		await settle();
		const button = view.target.querySelector('.hgh-water-action') as HTMLButtonElement;
		expect(button.disabled).toBe(false);
		expect(view.target.textContent).toContain('1回で花しずく1個を使い、0.5時間育ちます');
		button.click();
		view.home.value?.markWatered('2026-10-03');
		await settle();
		expect(view.waters).toEqual(['2026-10-03']);
		expect(button.disabled).toBe(true);
		expect(button.textContent).toContain('きょうは水やり済み');
		button.click();
		view.revision.value++;
		await settle();
		expect(view.waters).toEqual(['2026-10-03']);
		expect((view.target.querySelector('.hgh-water-action') as HTMLButtonElement).disabled).toBe(true);
	});

	test('an already completed daily water ritual disables both Home entry points', async () => {
		loaders.daily.mockResolvedValue({ today: '2026-10-03', timezone: 'Asia/Tokyo', days: [{ date: '2026-10-03', known: true, completed: ['water'], count: 1, complete: false }], streakDays: 0 });
		loaders.flower.mockResolvedValue({ rows: [], flower: { emoji: '🌼', name: '花', progress: 72, drops: 2, canWater: true, harvestedCount: 0 } });
		const view = mount([{ id: 'daily', hidden: false }, { id: 'flower', hidden: false }]);
		await settle();
		const action = view.target.querySelector('.hgh-water-action') as HTMLButtonElement;
		const ritual = [...view.target.querySelectorAll('.hgh-rituals button')].find(button => button.textContent.includes('水やり')) as HTMLButtonElement;
		expect(action.textContent).toContain('きょうは水やり済み');
		expect(action.disabled).toBe(true);
		expect(ritual.disabled).toBe(true);
		action.click(); ritual.click();
		expect(view.waters).toEqual([]);
	});

	test('shows measured daily progress and an unknown day separately, then refreshes on revision', async () => {
		loaders.daily.mockResolvedValueOnce({ today: '2026-10-03', timezone: 'Asia/Tokyo', trackedSince: '2026-10-02', days: [{ date: '2026-10-02', known: false, completed: [], count: 0, complete: false }, { date: '2026-10-03', known: true, completed: ['mood', 'meal'], count: 2, complete: false }], streakDays: 0, awardedToday: 4 })
			.mockResolvedValueOnce({ today: '2026-10-03', timezone: 'Asia/Tokyo', trackedSince: '2026-10-02', days: [{ date: '2026-10-02', known: false, completed: [], count: 0, complete: false }, { date: '2026-10-03', known: true, completed: ['mood', 'meal', 'todo'], count: 3, complete: false }], streakDays: 0, awardedToday: 6 });
		const view = mount([{ id: 'daily', hidden: false }]);
		await settle();
		expect(view.target.querySelector('.hgh-daily-ring')?.textContent).toContain('2/5');
		expect(view.target.querySelector('.hgh-heat-days .is-unknown')).not.toBeNull();
		view.revision.value += 1;
		await settle();
		expect(view.target.querySelector('.hgh-daily-ring')?.textContent).toContain('3/5');
	});

	test('loads journal once for mood, meal and history and shows the previous week record', async () => {
		loaders.journal.mockResolvedValue({ today: '2026-10-03', week: [], meals: [], history: { date: '2026-09-26', mood: { id: 'm', date: '2026-09-26', time: '08:00', level: 4, note: 'ゆっくり料理できた' }, meals: [{ id: 'e', date: '2026-09-26', time: '12:00', level: 'cooked', note: 'カレーを作った' }] } });
		const view = mount([{ id: 'mood', hidden: false }, { id: 'meal', hidden: false }, { id: 'history', hidden: false }]);
		await settle();
		expect(loaders.journal).toHaveBeenCalledTimes(1);
		expect(view.target.querySelector('.hgh-card-history')?.textContent).toContain('カレーを作った');
		expect(view.target.querySelector('.hgh-card-history')?.textContent).toContain('ゆっくり料理できた');
	});

	test('renders the reading book through its stored cover color and author', async () => {
		loaders.reading.mockResolvedValue({ rows: [{ id: 'book-1', title: '夜を編む庭', author: '著者', coverColorIndex: 3, currentPage: 184, totalPages: 312, path: '/hatady?tab=collection&hgKind=book&hgId=book-1' }] });
		const view = mount([{ id: 'reading', hidden: false }]);
		await settle();
		const cover = view.target.querySelector('[data-book-cover]');
		expect(cover?.getAttribute('data-book-cover')).toBe('夜を編む庭');
		expect(cover?.getAttribute('data-author')).toBe('著者');
		expect(cover?.getAttribute('data-color-index')).toBe('3');
		expect(cover?.getAttribute('data-width')).toBe('58');
	});
});
