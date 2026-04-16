/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface ModificationFile {
	path: string;
	type: 'added' | 'modified' | 'deleted';
	lines: string;
	summary: string;
}

export interface Modification {
	id: string;
	title: string;
	description: string;
	category: 'feature' | 'ui' | 'fix' | 'backend';
	files: ModificationFile[];
}

export interface ModificationsData {
	lastUpdated: string;
	basedOn: string;
	modifications: Modification[];
	categories: Record<string, string>;
}

export const modificationsData: ModificationsData = {
	lastUpdated: '2026-02-19',
	basedOn: 'Misskey 2025.12.2',
	modifications: [
		// ===== hata-0.1 (2026/01/03) =====
		{
			id: 'portal-link',
			title: '旗鯖ポータルリンク',
			description: 'サイドメニューに旗鯖ポータルへのリンクを追加。外部リンクとしてアクセス可能。(hata-0.1)',
			category: 'ui',
			files: [
				{
					path: 'packages/frontend/src/navbar.ts',
					type: 'modified',
					lines: '47-54',
					summary: 'portalナビアイテムの追加',
				},
				{
					path: 'packages/frontend/src/preferences/def.ts',
					type: 'modified',
					lines: '191',
					summary: 'デフォルトメニューにportal追加',
				},
			],
		},
		{
			id: 'hata-custom-settings',
			title: '旗鯖独自設定ページ',
			description: '旗鯖独自機能の設定をまとめた専用ページ。hata-0.8で「リアクション」セクション新設、不要設定削除等の整理を実施。(hata-0.1 追加、hata-0.8 整理)',
			category: 'ui',
			files: [
				{
					path: 'packages/frontend/src/pages/settings/hata-custom.vue',
					type: 'added',
					lines: '1-*',
					summary: '旗鯖独自設定ページ全体',
				},
			],
		},
		{
			id: 'post-form-buttons',
			title: '投稿フォームボタン設定',
			description: '投稿フォームのハッシュタグ・お絵かきボタンの表示/非表示を設定から切り替え可能。(hata-0.1 追加、hata-0.8 改善)',
			category: 'ui',
			files: [
				{
					path: 'packages/frontend/src/preferences/def.ts',
					type: 'modified',
					lines: '752-760',
					summary: 'showHashtagButtonInPostForm, showDrawingButtonInPostForm設定',
				},
			],
		},
		// ===== hata-0.2 (2026/01/09) =====
		{
			id: 'drawing-tool',
			title: 'お絵かきツール',
			description: '投稿フォームから利用できるお絵かき機能。ペン・消しゴム・塗りつぶし・図形・ぼかし・投げ縄・切り抜きツール、複数レイヤー（透明度・合成モード）、HSVカラーピッカー・16色パレット・HEXコード、12種フィルター対応。v2.3ではマウスホイール拡大/縮小、ハンドツール、2本指ピンチ、ミニマップトグルを追加。(hata-0.2 追加、hata-0.4 改善)',
			category: 'feature',
			files: [
				{
					path: 'packages/frontend/src/components/MkDrawingTool.vue',
					type: 'added',
					lines: '1-*',
					summary: 'お絵かきツールコンポーネント（v2.3）',
				},
				{
					path: 'packages/frontend/src/navbar.ts',
					type: 'modified',
					lines: '*',
					summary: 'drawingナビアイテムの追加',
				},
				{
					path: 'packages/frontend/src/preferences/def.ts',
					type: 'modified',
					lines: '758-760',
					summary: 'showDrawingButtonInPostForm設定',
				},
			],
		},
		{
			id: 'login-bonus',
			title: 'ログイン日数機能',
			description: '累計ログイン日数の表示・月別カレンダー表示・実績連携（3〜1000日で自動解放）。ランキング機能、ポップアップ表示のオン/オフ設定対応。設定保存方式の最適化済み。(hata-0.2 追加、hata-0.4/0.55/0.6/0.7 改善)',
			category: 'feature',
			files: [
				{
					path: 'packages/frontend/src/components/MkLoginBonusDialog.vue',
					type: 'added',
					lines: '1-*',
					summary: 'ログインボーナスダイアログコンポーネント全体',
				},
				{
					path: 'packages/frontend/src/ui/_common_/common.ts',
					type: 'modified',
					lines: '219-235',
					summary: 'showLoginBonusIfNeeded関数の追加',
				},
				{
					path: 'packages/frontend/src/ui/universal.vue',
					type: 'modified',
					lines: '107-110',
					summary: 'ログインボーナス表示の呼び出し',
				},
				{
					path: 'packages/frontend/src/navbar.ts',
					type: 'modified',
					lines: '63-70',
					summary: 'ナビバーにログイン日数メニュー追加',
				},
				{
					path: 'packages/frontend/src/preferences/def.ts',
					type: 'modified',
					lines: '773-776',
					summary: 'showLoginBonusPopup設定の定義',
				},
			],
		},
		// ===== hata-0.4 (2026/01/12) =====
		{
			id: 'timeline-animation',
			title: 'タイムラインアニメーション方向',
			description: '新規ノートのアニメーション方向を上/左/右/ランダムから選択可能にする機能。(hata-0.4 追加、hata-0.6 修正)',
			category: 'feature',
			files: [
				{
					path: 'packages/frontend/src/components/MkStreamingNotesTimeline.vue',
					type: 'modified',
					lines: '130-165, 586-602',
					summary: 'アニメーション方向の制御ロジックとCSS',
				},
				{
					path: 'packages/frontend/src/preferences/def.ts',
					type: 'modified',
					lines: '728-730',
					summary: 'timelineAnimationDirection設定の定義',
				},
			],
		},
		// ===== hata-0.5 (2026/01/28) =====
		{
			id: 'shrimpia-integration',
			title: 'シュリンピア連携',
			description: '外部サーバー（Shrimpia）との連携機能。投稿フォームに🦐アカウント追加、アバターに🦐バッジ表示、シュリンピアTLノートへのリプライが自鯖内で完結、画像ファイル添付対応、デッキUI/MisskeyUIサポート。(hata-0.5 追加、hata-0.8 表示修正)',
			category: 'feature',
			files: [
				{
					path: 'packages/frontend/src/pages/settings/external-account.vue',
					type: 'added',
					lines: '1-*',
					summary: '外部アカウント連携設定ページ',
				},
				{
					path: 'packages/frontend/src/preferences/def.ts',
					type: 'modified',
					lines: '777-795',
					summary: 'external.* 設定の定義',
				},
			],
		},
		// ===== hata-0.6 (2026/02/06) =====
		{
			id: 'card-maker-link',
			title: 'カードメーカーリンク',
			description: 'サイドメニューにカードメーカーへのリンクを追加。旗鯖ポータルと同様に外部リンクとしてアクセス可能。(hata-0.6)',
			category: 'ui',
			files: [
				{
					path: 'packages/frontend/src/navbar.ts',
					type: 'modified',
					lines: '55-62',
					summary: 'cardMachineナビアイテムの追加',
				},
				{
					path: 'packages/frontend/src/preferences/def.ts',
					type: 'modified',
					lines: '192',
					summary: 'デフォルトメニューにcardMachine追加',
				},
			],
		},
		{
			id: 'hata-modifications-page',
			title: '改変チェック機能（管理者向け）',
			description: 'コントロールパネル内でMisskey本家との差分を確認できる管理者向けページ。改変箇所の一覧、影響ファイル、変更行数などを表示。(hata-0.6)',
			category: 'feature',
			files: [
				{
					path: 'packages/frontend/src/pages/admin/hata-modifications.vue',
					type: 'added',
					lines: '1-*',
					summary: '改変一覧ページコンポーネント',
				},
				{
					path: 'packages/frontend/src/hata-modifications.ts',
					type: 'added',
					lines: '1-*',
					summary: '改変データ定義ファイル',
				},
			],
		},
		// ===== hata-0.7 (2026/02/11) =====
		{
			id: 'modern-simple-ui',
			title: 'Hatasaba UI',
			description: 'スマホ操作に特化した超軽量・高速なインターフェース。左右スワイプでのTL切り替え、タブ型UI対応。hata-0.8で外部タイムライン（🦐H/🦐L）タブを追加、OHTL/OLTLの個別設定対応。(hata-0.7 追加、hata-0.8 拡張)',
			category: 'feature',
			files: [
				{
					path: 'packages/frontend/src/ui/simple.vue',
					type: 'added',
					lines: '1-*',
					summary: 'Hatasaba UI本体',
				},
				{
					path: 'packages/frontend/src/preferences/def.ts',
					type: 'modified',
					lines: '*',
					summary: 'UI切り替え関連設定の定義',
				},
			],
		},
		{
			id: 'ui-switcher',
			title: 'UI Switcher（UI切り替え体験）',
			description: 'デザインを一新したUI選択画面。グラスモーフィズム（すりガラス風）デザイン採用、選択後に即座に設定反映。ナビバーアイコンから直接起動。(hata-0.7)',
			category: 'ui',
			files: [
				{
					path: 'packages/frontend/src/components/MkUiSwitcher.vue',
					type: 'added',
					lines: '1-*',
					summary: 'UI切り替えダイアログ（グラスモーフィズム）',
				},
				{
					path: 'packages/frontend/src/navbar.ts',
					type: 'modified',
					lines: '*',
					summary: 'UI切り替えボタンの挙動変更（直接起動）',
				},
			],
		},
		{
			id: 'external-timeline',
			title: '外部タイムライン（OHTL/OLTL）',
			description: 'シュリンピア連携済みの場合、外部サーバーのホームTL/ローカルTLを表示。更新間隔の最適化、画像クリックで別タブ展開対応。Hatasaba UIではスワイプ操作でも切り替え可能。(hata-0.7 追加、hata-0.8 拡張・修正)',
			category: 'feature',
			files: [
				{
					path: 'packages/frontend/src/components/MkExternalTimeline.vue',
					type: 'added',
					lines: '1-*',
					summary: '外部タイムラインコンポーネント',
				},
				{
					path: 'packages/frontend/src/preferences/def.ts',
					type: 'modified',
					lines: '*',
					summary: 'OHTL/OLTL有効化設定の定義',
				},
			],
		},
		// ===== hata-0.8 (2026/02/13) =====
		{
			id: 'reaction-hide',
			title: 'リアクション非表示機能',
			description: 'ノートのリアクション絵文字を右クリック→「このリアクションを非表示」で特定リアクションをノート単位で非表示可能。非表示データは30日間保持され自動復元。設定→旗鯖独自機能→リアクションから管理ページにアクセス、個別/一括復元、件数バッジ表示に対応。(hata-0.8)',
			category: 'feature',
			files: [
				{
					path: 'packages/frontend/src/components/MkReactionsViewer.vue',
					type: 'modified',
					lines: '*',
					summary: 'リアクション右クリックメニューに非表示オプション追加',
				},
				{
					path: 'packages/frontend/src/pages/settings/hidden-reactions.vue',
					type: 'added',
					lines: '1-*',
					summary: '非表示リアクション管理ページ（個別/一括復元、件数バッジ）',
				},
				{
					path: 'packages/frontend/src/preferences/def.ts',
					type: 'modified',
					lines: '*',
					summary: '非表示リアクションデータの設定定義',
				},
			],
		},
		// ===== hata-0.9 (2026/02/19) =====
		{
			id: 'registration-application',
			title: '登録申請機能',
			description: '招待コードを持たないユーザーが参加申請を送信できる機能。管理者ダッシュボードでの承認/却下、承認メール送信、自動クリーンアップ（pending 30日/rejected 90日）を含む。(hata-0.9)',
			category: 'feature',
			files: [
				{
					path: 'packages/backend/src/models/RegistrationApplication.ts',
					type: 'added',
					lines: '1-*',
					summary: '登録申請エンティティ',
				},
				{
					path: 'packages/backend/migration/1762000000000-add-registration-application.js',
					type: 'added',
					lines: '1-*',
					summary: 'registration_applicationテーブル作成マイグレーション',
				},
				{
					path: 'packages/backend/src/server/api/endpoints/registration/apply.ts',
					type: 'added',
					lines: '1-*',
					summary: '申請API（CAPTCHA検証、レート制限、ユーザー名バリデーション）',
				},
				{
					path: 'packages/backend/src/server/api/endpoints/admin/registration-applications.ts',
					type: 'added',
					lines: '1-*',
					summary: '管理者用申請一覧API',
				},
				{
					path: 'packages/backend/src/server/api/endpoints/admin/approve-registration.ts',
					type: 'added',
					lines: '1-*',
					summary: '申請承認API（アカウント作成＋承認メール送信）',
				},
				{
					path: 'packages/backend/src/server/api/endpoints/admin/reject-registration.ts',
					type: 'added',
					lines: '1-*',
					summary: '申請却下API',
				},
				{
					path: 'packages/backend/src/queue/processors/CleanProcessorService.ts',
					type: 'modified',
					lines: '*',
					summary: '古い申請の自動クリーンアップ追加',
				},
				{
					path: 'packages/backend/src/di-symbols.ts',
					type: 'modified',
					lines: '55',
					summary: 'registrationApplicationsRepository シンボル追加',
				},
				{
					path: 'packages/backend/src/models/_.ts',
					type: 'modified',
					lines: '*',
					summary: 'MiRegistrationApplication import・export・型定義追加',
				},
				{
					path: 'packages/backend/src/models/RepositoryModule.ts',
					type: 'modified',
					lines: '*',
					summary: '$registrationApplicationsRepository プロバイダー追加',
				},
				{
					path: 'packages/backend/src/server/api/endpoint-list.ts',
					type: 'modified',
					lines: '*',
					summary: '4つのエンドポイントexport追加',
				},
				{
					path: 'packages/frontend/src/components/MkSignupBranchDialog.vue',
					type: 'added',
					lines: '1-*',
					summary: '登録方法選択ダイアログ（招待コード or 参加申請）',
				},
				{
					path: 'packages/frontend/src/components/MkRegistrationApplication.vue',
					type: 'added',
					lines: '1-*',
					summary: '参加申請フォーム',
				},
				{
					path: 'packages/frontend/src/components/MkVisitorDashboard.vue',
					type: 'modified',
					lines: '*',
					summary: '未ログイン時の案内文変更・サインアップダイアログ差し替え',
				},
				{
					path: 'packages/frontend/src/accounts.ts',
					type: 'modified',
					lines: '364',
					summary: 'MkSignupDialog → MkSignupBranchDialog に差し替え',
				},
				{
					path: 'packages/frontend/src/pages/admin/registration-applications.vue',
					type: 'added',
					lines: '1-*',
					summary: '管理者用申請管理ページ',
				},
				{
					path: 'packages/frontend/src/pages/admin/index.vue',
					type: 'modified',
					lines: '*',
					summary: '管理メニューに「登録申請管理」追加',
				},
				{
					path: 'packages/frontend/src/router.definition.ts',
					type: 'modified',
					lines: '*',
					summary: '/admin/registration-applications ルート追加',
				},
			],
		},
	],
	categories: {
		feature: '機能追加',
		ui: 'UI変更',
		fix: 'バグ修正',
		backend: 'バックエンド変更',
	},
};
