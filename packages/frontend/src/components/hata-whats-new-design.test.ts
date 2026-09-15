/* SPDX-License-Identifier: AGPL-3.0-only */
/* eslint-disable vue/one-component-per-file -- Test-only modal and global display components. */
import fs from 'node:fs';
import path from 'node:path';
import { compileStyleAsync } from '@vue/compiler-sfc';
import { createApp, defineComponent, h, nextTick, computed } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import MkHataWhatsNew from './MkHataWhatsNew.vue';
import HataFeedHome from './HataFeedHome.vue';
import NotificationPreview from './hata-whats-new/NotificationPreview.vue';
import { sampleIssues, sampleRequests, sampleActivity } from './hata-whats-new/samples.js';
import type { Locale } from '../../../../locales/index.js';
import type { App, PropType } from 'vue';
import { prefer } from '@/preferences.js';
import { store } from '@/store.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hatadyNotice, hatadyNotify } from '@/utility/hatady-ui.js';
import { createHataskeyNotificationToasts, getNotificationPageContext, registerNotificationPageContext } from '@/utility/hataskey-notification-toast.js';
import { hataFeedNotify, registerHataFeedNoticeHost } from '@/utility/hatafeed-ui.js';
import { HATA_WHATS_NEW } from '@/utility/hata-whats-new.js';

