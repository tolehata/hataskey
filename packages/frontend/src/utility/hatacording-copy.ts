/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * HataSNSCordUI の案内文と実績IDを一か所で変更できるようにする。
 */

export const HATACORDING_TUTORIAL_ACHIEVEMENT_ID = 'hatacordingUiTutorial' as const;

export const HATACORDING_TUTORIAL_COPY = {
	title: 'HataSNSCordUIへようこそ',
	lead: '高機能だけど、会話アプリのように馴染みやすいHataskey用UIです。',
	steps: [
		{
			title: '会話のように流れるタイムライン',
			body: '新しい投稿は下へ滑らかに追加されます。自分の投稿は右、ほかの人の投稿は左に並び、通常のリアクションや投稿操作もそのまま使えます。',
		},
		{
			title: '左ペインから表示を選ぶ',
			body: 'ホーム・ローカル・ソーシャルのほか、リスト、アンテナ、チャンネルを選べます。タイムライン横の＋を押すと、中央を変えず右ペインにも追加できます。',
		},
		{
			title: '設定と並び替えは左上から',
			body: '左上の調整ボタンに、リアルタイム更新、UIカラー、表示サイズなど必要な設定をまとめています。「メニューを編集」では、ピン留め、上下移動、表示の出し入れをこの端末だけに保存できます。',
		},
		{
			title: '右ペインを作業スペースに',
			body: '投稿詳細、検索、通知、タイムライン、ウィジェットをタブで並べられます。タブ数と、このUIを使えるかどうかはサーバーのロール設定に従います。',
		},
		{
			title: 'このUI専用のレートリミット',
			body: '右上の円は、このUIから行ったAPI操作の残り目安です。円を押すと残量と復活時刻を確認できます。通常のUIや連合処理には影響しません。',
		},
	],
} as const;
