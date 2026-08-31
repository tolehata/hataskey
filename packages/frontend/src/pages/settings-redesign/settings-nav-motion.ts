/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

type PaneSnapshot = { left: number; width: number; paddingInline: string };

function measure(element: HTMLElement): PaneSnapshot {
	const rect = element.getBoundingClientRect();
	return { left: rect.left, width: rect.width, paddingInline: window.getComputedStyle(element).paddingInline };
}

/** Animate the two existing panes, never the grid tracks or a cloned settings form. */
export function createSettingsNavMotion(options: {
	nav: () => HTMLElement | null;
	main: () => HTMLElement | null;
	enabled: () => boolean;
	nextTick: () => Promise<unknown>;
}) {
	let revision = 0;
	let animations: Animation[] = [];

	function cancel(): void {
		revision++;
		for (const animation of animations) animation.cancel();
		animations = [];
	}

	async function transition(update: () => void): Promise<void> {
		const nav = options.nav();
		const main = options.main();
		// Measure the currently displayed intermediate frame BEFORE cancelling it.
		const before = options.enabled() && nav && main ? [measure(nav), measure(main)] : null;
		cancel();
		const current = revision;
		update();
		await options.nextTick();
		if (current !== revision || !options.enabled() || !before || !nav || !main) return;
		if (!nav.isConnected || !main.isConnected || typeof nav.animate !== 'function' || typeof main.animate !== 'function') return;
		const after = [measure(nav), measure(main)];
		if (before.some(frame => frame.width === 0) || after.some(frame => frame.width === 0)) return;
		if (Math.abs(before[0].width - after[0].width) < .5) return;
		const timing = { duration: after[0].width > before[0].width ? 300 : 240, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' as const };
		// Numeric border-box widths avoid incompatible minmax/grid interpolation.
		// Both panes follow the same curve so the gap and right edge stay in place.
		animations = [
			nav.animate([
				{ width: `${before[0].width}px`, paddingInline: before[0].paddingInline },
				{ width: `${after[0].width}px`, paddingInline: after[0].paddingInline },
			], timing),
			main.animate([
				{ width: `${before[1].width}px`, transform: `translateX(${before[1].left - after[1].left}px)` },
				{ width: `${after[1].width}px`, transform: 'translateX(0)' },
			], timing),
		];
		await Promise.all(animations.map(animation => animation.finished.catch(() => undefined)));
		if (current === revision) cancel();
	}

	return { transition, cancel };
}
