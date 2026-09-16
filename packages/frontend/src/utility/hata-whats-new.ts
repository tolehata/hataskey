/* SPDX-License-Identifier: AGPL-3.0-only */
// The version remains aligned with package.json; boot records it only on close.
import type { HataskPlannerTheme } from '@/components/hatask/hatask-planner-types.js';
export type HataWhatsNewCard = { id: string; label: string; icon: string; title: string; preview?: 'vote-setting' | 'environment' | 'viewport' | 'intro-back' | 'deck'; text?: string[]; points?: string[] };
export type HataWhatsNewGroup = { label: string; title: string; cards: HataWhatsNewCard[] };
export type HataWhatsNewStory = { id: string; label: string; title: string; cards: HataWhatsNewCard[] };
export const HATA_WHATS_NEW: { version: string; groups: HataWhatsNewGroup[] } = {
	version: '2026.9.0-hata.12.7.1',
	groups: [
		{
			'label': '絵文字投票',
			'title': '投票の表示を、自分のペースで。',
			'cards': [
				{
					'id': 'vote-display',
					'label': '表示の設定',
					'icon': 'ti ti-adjustments',
					'title': '絵文字投票の表示を選べます。',
					'preview': 'vote-setting',
					'points': [
						'環境設定の「タイムライン」から、LTLの絵文字投票をオン・オフに。',
						'オフにすると、Hataskey UIとデッキUIで投票の画面や演出を表示しません。',
					],
				},
				{
					'id': 'vote-state',
					'label': '表示と終了',
					'icon': 'ti ti-mood-smile',
					'title': '参加から、結果を閉じるまで。',
					'points': [
						'Hataskey UIの上部ナビバーで、進行中の投票を確認できるようにしました。',
						'投票候補と終了時の状態管理を見直し、辞退・結果を閉じたあとの表示を修正しました。',
					],
				},
			],
		},
		{
			'label': 'HataFeed',
			'title': '状況を伝えて、改善につなげる。',
			'cards': [
				{
					'id': 'report-environment',
					'label': '不具合の報告',
					'icon': 'ti ti-device-mobile',
					'title': '使っていた環境も、一緒に。',
					'preview': 'environment',
					'points': [
						'イシュー作成に、使用端末・OSとバージョン・ブラウザや開き方の入力欄を追加。',
						'入力は任意。確認画面と下書きにも引き継がれ、報告の説明にまとめて送られます。',
					],
				},
				{
					'id': 'roadmap-create',
					'label': 'スタッフ向け',
					'icon': 'ti ti-route',
					'title': '改善予定を、その場で追加。',
					'points': [
						'ロードマップの「改善予定を追加」を見つけやすくしました。',
						'予定があるときも、上部の操作から追加できます。',
					],
				},
			],
		},
		{
			'label': '画面の表示と操作',
			'title': '画面の端まで、操作しやすく。',
			'cards': [
				{
					'id': 'mobile-viewport',
					'label': 'iPhone・iPad',
					'icon': 'ti ti-device-ipad',
					'title': '上部バーと画面の端に、ゆとりを。',
					'preview': 'viewport',
					'points': [
						'上端の表示領域を調整し、ナビバーやページの位置を見直しました。',
						'メニュー・小窓・画像ビューアも、画面の表示領域に合わせて配置します。',
					],
				},
				{
					'id': 'dialog-close',
					'label': 'ダイアログ',
					'icon': 'ti ti-app-window',
					'title': '閉じたあとも、そのまま操作。',
					'points': [
						'ダイアログを閉じたあと、背面の画面を操作できなくなる問題を修正。',
						'ページ移動や小窓を閉じるときの後片付けも見直しました。',
						'タイムライン上部とシンプルUIの投稿欄では、表示時の自動フォーカスを止めました。',
					],
				},
			],
		},
		{
			'label': '戻る・編集の操作',
			'title': '必要な操作を、すぐそばに。',
			'cards': [
				{
					'id': 'intro-back',
					'label': 'HataIntro',
					'icon': 'ti ti-arrow-left',
					'title': '左上の矢印で、戻れます。',
					'preview': 'intro-back',
					'points': [
						'ガイド内では前のページへ。目次では元の画面へ戻るか、小窓を閉じられます。',
						'ガイド内の検索条件や選んだ項目も復元。戻る画面がないときはホームへ移動します。',
					],
				},
				{
					'id': 'deck-widgets',
					'label': 'デッキUI',
					'icon': 'ti ti-layout-columns',
					'title': 'ウィジェットを、すっきり配置。',
					'preview': 'deck',
					'points': [
						'重複していた編集ボタンと、その余白を取り除きました。',
						'編集はカラムのメニューから。通常デッキとHataskey UI内のデッキに適用しています。',
					],
				},
			],
		},
		{
			'label': 'Hatask・Hatady',
			'title': '日々の操作を、ひとつずつ改善。',
			'cards': [
				{
					'id': 'hatask-input',
					'label': 'Hatask',
					'icon': 'ti ti-calendar',
					'title': '公開範囲も、入力欄も見やすく。',
					'points': [
						'公開範囲メニューの位置と、メンバー選択画面の重なりを修正。',
						'クイック入力のフォーカス枠を内側に収め、端で切れないようにしました。',
					],
				},
				{
					'id': 'hatady-motion',
					'label': 'Hatady',
					'icon': 'ti ti-book',
					'title': '一覧とページ切り替えを見直し。',
					'points': [
						'一覧の表示とページ切り替えの描画処理を見直しました。',
						'ページをめくる演出を保ちながら、画面外の項目などの処理を抑えています。',
						'通知は画面を開いて表示できたあとに既読になります。',
					],
				},
			],
		},
		{
			'label': 'スタッフ向けの記録確認',
			'title': '記録を確認し、対応状況を共有。',
			'cards': [
				{
					'id': 'hatady-moderation',
					'label': 'Hatady・スタッフ向け',
					'icon': 'ti ti-shield',
					'title': '記録やコメントを、管理画面から。',
					'points': [
						'管理者・モデレーターが記録や作品を検索し、確認状態とスタッフ用メモを共有できます。',
						'非公開記録、本人用のしおり・内容メモもスタッフの確認対象です。',
					],
				},
				{
					'id': 'hatask-record-review',
					'label': 'Hatask・スタッフ向け',
					'icon': 'ti ti-shield-search',
					'title': '予定や日々の記録を、まとめて確認。',
					'points': [
						'管理者・モデレーター向けに「記録確認」を追加。非公開・指定メンバー向けの記録も確認できます。',
						'元の記録を変えずに確認状態を共有し、内容が変わった記録は未確認に戻します。',
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
