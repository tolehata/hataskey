/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTimelineHighlightTabMotion } from './timeline-highlight-tab-motion.js';

type RecordedAnimation = {
	element: HTMLElement;
	frames: Keyframe[];
	options: KeyframeAnimationOptions;
	animation: Animation;
	complete: () => void;
	reject: () => void;
};

const cleanups: Array<() => void> = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
	vi.restoreAllMocks();
	window.document.body.replaceChildren();
});

function fixture() {
	let enabled = true;
	const records: RecordedAnimation[] = [];
	const element = window.document.createElement('section');
	const destination = window.document.createElement('section');
	window.document.body.append(element, destination);
	for (const target of [element, destination]) {
		target.animate = vi.fn((frames, options) => {
			let complete!: () => void;
			let reject!: (error: Error) => void;
			const finished = new Promise<void>((resolve, fail) => { complete = resolve; reject = fail; });
			// Delayed completion remains controllable after cancel to exercise stale callbacks.
			const animation = { finished, cancel: vi.fn() } as unknown as Animation;
			records.push({
				element: target, frames: frames as Keyframe[], options: options as KeyframeAnimationOptions,
				animation, complete, reject: () => reject(new Error('Animation canceled')),
			});
			return animation;
		});
	}
	const motion = createTimelineHighlightTabMotion({ motion: () => enabled });
	cleanups.push(motion.cancel);
	return { element, destination, records, motion, setMotion: (value: boolean) => { enabled = value; } };
}

async function settle() {
	for (let index = 0; index < 4; index++) await Promise.resolve();
}

describe('timeline highlight tab motion', () => {
	it.each([
		['leave', 1, 'translateX(-24px)', 120],
		['leave', -1, 'translateX(24px)', 120],
		['enter', 1, 'translateX(24px)', 180],
		['enter', -1, 'translateX(-24px)', 180],
	] as const)('matches the native %s motion in direction %s', async (phase, direction, offset, duration) => {
		const view = fixture();
		const pending = view.motion.play(view.element, phase, direction);
		const visible = { opacity: 1, transform: 'translateX(0)' };
		const hidden = { opacity: 0, transform: offset };
		expect(view.records[0].frames).toEqual(phase === 'leave' ? [visible, hidden] : [hidden, visible]);
		expect(view.records[0].options).toEqual({ duration, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
		view.records[0].complete();
		await expect(pending).resolves.toBe(true);
		expect(view.records[0].animation.cancel).toHaveBeenCalledTimes(phase === 'leave' ? 0 : 1);
	});

	it('holds a completed exit until the next entrance, without replacing DOM, focus or inline styles', async () => {
		const view = fixture();
		const input = window.document.createElement('textarea');
		input.value = 'Unsent draft';
		view.element.append(input);
		input.focus();
		view.element.style.setProperty('opacity', '0.8', 'important');
		view.element.style.setProperty('transform', 'scale(0.95)', 'important');
		const originalStyle = view.element.getAttribute('style');
		const leave = view.motion.play(view.element, 'leave', 1);
		view.records[0].complete();
		await expect(leave).resolves.toBe(true);
		expect(view.records[0].animation.cancel).not.toHaveBeenCalled();
		expect(view.element.firstElementChild).toBe(input);
		expect(window.document.activeElement).toBe(input);
		expect(input.value).toBe('Unsent draft');
		expect(view.element.getAttribute('style')).toBe(originalStyle);
		const enter = view.motion.play(view.destination, 'enter', 1);
		expect(view.records[0].animation.cancel).toHaveBeenCalledTimes(1);
		expect(view.records[1].element).toBe(view.destination);
		view.records[1].complete();
		await expect(enter).resolves.toBe(true);
		expect(view.records[1].animation.cancel).toHaveBeenCalledTimes(1);
		expect(view.element.firstElementChild).toBe(input);
		expect(window.document.activeElement).toBe(input);
		expect(view.element.getAttribute('style')).toBe(originalStyle);
	});

	it.each([
		['cancel', false], ['finish', true],
	] as const)('%s settles an unfinished animation as %s and releases it immediately', async (method, result) => {
		const view = fixture();
		const pending = view.motion.play(view.element, 'leave', 1);
		view.motion[method]();
		await expect(pending).resolves.toBe(result);
		expect(view.records[0].animation.cancel).toHaveBeenCalledTimes(1);
		view.motion[method]();
		view.records[0].complete();
		await settle();
		expect(view.records[0].animation.cancel).toHaveBeenCalledTimes(1);
	});

	it.each(['complete', 'reject'] as const)('a superseded animation cannot settle or release its replacement after late %s', async late => {
		const view = fixture();
		const previous = view.motion.play(view.element, 'leave', 1);
		let completed: boolean | undefined;
		const next = view.motion.play(view.destination, 'enter', -1).then(value => { completed = value; return value; });
		await expect(previous).resolves.toBe(false);
		expect(view.records[0].animation.cancel).toHaveBeenCalledTimes(1);
		view.records[0][late]();
		await settle();
		expect(completed).toBeUndefined();
		expect(view.records[1].animation.cancel).not.toHaveBeenCalled();
		view.records[1].complete();
		await expect(next).resolves.toBe(true);
		expect(view.records[1].animation.cancel).toHaveBeenCalledTimes(1);
	});

	it('releases a completed exit when canceled before any entrance starts', async () => {
		const view = fixture();
		const pending = view.motion.play(view.element, 'leave', -1);
		view.records[0].complete();
		await pending;
		view.motion.cancel();
		expect(view.records[0].animation.cancel).toHaveBeenCalledTimes(1);
		view.motion.cancel();
		expect(view.records[0].animation.cancel).toHaveBeenCalledTimes(1);
	});

	it('reports external animation cancellation without leaving a pending operation', async () => {
		const view = fixture();
		const pending = view.motion.play(view.element, 'enter', 1);
		view.records[0].reject();
		await expect(pending).resolves.toBe(false);
		const next = view.motion.play(view.destination, 'enter', -1);
		view.records[1].complete();
		await expect(next).resolves.toBe(true);
	});

	it.each(['missing element', 'reduced motion', 'missing WAAPI', 'WAAPI failure'] as const)('finishes immediately for %s while retiring a pending previous animation', async fallback => {
		const view = fixture();
		const previous = view.motion.play(view.element, 'leave', 1);
		let target: HTMLElement | null = view.destination;
		if (fallback === 'missing element') target = null;
		if (fallback === 'reduced motion') view.setMotion(false);
		if (fallback === 'missing WAAPI') Object.defineProperty(view.destination, 'animate', { value: undefined });
		if (fallback === 'WAAPI failure') view.destination.animate = vi.fn(() => { throw new Error('WAAPI unavailable'); });
		await expect(view.motion.play(target, 'enter', 1)).resolves.toBe(true);
		await expect(previous).resolves.toBe(false);
		expect(view.records).toHaveLength(1);
		expect(view.records[0].animation.cancel).toHaveBeenCalledTimes(1);
		view.records[0].complete();
		await settle();
		expect(view.records[0].animation.cancel).toHaveBeenCalledTimes(1);
	});

	it('finish makes a reduced-motion change complete an in-flight entrance', async () => {
		const view = fixture();
		const pending = view.motion.play(view.element, 'enter', -1);
		view.setMotion(false);
		view.motion.finish();
		await expect(pending).resolves.toBe(true);
		expect(view.records[0].animation.cancel).toHaveBeenCalledTimes(1);
		await expect(view.motion.play(view.destination, 'leave', 1)).resolves.toBe(true);
		expect(view.records).toHaveLength(1);
	});
});
