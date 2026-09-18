/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';

const fixtures = vi.hoisted(() => ({ api: vi.fn(), popup: vi.fn() }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: fixtures.api }));
vi.mock('@/os.js', () => ({ popup: fixtures.popup }));
vi.mock('@/components/HatadyBookDetail.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/HatadyMediaWorkDetail.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/HatadyConversation.vue', () => ({ default: { render: () => null } }));
vi.mock('@/utility/intl-const.js', () => ({ versatileLang: 'ja-JP' }));
vi.mock('@/utility/hatady-prefs.js', async () => ({ hatadyTheme: (await import('vue')).ref('light') }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: { _hata: { _hatady: { _search: {
	title: '横断検索', placeholder: '記録を探す', clear: '検索をクリア', scope: '検索対象', scopeAll: 'すべて',
	loading: '検索中', noResults: '該当なし', logs: '記録', books: '本', bookMemos: 'メモ', bookmarks: 'しおり', untitled: '無題',
} } } } } }));
vi.mock('@/components/HyDialog.vue', async () => {
	const { defineComponent, h: render } = await import('vue');
	return { default: defineComponent({
		props: { title: String },
		emits: ['close', 'closed'],
		setup(props, { slots, emit, expose }) {
			expose({ close: () => emit('closed') });
			return () => render('section', { 'aria-label': props.title }, slots.default?.());
		},
	}) };
});
vi.mock('@/components/HyBookCover.vue', () => ({ default: { render: () => null } }));
import HatadySearch from './HatadySearch.vue';

const cleanups: Array<() => void> = [];

function response(title?: string) {
	return {
		logs: title ? [{ id: 'log', title, studiedAt: '2026-09-10T12:00:00Z', body: '本文', subject: null }] : [],
		books: [], bookMemos: [], bookmarks: [], mediaWorks: [], mediaSessions: [],
	};
}

function pendingResponse() {
	let resolve: (value: ReturnType<typeof response>) => void = () => { throw new Error('Promise not initialized'); };
	let reject: (error: Error) => void = () => { throw new Error('Promise not initialized'); };
	const promise = new Promise<ReturnType<typeof response>>((done, fail) => { resolve = done; reject = fail; });
	return { promise, resolve, reject };
}

async function settle() {
	await Promise.resolve();
	await nextTick();
	await nextTick();
}

async function mountSearch() {
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const app = createApp({ render: () => h(HatadySearch) });
	app.mount(target);
	cleanups.push(() => { app.unmount(); target.remove(); });
	await settle();
	const input = target.querySelector('input[type="search"]');
	if (!(input instanceof HTMLInputElement)) throw new Error('Search input not mounted');
	return {
		target,
		input,
		async enter(value: string) {
			input.value = value;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			await nextTick();
		},
	};
}

