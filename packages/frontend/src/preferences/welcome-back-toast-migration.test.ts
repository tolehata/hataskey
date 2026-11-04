/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PreferencesManager } from './manager.js';
import type { PreferencesProfile, StorageProvider } from './manager.js';
import { migrateWelcomeBackToast } from '@/utility/welcome-back-toast-migration.js';

vi.mock('@@/js/config.js', () => ({ host: 'example.test', version: 'test', prefersReducedMotion: false }));
vi.mock('@@/js/intl-const.js', () => ({ hemisphere: 'N' }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {} } }));
vi.mock('@/os.js', () => ({}));
vi.mock('@/utility/copy-to-clipboard.js', () => ({ copyToClipboard: vi.fn() }));

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function deferred() {
	let resolve!: () => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}

async function fixture(enabled = false, sync = false) {
	let saved: PreferencesProfile | null = null;
	let cloudValue = enabled;
	const io: StorageProvider = {
		load: () => copy(saved),
		save: vi.fn(({ profile }) => { saved = copy(profile); }),
		cloudGetBulk: vi.fn(async () => ({})),
		cloudGet: async () => null,
		cloudSet: vi.fn(async ({ value }) => { cloudValue = value as boolean; }),
	};
	vi.mocked(io.cloudGetBulk).mockImplementation(async ({ needs }) => sync && needs.some(({ key }) => key === 'welcomeBackToast')
		? { welcomeBackToast: cloudValue }
		: {});
	const seed = new PreferencesManager(io, { id: 'user' });
	await seed.cloudReady;
	seed.profile.preferences.welcomeBackToast = [[{}, enabled, { sync }]];
	saved = copy(seed.profile);
	vi.mocked(io.save).mockClear();
	return { io, boot: (id = 'user') => new PreferencesManager(io, { id }) };
}

