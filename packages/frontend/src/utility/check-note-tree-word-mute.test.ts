/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import type { entities } from 'cherrypick-js';
import { checkNoteTreeWordMute } from './check-note-tree-word-mute.js';

function note(id: string, text: string | null, extra: Partial<entities.Note> = {}): entities.Note {
	return { id, userId: 'other', text, cw: null, ...extra } as entities.Note;
}

describe('word mute across the displayed note tree', () => {
	test('checks outer text, a renote original, and replies nested inside quotes', () => {
		const hidden = note('hidden', '伏せたい本文');
		expect(checkNoteTreeWordMute(hidden, null, [['伏せたい']])).toBe(true);
		expect(checkNoteTreeWordMute(note('renote', null, { renote: hidden }), null, [['伏せたい']])).toBe(true);
		expect(checkNoteTreeWordMute(note('root', '安全', { renote: note('quote', '安全', { reply: hidden }) }), null, [['伏せたい']])).toBe(true);
	});

	test('preserves keyword conjunctions, CW matching, and repeated global-regex matches', () => {
		const target = note('root', '本文', { reply: note('reply', '安全な本文', { cw: '伏せたい話題' }) });
		expect(checkNoteTreeWordMute(target, null, [['伏せたい', '本文']])).toBe(true);
		expect(checkNoteTreeWordMute(target, null, [['伏せたい', '存在しない']])).toBe(false);
		for (let index = 0; index < 3; index++) expect(checkNoteTreeWordMute(target, null, ['/伏せたい/g'])).toBe(true);
	});

	test('does not let an own-note exception bypass another author inside the same tree', () => {
		const me = { id: 'me' } as entities.UserLite;
		const own = note('own', '伏せたい', { userId: me.id });
		expect(checkNoteTreeWordMute(own, me, [['伏せたい']])).toBe(false);
		own.renote = note('original', '伏せたい');
		expect(checkNoteTreeWordMute(own, me, [['伏せたい']])).toBe(true);
	});

	test('terminates on cyclic and shared references without skipping a matching branch', () => {
		const root = note('root', '安全');
		const reply = note('reply', '安全', { reply: root });
		root.reply = reply;
		root.renote = reply;
		expect(checkNoteTreeWordMute(root, null, [['伏せたい']])).toBe(false);
		reply.renote = note('match', '伏せたい');
		expect(checkNoteTreeWordMute(root, null, [['伏せたい']])).toBe(true);
		expect(checkNoteTreeWordMute(root, null, [])).toBe(false);
	});
});
