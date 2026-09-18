/* SPDX-License-Identifier: AGPL-3.0-only */
// The version remains aligned with package.json; boot records it only on close.
import type { HataskPlannerTheme } from '@/components/hatask/hatask-planner-types.js';
export type HataWhatsNewCard = { id: string; label: string; icon: string; title: string; preview?: 'favorites' | 'favorite-deck' | 'record-images' | 'record-search' | 'mood-reminder' | 'timeline' | 'registration' | 'utage'; text?: string[]; points?: string[] };
export type HataWhatsNewGroup = { label: string; title: string; cards: HataWhatsNewCard[] };
export type HataWhatsNewStory = { id: string; label: string; title: string; cards: HataWhatsNewCard[] };
export const HATA_WHATS_NEW: { version: string; groups: HataWhatsNewGroup[] } = {
	version: '2026.9.0-hata.12.7.2',
	groups: [
		{
			'label': 'お気に入り',
			'title': '残したノートを、好きなフォルダへ。',
			'cards': [
				{
					'id': 'favorite-folders',
					'label': 'フォルダで整理',
					'icon': 'ti ti-folders',
					'title': '保存先を選んで、色で見分ける。',
					'points': [
						'保存するたびに「未分類」かフォルダを選択。1つのノートを、1つの保存先に整理できます。',
						'色分けとドラッグ操作で並び替え。子フォルダへの移動や取り出しにも対応しました。',
					],
					'preview': 'favorites',
				},
				{
					'id': 'favorite-preservation',
					'label': 'ノートを残す',
					'icon': 'ti ti-folder-check',
					'title': 'フォルダを消しても、残ります。',
					'points': [
						'フォルダを削除すると、中のノートは「未分類」へ。子フォルダの中身も、お気に入りとして残ります。',
						'これまでのお気に入りも、そのまま利用できます。並び順の保存と、見出しの重複表示も修正しました。',
					],
				},
			],
		},
		{
			'label': 'お気に入り・支援特典',
			'title': 'いつもの画面で、整理を続ける。',
			'cards': [
				{
					'id': 'favorite-deck',
					'label': 'デッキUI',
					'icon': 'ti ti-layout-columns',
					'title': 'カラムの中でも、フォルダ管理。',
					'points': [
						'Hataskey UIのデッキに、お気に入り専用のカプセルタブを用意しました。',
						'フォルダの操作はカラム上部へ。並び替えボタンから、タブの順番も変更できます。',
					],
					'preview': 'favorite-deck',
				},
				{
					'id': 'favorite-support',
					'label': 'ロール・支援管理',
					'icon': 'ti ti-heart-handshake',
					'title': 'フォルダの上限を、特典にも。',
					'points': [
						'親・子の合計で通常2個、最大5個。子フォルダは既定でオフ、ロールで許可すると2階層まで使えます。',
						'支援管理にフォルダ数と子フォルダ作成を追加。参照ロールを選び、特典として案内できます。',
					],
				},
			],
		},
		{
			'label': 'Hatadyの記録',
			'title': '写真も作品も、記録のそばに。',
			'cards': [
				{
					'id': 'hatady-images',
					'label': '画像の添付',
					'icon': 'ti ti-photo',
					'title': '記録に、写真を添えられます。',
					'points': [
						'勉強・読書・映画・ゲーム・運動・作業の記録に、最大16枚の画像を添付できるようになりました。',
						'端末やドライブから選択し、編集時の追加・取り外しにも対応。記録の詳細から画像を見られます。',
					],
					'preview': 'record-images',
				},
				{
					'id': 'hatady-collection',
					'label': 'コレクション',
					'icon': 'ti ti-books',
					'title': '種類を越えて、作品を一覧に。',
					'points': [
						'「すべて」で、本・映画・ゲーム・作業の作品をまとめて表示できるようにしました。',
						'一覧を見ながら種類を選んで作品を登録。絞り込みや、作品ごとの表示も引き続き使えます。',
					],
				},
			],
		},
		{
			'label': 'Hatadyの表示と操作',
			'title': '記録のあとも、つながる表示。',
			'cards': [
				{
					'id': 'hatady-delete',
					'label': '記録・作品の削除',
					'icon': 'ti ti-trash',
					'title': '削除した内容を、すぐ一覧へ反映。',
					'points': [
						'記録や作品の削除を確認画面から行い、ホーム・プロフィール・検索結果にも反映します。',
						'読み込みが重なっても、削除済みの内容が戻って表示されないようにしました。',
					],
				},
				{
					'id': 'hatady-followup',
					'label': '検索・連続記録',
					'icon': 'ti ti-search',
					'title': '見ていた場所から、確認を続ける。',
					'points': [
						'編集・削除後も検索結果を保ちながら更新。連続記録では、開いていた期間をそのまま確認できます。',
						'読み込みに失敗したときも、表示中の内容を残して状況を案内するようにしました。',
					],
					'preview': 'record-search',
				},
			],
		},
		{
			'label': '日々の記録',
			'title': '通知も更新も、使うタイミングに。',
			'cards': [
				{
					'id': 'mood-reminder',
					'label': 'Hatask・気持ち記録',
					'icon': 'ti ti-bell',
					'title': '画面を閉じていても、お知らせ。',
					'points': [
						'設定時刻に届かなかった問題を修正。画面を閉じていても、当日の記録がなければ通知します。',
						'時刻とタイムゾーンに対応。端末へのプッシュ通知は、通知の許可・購読設定に従います。',
					],
					'preview': 'mood-reminder',
				},
				{
					'id': 'hatady-refresh',
					'label': 'Hatady・スマホ',
					'icon': 'ti ti-refresh',
					'title': '引っぱって、最新の記録へ。',
					'points': [
						'スマホで記録一覧を引き下げて更新できるようにしました。',
						'上部の操作と表示位置を見直し、記録の切り替えや絞り込みも使いやすく整えました。',
					],
				},
			],
		},
		{
			'label': 'タイムラインと連携',
			'title': '使える場所へ、迷わず移動。',
			'cards': [
				{
					'id': 'timeline-permissions',
					'label': 'タイムライン',
					'icon': 'ti ti-layout-list',
					'title': '利用できるタブを、正しく表示。',
					'points': [
						'ロールで許可されたタイムラインだけを、タブや追加メニューに表示するようにしました。',
						'Hataskey UIとデッキUIに対応。権限が変わっても、保存したカラム設定は保持します。',
					],
					'preview': 'timeline',
				},
				{
					'id': 'external-connection',
					'label': '外部連携・通知',
					'icon': 'ti ti-world',
					'title': '連携先と、通知の操作を整えました。',
					'points': [
						'外部タイムライン連携の候補に「ゆうすきー」を追加しました。',
						'通知の許可ボタンを中央に配置し、端末への通知を設定しやすくしました。',
					],
				},
			],
		},
		{
			'label': '登録受付・スタッフ向け',
			'title': '受付から審査まで、状況をそろえる。',
			'cards': [
				{
					'id': 'registration-closed',
					'label': '管理者向け',
					'icon': 'ti ti-door',
					'title': '新規登録を、一時停止できます。',
					'points': [
						'登録の完全停止を追加。申請・招待・自由登録の受付と切り替えられます。',
						'停止中の案内を表示し、再開時には停止前の受付方法へ戻せます。',
					],
					'preview': 'registration',
				},
				{
					'id': 'registration-review',
					'label': 'スタッフ向け',
					'icon': 'ti ti-users',
					'title': '全員の確認を、承認につなげる。',
					'points': [
						'スタッフ全員の賛成後、鯖缶が最終承認。反対票は保留とし、拒否も鯖缶が確定します。',
						'確認状況と対応履歴を共有。モデレーターには、申請者のメールアドレスを表示しません。',
					],
				},
			],
		},
		{
			'label': '宴',
			'title': '見えている宣言を、参加の条件に。',
			'cards': [
				{
					'id': 'utage-visibility',
					'label': '参加の判定',
					'icon': 'ti ti-confetti',
					'title': 'LTLで読める「宴」を対象に。',
					'points': [
						'ローカルの公開ノートで、開く操作をせずに見える宣言を参加対象にしました。',
						'非表示の本文やリンク先、文字を隠す装飾などに含まれる語は対象になりません。',
					],
					'preview': 'utage',
				},
				{
					'id': 'utage-edits',
					'label': '編集後の判定',
					'icon': 'ti ti-edit',
					'title': '途中で隠した宣言も、見逃さずに。',
					'points': [
						'挑戦中に編集で宣言を隠した場合は、挑戦終了として扱います。元に戻しても再開しません。',
						'成功を確定する前にも表示を確認。他の人の阻止回数には加算しません。',
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
	return HATA_WHATS_NEW.groups.flatMap(group => bodyHeight < 470
		? group.cards.map(card => ({ ...group, id: card.id, cards: [card] }))
		: [{ ...group, id: group.cards[0].id }]);
}
export function getHataWhatsNewDisplayVersion(version: string): string {
	const match = version.match(/-hata\.(\d+(?:\.\d+)+)$/);
	return match == null ? version : `hata-${match[1]}`;
}
