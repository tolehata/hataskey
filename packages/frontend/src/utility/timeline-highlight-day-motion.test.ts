/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTimelineHighlightDayMotion } from './timeline-highlight-day-motion.js';

type RecordedAnimation = {
	element: HTMLElement;
	frames: Keyframe[];
	options: KeyframeAnimationOptions;
	animation: Animation;
	complete: () => void;
};

const cleanups: Array<() => void> = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
	vi.restoreAllMocks();
	window.document.body.replaceChildren();
});

function fixture() {
	const stage = window.document.createElement('section');
	const scene = window.document.createElement('div');
	stage.style.boxSizing = 'border-box';
	stage.append(scene);
	window.document.body.append(stage);
	let naturalHeight = 400;
	let renderedHeight: number | null = null;
	let extra = 0;
	let enabled = true;
	let currentScene: HTMLElement | null = scene;
	const records: RecordedAnimation[] = [];
	const installAnimate = (element: HTMLElement) => {
		element.animate = vi.fn((frames, options) => {
			let complete!: () => void;
			// Keep this promise controllable after cancel to exercise late browser callbacks.
			const finished = new Promise<void>(resolve => { complete = resolve; });
			const animation = { finished, cancel: vi.fn() } as unknown as Animation;
			records.push({ element, frames: frames as Keyframe[], options: options as KeyframeAnimationOptions, animation, complete });
			return animation;
		});
	};
	installAnimate(stage);
	installAnimate(scene);
	stage.getBoundingClientRect = () => ({
		height: renderedHeight ?? (stage.style.height ? Number.parseFloat(stage.style.height) + extra : naturalHeight),
	} as DOMRect);
	const motion = createTimelineHighlightDayMotion({ stage: () => stage, scene: () => currentScene, motion: () => enabled });
	cleanups.push(motion.cancel);
	return {
		stage, scene, records, motion, installAnimate,
		setNaturalHeight: (value: number) => { naturalHeight = value; },
		setRenderedHeight: (value: number | null) => { renderedHeight = value; },
		setExtra: (value: number) => { extra = value; },
		setMotion: (value: boolean) => { enabled = value; },
		setScene: (value: HTMLElement | null) => { currentScene = value; },
	};
}

async function settle() {
	for (let index = 0; index < 5; index++) await Promise.resolve();
}

