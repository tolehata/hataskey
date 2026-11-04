/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defineAsyncComponent } from 'vue';
import type * as Misskey from 'cherrypick-js';
import type { AutoRenoteOptions } from '@/utility/auto-renote-schedule.js';
import { bindPostedAutoRenote } from '@/utility/auto-renote-schedule.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { $i } from '@/i.js';

export type AutoRenoteSchedule = Misskey.Endpoints['notes/auto-renote/create']['res'];
export type AutoRenoteStatus = AutoRenoteSchedule['status'];

export function canAutoRenoteNote(note: Misskey.entities.Note): boolean {
	return !!$i && note.userId === $i.id && !!$i.policies.canAutoRenote && $i.policies.autoRenoteMonthlyLimit > 0 && $i.policies.canPublicNote &&
		note.visibility === 'public' && !note.isHidden &&
		(!note.channel || (note.channel.allowRenoteToExternal && !note.channel.isPrivate));
}

export function editAutoRenote(options: {
	note?: Misskey.entities.Note | null;
	schedule?: AutoRenoteSchedule;
	draft?: AutoRenoteOptions | null;
	composer?: boolean;
}): Promise<AutoRenoteOptions | null> {
	return new Promise(resolve => {
		let settled = false;
		const { dispose } = os.popup(defineAsyncComponent(() => import('@/components/MkAutoRenoteDialog.vue')), options, {
			done: (result: AutoRenoteOptions) => {
				settled = true;
				resolve(result);
			},
			closed: () => {
				dispose();
				if (!settled) resolve(null);
			},
		});
	});
}

export async function registerPostedAutoRenote(note: Misskey.entities.Note, options: AutoRenoteOptions): Promise<void> {
	const saved = await bindPostedAutoRenote(note.id, options, payload => misskeyApi('notes/auto-renote/create', payload));
	if (!saved) {
		// Deliberately swallow the schedule error: posting itself has already succeeded.
		try {
			await os.alert({ type: 'warning', text: i18n.ts._autoRenote.partialFailure });
		} catch {
			// UI teardown cannot change the successful posting result.
		}
	}
}

export function autoRenoteErrorText(error: unknown): string {
	const detail = error && typeof error === 'object' ? error as { code?: unknown; info?: { reason?: unknown } } : {};
	if (detail.code === 'AUTO_RENOTE_BLOCKED') {
		const reason = detail.info?.reason;
		if (typeof reason === 'string' && Object.hasOwn(i18n.ts._autoRenote._reasons, reason)) {
			return i18n.ts._autoRenote._reasons[reason as keyof typeof i18n.ts._autoRenote._reasons];
		}
		return i18n.ts._autoRenote.disabled;
	}
	if (detail.code === 'AUTO_RENOTE_UNAVAILABLE') return i18n.ts._autoRenote.ineligible;
	if (detail.code === 'INVALID_AUTO_RENOTE') return i18n.ts._autoRenote.invalidSchedule;
	if (detail.code === 'TOO_MANY_AUTO_RENOTES') return i18n.ts._autoRenote.scheduleLimit;
	return i18n.ts._autoRenote.saveFailed;
}

export function autoRenoteSummary(schedule: AutoRenoteOptions): string {
	const labels = i18n.ts._autoRenote;
	const recurrence = schedule.frequency === 'daily' ? labels.daily
		: schedule.frequency === 'weekly' ? `${labels.weekly} ${autoRenoteWeekdays()[schedule.weekday].label}`
		: `${labels.monthly} ${schedule.day}`;
	return `${recurrence} ${schedule.time} (JST)`;
}

export function autoRenoteWeekdays() {
	return Array.from({ length: 7 }, (_, value) => ({
		value,
		label: new Intl.DateTimeFormat(window.document.documentElement.lang || 'ja-JP', { weekday: 'long', timeZone: 'Asia/Tokyo' }).format(new Date(Date.UTC(2026, 10, 1 + value))),
	}));
}
