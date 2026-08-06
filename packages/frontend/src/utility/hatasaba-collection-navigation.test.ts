/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('HatasabaUIのリスト・アンテナ選択UI', () => {
	test('通常タイムラインはコレクション表示中にアクティブにならない', () => {
		const ui = source('src/ui/simple.vue');
		expect(ui).toContain('!isCollectionTimelinePage && tab === item.id');
		expect(ui).toContain('if (isCollectionTimelinePage.value) mainRouter.push(\'/\');');
	});

	test('リストとアンテナは名前・切替・設定を同じピルに持つ', () => {
		const ui = source('src/ui/simple.vue');
		expect(ui).toContain('{{ activeListName }}');
		expect(ui).toContain('{{ activeAntennaName }}');
		expect(ui).toContain('toggleTimelinePicker(\'list\')');
		expect(ui).toContain('toggleTimelinePicker(\'antenna\')');
		expect(ui).toContain('openActiveCollectionSettings(\'list\')');
		expect(ui).toContain('openActiveCollectionSettings(\'antenna\')');
		expect(ui).not.toContain('リストを追加・管理');
		expect(ui).not.toContain('アンテナの管理');
	});

	test('項目が無いときは管理画面へ直行せず、空表示とオプションを出す', () => {
		const ui = source('src/ui/simple.vue');
		expect(ui).toContain('else timelinePickerKind.value = \'list\';');
		expect(ui).toContain('else timelinePickerKind.value = \'antenna\';');
		expect(ui).toContain('timelinePickerKind === \'list\' ? \'リストがありません\' : \'アンテナがありません\'');
		expect(ui).toContain('openEmptyCollectionOptions');
		expect(ui).toContain('<span>オプション</span>');
	});

	test('選択ピルはアカウントアイコンを押し下げず、投稿上端に固定バーの余白を確保する', () => {
		const ui = source('src/ui/simple.vue');
		expect(ui).toContain('align-items:flex-start');
		expect(ui).toContain('position:absolute; top:calc(100% + 7px)');
		expect(ui).toContain('[$style.collectionPageContainer]: isCollectionTimelinePage');
		expect(ui).toContain('padding-top:calc(68px + env(safe-area-inset-top,0px))');
	});

	test('モバイル下部ナビは明るい背面でもテーマ前景色と高い面不透明度を使う', () => {
		const ui = source('src/ui/simple.vue');
		expect(ui).toContain('background:color-mix(in srgb,var(--MI_THEME-panel) 92%,transparent)');
		expect(ui).toContain('color:color-mix(in srgb,var(--MI_THEME-fg) 76%,transparent)');
		expect(ui).toContain('90%,');
	});

	test('リスト・アンテナ表示中もモバイル投稿ボタンを残す', () => {
		const ui = source('src/ui/simple.vue');
		expect(ui).toContain('v-if="!isPageView || isCollectionTimelinePage" :class="$style.sideBtn" data-cy-open-post-form');
	});

	test('HatasabaUIではページ側の重複ヘッダーを隠す', () => {
		for (const path of ['src/pages/user-list-timeline.vue', 'src/pages/antenna-timeline.vue']) {
			const page = source(path);
			expect(page).toContain(':popup="isHatasabaUi"');
			expect(page).toContain('miLocalStorage.getItem(\'ui\') === \'simple\'');
		}
	});
});
