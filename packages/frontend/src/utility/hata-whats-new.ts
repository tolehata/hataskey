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
 *   iPhoneのカード傾きとリアクション選択の修正も、対応する既存項目のlocaleへ含める。
 */

import { i18n } from '@/i18n.js';

const copy = i18n.ts._hata._whatsNew._content;

export type HataWhatsNewItem = {
	/** Tabler のアイコン名（`ti ti-` 込み） */
	icon: string;
	/** 更新案内に表示する、実画面を抽象化した小型プレビュー。 */
	preview: 'branding' | 'hatadyRecord' | 'hatadyVisibility' | 'hatacordingFix' | 'utageBadge'
		| 'muteReaction' | 'cardMaker' | 'hatasabaHome' | 'sideStudioFix' | 'mobileFix'
		| 'hatalyze' | 'hatakyuTheme' | 'hatadyExport' | 'foldable' | 'uiMotion' | 'langFix'
		| 'externalDdoskey' | 'fontUpload';
	title: string;
	text: string;
	/**
	 * 「ここを見て」の誘導先。省略可。
	 * ⚠️`mainRouter.push()` は登録済みパスのリテラル型しか受けないため、
	 *   ここも文字列ではなくリテラル型のままにしておく（`string` にすると型検査で落ちる）。
	 */
	to?: '/settings/hata-custom' | '/settings/preferences' | '/settings/external-account' | '/games' | '/hanaawase' | '/hatady' | '/hatask' | '/hatask/emotion-analysis' | '/hata-side-studio' | '/hatafeed/hatacording-ui' | '/hatafeed/beta' | '/channels/new';
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
	version: '2026.7.0-hata.12.3',
	headline: copy.headline,
	items: [
		// ⚠️ここに載せるのは hata-12.1.3 のタグに含まれていない変更だけ。
		//   ⚠️ブランディング刷新は1項目にまとめ、差し替えた個々の画面は列挙しない。
		{
			icon: 'ti ti-palette',
			preview: 'branding',
			title: copy.brandingTitle,
			text: copy.brandingText,
			to: '/settings/hata-custom',
			linkLabel: copy.brandingLink,
		},
		{
			icon: 'ti ti-device-gamepad-2',
			preview: 'hatadyRecord',
			title: copy.hatadyRecordTitle,
			text: copy.hatadyRecordText,
			to: '/hatady',
			linkLabel: copy.hatadyRecordLink,
		},
		{
			icon: 'ti ti-lock-open',
			preview: 'hatadyVisibility',
			title: copy.hatadyVisibilityTitle,
			text: copy.hatadyVisibilityText,
		},
		{
			icon: 'ti ti-message-circle-code',
			preview: 'hatacordingFix',
			title: copy.hatacordingFixTitle,
			text: copy.hatacordingFixText,
			activateUi: 'hatacording',
			linkLabel: copy.hatacordingFixLink,
		},
		{
			icon: 'ti ti-award',
			preview: 'utageBadge',
			title: copy.utageBadgeTitle,
			text: copy.utageBadgeText,
		},
		{
			icon: 'ti ti-mood-off',
			preview: 'muteReaction',
			title: copy.muteReactionTitle,
			text: copy.muteReactionText,
			to: '/settings/hata-custom',
			linkLabel: copy.muteReactionLink,
		},
		{
			icon: 'ti ti-id-badge-2',
			preview: 'cardMaker',
			title: copy.cardMakerTitle,
			text: copy.cardMakerText,
			to: '/hatask',
			linkLabel: copy.cardMakerLink,
		},
		{
			icon: 'ti ti-home',
			preview: 'hatasabaHome',
			title: copy.hatasabaHomeTitle,
			text: copy.hatasabaHomeText,
		},
		{
			icon: 'ti ti-layout-sidebar-left-expand',
			preview: 'sideStudioFix',
			title: copy.sideStudioFixTitle,
			text: copy.sideStudioFixText,
			to: '/hata-side-studio',
			linkLabel: copy.sideStudioFixLink,
		},
		{
			icon: 'ti ti-device-mobile',
			preview: 'mobileFix',
			title: copy.mobileFixTitle,
			text: copy.mobileFixText,
		},
		// ⚠️ここから下は hata-12.2 の案内を書いたあとに入った変更。
		//   ⚠️先頭はブランディングで固定なので、必ず末尾へ足すこと(テストが items[0] を見ている)。
		{
			icon: 'ti ti-mood-search',
			preview: 'hatalyze',
			title: copy.hatalyzeTitle,
			text: copy.hatalyzeText,
			to: '/hatask/emotion-analysis',
			linkLabel: copy.hatalyzeLink,
		},
		{
			icon: 'ti ti-layout-board',
			preview: 'hatakyuTheme',
			title: copy.hatakyuThemeTitle,
			text: copy.hatakyuThemeText,
			to: '/hatask',
			linkLabel: copy.hatakyuThemeLink,
		},
		{
			icon: 'ti ti-file-export',
			preview: 'hatadyExport',
			title: copy.hatadyExportTitle,
			text: copy.hatadyExportText,
			to: '/hatady',
			linkLabel: copy.hatadyExportLink,
		},
		{
			icon: 'ti ti-device-mobile-rotated',
			preview: 'foldable',
			title: copy.foldableTitle,
			text: copy.foldableText,
			to: '/settings/hata-custom',
			linkLabel: copy.foldableLink,
		},
		{
			icon: 'ti ti-wand',
			preview: 'uiMotion',
			title: copy.uiMotionTitle,
			text: copy.uiMotionText,
		},
		{
			icon: 'ti ti-language-hiragana',
			preview: 'langFix',
			title: copy.langFixTitle,
			text: copy.langFixText,
		},
		{
			icon: 'ti ti-plug-connected',
			preview: 'externalDdoskey',
			title: copy.externalDdoskeyTitle,
			text: copy.externalDdoskeyText,
			to: '/settings/external-account',
			linkLabel: copy.externalDdoskeyLink,
		},
		{
			icon: 'ti ti-typography',
			preview: 'fontUpload',
			title: copy.fontUploadTitle,
			text: copy.fontUploadText,
			to: '/settings/hata-custom',
			linkLabel: copy.brandingLink,
		},
	],
	footer: {
		text: copy.footerText,
		linkLabel: copy.footerLink,
		linkUrl: 'https://github.com/tolehata/hataskey/blob/master/HATA-CHANGELOG.md',
	},
};
