/*
 * SPDX-FileCopyrightText: Hataskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const frontendRoot = process.cwd();
const repositoryRoot = resolve(frontendRoot, '..', '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8').replaceAll('\r\n', '\n');

const achievementId = 'hataSideStudioPioneer';
const frontendAchievements = read('packages/frontend/src/utility/achievements.ts');
const backendUserProfile = read('packages/backend/src/models/UserProfile.ts');
const localStorageKeys = read('packages/frontend/src/local-storage.ts');
const studioPage = read('packages/frontend/src/pages/hata-side-studio.vue');
const jaLocale = read('locales/ja-JP.yml');
const enLocale = read('locales/en-US.yml');

describe('HataSideStudio tutorial achievement propagation', () => {
	test('registers the achievement in both allowlists and its badge catalog', () => {
		expect(frontendAchievements.match(new RegExp(`'${achievementId}'`, 'g'))).toHaveLength(2);
		expect(backendUserProfile.match(new RegExp(`'${achievementId}'`, 'g'))).toHaveLength(1);
		expect(frontendAchievements).toMatch(/img: '\/fluent-emoji\/1f6e0\.png'/);
		expect(existsSync(resolve(repositoryRoot, 'fluent-emojis/dist/1f6e0.png'))).toBe(true);
	});

	test('persists tutorial completion locally and claims the achievement for finish or skip', () => {
		expect(localStorageKeys).toMatch(/'hataSideStudioTutorialDone'/);
		expect(studioPage).toMatch(/function finishTutorial\(skipped: boolean\)[\s\S]*?setItem\('hataSideStudioTutorialDone', '1'\)[\s\S]*?claimAchievement\('hataSideStudioPioneer'\)/);
	});

	test('provides the requested Japanese copy and an English translation', () => {
		expect(jaLocale).toContain(`    _${achievementId}:\n      title: "サイドメニューの開拓者"\n      description: "チュートリアルを完了またはスキップした"\n      flavor: "そのハタキスト、メニューを作る"`);
		expect(enLocale).toContain(`    _${achievementId}:\n      title: "Side Menu Pioneer"\n      description: "Complete or skip the HataSideStudio tutorial"\n      flavor: "This Hataskist builds menus."`);
	});
});

describe('HataSNSCordUI tutorial achievement propagation', () => {
	const hatacordingAchievementId = 'hatacordingUiTutorial';
	const hatacordingPage = read('packages/frontend/src/pages/hatacording-ui.vue');
	const hatacordingCopy = read('packages/frontend/src/utility/hatacording-copy.ts');

	test('registers the achievement in both allowlists and its badge catalog', () => {
		expect(frontendAchievements.match(new RegExp(`'${hatacordingAchievementId}'`, 'g'))).toHaveLength(2);
		expect(backendUserProfile.match(new RegExp(`'${hatacordingAchievementId}'`, 'g'))).toHaveLength(1);
		expect(frontendAchievements).toMatch(/'hatacordingUiTutorial':[\s\S]*?img: '\/fluent-emoji\/1f4bb\.png'/);
		expect(existsSync(resolve(repositoryRoot, 'fluent-emojis/dist/1f4bb.png'))).toBe(true);
	});

	test('requires the first-run tutorial to finish and claims the centralized achievement ID', () => {
		expect(hatacordingPage).toContain('tutorialOpen.value = !prefs.value.tutorialCompleted');
		expect(hatacordingPage).toMatch(/function finishFirstTutorial\(\)[\s\S]*?prefs\.value\.tutorialCompleted = true[\s\S]*?claimAchievement\(HATACORDING_TUTORIAL_ACHIEVEMENT_ID\)/);
		expect(hatacordingCopy).toContain(`HATACORDING_TUTORIAL_ACHIEVEMENT_ID = '${hatacordingAchievementId}'`);
	});

	test('provides the requested Japanese copy and an English translation', () => {
		expect(jaLocale).toContain(`    _${hatacordingAchievementId}:\n      title: "HataSNSCordUI、名前長いね"\n      description: "玄人仕様のUIです"`);
		expect(enLocale).toContain(`    _${hatacordingAchievementId}:\n      title: "HataSNSCordUI is quite a mouthful"\n      description: "A UI for experienced users"`);
	});
});
