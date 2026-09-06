<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only

暁モックの特集・アプリ一覧。記録の保存、権限の取得、ルーティングは親が担当する。
デザイン参照: hatask-v3-akatsuki-mock.html (2026-09-05)
--bg/--surface/--masthead/--fg/--fg2/--rule/--rule2/--accent/--accent-ink/
--accent2/--on-accent/--on-accent2/--border/--button-border/--shadow は親から継承。
--ak-font-num は親の自己ホスト数字フォントを指定するための任意トークン。
-->
<template>
<section ref="rootEl" :class="$style.root" :data-kind="kind" :data-motion="motionAllowed" :aria-label="appTitle">
	<div ref="featureEl" :class="$style.feature" :data-paused="paused" role="region" aria-roledescription="カルーセル" :aria-label="`${appTitle} 特集`" @pointerenter="hoverPaused = true" @pointerleave="hoverPaused = false" @focusin="focusPaused = true" @focusout="onFocusOut">
		<div :class="$style.track" data-feature-track :style="{ transform: `translateX(-${activeIndex * 100}%)` }">
			<div v-for="(slide, index) in features" :key="slide.id" :class="$style.slide" :data-tone="slide.tone" :data-feature-id="slide.id" :inert="index !== activeIndex" :aria-hidden="index !== activeIndex" role="group" aria-roledescription="スライド" :aria-label="`${index + 1} / ${features.length}`">
				<component :is="slide.icon" :class="$style.featureMark" :strokeWidth="2" aria-hidden="true"/>
				<div :class="$style.featureBody">
					<div :class="$style.featureKicker">{{ slide.kicker }}</div>
					<div :class="$style.featureTitle" data-feature-title>{{ slide.lines[0] }}<br>{{ slide.lines[1] }}</div>
					<button type="button" :class="$style.featureApp" :data-feature-open="slide.id" @click="emit('open', slide.id)"><component :is="slide.icon" :strokeWidth="2" aria-hidden="true"/><span :class="slide.brand ? $style.brand : $style.featureNative">{{ slide.label }}</span></button>
				</div>
			</div>
		</div>
		<div :class="$style.controls" data-feature-controls :data-tone="features[activeIndex]?.tone">
			<button type="button" :class="$style.carouselButton" data-carousel-action="prev" aria-label="前の特集へ" @click="move(-1)"><ChevronLeft :strokeWidth="2" aria-hidden="true"/></button>
			<button type="button" :class="$style.carouselButton" data-carousel-action="next" aria-label="次の特集へ" @click="move(1)"><ChevronRight :strokeWidth="2" aria-hidden="true"/></button>
			<button type="button" :class="$style.carouselButton" data-carousel-action="pause" :aria-label="paused ? '特集の自動送りを再生' : '特集の自動送りを一時停止'" :aria-pressed="paused" :disabled="!motionAllowed" @click="togglePause"><Play v-if="paused" :strokeWidth="2" aria-hidden="true"/><Pause v-else :strokeWidth="2" aria-hidden="true"/></button>
			<span :class="$style.dots"><button v-for="(_, dotIndex) in features" :key="dotIndex" type="button" :class="$style.dotTarget" data-carousel-action="dot" :data-dot-index="dotIndex" :aria-label="`${dotIndex + 1}枚目の特集へ`" :aria-pressed="activeIndex === dotIndex" @click="selectSlide(dotIndex)"><span :class="$style.dot"/></button></span>
		</div>
	</div>

	<div :class="$style.mobileList" data-app-layout="mobile">
		<h2 :class="[$style.mobileTitle, $style.brand]">{{ appTitle }}</h2>
		<article v-for="app in mobileApps" :key="app.id" :class="$style.mobileCard" :data-app-id="app.id">
			<div :class="$style.mobileCardHead"><component :is="app.icon" :strokeWidth="2" aria-hidden="true"/><span :class="app.brand ? [$style.appName, $style.brand] : $style.appName">{{ app.label }}</span><span v-if="countsKnown !== false && app.count && count(app.count) > 0" :class="$style.countBadge" data-count-badge>{{ count(app.count) }}</span><button type="button" :class="$style.appOpen" :aria-label="`${app.label}を開く`" @click="emit('open', app.id)"><ChevronRight :strokeWidth="2" aria-hidden="true"/></button></div>
			<p :class="$style.mobileDescription">{{ app.description }}</p>
		</article>
	</div>

	<div :class="$style.desktopList" data-app-layout="desktop">
		<h2 :class="$style.desktopTitle"><span :class="$style.brand">{{ appTitle }}</span></h2>
		<div v-if="kind === 'tools'" :class="$style.filterSpacer" aria-hidden="true"></div>
		<section v-for="group in groups" :key="group.id" :class="$style.appGroup">
			<h3 v-if="group.label" :class="$style.category"><component :is="group.icon" :strokeWidth="2" aria-hidden="true"/>{{ group.label }}</h3>
			<article v-for="app in group.apps" :key="app.id" :class="$style.desktopRow" :data-app-id="app.id">
				<component :is="app.icon" :strokeWidth="2" aria-hidden="true"/>
				<div :class="$style.desktopCopy"><div :class="$style.nameLine"><strong :class="app.brand ? $style.brand : undefined">{{ app.label }}</strong><span v-if="countsKnown !== false && app.count && count(app.count) > 0" :class="$style.countBadge" data-count-badge>{{ count(app.count) }}</span></div><p>{{ app.description }}</p></div>
				<button type="button" :class="$style.appOpen" :aria-label="`${app.label}を開く`" @click="emit('open', app.id)"><ChevronRight :strokeWidth="2" aria-hidden="true"/></button>
			</article>
		</section>
	</div>
