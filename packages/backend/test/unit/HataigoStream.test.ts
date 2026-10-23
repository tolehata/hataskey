/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Ajv from 'ajv';
import { HataigoGameChannel } from '@/server/api/stream/channels/hataigo-game.js';
import { HataigoError } from '@/misc/hataigo/types.js';
import { hataigoApi, hataigoActionSchema, hataigoErrorCode } from '@/misc/hataigo/api.js';
import { isHataigoReaction } from '@/misc/hataigo/presence.js';

vi.mock('@/core/HataigoChatService.js', () => ({ HataigoChatService: class {} }));
vi.mock('@/core/HataigoService.js', () => ({ HataigoService: class {} }));
vi.mock('@/core/GlobalEventService.js', () => ({ GlobalEventService: class {} }));

const disposals: (() => void)[] = [];
afterEach(() => { disposals.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); });

async function flush(): Promise<void> { for (let n = 0; n < 12; n++) await Promise.resolve(); }

function fixture({ participant = true, authenticated = true, write = true } = {}) {
	const viewer = authenticated ? { id: 'alice', host: null, isDeleted: false, isSuspended: false } : undefined;
	const game = { id: 'game1', user1Id: participant ? 'alice' : 'bob', user2Id: 'carol', phase: 'playing', allowSpectate: true, publicAfterEnd: false };
	const subscriber = new EventEmitter();
	const sent = vi.fn();
	const games = { get: vi.fn(async () => game), act: vi.fn(async () => game), claimTimeout: vi.fn(async () => game), rateLimit: vi.fn(async () => {}) };
	const redis = { eval: vi.fn(async () => 2) };
	const events = { publishHataigoGameStream: vi.fn() };
	const connection = { user: viewer, subscriber, hasPermission: vi.fn((permission: string) => authenticated && (permission === 'read:account' || write)), sendMessageToWs: sent, disconnectChannel: vi.fn() };
	const chat = { getPacked: vi.fn(async () => ({ id: 'message1', text: 'public' })), post: vi.fn(async () => {}), delete: vi.fn(async () => {}) };
	const channel = new HataigoGameChannel(games as never, redis as never, events as never, 'c1', connection as never, chat as never);
	disposals.push(() => channel.dispose());
	return { channel, games, redis, events, sent, subscriber, connection, chat };
}

describe('HataIgo streaming authorization', () => {
	test('refuses private subscription before registering a listener or presence', async () => {
		const f = fixture({ participant: false });
		f.games.get.mockRejectedValue(new HataigoError('NOT_FOUND'));
		expect(await f.channel.init({ gameId: 'game1' })).toBe(false);
		expect(f.subscriber.listenerCount('hataigoGameStream:game1')).toBe(0);
		expect(f.redis.eval).not.toHaveBeenCalled();
	});
	test('rechecks publication on every event and revokes an existing subscription', async () => {
		const f = fixture({ participant: false });
		expect(await f.channel.init({ gameId: 'game1' })).toBe(true);
		f.games.get.mockRejectedValue(new HataigoError('NOT_FOUND'));
		f.subscriber.emit('hataigoGameStream:game1', { type: 'updated', body: { revision: 50 } });
		await flush();
		expect(f.sent).toHaveBeenCalledWith('channel', { id: 'c1', type: 'revoked', body: {} });
		expect(f.sent.mock.calls.some(([, body]) => body.type === 'updated')).toBe(false);
		expect(f.connection.disconnectChannel).toHaveBeenCalledWith('c1');
	});
	test('requires write scope even when the participant may subscribe with read scope', async () => {
		const f = fixture({ write: false });
		expect(await f.channel.init({ gameId: 'game1' })).toBe(true);
		f.channel.onMessage('action', { requestId: 'r1', expectedRevision: 0, action: { type: 'pass' } });
		await flush();
		expect(f.games.act).not.toHaveBeenCalled();
		expect(f.sent).toHaveBeenCalledWith('channel', { id: 'c1', type: 'ack', body: { requestId: 'r1', ok: false, error: 'HATAIGO_UNAVAILABLE' } });
	});
	test('allows anonymous public viewing but no mutation or free-form reaction', async () => {
		const f = fixture({ participant: false, authenticated: false });
		expect(await f.channel.init({ gameId: 'game1' })).toBe(true);
		f.channel.onMessage('action', { requestId: 'r1', expectedRevision: 0, action: { type: 'pass' } });
		f.channel.onMessage('reaction', { reaction: 'arbitrary' });
		await flush();
		expect(f.games.act).not.toHaveBeenCalled();
		expect(f.games.rateLimit).not.toHaveBeenCalled();
		expect(f.events.publishHataigoGameStream).toHaveBeenCalledWith('game1', 'spectators', { count: 2 });
	});
	test('passes explicit current revision and only acknowledges after server acceptance', async () => {
		const f = fixture();
		await f.channel.init({ gameId: 'game1' });
		f.channel.onMessage('action', { requestId: 'r2', expectedRevision: 8, action: { type: 'play', point: { x: 0, y: 0 } } });
		await flush();
		expect(f.games.act).toHaveBeenCalledWith('game1', f.connection.user, { type: 'play', point: { x: 0, y: 0 } }, 8);
		expect(f.sent).toHaveBeenCalledWith('channel', { id: 'c1', type: 'ack', body: { requestId: 'r2', ok: true } });
	});
	test('releases a late presence join when disposal happens while Redis is awaiting', async () => {
		const f = fixture({ participant: false });
		let release: (value: number) => void = () => {};
		f.redis.eval.mockImplementationOnce(() => new Promise<number>(resolve => { release = resolve; }));
		const connecting = f.channel.init({ gameId: 'game1' });
		await flush();
		f.channel.dispose();
		release(2);
		expect(await connecting).toBe(false);
		await flush();
		const operations = f.redis.eval.mock.calls as unknown as unknown[][];
		expect(operations.filter(call => call.at(-1) === 'leave').length).toBeGreaterThanOrEqual(1);
		expect(f.events.publishHataigoGameStream.mock.calls.every(([, type]) => type === 'spectators')).toBe(true);
		expect(f.subscriber.listenerCount('hataigoGameStream:game1')).toBe(0);
	});
});

