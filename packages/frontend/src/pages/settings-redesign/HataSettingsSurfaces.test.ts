/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick } from 'vue';
import { afterEach, describe, expect, test, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ leaves: { value: false, __v_isRef: true } }));

vi.mock('@/components/HatacordingUiSettings.vue', () => ({ default: defineComponent({
	props: { accountId: String },
	template: '<div data-hatacording-ui-settings>account={{ accountId }}</div>',
}) }));
vi.mock('@/components/MkSwitch.vue', () => ({ default: defineComponent({
	emits: ['update:modelValue'],
	template: '<button type="button" data-leaves-switch @click="$emit(\'update:modelValue\', true)"><slot name="label"/><slot name="caption"/></button>',
}) }));
vi.mock('@/i.js', () => ({ ensureSignin: () => ({ id: 'account-1' }) }));
vi.mock('@/preferences.js', () => ({ prefer: { model: (key: string) => { if (key !== 'hatafeed.leaves') throw new Error(`unexpected preference: ${key}`); return fixture.leaves; } } }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: { _hata: {
	_customSettings: {
		_ui: { hataSnsCordUiSettings: 'HataSNSCordUI の設定', hataSnsCordUiDescriptionPrefix: '説明', hataSnsCordUiSync: '同期', hataSnsCordUiDescriptionSuffix: 'します' },
		_visual: { hatafeedLeaves: '若葉を舞わせる', hatafeedLeavesCaption: '背景に表示します' },
	},
} } } }));

import HataSNSCordSettingsSurface from './HataSNSCordSettingsSurface.vue';
import HataFeedSettingsSurface from './HataFeedSettingsSurface.vue';

const mounted: Array<{ app: ReturnType<typeof createApp>; container: HTMLDivElement }> = [];

afterEach(() => {
	for (const item of mounted.splice(0)) { item.app.unmount(); item.container.remove(); }
	fixture.leaves.value = false;
});

function mount(component: unknown) {
	const app = createApp(defineComponent({ setup: () => () => h(component as any, { motionEnabled: false }) }));
	const container = window.document.createElement('div');
	window.document.body.append(container);
	app.mount(container);
	mounted.push({ app, container });
	return container;
}

describe('独立Hataskey設定面', () => {
	test('HataSNSCordUI面は既存保存契約のコンポーネントをアカウントID付きでmountする', () => {
		const container = mount(HataSNSCordSettingsSurface);
		expect(container.querySelector('.settingsBrand')?.textContent).toBe('HataSNSCordUI');
		expect(container.querySelector('[data-hatacording-ui-settings]')?.textContent).toContain('account-1');
	});

	test('HataFeed面は既存のhatafeed.leaves preferenceを即時反映する', async () => {
		const container = mount(HataFeedSettingsSurface);
		expect(container.querySelector('.settingsBrand')?.textContent).toBe('HataFeed');
		expect(container.textContent).toContain('若葉を舞わせる');
		(container.querySelector('[data-leaves-switch]') as HTMLButtonElement).click();
		await nextTick();
		expect(fixture.leaves.value).toBe(true);
	});
});
