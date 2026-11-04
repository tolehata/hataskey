/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const ACTIVITY_INTERVAL = 60_000;
const inputEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/** A connected stream or a background refresh must not keep auto-renotes alive. */
export function startAutoRenoteActivityTracker(
	send: () => Promise<unknown>,
	target: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> = window.document,
): () => void {
	let lastSent = -Infinity;
	let inFlight = false;
	let disposed = false;

	function record() {
		if (disposed || target.visibilityState !== 'visible' || inFlight || Date.now() - lastSent < ACTIVITY_INTERVAL) return;
		lastSent = Date.now();
		inFlight = true;
		// Failures can be retried by the next user interaction. No idle timer or heartbeat.
		void Promise.resolve().then(send).catch(() => {}).finally(() => { inFlight = false; });
	}

	function onInput(event: Event) {
		if (event.isTrusted) record();
	}

	function onVisibility(event: Event) {
		if (event.isTrusted) record();
	}

	for (const name of inputEvents) target.addEventListener(name, onInput, { passive: true, capture: true });
	target.addEventListener('visibilitychange', onVisibility);
	// Opening an authenticated, visible application is also account use.
	record();

	return () => {
		disposed = true;
		for (const name of inputEvents) target.removeEventListener(name, onInput, { capture: true });
		target.removeEventListener('visibilitychange', onVisibility);
	};
}
