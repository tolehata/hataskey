/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { hataskEmojiSources } from './hatask-emoji.js';

function readFrontendFile(relativePath: string): string {
	return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('hataskEmojiSources', () => {
	test('native設定でもTwemojiから始め、OSネイティブ描画を返さない', () => {
		expect(hataskEmojiSources('🌱', 'native')).toEqual([
			'/twemoji/1f331.svg',
			'/fluent-emoji/1f331.png',
			'/client-assets/unknown.png',
		]);
	});

	test('Fluent設定ではFluentを優先し、Twemojiへ画像フォールバックする', () => {
		expect(hataskEmojiSources('☀️', 'fluentEmoji')).toEqual([
			'/fluent-emoji/2600.png',
			'/twemoji/2600.svg',
			'/client-assets/unknown.png',
		]);
	});

	test('Hatask本体・花ウィジェット・HataSideStudioで動的絵文字を画像描画する', () => {
		const sources = [
			'src/pages/hatask.vue',
			'src/widgets/WidgetHataskFlowers.vue',
			'src/components/HataSideStudioFlowers.vue',
		].map(readFrontendFile);

		for (const source of sources) {
			expect(source).toContain('<HataskEmoji');
			const directEmojiInterpolations = source.match(/\{\{[^}]*(?:emoji|Emoji)[^}]*\}\}/g) ?? [];
			expect(directEmojiInterpolations.every((match) => match.includes('copy.emoji'))).toBe(true);
		}
	});

	test('専用コンポーネントは画像が全滅してもOSネイティブ絵文字へ戻さない', () => {
		const component = readFrontendFile('src/components/HataskEmoji.vue');
		expect(component).toContain('v-if="!allSourcesFailed"');
		expect(component).toContain('v-else class="ti ti-icons-off"');
		expect(component).not.toContain('{{ emoji }}');
	});
});
