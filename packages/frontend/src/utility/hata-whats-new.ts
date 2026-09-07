/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 更新後に一度表示する、利用者向けの変更案内。
 * 実装用語や開発中だけの不具合は載せない。
 * hata-12.6.1だけを特集する。過去の案内はHATA-CHANGELOG.mdで参照できる。
 * 文言は共通localeの _hata._whatsNew を使う。
 * hata-12.6.1の案内。versionはpackage.jsonと同時に更新する。
 * 本番への公開済み判定には使わない。表示済みの記録は窓を閉じたときに行う。
 */

import { i18n } from '@/i18n.js';

const copy = i18n.ts._hata._whatsNew._content;

export type HataWhatsNewItem = {
	icon: string;
	/** 内容ごとに異なる、短い動く見本。 */
	preview: 'utageAchievements' | 'externalSidebar' | 'externalTimeline' | 'timelineCollapse'
		| 'hataskPlanner' | 'hataskGarden' | 'externalAccount' | 'gameFarewell'
		| 'welcomeRenewal' | 'serverChoice' | 'dailyPolish';
	/** 外部接続先など、見本の中に表示する短い固有名。 */
	previewLabel?: string;
	title: string;
	text: string;
	/** 登録済みの行き先だけを指定する。終了した機能へのリンクは置かない。 */
	to?: '/hatask' | '/settings/external-account';
	linkLabel?: string;
};

export type HataWhatsNewReleaseId = 'latestRelease' | 'currentRelease' | 'previousRelease' | 'mainRelease';

export type HataWhatsNewRelease = {
	id: HataWhatsNewReleaseId;
	version: string;
	headline: string;
	items: HataWhatsNewItem[];
};

export type HataWhatsNew = {
	/** package.jsonと同じ完全な版を表示済み判定に使う。 */
	version: string;
	/** 今回紹介する版を並べる。1版だけの場合は切り替え欄を表示しない。 */
	releases: [HataWhatsNewRelease, ...HataWhatsNewRelease[]];
	footer: {
		text: string;
		linkLabel?: string;
		linkUrl?: string;
	};
};

export function getHataWhatsNewDisplayVersion(version: string): string {
	const match = version.match(/-hata\.(\d+(?:\.\d+)+)$/);
	return match == null ? version : `hata-${match[1]}`;
}

export const HATA_WHATS_NEW: HataWhatsNew = {
	version: '2026.9.0-hata.12.6.1',
	releases: [
		{
			id: 'latestRelease',
			version: '2026.9.0-hata.12.6.1',
			headline: copy.latestHeadline,
			items: [
				{
					icon: 'ti ti-flower',
					preview: 'hataskGarden',
					title: copy.flowerTitle,
					text: copy.flowerText,
					to: '/hatask',
					linkLabel: copy.hataskLink,
				},
				{
					icon: 'ti ti-apps',
					preview: 'hataskPlanner',
					title: copy.hataskHomeTitle,
					text: copy.hataskHomeText,
					to: '/hatask',
					linkLabel: copy.hataskLink,
				},
				{
					icon: 'ti ti-bell',
					preview: 'externalTimeline',
					title: copy.notificationsTitle,
					text: copy.notificationsText,
				},
				{
					icon: 'ti ti-checks',
					preview: 'dailyPolish',
					title: copy.dailyPolishTitle,
					text: copy.dailyPolishText,
				},
			],
		},
	],
	footer: {
		text: copy.footerText,
		linkLabel: copy.footerLink,
		linkUrl: 'https://github.com/tolehata/hataskey/blob/master/HATA-CHANGELOG.md',
	},
};
