/* SPDX-License-Identifier: AGPL-3.0-only */
// The version remains aligned with package.json; boot records it only on close.
import type { HataskPlannerTheme } from '@/components/hatask/hatask-planner-types.js';
export type HataWhatsNewCard = { id: string; label: string; icon: string; title: string; preview?: 'notification' | 'cleanup'; text?: string[]; points?: string[] };
export type HataWhatsNewGroup = { label: string; title: string; cards: HataWhatsNewCard[] };
export type HataWhatsNewStory = { id: string; label: string; title?: string; cards?: HataWhatsNewCard[] };
export const HATA_WHATS_NEW: { version: string; groups: HataWhatsNewGroup[] } = {
	version: '2026.9.0-hata.12.7',
	groups: [
		{
			'label': 'Hataskの改善',
			'title': 'いつもの予定を、もっと自分らしく。',
			'cards': [
				{
					'id': 'hatask-appearance',
					'label': 'ホームとテーマ',
					'icon': 'ti ti-palette',
					'title': '使い慣れた配置を、好きな見た目で。',
					'points': [
						'暁の配置を各テーマへ広げ、新しい「苔」を追加。',
						'ホームのお気に入りを選び、本体テーマに合わせた明暗切り替えも。',
					],
				},
				{
					'id': 'hatask-sharing',
					'label': '予定の共有',
					'icon': 'ti ti-users',
					'title': '予定を見せる相手を、選べます。',
					'points': [
						'指定したメンバーだけで、予定・参加確認・締切のお知らせを共有。',
						'メンバーの組み合わせをテンプレートに保存。辞退した招待の表示も切り替えられます。',
					],
				},
			],
		},
		{
			'label': 'Hatadyの記録',
			'title': '残したいことを、ひとつずつ。',
			'cards': [
				{
					'id': 'hatady-records',
					'label': '記録と下書き',
					'icon': 'ti ti-pencil',
					'title': '「＋」から、順番に入力。',
					'points': [
						'勉強・読書、映画、ゲーム、運動、作業を、活動に合った項目で記録。',
						'公開範囲を選び、最後に確認。途中なら、端末に下書きを残して閉じられます。',
					],
				},
				{
					'id': 'hatady-collection',
					'label': 'コレクションと検索',
					'icon': 'ti ti-books',
					'title': '作品のそばに、これまでの記録。',
					'points': [
						'作品の詳細、感想や記録、読書のしおり・メモを見やすく整理。',
						'活動の種類や日付で絞り込み。作品や記録を検索して、続きから振り返れます。',
					],
				},
			],
		},
		{
			'label': 'Hatadyの振り返り',
			'title': '積み重ねも、つながりも。',
			'cards': [
				{
					'id': 'hatady-profile',
					'label': 'プロフィール・統計',
					'icon': 'ti ti-chart-bar',
					'title': '自分のペースが、見える画面に。',
					'points': [
						'週ごとの記録や目標、継続の様子をカードとグラフで表示。',
						'プロフィールの色や並び方、表示テーマを好みに合わせて調整できます。',
					],
				},
				{
					'id': 'hatady-conversation',
					'label': '会話・通知・書き出し',
					'icon': 'ti ti-message-circle',
					'title': '記録のまわりの操作も、ひと続きに。',
					'points': [
						'コメントやリアクション、通報の画面を整理。通知は絞り込み・削除・取り消しに対応。',
						'記録の書き出しも新しい画面に。必要な範囲や形式を選べます。',
					],
				},
			],
		},
		{
			'label': 'HataFeedの改善',
			'title': '報告から、その後の確認まで。',
			'cards': [
				{
					'id': 'hatafeed-submit',
					'label': 'イシュー・絵文字申請',
					'icon': 'ti ti-message-report',
					'title': '報告も申請も、「＋」から。',
					'points': [
						'プロジェクトを確かめ、イシューや絵文字申請を順番に作成。途中の入力は端末の下書きへ。',
						'申請の状態やスタッフのコメントはホームから確認。スタッフは未処理の申請を一件ずつ続けて審査できます。',
					],
				},
				{
					'id': 'hatafeed-navigation',
					'label': '一覧・設定・案内',
					'icon': 'ti ti-adjustments',
					'title': '探す場所と、整える場所を明確に。',
					'points': [
						'イシューの検索、ロードマップ、ベータ機能へ上のタブから移動。通知の種類も絞り込めます。',
						'テーマ・プロジェクト・書き出し・チュートリアルを設定へ整理。編集や書き出しは権限に応じて表示します。',
					],
				},
			],
		},
		{
			'label': 'Hatadint',
			'title': '描く時間を、もっと自由に。',
			'cards': [
				{
					'id': 'hatadint-tools',
					'label': 'お絵かきツール',
					'icon': 'ti ti-brush',
					'title': 'Hatadintとして、制作画面を刷新。',
					'points': [
						'ペンや鉛筆、図形、選択・変形、レイヤー、画像の追加を使いやすく整理。',
						'PC・タブレットは左右のパネル、スマホは下部の操作から。2本指で拡大・移動できます。',
					],
				},
				{
					'id': 'hatadint-save',
					'label': '作品と下書きの保存',
					'icon': 'ti ti-device-floppy',
					'title': '描いた続きを、残せます。',
					'points': [
						'端末の下書き保存・復元、PNG書き出し、ドライブ保存、投稿への添付に対応。',
						'下書きはアカウント別に保存。ドライブ保存・添付の前には、初回の利用確認を行います。',
					],
				},
			],
		},
		{
			'label': '通知と画面の操作',
			'title': 'いつもの操作も、心地よく。',
			'cards': [
				{
					'id': 'notification-refresh',
					'label': '通知',
					'icon': 'ti ti-bell',
					'title': '通知の表示方法を刷新。',
					'preview': 'notification',
					'text': [
						'Hatadyのリデザインに合わせて、通知の表示を新しく。',
						'Hataskey内のいくつかの通知表示も統合しました。',
					],
				},
				{
					'id': 'window-controls',
					'label': 'ウィンドウとナビゲーション',
					'icon': 'ti ti-app-window',
					'title': '小さな画面でも、操作しやすく。',
					'points': [
						'Hatady・HataFeedのウィンドウと操作ボタンを統一し、入力内容に合わせて高さを調整。',
						'編集中に閉じる場合は、下書きを保存・保存せず閉じる・編集に戻る、から選べます。',
					],
				},
			],
		},
		{
			'label': '使い方とサポート',
			'title': '知りたいことへ、迷わず。',
			'cards': [
				{
					'id': 'product-guides',
					'label': '機能紹介・チュートリアル',
					'icon': 'ti ti-book',
					'title': '使い方を、画面の見本と一緒に。',
					'points': [
						'HataIntroに、操作の見本・検索・詳しい機能解説をまとめました。',
						'Hatady・HataFeedの使い方や新しい画面の案内は、設定からいつでも見直せます。',
					],
				},
				{
					'id': 'hatask-support',
					'label': 'サーバー支援',
					'icon': 'ti ti-heart-handshake',
					'title': '支援の案内と、利用状況をひとつに。',
					'points': [
						'Hataskに、支援先・特典・支援者を確認できる画面を追加。',
						'管理者の確認後は、自分に適用された内容と反映状況を表示。案内や特典は管理画面から設定できます。',
					],
				},
			],
		},
		{
			'label': '案内と細かな改善',
			'title': '必要なものを、見つけやすく。',
			'cards': [
				{
					'id': 'retired-guides',
					'label': '案内の整理',
					'icon': 'ti ti-circle-check',
					'title': '役目を終えた案内を、すっきり。',
					'preview': 'cleanup',
					'text': [
						'リアクションミュートのベータ移行、Hatask v2・暁の登場案内を整理。',
						'デッキ表示、メニューの縮小・拡大、HataFeedへの初回吹き出しも削除しました。',
					],
				},
				{
					'id': 'search-polish',
					'label': '検索・管理画面',
					'icon': 'ti ti-search',
					'title': '新しい画面に合わせて、細部も改善。',
					'points': [
						'設定検索に新しい表示設定を反映。非公開チャンネルは検索結果から除外します。',
						'同意管理にHatadintの確認状況を追加し、絞り込みや検索中の表示を改善しました。',
					],
				},
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
	return [
		{ id: 'hatask', label: 'Hatask' }, { id: 'hatady', label: 'Hatady' }, { id: 'hatafeed', label: 'HataFeed' },
		{ id: 'hataintro', label: 'HataIntro' },
		...HATA_WHATS_NEW.groups.flatMap(group => bodyHeight < 470
			? group.cards.map(card => ({ ...group, id: card.id, cards: [card] }))
			: [{ ...group, id: group.cards[0].id }]),
	];
}
export function getHataWhatsNewDisplayVersion(version: string): string {
	const match = version.match(/-hata\.(\d+(?:\.\d+)+)$/);
	return match == null ? version : `hata-${match[1]}`;
}
