/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileScript, compileStyleAsync, compileTemplate, parse } from '@vue/compiler-sfc';
import { createApp, defineComponent, h, nextTick, ref, shallowReactive } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import HataskAkatsukiNotice from './HataskAkatsukiNotice.vue';
import type { App } from 'vue';
import type { Locale } from '../../../../../locales/index.js';

vi.mock('@/os.js', () => ({ claimZIndex: vi.fn(() => 3000) }));
vi.mock('@/preferences.js', () => ({ prefer: { s: { animation: true, menuStyle: 'auto', useBlurEffectForModal: false, removeModalBgColorForBlur: false } } }));
vi.mock('@/i18n.js', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const yaml = await import('js-yaml');
	const { I18n } = await import('@@/js/i18n.js');
	const locale = yaml.load(fs.readFileSync(path.resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8'));
	return { i18n: new I18n<Locale>(locale as Locale) };
});

import { hotkeyDirective } from '@/directives/hotkey.js';
import { i18n } from '@/i18n.js';
import { prefer } from '@/preferences.js';

type NoticeProps = {
	active: boolean;
	ownerActive: boolean;
	animation: boolean;
	mode: 'light' | 'dark';
	onChoose: (apply: boolean) => Promise<boolean>;
};
type NoticeInstance = InstanceType<typeof HataskAkatsukiNotice>;
type Mounted = { app: App<Element>; container: HTMLDivElement; opener: HTMLButtonElement; closeNotice: () => void };
const mounted: Mounted[] = [];
const copy = i18n.ts._hata._hatask._akatsukiNotice;
type MotionListener = EventListenerOrEventListenerObject | NonNullable<MediaQueryList['onchange']>;
const motionQueries: { query: MediaQueryList; listeners: Set<MotionListener> }[] = [];
let reducedMotion = false;

beforeEach(() => {
	vi.useFakeTimers();
	reducedMotion = false;
	motionQueries.splice(0);
	vi.spyOn(window, 'matchMedia').mockImplementation(media => {
		const listeners = new Set<MotionListener>();
		const query: MediaQueryList = {
			media,
			get matches() { return reducedMotion; },
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener(type, listener): void { if (type === 'change') listeners.add(listener); },
			removeEventListener(type, listener): void { if (type === 'change') listeners.delete(listener); },
			dispatchEvent(event): boolean {
				const change = Object.assign(event, { media, matches: reducedMotion });
				for (const listener of listeners) {
					if (typeof listener === 'function') listener.call(query, change);
					else listener.handleEvent(change);
				}
				return !event.defaultPrevented;
			},
		};
		motionQueries.push({ query, listeners });
		return query;
	});
	vi.stubGlobal('ResizeObserver', class {
		observe = vi.fn();
		disconnect = vi.fn();
	});
});

async function settle(): Promise<void> {
	for (let tick = 0; tick < 4; tick++) await nextTick();
}

async function finishTransition(): Promise<void> {
	await settle();
	await vi.advanceTimersByTimeAsync(350);
	await settle();
}

afterEach(async () => {
	for (const item of mounted.splice(0).reverse()) {
		item.closeNotice();
		await finishTransition();
		item.app.unmount();
		item.container.remove();
		item.opener.remove();
	}
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function required<T extends Element = HTMLElement>(container: ParentNode, selector: string): T {
	const result = container.querySelector<T>(selector);
	if (!result) throw new Error(`Required Akatsuki introduction element was not rendered: ${selector}`);
	return result;
}

function action(container: ParentNode, name: 'apply' | 'later' | 'close'): HTMLButtonElement {
	return required<HTMLButtonElement>(container, `[data-notice-action="${name}"]`);
}

function titleStage(container: ParentNode) {
	const stage = required(container, 'h1 > span[aria-hidden="true"]');
	return {
		stage,
		from: required(stage, ':scope > span:nth-child(1)'),
		word: required(stage, ':scope > span:nth-child(2)'),
		door: required(stage, ':scope > span:nth-child(3)'),
	};
}

function finishTitle(element: HTMLElement): void {
	const event = new Event('animationend', { bubbles: true });
	Object.defineProperty(event, 'animationName', { value: 'notice-akatsuki-through-door' });
	element.dispatchEvent(event);
}

function setReducedMotion(value: boolean): void {
	reducedMotion = value;
	for (const { query } of motionQueries) query.dispatchEvent(new Event('change'));
}

function deferred(): { promise: Promise<boolean>; resolve: (value: boolean) => void; reject: (reason: unknown) => void } {
	let resolvePromise!: (value: boolean) => void;
	let rejectPromise!: (reason: unknown) => void;
	const promise = new Promise<boolean>((resolveValue, rejectValue) => { resolvePromise = resolveValue; rejectPromise = rejectValue; });
	return { promise, resolve: resolvePromise, reject: rejectPromise };
}

async function mountNotice(options: Partial<NoticeProps> = {}, awaitOpened = true) {
	const opener = window.document.createElement('button');
	opener.textContent = 'Hatask';
	const container = window.document.createElement('div');
	window.document.body.append(opener, container);
	opener.focus();
	const choose = vi.fn<(apply: boolean) => Promise<boolean>>().mockResolvedValue(true);
	const state = shallowReactive<NoticeProps>({ active: false, ownerActive: true, animation: true, mode: 'light', onChoose: choose, ...options });
	const notice = ref<NoticeInstance>();
	const shown = ref(true);
	const closed = vi.fn();
	const app = createApp(defineComponent({
		setup: () => () => shown.value ? h(HataskAkatsukiNotice, {
			...state, ref: notice, onClosed: () => { closed(); shown.value = false; },
		}) : null,
	}));
	app.config.idPrefix = `notice-${mounted.length}`;
	app.directive('hotkey', hotkeyDirective);
	app.mount(container);
	const closeNotice = (): void => { notice.value?.closeWithoutSaving(); };
	mounted.push({ app, container, opener, closeNotice });
	if (awaitOpened) await finishTransition();
	else await settle();
	return { container, opener, state, choose, closed, closeNotice };
}

describe('HataskAkatsukiNotice', () => {
	test.each([false, true])('既に暁=%sでも同じブランドの意味ある見出しと翻訳済みの案内を表示する', async active => {
		const { container, choose, opener } = await mountNotice({ active });
		const dialog = required(container, '[role="dialog"]');
		const heading = required(container, 'h1');
		expect(container.querySelectorAll('[role="dialog"]')).toHaveLength(1);
		expect(container.querySelectorAll('h1')).toHaveLength(1);
		expect(heading.getAttribute('aria-label')).toBe('Hatask V3 Akatsuki');
		expect(heading.children).toHaveLength(2);
		expect(heading.children[0].textContent).toBe('Hatask V3');
		const title = titleStage(container);
		expect(title.stage.parentElement).toBe(heading);
		expect(title.stage.children).toHaveLength(3);
		expect(title.from.textContent).toBe('Hatask');
		expect(title.word.textContent).toBe('Akatsuki');
		expect(title.door.textContent).toBe('');
		expect(title.stage.querySelector('button, a, input, [tabindex]')).toBeNull();
		expect(dialog.getAttribute('aria-modal')).toBe('true');
		expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
		expect(required(container, `#${dialog.getAttribute('aria-describedby')}`).textContent).toBe(copy.description);
		expect([...dialog.querySelectorAll('h2')].map(item => item.textContent)).toEqual([copy.overviewTitle, copy.themeTitle]);
		for (const text of [copy.overviewDescription, copy.themeDescription, copy.preserved]) expect(dialog.textContent).toContain(text);
		expect(action(container, 'apply').textContent.trim()).toBe(active ? copy.continue : copy.apply);
		expect(action(container, 'later').textContent).toBe(active ? copy.close : copy.later);
		expect(action(container, 'close').getAttribute('aria-label')).toBe(copy.close);
		expect(dialog.querySelectorAll('button')).toHaveLength(3);
		const decoration = required(dialog, 'header > div[aria-hidden="true"]');
		expect(decoration.children).toHaveLength(3);
		expect(decoration.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
		expect(window.document.activeElement).toBe(heading);
		expect(opener.inert).toBe(true);
		expect(choose).not.toHaveBeenCalled();
	});

	test('モーダルの登場完了後に一度だけ文字演出を開始し、Akatsuki自身の終了だけで最終状態へ進む', async () => {
		const { container, state, choose, closed } = await mountNotice({}, false);
		const dialog = required(container, '[role="dialog"]');
		const title = titleStage(container);
		expect(dialog.getAttribute('data-title-motion')).toBe('pending');
		await finishTransition();
		expect(dialog.getAttribute('data-title-motion')).toBe('playing');
		expect(window.document.activeElement).toBe(required(container, 'h1'));
		finishTitle(title.from);
		finishTitle(title.door);
		await settle();
		expect(dialog.getAttribute('data-title-motion')).toBe('playing');
		finishTitle(title.word);
		await settle();
		expect(dialog.getAttribute('data-title-motion')).toBe('done');
		state.animation = false;
		await settle();
		state.animation = true;
		state.mode = 'dark';
		await finishTransition();
		expect(dialog.getAttribute('data-title-motion')).toBe('done');
		expect(titleStage(container).stage).toBe(title.stage);
		expect(choose).not.toHaveBeenCalled();
		expect(closed).not.toHaveBeenCalled();
	});

	test.each(['pending', 'playing'] as const)('%s中に動きを無効化したら最終状態へ進み、再度有効化しても再生しない', async phase => {
		const { container, state } = await mountNotice({}, phase === 'playing');
		const dialog = required(container, '[role="dialog"]');
		expect(dialog.getAttribute('data-title-motion')).toBe(phase);
		state.animation = false;
		await settle();
		expect(dialog.getAttribute('data-title-motion')).toBe('done');
		state.animation = true;
		await finishTransition();
		expect(dialog.getAttribute('data-motion')).toBe('on');
		expect(dialog.getAttribute('data-title-motion')).toBe('done');
	});

	test('最初から動きが無効なら演出開始を待たず最終状態を維持する', async () => {
		const { container, state } = await mountNotice({ animation: false }, false);
		const dialog = required(container, '[role="dialog"]');
		expect(dialog.getAttribute('data-title-motion')).toBe('done');
		await finishTransition();
		state.animation = true;
		await settle();
		expect(dialog.getAttribute('data-title-motion')).toBe('done');
		expect(required(container, 'h1').getAttribute('aria-label')).toBe('Hatask V3 Akatsuki');
	});

	test.each(['initial', 'pending', 'playing'] as const)('%sでreduced-motionが有効になったら最終状態を保ち、設定を戻しても再生しない', async phase => {
		if (phase === 'initial') reducedMotion = true;
		const { container, closed } = await mountNotice({}, phase === 'playing');
		const dialog = required(container, '[role="dialog"]');
		if (phase !== 'initial') {
			expect(dialog.getAttribute('data-title-motion')).toBe(phase);
			setReducedMotion(true);
			await settle();
		}
		expect(dialog.getAttribute('data-title-motion')).toBe('done');
		expect(motionQueries).toHaveLength(1);
		expect(motionQueries[0].query.media).toBe('(prefers-reduced-motion: reduce)');
		expect(motionQueries[0].listeners.size).toBe(1);
		setReducedMotion(false);
		await finishTransition();
		expect(dialog.getAttribute('data-title-motion')).toBe('done');
		action(container, 'close').click();
		await finishTransition();
		expect(closed).toHaveBeenCalledOnce();
		expect(motionQueries[0].listeners.size).toBe(0);
	});

	test.each(['close', 'owner'] as const)('文字演出中の%s操作は演出を止め、閉じる完了を待って終了する', async reason => {
		const { container, state, choose, closed } = await mountNotice();
		const dialog = required(container, '[role="dialog"]');
		expect(dialog.getAttribute('data-title-motion')).toBe('playing');
		if (reason === 'owner') state.ownerActive = false;
		else action(container, 'close').click();
		await settle();
		expect(dialog.getAttribute('data-title-motion')).toBe('done');
		expect(closed).not.toHaveBeenCalled();
		await finishTransition();
		expect(closed).toHaveBeenCalledOnce();
		expect(choose.mock.calls).toEqual(reason === 'owner' ? [] : [[false]]);
	});

	test('適用を保存している間は全経路の二重操作を防ぎ、成功後の閉じるアニメーション完了で一度だけ通知する', async () => {
		const pending = deferred();
		const save = vi.fn<(apply: boolean) => Promise<boolean>>().mockReturnValue(pending.promise);
		const { container, closed, opener } = await mountNotice({ onChoose: save });
		action(container, 'apply').click();
		action(container, 'apply').click();
		action(container, 'later').click();
		action(container, 'close').click();
		required(container, '[data-cy-bg]').click();
		required(container, 'h1').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		await settle();
		expect(save.mock.calls).toEqual([[true]]);
		expect(required(container, '[role="dialog"]').getAttribute('aria-busy')).toBe('true');
		for (const name of ['apply', 'later', 'close'] as const) expect(action(container, name).disabled).toBe(true);
		expect(required(container, '[role="status"]').textContent).toBe(copy.saving);
		expect(closed).not.toHaveBeenCalled();
		pending.resolve(true);
		await settle();
		expect(closed).not.toHaveBeenCalled();
		await finishTransition();
		expect(closed).toHaveBeenCalledOnce();
		expect(container.querySelector('[role="dialog"]')).toBeNull();
		expect(opener.inert).toBe(false);
		expect(window.document.activeElement).toBe(opener);
	});

	test.each(['false', 'reject'] as const)('適用結果%sでは閉じず、エラーを読み上げて再試行できる', async failure => {
		const save = vi.fn<(apply: boolean) => Promise<boolean>>();
		if (failure === 'reject') save.mockRejectedValueOnce(new Error('internal save failure'));
		else save.mockResolvedValueOnce(false);
		save.mockResolvedValueOnce(true);
		const { container, closed } = await mountNotice({ onChoose: save });
		action(container, 'apply').click();
		await finishTransition();
		expect(closed).not.toHaveBeenCalled();
		expect(required(container, '[role="alert"]').textContent).toBe(copy.saveError);
		expect(container.textContent).not.toContain('internal save failure');
		expect(action(container, 'apply').textContent.trim()).toBe(copy.retry);
		expect(action(container, 'apply').disabled).toBe(false);
		expect(required(container, '[role="dialog"]').getAttribute('aria-busy')).toBe('false');
		expect(window.document.activeElement).toBe(action(container, 'apply'));
		action(container, 'apply').click();
		await finishTransition();
		expect(save.mock.calls).toEqual([[true], [true]]);
		expect(closed).toHaveBeenCalledOnce();
	});

	for (const dismissal of ['later', 'close', 'escape', 'outside'] as const) {
		test.each(['false', 'reject'] as const)(`${dismissal}の保存結果%sでも現在のテーマのまま閉じられる`, async failure => {
			const pending = deferred();
			const save = vi.fn<(apply: boolean) => Promise<boolean>>().mockReturnValue(pending.promise);
			const { container, closed, opener } = await mountNotice({ onChoose: save });
			if (dismissal === 'escape') required(container, 'h1').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
			else if (dismissal === 'outside') {
				const backdrop = required(container, '[data-cy-bg]');
				backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				backdrop.click();
			} else action(container, dismissal).click();
			await settle();
			expect(save.mock.calls).toEqual([[false]]);
			expect(closed).not.toHaveBeenCalled();
			if (failure === 'reject') pending.reject(new Error('dismiss save failed'));
			else pending.resolve(false);
			await finishTransition();
			expect(closed).toHaveBeenCalledOnce();
			expect(container.querySelector('[role="dialog"]')).toBeNull();
			expect(opener.inert).toBe(false);
			expect(window.document.activeElement).toBe(opener);
		});
	}

	test('適用失敗後にも今のテーマを保って閉じられる', async () => {
		const save = vi.fn<(apply: boolean) => Promise<boolean>>().mockResolvedValue(false);
		const { container, closed } = await mountNotice({ onChoose: save });
		action(container, 'apply').click();
		await settle();
		action(container, 'later').click();
		await finishTransition();
		expect(save.mock.calls).toEqual([[true], [false]]);
		expect(closed).toHaveBeenCalledOnce();
	});

	test.each(['surface', 'modal-root'] as const)('%sからのEscapeや矢印キーを背後のデッキへ伝播せず、内容クリックも外側操作にならない', async target => {
		const behind = vi.fn();
		window.document.addEventListener('keydown', behind);
		try {
			const { container, choose, closed } = await mountNotice();
			required(container, '[role="dialog"] p').click();
			expect(choose).not.toHaveBeenCalled();
			const keyboardTarget = target === 'surface' ? action(container, 'apply') : required(container, '.hatask-akatsuki-notice-modal');
			const arrow = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
			keyboardTarget.dispatchEvent(arrow);
			expect(arrow.defaultPrevented).toBe(false);
			const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
			keyboardTarget.dispatchEvent(escape);
			expect(escape.defaultPrevented).toBe(true);
			expect(behind).not.toHaveBeenCalled();
			await finishTransition();
			expect(choose.mock.calls).toEqual([[false]]);
			expect(closed).toHaveBeenCalledOnce();
		} finally {
			window.document.removeEventListener('keydown', behind);
		}
	});

	test('明暗とアニメーション設定をその場で反映し、テーマ設定そのものを書き換えない', async () => {
		const { container, state, choose } = await mountNotice();
		const preferenceSnapshot = JSON.stringify(prefer.s);
		const dialog = required(container, '[role="dialog"]');
		const modalRoot = required(container, '.hatask-akatsuki-notice-modal');
		expect(dialog.getAttribute('data-mode')).toBe('light');
		expect(dialog.style.getPropertyValue('--hak-daylight-start')).toContain('var(--MI_THEME-accent');
		state.animation = false;
		state.mode = 'dark';
		await settle();
		expect(dialog.getAttribute('data-mode')).toBe('dark');
		expect(dialog.getAttribute('data-motion')).toBe('off');
		expect(modalRoot.getAttribute('data-notice-motion')).toBe('off');
		expect(dialog.style.getPropertyValue('--hak-daylight-start')).toContain('#000');
		expect(JSON.stringify(prefer.s)).toBe(preferenceSnapshot);
		expect(choose).not.toHaveBeenCalled();
	});

	test('所有ページを離れたときは保存せず閉じ、背景inertを解除して新しい画面からフォーカスを奪わない', async () => {
		const { container, state, choose, closed, opener } = await mountNotice();
		const nextPage = window.document.createElement('button');
		nextPage.textContent = '移動先';
		window.document.body.append(nextPage);
		try {
			state.ownerActive = false;
			await settle();
			nextPage.focus();
			await finishTransition();
			expect(choose).not.toHaveBeenCalled();
			expect(closed).toHaveBeenCalledOnce();
			expect(container.querySelector('[role="dialog"]')).toBeNull();
			expect(opener.inert).toBe(false);
			expect(window.document.activeElement).toBe(nextPage);
		} finally {
			nextPage.remove();
		}
	});

	test('開く前に所有ページが終了していたらモーダルもfocusTrapも作らずclosedを返す', async () => {
		const { container, opener, choose, closed } = await mountNotice({ ownerActive: false });
		expect(container.querySelector('.hatask-akatsuki-notice-modal')).toBeNull();
		expect(opener.inert).not.toBe(true);
		expect(window.document.activeElement).toBe(opener);
		expect(choose).not.toHaveBeenCalled();
		expect(closed).toHaveBeenCalledOnce();
	});

	test('保存中に所有ページを離れても終了でき、後から戻った保存結果で再表示しない', async () => {
		const pending = deferred();
		const save = vi.fn<(apply: boolean) => Promise<boolean>>().mockReturnValue(pending.promise);
		const { container, state, closed } = await mountNotice({ onChoose: save });
		action(container, 'apply').click();
		await settle();
		state.ownerActive = false;
		await finishTransition();
		expect(closed).toHaveBeenCalledOnce();
		pending.resolve(false);
		await finishTransition();
		expect(save.mock.calls).toEqual([[true]]);
		expect(container.querySelector('[role="dialog"]')).toBeNull();
		expect(closed).toHaveBeenCalledOnce();
	});

	test('別インスタンスの見出し・説明IDを共有しない', async () => {
		const first = await mountNotice();
		const second = await mountNotice();
		const firstDialog = required(first.container, '[role="dialog"]');
		const secondDialog = required(second.container, '[role="dialog"]');
		for (const attribute of ['aria-labelledby', 'aria-describedby']) expect(firstDialog.getAttribute(attribute)).not.toBe(secondDialog.getAttribute(attribute));
	});
});

describe('HataskAkatsukiNoticeの実SFC・SCSS契約', () => {
	test('実SFCをコンパイルし、Righteous・明暗・容器幅・画面内スクロール・停止条件を維持する', async () => {
		const filename = resolve(process.cwd(), 'src/components/hatask/HataskAkatsukiNotice.vue');
		const source = readFileSync(filename, 'utf8');
		const parsed = parse(source, { filename });
		expect(parsed.errors).toEqual([]);
		const script = compileScript(parsed.descriptor, { id: 'hatask-akatsuki-notice-test' });
		const templateBlock = parsed.descriptor.template;
		if (!templateBlock) throw new Error('Notice template was not found');
		const template = compileTemplate({ source: templateBlock.content, filename, id: 'hatask-akatsuki-notice-test', compilerOptions: { bindingMetadata: script.bindings } });
		expect(template.errors).toEqual([]);
		const style = parsed.descriptor.styles.find(item => item.module);
		const globalStyle = parsed.descriptor.styles.find(item => !item.module);
		if (!style || !globalStyle) throw new Error('Notice styles were not found');
		const compiled = await compileStyleAsync({ source: style.content, filename, id: 'notice', preprocessLang: 'scss', modules: true });
		const globalCompiled = await compileStyleAsync({ source: globalStyle.content, filename, id: 'notice-global', preprocessLang: 'scss' });
		expect(compiled.errors).toEqual([]);
		expect(globalCompiled.errors).toEqual([]);
		const classes = compiled.modules;
		const css = compiled.rawResult?.root;
		const globalCss = globalCompiled.rawResult?.root;
		if (!classes || !css || !globalCss) throw new Error('Notice styles did not compile');
		type Rule = { selector: string; condition?: string; values: Map<string, string> };
		const rules: Rule[] = [];
		for (const sheet of [css, globalCss]) sheet.walkRules(rule => {
			const values = new Map<string, string>();
			rule.walkDecls(declaration => { values.set(declaration.prop, declaration.value); });
			const parent = rule.parent;
			rules.push({ selector: rule.selector.replace(/\s*,\s*/gu, ', '), condition: parent?.type === 'atrule' ? `@${parent.name} ${parent.params}` : undefined, values });
		});
		const ruleFor = (selector: string, condition?: string): Map<string, string> => {
			const rule = rules.find(item => item.selector === selector && item.condition === condition);
			if (!rule) throw new Error(`Missing compiled CSS rule: ${selector} ${condition ?? ''}`);
			return rule.values;
		};
		const root = ruleFor(`.${classes.root}`);
		expect(root.get('width')).toBe('min(100%, 800px)');
		expect(root.get('min-width')).toBe('0');
		expect(root.get('max-height')).toContain('100dvh');
		expect(root.get('max-height')).toContain('safe-area-inset-bottom');
		expect(root.get('overflow')).toBe('auto');
		expect(root.get('container')?.replace(/\s*\/\s*/gu, '/')).toBe('hatask-akatsuki-notice/inline-size');
		expect(root.get('--notice-fg')).toBe('#2b1f2c');
		const dark = rules.find(rule => rule.selector.replace(/['"]/gu, '') === `.${classes.root}[data-mode=dark]`);
		expect(dark?.values.get('--notice-fg')).toBe('#f6ecf3');
		expect(dark?.values.get('--notice-paper')).toBe('#1b1424');
		expect(ruleFor(`.${classes.title}`).get('font-family')).toContain('Righteous');
		expect(ruleFor(`.${classes.title}`).get('font-synthesis')).toBe('none');
		const stage = ruleFor(`.${classes.brandStage}`);
		expect(stage.get('font-size')).toContain('17cqi');
		expect(stage.get('display')).toBe('grid');
		expect(stage.get('height')).toBe('1.18em');
		expect(stage.get('overflow')).toBe('hidden');
		expect(stage.get('pointer-events')).toBe('none');
		expect(stage.get('--notice-title-duration')).toBe('1800ms');
		const words = ruleFor(`.${classes.brandFrom}, .${classes.brandWord}`);
		expect(words.get('grid-area')?.replace(/\s*\/\s*/gu, '/')).toBe('1/1');
		expect(words.get('transform-origin')).toMatch(/^0?\.35em 100%$/u);
		expect(words.get('white-space')).toBe('nowrap');
		const from = ruleFor(`.${classes.brandFrom}`);
		const word = ruleFor(`.${classes.brandWord}`);
		const door = ruleFor(`.${classes.brandDoor}`);
		expect(from.get('opacity')).toBe('0');
		expect(from.get('transform')).toMatch(/^translateY\(112%\) scale\(0?\.08\)$/u);
		expect(word.get('opacity')).toBe('1');
		expect(word.get('transform')).toBe('none');
		expect(door.get('opacity')).toBe('0');
		const doorLeft = door.get('left');
		const doorOrigin = door.get('transform-origin');
		if (!doorLeft || !doorOrigin) throw new Error('Door axis was not defined');
		expect(doorLeft).toMatch(/^0?\.02em$/u);
		expect(doorOrigin).toMatch(/^0?\.33em 100%$/u);
		expect(parseFloat(doorLeft) + parseFloat(doorOrigin)).toBeCloseTo(.35);
		expect(ruleFor(`.${classes.primary}`).get('color')).toBe('var(--MI_THEME-fgOnAccent)');
		expect(ruleFor(`.${classes.primary}`).get('background')).toBe('var(--MI_THEME-accent)');
		expect(ruleFor(`.${classes.close}`).get('width')).toBe('44px');
		expect(ruleFor(`.${classes.close}`).get('height')).toBe('44px');
		expect(ruleFor(`.${classes.primary}, .${classes.secondary}`).get('min-height')).toBe('48px');
		expect(ruleFor(`.${classes.actions}`, '@container hatask-akatsuki-notice (max-width: 520px)').get('flex-direction')).toBe('column');
		expect(ruleFor(`.${classes.features}`, '@container hatask-akatsuki-notice (max-width: 520px)').get('grid-template-columns')).toBe('minmax(0, 1fr)');
		const padding = ruleFor('.hatask-akatsuki-notice-modal > div:not([data-cy-bg])').get('padding');
		for (const side of ['top', 'right', 'bottom', 'left']) expect(padding).toContain(`safe-area-inset-${side}`);

		const animations = rules.filter(rule => rule.values.has('animation') && rule.values.get('animation') !== 'none');
		expect(animations).toHaveLength(3);
		const noPreference = '@media (prefers-reduced-motion: no-preference)';
		const animatedParts = [
			{ className: classes.brandFrom, keyframe: 'notice-hatask-through-door' },
			{ className: classes.brandWord, keyframe: 'notice-akatsuki-through-door' },
			{ className: classes.brandDoor, keyframe: 'notice-letter-door' },
		];
		for (const part of animatedParts) {
			const animation = animations.find(rule => rule.selector.endsWith(` .${part.className}`));
			if (!animation) throw new Error(`Missing title animation for ${part.keyframe}`);
			expect(animation.condition).toBe(noPreference);
			expect(animation.values.get('animation')).toContain(part.keyframe);
			expect(animation.values.get('animation')).toContain('var(--notice-title-duration)');
			expect(animation.values.get('animation')).toMatch(/\s1 both$/u);
			const fixture = window.document.createElement('div');
			fixture.className = classes.root;
			const element = window.document.createElement('span');
			element.className = part.className;
			fixture.append(element);
			for (const motion of ['on', 'off']) for (const phase of ['pending', 'playing', 'done']) for (const reduced of [false, true]) {
				fixture.dataset.motion = motion;
				fixture.dataset.titleMotion = phase;
				const selected = !reduced && element.matches(animation.selector);
				expect(selected).toBe(motion === 'on' && phase === 'playing' && !reduced);
			}
			// Removing either state restriction must make this detector catch a replay.
			fixture.dataset.motion = 'off';
			fixture.dataset.titleMotion = 'playing';
			const unrestrictedMotion = animation.selector.replace(/\[data-motion=['"]?on['"]?\]/u, '');
			expect(element.matches(animation.selector)).toBe(false);
			expect(element.matches(unrestrictedMotion)).toBe(true);
			fixture.dataset.motion = 'on';
			fixture.dataset.titleMotion = 'done';
			const unrestrictedPhase = animation.selector.replace(/\[data-title-motion=['"]?playing['"]?\]/u, '');
			expect(element.matches(animation.selector)).toBe(false);
			expect(element.matches(unrestrictedPhase)).toBe(true);
		}
		const pending = rules.filter(rule => rule.condition === noPreference && rule.selector.replace(/['"]/gu, '').includes('[data-title-motion=pending]'));
		expect(pending).toHaveLength(2);
		expect(pending.find(rule => rule.selector.endsWith(` .${classes.brandFrom}`))?.values.get('opacity')).toBe('1');
		expect(pending.find(rule => rule.selector.endsWith(` .${classes.brandFrom}`))?.values.get('transform')).toBe('none');
		expect(pending.find(rule => rule.selector.endsWith(` .${classes.brandWord}`))?.values.get('opacity')).toBe('0');
		for (const rule of pending) expect(rule.selector.replace(/['"]/gu, '')).toContain('[data-motion=on]');
		const reduced = '@media (prefers-reduced-motion: reduce)';
		const staticModal = rules.find(rule => rule.selector.replace(/['"]/gu, '') === '.hatask-akatsuki-notice-modal[data-notice-motion=off] > div');
		const reducedModal = ruleFor('.hatask-akatsuki-notice-modal[data-notice-motion] > div', reduced);
		for (const declaration of ['animation', 'transition', 'transform']) {
			expect(staticModal?.values.get(declaration)).toBe('none');
			expect(reducedModal.get(declaration)).toBe('none');
		}
		// This detector must reject a reintroduced endless decorative animation.
		const finite = (value: string | undefined): boolean => typeof value === 'string' && !/\binfinite\b/u.test(value);
		expect(finite('notice-hatask-through-door 1800ms infinite')).toBe(false);
		expect(finite(undefined)).toBe(false);
		for (const rule of animations) expect(finite(rule.values.get('animation'))).toBe(true);

		const keyframes = new Map<string, Map<number, Map<string, string>>>();
		css.walkAtRules('keyframes', atRule => {
			const frames = new Map<number, Map<string, string>>();
			atRule.walkRules(frame => {
				const values = new Map<string, string>();
				frame.walkDecls(declaration => { values.set(declaration.prop, declaration.value); });
				for (const offset of frame.selector.split(',')) frames.set(parseFloat(offset), values);
			});
			keyframes.set(atRule.params, frames);
		});
		expect(keyframes.size).toBe(3);
		const framesFor = (name: string): Map<number, Map<string, string>> => {
			const result = [...keyframes].find(([key]) => key.includes(name))?.[1];
			if (!result) throw new Error(`Missing compiled keyframes: ${name}`);
			return result;
		};
		const fromFrames = framesFor('notice-hatask-through-door');
		const wordFrames = framesFor('notice-akatsuki-through-door');
		const doorFrames = framesFor('notice-letter-door');
		expect(fromFrames.get(0)?.get('opacity')).toBe('1');
		expect(fromFrames.get(0)?.get('transform')).toBe('none');
		expect(fromFrames.get(100)?.get('opacity')).toBe(from.get('opacity'));
		expect(fromFrames.get(100)?.get('transform')).toBe(from.get('transform'));
		expect(wordFrames.get(0)?.get('opacity')).toBe('0');
		expect(wordFrames.get(0)?.get('transform')).toBe(fromFrames.get(100)?.get('transform'));
		expect(wordFrames.get(100)?.get('opacity')).toBe(word.get('opacity'));
		expect(wordFrames.get(100)?.get('transform')).toBe(word.get('transform'));
		expect(fromFrames.get(42)?.get('transform')).toMatch(/^translateY\(-6%\) scale\(0?\.08\)$/u);
		expect(wordFrames.get(60)?.get('transform')).toBe(fromFrames.get(42)?.get('transform'));
		expect(doorFrames.get(0)?.get('opacity')).toBe('0');
		expect(doorFrames.get(28)?.get('opacity')).toMatch(/^0?\.65$/u);
		expect(doorFrames.get(60)?.get('transform')).toBe('scaleY(1)');
		expect(doorFrames.get(100)?.get('opacity')).toBe(door.get('opacity'));
		expect(doorFrames.get(100)?.get('transform')).toBe(door.get('transform'));
		const composited = (values: Map<string, string>): boolean => [...values.keys()].every(property => property === 'opacity' || property === 'transform');
		expect(composited(new Map([['height', '1em']]))).toBe(false);
		for (const frames of keyframes.values()) for (const values of frames.values()) expect(composited(values)).toBe(true);
	});
});
