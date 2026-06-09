/*
 * 旗鯖fork: 宴(うたげ)判定セッション。
 * 本文に「宴/うたげ/ぅたげ/utage」を含むローカルノートが投稿されると running で1件作成され、
 * 15分(expiresAt)逃げ切れば succeeded、それ以前に反応(リアクション/リプライ/リノート)が
 * 着弾すれば failed に確定する。一度 succeeded/failed になったら不可逆。
 * 従来はフロントのメモリ上でのみ判定していたため、リロードや別端末で状態が揺れていたが、
 * 確定結果をサーバーに永続化することで全クライアントで一貫した状態を読めるようにする。
 */

import { PrimaryColumn, Entity, Index, Column, ManyToOne, JoinColumn } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';
import { MiNote } from './Note.js';

@Entity('utage_session')
export class MiUtageSession {
	@PrimaryColumn(id())
	public id: string;

	@Index({ unique: true })
	@Column({
		...id(),
		comment: 'The target note ID.',
	})
	public noteId: MiNote['id'];

	@ManyToOne(type => MiNote, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public note: MiNote | null;

	@Index()
	@Column({
		...id(),
		comment: 'The poster user ID.',
	})
	public userId: MiUser['id'];

	@ManyToOne(type => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public user: MiUser | null;

	@Column('timestamp with time zone', {
		comment: 'When the utage started (note creation time).',
	})
	public startedAt: Date;

	@Index()
	@Column('timestamp with time zone', {
		comment: 'When the flashing window ends (startedAt + 15min).',
	})
	public expiresAt: Date;

	@Index()
	@Column('varchar', {
		length: 16,
		default: 'running',
		comment: 'running / succeeded / failed',
	})
	public status: string;

	@Column('timestamp with time zone', {
		nullable: true,
		comment: 'When the status was finalized (succeeded/failed).',
	})
	public resolvedAt: Date | null;
}
