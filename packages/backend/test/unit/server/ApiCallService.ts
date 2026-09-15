/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { ApiCallService } from '@/server/api/ApiCallService.js';
import Logger from '@/logger.js';
import { envOption } from '@/env.js';
import { logManager } from '@/logging/logging-runtime.js';
import { PrettyConsoleBackend } from '@/logging/PrettyConsoleBackend.js';
import type { LogBackend } from '@/logging/LogBackend.js';
import type { LogRecord } from '@/logging/types.js';

/** API失敗ログを確認するための最小Fastify応答を作成します。 */
function createReply() {
	return {
		code: vi.fn(),
		header: vi.fn(),
		send: vi.fn(),
	};
}

/** APIサービスの依存関係を最小限の仮実装へ差し替えます。 */
function createService() {
	const authenticateService = {
		authenticate: vi.fn().mockResolvedValue([null, null]),
	};
	const telemetryService = {
		startSpan: vi.fn((_name: string, callback: () => unknown) => callback()),
		captureMessage: vi.fn(),
	};
	const apiLoggerService = { logger: new Logger('api') };

	const service = new ApiCallService(
		{} as never,
		{} as never,
		{} as never,
		authenticateService as never,
		{} as never,
		{} as never,
		apiLoggerService as never,
		telemetryService as never,
	);
	return { service, telemetryService };
}

describe('ApiCallService structured error logging', () => {
	test.each(['hata/emoji-vote/show', 'hata/emoji-vote/vote'])('keeps diagnostics but no vote content for %s', async name => {
		const write = vi.fn<LogBackend['write']>();
		logManager.setBackend({ write });
		const previousQuiet = envOption.quiet;
		envOption.quiet = false;
		const { service, telemetryService } = createService();
		try {
			const secret = 'private-vote-sentinel';
			const error = Object.assign(new Error(secret), { name: secret, parameters: [secret], query: secret });
			const endpoint = { name, meta: {}, params: {}, exec: vi.fn().mockRejectedValue(error) };
			const request = { method: 'POST', body: { roundId: secret, emojiId: secret }, query: {}, headers: {}, ip: '127.0.0.1' };
			await service.handleRequest(endpoint as never, request as never, createReply() as never);
			const record = write.mock.calls[0][0] as LogRecord;
			expect(record).toMatchObject({ eventName: 'api.endpoint.failed', attributes: { 'api.endpoint': name }, error: { type: 'Error', message: 'Ephemeral emoji vote operation failed' } });
			expect(record.attributes).not.toHaveProperty('api.params');
			expect(JSON.stringify(write.mock.calls)).not.toContain(secret);
			expect(JSON.stringify(telemetryService.captureMessage.mock.calls)).not.toContain(secret);
			expect(telemetryService.captureMessage.mock.calls[0][1]).not.toHaveProperty('userId');
		} finally {
			service.dispose();
			envOption.quiet = previousQuiet;
			logManager.setBackend(new PrettyConsoleBackend({ output: () => undefined }));
		}
	});

	test('removes API credentials and serializes the endpoint error', async () => {
		const write = vi.fn<LogBackend['write']>();
		logManager.setBackend({ write });
		const previousQuiet = envOption.quiet;
		envOption.quiet = false;
		const { service, telemetryService } = createService();
		try {
			const reply = createReply();
			const endpoint = {
				name: 'notes/show',
				meta: {},
				params: {},
				exec: vi.fn().mockRejectedValue(new TypeError('broken endpoint')),
			};
			const request = {
				method: 'POST',
				body: {
					i: 'native-token',
					password: 'password',
					options: { visible: true },
				},
				query: {},
				headers: {},
				ip: '127.0.0.1',
			};

			await service.handleRequest(endpoint as never, request as never, reply as never);

			const record = write.mock.calls[0][0] as LogRecord;
			expect(record).toMatchObject({
				eventName: 'api.endpoint.failed',
				attributes: {
					'api.endpoint': 'notes/show',
					'api.params': {
						password: '[REDACTED]',
						options: { visible: true },
					},
				},
				error: { type: 'TypeError', message: 'broken endpoint' },
			});
			expect(record.attributes?.['api.params']).not.toHaveProperty('i');
			expect(record.attributes?.['error.id']).toEqual(expect.any(String));
			expect(telemetryService.captureMessage.mock.calls[0][1].extra).not.toHaveProperty('ps');
		} finally {
			service.dispose();
			envOption.quiet = previousQuiet;
			logManager.setBackend(new PrettyConsoleBackend({ output: () => undefined }));
		}
	});

	test('uses i only for authentication and excludes it from endpoint params', async () => {
		const { service } = createService();
		try {
			const endpoint = {
				name: 'hata/hatask/emotion-analysis/create',
				meta: {},
				params: {},
				exec: vi.fn().mockResolvedValue({ ok: true }),
			};
			const body = { i: 'native-token', analysisVersion: '1.1.0' };
			const request = { method: 'POST', body, query: {}, headers: {}, ip: '127.0.0.1' };

			await service.handleRequest(endpoint as never, request as never, createReply() as never);

			expect(endpoint.exec).toHaveBeenCalledWith(
				{ analysisVersion: '1.1.0' },
				null,
				null,
				undefined,
				null,
				'127.0.0.1',
				{},
			);
			expect(body).toEqual({ i: 'native-token', analysisVersion: '1.1.0' });
		} finally {
			service.dispose();
		}
	});
});
