/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';

const fixture = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: fixture.api }));
vi.mock('@/router.js', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/page.js', () => ({ definePage: vi.fn() }));
vi.mock('@/i.js', () => ({ $i: { id: 'viewer' } }));
vi.mock('@/os.js', () => ({ popup: vi.fn(), popupMenu: vi.fn() }));
vi.mock('@/preferences.js', async () => ({ prefer: { r: { enablePullToRefresh: (await import('vue')).ref(true) } } }));
vi.mock('@/utility/intl-const.js', () => ({ versatileLang: 'ja-JP' }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	pullDownToRefresh: '引っ張って更新', releaseToRefresh: '離して更新', refreshing: '更新中',
	_hata: { _hatady: { _home: { period: '期間', apply: '適用', loading: '読込中' }, _media: { loadMore: 'さらに読む' } } },
} } }));
vi.mock('@/utility/hatady.js', () => ({ hyBookmarkColor: () => '' }));
vi.mock('@/utility/hatady-subjects.js', () => ({ loadHySubjects: vi.fn().mockResolvedValue([]) }));
vi.mock('@/utility/hatady-prefs.js', async () => ({ hatadyTheme: (await import('vue')).ref('light'), hatadyTzOffset: () => 0, loadHatadyDisplay: vi.fn() }));
vi.mock('@/utility/hatady-tutorial-launcher.js', () => ({ showHatadyTutorial: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/utility/hatady-motion.js', () => ({ captureHatadyPageTurn: () => ({ play: vi.fn(), cancel: vi.fn() }) }));
vi.mock('@/utility/hatady-list-motion.js', () => ({ createHatadyListEntrance: () => ({ play: vi.fn(), finish: vi.fn(), cancel: vi.fn() }) }));
vi.mock('@/utility/haptic.js', () => ({ haptic: vi.fn() }));
vi.mock('@/utility/touch.js', async () => ({ isHorizontalSwipeSwiping: (await import('vue')).ref(false) }));
vi.mock('@/utility/hatady-ui.js', async () => ({
	HATADY_ACTIVITY_CHOICES: ['study', 'movie', 'game', 'exercise', 'work'].map(value => ({ value, label: value, icon: 'ti ti-book' })),
	HATADY_RECORD_TAGS: [], hatadyDialogSurfaces: (await import('vue')).ref([]), hatadyDuration: () => '', hatadySeconds: () => null, hatadyNotify: vi.fn(),
}));
vi.mock('@/components/HyNav.vue', () => ({ default: {
	props: ['options', 'modelValue'], emits: ['update:modelValue'],
	template: '<nav><button v-for="option in options" :data-tab="option.value" @click="$emit(\'update:modelValue\', option.value)">{{ option.label }}</button></nav>',
} }));
vi.mock('@/components/HyCapsule.vue', () => ({ default: {
	props: ['options', 'modelValue', 'label'], emits: ['update:modelValue'],
	template: '<div :aria-label="label"><button v-for="option in options" :data-value="option.value" @click="$emit(\'update:modelValue\', option.value)">{{ option.label }}</button></div>',
} }));
vi.mock('@/components/hatady/HyCategorySelect.vue', () => ({ default: {
	props: ['options', 'modelValue', 'label'], emits: ['update:modelValue'],
	template: '<div :aria-label="label"><button v-for="option in options" :data-value="option.value" @click="$emit(\'update:modelValue\', option.value)">{{ option.label }}</button></div>',
} }));
vi.mock('@/components/HyBookCover.vue', () => ({ default: { template: '<span/>' } }));
vi.mock('@/components/HyMediaCover.vue', () => ({ default: { template: '<span/>' } }));
vi.mock('@/components/HatadyHome.vue', () => ({ default: { template: '<section>ホーム</section>' } }));
vi.mock('@/components/HatadyProfile.vue', () => ({ default: { template: '<section/>' } }));
vi.mock('@/components/HatadyModeration.vue', () => ({ default: { template: '<section/>' } }));
vi.mock('@/components/HatadyActivityCard.vue', () => ({ default: { props: ['activity'], emits: ['deleted'], template: '<article>{{ activity.id }}<button data-delete-record @click="$emit(\'deleted\')">削除</button></article>' } }));
import Hatady from './hatady.vue';
import { prefer } from '@/preferences.js';

const cleanups: Array<() => void> = [];
const row = (id: string) => ({ id, type: 'study', occurredAt: '2026-09-18T00:00:00Z', study: { id, title: id, kind: 'study' } });
const page = (id: string, nextCursor: string | null = null) => ({ items: [row(id)], hasMore: !!nextCursor, nextCursor });
const calls = () => fixture.api.mock.calls.filter(([endpoint]) => endpoint === 'hata/hatady/activities');

async function settle() { for (let i = 0; i < 6; i++) { await nextTick(); await Promise.resolve(); } }

function touch(target: EventTarget, type: string, x: number, y: number) {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.defineProperty(event, 'touches', { value: type === 'touchend' || type === 'touchcancel' ? [] : [{ identifier: 1, screenX: x, screenY: y }] });
	target.dispatchEvent(event);
}

async function pull(target: HTMLElement, dx = 0, dy = 200) {
	touch(target, 'touchstart', 20, 20);
	touch(window, 'touchmove', 20 + dx, 20 + dy);
	touch(window, 'touchend', 20 + dx, 20 + dy);
	await settle();
	await vi.advanceTimersByTimeAsync(230);
	await settle();
}

async function mount() {
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const app = createApp(Hatady);
	app.component('MkStickyContainer', { setup: (_, { slots }) => () => h('div', slots.default?.()) });
	app.component('MkLoading', { template: '<span role="status">更新中</span>' });
	// Happy DOM does not lay out imported CSS. Supply only the existing .main overflow rule;
	// the production getScrollContainer still walks the real mounted ancestor chain.
	const originalStyle = window.getComputedStyle.bind(window);
	vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
		if (element.tagName === 'MAIN') (element as HTMLElement).style.overflowY = 'auto';
		return originalStyle(element);
	});
	app.mount(target);
	const unmount = () => { app.unmount(); target.remove(); };
	cleanups.push(unmount);
	await settle();
	return { target, main: target.querySelector('main')!, list: target.querySelector<HTMLElement>('main > div')!, unmount };
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
	window.localStorage.setItem('hatadyActiveTab', 'records');
	window.localStorage.removeItem('hatadyLogKinds');
	window.localStorage.removeItem('hatadyCollectionKind');
	prefer.r.enablePullToRefresh.value = true;
	fixture.api.mockReset().mockImplementation(async endpoint => endpoint === 'hata/hatady/activities' ? page('kept', 'old-cursor') : { count: 0 });
});
afterEach(() => {
	cleanups.splice(0).forEach(cleanup => cleanup());
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	window.localStorage.removeItem('hatadyActiveTab');
	window.localStorage.removeItem('hatadyLogKinds');
	window.localStorage.removeItem('hatadyCollectionKind');
});

