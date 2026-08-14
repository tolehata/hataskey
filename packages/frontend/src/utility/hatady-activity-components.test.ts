/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

function componentSource(name: string): string {
	return readFileSync(resolve(process.cwd(), 'src/components', name), 'utf8');
}

function frontendSource(path: string): string {
	return readFileSync(resolve(process.cwd(), 'src', path), 'utf8');
}

function sectionBetween(text: string, start: string, end: string): string {
	const after = text.split(start)[1];
	expect(after).toBeDefined();
	const section = after!.split(end)[0];
	expect(section).toBeDefined();
	return section!;
}

describe('Hatady unified activity UI contracts', () => {
	test('study, movie and game activities keep distinct entry points and presentation branches', () => {
		const card = componentSource('HatadyActivityCard.vue');
		const chooser = componentSource('HatadyActivityRecordChooser.vue');

		expect(card).toContain('<template v-if="isStudy && study">');
		expect(card).toContain('<template v-else-if="media && media.work && media.session">');
		expect(card).toContain("activity.value.type === 'movie_viewing' ? 'ti-movie'");
		expect(card).toContain("activity.value.type === 'game_match' ? 'ti-swords'");
		expect(card).toContain("activity.value.type === 'game_roguelike' ? 'ti-route-square'");
		expect(chooser).toContain("@click=\"emit('study')\"");
		expect(chooser).toContain("@click=\"selectKind('movie')\"");
		expect(chooser).toContain("@click=\"selectKind('game')\"");
	});

	test('record chooser connects existing work and session forms without duplicating composers', () => {
		const chooser = componentSource('HatadyActivityRecordChooser.vue');
		const page = frontendSource('pages/hatady.vue');

		expect(chooser).toContain("@click=\"emit('session', work)\"");
		expect(chooser).toContain("@click=\"emit('createWork', selectedKind)\"");
		expect(page).toContain("study: () => { dispose(); openStudyComposer(); }");
		expect(page).toContain("session: (work: HatadyMediaWork) => { dispose(); openMediaSessionComposer(work); }");
		expect(page).toContain("createWork: (kind: HatadyMediaKind) => { dispose(); createMediaWorkAndRecord(kind); }");
		expect(page).toContain("import('@/components/HatadyMediaSessionForm.vue')");
		expect(page).toContain("import('@/components/HatadyMediaWorkForm.vue')");
		expect(page).toContain('openMediaSessionComposer(work);');
	});

	test('media cards open work details while study cards retain conversation and reactions', () => {
		const card = componentSource('HatadyActivityCard.vue');
		const study = sectionBetween(card, '<template v-if="isStudy && study">', '<template v-else-if="media && media.work && media.session">');
		const media = sectionBetween(card, '<template v-else-if="media && media.work && media.session">', '</article>');

		expect(study).toContain('<HatadyReactions');
		expect(study).toContain("emit('openLog', study.id)");
		expect(study).not.toContain("emit('openMedia'");
		expect(media).toContain("emit('openMedia', media.work.id)");
		expect(media).not.toContain('<HatadyReactions');
		expect(media).not.toContain("emit('openLog'");
	});

	test('movie activity details use the canonical movie-only field allowlist', () => {
		const card = componentSource('HatadyActivityCard.vue');
		const chooser = componentSource('HatadyActivityRecordChooser.vue');
		const mediaUtility = frontendSource('utility/hatady-media.ts');
		const movieChooser = sectionBetween(chooser, "@click=\"selectKind('movie')\"", "@click=\"selectKind('game')\"");
		const movieFields = sectionBetween(mediaUtility, "movie_viewing: [", "game_play: [");

		expect(card).toContain('mediaSessionDisplayFacts(media.value.session)');
		expect(chooser).toContain('const kind = selectedKind.value;');
		expect(chooser).toContain('kind,');
		expect(movieChooser).not.toMatch(/weapon|mood|matchmaking|game_match|game_roguelike/);
		expect(movieFields).toContain("'theaterName'");
		expect(movieFields).toContain("'viewingMode'");
		expect(movieFields).not.toMatch(/weapon|mood|matchmaking|roundResults|game_/);
	});

	test('my activity and everyone activity both read the unified activities endpoint', () => {
		const page = frontendSource('pages/hatady.vue');
		const unifiedCalls = page.match(/misskeyApi\('hata\/hatady\/activities'/g) ?? [];

		expect(unifiedCalls).toHaveLength(2);
		expect(page).toContain("scope: 'mine'");
		expect(page).toContain('const scope = discoverType.value;');
		expect(page).toContain('scope,');
		expect(page).toContain('scope !== discoverType.value');
		expect(page).toContain('normalizeHatadyActivityPage(await misskeyApi');
		expect(page).not.toContain("misskeyApi('hata/hatady/timeline'");
	});

	test('switching type or search invalidates an older in-flight work request', () => {
		const chooser = componentSource('HatadyActivityRecordChooser.vue');

		expect(chooser).toContain('if (!selectedKind.value || (append && loading.value)) return;');
		expect(chooser).toContain('const currentRequest = ++requestId;');
		expect(chooser).toContain('const kind = selectedKind.value;');
		expect(chooser).toContain('if (currentRequest !== requestId) return;');
	});

	test('media activity deletion reports an API failure instead of showing success', () => {
		const page = frontendSource('pages/hatady.vue');
		const deleteMedia = sectionBetween(page, 'async function deleteMediaActivity', '// 投稿(学習ログ)のメニュー');

		expect(deleteMedia).toContain("await misskeyApi('hata/hatady/media/sessions/delete'");
		expect(deleteMedia).toContain('os.success();');
		expect(deleteMedia).toContain("await os.alert({ type: 'error', text: i18n.ts.somethingHappened });");
		expect(deleteMedia.indexOf('os.success();')).toBeLessThan(deleteMedia.indexOf('} catch {'));
	});
});
