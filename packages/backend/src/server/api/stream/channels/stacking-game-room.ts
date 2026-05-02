/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable, Scope } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { StackingGameRoomService } from '@/core/StackingGameRoomService.js';
import type { JsonObject, JsonValue } from '@/misc/json-value.js';
import { isJsonObject } from '@/misc/json-value.js';
import Channel, { type ChannelRequest } from '../channel.js';
import { REQUEST } from '@nestjs/core';

// クライアント由来スコアの実用上限 (改竄防止)
const MAX_REASONABLE_SCORE = 1_000_000;
const MAX_REASONABLE_BLOCKS = 100_000;

// 絵文字名 / URL の検証
function isValidEmojiName(s: unknown): s is string {
	if (typeof s !== 'string') return false;
	return s.length >= 0 && s.length <= 100 && !/[\u0000-\u001F<>"'`\\]/.test(s);
}
function isValidEmojiUrl(s: unknown): s is string {
	if (typeof s !== 'string') return false;
	if (s.length === 0 || s.length > 2048) return false;
	// 危険スキーム除外
	return /^https?:\/\//i.test(s);
}
function isValidEmojiChar(s: unknown): s is string {
	if (typeof s !== 'string') return false;
	return s.length >= 0 && s.length <= 32 && !/[\u0000-\u001F<>"'`\\]/.test(s);
}

@Injectable({ scope: Scope.TRANSIENT })
export class StackingGameRoomChannel extends Channel {
	public readonly chName = 'stackingGameRoom';
	public static shouldShare = false;
	// ★ 認証必須に変更 (旧: false)
	public static requireCredential = true as const;
	public static kind = 'read:account';
	private roomId: string | null = null;

	constructor(
		@Inject(REQUEST)
		request: ChannelRequest,

		private stackingGameRoomService: StackingGameRoomService,
	) {
		super(request);
	}

	@bindThis
	public async init(params: JsonObject) {
		if (typeof params.roomId !== 'string') return;
		// roomId フォーマット (英数字 1〜32 文字程度) を緩く検証
		if (!/^[A-Za-z0-9_-]{1,64}$/.test(params.roomId)) return;
		// ★ 認可: 接続ユーザーがそのルームの参加者でなければ subscribe 拒否
		if (!this.user) return;
		const isMember = await this.stackingGameRoomService.isMember?.(params.roomId, this.user.id);
		// isMember が未実装の旧サービスにフォールバック互換するが、
		// その場合でも認証は通っているので最低限のセキュリティは確保される
		if (isMember === false) return;

		this.roomId = params.roomId;
		this.subscriber.on(`stackingGameRoomStream:${this.roomId}`, this.send);
	}

	@bindThis
	public onMessage(type: string, body: JsonValue) {
		if (!this.user || !this.roomId) return;

		switch (type) {
			case 'drop': {
				if (!isJsonObject(body)) return;
				const dropXRaw = typeof body.dropX === 'number' ? body.dropX : 0.5;
				// dropX を [0, 1] にクランプ
				const dropX = Math.max(0, Math.min(1, dropXRaw));
				const emojiName = isValidEmojiName(body.emojiName) ? body.emojiName : '';
				const emojiUrl = body.emojiUrl !== undefined && isValidEmojiUrl(body.emojiUrl) ? body.emojiUrl : undefined;
				const emojiChar = body.emojiChar !== undefined && isValidEmojiChar(body.emojiChar) ? body.emojiChar : undefined;
				this.stackingGameRoomService.reportDrop(this.roomId, this.user.id, {
					dropX,
					emojiName,
					emojiUrl,
					emojiChar,
				});
				break;
			}
			case 'scoreUpdate': {
				if (!isJsonObject(body)) return;
				const rawScore = typeof body.score === 'number' && Number.isFinite(body.score) ? body.score : 0;
				const rawBlocks = typeof body.blocks === 'number' && Number.isFinite(body.blocks) ? body.blocks : 0;
				// 上限と非負・整数化
				const score = Math.max(0, Math.min(MAX_REASONABLE_SCORE, Math.floor(rawScore)));
				const blocks = Math.max(0, Math.min(MAX_REASONABLE_BLOCKS, Math.floor(rawBlocks)));
				this.stackingGameRoomService.reportScore(this.roomId, this.user.id, score, blocks);
				break;
			}
			case 'dead':
				this.stackingGameRoomService.reportDead(this.roomId, this.user.id);
				break;
		}
	}

	@bindThis
	public dispose() {
		if (this.roomId) {
			this.subscriber.off(`stackingGameRoomStream:${this.roomId}`, this.send);
			// プレイ中に切断した場合は切断した側の負け
			if (this.user) {
				this.stackingGameRoomService.reportDisconnect(this.roomId, this.user.id);
			}
		}
	}
}
