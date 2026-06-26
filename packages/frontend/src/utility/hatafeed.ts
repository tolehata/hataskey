/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 * 旗鯖fork: HataFeed 共通のラベル定義とヘルパー(カテゴリ/ステータス/通知アイコン)。
 */

// 旗鯖fork: 現在試せるベータ機能の一覧。ベータページのカードと、ベータボタンのバッジ数の両方で使う。
//   ここに追加するだけで「ベータ機能を試す」ボタンのバッジ数とページ内容が同期する。
export interface HataBetaFeature {
	id: string;
	title: string;
	desc: string;
	icon: string;
	route: string;
}
export const hataBetaFeatures: HataBetaFeature[] = [
	{
		id: 'cpp-playground',
		title: 'C/C++ プレイグラウンド',
		desc: 'ブラウザ内だけで C/C++ を書いて実行できる遊び場（サーバーに送られません）。',
		icon: 'ti ti-code',
		route: '/playground/cpp',
	},
];

// 旗鯖fork: トグル式(ページではなくスイッチで切り替える)のベータ機能。
//   ベータページのスイッチと、ベータボタンのバッジ数の両方で数える。
export const hataBetaToggleFeatures = [
	{ id: 'mute-reactions', title: 'ミュートユーザーのリアクション非表示' },
];

// 旗鯖fork: 現在試せるベータ機能の総数(カード＋トグル)。ベータボタンのバッジに使う。
export const hataBetaTotal = hataBetaFeatures.length + hataBetaToggleFeatures.length;

// カテゴリ(7種)。
export const categoryLabel: Record<string, string> = {
	bug: '不具合',
	improvement: '改善予定',
	unresolved: '未解決',
	featureRequest: '機能要望',
	adoptionRequest: '取入要望',
	security: 'セキュリティ対応',
	betaFeature: 'ベータ機能',
	other: 'その他',
};
export const categoryKeys = ['bug', 'improvement', 'unresolved', 'featureRequest', 'adoptionRequest', 'security', 'betaFeature', 'other'];

// ユーザーがイシュー作成時に選べるカテゴリ。
// 「改善予定(improvement)」は管理者が掲示するロードマップ専用なので、作成ウィザードからは除外する。
export const creatableCategoryKeys = ['bug', 'unresolved', 'featureRequest', 'adoptionRequest', 'security', 'betaFeature', 'other'];

// 旗鯖fork: スタッフ(管理者/モデ)専用カテゴリ。一般ユーザーには作成ウィザード・絞り込みから隠す。
// security はセキュリティ対応の内部限定扱い(閲覧・作成ともスタッフのみ)。
export const staffOnlyCategoryKeys = ['security'];

// カテゴリの説明(ウィザードで選びやすくするため)。
export const categoryDesc: Record<string, string> = {
	bug: '動作がおかしい・エラーが出る等の不具合報告',
	improvement: 'すでに改善が予定されている事柄',
	unresolved: '原因不明・未解決の事象',
	featureRequest: 'こんな機能がほしい、という要望',
	adoptionRequest: '本家などの機能を旗鯖にも取り入れてほしい要望',
	security: 'セキュリティに関わる報告(取り扱い注意)',
	betaFeature: 'ベータ機能で起きた不具合・要望',
	other: 'どれにも当てはまらないもの',
};
export const categoryIcon: Record<string, string> = {
	bug: 'ti ti-bug',
	improvement: 'ti ti-arrow-up-circle',
	unresolved: 'ti ti-help-circle',
	featureRequest: 'ti ti-bulb',
	adoptionRequest: 'ti ti-download',
	security: 'ti ti-shield-lock',
	betaFeature: 'ti ti-flask',
	other: 'ti ti-dots',
};

// ステータス(6種)。
export const statusLabel: Record<string, string> = {
	open: '受付中',
	planned: '対応予定',
	inProgress: '対応中',
	resolved: '解決済み',
	wontfix: '見送り',
	unknown: '用途不明',
	closed: '受付終了',
};
export const statusKeys = ['open', 'planned', 'inProgress', 'resolved', 'wontfix', 'unknown', 'closed'];

export const priorityLabel: Record<string, string> = {
	low: '低',
	normal: '通常',
	high: '高',
};

export const emojiStatusLabel: Record<string, string> = {
	pending: '未処理',
	approved: '承認済み',
	rejected: 'リジェクト',
};

// 絵文字申請の状態アイコン(承認=✓ / 審査中=時計 / 却下=🚫)。
export const emojiStatusIcon: Record<string, string> = {
	pending: 'ti-clock-hour-4',
	approved: 'ti-circle-check',
	rejected: 'ti-ban',
};

// 通知タイプ → 日本語ラベル(ホーム通知フィルタ用)。
export const notifTypeLabel: Record<string, string> = {
	newComment: 'コメント',
	issueStatusChanged: 'ステータス変更',
	issueClosed: 'クローズ',
	issueReopened: '再オープン',
	issueResolved: '解決',
	newIssue: '新規イシュー',
	moderatorGranted: '権限付与',
	newEmojiRequest: '絵文字申請',
	emojiApproved: '絵文字承認',
	emojiRejected: '絵文字却下',
};

// 通知タイプ → アイコン。
export function notifIcon(type: string): string {
	switch (type) {
		case 'emojiApproved': return 'ti-check';
		case 'emojiRejected': return 'ti-x';
		case 'newComment': return 'ti-message-circle';
		case 'issueClosed': return 'ti-lock';
		case 'issueReopened': return 'ti-lock-open';
		case 'issueStatusChanged': return 'ti-refresh';
		case 'newEmojiRequest': return 'ti-mood-smile';
		case 'newIssue': return 'ti-pencil-plus';
		case 'moderatorGranted': return 'ti-shield-check';
		default: return 'ti-bell';
	}
}
