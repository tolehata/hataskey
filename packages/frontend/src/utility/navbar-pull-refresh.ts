/* SPDX-License-Identifier: AGPL-3.0-only */
import { computed, shallowRef, watch } from 'vue';
import type { InjectionKey, Ref } from 'vue';
import { isHorizontalSwipeSwiping } from '@/utility/touch.js';
import { haptic } from '@/utility/haptic.js';

export type NavbarPullState = {
	phase: 'idle' | 'pulling' | 'ready' | 'returning' | 'refreshing';
	height: number;
	distance: number;
	direction?: 'down' | 'up';
};
const idle = (): NavbarPullState => ({ phase: 'idle', height: 0, distance: 0 });
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
export const navbarPullHeight = (distance: number) => 110 * (1 - Math.exp(-Math.max(0, distance) / 155));

/** A navbar owns one gesture, even when several KeepAlive timelines share it. */
export function createNavbarPullRefresh(enabled: Readonly<Ref<boolean>>, motion: Readonly<Ref<boolean>>) {
	const state = shallowRef<NavbarPullState>(idle());
	const active = computed(() => state.value.phase !== 'idle');
	let owner: symbol | null = null;
	let cancelOwner: (() => void) | undefined;
	const style = computed(() => {
		const fade = smooth((state.value.height - 3) / 54);
		return {
			'--navbar-pull-height': `${state.value.height}px`,
			'--navbar-pull-nav-opacity': String(1 - fade),
			'--navbar-pull-prompt-opacity': String(smooth((state.value.height - 15) / 40)),
			'--navbar-pull-shift': `${-4 * fade}px`,
			'--navbar-pull-turn': `${clamp(state.value.height / navbarPullHeight(120)) * 180}deg`,
		};
	});

	function reset() {
		cancelOwner?.();
		owner = null;
		cancelOwner = undefined;
		state.value = idle();
	}

	const stop = watch(enabled, value => { if (!value) reset(); }, { flush: 'sync' });
	return {
		enabled, motion, state, active, style, reset,
		claim(token: symbol, cancel: () => void) {
			if (!enabled.value || owner != null) return false;
			owner = token;
			cancelOwner = cancel;
			return true;
		},
		update(token: symbol, value: NavbarPullState) { if (owner === token) state.value = value; },
		release(token: symbol) { if (owner === token) { owner = null; cancelOwner = undefined; state.value = idle(); } },
		dispose() { reset(); stop(); },
	};
}
export type NavbarPullRefresh = ReturnType<typeof createNavbarPullRefresh>;
export const navbarPullRefreshKey: InjectionKey<NavbarPullRefresh> = Symbol('navbar-pull-refresh');

type NavbarPullGestureOptions = {
	/** The mobile dock pulls upward and can refresh from any scroll position. */
	direction?: 'down' | 'up';
	canStart?: () => boolean;
	onClaim?: () => void;
};

