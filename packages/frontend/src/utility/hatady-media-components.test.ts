/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

function source(name: string): string {
	return readFileSync(resolve(process.cwd(), 'src/components', name), 'utf8');
}

function sectionBetween(text: string, start: string, end: string): string {
	const after = text.split(start)[1];
	expect(after).toBeDefined();
	const section = after!.split(end)[0];
	expect(section).toBeDefined();
	return section!;
}

describe('Hatady media component boundaries', () => {
	test('movie work form does not render game-only controls', () => {
		const movieSection = sectionBetween(source('HatadyMediaWorkForm.vue'), '<section v-if="kind === \'movie\'"', '<section v-else');
		expect(movieSection).not.toMatch(/weapon|mood|matchmaking|game_match|gameDashboard/);
	});

	test('movie session form does not render game-only controls', () => {
		const movieSection = sectionBetween(source('HatadyMediaSessionForm.vue'), '<template v-if="work.kind === \'movie\'">', '<template v-else>');
		expect(movieSection).not.toMatch(/weapon|mood|matchmaking|game_match|game_roguelike/);
	});

	test('game dashboard is conditionally absent for movies and spoiler details stay folded', () => {
		const detail = source('HatadyMediaWorkDetail.vue');
		expect(detail).toContain('v-if="work.kind === \'game\'"');
		expect(detail).toContain('data-media-dashboard="game"');
		expect(detail).toContain('<details v-if="session.noteSpoiler"');
		expect(detail).toContain('mediaDashboardSessions(dashboardPeriodSessions.value, isMine.value)');
		expect(detail).toContain('mediaSessionDisplayFacts(session)');
	});

	test('update requests keep immutable work and session kinds out of payloads', () => {
		const workForm = source('HatadyMediaWorkForm.vue');
		const sessionForm = source('HatadyMediaSessionForm.vue');
		expect(workForm).toContain('...(!isEdit ? { kind } : {})');
		expect(sessionForm).toContain('...(isEdit ? { sessionId: source!.id } : { workId: work.id, kind: sessionKind.value })');
	});

	test('movie detail renders canonical movie metadata and keeps game analytics conditional', () => {
		const detail = source('HatadyMediaWorkDetail.vue');
		for (const field of ['work.origin', 'work.viewingMode', 'work.primaryLanguage', 'work.recommendationRating', 'safeOfficialUrl']) {
			expect(detail).toContain(field);
		}
		expect(detail).toContain('<section v-if="work.kind === \'game\'"');
	});
});
