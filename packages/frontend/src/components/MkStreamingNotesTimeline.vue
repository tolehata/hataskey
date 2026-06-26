<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<component :is="prefer.s.enablePullToRefresh ? MkPullToRefresh : 'div'" :refresher="reloadTimeline">
	<MkLoading v-if="paginator.fetching.value"/>

	<MkError v-else-if="paginator.error.value" @retry="paginator.init()"/>

	<div v-else-if="paginator.items.value.length === 0" key="_empty_">
		<slot name="empty"><MkResult type="empty" :text="i18n.ts.noNotes"/></slot>
	</div>

	<div v-else ref="rootEl">
		<!-- 旗鯖fork(#7): HatasabaUIデッキUIでは、タイムライン最上部に「最新のノートです」を表示し、
		     先頭ノートがタブバーに密着しないよう余白も兼ねる。 -->
		<div v-if="isHatasabaDeck" :class="$style.deckTopMsg"><i class="ti ti-arrow-bar-to-up"></i> 最新のノートです</div>
		<transition
			:enterActiveClass="prefer.s.animation ? $style.transition_new_enterActive : ''"
			:leaveActiveClass="prefer.s.animation ? $style.transition_new_leaveActive : ''"
		>
			<div
				v-if="paginator.queuedAheadItemsCount.value > 0 && ['default', 'count'].includes(prefer.s.newNoteReceivedNotificationBehavior)"
				:class="[$style.new2, { [$style.showEl]: (showEl && ['hideHeaderOnly', 'hideHeaderFloatBtn', 'hide'].includes(<string>prefer.s.displayHeaderNavBarWhenScroll)) && isMobile && !isFriendly().value, [$style.showElTab]: (showEl && ['hideHeaderOnly', 'hideHeaderFloatBtn', 'hide'].includes(<string>prefer.s.displayHeaderNavBarWhenScroll)) && isMobile && isFriendly().value, [$style.reduceAnimation]: !prefer.s.animation }]"
			>
				<button class="_buttonPrimary" :class="$style.newButton2" @click="releaseQueue()">
					<i class="ti ti-arrow-up"></i>
					<I18n v-if="prefer.s.newNoteReceivedNotificationBehavior === 'count'" :src="i18n.ts.newNoteRecivedCount" textTag="span">
						<template #n>{{ paginator.queuedAheadItemsCount.value }}</template>
					</I18n>
					<span v-else-if="prefer.s.newNoteReceivedNotificationBehavior === 'default'">{{ i18n.ts.newNoteRecived }}</span>
				</button>
			</div>
		</transition>

		<!--
		<div v-if="paginator.queuedAheadItemsCount.value > 0" :class="$style.new">
			<div :class="$style.newBg1"></div>
			<div :class="$style.newBg2"></div>
			<button class="_button" :class="$style.newButton" @click="releaseQueue()"><i class="ti ti-circle-arrow-up"></i> {{ i18n.ts.newNote }}</button>
		</div>
		-->
		<component
			:is="prefer.s.animation ? TransitionGroup : 'div'"
			:class="[$style.notes, { [$style.noGap]: noGap, '_gaps': !noGap }]"
			:data-deck-ui="isDeckUi ? 'on' : undefined"
			:data-hatasaba-spacer="isHatasabaDeck ? 'on' : undefined"
			:data-bubble="bubbleEnabled ? 'on' : undefined"
			:data-spacing="noteSpacingValue"
			:data-classic-spacing="classicSpacingEnabled ? 'on' : undefined"
			:data-anim-dir="animDirValue"
			:enterActiveClass="$style.transition_x_enterActive"
			:leaveActiveClass="$style.transition_x_leaveActive"
			:enterFromClass="'hata-tl-enterFrom'"
			:leaveToClass="$style.transition_x_leaveTo"
			:moveClass="$style.transition_x_move"
			tag="div"
		>
			<template v-if="props.src === 'media'">
				<div :class="$style.mediaGrid">
					<MkNoteMediaGrid v-for="note in paginator.items.value" :key="note.id" :note="note" square isTimeline/>
				</div>
			</template>
			<template v-for="(note, i) in paginator.items.value" v-else :key="note.id">
				<div v-if="i > 0 && isSeparatorNeeded(paginator.items.value[i -1].createdAt, note.createdAt)" :class="[{ '_gaps': !noGap, [$style.sepWrapLeft]: dateOnLeft, [$style.sepWrapTight]: !dateHidden && !dateOnLeft }]" :data-scroll-anchor="note.id">
					<div v-if="!dateHidden" :class="[$style.date, { [$style.noGap]: noGap, [$style.dateLeft]: dateOnLeft, [$style.dateMobile]: isMobile, [$style.dateDeck]: isHatasabaDeck }]">
						<i v-if="dateOnLeft" :class="['ti ti-clock', $style.dateLeftIcon]"></i>
						<span><i class="ti ti-chevron-up"></i> {{ getSeparatorInfo(paginator.items.value[i -1].createdAt, note.createdAt)?.prevText }}</span>
						<span style="height: 1em; width: 1px; background: var(--MI_THEME-divider);"></span>
						<span>{{ getSeparatorInfo(paginator.items.value[i -1].createdAt, note.createdAt)?.nextText }} <i class="ti ti-chevron-down"></i></span>
					</div>
					<MkNote :class="$style.note" :note="note" :withHardMute="true"/>
				</div>
				<div v-else-if="note._shouldInsertAd_" :class="{ '_gaps': !noGap }" :data-scroll-anchor="note.id">
					<MkNote :class="$style.note" :note="note" :withHardMute="true"/>
					<div :class="[$style.ad, { [$style.noGap]: noGap }]">
						<MkAd :preferForms="['horizontal', 'horizontal-big']"/>
					</div>
				</div>
				<MkNote v-else :class="$style.note" :note="note" :withHardMute="true" :data-scroll-anchor="note.id"/>
			</template>
		</component>
		<button v-show="paginator.canFetchOlder.value" key="_more_" v-appear="prefer.s.enableInfiniteScroll ? paginator.fetchOlder : null" :disabled="paginator.fetchingOlder.value" class="_button" :class="$style.more" @click="paginator.fetchOlder">
			<div v-if="!paginator.fetchingOlder.value">{{ i18n.ts.loadMore }}</div>
			<MkLoading v-else :inline="true"/>
		</button>
	</div>
</component>
</template>

<script lang="ts" setup>
import { computed, watch, onUnmounted, provide, useTemplateRef, TransitionGroup, onMounted, shallowRef, ref, markRaw } from 'vue';
import * as Misskey from 'cherrypick-js';
import { useInterval } from '@@/js/use-interval.js';
import { useDocumentVisibility } from '@@/js/use-document-visibility.js';
import { getScrollContainer, scrollToTop } from '@@/js/scroll.js';
import type { BasicTimelineType } from '@/timelines.js';
import type { SoundStore } from '@/preferences/def.js';
import type { IPaginator, MisskeyEntity } from '@/utility/paginator.js';
import MkPullToRefresh from '@/components/MkPullToRefresh.vue';
import { useStream } from '@/stream.js';
import * as sound from '@/utility/sound.js';
import { $i } from '@/i.js';
import { instance } from '@/instance.js';
import { prefer } from '@/preferences.js';
import { miLocalStorage } from '@/local-storage.js';
import { store } from '@/store.js';
import MkNote from '@/components/MkNote.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import { globalEvents, useGlobalEvent } from '@/events.js';
import { isSeparatorNeeded, getSeparatorInfo } from '@/utility/timeline-date-separate.js';
import { Paginator } from '@/utility/paginator.js';
import { deviceKind } from '@/utility/device-kind.js';
import { isFriendly } from '@/utility/is-friendly.js';
import { scrollToVisibility } from '@/utility/scroll-to-visibility.js';
import MkNoteMediaGrid from '@/components/MkNoteMediaGrid.vue';
// 旗鯖fork: 天気エフェクト(weatherEffect)。DOMには触らず、検出した天気をマネージャに通知するのみ。
import { getWeatherEffectManager } from '@/utility/weather-effect-manager.js';
import { detectWeather, buildWeatherDetectText, isGreetingText } from '@/utility/weather-effect-detector.js';
import { hasSeenWeather, markSeenWeather } from '@/utility/weather-effect-seen.js';
import type { WeatherKind } from '@/utility/weather-effect-detector.js';
import { haptic, hapticConfirm } from '@/utility/haptic.js';

const { showEl } = scrollToVisibility();

const DESKTOP_THRESHOLD = 1100;
const MOBILE_THRESHOLD = 500;

// デスクトップでウィンドウを狭くしたときモバイルUIが表示されて欲しいことはあるので deviceKind === 'desktop' の判定は行わない
const isDesktop = ref(window.innerWidth >= DESKTOP_THRESHOLD);
const isMobile = ref(['smartphone', 'tablet'].includes(String(deviceKind)) || window.innerWidth <= MOBILE_THRESHOLD);
// 旗鯖fork(#15): 左マージン日付表示は十分な余白(タイムライン両脇)が必要なため、幅をリアクティブに追跡する。
const windowWidth = ref(window.innerWidth);
const LEFT_DATE_MIN_WIDTH = 1000;
const handleResize = () => {
	isMobile.value = deviceKind === 'smartphone' || window.innerWidth <= MOBILE_THRESHOLD;
	windowWidth.value = window.innerWidth;
};

window.addEventListener('resize', handleResize);

const noGap = !prefer.s.showGapBetweenNotesInTimeline;

// タイムラインアニメーション方向
const animationDirections = ['top', 'left', 'right'] as const;
const currentAnimationDirection = ref<'top' | 'left' | 'right'>(
	prefer.s.timelineAnimationDirection === 'random' 
		? animationDirections[Math.floor(Math.random() * animationDirections.length)]
		: (prefer.s.timelineAnimationDirection ?? 'top') as 'top' | 'left' | 'right'
);

// ノートが追加されるたびにランダムの場合は方向を更新
const updateAnimationDirection = () => {
	if (prefer.s.timelineAnimationDirection === 'random') {
		currentAnimationDirection.value = animationDirections[Math.floor(Math.random() * animationDirections.length)];
	}
};

// 設定変更を監視して反映
watch(() => prefer.s.timelineAnimationDirection, (newDirection) => {
	if (newDirection === 'random') {
		currentAnimationDirection.value = animationDirections[Math.floor(Math.random() * animationDirections.length)];
	} else {
		currentAnimationDirection.value = (newDirection ?? 'top') as 'top' | 'left' | 'right';
	}
});

const props = withDefaults(defineProps<{
	src: BasicTimelineType | 'mentions' | 'directs' | 'list' | 'antenna' | 'channel' | 'role';
	list?: string;
	antenna?: string;
	channel?: string;
	role?: string;
	sound?: boolean;
	customSound?: SoundStore | null;
	withRenotes?: boolean;
	withReplies?: boolean;
	withSensitive?: boolean;
	onlyFiles?: boolean;
	onlyCats?: boolean;
}>(), {
	withRenotes: true,
	withReplies: false,
	withSensitive: true,
	onlyFiles: false,
	onlyCats: false,
	sound: false,
	customSound: null,
});

provide('inTimeline', true);
provide('tl_withSensitive', computed(() => props.withSensitive));
provide('inChannel', computed(() => props.src === 'channel'));
// 旗鯖fork: C7 宴明滅機能。LTL(ローカルタイムライン)表示中かどうかをMkNoteへ伝える。
provide('inLocalTimeline', computed(() => props.src === 'local'));

// 旗鯖独自: ノート間隔（リアクティブ、デッキUIでは自動的にwideに）
const noteSpacingValue = computed(() => {
    const ui = miLocalStorage.getItem('ui');
    if (ui === 'deck') return 'wide';
    const v = prefer.r['simpleUi.noteSpacing']?.value ?? 'moderate';
    // 旗鯖fork(#15): HatasabaUI通常表示では「詰める(compact)」を廃止し moderate に丸める。
    // (HatasabaUIデッキ表示=ui:simple かつ deckMode は情報密度のため compact のまま許可)
    const deckMode = prefer.r['simpleUi.deckMode']?.value ?? false;
    if (ui === 'simple' && !deckMode && v === 'compact') return 'moderate';
    return v;
});

// 旗鯖独自: 吹き出し有効判定（デッキUIで無効化設定時はoff）
const isDeckUi = miLocalStorage.getItem('ui') === 'deck';
const isDefaultUi = miLocalStorage.getItem('ui') === 'default';
// 旗鯖fork(#4): HatasabaUI(simple) のデッキモード判定。
// deckMode はランタイムで切り替わる(デッキ⇔通常)ため computed にしてリアクティブにする。
// const で固定すると、デッキ表示中にマウントされた(v-showで隠れている)通常TLが
// 通常表示へ戻った後もデッキ時の吹き出し/間隔のままになる(タブ切替/リロードまで直らない)バグになる。
const isHatasabaDeck = computed(() => miLocalStorage.getItem('ui') === 'simple' && (prefer.r['simpleUi.deckMode']?.value ?? false));
const bubbleEnabled = computed(() => {
    // チャンネルTLでは強制的に吹き出しON
    if (props.src === 'channel') return true;
    if (isDeckUi && prefer.r['simpleUi.disableBubbleInDeck']?.value) return false;
    if (isDefaultUi && prefer.r['simpleUi.disableBubbleInDefault']?.value) return false;
    if (isHatasabaDeck.value && prefer.r['simpleUi.disableBubbleInHatasabaDeck']?.value) return false;
    return true;
});

// 旗鯖fork(#1): 宴枠(outline)の描き方を MkNote 側で吹き出し有無に合わせて切り替えるため、
// 吹き出し有効状態を子(MkNote)へ伝える。吹き出しON=枠を外側に、OFF=枠を内側に描く。
provide('noteBubbleEnabled', bubbleEnabled);

// 旗鯖独自: クラシック投稿間隔
// 旗鯖fork(#7): HatasabaUI(通常表示・デッキ表示の両方=ui:simple)では、従来Misskey風の投稿間隔
// (隙間0＋グレーのスペーサーで区切る)を強制ONにする。設定トグルでは変更不可(hata-custom側で無効化)。
const isHatasaba = miLocalStorage.getItem('ui') === 'simple';
const classicSpacingEnabled = computed(() => {
    if (isHatasaba) return true;
    return prefer.r['simpleUi.classicNoteSpacing']?.value ?? false;
});

// 旗鯖fork(#15): スマホ/狭幅でも日付をインライン表示するか(アクセシビリティ設定、既定OFF)。
const showDateOnMobile = computed(() => prefer.r['simpleUi.showTimelineDateOnMobile']?.value ?? false);
// 左マージン日付には両脇の余白が必要。スマホ or 幅が狭いときは「狭幅」とみなす。
const isNarrowForDate = computed(() => isMobile.value || windowWidth.value < LEFT_DATE_MIN_WIDTH);
// 旗鯖fork: 日付セパレータを左におしゃれに表示するか(デッキ/狭幅を除くデスクトップ通常表示)。
const dateOnLeft = computed(() => !isDeckUi && !isHatasabaDeck.value && !isNarrowForDate.value);
// 旗鯖fork(#15): 通常表示の狭幅/スマホで、トグルOFFのときは日付を非表示にする(従来の挙動)。
const dateHidden = computed(() => !isDeckUi && !isHatasabaDeck.value && isNarrowForDate.value && !showDateOnMobile.value);


// 旗鯖独自: アニメーション方向（リアクティブ — data-anim-dir属性で制御）
const animDir = computed(() => prefer.r.timelineAnimationDirection?.value ?? 'left');
const randomDirRef = ref<'top'|'left'|'right'>('left');
const animDirValue = computed(() => {
    if (animDir.value === 'random') return randomDirRef.value;
    return animDir.value;
});
function updateRandomDir() {
    const dirs: ('top'|'left'|'right')[] = ['top', 'left', 'right'];
    randomDirRef.value = dirs[Math.floor(Math.random() * 3)];
}

let paginator: IPaginator<Misskey.entities.Note>;

if (props.src === 'antenna') {
	paginator = markRaw(new Paginator('antennas/notes', {
		computedParams: computed(() => ({
			antennaId: props.antenna!,
		})),
		useShallowRef: true,
	}));
} else if (props.src === 'home') {
	paginator = markRaw(new Paginator('notes/timeline', {
		computedParams: computed(() => ({
			withRenotes: props.withRenotes,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
		})),
		useShallowRef: true,
	}));
} else if (props.src === 'local') {
	paginator = markRaw(new Paginator('notes/local-timeline', {
		computedParams: computed(() => ({
			withRenotes: props.withRenotes,
			withReplies: props.withReplies,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
		})),
		useShallowRef: true,
	}));
} else if (props.src === 'social') {
	paginator = markRaw(new Paginator('notes/hybrid-timeline', {
		computedParams: computed(() => ({
			withRenotes: props.withRenotes,
			withReplies: props.withReplies,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
		})),
		useShallowRef: true,
	}));
} else if (props.src === 'global') {
	paginator = markRaw(new Paginator('notes/global-timeline', {
		computedParams: computed(() => ({
			withRenotes: props.withRenotes,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
		})),
		useShallowRef: true,
	}));
} else if (props.src === 'media') {
	paginator = markRaw(new Paginator('notes/hybrid-timeline', {
		computedParams: computed(() => ({
			withRenotes: props.withRenotes,
			withReplies: false,
			withFiles: true,
			withCats: props.onlyCats,
		})),
		useShallowRef: true,
	}));
} else if (props.src === 'bubble') {
	paginator = markRaw(new Paginator('notes/bubble-timeline', {
		computedParams: computed(() => ({
			withRenotes: props.withRenotes,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
		})),
		useShallowRef: true,
	}));
} else if (props.src === 'mentions') {
	paginator = markRaw(new Paginator('notes/mentions', {
		useShallowRef: true,
	}));
} else if (props.src === 'directs') {
	paginator = markRaw(new Paginator('notes/mentions', {
		params: {
			visibility: 'specified',
		},
		useShallowRef: true,
	}));
} else if (props.src === 'list') {
	paginator = markRaw(new Paginator('notes/user-list-timeline', {
		computedParams: computed(() => ({
			withRenotes: props.withRenotes,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
			listId: props.list!,
		})),
		useShallowRef: true,
	}));
} else if (props.src === 'channel') {
	paginator = markRaw(new Paginator('channels/timeline', {
		computedParams: computed(() => ({
			channelId: props.channel!,
		})),
		useShallowRef: true,
	}));
} else if (props.src === 'role') {
	paginator = markRaw(new Paginator('roles/notes', {
		computedParams: computed(() => ({
			roleId: props.role!,
		})),
		useShallowRef: true,
	}));
} else {
	throw new Error('Unrecognized timeline type: ' + props.src);
}

// ===== 旗鯖fork: 天気エフェクト(weatherEffect) =====
// paginator 初期化後に定義する(currentWeather が paginator.items を参照するため)。
// TLのDOMには一切触らず、検出した天気を WeatherEffectManager に通知するだけ。
// 実際の描画は本家由来の body直下fixed canvas が行う(TLレイアウトに影響しない)。
const weatherEffectEnabled = computed(() => prefer.r['weatherEffect.enabled']?.value ?? false);
const weatherEffectScope = computed(() => prefer.r['weatherEffect.scope']?.value ?? 'note');
const weatherEffectDuration = computed(() => prefer.r['weatherEffect.duration']?.value ?? 'long');

// 読み込まれているノート群から現在の天気を集計する。
// scope='global' は先頭30件、'note' は先頭8件(直近の話題)を見る。
// 戻り値は { kind, ephemeral, noteId }。
//  - 挨拶(おはよう/おやすみ等)由来は常に短命。
//  - それ以外でも、演出の長さ設定が 'short' なら短命。
//  - 一度エフェクトを出したノート(発火済み)はスキップして次の天気ノートを探す。
const currentWeatherInfo = computed<{ kind: WeatherKind | null; ephemeral: boolean; noteId: string | null }>(() => {
	if (!weatherEffectEnabled.value) return { kind: null, ephemeral: false, noteId: null };
	if (props.src === 'media') return { kind: null, ephemeral: false, noteId: null }; // メディア一覧では出さない
	const items = paginator.items.value;
	if (items.length === 0) return { kind: null, ephemeral: false, noteId: null };
	const lookahead = weatherEffectScope.value === 'global' ? 30 : 8;
	const slice = items.slice(0, lookahead);
	for (const note of slice) {
		const text = buildWeatherDetectText(note);
		const w = detectWeather(text);
		if (w != null) {
			// 既にこのノートでエフェクトを出していたらスキップ(リロードしても再発火しない)
			if (hasSeenWeather(note.id)) continue;
			// 挨拶由来 or 演出の長さ=short のとき短命にする
			const ephemeral = isGreetingText(text) || weatherEffectDuration.value === 'short';
			return { kind: w, ephemeral, noteId: note.id };
		}
	}
	return { kind: null, ephemeral: false, noteId: null };
});

// 天気種別だけを取り出した computed(watchの比較を単純にするため)。
const currentWeather = computed<WeatherKind | null>(() => currentWeatherInfo.value.kind);

// マネージャに天気を反映する。実際にエフェクトを出すノートは発火済みとして記録し、
// 同じノートでは二度と発火しない(リロードをまたいでも)ようにする。
function applyWeather() {
	const info = currentWeatherInfo.value;
	getWeatherEffectManager().setWeather(info.kind, info.ephemeral);
	if (info.kind != null && info.noteId != null) {
		markSeenWeather(info.noteId);
	}
}

// enabledの変化をマネージャに反映
watch(weatherEffectEnabled, (en) => {
	getWeatherEffectManager().setEnabled(en);
	// 有効化直後は現在の天気をすぐ反映
	if (en) applyWeather();
}, { immediate: true });

// 天気の変化をマネージャに通知
watch(currentWeather, () => {
	applyWeather();
});

// このTLが破棄される時はエフェクトを片付ける。ただし即座には消さず遅延させる。
// タブ切替(TL再マウント)で同じ天気が続く場合、新しいTLが即座に同じ天気を要求して
// 遅延消去がキャンセルされるため、エフェクトが途切れず継続する。
// 本当にTLが無くなった場合(別画面へ遷移等)は猶予後に片付けられる。
onUnmounted(() => {
	getWeatherEffectManager().requestClear();
});

onMounted(() => {
	paginator.init();

	if (paginator.computedParams) {
		watch(paginator.computedParams, () => {
			paginator.reload();
		}, { immediate: false, deep: true });
	}
});

function isTop() {
	if (scrollContainer == null) return true;
	if (rootEl.value == null) return true;
	const scrollTop = scrollContainer.scrollTop;
	const tlTop = rootEl.value.offsetTop - scrollContainer.offsetTop;
	return scrollTop <= tlTop;
}

let scrollContainer: HTMLElement | null = null;

function onScrollContainerScroll() {
	if (isTop()) {
		paginator.releaseQueue();
	}
}

const rootEl = useTemplateRef('rootEl');
watch(rootEl, (el) => {
	if (el && scrollContainer == null) {
		scrollContainer = getScrollContainer(el);
		if (scrollContainer == null) return;
		scrollContainer.addEventListener('scroll', onScrollContainerScroll, { passive: true }); // ほんとはscrollendにしたいけどiosが非対応
	}
}, { immediate: true });

onUnmounted(() => {
	if (scrollContainer) {
		scrollContainer.removeEventListener('scroll', onScrollContainerScroll);
	}
	window.removeEventListener('resize', handleResize);
});

const visibility = useDocumentVisibility();
let isPausingUpdate = false;

watch(visibility, () => {
	if (visibility.value === 'hidden') {
		isPausingUpdate = true;
	} else { // 'visible'
		isPausingUpdate = false;
		if (isTop()) {
			releaseQueue();
		}
	}
});

let adInsertionCounter = 0;

const MIN_POLLING_INTERVAL = 1000 * 10;
const POLLING_INTERVAL =
	prefer.s.pollingInterval === 1 ? MIN_POLLING_INTERVAL * 1.5 * 1.5 :
	prefer.s.pollingInterval === 2 ? MIN_POLLING_INTERVAL * 1.5 :
	prefer.s.pollingInterval === 3 ? MIN_POLLING_INTERVAL :
	MIN_POLLING_INTERVAL;

if (!store.s.realtimeMode) {
	// TODO: 先頭のノートの作成日時が1日以上前であれば流速が遅いTLと見做してインターバルを通常より延ばす
	useInterval(async () => {
		paginator.fetchNewer({
			toQueue: !isTop() || isPausingUpdate,
		});
	}, POLLING_INTERVAL, {
		immediate: false,
		afterMounted: true,
	});

	useGlobalEvent('notePosted', (note) => {
		paginator.fetchNewer({
			toQueue: !isTop() || isPausingUpdate,
		});
	});
}

useGlobalEvent('noteDeleted', (noteId) => {
	paginator.removeItem(noteId);
});

function releaseQueue() {
	updateRandomDir(); // 旗鯖: ランダム方向更新
	haptic();
	paginator.releaseQueue();
	scrollToTop(rootEl.value!);
	hapticConfirm();
}

function prepend(note: Misskey.entities.Note & MisskeyEntity) {
	// ランダムモードの場合、ノート追加時にアニメーション方向を更新
	updateAnimationDirection();
	updateRandomDir(); // 旗鯖: ランダム方向更新

	adInsertionCounter++;

	if (instance.notesPerOneAd > 0 && adInsertionCounter % instance.notesPerOneAd === 0) {
		note._shouldInsertAd_ = true;
	}

	if (isTop() && !isPausingUpdate) {
		paginator.prepend(note);
	} else {
		paginator.enqueue(note);
	}

	if (props.sound) {
		if (props.customSound) {
			sound.playMisskeySfxFile(props.customSound);
		} else {
			sound.playMisskeySfx($i && (note.userId === $i.id) ? 'noteMy' : 'note');
		}
	}
}

const stream = store.s.realtimeMode ? useStream() : null;

const connections = {
	antenna: null as Misskey.IChannelConnection<Misskey.Channels['antenna']> | null,
	homeTimeline: null as Misskey.IChannelConnection<Misskey.Channels['homeTimeline']> | null,
	localTimeline: null as Misskey.IChannelConnection<Misskey.Channels['localTimeline']> | null,
	hybridTimeline: null as Misskey.IChannelConnection<Misskey.Channels['hybridTimeline']> | null,
	globalTimeline: null as Misskey.IChannelConnection<Misskey.Channels['globalTimeline']> | null,
	mediaTimeline: null as Misskey.IChannelConnection<Misskey.Channels['hybridTimeline']> | null,
	bubbleTimeline: null as Misskey.IChannelConnection<Misskey.Channels['bubbleTimeline']> | null,
	main: null as Misskey.IChannelConnection<Misskey.Channels['main']> | null,
	userList: null as Misskey.IChannelConnection<Misskey.Channels['userList']> | null,
	channel: null as Misskey.IChannelConnection<Misskey.Channels['channel']> | null,
	roleTimeline: null as Misskey.IChannelConnection<Misskey.Channels['roleTimeline']> | null,
};

function connectChannel() {
	if (stream == null) return;
	if (props.src === 'antenna') {
		if (props.antenna == null) return;
		connections.antenna = stream.useChannel('antenna', {
			antennaId: props.antenna,
		});
		connections.antenna.on('note', prepend);
	} else if (props.src === 'home') {
		connections.homeTimeline = stream.useChannel('homeTimeline', {
			withRenotes: props.withRenotes,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
		});
		connections.main = stream.useChannel('main');
		connections.homeTimeline.on('note', prepend);
	} else if (props.src === 'local') {
		connections.localTimeline = stream.useChannel('localTimeline', {
			withRenotes: props.withRenotes,
			withReplies: props.withReplies,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
		});
		connections.localTimeline.on('note', prepend);
	} else if (props.src === 'social') {
		connections.hybridTimeline = stream.useChannel('hybridTimeline', {
			withRenotes: props.withRenotes,
			withReplies: props.withReplies,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
		});
		connections.hybridTimeline.on('note', prepend);
	} else if (props.src === 'global') {
		connections.globalTimeline = stream.useChannel('globalTimeline', {
			withRenotes: props.withRenotes,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
		});
		connections.globalTimeline.on('note', prepend);
	} else if (props.src === 'media') {
		connections.hybridTimeline = stream.useChannel('hybridTimeline', {
			withRenotes: props.withRenotes,
			withReplies: false,
			withFiles: true,
			withCats: props.onlyCats,
		});
		connections.hybridTimeline.on('note', prepend);
	} else if (props.src === 'bubble') {
		connections.bubbleTimeline = stream.useChannel('bubbleTimeline', {
			withRenotes: props.withRenotes,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
		});
		connections.bubbleTimeline.on('note', prepend);
	} else if (props.src === 'mentions') {
		connections.main = stream.useChannel('main');
		connections.main.on('mention', prepend);
	} else if (props.src === 'directs') {
		const onNote = note => {
			if (note.visibility === 'specified') {
				prepend(note);
			}
		};
		connections.main = stream.useChannel('main');
		connections.main.on('mention', onNote);
	} else if (props.src === 'list') {
		if (props.list == null) return;
		connections.userList = stream.useChannel('userList', {
			withRenotes: props.withRenotes,
			withFiles: props.onlyFiles ? true : undefined,
			withCats: props.onlyCats,
			listId: props.list,
		});
		connections.userList.on('note', prepend);
	} else if (props.src === 'channel') {
		if (props.channel == null) return;
		connections.channel = stream.useChannel('channel', {
			channelId: props.channel,
		});
		connections.channel.on('note', prepend);
	} else if (props.src === 'role') {
		if (props.role == null) return;
		connections.roleTimeline = stream.useChannel('roleTimeline', {
			roleId: props.role,
		});
		connections.roleTimeline.on('note', prepend);
	}
}

function disconnectChannel() {
	for (const key in connections) {
		const conn = connections[key as keyof typeof connections];
		if (conn != null) {
			conn.dispose();
			connections[key as keyof typeof connections] = null;
		}
	}
}

if (store.s.realtimeMode) {
	connectChannel();
}

watch(() => [props.list, props.antenna, props.channel, props.role, props.withRenotes], () => {
	if (store.s.realtimeMode) {
		disconnectChannel();
		connectChannel();
	}
});
watch(() => props.withSensitive, reloadTimeline);
watch(() => paginator.queuedAheadItemsCount.value, (q) => {
	globalEvents.emit('queueUpdated', q);
});

onMounted(() => {
	globalEvents.on('reloadTimeline', () => reloadTimeline());
});

onUnmounted(() => {
	disconnectChannel();
});

function reloadTimeline() {
	return new Promise<void>((res) => {
		adInsertionCounter = 0;

		paginator.reload().then(() => {
			res();
		});
	});
}

defineExpose({
	reloadTimeline,
});
</script>

<style lang="scss" module>
.transition_new_enterActive,
.transition_new_leaveActive {
	transform: translateY(-64px);
}

.transition_x_move {
	transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1);
}

