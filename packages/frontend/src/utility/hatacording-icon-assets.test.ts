/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const frontendRoot = resolve(process.cwd());
const repositoryRoot = resolve(frontendRoot, '../..');
const iconAssetsRoot = resolve(frontendRoot, 'assets/hatacording/icons');
const assetNotice = readFileSync(resolve(frontendRoot, 'assets/hatacording/NOTICE.md'), 'utf8');
const lucideLicense = readFileSync(resolve(frontendRoot, 'assets/licenses/LUCIDE.txt'), 'utf8');
const pageSource = readFileSync(resolve(frontendRoot, 'src/pages/hatacording-ui.vue'), 'utf8');
const settingsSource = readFileSync(resolve(frontendRoot, 'src/components/HatacordingUiSettings.vue'), 'utf8');
const visibilitySource = readFileSync(resolve(frontendRoot, 'src/components/HatacordingVisibilityPicker.vue'), 'utf8');
const frontendPackage = readFileSync(resolve(frontendRoot, 'package.json'), 'utf8');
const fontNotice = readFileSync(resolve(frontendRoot, 'assets/fonts/NOTICE.md'), 'utf8');
const topLevelLicense = readFileSync(resolve(repositoryRoot, 'LICENSE'), 'utf8');

function webpCanvasSize(buffer: Buffer): { width: number; height: number } {
	const chunkOffset = buffer.indexOf(Buffer.from('VP8X'));
	expect(chunkOffset).toBeGreaterThanOrEqual(0);
	return {
		width: 1 + buffer.readUIntLE(chunkOffset + 12, 3),
		height: 1 + buffer.readUIntLE(chunkOffset + 15, 3),
	};
}

describe('HataSNSCordUIの保管アイコンとLucideライセンス', () => {
	test('生成済みWebPは67枚を保管し、実行UIからは参照しない', () => {
		const files = readdirSync(iconAssetsRoot).filter(file => file.endsWith('.webp')).sort();
		expect(files).toHaveLength(67);
		for (const file of files) {
			const buffer = readFileSync(resolve(iconAssetsRoot, file));
			expect(buffer.subarray(0, 4).toString('ascii')).toBe('RIFF');
			expect(buffer.subarray(8, 12).toString('ascii')).toBe('WEBP');
			expect(buffer.includes(Buffer.from('ALPH'))).toBe(true);
			expect(webpCanvasSize(buffer)).toEqual({ width: 256, height: 256 });
		}
		for (const source of [pageSource, settingsSource, visibilitySource]) {
			expect(source).not.toContain('/client-assets/hatacording/icons/');
			expect(source).not.toContain('HatacordingNavigationIcon');
			expect(source).not.toContain('hatacordingNavigationIcon');
		}
	});

	test('保管アセットNOTICEはライセンスだけを記載する', () => {
		expect(assetNotice).toContain('License: AGPL-3.0-only.');
		expect(assetNotice).not.toMatch(/ImageGen|generated source|SHA-256|prompt|generation/i);
		expect(topLevelLicense).toContain('GNU AFFERO GENERAL PUBLIC LICENSE');
	});

	test('LucideとFeatherのライセンス本文を配布用ファイルへ収録する', () => {
		expect(frontendPackage).toContain('"@lucide/vue"');
		expect(lucideLicense).toContain('ISC License');
		expect(lucideLicense).toContain('Copyright (c) 2026 Lucide Icons and Contributors');
		expect(lucideLicense).toContain('provided that the above\ncopyright notice and this permission notice appear in all copies');
		expect(lucideLicense).toContain('The MIT License (MIT) (for the icons listed above)');
		expect(lucideLicense).toContain('Copyright (c) 2013-present Cole Bemis');
		expect(fontNotice).toContain('../licenses/LUCIDE.txt');
	});
});
