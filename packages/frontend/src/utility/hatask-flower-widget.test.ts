/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { countFlowerGallery, normalizeFlowerGallery, normalizeGrowingFlower } from './hatask-flower-widget.js';

describe('Hataskお花ウィジェットの保存データ正規化', () => {
	test('成長度を0〜100の範囲に収める', () => {
		expect(normalizeGrowingFlower({ emoji: '🌷', name: 'チューリップ', progress: 140, totalMinutes: -3 })).toMatchObject({
			emoji: '🌷',
			name: 'チューリップ',
			progress: 100,
			totalMinutes: 0,
		});
	});

	test('壊れたデータを表示に混ぜず、指定数以上は表示しない', () => {
		const gallery = normalizeFlowerGallery([
			{ id: 'a', emoji: '🌸', name: 'さくら' },
			null,
			'broken',
			{ id: 'b', emoji: '🌻', name: 'ひまわり' },
		], 1);
		expect(gallery).toHaveLength(1);
		expect(gallery[0].name).toBe('さくら');
		expect(countFlowerGallery([
			{ id: 'a' },
			null,
			'broken',
			{ id: 'b' },
		])).toBe(2);
		expect(normalizeFlowerGallery([{ id: 'a' }], Number.NaN)).toHaveLength(1);
	});
});
