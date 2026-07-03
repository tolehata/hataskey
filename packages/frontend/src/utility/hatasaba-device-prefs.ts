/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref } from 'vue';
import { miLocalStorage } from '@/local-storage.js';

// 旗鯖fork: 端末ローカル(プロファイル非同期)の HatasabaUI 設定。
// prefer(プロファイル)に入れると複数端末で共有されてしまう設定を、端末ごとに保持するためのもの。
// 共有 reactive ref としてエクスポートし、設定ページと UI(simple.vue)の双方が同じ状態を参照する。

// 旗鯖fork(#6): 画面幅に関係なくデッキ表示を強制するか。
// スマホ等の狭幅端末では新デッキUIが未対応で描画が壊れるため、プロファイル共有させず端末ごとに持つ。
export const deckIgnoreWidth = ref(miLocalStorage.getItem('hatasabaDeckIgnoreWidth') === 'true');
export function setDeckIgnoreWidth(v: boolean): void {
	deckIgnoreWidth.value = v;
	miLocalStorage.setItem('hatasabaDeckIgnoreWidth', v ? 'true' : 'false');
}

// 旗鯖fork(#31・ベータ): ミュートしたユーザーのリアクションを、ノートのリアクションチップ自体から隠す。
//   端末ごと(プロファイル非同期)に管理する。直近のリアクション(reactionAndUserPairCache)を使う best-effort。
export const hideMutedReactionsLocal = ref(miLocalStorage.getItem('hataHideMutedReactions') === 'true');
export function setHideMutedReactionsLocal(v: boolean): void {
	hideMutedReactionsLocal.value = v;
	miLocalStorage.setItem('hataHideMutedReactions', v ? 'true' : 'false');
}

// 旗鯖fork(ベータ): グラスUI(グラスモーフィズム刷新)を有効化するか。端末ローカル(プロファイル非同期)。
//   有効時は <html> に 'hataGlassUi' クラスを付与し、各コンポーネントの SCSS が
//   :global(html.hataGlassUi) 配下でグラス面/ピルタブ/リアクショングロー等に差し替える。
//   ぼかしは既存の --MI-blur (useBlurEffect=false で none) を尊重する。
function applyGlassUiClass(v: boolean): void {
	if (typeof document !== 'undefined') {
		document.documentElement.classList.toggle('hataGlassUi', v);
	}
}
export const glassUiLocal = ref(miLocalStorage.getItem('hataGlassUi') === 'true');
export function setGlassUiLocal(v: boolean): void {
	glassUiLocal.value = v;
	miLocalStorage.setItem('hataGlassUi', v ? 'true' : 'false');
	applyGlassUiClass(v);
}
// モジュール読み込み時(=アプリ起動時)に現在値をクラスへ反映。
applyGlassUiClass(glassUiLocal.value);

// 旗鯖fork(ベータ): HatasabaUI 2 でノートの吹き出しデザイン(本文枠 + ＜口)を表示するか。端末ローカル。
//   既定は false(=吹き出しを非表示 = 外側の角丸カードだけのすっきり表示)。
//   HatasabaUI 2(glassUiLocal) が有効なときのみ設定 UI に表示される。
//   有効時は <html> に 'hataGlassUiBubble' クラスを付与し、タイムライン側 SCSS が
//   glass 表示のノートに吹き出し枠(＜口付き)を描画する。
function applyGlassUiBubbleClass(v: boolean): void {
	if (typeof document !== 'undefined') {
		document.documentElement.classList.toggle('hataGlassUiBubble', v);
	}
}
export const glassUiBubbleLocal = ref(miLocalStorage.getItem('hataGlassUiBubble') === 'true');
export function setGlassUiBubbleLocal(v: boolean): void {
	glassUiBubbleLocal.value = v;
	miLocalStorage.setItem('hataGlassUiBubble', v ? 'true' : 'false');
	applyGlassUiBubbleClass(v);
}
applyGlassUiBubbleClass(glassUiBubbleLocal.value);

// 旗鯖fork(#34): 地震・津波情報の「お住いの都道府県」。
//   居住地はプライバシーに関わるため、サーバーには一切送らず、この端末にのみ保存する。
//   未設定は空文字。
export const earthquakePref = ref(miLocalStorage.getItem('hataEarthquakePref') ?? '');
export function setEarthquakePref(v: string): void {
	earthquakePref.value = v;
	if (v) miLocalStorage.setItem('hataEarthquakePref', v);
	else miLocalStorage.removeItem('hataEarthquakePref');
}

// 旗鯖fork(#34): 地震情報の取得間隔(秒)。'10'=リアルタイム相当(最短)。端末ローカル。
export const earthquakePollSec = ref(Number(miLocalStorage.getItem('hataEarthquakePollSec') ?? '10'));
export function setEarthquakePollSec(v: number): void {
	earthquakePollSec.value = v;
	miLocalStorage.setItem('hataEarthquakePollSec', String(v));
}
