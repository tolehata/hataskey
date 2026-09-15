<!-- SPDX-License-Identifier: AGPL-3.0-only -->

<template>
<section
	ref="cardRoot"
	:class="$style.row"
	:style="themeTextColors"
	:data-phase="phase"
	:data-motion="motion"
	:aria-hidden="phase === 'leaving' ? true : undefined"
	:inert="phase === 'leaving'"
	aria-label="LTLで絵文字投票"
	tabindex="-1"
>
	<div :class="$style.clip">
		<div :class="$style.card">
			<div :class="$style.head">
				<i class="ti ti-mood-smile" aria-hidden="true"></i>
				<span>LTLで絵文字投票</span>
				<span :class="$style.counter" :aria-label="isResult ? `残り${remaining}秒` : undefined">
					<i v-if="isResult" class="ti ti-clock" aria-hidden="true"></i>
					<span>{{ isResult ? `${remaining}秒` : phase === 'tallying' ? '投票締切' : `締切まで ${remaining}秒` }}</span>
				</span>
			</div>
			<template v-if="phase === 'voting'">
				<h2 :class="$style.title">どの絵文字にする？</h2>
				<p :class="$style.subtitle">{{ !canVote ? 'ログインして参加できます' : submitting ? '投票しています...' : 'ひとつだけ、選んでね。' }}</p>
				<div :class="$style.choices" role="group" aria-label="カスタム絵文字を1回選択" :aria-busy="submitting">
					<button
						v-for="emoji in round.candidates"
						:key="emoji.id"
						:class="$style.choice"
						class="_button"
						type="button"
						:disabled="submitting || !canVote"
						:aria-label="`:${emoji.name}: に投票する`"
						:title="`:${emoji.name}:`"
						@click.stop="vote(emoji.id)"
					>
						<span :class="$style.choiceImage" aria-hidden="true"><MkCustomEmoji :name="emoji.name" :url="emoji.url" :host="null"/></span>
						<span :class="$style.emojiName">:{{ emoji.name }}:</span>
					</button>
				</div>
				<p v-if="voteError" :class="$style.error" role="alert">{{ voteError }}</p>
			</template>
			<div v-else-if="phase === 'rain' || phase === 'waiting'" :class="$style.state">
				<span ref="selectedImage" :class="$style.symbol" aria-hidden="true">
					<MkCustomEmoji v-if="selectedEmoji" :name="selectedEmoji.name" :url="selectedEmoji.url" :host="null"/>
					<i v-else class="ti ti-check"></i>
				</span>
				<div :class="$style.stateCopy">
					<h2>{{ phase === 'rain' ? 'この絵文字に決めた！' : '他のユーザーの投票を待っています...' }}</h2>
					<p>あなたの投票は受け付けました</p>
					<span :class="$style.waitDots" aria-hidden="true"><i></i><i></i><i></i></span>
				</div>
			</div>
			<div v-else-if="phase === 'tallying'" :class="$style.state">
				<span :class="$style.symbol" aria-hidden="true"><i class="ti ti-hourglass"></i></span>
				<div :class="$style.stateCopy">
					<h2>集計しています...</h2>
					<p>もうすぐ結果が出ます。</p>
					<span :class="$style.waitDots" aria-hidden="true"><i></i><i></i><i></i></span>
				</div>
			</div>
			<template v-else-if="isResult">
				<h2 :class="$style.title">集計が完了しました</h2>
				<ol :class="$style.rankings" role="list" aria-label="絵文字投票の結果">
					<li v-for="entry in round.rankings" :key="entry.emoji.id" :class="$style.ranking" :data-rank="entry.rank ?? 'none'" :value="entry.rank ?? undefined">
						<span :class="$style.place">
							<i v-if="entry.rank === 1" class="ti ti-trophy" aria-hidden="true"></i>
							<span>{{ rankLabel(entry) }}</span>
						</span>
						<span :class="$style.rankImage" :data-winner="entry.rank === 1"><MkCustomEmoji :name="entry.emoji.name" :url="entry.emoji.url" :host="null"/></span>
						<span :class="$style.rankDetail">
							<span :class="$style.rankName" :title="`:${entry.emoji.name}:`">:{{ entry.emoji.name }}:</span>
							<span :class="$style.rankCount">{{ entry.count }}票</span>
						</span>
					</li>
				</ol>
				<p :class="$style.caption">{{ round.total > 0 ? `${round.total}人が参加しました` : '今回は投票がありませんでした' }}</p>
			</template>
		</div>
	</div>
	<span :class="$style.announcement" role="status" aria-live="polite" aria-atomic="true">{{ active ? announcement : '' }}</span>
	<Teleport v-if="effectTarget && active" :to="effectTarget">
		<div :class="$style.rain" :data-fading="rainFading" :data-motion="motion" aria-hidden="true">
			<span v-for="(tile, index) in rainTiles" :key="index" :class="$style.rainTile" :style="tile"><img :src="rainImage" alt="" draggable="false" decoding="async"/></span>
		</div>
		<canvas ref="confettiCanvas" :class="$style.confetti" :data-motion="motion" aria-hidden="true"></canvas>
	</Teleport>
