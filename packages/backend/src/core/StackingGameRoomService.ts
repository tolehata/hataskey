/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import type { StackingGameRoomsRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { MiStackingGameRoom } from '@/models/StackingGameRoom.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { bindThis } from '@/decorators.js';
import { MoreThan } from 'typeorm';

@Injectable()
export class StackingGameRoomService {
	constructor(
		@Inject(DI.stackingGameRoomsRepository)
		private stackingGameRoomsRepository: StackingGameRoomsRepository,

		private idService: IdService,
		private userEntityService: UserEntityService,
		private globalEventService: GlobalEventService,
	) {}

	@bindThis
	public async createRoom(user: MiUser, gameMode: string): Promise<MiStackingGameRoom> {
		// 既存の待機中ルームがあればそれを返す（重複作成防止）
		const existing = await this.stackingGameRoomsRepository.findOne({
			where: {
				host1Id: user.id,
				state: 'waiting',
			},
			order: { createdAt: 'DESC' },
		});
		if (existing) return existing;

		const now = new Date();
		const room = await this.stackingGameRoomsRepository.insert({
			id: this.idService.gen(now.getTime()),
			createdAt: now,
			host1Id: user.id,
			host2Id: null,
			gameMode,
			state: 'waiting',
			score1: 0, score2: 0,
			blocks1: 0, blocks2: 0,
			winner: null,
		}).then(x => this.stackingGameRoomsRepository.findOneByOrFail({ id: x.identifiers[0].id }));

		return room;
	}

	@bindThis
	public async joinRoom(roomId: string, user: MiUser): Promise<MiStackingGameRoom> {
		const room = await this.stackingGameRoomsRepository.findOneBy({ id: roomId });
		if (!room) throw new Error('Room not found');
		if (room.state !== 'waiting') throw new Error('Room is not waiting');
		if (room.host1Id === user.id) throw new Error('Cannot join own room');
		if (room.host2Id != null) throw new Error('Room is full');

		await this.stackingGameRoomsRepository.update(roomId, {
			host2Id: user.id,
			state: 'playing',
		});

		const updated = await this.stackingGameRoomsRepository.findOneByOrFail({ id: roomId });

		// WebSocket通知: ゲーム開始
		this.publishToRoom(roomId, 'started', {
			roomId,
			host2Id: user.id,
		});

		return updated;
	}

	@bindThis
	public async getWaitingRooms(): Promise<MiStackingGameRoom[]> {
		// 10分以内の待機ルーム
		return this.stackingGameRoomsRepository.find({
			where: {
				state: 'waiting',
				id: MoreThan(this.idService.gen(Date.now() - 1000 * 60 * 10)),
			},
			relations: ['host1'],
			order: { createdAt: 'DESC' },
			take: 20,
		});
	}

	@bindThis
	public async getRoom(roomId: string): Promise<MiStackingGameRoom | null> {
		return this.stackingGameRoomsRepository.findOne({
			where: { id: roomId },
			relations: ['host1', 'host2'],
		});
	}

	/**
	 * 指定ユーザーが該当ルームの参加者かどうか。
	 * チャネル接続時の認可チェックに使用。
	 */
	@bindThis
	public async isMember(roomId: string, userId: string): Promise<boolean> {
		const room = await this.stackingGameRoomsRepository.findOneBy({ id: roomId });
		if (!room) return false;
		return room.host1Id === userId || room.host2Id === userId;
	}

	@bindThis
	public async reportDrop(roomId: string, userId: string, data: { dropX: number; emojiName: string; emojiUrl?: string; emojiChar?: string }) {
		// 対戦相手と観戦者にドロップイベントを配信
		this.publishToRoom(roomId, 'drop', {
			userId,
			...data,
		});
	}

	@bindThis
	public async reportScore(roomId: string, userId: string, score: number, blocks: number) {
		const room = await this.stackingGameRoomsRepository.findOneBy({ id: roomId });
		if (!room) return;

		if (userId === room.host1Id) {
			await this.stackingGameRoomsRepository.update(roomId, { score1: score, blocks1: blocks });
		} else if (userId === room.host2Id) {
			await this.stackingGameRoomsRepository.update(roomId, { score2: score, blocks2: blocks });
		}

		this.publishToRoom(roomId, 'scoreUpdate', {
			userId, score, blocks,
		});
	}

	@bindThis
	public async reportDead(roomId: string, userId: string) {
		const room = await this.stackingGameRoomsRepository.findOneBy({ id: roomId });
		if (!room || room.state !== 'playing') return;

		// 先に死んだ方が負け
		let winner: number;
		if (userId === room.host1Id) {
			winner = 2; // host2 wins
		} else if (userId === room.host2Id) {
			winner = 1; // host1 wins
		} else {
			return;
		}

		await this.stackingGameRoomsRepository.update(roomId, {
			state: 'ended',
			winner,
		});

		this.publishToRoom(roomId, 'ended', {
			winner,
			loserId: userId,
		});
	}

	@bindThis
	public async cancelRoom(roomId: string, userId: string) {
		const room = await this.stackingGameRoomsRepository.findOneBy({ id: roomId });
		if (!room) return;
		if (room.host1Id !== userId) return;
		if (room.state !== 'waiting') return;

		await this.stackingGameRoomsRepository.update(roomId, { state: 'ended' });

		this.publishToRoom(roomId, 'canceled', { userId });
	}

	@bindThis
	public async reportDisconnect(roomId: string, userId: string) {
		const room = await this.stackingGameRoomsRepository.findOneBy({ id: roomId });
		if (!room || room.state !== 'playing') return;

		// プレイ中に切断した場合、切断した側の負け
		let winner: number;
		if (userId === room.host1Id) {
			winner = 2;
		} else if (userId === room.host2Id) {
			winner = 1;
		} else {
			return; // 観戦者の切断は無視
		}

		await this.stackingGameRoomsRepository.update(roomId, { state: 'ended', winner });
		this.publishToRoom(roomId, 'ended', { winner, loserId: userId, reason: 'disconnect' });
	}

	@bindThis
	public async packRoom(room: MiStackingGameRoom, me?: MiUser | null) {
		return {
			id: room.id,
			createdAt: room.createdAt.toISOString(),
			host1: room.host1 ? await this.userEntityService.pack(room.host1, me) : null,
			host2: room.host2 ? await this.userEntityService.pack(room.host2, me) : null,
			host1Id: room.host1Id,
			host2Id: room.host2Id,
			gameMode: room.gameMode,
			state: room.state,
			score1: room.score1,
			score2: room.score2,
			blocks1: room.blocks1,
			blocks2: room.blocks2,
			winner: room.winner,
		};
	}

	@bindThis
	private publishToRoom(roomId: string, type: string, body: Record<string, any>) {
		this.globalEventService.publishStackingGameRoomStream(roomId, type, body);
	}
}