/** The list and mobile dock share one refresh owner, request and return animation. */
export function attachNavbarPullGesture(root: HTMLElement, scroll: HTMLElement, context: NavbarPullRefresh, refresher: () => Promise<unknown>, options: NavbarPullGestureOptions = {}) {
	const upward = options.direction === 'up';
	const token = Symbol('pull-owner');
	let start: { x: number; y: number } | null = null;
	let owned = false;
	let refreshing = false;
	let distance = 0;
	let height = 0;
	let frame = 0;
	let revision = 0;
	let suppressClickUntil = 0;
	let previousReady = false;
	let oldOverscroll: string | undefined;

	function publish(phase: NavbarPullState['phase']) {
		context.update(token, { phase, height, distance, direction: upward ? 'up' : 'down' });
	}

	function detach() {
		window.removeEventListener('mousemove', moveMouse);
		window.removeEventListener('mouseup', release);
		window.removeEventListener('touchmove', moveTouch);
		window.removeEventListener('touchend', release);
		window.removeEventListener('touchcancel', cancel);
	}

	function restoreScroll() {
		if (oldOverscroll !== undefined) scroll.style.overscrollBehaviorY = oldOverscroll;
		oldOverscroll = undefined;
	}

	function reset() {
		revision++;
		cancelAnimationFrame(frame);
		frame = 0;
		detach();
		restoreScroll();
		start = null;
		owned = false;
		refreshing = false;
		distance = height = 0;
		previousReady = false;
		context.release(token);
	}

	function begin(event: Event, x: number, y: number) {
		if (!context.enabled.value || context.active.value || start || refreshing || !upward && scroll.scrollTop > 1 || options.canStart?.() === false) return false;
		const excluded = upward ? 'input,textarea,select,[contenteditable="true"],[data-timeline-tab-gesture-ignore]' : 'button,a,input,textarea,select,[contenteditable="true"],[data-timeline-tab-gesture-ignore]';
		if (event.target instanceof Element && event.target.closest(excluded)) return false;
		start = { x, y };
		distance = height = 0;
		previousReady = false;
		return true;
	}

	function startMouse(event: MouseEvent) {
		if (event.button !== (upward ? 0 : 1) || !begin(event, event.screenX, event.screenY)) return;
		if (!upward) event.preventDefault();
		window.addEventListener('mousemove', moveMouse);
		window.addEventListener('mouseup', release);
	}

	function startTouch(event: TouchEvent) {
		if (event.touches.length !== 1) { cancel(); return; }
		const point = event.touches[0];
		if (!begin(event, point.screenX, point.screenY)) return;
		window.addEventListener('touchmove', moveTouch, { passive: false });
		window.addEventListener('touchend', release);
		window.addEventListener('touchcancel', cancel);
	}

	function move(event: Event, x: number, y: number) {
		if (!start) return;
		const dy = (y - start.y) * (upward ? -1 : 1);
		const dx = Math.abs(x - start.x);
		if (isHorizontalSwipeSwiping.value || !context.enabled.value || !upward && scroll.scrollTop > 1 || options.canStart?.() === false || (dx > 7 && dx > Math.abs(dy))) { cancel(); return; }
		if (!owned) {
			if (Math.abs(dy) < 7 && dx < 7) return;
			if (dy <= 0 || !context.claim(token, reset)) { reset(); return; }
			owned = true;
			oldOverscroll = scroll.style.overscrollBehaviorY;
			scroll.style.overscrollBehaviorY = 'none';
			options.onClaim?.();
		}
		if (event.cancelable) event.preventDefault();
		distance = Math.min(600, Math.max(0, dy));
		height = navbarPullHeight(distance);
		const ready = distance >= 120;
		if (ready && !previousReady) haptic();
		previousReady = ready;
		publish(ready ? 'ready' : 'pulling');
	}

	function moveMouse(event: MouseEvent) { move(event, event.screenX, event.screenY); }

	function moveTouch(event: TouchEvent) {
		if (event.touches.length !== 1) { cancel(); return; }
		const point = event.touches[0];
		move(event, point.screenX, point.screenY);
	}

	function settle(phase: 'returning' | 'refreshing', done: () => void) {
		let velocity = 0;
		let last = performance.now();
		const began = last;
		const initial = height;
		const tick = (now: number) => {
			const dt = Math.min(Math.max((now - last) / 1000, 0.001), 0.025);
			last = now;
			if (!context.motion.value) height = initial * (1 - clamp((now - began) / 140));
			else { velocity += (-205 * height - 26 * velocity) * dt; height = Math.max(0, height + velocity * dt); }
			publish(phase);
			if ((height < 0.12 && Math.abs(velocity) < 2) || now - began > 1100) {
				height = 0;
				frame = 0;
				publish(phase);
				done();
			} else frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
	}

	function finish(cancelled: boolean) {
		if (!start) return;
		start = null;
		detach();
		if (!owned) { restoreScroll(); return; }
		suppressClickUntil = performance.now() + 350;
		const shouldRefresh = !cancelled && distance >= 120 && context.enabled.value;
		const version = ++revision;
		refreshing = shouldRefresh;
		const phase = shouldRefresh ? 'refreshing' : 'returning';
		publish(phase);
		let settled = false;
		let fetched = !shouldRefresh;
		const complete = () => { if (version === revision && settled && fetched) reset(); };
		settle(phase, () => { settled = true; complete(); });
		if (shouldRefresh) {
			Promise.resolve().then(() => version === revision ? refresher() : undefined)
				.catch(error => { console.error('Timeline refresh failed', error); })
				.finally(() => { fetched = true; complete(); });
		}
	}

	function release() { finish(false); }

	function cancel() { finish(true); }

	function visibility() { if (window.document.hidden) reset(); }

	function suppressClick(event: MouseEvent) {
		if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
	}

	root.addEventListener('mousedown', startMouse);
	root.addEventListener('touchstart', startTouch, { passive: true });
	root.addEventListener('click', suppressClick, true);
	window.addEventListener('blur', cancel);
	window.addEventListener('resize', reset);
	window.document.addEventListener('visibilitychange', visibility);
	return {
		reset,
		dispose() {
			reset();
			root.removeEventListener('mousedown', startMouse);
			root.removeEventListener('touchstart', startTouch);
			root.removeEventListener('click', suppressClick, true);
			window.removeEventListener('blur', cancel);
			window.removeEventListener('resize', reset);
			window.document.removeEventListener('visibilitychange', visibility);
		},
	};
}