vi.mock('@/i18n.js', async () => {
	const { I18n } = await import('@@/js/i18n.js');
	const yaml = await import('js-yaml');
	return { i18n: new I18n<Locale>(yaml.load(fs.readFileSync(path.resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8')) as Locale) };
});
vi.mock('@/preferences.js', async () => {
	const { ref } = await import('vue');
	return { prefer: { r: { animation: ref(false), darkMode: ref(false), useBlurEffect: ref(false), 'external.disableNotificationToast': ref(false) }, s: { animation: false }, commit: vi.fn() } };
});
vi.mock('@/utility/hatady-prefs.js', async () => { const { ref } = await import('vue'); return { hatadyTheme: ref('light') }; });
vi.mock('@/store.js', async () => { const { ref } = await import('vue'); return { store: { r: { darkMode: ref(false) } } }; });
vi.mock('@/i.js', () => ({ $i: { id: 'actual-user' }, iAmModerator: false }));
vi.mock('@/events.js', () => ({ globalEvents: { on: vi.fn(), off: vi.fn() } }));
vi.mock('@/os.js', () => ({ toast: vi.fn() }));
vi.mock('@/utility/intl-const.js', () => ({ versatileLang: 'ja-JP' }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn(() => { throw new Error('Introductions must not request real records'); }) }));
vi.mock('@/utility/hatakyu-assets.js', () => ({ useHatakyuBranding: () => true, hatakyuAssetUrl: (key: string) => `/client-assets/hatakyu/${key}.png` }));
vi.mock('@/components/MkHatakyuIllustration.vue', () => ({ default: { template: '<img alt="" data-mascot>' } }));
vi.mock('@/components/HyDialog.vue', () => ({ default: { setup() { throw new Error('A decorative preview opened a live dialog'); } } }));
vi.mock('@/components/MkHataskeyNotificationToasts.vue', () => ({ default: { setup() { throw new Error('A decorative preview started a live receiver'); } } }));
vi.mock('@/components/MkModal.vue', async () => {
	const { defineComponent: createComponent, h: render, onMounted } = await import('vue');
	return { default: createComponent({
		emits: ['closed', 'close', 'esc', 'click', 'opened'],
		setup(_, { slots, emit, expose }) {
			// eslint-disable-next-line id-denylist -- Existing MkModal public method.
			expose({ close() { emit('close'); emit('closed'); } });
			modalOpened = () => emit('opened');
			onMounted(() => { if (autoOpen) modalOpened(); });
			return () => render('div', { 'data-modal': true, onKeydown: (event: KeyboardEvent) => { if (event.key === 'Escape') emit('esc'); } }, slots.default?.());
		},
	}) };
});

let app: App | undefined, host: HTMLDivElement;
let bodyHeight: number, width: number, hidden: boolean;
let resizeCallbacks: Set<() => void>;
let motions: Array<{ element: HTMLElement; frames: Keyframe[]; options: KeyframeAnimationOptions; cancel: () => void; finish: () => void; done: boolean }>;
let motionListeners: Set<() => void>;
let reduced: boolean;
let cleanups: Array<() => void>;
let errors: string[];
let autoOpen: boolean;
let modalOpened: () => void;

async function flush() { for (let i = 0; i < 10; i++) await nextTick(); }

async function finishMotion() { for (let i = 0; i < 5; i++) { for (const item of motions) item.finish(); await flush(); } }

function globals(instance: App) {
	instance.component('MkTime', defineComponent({ props: { time: { type: [String, Date, Number], required: true } }, setup: props => () => h('time', { datetime: String(props.time) }, 'きょう') }));
	instance.component('MkUserName', defineComponent({ props: { user: { type: Object as PropType<{ name?: string }>, required: true } }, setup: props => () => h('span', props.user.name) }));
	instance.component('MkAvatar', defineComponent({ props: { user: { type: Object as PropType<{ name?: string }>, required: true } }, setup: () => () => h('span', '人') }));
	instance.config.errorHandler = error => errors.push(String(error));
	instance.config.warnHandler = warning => errors.push(warning);
}

async function mount() { app = createApp(MkHataWhatsNew, { onClosed: () => {} }); globals(app); app.mount(host); await flush(); }

function requiredElement<T extends Element = HTMLElement>(selector: string, parent: Element = host): T {
	const element = parent.querySelector<T>(selector);
	if (!element) throw new Error(`Missing element: ${selector}`);
	return element;
}

async function next() { requiredElement<HTMLButtonElement>('[aria-label="次へ"]').click(); await flush(); }

beforeEach(() => {
	bodyHeight = 600; width = 870; hidden = false; reduced = false; errors = []; cleanups = [];
	autoOpen = true;
	resizeCallbacks = new Set(); motionListeners = new Set(); motions = [];
	vi.clearAllMocks();
	prefer.r.animation.value = false; store.r.darkMode.value = false; hatadyNotice.value = null;
	vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, cb: () => void) => motionListeners.add(cb), removeEventListener: (_: string, cb: () => void) => motionListeners.delete(cb) }));
	vi.stubGlobal('ResizeObserver', class { constructor(private callback: () => void) {} observe() { resizeCallbacks.add(this.callback); } disconnect() { resizeCallbacks.delete(this.callback); } unobserve() {} });
	vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
	vi.spyOn(window.document, 'hidden', 'get').mockImplementation(() => hidden);
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.getAttribute('role') === 'region' ? bodyHeight : 350; });
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(780);
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1100);
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, width, 350));
	vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(function (this: HTMLElement, frames, options) {
		let resolve: () => void;
		const finished = new Promise<void>(done => { resolve = done; });
		const item = { element: this, frames: frames as Keyframe[], options: options as KeyframeAnimationOptions, done: false, cancel: () => { item.done = true; resolve(); }, finish: () => { item.done = true; resolve(); } };
		motions.push(item); return { finished, cancel: item.cancel } as unknown as Animation;
	});
	host = window.document.createElement('div'); window.document.body.append(host);
});
afterEach(async () => {
	app?.unmount(); app = undefined; await flush(); host.remove(); cleanups.forEach(cleanup => cleanup());
	expect(errors).toEqual([]);
	expect(resizeCallbacks.size).toBe(0);
	expect(motionListeners.size).toBe(0);
	vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('production update introduction', () => {
	test('Introduce completes before the first story mounts and does not replay while paging', async () => {
		prefer.r.animation.value = true;
		autoOpen = false;
		await mount();
		expect(motions).toEqual([]);
		expect(host.querySelector('[data-story]')).toBeNull();
		modalOpened(); await flush();
		const shell = requiredElement('[data-release-opening-shell]');
		const opening = requiredElement('[data-release-opening]');
		expect(shell.getAttribute('data-opening')).toBe('true');
		expect(requiredElement('[data-opening-word]').textContent).toBe('Introduce');
		expect(opening.getAttribute('aria-hidden')).toBe('true');
		expect(opening.hasAttribute('inert')).toBe(true);
		expect(requiredElement('footer').hasAttribute('inert')).toBe(true);
		expect(host.querySelector('[data-story]')).toBeNull();
		expect(motions.some(item => item.element.tagName === 'HEADER')).toBe(false);
		const word = motions.find(item => item.element.hasAttribute('data-opening-word'));
		const surface = motions.find(item => item.element.hasAttribute('data-opening-surface'));
		expect(word).toBeDefined(); expect(surface).toBeDefined();
		expect(motions.every(item => opening.contains(item.element))).toBe(true);
		expect(word?.frames.some(frame => Number(frame.opacity) === 1)).toBe(true);
		expect(word?.frames.at(-1)).toMatchObject({ opacity: 0 });
		expect(word?.options).toMatchObject({ iterations: 1, duration: 2200, easing: 'linear' });
		expect(word?.frames[1]).toMatchObject({ offset: .18, opacity: 1, transform: 'scale(1)', letterSpacing: '-.04em', filter: 'blur(0px)' });
		expect(word?.frames[2]).toMatchObject({ offset: .64, opacity: 1, transform: 'scale(1)', letterSpacing: '-.04em', filter: 'blur(0px)' });
		word?.finish(); await flush();
		expect(host.querySelector('[data-story]')).toBeNull();
		surface?.finish(); await flush();
		expect(requiredElement('[data-release-opening-shell]')).toBe(shell);
		expect(shell.getAttribute('data-opening')).toBe('false');
		expect(motions.find(item => item.element.tagName === 'HEADER')?.frames[0]).toMatchObject({ opacity: 0 });
		expect(host.querySelector('[data-release-opening]')).toBeNull();
		expect(requiredElement('footer').hasAttribute('inert')).toBe(false);
		expect(host.querySelector('[data-story] h2')).not.toBeNull();
		expect(window.document.activeElement).toBe(host.querySelector('[data-story] h2'));
		await finishMotion();
		await next(); await finishMotion();
		requiredElement<HTMLButtonElement>('[aria-label="戻る"]').click(); await finishMotion();
		expect(host.querySelector('[role="dialog"]')?.getAttribute('data-page')).toBe('1');
		expect(motions.filter(item => item.element.hasAttribute('data-opening-word'))).toHaveLength(1);
	});
	test.each(['programmatic close', 'Escape'])('closing via %s during Introduce never reveals a late story', async (method) => {
		prefer.r.animation.value = true;
		await mount();
		expect(host.querySelector('[data-release-opening]')).not.toBeNull();
		expect(motions.some(item => !item.done)).toBe(true);
		if (method === 'programmatic close') requiredElement<HTMLButtonElement>('[aria-label="更新案内を閉じる"]').click();
		else requiredElement('[data-modal]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		await flush();
		expect(motions.every(item => item.done)).toBe(true);
		const count = motions.length;
		await finishMotion();
		expect(host.querySelector('[data-release-opening]')).toBeNull();
		expect(host.querySelector('[data-story]')).toBeNull();
		expect(motions.length).toBe(count);
	});
	test.each(['preference', 'reduced', 'hidden'])('%s initially skips Introduce and immediately makes the first page usable', async (setting) => {
		prefer.r.animation.value = setting !== 'preference'; reduced = setting === 'reduced'; hidden = setting === 'hidden';
		await mount();
		expect(host.querySelector('[data-release-opening]')).toBeNull();
		expect(requiredElement('[data-release-opening-shell]').getAttribute('data-opening')).toBe('false');
		expect(requiredElement('footer').hasAttribute('inert')).toBe(false);
		expect(requiredElement<HTMLButtonElement>('[aria-label="次へ"]').disabled).toBe(false);
		expect(motions).toEqual([]);
		expect(window.document.activeElement).toBe(host.querySelector('[data-story] h2'));
	});
	test.each(['reduced', 'hidden'])('%s during Introduce settles to readable content without replaying on return', async (setting) => {
		prefer.r.animation.value = true;
		await mount();
		expect(host.querySelector('[data-release-opening]')).not.toBeNull();
		expect(motions.some(item => !item.done)).toBe(true);
		if (setting === 'reduced') { reduced = true; motionListeners.forEach(listener => listener()); } else { hidden = true; window.document.dispatchEvent(new Event('visibilitychange')); }
		await flush();
		expect(motions.every(item => item.done)).toBe(true);
		expect(host.querySelector('[data-release-opening]')).toBeNull();
		expect(host.querySelector('[data-story] h2')).not.toBeNull();
		expect(requiredElement('footer').hasAttribute('inert')).toBe(false);
		const count = motions.length;
		reduced = false; hidden = false;
		motionListeners.forEach(listener => listener()); window.document.dispatchEvent(new Event('visibilitychange')); await flush();
		expect(motions.length).toBe(count);
		expect(requiredElement<HTMLButtonElement>('[aria-label="次へ"]').disabled).toBe(false);
	});
	test('unmount during Introduce releases effects without starting content entrance', async () => {
		prefer.r.animation.value = true;
		await mount();
		expect(motions.some(item => !item.done)).toBe(true);
		const count = motions.length;
		app?.unmount(); app = undefined; await flush();
		expect(motions.every(item => item.done)).toBe(true);
		await finishMotion();
		expect(motions.length).toBe(count);
		expect(host.querySelector('[data-story]')).toBeNull();
	});
	test('renders all approved pages with read-only real product components and stable notification ownership', async () => {
		const context = createHataskeyNotificationToasts(computed(() => false), computed(() => false));
		cleanups.push(registerNotificationPageContext(context, () => true));
		const received = vi.fn(); cleanups.push(registerHataFeedNoticeHost({ active: () => true, notify: received }));
		const save = vi.spyOn(localStorage, 'setItem');
		await mount();
		expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby')).toBe('hata-whats-new-title');
		expect(host.querySelector('#hata-whats-new-title')?.textContent).toBe('今回の更新内容(hata-12.7)');
		expect(host.querySelector('header')?.textContent).not.toContain('HATASKEY RELEASE');
		expect(host.textContent).toContain('V3.1');
		store.r.darkMode.value = true; await flush();
		expect(host.querySelector('[role="dialog"]')?.getAttribute('data-mode')).toBe('dark');
		for (const id of ['akatsuki', 'koke', 'kisetsu', 'kashin', 'suri', 'hatakyu']) {
			requiredElement<HTMLButtonElement>(`[data-theme-choice="${id}"]`).click(); await flush();
			expect(host.querySelector(`[data-theme-choice="${id}"]`)?.getAttribute('aria-pressed')).toBe('true');
			expect(host.querySelector('[data-theme-choice="koke"]')?.textContent).toContain('NEW');
		}
		hatadyNotify('実際の画面への通知');
		const notice = hatadyNotice.value;
		await next();
		expect(host.textContent).toContain('V2.0');
		expect(host.textContent).toContain('月の郵便室');
		expect(host.querySelectorAll('[data-hy-entrance="home"]')).toHaveLength(6);
		expect(hatadyNotice.value).toBe(notice);
		expect(getNotificationPageContext()).toBe(context);
		await next();
		expect(host.textContent).toContain('V3.0');
		expect(host.querySelectorAll('[data-hatafeed-home-panel]')).toHaveLength(4);
		hataFeedNotify('本体での更新'); expect(received).toHaveBeenCalledWith('本体での更新');
		expect(getNotificationPageContext()).toBe(context);
		await next();
		expect(host.querySelector('[data-story]')?.getAttribute('data-story')).toBe('hataintro');
		expect(host.querySelector('[role="dialog"]')?.getAttribute('data-page')).toBe('4');
		expect(host.textContent).toContain('使い方が、見てわかる。');
		expect(host.querySelectorAll('[data-hataintro-panel]')).toHaveLength(3);
		expect(requiredElement('[data-hataintro-canvas]').hasAttribute('inert')).toBe(true);
		expect(requiredElement('.hata-intro').style.colorScheme).toBe('dark');
		expect(requiredElement('[data-story] .hg-search-box input').getAttribute('placeholder')).toBe('例：絵文字、公開範囲、映画 記録');
		expect(getNotificationPageContext()).toBe(context);
		const seen: string[] = [];
		while (host.querySelector('[aria-label="次へ"]')) { await next(); for (const card of host.querySelectorAll<HTMLElement>('[data-change-id]')) seen.push(card.getAttribute('data-change-id') ?? ''); }
		expect(seen).toEqual(HATA_WHATS_NEW.groups.flatMap(group => group.cards.map(card => card.id)));
		expect(host.querySelector('footer')?.textContent).toContain('12 / 12');
		expect(misskeyApi).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled(); expect(prefer.commit).not.toHaveBeenCalled();
	});
	test('short pages remain readable and resizing preserves the second topic', async () => {
		bodyHeight = 380; width = 390;
		await mount(); await next(); await next(); await next(); await next(); await next();
		expect(host.querySelector('[data-summary]')?.getAttribute('data-summary')).toBe('hatask-sharing');
		bodyHeight = 600; resizeCallbacks.forEach(callback => callback()); await flush();
		expect(host.querySelector('[data-change-id="hatask-sharing"]')).not.toBeNull();
		bodyHeight = 380; resizeCallbacks.forEach(callback => callback()); await flush();
		expect(host.querySelector('[data-summary]')?.getAttribute('data-summary')).toBe('hatask-sharing');
		expect(host.querySelector('footer')?.textContent).toContain('/ 20');
	});
	test('back/forward labels stay accessible while visible buttons are icons, and motion stops on close', async () => {
		prefer.r.animation.value = true;
		await mount(); await finishMotion();
		expect(motions.length).toBeGreaterThan(0);
		requiredElement<HTMLButtonElement>('[aria-label="次へ"]').click(); await finishMotion();
		expect(host.querySelector('[aria-label="戻る"]')?.textContent.trim()).toBe('');
		expect(host.querySelector('[aria-label="次へ"]')?.textContent.trim()).toBe('');
		expect(window.document.activeElement).toBe(host.querySelector('[data-story] h2'));
		requiredElement<HTMLButtonElement>('[aria-label="次へ"]').click();
		requiredElement<HTMLButtonElement>('[aria-label="更新案内を閉じる"]').click();
		await finishMotion();
		expect(host.querySelector('[data-story]')).toBeNull();
		expect(motions.every(item => item.done)).toBe(true);
	});
	test('reduced motion and a hidden document settle finite entrances without replay loops', async () => {
		prefer.r.animation.value = true;
		await mount();
		reduced = true; motionListeners.forEach(listener => listener()); await flush();
		expect(motions.every(item => item.done)).toBe(true);
		const count = motions.length;
		reduced = false; motionListeners.forEach(listener => listener()); await flush();
		expect(motions.length).toBe(count);
		requiredElement<HTMLButtonElement>('[aria-label="次へ"]').click(); await finishMotion();
		hidden = true; window.document.dispatchEvent(new Event('visibilitychange')); await flush();
		expect(motions.every(item => item.done)).toBe(true);
		requiredElement('[data-modal]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await flush();
		expect(host.querySelector('[data-story]')).toBeNull();
	});
	test('the extracted live HataFeed home still routes user actions through its owner', async () => {
		const issue = vi.fn(), navigate = vi.fn(), approve = vi.fn(), ownHistory = vi.fn();
		app = createApp(HataFeedHome, { isStaff: true, roadmap: sampleIssues, ownEmojiRequests: sampleRequests, emojiRequests: sampleRequests, emojiQuota: null, activity: sampleActivity, issues: sampleIssues, onIssue: issue, onNavigate: navigate, onApprove: approve, onOwnHistory: ownHistory });
		globals(app); app.mount(host); await flush();
		const button = (text: string) => {
			const found = [...host.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent.includes(text));
			if (!found) throw new Error(`Missing button: ${text}`);
			return found;
		};
		button('小さな画面でも、予定を見やすく').click(); expect(issue).toHaveBeenCalledWith(sampleIssues[0].id);
		button('すべての予定').click(); expect(navigate).toHaveBeenCalledWith('roadmap');
		button('一覧を見る').click(); expect(navigate).toHaveBeenCalledWith('issues');
		button('申請履歴を見る').click(); expect(ownHistory).toHaveBeenCalled();
		const pending = [...host.querySelectorAll('section')].find(section => section.textContent.includes('確認待ちの絵文字'));
		expect(pending).toBeDefined();
		requiredElement<HTMLButtonElement>('button', pending).click(); expect(approve).toHaveBeenCalledWith(sampleRequests[0]);
	});
	test('the notification example pauses offscreen and on hover, finishes once, and releases its clock', async () => {
		let frameId = 0, now = 0;
		const frames = new Map<number, FrameRequestCallback>();
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
		vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
		const advance = () => { now += 80; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); };
		app = createApp(NotificationPreview, { motion: true }); globals(app); app.mount(host); await flush();
		expect(frames.size).toBeGreaterThan(0); advance();
		requiredElement('[aria-hidden="true"]').dispatchEvent(new Event('pointerenter')); await flush();
		expect(frames.size).toBe(0);
		requiredElement('[aria-hidden="true"]').dispatchEvent(new Event('pointerleave')); await flush();
		expect(frames.size).toBeGreaterThan(0);
		hidden = true; window.document.dispatchEvent(new Event('visibilitychange')); await flush();
		expect(frames.size).toBe(0);
		hidden = false; window.document.dispatchEvent(new Event('visibilitychange')); await flush();
		for (let count = 0; count < 200 && frames.size; count++) { advance(); await flush(); }
		expect(frames.size).toBe(0);
		requiredElement('[aria-hidden="true"]').dispatchEvent(new Event('pointerleave')); await flush();
		expect(frames.size).toBe(0);
		app.unmount(); app = undefined;
		window.document.dispatchEvent(new Event('visibilitychange')); await flush();
		expect(frames.size).toBe(0);
	});
	test('all CSS Module references resolve and the header uses balanced columns inside a centered panel', async () => {
		const folder = path.join(process.cwd(), 'src/components');
		const css = fs.readFileSync(path.join(folder, 'hata-whats-new/release.module.css'), 'utf8');
		const compiled = await compileStyleAsync({ source: css, filename: 'release.module.css', id: 'release', modules: true });
		expect(compiled.errors).toEqual([]);
		const sources = ['MkHataWhatsNew.vue', ...['HataskShowcase.vue', 'HatadyShowcase.vue', 'HataFeedShowcase.vue', 'HataIntroShowcase.vue', 'NotificationPreview.vue'].map(name => `hata-whats-new/${name}`)].map(name => fs.readFileSync(path.join(folder, name), 'utf8')).join('\n');
		const missing = (source: string) => [...source.matchAll(/\$style\.([\w]+)/g)].map(match => match[1]).filter(name => !compiled.modules?.[name]);
		expect(missing(`${sources}\n$style.missingExample`)).toContain('missingExample');
		expect(missing(sources)).toEqual([]);
		const centered = (source: string) => /\.releaseHeader\s*\{[^}]*grid-template-columns:\s*44px minmax\(0, 1fr\) 44px/.test(source) && /\.releaseHeading\s*\{[^}]*justify-content:\s*center/.test(source) && /\.releasePanel\s*\{[^}]*margin:\s*auto/.test(source);
		expect(centered(css.replaceAll('44px minmax(0, 1fr) 44px', '1fr auto'))).toBe(false);
		expect(centered(css)).toBe(true);
		expect(css).toContain('mask-image: linear-gradient(to bottom');
		expect(css).toContain('overflow: clip; container: release-body / size');
	});
});