.transition_x_enterActive {
	transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.7s cubic-bezier(0.23, 1, 0.32, 1);

	&.note,
	.note {
		/* Skip Note Rendering有効時、TransitionGroupでnoteを追加するときに一瞬がくっとなる問題を抑制する */
		content-visibility: visible !important;
	}
}

.transition_x_leaveActive {
	transition: height 0.2s cubic-bezier(0,.5,.5,1), opacity 0.2s cubic-bezier(0,.5,.5,1);
}

/* 上からスライド（デフォルト） */
.transition_x_enterFrom_top {
	opacity: 0;
	transform: translateY(max(-64px, -100%));
}

/* 左からスライド */
.transition_x_enterFrom_left {
	opacity: 0;
	transform: translateX(-100%);
}

/* 右からスライド */
.transition_x_enterFrom_right {
	opacity: 0;
	transform: translateX(100%);
}

@supports (interpolate-size: allow-keywords) {
	.transition_x_leaveTo {
		interpolate-size: allow-keywords; // heightのtransitionを動作させるために必要
		height: 0;
	}
}

.transition_x_leaveTo {
	opacity: 0;
}

/* 旗鯖fork(#7): デッキUIのタイムライン最上部メッセージ「最新のノートです」 */
.deckTopMsg {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 5px;
	padding: 4px 8px 3px;
	font-size: 0.75em;
	font-weight: 600;
	color: var(--MI_THEME-fg);
	opacity: 0.45;
	user-select: none;

	> i {
		font-size: 1.05em;
	}
}

