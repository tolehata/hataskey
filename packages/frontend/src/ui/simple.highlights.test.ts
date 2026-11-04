/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileTemplate, parse } from '@vue/compiler-sfc';
import * as ts from 'typescript';
import * as Vue from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

const filename = 'src/ui/simple.vue';
const descriptor = parse(readFileSync(resolve(process.cwd(), filename), 'utf8'), { filename }).descriptor;
if (!descriptor.template?.ast || !descriptor.scriptSetup) throw new Error('Missing production simple UI');
const setup = ts.createSourceFile(`${filename}.ts`, descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
type Root = NonNullable<NonNullable<typeof descriptor.template>['ast']>;
type Child = Root['children'][number];
type ElementNode = Extract<Child, { type: 1 }>;

function element(predicate: (node: ElementNode) => boolean): ElementNode {
	let found: ElementNode | undefined;

	function visit(node: Root | Child) {
		if (node.type === 1 && predicate(node)) found ??= node;
		if ('children' in node && Array.isArray(node.children)) node.children.forEach(child => visit(child as Child));
	}

	visit(descriptor.template!.ast!);
	if (!found) throw new Error('Missing production highlight template');
	return found;
}

function prop(node: ElementNode, name: string): string | undefined {
	const value = node.props.find(item => item.type === 6 ? item.name === name : item.arg?.type === 4 && item.arg.content === name);
	return value?.type === 6 ? value.value?.content : value?.exp?.type === 4 ? value.exp.content : undefined;
}

const highlightButton = element(node => prop(node, 'ref') === 'highlightsButton');
const normalButtons = element(node => node.tag === 'template' && node.props.some(item => item.type === 7 && item.name === 'for' && item.exp?.type === 4 && item.exp.content.includes('visibleTopTabs')));
const transition = element(node => node.tag === 'Transition' && prop(node, 'beforeLeave') === 'prepareTimelineLeave');
const timelineWrapper = element(node => node.children.includes(transition));
const compiled = compileTemplate({
	source: `<div><div data-topbar><div ref="topNavStackEl"><nav data-highlight-tabs>${highlightButton.loc.source}${normalButtons.loc.source}</nav></div></div><div ref="contentEl" data-scroll-container>${timelineWrapper.loc.source}</div></div>`,
	filename, id: 'simple-highlights-test',
	compilerOptions: { mode: 'function', prefixIdentifiers: true, cacheHandlers: false, expressionPlugins: ['typescript'] },
});
if (compiled.errors.length) throw new Error(`Highlight fixture compilation failed: ${String(compiled.errors[0])}`);
const render = new Function('Vue', ts.transpileModule(compiled.code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText)(Vue);

const names: string[] = [];
const statements = setup.statements.filter(statement => {
	if (ts.isFunctionDeclaration(statement)) {
		const name = statement.name?.text;
		if (name && (/highlight/i.test(name) || name === 'prepareTimelineLeave' || name === 'returnToLatest')) { names.push(name); return true; }
	}
	if (ts.isVariableStatement(statement)) {
		const selected = statement.declarationList.declarations.filter(item => ts.isIdentifier(item.name)
			&& (/^highlight/i.test(item.name.text) || ['nativeTimeline', 'timelineSlideDirection', 'switchTab', 'showTopBar', 'lastScrollY'].includes(item.name.text)));
		if (selected.length) {
			for (const item of selected) names.push(item.name.getText(setup));
			return true;
		}
	}
	return ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)
		&& ['watch', 'onUnmounted'].includes(statement.expression.expression.getText(setup))
		&& /cancelHighlightViewSwitch\(|highlightViewMotion\.finish\(/.test(statement.getText(setup));
});
for (const required of ['setHighlightView', 'toggleHighlights', 'closeHighlights', 'cancelHighlightViewSwitch', 'getHighlightScrollInset']) {
	if (!names.includes(required)) throw new Error(`Missing production handler: ${required}`);
}
const code = ts.transpileModule(`${statements.map(statement => statement.getText(setup)).join('\n')}\nreturn { ${names.join(', ')} };`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;

type HighlightState = {
	highlightsOpen: Vue.Ref<boolean>;
	highlightsMounted: Vue.Ref<boolean>;
	highlightsButton: Vue.Ref<HTMLElement | null>;
	highlightsView: Vue.Ref<HTMLElement | null>;
	highlightNativeView: Vue.Ref<HTMLElement | null>;
	highlightViewTarget: Vue.Ref<boolean | null>;
	toggleHighlights: () => Promise<void>;
	closeHighlights: () => Promise<void>;
	switchTab: (tab: string) => void;
	getHighlightScrollInset: () => number;
};
type MotionCall = { element: HTMLElement | null; phase: 'leave' | 'enter'; direction: -1 | 1; complete: (value?: boolean) => void };
const cleanups: Array<() => void> = [];
const classes = new Proxy({}, { get: (_target, key) => key });

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

async function settle() {
	for (let index = 0; index < 8; index++) await Vue.nextTick();
}

async function mount(manualMotion = false) {
	let state!: HighlightState;
	let mounts = 0;
	let settleMotion: ((completed: boolean) => void) | null = null;
	let insetProp: number | (() => number) | undefined;
	const calls: MotionCall[] = [];
	const motion = {
		play: vi.fn((target: HTMLElement | null, phase: 'leave' | 'enter', direction: -1 | 1) => new Promise<boolean>(resolveMotion => {
			settleMotion?.(false);
			settleMotion = resolveMotion;
			calls.push({ element: target, phase, direction, complete: (value = true) => {
				if (settleMotion === resolveMotion) settleMotion = null;
				resolveMotion(value);
			} });
			if (!manualMotion) { settleMotion = null; resolveMotion(true); }
		})),
		cancel: vi.fn(() => { settleMotion?.(false); settleMotion = null; }),
		finish: vi.fn(() => { settleMotion?.(true); settleMotion = null; }),
	};
	const bindings = {
		ref: Vue.ref, computed: Vue.computed, nextTick: Vue.nextTick, watch: Vue.watch, onUnmounted: Vue.onUnmounted,
		createTimelineHighlightTabMotion: () => motion,
		createTimelineHighlightNavigation: () => ({ cancel: vi.fn(), start: vi.fn(), pause: vi.fn(), resume: vi.fn() }),
		tab: Vue.ref('local'), withRenotes: Vue.ref(true), withSensitive: Vue.ref(true), onlyFiles: Vue.ref(false),
		isPageView: Vue.ref(false), deckActive: Vue.ref(false), isCollectionTimelinePage: Vue.ref(false),
		contentEl: Vue.ref<HTMLElement | null>(null), topNavStackEl: Vue.ref<HTMLElement | null>(null),
		newNotesMotionEnabled: Vue.ref(false), isHataskeyTimelineAllowed: () => true,
		pullRefresh: { reset: vi.fn() }, mainRouter: { push: vi.fn() }, timelinePickerKind: Vue.ref(null),
		miLocalStorage: { setItem: vi.fn() },
		i18n: { ts: { _hata: { _highlights: { title: 'Highlights', travelling: 'Travelling', unavailable: 'Unavailable', jumpFailed: 'Failed', latest: 'Latest' } } } },
	};
	const Timeline = Vue.defineComponent({
		props: ['src', 'updatesPaused'],
		setup(props, { expose }) {
			mounts++;
			const root = Vue.ref<HTMLElement | null>(null);
			const actions = Vue.ref(0);
			expose({ noteRoot: root, cancelReveal: vi.fn(), reloadTimeline: vi.fn(), revealNote: vi.fn(async () => true) });
			return () => Vue.h('article', { ref: root, 'data-mounted-timeline': props.src, 'data-updates-paused': String(props.updatesPaused) }, [
				Vue.h('button', { 'data-note-action': '', onClick: () => actions.value++ }, String(actions.value)),
			]);
		},
	});
	const Highlights = Vue.defineComponent({
		props: ['active', 'src', 'scrollInset', 'scrollInsetTarget'],
		setup(props) {
			insetProp = props.scrollInset;
			return () => Vue.h('section', { 'data-highlight-content': '', 'data-active': String(props.active) });
		},
	});
	const errors: unknown[] = [];
	const app = Vue.createApp({
		setup() {
			state = new Function(...Object.keys(bindings), code)(...Object.values(bindings)) as HighlightState;
			return {
				...bindings, ...state, $style: classes,
				visibleTopTabs: [{ id: 'local', icon: 'ti ti-planet', label: 'Local' }, { id: 'following', icon: 'ti ti-home', label: 'Home' }],
				simpleMenuDisplayLabel: (_id: string, label: string) => label, playSimpleNavMotion: vi.fn(),
				showFixedPostForm: true, isExternalTab: false, isHatadyTab: false, isConcrntTab: false, concrntMounted: false,
				timelineGlassBg: false, punchBusy: false, normalLtlVoteActive: false, nativeNavbarVisible: false,
				ltlEmojiVoteEffects: null, ltlEmojiVoteNavbarTarget: null, emojiVoteNavbarState: {},
				externalHost: null, externalToken: null,
				onTouchStart: vi.fn(), onTouchMove: vi.fn(), onTouchEnd: vi.fn(), onTouchCancel: vi.fn(),
			};
		}, render,
	});
	app.config.globalProperties.$style = classes;
	app.config.errorHandler = error => errors.push(error);
	app.component('MkPostForm', Vue.defineComponent(() => () => Vue.h('textarea', { 'data-draft': '' })));
	app.component('MkTimelineHighlights', Highlights);
	for (const name of ['MkStreamingNotesTimeline', 'MkExternalTimeline', 'MkTrendingTimeline', 'MkHatadyTimeline', 'ConcrntTimeline']) app.component(name, Timeline);
	const host = window.document.createElement('div');
	window.document.body.append(host);
	app.mount(host);
	cleanups.push(() => { app.unmount(); host.remove(); });
	await settle();
	expect(errors).toEqual([]);
	return {
		host, state, bindings, motion, calls, errors, mounts: () => mounts, inset: () => insetProp,
		trigger: () => host.querySelector<HTMLButtonElement>('button[aria-label="Highlights"]')!,
		nativeButton: (index = 0) => host.querySelectorAll<HTMLButtonElement>('[data-highlight-tabs] button[data-timeline-active]')[index],
		native: () => host.querySelector<HTMLElement>('[data-highlight-native-view]')!,
	};
}

describe('normal UI highlight view switching', () => {
	it('selects only highlights, preserves the native note and draft, and restores both scroll positions', async () => {
		const view = await mount();
		const timeline = view.host.querySelector('[data-mounted-timeline]');
		const action = view.host.querySelector<HTMLButtonElement>('[data-note-action]')!;
		const draft = view.host.querySelector<HTMLTextAreaElement>('textarea')!;
		action.click(); draft.value = 'An unfinished draft';
		view.bindings.contentEl.value!.scrollTop = 260;
		expect(view.nativeButton().getAttribute('aria-pressed')).toBe('true');
		view.trigger().click(); await settle();
		expect(view.state.highlightsOpen.value).toBe(true);
		expect(view.host.querySelectorAll('[data-highlight-tabs] [aria-pressed="true"]')).toHaveLength(1);
		expect(view.trigger().getAttribute('aria-pressed')).toBe('true');
		expect(view.trigger().querySelector('.topTabLabel')?.textContent).toBe('Highlights');
		expect(view.nativeButton().getAttribute('aria-pressed')).toBe('false');
		expect(view.nativeButton().textContent?.trim()).toBe('');
		expect(view.native().style.display).toBe('none');
		expect(view.host.querySelector('[data-mounted-timeline]')).toBe(timeline);
		expect(timeline?.getAttribute('data-updates-paused')).toBe('true');
		expect(view.host.querySelector('textarea')).toBe(draft);
		expect(draft.closest('[inert]')).not.toBeNull();
		view.bindings.contentEl.value!.scrollTop = 140;
		view.nativeButton().click(); await settle();
		expect(view.state.highlightsOpen.value).toBe(false);
		expect(view.nativeButton().getAttribute('aria-pressed')).toBe('true');
		expect(view.trigger().textContent?.trim()).toBe('');
		expect(view.bindings.contentEl.value!.scrollTop).toBe(260);
		expect(view.host.querySelector('[data-note-action]')).toBe(action);
		expect(action.textContent).toBe('1');
		expect(draft.value).toBe('An unfinished draft');
		expect(view.mounts()).toBe(1);
		view.trigger().click(); await settle();
		expect(view.bindings.contentEl.value!.scrollTop).toBe(140);
		expect(view.inset()).toBe(view.state.getHighlightScrollInset);
		expect(view.errors).toEqual([]);
	});

	it('leaves before committing the new view, restores scroll before entering, and focuses after inertness clears', async () => {
		const view = await mount(true);
		view.bindings.contentEl.value!.scrollTop = 250;
		const original = view.native();
		const opening = view.state.toggleHighlights();
		await settle();
		expect(view.calls[0]).toMatchObject({ element: original, phase: 'leave', direction: -1 });
		expect(view.state.highlightsOpen.value).toBe(false);
		expect(view.native().hasAttribute('inert')).toBe(true);
		view.calls[0].complete(); await settle();
		expect(view.state.highlightsOpen.value).toBe(true);
		expect(view.calls[1]).toMatchObject({ element: view.state.highlightsView.value, phase: 'enter', direction: -1 });
		expect(view.bindings.contentEl.value!.scrollTop).toBe(0);
		expect(view.state.highlightsView.value!.hasAttribute('inert')).toBe(true);
		view.calls[1].complete(); await opening; await settle();
		expect(view.state.highlightsView.value!.hasAttribute('inert')).toBe(false);
		expect(window.document.activeElement).toBe(view.state.highlightsView.value);
		const closing = view.state.closeHighlights(); await settle();
		expect(view.calls[2]).toMatchObject({ phase: 'leave', direction: 1 });
		view.calls[2].complete(); await settle();
		expect(view.bindings.contentEl.value!.scrollTop).toBe(250);
		expect(view.calls[3]).toMatchObject({ element: original, phase: 'enter', direction: 1 });
		view.calls[3].complete(); await closing; await settle();
		expect(window.document.activeElement).toBe(view.trigger());
	});

	it('reverses an opening intent during exit without mounting highlights or moving the native scroll', async () => {
		const view = await mount(true);
		view.bindings.contentEl.value!.scrollTop = 260;
		const opening = view.state.toggleHighlights(); await settle();
		const reversing = view.state.toggleHighlights();
		await opening; await reversing; await settle();
		view.calls[0].complete(); await settle();
		expect(view.state.highlightsOpen.value).toBe(false);
		expect(view.state.highlightsMounted.value).toBe(false);
		expect(view.state.highlightViewTarget.value).toBeNull();
		expect(view.native().hasAttribute('inert')).toBe(false);
		expect(view.bindings.contentEl.value!.scrollTop).toBe(260);
		expect(view.calls).toHaveLength(1);
	});

	it('cancels a pending opening when a different native tab is selected', async () => {
		const view = await mount(true);
		const opening = view.state.toggleHighlights(); await settle();
		view.nativeButton(1).click();
		await opening; await settle();
		view.calls[0].complete(); await settle();
		expect(view.bindings.tab.value).toBe('following');
		expect(view.state.highlightsOpen.value).toBe(false);
		expect(view.state.highlightViewTarget.value).toBeNull();
		expect(view.host.querySelector('[data-mounted-timeline="home"]')).not.toBeNull();
		expect(view.nativeButton(1).getAttribute('aria-pressed')).toBe('true');
		expect(view.calls).toHaveLength(1);
		expect(view.errors).toEqual([]);
	});

	it('reverses during entrance without letting the old completion focus or reopen highlights', async () => {
		const view = await mount(true);
		const original = view.native();
		const opening = view.state.toggleHighlights(); await settle();
		view.calls[0].complete(); await settle();
		expect(view.state.highlightsOpen.value).toBe(true);
		const closing = view.state.toggleHighlights();
		await opening; await settle();
		expect(view.calls[2]).toMatchObject({ phase: 'leave', direction: 1 });
		view.calls[1].complete(); await settle();
		expect(view.state.highlightViewTarget.value).toBe(false);
		view.calls[2].complete(); await settle();
		expect(view.calls[3]).toMatchObject({ element: original, phase: 'enter', direction: 1 });
		view.calls[3].complete(); await closing; await settle();
		expect(view.state.highlightsOpen.value).toBe(false);
		expect(view.native()).toBe(original);
		expect(view.native().hasAttribute('inert')).toBe(false);
		expect(window.document.activeElement).toBe(view.trigger());
	});

	it.each(['isPageView', 'deckActive'] as const)('does not restore timeline focus after switching to %s', async key => {
		const view = await mount(true);
		const elsewhere = window.document.createElement('button');
		window.document.body.append(elsewhere);
		cleanups.push(() => elsewhere.remove());
		const opening = view.state.toggleHighlights(); await settle();
		elsewhere.focus();
		view.bindings[key].value = true;
		await opening; await settle();
		view.calls[0].complete(); await settle();
		expect(view.state.highlightsOpen.value).toBe(false);
		expect(window.document.activeElement).toBe(elsewhere);
		expect(view.state.highlightViewTarget.value).toBeNull();
	});

	it('finishes a pending view animation when the shared motion preference becomes disabled', async () => {
		const view = await mount(true);
		view.bindings.newNotesMotionEnabled.value = true; await settle();
		const opening = view.state.toggleHighlights(); await settle();
		view.bindings.newNotesMotionEnabled.value = false; await settle();
		expect(view.motion.finish).toHaveBeenCalledTimes(1);
		expect(view.state.highlightsOpen.value).toBe(true);
		view.calls[1].complete(); await opening;
		expect(view.state.highlightViewTarget.value).toBeNull();
	});

	it.each([
		{ label: 'normal', bottom: 184, translate: 0, expected: 94 },
		{ label: 'expanded notification', bottom: 250, translate: 0, expected: 160 },
		{ label: 'hidden navbar', bottom: 96, translate: -88, expected: 94 },
	])('reserves the shown navbar position for the $label', async ({ bottom, translate, expected }) => {
		const view = await mount();
		const container = view.bindings.contentEl.value!;
		const stack = view.bindings.topNavStackEl.value!;
		container.getBoundingClientRect = () => ({ top: 100 } as DOMRect);
		Object.defineProperty(container, 'clientTop', { value: 2 });
		stack.getBoundingClientRect = () => ({ bottom } as DOMRect);
		if (translate) {
			stack.parentElement!.style.transform = `matrix(1, 0, 0, 1, 0, ${translate})`;
			vi.stubGlobal('DOMMatrixReadOnly', class { m42 = translate; });
		}
		expect(view.state.getHighlightScrollInset()).toBe(expected);
	});
});