</section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import tinycolor from 'tinycolor2';
import type { LtlEmojiVoteChoice, LtlEmojiVoteRanking, LtlEmojiVoteRound } from '@/utility/ltl-emoji-vote-types.js';
import MkCustomEmoji from '@/components/global/MkCustomEmoji.vue';
import { LTL_EMOJI_VOTE_RAIN_MS } from '@/utility/ltl-emoji-vote-types.js';
import { makeLtlEmojiRain, playLtlEmojiConfetti } from '@/utility/ltl-emoji-vote-effects.js';
import { prefer } from '@/preferences.js';
import { useGlobalEvent } from '@/events.js';

const props = withDefaults(defineProps<{
	round: LtlEmojiVoteRound;
	choice: LtlEmojiVoteChoice | null;
	now: number;
	phase: 'idle' | 'voting' | 'rain' | 'waiting' | 'tallying' | 'result' | 'leaving';
	active: boolean;
	effectTarget: HTMLElement | null;
	claimEffect: (kind: 'rain' | 'confetti', roundId: string) => boolean;
	submitting?: boolean;
	voteError?: string | null;
	canVote?: boolean;
}>(), { submitting: false, voteError: null, canVote: true });
const emit = defineEmits<{ vote: [emojiId: string] }>();
const cardRoot = useTemplateRef<HTMLElement>('cardRoot');
const selectedImage = useTemplateRef<HTMLElement>('selectedImage');
const confettiCanvas = useTemplateRef<HTMLCanvasElement>('confettiCanvas');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = ref(reducedMotionQuery.matches);
const visible = ref(!window.document.hidden);
const hostVisible = ref(false);
const visibleWinners = shallowRef(new Set<HTMLElement>());
const motion = computed(() => prefer.r.animation.value && !reducedMotion.value);
const isResult = computed(() => props.phase === 'result' || props.phase === 'leaving');
const remaining = computed(() => Math.max(0, Math.ceil(((isResult.value ? props.round.expiresAt : props.round.closesAt) - props.now) / 1000)));
const selectedEmoji = computed(() => props.round.candidates.find(emoji => emoji.id === props.choice?.emojiId));
const rainTiles = ref<ReturnType<typeof makeLtlEmojiRain>>([]);
const rainImage = ref('');
const rainFading = ref(false);
const themeTextColors = ref<Record<string, string>>({});
let rainFadeTimer: number | undefined;
let rainEndTimer: number | undefined;
let stopConfetti: (() => void) | undefined;
let resizeObserver: ResizeObserver | undefined;
let intersectionObserver: IntersectionObserver | undefined;
let observedHost: HTMLElement | null = null;
let observedWinners = new Set<HTMLElement>();
let observedSize = { width: 0, height: 0 };
let effectGeneration = 0;
let focusAfterVote = false;
let unmounted = false;

