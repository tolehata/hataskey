/* SPDX-License-Identifier: AGPL-3.0-only */
import { describe, expect, test, vi } from 'vitest';
import ts from 'typescript';
import locales from '../../../../locales/index.js';
import { I18n } from '@@/js/i18n.js';
import { autoRenoteStoppedBody } from '@@/js/auto-renote-notification.js';
import { notificationBrand, matchesNotificationView } from '@/utility/notification-brand.js';
import { isNotificationFromBot, STANDARD_NOTIFICATION_TYPES } from '@/utility/notification-filter.js';
import createNotificationSource from '../../../sw/src/scripts/create-notification.ts?raw';
import swSource from '../../../sw/src/sw.ts?raw';
import type { AutoRenoteStopNotice } from '@@/js/auto-renote-notification.js';
import type { entities } from 'cherrypick-js';

vi.mock('@/i18n.js', async () => {
	const { I18n: I18nClass } = await import('@@/js/i18n.js');
	const { default: translations } = await import('../../../../locales/index.js');
	return { i18n: new I18nClass(translations['ja-JP']) };
});

const reasons: AutoRenoteStopNotice['reason'][] = ['quota', 'offline', 'role', 'unavailable', 'admin', 'error'];

function runSw(source: string, dependencies: Record<string, unknown>, globals: Record<string, unknown>) {
	const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
	const exports: Record<string, (...args: any[]) => Promise<void>> = {};
	new Function('require', 'exports', 'globalThis', '_DEV_', compiled.outputText)((id: string) => dependencies[id] ?? {}, exports, globals, false);
	return exports;
}

describe('automatic renote stop notification', () => {
	test.each(['ja-JP', 'en-US'].flatMap(lang => reasons.map(reason => [lang, reason] as const)))('%s renders %s with the reason and next steps in app and push', async (lang, reason) => {
		const i18n = new I18n(locales[lang]);
		const notification = { type: 'autoRenoteStopped', reason, count: 3, scheduleIds: ['a', 'b', 'c'], adminReason: '<b>Review this schedule</b>' };
		const body = autoRenoteStoppedBody(notification, i18n);
		expect(body).toContain(i18n.tsx._autoRenote.stoppedCount({ count: 3 }));
		expect(body).toContain(i18n.ts._autoRenote._reasons[reason]);
		if (reason === 'admin') {
			expect(body).toContain(notification.adminReason);
			expect(body).not.toMatch(/再開|resume/i);
		} else {
			expect(body).toMatch(/ご自身で再開|manually/);
			expect(body).not.toContain(notification.adminReason);
		}
		const showNotification = vi.fn();
		const module = runSw(createNotificationSource, {
			'@/scripts/lang.js': { swLang: { i18n } },
			'@@/js/auto-renote-notification.js': { autoRenoteStoppedBody },
		}, { registration: { showNotification } });
		const data = { type: 'notification', userId: 'owner', body: notification };
		await module.createNotification(data);
		expect(showNotification).toHaveBeenCalledExactlyOnceWith(i18n.ts._notification.autoRenoteStopped, expect.objectContaining({ body, data }));
	});

	test('clicking opens the owning account management page and only marks the notice read', async () => {
		const listeners = new Map<string, (event: any) => void>();
		const api = vi.fn();
		const openClient = vi.fn().mockResolvedValue({ focus: vi.fn() });
		runSw(swSource, { '@/scripts/operations.js': { api, openClient } }, {
			addEventListener: (name: string, handler: (event: any) => void) => listeners.set(name, handler),
		});
		let complete: Promise<void> = Promise.resolve();
		listeners.get('notificationclick')!({
			action: '', notification: { close: vi.fn(), data: { type: 'notification', userId: 'owner', body: { type: 'autoRenoteStopped', id: 'notice' } } },
			waitUntil: (promise: Promise<void>) => { complete = promise; },
		});
		await complete;
		expect(openClient).toHaveBeenCalledExactlyOnceWith('push', '/my/auto-renote', 'owner');
		expect(api).toHaveBeenCalledExactlyOnceWith('notifications/mark-as-read', 'owner', { notificationIds: ['notice'] });
	});

	test('shows in the standard brand, remains visible with Bot exclusion, and respects the type selection', () => {
		const notification: entities.Notification = { type: 'autoRenoteStopped', id: 'notice', createdAt: '2026-11-04T00:00:00Z', reason: 'quota', count: 1, scheduleIds: ['schedule'] };
		expect(STANDARD_NOTIFICATION_TYPES).toContain('autoRenoteStopped');
		expect(notificationBrand(notification)).toBe('standard');
		expect(isNotificationFromBot(notification)).toBe(false);
		expect(matchesNotificationView(notification, { brand: 'standard', excludeBots: true })).toBe(true);
		expect(matchesNotificationView(notification, { brand: 'hatask' })).toBe(false);
		expect(matchesNotificationView(notification, { excludeTypes: ['autoRenoteStopped'] })).toBe(false);
	});
});
