/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 更新後に一度表示する、利用者向けの変更案内。
 * 実装用語や開発中だけの不具合は載せない。
 * 「最新のリリース」「このリリース」「このメインリリース」を分け、同じ系列の案内も残す。
 * 文言は共通localeの _hata._whatsNew を使う。
 * hata-12.5.2の案内。versionはpackage.jsonと同時に更新する。
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

export type HataWhatsNewReleaseId = 'latestRelease' | 'currentRelease' | 'mainRelease';

export type HataWhatsNewRelease = {
	id: HataWhatsNewReleaseId;
	version: string;
	headline: string;
	items: HataWhatsNewItem[];
};

export type HataWhatsNew = {
	/** package.jsonと同じ完全な版を表示済み判定に使う。 */
	version: string;
	/** 最新版を先頭、直前の修正版、同じ系列のメイン版の順に置く。 */
	releases: [HataWhatsNewRelease, HataWhatsNewRelease, HataWhatsNewRelease];
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
	version: '2026.7.0-hata.12.5.2',
	releases: [
		{
			id: 'latestRelease',
			version: '2026.7.0-hata.12.5.2',
			headline: copy.latestHeadline,
			items: [
				{
					icon: 'ti ti-trophy',
					preview: 'utageAchievements',
					title: copy.utageAchievementsTitle,
					text: copy.utageAchievementsText,
				},
				{
					icon: 'ti ti-arrows-sort',
					preview: 'externalSidebar',
					title: copy.externalSidebarTitle,
					text: copy.externalSidebarText,
				},
				{
					icon: 'ti ti-messages',
					preview: 'externalTimeline',
					title: copy.externalTimelineTitle,
					text: copy.externalTimelineText,
				},
				{
					icon: 'ti ti-layout-dashboard',
					preview: 'timelineCollapse',
					title: copy.timelineCollapseTitle,
					text: copy.timelineCollapseText,
				},
			],
		},
		{
			id: 'currentRelease',
			version: '2026.7.0-hata.12.5.1',
			headline: copy.currentHeadline,
			items: [
				{
					icon: 'ti ti-device-mobile-check',
					preview: 'hataskPlanner',
					title: copy.hataskMobileTitle,
					text: copy.hataskMobileText,
					to: '/hatask',
					linkLabel: copy.hataskLink,
				},
				{
					icon: 'ti ti-send',
					preview: 'dailyPolish',
					title: copy.postComposerTitle,
					text: copy.postComposerText,
				},
				{
					icon: 'ti ti-language-hiragana',
					preview: 'welcomeRenewal',
					title: copy.serverNameTitle,
					text: copy.serverNameText,
				},
				{
					icon: 'ti ti-plug-connected',
					preview: 'externalAccount',
					previewLabel: 'mk-juice.dev',
					title: copy.externalJuiceTitle,
					text: copy.externalJuiceText,
					to: '/settings/external-account',
					linkLabel: copy.externalLink,
				},
			],
		},
		{
			id: 'mainRelease',
			version: '2026.7.0-hata.12.5',
			headline: copy.mainHeadline,
			items: [
				{
					icon: 'ti ti-calendar-check',
					preview: 'hataskPlanner',
					title: copy.hataskPlannerTitle,
					text: copy.hataskPlannerText,
					to: '/hatask',
					linkLabel: copy.hataskLink,
				},
				{
					icon: 'ti ti-flower',
					preview: 'hataskGarden',
					title: copy.hataskGardenTitle,
					text: copy.hataskGardenText,
					to: '/hatask',
					linkLabel: copy.hataskLink,
				},
				{
					icon: 'ti ti-plug-connected',
					preview: 'externalAccount',
					previewLabel: 'xiapopisland.top',
					title: copy.externalBearBearTitle,
					text: copy.externalBearBearText,
					to: '/settings/external-account',
					linkLabel: copy.externalLink,
				},
				{
					icon: 'ti ti-door-enter',
					preview: 'welcomeRenewal',
					title: copy.welcomeRenewalTitle,
					text: copy.welcomeRenewalText,
				},
				{
					icon: 'ti ti-world',
					preview: 'serverChoice',
					title: copy.serverChoiceTitle,
					text: copy.serverChoiceText,
				},
				{
					icon: 'ti ti-flower',
					preview: 'gameFarewell',
					title: copy.gameFarewellTitle,
					text: copy.gameFarewellText,
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
