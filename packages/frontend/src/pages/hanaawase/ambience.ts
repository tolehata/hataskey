/** CC0実音源による環境音。SEとは混ぜず、常に1場面1トラックだけを再生する。 */
import { prefer } from "@/preferences.js";

export type AmbienceKind = "shop" | "rain" | "wind" | "silent";

const sources: Readonly<Record<Exclude<AmbienceKind, "silent">, string>> = {
	shop: "/client-assets/hanaawase/sound/shop.ogg",
	rain: "/client-assets/hanaawase/sound/rain.ogg",
	wind: "/client-assets/hanaawase/sound/wind.ogg",
};
const fadeDuration = 1200;
let active: { kind: Exclude<AmbienceKind, "silent">; audio: HTMLAudioElement } | undefined;
let hanaawaseSoundEnabled = true;
const fadeFrames = new WeakMap<HTMLAudioElement, number>();

const masterVolume = () => prefer.s["sound.masterVolume"];
const muted = () =>
	!hanaawaseSoundEnabled ||
	prefer.s["sound.notUseSound"] ||
	masterVolume() === 0 ||
	(prefer.s["sound.useSoundOnlyWhenActive"] && window.document.hidden);

function cancelFade(audio: HTMLAudioElement) {
	const frame = fadeFrames.get(audio);
	if (frame !== undefined) window.cancelAnimationFrame(frame);
	fadeFrames.delete(audio);
}

function fade(audio: HTMLAudioElement, from: number, to: number, done?: () => void) {
	cancelFade(audio);
	const started = window.performance.now();
	const step = (now: number) => {
		const progress = Math.min(1, (now - started) / fadeDuration);
		audio.volume = from + (to - from) * progress;
		if (progress < 1) fadeFrames.set(audio, window.requestAnimationFrame(step));
		else {
			fadeFrames.delete(audio);
			done?.();
		}
	};
	fadeFrames.set(audio, window.requestAnimationFrame(step));
}

/** 場面切替は1.2秒だけクロスフェードし、音楽的な重ね再生にはしない。 */
export function startAmbience(kind: AmbienceKind = "shop") {
	if (kind === "silent" || muted()) {
		stopAmbience();
		return;
	}
	if (active?.kind === kind) return;
	const audio = new Audio(sources[kind]);
	audio.loop = true;
	audio.preload = "auto";
	audio.volume = 0;
	const previous = active;
	active = { kind, audio };
	void audio.play().then(() => {
		if (active?.audio !== audio) return;
		fade(audio, 0, 0.055 * masterVolume());
		if (previous) {
			const previousVolume = previous.audio.volume;
			window.setTimeout(() => {
				fade(previous.audio, previousVolume, 0, () => {
					previous.audio.pause();
					previous.audio.removeAttribute("src");
					previous.audio.load();
				});
			}, 0);
		}
	}).catch(() => {
		// 音源の読み込みに失敗しても、ゲーム本体は無音で続行する。
		if (active?.audio === audio) active = previous;
		audio.pause();
		audio.removeAttribute("src");
		audio.load();
	});
}

export function stopAmbience() {
	const previous = active;
	active = undefined;
	if (!previous) return;
	const from = previous.audio.volume;
	fade(previous.audio, from, 0, () => {
		previous.audio.pause();
		previous.audio.removeAttribute("src");
		previous.audio.load();
	});
}

/** 効果音と同じ花常内設定で環境音も止める。 */
export function setHanaawaseAmbienceEnabled(enabled: boolean) {
	hanaawaseSoundEnabled = enabled;
	if (!enabled) stopAmbience();
}
