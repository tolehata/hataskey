/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 旗鯖fork: 更新後に1回だけ出す「今回の更新内容」の中身。
 *
 * ⚠️ここは**利用者から見て何が変わったか**だけを書く。
 *   ⚠️開発中に出て開発中に直した不具合は書かない（本番には一度も出ていないため）。
 *   ⚠️内部のリファクタ・依存更新・型修正も書かない（`HATA-CHANGELOG.md` の役目）。
 * ⚠️本体の locales/*.yml は使わない（28ファイルに分散するため。既存の旗鯖独自ページと同じ作法）。
 * ⚠️版を上げたら `version` を package.json の値に合わせ、`items` を書き直すこと。
 *   合っていないと「更新したのに前回の内容が出る」ことになる。
 *
 * ⚠️今回（hata-12.0）は**本番の 11.7 から一気に上がる**ため、
 *   11.7.5 / 11.7.6 / 11.7.7 / 11.8 とその後の追加を**まとめて**案内する。
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
	to?: '/settings/hata-custom' | '/games' | '/hatady' | '/hatask';
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

export const HATA_WHATS_NEW: HataWhatsNew = {
	version: '2026.7.0-hata.12.0',
	headline: '新しい道具が3つ増えました。土台も Misskey 2026.7.0 へ上げています。',
	items: [
		{
			icon: 'ti ti-book-2',
			title: 'Hatady（ハタディ）— 学習と読書の記録',
			text: '読んだ本や勉強したことを記録して、続けた日数や積み上げを振り返れる新しい道具です。'
				+ '本ごとのしおりと内容メモ、目標の設定、連続記録、横断検索、テキストでの書き出しに対応しています。'
				+ '記録の公開範囲は自分で選べます。',
			to: '/hatady',
		},
		{
			icon: 'ti ti-eye',
			title: 'Hatask を全面リデザイン',
			text: 'ホーム画面を「季」「花信」「刷」の3つのテーマから選べるようになりました。'
				+ 'タイルの並び替え・表示切替、HataFeed の通知タイル、地震・津波情報タイルにも対応しています。',
			to: '/hatask',
		},
		{
			icon: 'ti ti-flower',
			title: '花常（はなつね）— 新作ゲーム',
			text: '花を並べて消していくパズルに、花屋を舞台にした物語が付いた新作です。'
				+ '十二ヶ月の本編・街の様子・図鑑・イベントを収録しています。'
				+ '⚠️有料要素は一切ありません（今後も追加しません）。無料ですべて遊べます。',
			to: '/games',
		},
		{
			icon: 'ti ti-sparkles',
			title: 'HatasabaUI 2（すりガラス調）',
			text: 'ノートやカラムをすりガラス調にする新しい見た目を選べるようになりました。'
				+ '透過の強さはその場で確かめながら調整できます。'
				+ 'デッキにはクリップ・お気に入りのカラム、カラムごとの再読み込みが増えています。',
			to: '/settings/hata-custom',
		},
		{
			icon: 'ti ti-photo',
			title: '画像ビューワーを刷新',
			text: 'ホイールでの拡大縮小、動画をそのまま開いての再生、投稿する前のプレビューに対応しました。',
		},
		{
			icon: 'ti ti-mood-off',
			title: 'ミュートしたユーザーのリアクションを隠せます',
			text: 'ミュートした人が付けたリアクションを、ノートから隠せるようになりました。'
				+ '他のユーザーの投稿に付いたものも対象です。隠したものがあるノートは、詳細画面に ⓘ が出ます。'
				+ '（管理者からのリアクションは隠せません。設定はこの端末にだけ保存されます）',
			to: '/settings/hata-custom',
		},
		{
			icon: 'ti ti-adjustments',
			title: 'タイムラインと検索まわりの改善',
			text: 'Bot の投稿をタイムラインに出さない設定（例外の指定つき）、'
				+ '投稿日時の範囲を指定した検索、絵文字メニューからパレットへの直接追加、'
				+ 'ドライブとプロフィールでのスクロール位置の記憶などを追加しました。',
		},
		{
			icon: 'ti ti-shield-check',
			title: '安全性と土台の更新',
			text: '土台を Misskey 2026.7.0 相当へ上げ、二要素認証・URLプレビュー・OAuth まわりの修正を取り込みました。'
				+ '旗鯖独自の機能についても点検し、他の人の記録が見えてしまう不具合などを修正しています。',
		},
		{
			icon: 'ti ti-trash',
			title: 'なくなった機能',
			text: 'ノートの翻訳ボタン（外部の翻訳サービスに依存していたため）と、'
				+ 'CherryPick 由来の Friendly UI を廃止しました。'
				+ '投稿画像の自動センシティブ判定も、外部サービス方式への変更にともない停止しています。',
		},
	],
	footer: {
		text: 'ここに載せたのは主な変更だけです。細かな修正を含むすべての変更点は、リリースノートをご確認ください。',
		linkLabel: 'リリースノートを見る',
		linkUrl: 'https://github.com/tolehata/hataskey/blob/master/HATA-CHANGELOG.md',
	},
};
