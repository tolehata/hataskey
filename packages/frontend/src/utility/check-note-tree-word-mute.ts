/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { entities } from 'cherrypick-js';
import { checkWordMute } from '@/utility/check-word-mute.js';

/** Cover every body the note can display, retaining the native per-author mute exception. */
export function checkNoteTreeWordMute(
	note: entities.Note,
	me: entities.UserLite | null | undefined,
	mutedWords: Array<string | string[]>,
): boolean {
	if (mutedWords.length === 0) return false;
	const seen = new Set<entities.Note>();
	const pending = [note];
	while (pending.length > 0) {
		const target = pending.pop()!;
		if (seen.has(target)) continue;
		seen.add(target);
		if (checkWordMute(target, me, mutedWords)) return true;
		if (target.reply) pending.push(target.reply);
		if (target.renote) pending.push(target.renote);
	}
	return false;
}
