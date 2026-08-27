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
		expect(HATA_WHATS_NEW.version).toBe('2026.7.0-hata.12.3');
		expect(getHataWhatsNewDisplayVersion(HATA_WHATS_NEW.version)).toBe('hata-12.3');
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
			'外部アカウント連携を追加',
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
		// ⚠️hata-12.2 の案内を書いたあとに入った変更を8件足したので18件。
		//   ⚠️プレビューは1項目につき1種類。使い回すと「何が変わったか」が図から読めなくなる。
		expect(HATA_WHATS_NEW.items).toHaveLength(18);
		expect(new Set(HATA_WHATS_NEW.items.map(item => item.preview)).size).toBe(18);
	});

	test('あとから足した主要な変更を案内する', () => {
		const previews = HATA_WHATS_NEW.items.map(item => item.preview);
		for (const preview of ['hatalyze', 'hatakyuTheme', 'hatadyExport', 'foldable', 'uiMotion', 'langFix', 'externalDdoskey', 'fontUpload']) {
			expect(previews).toContain(preview);
		}
		// ⚠️先頭はブランディングのまま。あとから足した分は必ず末尾へ。
		expect(HATA_WHATS_NEW.items[0].preview).toBe('branding');
		expect(HATA_WHATS_NEW.items.find(item => item.preview === 'hatalyze')).toMatchObject({ to: '/hatask/emotion-analysis' });
	});

	test('フォントファイルの追加形式を利用者向けに案内する', () => {
		const item = HATA_WHATS_NEW.items.find(x => x.preview === 'fontUpload');
		expect(item).toMatchObject({ to: '/settings/hata-custom' });
		expect(item?.text).toContain('.ttf');
		expect(item?.text).toContain('.otf');
		expect(item?.text).toContain('直接アップロード');
		expect(item?.text).toContain('変更しません');
	});

	test('折りたたみ端末のプレビューは閉じた状態から開く', async () => {
		const fs = await import('node:fs');
		const path = await import('node:path');
		const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/MkHataWhatsNew.vue'), 'utf8');
		expect(source).toContain('@keyframes hwnFoldOpen');
		expect(source).toContain('rotateY(-178deg)');
		expect(source).toContain('rotateY(0deg)');
		expect(source).toContain('transform-origin: left center');
	});

	test('外部アカウント連携は接続先の追加としてのみ案内する', () => {
		// ⚠️機能そのものは 12.1.3 で案内済み。今回言うべきなのは接続先が増えたことだけ。
		const item = HATA_WHATS_NEW.items.find(x => x.preview === 'externalDdoskey');
		expect(item).toMatchObject({ to: '/settings/external-account' });
		expect(item?.title).toContain('㐂五亭');
		expect(item?.text).toContain('ddoskey.com');
		// ⚠️つないだ先の規約が適用される外部サーバーなので、それを伏せない。
		expect(item?.text).toContain('規約');
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
