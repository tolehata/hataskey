/* SPDX-License-Identifier: AGPL-3.0-only */
import { describe, expect, it } from 'vitest';
import { nextAutoRenoteAt } from './auto-renote-schedule.js';
import type { AutoRenoteOptions } from './auto-renote-schedule.js';

const daily: AutoRenoteOptions = { frequency: 'daily', time: '09:00', weekday: 0, day: 1 };
const cases: [string, Partial<AutoRenoteOptions>, string, string][] = [
	['later today in Japan', { time: '15:30' }, '2026-11-04T00:00:00Z', '2026-11-04T06:30:00Z'],
	['strictly after an exact daily slot', {}, '2026-11-04T00:00:00Z', '2026-11-05T00:00:00Z'],
	['after midnight in Japan', { time: '00:05' }, '2026-11-04T15:00:00Z', '2026-11-04T15:05:00Z'],
	['the next weekday in Japan', { frequency: 'weekly', weekday: 0 }, '2026-11-04T00:00:00Z', '2026-11-08T00:00:00Z'],
	['a full week after the exact weekly slot', { frequency: 'weekly', weekday: 3 }, '2026-11-04T00:00:00Z', '2026-11-11T00:00:00Z'],
	['skips a month without the 31st', { frequency: 'monthly', day: 31 }, '2026-04-01T00:00:00Z', '2026-05-31T00:00:00Z'],
	['skips February 29 in a common year', { frequency: 'monthly', day: 29 }, '2027-02-01T00:00:00Z', '2027-03-29T00:00:00Z'],
	['keeps February 29 in a leap year', { frequency: 'monthly', day: 29 }, '2028-02-01T00:00:00Z', '2028-02-29T00:00:00Z'],
	['uses the Japanese year boundary', { time: '00:00' }, '2026-12-31T14:59:59Z', '2026-12-31T15:00:00Z'],
	['skips an exact monthly slot over the year boundary', { frequency: 'monthly', time: '00:00', day: 1 }, '2026-12-31T15:00:00Z', '2027-01-31T15:00:00Z'],
];

describe('automatic renote next date preview', () => {
	it.each(cases)('%s', (_, options, now, expected) => {
		expect(nextAutoRenoteAt({ ...daily, ...options }, new Date(now))?.toISOString()).toBe(new Date(expected).toISOString());
	});
	it('does not display a date for invalid timing or an invalid clock', () => {
		expect(nextAutoRenoteAt({ ...daily, time: '24:00' }, new Date('2026-11-04T00:00:00Z'))).toBeNull();
		expect(nextAutoRenoteAt({ ...daily, day: 0 }, new Date('2026-11-04T00:00:00Z'))).toBeNull();
		expect(nextAutoRenoteAt(daily, new Date(NaN))).toBeNull();
	});
});
