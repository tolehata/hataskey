/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type TimelineHighlightNavigationState = 'idle' | 'moving' | 'paused' | 'arrived' | 'missing';

/** Scroll only through mounted timeline content; never synthesize historical distance. */
export function createTimelineHighlightNavigation(options: {
	container: () => HTMLElement | null;
	motion: () => boolean;
	inset?: () => number;
	onState?: (state: TimelineHighlightNavigationState) => void;
}) {
	let state: TimelineHighlightNavigationState = 'idle';
	let target: (() => HTMLElement | null) | null = null;
	let frame: number | null = null;
	let cleanupInput: (() => void) | null = null;
	let arrival: HTMLElement | null = null;
	let arrivalMarker: HTMLElement | null = null;
	let arrivalTimer: number | null = null;
	let temporaryTabIndex: HTMLElement | null = null;

	function setState(next: TimelineHighlightNavigationState) {
		state = next;
		options.onState?.(next);
	}

	function stopFrame() {
		if (frame != null) window.cancelAnimationFrame(frame);
		frame = null;
		cleanupInput?.();
		cleanupInput = null;
	}

	function clearArrival() {
		if (arrivalTimer != null) window.clearTimeout(arrivalTimer);
		arrivalTimer = null;
		arrival?.removeAttribute('data-highlight-arrival');
		arrival = null;
		arrivalMarker?.remove();
		arrivalMarker = null;
		temporaryTabIndex?.removeAttribute('tabindex');
		temporaryTabIndex = null;
	}

	function pause() {
		if (state !== 'moving') return;
		stopFrame();
		setState('paused');
	}

	function resume() {
		stopFrame();
		const container = options.container();
		if (!container || !target) return;
		const first = target();
		if (!first?.isConnected || !container.contains(first)) {
			setState('missing');
			return;
		}
		const start = container.scrollTop;
		let started: number | null = null;
		let duration: number | null = null;
		setState('moving');
		const isControl = (event: Event) => event.target instanceof Element && !!event.target.closest('[data-highlight-navigation-controls]');
		const pointerInput = (event: Event) => { if (!isControl(event)) pause(); };
		const keydown = (event: KeyboardEvent) => {
			if (event.key === ' ' && isControl(event)) return;
			if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape', 'Tab'].includes(event.key)) pause();
		};
		container.addEventListener('wheel', pause, { passive: true });
		container.addEventListener('touchstart', pointerInput, { passive: true });
		container.addEventListener('pointerdown', pointerInput, { passive: true });
		container.addEventListener('keydown', keydown);
		cleanupInput = () => {
			container.removeEventListener('wheel', pause);
			container.removeEventListener('touchstart', pointerInput);
			container.removeEventListener('pointerdown', pointerInput);
			container.removeEventListener('keydown', keydown);
		};

		const step = (now: number) => {
			frame = null;
			const element = target?.();
			if (!element?.isConnected || !container.contains(element)) {
				stopFrame();
				setState('missing');
				return;
			}
			const destination = Math.max(0, Math.min(
				container.scrollHeight - container.clientHeight,
				container.scrollTop + element.getBoundingClientRect().top - container.getBoundingClientRect().top - (options.inset?.() ?? 72),
			));
			started ??= now;
			duration ??= Math.min(1400, Math.max(320, Math.abs(destination - start) * 0.65));
			const progress = options.motion() ? Math.min(1, (now - started) / duration) : 1;
			container.scrollTop = start + (destination - start) * (1 - (1 - progress) ** 3);
			if (progress < 1) {
				frame = window.requestAnimationFrame(step);
				return;
			}
			stopFrame();
			arrival = element;
			element.setAttribute('data-highlight-arrival', 'true');
			arrivalMarker = window.document.createElement('span');
			arrivalMarker.setAttribute('data-highlight-arrival-marker', '');
			arrivalMarker.setAttribute('aria-hidden', 'true');
			element.append(arrivalMarker);
			const focusTarget = element.matches('[tabindex]') ? element : element.querySelector<HTMLElement>('[tabindex="0"]') ?? element;
			if (!focusTarget.hasAttribute('tabindex')) {
				focusTarget.tabIndex = -1;
				temporaryTabIndex = focusTarget;
			}
			focusTarget.focus({ preventScroll: true });
			arrivalTimer = window.setTimeout(clearArrival, 1800);
			setState('arrived');
		};
		if (options.motion()) frame = window.requestAnimationFrame(step);
		else step(0);
	}

	function cancel() {
		stopFrame();
		clearArrival();
		target = null;
		setState('idle');
	}

	return {
		get state() { return state; },
		start(getTarget: () => HTMLElement | null) {
			cancel();
			target = getTarget;
			resume();
		},
		pause,
		resume,
		cancel,
	};
}