function updateThemeTextColors() {
	if (!cardRoot.value) return;
	const style = window.getComputedStyle(cardRoot.value);
	const foreground = tinycolor(style.getPropertyValue('--MI_THEME-fg'));
	const colors: Record<string, string> = {};
	for (const surface of ['panel', 'bg']) {
		const background = tinycolor(style.getPropertyValue(`--MI_THEME-${surface}`));
		// 透過テーマの背面は利用者の配置によるため、推測した背景色で補正しない。
		if (!foreground.isValid() || !background.isValid() || background.getAlpha() !== 1) continue;
		const contrast = (color: tinycolor.Instance) => tinycolor.readability(background, tinycolor.mix(background, color, color.getAlpha() * 100));
		if (contrast(foreground) >= 4.5) continue;
		const targets = [tinycolor('#000'), tinycolor('#fff')];
		const target = contrast(targets[0]) > contrast(targets[1]) ? targets[0] : targets[1];
		// テーマの色味を保ち、読める明暗差に達したところで補正を止める。
		for (let amount = 1; amount <= 100; amount++) {
			const color = tinycolor.mix(foreground, target, amount);
			if (contrast(color) < 4.5) continue;
			colors[`--ltl-emoji-vote-${surface}-fg`] = color.toRgbString();
			break;
		}
	}
	themeTextColors.value = colors;
}

useGlobalEvent('themeChanging', updateThemeTextColors);

function rankLabel(entry: LtlEmojiVoteRanking) {
	return entry.rank === null ? '順位なし' : `${entry.tied ? '同率' : ''}${entry.rank}位`;
}

const announcement = computed(() => {
	switch (props.phase) {
		case 'voting': return `絵文字投票が始まりました。${props.round.candidates.length}個からひとつ選んでください。`;
		case 'rain':
		case 'waiting': return 'あなたの投票は受け付けました。他のユーザーの投票を待っています。';
		case 'tallying': return '集計しています。';
		case 'result': return props.round.total > 0
			? `集計が完了しました。${props.round.rankings.map(entry => `${rankLabel(entry)}、:${entry.emoji.name}:、${entry.count}票`).join('。')}`
			: '集計が完了しました。今回は投票がありませんでした。';
		default: return '';
	}
});

function vote(emojiId: string) {
	if (!props.active || !props.canVote || props.submitting || props.choice || props.phase !== 'voting') return;
	focusAfterVote = true;
	emit('vote', emojiId);
}

function clearRain() {
	window.clearTimeout(rainFadeTimer);
	window.clearTimeout(rainEndTimer);
	rainFadeTimer = undefined;
	rainEndTimer = undefined;
	rainTiles.value = [];
	rainImage.value = '';
	rainFading.value = false;
}

function clearEffects() {
	effectGeneration++;
	clearRain();
	stopConfetti?.();
	stopConfetti = undefined;
}

function canAnimate() {
	return !unmounted && props.active && visible.value && motion.value && hostVisible.value && !!props.effectTarget?.isConnected;
}

function syncIntersectionTargets() {
	const target = props.active ? props.effectTarget : null;
	if (target !== observedHost) {
		if (observedHost) {
			intersectionObserver?.unobserve(observedHost);
			clearEffects();
		}
		observedHost = target;
		hostVisible.value = false;
		if (target) intersectionObserver?.observe(target);
	}
	const winners = new Set(props.active && props.phase === 'result'
		? cardRoot.value?.querySelectorAll<HTMLElement>('[data-winner="true"] img') ?? []
		: []);
	const previous = observedWinners;
	observedWinners = winners;
	for (const image of previous) {
		if (winners.has(image)) continue;
		intersectionObserver?.unobserve(image);
		if (visibleWinners.value.has(image)) visibleWinners.value = new Set([...visibleWinners.value].filter(winner => winner !== image));
	}
	for (const image of winners) {
		if (!previous.has(image)) intersectionObserver?.observe(image);
	}
}

