/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { WhackEmojiRoomService } from '@/core/WhackEmojiRoomService.js';
import { isJsonObject } from '@/misc/json-value.js';
import type { JsonObject, JsonValue } from '@/misc/json-value.js';
import Channel, { type MiChannelService } from '../channel.js';

const MAX_REASONABLE_SCORE = 200_000;
const MAX_REASONABLE_HITS = 5_000;
// セルインデックスは 9マス想定 (3x3) で 0〜8。安全のため 0〜63 まで許容。
const MAX_CELL_INDEX = 63;

class WhackEmojiRoomChannel extends Channel {
	public readonly chName = 'whackEmojiRoom';
	public static shouldShare = false;
	// ★ 認証必須に変更 (旧: false)
	public static requireCredential = true as const;
	public static kind = 'read:account';
	private roomId: string | null = null;

	constructor(
		private whackEmojiRoomService: WhackEmojiRoomService,
		id: string,
		connection: Channel['connection'],
	) {
		super(id, connection);
	}

	@bindThis
	public async init(params: JsonObject) {
		if (typeof params.roomId !== 'string') return;
		if (!/^[A-Za-z0-9_-]{1,64}$/.test(params.roomId)) return;
		if (!this.user) return;
		// ★ 認可: 接続ユーザーがそのルームの参加者でなければ subscribe 拒否
		const isMember = await this.whackEmojiRoomService.isMember?.(params.roomId, this.user.id);
		if (isMember === false) return;

		this.roomId = params.roomId;
		this.subscriber.on(`whackEmojiRoomStream:${this.roomId}`, this.send);
	}

	@bindThis
	public onMessage(type: string, body: JsonValue) {
		if (!this.user || !this.roomId) return;
		switch (type) {
			case 'scoreUpdate': {
				if (!isJsonObject(body)) return;
				const rawScore = typeof body.score === 'number' && Number.isFinite(body.score) ? body.score : 0;
				const rawHits = typeof body.hits === 'number' && Number.isFinite(body.hits) ? body.hits : 0;
				const score = Math.max(0, Math.min(MAX_REASONABLE_SCORE, Math.floor(rawScore)));
				const hits = Math.max(0, Math.min(MAX_REASONABLE_HITS, Math.floor(rawHits)));
				this.whackEmojiRoomService.reportScore(this.roomId, this.user.id, score, hits);
				break;
			}
			case 'whack': {
				if (!isJsonObject(body)) return;
				const rawIdx = typeof body.cellIndex === 'number' && Number.isFinite(body.cellIndex) ? body.cellIndex : 0;
				const cellIndex = Math.max(0, Math.min(MAX_CELL_INDEX, Math.floor(rawIdx)));
				const isHit = typeof body.isHit === 'boolean' ? body.isHit : false;
				this.whackEmojiRoomService.reportWhack(this.roomId, this.user.id, { cellIndex, isHit });
				break;
			}
			case 'timeUp':
				this.whackEmojiRoomService.endGame(this.roomId);
				break;
		}
	}

	@bindThis
	public dispose() {
		if (this.roomId) {
			this.subscriber.off(`whackEmojiRoomStream:${this.roomId}`, this.send);
			if (this.user) {
				this.whackEmojiRoomService.reportDisconnect(this.roomId, this.user.id);
			}
		}
	}
}

@Injectable()
export class WhackEmojiRoomChannelService implements MiChannelService<true> {
	public readonly shouldShare = WhackEmojiRoomChannel.shouldShare;
	public readonly requireCredential = WhackEmojiRoomChannel.requireCredential;
	public readonly kind = WhackEmojiRoomChannel.kind;

	constructor(
		private whackEmojiRoomService: WhackEmojiRoomService,
	) {
	}

	@bindThis
	public create(id: string, connection: Channel['connection']): WhackEmojiRoomChannel {
		return new WhackEmojiRoomChannel(
			this.whackEmojiRoomService,
			id,
			connection,
		);
	}
}
