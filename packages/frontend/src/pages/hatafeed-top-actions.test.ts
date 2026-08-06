/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import hatafeedSource from './hatafeed.vue?raw';

describe('HataFeed top actions', () => {
	test('絵文字申請と新規イシューを同じボタンデザインで表示する', () => {
		const topActions = hatafeedSource.match(/<div v-if="activeTab === 'issues'" :class="\$style\.topActions">([\s\S]*?)<\/div>/)?.[1] ?? '';
		expect(topActions.match(/\$style\.topActionEmoji/g)).toHaveLength(2);
		expect(topActions).not.toContain('$style.topActionIssue');
		expect(hatafeedSource).not.toContain('.topActionIssue {');
	});

	test('デスクトップの絵文字申請カラムから複数の未処理申請を連続確認できる', () => {
		expect(hatafeedSource).toContain('v-if="isStaff && emojiRequests.length > 1"');
		expect(hatafeedSource).toContain(':class="$style.sideReviewQueue"');
		expect(hatafeedSource).toContain('@click="openReviewQueue"');
		expect(hatafeedSource).toContain('> まとめて確認</button>');
	});
});
