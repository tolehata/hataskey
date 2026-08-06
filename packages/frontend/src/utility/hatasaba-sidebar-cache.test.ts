/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('HatasabaUI sidebar cache clear item', () => {
	test('新規設定ではリロードの直後に表示可能な通常項目として置く', () => {
		const def = source('src/preferences/def.ts');
		const reloadIndex = def.indexOf('{ id: \'reload\'');
		const cacheClearIndex = def.indexOf('{ id: \'cacheClear\'');
		expect(reloadIndex).toBeGreaterThan(-1);
		expect(cacheClearIndex).toBeGreaterThan(reloadIndex);
		expect(def.slice(reloadIndex, cacheClearIndex + 120)).toContain('label: \'キャッシュをクリア\'');
		expect(def.slice(reloadIndex, cacheClearIndex + 120)).toContain('group: \'more\'');
	});

	test('既存設定には一度だけ追加し、並び順と表示状態を上書きしない', () => {
		const boot = source('src/boot/common.ts');
		expect(boot).toContain('hata_sidebar_v7_migrated');
		expect(boot).toContain('!current.some(i => i && i.id === \'cacheClear\')');
		expect(boot).toContain('reloadIdx >= 0 ? reloadIdx + 1');
		expect(boot).not.toContain('preferSb7.commit(\'simpleUi.sidebar\', JSON.parse(JSON.stringify(newDefault)))');
	});

	test('サイドメニューから既存のキャッシュ削除処理を呼び出す', () => {
		const ui = source('src/ui/simple.vue');
		expect(ui).toContain('import { clearCache } from \'@/utility/clear-cache.js\';');
		expect(ui).toContain('cacheClear: () => { void clearCache(); }');
	});

	test('必須項目にはせず表示非表示を選べる', () => {
		const editor = source('src/components/MkSidebarEditDialog.vue');
		const requiredLine = editor.match(/const REQUIRED_IDS = new Set\(([^\n]+)\);/)?.[1] ?? '';
		expect(requiredLine).not.toContain('cacheClear');
	});
});
