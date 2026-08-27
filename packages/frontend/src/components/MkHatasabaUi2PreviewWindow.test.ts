/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, reactive } from 'vue';
import type { HatasabaUi2Draft } from '@/composables/use-hatasaba-ui2-draft.js';

vi.mock('@/i18n.js', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const yaml = await import('js-yaml');
	const { I18n } = await import('@@/js/i18n.js');
	const locale = yaml.load(fs.readFileSync(path.resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8'));
	return { i18n: new I18n(locale as any) };
});

// 旗鯖fork: プレビューはウィンドウではなくモーダルになった。
// ⚠️MkWindow は initialWidth=680 の固定幅で、モバイルで必ずはみ出していた。
vi.mock('@/components/MkModal.vue', () => ({
	default: defineComponent({
		emits: ['closed', 'click'],
		setup(_, { emit, slots, expose }) {
			expose({ close: () => emit('closed') });
			return () => h('section', { 'data-preview-window': '' }, [slots.default?.()]);
		},
	}),
}));

import MkHatasabaUi2PreviewWindow from './MkHatasabaUi2PreviewWindow.vue';
import previewSource from './MkHatasabaUi2PreviewWindow.vue?raw';

function editorFixture(): HatasabaUi2Draft {
	const write = vi.fn();
	return reactive({
		copy: undefined,
		copyx: undefined,
		draft: {
			editedGlassUi: true,
			editedGlassUiBubble: false,
			editedNormalNoBannerBg: false,
			editedProfileNoBannerBg: false,
			editedOpacity: 55,
			editedDisableBubbleInHatasabaDeck: false,
			editedShowTrendingTab: true,
			editedTopNavMode: false,
			editedDeckIgnoreWidth: false,
			editedTabSwipeEnabled: true,
			editedTopNav: [{ id: 'home', icon: 'ti ti-home', label: 'ホーム', visible: true }],
			editedBottomNav: [{ id: 'home', icon: 'ti ti-home', label: 'ホーム', visible: true }],
		},
		hasChanges: false,
		hasNavChanges: false,
		changeCount: 0,
		HATASABA_BOTTOM_NAV_MAX: 4,
		isBottomNavVisible: true,
		isHatasabaDeckActive: false,
		navDisplayLabel: (item: { label?: string; id: string }) => item.label ?? item.id,
		onOpacityInput: write,
		setOpacity: write,
		setGlassUi: write,
		setGlassUiBubble: write,
		setProfileNoBannerBg: write,
		resetToDefault: write,
		resetTopNav: write,
		resetBottomNav: write,
		setTopNavVisible: write,
		setBottomNavVisible: write,
		moveTopNav: vi.fn(() => false),
		moveBottomNav: vi.fn(() => false),
		openSidebarEditDialog: write,
		onReplayDeckTutorial: write,
		save: write,
		discard: vi.fn(async () => true),
		resetDraftToSnapshot: write,
		restoreLivePreviewToSnapshot: write,
	} as unknown as HatasabaUi2Draft);
}

describe('MkHatasabaUi2PreviewWindow', () => {
	test('gets all user-facing preview copy from the settings redesign namespace', () => {
		for (const literal of [
			'編集中の設定を表示しています。ここでの操作は保存されません',
			'タイムラインタブのプレビュー',
			'デッキ表示',
			'通常表示',
			'設定値は保存するまで変更されません',
			'閉じる',
		]) {
			expect(previewSource).not.toContain(literal);
		}
		expect(previewSource).toContain('copy.ui2.preview.liveNotice');
		expect(previewSource).toContain('const previewTitle = computed');
		expect(previewSource).toContain('<span class="settingsBrand">Hataskey</span>');
		expect(previewSource).toContain('backdrop-filter: var(--MI-blur, blur(18px));');
	});

	test('renders the supplied live editor state and closes without a write', async () => {
		const editor = editorFixture();
		const onClosed = vi.fn();
		const app = createApp(defineComponent({
			setup() {
				return () => h(MkHatasabaUi2PreviewWindow, { editor, motionEnabled: false, onClosed });
			},
		}));
		const container = window.document.createElement('div');
		window.document.body.append(container);
		app.mount(container);

		// ⚠️Teleport で body 直下へ出るため、mount 先ではなく body を見る。
		//   ここが container のままだと、正しく動いていても空に見えて落ちる。
		expect(window.document.body.textContent).toContain('Hataskey UI プレビュー');
		expect(window.document.body.querySelector('[aria-label="タイムラインタブのプレビュー"]')).toBeTruthy();
		expect(window.document.body.querySelector('[data-glass]')?.getAttribute('data-glass')).toBe('on');
		editor.draft.editedOpacity = 31;
		editor.draft.editedGlassUiBubble = true;
		editor.draft.editedDeckIgnoreWidth = true;
		await nextTick();
		const preview = window.document.body.querySelector<HTMLElement>('[data-glass]')!;
		expect(preview.style.getPropertyValue('--preview-opacity')).toBe('31%');
		expect(preview.getAttribute('data-bubble')).toBe('on');
		expect(preview.getAttribute('data-deck')).toBe('on');

		const close = [...window.document.body.querySelectorAll('button')].find(button => button.textContent?.includes('閉じる'))!;
		close.click();
		await nextTick();
		expect(onClosed).toHaveBeenCalledTimes(1);
		expect(editor.save).not.toHaveBeenCalled();
		expect(editor.setOpacity).not.toHaveBeenCalled();
		expect(editor.setGlassUi).not.toHaveBeenCalled();
		expect(editor.setGlassUiBubble).not.toHaveBeenCalled();

		app.unmount();
		container.remove();
	});
});
