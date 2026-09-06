/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { describe, expect, test, vi } from 'vitest';
import { getHataWhatsNewDisplayVersion, HATA_WHATS_NEW } from './hata-whats-new.js';
import type { Locale } from '../../../../locales/index.js';

vi.mock('@/i18n.js', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const yaml = await import('js-yaml');
	const { I18n } = await import('@@/js/i18n.js');
	const locale = yaml.load(fs.readFileSync(path.resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8'));
	return { i18n: new I18n<Locale>(locale as Locale) };
});

const root = path.resolve(process.cwd(), '../..');
const latestPreviews = ['dailyPolish'];
const currentPreviews = ['hataskPlanner', 'hataskGarden', 'dailyPolish'];
const previousPreviews = ['utageAchievements', 'externalSidebar', 'externalTimeline', 'timelineCollapse'];
const mainPreviews = ['hataskPlanner', 'hataskGarden', 'externalAccount', 'welcomeRenewal', 'serverChoice', 'gameFarewell', 'dailyPolish'];
const oldPreviews = new Set([
	'branding', 'settingsRenewal', 'hatadyRecord', 'hatadyVisibility', 'hatacordingFix',
	'utageBadge', 'muteReaction', 'cardMaker', 'hatasabaHome', 'sideStudioFix', 'mobileFix',
	'hatalyze', 'hatakyuTheme', 'hatadyExport', 'foldable', 'uiMotion', 'langFix', 'externalDdoskey', 'fontUpload',
]);
const locales = ['ja-JP', 'en-US', 'zh-CN'].map(lang => {
	const locale = yaml.load(fs.readFileSync(path.join(root, 'locales', `${lang}.yml`), 'utf8')) as Locale;
	return { lang, copy: locale._hata._whatsNew._content, windowCopy: locale._hata._whatsNew._window };
});
const latestRelease = HATA_WHATS_NEW.releases[0];
const currentRelease = HATA_WHATS_NEW.releases[1];
const previousRelease = HATA_WHATS_NEW.releases[2];
const mainRelease = HATA_WHATS_NEW.releases[3];

describe('HATA_WHATS_NEW', () => {
	test('表示済み判定の版をpackage.jsonと一致させる', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
		expect(HATA_WHATS_NEW.version).toBe(pkg.version);
		expect(pkg.basedMisskeyVersion).toBe('2026.9.0');
		const sdk = JSON.parse(fs.readFileSync(path.join(root, 'packages/cherrypick-js/package.json'), 'utf8'));
		expect(sdk.basedMisskeyVersion).toBe(pkg.basedMisskeyVersion);
		expect(getHataWhatsNewDisplayVersion('2026.9.0-hata.12.5.4')).toBe('hata-12.5.4');
		expect(getHataWhatsNewDisplayVersion('2026.7.0-hata.12.5.3')).toBe('hata-12.5.3');
		expect(getHataWhatsNewDisplayVersion('2026.7.0-hata.12.5.2')).toBe('hata-12.5.2');
		expect(getHataWhatsNewDisplayVersion('2026.7.0-hata.12.5.1')).toBe('hata-12.5.1');
		expect(getHataWhatsNewDisplayVersion('2026.7.0-hata.12.5')).toBe('hata-12.5');
		expect(getHataWhatsNewDisplayVersion('2026.7.0-hata.12.1')).toBe('hata-12.1');
		expect(getHataWhatsNewDisplayVersion('development')).toBe('development');
	});

	test('最新版の案内をCHANGELOGとREADMEに揃え、過去の履歴を残す', () => {
		const version = getHataWhatsNewDisplayVersion(HATA_WHATS_NEW.version);
		const changelog = fs.readFileSync(path.join(root, 'HATA-CHANGELOG.md'), 'utf8');
		const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
		const firstRelease = (text: string) => /^## (hata-[\d.]+)$/mu.exec(text)?.[1];
		expect(firstRelease(changelog.replace(`## ${version}`, '## hata-0.0'))).not.toBe(version);
		expect(firstRelease(changelog)).toBe(version);
		expect(readme).toContain(`**最新リリース**: [${version}](https://github.com/tolehata/hataskey/releases/tag/${version})`);
		for (const historical of ['hata-12.5.3', 'hata-12.5.2', 'hata-12.5.1', 'hata-12.5']) expect(changelog).toContain(`## ${historical}\n`);
	});

	test('最新版から修正版2世代とメイン版まで4リリースを新しい順に残す', () => {
		expect(HATA_WHATS_NEW.releases.map(release => release.id)).toEqual(['latestRelease', 'currentRelease', 'previousRelease', 'mainRelease']);
		expect(getHataWhatsNewDisplayVersion(latestRelease.version)).toBe('hata-12.5.4');
		expect(getHataWhatsNewDisplayVersion(currentRelease.version)).toBe('hata-12.5.3');
		expect(getHataWhatsNewDisplayVersion(previousRelease.version)).toBe('hata-12.5.2');
		expect(getHataWhatsNewDisplayVersion(mainRelease.version)).toBe('hata-12.5');
		expect(latestRelease.items.map(item => item.preview)).toEqual(latestPreviews);
		expect(currentRelease.items.map(item => item.preview)).toEqual(currentPreviews);
		expect(previousRelease.items.map(item => item.preview)).toEqual(previousPreviews);
		expect(mainRelease.items.map(item => item.preview)).toEqual(mainPreviews);
		for (const release of HATA_WHATS_NEW.releases) {
			expect(new Set(release.items.map(item => item.preview)).size).toBe(release.items.length);
		}
	});

	test('hata-12.5.4ではメディア表示と利用者に関係する安全性の変更を案内する', () => {
		expect(latestRelease.items).toHaveLength(1);
		expect(latestRelease.headline).toContain('Misskey 2026.9.0');
		const item = latestRelease.items[0];
		for (const word of ['本家Misskeyから', '音声', 'ピクセルアート', 'ぼかし', '通知', 'リアクション', 'セキュリティ修正', '管理者', 'Hataskeyでは']) expect(item.text).toContain(word);
		expect(item.to).toBeUndefined();
	});

	test('2世代前のhata-12.5.2の4領域を残す', () => {
		expect(previousRelease.items).toHaveLength(4);
		const [utage, sidebar, timeline, collapse] = previousRelease.items;
		expect(utage.title).toContain('21個');
		for (const word of ['10回', '100回', '5秒', 'この更新後']) expect(utage.text).toContain(word);
		for (const word of ['通常のサイドバー編集', 'HataSideStudio', 'ドラッグ', '保存位置']) expect(sidebar.text).toContain(word);
		for (const word of ['返信', '引用', '多段リノート', 'リロードせず']) expect(timeline.text).toContain(word);
		expect(collapse.title).toContain('隠し演出');
		for (const word of ['公開ノート', '10秒', '1日2回', '動きを減らして']) expect(collapse.text).toContain(word);
		expect(collapse.text).not.toContain('TL崩れる');
	});

	test('旧19項目の再掲を陽性対照付きで検出する', () => {
		const findOld = (items: string[]) => items.filter(item => oldPreviews.has(item));
		expect(findOld([...mainPreviews, 'branding', 'externalDdoskey'])).toEqual(['branding', 'externalDdoskey']);
		expect(findOld(HATA_WHATS_NEW.releases.flatMap(release => release.items.map(item => item.preview)))).toEqual([]);
	});

	test('Hataskの予定・ToDo・みんなのお花を案内する', () => {
		const planner = mainRelease.items[0];
		expect(planner).toMatchObject({ preview: 'hataskPlanner', to: '/hatask' });
		expect(planner.title).toContain('大幅に改良');
		for (const word of ['月・週・日・予定一覧', 'ToDo', 'まとめて変更']) expect(planner.text).toContain(word);
		const garden = mainRelease.items[1];
		expect(garden).toMatchObject({ preview: 'hataskGarden', to: '/hatask' });
		for (const word of ['みんなのお花', '花言葉', 'フォロワー', '自分のみ']) expect(garden.text).toContain(word);
	});

	test('直前のhata-12.5.3には暁・予定詳細・操作改善を案内する', () => {
		expect(currentRelease.items).toHaveLength(3);
		const [akatsuki, details, polish] = currentRelease.items;
		expect(akatsuki.title).toContain('暁');
		for (const word of ['3ペイン', '時間帯', 'ドラッグ', '扉をくぐる文字アニメーション', '今のテーマ', 'これまでのテーマ', '保存した予定・ToDo']) expect(akatsuki.text).toContain(word);
		for (const word of ['吹き出し', 'スマートフォン', '作成・コピー・移動', 'N', 'O']) expect(details.text).toContain(word);
		for (const word of ['Hatask App', 'Hataskey App', '検索結果', '子メニュー', 'デッキ', '設定', 'お知らせバナー', 'タイムラインの中央上部', '外部通知', '未連携', '元の位置']) expect(polish.text).toContain(word);
		expect(akatsuki.to).toBe('/hatask');
		expect(details.to).toBe('/hatask');
	});

	test('BearBearは既存の連携機能の接続先追加として規約とともに案内する', () => {
		const item = mainRelease.items.find(candidate => candidate.preview === 'externalAccount');
		expect(item).toMatchObject({ previewLabel: 'xiapopisland.top', to: '/settings/external-account' });
		expect(item?.title).toContain('BearBear');
		expect(item?.text).toContain('xiapopisland.top');
		expect(item?.text).toContain('規約');
		expect(item?.text).not.toContain('ddoskey.com');
	});

	test('別サーバーでの利用を独立した項目で案内し無条件の互換性を保証しない', () => {
		const item = mainRelease.items.find(candidate => candidate.preview === 'serverChoice');
		expect(item?.title).toBe('Hataskeyを別サーバーでご利用いただけるようになりました');
		expect(item?.text).toContain('Hataskeyを導入したサーバー');
		expect(item?.text).toContain('サーバーごとの設定');
		expect(item?.text).not.toMatch(/どのサーバーでも|完全互換|検証済み/);
	});

	test('新しいログイン画面の案内にはモバイルでの切り替えも含める', () => {
		const item = mainRelease.items.find(candidate => candidate.preview === 'welcomeRenewal');
		for (const word of ['投稿', '人数', '矢印ボタン']) expect(item?.text).toContain(word);
	});

	test('花常は提供終了としてだけ案内し遊ぶリンクを作らない', () => {
		const item = mainRelease.items.find(candidate => candidate.preview === 'gameFarewell');
		expect(item?.title).toBe('花常の提供を終了します');
		expect(item?.text).toContain('遊べなくなります');
		expect(item?.text).toContain('ありがとうございました');
		expect(item?.to).toBeUndefined();
		expect(item?.linkLabel).toBeUndefined();
	});

	test('保存済みのポータル除去を利用者の言葉で説明する', () => {
		expect(mainRelease.items.find(item => item.preview === 'dailyPolish')?.text).toContain('廃止したポータル');
		const internalTerms = /Registry|API|DB|MiAuth|localStorage|fail.closed|リファクタ|フォールバック|マイグレーション/i;
		expect(internalTerms.test('Registry APIのマイグレーション')).toBe(true);
		const userCopy = HATA_WHATS_NEW.releases.flatMap(release => [release.headline, ...release.items.flatMap(item => [item.title, item.text])]).join('\n');
		expect(internalTerms.test(userCopy)).toBe(false);
	});

	test('案内からの移動先は現在の画面に限定し表示UIを勝手に切り替えない', () => {
		for (const item of HATA_WHATS_NEW.releases.flatMap(release => release.items)) {
			if (item.to) {
				expect(['/hatask', '/settings/external-account']).toContain(item.to);
				expect(item.linkLabel).toBeTruthy();
			}
			expect(item).not.toHaveProperty('activateUi');
		}
	});

	test.each(locales)('$langの新しい見出し・本文・リンクがすべて揃う', ({ copy, windowCopy }) => {
		const expectedKeys = [
			'latestHeadline', 'currentHeadline', 'previousHeadline', 'mainHeadline', 'upstreamUpdateTitle', 'upstreamUpdateText', 'hataskLink', 'externalLink', 'footerText', 'footerLink',
			'hataskAkatsukiTitle', 'hataskAkatsukiText', 'hataskDetailsTitle', 'hataskDetailsText', 'hataskPolishTitle', 'hataskPolishText',
			'utageAchievementsTitle', 'utageAchievementsText', 'externalSidebarTitle', 'externalSidebarText',
			'externalTimelineTitle', 'externalTimelineText', 'timelineCollapseTitle', 'timelineCollapseText',
			'hataskMobileTitle', 'hataskMobileText', 'postComposerTitle', 'postComposerText',
			'serverNameTitle', 'serverNameText', 'externalJuiceTitle', 'externalJuiceText',
			'hataskPlannerTitle', 'hataskPlannerText', 'hataskGardenTitle', 'hataskGardenText',
			'externalBearBearTitle', 'externalBearBearText', 'welcomeRenewalTitle', 'welcomeRenewalText',
			'serverChoiceTitle', 'serverChoiceText', 'gameFarewellTitle', 'gameFarewellText',
			'dailyPolishTitle', 'dailyPolishText',
		].sort();
		expect(Object.keys(copy).sort()).toEqual(expectedKeys);
		for (const value of Object.values(copy)) {
			expect(typeof value).toBe('string');
			expect(value.trim().length).toBeGreaterThan(0);
			expect(value).not.toMatch(/^_hata\./);
		}
		for (const release of HATA_WHATS_NEW.releases) {
			expect(windowCopy[release.id].trim().length).toBeGreaterThan(0);
			expect(windowCopy[release.id]).not.toMatch(/^_hata\./);
		}
	});

	test('見出しと本文が翻訳キーのまま表示されない', () => {
		for (const item of HATA_WHATS_NEW.releases.flatMap(release => release.items)) {
			expect(item.title).toBeTruthy();
			expect(item.text).toBeTruthy();
			expect(item.title).not.toMatch(/^_hata\./);
			expect(item.text).not.toMatch(/^_hata\./);
		}
	});
});
