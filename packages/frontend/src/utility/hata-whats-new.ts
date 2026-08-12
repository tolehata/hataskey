/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 旗鯖fork: 更新後に1回だけ出す「今回の更新内容」の中身。
 *
 * ⚠️ここは**利用者から見て何が変わったか**だけを書く。
 *   ⚠️開発中に出て開発中に直した不具合は書かない（本番には一度も出ていないため）。
 *   ⚠️内部のリファクタ・依存更新・型修正も書かない（`HATA-CHANGELOG.md` の役目）。
 * 表示文言は本体の共通 locale `_hata._whatsNew` を使う。
 * ⚠️版を上げたら `version` を package.json の値に合わせ、`items` を書き直すこと。
 *   合っていないと「更新したのに前回の内容が出る」ことになる。
 *
 * ⚠️今回（hata-12.1.3）は**本番の 11.7 から一気に上がる**ため、
 *   11.7.5 / 11.7.6 / 11.7.7 / 11.8 とその後の追加を**まとめて**案内する。
 */

import { i18n } from '@/i18n.js';

const copy = i18n.ts._hata._whatsNew._content;

export type HataWhatsNewItem = {
	/** Tabler のアイコン名（`ti ti-` 込み） */
	icon: string;
	/** 更新案内に表示する、実画面を抽象化した小型プレビュー。 */
	preview: 'hatady' | 'hatask' | 'hatacording' | 'sideStudio' | 'language' | 'hanaawase' | 'ui' | 'hatafeed' | 'beta' | 'privateChannel' | 'profile' | 'viewer' | 'mute' | 'external' | 'security';
	title: string;
	text: string;
	/**
	 * 「ここを見て」の誘導先。省略可。
	 * ⚠️`mainRouter.push()` は登録済みパスのリテラル型しか受けないため、
	 *   ここも文字列ではなくリテラル型のままにしておく（`string` にすると型検査で落ちる）。
	 */
	to?: '/settings/hata-custom' | '/settings/preferences' | '/settings/external-account' | '/games' | '/hanaawase' | '/hatady' | '/hatask' | '/hata-side-studio' | '/hatafeed/hatacording-ui' | '/hatafeed/beta' | '/channels/new';
	/** URL遷移ではなく、選択中のUIそのものを切り替える誘導。 */
	activateUi?: 'hatacording';
	/** 誘導ボタンの文言。遷移先が違うのに一律「設定を開く」と表示しない。 */
	linkLabel?: string;
};

export type HataWhatsNew = {
	/** この内容が対応する旗鯖の版（package.json の version と一致させる） */
	version: string;
	headline: string;
	items: HataWhatsNewItem[];
	/**
	 * 末尾の案内文。⚠️ここに載せたのは主なものだけなので、全部を見たい人の行き先を必ず示す。
	 * `linkLabel` / `linkUrl` を省くと文だけ出る。
	 */
	footer: {
		text: string;
		linkLabel?: string;
		linkUrl?: string;
	};
};

/**
 * 保存済み判定には package.json と同じ完全な版を使いつつ、
 * 利用者には旗鯖のリリース名だけを簡潔に見せる。
 */
export function getHataWhatsNewDisplayVersion(version: string): string {
	const match = version.match(/-hata\.(\d+(?:\.\d+)+)$/);
	return match == null ? version : `hata-${match[1]}`;
}

export const HATA_WHATS_NEW: HataWhatsNew = {
	version: '2026.7.0-hata.12.1.3',
	headline: copy.headline,
	items: [
		{
			icon: 'ti ti-book-2',
			preview: 'hatady',
			title: copy.hatadyTitle,
			text: copy.hatadyText,
			to: '/hatady',
			linkLabel: copy.hatadyLink,
		},
		{
			icon: 'ti ti-eye',
			preview: 'hatask',
			title: copy.hataskTitle,
			text: copy.hataskText,
			to: '/hatask',
			linkLabel: copy.hataskLink,
		},
		{
			icon: 'ti ti-message-circle-code',
			preview: 'hatacording',
			title: copy.hatacordingTitle,
			text: copy.hatacordingText,
			activateUi: 'hatacording',
			linkLabel: copy.hatacordingLink,
		},
		{
			icon: 'ti ti-bell',
			preview: 'hatafeed',
			title: copy.hatafeedTitle,
			text: copy.hatafeedText,
		},
		{
			icon: 'ti ti-layout-sidebar-left-expand',
			preview: 'sideStudio',
			title: copy.sideStudioTitle,
			text: copy.sideStudioText,
			to: '/hata-side-studio',
			linkLabel: copy.sideStudioLink,
		},
		{
			icon: 'ti ti-language',
			preview: 'language',
			title: copy.languageTitle,
			text: copy.languageText,
			to: '/settings/preferences',
			linkLabel: copy.languageLink,
		},
		{
			icon: 'ti ti-lock',
			preview: 'privateChannel',
			title: copy.privateChannelTitle,
			text: copy.privateChannelText,
			to: '/channels/new',
			linkLabel: copy.privateChannelLink,
		},
		{
			icon: 'ti ti-flower',
			preview: 'hanaawase',
			title: '花常（はなつね）— 新作ゲーム',
			text: '花を並べて消していくパズルに、花屋を舞台にした物語が付いた新作ゲームです。',
			to: '/hanaawase',
			linkLabel: '花常へ',
		},
		{
			icon: 'ti ti-sparkles',
			preview: 'ui',
			title: copy.hatasabaUiTitle,
			text: copy.hatasabaUiText,
			to: '/settings/hata-custom',
			linkLabel: copy.settingsLink,
		},
		{
			icon: 'ti ti-flask-2',
			preview: 'beta',
			title: copy.betaTitle,
			text: copy.betaText,
			to: '/hatafeed/beta',
			linkLabel: copy.betaLink,
		},
		{
			icon: 'ti ti-award',
			preview: 'profile',
			title: copy.profileTitle,
			text: copy.profileText,
		},
		{
			icon: 'ti ti-photo',
			preview: 'viewer',
			title: copy.viewerTitle,
			text: copy.viewerText,
		},
		{
			icon: 'ti ti-mood-off',
			preview: 'mute',
			title: copy.muteTitle,
			text: copy.muteText,
			to: '/settings/hata-custom',
			linkLabel: copy.settingsLink,
		},
		{
			icon: 'ti ti-unlink',
			preview: 'external',
			title: copy.externalTitle,
			text: copy.externalText,
			to: '/settings/external-account',
			linkLabel: copy.externalLink,
		},
		{
			icon: 'ti ti-shield-check',
			preview: 'security',
			title: copy.securityTitle,
			text: copy.securityText,
		},
	],
	footer: {
		text: copy.footerText,
		linkLabel: copy.footerLink,
		linkUrl: 'https://github.com/tolehata/hataskey/blob/master/HATA-CHANGELOG.md',
	},
};
