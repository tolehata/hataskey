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
const zhLocale = read('locales/zh-CN.yml');
const localeTypes = read('locales/index.d.ts');
const sdkTypes = read('packages/cherrypick-js/src/autogen/types.ts');

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

describe('Utage achievement propagation', () => {
	const successTitles = [
		'いい感じ',
		'板についてきたね',
		'宴ブロンズ',
		'宴シルバー',
		'宴ゴールド',
		'宴ダイヤモンド',
		'宴プラチナ',
		'宴マイスター',
		'あと少し',
		'前代未聞',
	];
	const interruptionTitles = [
		'慣れてきた？',
		'もうこんなにも？',
		'隙がない',
		'どこに隙が？',
		'強すぎないか？',
		'TLの番人',
		'いつ寝てるの？',
		'たまには見過ごしてみよう',
		'長い道のり',
		'宴ブロッカー',
	];

	test('registers all milestone and quick-interruption achievements in both allowlists and the badge catalog', () => {
		for (let count = 10; count <= 100; count += 10) {
			for (const id of [`utageSuccess${count}`, `utageInterruption${count}`]) {
				expect(frontendAchievements.match(new RegExp(`'${id}'`, 'g')), id).toHaveLength(2);
				expect(backendUserProfile.match(new RegExp(`'${id}'`, 'g')), id).toHaveLength(1);
			}
		}
		const quickId = 'utageInterruptionWithin5Seconds';
		expect(frontendAchievements.match(new RegExp(`'${quickId}'`, 'g'))).toHaveLength(2);
		expect(backendUserProfile.match(new RegExp(`'${quickId}'`, 'g'))).toHaveLength(1);
		expect(existsSync(resolve(repositoryRoot, 'fluent-emojis/dist/1f389.png'))).toBe(true);
		expect(existsSync(resolve(repositoryRoot, 'fluent-emojis/dist/1f6e1.png'))).toBe(true);
		expect(existsSync(resolve(repositoryRoot, 'fluent-emojis/dist/1f6d1.png'))).toBe(true);
	});

	test('keeps the requested Japanese titles and count descriptions', () => {
		for (let index = 0; index < 10; index++) {
			const count = (index + 1) * 10;
			expect(jaLocale).toContain(`    _utageSuccess${count}:\n      title: "${successTitles[index]}"\n      description: "宴を${count}回成功させた"`);
			expect(jaLocale).toContain(`    _utageInterruption${count}:\n      title: "${interruptionTitles[index]}"\n      description: "宴を${count}回阻止した"`);
		}
		expect(jaLocale).toContain('    _utageInterruptionWithin5Seconds:\n      title: "早すぎる宴の終わり"\n      description: "ほかの人の宴を開始から5秒以内に阻止した"');
	});

	test('provides fallback translations for every new achievement', () => {
		for (let count = 10; count <= 100; count += 10) {
			for (const id of [`utageSuccess${count}`, `utageInterruption${count}`]) {
				expect(enLocale).toContain(`    _${id}:`);
				expect(zhLocale).toContain(`    _${id}:`);
			}
		}
		expect(enLocale).toContain('    _utageInterruptionWithin5Seconds:');
		expect(zhLocale).toContain('    _utageInterruptionWithin5Seconds:');
	});

	test('keeps generated locale and SDK types synchronized while excluding server-only IDs from claim requests', () => {
		const achievementNameStart = sdkTypes.indexOf('AchievementName:');
		const achievementNameEnd = sdkTypes.indexOf(';', achievementNameStart);
		const achievementNameSchema = sdkTypes.slice(achievementNameStart, achievementNameEnd);
		const claimStart = sdkTypes.indexOf('    \'i___claim-achievement\': {');
		const claimEnd = sdkTypes.indexOf('    \'i___delete-account\': {', claimStart);
		const claimSchema = sdkTypes.slice(claimStart, claimEnd);
		const serverOnlyIds = [
			...Array.from({ length: 10 }, (_, index) => `utageSuccess${(index + 1) * 10}`),
			...Array.from({ length: 10 }, (_, index) => `utageInterruption${(index + 1) * 10}`),
			'utageInterruptionWithin5Seconds',
		];

		expect(achievementNameStart).toBeGreaterThan(-1);
		expect(claimStart).toBeGreaterThan(-1);
		expect(claimSchema).toContain('name: \'notes1\''); // 陽性対照: client claimable ID は生成済み
		for (const id of serverOnlyIds) {
			expect(achievementNameSchema, id).toContain(`'${id}'`);
			expect(claimSchema, id).not.toContain(`'${id}'`);
			expect(localeTypes, id).toContain(`"_${id}": {`);
		}
	});
});
