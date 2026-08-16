/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { MEDIA_SESSION_DETAIL_KEYS } from './hatady-media.js';

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

	// 旗鯖fork(Hatady): ゲーム記録フォームは項目を2層(結果/詳しく記録する)に畳んで作り替えた。
	// この手の作り替えで一番起きやすい事故が「並べ替えのついでに項目が消える」なので、
	// 保存キーの正本(MEDIA_SESSION_DETAIL_KEYS)と、フォーム上の入力・保存経路を突き合わせて守る。
	describe('game session form keeps every saved field reachable', () => {
		// details のキー名と、フォーム側で束ねている ref 名の対応(名前が違うものだけずれる)。
		// 成績の合計(キル等)は武器ごとの行から自動計算するので直接の入力欄を持たない。
		// 入力経路は成績表なので、成績表の束縛が生きていることをもって「編集できる」と見なす。
		const BINDING_NAMES: Record<string, string> = {
			mode: 'matchMode', map: 'mapName',
			kills: 'weaponStats', deaths: 'weaponStats', assists: 'weaponStats',
			specials: 'weaponStats', rescues: 'weaponStats',
		};
		const gameKinds = ['game_play', 'game_match', 'game_roguelike', 'game_pve'] as const;
		const gameKeys = [...new Set(gameKinds.flatMap(kind => [...MEDIA_SESSION_DETAIL_KEYS[kind]]))];

		test('every game detail key has an input bound in the game branch', () => {
			// ゲーム分岐の中に種別ごとの <template> が入れ子になっているので、
			// 終端は最初の </template> ではなく、映画と共通のメモ欄の直前で切る。
			const gameSection = sectionBetween(source('HatadyMediaSessionForm.vue'), '<template v-else>', '<label :class="$style.noteField">');
			expect(gameKeys.length).toBeGreaterThan(20);
			for (const key of gameKeys) {
				const name = BINDING_NAMES[key] ?? key;
				// v-model(引数付きを含む)で束ねる入力か、ボタン列で選ぶ項目(結果・気分)のどちらかで触れること。
				const bound = new RegExp(`v-model(?::[a-zA-Z]+)?(?:\\.number)?="${name}"|${name} = option\\.value|${name} === option\\.value`);
				expect(bound.test(gameSection), `${key} is not editable in the game session form`).toBe(true);
			}
		});

		test('every game detail key is still written into the save payload', () => {
			const sessionForm = source('HatadyMediaSessionForm.vue');
			const payload = sectionBetween(sessionForm, 'const detailValues: Record<string, unknown> = {', '\t\t};');
			for (const key of gameKeys) {
				expect(payload, `${key} is missing from detailValues`).toMatch(new RegExp(`(^|\\s)${key}:`));
			}
		});
	});

	test('movie detail renders canonical movie metadata and keeps game analytics conditional', () => {
		const detail = source('HatadyMediaWorkDetail.vue');
		for (const field of ['work.origin', 'work.viewingMode', 'work.primaryLanguage', 'work.recommendationRating', 'safeOfficialUrl']) {
			expect(detail).toContain(field);
		}
		expect(detail).toContain('<section v-if="work.kind === \'game\'"');
	});
});