.notes {
	container-type: inline-size;

	&.noGap {
		background: var(--MI_THEME-panel);

		.note {
			border-bottom: solid 0.5px var(--MI_THEME-divider);
		}
	}

	&:not(.noGap) {
		background: var(--MI_THEME-bg);

		.note {
			background: var(--MI_THEME-panel);
			border-radius: var(--MI-radius);
		}
	}
}

/*
.note:not(:empty) {
	border-bottom: solid 0.5px var(--MI_THEME-divider);
}
 */

.new {
	--gapFill: 0.5px; // 上位ヘッダーの高さにフォントの関係などで少数が含まれると、レンダリングエンジンによっては隙間が表示されてしまうため、隙間を隠すために少しずらす

	position: sticky;
	top: calc(var(--MI-stickyTop, 0px) - var(--gapFill));
	z-index: 1000;
	width: 100%;
	box-sizing: border-box;
	padding: calc(10px + var(--gapFill)) 0 10px 0;
}

.new2 {
	position: sticky;
	top: calc(var(--MI-stickyTop, 0px) + 60px);
	z-index: 1000;
	width: 100%;
	margin: calc(-0.675em - 8px) 0;
	transition: opacity 0.5s, transform 0.5s;

	&:first-child {
		margin-top: calc(-0.675em - 8px - var(--MI-margin));
	}

	&.showEl {
		transform: translateY(calc(var(--MI-stickyTop, 0px) - 101px))
	}

	&.showElTab {
		transform: translateY(calc(var(--MI-stickyTop, 0px) - 181px))
	}

	&.reduceAnimation {
		transition: opacity 0s, transform 0s;
	}
}

