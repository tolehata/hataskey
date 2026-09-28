/* SPDX-License-Identifier: AGPL-3.0-only */
// The version remains aligned with package.json; boot records it only on close.
import type { HataskPlannerTheme } from '@/components/hatask/hatask-planner-types.js';
export type HataWhatsNewCard = { id: string; label: string; icon: string; title: string; preview?: 'note-actions' | 'emoji-changes'; text?: string[]; points?: string[]; link?: { label: string; url: string } };
export type HataWhatsNewGroup = { label: string; title: string; feature?: 'ui-s' | 'ui-s-2' | 'recipes' | 'flowers'; scene?: 0 | 1 | 2 | 3; cards: HataWhatsNewCard[] };
export type HataWhatsNewStory = HataWhatsNewGroup & { id: string };
export const HATA_WHATS_NEW: { version: string; groups: HataWhatsNewGroup[] } = {
	version: '2026.9.1-hata.12.8.1',
	groups: [
		{
			label: 'Hataskey UI S 2', title: 'どの画面でも、続いていく。', feature: 'ui-s-2', scene: 0, cards: [
				{ id: 'ui-s-layout', label: '新しいUI', icon: 'ti ti-layout-dashboard', title: 'PCもスマホも、いつもの場所から。', points: [
					'Hataskey UI S 2を公開。PCでもモバイルでも、タイムラインを見ながら次の操作へ進めます。',
					'PCには広い作業空間、スマホには浮いたガラスの下部ナビを用意しました。',
				] },
				{ id: 'ui-s-hatask', label: '今日のHatask', icon: 'ti ti-calendar-check', title: '今日の予定と記録を、すぐそばに。', points: [
					'PCの右側に今日のHataskを表示。予定、ToDo、ごはん・気持ち・おはなの記録を確認できます。',
					'広い画面ではデッキ表示にも切り替えられます。',
				] },
			],
		},
		{ label: 'PCで並べる', title: '並べて見て、そのまま集中。', feature: 'ui-s-2', scene: 1, cards: [
			{ id: 'ui-s-split', label: 'PCの分割画面', icon: 'ti ti-layout-columns', title: 'ページとタイムラインを、並べて。', points: [
					'Hataskey UI Sの標準表示では、左メニューから開いたページを左に、タイムラインを右に表示できます。',
				'広げる・閉じる操作の間も、書きかけの投稿とタイムラインの位置を保ちます。',
			] },
		] },
		{ label: '指先で選ぶ', title: '指を置いて、行き先を選ぶ。', feature: 'ui-s-2', scene: 2, cards: [
			{ id: 'ui-s-mobile-dock', label: 'モバイルのドック', icon: 'ti ti-hand-finger', title: '長押しから、タイムラインへ。', points: [
				'ホームを長押しして一覧を開き、指を滑らせた先で離すと切り替わります。',
				'リスト・アンテナも選べます。ホームのタップなら表示中のタイムラインの上部へ戻ります。',
			] },
		] },
		{ label: '探す・書く', title: '探すのも、書くのも。ここから。', feature: 'ui-s-2', scene: 3, cards: [
			{ id: 'ui-s-search', label: 'その場で検索', icon: 'ti ti-search', title: 'いつもの画面のまま、探せる。', points: [
				'下部ナビから検索欄と結果を開けます。閉じても検索語・結果・投稿下書きを保持します。',
				'公開範囲・絵文字・添付などのメニューも投稿欄にまとまりました。',
			] },
		] },
		{
			label: 'レシピと料理', title: '紹介して、作って、記録する。', feature: 'recipes', cards: [
				{ id: 'recipes', label: 'レシピ', icon: 'ti ti-chef-hat', title: '材料も手順も、ひとつに。', points: [
					'材料・手順・写真と人数別の分量をまとめて保存。下書き、検索、カテゴリとタグにも対応しました。',
					'レシピの公開範囲は非公開・フォロワー・指定メンバーから選べます。誰でも見られる公開設定はありません。',
					'参考サイトは最大10件まで保存でき、詳細画面から開けます。',
				] },
				{ id: 'cooking-records', label: '料理の記録', icon: 'ti ti-notebook', title: '作りながら、記録につなげる。', points: [
					'人数に合わせて分量を換算し、工程のタイマーを使えます。作った内容はHatadyの料理記録へつなげられます。',
					'料理記録には公開設定があります。料理記録を指定メンバー向けにした場合、Hatady側では非公開になります。',
				] },
			],
		},
		{
			label: 'お花', title: '日々をためて、花を咲かせる。', feature: 'flowers', cards: [
				{ id: 'flower-care', label: 'しずくと育成', icon: 'ti ti-droplet', title: '毎日のひとつが、一輪につながる。', points: [
					'ToDoの完了、Hatadyの新しい記録、ログインで、条件に応じてしずくが届きます。1日に受け取れる数には上限があります。',
					'しずくを自分の花に注いで、開花を早められます。水をあげなくても時間で育ち、枯れません。',
				] },
				{ id: 'flower-collection', label: '図鑑と花まつり', icon: 'ti ti-flower', title: '集める楽しみを、みんなとも。', points: [
					'咲いた花には名前をつけ、育てている間に終えたToDoを思い出として残せます。季節ごとの12種の図鑑を集め、8種そろうと次の季節の種を受け取れます。',
					'みんなの花壇にもしずくを注げます。花まつりの満開時は表示が更新され、参加者全員に月見草の種が届きます。',
				] },
			],
		},
		{
			label: '設定とUIの移行', title: '使いやすい配置へ、迷わず。', cards: [
				{ id: 'ui-s-settings', label: '表示のカスタマイズ', icon: 'ti ti-adjustments', title: 'よく使う操作を、手の届く位置に。', points: [
					'投稿欄のショートカット2枠、絵文字ボタンの位置、操作欄の上下を調整できます。',
					'スマホの下部ナビは最大6枠。並び順と表示項目をUI S専用設定で選べます。',
					'設定検索とHataSideStudioから、使いたい設定を見つけやすくしました。',
				] },
				{ id: 'legacy-ui-migration', label: '旧UIの終了', icon: 'ti ti-layout-sidebar', title: 'これまでのノートは、そのまま。', points: [
					'HataSNSCordUIの提供を終了し、利用中の方はHataskey UI S 2へ移行します。投稿したノートは維持されます。',
					'旧UIだけの画面設定と一時保存した表示状態は引き継ぎません。新しいUIで改めて設定できます。',
				] },
			],
		},
		{
			label: '設定と登録', title: '自分に合わせて、安心して始める。', cards: [
				{ id: 'ui-s-rss', label: 'RSS', icon: 'ti ti-rss', title: '気になる更新を、いつもの画面に。', points: [
					'UI S専用のRSS設定から、フィードを最大5つ登録できます。名前・色・並び順も変えられます。',
					'自動切替や表示間隔、全文・要約の表示を選び、旧デッキの設定を取り込めます。RSSの設定は端末ごとに保存します。',
				] },
				{ id: 'registration-guidance', label: '登録の案内', icon: 'ti ti-user-check', title: 'ルールを確かめて、参加へ。', points: [
					'登録申請の前に、サーバールール・利用規約・プライバシーの説明を順に確認し、同意して進められます。',
					'メール送信が有効なサーバーでは、申請見送りの案内をメールで受け取れます。CAPTCHAの読み込みに失敗したときは、再試行できます。',
				] },
			],
		},
		{
			label: '読みやすさと通知', title: '操作の完了を、自然に伝える。', cards: [
				{ id: 'note-actions', label: 'ノート操作の案内', icon: 'ti ti-circle-check', title: 'ノートの操作を、上部ナビバーで。', points: [
					'通常のHataskey UIで、お気に入り・クリップへの追加と、ノートの編集・削除の完了をアニメーション付きでお知らせします。',
					'保存先も示し、一連の表示は3秒間。閉じる途中に絵が戻る残像も修正しました。',
				], preview: 'note-actions' },
				{ id: 'line-seed', label: '既定フォント', icon: 'ti ti-typography', title: '読みやすい文字を、初期設定に。', points: [
					'LINE Seed JPを既定のフォントにしました。',
					'従来の既定フォントを使っていた方に適用し、別のフォントを選んだ設定は保ちます。',
				] },
			],
		},
		{
			label: 'サウンド', title: 'いつもの操作に、新しい音を。', cards: [
				{ id: 'hataskey-sounds', label: '新しい既定音', icon: 'ti ti-music', title: '木琴調の「こもれび」。', points: [
					'新着ノート・投稿・予約登録・編集・通知・リアクション・チャットの7種類を、柔らかな「こもれび」へ刷新しました。',
					'新着ノートと通知は落ち着いた響きに、リアクションは短い音にしています。',
				] },
				{ id: 'sound-preferences', label: '音の設定', icon: 'ti ti-volume', title: '好みの音と音量を、そのまま。', points: [
					'音源の設定名は変えず、選択済みの音や音量を保ちます。',
					'更新後も古い音が残らないようにしました。音の設定から好みに合わせて選べます。',
				] },
			],
		},
		{
			label: 'HataFeed', title: '絵文字の変更も、声の行方も。', cards: [
				{ id: 'emoji-changes', label: '絵文字の変更申請', icon: 'ti ti-mood-edit', title: '使っている絵文字も、更新できます。', points: [
					'自分が申請して承認された絵文字の画像更新や取り下げを申請し、審査結果を確認できます。',
					'審査中・保留中の新規追加申請は取り消せますが、取り消しても申請枠は戻りません。',
				], preview: 'emoji-changes' },
				{ id: 'feedback-overview', label: '報告の一覧', icon: 'ti ti-list-search', title: '届いた声の状況を、見渡せます。', points: [
					'イシューの状態別件数を表示し、検索結果と合わせて確認できます。',
					'絵文字変更の審査履歴や通知も、HataFeedから追いやすくしました。',
				] },
			],
		},
		{
			label: '宴', title: 'もう一度、応援をつなぐ。', cards: [
				{ id: 'utage-revival', label: '復活のチャンス', icon: 'ti ti-sparkles', title: '失敗のあとにも、応援で再挑戦。', points: [
					'ほかの人の反応で宴に失敗したとき、一定の確率で復活のチャンスが生まれます。',
					'新しい応援が目標に届くと、宴の復活成功が確定します。',
				] },
				{ id: 'utage-status', label: '参加状況', icon: 'ti ti-users', title: '残り時間と応援を、見やすく。', points: [
					'残り時間、応援の数、成功・失敗の結果を画面に表示します。',
					'作者や、すでに反応した人など、応援できない場合も分かるようにしました。',
					'通常UIでは挑戦中の宴が優しく明滅し、結果を薄い色で示します。',
				] },
			],
		},
		{
			label: 'Hatask', title: '毎日の記録を、その日のまま。', cards: [
				{ id: 'mood-timezone', label: 'リマインダーの時間帯', icon: 'ti ti-clock', title: '気持ち記録の通知を、自分の時間に。', points: [
					'気持ち記録を促す通知の時間帯を、朝8時・昼12時・夜20時・寝る前23時から選べます。保存したタイムゾーンも確認できます。',
					'端末のタイムゾーンが変わっても通知の設定は自動で書き換えず、必要なときに切り替えられます。',
				] },
				{ id: 'hatask-display', label: 'スマホの表示', icon: 'ti ti-device-mobile', title: 'ナビバーと背景を整えました。', points: [
					'スマホの上部通知に合わせたナビバーの伸縮と、アイコンの配置を調整しました。',
					'Hataskと本体で異なるテーマを選んだとき、アプリの背景が薄黒く見える問題を修正しました。',
				] },
			],
		},
		{
			label: '日常の操作', title: '入力とタイムラインを、分かりやすく。', cards: [
				{ id: 'hatady-forms', label: '入力の案内', icon: 'ti ti-pencil', title: '直す場所が、すぐ分かる。', points: [
					'Hatadyで入力に問題がある場合、該当するページと欄へ案内します。',
					'作品メモに入力できる文字数の上限も、画面に表示します。',
				] },
				{ id: 'timeline-display', label: 'タイムライン', icon: 'ti ti-layout-list', title: '新着の人と画面を、見やすく。', points: [
					'通常UIとUI Sの新着ノートの案内に、最大3人のアバター・デコレーションと投稿者の情報を表示します。',
					'背景の表示設定が別の画面へ漏れる問題と、ノート削除時に周囲のノートが一瞬跳ねる問題を修正しました。',
				] },
				{ id: 'note-appearance', label: 'ノートと上部ナビ', icon: 'ti ti-photo', title: '画像も、読み込みの合図も。', points: [
					'UI Sでは添付画像の縁色をノートの背景へ柔らかく映します。隠した画像は対象にしません。',
					'上部ナビの透明感と、引っ張って更新するときの表示を整えました。iOSの読み込み線も画面上部に合わせます。',
					'通常のHataskey UIでは、読み込み表示を上部ナビの縁へまとめました。',
				] },
			],
		},
		{
			label: '12.8.1の修正', title: 'いつもの操作を、より使いやすく。', cards: [
				{ id: 'ui-s-fixes', label: 'UI Sの修正', icon: 'ti ti-message-circle', title: '返信の操作と、新着のお知らせを。', points: [
					'スレッドの返信を通常のノートと同じように操作でき、リアクションのミュート・非表示も件数に反映します。',
					'本文のカスタム絵文字を押してリアクションできます。ノートのソース表示と猫の変換解除も使えます。',
					'新着音が音の設定に従って鳴るよう修正しました。自分の投稿とほかの人の新着を区別し、同じノートで音が重複して鳴ることを防ぎます。',
				] },
				{ id: 'daily-fixes', label: '入力と案内の修正', icon: 'ti ti-pencil', title: '時間も案内も、自然に。', points: [
					'Hatadyの運動時間は任意入力になり、未入力でも記録でき、保存済みの時間も消せます。しずく入手方法の補助ボタンも整えました。',
					'登録再申請の注意文の不自然な改行を修正し、ログイン画面のサーバー紹介を全文表示するようにしました。',
				] },
			],
		},
		{
			label: '本体の改善', title: '安心して使える土台へ。', cards: [
				{ id: 'upstream-update', label: '本体の更新', icon: 'ti ti-refresh', title: 'Misskey 2026.9.1の改善を反映。', points: [
					'Misskey 2026.9.1の修正を取り込み、安全性と表示の安定性を改善しました。',
					'本家の変更内容の詳細は、Misskey公式リリースノートを参照してください。',
				], link: { label: 'Misskey公式リリースノート（2026.9.1）', url: 'https://github.com/misskey-dev/misskey/releases/tag/2026.9.1' } },
				{ id: 'script-errors', label: 'スクリプト', icon: 'ti ti-code', title: 'エラーの原因を、見つけやすく。', points: [
					'AiScriptの非同期処理で起きたエラーも、画面で確認できるようにしました。',
					'スクラッチパッドでは、エラーを赤い文字で出力して残します。',
				] },
			],
		},
		{
			label: 'UI Sの投稿と下書き', title: '書きかけを、安心して続ける。', cards: [
				{ id: 'composer-drafts', label: '投稿フォーム', icon: 'ti ti-pencil-plus', title: '書きかけの続きから。', points: [
					'画像やファイルの貼り付け添付に対応。アップロード中は完了を待って投稿します。',
					'Fullフォームへ投票・イベントなども引き継ぎ、キャンセルや送信失敗時は元の入力を保ちます。',
					'UI Sの下書きは自動保存し、アカウントとデッキの列ごとに復元できます。',
				] },
				{ id: 'note-menu', label: 'ノートの操作', icon: 'ti ti-dots', title: 'いつもの操作を、一か所に。', points: [
					'UI Sでは削除・削除して編集・リノート解除を、投稿フォームの中で確認できます。',
					'返信・引用の表示と解除も整え、引用を解除しても本文や添付を保持します。',
				] },
			],
		},
		{
			label: 'タイムラインの操作', title: '流れを止めずに、楽しめる。', cards: [
				{ id: 'timeline-swipe', label: 'タブの切り替え', icon: 'ti ti-arrows-horizontal', title: '左右に滑らせて、次のタブへ。', points: [
					'通常UIとUI Sのタイムラインは、タッチやトラックパッドの横操作で切り替えられます。',
					'スワイプ設定は端末ごと。通常UIのウィジェットバーのちらつきも抑えました。',
				] },
				{ id: 'ltl-punch', label: 'LTLパンチ', icon: 'ti ti-hand-rock', title: 'ローカルタイムラインで、みんなと一緒に。', points: [
					'チャンネル外のローカル公開投稿に、同じ拳の絵文字を3つ続けると参加できます。',
					'拳の体力や攻撃予告をタイムラインに表示し、勝利・敗北の実績も追加しました。',
				] },
		],
		},
	] satisfies HataWhatsNewGroup[],
};
export const HATA_WHATS_NEW_THEMES: { id: HataskPlannerTheme; name: string; description: string }[] = [
	{
		'id': 'akatsuki',
		'name': '暁',
		'description': '朝焼けのグラデーションと、軽やかな3ペイン',
	},
	{
		'id': 'koke',
		'name': '苔',
		'description': '苔の緑と、やわらかな光',
	},
	{
		'id': 'kisetsu',
		'name': '季',
		'description': '生成りの紙、明朝、静かな罫線',
	},
	{
		'id': 'kashin',
		'name': '花信',
		'description': '丸い輪郭、コーラルと黄の差し色',
	},
	{
		'id': 'suri',
		'name': '刷',
		'description': '紙とインク、青とピンク、くっきりした輪郭',
	},
	{
		'id': 'hatakyu',
		'name': 'ハタキュ',
		'description': 'ハタキュのイラスト、コルク、クリーム色の紙',
	},
];
export function getHataWhatsNewStories(bodyHeight: number): HataWhatsNewStory[] {
	return HATA_WHATS_NEW.groups.flatMap(group => !group.feature && bodyHeight < 470
		? group.cards.map(card => ({ ...group, id: card.id, cards: [card] }))
		: [{ ...group, id: group.cards[0].id }]);
}
export function getHataWhatsNewDisplayVersion(version: string): string {
	const match = version.match(/-hata\.(\d+(?:\.\d+)+)$/);
	return match == null ? version : `hata-${match[1]}`;
}
