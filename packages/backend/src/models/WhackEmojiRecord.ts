/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';

@Entity('whack_emoji_record')
export class MiWhackEmojiRecord {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column({
		...id(),
	})
	public userId: MiUser['id'];

	@ManyToOne(() => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public user: MiUser | null;

	@Index()
	@Column('timestamp with time zone')
	public createdAt: Date;

	@Column('integer')
	public difficulty: number;

	@Index()
	@Column('integer')
	public score: number;

	@Column('integer', {
		default: 0,
	})
	public hits: number;

	@Column('integer', {
		default: 0,
	})
	public misses: number;
}
