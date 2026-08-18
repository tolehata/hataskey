/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

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

describe('HATA_WHATS_NEW', () => {
	test('機械判定用の完全な版から旗鯖の表示版を生成する', () => {
		expect(HATA_WHATS_NEW.version).toBe('2026.7.0-hata.12.2');
		expect(getHataWhatsNewDisplayVersion(HATA_WHATS_NEW.version)).toBe('hata-12.2');
		expect(getHataWhatsNewDisplayVersion('2026.7.0-hata.12.1')).toBe('hata-12.1');
		expect(getHataWhatsNewDisplayVersion('development')).toBe('development');
	});

	test('ブランディング刷新を必ず先頭で案内する', () => {
		expect(HATA_WHATS_NEW.items[0]).toMatchObject({
			preview: 'branding',
			to: '/settings/hata-custom',
		});
		expect(HATA_WHATS_NEW.items[0].title).toContain('ブランディング');
	});

	test('ブランディング刷新は1項目にまとめ、差し替えた個々の画面を項目にしない', () => {
		// ⚠️利用者から見て「1つの変更」なので、実装単位で項目を増やさない。
		const brandingItems = HATA_WHATS_NEW.items.filter(item => item.preview === 'branding');
		expect(brandingItems).toHaveLength(1);
	});

	test('12.1.3のタグに含まれる過去の案内を再掲しない', () => {
		const copy = JSON.stringify(HATA_WHATS_NEW);
		for (const removed of [
			'花常',
			'C/C++',
			'プライベートチャンネル',
			'画像ビューワー',
			'外部アカウント連携',
			'HataFeedを全面リデザイン',
			'中国語（簡体字）',
		]) {
			expect(copy).not.toContain(removed);
		}
	});

	test('Hatadyの記録追加と保存不具合の修正をどちらも案内する', () => {
		const record = HATA_WHATS_NEW.items.find(item => item.preview === 'hatadyRecord');
		expect(record).toMatchObject({ to: '/hatady', linkLabel: 'Hatadyへ' });
		expect(record?.text).toContain('ゲーム');
		expect(record?.text).toContain('映画');

		const visibility = HATA_WHATS_NEW.items.find(item => item.preview === 'hatadyVisibility');
		expect(visibility?.text).toContain('公開範囲');
	});

	test('HataSNSCordUIの修正はUIそのものへ切り替えて案内する', () => {
		expect(HATA_WHATS_NEW.items.find(item => item.preview === 'hatacordingFix')).toMatchObject({
			activateUi: 'hatacording',
			linkLabel: 'HataSNSCordUIへ',
		});
	});

	test('宴バッジはプロフィールの表示として案内する', () => {
		const badge = HATA_WHATS_NEW.items.find(item => item.preview === 'utageBadge');
		expect(badge?.title).toContain('プロフィール');
		expect(badge?.title).toContain('宴');
	});

	test('正式名称を使い、略称で案内しない', () => {
		const studio = HATA_WHATS_NEW.items.find(item => item.preview === 'sideStudioFix');
		expect(studio?.title).toContain('HataSideStudio');
		expect(studio).toMatchObject({ to: '/hata-side-studio' });
		expect(JSON.stringify(HATA_WHATS_NEW)).not.toContain('サイドスタジオ');
	});

	test('ミュートの件は機能改良として書き、ベータからの移行と書かない', () => {
		const mute = HATA_WHATS_NEW.items.find(item => item.preview === 'muteReaction');
		expect(`${mute?.title}\n${mute?.text}`).toContain('改良');
		expect(`${mute?.title}\n${mute?.text}`).not.toContain('ベータ');
	});

	test('すべての更新項目に内容別のプレビューを重複なく割り当てる', () => {
		expect(HATA_WHATS_NEW.items).toHaveLength(10);
		expect(new Set(HATA_WHATS_NEW.items.map(item => item.preview)).size).toBe(10);
	});

	test('見出しと本文がロケール未定義で空欄にならない', () => {
		expect(HATA_WHATS_NEW.headline).not.toBe('');
		for (const item of HATA_WHATS_NEW.items) {
			expect(item.title).not.toBe('');
			expect(item.text).not.toBe('');
			expect(item.title.startsWith('_hata')).toBe(false);
			expect(item.text.startsWith('_hata')).toBe(false);
		}
	});
});
