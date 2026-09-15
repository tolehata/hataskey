/*
 * SPDX-FileCopyrightText: tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import HataIntro from './HataIntro.vue';
import { features, guideDetails } from './content.js';
import type { App } from 'vue';

// Deliberately independent of the content registry: removing a chapter must fail.
const featureIds = [
	'timeline', 'lists', 'channels', 'antenna', 'quiet', 'deck',
	'noteActions', 'reaction', 'favorite',
	'composer', 'visibility', 'attach', 'airreply',
	'hatady', 'draw', 'card', 'analyze', 'studio', 'feed',
	'todo', 'calendar', 'mood', 'theme', 'layout',
] as const;

const mounted: { app: App<Element>; container: HTMLDivElement }[] = [];
const runtimeErrors: unknown[] = [];
let scrollDescriptor: PropertyDescriptor | undefined;
let scrollIntoView: ReturnType<typeof vi.fn>;

beforeEach(() => {
	runtimeErrors.splice(0);
	scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
	scrollIntoView = vi.fn();
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value: scrollIntoView });
	vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
		media: query, matches: true, onchange: null,
		addListener: vi.fn(), removeListener: vi.fn(),
		addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(() => true),
	}));
	vi.stubGlobal('IntersectionObserver', class {
		observe = vi.fn();
		unobserve = vi.fn();
		disconnect = vi.fn();
	});
});

afterEach(() => {
	for (const item of mounted.splice(0)) {
		item.app.unmount();
		item.container.remove();
	}
	if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor);
	else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	expect(runtimeErrors).toEqual([]);
});

function mountGuides(count = 1, darkMode = false, initialPage: 'home' | 'index' = 'home') {
	const props = reactive({ darkMode, animation: false, initialPage });
	const navigate = vi.fn();
	const app = createApp(defineComponent({
		setup: () => () => h('div', Array.from({ length: count }, (_, index) => h(HataIntro, { ...props, key: index }))),
	}));
	app.config.errorHandler = error => { runtimeErrors.push(error); };
	app.component('MkA', defineComponent({
		props: { to: { type: String, required: true } },
		setup: (link, { slots }) => () => h('a', {
			href: link.to,
			'data-native-route': link.to,
			onClick: (event: MouseEvent) => { event.preventDefault(); navigate(link.to); },
		}, slots.default?.()),
	}));
	const container = window.document.createElement('div');
	window.document.body.append(container);
	mounted.push({ app, container });
	app.mount(container);
	const roots = [...container.querySelectorAll<HTMLElement>('.hata-intro')];
	expect(roots).toHaveLength(count);
	return { app, container, roots, root: roots[0], props, navigate };
}

function element<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T {
	const found = root.querySelector<T>(selector);
	if (!found) throw new Error(`Missing guide element: ${selector}`);
	return found;
}

async function settle(): Promise<void> {
	await nextTick();
	await Promise.resolve();
	await nextTick();
}

async function click(root: ParentNode, selector: string, keyboard = false): Promise<void> {
	const button = element(root, selector);
	if (keyboard) button.focus();
	button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: keyboard ? 0 : 1 }));
	await settle();
}

async function openFeature(root: HTMLElement, id: string): Promise<void> {
	expect(element(root, '.hg-courses')).toBeTruthy();
	await click(root, `.hg-topic-links [data-id="${id}"]`);
}

function searchBox(root: HTMLElement): HTMLInputElement {
	return element(root, '[data-guide-search-form] input[type="search"]');
}

async function search(root: HTMLElement, value: string, isComposing = false): Promise<void> {
	const input = searchBox(root);
	input.value = value;
	input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText', isComposing }));
	await settle();
}

function results(root: HTMLElement): string[] {
	return [...root.querySelectorAll<HTMLElement>('[data-search-result]')].map(result => result.dataset.searchResult!);
}

function duplicateIds(root: ParentNode): string[] {
	const seen = new Set<string>();
	return [...root.querySelectorAll<HTMLElement>('[id]')].flatMap(item => {
		if (seen.has(item.id)) return [item.id];
		seen.add(item.id);
		return [];
	});
}

describe('HataIntroの目次と承認済みガイドの章', () => {
	test.each(['home', 'index'] as const)('%s: 上部の重複案内と下部ボタンを除き、目次のHataIntroだけブランド書体で表示する', async initialPage => {
		const { root } = mountGuides(1, false, initialPage);
		const removed = '.hg-chrome, .hg-mock-notice, .hg-logo-mark, .hg-breadcrumb, [data-guide-theme], .hg-footer button, .hg-footer nav, .hg-footer a';
		const control = window.document.createElement('div');
		for (const markup of [
			'<header class="hg-chrome"></header>', '<div class="hg-mock-notice"></div>',
			'<span class="hg-logo-mark"></span>', '<span class="hg-breadcrumb"></span>',
			'<select data-guide-theme></select>', '<footer class="hg-footer"><button>目次へ</button></footer>',
			'<footer class="hg-footer"><nav></nav></footer>', '<footer class="hg-footer"><a>用語</a></footer>',
		]) {
			control.innerHTML = markup;
			expect(control.querySelectorAll(removed)).toHaveLength(1);
		}
		expect(root.querySelectorAll(removed)).toHaveLength(0);
		const eyebrow = element(root, '.hg-hero .hg-eyebrow');
		if (initialPage === 'home') {
			function assertBrand(parent: ParentNode) {
				expect(element(parent, 'span.hg-brand').textContent).toBe('HataIntro');
			}

			const missingBrand = eyebrow.cloneNode(true) as HTMLElement;
			element(missingBrand, '.hg-brand').classList.remove('hg-brand');
			expect(() => assertBrand(missingBrand)).toThrow();
			assertBrand(eyebrow);
			expect(eyebrow.textContent.trim()).toBe('HataIntro');
			await openFeature(root, 'timeline');
		} else {
			expect(eyebrow.textContent.trim()).toBe('必要なときに引けるガイド');
			expect(eyebrow.querySelector('.hg-brand')).toBeNull();
			await click(root, '[data-search-result="timeline"]');
		}
		expect(root.querySelectorAll(removed)).toHaveLength(0);
		const footer = element(root, '.hg-footer');
		expect(footer.children).toHaveLength(1);
		expect(footer.textContent.trim()).toBe('図・説明の改訂：2026年9月10日 · HataIntro');
		await click(root, '[data-action="back"]');
		expect(root.querySelectorAll(removed)).toHaveLength(0);
		expect(element(root, '.hg-hero .hg-eyebrow').textContent.trim()).toBe(initialPage === 'home' ? 'HataIntro' : '必要なときに引けるガイド');
	});

	test('既存6カテゴリ・24章を保ち、機能解説の4カテゴリと最初の一歩を表示する', async () => {
		const { root } = mountGuides();
		expect([...root.querySelectorAll('.hg-topic-card h3')].map(item => item.textContent)).toEqual([
			'タイムライン', 'ノートの操作', '投稿フォーム', 'Hataskey App', 'Hatask App', '画面の設定',
			'外部アカウント', 'マスコット', 'ゲーム', 'お知らせ・お試し',
		]);
		expect([...root.querySelectorAll<HTMLElement>('.hg-topic-links [data-action="feature"]')].map(item => item.dataset.id)).toEqual(featureIds);
		expect(element(root, '[data-guide-home-content]').hidden).toBe(false);
		expect(element(root, '[data-guide-search-panel]').hidden).toBe(true);
		await click(root, '.hg-start [data-id="timeline"]');
		expect(element(root, '[data-guide-article]').dataset.guideArticle).toBe('timeline');
		expect(window.document.activeElement).toBe(element(root, '[data-guide-title]'));
		expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'instant' });
	});

	test.each(featureIds)('%sは入口・手順・確認点・困ったときと実際の図モジュールを表示する', async id => {
		const { root } = mountGuides();
		await openFeature(root, id);
		const article = element(root, `[data-guide-article="${id}"]`);
		expect(element(article, 'h1').textContent).toBe(features[id].title);
		expect(element(article, '.hg-entry p').textContent).toBe(features[id].where);
		expect(article.querySelectorAll('.hg-instructions li')).toHaveLength(features[id].steps.length);
		expect(element(article, '.hg-result p').textContent).toBe(guideDetails[id].result);
		expect(article.querySelectorAll('.hg-faq')).toHaveLength(guideDetails[id].help.length);
		expect(element(root, '[aria-current="page"]').textContent).toBe(features[id].name);
		expect(element(root, '[data-read-count]').textContent).toContain('0 / 24 項目');
		for (const anchor of article.querySelectorAll<HTMLAnchorElement>('a[data-native-route]')) {
			expect(anchor.getAttribute('href')).toMatch(/^\/(?!\/)/);
			expect(anchor.getAttribute('href')).not.toContain('localhost');
		}
		if (id === 'draw') {
			expect(article.textContent).toContain('Hatadint');
			expect(article.querySelector('[data-scene]')).toBeNull();
			expect(article.querySelector('[data-action="expand-example"]')).toBeNull();
		} else {
			const scene = element(article, `[data-scene="${id}"]`);
			expect(scene.children.length).toBeGreaterThan(1);
			expect(scene.textContent).not.toContain('画面を読み込めませんでした');
		}
	});

	test('公開index入口の用語集から本文へ進み、戻ると用語集を再表示する', async () => {
		const { root } = mountGuides(1, false, 'index');
		expect(element(root, '[data-glossary-title]').textContent).toBe('よく出てくる言葉');
		expect(root.querySelectorAll('.hg-glossary dt')).toHaveLength(12);
		await click(root, '.hg-glossary dd button', true);
		expect(element(root, '[data-guide-article]').dataset.guideArticle).toBe('composer');
		expect(window.document.activeElement).toBe(element(root, '[data-guide-title]'));
		await click(root, '[data-action="back"]');
		expect(element(root, '[data-glossary-title]').textContent).toBe('よく出てくる言葉');
		expect(root.querySelectorAll('.hg-glossary dt')).toHaveLength(12);
	});
});

describe('HataIntroの検索・IME・戻る', () => {
	test('IME変換中は確定済み検索を保ち、確定後だけ結果を更新する', async () => {
		const { root } = mountGuides();
		await search(root, '映画');
		const originalResults = results(root);
		expect(originalResults).toContain('hatady');
		const input = searchBox(root);
		input.focus();
		input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
		await search(root, 'えも', true);
		element(root, '[data-guide-search-form]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await settle();
		expect(searchBox(root)).toBe(input);
		expect(input.value).toBe('えも');
		expect(window.document.activeElement).toBe(input);
		expect(results(root)).toEqual(originalResults);
		expect(element(root, '[data-guide-search-panel] h2').textContent).toBe('「映画」の検索結果');
		input.value = '絵文字';
		input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '絵文字' }));
		await settle();
		expect(results(root)).toContain('reaction');
		expect(element(root, '[data-guide-search-panel] h2').textContent).toBe('「絵文字」の検索結果');
		expect(window.document.activeElement).toBe(input);
	});

	test('全角・かな・複数語でも探せて、クリアはカテゴリを保つ', async () => {
		const { root } = mountGuides(1, false, 'index');
		await search(root, 'ＨＡＴＡＤＹ');
		expect(results(root)[0]).toBe('hatady');
		await search(root, 'はたでぃ');
		expect(results(root)[0]).toBe('hatady');
		await search(root, '映画 記録');
		expect(results(root)).toContain('hatady');
		await click(root, '[data-action="clear-query"]');
		expect(results(root)).toHaveLength(77);
		await click(root, '[data-action="filter"][data-id="apps"]');
		expect(results(root).filter(id => !id.startsWith('ref-'))).toEqual(['hatady', 'draw', 'card', 'analyze', 'studio', 'feed']);
		expect(results(root)).toHaveLength(18);
		await search(root, 'Hatady');
		await click(root, '[data-action="clear-query"]');
		expect(searchBox(root).value).toBe('');
		expect(window.document.activeElement).toBe(searchBox(root));
		expect(element(root, '[data-action="clear-query"]').hidden).toBe(true);
		expect(element(root, '[data-action="filter"][data-id="apps"]').getAttribute('aria-pressed')).toBe('true');
		expect(results(root)).toHaveLength(18);
		await search(root, '存在しない検索語xyz');
		await click(root, '[data-action="clear-search"]');
		expect(element(root, '[data-action="filter"][data-id="all"]').getAttribute('aria-pressed')).toBe('true');
		expect(results(root)).toHaveLength(77);
	});

	test('検索語は文字列として表示し、タグをDOMへ挿入しない', async () => {
		const { root } = mountGuides();
		const query = '<img data-intro-query-probe> & "公開範囲"';
		const control = window.document.createElement('template');
		control.innerHTML = query;
		expect(control.content.querySelector('[data-intro-query-probe]')).not.toBeNull();
		await search(root, query);
		expect(searchBox(root).value).toBe(query);
		expect(element(root, '[data-guide-search-panel] h2').textContent).toBe(`「${query}」の検索結果`);
		expect(element(root, '.hg-no-results p').textContent).toContain(query);
		expect(root.querySelector('[data-intro-query-probe]')).toBeNull();
		await click(root, '[data-action="clear-query"]');
		expect(element(root, '[data-guide-home-content]').hidden).toBe(false);
		expect(element(root, '[data-guide-search-panel]').hidden).toBe(true);
	});

	test('関連項目から戻ると図の幅を、検索へ戻ると語・カテゴリ・選んだ結果のフォーカスを復元する', async () => {
		const { root } = mountGuides(1, false, 'index');
		await click(root, '[data-action="filter"][data-id="notes"]');
		await search(root, 'リアクション');
		const before = results(root);
		await click(root, '[data-search-result="reaction"]', true);
		await click(root, '[data-action="expand-example"]');
		expect(element(root, '.hg-learn').dataset.expanded).toBe('true');
		await click(root, '.hg-related [data-id="noteActions"]');
		await click(root, '[data-action="back"]');
		expect(element(root, '[data-guide-article]').dataset.guideArticle).toBe('reaction');
		expect(element(root, '.hg-learn').dataset.expanded).toBe('true');
		await click(root, '[data-action="back"]');
		expect(searchBox(root).value).toBe('リアクション');
		expect(element(root, '[data-action="filter"][data-id="notes"]').getAttribute('aria-pressed')).toBe('true');
		expect(results(root)).toEqual(before);
		expect(window.document.activeElement).toBe(element(root, '[data-search-result="reaction"]'));
	});

	test('読んだ印はリアクティブに切り替わり、目次へ戻っても保持する', async () => {
		const { root } = mountGuides();
		await openFeature(root, 'timeline');
		await click(root, '[data-action="mark-read"]');
		expect(element(root, '[data-action="mark-read"]').getAttribute('aria-pressed')).toBe('true');
		expect(element(root, '[data-read-count]').textContent).toContain('1 / 24 項目');
		expect(element(root, '[data-status]').textContent).toContain('を読んだ項目にしたよ');
		await click(root, '[data-action="back"]');
		const topic = element(root, '.hg-topic-links [data-id="timeline"]');
		expect(topic.textContent).toContain('読んだ');
		expect(window.document.activeElement).toBe(topic);
		await click(root, '.hg-topic-links [data-id="timeline"]');
		await click(root, '[data-action="mark-read"]');
		expect(element(root, '[data-action="mark-read"]').getAttribute('aria-pressed')).toBe('false');
		expect(element(root, '[data-read-count]').textContent).toContain('0 / 24 項目');
	});
});

describe('説明図のリンク・フォーカス・本体の入口', () => {
	test.each(['visibility', 'attach', 'airreply'])('投稿フォームの図内リンクから%sへ進み、戻れる', async id => {
		const { root } = mountGuides();
		await openFeature(root, 'composer');
		await click(root, `[data-scene="composer"] [data-action="feature"][data-id="${id}"]`, true);
		expect(element(root, '[data-guide-article]').dataset.guideArticle).toBe(id);
		expect(window.document.activeElement).toBe(element(root, '[data-guide-title]'));
		await click(root, '[data-action="back"]');
		expect(element(root, '[data-guide-article]').dataset.guideArticle).toBe('composer');
	});

	test('デッキ切替とHatadyの絞り込みは、キーボード操作後も同じボタンへフォーカスを戻す', async () => {
		const { root } = mountGuides();
		await openFeature(root, 'deck');
		await click(root, '[data-action="demo-view"][data-view="deck"]', true);
		expect(element(root, '[data-deck]').dataset.deck).toBe('true');
		expect(window.document.activeElement).toBe(element(root, '[data-action="demo-view"][data-view="deck"]'));
		expect(element(root, '[data-status]').textContent).toContain('デッキ表示');
		await click(root, '[data-action="demo-view"][data-view="standard"]', true);
		expect(element(root, '[data-deck]').dataset.deck).toBe('false');
		expect(window.document.activeElement).toBe(element(root, '[data-action="demo-view"][data-view="standard"]'));
		await click(root, '[data-action="back"]');
		await openFeature(root, 'hatady');
		await click(root, '[data-action="demo-log-kind"][data-kind="movie"]', true);
		expect(element(root, '[data-action="demo-log-kind"][data-kind="movie"]').getAttribute('aria-pressed')).toBe('false');
		expect(root.querySelector('.hg-log-entry[data-kind="movie"]')).toBeNull();
		expect(window.document.activeElement).toBe(element(root, '[data-action="demo-log-kind"][data-kind="movie"]'));
		await click(root, '[data-action="demo-log-kind"][data-kind="movie"]', true);
		expect(element(root, '.hg-log-entry[data-kind="movie"]').textContent).toContain('映画');
		expect(window.document.activeElement).toBe(element(root, '[data-action="demo-log-kind"][data-kind="movie"]'));
	});

	test('テーマ図のラジオ変更は選択とフォーカスを保持し、本体テーマを変更しない', async () => {
		const { root, props } = mountGuides();
		await openFeature(root, 'theme');
		const radio = element<HTMLInputElement>(root, '[data-preview-theme][value="mirerado"]');
		radio.focus();
		radio.checked = true;
		radio.dispatchEvent(new Event('change', { bubbles: true }));
		await settle();
		const replacement = element<HTMLInputElement>(root, '[data-preview-theme][value="mirerado"]');
		expect(replacement.checked).toBe(true);
		expect(window.document.activeElement).toBe(replacement);
		expect(element(root, '[data-live-theme]').dataset.sample).toBe('mirerado');
		expect(element(root, '[data-theme-feedback]').textContent).toContain('はたDark');
		expect(element(root, '[data-theme-provisional]').textContent).toContain('配色は仮表示');
		expect(props.darkMode).toBe(false);
		expect(root.dataset.theme).toBe('system');
	});

	test('配色は常に本体に追従し、プロフィールと本体入口は内部ルートを使う', async () => {
		const { root, props, navigate } = mountGuides();
		expect(root.style.colorScheme).toBe('light');
		props.darkMode = true;
		await settle();
		expect(root.style.colorScheme).toBe('dark');
		props.darkMode = false;
		await settle();
		expect(root.style.colorScheme).toBe('light');
		expect(root.dataset.theme).toBe('system');
		await click(root, '.hg-profile-shortcut [data-native-route="/settings/profile"]');
		expect(navigate).toHaveBeenLastCalledWith('/settings/profile');
		await openFeature(root, 'card');
		expect(element<HTMLAnchorElement>(root, '.hg-entry a').getAttribute('href')).toBe('/hatask/card-maker');
		await click(root, '.hg-entry a');
		expect(navigate).toHaveBeenLastCalledWith('/hatask/card-maker');
		expect(element(root, 'article [data-native-route="/settings/profile"]')).toBeTruthy();
		for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[data-native-route]')) {
			expect(anchor.getAttribute('href')).toMatch(/^\/(?!\/)/);
			expect(anchor.getAttribute('href')).not.toContain('localhost');
		}
	});
});

describe('複数のHataIntroを同じアプリで開く場合', () => {
	test('ページ・検索・既読・図の状態をガイドごとに保持する', async () => {
		const { roots: [first, second] } = mountGuides(2);
		await openFeature(first, 'deck');
		await click(first, '[data-action="mark-read"]');
		await click(first, '[data-action="demo-view"][data-view="deck"]', true);
		expect(element(second, '[data-guide-home-content]').hidden).toBe(false);
		expect(second.dataset.theme).toBe('system');
		await openFeature(second, 'deck');
		expect(element(second, '[data-deck]').dataset.deck).toBe('false');
		expect(element(second, '[data-read-count]').textContent).toContain('0 / 24 項目');
		expect(element(first, '[data-deck]').dataset.deck).toBe('true');
		expect(element(first, '[data-read-count]').textContent).toContain('1 / 24 項目');
		await click(first, '[data-action="back"]');
		await search(first, '映画');
		expect(element(second, '[data-guide-article]').dataset.guideArticle).toBe('deck');
		await click(second, '[data-action="back"]');
		expect(searchBox(second).value).toBe('');
		expect(searchBox(first).value).toBe('映画');
	});

	test.each(['theme', 'layout', 'antenna'])('%sの実図を二つ開いてもIDとラベルの参照先を共有しない', async id => {
		const { container, roots } = mountGuides(2);
		for (const root of roots) await openFeature(root, id);
		const original = element(roots[0], '[id]');
		const duplicate = original.cloneNode(false) as HTMLElement;
		container.append(duplicate);
		expect(duplicateIds(container)).toContain(original.id);
		duplicate.remove();
		expect(duplicateIds(container)).toEqual([]);
		for (const root of roots) {
			const localIds = new Set([...root.querySelectorAll<HTMLElement>('[id]')].map(node => node.id));
			for (const label of root.querySelectorAll<HTMLLabelElement>('label[for]')) expect(localIds.has(label.htmlFor)).toBe(true);
			expect(element<HTMLAnchorElement>(root, '.hg-skip').getAttribute('href')).toBe(`#${element(root, 'main').id}`);
		}
		const firstNames = [...roots[0].querySelectorAll<HTMLInputElement>('input[type="radio"][name]')].map(input => input.name);
		const secondNames = new Set([...roots[1].querySelectorAll<HTMLInputElement>('input[type="radio"][name]')].map(input => input.name));
		for (const name of firstNames) expect(secondNames.has(name)).toBe(false);
	});
});
