/* SPDX-License-Identifier: AGPL-3.0-only */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { getHataWhatsNewDisplayVersion, getHataWhatsNewStories, HATA_WHATS_NEW, HATA_WHATS_NEW_THEMES } from './hata-whats-new.js';

const root = path.resolve(process.cwd(), '../..');
const ids = ['hatask-appearance', 'hatask-sharing', 'hatady-records', 'hatady-collection', 'hatady-profile', 'hatady-conversation', 'hatafeed-submit', 'hatafeed-navigation', 'hatadint-tools', 'hatadint-save', 'notification-refresh', 'window-controls', 'product-guides', 'hatask-support', 'retired-guides', 'search-polish'];
describe('approved release stories', () => {
	test('the displayed-version gate stays aligned with the package and release metadata', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
		expect(HATA_WHATS_NEW.version).toBe(pkg.version);
		const version = getHataWhatsNewDisplayVersion(pkg.version);
		const changelog = fs.readFileSync(path.join(root, 'HATA-CHANGELOG.md'), 'utf8');
		expect(/^## (hata-[\d.]+)$/mu.exec(changelog)?.[1]).toBe(version);
		expect(getHataWhatsNewDisplayVersion('development')).toBe('development');
	});
	test.each([600, 470, 469, 320])('all sixteen updates remain reachable exactly once at body height %s', height => {
		const stories = getHataWhatsNewStories(height);
		expect(stories.slice(0, 4).map(story => story.id)).toEqual(['hatask', 'hatady', 'hatafeed', 'hataintro']);
		expect(stories).toHaveLength(height < 470 ? 20 : 12);
		expect(stories.flatMap(story => story.cards?.map(card => card.id) ?? [])).toEqual(ids);
	});
	test('short-window pages use stable topic ids, including the second topic when pages merge', () => {
		const compact = getHataWhatsNewStories(380), full = getHataWhatsNewStories(600);
		for (const topic of compact.slice(4)) expect(full.find(story => story.cards?.some(card => card.id === topic.id))).toBeDefined();
	});
	test('the six approved themes keep their persisted ids and the new moss theme', () => {
		expect(HATA_WHATS_NEW_THEMES.map(theme => theme.id)).toEqual(['akatsuki', 'koke', 'kisetsu', 'kashin', 'suri', 'hatakyu']);
		expect(HATA_WHATS_NEW_THEMES[1].name).toBe('苔');
	});
	test('notification text retains its intentional paragraph break and all approved cleanup items', () => {
		const cards = HATA_WHATS_NEW.groups.flatMap(group => group.cards);
		expect(cards.find(card => card.id === 'notification-refresh')?.text).toEqual(['Hatadyのリデザインに合わせて、通知の表示を新しく。', 'Hataskey内のいくつかの通知表示も統合しました。']);
		const cleanup = JSON.stringify(cards.find(card => card.id === 'retired-guides'));
		for (const word of ['リアクションミュート', 'Hatask', 'デッキ', 'メニュー', 'HataFeed']) expect(cleanup).toContain(word);
		const implementationTerms = /Registry|API|localStorage|packages\/|マイグレーション|\/home\//u;
		expect(implementationTerms.test('packages/frontend/API')).toBe(true);
		expect(implementationTerms.test(JSON.stringify(HATA_WHATS_NEW.groups))).toBe(false);
	});
});
