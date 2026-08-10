/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('旗鯖独自設定の入出力UI', () => {
	test('旗鯖全体タブから入出力モーダルを開ける', () => {
		const page = source('src/pages/settings/hata-custom.vue');
		expect(page).toContain('旗鯖独自設定の一括入出力');
		expect(page).toContain('import(\'@/components/MkHataSettingsTransfer.vue\')');
	});

	test('カテゴリ別チェックボックスと異版警告を備える', () => {
		const modal = source('src/components/MkHataSettingsTransfer.vue');
		const transfer = source('src/utility/hata-settings-transfer.ts');
		expect(modal).toContain('type="checkbox"');
		expect(modal).toContain('異なるバージョンの設定ファイル');
		expect(modal).toContain('合わない設定は個別にスキップ');
		expect(modal).toContain('アカウントのログイン情報や利用記録は設定ファイルに含みません');
		expect(modal).toContain('カスタムフォントURL');
		expect(modal).toContain('非公開RSSや署名付きURL');
		expect(modal).toContain('保存先と共有先を確認してから書き出してください');
		expect(transfer).toContain("id: 'hataSideStudio', label: 'HataSideStudio'");
		expect(transfer).toContain('categories.hataSideStudio =');
	});

	test('HatadyとHataFeedの利用データは設定ファイルへ混ぜず専用画面から書き出す', () => {
		const modal = source('src/components/MkHataSettingsTransfer.vue');
		const hatadyExport = source('src/components/HatadyExportDialog.vue');
		expect(modal).toContain('利用データを個別に書き出す');
		expect(modal).toContain("import('@/components/HatadyExportDialog.vue')");
		expect(modal).toContain("import('@/components/HataFeedExportWindow.vue')");
		expect(modal).toContain("misskeyApi('hata/feedback/available', {})");
		expect(modal).toContain('mine: !availability.isStaff');
		expect(modal).toContain("const projectId = selection.result === '__official__' ? null : (project?.id ?? null)");
		expect(modal).toContain('Hatadyの学習記録とHataFeedのイシューは、下の専用ボタンから個別に保存できます');
		expect(hatadyExport).toContain('.body[data-hatady-theme="paper"]');
		expect(hatadyExport).toContain('.body[data-hatady-theme="espresso"]');
		expect(hatadyExport).toContain('.body[data-hatady-theme="hataskey"]');
		expect(hatadyExport).toContain('background: var(--hy-bg, var(--MI_THEME-bg))');
	});

	test('操作後も上下を維持するリサイズ可能な専用ウィンドウを使う', () => {
		const modal = source('src/components/MkHataSettingsTransfer.vue');
		expect(modal).toContain('<MkWindow');
		expect(modal).toContain('ref="transferWindow"');
		expect(modal).toContain(':canResize="true"');
		expect(modal).toContain(':closeButton="true"');
		expect(modal).not.toContain('<MkModal');
		expect(modal).toContain('data-hata-settings-transfer-window');
		expect(modal).toContain('grid-template-rows: minmax(0, 1fr) auto;');
		expect(modal).toContain('.scrollArea {');
		expect(modal).toMatch(/\.scrollArea\s*\{[^}]*min-height:\s*0;[^}]*overflow:\s*auto;/s);
		expect(modal).not.toMatch(/\.window\s*\{[^}]*contain:/s);
		expect(modal).not.toContain('.window::after {');
		expect(modal).toContain('<template #header>');
		expect(modal).toContain('<footer :class="$style.actionBar">');
		expect(modal).not.toContain('@media');
	});
});