/* 疑似progressive blur */
.newBg1, .newBg2 {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
}

.newBg1 {
	height: 100%;
	-webkit-backdrop-filter: var(--MI-blur, blur(2px));
	backdrop-filter: var(--MI-blur, blur(2px));
	mask-image: linear-gradient( /* 疑似Easing Linear Gradients */
		to top,
		rgb(0 0 0 / 0%) 0%,
		rgb(0 0 0 / 4.9%) 7.75%,
		rgb(0 0 0 / 10.4%) 11.25%,
		rgb(0 0 0 / 45%) 23.55%,
		rgb(0 0 0 / 55%) 26.45%,
		rgb(0 0 0 / 89.6%) 38.75%,
		rgb(0 0 0 / 95.1%) 42.25%,
		rgb(0 0 0 / 100%) 50%
	);
}

.newBg2 {
	height: 75%;
	-webkit-backdrop-filter: var(--MI-blur, blur(4px));
	backdrop-filter: var(--MI-blur, blur(4px));
	mask-image: linear-gradient( /* 疑似Easing Linear Gradients */
		to top,
		rgb(0 0 0 / 0%) 0%,
		rgb(0 0 0 / 4.9%) 15.5%,
		rgb(0 0 0 / 10.4%) 22.5%,
		rgb(0 0 0 / 45%) 47.1%,
		rgb(0 0 0 / 55%) 52.9%,
		rgb(0 0 0 / 89.6%) 77.5%,
		rgb(0 0 0 / 95.1%) 91.9%,
		rgb(0 0 0 / 100%) 100%
	);
}

