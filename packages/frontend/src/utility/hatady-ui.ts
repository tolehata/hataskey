/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { shallowRef } from 'vue';

export type HatadyNotice = { id: number; message: string; duration: number };
export const hatadyNotice = shallowRef<HatadyNotice | null>(null);
export const hatadyDialogSurfaces = shallowRef<HTMLElement[]>([]);
let noticeId = 0;

export function hatadyNotify(message: string): void {
	hatadyNotice.value = { id: ++noticeId, message: message.trim().replace(/[。、]+$/u, ''), duration: 5000 };
}

export function registerHatadySurface(element: HTMLElement): () => void {
	hatadyDialogSurfaces.value = [...hatadyDialogSurfaces.value, element];
	return () => {
		hatadyDialogSurfaces.value = hatadyDialogSurfaces.value.filter((item) => item !== element);
	};
}

export const HATADY_ACTIVITY_CHOICES = [
	{ value: 'study', label: '勉強・読書', icon: 'ti ti-book' },
	{ value: 'movie', label: '映画', icon: 'ti ti-movie' },
	{ value: 'game', label: 'ゲーム', icon: 'ti ti-device-gamepad-2' },
	{ value: 'exercise', label: '運動', icon: 'ti ti-run' },
	{ value: 'work', label: '作業', icon: 'ti ti-briefcase' },
] as const;

export const HATADY_RECORD_TAGS = [
	{ value: 'strength', label: '得意', icon: 'ti ti-star' },
	{ value: 'weak', label: '苦手', icon: 'ti ti-flag' },
	{ value: 'interest', label: '興味', icon: 'ti ti-bulb' },
	{ value: 'effort', label: 'がんばった', icon: 'ti ti-flame' },
	{ value: 'recommend', label: 'おすすめ', icon: 'ti ti-thumb-up' },
	{ value: 'progress', label: '進捗', icon: 'ti ti-pencil' },
	{ value: 'smooth', label: '順調', icon: 'ti ti-circle-check' },
	{ value: 'blocked', label: '躓いている', icon: 'ti ti-alert-circle' },
	{ value: 'review', label: '見てほしい', icon: 'ti ti-eye' },
	{ value: 'doneDay', label: '今日の完了', icon: 'ti ti-check' },
	{ value: 'doneAll', label: '全体の完了', icon: 'ti ti-checks' },
	{ value: 'movie', label: '映画', icon: 'ti ti-movie' },
	{ value: 'game', label: 'ゲーム', icon: 'ti ti-device-gamepad-2' },
] as const;

export function hatadyDuration(seconds: number | null | undefined): string {
	if (seconds == null || !Number.isFinite(seconds)) return '—';
	const value = Math.max(0, seconds),
		hours = Math.floor(value / 3600),
		minutes = Math.floor((value % 3600) / 60),
		rest = value % 60;
	return (
		`${hours ? `${hours}時間` : ''}${minutes ? `${minutes}分` : ''}${rest ? `${Number(rest.toFixed(3))}秒` : ''}` ||
		'0分'
	);
}

/** The exact field is authoritative, including an explicit null. Old responses still use minutes. */
export function hatadySeconds(value: {
	durationSeconds?: number | null;
	durationMinutes?: number | null;
}): number | null {
	return Object.hasOwn(value, 'durationSeconds')
		? (value.durationSeconds ?? null)
		: value.durationMinutes == null
			? null
			: value.durationMinutes * 60;
}
