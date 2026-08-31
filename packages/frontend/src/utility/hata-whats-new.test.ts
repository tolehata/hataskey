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
const previews = ['hataskPlanner', 'hataskGarden', 'externalBearBear', 'welcomeRenewal', 'serverChoice', 'gameFarewell', 'dailyPolish'];
const oldPreviews = new Set([
	'branding', 'settingsRenewal', 'hatadyRecord', 'hatadyVisibility', 'hatacordingFix',
	'utageBadge', 'muteReaction', 'cardMaker', 'hatasabaHome', 'sideStudioFix', 'mobileFix',
	'hatalyze', 'hatakyuTheme', 'hatadyExport', 'foldable', 'uiMotion', 'langFix', 'externalDdoskey', 'fontUpload',
]);
const locales = ['ja-JP', 'en-US', 'zh-CN'].map(lang => {
	const locale = yaml.load(fs.readFileSync(path.join(root, 'locales', `${lang}.yml`), 'utf8')) as Locale;
	return { lang, copy: locale._hata._whatsNew._content };
});

describe('HATA_WHATS_NEW', () => {
	test('表示済み判定の版をpackage.jsonと一致させる', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
		expect(HATA_WHATS_NEW.version).toBe(pkg.version);
		expect(getHataWhatsNewDisplayVersion('2026.7.0-hata.12.5')).toBe('hata-12.5');
		expect(getHataWhatsNewDisplayVersion('2026.7.0-hata.12.1')).toBe('hata-12.1');
		expect(getHataWhatsNewDisplayVersion('development')).toBe('development');
	});

	test('新しい7項目それぞれに異なる見本を割り当てる', () => {
		expect(HATA_WHATS_NEW.items.map(item => item.preview)).toEqual(previews);
		expect(new Set(HATA_WHATS_NEW.items.map(item => item.preview)).size).toBe(previews.length);
	});

	test('旧19項目の再掲を陽性対照付きで検出する', () => {
		const findOld = (items: string[]) => items.filter(item => oldPreviews.has(item));
		expect(findOld([...previews, 'branding', 'externalDdoskey'])).toEqual(['branding', 'externalDdoskey']);
		expect(findOld(HATA_WHATS_NEW.items.map(item => item.preview))).toEqual([]);
	});

	test('Hataskの予定・ToDo・みんなのお花を案内する', () => {
		const planner = HATA_WHATS_NEW.items[0];
		expect(planner).toMatchObject({ preview: 'hataskPlanner', to: '/hatask' });
		expect(planner.title).toContain('大幅に改良');
		for (const word of ['月・週・日・予定一覧', 'ToDo', 'まとめて変更']) expect(planner.text).toContain(word);
		const garden = HATA_WHATS_NEW.items[1];
		expect(garden).toMatchObject({ preview: 'hataskGarden', to: '/hatask' });
		for (const word of ['みんなのお花', '花言葉', 'フォロワー', '自分のみ']) expect(garden.text).toContain(word);
	});

	test('BearBearは既存の連携機能の接続先追加として規約とともに案内する', () => {
		const item = HATA_WHATS_NEW.items.find(item => item.preview === 'externalBearBear');
		expect(item).toMatchObject({ to: '/settings/external-account' });
		expect(item?.title).toContain('BearBear');
		expect(item?.text).toContain('xiapopisland.top');
		expect(item?.text).toContain('規約');
		expect(item?.text).not.toContain('ddoskey.com');
	});

	test('別サーバーでの利用を独立した項目で案内し無条件の互換性を保証しない', () => {
		const item = HATA_WHATS_NEW.items.find(item => item.preview === 'serverChoice');
		expect(item?.title).toBe('Hataskeyを別サーバーでご利用いただけるようになりました');
		expect(item?.text).toContain('Hataskeyを導入したサーバー');
		expect(item?.text).toContain('サーバーごとの設定');
		expect(item?.text).not.toMatch(/どのサーバーでも|完全互換|検証済み/);
	});

	test('新しいログイン画面の案内にはモバイルでの切り替えも含める', () => {
		const item = HATA_WHATS_NEW.items.find(item => item.preview === 'welcomeRenewal');
		for (const word of ['投稿', '人数', '矢印ボタン']) expect(item?.text).toContain(word);
	});

	test('花常は提供終了としてだけ案内し遊ぶリンクを作らない', () => {
		const item = HATA_WHATS_NEW.items.find(item => item.preview === 'gameFarewell');
		expect(item?.title).toBe('花常の提供を終了します');
		expect(item?.text).toContain('遊べなくなります');
		expect(item?.text).toContain('ありがとうございました');
		expect(item?.to).toBeUndefined();
		expect(item?.linkLabel).toBeUndefined();
	});

	test('保存済みのポータル除去を利用者の言葉で説明する', () => {
		expect(HATA_WHATS_NEW.items.find(item => item.preview === 'dailyPolish')?.text).toContain('廃止したポータル');
		const internalTerms = /Registry|API|DB|MiAuth|localStorage|fail.closed|リファクタ|フォールバック|マイグレーション/i;
		expect(internalTerms.test('Registry APIのマイグレーション')).toBe(true);
		const userCopy = [HATA_WHATS_NEW.headline, ...HATA_WHATS_NEW.items.flatMap(item => [item.title, item.text])].join('\n');
		expect(internalTerms.test(userCopy)).toBe(false);
	});

	test('案内からの移動先は現在の画面に限定し表示UIを勝手に切り替えない', () => {
		for (const item of HATA_WHATS_NEW.items) {
			if (item.to) {
				expect(['/hatask', '/settings/external-account']).toContain(item.to);
				expect(item.linkLabel).toBeTruthy();
			}
			expect(item).not.toHaveProperty('activateUi');
		}
	});

	test.each(locales)('$langの新しい見出し・本文・リンクがすべて揃う', ({ copy }) => {
		const expectedKeys = [
			'headline', 'hataskLink', 'externalLink', 'footerText', 'footerLink',
			...previews.flatMap(preview => [`${preview}Title`, `${preview}Text`]),
		].sort();
		expect(Object.keys(copy).sort()).toEqual(expectedKeys);
		for (const value of Object.values(copy)) {
			expect(typeof value).toBe('string');
			expect(value.trim().length).toBeGreaterThan(0);
			expect(value).not.toMatch(/^_hata\./);
		}
	});

	test('見出しと本文が翻訳キーのまま表示されない', () => {
		for (const item of HATA_WHATS_NEW.items) {
			expect(item.title).toBeTruthy();
			expect(item.text).toBeTruthy();
			expect(item.title).not.toMatch(/^_hata\./);
			expect(item.text).not.toMatch(/^_hata\./);
		}
	});
});