.newButton {
	position: relative;
	display: block;
	padding: 6px 12px;
	border-radius: 999px;
	width: max-content;
	margin: auto;
	background: var(--MI_THEME-accent);
	color: var(--MI_THEME-fgOnAccent);
	font-size: 90%;

	&:hover {
		background: hsl(from var(--MI_THEME-accent) h s calc(l + 5));
	}

	&:active {
		background: hsl(from var(--MI_THEME-accent) h s calc(l - 5));
	}
}

.newButton2 {
	display: block;
	margin: var(--MI-margin) auto 0 auto;
	padding: 8px 16px;
	border-radius: 32px;

	> i {
		margin-right: 5px;
	}
}

.date {
	display: flex;
	font-size: 85%;
	align-items: center;
	justify-content: center;
	gap: 1em;
	padding: 8px 8px;
	margin: 0 auto;

	&.noGap {
		border-bottom: solid 0.5px var(--MI_THEME-divider);
	}

	/* 旗鯖fork(#15): HatasabaUIデッキ表示では日付セパレータの上下幅が空きすぎるため、
	   「最新のノートです」程度の高さに詰める。 */
	&.dateDeck {
		padding: 2px 8px 3px;
		font-size: 78%;
		opacity: 0.6;
	}

	/* 旗鯖fork: スマホ表示では日付の帯がノート(カード)と色が違って浮くため、ノートと同じ背景色にする。
	   旗鯖fork(#15): 上下幅が広すぎるため padding も詰める。 */
	&.dateMobile {
		background: var(--MI_THEME-panel);
		padding: 2px 8px 3px;
	}

	/* 旗鯖fork: デスクトップの通常表示では、日付をノートの左マージン(余白)に
	   絶対配置で上下2段(上=前の日付 / 下=次の日付)で表示する。
	   絶対配置にすることで日付が行を取らず、ノートが途切れず連続して並ぶ。 */
	&.dateLeft {
		position: absolute;
		/* 区切り線(prevとnextの境)が、ノートの境界(=ラッパー上端の灰色バー付近)に来るようにする。
		   時計アイコンは絶対配置でフローから外しているため、ブロックの縦中央 ≒ 区切り線になる。 */
		top: 1px;
		left: 0;
		transform: translateX(-100%) translateY(-50%);
		flex-direction: column;
		align-items: flex-end;
		justify-content: flex-start;
		gap: 2px;
		width: max-content;
		max-width: 104px;
		padding: 0 12px 0 0;
		margin: 0;
		font-size: 88%;
		font-weight: 700;
		line-height: 1.25;
		opacity: 0.85;
		color: var(--MI_THEME-accent);
		text-align: right;
		white-space: nowrap;
		background: transparent;
		border-bottom: none !important;
		pointer-events: none;

		/* 中央の区切り(縦線)を、2段表示では水平の細線にする(インラインstyleを上書き) */
		> span:nth-of-type(2) {
			width: 28px !important;
			height: 2px !important;
			border-radius: 2px;
			background: color-mix(in srgb, var(--MI_THEME-accent) 45%, transparent) !important;
			margin: 1px 0;
		}
	}

	/* 旗鯖fork: 左マージン日付表示に添える時計アイコン(おしゃれ用)。
	   絶対配置でフローから外し、区切り線がブロック中央に来る(=境界に揃う)のを妨げないようにする。 */
	.dateLeftIcon {
		position: absolute;
		bottom: calc(100% - 1px);
		left: 50%;
		transform: translateX(-50%);
		font-size: 1.4em;
		opacity: 0.9;
	}
}

