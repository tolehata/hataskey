/* SPDX-License-Identifier: AGPL-3.0-only */
import { HATASK_FLOWER_CATALOG } from '@/misc/hatask-flower-catalog.js';
import { flowerSeason } from '@/core/hatask-flower-v2.js';
import type { EntityManager } from 'typeorm';

/** Only server-recorded harvests count; client seed claims and legacy registry values do not. */
async function completion(
	db: Pick<EntityManager, 'query'>,
	userId: string,
	now: Date,
	record: boolean,
): Promise<boolean> {
	const wallets: { flowerCollectionCompletedAt: Date | null }[] = await db.query('SELECT "flowerCollectionCompletedAt" FROM hatask_drop_wallet WHERE "userId" = $1', [userId]);
	const wallet = wallets.at(0);
	if (wallet?.flowerCollectionCompletedAt != null) return true;
	const season = flowerSeason(now);
	const speciesIds = HATASK_FLOWER_CATALOG.filter(flower => flower.season === season).map(flower => flower.id);
	const rows: { speciesId: string }[] = await db.query(
		'SELECT DISTINCT "speciesId" FROM hatask_flower_harvest WHERE "userId" = $1 AND season = $2 AND "speciesId" = ANY($3::varchar[])',
		[userId, season, speciesIds],
	);
	const harvested = new Set(rows.map(row => row.speciesId));
	const completed = speciesIds.length > 0 && speciesIds.every(id => harvested.has(id));
	if (completed && record) {
		// Preserve the first achievement even across seasons and later garden updates.
		await db.query('UPDATE hatask_drop_wallet SET "flowerCollectionCompletedAt" = $2 WHERE "userId" = $1 AND "flowerCollectionCompletedAt" IS NULL', [userId, now]);
	}
	return completed;
}

/** Public packing never changes the viewer's or the wearer's state. */
export function hasCompletedHataskFlowerCollection(db: Pick<EntityManager, 'query'>, userId: string, now = new Date()): Promise<boolean> {
	return completion(db, userId, now, false);
}

/** Called by server-confirmed harvesting and authenticated decoration selection only. */
export function recordHataskFlowerCollectionCompletion(db: Pick<EntityManager, 'query'>, userId: string, now = new Date()): Promise<boolean> {
	return completion(db, userId, now, true);
}

/** A season change can make an existing collection eligible without any new user action. */
export async function recordCurrentSeasonHataskFlowerCompletions(db: Pick<EntityManager, 'query'>, now = new Date()): Promise<void> {
	const season = flowerSeason(now);
	const speciesIds = HATASK_FLOWER_CATALOG.filter(flower => flower.season === season).map(flower => flower.id);
	if (speciesIds.length === 0) return;
	// Harvesting locks the wallet after its advisory lock. Skip those wallets and
	// retry next tick; this update takes no advisory or harvest-row locks afterward.
	await db.query(`WITH completed AS (
		SELECT wallet."userId" FROM hatask_drop_wallet wallet
		INNER JOIN "user" owner ON owner.id = wallet."userId"
		WHERE wallet."flowerCollectionCompletedAt" IS NULL
		AND owner.host IS NULL AND owner."isDeleted" = false
		AND NOT EXISTS (
			SELECT 1 FROM unnest($3::varchar[]) AS species(id) WHERE NOT EXISTS (
				SELECT 1 FROM hatask_flower_harvest harvest
				WHERE harvest."userId" = wallet."userId" AND harvest.season = $2
				AND harvest."speciesId" = species.id
			)
		)
		ORDER BY wallet."userId" ASC FOR UPDATE OF wallet SKIP LOCKED
	)
	UPDATE hatask_drop_wallet wallet SET "flowerCollectionCompletedAt" = $1
	FROM completed WHERE wallet."userId" = completed."userId"
	AND wallet."flowerCollectionCompletedAt" IS NULL`, [now, season, speciesIds]);
}
