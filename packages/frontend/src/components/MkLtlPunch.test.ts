/* SPDX-FileCopyrightText: hataskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, reactive } from 'vue';
import MkLtlPunch from './MkLtlPunch.vue';
import type { LtlPunchState } from '@/utility/hata-ltl-punch.js';

const mocks = vi.hoisted(() => ({ send: vi.fn(), dispose: vi.fn(), receive: null as ((state: LtlPunchState | null) => void) | null }));
vi.mock('@/stream.js', () => ({ useStream: () => ({
	useChannel: () => ({ on: (_name: string, listener: (state: LtlPunchState | null) => void) => { mocks.receive = listener; }, send: mocks.send, dispose: mocks.dispose }),
	on: vi.fn(), off: vi.fn(),
}) }));

const initial: LtlPunchState = { id: 'event', revision: 1, startedAt: 10000, fallAt: 13200, endsAt: 49200, finishedAt: null, status: 'active', hp: 240, maxHp: 240, people: 8, serverNow: 10000 };
let app: ReturnType<typeof createApp> | null = null;
let frames: FrameRequestCallback[] = [];

async function flushFrame(): Promise<void> {
	frames.splice(0).forEach(frame => frame(performance.now()));
	await nextTick(); await nextTick();
}

function mount() {
	const navbar = window.document.createElement('header'), timeline = window.document.createElement('section'), host = window.document.createElement('div');
	navbar.innerHTML = '<div id="punch-slot"></div>';
	timeline.innerHTML = '<article data-note-removal-id="one"><button id="enabled">React</button><button id="disabled" disabled>Disabled</button></article>';
	Object.defineProperty(navbar, 'getBoundingClientRect', { value: () => ({ left: 0, right: 500, top: 0, bottom: 80, width: 500, height: 80 }) });
	Object.defineProperty(timeline, 'getBoundingClientRect', { value: () => ({ left: 0, right: 500, top: 80, bottom: 640, width: 500, height: 560 }) });
	window.document.body.append(navbar, timeline, host);
	const props = reactive({ active: true, navbarTarget: navbar.firstElementChild as HTMLElement, navbarFrame: navbar, timelineRoot: timeline as HTMLElement | null, viewportTarget: timeline, animationEnabled: true });
	app = createApp({ render: () => h(MkLtlPunch, props) }); app.mount(host);
	return { props, navbar, timeline };
}

beforeEach(() => {
	vi.useFakeTimers(); vi.setSystemTime(10000); mocks.send.mockClear(); mocks.dispose.mockClear(); frames = [];
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
	vi.stubGlobal('cancelAnimationFrame', () => { frames = []; });
	vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { app?.unmount(); app = null; window.document.body.replaceChildren(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('LTL punch lifecycle and operation guard', () => {
	it('guards new note controls without changing disabled state and disposes when inactive', async () => {
		const { props, timeline, navbar } = mount();
		mocks.receive?.(initial); await flushFrame();
		expect(timeline.inert).toBe(true);
		expect((timeline.querySelector('#enabled') as HTMLButtonElement).disabled).toBe(false);
		const added = window.document.createElement('button'); timeline.append(added); await nextTick(); await nextTick();
		expect(added.disabled).toBe(false);
		const click = vi.fn(); added.addEventListener('click', click);
		const event = new MouseEvent('click', { bubbles: true, cancelable: true }); added.dispatchEvent(event);
		expect(click).not.toHaveBeenCalled(); expect(event.defaultPrevented).toBe(true);
		expect(navbar.dataset.ltlPunchPhase).toBe('charging');
		props.active = false; await nextTick();
		expect(timeline.inert).toBe(false);
		expect((timeline.querySelector('#enabled') as HTMLButtonElement).disabled).toBe(false);
		expect((timeline.querySelector('#disabled') as HTMLButtonElement).disabled).toBe(true);
		expect(added.disabled).toBe(false);
		expect(navbar.hasAttribute('data-ltl-punch-phase')).toBe(false);
		expect(mocks.dispose).toHaveBeenCalledOnce();
	});
	it('preserves a Vue disabled update that arrives while the operation guard is active', async () => {
		const { props, timeline } = mount(); mocks.receive?.(initial); await flushFrame();
		const button = timeline.querySelector('#disabled') as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		button.disabled = false;
		props.active = false; await nextTick();
		expect(button.disabled).toBe(false);
	});
	it('does not show an attack button during preparation and sends server attack only during falling', async () => {
		mount(); mocks.receive?.(initial); await flushFrame();
		expect(window.document.querySelector('.hata-ltl-punch-fist')).toBeNull();
		vi.setSystemTime(13200); await flushFrame();
		(window.document.querySelector('.hata-ltl-punch-fist') as HTMLButtonElement).click();
		expect(mocks.send).toHaveBeenCalledWith('attack', { eventId: 'event', requestId: expect.any(String) });
	});
	it('keeps an empty LTL attackable and protects notes as soon as the root appears', async () => {
		const { props, timeline } = mount(); props.timelineRoot = null; await nextTick();
		mocks.receive?.(initial); await flushFrame();
		vi.setSystemTime(13200); await flushFrame();
		const viewport = window.document.querySelector('.hata-ltl-punch-viewport') as HTMLElement;
		expect(viewport.style.height).toBe('560px');
		(window.document.querySelector('.hata-ltl-punch-fist') as HTMLButtonElement).click();
		expect(mocks.send).toHaveBeenCalledWith('attack', expect.objectContaining({ eventId: 'event' }));
		props.timelineRoot = timeline; await nextTick();
		expect(timeline.inert).toBe(true);
		expect((timeline.querySelector('#enabled') as HTMLButtonElement).disabled).toBe(false);
	});
	it('releases guards on a missing sync response without declaring a local result', async () => {
		const { timeline } = mount(); mocks.receive?.(initial); await flushFrame();
		await vi.advanceTimersByTimeAsync(20000);
		expect(timeline.inert).toBe(false);
		expect(window.document.querySelector('.hata-ltl-punch-nav')).toBeNull();
		expect(frames).toHaveLength(0);
	});
});