/* 旗鯖fork: 左マージン日付表示のための相対配置コンテナ(日付の絶対配置の基準)。 */
.sepWrapLeft {
	position: relative;
}

/* 旗鯖fork(#15): 日付をインライン表示(デッキ/スマホ)するとき、セパレータラッパー内の
   日付↔ノート間の隙間(_gaps の gap=var(--MI-margin)≒14px)が広すぎるため詰める。 */
.sepWrapTight {
	gap: 3px !important;
}

.ad {
	&:not(.noGap) {
		padding: 8px;
		background-size: auto auto;
		background-image: repeating-linear-gradient(45deg, transparent, transparent 8px, var(--MI_THEME-bg) 8px, var(--MI_THEME-bg) 14px);
		border-bottom: solid 0.5px var(--MI_THEME-divider);
	}

	&:empty {
		display: none;
	}
}

.more {
	display: block;
	width: 100%;
	box-sizing: border-box;
	padding: 16px;
	background: var(--MI_THEME-panel);
}

.mediaGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(224px, 1fr));
	grid-gap: 6px;
}

@container (max-width: 785px) {
	.mediaGrid {
		grid-template-columns: repeat(auto-fill, minmax(192px, 1fr));
	}
}

@container (max-width: 660px) {
	.mediaGrid {
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	}
}

