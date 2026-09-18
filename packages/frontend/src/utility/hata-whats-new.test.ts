/* SPDX-License-Identifier: AGPL-3.0-only */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { getHataWhatsNewDisplayVersion, getHataWhatsNewStories, HATA_WHATS_NEW, HATA_WHATS_NEW_THEMES } from './hata-whats-new.js';

const root = path.resolve(process.cwd(), '../..');
const ids = ['favorite-folders', 'favorite-preservation', 'favorite-deck', 'favorite-saved', 'hatady-images', 'hatady-collection', 'hatady-delete', 'hatady-followup', 'mood-reminder', 'hatady-refresh', 'timeline-permissions', 'external-connection', 'navbar-emoji', 'navbar-time', 'registration-closed', 'registration-review', 'utage-visibility', 'utage-edits'];
describe('approved release stories', () => {
	test('the displayed-version gate stays aligned with the package and release metadata', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
		expect(HATA_WHATS_NEW.version).toBe(pkg.version);
		expect(HATA_WHATS_NEW.version).toBe('2026.9.0-hata.12.7.2');
		const version = getHataWhatsNewDisplayVersion(pkg.version);
		expect(version).toBe('hata-12.7.2');
		const changelog = fs.readFileSync(path.join(root, 'HATA-CHANGELOG.md'), 'utf8');
		expect(/^## (hata-[\d.]+)$/mu.exec(changelog)?.[1]).toBe(version);
		expect(getHataWhatsNewDisplayVersion('development')).toBe('development');
	});
	test.each([600, 470, 469, 320])('all eighteen follow-up updates remain reachable exactly once at body height %s', height => {
		const stories = getHataWhatsNewStories(height);
		expect(stories).toHaveLength(height < 470 ? 18 : 9);
		expect(stories[0].id).toBe('favorite-folders');
		expect(stories.flatMap(story => story.cards.map(card => card.id))).toEqual(ids);
		for (const story of stories) {
			expect(story.title).toBeTruthy();
			expect(story.cards).toHaveLength(height < 470 ? 1 : 2);
		}
	});
	test('short-window pages use stable topic ids, including the second topic when pages merge', () => {
		const compact = getHataWhatsNewStories(380), full = getHataWhatsNewStories(600);
		for (const topic of compact) expect(full.find(story => story.cards.some(card => card.id === topic.id))).toBeDefined();
		expect(full.map(story => story.id)).toEqual(['favorite-folders', 'favorite-deck', 'hatady-images', 'hatady-delete', 'mood-reminder', 'timeline-permissions', 'navbar-emoji', 'registration-closed', 'utage-visibility']);
	});
	test('the six approved themes keep their persisted ids and the new moss theme', () => {
		expect(HATA_WHATS_NEW_THEMES.map(theme => theme.id)).toEqual(['akatsuki', 'koke', 'kisetsu', 'kashin', 'suri', 'hatakyu']);
		expect(HATA_WHATS_NEW_THEMES[1].name).toBe('苔');
	});
	test('copy explains folder retention, staff review and notification conditions', () => {
		const cards = HATA_WHATS_NEW.groups.flatMap(group => group.cards);
		const points = (id: string) => cards.find(card => card.id === id)?.points?.join('');
		expect(points('favorite-preservation')).toContain('「未分類」へ');
		expect(points('registration-review')).toContain('鯖缶が最終承認');
		expect(points('registration-review')).toContain('メールアドレスを表示しません');
		expect(points('mood-reminder')).toContain('当日の記録がなければ');
		expect(points('mood-reminder')).toContain('通知の許可・購読設定に従います');
		expect(points('favorite-saved')).toContain('通常のHataskey UI');
		expect(points('favorite-saved')).toContain('保存先も上部ナビバー');
		expect(points('navbar-emoji')).toContain('通知一覧やプッシュには送らず');
		expect(points('navbar-time')).toContain('それぞれオン・オフ');
		expect(points('utage-edits')).toContain('元の表示へ戻る');
		expect(cards.some(card => card.id === 'favorite-support')).toBe(false);
		expect(cards.flatMap(card => card.preview ? [card.preview] : [])).toEqual(['favorites', 'favorite-deck', 'record-images', 'record-search', 'mood-reminder', 'timeline', 'registration', 'utage']);
		for (const card of cards) expect(card.points).toHaveLength(2);
	});
	test('release copy contains no implementation paths or internal storage and API terminology', () => {
		const implementationTerms = /Registry|API|localStorage|packages\/|マイグレーション|\/home\//u;
		expect(implementationTerms.test('packages/frontend/API')).toBe(true);
		expect(implementationTerms.test(JSON.stringify(HATA_WHATS_NEW.groups))).toBe(false);
	});
});