</section>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue';
import { Activity, BookOpen, BookOpenCheck, CalendarDays, ChevronLeft, ChevronRight, Contact, Eye, Flag, Flower2, Gamepad2, MessageSquareWarning, Newspaper, Paintbrush, Palette, PanelLeft, Pause, Play, ScanFace, SlidersHorizontal, Smile, Soup, SquareCheckBig, Wrench } from '@lucide/vue';
import type { Component } from 'vue';

type CountKey = 'calendar' | 'todo' | 'meal' | 'feedback';
type AppItem = { id: string; label: string; icon: Component; description: string; brand?: boolean; count?: CountKey };
type Feature = { id: string; label: string; icon: Component; kicker: string; lines: [string, string]; tone: 'accent' | 'ink' | 'accent2'; brand?: boolean };

const props = withDefaults(defineProps<{
	kind: 'hatask' | 'tools';
	animations: boolean;
	counts: { calendar: number; todo: number; meal: number; feedback: number };
	countsKnown?: boolean;
	canAccessHataFeed: boolean;
	canUseMascot: boolean;
}>(), { countsKnown: true });
const emit = defineEmits<{ open: [id: string] }>();
const appTitle = computed(() => props.kind === 'hatask' ? 'Hatask App' : 'Hataskey App');

function count(key: CountKey): number {
	const value = props.counts[key];
	return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

const hataskApps: readonly AppItem[] = [
	{ id: 'cal', label: 'カレンダー', icon: CalendarDays, count: 'calendar', description: '予定と出欠の管理。月表示から一日を開き、日付と時間を指定して登録できます。公開予定や参加する予定も確認できます' },
	{ id: 'todo', label: 'ToDo', icon: SquareCheckBig, brand: true, count: 'todo', description: '今日のタスクと締切の管理。並べ替えや完了のチェックができ、フォルダーや優先度で整理できます' },
	{ id: 'mood', label: 'きもち', icon: Smile, description: 'いまの気分とひとことを残す記録。日付や週ごとの並びで振り返れて、記録のリマインドも設定できます' },
	{ id: 'meal', label: 'ごはん', icon: Soup, count: 'meal', description: '朝・昼・夜・間食の記録。そのときの様子をひとこと添えて、あとから日付や時間を指定して残せます' },
	{ id: 'garden', label: 'おはな', icon: Flower2, description: '時間とともに育つ花。育ち具合と開花までの時間を確認し、咲いた花を収穫して名前を付けられます' },
	{ id: 'eye', label: 'EYE', icon: Eye, brand: true, description: '記録やタスクに合わせたことばを表示。きもちの記録数やタスクの進み具合、育てた花の花言葉も眺められます' },
	{ id: 'settings', label: '見た目', icon: Palette, description: 'テーマ・明暗・動きなど、Hataskの見え方と使い方をまとめて調整できます' },
];
const toolApps: readonly AppItem[] = [
	{ id: 'feed', label: 'HataFeed', icon: MessageSquareWarning, brand: true, count: 'feedback', description: 'Hataskeyへの要望・不具合報告を送り、返信や対応状況を追えるフィードバック窓口。絵文字申請やベータ機能の入口もここにあります' },
	{ id: 'hatady', label: 'Hatady', icon: BookOpen, brand: true, description: '映画・ゲーム・学びの記録を、ひとつの活動タイムラインで振り返れます。本棚や作品の一覧、ノート、目標もまとめて管理できます' },
	{ id: 'card', label: 'HataCardMaker', icon: Contact, brand: true, description: '自分のプロフィールを使った自己紹介カード。アクセントや透明度などを整えて、画像として書き出せます' },
	{ id: 'analyze', label: 'HATAlyze（感情分析）', icon: ScanFace, brand: true, description: '自分の投稿から感情の傾向や言葉の特徴を分析。結果を見比べて振り返れます。利用できる範囲はアカウントの権限に従います' },
	{ id: 'studio', label: 'HataSideStudio', icon: PanelLeft, brand: true, description: 'サイドメニューのグループ・ボタン・ウィジェットを組み替え、自分の使い方に合う配置を作れます' },
	{ id: 'earthquake', label: '地震・津波情報', icon: Activity, description: '気象庁が発表した地震・津波情報を地図と一覧で確認。震度や津波警報の通知も設定できます（緊急地震速報は扱いません）' },
	{ id: 'mascot', label: 'マスコット', icon: Smile, description: 'ハタキュなどのマスコットの表示やセリフを設定します。利用できるアカウントでは、同意後に設定を開けます' },
	{ id: 'games', label: 'ゲーム', icon: Gamepad2, description: '積み上げゲーム・絵文字たたき・絵文字シュートなど、Hataskeyのミニゲームをまとめた入口' },
	{ id: 'guide', label: 'Hataskey 機能解説', icon: BookOpenCheck, brand: true, description: 'Hataskeyの独自機能をカテゴリ別に解説するガイド。検索やヒントから使いたい機能や設定を探せます' },
	{ id: 'drawing', label: 'お絵描きツール', icon: Paintbrush, description: 'ペンや色、レイヤーを選んで絵を描き、ドライブへ画像を保存。投稿に使うときは、投稿フォームでドライブから選んで添付します' },
	{ id: 'whatsnew', label: '今回の更新内容', icon: Newspaper, description: '今回の更新で加わった機能や変更点を確認できます' },
	{ id: 'hatasettings', label: 'Hataskey設定', icon: Flag, description: 'Hataskey独自の機能や表示に関する設定を開きます' },
];
const availableTools = computed(() => toolApps.filter(app => (app.id !== 'feed' || props.canAccessHataFeed) && (app.id !== 'mascot' || props.canUseMascot)));
const mobileApps = computed(() => props.kind === 'hatask' ? hataskApps : availableTools.value);
const groupSpecs = [
	{ id: 'tools', label: 'ツール', icon: Wrench, apps: ['card', 'analyze', 'drawing'] },
	{ id: 'records', label: '記録と共有', icon: MessageSquareWarning, apps: ['feed', 'hatady'] },
	{ id: 'information', label: '防災・情報', icon: Activity, apps: ['earthquake'] },
	{ id: 'play', label: 'あそび', icon: Gamepad2, apps: ['mascot', 'games'] },
	{ id: 'settings', label: '設定と案内', icon: SlidersHorizontal, apps: ['studio', 'guide', 'whatsnew', 'hatasettings'] },
];
const groups = computed(() => props.kind === 'hatask'
	? [{ id: 'hatask', label: '', icon: null, apps: hataskApps }]
	: groupSpecs.map(group => ({ ...group, apps: group.apps.flatMap(id => availableTools.value.filter(app => app.id === id)) })).filter(group => group.apps.length > 0));
const features = computed<Feature[]>(() => props.kind === 'hatask' ? [
	{ id: 'todo', label: 'ToDo', icon: SquareCheckBig, kicker: 'きょう', lines: props.countsKnown !== false && count('todo') > 0 ? [`残り ${count('todo')} 件を、`, '先に片づける。'] : ['きょうのタスクを、', 'ひとつ書きとめる。'], tone: 'accent', brand: true },
	{ id: 'garden', label: 'おはな', icon: Flower2, kicker: 'そろそろ', lines: ['花の育ちぐあいを、', 'そっと見に行く。'], tone: 'ink' },
	{ id: 'mood', label: 'きもち', icon: Smile, kicker: 'ふりかえり', lines: ['いまの気分を、', 'ひとこと残そう。'], tone: 'accent2' },
] : [
	{ id: 'analyze', label: 'HATAlyze（感情分析）', icon: ScanFace, kicker: '特集', lines: ['自分の言葉から、', '気分の波を読む。'], tone: 'accent', brand: true },
	{ id: 'hatady', label: 'Hatady', icon: BookOpen, kicker: '定番', lines: ['映画もゲームも、', '学びもひとつに。'], tone: 'ink', brand: true },
	{ id: 'card', label: 'HataCardMaker', icon: Contact, kicker: 'つくる', lines: ['自分の一枚を、', 'カードにする。'], tone: 'accent2', brand: true },
]);

const rootEl = ref<HTMLElement | null>(null);
const featureEl = ref<HTMLElement | null>(null);
const activeIndex = ref(0);
const paused = ref(false);
const hoverPaused = ref(false);
const focusPaused = ref(false);
const intersecting = ref(false);
const pageVisible = ref(true);
const activated = ref(true);
const reducedMotion = ref(false);
const motionAllowed = computed(() => props.animations && !reducedMotion.value);
let observer: IntersectionObserver | undefined;
let media: MediaQueryList | undefined;
let timer: number | undefined;

function onFocusOut(event: FocusEvent): void {
	if (!(event.relatedTarget instanceof Node) || !featureEl.value?.contains(event.relatedTarget)) focusPaused.value = false;
}

function selectSlide(index: number): void {
	activeIndex.value = (index + features.value.length) % features.value.length;
}

function move(direction: number): void { selectSlide(activeIndex.value + direction); }

function togglePause(): void {
	paused.value = !paused.value;
	// 明示的な再生は、このボタンを押したフォーカス停止だけを解除する。
	// hover中・次のフォーカス進入・非表示・動きOFFの停止条件は保つ。
	if (!paused.value) focusPaused.value = false;
}

function updateVisibility(): void { pageVisible.value = window.document.visibilityState === 'visible'; }

function updateReducedMotion(): void { reducedMotion.value = media?.matches ?? false; }

watch(() => props.kind, () => { activeIndex.value = 0; paused.value = false; focusPaused.value = false; hoverPaused.value = false; });

onMounted(() => {
	media = window.matchMedia('(prefers-reduced-motion: reduce)');
	updateReducedMotion();
	media.addEventListener('change', updateReducedMotion);
	updateVisibility();
	window.document.addEventListener('visibilitychange', updateVisibility);
	if (typeof IntersectionObserver !== 'undefined') {
		observer = new IntersectionObserver(entries => { intersecting.value = entries.some(entry => entry.isIntersecting); });
		if (rootEl.value) observer.observe(rootEl.value);
	} else {
		// 古いWebViewでも、隠れたパネルの自動送りは行わない。
		intersecting.value = true;
	}
	timer = window.setInterval(() => {
		if (!motionAllowed.value || paused.value || hoverPaused.value || focusPaused.value || !intersecting.value || !pageVisible.value || !activated.value) return;
		if (!rootEl.value?.getClientRects().length) return;
		activeIndex.value = (activeIndex.value + 1) % features.value.length;
	}, 4200);
});
onActivated(() => { activated.value = true; });
onDeactivated(() => { activated.value = false; });
onBeforeUnmount(() => {
	if (timer != null) window.clearInterval(timer);
	observer?.disconnect();
	media?.removeEventListener('change', updateReducedMotion);
	window.document.removeEventListener('visibilitychange', updateVisibility);
});
</script>

<style module>
.root { --feature-accent-small: color-mix(in srgb, var(--fg) 75%, #000); container: ak-apps / inline-size; min-width: 0; color: var(--fg); font-family: 'Zen Kaku Gothic New', system-ui, sans-serif; line-height: 1.55; }
.root *, .root *::before, .root *::after { box-sizing: border-box; }
.root button { font: inherit; color: inherit; background: transparent; border: 0; padding: 0; cursor: pointer; text-align: left; }
.root button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.root button:disabled { cursor: default; opacity: .5; }
.root h2, .root h3, .root p { margin: 0; }
.brand { font-family: Righteous, var(--ak-font-num, Archivo), 'Zen Kaku Gothic New', system-ui, sans-serif; font-weight: 400; font-synthesis: none; letter-spacing: .01em; }
.feature { container: ak-feature / inline-size; position: relative; overflow: hidden; border-radius: 24px; box-shadow: var(--shadow); margin-bottom: 20px; }
.track { display: flex; width: 100%; transition: transform .58s cubic-bezier(.22, .61, .36, 1); will-change: transform; }
.slide { position: relative; display: flex; flex-direction: column; flex: 0 0 100%; min-width: 0; overflow: hidden; }
.slide[data-tone='accent'] { background: var(--accent); color: var(--on-accent); }
.slide[data-tone='ink'] { background: var(--fg); color: var(--bg); }
.slide[data-tone='accent2'] { background: var(--accent2); color: var(--on-accent2); }
/* The app and stationary controls share the last row; only narrow banners reserve a separate controls row. */
.featureBody { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 196px; grid-template-areas: 'kicker kicker' 'title title' 'app .'; gap: 6px 16px; align-content: center; flex: 1 0 auto; min-width: 0; min-height: 160px; padding: 14px 18px; }
.featureKicker { grid-area: kicker; min-width: 0; display: flex; align-items: center; gap: 10px; font: 800 11px/1.55 'Zen Maru Gothic', system-ui, sans-serif; letter-spacing: .08em; }
.featureKicker::after { width: 34px; height: 2px; background: currentColor; opacity: .55; content: ''; }
.slide[data-tone='accent'] .featureKicker { color: var(--feature-accent-small); }
.featureTitle { grid-area: title; min-width: 0; font-family: 'Zen Maru Gothic', system-ui, sans-serif; font-size: clamp(22px, 4cqi, 26px); font-weight: 700; line-height: 1.15; letter-spacing: -.025em; line-break: strict; word-break: normal; overflow-wrap: anywhere; }
.root .featureApp { min-height: 44px; height: auto; min-width: 0; grid-area: app; justify-self: start; display: inline-flex; align-items: center; gap: 8px; margin: 0; padding: 8px 16px; border-radius: 999px; background: var(--surface); color: var(--fg); font-size: 14px; font-weight: 800; line-height: 1.35; max-width: 100%; white-space: normal; flex-shrink: 0; }
.root .featureApp:hover { filter: brightness(.94); }
.featureApp .brand { min-width: 0; font-size: 15px; overflow-wrap: anywhere; }
.featureNative { min-width: 0; font-size: 14px; font-weight: 800; overflow-wrap: anywhere; }
.featureApp svg { width: 17px; height: 17px; flex: 0 0 auto; }
.featureMark { position: absolute; right: -14px; bottom: -24px; width: 132px !important; height: 132px !important; opacity: .13; pointer-events: none; }
.controls { position: absolute; inset-inline: 0; bottom: 0; display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 0 18px 19px; pointer-events: none; }
.controls > * { pointer-events: auto; }
.controls[data-tone='accent'] { color: var(--feature-accent-small); }
.controls[data-tone='ink'] { color: var(--bg); }
.controls[data-tone='accent2'] { color: var(--on-accent2); }
.root .carouselButton { width: 34px; height: 34px; display: grid; place-items: center; border: 2px solid currentColor; border-radius: 999px; flex: 0 0 auto; }
.carouselButton svg { width: 17px; height: 17px; }
.carouselButton[data-carousel-action='pause'] svg { width: 15px; height: 15px; }
.dots { display: flex; align-items: center; gap: 5px; margin-left: 0; }
.root .dotTarget { display: grid; place-items: center; height: 32px; min-width: 10px; }
.dot { display: block; width: 10px; height: 6px; border-radius: 999px; background: currentColor; opacity: .38; transition: width .25s; }
.dotTarget[aria-pressed='true'] .dot { width: 26px; opacity: 1; }
.mobileList { display: none; }
.desktopTitle { padding-bottom: 16px; border-bottom: 1px solid var(--rule2); font-size: clamp(26px, var(--hak-app-title-size, 34px), 34px); line-height: 1.16; letter-spacing: .01em; }
.root[data-kind='tools'] .desktopTitle { border-bottom: none; }
.desktopTitle > span { display: block; }
.filterSpacer { height: 22px; }
.category { display: flex; align-items: baseline; gap: 9px; margin-top: 24px !important; padding-bottom: 10px; border-bottom: 1px solid var(--rule2); font-family: 'Zen Maru Gothic', system-ui, sans-serif; font-size: 12px; font-weight: 800; letter-spacing: .08em; }
.category svg { width: 16px; height: 16px; color: var(--accent-ink); }
.desktopRow { display: flex; align-items: flex-start; gap: 16px; margin-top: 12px; padding: 18px 20px; border: var(--border); border-radius: 22px; background: var(--masthead); box-shadow: var(--shadow); }
.desktopRow > svg { width: 30px; height: 26px; min-width: 30px; margin-top: 2px; padding-inline: 2px; color: var(--accent-ink); }
.desktopCopy { flex: 1; min-width: 0; }
.nameLine { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.desktopCopy strong { font-size: 16px; font-weight: 800; }
.desktopCopy strong.brand { font-size: 17px; font-weight: 400; }
.desktopCopy p { max-width: 56ch; margin: 6px 0 0; color: var(--fg2); font-size: 13px; line-height: 1.75; text-wrap: pretty; }
.countBadge { min-width: 20px; height: 20px; display: inline-grid; place-items: center; flex: 0 0 auto; padding: 0 6px; border-radius: 999px; background: var(--hak-badge-bg, #b02e56); color: #fff; font-family: var(--ak-font-num, Archivo), system-ui, sans-serif; font-size: 11px; font-weight: 800; font-variant-numeric: tabular-nums; }
.root .appOpen { width: 36px; height: 36px; display: grid; place-items: center; flex: 0 0 auto; border: var(--button-border); border-radius: 999px; }
.appOpen svg { width: 18px; height: 18px; }
.root[data-motion='false'] .track, .root[data-motion='false'] .dot { transition: none; }
:global(.htk-akatsuki-layout[data-mode='dark']) .featureApp { background: var(--masthead); }
:global(.htk-akatsuki-layout[data-mode='dark']) .root { --feature-accent-small: var(--on-accent); }
@container ak-feature (max-width: 500px) {
	.featureBody { grid-template-columns: minmax(56px, 1fr) minmax(0, max-content); grid-template-areas: 'kicker app' 'title title'; gap: 6px 12px; align-content: start; min-height: 166px; padding: 12px 16px 54px; }
	.featureTitle { font-size: clamp(20px, calc((100cqi - 32px) / 12), 24px); line-height: 1.18; }
	.root .featureApp { justify-self: end; }
	.controls { justify-content: flex-start; padding: 0 16px 12px; }
	.dots { margin-left: auto; }
}
@container hatask-akatsuki (max-width: 599px) {
	.feature { margin-bottom: 14px; }
	.featureKicker { gap: 9px; font-size: 10px; }
	.featureKicker::after { width: 26px; }
	.featureTitle { font-size: clamp(20px, calc((100cqi - 32px) / 12), 22px); line-height: 1.18; letter-spacing: -.02em; }
	.root .featureApp { padding-inline: 14px; font-size: 13px; }
	.featureApp svg { width: 16px; height: 16px; }
	.controls { gap: 7px; }
	.root .carouselButton { width: 32px; height: 32px; }
	.carouselButton svg { width: 16px; height: 16px; }
	.mobileList { display: block; padding: 4px 6px 0; }
	.desktopList { display: none; }
	.mobileTitle { margin-top: 16px !important; padding-bottom: 12px; border-bottom: 1px solid var(--rule2); font-size: 23px; }
	.root[data-kind='tools'] .mobileTitle { border-bottom: none; }
	.root[data-kind='hatask'] .mobileTitle { margin-top: 0 !important; padding-bottom: 14px; }
	.mobileCard { display: flex; flex-direction: column; gap: 9px; margin-top: 10px; padding: 16px 18px; border: var(--border); border-radius: 18px; background: var(--surface); box-shadow: var(--shadow); }
	.mobileTitle + .mobileCard { margin-top: 12px; }
	.root[data-kind='hatask'] .mobileTitle + .mobileCard { margin-top: 14px; }
	.mobileCardHead { display: flex; align-items: center; gap: 12px; }
	.mobileCardHead > svg { width: 26px; height: 22px; min-width: 26px; padding-inline: 2px; color: var(--accent-ink); }
	.appName { flex: 1; min-width: 0; font-size: 15px; font-weight: 800; overflow-wrap: anywhere; }
	.appName.brand { font-size: 16px; font-weight: 400; }
	.root .appOpen { width: 34px; height: 34px; }
	.appOpen svg { width: 17px; height: 17px; }
	.mobileDescription { color: var(--fg2); font-size: 12px; line-height: 1.8; text-wrap: pretty; }
}
@container ak-feature (max-width: 270px) {
	.root .featureApp { padding-inline: 12px; }
	.featureApp .brand { font-size: 13px; }
}
@container ak-feature (max-width: 227px) {
	.featureBody { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'kicker' 'title' 'app'; padding-bottom: 86px; }
	.root .featureApp { justify-self: start; }
	.controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px 8px; padding: 0 12px 12px; }
	.dots { grid-column: 1 / -1; justify-content: center; margin-left: 0; }
	.slide[data-tone='accent'] .featureTitle { color: var(--feature-accent-small); }
}
@media (prefers-reduced-motion: reduce) {
	.track, .dot { transition: none; }
}
</style>
