/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startAutoRenoteActivityTracker } from './auto-renote-activity.js';

function fixture(visibilityState: DocumentVisibilityState = 'visible') {
	const listeners = new Map<string, EventListener>();
	const target = {
		visibilityState,
		addEventListener: (name: string, listener: EventListener) => { listeners.set(name, listener); },
		removeEventListener: (name: string) => { listeners.delete(name); },
	};
	return {
		target,
		emit: (name: string, isTrusted = true) => listeners.get(name)?.({ isTrusted } as Event),
	};
}

afterEach(() => vi.useRealTimers());

describe('auto-renote account activity', () => {
	it('records visible startup and trusted input, but never an idle connection', async () => {
		vi.useFakeTimers();
		const send = vi.fn().mockResolvedValue(undefined);
		const f = fixture();
		const dispose = startAutoRenoteActivityTracker(send, f.target as unknown as Document);
		await vi.advanceTimersByTimeAsync(1);
		expect(send).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(73 * 60 * 60 * 1000);
		expect(send).toHaveBeenCalledTimes(1);
		f.emit('pointerdown');
		await vi.advanceTimersByTimeAsync(1);
		expect(send).toHaveBeenCalledTimes(2);
		f.emit('keydown');
		await vi.advanceTimersByTimeAsync(1);
		expect(send).toHaveBeenCalledTimes(2);
		dispose();
		await vi.advanceTimersByTimeAsync(60_000);
		f.emit('wheel');
		await vi.advanceTimersByTimeAsync(1);
		expect(send).toHaveBeenCalledTimes(2);
	});

	it('ignores background, synthetic and automatic scroll events', async () => {
		vi.useFakeTimers();
		const send = vi.fn().mockResolvedValue(undefined);
		const f = fixture('hidden');
		const dispose = startAutoRenoteActivityTracker(send, f.target as unknown as Document);
		f.emit('keydown');
		await vi.advanceTimersByTimeAsync(1);
		expect(send).not.toHaveBeenCalled();
		f.target.visibilityState = 'visible';
		f.emit('pointerdown', false);
		f.emit('scroll');
		await vi.advanceTimersByTimeAsync(1);
		expect(send).not.toHaveBeenCalled();
		f.emit('visibilitychange');
		await vi.advanceTimersByTimeAsync(1);
		expect(send).toHaveBeenCalledTimes(1);
		dispose();
	});

	it('recovers after a failed request only on subsequent activity', async () => {
		vi.useFakeTimers();
		const send = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
		const f = fixture();
		const dispose = startAutoRenoteActivityTracker(send, f.target as unknown as Document);
		await vi.advanceTimersByTimeAsync(120_000);
		expect(send).toHaveBeenCalledTimes(1);
		f.emit('touchstart');
		await vi.advanceTimersByTimeAsync(1);
		expect(send).toHaveBeenCalledTimes(2);
		dispose();
	});
});
