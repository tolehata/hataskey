/* SPDX-License-Identifier: AGPL-3.0-only */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { getHataWhatsNewDisplayVersion, getHataWhatsNewStories, HATA_WHATS_NEW, HATA_WHATS_NEW_THEMES } from './hata-whats-new.js';

const root = path.resolve(process.cwd(), '../..');
const ids = ['ui-s-layout', 'ui-s-hatask', 'ui-s-split', 'ui-s-mobile-dock', 'ui-s-search', 'recipes', 'cooking-records', 'flower-care', 'flower-collection', 'ui-s-settings', 'legacy-ui-migration', 'ui-s-rss', 'registration-guidance', 'note-actions', 'line-seed', 'hataskey-sounds', 'sound-preferences', 'emoji-changes', 'feedback-overview', 'utage-revival', 'utage-status', 'mood-timezone', 'hatask-display', 'hatady-forms', 'timeline-display', 'note-appearance', 'hatady-notifications-1282', 'ui-hatask-1282', 'ui-s-fixes', 'daily-fixes', 'upstream-update', 'script-errors', 'composer-drafts', 'note-menu', 'timeline-swipe', 'ltl-punch'];
describe('approved release stories', () => {
	test('the displayed-version gate stays aligned with the package and release metadata', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
		expect(HATA_WHATS_NEW.version).toBe(pkg.version);
		expect(HATA_WHATS_NEW.version).toBe('2026.9.1-hata.12.8.2');
		const version = getHataWhatsNewDisplayVersion(pkg.version);
		expect(version).toBe('hata-12.8.2');
		const changelog = fs.readFileSync(path.join(root, 'HATA-CHANGELOG.md'), 'utf8');
		expect(changelog.indexOf('## hata-12.8.2\n')).toBeGreaterThan(0);
		expect(changelog.indexOf('## hata-12.8.2\n')).toBeLessThan(changelog.indexOf('## hata-12.8.1\n'));
		expect(changelog.indexOf('## hata-12.8.1\n')).toBeGreaterThan(0);
		expect(changelog.indexOf('## hata-12.8.1\n')).toBeLessThan(changelog.indexOf('## hata-12.8\n'));
		expect(changelog.indexOf('## hata-12.8\n')).toBeLessThan(changelog.indexOf('## hata-12.7.2\n'));
		expect(changelog).not.toContain('（未リリース）');
		expect(changelog).toContain('https://github.com/misskey-dev/misskey/releases/tag/2026.9.1');
		expect(changelog).toContain('Hataskey UI Sをベータ公開');
		expect(changelog).toContain('レシピと料理記録');
		expect(changelog).toContain('1790035500000-hatask-recipes.js');
		expect(/^## (hata-[\d.]+)$/mu.exec(changelog)?.[1]).toBe(version);
		expect(getHataWhatsNewDisplayVersion('development')).toBe('development');
	});
	test.each([600, 470, 469, 320])('all approved user updates remain reachable exactly once at body height %s', height => {
		const stories = getHataWhatsNewStories(height);
		expect(stories).toHaveLength(HATA_WHATS_NEW.groups.reduce((total, group) => total + (!group.feature && height < 470 ? group.cards.length : 1), 0));
		expect(stories[0].id).toBe('ui-s-layout');
		expect(stories.flatMap(story => story.cards.map(card => card.id))).toEqual(ids);
		expect(stories.slice(0, 4).map(story => [story.feature, story.scene])).toEqual([0, 1, 2, 3].map(scene => ['ui-s-2', scene]));
		expect(stories.slice(0, 4).map(story => story.label)).toEqual(['Hataskey UI S 2', 'PCで並べる', '指先で選ぶ', '探す・書く']);
		for (const story of stories) {
			expect(story.title).toBeTruthy();
			const sourceGroup = HATA_WHATS_NEW.groups.find(group => group.cards.some(card => card.id === story.id));
			if (!sourceGroup) throw new Error(`Missing source group for ${story.id}`);
			expect(story.cards).toHaveLength(!story.feature && height < 470 ? 1 : sourceGroup.cards.length);
		}
	});
	test('short-window pages use stable topic ids, including the second topic when pages merge', () => {
		const compact = getHataWhatsNewStories(380), full = getHataWhatsNewStories(600);
		for (const topic of compact) expect(full.find(story => story.cards.some(card => card.id === topic.id))).toBeDefined();
		expect(full.slice(0, 4).map(story => story.id)).toEqual(['ui-s-layout', 'ui-s-split', 'ui-s-mobile-dock', 'ui-s-search']);
		expect(full.at(-2)?.id).toBe('composer-drafts');
		expect(full.at(-1)?.id).toBe('timeline-swipe');
	});
	test('the six approved themes keep their persisted ids and the new moss theme', () => {
		expect(HATA_WHATS_NEW_THEMES.map(theme => theme.id)).toEqual(['akatsuki', 'koke', 'kisetsu', 'kashin', 'suri', 'hatakyu']);
		expect(HATA_WHATS_NEW_THEMES[1].name).toBe('苔');
	});
	test('copy covers visibility, migration, notification timing and safety conditions', () => {
		const cards = HATA_WHATS_NEW.groups.flatMap(group => group.cards);
		const points = (id: string) => cards.find(card => card.id === id)?.points?.join('');
		expect(points('ui-s-layout')).toContain('UI S 2');
		expect(points('ui-s-split')).toContain('タイムライン');
		expect(points('ui-s-mobile-dock')).toContain('長押し');
		expect(points('ui-s-search')).toContain('検索');
		expect(points('composer-drafts')).toContain('自動保存');
		expect(points('ltl-punch')).toContain('拳');
		expect(points('note-appearance')).toContain('添付画像の縁色');
		expect(points('note-appearance')).toContain('読み込み線');
		expect(points('note-appearance')).toContain('上部ナビの縁');
		expect(points('ui-s-fixes')).toContain('カスタム絵文字');
		expect(points('legacy-ui-migration')).toContain('ノートは維持');
		expect(points('note-actions')).toContain('3秒間');
		expect(points('note-actions')).toContain('お気に入り・クリップ');
		expect(points('line-seed')).toContain('別のフォントを選んだ設定は保ちます');
		expect(points('ui-s-rss')).toContain('最大5つ');
		expect(points('ui-s-rss')).toContain('端末ごと');
		expect(points('registration-guidance')).toContain('メール送信が有効');
		expect(points('registration-guidance')).toContain('再試行');
		expect(points('recipes')).toContain('公開設定はありません');
		expect(points('cooking-records')).toContain('Hatady側では非公開');
		expect(points('flower-care')).toContain('条件に応じて');
		expect(points('flower-care')).toContain('上限');
		expect(points('flower-care')).toContain('枯れません');
		expect(points('flower-collection')).toContain('12種');
		expect(points('flower-collection')).toContain('8種');
		expect(points('flower-collection')).toContain('月見草');
		expect(points('emoji-changes')).toContain('申請枠は戻りません');
		expect(cards.some(card => /スタッフ|管理者/u.test(card.label + card.title + card.points?.join('')))).toBe(false);
		expect(points('utage-revival')).toContain('一定の確率');
		expect(points('mood-timezone')).toContain('通知の設定は自動で書き換えず');
		expect(points('script-errors')).toContain('赤い文字');
		expect(points('upstream-update')).toContain('公式リリースノートを参照');
		expect(cards.flatMap(card => card.link ? [card.link] : [])).toEqual([{ label: 'Misskey公式リリースノート（2026.9.1）', url: 'https://github.com/misskey-dev/misskey/releases/tag/2026.9.1' }]);
		expect(cards.flatMap(card => card.preview ? [card.preview] : [])).toEqual(['note-actions', 'emoji-changes']);
		for (const card of cards) expect(card.points?.length).toBeGreaterThanOrEqual(2);
		for (const card of cards) expect(card.points?.length).toBeLessThanOrEqual(3);
	});
	test('release copy contains no implementation paths or internal storage and API terminology', () => {
		const implementationTerms = /Registry|API|localStorage|packages\/|マイグレーション|\/home\//u;
		expect(implementationTerms.test('packages/frontend/API')).toBe(true);
		expect(implementationTerms.test(JSON.stringify(HATA_WHATS_NEW.groups))).toBe(false);
	});
});
