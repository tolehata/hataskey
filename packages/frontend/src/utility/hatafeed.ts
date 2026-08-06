/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 * 旗鯖fork: HataFeed 共通のラベル定義とヘルパー(カテゴリ/ステータス/通知アイコン)。
 */

import type * as Misskey from 'cherrypick-js';

// 旗鯖fork: 絵文字申請一覧・単件確認・連続確認で共有する表示用の形。
// SDKの独自エンドポイント応答型が空オブジェクト扱いでも、画面内ではこの形を一貫して使う。
export interface HataFeedEmojiRequest {
	id: string;
	createdAt: string;
	requestedBy: Misskey.entities.UserLite | null;
	name: string;
	category: string | null;
	aliases: string[];
	license: string | null;
	localOnly: boolean;
	isSensitive: boolean;
	sourceType: string;
	originalUrl: string | null;
	remoteHost: string | null;
	imageUrl: string | null;
	status: 'pending' | 'approved' | 'rejected';
}

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
	{ id: 'post-send-delay', title: '投稿前カウントダウン' },
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

// 旗鯖fork(デザイン改修 §2.2): ステータスのアイコン(Tabler)。リスト行の先頭ドットアイコン・
// 詳細ヘッダーの塗りピルで共用する。色は HfStatusPill 側で data-status ベースに当てる
// (CSS Module は動的キーを解決できないため、意味色は現行コードの値を data 属性で踏襲)。
export const statusIcon: Record<string, string> = {
	open: 'ti-circle-dot',
	planned: 'ti-calendar-time',
	inProgress: 'ti-progress',
	resolved: 'ti-circle-check',
	wontfix: 'ti-circle-minus',
	unknown: 'ti-help-circle',
	closed: 'ti-lock',
};

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

// 旗鯖fork(デザイン改修 §2.4): アバターのフォールバック色。既存アバター画像が無いときだけ
// 頭文字1字 + この淡色をユーザー毎に安定して割り当てる(HfAvatar で使用)。
export const HF_AVATAR_COLORS = ['#a9c4e8', '#f2b3c6', '#a8d8b9', '#c9b8e8', '#f5d491'];

// 旗鯖fork: seed 文字列(userId 等)から HF_AVATAR_COLORS のインデックスを安定的に導く。
//   同じユーザーには常に同じ色が付くよう、単純な文字コード総和のハッシュを使う。
export function hfAvatarColor(seed: string | null | undefined): string {
	if (!seed) return HF_AVATAR_COLORS[0];
	let h = 0;
	for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % HF_AVATAR_COLORS.length;
	return HF_AVATAR_COLORS[h];
}

// 旗鯖fork: 表示名/ユーザー名の先頭1字(頭文字アバター用)。無ければ「?」。
export function hfInitial(user: { name?: string | null; username?: string | null } | null | undefined): string {
	const s = (user?.name ?? user?.username ?? '').trim();
	return s.length > 0 ? [...s][0] : '?';
}

// 旗鯖fork(通知グルーピング): HataFeed 通知1件の最小形。バックエンド packNotifications の返却に対応。
export interface HataFeedNotifActor {
	id: string;
	name?: string | null;
	username?: string | null;
	avatarUrl?: string | null;
	[k: string]: unknown;
}
export interface HataFeedNotif {
	id: string;
	createdAt: string;
	type: string;
	message: string;
	isRead: boolean;
	actor: HataFeedNotifActor | null;
	feedbackId: string | null;
	emojiRequestId: string | null;
	commentId?: string | null;
	[k: string]: unknown;
}

// 旗鯖fork(通知グルーピング): まとめ後の1行分。
//   count===1 のグループは実質「単一通知」で、items[0] をそのまま表示する。
export interface HataFeedNotifGroup {
	key: string;
	type: string;
	items: HataFeedNotif[]; // 新しい順(APIの id DESC を踏襲)
	count: number; // items.length
	actors: HataFeedNotifActor[]; // 重複除去した actor(新しい順)
	isRead: boolean; // 全件既読なら true
	createdAt: string; // 代表(最新)の createdAt
	feedbackId: string | null;
	emojiRequestId: string | null;
}