describe('timeline highlight day motion', () => {
	it('holds the old height during a request, then enters at the new natural height', async () => {
		const view = fixture();
		const leave = view.motion.leave(1);
		expect(view.stage.style.height).toBe('400px');
		expect(view.stage.style.overflowX).toBe('hidden');
		expect(view.scene.style.opacity).toBe('0');
		expect(view.records[0].frames).toEqual([
			{ opacity: '1', transform: 'none' },
			{ opacity: '0', transform: 'translateX(-8px)' },
		]);
		expect(view.records[0].options).toMatchObject({ duration: 150, fill: 'forwards' });
		view.records[0].complete();
		await leave;
		expect(view.stage.style.height).toBe('400px');
		expect(view.scene.style.opacity).toBe('0');
		view.setNaturalHeight(720);
		const enter = view.motion.enter();
		expect(view.records[1].frames).toEqual([{ height: '400px' }, { height: '720px' }]);
		expect(view.records[2].frames).toEqual([
			{ opacity: '0', transform: 'translateX(8px)' },
			{ opacity: '1', transform: 'none' },
		]);
		expect(view.records[1].options.duration).toBe(260);
		view.records[1].complete();
		view.records[2].complete();
		await enter;
		expect(view.stage.style.height).toBe('');
		expect(view.stage.style.overflowX).toBe('');
		expect(view.scene.style.opacity).toBe('');
		expect(view.scene.style.transform).toBe('');
		expect(view.records.every(record => vi.mocked(record.animation.cancel).mock.calls.length === 1)).toBe(true);
	});

	it.each(['cancel', 'finish'] as const)('%s settles a pending exit and restores owned inline values and priorities', async method => {
		const view = fixture();
		view.stage.style.setProperty('height', '400px', 'important');
		view.stage.style.setProperty('overflow-x', 'clip', 'important');
		view.stage.style.setProperty('overflow-y', 'scroll');
		view.scene.style.setProperty('opacity', '0.8', 'important');
		view.scene.style.setProperty('transform', 'scale(0.9)', 'important');
		const pending = view.motion.leave(-1);
		view.stage.style.setProperty('--current-theme', 'changed');
		view.scene.style.color = 'red';
		view.motion[method]();
		await pending;
		expect(view.stage.style.height).toBe('400px');
		expect(view.stage.style.getPropertyPriority('height')).toBe('important');
		expect(view.stage.style.overflowX).toBe('clip');
		expect(view.stage.style.getPropertyPriority('overflow-x')).toBe('important');
		expect(view.stage.style.overflowY).toBe('scroll');
		expect(view.scene.style.opacity).toBe('0.8');
		expect(view.scene.style.getPropertyPriority('opacity')).toBe('important');
		expect(view.scene.style.transform).toBe('scale(0.9)');
		expect(view.scene.style.getPropertyPriority('transform')).toBe('important');
		expect(view.stage.style.getPropertyValue('--current-theme')).toBe('changed');
		expect(view.scene.style.color).toBe('red');
		view.records[0].complete();
		await settle();
		expect(view.scene.style.opacity).toBe('0.8');
	});

	it('repeated exits capture the currently painted frame and retire the earlier promise', async () => {
		const view = fixture();
		const first = view.motion.leave(1);
		const readStyle = window.getComputedStyle.bind(window);
		vi.spyOn(window, 'getComputedStyle').mockImplementation(element => element === view.scene
			? { opacity: '0.42', transform: 'matrix(1, 0, 0, 1, -3, 0)' } as CSSStyleDeclaration
			: readStyle(element));
		view.setRenderedHeight(360);
		let latestFinished = false;
		const latest = view.motion.leave(-1).then(() => { latestFinished = true; });
		await first;
		expect(view.records[0].animation.cancel).toHaveBeenCalledTimes(1);
		expect(view.records[1].frames[0]).toEqual({ opacity: '0.42', transform: 'matrix(1, 0, 0, 1, -3, 0)' });
		expect(view.records[1].frames[1]).toEqual({ opacity: '0', transform: 'translateX(8px)' });
		expect(view.stage.style.height).toBe('360px');
		view.records[0].complete();
		await settle();
		expect(latestFinished).toBe(false);
		view.records[1].complete();
		await latest;
		expect(view.stage.style.height).toBe('360px');
	});

	it('late entrance completions cannot restore the styles of a newer exit', async () => {
		const view = fixture();
		const exit = view.motion.leave(1);
		view.records[0].complete();
		await exit;
		const entering = view.motion.enter();
		view.motion.cancel();
		await entering;
		const latest = view.motion.leave(-1);
		view.records[1].complete();
		view.records[2].complete();
		await settle();
		expect(view.stage.style.height).toBe('400px');
		expect(view.scene.style.opacity).toBe('0');
		view.records[3].complete();
		await latest;
		view.motion.finish();
		expect(view.stage.style.height).toBe('');
	});

	it.each(['reduced motion', 'missing WAAPI'] as const)('keeps request geometry without waiting for %s', async fallback => {
		const view = fixture();
		if (fallback === 'reduced motion') view.setMotion(false);
		else Object.defineProperty(view.scene, 'animate', { value: undefined });
		await view.motion.leave(1);
		expect(view.records).toHaveLength(0);
		expect(view.stage.style.height).toBe('400px');
		expect(view.scene.style.opacity).toBe('0');
		view.setNaturalHeight(250);
		await view.motion.enter();
		expect(view.records).toHaveLength(0);
		expect(view.stage.style.height).toBe('');
		expect(view.scene.style.opacity).toBe('');
	});

	it('finish during an entrance releases both animations and resolves its wait', async () => {
		const view = fixture();
		const exit = view.motion.leave(1);
		view.records[0].complete();
		await exit;
		const entering = view.motion.enter();
		view.setMotion(false);
		view.motion.finish();
		await entering;
		expect(view.records[1].animation.cancel).toHaveBeenCalledTimes(1);
		expect(view.records[2].animation.cancel).toHaveBeenCalledTimes(1);
		expect(view.stage.style.height).toBe('');
		expect(view.scene.style.opacity).toBe('');
	});

	it('converts border measurements into content-box heights without adding padding twice', async () => {
		const view = fixture();
		view.stage.style.boxSizing = 'content-box';
		view.stage.style.paddingTop = '10px';
		view.stage.style.paddingBottom = '10px';
		view.stage.style.borderTop = '2px solid red';
		view.stage.style.borderBottom = '2px solid red';
		view.setExtra(24);
		const exit = view.motion.leave(1);
		expect(view.stage.style.height).toBe('376px');
		view.records[0].complete();
		await exit;
		view.setNaturalHeight(300);
		const entering = view.motion.enter();
		expect(view.records[1].frames).toEqual([{ height: '376px' }, { height: '276px' }]);
		view.motion.finish();
		await entering;
		expect(view.stage.style.paddingTop).toBe('10px');
	});

	it('restores the outgoing scene when DOM commit replaces it and animates the new scene', async () => {
		const view = fixture();
		const exit = view.motion.leave(-1);
		view.records[0].complete();
		await exit;
		const next = window.document.createElement('div');
		next.style.opacity = '0.7';
		view.installAnimate(next);
		view.stage.replaceChildren(next);
		view.setScene(next);
		const entering = view.motion.enter();
		expect(view.scene.style.opacity).toBe('');
		expect(view.records[2].element).toBe(next);
		expect(view.records[2].frames).toEqual([
			{ opacity: '0', transform: 'translateX(-8px)' },
			{ opacity: '0.7', transform: 'none' },
		]);
		view.motion.cancel();
		await entering;
		expect(next.style.opacity).toBe('0.7');
	});

	it('a missing scene retires a pending request and releases the old elements', async () => {
		const view = fixture();
		const pending = view.motion.leave(1);
		view.setScene(null);
		await view.motion.enter();
		await pending;
		expect(view.stage.style.height).toBe('');
		expect(view.scene.style.opacity).toBe('');
	});

	it('an animation API failure does not strand a hidden scene or pending entrance', async () => {
		const view = fixture();
		const exit = view.motion.leave(1);
		view.records[0].complete();
		await exit;
		view.scene.animate = vi.fn(() => { throw new Error('WAAPI unavailable'); });
		await view.motion.enter();
		expect(view.records[1].animation.cancel).toHaveBeenCalledTimes(1);
		expect(view.stage.style.height).toBe('');
		expect(view.scene.style.opacity).toBe('');
	});
});
