/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick, shallowRef } from 'vue';
import { afterEach, describe, expect, test, vi } from 'vitest';
import HataskCommunityGarden from './HataskCommunityGarden.vue';
import type { App } from 'vue';
import type { HataskFlowerView } from './hatask-flower-view.js';

vi.mock('@/components/HataskEmoji.vue', async () => {
	const { defineComponent: component, h: node } = await import('vue');
	return { default: component({ props: { emoji: { type: String, default: '' } }, setup: props => () => node('img', { 'data-test-emoji': props.emoji }) }) };
});

const mounted: { app: App<Element>; container: HTMLDivElement }[] = [];

function flower(id: string, emoji = '🌼'): HataskFlowerView {
	return { id, emoji, name: `お花${id}`, harvestedAt: '2026-09-08T01:00:00.000Z', dateLabel: '9月8日', rare: id === 'rare', isOwner: false };
}

afterEach(() => {
	for (const { app, container } of mounted.splice(0)) { app.unmount(); container.remove(); }
});

function mount(flowers: HataskFlowerView[], twins = false) {
	const values = shallowRef<readonly HataskFlowerView[]>(flowers);
	const selected = shallowRef<string | null>(null);
	const container = window.document.createElement('div');
	window.document.body.append(container);
	const app = createApp(defineComponent({ setup: () => () => h('div', [0, ...(twins ? [1] : [])].map(index => h(HataskCommunityGarden, {
		key: index, flowers: values.value, selectedId: selected.value, label: 'みんなの花壇', theme: 'akatsuki', mode: 'light',
	}, { default: () => h('div', { 'data-test-activity': '' }, '収穫情報') }))) }));
	app.mount(container);
	mounted.push({ app, container });
	return { container, values, selected };
}

describe('HataskCommunityGarden', () => {
	test('uses every real emoji on the current page and keeps the activity slot below the scene', () => {
		const flowers = Array.from({ length: 12 }, (_, index) => flower(String(index), index % 2 ? '🪻' : '🌷'));
		const { container } = mount(flowers);
		expect([...container.querySelectorAll('[data-flower-id]')].map(el => el.getAttribute('data-flower-id'))).toEqual(flowers.map(item => item.id));
		expect([...container.querySelectorAll('[data-test-emoji]')].map(el => el.getAttribute('data-test-emoji'))).toEqual(flowers.map(item => item.emoji));
		expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 110 1000 405');
		expect(container.querySelector('[data-test-activity]')?.closest('svg')).toBeNull();
		expect(container.querySelector('[data-hatask-community-garden]')?.lastElementChild?.textContent).toBe('収穫情報');
	});

	test('two gardens have disjoint paint references which resolve in their own instance', () => {
		const { container } = mount([flower('rare')], true);
		const gardens = [...container.querySelectorAll('[data-hatask-community-garden]')];
		const allIds = [...container.querySelectorAll('[id]')].map(el => el.id);
		expect(new Set(allIds).size).toBe(allIds.length);
		for (const garden of gardens) {
			const ownIds = new Set([...garden.querySelectorAll('[id]')].map(el => el.id));
			const references = [...garden.querySelectorAll('[fill], [filter]')].flatMap(el => [...el.attributes].map(attr => attr.value).filter(value => value.startsWith('url(#')));
			expect(references.length).toBeGreaterThan(5);
			for (const reference of references) expect(ownIds.has(reference.slice(5, -1))).toBe(true);
			expect(ownIds.has(garden.querySelector('svg')?.getAttribute('aria-labelledby') ?? '')).toBe(true);
		}
	});

	test('a page update removes old flowers, updates selected state, and allows an empty page', async () => {
		const { container, values, selected } = mount([flower('old'), flower('rare')]);
		selected.value = 'rare';
		await nextTick();
		expect(container.querySelector('[data-flower-id="rare"]')?.getAttribute('data-selected')).toBe('true');
		values.value = [flower('new', '🪷')];
		await nextTick();
		expect([...container.querySelectorAll('[data-flower-id]')].map(el => el.getAttribute('data-flower-id'))).toEqual(['new']);
		values.value = [];
		await nextTick();
		expect(container.querySelectorAll('[data-flower-id]')).toHaveLength(0);
		expect(container.querySelector('[data-test-activity]')).not.toBeNull();
	});
});