// 旗鯖fork(通知グルーピング): 本体 Misskey の reaction:grouped(同一ノートへの複数リアクション)の流儀に倣い、
//   「同一の対象(イシュー)への同種イベント」を1行にまとめる型。代表例は複数人が同じイシューに付けたコメント。
//   クリック先(feedbackId)が一意に定まるので、まとめても遷移が曖昧にならない。
const TARGET_GROUPED_TYPES = new Set(['newComment', 'issueStatusChanged', 'issueClosed', 'issueReopened', 'issueResolved']);
// 旗鯖fork(通知グルーピング): 対象はばらけるが「種類」でまとめた方が見やすい型(主にスタッフ視点の受信)。
//   例: 複数の新規イシュー/絵文字申請を「新規イシュー N件」に集約する。個別遷移は展開して行う。
const TYPE_GROUPED_TYPES = new Set(['newIssue', 'newEmojiRequest']);

// 旗鯖fork(通知グルーピング): 取得済みの通知配列(新しい順)をグループ配列に変換する。
//   パネルが取得した1ページ分に閉じたクライアント側処理で、バックエンド・本体通知には一切触れない。
export function groupHataFeedNotifications(notifications: HataFeedNotif[]): HataFeedNotifGroup[] {
	const groups: HataFeedNotifGroup[] = [];
	const byKey = new Map<string, HataFeedNotifGroup>();

	for (const n of notifications) {
		let key: string;
		if (TARGET_GROUPED_TYPES.has(n.type) && n.feedbackId) key = `t:${n.type}:${n.feedbackId}`;
		else if (TYPE_GROUPED_TYPES.has(n.type)) key = `y:${n.type}`;
		else key = `s:${n.id}`;

		let g = byKey.get(key);
		if (!g) {
			g = {
				key,
				type: n.type,
				items: [],
				count: 0,
				actors: [],
				isRead: true,
				createdAt: n.createdAt,
				feedbackId: n.feedbackId ?? null,
				emojiRequestId: n.emojiRequestId ?? null,
			};
			byKey.set(key, g);
			groups.push(g);
		}
		g.items.push(n);
	}

	for (const g of groups) {
		g.count = g.items.length;
		// items は新しい順なので先頭が代表。
		g.createdAt = g.items[0].createdAt;
		g.feedbackId = g.items[0].feedbackId ?? null;
		g.emojiRequestId = g.items[0].emojiRequestId ?? null;
		g.isRead = g.items.every(i => i.isRead);
		// actor を重複除去して新しい順に収集(まとめ行のアバター重ね表示用)。
		const seen = new Set<string>();
		for (const i of g.items) {
			const a = i.actor;
			if (a && a.id && !seen.has(a.id)) { seen.add(a.id); g.actors.push(a); }
		}
	}

	return groups;
}

// 旗鯖fork(通知グルーピング): まとめ行の見出し文。単一件は元メッセージをそのまま返す。
//   複数件は本体の「〇〇他N人が〜」/「〜 N件」に倣った短い集約表現にする。
export function groupSummary(g: HataFeedNotifGroup): string {
	if (g.count === 1) return g.items[0].message;
	const label = notifTypeLabel[g.type] ?? g.type;
	const first = g.actors[0];
	const firstName = first ? (first.name ?? first.username ?? '') : '';

	// 同一対象へ複数アクター(コメント等) → 「〇〇 他N人が{ラベル}」。
	if (TARGET_GROUPED_TYPES.has(g.type)) {
		if (g.actors.length >= 2) return `${firstName} 他${g.actors.length - 1}人が${label}`;
		if (firstName) return `${firstName}が${label}（${g.count}件）`;
		return `${label} ${g.count}件`;
	}

	// 種類まとめ(新規イシュー/絵文字申請など) → 「{ラベル} N件」。
	return `${label} ${g.count}件`;
}

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
