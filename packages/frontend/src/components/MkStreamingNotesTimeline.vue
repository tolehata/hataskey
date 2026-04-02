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
				<div v-if="i > 0 && isSeparatorNeeded(paginator.items.value[i -1].createdAt, note.createdAt)" :class="{ '_gaps': !noGap }" :data-scroll-anchor="note.id">
					<div :class="[$style.date, { [$style.noGap]: noGap }]">
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
import { haptic, hapticConfirm } from '@/utility/haptic.js';

const { showEl } = scrollToVisibility();

const DESKTOP_THRESHOLD = 1100;
const MOBILE_THRESHOLD = 500;

// デスクトップでウィンドウを狭くしたときモバイルUIが表示されて欲しいことはあるので deviceKind === 'desktop' の判定は行わない
const isDesktop = ref(window.innerWidth >= DESKTOP_THRESHOLD);
const isMobile = ref(['smartphone', 'tablet'].includes(String(deviceKind)) || window.innerWidth <= MOBILE_THRESHOLD);
const handleResize = () => {
	isMobile.value = deviceKind === 'smartphone' || window.innerWidth <= MOBILE_THRESHOLD;
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

// 旗鯖独自: ノート間隔（リアクティブ）
const noteSpacingValue = computed(() => prefer.r['simpleUi.noteSpacing']?.value ?? 'moderate');

// 旗鯖独自: 吹き出し有効判定（デッキUIで無効化設定時はoff）
const isDeckUi = miLocalStorage.getItem('ui') === 'deck';
const isDefaultUi = miLocalStorage.getItem('ui') === 'default';
const bubbleEnabled = computed(() => {
    if (isDeckUi && prefer.r['simpleUi.disableBubbleInDeck']?.value) return false;
    if (isDefaultUi && prefer.r['simpleUi.disableBubbleInDefault']?.value) return false;
    return true;
});

// 旗鯖独自: クラシック投稿間隔
const classicSpacingEnabled = computed(() => prefer.r['simpleUi.classicNoteSpacing']?.value ?? false);

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
	top: calc(var(--MI-stickyTop, 0px) + 8px);
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
	border-bottom: none !important;
	background: transparent !important;
	border-radius: 0 !important;
}
[data-bubble="on"] article {
	padding: 10px 10px 6px !important;
	background: transparent !important;
	border-bottom: none !important;
}
/* .main 全体を1つの吹き出しとして表示 */
[data-bubble="on"] article > div > div:last-child {
	background: color-mix(in srgb, var(--MI_THEME-panel) 85%, var(--MI_THEME-fg));
	border-radius: 16px;
	border: 1.5px solid color-mix(in srgb, var(--MI_THEME-divider) 80%, transparent);
	padding: 12px 14px;
	box-shadow: 0 1px 8px rgba(0,0,0,.06);
	transition: box-shadow .2s ease, border-color .2s ease;
	position: relative;
}
[data-bubble="on"] article > div > div:last-child:hover {
	box-shadow: 0 3px 16px rgba(0,0,0,.12);
	border-color: color-mix(in srgb, var(--MI_THEME-accent) 30%, var(--MI_THEME-divider));
}
/* 吹き出し内のヘッダーとコンテンツの隙間を詰める */
[data-bubble="on"] article > div > div:last-child > div {
        margin-top: 0 !important;
}
/* 吹き出し三角矢印（左上） */
[data-bubble="on"] article > div > div:last-child::before {
	content: '';
	position: absolute;
	top: -7px;
	left: 16px;
	width: 0;
	height: 0;
	border-left: 7px solid transparent;
	border-right: 7px solid transparent;
	border-bottom: 7px solid color-mix(in srgb, var(--MI_THEME-panel) 85%, var(--MI_THEME-fg));
	z-index: 1;
}
@media (max-width: 700px) {
	[data-bubble="on"] article {
		padding: 8px 6px 5px !important;
	}
	[data-bubble="on"] article > div > div:last-child {
		padding: 10px 12px;
		border-radius: 14px;
	}
	[data-bubble="on"] article > div > div:last-child::before {
		left: 12px;
	}
}

/* ===== クラシック投稿間隔 ===== */
[data-classic-spacing="on"] {
	gap: 0 !important;
}
[data-classic-spacing="on"] > div {
	margin-bottom: 0 !important;
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
