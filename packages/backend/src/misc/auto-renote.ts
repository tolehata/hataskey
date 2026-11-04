/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const autoRenoteStatuses = ['active', 'paused', 'quota', 'offline', 'role', 'unavailable', 'cancelled', 'error'] as const;
export type AutoRenoteStatus = typeof autoRenoteStatuses[number];
export type AutoRenoteFrequency = 'daily' | 'weekly' | 'monthly';
export type AutoRenoteTiming = { frequency: AutoRenoteFrequency; time: string; weekday: number; day: number };
export const AUTO_RENOTE_INACTIVITY_MS = 72 * 60 * 60 * 1000;
const JST = 9 * 60 * 60 * 1000;

export function autoRenoteMonth(now: Date): string {
	return new Date(now.getTime() + JST).toISOString().slice(0, 7);
}

export function validateAutoRenoteTiming(timing: AutoRenoteTiming): boolean {
	return ['daily', 'weekly', 'monthly'].includes(timing.frequency) && /^([01]\d|2[0-3]):[0-5]\d$/u.test(timing.time) &&
		Number.isInteger(timing.weekday) && timing.weekday >= 0 && timing.weekday <= 6 &&
		Number.isInteger(timing.day) && timing.day >= 1 && timing.day <= 31;
}

/** Strictly after now, in Asia/Tokyo. Missing month dates are skipped, never clamped. */
export function nextAutoRenoteAt(timing: AutoRenoteTiming, now: Date): Date {
	if (!validateAutoRenoteTiming(timing)) throw new Error('Invalid auto-renote timing');
	const local = new Date(now.getTime() + JST);
	const [hour, minute] = timing.time.split(':').map(Number);
	for (let offset = 0; offset < 367; offset++) {
		const day = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + offset, hour, minute));
		const candidate = new Date(day.getTime() - JST);
		if (candidate <= now) continue;
		if (timing.frequency === 'weekly' && day.getUTCDay() !== timing.weekday) continue;
		if (timing.frequency === 'monthly' && day.getUTCDate() !== timing.day) continue;
		return candidate;
	}
	throw new Error('No next auto-renote date');
}
