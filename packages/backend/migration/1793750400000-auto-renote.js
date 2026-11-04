/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AutoRenote1793750400000 {
	name = 'AutoRenote1793750400000';

	async up(queryRunner) {
		await queryRunner.query(`CREATE TABLE "auto_renote_schedule" (
			"id" varchar(32) PRIMARY KEY,
			"userId" varchar(32) NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"noteId" varchar(32) NOT NULL,
			"frequency" varchar(16) NOT NULL CHECK ("frequency" IN ('daily', 'weekly', 'monthly')),
			"time" varchar(5) NOT NULL CHECK ("time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
			"weekday" integer NOT NULL DEFAULT 0 CHECK ("weekday" BETWEEN 0 AND 6),
			"day" integer NOT NULL DEFAULT 1 CHECK ("day" BETWEEN 1 AND 31),
			"status" varchar(16) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'paused', 'quota', 'offline', 'role', 'unavailable', 'cancelled', 'error')),
			"createdAt" timestamptz NOT NULL,
			"updatedAt" timestamptz NOT NULL,
			"nextRunAt" timestamptz,
			"lastRunAt" timestamptz,
			"notificationId" varchar(32),
			"notificationReason" varchar(16),
			"notificationPending" boolean NOT NULL DEFAULT false,
			"adminReason" varchar(500)
		)`);
		await queryRunner.query('CREATE INDEX "IDX_AUTO_RENOTE_OWNER_STATUS" ON "auto_renote_schedule" ("userId", "status")');
		await queryRunner.query(`CREATE TABLE "auto_renote_usage" (
			"userId" varchar(32) PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
			"month" varchar(7) NOT NULL,
			"count" integer NOT NULL DEFAULT 0 CHECK ("count" >= 0),
			"lastUsedAt" timestamptz NOT NULL
		)`);
		await queryRunner.query(`CREATE TABLE "auto_renote_attempt" (
			"id" varchar(32) PRIMARY KEY,
			"userId" varchar(32) NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"scheduleId" varchar(32) NOT NULL REFERENCES "auto_renote_schedule"("id") ON DELETE CASCADE,
			"scheduledAt" timestamptz NOT NULL,
			"createdAt" timestamptz NOT NULL,
			"posted" boolean NOT NULL DEFAULT false,
			"settled" boolean NOT NULL DEFAULT false
		)`);
		await queryRunner.query('CREATE INDEX "IDX_AUTO_RENOTE_ATTEMPT_OWNER" ON "auto_renote_attempt" ("userId", "settled")');
		await queryRunner.query('CREATE UNIQUE INDEX "IDX_AUTO_RENOTE_ATTEMPT_SLOT" ON "auto_renote_attempt" ("scheduleId", "scheduledAt")');
	}

	async down(queryRunner) {
		await queryRunner.query('DROP TABLE "auto_renote_attempt"');
		await queryRunner.query('DROP TABLE "auto_renote_usage"');
		await queryRunner.query('DROP TABLE "auto_renote_schedule"');
	}
}
