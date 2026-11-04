/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { AutoRenoteFrequency, AutoRenoteStatus } from '@/misc/auto-renote.js';
import { id } from './util/id.js';
import { MiUser } from './User.js';

@Entity('auto_renote_schedule')
@Index('IDX_AUTO_RENOTE_OWNER_STATUS', ['userId', 'status'])
export class MiAutoRenoteSchedule {
	@PrimaryColumn(id())
	public id: string;

	@Column(id())
	public userId: string;

	@ManyToOne(() => MiUser, { onDelete: 'CASCADE' })
	@JoinColumn()
	public user: MiUser;

	// Keep the target ID after deletion so the owner can see why the schedule stopped.
	@Column(id())
	public noteId: string;

	@Column('varchar', { length: 16 })
	public frequency: AutoRenoteFrequency;

	@Column('varchar', { length: 5 })
	public time: string;

	@Column('integer', { default: 0 })
	public weekday: number;

	@Column('integer', { default: 1 })
	public day: number;

	@Column('varchar', { length: 16, default: 'active' })
	public status: AutoRenoteStatus;

	@Column('timestamp with time zone')
	public createdAt: Date;

	@Column('timestamp with time zone')
	public updatedAt: Date;

	@Column('timestamp with time zone', { nullable: true })
	public nextRunAt: Date | null;

	@Column('timestamp with time zone', { nullable: true })
	public lastRunAt: Date | null;

	@Column('varchar', { length: 32, nullable: true })
	public notificationId: string | null;

	@Column('varchar', { length: 16, nullable: true })
	public notificationReason: string | null;

	@Column('boolean', { default: false })
	public notificationPending: boolean;

	@Column('varchar', { length: 500, nullable: true })
	public adminReason: string | null;
}

@Entity('auto_renote_usage')
export class MiAutoRenoteUsage {
	@PrimaryColumn(id())
	public userId: string;

	@ManyToOne(() => MiUser, { onDelete: 'CASCADE' })
	@JoinColumn()
	public user: MiUser;

	@Column('varchar', { length: 7 })
	public month: string;

	@Column('integer', { default: 0 })
	public count: number;

	@Column('timestamp with time zone')
	public lastUsedAt: Date;
}

@Entity('auto_renote_attempt')
@Index('IDX_AUTO_RENOTE_ATTEMPT_OWNER', ['userId', 'settled'])
@Index('IDX_AUTO_RENOTE_ATTEMPT_SLOT', ['scheduleId', 'scheduledAt'], { unique: true })
export class MiAutoRenoteAttempt {
	// Also the note ID. The insertion transaction marks posted, even if the note is later deleted.
	@PrimaryColumn(id())
	public id: string;

	@Column(id())
	public userId: string;

	@ManyToOne(() => MiUser, { onDelete: 'CASCADE' })
	@JoinColumn()
	public user: MiUser;

	@Column(id())
	public scheduleId: string;

	@ManyToOne(() => MiAutoRenoteSchedule, { onDelete: 'CASCADE' })
	@JoinColumn()
	public schedule: MiAutoRenoteSchedule;

	@Column('timestamp with time zone')
	public scheduledAt: Date;

	@Column('timestamp with time zone')
	public createdAt: Date;

	@Column('boolean', { default: false })
	public posted: boolean;

	@Column('boolean', { default: false })
	public settled: boolean;
}
