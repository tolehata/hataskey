/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 旗鯖fork: 更新後に1回だけ出す「今回の更新内容」の中身。
 *
 * ⚠️ここは**旗鯖の変更だけ**を書く（本家 Misskey / CherryPick の更新は MkUpdated の
 *   「変更点を見る」に任せる）。⚠️正本は HATA-CHANGELOG.md。ここはその要約。
 * ⚠️本体の locales/*.yml は使わない（28ファイルに分散するため。既存の旗鯖独自ページと同じ作法）。
 * ⚠️版を上げたら `version` を package.json の値に合わせ、`items` を書き直すこと。
 *   合っていないと「更新したのに前回の内容が出る」ことになる。
 */

export type HataWhatsNewItem = {
	/** Tabler のアイコン名（`ti ti-` 込み） */
	icon: string;
	title: string;
	text: string;
	/**
	 * 「ここを見て」の誘導先。省略可。
	 * ⚠️`mainRouter.push()` は登録済みパスのリテラル型しか受けないため、
	 *   ここも文字列ではなくリテラル型のままにしておく（`string` にすると型検査で落ちる）。
	 */
	to?: '/settings/hata-custom' | '/games';
};

export type HataWhatsNew = {
	/** この内容が対応する旗鯖の版（package.json の version と一致させる） */
	version: string;
	headline: string;
	items: HataWhatsNewItem[];
};

export const HATA_WHATS_NEW: HataWhatsNew = {
	version: '2026.7.0-hata.12.0',
	headline: '土台を Misskey 2026.7.0 へ上げ、画像ビューワーを刷新しました。',
	items: [
		{
			icon: 'ti ti-mood-off',
			title: 'ミュートしたユーザーのリアクション非表示が正式機能に',
			text: 'ベータを卒業し、設定の場所が「旗鯖独自設定 → 旗鯖全体 → リアクション」に変わりました。'
				+ '他のユーザーの投稿に付いたリアクションも隠れます。隠したものがあるノートは、詳細画面に ⓘ が出ます。'
				+ '（管理者からのリアクションは隠せません。設定はこの端末にだけ保存されます）',
			to: '/settings/hata-custom',
		},
		{
			icon: 'ti ti-photo',
			title: '画像ビューワーを刷新',
			text: '本家の新しいビューワーに入れ替えました。ホイールでの拡大縮小や、動画をそのまま見られるようになっています。',
		},
		{
			icon: 'ti ti-flower',
			title: '花常（はなつね）の遊びやすさを改善',
			text: '帳面の「戻る」を押したときに物語が始まってしまう問題を直しました。'
				+ 'また、物語を読み終えた局をもう一度選ぶと、パズルで遊ぶか物語を読み返すかを選べます。',
			to: '/games',
		},
		{
			icon: 'ti ti-arrow-back-up',
			title: '「みつける」から戻れるようになりました',
			text: 'モバイル表示で左上に戻るボタンが出ず、前の画面に帰れなくなることがあった問題を直しました。'
				+ 'あわせて、サイドメニューの「もっと」からマスコットが開けなくなっていた問題も直しています。',
		},
		{
			icon: 'ti ti-shield-check',
			title: '安全性の修正',
			text: '外部への通信ログに認証情報が混ざり得た箇所を塞ぎ、非公開のはずの記録が他の人から読めてしまう不具合を修正しました。',
		},
	],
};
