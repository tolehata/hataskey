/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/** Presence contains session tokens internally; only the distinct spectator count leaves Redis. */
export const hataigoPresenceScript = `
local key=KEYS[1]
redis.call('ZREMRANGEBYSCORE',key,'-inf',ARGV[1])
if ARGV[4]=='leave' then redis.call('ZREM',key,ARGV[3]) elseif ARGV[4]=='join' then redis.call('ZADD',key,ARGV[2],ARGV[3]) end
redis.call('PEXPIRE',key,90000)
local seen={}
local n=0
for _,member in ipairs(redis.call('ZRANGE',key,0,-1)) do
 local identity=string.match(member,'^([^:]+):')
 if identity and not seen[identity] then seen[identity]=true;n=n+1 end
end
return n
`;
export const hataigoReactions = ['👏', '😮', '🤔', '😂', '🔥', '🙏'] as const;
export function isHataigoReaction(value: unknown): value is typeof hataigoReactions[number] { return typeof value === 'string' && (hataigoReactions as readonly string[]).includes(value); }
