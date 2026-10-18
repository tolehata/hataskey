/* SPDX-License-Identifier: AGPL-3.0-only */
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** Exclude the whole note when any attached reply/renote belongs to an inaccessible channel. */
export function applyPrivateChannelNoteVisibility<T extends ObjectLiteral>(query: SelectQueryBuilder<T>, meId: string | null, noteAlias = 'note'): void {
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(noteAlias)) throw new Error('Invalid note query alias');
	const root = `"${noteAlias}"`;
	const denied = meId == null ? '' : `
		AND channel_note."userId" IS DISTINCT FROM :privateChannelViewerId
		AND private_channel."userId" IS DISTINCT FROM :privateChannelViewerId
		AND NOT (:privateChannelViewerId = ANY(private_channel."moderatorUserIds"))
		AND NOT EXISTS (
			SELECT 1 FROM "channel_member" channel_membership
			WHERE channel_membership."channelId" = private_channel."id"
			AND channel_membership."userId" = :privateChannelViewerId
		)`;
	query.andWhere(`(
		(${root}."channelId" IS NULL AND ${root}."replyId" IS NULL AND ${root}."renoteId" IS NULL)
		OR NOT EXISTS (
			WITH RECURSIVE channel_note_tree AS (
				SELECT ${root}."id", ${root}."userId", ${root}."channelId", ${root}."replyId", ${root}."renoteId"
				UNION
				SELECT child."id", child."userId", child."channelId", child."replyId", child."renoteId"
				FROM "note" child
				INNER JOIN channel_note_tree ancestor ON child."id" IN (ancestor."replyId", ancestor."renoteId")
			)
			SELECT 1 FROM channel_note_tree channel_note
			INNER JOIN "channel" private_channel ON private_channel."id" = channel_note."channelId"
			WHERE private_channel."isPrivate" = TRUE${denied}
		)
	)`, meId == null ? {} : { privateChannelViewerId: meId });
}
