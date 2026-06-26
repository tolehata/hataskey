/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 * 旗鯖fork: プライベートチャンネルの権限判定・メンバーシップ管理。
 *   - 閲覧可否(canView): 公開チャンネルは誰でも可。プライベートは作成者・副管理者・メンバーのみ。
 *   - 管理可否(canManage): 作成者・副管理者・インスタンスのモデレーター。
 *   - メンバー追加/削除、あいことば(password)による入室。
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { ChannelsRepository, ChannelMembersRepository } from '@/models/_.js';
import type { MiChannel } from '@/models/Channel.js';
import type { MiUser } from '@/models/User.js';
import { IdService } from '@/core/IdService.js';
import { RoleService } from '@/core/RoleService.js';
import { bindThis } from '@/decorators.js';

@Injectable()
export class ChannelService {
	constructor(
		@Inject(DI.channelsRepository)
		private channelsRepository: ChannelsRepository,
		@Inject(DI.channelMembersRepository)
		private channelMembersRepository: ChannelMembersRepository,

		private idService: IdService,
		private roleService: RoleService,
	) {
	}

	// この Issue のメンバーか。
	@bindThis
	public async isMember(channelId: MiChannel['id'], userId: MiUser['id']): Promise<boolean> {
		return this.channelMembersRepository.exists({ where: { channelId, userId } });
	}

	// チャンネルを閲覧できるか。公開なら常に可。
	// プライベートなら作成者・副管理者・メンバー、加えてインスタンスのモデレーター/管理者(全チャンネルにアクセス可)。
	@bindThis
	public async canView(channel: MiChannel, userId: MiUser['id'] | null): Promise<boolean> {
		if (!channel.isPrivate) return true;
		if (userId == null) return false;
		if (channel.userId === userId) return true;
		if (channel.moderatorUserIds.includes(userId)) return true;
		if (await this.isMember(channel.id, userId)) return true;
		// モデレーター/管理者は全チャンネルへアクセスできる。
		return this.roleService.isModerator({ id: userId });
	}

	// チャンネル(メンバー・設定)を管理できるか。作成者・副管理者・インスタンスのモデレーター。
	@bindThis
	public async canManage(channel: MiChannel, userId: MiUser['id'] | null): Promise<boolean> {
		if (userId == null) return false;
		if (channel.userId === userId) return true;
		if (channel.moderatorUserIds.includes(userId)) return true;
		return this.roleService.isModerator({ id: userId });
	}

	@bindThis
	public async addMember(channelId: MiChannel['id'], userId: MiUser['id']): Promise<void> {
		if (await this.isMember(channelId, userId)) return;
		await this.channelMembersRepository.insert({
			id: this.idService.gen(),
			createdAt: new Date(),
			channelId,
			userId,
		});
	}

	@bindThis
	public async removeMember(channelId: MiChannel['id'], userId: MiUser['id']): Promise<void> {
		await this.channelMembersRepository.delete({ channelId, userId });
	}

	// あいことば(キーフレーズ)だけで該当するプライベートチャンネルを探す。見つからなければ null。
	@bindThis
	public async findPrivateChannelByPassword(password: string): Promise<MiChannel | null> {
		if (password == null || password.length === 0) return null;
		return this.channelsRepository.findOneBy({ isPrivate: true, password, isArchived: false });
	}

	// あいことばで入室(メンバー化)する。成功したら true。
	@bindThis
	public async joinByPassword(channel: MiChannel, userId: MiUser['id'], password: string): Promise<boolean> {
		if (!channel.isPrivate) return false;
		if (channel.password == null || channel.password.length === 0) return false;
		if (channel.password !== password) return false;
		await this.addMember(channel.id, userId);
		return true;
	}
}