@container (max-width: 530px) {
	.mediaGrid {
		grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
	}
}

@container (max-width: 450px) {
	.mediaGrid {
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
	}
}
</style>

<!-- 旗鯖独自: グローバルCSS（CSS Modulesバイパス） -->
<style lang="scss">
/* ===== 吹き出しデザイン（data-bubble="on"時） ===== */
[data-bubble="on"] {
	background: transparent !important;
}
[data-bubble="on"] > div {
	border: none !important;
	background: transparent !important;
	border-radius: 0 !important;
	box-shadow: none !important;
	outline: none !important;
}
[data-bubble="on"] article {
	padding: 10px 10px 6px !important;
	background: transparent !important;
	border-bottom: none !important;
}

/* 大枠: bubbleBody（article直下のdiv） */
[data-bubble="on"] article > div {
	background: var(--MI_THEME-panel) !important;
	border-radius: 20px !important;
	padding: 12px !important;
	box-shadow: 0 2px 16px rgba(0,0,0,.06) !important;
	border: 2px solid color-mix(in srgb, var(--MI_THEME-divider) 60%, transparent) !important;
	transition: box-shadow .2s ease !important;
	position: relative !important;
	margin-bottom: 10px !important;
}
[data-bubble="on"] article > div:hover {
	box-shadow: 0 3px 20px rgba(0,0,0,.12) !important;
}

/* 大枠には突起なし */
[data-bubble="on"] article > div::after {
	display: none !important;
}

/* flex container（アバター+main）を透明に */
[data-bubble="on"] article > div > div {
	background: transparent !important;
	border: none !important;
	box-shadow: none !important;
	border-radius: 0 !important;
	padding: 0 !important;
}