test.each(['mine', 'recent', 'following'])('refreshes the selected %s scope with activity and date filters, replacing rather than appending', async scope => {
	const { target, main, list } = await mount();
	expect(main.style.touchAction).toContain('pan-x');
	target.querySelector<HTMLButtonElement>(`[aria-label="記録の範囲"] [data-value="${scope}"]`)!.click();
	await settle();
	target.querySelector<HTMLButtonElement>('[aria-label="活動の種類"] [data-value="game"]')!.click();
	await settle();
	target.querySelector<HTMLButtonElement>('[aria-label="期間"]')!.click();
	await settle();
	for (const [label, value] of [['開始日', '2026-09-01'], ['終了日', '2026-09-18']]) {
		const input = target.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
	}
	target.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	await settle();
	const previous = calls().at(-1)![1], before = calls().length;
	fixture.api.mockResolvedValueOnce(page('fresh'));
	await pull(list);
	expect(calls()).toHaveLength(before + 1);
	expect(calls().at(-1)![1]).toEqual(previous);
	expect(previous).toMatchObject({ scope, kinds: ['game'], sinceDate: expect.any(Number), untilDate: expect.any(Number) });
	expect(previous).not.toHaveProperty('cursor');
	expect(target.textContent).toContain('fresh');
	expect(target.textContent).not.toContain('kept');
});

test('a failed pull retains entries and pagination, and a pending refresh cannot start another fetch', async () => {
	const { target, list } = await mount();
	let reject!: (reason: Error) => void;
	fixture.api.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
	await pull(list);
	expect(calls()).toHaveLength(2);
	await pull(list);
	expect(calls()).toHaveLength(2);
	expect(target.textContent).toContain('kept');
	reject(new Error('offline'));
	await settle();
	await vi.advanceTimersByTimeAsync(230);
	expect(target.textContent).toContain('記録を読み込めませんでした');
	expect(target.textContent).toContain('kept');
	[...target.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'さらに読む')!.click();
	await settle();
	expect(calls().at(-1)![1]).toMatchObject({ cursor: 'old-cursor' });
});

