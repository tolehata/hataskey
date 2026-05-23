/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-FileCopyrightText: noridev and cherrypick-project
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
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

	/**
	 * 旗鯖fork: 申請が拒否された場合、reject 時点で null にセットされる
	 * (利用者の ID/パスワード情報を即時削除するため)
	 */
	@Column('varchar', {
		length: 128,
		nullable: true,
	})
	public username: string | null;

	/**
	 * 旗鯖fork: 申請が拒否された場合、reject 時点で null にセットされる
	 * (利用者のパスワード情報を即時削除するため)
	 */
	@Column('varchar', {
		length: 256,
		nullable: true,
	})
	public hashedPassword: string | null;

	/**
	 * 旗鯖fork: 申請が拒否された場合も、同一メールアドレスからの連続申請を拒否するため
	 * 一定期間 (Clean Processor の rejected レコード保持期間 = 90日) は保持される
	 */
	@Column('varchar', {
		length: 256,
		nullable: true,
	})
	public email: string | null;

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

	/**
	 * 旗鯖fork: 個人情報 (username / hashedPassword) を削除した日時
	 * - reject 時点で削除した場合は rejectedAt と同じ値
	 * - 既存データのクリーンアップ処理で削除した場合は実行日時
	 * - null の場合は「未削除 (pending または approved)」を意味する
	 */
	@Column('timestamp with time zone', {
		nullable: true,
	})
	public personalDataDeletedAt: Date | null;

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
