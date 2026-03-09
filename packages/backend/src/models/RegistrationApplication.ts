/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Entity, PrimaryColumn, Column, Index, JoinColumn, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';

@Entity('registration_application')
export class MiRegistrationApplication {
	@PrimaryColumn(id())
	public id: string;

	@Column('varchar', {
		length: 1024,
	})
	public reason: string;

	@Column('varchar', {
		length: 128,
	})
	public username: string;

	@Column('varchar', {
		length: 256,
	})
	public hashedPassword: string;

	@Column('varchar', {
		length: 256,
	})
	public email: string;

	@Index()
	@Column('varchar', {
		length: 32,
		default: 'pending',
	})
	public status: string;

	@Column('timestamp with time zone', {
		nullable: true,
	})
	public approvedAt: Date | null;

	@Column('timestamp with time zone', {
		nullable: true,
	})
	public rejectedAt: Date | null;

	@Column({
		...id(),
		nullable: true,
	})
	public userId: MiUser['id'] | null;

	@ManyToOne(type => MiUser, {
		onDelete: 'SET NULL',
		nullable: true,
	})
	@JoinColumn()
	public user: MiUser | null;

	@Index()
	@Column('timestamp with time zone')
	public createdAt: Date;
}