test('API and streaming errors conceal missing versus inaccessible game identities', async () => {
	for (const code of ['FORBIDDEN', 'NOT_FOUND'] as const) {
		expect(hataigoErrorCode(new HataigoError(code))).toBe('HATAIGO_UNAVAILABLE');
		await expect(hataigoApi(async () => { throw new HataigoError(code); })).rejects.toMatchObject({ code: 'HATAIGO_UNAVAILABLE', httpStatusCode: 404 });
	}
});

test('HTTP action schema rejects server-owned colors, timeout and disguised messages', () => {
	const validate = new Ajv().compile(hataigoActionSchema);
	expect(validate({ type: 'play', point: { x: 0, y: 0 } })).toBe(true);
	for (const invalid of [{ type: 'timeout' }, { type: 'pass', color: 'white' }, { type: 'setScoring', marks: { deadStones: [], neutralPoints: [{ x: 0, y: 0, message: 'hidden' }] } }]) expect(validate(invalid)).toBe(false);
});

test('the reaction allowlist rejects the positive controls', () => {
	for (const value of ['👏', '😮', '🤔', '😂', '🔥', '🙏']) expect(isHataigoReaction(value)).toBe(true);
	for (const value of ['hello', '👏hello', ':custom:', null, {}, '']) expect(isHataigoReaction(value)).toBe(false);
});

test('chat events are freshly authorized and packed per viewer; disabled/private chat never leaks internal IDs', async () => {
	const f = fixture();
	await f.channel.init({ gameId: 'game1' });
	f.subscriber.emit('hataigoGameStream:game1', { type: 'chatMessage', body: { messageId: 'message1' } });
	await flush();
	expect(f.chat.getPacked).toHaveBeenCalledWith('message1', f.connection.user, 'game1');
	expect(f.sent).toHaveBeenCalledWith('channel', { id: 'c1', type: 'chatMessage', body: { id: 'message1', text: 'public' } });
	f.sent.mockClear();
	f.chat.getPacked.mockRejectedValue(new HataigoError('CHAT_DISABLED'));
	f.subscriber.emit('hataigoGameStream:game1', { type: 'chatDeleted', body: { messageId: 'secret' } });
	await flush();
	expect(f.sent).not.toHaveBeenCalled();
	expect(f.connection.disconnectChannel).not.toHaveBeenCalled();
});

test('chat channel commands require write scope and deletion remains bound to the subscribed room', async () => {
	const f = fixture();
	await f.channel.init({ gameId: 'game1' });
	f.channel.onMessage('chatPost', { requestId: 'post', text: 'public text' });
	f.channel.onMessage('chatDelete', { requestId: 'delete', messageId: 'message1', reason: 'spam' });
	await flush();
	expect(f.chat.post).toHaveBeenCalledWith('game1', f.connection.user, 'public text');
	expect(f.chat.delete).toHaveBeenCalledWith('message1', f.connection.user, 'spam', 'game1');
	const denied = fixture({ write: false });
	await denied.channel.init({ gameId: 'game1' });
	denied.channel.onMessage('chatPost', { requestId: 'post', text: 'private bypass' });
	await flush();
	expect(denied.chat.post).not.toHaveBeenCalled();
});
