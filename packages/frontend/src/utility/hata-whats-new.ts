/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 更新後に一度表示する、利用者向けの変更案内。
 * 実装用語や開発中だけの不具合は載せず、前回の項目を再掲しない。
 * 文言は共通localeの _hata._whatsNew を使う。
 * hata-12.5の案内。versionはpackage.jsonと同時に更新する。
 * 本番への公開済み判定には使わない。表示済みの記録は窓を閉じたときに行う。
 */

import { i18n } from '@/i18n.js';

const copy = i18n.ts._hata._whatsNew._content;

export type HataWhatsNewItem = {
	icon: string;
	/** 内容ごとに異なる、短い動く見本。 */
	preview: 'hataskPlanner' | 'hataskGarden' | 'externalBearBear' | 'gameFarewell'
		| 'welcomeRenewal' | 'serverChoice' | 'dailyPolish';
	title: string;
	text: string;
	/** 登録済みの行き先だけを指定する。終了した機能へのリンクは置かない。 */
	to?: '/hatask' | '/settings/external-account';
	linkLabel?: string;
};

export type HataWhatsNew = {
	/** package.jsonと同じ完全な版を表示済み判定に使う。 */
	version: string;
	headline: string;
	items: HataWhatsNewItem[];
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
	version: '2026.7.0-hata.12.5',
	headline: copy.headline,
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
			preview: 'externalBearBear',
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
	footer: {
		text: copy.footerText,
		linkLabel: copy.footerLink,
		linkUrl: 'https://github.com/tolehata/hataskey/blob/master/HATA-CHANGELOG.md',
	},
};
