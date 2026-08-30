/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import source from './simple.vue?raw';

function normalizedTopPadding(selector: string): string | undefined {
	const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return source
		.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*padding-top:\\s*([^;]+);`, 'u'))?.[1]
		.replace(/\s+/gu, '');
}

describe('Hataskey UI foldable layout', () => {
	test('ウィジェット列をノート列と同じ上端から始める', () => {
		const timelineTop = normalizedTopPadding('.timelineContainer');
		const widgetTop = normalizedTopPadding(".root[data-hata-foldable='true'] .desktopWidgetsInner");

		expect(timelineTop).toBe('calc(56px+env(safe-area-inset-top,0px))');
		expect(widgetTop).toBe(timelineTop);
	});
});
