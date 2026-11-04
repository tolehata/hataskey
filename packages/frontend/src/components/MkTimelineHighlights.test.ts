/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick, reactive, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { entities } from 'cherrypick-js';
import MkTimelineHighlights from './MkTimelineHighlights.vue';

const { api, eventHandlers, dayMotion } = vi.hoisted(() => ({
	api: vi.fn(), eventHandlers: new Map<string, (arg: unknown) => void>(),
	dayMotion: { leave: vi.fn(), enter: vi.fn(), cancel: vi.fn(), finish: vi.fn() },
}));
vi.mock('@/utility/timeline-highlight-day-motion.js', () => ({ createTimelineHighlightDayMotion: () => dayMotion }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: api }));
vi.mock('@/utility/muted-users.js', () => ({ isMutedUser: () => false }));
vi.mock('@/events.js', () => ({ useGlobalEvent: (name: string, callback: (arg: unknown) => void) => eventHandlers.set(name, callback) }));
vi.mock('@/i.js', () => ({ $i: { id: 'viewer', hardMutedWords: [['hidden']] } }));
vi.mock('@/preferences.js', () => ({ prefer: { r: {
	animation: { value: true }, 'simpleUi.hideBotsInTimeline': { value: true }, 'simpleUi.botAllowlist': { value: [] },
} } }));
vi.mock('@/i18n.js', () => ({ i18n: {
	ts: { loading: 'loading', close: 'close', noNotes: 'empty', retry: 'retry', goBack: 'back', loadMore: 'more', _hata: { _highlights: {
		title: 'Highlights', date: 'date', previousDay: 'previous', nextDay: 'next', zoomOut: 'zoom out', zoomIn: 'zoom in', overview: 'overview',
		glass: 'glass', partial: 'partial range', unloaded: 'unloaded', retry: 'reload', toTimeline: 'jump', loadMore: 'load more', loadFailed: 'failed', cursorStalled: 'stalled', note: 'note',
	} } },
	tsx: { _hata: { _highlights: { count: ({ count }: { count: number }) => `${count} notes`, partialCount: ({ count }: { count: number }) => `${count} loaded`, density: ({ time, count }: { time: string; count: number }) => `${time}: ${count}` } } },
} }));
vi.mock('@/components/MkNote.vue', () => ({ default: defineComponent({ props: ['note', 'withHardMute'], setup: props => () => h('div', { 'data-real-note': props.note.id, 'data-hard-mute': props.withHardMute }, props.note.text) }) }));
vi.mock('@/components/MkTimelineHighlightSpine.vue', () => ({ default: defineComponent({ props: ['points', 'height', 'motion'], setup: props => () => h('svg', { 'data-spine-motion': props.motion }) }) }));

