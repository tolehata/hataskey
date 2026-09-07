/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, test, vi } from 'vitest';
import locales from '../../../../locales/index.js';

// Run the actual SW entrypoints with browser/network dependencies replaced in memory.
// No browser permission request, subscription, or notification is sent by these tests.
function loadSwModule(path: string, modules: Record<string, unknown>, globals: Record<string, unknown>) {
	const source = readFileSync(`${process.cwd()}/../sw/src/${path}`, 'utf8');
	const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
	const exports: Record<string, (...args: any[]) => Promise<void>> = {};
	new Function('require', 'exports', 'globalThis', '_DEV_', compiled.outputText)((id: string) => {
		if (!(id in modules)) throw new Error(`Unexpected SW dependency: ${id}`);
		return modules[id];
	}, exports, globals, false);
	return exports;
}

const data = {
	type: 'notification', userId: 'alice',
	body: { id: 'flower-notice', type: 'hataskFlowerReady', header: 'Hataskのお花', body: '満開です', icon: null, link: '/hatask?tab=garden' },
};

describe('Hatask flower push notification', () => {
	test.each(['ja-JP', 'en-US', 'zh-CN'])('%sの本文を持つ標準プッシュ通知を組み立てる', async lang => {
		const showNotification = vi.fn().mockResolvedValue(undefined);
		const locale = locales[lang];
		const module = loadSwModule('scripts/create-notification.ts', {
			'@/scripts/twemoji-base.js': {}, '@/scripts/operations.js': {}, '@/scripts/get-account-from-id.js': {},
			'@/scripts/hata-custom-notification-copy.js': {}, '@/scripts/get-user-name.js': {},
			'@/scripts/lang.js': { swLang: { i18n: { ts: locale } } },
		}, { registration: { showNotification } });
		await module.createNotification(data);
		expect(showNotification).toHaveBeenCalledExactlyOnceWith(locale._notification._types.hataskFlowerReady, expect.objectContaining({
			body: locale._hata._customNotifications.flowerReady, data,
		}));
	});

	test('通知クリックで対象アカウントの「おはな」を開く', async () => {
		const listeners = new Map<string, (event: unknown) => void>();
		const client = { focus: vi.fn() };
		const operations = { openClient: vi.fn().mockResolvedValue(client), sendMarkAllAsRead: vi.fn() };
		loadSwModule('sw.ts', {
			'idb-keyval': {}, 'cherrypick-js': {}, '@/scripts/create-notification.js': {},
			'@/scripts/lang.js': {}, '@/scripts/operations.js': operations,
		}, { addEventListener: (name: string, handler: (event: unknown) => void) => listeners.set(name, handler) });
		let completion: Promise<void> | undefined;
		const close = vi.fn();
		listeners.get('notificationclick')!({
			action: '', notification: { data, close },
			waitUntil: (promise: Promise<void>) => { completion = promise; },
		});
		await completion;
		expect(operations.openClient).toHaveBeenCalledExactlyOnceWith('push', '/hatask?tab=garden', 'alice');
		expect(client.focus).toHaveBeenCalledTimes(1);
		expect(close).toHaveBeenCalledTimes(1);
	});
});
