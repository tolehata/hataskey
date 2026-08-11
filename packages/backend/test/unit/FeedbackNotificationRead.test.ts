/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { FeedbackService } from '@/core/FeedbackService.js';

describe('FeedbackService notification reads', () => {
	test('marks only the requested notification owned by the current user as read', async () => {
		const update = vi.fn().mockResolvedValue(undefined);
		const service = Object.create(FeedbackService.prototype) as FeedbackService;
		Object.defineProperty(service, 'feedbackNotificationsRepository', {
			value: { update },
		});

		await service.markNotificationRead('user-a', 'notification-a');

		expect(update).toHaveBeenCalledOnce();
		expect(update).toHaveBeenCalledWith({
			id: 'notification-a',
			userId: 'user-a',
			isRead: false,
		}, { isRead: true });
	});

	test('keeps the existing mark-all behavior scoped to the current user', async () => {
		const update = vi.fn().mockResolvedValue(undefined);
		const service = Object.create(FeedbackService.prototype) as FeedbackService;
		Object.defineProperty(service, 'feedbackNotificationsRepository', {
			value: { update },
		});

		await service.markAllNotificationsRead('user-a');

		expect(update).toHaveBeenCalledOnce();
		expect(update).toHaveBeenCalledWith({
			userId: 'user-a',
			isRead: false,
		}, { isRead: true });
	});
});
