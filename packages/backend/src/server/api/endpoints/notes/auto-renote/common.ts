/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { autoRenoteStatuses } from '@/misc/auto-renote.js';

export const scheduleSchema = {
	type: 'object', optional: false, nullable: false,
	properties: {
		id: { type: 'string', optional: false, nullable: false, format: 'id' },
		userId: { type: 'string', optional: false, nullable: false, format: 'id' },
		noteId: { type: 'string', optional: false, nullable: false, format: 'id' },
		user: { type: 'object', optional: false, nullable: false, ref: 'UserLite' },
		note: { type: 'object', optional: false, nullable: true, ref: 'Note' },
		frequency: { type: 'string', optional: false, nullable: false, enum: ['daily', 'weekly', 'monthly'] },
		time: { type: 'string', optional: false, nullable: false },
		weekday: { type: 'number', optional: false, nullable: false },
		day: { type: 'number', optional: false, nullable: false },
		status: { type: 'string', optional: false, nullable: false, enum: autoRenoteStatuses },
		stopReason: { type: 'string', optional: false, nullable: true },
		nextRunAt: { type: 'string', optional: false, nullable: true, format: 'date-time' },
		lastRunAt: { type: 'string', optional: false, nullable: true, format: 'date-time' },
		createdAt: { type: 'string', optional: false, nullable: false, format: 'date-time' },
		adminReason: { type: 'string', optional: false, nullable: true },
	},
} as const;

export const timingProperties = {
	frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
	time: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' },
	weekday: { type: 'integer', minimum: 0, maximum: 6, default: 0 },
	day: { type: 'integer', minimum: 1, maximum: 31, default: 1 },
} as const;

export const listProperties = {
	limit: { type: 'integer', minimum: 1, maximum: 100, default: 100 },
	offset: { type: 'integer', minimum: 0, maximum: 1000000, default: 0 },
	status: { type: 'string', enum: autoRenoteStatuses },
} as const;
