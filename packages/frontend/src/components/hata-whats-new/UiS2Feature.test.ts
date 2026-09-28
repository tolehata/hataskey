/* SPDX-License-Identifier: AGPL-3.0-only */

import { createApp, h, nextTick, reactive } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UiS2Feature from './UiS2Feature.vue';

type Scene = 0 | 1 | 2 | 3;
const mounted: Array<() => void> = [];

function mountFeature(scene: Scene, motion = false) {
	const host = document.createElement('div');
	document.body.append(host);
	const state = reactive({ scene, motion });
	const app = createApp({ render: () => h(UiS2Feature, state) });
	app.mount(host);
	mounted.push(() => { app.unmount(); host.remove(); });
	const find = <T extends HTMLElement>(selector: string) => {
		const found = host.querySelector<T>(selector);
		if (!found) throw new Error(`Missing ${selector}`);
		return found;
	};
	return { host, state, find };
}

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount();
	vi.useRealTimers();
});

describe('UiS2Feature sample interactions', () => {
	it('opens, expands, splits and closes the PC side page without moving chapters', async () => {
		const { state, find } = mountFeature(1);
		find<HTMLButtonElement>('[data-action="pc-search"]').click();
		await nextTick();
		expect(find('.pcWindow').dataset.mode).toBe('split');
		expect(find<HTMLButtonElement>('[aria-label="動きを減らして表示中"]').getAttribute('aria-pressed')).toBe('false');
		find<HTMLButtonElement>('[data-action="pc-arrow"]').click();
		await nextTick();
		expect(find('.pcWindow').dataset.mode).toBe('full');
		find<HTMLButtonElement>('[data-action="pc-arrow"]').click();
		await nextTick();
		expect(find('.pcWindow').dataset.mode).toBe('split');
		find<HTMLButtonElement>('[data-action="pc-close"]').click();
		await nextTick();
		expect(find('.pcWindow').dataset.mode).toBe('home');
		expect(state.scene).toBe(1);
	});

	it('keeps the search draft when the dock closes and reopens', async () => {
		const { find } = mountFeature(3);
		find<HTMLButtonElement>('.searchArt .dockNav button').click();
		await nextTick();
		expect(find('.searchArt .glassDock').dataset.open).toBe('true');
		const input = find<HTMLInputElement>('.searchPanel input');
		input.value = '景色';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await nextTick();
		find<HTMLButtonElement>('.searchArt .dockNav button').click();
		await nextTick();
		expect(find('.searchArt .glassDock').dataset.open).toBe('false');
		find<HTMLButtonElement>('.searchArt .dockNav button').click();
		await nextTick();
		expect(find<HTMLInputElement>('.searchPanel input').value).toBe('景色');
	});

	it('resets the sample state on replay and stops its clock on unmount', async () => {
		vi.useFakeTimers();
		const { find } = mountFeature(1, true);
		find<HTMLButtonElement>('[data-action="pc-search"]').click();
		await nextTick();
		find<HTMLButtonElement>('[aria-label="この章をもう一度再生"]').click();
		await nextTick();
		expect(find('.pcWindow').dataset.mode).toBe('home');
		expect(find<HTMLButtonElement>('[aria-label="デモを一時停止"]').getAttribute('aria-pressed')).toBe('true');
		expect(vi.getTimerCount()).toBeGreaterThan(0);
		mounted.splice(0).forEach(unmount => unmount());
		expect(vi.getTimerCount()).toBe(0);
	});

	it('pauses while hidden and keeps the user’s paused intent on return', async () => {
		vi.useFakeTimers();
		let hidden = false;
		vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
		const { find } = mountFeature(1, true);
		vi.advanceTimersByTime(650);
		await nextTick();
		expect(find('.feature').dataset.demoPhase).toBe('1:0');
		hidden = true;
		document.dispatchEvent(new Event('visibilitychange'));
		vi.advanceTimersByTime(5000);
		await nextTick();
		expect(find('.feature').dataset.demoPhase).toBe('1:0');
		hidden = false;
		document.dispatchEvent(new Event('visibilitychange'));
		vi.advanceTimersByTime(1230);
		await nextTick();
		expect(find('.feature').dataset.demoPhase).toBe('1:1');
		find<HTMLButtonElement>('[aria-label="デモを一時停止"]').click();
		await nextTick();
		hidden = true;
		document.dispatchEvent(new Event('visibilitychange'));
		hidden = false;
		document.dispatchEvent(new Event('visibilitychange'));
		vi.advanceTimersByTime(5000);
		await nextTick();
		expect(find('.feature').dataset.demoPhase).toBe('1:1');
		expect(find<HTMLButtonElement>('[aria-label="デモを再生"]').getAttribute('aria-pressed')).toBe('false');
	});
});
