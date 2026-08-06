/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { computed, ref } from 'vue';
import { miLocalStorage } from '@/local-storage.js';

export const POST_SEND_DELAY_DEFAULT_SECONDS = 5;
export const POST_SEND_DELAY_PRESETS = [3, 5, 10] as const;

function normalizeSeconds(value: unknown): number {
	if (value == null || value === '') return POST_SEND_DELAY_DEFAULT_SECONDS;
	const parsed = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(parsed)) return POST_SEND_DELAY_DEFAULT_SECONDS;
	return POST_SEND_DELAY_PRESETS.reduce((closest, preset) => (
		Math.abs(preset - parsed) < Math.abs(closest - parsed) ? preset : closest
	), POST_SEND_DELAY_DEFAULT_SECONDS);
}

export const postSendDelayEnabled = ref(miLocalStorage.getItem('hataPostDelayEnabled') === 'true');
export const postSendDelaySeconds = ref(normalizeSeconds(miLocalStorage.getItem('hataPostDelaySeconds')));

export function setPostSendDelayEnabled(value: boolean): void {
	postSendDelayEnabled.value = value;
	miLocalStorage.setItem('hataPostDelayEnabled', value ? 'true' : 'false');
}

export function setPostSendDelaySeconds(value: unknown): void {
	const normalized = normalizeSeconds(value);
	postSendDelaySeconds.value = normalized;
	miLocalStorage.setItem('hataPostDelaySeconds', String(normalized));
}

export type PostSendDelayController = ReturnType<typeof createPostSendDelayController>;

// 旗鯖fork(ベータ): notes/create を呼ぶ直前だけ待機させる端末内タイマー。
// バックエンドや連合処理には予約状態を渡さず、待機終了後に既存の投稿処理へ戻す。
export function createPostSendDelayController() {
	const active = ref(false);
	const remainingMs = ref(0);
	const durationMs = ref(0);
	let intervalId: number | null = null;
	let resolvePending: ((shouldSend: boolean) => void) | null = null;
	let deadline = 0;

	const remainingSeconds = computed(() => Math.max(1, Math.ceil(remainingMs.value / 1000)));
	const progress = computed(() => durationMs.value > 0 ? Math.max(0, Math.min(1, remainingMs.value / durationMs.value)) : 0);
	const frameStyle = computed(() => ({ '--hata-post-delay-progress': `${progress.value * 360}deg` }));

	function clearTimer(): void {
		if (intervalId != null) window.clearInterval(intervalId);
		intervalId = null;
	}

	function finish(shouldSend: boolean): void {
		if (!active.value) return;
		clearTimer();
		active.value = false;
		remainingMs.value = 0;
		const resolve = resolvePending;
		resolvePending = null;
		resolve?.(shouldSend);
	}

	function update(): void {
		remainingMs.value = Math.max(0, deadline - Date.now());
		if (remainingMs.value === 0) finish(true);
	}

	function begin(seconds: unknown): Promise<boolean> {
		if (active.value) return Promise.resolve(false);
		const normalized = normalizeSeconds(seconds);
		durationMs.value = normalized * 1000;
		remainingMs.value = durationMs.value;
		deadline = Date.now() + durationMs.value;
		active.value = true;
		return new Promise<boolean>((resolve) => {
			resolvePending = resolve;
			intervalId = window.setInterval(update, 50);
		});
	}

	function cancel(): void {
		finish(false);
	}

	function sendNow(): void {
		finish(true);
	}

	function dispose(): void {
		finish(false);
		clearTimer();
	}

	return { active, remainingSeconds, progress, frameStyle, begin, cancel, sendNow, dispose };
}