beforeEach(() => {
	vi.useFakeTimers();
	fixtures.api.mockReset();
	fixtures.popup.mockReset().mockReturnValue({ dispose: vi.fn() });
	vi.stubGlobal('ResizeObserver', class {
		observe() {}
		disconnect() {}
	});
});
afterEach(() => {
	cleanups.splice(0).forEach(cleanup => cleanup());
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('Hatady search debounce and stale responses', () => {
	test('the first input shows loading during the debounce, and only a completed empty search shows no results', async () => {
		const request = pendingResponse();
		fixtures.api.mockReturnValueOnce(request.promise);
		const view = await mountSearch();
		expect(view.target.textContent).not.toContain('該当なし');
		await view.enter('新しい記録');
		expect(view.target.textContent).toContain('検索中');
		expect(view.target.textContent).not.toContain('該当なし');
		await vi.advanceTimersByTimeAsync(299);
		expect(fixtures.api).not.toHaveBeenCalled();
		expect(view.target.textContent).toContain('検索中');
		await vi.advanceTimersByTimeAsync(1);
		expect(fixtures.api).toHaveBeenCalledExactlyOnceWith('hata/hatady/search', { query: '新しい記録', types: null, limit: 20 });
		request.resolve(response());
		await settle();
		expect(view.target.textContent).toContain('該当なし');
		expect(view.target.textContent).not.toContain('検索中');
	});

	test.each(['success', 'failure'] as const)('a stale %s during the next debounce cannot replace its loading state or result', async result => {
		const oldRequest = pendingResponse(), newRequest = pendingResponse();
		fixtures.api.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
		const view = await mountSearch();
		await view.enter('前の検索');
		await vi.advanceTimersByTimeAsync(300);
		await view.enter('次の検索');
		await vi.advanceTimersByTimeAsync(100);
		if (result === 'success') oldRequest.resolve(response('古い応答'));
		else oldRequest.reject(new Error('Old request failed'));
		await settle();
		expect(fixtures.api).toHaveBeenCalledTimes(1);
		expect(view.input.value).toBe('次の検索');
		expect(view.target.textContent).toContain('検索中');
		expect(view.target.textContent).not.toContain('古い応答');
		expect(view.target.querySelector('[role="alert"]')).toBeNull();
		await vi.advanceTimersByTimeAsync(200);
		expect(fixtures.api).toHaveBeenLastCalledWith('hata/hatady/search', { query: '次の検索', types: null, limit: 20 });
		newRequest.resolve(response('新しい応答'));
		await settle();
		expect(view.target.textContent).toContain('新しい応答');
		expect(view.target.textContent).not.toContain('古い応答');
		expect(view.target.textContent).not.toContain('検索中');
	});

	test.each(['shorten', 'clear'] as const)('%s removes waiting immediately and cancels both a queued search and a late response', async action => {
		const request = pendingResponse();
		fixtures.api.mockReturnValueOnce(request.promise);
		const view = await mountSearch();
		const cancel = async () => {
			if (action === 'shorten') await view.enter('一');
			else {
				const button = view.target.querySelector<HTMLButtonElement>('[aria-label="検索をクリア"]');
				if (!button) throw new Error('Clear button not mounted');
				button.click();
				await nextTick();
			}
		};
		await view.enter('検索待ち');
		await cancel();
		expect(view.target.textContent).not.toContain('検索中');
		expect(view.target.textContent).not.toContain('該当なし');
		await vi.advanceTimersByTimeAsync(500);
		expect(fixtures.api).not.toHaveBeenCalled();
		await view.enter('応答待ち');
		await vi.advanceTimersByTimeAsync(300);
		await cancel();
		request.resolve(response('取り消した応答'));
		await settle();
		expect(view.target.textContent).not.toContain('取り消した応答');
		expect(view.target.textContent).not.toContain('検索中');
		expect(view.target.textContent).not.toContain('該当なし');
		expect(fixtures.api).toHaveBeenCalledTimes(1);
	});
});

describe('Hatady search scope selection', () => {
	test('keeps all seven scope choices outside the query capsule and submits only the selected type', async () => {
		fixtures.api.mockResolvedValue(response());
		const view = await mountSearch();
		const group = view.target.querySelector<HTMLElement>('[role="group"][aria-label="検索対象"]');
		expect(group).not.toBeNull();
		// Scope choices must not compete with the input and its actions for one narrow row.
		expect(view.input.parentElement!.contains(group)).toBe(false);
		const choices = [
			{ label: 'すべて', types: null },
			{ label: '記録', types: ['logs'] },
			{ label: '本', types: ['books'] },
			{ label: 'メモ', types: ['bookMemos'] },
			{ label: 'しおり', types: ['bookmarks'] },
			{ label: '作品・作業', types: ['mediaWorks'] },
			{ label: '映画・ゲームの記録', types: ['mediaSessions'] },
		];
		const buttons = Array.from(group!.querySelectorAll<HTMLButtonElement>(':scope > button'));
		expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(choices.map(choice => choice.label));
		await view.enter('検索対象');
		for (const [index, choice] of choices.entries()) {
			buttons[index].click();
			await settle();
			expect(fixtures.api).toHaveBeenCalledTimes(index + 1);
			expect(fixtures.api).toHaveBeenLastCalledWith('hata/hatady/search', { query: '検索対象', types: choice.types, limit: 20 });
			expect(group!.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);
			expect(buttons[index].getAttribute('aria-pressed')).toBe('true');
			// The hidden measurement copy is not a visible label or interactive choice.
			expect(Array.from(group!.querySelectorAll('button > span'), label => label.textContent)).toEqual([choice.label]);
			for (const button of buttons) {
				expect(button.disabled).toBe(false);
				expect(button.querySelector('i[aria-hidden="true"]')).not.toBeNull();
			}
		}
		await vi.advanceTimersByTimeAsync(500);
		expect(fixtures.api).toHaveBeenCalledTimes(choices.length);
	});
});

describe('Hatady search deletion propagation', () => {
	test('removes deleted books and their notes, works, and sessions independently when refresh fails', async () => {
		fixtures.api.mockResolvedValueOnce({
			...response('残す学習記録'),
			books: [{ id: 'book', title: '削除する本' }, { id: 'other-book', title: '残す本' }],
			bookMemos: [{ id: 'memo', bookId: 'book', text: '削除する内容メモ' }],
			bookmarks: [{ id: 'mark', bookId: 'book', name: '削除するしおり' }],
			mediaWorks: [{ id: 'work', title: '削除する作品', kind: 'movie' }],
			mediaSessions: [
				{ id: 'session', workId: 'work', workSnapshot: { title: '残す作品の記録' } },
				{ id: 'other-session', workId: 'other-work', workSnapshot: { title: '別の記録' } },
			],
		}).mockRejectedValue(new Error('Refresh failed'));
		const view = await mountSearch();
		await view.enter('検索');
		await vi.advanceTimersByTimeAsync(300);
		const openResult = async (title: string) => {
			const row = Array.from(view.target.querySelectorAll('button')).find(button => button.textContent.includes(title));
			if (!row) throw new Error(`Missing search result: ${title}`);
			row.click();
			await vi.dynamicImportSettled();
			await settle();
			return fixtures.popup.mock.calls.at(-1)![2];
		};
		expect(view.target.textContent).toContain('削除する内容メモ');
		expect(view.target.textContent).toContain('削除するしおり');
		const book = await openResult('削除する本');
		book.deleted();
		book.changed();
		await settle();
		for (const title of ['削除する本', '削除する内容メモ', '削除するしおり']) {
			expect(view.target.textContent).not.toContain(title);
		}
		expect(view.target.textContent).toContain('検索できませんでした');
		expect(view.target.textContent).toContain('残す本');
		expect(view.target.textContent).toContain('残す学習記録');
		const work = await openResult('削除する作品');
		work.deleted();
		work.changed();
		await settle();
		expect(view.target.textContent).not.toContain('削除する作品');
		expect(view.target.textContent).toContain('残す作品の記録');
		const session = await openResult('残す作品の記録');
		session.deleted({ media: { session: { id: 'session' } } });
		session.changed();
		await settle();
		expect(view.target.textContent).not.toContain('残す作品の記録');
		expect(view.target.textContent).toContain('別の記録');
		expect(view.target.textContent).toContain('残す本');
		expect(view.target.textContent).toContain('残す学習記録');
		expect(fixtures.api).toHaveBeenCalledTimes(4);
		expect(fixtures.api).toHaveBeenLastCalledWith('hata/hatady/search', { query: '検索', types: null, limit: 20 });
	});
});
