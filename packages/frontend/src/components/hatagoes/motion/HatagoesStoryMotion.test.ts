/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, describe, expect, test } from 'vitest';
import { createApp } from 'vue';
import { renderHatagoesStory, storyCaptionAt, storySceneAt } from './hatagoes-story-artwork.js';

const mounted: Array<() => void> = [];

function render(time: number, mode: 'light' | 'dark' = 'light', showCharacter = true, loop = false) {
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const app = createApp({ render: () => renderHatagoesStory(mode, time, showCharacter, loop) });
	app.mount(target);
	mounted.push(() => { app.unmount(); target.remove(); });
	return target;
}

afterEach(() => { for (const unmount of mounted.splice(0)) unmount(); });

describe('HataGoes story composition', () => {
	test('keeps the seven scene boundaries and original captions', () => {
		expect([0, 3, 7, 10.5, 13.5, 18.5, 22].map(storySceneAt)).toEqual(['Intro', 'Before', 'Switch', 'Gather', 'One', 'Rebrand', 'Logo']);
		expect(storyCaptionAt(3.3)).toBe('これまでは、予定は Hatask、記録は Hatady、困りごとは HataFeed。');
		expect(storyCaptionAt(22)).toBe('');
	});

	test('renders the original mock screens and SVG geometry as real DOM', () => {
		const view = render(5);
		expect(view.textContent).toContain('企画書を送る');
		expect(view.textContent).toContain('月の郵便室');
		expect(view.textContent).toContain('ロードマップ');
		expect(view.querySelector('svg polygon[stroke-width="4"]')).not.toBeNull();
		expect((view.querySelector('div[style*="width: 520px"]') as HTMLElement | null)?.style.width).toBe('520px');
	});

	test('keeps the completed brand visible on non-loop playback in both themes', () => {
		for (const mode of ['light', 'dark'] as const) {
			const view = render(26.5, mode);
			expect(view.textContent).toContain('3つのアプリを、ひとつのアプリに。');
			expect(view.textContent).toContain('HataGoes');
			expect((view.firstElementChild as HTMLElement).style.background).toBe(mode === 'dark' ? '#17141a' : '#fff7f2');
		}
	});

	test('scopes the wolf to the introduction flag', () => {
		const view = render(9, 'light', false);
		expect(view.querySelector('svg[viewBox="0 0 80 160"]')).toBeNull();
		expect(render(9, 'light', true).querySelector('svg[viewBox="0 0 80 160"]')).not.toBeNull();
	});
});
