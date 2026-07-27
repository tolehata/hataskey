/** 花常のプロシージャル効果音。環境音は ambience.ts に分離する。 */
import { prefer } from "@/preferences.js";

let context: AudioContext | undefined;
let hanaawaseSoundEnabled = true;

const masterVolume = () => prefer.s["sound.masterVolume"];
const muted = () =>
	!hanaawaseSoundEnabled ||
	prefer.s["sound.notUseSound"] ||
	masterVolume() === 0 ||
	(prefer.s["sound.useSoundOnlyWhenActive"] && window.document.hidden);
const getContext = () => {
	if (typeof window === "undefined" || muted()) return undefined;
	context ??= new AudioContext();
	return context;
};

export function unlockSound() {
	const ctx = getContext();
	if (ctx?.state === "suspended") void ctx.resume();
}

/** 花常内の設定。既存の全体音量・ミュート設定も引き続き尊重する。 */
export function setHanaawaseSoundEnabled(enabled: boolean) {
	hanaawaseSoundEnabled = enabled;
}

const tone = (
	frequency: number,
	duration: number,
	volume: number,
	type: OscillatorType = "sine",
	endFrequency = frequency,
) => {
	const ctx = getContext();
	if (!ctx) return;
	const oscillator = ctx.createOscillator();
	const gain = ctx.createGain();
	oscillator.type = type;
	oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
	oscillator.frequency.exponentialRampToValueAtTime(
		Math.max(1, endFrequency),
		ctx.currentTime + duration,
	);
	const level = volume * masterVolume();
	gain.gain.setValueAtTime(level, ctx.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
	oscillator.connect(gain).connect(ctx.destination);
	oscillator.start();
	oscillator.stop(ctx.currentTime + duration);
};

export const playSwap = () => tone(420, 0.05, 0.06, "triangle", 510);
export const playPop = (cascade = 1) => {
	const pitch = 880 * 1.122 ** Math.max(0, cascade - 1);
	tone(pitch, 0.15, 0.12, "sine", pitch * 1.5);
};
export const playLand = () => tone(150, 0.06, 0.045, "sine", 110);
export const playSpecial = (kind: "tanzaku" | "mari" | "tsuki") => {
	if (kind === "tanzaku") tone(720, 0.08, 0.09, "square", 340);
	else if (kind === "mari") tone(230, 0.14, 0.12, "sine", 120);
	else tone(1046, 0.42, 0.12, "sine", 1568);
};
export const playClear = () => {
	for (const [index, pitch] of [523, 587, 659, 784, 1046].entries()) {
		window.setTimeout(() => tone(pitch, 0.18, 0.09, "sine", pitch * 1.08), index * 85);
	}
};
