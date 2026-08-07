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
	/** 更新案内に表示する、実画面を抽象化した小型プレビュー。 */
	preview: 'hatady' | 'hatask' | 'sideStudio' | 'hanaawase' | 'ui' | 'hatafeed' | 'beta' | 'privateChannel' | 'profile' | 'viewer' | 'mute' | 'external' | 'security';
	title: string;
	text: string;
	/**
	 * 「ここを見て」の誘導先。省略可。
	 * ⚠️`mainRouter.push()` は登録済みパスのリテラル型しか受けないため、
	 *   ここも文字列ではなくリテラル型のままにしておく（`string` にすると型検査で落ちる）。
	 */
	to?: '/settings/hata-custom' | '/settings/external-account' | '/games' | '/hanaawase' | '/hatady' | '/hatask' | '/hata-side-studio' | '/hatafeed/beta' | '/channels/new';
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

export const HATA_WHATS_NEW: HataWhatsNew = {
	version: '2026.7.0-hata.12.0',
	headline: '大きな新機能を5つ、ゲームを1つ追加、ベースをMisskey2026.7.0へ更新しました',
	items: [
		{
			icon: 'ti ti-book-2',
			preview: 'hatady',
			title: 'Hatady（ハタディ）— 学習と読書の記録',
			text: '読んだ本や勉強したことを記録して、続けた日数や積み上げを振り返れる新しいツールです。'
				+ '本ごとのしおりと内容メモ、目標の設定、連続記録、横断検索、テキストでの書き出しに対応しています。'
				+ '記録の公開範囲は自分で選べ、通常表示では左上のボタンから前の画面へ戻れます。',
			to: '/hatady',
			linkLabel: 'Hatadyへ',
		},
		{
			icon: 'ti ti-eye',
			preview: 'hatask',
			title: 'Hatask を全面リデザイン',
			text: 'ホーム画面を「季」「花信」「刷」の3つのテーマから選べるようになりました。'
				+ '表示切替、HataFeed の通知タイル、地震・津波情報タイルにも対応しています。'
				+ '育てている花の進み具合と、咲いた花の一覧を確認できるウィジェットも追加しました。',
			to: '/hatask',
			linkLabel: 'Hataskへ',
		},
		{
			icon: 'ti ti-bell',
			preview: 'hatafeed',
			title: 'HataFeedを全面リデザイン',
			text: 'HataFeedを、イシューの検索・絞り込み・ロードマップ・通知をひと目で確認できる画面へ刷新しました。'
				+ 'トップから絵文字を申請でき、スタッフは複数の申請を1件ずつ続けて確認できます。'
				+ 'イシューは範囲と含める内容を選んで書き出せます。'
				+ '同じHataFeedの通知をまとめ、複数のHataFeedから届いた場合もひとまとまりで確認できるようになりました。'
				+ 'Hatask、HataFeed、地震・津波、プライベートチャンネルのOS通知にも、内容と移動先を表示します。',
		},
		{
			icon: 'ti ti-layout-sidebar-left-expand',
			preview: 'sideStudio',
			title: 'HataSideStudio — サイドメニューを自分の形に',
			text: '実際のサイドメニューを見ながら、ボタン・グループ・ウィジェットの並び、形、色、表示内容を端末ごとに編集できる新しいツールです。'
				+ '拡大時と縮小時を分けて作れ、複数のプロファイル、ドラッグ操作、元に戻す・やり直し、設定の書き出しと読み込みにも対応しています。'
				+ '設定は端末内で処理され、サーバーや連合へ送信されません。',
			to: '/hata-side-studio',
			linkLabel: 'HataSideStudioへ',
		},
		{
			icon: 'ti ti-lock',
			preview: 'privateChannel',
			title: 'プライベートチャンネルを作れます',
			text: '管理者から許可された利用者は、メンバーだけが閲覧できるチャンネルを作れます。'
				+ '招待した相手は通知から参加するかを選び、承認して初めて参加します。管理画面では招待中・参加中・招待拒否を確認できます。',
			to: '/channels/new',
			linkLabel: 'チャンネルを作る',
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
			title: 'HatasabaUI 2（すりガラス調）',
			text: 'ノートやカラムをすりガラス調にする新しい見た目を選べるようになりました。'
				+ '透過の強さはその場で確かめながら調整できます。'
				+ 'デッキにはクリップ・お気に入りのカラム、カラムごとの再読み込みが増えています。'
				+ 'タブを左右スワイプで切り替えない設定と、Bot投稿を隠す設定にも対応しました。',
			to: '/settings/hata-custom',
			linkLabel: '設定を開く',
		},
		{
			icon: 'ti ti-flask-2',
			preview: 'beta',
			title: 'ベータ機能を試せます',
			text: 'ブラウザ内だけでC/C++を書いて実行できるプレイグラウンドと、投稿前に3・5・10秒の猶予を作れるカウントダウンを用意しました。'
				+ 'どちらも端末内で動き、投稿前カウントダウンは取り消しや今すぐ投稿も選べます。',
			to: '/hatafeed/beta',
			linkLabel: 'ベータ機能を見る',
		},
		{
			icon: 'ti ti-award',
			preview: 'profile',
			title: 'プロフィールに旗鯖の記録を表示',
			text: '自サーバーのプロフィールに、宴の成功回数・宴の阻止回数・育てた花の数を表示できるようになりました。'
				+ '自分のプロフィール設定から、項目ごとに表示を切り替えられます。',
		},
		{
			icon: 'ti ti-photo',
			preview: 'viewer',
			title: '画像ビューワーを刷新（Misskey本家由来）',
			text: 'Misskey本家の更新を取り込み、ホイールでの拡大縮小、動画をそのまま開いての再生、投稿する前のプレビューに対応しました。',
		},
		{
			icon: 'ti ti-mood-off',
			preview: 'mute',
			title: 'ミュートしたユーザーのリアクションを隠せます',
			text: 'ミュートした人が付けたリアクションを、ノートから隠せるようになりました。'
				+ '他のユーザーの投稿に付いたものも対象です。隠したものがあるノートは、詳細画面に ⓘ が出ます。'
				+ '（管理者からのリアクションは隠せません。設定はこの端末にだけ保存されます）',
			to: '/settings/hata-custom',
			linkLabel: '設定を開く',
		},
		{
			icon: 'ti ti-unlink',
			preview: 'external',
			title: '外部アカウント連携の接続先を整理',
			text: '旗池3丁目とシュリンピアへの連携を終了しました。以前この2サーバーを利用していた場合は、更新時にログイン情報と絵文字キャッシュを削除します。'
				+ '対象サーバーの投稿は、更新後はこのサーバーから閲覧できません。'
				+ '「les-requin」の表示名は「さめすきーとチョリソリング」に変更しました。',
			to: '/settings/external-account',
			linkLabel: '外部アカウント連携を確認',
		},
		{
			icon: 'ti ti-shield-check',
			preview: 'security',
			title: '安全性と土台の更新',
			text: '土台を Misskey 2026.7.0 相当へ上げ、二要素認証・URLプレビュー・OAuth まわりの修正を取り込みました。'
				+ '旗鯖独自の機能についても点検し、他の人の記録が見えてしまう不具合などを修正しています。'
				+ 'また、見られなくなったHataFeedの内容が通知へ残らないようにしました。',
		},
	],
	footer: {
		text: 'ここに載せたのは主な変更だけです。細かな修正を含むすべての変更点は、リリースノートをご確認ください。',
		linkLabel: 'リリースノートを見る',
		linkUrl: 'https://github.com/tolehata/hataskey/blob/master/HATA-CHANGELOG.md',
	},
};