/* 本文エリア */
[data-bubble="on"] [data-note-content] {
	background: color-mix(in srgb, var(--MI_THEME-accent) 5%, var(--MI_THEME-panel)) !important;
	border-radius: 12px !important;
	padding: 10px 12px !important;
	border: 2px solid color-mix(in srgb, var(--MI_THEME-accent) 25%, transparent) !important;
	position: relative !important;
	z-index: 1 !important;
	margin-top: 4px !important;
}

/* 本文の吹き出し突起（左向き、アイコンが呟いているように）
   端末ごとのにじみ(|が見える/枠線の太さがばらつく)を避けるため drop-shadow を使わず、
   枠線色の三角(::before)と本文色の三角(::after)を重ね、本文色を本文側へ1pxめり込ませて継ぎ目を消す。 */
[data-bubble="on"] [data-note-content]::before {
	content: '' !important;
	display: block !important;
	position: absolute !important;
	top: 11px !important;
	left: -8px !important;
	width: 0 !important;
	height: 0 !important;
	border-top: 7px solid transparent !important;
	border-bottom: 7px solid transparent !important;
	border-right: 8px solid color-mix(in srgb, var(--MI_THEME-accent) 25%, var(--MI_THEME-panel)) !important;
	z-index: 0 !important;
}
[data-bubble="on"] [data-note-content]::after {
	content: '' !important;
	display: block !important;
	position: absolute !important;
	top: 12px !important;
	left: -5px !important;
	width: 0 !important;
	height: 0 !important;
	border-top: 6px solid transparent !important;
	border-bottom: 6px solid transparent !important;
	border-right: 7px solid color-mix(in srgb, var(--MI_THEME-accent) 5%, var(--MI_THEME-panel)) !important;
	z-index: 1 !important;
}

/* リアクション+フッター wrapper */
[data-bubble="on"] [data-reactions-footer] {
	background: transparent !important;
	padding: 4px 12px 2px !important;
}

/* フッターボタン */
[data-bubble="on"] footer {
	margin: 4px 0 -8px !important;
}
[data-bubble="on"] footer button {
	padding: 6px 4px !important;
}
[data-bubble="on"] footer button + button {
	margin-left: 2px !important;
}

@media (max-width: 700px) {
	[data-bubble="on"] article {
		padding: 8px 6px 5px !important;
	}
	[data-bubble="on"] article > div {
		padding: 10px !important;
		border-radius: 18px !important;
	}
}

/* ===== 吹き出し無効化時 ===== */
:not([data-bubble="on"]) article {
	background: var(--MI_THEME-panel) !important;
}

/* ===== クラシック投稿間隔 ===== */
/* 旗鯖fork(#7): 従来Misskey風の表示間隔。隙間0＋ノート間を細い区切り線で区切る。
   - 浮いた隙間(flex gap / 吹き出しカードの下マージン)を消してノートを密着させる
   - 各ノート(.notes直下のdiv)の下に細い区切り線を置く
   旧実装は `> div > div`(=.root直下のdiv)を対象にしていたが通常ノートは .root 直下が
   <article>(div でない)のため当たらなかった。各ノート(`> div`)を直接対象にする。
   ※ デッキの「灰色バーのスペーサー」は別途 data-hatasaba-spacer で上書きする(デッキのみ)。 */
[data-classic-spacing="on"] {
	gap: 0 !important;
}
[data-classic-spacing="on"] article > div {
	margin-bottom: 0 !important;
}
[data-classic-spacing="on"] > div {
	margin-bottom: 0 !important;
	border-bottom: 1px solid var(--MI_THEME-divider) !important;
}
[data-classic-spacing="on"] > div:last-child {
	border-bottom: none !important;
}

/* ===== 旗鯖fork(#7): HatasabaUIデッキUIのみ、ノート間を灰色のスペーサー(バー)で区切る ===== */
/* クラシック投稿間隔の細い区切り線(1px)を、デッキでは太い灰色バーに上書きする(後勝ち)。 */
[data-hatasaba-spacer="on"] > div {
	border-bottom: 5px solid var(--MI_THEME-bg) !important;
}
[data-hatasaba-spacer="on"] > div:last-child {
	border-bottom: none !important;
}

/* ===== ノート間隔: compact ===== */
[data-spacing="compact"] article {
	margin-top: 0px !important;
	margin-bottom: 0px !important;
	padding-top: 4px !important;
	padding-bottom: 2px !important;
}
[data-spacing="compact"] article > div:last-child > div:nth-child(2) {
	padding-top: 6px !important;
	padding-bottom: 6px !important;
}
@media (max-width: 700px) {
	[data-spacing="compact"] article {
		margin-top: 0px !important;
		margin-bottom: 0px !important;
		padding-top: 4px !important;
		padding-bottom: 2px !important;
	}
}

/* ===== ノート間隔: wide ===== */
[data-spacing="wide"] article {
	margin-top: 8px !important;
	margin-bottom: 8px !important;
	padding-top: 14px !important;
	padding-bottom: 10px !important;
}
@media (max-width: 700px) {
	[data-spacing="wide"] article {
		margin-top: 6px !important;
		margin-bottom: 6px !important;
		padding-top: 10px !important;
		padding-bottom: 8px !important;
	}
}

/* ===== デッキUI時の投稿間区切り線 ===== */
[data-deck-ui="on"] > div {
	border-bottom: 2px solid var(--MI_THEME-divider) !important;
	padding-bottom: 8px !important;
}
[data-deck-ui="on"] > div:last-child {
	border-bottom: none !important;
}

/* ===== ノートアニメーション方向（グローバルクラス） ===== */
[data-anim-dir="top"] .hata-tl-enterFrom {
	opacity: 0;
	transform: translateY(max(-64px, -100%));
}
[data-anim-dir="left"] .hata-tl-enterFrom {
	opacity: 0;
	transform: translateX(max(-64px, -100%));
}
[data-anim-dir="right"] .hata-tl-enterFrom {
	opacity: 0;
	transform: translateX(min(64px, 100%));
}
.hata-tl-enterFrom {
	opacity: 0;
	transform: translateX(max(-64px, -100%));
}
</style>
