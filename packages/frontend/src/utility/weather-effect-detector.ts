/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * 旗鯖fork: 天気エフェクト(weatherEffect)の検出ロジック。
 *
 * ノート本文(+CW)から天気を表すキーワードを検出し、表示すべきエフェクト種別を返す。
 * 雷は健康配慮(光感受性てんかん対策)のため意図的に対象外としている。
 *
 * 誤検出を避ける方針:
 *   - ひらがな単独マッチは飴・腫れ・由紀などと衝突するので採用しない。漢字+英語のみ。
 *   - 「曇り」は背景演出として地味で効果が薄いため Step1 では rain/snow/sunny の3種のみ。
 *
 * 複数天気が同時に書かれている場合(例:「雨が降った後で晴れた」)の優先ルール:
 *   - 「本文中で最後に出現した天気」を優先する(案A)。
 *   - 予測可能でシンプル。ユーザーが文末に書いた現在の天気が反映されやすい。
 */

export type WeatherKind = 'rain' | 'heavyRain' | 'snow' | 'sunny' | 'windy';

// 各天気種別の検出パターン。漢字+英語のみに絞り、ひらがな単独マッチは避ける。
// 注意: heavyRain は rain より前に置き、「土砂降り」「豪雨」等を通常の雨より優先して判定する。
//       (例: 「土砂降り」は rain の「雨」にもマッチするため、先に heavyRain を取る)
const WEATHER_PATTERNS: { kind: WeatherKind; regex: RegExp }[] = [
	{ kind: 'heavyRain', regex: /土砂降り|豪雨|大雨|暴風雨|ゲリラ豪雨|集中豪雨|どしゃ降り|heavy rain|downpour|torrential/i },
	{ kind: 'rain', regex: /雨|霧雨|小雨|夕立|rain|rainy/i },
	{ kind: 'snow', regex: /雪|吹雪|降雪|snow|snowy/i },
	{ kind: 'sunny', regex: /晴れ|晴天|快晴|日差し|陽射し|日射し|ピーカン|sunny|clear sky/i },
	{ kind: 'windy', regex: /強風|風が強い|風強い|暴風|突風|木枯らし|こがらし|windy|gale|gusty/i },
];

/**
 * テキストから天気種別を検出する。
 * 複数該当する場合は「最後に出現したもの」を優先する。
 *
 * @param text 検出対象テキスト(ノート本文 + CW を結合したもの想定)
 * @returns 検出された天気種別。該当なしは null。
 */
export function detectWeather(text: string | null | undefined): WeatherKind | null {
	if (text == null || text.length === 0) return null;

	// 各天気種別ごとに「本文中で最後に出現した位置」を求める。
	const lastIndexOf: Partial<Record<WeatherKind, number>> = {};
	for (const { kind, regex } of WEATHER_PATTERNS) {
		const g = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
		let lastIndex = -1;
		let m: RegExpExecArray | null;
		while ((m = g.exec(text)) !== null) {
			lastIndex = m.index;
			// ゼロ幅マッチ対策(理論上起きないが安全のため)
			if (m.index === g.lastIndex) g.lastIndex++;
		}
		if (lastIndex >= 0) lastIndexOf[kind] = lastIndex;
	}

	// 土砂降り(heavyRain)が含まれていたら、雨らしさを最優先で激しい雨にする。
	// (「大雨」「土砂降り」は通常の rain にも部分マッチするため、ここで明示的に優先する)
	if (lastIndexOf.heavyRain != null) return 'heavyRain';

	// それ以外は「最後に出現した天気」を採用する(予測可能でシンプル)。
	let best: { kind: WeatherKind; index: number } | null = null;
	for (const kind of Object.keys(lastIndexOf) as WeatherKind[]) {
		const index = lastIndexOf[kind]!;
		if (best == null || index > best.index) {
			best = { kind, index };
		}
	}

	return best?.kind ?? null;
}

/**
 * ノートオブジェクトから検出用テキスト(本文 + CW)を組み立てる。
 * MkNote.vue の utageTextMatched と同じ範囲を見ることで整合を取る。
 */
export function buildWeatherDetectText(note: { text?: string | null; cw?: string | null }): string {
	return `${note.text ?? ''} ${note.cw ?? ''}`;
}
