/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type AutoRenoteOptions = {
	frequency: 'daily' | 'weekly' | 'monthly';
	time: string;
	weekday: number;
	day: number;
};

export function autoRenoteNoteId(input: string, origin: string): string | null {
	const value = input.trim();
	if (/^[a-zA-Z0-9]+$/.test(value)) return value;
	try {
		const url = new URL(value, origin);
		if (url.origin !== origin) return null;
		return /^\/notes\/([a-zA-Z0-9]+)\/?$/.exec(url.pathname)?.[1] ?? null;
	} catch {
		return null;
	}
}

/** Local drafts are untrusted and may have been saved by an older client. */
export function parseAutoRenoteOptions(value: unknown): AutoRenoteOptions | null {
	if (!value || typeof value !== 'object') return null;
	const v = value as Record<string, unknown>;
	if (v.frequency !== 'daily' && v.frequency !== 'weekly' && v.frequency !== 'monthly') return null;
	if (typeof v.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time)) return null;
	if (typeof v.weekday !== 'number' || !Number.isInteger(v.weekday) || v.weekday < 0 || v.weekday > 6) return null;
	if (typeof v.day !== 'number' || !Number.isInteger(v.day) || v.day < 1 || v.day > 31) return null;
	return { frequency: v.frequency, time: v.time, weekday: v.weekday, day: v.day };
}

/** Preview the backend schedule: strictly after now in JST, skipping missing month dates. */
export function nextAutoRenoteAt(options: AutoRenoteOptions, now: Date): Date | null {
	const timing = parseAutoRenoteOptions(options);
	if (!timing || !Number.isFinite(now.getTime())) return null;
	const jstOffset = 9 * 60 * 60 * 1000;
	const local = new Date(now.getTime() + jstOffset);
	const [hour, minute] = timing.time.split(':').map(Number);
	for (let offset = 0; offset < 367; offset++) {
		const day = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + offset, hour, minute));
		const candidate = new Date(day.getTime() - jstOffset);
		if (candidate <= now) continue;
		if (timing.frequency === 'weekly' && day.getUTCDay() !== timing.weekday) continue;
		if (timing.frequency === 'monthly' && day.getUTCDate() !== timing.day) continue;
		return candidate;
	}
	return null;
}

export function canComposeAutoRenote(input: {
	visibility: string;
	updateMode?: boolean;
	external?: boolean;
	otherAccount?: boolean;
	scheduledAt?: number | null;
	saveToDraft?: boolean;
	channel?: unknown;
}): boolean {
	return input.visibility === 'public' && !input.updateMode && !input.external && !input.otherAccount &&
		input.scheduledAt == null && !input.saveToDraft && input.channel == null;
}

/** A schedule failure must never make the caller retry an already successful post. */
export async function bindPostedAutoRenote(
	noteId: string,
	options: AutoRenoteOptions,
	create: (payload: AutoRenoteOptions & { noteId: string }) => Promise<unknown>,
): Promise<boolean> {
	try {
		await create({ ...options, noteId });
		return true;
	} catch {
		return false;
	}
}
