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
	test('更新見出しは指定された利用者向け表記になっている', () => {
		expect(HATA_WHATS_NEW.headline).toBe('大きな新機能を5つ、ゲームを1つ追加、ベースをMisskey2026.7.0へ更新しました');
	});

	test('機械判定用の完全な版から旗鯖の表示版を生成する', () => {
		expect(HATA_WHATS_NEW.version).toBe('2026.7.0-hata.12.1.3');
		expect(getHataWhatsNewDisplayVersion(HATA_WHATS_NEW.version)).toBe('hata-12.1.3');
		expect(getHataWhatsNewDisplayVersion('2026.7.0-hata.12.1')).toBe('hata-12.1');
		expect(getHataWhatsNewDisplayVersion('development')).toBe('development');
	});

	test('12.1.3までに追加・改善した利用者向け機能を案内する', () => {
		const hatask = HATA_WHATS_NEW.items.find(item => item.preview === 'hatask');
		const sideStudio = HATA_WHATS_NEW.items.find(item => item.preview === 'sideStudio');
		const hatacording = HATA_WHATS_NEW.items.find(item => item.preview === 'hatacording');
		const ui = HATA_WHATS_NEW.items.find(item => item.preview === 'ui');
		const language = HATA_WHATS_NEW.items.find(item => item.preview === 'language');
		expect(hatask?.text).toContain('カードメーカー');
		expect(hatask?.text).toContain('バックグラウンド');
		expect(hatask?.text).toContain('端末の動き');
		expect(sideStudio?.text).toContain('猫の肉球');
		expect(hatacording?.text).toContain('返信先');
		expect(ui?.text).toContain('時計');
		expect(ui?.text).toContain('iPhone');
		expect(language?.text).toContain('サーバー情報');
		expect(language?.text).toContain('未設定');
	});

	test('新機能カードはそれぞれ正しい画面へ誘導する', () => {
		expect(HATA_WHATS_NEW.items.find(item => item.title.startsWith('Hatady'))).toMatchObject({
			to: '/hatady',
			linkLabel: 'Hatadyへ',
		});
		expect(HATA_WHATS_NEW.items.find(item => item.title.startsWith('Hatask'))).toMatchObject({
			to: '/hatask',
			linkLabel: 'Hataskへ',
		});
		expect(HATA_WHATS_NEW.items.find(item => item.title.startsWith('花常'))).toMatchObject({
			to: '/hanaawase',
			linkLabel: '花常へ',
		});
		expect(HATA_WHATS_NEW.items.find(item => item.title.startsWith('HataSideStudio'))).toMatchObject({
			to: '/hata-side-studio',
			linkLabel: 'HataSideStudioへ',
		});
	});

	test('HataSNSCordUIをHataskの直後かつHataFeedの直前に案内する', () => {
		const hataskIndex = HATA_WHATS_NEW.items.findIndex(item => item.title.startsWith('Hatask'));
		expect(HATA_WHATS_NEW.items[hataskIndex + 1]).toMatchObject({
			preview: 'hatacording',
			activateUi: 'hatacording',
			linkLabel: 'HataSNSCordUIへ',
		});
		expect(HATA_WHATS_NEW.items[hataskIndex + 2]?.title).toBe('HataFeedを全面リデザイン');
	});

	test('ベータ機能は試せる内容と専用画面への導線を案内する', () => {
		const beta = HATA_WHATS_NEW.items.find(item => item.preview === 'beta');
		expect(beta).toMatchObject({
			to: '/hatafeed/beta',
			linkLabel: 'ベータ機能を見る',
		});
		expect(`${beta?.title}\n${beta?.text}`).toContain('C/C++');
		expect(`${beta?.title}\n${beta?.text}`).toContain('投稿前');
	});

	test('プライベートチャンネルの作成と招待承認制を案内する', () => {
		const privateChannel = HATA_WHATS_NEW.items.find(item => item.preview === 'privateChannel');
		expect(privateChannel).toMatchObject({
			to: '/channels/new',
			linkLabel: 'チャンネルを作る',
		});
		const copy = `${privateChannel?.title}\n${privateChannel?.text}`;
		expect(copy).toContain('管理者から許可');
		expect(copy).toContain('承認して初めて参加');
		expect(copy).toContain('招待拒否');
	});

	test('プライベートチャンネルは花常の直前に案内する', () => {
		const hanaawaseIndex = HATA_WHATS_NEW.items.findIndex(item => item.title.startsWith('花常'));
		expect(HATA_WHATS_NEW.items[hanaawaseIndex - 1]?.preview).toBe('privateChannel');
	});

	test('前回分・廃止分と不要な花常説明を再掲しない', () => {
		const copy = JSON.stringify(HATA_WHATS_NEW);
		for (const removed of [
			'十二ヶ月の本編',
			'有料要素',
			'新作です',
			'新しい道具',
			'タイムラインと検索まわりの改善',
			'なくなった機能',
		]) {
			expect(copy).not.toContain(removed);
		}
	});

	test('画像ビューワーをMisskey本家由来と明記する', () => {
		const viewer = HATA_WHATS_NEW.items.find(item => item.title.includes('画像ビューワー'));
		expect(`${viewer?.title}\n${viewer?.text}`).toContain('Misskey本家');
	});

	test('独自機能の3言語対応と対象外を案内する', () => {
		const language = HATA_WHATS_NEW.items.find(item => item.preview === 'language');
		expect(language).toMatchObject({
			to: '/settings/preferences',
			linkLabel: '言語設定を開く',
		});
		const copy = `${language?.title}\n${language?.text}`;
		expect(copy).toContain('英語');
		expect(copy).toContain('中国語（簡体字）');
		expect(copy).toContain('花常');
		expect(copy).toContain('地震・津波情報');
	});

	test('外部アカウント連携の撤去対象と削除内容を明記する', () => {
		const external = HATA_WHATS_NEW.items.find(item => item.title.includes('外部アカウント連携'));
		const copy = `${external?.title}\n${external?.text}`;
		expect(copy).toContain('旗池3丁目');
		expect(copy).toContain('シュリンピア');
		expect(copy).toContain('ログイン情報');
		expect(copy).toContain('絵文字キャッシュ');
		expect(copy).toContain('このサーバーから閲覧できません');
		expect(copy).toContain('さめすきーとチョリソリング');
	});

	test('すべての更新項目に内容別の実画面風プレビューを割り当てる', () => {
		expect(HATA_WHATS_NEW.items).toHaveLength(15);
		expect(new Set(HATA_WHATS_NEW.items.map(item => item.preview)).size).toBe(15);
	});
});
