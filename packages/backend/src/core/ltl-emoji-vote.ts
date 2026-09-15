/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const LTL_EMOJI_VOTE_TRIGGER = '絵文字を選ぶぞ';
export const LTL_EMOJI_VOTE_DURATION_MS = 15_000;
export const LTL_EMOJI_VOTE_TALLY_MS = 1_800;
export const LTL_EMOJI_VOTE_RESULT_MS = 20_000;
export const LTL_EMOJI_VOTE_EXIT_MS = 480;
export const LTL_EMOJI_VOTE_FRESH_MS = 10_000;
export const LTL_EMOJI_VOTE_START_DELAY_MS = 1_500;
export const LTL_EMOJI_VOTE_KEY = 'hata:ltl-emoji-vote:active';

export type LtlVoteEmoji = { id: string; name: string; url: string; isSensitive: boolean };
export type LtlVoteChoice = { emojiId: string; votedAt: number };
export type LtlVoteMetadata = {
	id: string;
	noteId: string;
	startedAt: number;
	closesAt: number;
	resolvedAt: number;
	expiresAt: number;
	candidates: LtlVoteEmoji[];
};
export type LtlVoteRanking = { emoji: LtlVoteEmoji; count: number; rank: number | null; tied: boolean };
export type LtlVoteResponse = {
	serverNow: number;
	round: (LtlVoteMetadata & {
		phase: 'voting' | 'tallying' | 'result';
		choice: LtlVoteChoice | null;
		rankings: LtlVoteRanking[];
		total: number;
	}) | null;
};

// Lua 内で Redis の時刻を読み、受付判定と書き込みを同じ原子操作にする。
const REDIS_NOW = `
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
`;

export const LTL_EMOJI_VOTE_START_SCRIPT = `${REDIS_NOW}
local createdAt = tonumber(ARGV[2])
local requestedAt = tonumber(ARGV[3])
if now < createdAt - 1000 or now - createdAt > tonumber(ARGV[4]) then return 0 end
if now < requestedAt - 1000 or now - requestedAt > tonumber(ARGV[5]) then return 0 end
if redis.call('EXISTS', KEYS[1]) == 1 or redis.call('EXISTS', KEYS[2]) == 1 then return 0 end
local round = cjson.decode(ARGV[1])
round.startedAt = now
round.closesAt = now + tonumber(ARGV[6])
round.resolvedAt = round.closesAt + tonumber(ARGV[7])
round.expiresAt = round.resolvedAt + tonumber(ARGV[8])
redis.call('HSET', KEYS[1], 'metadata', cjson.encode(round))
for _, emoji in ipairs(round.candidates) do
	redis.call('HSET', KEYS[1], 'count:' .. emoji.id, 0)
end
redis.call('PEXPIREAT', KEYS[1], round.expiresAt + tonumber(ARGV[9]))
redis.call('PSETEX', KEYS[2], tonumber(ARGV[4]) + 60000, '1')
return 1
`;

// 自分の選択と最大5件の集計だけを返す。他人の個別票は走査も送信もしない。
export const LTL_EMOJI_VOTE_READ_SCRIPT = `${REDIS_NOW}
local raw = redis.call('HGET', KEYS[1], 'metadata')
if not raw then return { tostring(now), '' } end
local round = cjson.decode(raw)
if now >= round.expiresAt then return { tostring(now), '' } end
local choice = ''
if ARGV[1] ~= '' then choice = redis.call('HGET', KEYS[1], 'vote:' .. ARGV[1]) or '' end
local result = { tostring(now), raw, choice }
for _, emoji in ipairs(round.candidates) do
	table.insert(result, redis.call('HGET', KEYS[1], 'count:' .. emoji.id) or '0')
end
return result
`;

export const LTL_EMOJI_VOTE_CAST_SCRIPT = `${REDIS_NOW}
local raw = redis.call('HGET', KEYS[1], 'metadata')
if not raw then return 'NO_SUCH_ROUND' end
local round = cjson.decode(raw)
if round.id ~= ARGV[1] or now >= round.expiresAt then return 'NO_SUCH_ROUND' end
if now >= round.closesAt then return 'VOTING_CLOSED' end
if redis.call('HEXISTS', KEYS[1], 'vote:' .. ARGV[2]) == 1 then return 'ALREADY_VOTED' end
local valid = false
for _, emoji in ipairs(round.candidates) do
	if emoji.id == ARGV[3] then valid = true end
end
if not valid then return 'INVALID_EMOJI' end
redis.call('HSET', KEYS[1], 'vote:' .. ARGV[2], cjson.encode({ emojiId = ARGV[3], votedAt = now }))
redis.call('HINCRBY', KEYS[1], 'count:' .. ARGV[3], 1)
return 'OK'
`;

export function rankLtlEmojiVotes(candidates: LtlVoteEmoji[], counts: number[]): LtlVoteRanking[] {
	const rows = candidates.map((emoji, index) => ({ emoji, count: counts[index], index }));
	rows.sort((a, b) => b.count - a.count || a.index - b.index);
	const hasVotes = rows.some(row => row.count > 0);
	return rows.map((row, index) => ({
		emoji: row.emoji,
		count: row.count,
		rank: hasVotes ? rows.findIndex(other => other.count === row.count) + 1 : null,
		tied: hasVotes && (rows[index - 1]?.count === row.count || rows[index + 1]?.count === row.count),
	}));
}

export function parseLtlEmojiVoteRead(value: unknown): {
	serverNow: number;
	metadata: LtlVoteMetadata | null;
	choice: LtlVoteChoice | null;
	counts: number[];
} {
	if (!Array.isArray(value) || !Number.isFinite(Number(value[0]))) throw new Error('Invalid emoji vote clock');
	const serverNow = Number(value[0]);
	const empty = { serverNow, metadata: null, choice: null, counts: [] };
	if (!value[1]) return empty;
	try {
		const metadata = JSON.parse(value[1]) as LtlVoteMetadata;
		if (typeof metadata.id !== 'string' || metadata.noteId !== metadata.id ||
			![metadata.startedAt, metadata.closesAt, metadata.resolvedAt, metadata.expiresAt].every(Number.isFinite) ||
			metadata.closesAt !== metadata.startedAt + LTL_EMOJI_VOTE_DURATION_MS ||
			metadata.resolvedAt !== metadata.closesAt + LTL_EMOJI_VOTE_TALLY_MS ||
			metadata.expiresAt !== metadata.resolvedAt + LTL_EMOJI_VOTE_RESULT_MS ||
			!Array.isArray(metadata.candidates) || metadata.candidates.length < 1 || metadata.candidates.length > 5 ||
			!metadata.candidates.every(emoji => typeof emoji.id === 'string' && typeof emoji.name === 'string' && typeof emoji.url === 'string' && emoji.isSensitive === false) ||
			new Set(metadata.candidates.map(emoji => emoji.id)).size !== metadata.candidates.length) return empty;
		const counts = metadata.candidates.map((_, index) => Number(value[index + 3]));
		if (!counts.every(count => Number.isSafeInteger(count) && count >= 0)) return empty;
		const choice = value[2] ? JSON.parse(value[2]) as LtlVoteChoice : null;
		if (choice && (!metadata.candidates.some(emoji => emoji.id === choice.emojiId) || !Number.isFinite(choice.votedAt) || choice.votedAt < metadata.startedAt || choice.votedAt >= metadata.closesAt)) return empty;
		return { serverNow, metadata, choice, counts };
	} catch {
		return empty;
	}
}
