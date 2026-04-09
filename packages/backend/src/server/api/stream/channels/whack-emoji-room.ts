import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { WhackEmojiRoomService } from '@/core/WhackEmojiRoomService.js';
import { isJsonObject } from '@/misc/json-value.js';
import type { JsonObject, JsonValue } from '@/misc/json-value.js';
import Channel, { type MiChannelService } from '../channel.js';

class WhackEmojiRoomChannel extends Channel {
	public readonly chName = 'whackEmojiRoom';
	public static shouldShare = false;
	public static requireCredential = false as const;
	private roomId: string | null = null;
	constructor(private whackEmojiRoomService: WhackEmojiRoomService, id: string, connection: Channel['connection']) { super(id, connection); }
	@bindThis
	public async init(params: JsonObject) { if (typeof params.roomId !== 'string') return; this.roomId = params.roomId; this.subscriber.on(`whackEmojiRoomStream:${this.roomId}`, this.send); }
	@bindThis
	public onMessage(type: string, body: JsonValue) {
		if (!this.user) return;
		switch (type) {
			case 'scoreUpdate': if (!isJsonObject(body)) return; this.whackEmojiRoomService.reportScore(this.roomId!, this.user.id, typeof body.score === 'number' ? body.score : 0, typeof body.hits === 'number' ? body.hits : 0); break;
			case 'whack': if (!isJsonObject(body)) return; this.whackEmojiRoomService.reportWhack(this.roomId!, this.user.id, { cellIndex: typeof body.cellIndex === 'number' ? body.cellIndex : 0, isHit: typeof body.isHit === 'boolean' ? body.isHit : false }); break;
			case 'timeUp': this.whackEmojiRoomService.endGame(this.roomId!); break;
		}
	}
	@bindThis
	public dispose() { if (this.roomId) { this.subscriber.off(`whackEmojiRoomStream:${this.roomId}`, this.send); if (this.user) this.whackEmojiRoomService.reportDisconnect(this.roomId, this.user.id); } }
}

@Injectable()
export class WhackEmojiRoomChannelService implements MiChannelService<false> {
	public readonly shouldShare = WhackEmojiRoomChannel.shouldShare;
	public readonly requireCredential = WhackEmojiRoomChannel.requireCredential;
	public readonly kind = WhackEmojiRoomChannel.kind;
	constructor(private whackEmojiRoomService: WhackEmojiRoomService) {}
	@bindThis
	public create(id: string, connection: Channel['connection']): WhackEmojiRoomChannel { return new WhackEmojiRoomChannel(this.whackEmojiRoomService, id, connection); }
}
