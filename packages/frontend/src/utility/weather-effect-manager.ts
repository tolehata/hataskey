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
import { RainEffect } from '@/utility/weather-effect-rain.js';
import { SunnyEffect } from '@/utility/weather-effect-sunny.js';
import { WindyEffect } from '@/utility/weather-effect-windy.js';
import { prefer } from '@/preferences.js';
import type { WeatherKind } from '@/utility/weather-effect-detector.js';

// 雪(WeatherEffect)・雨(RainEffect)・日差し(SunnyEffect)を統一的に扱う共通インターフェース。
// どれも同じ4メソッドを持つ。
interface IWeatherEffect {
	render(): unknown;
	fadeIn(): void;
	fadeOut(onComplete?: () => void): void;
	stop(): void;
}

class WeatherEffectManager {
	private current: WeatherKind | null = null;
	private effect: IWeatherEffect | null = null;
	// フェードアウト中の古いインスタンス(破棄待ち)。多重発火時の取りこぼし防止。
	private retiring: IWeatherEffect | null = null;
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

		try {
			let effect: IWeatherEffect | null = null;
			if (kind === 'snow') {
				effect = new WeatherEffect({}); // {} = 雪モード(本家準拠/WebGL)
			} else if (kind === 'rain') {
				effect = new RainEffect();      // 雨(自前2D Canvas)
			} else if (kind === 'heavyRain') {
				effect = new RainEffect({ heavy: true }); // 土砂降り(激しい雨)
			} else if (kind === 'sunny') {
				effect = new SunnyEffect();     // 日差し(自前2D Canvas)
			} else if (kind === 'windy') {
				effect = new WindyEffect();     // 強風(葉っぱが右→左に流れる/自前2D Canvas)
			} else {
				return;
			}
			effect.render();
			effect.fadeIn();
			this.effect = effect;
			// 初回のみチュートリアルを表示
			this.maybeShowFirstTip(kind);
		} catch (error) {
			// WebGL/Canvas が使えない等で失敗しても、TLの動作には影響させない
			// eslint-disable-next-line no-console
			console.error('Failed to start weather effect:', error);
			this.effect = null;
		}
	}

	/**
	 * その天気種別のエフェクトが初めて出た時に、1度だけ説明ダイアログを出す。
	 * 「おや、〇〇が降ってきました。不要なら設定から無効にできます」を案内。
	 */
	// セッション内で既にチュートリアルを出した天気種別(メモリ上の二重ガード)。
	// preference保存が何らかの理由で間に合わない/効かない場合でも、
	// タブ・UI切り替えでの再表示を確実に防ぐ。
	private tipShownThisSession = new Set<WeatherKind>();

	private maybeShowFirstTip(kind: WeatherKind) {
		// セッション内で既に出していたら何もしない(最優先のガード)
		if (this.tipShownThisSession.has(kind)) return;

		const flagKey = `weatherEffect.firstTipShown.${kind}` as const;
		// 永続フラグで既に表示済みなら何もしない
		if (prefer.r[flagKey]?.value) {
			this.tipShownThisSession.add(kind); // 以後セッション内でも弾く
			return;
		}
		// 先にフラグを立てる(多重表示防止)
		this.tipShownThisSession.add(kind);
		try {
			prefer.commit(flagKey, true);
		} catch {
			// 万一キーが無い等でcommitに失敗しても、セッション内フラグで再表示は防げる
		}

		const phrase = kind === 'sunny'
			? 'おや、日差しが輝いてきました。'
			: kind === 'snow'
				? 'おや、雪が降ってきました。'
				: kind === 'heavyRain'
					? 'おや、土砂降りになってきました。'
					: kind === 'windy'
						? 'おや、風が強くなってきました。'
						: 'おや、雨が降ってきました。';

		// os は Vue 外のこのモジュールからは動的importで読む(循環import回避)。
		import('@/os.js').then(os => {
			os.alert({
				type: 'info',
				title: '天気エフェクト',
				text: `${phrase}\n\nノートの内容に合わせて、タイムラインに天気の演出を表示しています。\n不要であれば、設定 → 旗鯖独自設定 → アクセシビリティ タブからいつでも無効にできます。`,
			});
		}).catch(() => { /* 表示に失敗しても致命的ではない */ });
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
