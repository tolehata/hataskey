import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { StackingGameRoomService } from '@/core/StackingGameRoomService.js';
import { isJsonObject } from '@/misc/json-value.js';
import type { JsonObject, JsonValue } from '@/misc/json-value.js';
import Channel, { type MiChannelService } from '../channel.js';

class StackingGameRoomChannel extends Channel {
	public readonly chName = 'stackingGameRoom';
	public static shouldShare = false;
	public static requireCredential = false as const;
	private roomId: string | null = null;
	constructor(private stackingGameRoomService: StackingGameRoomService, id: string, connection: Channel['connection']) { super(id, connection); }
	@bindThis
	public async init(params: JsonObject) { if (typeof params.roomId !== 'string') return; this.roomId = params.roomId; this.subscriber.on(`stackingGameRoomStream:${this.roomId}`, this.send); }
	@bindThis
	public onMessage(type: string, body: JsonValue) {
		if (!this.user) return;
		switch (type) {
			case 'drop': if (!isJsonObject(body)) return; this.stackingGameRoomService.reportDrop(this.roomId!, this.user.id, { dropX: typeof body.dropX === 'number' ? body.dropX : 0.5, emojiName: typeof body.emojiName === 'string' ? body.emojiName : '', emojiUrl: typeof body.emojiUrl === 'string' ? body.emojiUrl : undefined, emojiChar: typeof body.emojiChar === 'string' ? body.emojiChar : undefined }); break;
			case 'scoreUpdate': if (!isJsonObject(body)) return; this.stackingGameRoomService.reportScore(this.roomId!, this.user.id, typeof body.score === 'number' ? body.score : 0, typeof body.blocks === 'number' ? body.blocks : 0); break;
			case 'dead': this.stackingGameRoomService.reportDead(this.roomId!, this.user.id); break;
		}
	}
	@bindThis
	public dispose() { if (this.roomId) { this.subscriber.off(`stackingGameRoomStream:${this.roomId}`, this.send); if (this.user) this.stackingGameRoomService.reportDisconnect(this.roomId, this.user.id); } }
}

@Injectable()
export class StackingGameRoomChannelService implements MiChannelService<false> {
	public readonly shouldShare = StackingGameRoomChannel.shouldShare;
	public readonly requireCredential = StackingGameRoomChannel.requireCredential;
	public readonly kind = StackingGameRoomChannel.kind;
	constructor(private stackingGameRoomService: StackingGameRoomService) {}
	@bindThis
	public create(id: string, connection: Channel['connection']): StackingGameRoomChannel { return new StackingGameRoomChannel(this.stackingGameRoomService, id, connection); }
}
