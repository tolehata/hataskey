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
const locales = ['ja-JP', 'en-US', 'zh-CN'].map(lang => {
	const locale = yaml.load(fs.readFileSync(path.join(root, 'locales', `${lang}.yml`), 'utf8')) as Locale;
	return { lang, copy: locale._hata._whatsNew._content };
});
const release = HATA_WHATS_NEW.releases[0];

describe('HATA_WHATS_NEW', () => {
	test('表示済み判定と表示版をpackage.jsonのhata-12.6.1へ揃える', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
		expect(HATA_WHATS_NEW.version).toBe(pkg.version);
		expect(pkg.version).toBe('2026.9.0-hata.12.6.1');
		expect(pkg.basedMisskeyVersion).toBe('2026.9.0');
		const sdk = JSON.parse(fs.readFileSync(path.join(root, 'packages/cherrypick-js/package.json'), 'utf8'));
		expect(sdk.basedMisskeyVersion).toBe(pkg.basedMisskeyVersion);
		expect(getHataWhatsNewDisplayVersion(pkg.version)).toBe('hata-12.6.1');
		expect(getHataWhatsNewDisplayVersion('2026.9.0-hata.12.5.4')).toBe('hata-12.5.4');
		expect(getHataWhatsNewDisplayVersion('development')).toBe('development');
	});

	test('CHANGELOGとREADMEを新版へ揃え、過去の履歴はCHANGELOGに残す', () => {
		const version = getHataWhatsNewDisplayVersion(HATA_WHATS_NEW.version);
		const changelog = fs.readFileSync(path.join(root, 'HATA-CHANGELOG.md'), 'utf8');
		const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
		const firstRelease = (text: string) => /^## (hata-[\d.]+)$/mu.exec(text)?.[1];
		expect(firstRelease(changelog.replace(`## ${version}`, '## hata-0.0'))).not.toBe(version);
		expect(firstRelease(changelog)).toBe(version);
		expect(readme).toContain(`**最新リリース**: [${version}](https://github.com/tolehata/hataskey/releases/tag/${version})`);
		for (const historical of ['hata-12.6', 'hata-12.5.4', 'hata-12.5.3', 'hata-12.5.2', 'hata-12.5.1', 'hata-12.5']) expect(changelog).toContain(`## ${historical}\n`);
	});

	test('更新案内はhata-12.6.1の1版だけを特集する', () => {
		const otherVersions = (versions: string[]) => versions.filter(version => version !== HATA_WHATS_NEW.version);
		expect(otherVersions([HATA_WHATS_NEW.version, '2026.9.0-hata.12.5.4'])).toEqual(['2026.9.0-hata.12.5.4']);
		expect(otherVersions(HATA_WHATS_NEW.releases.map(item => item.version))).toEqual([]);
		expect(HATA_WHATS_NEW.releases).toHaveLength(1);
		expect(release.id).toBe('latestRelease');
		expect(release.items.map(item => item.preview)).toEqual(['hataskGarden', 'hataskPlanner', 'externalTimeline', 'dailyPolish']);
		expect(new Set(release.items.map(item => item.preview)).size).toBe(release.items.length);
	});

	test('お花の一覧・暁のダーク表示・通知・Safariの修正を案内する', () => {
		const [garden, home, notifications, polish] = release.items;
		for (const word of ['みんなのお花', 'フラワーギャラリー', '自動スクロール', '詳細', '2行', '一覧ボタン', '並び替え', 'ページ切り替え']) expect(garden.text).toContain(word);
		for (const word of ['暁', 'Hatask App', 'Hataskey App', '灰色', '予定・ToDo']) expect(home.text).toContain(word);
		for (const word of ['Hataskey UI', 'タッチ操作', '通知が閉じず', 'ポップアップ', 'スマートフォン', 'アカウントアイコン', '上部ナビ', '新着ノート']) expect(notifications.text).toContain(word);
		for (const word of ['iOS Safari', 'ホーム画面', '花壇', '花が表示されない', '絵文字スタイル']) expect(polish.text).toContain(word);
	});

	test('案内に開発用語や過去版の特集を混ぜない', () => {
		const forbidden = /Registry|API|DB|MiAuth|localStorage|fail.closed|リファクタ|フォールバック|マイグレーション|hata-12\.5|hata-12\.6(?!\.1)|16品種|48〜96時間|宴に21個|花常の提供|本家Misskeyから/i;
		expect(forbidden.test('Registry APIのマイグレーション')).toBe(true);
		expect(forbidden.test('hata-12.5.4の更新内容')).toBe(true);
		expect(forbidden.test('hata-12.6の更新内容')).toBe(true);
		expect(forbidden.test('季節の花16品種を追加しました')).toBe(true);
		const userCopy = HATA_WHATS_NEW.releases.flatMap(item => [item.headline, ...item.items.flatMap(feature => [feature.title, feature.text])]).join('\n');
		expect(forbidden.test(userCopy)).toBe(false);
	});

	test('案内からはHataskへ移動し、表示UIの強制切替をしない', () => {
		for (const item of release.items) {
			if (item.to) {
				expect(item.to).toBe('/hatask');
				expect(item.linkLabel).toBeTruthy();
			}
			expect(item).not.toHaveProperty('activateUi');
		}
		expect(HATA_WHATS_NEW.footer.linkUrl).toBe('https://github.com/tolehata/hataskey/blob/master/HATA-CHANGELOG.md');
	});

	test.each(locales)('$langのhata-12.6.1の文言が揃い、旧版の本文を残さない', ({ copy }) => {
		const expectedKeys = [
			'latestHeadline', 'flowerTitle', 'flowerText', 'hataskHomeTitle', 'hataskHomeText',
			'notificationsTitle', 'notificationsText', 'dailyPolishTitle', 'dailyPolishText',
			'hataskLink', 'footerText', 'footerLink',
		].sort();
		expect(Object.keys(copy).sort()).toEqual(expectedKeys);
		for (const value of Object.values(copy)) {
			expect(typeof value).toBe('string');
			expect(value.trim().length).toBeGreaterThan(0);
			expect(value).not.toMatch(/^_hata\.|hata-12\.5|hata-12\.6(?!\.1)/);
		}
		expect(copy.latestHeadline).toContain('hata-12.6.1');
	});
});