function onIntersection(entries: IntersectionObserverEntry[]) {
	for (const entry of entries) {
		// root:null includes viewport and all scroll/overflow ancestors. Merely
		// intersecting the canvas bounds would let an offscreen deck column win.
		const isVisible = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
		if (entry.target === observedHost) {
			hostVisible.value = isVisible;
		} else if (observedWinners.has(entry.target as HTMLElement)) {
			const image = entry.target as HTMLElement;
			if (visibleWinners.value.has(image) === isVisible) continue;
			const next = new Set(visibleWinners.value);
			if (isVisible) next.add(image);
			else next.delete(image);
			visibleWinners.value = next;
		}
	}
}

async function updateEffects() {
	const generation = ++effectGeneration;
	if (props.phase !== 'rain') clearRain();
	if (props.phase !== 'result') { stopConfetti?.(); stopConfetti = undefined; }
	await nextTick();
	if (generation !== effectGeneration || unmounted) return;
	syncIntersectionTargets();
	if (!canAnimate()) { clearEffects(); return; }
	if (props.phase === 'rain' && props.choice && props.effectTarget) {
		if (rainTiles.value.length > 0) return;
		const image = selectedImage.value?.querySelector('img');
		const bounds = props.effectTarget.getBoundingClientRect();
		if (!image || bounds.width <= 0 || bounds.height <= 0 || !props.claimEffect('rain', props.round.id)) return;
		rainImage.value = image.currentSrc || image.src;
		rainTiles.value = makeLtlEmojiRain(bounds.width, bounds.height);
		rainFadeTimer = window.setTimeout(() => { rainFading.value = true; }, 1160);
		rainEndTimer = window.setTimeout(clearRain, LTL_EMOJI_VOTE_RAIN_MS);
	} else if (props.phase === 'result' && confettiCanvas.value && props.round.total > 0) {
		const origins = () => [...visibleWinners.value].filter(image => image.isConnected && observedWinners.has(image));
		if (origins().length === 0) { stopConfetti?.(); stopConfetti = undefined; return; }
		if (stopConfetti) return;
		const bounds = confettiCanvas.value.getBoundingClientRect();
		const hasVisibleWinner = origins().some(img => {
			const rect = img.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0 && rect.right > bounds.left && rect.left < bounds.right && rect.bottom > bounds.top && rect.top < bounds.bottom;
		});
		if (!hasVisibleWinner || !props.claimEffect('confetti', props.round.id)) return;
		stopConfetti = playLtlEmojiConfetti(confettiCanvas.value, origins, () => canAnimate() && props.phase === 'result' && origins().length > 0);
	}
}

function onMotionChange(event: MediaQueryListEvent) { reducedMotion.value = event.matches; }

function onVisibilityChange() {
	visible.value = !window.document.hidden;
	if (!visible.value) clearEffects();
}

function onPageHide() { visible.value = false; clearEffects(); }

function onPageShow() { onVisibilityChange(); }

function observeTarget(target: HTMLElement | null) {
	resizeObserver?.disconnect();
	if (!target) return;
	observedSize = { width: target.clientWidth, height: target.clientHeight };
	resizeObserver?.observe(target);
}

function onTargetResize() {
	const target = props.effectTarget;
	if (!target || (target.clientWidth === observedSize.width && target.clientHeight === observedSize.height)) return;
	observedSize = { width: target.clientWidth, height: target.clientHeight };
	clearEffects();
}