const cleanup: Array<() => void> = [];
beforeEach(() => {
	dayMotion.leave.mockResolvedValue(undefined);
	dayMotion.enter.mockResolvedValue(undefined);
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
	vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(() => {
	cleanup.splice(0).forEach(run => run());
	eventHandlers.clear();
	vi.resetAllMocks();
	vi.unstubAllGlobals();
});

function note(id: string, hour: number, text = 'visible', daysAgo = 0): entities.Note {
	const createdAt = new Date();
	createdAt.setDate(createdAt.getDate() - daysAgo);
	createdAt.setHours(hour, 30, 0, 0);
	return { id, createdAt: createdAt.toISOString(), userId: 'author', user: { id: 'author', username: 'author' }, text, fileIds: [], files: [] } as unknown as entities.Note;
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
	return { promise, resolve, reject };
}

async function settle() {
	for (let index = 0; index < 12; index++) await nextTick();
}

async function mountHighlights(active = true, variant: 'default' | 'uis' = 'default', scrollInset: number | (() => number) = 0) {
	const container = window.document.createElement('div');
	window.document.body.append(container);
	const navigate = vi.fn();
	const invalidate = vi.fn();
	const props = reactive({ src: 'home' as 'home' | 'local', withRenotes: true, withSensitive: true, onlyFiles: false, glassBg: true, active, variant, scrollInset, scrollInsetTarget: null as HTMLElement | null });
	const NativeNote = defineComponent({
		props: ['note'],
		setup: slotProps => {
			const capturedNote = slotProps.note;
			const actionCount = ref(0);
			return () => h('button', { 'data-uis-note': capturedNote.id, 'data-uis-text': capturedNote.text, onClick: () => actionCount.value++ }, String(actionCount.value));
		},
	});
	const app = createApp({ render: () => h(MkTimelineHighlights, { ...props, onNavigate: navigate, onInvalidate: invalidate }, variant === 'uis' ? {
		note: ({ note: selected }: { note: entities.Note }) => h(NativeNote, { note: selected }),
	} : undefined) });
	app.component('MkLoading', defineComponent(() => () => h('span', { 'data-loading': '' })));
	app.mount(container);
	cleanup.push(() => { app.unmount(); container.remove(); });
	await settle();
	return { container, props, navigate, invalidate };
}

function click(container: HTMLElement, label: string) {
	const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
	expect(button).not.toBeNull();
	button!.click();
}

function scrollViewport(container: HTMLElement) {
	container.style.overflowY = 'auto';
	container.scrollTop = 280;
	Object.defineProperty(container, 'clientTop', { value: 2 });
	const root = container.querySelector<HTMLElement>('section[aria-label="Highlights"]')!;
	container.getBoundingClientRect = () => ({ top: 100 } as DOMRect);
	root.getBoundingClientRect = () => ({ top: 502 - container.scrollTop } as DOMRect);
	const scroll = vi.spyOn(container, 'scrollTo').mockImplementation((options: number | ScrollToOptions, y?: number) => {
		container.scrollTop = typeof options === 'number' ? y ?? 0 : options.top ?? 0;
	});
	return { root, scroll };
}

describe('native timeline highlights', () => {
	test.each([{ variant: 'default', inset: 80 }, { variant: 'uis', inset: 0 }] as const)('centers one loading indicator in the visible $variant viewport and follows scroll and resize', async ({ variant, inset: initialInset }) => {
		const observed = new Map<Element, () => void>();
		vi.stubGlobal('ResizeObserver', class {
			constructor(private readonly callback: () => void) {}
			observe(target: Element) { observed.set(target, this.callback); }
			disconnect() { for (const [target, callback] of observed) if (callback === this.callback) observed.delete(target); }
		});
		let inset: number = initialInset;
		const pending = deferred<entities.Note[]>();
		api.mockReturnValueOnce(pending.promise);
		const { container, props } = await mountHighlights(false, variant, () => inset);
		const navbar = window.document.createElement('nav');
		props.scrollInsetTarget = navbar;
		const { root } = scrollViewport(container);
		let height = 600;
		let rootTop = 280;
		Object.defineProperty(container, 'clientHeight', { get: () => height });
		const stage = container.querySelector('[data-highlight-day]')!.parentElement!;
		root.getBoundingClientRect = () => ({ top: rootTop, height: 2000 } as DOMRect);
		props.active = true; await settle();
		const indicator = container.querySelector<HTMLElement>('[data-highlight-loading]')!;
		expect(indicator).not.toBeNull();
		expect(indicator.parentElement).toBe(root);
		expect(indicator.getAttribute('aria-label')).toBe('loading');
		expect(container.querySelectorAll('[data-loading]')).toHaveLength(1);
		expect(rootTop + parseFloat(indicator.style.top)).toBe(102 + (600 + inset) / 2);
		rootTop -= 180;
		container.dispatchEvent(new Event('scroll')); await settle();
		expect(rootTop + parseFloat(indicator.style.top)).toBe(102 + (600 + inset) / 2);
		height = 400;
		window.dispatchEvent(new Event('resize')); await settle();
		expect(rootTop + parseFloat(indicator.style.top)).toBe(102 + (400 + inset) / 2);
		inset += 40;
		expect(observed.has(navbar)).toBe(true);
		observed.get(navbar)!(); await settle();
		expect(rootTop + parseFloat(indicator.style.top)).toBe(102 + (400 + inset) / 2);
		pending.resolve([]); await settle();
		expect(container.querySelector('[data-highlight-loading]')).toBeNull();
		expect(stage.getAttribute('aria-busy')).toBe('false');
		expect(observed.has(navbar)).toBe(false);
	});

	test('keeps the hidden resume layout and detail state until fresh native note instances are ready', async () => {
		const originalNotes = Array.from({ length: 25 }, (_, index) => note(`resume-${String(index).padStart(2, '0')}`, 18));
		api.mockResolvedValueOnce(originalNotes).mockResolvedValue([]);
		const { container, props } = await mountHighlights(true, 'uis');
		click(container, 'zoom out'); await settle();
		click(container, 'zoom out'); await settle();
		container.querySelectorAll<HTMLButtonElement>('nav button')[4].click(); await settle();
		[...container.querySelectorAll('button')].find(button => button.textContent === 'more')!.click(); await settle();
		expect(container.querySelectorAll('[data-uis-note]')).toHaveLength(25);
		click(container, 'zoom in'); await settle();
		const scene = container.querySelector<HTMLElement>('[data-highlight-day]')!;
		const original = scene.querySelector<HTMLButtonElement>('[data-uis-note="resume-24"]')!;
		original.click(); await settle();
		expect(original.textContent).toBe('1');
		const pending = deferred<entities.Note[]>();
		api.mockReturnValueOnce(pending.promise);
		props.active = false; await settle();
		props.active = true; await settle();
		expect(container.querySelector('[data-highlight-day]')).toBe(scene);
		expect(scene.querySelector('[data-uis-note="resume-24"]')).toBe(original);
		expect(scene.querySelectorAll('[data-uis-note]')).toHaveLength(25);
		expect(scene.style.visibility).toBe('hidden');
		expect(scene.style.display).not.toBe('none');
		expect(scene.hasAttribute('inert')).toBe(true);
		expect(scene.getAttribute('aria-hidden')).toBe('true');
		expect(scene.parentElement?.getAttribute('aria-busy')).toBe('true');
		expect(scene.parentElement?.parentElement?.querySelector(':scope > [data-highlight-loading] [data-loading]')).not.toBeNull();
		expect(container.querySelector('[data-zoom="2"][data-detail="true"]')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('[aria-label="zoom out"]')!.disabled).toBe(true);
		expect(dayMotion.leave).not.toHaveBeenCalled();
		pending.resolve(originalNotes.map(item => ({ ...item, text: 'fresh from API' }))); await settle();
		const refreshed = container.querySelector<HTMLElement>('[data-highlight-day]')!;
		const freshNote = refreshed.querySelector<HTMLElement>('[data-uis-note="resume-24"]')!;
		expect(refreshed).not.toBe(scene);
		expect(freshNote).not.toBe(original);
		expect(freshNote.getAttribute('data-uis-text')).toBe('fresh from API');
		expect(freshNote.textContent).toBe('0');
		expect(refreshed.querySelectorAll('[data-uis-note]')).toHaveLength(25);
		expect(refreshed.style.visibility).toBe('');
		expect(refreshed.hasAttribute('inert')).toBe(false);
		expect(container.querySelector('[data-zoom="2"][data-detail="true"]')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('[aria-label="zoom in"]')!.disabled).toBe(true);
		click(container, 'zoom out'); await settle();
		click(container, 'zoom out'); await settle();
		expect(container.querySelector('[data-zoom="2"][data-detail="false"]')).not.toBeNull();
	});

	test('refreshes the previously loaded page range after resuming an older time band', async () => {
		const hours = [23, 20, 16, 12, 8, 4, 0];
		const makePages = (text: string) => hours.map(hour => [note(`page-${String(hour).padStart(2, '0')}`, hour, text)]);
		let pages = makePages('original');
		api.mockImplementation(async () => pages.shift() ?? []);
		const { container, props } = await mountHighlights();
		expect(api).toHaveBeenCalledTimes(5);
		[...container.querySelectorAll('button')].find(button => button.textContent?.trim() === 'load more')!.click();
		await settle();
		expect(api).toHaveBeenCalledTimes(8);
		container.querySelectorAll<HTMLButtonElement>('nav button')[0].click(); await settle();
		click(container, 'zoom in'); await settle();
		expect(container.querySelector('[data-real-note="page-00"]')).not.toBeNull();
		props.active = false; await settle();
		pages = makePages('fresh');
		props.active = true; await settle(); await settle();
		expect(api).toHaveBeenCalledTimes(16);
		expect(container.querySelector('[data-real-note="page-00"]')?.textContent).toBe('fresh');
		expect(container.querySelector('[data-detail="true"]')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('[aria-label="zoom in"]')!.disabled).toBe(true);
	});

	test('drops a missing focused note after resume while keeping its time band', async () => {
		api.mockResolvedValueOnce([note('two', 18), note('one', 17)]).mockResolvedValue([]);
		const { container, props } = await mountHighlights();
		container.querySelectorAll<HTMLButtonElement>('nav button')[4].click(); await settle();
		click(container, 'zoom in'); await settle();
		props.active = false; await settle();
		api.mockResolvedValueOnce([note('one', 17)]);
		props.active = true; await settle();
		expect(container.querySelector('[data-detail="true"]')).not.toBeNull();
		expect(container.querySelector('[data-real-note="two"]')).toBeNull();
		expect(container.querySelector<HTMLElement>('[data-note-removal-id="one"]')!.style.display).not.toBe('none');
		expect(container.querySelector<HTMLButtonElement>('[aria-label="zoom in"]')!.disabled).toBe(false);
	});

	test('rejects a resume response after hiding again and accepts only the subsequent refresh', async () => {
		api.mockResolvedValueOnce([note('one', 18)]).mockResolvedValue([]);
		const { container, props } = await mountHighlights();
		const original = container.querySelector('[data-real-note="one"]');
		const stale = deferred<entities.Note[]>();
		const fresh = deferred<entities.Note[]>();
		api.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
		props.active = false; await settle();
		props.active = true; await settle();
		const signal = api.mock.calls.at(-1)![3] as AbortSignal;
		props.active = false; await settle();
		expect(signal.aborted).toBe(true);
		stale.resolve([note('stale', 18)]); await settle();
		expect(container.querySelector('[data-real-note="stale"]')).toBeNull();
		expect(container.querySelector('[data-real-note="one"]')).toBe(original);
		props.active = true; await settle();
		fresh.resolve([note('fresh', 18)]); await settle();
		expect(container.querySelector('[data-real-note="fresh"]')).not.toBeNull();
		expect(container.querySelector('[data-real-note="one"]')).toBeNull();
		expect(container.querySelector('[data-highlight-day]')!.hasAttribute('inert')).toBe(false);
	});

	test('releases a failed resume into a retryable error without revealing cached notes', async () => {
		api.mockResolvedValueOnce([note('one', 18)]).mockResolvedValue([]);
		const { container, props } = await mountHighlights();
		const request = deferred<entities.Note[]>();
		api.mockReturnValueOnce(request.promise);
		props.active = false; await settle();
		props.active = true; await settle();
		request.reject(new Error('offline')); await settle();
		expect(container.querySelector('[data-real-note="one"]')).toBeNull();
		expect(container.querySelector('[role="alert"]')!.textContent).toContain('failed');
		const scene = container.querySelector<HTMLElement>('[data-highlight-day]')!;
		expect(scene.style.visibility).toBe('');
		expect(scene.hasAttribute('inert')).toBe(false);
	});

	test.each([
		['default', 72], ['uis', 0],
	] as const)('places the zoom toolbar below the actual navigation inset in %s', async (variant, inset) => {
		api.mockResolvedValueOnce([note('one', 18)]).mockResolvedValue([]);
		const { container } = await mountHighlights(true, variant, inset);
		const { root, scroll } = scrollViewport(container);
		const date = container.querySelector<HTMLInputElement>('input[type="date"]')!;
		date.focus();
		click(container, 'zoom in'); await settle();
		expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 400 - inset, behavior: 'smooth' });
		expect(root.getBoundingClientRect().top).toBe(102 + inset);
		expect(window.document.activeElement).toBe(date);
	});

	test('reads a changed floating navigation height at scroll time and restores the original overview position', async () => {
		api.mockResolvedValueOnce([note('one', 18)]).mockResolvedValue([]);
		let inset = 40;
		const readInset = vi.fn(() => inset);
		const { container } = await mountHighlights(true, 'default', readInset);
		const { scroll } = scrollViewport(container);
		readInset.mockClear();
		click(container, 'zoom in');
		inset = 96;
		await settle();
		expect(scroll).toHaveBeenLastCalledWith({ top: 304, behavior: 'smooth' });
		expect(readInset).toHaveBeenCalledTimes(1);
		inset = 128;
		click(container, 'zoom out'); await settle();
		expect(scroll).toHaveBeenLastCalledWith({ top: 280, behavior: 'smooth' });
	});

	test('lets the last zoom action replace an earlier scroll queued in the same frame', async () => {
		api.mockResolvedValueOnce([note('one', 18)]).mockResolvedValue([]);
		const { container } = await mountHighlights(true, 'default', 72);
		const { scroll } = scrollViewport(container);
		click(container, 'zoom in');
		click(container, 'zoom out');
		await settle();
		expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 280, behavior: 'smooth' });
	});

	test.each(['inactive', 'source'] as const)('discards a queued zoom scroll after becoming %s', async cancellation => {
		api.mockResolvedValueOnce([note('one', 18)]).mockResolvedValue([]);
		const { container, props } = await mountHighlights(true, 'default', 72);
		const { scroll } = scrollViewport(container);
		click(container, 'zoom in');
		if (cancellation === 'inactive') props.active = false;
		else props.src = 'local';
		await settle();
		expect(scroll).not.toHaveBeenCalled();
	});

	test('uses the navigation inset without smooth movement when reduced motion is enabled', async () => {
		vi.mocked(window.matchMedia).mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList);
		api.mockResolvedValueOnce([note('one', 18)]).mockResolvedValue([]);
		const { container } = await mountHighlights(true, 'default', 72);
		const { scroll } = scrollViewport(container);
		click(container, 'zoom in'); await settle();
		expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 328, behavior: 'instant' });
	});

	test('only exposes minus and plus in the zoom toolbar while preserving the detail back action', async () => {
		api.mockResolvedValueOnce([note('one', 18)]).mockResolvedValue([]);
		const { container } = await mountHighlights();
		expect(container.querySelector('button[aria-label="overview"]')).toBeNull();
		expect(container.querySelector('button[aria-label="zoom out"]')).not.toBeNull();
		expect(container.querySelector('button[aria-label="zoom in"]')).not.toBeNull();
		container.querySelectorAll<HTMLButtonElement>('nav button')[4].click(); await settle();
		click(container, 'overview'); await settle();
		expect(container.querySelector('[data-detail="true"]')).toBeNull();
	});

	test('fetches a new day immediately while retaining the inert old scene until its exit finishes', async () => {
		api.mockResolvedValueOnce([note('today', 18)]).mockResolvedValue([]);
		const { container } = await mountHighlights();
		const originalDay = container.querySelector('[data-highlight-day]')!.getAttribute('data-highlight-day');
		const leave = deferred<void>();
		const enter = deferred<void>();
		dayMotion.leave.mockReturnValueOnce(leave.promise);
		dayMotion.enter.mockReturnValueOnce(enter.promise);
		api.mockResolvedValueOnce([note('yesterday', 18, 'previous day', 1)]).mockResolvedValue([]);
		const requestsBefore = api.mock.calls.length;
		click(container, 'previous'); await settle();
		expect(api.mock.calls.length).toBeGreaterThan(requestsBefore);
		expect(dayMotion.leave).toHaveBeenCalledWith(-1);
		expect(container.querySelector('[data-highlight-day]')!.getAttribute('data-highlight-day')).toBe(originalDay);
		expect(container.querySelector('[data-real-note="today"]')).not.toBeNull();
		expect(container.querySelector('[data-real-note="yesterday"]')).toBeNull();
		expect(container.querySelector('[data-highlight-day]')!.hasAttribute('inert')).toBe(true);
		expect(container.querySelector<HTMLButtonElement>('[aria-label="previous"]')!.disabled).toBe(false);
		leave.resolve(); await settle();
		expect(container.querySelector('[data-real-note="yesterday"]')).not.toBeNull();
		expect(container.querySelector('[data-real-note="today"]')).toBeNull();
		expect(dayMotion.enter).toHaveBeenCalledTimes(1);
		expect(container.querySelector('[data-highlight-day]')!.hasAttribute('inert')).toBe(true);
		enter.resolve(); await settle();
		expect(container.querySelector('[data-highlight-day]')!.hasAttribute('inert')).toBe(false);
	});

	test('shows a retryable new-day error without exposing the previous day after a delayed failure', async () => {
		api.mockResolvedValueOnce([note('today', 18)]).mockResolvedValue([]);
		const { container } = await mountHighlights();
		const request = deferred<entities.Note[]>();
		api.mockReturnValueOnce(request.promise);
		click(container, 'previous'); await settle();
		expect(container.querySelector('[data-highlight-day]')!.getAttribute('aria-hidden')).toBe('true');
		request.reject(new Error('offline')); await settle();
		expect(container.querySelector('[role="alert"]')!.textContent).toContain('failed');
		expect(container.querySelector('[data-real-note="today"]')).toBeNull();
		expect(container.querySelector('[data-highlight-day]')!.hasAttribute('inert')).toBe(false);
	});

	test('discards a late response when the date is changed again during a transition', async () => {
		api.mockResolvedValueOnce([note('today', 18)]).mockResolvedValue([]);
		const { container } = await mountHighlights();
		const first = deferred<entities.Note[]>();
		const second = deferred<entities.Note[]>();
		api.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		click(container, 'previous'); await settle();
		const signal = api.mock.calls.at(-1)![3] as AbortSignal;
		click(container, 'previous'); await settle();
		expect(signal.aborted).toBe(true);
		second.resolve([note('two-days-ago', 18, 'latest selection', 2)]); await settle();
		first.resolve([note('yesterday', 18, 'stale selection', 1)]); await settle();
		expect(container.querySelector('[data-real-note="two-days-ago"]')).not.toBeNull();
		expect(container.querySelector('[data-real-note="yesterday"]')).toBeNull();
		expect(container.querySelector('[data-highlight-day]')!.hasAttribute('inert')).toBe(false);
	});

	test('cancels the delayed scene commit when highlights become inactive', async () => {
		api.mockResolvedValueOnce([note('today', 18)]).mockResolvedValue([]);
		const { container, props } = await mountHighlights();
		const leave = deferred<void>();
		dayMotion.leave.mockReturnValueOnce(leave.promise);
		api.mockResolvedValueOnce([note('yesterday', 18, 'previous day', 1)]).mockResolvedValue([]);
		click(container, 'previous'); await settle();
		props.active = false; await settle();
		leave.resolve(); await settle();
		expect(dayMotion.cancel).toHaveBeenCalled();
		expect(dayMotion.enter).not.toHaveBeenCalled();
		expect(container.querySelector('[data-real-note="yesterday"]')).toBeNull();
	});

	test('retains the displayed day when reversing a pending date change back to that same day', async () => {
		api.mockResolvedValueOnce([note('today', 18)]).mockResolvedValue([]);
		const { container } = await mountHighlights();
		const originalNote = container.querySelector('[data-real-note="today"]');
		const yesterday = deferred<entities.Note[]>();
		const today = deferred<entities.Note[]>();
		api.mockReturnValueOnce(yesterday.promise).mockReturnValueOnce(today.promise);
		const cancelsBefore = dayMotion.cancel.mock.calls.length;
		click(container, 'previous'); await settle();
		click(container, 'next'); await settle();
		expect(dayMotion.leave.mock.calls.map(call => call[0])).toEqual([-1, 1]);
		expect(dayMotion.cancel).toHaveBeenCalledTimes(cancelsBefore);
		expect(container.querySelector('[data-real-note="today"]')).not.toBeNull();
		expect(container.querySelector('[data-highlight-day]')!.hasAttribute('inert')).toBe(true);
		today.resolve([note('today', 18, 'refreshed')]); await settle();
		yesterday.resolve([note('yesterday', 18, 'stale', 1)]); await settle();
		expect(container.querySelector('[data-real-note="today"]')).not.toBe(originalNote);
		expect(container.querySelector('[data-real-note="today"]')!.textContent).toBe('refreshed');
		expect(container.querySelector('[data-real-note="yesterday"]')).toBeNull();
	});

	test('releases the outgoing scene when reduced motion is enabled during a slow request', async () => {
		let changeMotion!: () => void;
		const query = { matches: false, addEventListener: (_name: string, callback: () => void) => { changeMotion = callback; }, removeEventListener() {} };
		vi.mocked(window.matchMedia).mockReturnValue(query as unknown as MediaQueryList);
		api.mockResolvedValueOnce([note('today', 18)]).mockResolvedValue([]);
		const { container } = await mountHighlights();
		const leave = deferred<void>();
		const request = deferred<entities.Note[]>();
		dayMotion.leave.mockReturnValueOnce(leave.promise);
		dayMotion.finish.mockImplementationOnce(() => leave.resolve());
		api.mockReturnValueOnce(request.promise);
		click(container, 'previous'); await settle();
		query.matches = true;
		changeMotion(); await settle();
		expect(dayMotion.finish).toHaveBeenCalled();
		expect(container.querySelector('[data-real-note="today"]')).toBeNull();
		request.resolve([note('yesterday', 18, 'previous day', 1)]); await settle();
		expect(container.querySelector('[data-real-note="yesterday"]')).not.toBeNull();
		expect(container.querySelector('[data-highlight-day]')!.hasAttribute('inert')).toBe(false);
	});

	test('changes dates without an exit delay when reduced motion is enabled', async () => {
		vi.mocked(window.matchMedia).mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList);
		api.mockResolvedValueOnce([note('today', 18)]).mockResolvedValue([]);
		const { container } = await mountHighlights();
		api.mockResolvedValueOnce([note('yesterday', 18, 'previous day', 1)]).mockResolvedValue([]);
		click(container, 'previous'); await settle();
		expect(dayMotion.leave).not.toHaveBeenCalled();
		expect(container.querySelector('[data-real-note="yesterday"]')).not.toBeNull();
		expect(container.querySelector('[data-highlight-day]')!.hasAttribute('inert')).toBe(false);
	});

	test('uses native notes with hard mute and emits the original timeline note for navigation', async () => {
		const renote = { ...note('renote', 18), text: null, renoteId: 'original', renote: note('original', 2) };
		api.mockResolvedValueOnce([renote, note('hidden', 10, 'hidden')]).mockResolvedValue([]);
		const { container, navigate } = await mountHighlights();
		expect(container.querySelectorAll('[data-real-note]')).toHaveLength(1);
		expect(container.querySelector('[data-real-note="renote"]')?.getAttribute('data-hard-mute')).toBe('true');
		const jump = [...container.querySelectorAll('button')].find(button => button.textContent === 'jump')!;
		jump.click();
		expect(navigate).toHaveBeenCalledWith(renote);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('1 notes');
	});

	test('retains two overview zoom levels when entering and leaving a time band', async () => {
		api.mockResolvedValueOnce([note('one', 18)]).mockResolvedValue([]);
		const { container } = await mountHighlights();
		click(container, 'zoom out'); await settle();
		click(container, 'zoom out'); await settle();
		expect(container.querySelector('[data-zoom="2"]')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('[aria-label="zoom out"]')?.disabled).toBe(true);
		container.querySelector<HTMLButtonElement>('nav button')!.click(); await settle();
		expect(container.querySelector('[data-detail="true"]')).not.toBeNull();
		click(container, 'zoom out'); await settle();
		expect(container.querySelector('[data-zoom="2"]')).not.toBeNull();
		click(container, 'zoom in'); await settle();
		expect(container.querySelector('[data-zoom="1"]')).not.toBeNull();
	});

	test('preserves the same native note instance while moving through overview, band and single-note views', async () => {
		api.mockResolvedValueOnce([note('one', 18), note('two', 17)]).mockResolvedValue([]);
		const { container } = await mountHighlights();
		const original = container.querySelector('[data-real-note="one"]');
		expect(original).not.toBeNull();
		container.querySelectorAll<HTMLButtonElement>('nav button')[4].click(); await settle();
		expect(container.querySelector('[data-real-note="one"]')).toBe(original);
		expect(container.querySelector('[data-real-note="two"]')).not.toBeNull();
		click(container, 'zoom in'); await settle();
		expect(container.querySelector('[data-real-note="one"]')).toBe(original);
		click(container, 'zoom out'); await settle();
		click(container, 'zoom out'); await settle();
		expect(container.querySelector('[data-real-note="one"]')).toBe(original);
	});

	test('labels a capped fetch as partial and finishes only after continuing', async () => {
		for (let index = 0; index < 5; index++) api.mockResolvedValueOnce([note(`note-${index}`, 23 - index)]);
		api.mockResolvedValue([]);
		const { container } = await mountHighlights();
		expect(api).toHaveBeenCalledTimes(5);
		expect(container.textContent).toContain('partial range');
		expect(container.textContent).toContain('unloaded');
		[...container.querySelectorAll('button')].find(button => button.textContent === 'load more')!.click();
		await settle();
		expect(container.querySelector('[role="status"]')?.textContent).toContain('5 notes');
		expect(container.textContent).not.toContain('partial range');
	});

	test('aborts old source requests and never renders their late response', async () => {
		let resolveFirst!: (value: entities.Note[]) => void;
		api.mockImplementationOnce(() => new Promise<entities.Note[]>(resolve => { resolveFirst = resolve; }));
		api.mockResolvedValueOnce([note('new-source', 12)]).mockResolvedValue([]);
		const { container, props } = await mountHighlights();
		const signal = api.mock.calls[0][3] as AbortSignal;
		props.src = 'local'; await settle();
		expect(signal.aborted).toBe(true);
		resolveFirst([note('old-source', 15)]); await settle();
		expect(container.querySelector('[data-real-note="new-source"]')).not.toBeNull();
		expect(container.querySelector('[data-real-note="old-source"]')).toBeNull();
	});

	test('keeps inactive views idle, and respects reduced motion', async () => {
		vi.mocked(window.matchMedia).mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList);
		api.mockResolvedValueOnce([note('one', 12)]).mockResolvedValue([]);
		const { container, props } = await mountHighlights(false);
		expect(api).not.toHaveBeenCalled();
		props.active = true; await settle();
		expect(api).toHaveBeenCalled();
		expect(container.querySelector('[data-motion="false"]')).not.toBeNull();
		expect(container.querySelector('[data-spine-motion="false"]')).not.toBeNull();
	});

	test('invalidates pending navigation when the day, source or fetched snapshot changes', async () => {
		api.mockResolvedValue([]);
		const { container, props, invalidate } = await mountHighlights();
		invalidate.mockClear();
		click(container, 'previous'); await settle();
		expect(invalidate).toHaveBeenCalledTimes(1);
		props.src = 'local'; await settle();
		expect(invalidate).toHaveBeenCalledTimes(2);
		click(container, 'reload'); await settle();
		expect(invalidate).toHaveBeenCalledTimes(3);
	});

	test('removes deleted notes from density and previews', async () => {
		api.mockResolvedValueOnce([note('one', 12)]).mockResolvedValue([]);
		const { container } = await mountHighlights();
		eventHandlers.get('noteDeleted')?.('one'); await settle();
		expect(container.querySelectorAll('[data-real-note]')).toHaveLength(0);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('0 notes');
	});

	test('keeps a quote or reply when only its referenced note was deleted', async () => {
		const original = note('original', 8);
		api.mockResolvedValueOnce([
			{ ...note('pure-renote', 12), text: null, renoteId: original.id, renote: original },
			{ ...note('quote', 13), renoteId: original.id, renote: original },
			{ ...note('reply', 14), replyId: original.id, reply: original },
		]).mockResolvedValue([]);
		const { container } = await mountHighlights();
		container.querySelectorAll<HTMLButtonElement>('nav button')[3].click(); await settle();
		expect(container.querySelector('[data-real-note="pure-renote"]')).not.toBeNull();
		eventHandlers.get('noteDeleted')?.(original.id); await settle();
		expect(container.querySelector('[data-real-note="pure-renote"]')).toBeNull();
		expect(container.querySelector('[data-real-note="quote"]')).not.toBeNull();
		expect(container.querySelector('[data-real-note="reply"]')).not.toBeNull();
	});

	test('keeps a UI S native note and its action state across zoom without inheriting normal bubble styling', async () => {
		api.mockResolvedValueOnce([note('one', 18), note('two', 17)]).mockResolvedValue([]);
		const { container } = await mountHighlights(true, 'uis');
		const original = container.querySelector<HTMLButtonElement>('[data-uis-note="one"]')!;
		original.click(); await settle();
		expect(original.textContent).toBe('1');
		expect(original.closest('[data-bubble]')).toBeNull();
		expect(container.querySelector('[data-real-note]')).toBeNull();
		container.querySelectorAll<HTMLButtonElement>('nav button')[4].click(); await settle();
		click(container, 'zoom in'); await settle();
		click(container, 'zoom out'); await settle();
		click(container, 'zoom out'); await settle();
		expect(container.querySelector('[data-uis-note="one"]')).toBe(original);
		expect(original.textContent).toBe('1');
	});
});
