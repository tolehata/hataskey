/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';

@Entity('stacking_game_room')
export class MiStackingGameRoom {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column('timestamp with time zone')
	public createdAt: Date;

	@Index()
	@Column({
		...id(),
	})
	public host1Id: MiUser['id'];

	@ManyToOne(() => MiUser, { onDelete: 'CASCADE' })
	@JoinColumn()
	public host1: MiUser | null;

	@Column({
		...id(),
		nullable: true,
	})
	public host2Id: MiUser['id'] | null;

	@ManyToOne(() => MiUser, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn()
	public host2: MiUser | null;

	// waiting / playing / ended
	@Index()
	@Column('varchar', { length: 32, default: 'waiting' })
	public state: string;

	@Column('integer', { default: 0 })
	public score1: number;

	@Column('integer', { default: 0 })
	public score2: number;

	@Column('integer', { default: 0 })
	public blocks1: number;

	@Column('integer', { default: 0 })
	public blocks2: number;

	// null = not decided, 1 = host1 win, 2 = host2 win, 0 = draw
	@Column('smallint', { nullable: true })
	public winner: number | null;
}
