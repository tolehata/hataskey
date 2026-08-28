// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import hataSabaSource from '../../components/HatasabaUi2SettingsBody.vue?raw';
import hataCordingSource from '../../components/HatacordingUiSettings.vue?raw';
import hataskSource from '../HataskSettings.vue?raw';
import hatadySource from '../../components/HatadyDisplaySettings.vue?raw';
import previewSource from '../../components/MkHatasabaUi2PreviewWindow.vue?raw';
import hataSnsSource from './HataSNSCordSettingsSurface.vue?raw';
import hataFeedSource from './HataFeedSettingsSurface.vue?raw';
import mobileSource from './SettingsMobileOverview.vue?raw';
import indexSource from './index.vue?raw';

const brandSource = readFileSync(resolve(process.cwd(), 'src/pages/settings-redesign/settings-redesign-brand.scss'), 'utf8');

describe('settings brand coverage', () => {
	test('uses the text-safe Righteous treatment', () => {
		const block = brandSource.match(/(?:^|\r?\n)\s*\.settingsBrandText\s*\{([\s\S]*?)\r?\n\s*\}/u)?.[1];
		expect(block).toBeDefined();
		expect(block).toContain('font-family: \'HataSettingsRighteous\', \'Righteous\'');
		expect(block).not.toContain('white-space');
	});

	test('covers settings surfaces and headings', () => {
		// ⚠️実装は CSS Modules と併用するため :class 配列で付けている。素のclass属性ではない。
		// 旗鯖fork: 右上の「Hataskey UI／デッキ」表示は削除した。
		//   ⚠️ブランド表記の検査は、残っている箇所で担保する。
		expect(indexSource).toContain('settingsBrand');
		expect(mobileSource).toContain('settingsBrandText: hasSettingsBrand(section.description)');
		expect(mobileSource).toContain('settingsBrandText: hasSettingsBrand(activeCategory.description)');
		expect(hataFeedSource).toContain('visualCopy.hatafeedLeaves');
		expect(hataFeedSource).toContain('<span class="settingsBrandText">{{ visualCopy.hatafeedLeavesCaption }}</span>');
		expect(hataSnsSource).toContain('class="settingsBrandText"');
		expect(hataSabaSource).toContain('settingsBrand');
		expect(hataCordingSource).toContain(':class="[$style.note, \'settingsBrandText\']"');
		expect(hataskSource).toContain('<span class="settingsBrandText">{{ copy.title }}</span>');
		expect(hatadySource).toContain('<span class="settingsBrandText"><i class="ti ti-palette"></i> {{ copy.title }}</span>');
		expect(previewSource).toContain('<span v-if="previewTitle.brand" class="settingsBrand">{{ previewTitle.brand }}</span>');
		// 旗鯖fork: ⚠️モックの中には文言を置かない（訳の無い言語で空欄になるため）。
		//   ブランド表記は窓の見出しが受け持つ。
	});
});
