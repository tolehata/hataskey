/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * 旗鯖fork: 天気エフェクト(weatherEffect)の発火マネージャ。
 *
 * TLコンポーネントから「今表示すべき天気(snow/null)」の通知を受け取り、
 * 本家由来の WeatherEffect インスタンス(body直下fixed canvas)の
 * 生成・フェードイン・フェードアウト・破棄を一元管理する。
 *
 * 設計の要点:
 *   - TLのDOMには一切触らない(本家の季節エフェクトと同じく body 直下に canvas を置く方式)。
 *     これにより TL のレイアウト/スクロールを壊すリスクを排除する。
 *   - ON/OFFは滑らかに。WeatherEffect が CSS opacity transition でフェードする。
 *   - 同じ天気の通知が連続しても無駄に作り直さない(現在の天気と比較)。
 *
 * Step A では snow のみ実装。rain / sunny はここに分岐を足して拡張する。
 */

import { WeatherEffect } from '@/utility/weather-effect.js';
import type { WeatherKind } from '@/utility/weather-effect-detector.js';

class WeatherEffectManager {
	private current: WeatherKind | null = null;
	private effect: WeatherEffect | null = null;
	// フェードアウト中の古いインスタンス(破棄待ち)。多重発火時の取りこぼし防止。
	private retiring: WeatherEffect | null = null;
	private enabled = false;

	/**
	 * 機能全体のON/OFF。OFFにすると即座に現在のエフェクトを片付ける。
	 */
	public setEnabled(enabled: boolean) {
		this.enabled = enabled;
		if (!enabled) {
			this.clear();
		}
	}

	/**
	 * 今表示すべき天気を通知する。TL側から呼ぶ。
	 * - 新しい天気 → 旧エフェクトをフェードアウトし、新エフェクトをフェードイン
	 * - null → 現在のエフェクトをフェードアウトして破棄
	 */
	public setWeather(kind: WeatherKind | null) {
		if (!this.enabled) return;
		if (kind === this.current) return; // 変化なし

		this.current = kind;

		// 既存エフェクトをフェードアウトして破棄
		this.fadeOutCurrent();

		if (kind == null) return;

		// Step A: snow のみ対応。それ以外は今は何もしない(将来ここに rain/sunny を追加)。
		if (kind !== 'snow') return;

		try {
			const effect = new WeatherEffect({}); // {} = 雪モード(本家準拠)
			effect.render();
			effect.fadeIn();
			this.effect = effect;
		} catch (error) {
			// WebGL が使えない等で失敗しても、TLの動作には影響させない
			// eslint-disable-next-line no-console
			console.error('Failed to start weather effect:', error);
			this.effect = null;
		}
	}

	private fadeOutCurrent() {
		const old = this.effect;
		this.effect = null;
		if (old == null) return;
		// 直前のフェードアウト待ちが残っていたら先に即破棄(インスタンスの溜まりを防ぐ)
		if (this.retiring) {
			this.retiring.stop();
			this.retiring = null;
		}
		this.retiring = old;
		old.fadeOut(() => {
			old.stop();
			if (this.retiring === old) this.retiring = null;
		});
	}

	/**
	 * 即座に全て片付ける(フェードなし)。機能OFF時や画面破棄時に使う。
	 */
	private clear() {
		this.current = null;
		if (this.effect) {
			this.effect.stop();
			this.effect = null;
		}
		if (this.retiring) {
			this.retiring.stop();
			this.retiring = null;
		}
	}
}

// アプリ全体で1つだけ(canvasを画面に複数出さないため)。
// モジュール読み込み時の即時生成は循環import時の初期化順序問題
// (can't access lexical declaration before initialization)を起こしうるため、
// 遅延生成(初回アクセス時に生成)にする。
let _instance: WeatherEffectManager | null = null;
export function getWeatherEffectManager(): WeatherEffectManager {
	if (_instance == null) _instance = new WeatherEffectManager();
	return _instance;
}
