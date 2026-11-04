/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/** Match the normal UI's timelineEnter / timelineLeave without remounting either view. */
export function createTimelineHighlightTabMotion(options: { motion: () => boolean }) {
	let animation: Animation | null = null;
	let settle: ((completed: boolean) => void) | null = null;
	let generation = 0;

	function stop(completed: boolean) {
		generation++;
		settle?.(completed);
		settle = null;
		animation?.cancel();
		animation = null;
	}

	function play(element: HTMLElement | null, phase: 'leave' | 'enter', direction: -1 | 1): Promise<boolean> {
		stop(false);
		if (!element || !options.motion() || typeof element.animate !== 'function') return Promise.resolve(true);
		const ownGeneration = generation;
		const visible = { opacity: 1, transform: 'translateX(0)' };
		const hidden = { opacity: 0, transform: `translateX(${direction * (phase === 'leave' ? -24 : 24)}px)` };
		try {
			animation = element.animate(phase === 'leave' ? [visible, hidden] : [hidden, visible], {
				duration: phase === 'leave' ? 120 : 180,
				easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both',
			});
		} catch {
			stop(false);
			return Promise.resolve(true);
		}
		const current = animation;
		return new Promise(resolve => {
			settle = resolve;
			void current.finished.then(() => {
				if (ownGeneration !== generation) return;
				settle = null;
				if (phase === 'enter') {
					current.cancel();
					animation = null;
				}
				resolve(true);
			}, () => {
				if (ownGeneration !== generation) return;
				settle = null;
				animation = null;
				resolve(false);
			});
		});
	}

	return { play, cancel: () => stop(false), finish: () => stop(true) };
}
