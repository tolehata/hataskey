/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import membersDialogSource from './MkPrivateChannelMembersDialog.vue?raw';
import notificationSource from './MkNotification.vue?raw';

describe('private channel invitation UI', () => {
	test('管理画面に招待中・参加中・招待拒否を表示する', () => {
		expect(membersDialogSource).toContain('misskeyApi(\'channels/invitations\'');
		expect(membersDialogSource).toContain('参加招待を送る');
		expect(membersDialogSource).toContain('招待中');
		expect(membersDialogSource).toContain('参加中');
		expect(membersDialogSource).toContain('招待拒否');
	});

	test('通知上の承認・拒否は招待IDを本人用APIへ送る', () => {
		expect(notificationSource).toContain('notification.type === \'addedToPrivateChannel\' && notification.invitationId');
		expect(notificationSource).toContain('misskeyApi(\'channels/invitations/accept\', { invitationId })');
		expect(notificationSource).toContain('misskeyApi(\'channels/invitations/reject\', { invitationId })');
		expect(notificationSource).toContain('参加する');
		expect(notificationSource).toContain('参加しない');
	});
});
