/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type Keys = (
	'v' |
	'basedMisskeyVersion' |
	'lastVersion' |
	'lastBasedMisskeyVersion' |
	'instance' |
	'instanceCachedAt' |
	'account' |
	'latestDonationInfoShownAt' |
	'neverShowDonationInfo' |
	'neverShowLocalOnlyInfo' |
	'modifiedVersionMustProminentlyOfferInAgplV3Section13Read' |
	'lastUsed' |
	'lang' |
	'drafts' |
	'hashtags' |
	'colorScheme' |
	'useSystemFont' |
	'fontSize' |
	'useBoldFont' |
	'ui' |
	'ui_temp' |
	'bootloaderLocales' |
	'theme' |
	'themeId' |
	'themeCachedVersion' |
	'customCss' |
	'chatMessageDrafts' |
	'scratchpad' |
	'debug' |
	'preferences' |
	'latestPreferencesUpdate' |
	'hidePreferencesRestoreSuggestion' |
	'isSafeMode' |
	'hatasabaUiLastTab' | // 旗鯖fork: HatasabaUI で最後に開いていたタブ (再読み込み時の復元用)
	'hatasabaDeckIgnoreWidth' | // 旗鯖fork(#6): 画面幅に関係なくデッキ表示を強制する端末ローカル設定(プロファイル非同期)
	'hataHideMutedReactions' | // 旗鯖fork(#31): ミュートユーザーのリアクションをチップから隠す端末ローカル設定
	'hataGlassUi' | // 旗鯖fork(ベータ): HatasabaUI 2(グラスモーフィズム刷新)を有効化する端末ローカル設定
	'hataGlassUiBubble' | // 旗鯖fork(ベータ): HatasabaUI 2 でノートの吹き出しデザイン(枠+＜口)を表示する端末ローカル設定
	'hatadyTheme' | // 旗鯖fork(Hatady): 表示テーマ(paper/espresso/hataskey)。端末ローカル(端末ごとに好みのテーマを持てる)
	'hatadyLang' | // 旗鯖fork(Hatady): 表示言語(ja/en/auto)。端末ローカル
	'hataEarthquakePref' | // 旗鯖fork(#34): 地震情報のお住いの都道府県(端末ローカルのみ・サーバー非送信)
	'hataEarthquakePollSec' | // 旗鯖fork(#34): 地震情報の取得間隔(秒・端末ローカル)
	'hata_muted_reactions_local_migrated' | // 旗鯖fork(#31): 旧設定→端末ローカルへの移行済みフラグ
	'hata_muted_reactions_notice_shown' | // 旗鯖fork(#31): 改善案内ダイアログを表示済みか(端末ごと1回)
	'hataWhatsNewShownVersion' | // 旗鯖fork: 「今回の更新内容」を出した旗鯖の版(端末ごと。版が上がると再表示)
	'hata_hask_tiles_v1_migrated' | // 旗鯖fork(#36): Haskホームの新タイル(feedbackNotif/earthquake)を既存ユーザーに追加済みか
	`miux:${string}` |
	`ui:folder:${string}` |
	`themes:${string}` | // DEPRECATED
	`aiscript:${string}` |
	`aiscriptSecure:${string}` |
	'lastEmojisFetchedAt' | // DEPRECATED, stored in indexeddb (13.9.0~)
	'emojis' | // DEPRECATED, stored in indexeddb (13.9.0~);
	`channelLastReadedAt:${string}` |
	`idbfallback::${string}` |
	'neverShowNoteEditInfo' |
	'showPushNotificationDialog' |
	'hatafeedIntroShown' // 旗鯖fork: HataFeed 新登場の案内吹き出しを表示済みか(端末ごと)
);

// セッション毎に廃棄されるLocalStorage代替（セーフモードなどで使用できそう）
//const safeSessionStorage = new Map<Keys, string>();

export const miLocalStorage = {
	getItem: (key: Keys): string | null => {
		return window.localStorage.getItem(key);
	},
	setItem: (key: Keys, value: string): void => {
		window.localStorage.setItem(key, value);
	},
	removeItem: (key: Keys): void => {
		window.localStorage.removeItem(key);
	},
	getItemAsJson: (key: Keys): any | undefined => {
		const item = miLocalStorage.getItem(key);
		if (item === null) {
			return undefined;
		}
		return JSON.parse(item);
	},
	setItemAsJson: (key: Keys, value: any): void => {
		miLocalStorage.setItem(key, JSON.stringify(value));
	},
};
