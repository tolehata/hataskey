/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTimelineHighlightNavigation } from './timeline-highlight-navigation.js';

afterEach(() => {
	vi.restoreAllMocks();
	window.document.body.replaceChildren();
});

function scene() {
	const container = window.document.createElement('div');
	const target = window.document.createElement('div');
	target.tabIndex = 0;
	container.append(target);
	window.document.body.append(container);
	Object.defineProperties(container, { clientHeight: { value: 400 }, scrollHeight: { value: 2200 } });
	container.getBoundingClientRect = () => ({ top: 20 } as DOMRect);
	target.getBoundingClientRect = () => ({ top: 1220 - container.scrollTop } as DOMRect);
	let time = 0;
	let nextId = 0;
	const frames = new Map<number, FrameRequestCallback>();
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++nextId, callback); return nextId; });
	vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
	const tick = (ms: number) => {
		time += ms;
		const pending = [...frames.values()];
		frames.clear();
		pending.forEach(callback => callback(time));
	};
	return { container, target, tick, frames };
}

describe('timeline highlight navigation', () => {
	it('reduced motion reaches the actual note immediately without scheduling frames', () => {
		const s = scene();
		const nav = createTimelineHighlightNavigation({ container: () => s.container, motion: () => false, inset: () => 80 });
		nav.start(() => s.target);
		expect(s.container.scrollTop).toBe(1120);
		expect(nav.state).toBe('arrived');
		expect(s.frames.size).toBe(0);
		expect(window.document.activeElement).toBe(s.target);
		nav.cancel();
	});

	it('wheel interruption cancels pending movement and resume starts at the manual position', () => {
		const s = scene();
		const nav = createTimelineHighlightNavigation({ container: () => s.container, motion: () => true, inset: () => 80 });
		nav.start(() => s.target);
		s.tick(0);
		s.tick(200);
		expect(s.container.scrollTop).toBeGreaterThan(0);
		s.container.dispatchEvent(new WheelEvent('wheel'));
		expect(nav.state).toBe('paused');
		s.container.scrollTop = 350;
		s.tick(2000);
		expect(s.container.scrollTop).toBe(350);
		nav.resume();
		s.tick(0);
		s.tick(2000);
		expect(s.container.scrollTop).toBe(1120);
		expect(nav.state).toBe('arrived');
		nav.cancel();
	});

	it('a replaced journey cannot move or highlight its old target', () => {
		const s = scene();
		const nav = createTimelineHighlightNavigation({ container: () => s.container, motion: () => true });
		nav.start(() => s.target);
		s.tick(0);
		nav.cancel();
		s.tick(2000);
		expect(s.container.scrollTop).toBe(0);
		expect(s.target.hasAttribute('data-highlight-arrival')).toBe(false);
		expect(nav.state).toBe('idle');
	});

	it('pressing a navigation control does not replace it before its click handler runs', () => {
		const s = scene();
		const controls = window.document.createElement('div');
		controls.setAttribute('data-highlight-navigation-controls', '');
		const button = window.document.createElement('button');
		controls.append(button);
		s.container.append(controls);
		const nav = createTimelineHighlightNavigation({ container: () => s.container, motion: () => true });
		nav.start(() => s.target);
		button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
		expect(nav.state).toBe('moving');
		nav.pause();
		expect(nav.state).toBe('paused');
		nav.cancel();
	});

	it('a note removed during the journey stops the animation without reporting arrival', () => {
		const s = scene();
		const nav = createTimelineHighlightNavigation({ container: () => s.container, motion: () => true });
		nav.start(() => s.target);
		s.tick(0);
		s.target.remove();
		s.tick(100);
		expect(nav.state).toBe('missing');
		expect(s.frames.size).toBe(0);
	});

	it('a changed reduced-motion preference finishes on the next frame', () => {
		const s = scene();
		let motion = true;
		const nav = createTimelineHighlightNavigation({ container: () => s.container, motion: () => motion, inset: () => 80 });
		nav.start(() => s.target);
		s.tick(0);
		motion = false;
		s.tick(16);
		expect(s.container.scrollTop).toBe(1120);
		expect(nav.state).toBe('arrived');
		nav.cancel();
	});
});