describe('歓迎メッセージの有効化移行', () => {
	beforeEach(() => window.localStorage.clear());

	test('保存済みの無効設定を有効にし、他の設定を保持する', async () => {
		const f = await fixture();
		const preferences = f.boot();
		await preferences.cloudReady;
		const before = copy(preferences.profile.preferences);
		await migrateWelcomeBackToast(preferences, window.localStorage);
		expect(preferences.s.welcomeBackToast).toBe(true);
		expect(f.io.load()?.preferences.welcomeBackToast[0][1]).toBe(true);
		const after = copy(preferences.profile.preferences);
		after.welcomeBackToast = before.welcomeBackToast;
		expect(after).toEqual(before);
		expect(window.localStorage.length).toBe(1);
	});

	test.each([false, true])('移行前が%sでも、その後の無効設定を再起動・アカウント切替で維持する', async enabled => {
		const f = await fixture(enabled);
		const preferences = f.boot();
		await migrateWelcomeBackToast(preferences, window.localStorage);
		await preferences.commit('welcomeBackToast', false);
		const rebooted = f.boot();
		await migrateWelcomeBackToast(rebooted, window.localStorage);
		expect(rebooted.s.welcomeBackToast).toBe(false);
		const other = f.boot('other');
		await migrateWelcomeBackToast(other, window.localStorage);
		expect(other.s.welcomeBackToast).toBe(false);
		expect(window.localStorage.length).toBe(1);
	});

	test('アカウント専用設定と別プロファイルはそれぞれ一度移行する', async () => {
		const f = await fixture();
		const preferences = f.boot();
		await migrateWelcomeBackToast(preferences, window.localStorage);
		await preferences.commit('welcomeBackToast', false);
		preferences.setAccountOverride('welcomeBackToast');
		await migrateWelcomeBackToast(preferences, window.localStorage);
		expect(preferences.s.welcomeBackToast).toBe(true);
		expect(preferences.profile.preferences.welcomeBackToast[0][1]).toBe(false);
		await preferences.commit('welcomeBackToast', false);
		preferences.profile.id = 'another-profile';
		await migrateWelcomeBackToast(preferences, window.localStorage);
		expect(preferences.s.welcomeBackToast).toBe(true);
		expect(window.localStorage.length).toBe(3);
	});

	test('遅れて届いたクラウドの無効設定を移行し、同期先にも保存する', async () => {
		const f = await fixture(true, true);
		const gate = deferred();
		vi.mocked(f.io.cloudGetBulk).mockImplementationOnce(async () => {
			await gate.promise;
			return { welcomeBackToast: false };
		});
		const preferences = f.boot();
		const migration = migrateWelcomeBackToast(preferences, window.localStorage);
		expect(f.io.save).not.toHaveBeenCalled();
		expect(window.localStorage.length).toBe(0);
		gate.resolve();
		await migration;
		expect(preferences.s.welcomeBackToast).toBe(true);
		expect(f.io.cloudSet).toHaveBeenCalledWith({ key: 'welcomeBackToast', scope: {}, value: true });
		const rebooted = f.boot();
		await migrateWelcomeBackToast(rebooted, window.localStorage);
		expect(rebooted.s.welcomeBackToast).toBe(true);
	});

	test('同期の取得失敗時は完了印を残さず、次の起動で再試行する', async () => {
		const f = await fixture(false, true);
		vi.mocked(f.io.cloudGetBulk).mockRejectedValueOnce(new Error('read failed'));
		await expect(migrateWelcomeBackToast(f.boot(), window.localStorage)).rejects.toThrow('read failed');
		expect(f.io.save).not.toHaveBeenCalled();
		expect(window.localStorage.length).toBe(0);
		const rebooted = f.boot();
		await migrateWelcomeBackToast(rebooted, window.localStorage);
		expect(rebooted.s.welcomeBackToast).toBe(true);
		expect(window.localStorage.length).toBe(1);
	});

	test('同期先への保存を待ち、失敗時は完了印を残さず次の起動で再試行する', async () => {
		const f = await fixture(false, true);
		const gate = deferred();
		vi.mocked(f.io.cloudSet).mockImplementationOnce(async () => { await gate.promise; });
		const preferences = f.boot();
		await preferences.cloudReady;
		const migration = migrateWelcomeBackToast(preferences, window.localStorage);
		const rejected = expect(migration).rejects.toThrow('write failed');
		await Promise.resolve();
		expect(f.io.cloudSet).toHaveBeenCalledTimes(1);
		expect(window.localStorage.length).toBe(0);
		gate.reject(new Error('write failed'));
		await rejected;
		expect(window.localStorage.length).toBe(0);
		const rebooted = f.boot();
		await migrateWelcomeBackToast(rebooted, window.localStorage);
		expect(rebooted.s.welcomeBackToast).toBe(true);
		expect(f.io.cloudSet).toHaveBeenCalledTimes(2);
		expect(window.localStorage.length).toBe(1);
	});

	test.each(['profile', 'scope', 'sync'] as const)('同期待ち中の%s変更で移行を中止する', async change => {
		const f = await fixture();
		const preferences = f.boot();
		await preferences.cloudReady;
		const gate = deferred();
		preferences.cloudReady = gate.promise;
		const migration = migrateWelcomeBackToast(preferences, window.localStorage);
		if (change === 'profile') preferences.profile.id = 'other-profile';
		else if (change === 'scope') preferences.setAccountOverride('welcomeBackToast');
		else preferences.cloudReady = Promise.resolve();
		vi.mocked(f.io.save).mockClear();
		gate.resolve();
		await migration;
		expect(f.io.save).not.toHaveBeenCalled();
		expect(preferences.s.welcomeBackToast).toBe(false);
		expect(window.localStorage.length).toBe(0);
	});

	test('保存待ち中に無効へ戻した選択を維持する', async () => {
		const f = await fixture(false, true);
		const preferences = f.boot();
		await preferences.cloudReady;
		const gate = deferred();
		vi.mocked(f.io.cloudSet).mockImplementationOnce(async () => { await gate.promise; });
		const migration = migrateWelcomeBackToast(preferences, window.localStorage);
		await Promise.resolve();
		const disabled = preferences.commit('welcomeBackToast', false);
		gate.resolve();
		await migration;
		await disabled;
		const rebooted = f.boot();
		await migrateWelcomeBackToast(rebooted, window.localStorage);
		expect(rebooted.s.welcomeBackToast).toBe(false);
	});
});
