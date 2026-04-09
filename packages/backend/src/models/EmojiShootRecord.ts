import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';

@Entity('emoji_shoot_record')
export class MiEmojiShootRecord {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column({ ...id() })
	public userId: MiUser['id'];

	@ManyToOne(() => MiUser, { onDelete: 'CASCADE' })
	@JoinColumn()
	public user: MiUser | null;

	@Index()
	@Column('timestamp with time zone')
	public createdAt: Date;

	@Index()
	@Column('integer')
	public score: number;

	@Column('integer', { default: 0 })
	public wave: number;

	@Column('integer', { default: 0 })
	public kills: number;

	@Index()
	@Column('varchar', { length: 32, default: 'normal' })
	public mode: string;
}
