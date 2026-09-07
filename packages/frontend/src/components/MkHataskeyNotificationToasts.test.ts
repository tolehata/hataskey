/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, createApp, defineComponent, h, nextTick, ref } from 'vue';
import * as Vue from 'vue';
import { compileTemplate, parse } from '@vue/compiler-sfc';
import type { App } from 'vue';
import type { entities } from 'cherrypick-js';
import { createHataskeyNotificationToasts } from '@/utility/hataskey-notification-toast.js';
import { notificationToastsSuppressed } from '@/utility/notification-toast-suppression.js';
import { prefer } from '@/preferences.js';
import { mainRouter } from '@/router.js';
import { popups } from '@/os.js';
import MkHataskeyNotificationToasts from '@/components/MkHataskeyNotificationToasts.vue';
import { createHataskeyTimelineNewNotes } from '@/utility/hataskey-timeline-new-notes.js';
import simpleSource from '@/ui/simple.vue?raw';

vi.mock('@/preferences.js', async () => {
	const { ref } = await import('vue');
	return { prefer: { s: { animation: false, 'external.host': 'external.test', 'external.disableNotificationToast': false }, r: { animation: ref(false), useBlurEffect: ref(true), 'external.disableNotificationToast': ref(false) } } };
});
vi.mock('@/os.js', async () => ({ popups: (await import('vue')).ref([]) }));
vi.mock('@/router.js', () => ({ mainRouter: { push: vi.fn() } }));
vi.mock('@/utility/external-api.js', () => ({ getExternalEmojiUrlMapForHost: () => ({}) }));
vi.mock('@/components/MkReactionIcon.vue', () => ({ default: { template: '<span>reaction</span>' } }));
vi.mock('@/components/MkNotification.vue', () => ({ default: { props: ['notification'], template: '<p>{{ notification.id }}</p>' } }));
vi.mock('@/i18n.js', async () => {
	const { readFileSync } = await import('node:fs');
	const { resolve } = await import('node:path');
	const { load } = await import('js-yaml');
	return { i18n: { ts: load(readFileSync(resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8')) } };
});

let app: App | undefined;
let frameCallback: FrameRequestCallback | undefined;
const note = (id: string): entities.Notification => ({ id, type: 'test', createdAt: '2026-09-07T00:00:00Z' });

beforeEach(() => {
	frameCallback = undefined;
	prefer.r.animation.value = false;
	vi.useFakeTimers();
	vi.spyOn(performance, 'now').mockReturnValue(0);
	vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
		frameCallback = now => { vi.mocked(performance.now).mockReturnValue(now); callback(now); };
		return 1;
	}));
	vi.stubGlobal('cancelAnimationFrame', vi.fn());
	vi.spyOn(window.document, 'hidden', 'get').mockReturnValue(false);
	vi.stubGlobal('ResizeObserver', class {
		observe() { /* Geometry is tested separately; happy-dom has no layout. */ }
		disconnect() { /* No browser observer is allocated. */ }
	});
	notificationToastsSuppressed.value = false;
	prefer.s['external.disableNotificationToast'] = false;
	prefer.r['external.disableNotificationToast'].value = false;
	popups.value = [];
});
afterEach(() => {
	app?.unmount();
	app = undefined;
	window.document.body.innerHTML = '';
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

function mount(mobile = false, navbar = true, withNewNotes = false, preloaded = false) {
	const visible = ref(navbar);
	const newNotes = createHataskeyTimelineNewNotes(() => 'home');
	const owner = Symbol('home');
	const showNewNotes = vi.fn(() => newNotes.update(owner, undefined, null));
	const updateNewNotes = (count: number) => newNotes.update(owner, 'home', { text: `${count}個の新しいノートがあります`, icon: 'ti ti-arrow-up', show: showNewNotes });
	const context = createHataskeyNotificationToasts(computed(() => mobile), computed(() => visible.value || newNotes.notice.value != null));
	if (preloaded) context.enqueue(note('preloaded'), 'local', 0);
	const bar = window.document.createElement('nav');
	const target = window.document.createElement('div');
	bar.append(target);
	window.document.body.append(bar);
	context.target.value = target;
	context.outline.value = bar;
	const root = window.document.createElement('div');
	window.document.body.append(root);
	// Compile the actual navbar row and click handler, alongside the real toast host.
	const parsed = parse(simpleSource).descriptor.template!.ast!;
	type Node = typeof parsed.children[number];

	function findRow(nodes: Node[]): string | undefined {
		for (const node of nodes) {
			if (node.type !== 1) continue;
			if (node.props.some(prop => prop.type === 7 && prop.name === 'bind' && prop.exp?.type === 4 && prop.exp.content === '$style.newNotesViewport')) return node.loc.source;
			const found = findRow(node.children);
			if (found) return found;
		}
		return undefined;
	}

	const row = findRow(parsed.children);
	if (!row) throw new Error('Missing native navbar new-notes row');
	const compiled = compileTemplate({ source: row, filename: 'simple.vue', id: 'new-notes-row', compilerOptions: { mode: 'function' } });
	if (compiled.errors.length > 0) throw new Error(String(compiled.errors));
	const handler = simpleSource.match(/function showNavbarNewNotes\(\) \{[^}]+\}/)?.[0];
	if (!handler) throw new Error('Missing native navbar new-notes handler');
	const NewNotesRow = defineComponent({
		setup: () => ({
			navbarNewNotes: newNotes.notice,
			showNavbarNewNotes: new Function('showTopBar', 'navbarNewNotes', `${handler}; return showNavbarNewNotes;`)(visible, newNotes.notice),
			isDesktop: !mobile, newNotesButtonEl: ref(null),
		}),
		render: new Function('Vue', compiled.code)(Vue),
	});
	app = createApp(defineComponent({ setup: () => () => [
		h(MkHataskeyNotificationToasts, { context }),
		withNewNotes ? h(Vue.Teleport, { to: bar }, h(NewNotesRow)) : null,
	] }));
	app.config.globalProperties.$style = { newNotesViewport: 'new-notes-viewport', newNotesContent: 'new-notes-content', newNotesButton: 'new-notes-button' };
	app.component('Mfm', { props: ['text'], template: '<span>{{ text }}</span>' });
	app.component('MkAvatar', { props: ['user'], template: '<span/>' });
	app.mount(root);
	return { context, bar, target, visible, newNotes, updateNewNotes, showNewNotes };
}

describe('Hataskey notification host', () => {
	it.each([true, false])('expires at five seconds even without animation frames (mobile=%s)', async (mobile) => {
		prefer.r.animation.value = true;
		const start = Date.now();
		vi.mocked(performance.now).mockImplementation(() => Date.now() - start);
		const { context, bar } = mount(mobile);
		context.enqueue(note('no-frames'), 'local');
		await nextTick();
		await vi.advanceTimersByTimeAsync(2000);
		expect(bar.querySelector('path')?.getAttribute('stroke-dashoffset')).toBe('0.6');
		await vi.advanceTimersByTimeAsync(2999);
		expect(context.items.value).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(context.items.value).toHaveLength(0);
		await vi.advanceTimersByTimeAsync(350);
		expect(bar.querySelector('article')).toBeNull();
	});

	it('cleans up pending close and clock timers when the host unmounts', async () => {
		prefer.r.animation.value = true;
		const { context, bar } = mount(true);
		context.enqueue(note('leaving'), 'local', 0);
		await nextTick();
		context.clear();
		await nextTick();
		app?.unmount();
		app = undefined;
		await vi.advanceTimersByTimeAsync(6000);
		expect(bar.querySelector('article')).toBeNull();
		expect(context.items.value).toHaveLength(0);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('starts the timer for a notification received before the host mounts', async () => {
		const { context } = mount(true, true, false, true);
		expect(requestAnimationFrame).toHaveBeenCalled();
		frameCallback?.(5000);
		await nextTick();
		expect(context.items.value).toHaveLength(0);
	});

	it('does not freeze the countdown or outline behind an unrelated popup', async () => {
		const { context, bar } = mount(true);
		popups.value = [{ id: 1, component: {}, props: {}, events: {} }];
		context.enqueue(note('local'), 'local', 0);
		await nextTick();
		frameCallback?.(2000);
		await nextTick();
		expect(bar.querySelector('path')?.getAttribute('stroke-dashoffset')).toBe('0.6');
		frameCallback?.(5000);
		await nextTick();
		expect(context.items.value).toHaveLength(0);
		expect(bar.querySelector('article')).toBeNull();
	});

	it('does not keep touch hover or touch focus paused after tapping a notification', async () => {
		const { context, target } = mount(true);
		context.enqueue(note('touch'), 'local', 0);
		await nextTick();
		const card = target.querySelector('article');
		const button = card?.querySelector('button');
		if (!card || !button) throw new Error('Missing toast');
		vi.spyOn(button, 'matches').mockReturnValue(false); // Pointer focus has no keyboard focus ring.
		card.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
		button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
		await nextTick();
		frameCallback?.(5000);
		await nextTick();
		expect(context.items.value).toHaveLength(0);
	});

	it('restarts an interrupted frame request when a PWA returns to the foreground', async () => {
		const { context } = mount(true);
		const frames = new Map<number, FrameRequestCallback>();
		let sequence = 0;
		vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
			frames.set(++sequence, callback);
			return sequence;
		}));
		vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
		context.enqueue(note('resume'), 'local', 0);
		await nextTick();
		vi.spyOn(window.document, 'hidden', 'get').mockReturnValue(true);
		window.document.dispatchEvent(new Event('visibilitychange'));
		frames.clear(); // Simulate the old frame not being delivered after suspension.
		vi.mocked(performance.now).mockReturnValue(60000);
		vi.spyOn(window.document, 'hidden', 'get').mockReturnValue(false);
		window.document.dispatchEvent(new Event('visibilitychange'));
		expect(frames.size).toBe(1);
		const callback = frames.values().next().value;
		if (!callback) throw new Error('Missing resumed frame');
		frames.clear();
		vi.mocked(performance.now).mockReturnValue(65000);
		callback(65000);
		await nextTick();
		expect(context.items.value).toHaveLength(0);
	});

	it.each([true, false])('finishes close without waiting forever for animation frames (mobile=%s)', async (mobile) => {
		prefer.r.animation.value = true;
		const { context, updateNewNotes, bar } = mount(mobile, true, true);
		updateNewNotes(2);
		context.enqueue(note('first'), 'local', 0);
		await nextTick();
		context.enqueue(note('second'), 'local', 100);
		await nextTick();
		const button = bar.querySelector<HTMLButtonElement>(`article[data-toast-id="${context.items.value[0].id}"] > button`);
		if (!button) throw new Error('Missing current close button');
		button.click();
		await nextTick();
		expect(context.items.value).toHaveLength(0);
		// No rAF or transitionend is delivered, even for the outgoing replaced card.
		await vi.advanceTimersByTimeAsync(500);
		expect(bar.querySelector('article')).toBeNull();
		expect(bar.querySelector('svg')).toBeNull();
		expect(bar.querySelector('.new-notes-button')?.textContent).toContain('2個');
	});

	it.each([true, false])('removes animated notifications on timeout and close (navbar=%s)', async (navbar) => {
		prefer.r.animation.value = true;
		const start = Date.now();
		vi.mocked(performance.now).mockImplementation(() => Date.now() - start);
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16));
		vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
		const { context } = mount(false, navbar);
		context.enqueue(note('expires'), 'local');
		await nextTick();
		expect(window.document.querySelector('article')).not.toBeNull();
		await vi.advanceTimersByTimeAsync(6000);
		expect(context.items.value).toHaveLength(0);
		expect(window.document.querySelector('article')).toBeNull();
		context.enqueue(note('close'), 'local');
		await nextTick();
		const closeButton = window.document.querySelector<HTMLButtonElement>('article > button');
		if (!closeButton) throw new Error('Missing notification close button');
		closeButton.click();
		await nextTick();
		expect(context.items.value).toHaveLength(0);
		await vi.advanceTimersByTimeAsync(1000);
		expect(window.document.querySelector('article')).toBeNull();
	});

	it.each([true, false])('keeps new notes after a simultaneous toast expires without restarting its timer (mobile=%s)', async (mobile) => {
		const { context, bar, target, updateNewNotes } = mount(mobile, true, true);
		updateNewNotes(3);
		context.enqueue(note('simultaneous'), 'local', 0);
		await nextTick();
		expect(target.querySelector('article')).not.toBeNull();
		expect(bar.querySelector('.new-notes-button')?.textContent).toContain('3個');
		frameCallback?.(2000);
		updateNewNotes(9);
		await nextTick();
		frameCallback?.(5000);
		await nextTick();
		expect(target.querySelector('article')).toBeNull();
		expect(bar.querySelector('.new-notes-button')?.textContent).toContain('9個');
		expect(bar.querySelector('.new-notes-viewport')?.getAttribute('data-active')).toBe('true');
	});

	it('keeps a simultaneous toast in the navbar when the new-notes action clears the queue', async () => {
		const { context, bar, target, visible, updateNewNotes, showNewNotes } = mount(false, false, true);
		updateNewNotes(4);
		context.enqueue(note('still-visible'), 'local', 0);
		await nextTick();
		const card = target.querySelector('article');
		expect(card).not.toBeNull();
		frameCallback?.(1000);
		bar.querySelector<HTMLButtonElement>('.new-notes-button')?.click();
		await nextTick();
		expect(showNewNotes).toHaveBeenCalledOnce();
		expect(visible.value).toBe(true);
		expect(bar.querySelector('.new-notes-viewport')?.getAttribute('data-active')).toBe('false');
		expect(target.querySelector('article')).toBe(card);
		frameCallback?.(3000);
		expect(context.items.value[0].elapsed).toBe(3000);
	});

	it('teleports the same card between the navbar and desktop corner without restarting it', async () => {
		const { context, target, visible, bar } = mount();
		context.enqueue(note('local'), 'local', 0);
		await nextTick();
		const card = target.querySelector('article');
		expect(card).not.toBeNull();
		expect(bar.querySelectorAll('svg path')).toHaveLength(2);
		frameCallback?.(2000);
		await nextTick();
		visible.value = false;
		await nextTick();
		expect(target.querySelector('article')).toBeNull();
		expect(window.document.querySelector('article')).toBe(card);
		expect(card?.querySelectorAll('svg path')).toHaveLength(1);
		expect(context.items.value[0].elapsed).toBe(2000);
		frameCallback?.(5000);
		await nextTick();
		expect(context.items.value).toHaveLength(0);
		expect(window.document.querySelector('article')).toBeNull();
	});
	it('keeps mobile notifications integrated even away from a timeline and replaces local with external', async () => {
		const { context, target } = mount(true, false);
		context.enqueue(note('flower'), 'local', 0);
		await nextTick();
		window.dispatchEvent(new CustomEvent('external-notification', { detail: note('remote') }));
		await nextTick();
		expect(context.items.value.map(item => item.source)).toEqual(['external']);
		expect(target.querySelectorAll('article')).toHaveLength(1);
		expect(target.textContent).toContain('外部通知');
		expect(target.textContent).toContain('external.test');
		(target.querySelector('[role=link]') as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await nextTick();
		expect(mainRouter.push).toHaveBeenCalledWith('/my/external-notifications');
		expect(context.items.value).toHaveLength(0);
	});
	it('pauses on hover and focus, then resumes with the remaining time', async () => {
		const { context, target } = mount();
		context.enqueue(note('local'), 'local', 0);
		await nextTick();
		const card = target.querySelector('article')!;
		card.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
		await nextTick();
		frameCallback?.(4000);
		expect(context.items.value[0].elapsed).toBe(0);
		card.dispatchEvent(new Event('pointerleave'));
		vi.spyOn(card, 'matches').mockReturnValue(true); // Keyboard focus.
		card.dispatchEvent(new FocusEvent('focusin'));
		await nextTick();
		frameCallback?.(7000);
		expect(context.items.value[0].elapsed).toBe(0);
		card.dispatchEvent(new FocusEvent('focusout'));
		await nextTick();
		frameCallback?.(11999);
		expect(context.items.value).toHaveLength(1);
		frameCallback?.(12000);
		expect(context.items.value).toHaveLength(0);
	});
	it('clears suppressed toasts and respects the external-notification switch', async () => {
		const { context } = mount();
		context.enqueue(note('local'), 'local', 0);
		await nextTick();
		notificationToastsSuppressed.value = true;
		await nextTick();
		expect(context.items.value).toHaveLength(0);
		window.dispatchEvent(new CustomEvent('external-notification', { detail: note('suppressed') }));
		expect(context.items.value).toHaveLength(0);
		notificationToastsSuppressed.value = false;
		prefer.s['external.disableNotificationToast'] = true;
		window.dispatchEvent(new CustomEvent('external-notification', { detail: note('disabled') }));
		expect(context.items.value).toHaveLength(0);
	});

	it('discards suspended background time', async () => {
		const { context } = mount();
		context.enqueue(note('local'), 'local', 0);
		await nextTick();
		frameCallback?.(2000);
		vi.mocked(performance.now).mockReturnValue(2000);
		vi.spyOn(window.document, 'hidden', 'get').mockReturnValue(true);
		window.document.dispatchEvent(new Event('visibilitychange'));
		vi.mocked(performance.now).mockReturnValue(20000);
		vi.spyOn(window.document, 'hidden', 'get').mockReturnValue(false);
		window.document.dispatchEvent(new Event('visibilitychange'));
		frameCallback?.(21000);
		expect(context.items.value[0].elapsed).toBe(3000);
		frameCallback?.(23000);
		expect(context.items.value).toHaveLength(0);
	});

	it('uses a stepped countdown when animation is disabled and removes listeners on unmount', async () => {
		const { context, bar } = mount();
		context.enqueue(note('local'), 'local', 0);
		await nextTick();
		frameCallback?.(1499);
		await nextTick();
		expect(bar.querySelector('path')?.getAttribute('stroke-dashoffset')).toBe('0.8');
		app?.unmount();
		app = undefined;
		window.dispatchEvent(new CustomEvent('external-notification', { detail: note('after-unmount') }));
		expect(context.items.value).toHaveLength(0);
		expect(context.height.value).toBe(0);
	});
});
