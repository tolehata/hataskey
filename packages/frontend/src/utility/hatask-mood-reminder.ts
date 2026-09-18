/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const DEFAULT_MOOD_REMINDER_TIMES = ['昼 12:00', '寝る前 23:00'];
const DEFAULT_MOOD_REMINDER_TIME_ZONE = 'Asia/Tokyo';

export function isHataskMoodReminderTimeZone(value: unknown): value is string {
	if (typeof value !== 'string' || value.length === 0 || value.length > 100 || /^[+-]/u.test(value)) return false;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: value });
		return true;
	} catch {
		return false;
	}
}

function localTimeZone(): string {
	try {
		const value = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (isHataskMoodReminderTimeZone(value)) return value;
	} catch {
		// Keep the server's legacy fallback when the device cannot identify its zone.
	}
	return DEFAULT_MOOD_REMINDER_TIME_ZONE;
}

/** Capture the device's clock only when the user edits a reminder preference. */
export function createHataskMoodReminderPatch(settings: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
	const next = { ...patch };
	if (!Object.hasOwn(patch, 'moodRemind') && !Object.hasOwn(patch, 'moodRemindTimes')) return next;
	if (Array.isArray(patch.moodRemindTimes)) {
		next.moodRemindTimes = [...patch.moodRemindTimes];
	} else if (!Object.hasOwn(patch, 'moodRemindTimes') && settings.moodRemindTimes === undefined) {
		// Settings can enable reminders before the journal page has ever been opened.
		// An explicitly empty selection stays empty.
		next.moodRemindTimes = [...DEFAULT_MOOD_REMINDER_TIMES];
	}
	next.moodRemindTimeZone = localTimeZone();
	return next;
}