function onViewportInteraction(event: Event) {
	// End on user scrolling/navigation, not scroll anchoring caused by the card
	// shrinking after a vote. Other deck columns remain independent.
	if (event instanceof KeyboardEvent && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return;
	const target = event.target;
	const pane = props.effectTarget?.parentElement;
	if (target instanceof Element && pane && (target.contains(pane) || pane.contains(target))) clearEffects();
}

watch(() => [props.round.id, props.phase, props.choice?.emojiId, props.active, props.effectTarget, motion.value, visible.value, hostVisible.value, visibleWinners.value], updateEffects, { flush: 'post' });
watch(() => props.effectTarget, observeTarget);
watch(() => props.choice, async choice => {
	if (!choice || !focusAfterVote) return;
	focusAfterVote = false;
	await nextTick();
	if (props.active && !unmounted) cardRoot.value?.focus({ preventScroll: true });
});

onMounted(() => {
	updateThemeTextColors();
	resizeObserver = new ResizeObserver(onTargetResize);
	if ('IntersectionObserver' in window) intersectionObserver = new IntersectionObserver(onIntersection, { root: null, threshold: 0 });
	observeTarget(props.effectTarget);
	reducedMotionQuery.addEventListener('change', onMotionChange);
	window.document.addEventListener('visibilitychange', onVisibilityChange);
	window.document.addEventListener('wheel', onViewportInteraction, { capture: true, passive: true });
	window.document.addEventListener('pointerdown', onViewportInteraction, { capture: true, passive: true });
	window.document.addEventListener('keydown', onViewportInteraction, true);
	window.addEventListener('resize', clearEffects, { passive: true });
	window.addEventListener('pagehide', onPageHide);
	window.addEventListener('pageshow', onPageShow);
	void updateEffects();
});

onBeforeUnmount(() => {
	unmounted = true;
	clearEffects();
	resizeObserver?.disconnect();
	intersectionObserver?.disconnect();
	reducedMotionQuery.removeEventListener('change', onMotionChange);
	window.document.removeEventListener('visibilitychange', onVisibilityChange);
	window.document.removeEventListener('wheel', onViewportInteraction, true);
	window.document.removeEventListener('pointerdown', onViewportInteraction, true);
	window.document.removeEventListener('keydown', onViewportInteraction, true);
	window.removeEventListener('resize', clearEffects);
	window.removeEventListener('pagehide', onPageHide);
	window.removeEventListener('pageshow', onPageShow);
});
</script>

<style module lang="scss">
.row {
	display: grid;
	grid-template-rows: 1fr;
	min-width: 0;
	margin: 12px 0;
	opacity: 1;
	container-type: inline-size;
	transition: grid-template-rows .48s cubic-bezier(.22, 1, .36, 1), opacity .3s ease, margin .48s cubic-bezier(.22, 1, .36, 1);
	&[data-phase='leaving'] { grid-template-rows: 0fr; opacity: 0; margin-block: 0; pointer-events: none; }
	&:focus-visible { outline: 2px solid var(--MI_THEME-focus); outline-offset: 2px; }
}
.clip { overflow: hidden; min-height: 0; }
.card {
	min-width: 0;
	padding: 18px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
	background: var(--MI_THEME-panel);
	color: var(--ltl-emoji-vote-panel-fg, var(--MI_THEME-fg));
	text-align: center;
}
.head { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; font-size: 12px; }
.counter { display: inline-flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 11px; }
.title { font-size: 17px; margin: 9px 0 4px; line-height: 1.6; text-wrap: balance; }
.subtitle { font-size: 12px; margin: 0; }
.choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(70px, 1fr)); gap: 8px; margin-top: 15px; }
.choice {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: 92px;
	min-width: 0;
	padding: 10px 5px;
	border-radius: 12px;
	border: 1px solid var(--MI_THEME-divider);
	background: var(--MI_THEME-bg);
	color: var(--ltl-emoji-vote-bg-fg, var(--MI_THEME-fg));
	transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
	&:focus-visible { outline: 2px solid var(--MI_THEME-focus); outline-offset: 2px; }
	&:disabled { cursor: default; opacity: 1; }
	&:disabled .choiceImage { opacity: .6; }
}
.choiceImage { display: grid; place-items: center; width: 52px; height: 52px; pointer-events: none; }
.choiceImage :deep(img), .symbol :deep(img), .rankImage :deep(img) { display: block; width: 100%; height: 100% !important; object-fit: contain; transform: none !important; }
.emojiName { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: inherit; }
.error { margin: 10px 0 0; font-size: 12px; }
.state { display: flex; align-items: center; justify-content: center; gap: 15px; padding: 15px 0 7px; text-align: center; }
.symbol { width: 45px; height: 45px; flex: 0 0 45px; box-sizing: border-box; padding: 7px; display: grid; place-items: center; background: var(--MI_THEME-bg); color: var(--ltl-emoji-vote-bg-fg, var(--MI_THEME-fg)); border-radius: 50%; pointer-events: none; }
.stateCopy { min-width: 0; h2 { font-size: 14px; margin: 0 0 4px; line-height: 1.6; text-wrap: balance; } p { margin: 2px 0 0; font-size: 12px; line-height: 1.6; } }
.waitDots { display: flex; justify-content: center; gap: 4px; padding-top: 9px; i { width: 4px; height: 4px; border-radius: 50%; background: currentColor; animation: waitDot 1.2s ease-in-out infinite; } i:nth-child(2) { animation-delay: .14s; } i:nth-child(3) { animation-delay: .28s; } }
.rankings { display: grid; gap: 6px; max-width: 430px; margin: 14px auto 10px; padding: 0; list-style: none; }
.ranking {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
	align-items: center;
	gap: 8px;
	min-width: 0;
	padding: 8px;
	border-radius: 10px;
	background: var(--MI_THEME-bg);
	color: var(--ltl-emoji-vote-bg-fg, var(--MI_THEME-fg));
	animation: winnerIn .52s cubic-bezier(.22, 1, .36, 1) both;
	&[data-rank='1'] { outline: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 40%, transparent); }
	&[data-rank='1'] .rankImage { width: 72px; height: 72px; }
}
.place { display: flex; flex-direction: column; align-items: center; gap: 3px; font-weight: 700; font-size: 12px; white-space: nowrap; }
.rankImage { display: grid; place-items: center; width: 48px; height: 48px; justify-self: center; pointer-events: none; }
.rankDetail { display: flex; flex-direction: column; align-items: center; min-width: 0; gap: 5px; }
.rankName { max-width: 100%; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rankCount { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.caption { font-size: 12px; margin: 6px 0 0; }
.announcement { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.rain, .confetti { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; contain: strict; }
.rain { z-index: 1; isolation: isolate; &[data-fading='true'] { opacity: 0; transition: opacity .3s ease; } }
.confetti { z-index: 2; }
.rainTile {
	position: absolute;
	left: var(--x);
	top: var(--y);
	width: var(--size);
	height: var(--size);
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 12px;
	background: var(--MI_THEME-panel);
	box-shadow: 0 3px 8px var(--MI_THEME-shadow);
	opacity: 0;
	animation: emojiFall var(--duration) cubic-bezier(.32, .02, .68, 1) var(--delay) both;
	img { width: 94%; height: 94%; object-fit: contain; }
}
.row[data-motion='false'], .row[data-motion='false'] *, .rain[data-motion='false'] { animation: none !important; transition: none !important; }
.rain[data-motion='false'], .confetti[data-motion='false'] { display: none; }
@keyframes waitDot { 0%, 70%, 100% { opacity: .35; transform: translateY(0); } 35% { opacity: 1; transform: translateY(-3px); } }
@keyframes winnerIn { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes emojiFall { from { opacity: 0; transform: translate(var(--drift), var(--from)) rotate(var(--rotate)); } 12% { opacity: 1; } to { opacity: 1; transform: translate(0, 0) rotate(0); } }
@media (hover: hover) { .choice:hover:not(:disabled) { border-color: var(--MI_THEME-fg); transform: translateY(-3px); box-shadow: 0 5px 12px var(--MI_THEME-shadow); } }
@container (max-width: 350px) { .card { padding: 15px; } .state { gap: 10px; } }
@media (prefers-reduced-motion: reduce) { .row, .row * { animation: none !important; transition: none !important; } .rain, .confetti { display: none !important; } }
</style>