test('does not fetch from a scrolled position, a horizontal gesture, or a cancelled touch', async () => {
	const { main, list } = await mount();
	main.scrollTop = 80;
	await pull(list);
	main.scrollTop = 0;
	await pull(list, 280, 210);
	touch(list, 'touchstart', 20, 20);
	touch(window, 'touchmove', 20, 240);
	touch(window, 'touchcancel', 20, 240);
	touch(window, 'touchend', 20, 240);
	await vi.advanceTimersByTimeAsync(450);
	expect(calls()).toHaveLength(1);
});

test('respects the existing preference and cancels a pull when leaving records', async () => {
	const { target, list } = await mount();
	touch(list, 'touchstart', 20, 20);
	touch(window, 'touchmove', 20, 240);
	target.querySelector<HTMLButtonElement>('[data-tab="home"]')!.click();
	await settle();
	touch(window, 'touchend', 20, 240);
	await vi.advanceTimersByTimeAsync(450);
	expect(calls()).toHaveLength(1);
	prefer.r.enablePullToRefresh.value = false;
	target.querySelector<HTMLButtonElement>('[data-tab="records"]')!.click();
	await settle();
	const before = calls().length;
	await pull(target.querySelector('main > section')!);
	expect(calls()).toHaveLength(before);
});

test('removes a successfully deleted record even when reloading the list fails', async () => {
	const { target } = await mount();
	expect(target.querySelector('article')?.textContent).toContain('kept');
	fixture.api.mockImplementation(async endpoint => {
		if (endpoint === 'hata/hatady/activities') throw new Error('offline');
		return { count: 0 };
	});
	target.querySelector<HTMLButtonElement>('[data-delete-record]')!.click();
	await settle();
	expect(target.querySelector('article')).toBeNull();
	expect(target.textContent).toContain('記録を読み込めませんでした');
});

test('all collections combine kinds and qualify ambiguous statuses without changing a stored category', async () => {
	window.localStorage.setItem('hatadyActiveTab', 'collection');
	window.localStorage.setItem('hatadyCollectionKind', 'movie');
	const works = [
		{ id: 'movie', title: 'Movie title', kind: 'movie', status: 'planned', userId: 'viewer' },
		{ id: 'game', title: 'Game title', kind: 'game', status: 'planned', userId: 'viewer' },
		{ id: 'work', title: 'Work title', kind: 'work', status: 'in_progress', userId: 'viewer' },
	];
	fixture.api.mockImplementation(async (endpoint, params) => {
		if (endpoint === 'hata/hatady/books') return [{ id: 'book', title: 'Book title', status: 'reading', userId: 'viewer' }];
		if (endpoint === 'hata/hatady/media/works/list') return params.kind ? works.filter(work => work.kind === params.kind) : works;
		return { count: 0 };
	});
	const { target } = await mount();
	expect(target.querySelectorAll('h2')).toHaveLength(1);
	expect(target.textContent).toContain('Movie title');
	target.querySelector<HTMLButtonElement>('[aria-label="作品の種類"] [data-value="all"]')!.click();
	await settle();
	expect([...target.querySelectorAll('h2')].map(node => node.textContent?.trim()).sort()).toEqual(['Book title', 'Game title', 'Movie title', 'Work title']);
	expect(window.localStorage.getItem('hatadyCollectionKind')).toBe('all');
	const filter = [...target.querySelectorAll<HTMLButtonElement>('button')].find(button => button.querySelector('.ti-filter'))!;
	filter.click();
	await settle();
	const status = target.querySelector<HTMLSelectElement>('select')!;
	expect([...status.options].map(option => option.value)).toEqual(expect.arrayContaining(['book:reading', 'movie:planned', 'game:planned', 'work:in_progress']));
	status.value = 'game:planned';
	status.dispatchEvent(new Event('change', { bubbles: true }));
	await settle();
	expect([...target.querySelectorAll('h2')].map(node => node.textContent)).toEqual(['Game title']);
	const query = target.querySelector<HTMLInputElement>('input[type="search"]')!;
	query.value = 'unmatched';
	query.dispatchEvent(new Event('input', { bubbles: true }));
	await settle();
	expect(target.querySelector('h2')).toBeNull();
});
