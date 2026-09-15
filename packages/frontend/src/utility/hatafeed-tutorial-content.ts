/* SPDX-License-Identifier: AGPL-3.0-only */
import type { HyTutorialPage } from '@/utility/hy-tutorial.js';

export type HataFeedTutorialKind = 'initial' | 'update';

const settings: HyTutorialPage = {
	id: 'settings', label: '設定', icon: 'ti ti-settings', title: '使い方は、設定からいつでも',
	description: '右上の歯車から、テーマや背景を変更できます',
	note: 'この案内も、設定の「チュートリアル」から見直せます',
	figure: 'HataFeedの設定。テーマ、プロジェクト、チュートリアルの入口が並ぶ見本',
};
const admin: HyTutorialPage = {
	id: 'admin', label: '申請管理', icon: 'ti ti-mood-cog', title: '申請を、一件ずつ確認',
	description: '「申請管理」では、画像やライセンスを確認して承認・保留・リジェクトを選びます',
	note: '「未処理を連続確認」から、次の申請へ進めます',
	figure: 'スタッフ向けの申請管理。未処理の申請を選び、保留、リジェクト、承認を選ぶ見本',
};
const initial: readonly HyTutorialPage[] = [
	{
		id: 'home', label: 'ホーム', icon: 'ti ti-home', title: '不具合の報告や、機能の要望に',
		description: 'HataFeedでは、不具合や要望をイシューとして投稿できます',
		note: 'ホームには、改善予定や自分の絵文字申請の状況がまとまっています',
		figure: 'HataFeedのホーム。改善予定、自分の絵文字申請、最近の動きとイシューが並ぶ見本',
	},
	{
		id: 'create', label: '報告・申請', icon: 'ti ti-plus', title: '作成は、上の「＋」から',
		description: '「＋」を押すと、絵文字申請とイシュー作成を選べます',
		note: '隣のプロジェクトを確認してから、報告先を選びましょう',
		figure: '上部のプラスを開いたメニュー。絵文字申請と新規イシューが並び、隣にプロジェクトがある見本',
	},
	{
		id: 'issues', label: 'イシュー', icon: 'ti ti-clipboard-list', title: '同じ報告があるか、探してみよう',
		description: '「イシュー」で検索すると、投稿や会話を探せます',
		note: '既にある報告にはコメントを追加できます\n詳細から一覧へは「←」で戻れます',
		figure: 'イシュー一覧の検索と詳細の見本。検索欄、対応状況、コメントと一覧に戻る矢印がある',
	},
	{
		id: 'emoji', label: '絵文字申請', icon: 'ti ti-mood-plus', title: '使いたい絵文字を申請',
		description: '自分の画像か、ほかのサーバーの絵文字を選び、名前やライセンスを入力します',
		note: '結果とスタッフからのコメントは、ホームの申請履歴で確認できます',
		figure: '絵文字申請の見本。自分の画像とリモート絵文字の入口、名前とライセンス、申請状況がある',
	},
	{
		id: 'roadmap', label: '改善予定とベータ', icon: 'ti ti-route', title: 'これからの予定も、ここで',
		description: '「ロードマップ」には、修正や改善の予定が並びます',
		note: '試験中の機能は「ベータ」タブから使えます',
		figure: 'ロードマップの改善予定と、ベータ機能へのタブの見本',
	},
	settings,
];
const update: readonly HyTutorialPage[] = [
	{
		id: 'home', label: '新しいホーム', icon: 'ti ti-home', title: '状況をまとめて\n見られるホームに',
		description: '改善予定、絵文字申請、最近の動きがホームにまとまりました',
		note: 'イシューの全件表示や検索は、上の「イシュー」タブへ',
		figure: '刷新されたHataFeedのホーム。概要のカードと上部のタブで画面を切り替える見本',
	},
	{
		id: 'create', label: '作成と下書き', icon: 'ti ti-plus', title: '作成ボタンは「＋」にまとまりました',
		description: '「＋」から、イシュー作成と絵文字申請を選びます\n隣のプロジェクトは、全タブ共通です',
		note: '入力途中で閉じるときは、端末に下書きを残すか選べます',
		figure: 'プラスの作成メニューと下書き保存確認の見本。保存して閉じる、保存せず閉じる、編集に戻るを選べる',
	},
	{
		id: 'notifications', label: '通知', icon: 'ti ti-bell', title: '通知と操作の結果は、上部に',
		description: 'HataFeedの通知一覧はベルから開きます\n既読ボタンの隣で、種類を絞り込めます',
		note: '保存や更新の結果は、上部のナビバーに表示されます',
		figure: '上部ナビバーの更新メッセージとHataFeedの通知一覧。既読とフィルターボタンが隣り合う見本',
	},
	{
		id: 'emoji', label: '絵文字申請', icon: 'ti ti-mood-plus', title: '申請の結果は、ホームから',
		description: '「あなたの絵文字申請」から、申請の状態やスタッフのコメントを確認できます',
		note: '新しい申請は「＋」へ\n画像の選択から、順番に進めます',
		figure: '新しい絵文字申請画面と、ホームに表示された申請履歴の見本',
	},
	{
		...settings, title: 'テーマも、プロジェクトも設定へ',
		description: '設定は、右上の歯車から開きます\nテーマ、プロジェクトの編集、エクスポートをここにまとめました',
		note: '編集やエクスポートは、権限がある場合に表示されます\nチュートリアルもここから見直せます',
	},
];

export function getHataFeedTutorialPages(kind: HataFeedTutorialKind, isStaff = false): readonly HyTutorialPage[] {
	const pages = kind === 'update' ? update : initial;
	return isStaff ? [...pages.slice(0, -1), admin, pages[pages.length - 1]] : pages;
}
