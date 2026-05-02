/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { WhackEmojiRoomsRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { MiWhackEmojiRoom } from '@/models/WhackEmojiRoom.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { bindThis } from '@/decorators.js';
import { MoreThan } from 'typeorm';

@Injectable()
export class WhackEmojiRoomService {
	constructor(
		@Inject(DI.whackEmojiRoomsRepository)
		private whackEmojiRoomsRepository: WhackEmojiRoomsRepository,

		private idService: IdService,
		private userEntityService: UserEntityService,
		private globalEventService: GlobalEventService,
	) {}

	@bindThis
	public async createRoom(user: MiUser, difficulty: number): Promise<MiWhackEmojiRoom> {
		// 既存の待機中ルームがあればそれを返す
		const existing = await this.whackEmojiRoomsRepository.findOne({
			where: { host1Id: user.id, state: 'waiting' },
			order: { createdAt: 'DESC' },
		});
		if (existing) return existing;

		const now = new Date();
		const room = await this.whackEmojiRoomsRepository.insert({
			id: this.idService.gen(now.getTime()),
			createdAt: now,
			host1Id: user.id,
			host2Id: null,
			difficulty: Math.max(1, Math.min(10, difficulty)),
			state: 'waiting',
			score1: 0, score2: 0,
			hits1: 0, hits2: 0,
			winner: null,
		}).then(x => this.whackEmojiRoomsRepository.findOneByOrFail({ id: x.identifiers[0].id }));
		return room;
	}

	@bindThis
	public async joinRoom(roomId: string, user: MiUser): Promise<MiWhackEmojiRoom> {
		const room = await this.whackEmojiRoomsRepository.findOneBy({ id: roomId });
		if (!room) throw new Error('Room not found');
		if (room.state !== 'waiting') throw new Error('Room is not waiting');
		if (room.host1Id === user.id) throw new Error('Cannot join own room');
		if (room.host2Id != null) throw new Error('Room is full');

		await this.whackEmojiRoomsRepository.update(roomId, {
			host2Id: user.id,
			state: 'playing',
		});

		const updated = await this.whackEmojiRoomsRepository.findOneByOrFail({ id: roomId });
		this.publish(roomId, 'started', { roomId, host2Id: user.id });
		return updated;
	}

	@bindThis
	public async getWaitingRooms(): Promise<MiWhackEmojiRoom[]> {
		return this.whackEmojiRoomsRepository.find({
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
	public async getRoom(roomId: string): Promise<MiWhackEmojiRoom | null> {
		return this.whackEmojiRoomsRepository.findOne({
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
		const room = await this.whackEmojiRoomsRepository.findOneBy({ id: roomId });
		if (!room) return false;
		return room.host1Id === userId || room.host2Id === userId;
	}

	@bindThis
	public async reportScore(roomId: string, userId: string, score: number, hits: number) {
		const room = await this.whackEmojiRoomsRepository.findOneBy({ id: roomId });
		if (!room) return;

		if (userId === room.host1Id) {
			await this.whackEmojiRoomsRepository.update(roomId, { score1: score, hits1: hits });
		} else if (userId === room.host2Id) {
			await this.whackEmojiRoomsRepository.update(roomId, { score2: score, hits2: hits });
		}

		this.publish(roomId, 'scoreUpdate', { userId, score, hits });
	}

	@bindThis
	public async reportWhack(roomId: string, userId: string, data: { cellIndex: number; isHit: boolean }) {
		this.publish(roomId, 'whack', { userId, ...data });
	}

	@bindThis
	public async endGame(roomId: string) {
		const room = await this.whackEmojiRoomsRepository.findOneBy({ id: roomId });
		if (!room || room.state !== 'playing') return;

		let winner: number;
		if (room.score1 > room.score2) winner = 1;
		else if (room.score2 > room.score1) winner = 2;
		else winner = 0;

		await this.whackEmojiRoomsRepository.update(roomId, { state: 'ended', winner });
		this.publish(roomId, 'ended', { winner, score1: room.score1, score2: room.score2 });
	}

	@bindThis
	public async reportDisconnect(roomId: string, userId: string) {
		const room = await this.whackEmojiRoomsRepository.findOneBy({ id: roomId });
		if (!room || room.state !== 'playing') return;

		let winner: number;
		if (userId === room.host1Id) {
			winner = 2;
		} else if (userId === room.host2Id) {
			winner = 1;
		} else {
			return; // 観戦者の切断は無視
		}

		await this.whackEmojiRoomsRepository.update(roomId, { state: 'ended', winner });
		this.publish(roomId, 'ended', { winner, score1: room.score1, score2: room.score2, reason: 'disconnect' });
	}

	@bindThis
	public async packRoom(room: MiWhackEmojiRoom, me?: MiUser | null) {
		return {
			id: room.id,
			createdAt: room.createdAt.toISOString(),
			host1: room.host1 ? await this.userEntityService.pack(room.host1, me) : null,
			host2: room.host2 ? await this.userEntityService.pack(room.host2, me) : null,
			host1Id: room.host1Id,
			host2Id: room.host2Id,
			difficulty: room.difficulty,
			state: room.state,
			score1: room.score1,
			score2: room.score2,
			hits1: room.hits1,
			hits2: room.hits2,
			winner: room.winner,
		};
	}

	@bindThis
	private publish(roomId: string, type: string, body: Record<string, any>) {
		this.globalEventService.publishWhackEmojiRoomStream(roomId, type, body);
	}
}
