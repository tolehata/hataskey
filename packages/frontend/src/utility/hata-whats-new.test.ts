/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { HATA_WHATS_NEW } from './hata-whats-new.js';

describe('HATA_WHATS_NEW', () => {
	test('更新見出しは指定された利用者向け表記になっている', () => {
		expect(HATA_WHATS_NEW.headline).toBe('大きな新機能を5つ、ゲームを1つ追加、ベースをMisskey2026.7.0へ更新しました');
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
		expect(HATA_WHATS_NEW.items).toHaveLength(14);
		expect(new Set(HATA_WHATS_NEW.items.map(item => item.preview)).size).toBe(14);
	});
});
