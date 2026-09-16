/* SPDX-License-Identifier: AGPL-3.0-only */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { getHataWhatsNewDisplayVersion, getHataWhatsNewStories, HATA_WHATS_NEW, HATA_WHATS_NEW_THEMES } from './hata-whats-new.js';

const root = path.resolve(process.cwd(), '../..');
const ids = ['vote-display', 'vote-state', 'report-environment', 'roadmap-create', 'mobile-viewport', 'dialog-close', 'intro-back', 'deck-widgets', 'hatask-input', 'hatady-motion', 'hatady-moderation', 'hatask-record-review'];
describe('approved release stories', () => {
	test('the displayed-version gate stays aligned with the package and release metadata', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
		expect(HATA_WHATS_NEW.version).toBe(pkg.version);
		expect(HATA_WHATS_NEW.version).toBe('2026.9.0-hata.12.7.1');
		const version = getHataWhatsNewDisplayVersion(pkg.version);
		expect(version).toBe('hata-12.7.1');
		const changelog = fs.readFileSync(path.join(root, 'HATA-CHANGELOG.md'), 'utf8');
		expect(/^## (hata-[\d.]+)$/mu.exec(changelog)?.[1]).toBe(version);
		expect(getHataWhatsNewDisplayVersion('development')).toBe('development');
	});
	test.each([600, 470, 469, 320])('all twelve follow-up updates remain reachable exactly once at body height %s', height => {
		const stories = getHataWhatsNewStories(height);
		expect(stories).toHaveLength(height < 470 ? 12 : 6);
		expect(stories[0].id).toBe('vote-display');
		expect(stories.flatMap(story => story.cards.map(card => card.id))).toEqual(ids);
		for (const story of stories) {
			expect(story.title).toBeTruthy();
			expect(story.cards).toHaveLength(height < 470 ? 1 : 2);
		}
	});
	test('short-window pages use stable topic ids, including the second topic when pages merge', () => {
		const compact = getHataWhatsNewStories(380), full = getHataWhatsNewStories(600);
		for (const topic of compact) expect(full.find(story => story.cards.some(card => card.id === topic.id))).toBeDefined();
		expect(full.map(story => story.id)).toEqual(['vote-display', 'report-environment', 'mobile-viewport', 'intro-back', 'hatask-input', 'hatady-moderation']);
	});
	test('the six approved themes keep their persisted ids and the new moss theme', () => {
		expect(HATA_WHATS_NEW_THEMES.map(theme => theme.id)).toEqual(['akatsuki', 'koke', 'kisetsu', 'kashin', 'suri', 'hatakyu']);
		expect(HATA_WHATS_NEW_THEMES[1].name).toBe('苔');
	});
	test('follow-up copy retains optional input, staff scope, and existing editing and exit paths', () => {
		const cards = HATA_WHATS_NEW.groups.flatMap(group => group.cards);
		expect(cards.find(card => card.id === 'vote-display')?.points?.[1]).toContain('Hataskey UIとデッキUI');
		expect(cards.find(card => card.id === 'report-environment')?.points?.[1]).toContain('入力は任意。');
		expect(cards.find(card => card.id === 'roadmap-create')?.label).toBe('スタッフ向け');
		expect(cards.find(card => card.id === 'intro-back')?.points?.[1]).toContain('戻る画面がないときはホームへ移動');
		expect(cards.find(card => card.id === 'deck-widgets')?.points?.[1]).toContain('編集はカラムのメニューから。');
		expect(cards.flatMap(card => card.preview ? [card.preview] : [])).toEqual(['vote-setting', 'environment', 'viewport', 'intro-back', 'deck']);
	});
	test('release copy contains no implementation paths or internal storage and API terminology', () => {
		const implementationTerms = /Registry|API|localStorage|packages\/|マイグレーション|\/home\//u;
		expect(implementationTerms.test('packages/frontend/API')).toBe(true);
		expect(implementationTerms.test(JSON.stringify(HATA_WHATS_NEW.groups))).toBe(false);
	});
});
