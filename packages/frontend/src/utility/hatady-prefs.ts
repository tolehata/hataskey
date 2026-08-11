/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 * 旗鯖fork(Hatady): 表示テーマの設定。
 *   端末間で同期させるため、アカウントレジストリ(i/registry, scope=['client','hatady'])に
 *   サーバー保存する。prefer(プロファイル)経由だとクラウド/タブ間同期の巻き戻しで数秒後に
 *   既定へ戻る事象があったため、レジストリへ直接保存して確実に同期する。
 *   初回描画のちらつき防止に miLocalStorage をキャッシュとして併用(サーバー値が来たら上書き)。
 *   共有 reactive ref としてエクスポートし、ページ(hatady.vue)と表示設定ウィンドウが同じ状態を参照する。
 *   表示言語は Hataskey 本体の locale を唯一の正本とする。旧 display.lang / hatadyLang は
 *   設定を壊さないため保存値だけ維持し、表示言語の判定には使わない。
 */

import { ref } from 'vue';
import { miLocalStorage } from '@/local-storage.js';
import { misskeyApi } from '@/utility/misskey-api.js';

export type HatadyTheme = 'paper' | 'espresso' | 'hataskey';
export type HatadyLang = 'ja' | 'en' | 'auto';

const REG_SCOPE = ['client', 'hatady'];
const REG_KEY = 'display';

function isTheme(v: unknown): v is HatadyTheme { return v === 'paper' || v === 'espresso' || v === 'hataskey'; }
function isLang(v: unknown): v is HatadyLang { return v === 'ja' || v === 'en' || v === 'auto'; }

function readThemeCache(): HatadyTheme {
	const v = miLocalStorage.getItem('hatadyTheme');
	return isTheme(v) ? v : 'paper';
}
function readLangCache(): HatadyLang | undefined {
	const v = miLocalStorage.getItem('hatadyLang');
	return isLang(v) ? v : undefined;
}

// 初期値は端末ローカルキャッシュから(初回描画のちらつき防止)。サーバー値が来たら上書きする。
export const hatadyTheme = ref<HatadyTheme>(readThemeCache());
const legacyHatadyLang = ref<HatadyLang | undefined>(readLangCache());

// 旗鯖fork: 統計系エンドポイントへ渡すタイムゾーンオフセット(分)。
//   サーバーは UTC で動くため、これを渡さないと集計がユーザーの体感日付とズレる
//   (JST なら記録が前日のヒートマップに乗る/時間帯が9時間ズレる)。
//   Date#getTimezoneOffset と同符号(JST は -540)。
export function hatadyTzOffset(): number {
	return new Date().getTimezoneOffset();
}

function writeCache(): void {
	miLocalStorage.setItem('hatadyTheme', hatadyTheme.value);
	// 旧値は利用者設定を破壊しないため保存するが、表示には使わない。
	if (legacyHatadyLang.value !== undefined) miLocalStorage.setItem('hatadyLang', legacyHatadyLang.value);
}

// サーバー(アカウントレジストリ)から読み込んで反映する(端末間同期のプル)。
export async function loadHatadyDisplay(): Promise<void> {
	try {
		const v = await misskeyApi('i/registry/get', { scope: REG_SCOPE, key: REG_KEY }) as any;
		if (v && typeof v === 'object') {
			if (isTheme(v.theme)) hatadyTheme.value = v.theme;
			if (isLang(v.lang)) legacyHatadyLang.value = v.lang;
			writeCache();
		}
	} catch {
		// 未設定(NO_SUCH_KEY)等はキャッシュ/既定のまま。
	}
}

// サーバーに保存して全端末で同期する。ローカル状態とキャッシュも即反映。
// 第2引数は旧呼び出し元のソース互換用。表示言語も保存値も変更しない。
export async function saveHatadyDisplay(theme: HatadyTheme, _legacyLang?: HatadyLang): Promise<void> {
	hatadyTheme.value = theme;
	writeCache();
	let current: unknown;
	try {
		current = await misskeyApi('i/registry/get', { scope: REG_SCOPE, key: REG_KEY }) as unknown;
	} catch {
		current = undefined;
	}
	const value: Record<string, unknown> = {
		...(current && typeof current === 'object' && !Array.isArray(current) ? current : {}),
		theme,
	};
	// 旧サーバー値を取得できない場合も、端末に残る旧言語設定だけは失わない。
	if (!Object.hasOwn(value, 'lang') && legacyHatadyLang.value !== undefined) value.lang = legacyHatadyLang.value;
	await misskeyApi('i/registry/set', { scope: REG_SCOPE, key: REG_KEY, value });
}

// 旗鯖fork(1j): 初回チュートリアルの完了フラグ(アカウントごと・レジストリ保存)。
const REG_TUTORIAL_KEY = 'tutorialDone';
export async function loadTutorialDone(): Promise<boolean> {
	try {
		const v = await misskeyApi('i/registry/get', { scope: REG_SCOPE, key: REG_TUTORIAL_KEY }) as unknown;
		return v === true;
	} catch {
		return false; // 未設定(NO_SUCH_KEY)= 未完了。
	}
}
export async function setTutorialDone(done = true): Promise<void> {
	await misskeyApi('i/registry/set', { scope: REG_SCOPE, key: REG_TUTORIAL_KEY, value: done }).catch(() => {});
}
