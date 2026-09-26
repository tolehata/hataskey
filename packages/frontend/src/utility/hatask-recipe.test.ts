/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { formatCookingDuration, formatRecipeTimer, parseRecipeTimer, scaleRecipeAmount } from './hatask-recipe.js';
import { i18n } from '@/i18n.js';

vi.mock('@/i18n.js', async () => ({ i18n: (await import('./hatask-test-i18n.js')).createTestHataskI18n() }));

describe('scaleRecipeAmount', () => {
	test('scales plain numbers and keeps the unit', () => {
		expect(scaleRecipeAmount('300g', 1.5)).toBe('450g');
		expect(scaleRecipeAmount('大さじ2', 2)).toBe('大さじ4');
	});

	test('reads and writes kitchen fractions', () => {
		expect(scaleRecipeAmount('小さじ1/2', 2)).toBe('小さじ1');
		expect(scaleRecipeAmount('1/4個', 3)).toBe('3/4個');
		expect(scaleRecipeAmount('1と1/2カップ', 0.5)).toBe('3/4カップ');
		expect(scaleRecipeAmount('大さじ1', 1.5)).toBe('大さじ1と1/2');
	});

	test('accepts historical and localized mixed fractions for another scale', async () => {
		expect(scaleRecipeAmount('1と1/2カップ', 2)).toBe('3カップ');
		const originalLocale = i18n.locale;
		try {
			for (const [language, amount, expected] of [
				['en-US', '1 1/2 cups', '2 1/4 cups'],
				['zh-CN', '1又1/2杯', '2又1/4杯'],
				['zh-TW', '1又1/2杯', '2又1/4杯'],
			] as const) {
				i18n.locale = (await import('./hatask-test-i18n.js')).createTestHataskI18n(language).locale;
				expect(scaleRecipeAmount(amount, 1.5)).toBe(expected);
			}
		} finally {
			i18n.locale = originalLocale;
		}
	});

	test('rounds large quantities to integers and others to one decimal', () => {
		expect(scaleRecipeAmount('100g', 1 / 3)).toBe('33g');
		expect(scaleRecipeAmount('2枚', 0.7)).toBe('1.4枚');
	});

	test('leaves amounts without a quantity untouched', () => {
		expect(scaleRecipeAmount('少々', 2)).toBe('少々');
		expect(scaleRecipeAmount('', 2)).toBe('');
	});

	test('returns the original text at the base servings', () => {
		expect(scaleRecipeAmount('1/4個', 1)).toBe('1/4個');
	});
});

describe('recipe timers', () => {
	test('formats seconds for step chips', () => {
		expect(formatRecipeTimer(600)).toBe('10:00');
		expect(formatRecipeTimer(65)).toBe('01:05');
		expect(formatRecipeTimer(3900)).toBe('1:05:00');
	});

	test('parses minutes or clock text', () => {
		expect(parseRecipeTimer('10')).toBe(600);
		expect(parseRecipeTimer('06:00')).toBe(360);
		expect(parseRecipeTimer('1:05:00')).toBe(3900);
		expect(parseRecipeTimer('')).toBeNull();
		expect(parseRecipeTimer('abc')).toBeNull();
		expect(parseRecipeTimer('0')).toBeNull();
	});

	test('formats measured cooking time', () => {
		expect(formatCookingDuration(28 * 60)).toBe('28分');
		expect(formatCookingDuration(75 * 60)).toBe('1時間15分');
		expect(formatCookingDuration(null)).toBe('');
	});
});
