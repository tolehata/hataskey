<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hataskey UI 3 Beta の画面全体。デスクトップは「メニュー | タイムライン | 右ペイン」、
デッキ表示は既存の HataSaba デッキ、スマホは上タブ＋下ナビ＋ドロワーで構成する。
-->
<template>
<div ref="rootEl" :class="$style.root" :style="themeStyle" :data-hk3-theme="themeMode" :data-mobile="isMobile ? 'true' : undefined" :data-reduce-motion="reduceMotionActive ? 'true' : undefined" @pointerdown.capture="onPress">
	<!-- 通信中の表示。短い通信ではちらつかないよう、少し続いたときだけ上端に細い帯で出す。 -->
	<div :class="$style.busy" :data-on="busyShown ? 'true' : undefined" aria-hidden="true"><span></span></div>
	<!-- ===== デスクトップ ===== -->
	<div v-if="!isMobile" :class="$style.desktop" :style="{ gridTemplateColumns: desktopColumns }">
		<div data-hata-collapse-part :class="$style.navCell" :style="{ width: `${sideNavExpanded ? navWidth : 64}px` }" @pointerenter="onSideNavEnter" @pointerleave="sideNavHovered = false" @focusin="onSideNavFocus" @focusout="onSideNavBlur" @keydown.esc="closeSideNav">
			<Hk3SideNav :collapsed="!sideNavExpanded" :isDeck="deckActive" :deckAvailable="isHome" :postOpen="composeWindowOpen" :dark="themeMode === 'dark'" @post="toggleComposeWindow" @toggleTheme="toggleTheme" @mode="switchMode" @launchPadOpen="sideNavLaunchPadOpen = $event" @instanceMenuOpen="sideNavInstanceMenuOpen = $event"/>
		</div>

		<template v-if="deckActive">
			<div ref="deckBoxEl" data-hk3-stage data-hata-collapse-items :class="$style.deckCell">
				<HatasabaDeck :class="$style.deck" hk3/>
				<div v-if="composeWindowOpen" ref="composeWindowEl" data-hata-collapse-part :class="$style.window" :data-dragging="windowDragging ? 'true' : undefined" :style="windowStyle">
					<div :class="$style.windowBar" @pointerdown="startWindowDrag" @dblclick="windowPos = null">
						<GripHorizontal :size="16" :class="$style.windowGrip"/>
						<Pencil :size="15"/>
						<b :class="$style.windowTitle">{{ copy.note }}</b>
						<button type="button" :class="$style.windowBtn" :title="copy.resetWindow" @pointerdown.stop @click="windowPos = null"><PanelBottom :size="16"/></button>
						<button type="button" :class="[$style.windowBtn, $style.windowClose]" :title="i18n.ts.close" @pointerdown.stop @click="composeWindowOpen = false"><X :size="16"/></button>
					</div>
					<Hk3Composer ref="composerRef" menuPlacement="down"/>
				</div>
			</div>
		</template>
		<template v-else>
			<main data-hk3-stage :class="$style.main">
				<template v-if="isHome">
					<Hk3Timeline ref="timelineRef">
						<Hk3Composer ref="composerRef" :menuPlacement="prefer.r.hataskeyUi3ComposerPosition.value === 'top' ? 'down' : 'up'"/>
					</Hk3Timeline>
				</template>
				<div v-else :class="$style.page"><RouterView/></div>
			</main>
			<Hk3RightPane v-if="showRightPane" data-hk3-stage data-hata-collapse-part :class="$style.right"/>
		</template>
	</div>

	<!-- ===== スマホ ===== -->
	<div v-else :class="$style.mobile">
		<div :class="$style.safeTop"></div>
		<div :class="$style.scrim" :data-open="drawerOpen ? 'true' : undefined" @click="drawerOpen = false"></div>
		<div :class="$style.drawer" :data-open="drawerOpen ? 'true' : undefined" :data-hata-collapse-part="drawerOpen ? '' : undefined" :aria-hidden="!drawerOpen">
			<div :class="$style.safeTop"></div>
			<div :class="$style.drawerBody">
				<Hk3SideNav :dark="themeMode === 'dark'" :deckAvailable="false" @toggleTheme="toggleTheme" @mode="drawerOpen = false" @navigate="drawerOpen = false"/>
			</div>
		</div>

		<template v-if="isHome">
			<Hk3Timeline ref="timelineRef" compact>
				<Hk3Composer ref="composerRef" compact :menuPlacement="prefer.r.hataskeyUi3ComposerPosition.value === 'top' ? 'down' : 'up'"/>
			</Hk3Timeline>
		</template>
		<div v-else :class="[$style.page, $style.mobilePage]"><RouterView/></div>

		<TransitionGroup tag="nav" data-hata-collapse-group :class="$style.bottomNav" :css="!reduceMotionActive" :enterActiveClass="$style.bottomMotion" :leaveActiveClass="$style.bottomMotion" :enterFromClass="$style.bottomHidden" :leaveToClass="$style.bottomHidden">
			<button key="menu" type="button" :class="$style.bottomBtn" :data-active="drawerOpen ? 'true' : undefined" :title="copy.menu" :aria-expanded="drawerOpen" @click="drawerOpen = !drawerOpen"><component :is="drawerOpen ? X : Menu" :size="22"/></button>
			<button v-for="item in mobileNav" :key="item.path" type="button" :class="$style.bottomBtn" :data-active="item.active ? 'true' : undefined" :title="item.label" @click="goMobile(item.path)">
				<component :is="item.icon" :size="22"/>
				<span v-if="item.active" :class="$style.bottomLabel" :data-brand="item.brand ? 'true' : undefined">{{ item.label }}</span>
				<span v-if="item.badge" :class="$style.bottomBadge">{{ item.badge }}</span>
			</button>
			<button v-if="!isHome" key="post" type="button" :class="[$style.bottomBtn, $style.bottomPost]" :title="copy.note" @click="openMobilePost"><Pencil :size="22"/></button>
		</TransitionGroup>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue';
import { Bell, BookOpen, CalendarCheck, GripHorizontal, House, Menu, MessageSquareWarning, PanelBottom, Pencil, Search, X } from '@lucide/vue';
import type * as Misskey from 'cherrypick-js';
import type { Component } from 'vue';
import type { PostFormProps } from '@/types/post-form.js';
import Hk3SideNav from './Hk3SideNav.vue';
import Hk3Timeline from './Hk3Timeline.vue';
import Hk3Composer from './Hk3Composer.vue';
import Hk3RightPane from './Hk3RightPane.vue';
import { hk3CanAdoptPostForm, pushHk3Toast } from './hk3-state.js';
import type { Hk3Toast } from './hk3-state.js';
import { HK3_THEME_CONTEXT, hk3ThemeStyle, readHk3ThemeBase } from './hk3-theme.js';
import type { Hk3ThemeBase, Hk3ThemeMode } from './hk3-theme.js';
import RouterView from '@/components/global/RouterView.vue';
import * as os from '@/os.js';
import { useGlobalEvent } from '@/events.js';
import { pendingApiRequestsCount } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { store } from '@/store.js';
import { prefer } from '@/preferences.js';
import { mainRouter } from '@/router.js';
import { miLocalStorage } from '@/local-storage.js';
import { createHataskeyNotificationToasts, getToastDuration, registerNotificationPageContext } from '@/utility/hataskey-notification-toast.js';
import type { HataskeyNavbarNotice, HataskeyToast } from '@/utility/hataskey-notification-toast.js';
import { useHataskeyNavbarNotices } from '@/composables/use-hataskey-navbar-notices.js';
import { getActiveHataSideProfile, hataSideStudioStore, startHataSideStudioSync, stopHataSideStudioSync } from '@/utility/hata-side-studio.js';
import { createHataTimelineCollapseEffect } from '@/utility/hata-timeline-collapse-effect.js';
import { useStream } from '@/stream.js';

const HatasabaDeck = defineAsyncComponent(() => import('@/ui/_common_/hatasaba-deck.vue'));

const copy = i18n.ts._hata._hataskeyUi3;
const MOBILE_MAX = 700;
const DECK_MIN = 1000;
const RIGHT_PANE_MIN = 1200;

const rootEl = shallowRef<HTMLElement | null>(null);
const deckBoxEl = shallowRef<HTMLElement | null>(null);
const composeWindowEl = shallowRef<HTMLElement | null>(null);
const timelineRef = shallowRef<InstanceType<typeof Hk3Timeline> | null>(null);
const composerRef = shallowRef<InstanceType<typeof Hk3Composer> | null>(null);

// UI3 内のノートは、本体のリアルタイム設定に関係なく表示中の更新(リアクション等)を受け取る。
provide('forceNoteRealtimeCapture', true);

const width = ref(window.innerWidth);
const isMobile = computed(() => width.value <= MOBILE_MAX);
const path = computed(() => mainRouter.currentRoute.value.path);
const showRightPane = computed(() => width.value >= RIGHT_PANE_MIN && path.value !== '/hata-side-studio');
const isHome = computed(() => path.value === '/');
const deckMode = ref(miLocalStorage.getItem('hataskeyUi3DeckMode') === 'true');
const deckActive = computed(() => deckMode.value && isHome.value && width.value >= DECK_MIN);
const drawerOpen = ref(false);

const profile = computed(() => getActiveHataSideProfile(hataSideStudioStore.value));
const navWidth = computed(() => profile.value.expanded.width === 'wide' ? 232 : 200);
const sideNavHovered = ref(false);
const sideNavFocused = ref(false);
const sideNavLaunchPadOpen = ref(false);
const sideNavInstanceMenuOpen = ref(false);
const sideNavExpanded = computed(() => sideNavHovered.value || sideNavFocused.value || sideNavLaunchPadOpen.value || sideNavInstanceMenuOpen.value);

function onSideNavEnter(event: PointerEvent) {
	if (event.pointerType === 'mouse' || event.pointerType === 'pen') sideNavHovered.value = true;
}

async function onSideNavFocus(event: FocusEvent) {
	const target = event.target as HTMLElement;
	if (sideNavFocused.value || !target.matches(':focus-visible')) return;
	const container = event.currentTarget as HTMLElement;
	sideNavFocused.value = true;
	await nextTick();
	// 縮小・展開で項目のDOMが切り替わっても、キーボードの現在位置を保持する。
	if (!target.isConnected) {
		const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
		(buttons.find(button => button.title === target.title) ?? buttons[0])?.focus();
	}
}

function onSideNavBlur(event: FocusEvent) {
	if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) sideNavFocused.value = false;
}

function closeSideNav(event: KeyboardEvent) {
	sideNavHovered.value = false;
	sideNavFocused.value = false;
	(event.target as HTMLElement).blur();
}

const desktopColumns = computed(() => {
	if (deckActive.value) return '64px minmax(0, 1fr)';
	return `64px minmax(0, 1fr)${showRightPane.value ? ' 320px' : ''}`;
});

// ===== テーマ =====
const themeMode = computed<Hk3ThemeMode>(() => store.r.darkMode.value ? 'dark' : 'light');
// ユーザーのテーマ色に従う。テーマの切り替え・明暗の切り替えのたびに読み直す。
const themeBase = shallowRef<Hk3ThemeBase | null>(readHk3ThemeBase());

function refreshThemeBase() {
	themeBase.value = readHk3ThemeBase();
}

useGlobalEvent('themeChanged', refreshThemeBase);
const themeStyle = computed(() => hk3ThemeStyle(themeMode.value, themeBase.value));
provide(HK3_THEME_CONTEXT, themeStyle);
// 「UIのアニメーションを減らす」と端末の動きを減らす設定の両方に従う。CSSの遷移も含めて止める。
const systemReduceMotion = ref(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const reduceMotionActive = computed(() => !prefer.r.animation.value || systemReduceMotion.value);
const reduceMotion = () => reduceMotionActive.value;
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const timelineCollapseEffect = createHataTimelineCollapseEffect({
	root: () => rootEl.value,
	animationEnabled: () => !reduceMotionActive.value,
});
const timelineCollapseStream = useStream();

function onHataTimelineCollapse() {
	timelineCollapseEffect.play();
}

watch(reduceMotionActive, active => {
	if (active) timelineCollapseEffect.cancel();
});

function onReduceMotionChange(ev: MediaQueryListEvent) {
	systemReduceMotion.value = ev.matches;
}

watch(themeMode, () => {
	void nextTick(refreshThemeBase);
	if (reduceMotion()) return;
	rootEl.value?.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 360, easing: 'ease-out' });
});

function toggleTheme() {
	const toDark = themeMode.value !== 'dark';
	// 端末のダークモード同期中でも、UI3 のボタンは手動切替として扱う。
	if (prefer.s.syncDeviceDarkMode) prefer.commit('syncDeviceDarkMode', false);
	store.set('darkMode', toDark);
	pushHk3Toast({ icon: toDark ? 'moon' : 'sun', text: toDark ? copy.darkModeOn : copy.lightModeOn });
}

// ===== 標準/デッキ切替 =====
let switching = false;

async function switchMode(deck: boolean) {
	if (deck === deckMode.value || switching) return;
	const apply = () => {
		deckMode.value = deck;
		miLocalStorage.setItem('hataskeyUi3DeckMode', deck ? 'true' : 'false');
		if (!deck) composeWindowOpen.value = false;
	};
	if (reduceMotion() || !isHome.value) {
		apply();
		return;
	}
	switching = true;
	try {
		const stages = () => Array.from(rootEl.value?.querySelectorAll<HTMLElement>('[data-hk3-stage]') ?? []);
		const outs = stages().map((el, i, all) => el.animate([
			{ opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' },
			{ opacity: 0, transform: 'translateY(-20px)', clipPath: 'inset(0 0 100% 0)' },
		], { duration: 280, delay: (all.length - 1 - i) * 30, easing: 'cubic-bezier(0.64, 0, 0.78, 0)', fill: 'forwards' }));
		await Promise.allSettled(outs.map(a => a.finished));
		apply();
		await nextTick();
		outs.forEach(a => a.cancel());
		stages().forEach((el, i) => el.animate([
			{ opacity: 0, transform: 'translateY(-24px)', clipPath: 'inset(0 0 100% 0)' },
			{ opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' },
		], { duration: 560, delay: i * 90, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }));
	} finally {
		switching = false;
	}
}

// ===== 通信中の表示 =====
const BUSY_DELAY_MS = 300;
const busyShown = ref(false);
let busyTimer: number | null = null;
watch(() => pendingApiRequestsCount.value > 0, pending => {
	if (busyTimer != null) window.clearTimeout(busyTimer);
	busyTimer = null;
	if (!pending) {
		busyShown.value = false;
		return;
	}
	busyTimer = window.setTimeout(() => {
		busyTimer = null;
		busyShown.value = true;
	}, BUSY_DELAY_MS);
}, { immediate: true });
onBeforeUnmount(() => {
	if (busyTimer != null) window.clearTimeout(busyTimer);
});

// ===== デッキ時の投稿ウィンドウ =====
const composeWindowOpen = ref(false);
const windowPos = ref<{ x: number; y: number } | null>(null);
const windowDragging = ref(false);
// 既定の位置は画面中央より少し上。動かした後はその位置を保つ。
const windowStyle = computed(() => windowPos.value
	? { left: `${windowPos.value.x}px`, top: `${windowPos.value.y}px` }
	: { left: '50%', top: '42%', transform: 'translate(-50%, -50%)' });

function toggleComposeWindow() {
	composeWindowOpen.value = !composeWindowOpen.value;
	if (composeWindowOpen.value) void nextTick(() => composerRef.value?.focus());
}

function startWindowDrag(ev: PointerEvent) {
	if (ev.button !== 0) return;
	const win = composeWindowEl.value;
	const box = deckBoxEl.value;
	if (!win || !box) return;
	ev.preventDefault();
	// 既定位置は transform で中央寄せしているため、見た目の位置から始める。
	const winRect = win.getBoundingClientRect();
	const boxRect = box.getBoundingClientRect();
	const x0 = winRect.left - boxRect.left;
	const y0 = winRect.top - boxRect.top;
	const px = ev.clientX;
	const py = ev.clientY;
	const maxX = box.offsetWidth - win.offsetWidth;
	const maxY = box.offsetHeight - win.offsetHeight;
	windowDragging.value = true;
	windowPos.value = { x: x0, y: y0 };
	const move = (e: PointerEvent) => {
		windowPos.value = {
			x: Math.max(0, Math.min(maxX, x0 + e.clientX - px)),
			y: Math.max(0, Math.min(maxY, y0 + e.clientY - py)),
		};
	};
	const up = () => {
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', up);
		windowDragging.value = false;
	};
	window.addEventListener('pointermove', move);
	window.addEventListener('pointerup', up);
}

// ===== 投稿要求の受け取り =====
// 返信・引用などは、表示中の UI3 投稿欄へ移す。デッキ中は投稿ウィンドウを開いて受け取る。
function interceptPostForm(request: PostFormProps): boolean {
	if (!hk3CanAdoptPostForm(request)) return false;
	// スマホでは、ほかの画面からの投稿要求もホームへ戻って下の投稿欄で受け取る(古い投稿モーダルは使わない)。
	if (!isHome.value && isMobile.value) {
		pendingAdopt = request;
		drawerOpen.value = false;
		mainRouter.pushByPath('/' as never);
		return true;
	}
	if (!isHome.value) return false;
	if (composerRef.value) return composerRef.value.adopt(request);
	if (!deckActive.value) return false;
	composeWindowOpen.value = true;
	void nextTick(() => composerRef.value?.adopt(request));
	return true;
}

// ===== スマホ =====
// 下部ナビバーは設定の「下部ナビバー」(Hataskey UI と共通)の並びに従う。
// 左端のメニューと右端のノートボタンで挟み、全5ボタンになるよう中央は最大3つ。
// ウィジェットは UI3 のスマホ表示に置き場が無いため除く。
const MOBILE_NAV_SLOTS = 3;
const mobileNav = computed(() => {
	const unread = $i?.unreadNotificationsCount ?? 0;
	const catalog: Record<string, { path: string; label: string; icon: Component; badge: string | null; brand?: boolean }> = {
		home: { path: '/', label: copy.tabHome, icon: House, badge: null },
		search: { path: '/search', label: i18n.ts.search, icon: Search, badge: null },
		notifications: { path: '/my/notifications', label: i18n.ts.notifications, icon: Bell, badge: unread > 0 ? (unread > 99 ? '99+' : String(unread)) : null },
		hatask: { path: '/hatask', label: 'Hatask', icon: CalendarCheck, badge: null, brand: true },
		hatady: { path: '/hatady', label: 'Hatady', icon: BookOpen, badge: null, brand: true },
		hatafeed: { path: '/hatafeed', label: 'HataFeed', icon: MessageSquareWarning, badge: null, brand: true },
	};
	return (prefer.r['simpleUi.bottomNav'].value as { id: string; visible?: boolean }[])
		.filter(item => item.visible !== false && item.id in catalog)
		.slice(0, MOBILE_NAV_SLOTS)
		.map(item => catalog[item.id])
		.map(item => ({ ...item, active: item.path === '/' ? isHome.value : path.value.startsWith(item.path) }));
});

// 右端のノートボタン: タイムライン(ホーム)以外の画面にだけ出し、押すとホームへ戻って下の投稿欄に入力できる状態にする。
// ホームでは投稿欄が常に見えているため出さない。
const pendingComposerFocus = ref(false);

function openMobilePost() {
	drawerOpen.value = false;
	pendingComposerFocus.value = true;
	mainRouter.pushByPath('/' as never);
}

let pendingAdopt: PostFormProps | null = null;
watch(composerRef, composer => {
	if (composer && pendingAdopt) {
		const request = pendingAdopt;
		pendingAdopt = null;
		pendingComposerFocus.value = false;
		void nextTick(() => composer.adopt(request));
		return;
	}
	if (!composer || !pendingComposerFocus.value) return;
	pendingComposerFocus.value = false;
	void nextTick(() => composer.focus());
});

function goMobile(to: string) {
	drawerOpen.value = false;
	if (to === '/' && isHome.value) {
		timelineRef.value?.scrollTop();
		return;
	}
	mainRouter.pushByPath(to as never);
}

watch(path, () => { drawerOpen.value = false; });

// ===== 通知・お知らせをバナーへ =====
// Hataskey UI が上部ナビバーへ統合していた通知(通知・外部通知・時報・絵文字追加・お気に入り/クリップ/編集/削除など)を、
// タイムライン表示中は同じ受け口で受け取り、新着バナーに流す。タイムライン以外では従来どおりの通知表示に戻る。
const noticeContext = createHataskeyNotificationToasts(computed(() => false), computed(() => true));
let releaseNoticeContext: (() => void) | null = null;
useHataskeyNavbarNotices(noticeContext, computed(() => $i != null && isHome.value));

function notificationToast(notification: Misskey.entities.Notification, host?: string): Omit<Hk3Toast, 'id'> {
	const user = 'user' in notification ? (notification.user as Misskey.entities.UserLite | undefined) ?? null : null;
	const name = user ? (user.name || user.username) : '';
	const open = () => mainRouter.pushByPath((host ? '/my/external-notifications' : '/my/notifications') as never);
	const base = { user, emojiHost: host, onClick: open };
	switch (notification.type) {
		case 'reaction': return { ...base, icon: 'heart', text: i18n.tsx._hata._hataskeyUi3.toastReaction({ name }) };
		case 'reply': return { ...base, icon: 'reply', text: i18n.tsx._hata._hataskeyUi3.toastReply({ name }) };
		case 'renote': return { ...base, icon: 'repeat', text: i18n.tsx._hata._hataskeyUi3.toastRenote({ name }) };
		case 'quote': return { ...base, icon: 'quote', text: i18n.tsx._hata._hataskeyUi3.toastQuote({ name }) };
		case 'mention': return { ...base, icon: 'mention', text: i18n.tsx._hata._hataskeyUi3.toastMention({ name }) };
		case 'follow': return { ...base, icon: 'userPlus', text: i18n.tsx._hata._hataskeyUi3.toastFollow({ name }) };
		case 'receiveFollowRequest': return { ...base, icon: 'userPlus', text: i18n.tsx._hata._hataskeyUi3.toastFollowRequest({ name }) };
		case 'pollEnded': return { ...base, icon: 'poll', text: copy.toastPollEnded };
		default: return { ...base, icon: 'bell', text: copy.toastGeneric };
	}
}

function navbarNoticeToast(notice: HataskeyNavbarNotice): Omit<Hk3Toast, 'id'> {
	const navCopy = i18n.ts._hata._navbarNotice;
	switch (notice.kind) {
		case 'hourlyTime': return { icon: 'clock', text: i18n.tsx._hata._navbarNotice.timeSignal({ time: notice.time }) };
		case 'emojiAdded': return { icon: 'smile', emojiUrl: notice.emoji.url, text: `${navCopy.emojiPrefix} :${notice.emoji.name}: ${navCopy.emojiRest}` };
		case 'noteAction': {
			const icon = ({ favorite: 'star', clip: 'clip', edit: 'pencil', delete: 'trash' } as const)[notice.action];
			const target = notice.target;
			return { icon, text: notice.message, onClick: typeof target === 'string' && target.startsWith('/') ? () => mainRouter.pushByPath(target as never) : undefined };
		}
		case 'status': return { icon: notice.icon === 'posted' ? 'send' : 'check', text: notice.message };
	}
}

function toastFromItem(item: HataskeyToast): Omit<Hk3Toast, 'id'> {
	if (item.source !== 'status') return notificationToast(item.notification, item.source === 'external' ? item.host ?? '' : undefined);
	if (item.navbarNotice) return navbarNoticeToast(item.navbarNotice);
	return { icon: item.favoriteSaved ? 'star' : 'check', user: item.welcomeUser ?? null, welcome: !!item.welcomeUser, text: item.message };
}

// 受け口に入った順にバナーへ渡し、受け口自体は空にしておく(表示時間はバナー側で管理する)。
watch(noticeContext.items, items => {
	if (items.length === 0) return;
	const incoming = [...items].reverse();
	noticeContext.clear();
	if (!isHome.value || isMobile.value && drawerOpen.value) return;
	for (const item of incoming) pushHk3Toast(toastFromItem(item), getToastDuration(item));
});

function onExternalNotification(ev: Event) {
	if (!isHome.value) return;
	const notification = (ev as CustomEvent<Misskey.entities.Notification>).detail;
	if (notification) noticeContext.enqueue(notification, 'external', performance.now(), prefer.s['external.host'] || undefined);
}

// ===== 押下時のアイコン演出 =====
function onPress(ev: PointerEvent) {
	if (reduceMotion()) return;
	const button = (ev.target as HTMLElement | null)?.closest('button');
	const icon = button?.querySelector('svg.lucide');
	if (!icon || !rootEl.value?.contains(button!)) return;
	icon.animate([
		{ transform: 'scale(1) translateY(0) rotate(0)' },
		{ transform: 'scale(0.7) translateY(3px) rotate(-8deg)', offset: 0.25 },
		{ transform: 'scale(1.22) translateY(-4px) rotate(6deg)', offset: 0.6 },
		{ transform: 'scale(1) translateY(0) rotate(0)' },
	], { duration: 460, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
}

function onResize() {
	width.value = window.innerWidth;
}

let releasePostFormInterceptor: (() => void) | null = null;

onMounted(() => {
	timelineCollapseStream.on('hataTimelineCollapse', onHataTimelineCollapse);
	window.addEventListener('resize', onResize, { passive: true });
	reduceMotionQuery.addEventListener('change', onReduceMotionChange);
	startHataSideStudioSync();
	releasePostFormInterceptor = os.registerPostFormInterceptor(interceptPostForm);
	// MkToast などが統合表示を選べるよう、受け口の表示先を持たせる。
	noticeContext.target.value = rootEl.value;
	releaseNoticeContext = registerNotificationPageContext(noticeContext, () => isHome.value && !(isMobile.value && drawerOpen.value));
	window.addEventListener('external-notification', onExternalNotification);
});

onBeforeUnmount(() => {
	timelineCollapseStream.off('hataTimelineCollapse', onHataTimelineCollapse);
	timelineCollapseEffect.destroy();
	window.removeEventListener('resize', onResize);
	reduceMotionQuery.removeEventListener('change', onReduceMotionChange);
	stopHataSideStudioSync();
	releasePostFormInterceptor?.();
	releaseNoticeContext?.();
	window.removeEventListener('external-notification', onExternalNotification);
});
</script>

<style lang="scss" module>
.busy {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 4000000;
	height: 3px;
	overflow: hidden;
	pointer-events: none;
	opacity: 0;
	transition: opacity 200ms ease;

	&[data-on] { opacity: 1; }
	&:not([data-on]) > span { animation-play-state: paused; }

	> span {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 40%;
		background: var(--hk3-accent);
		animation: hk3Busy 1.1s cubic-bezier(0.45, 0, 0.55, 1) infinite;
	}

	.root[data-reduce-motion] & > span { left: 0; width: 100%; animation: none; opacity: 0.7; }
}

@keyframes hk3Busy {
	from { left: -40%; }
	to { left: 100%; }
}

.root {
	position: relative;
	width: 100%;
	height: var(--MI-viewport-height, 100dvh);
	min-width: 0;
	min-height: 0;
	overflow: hidden;
	background: var(--hk3-bg);
	color: var(--hk3-text);
	font-family: 'LINE Seed JP', var(--MI-font, sans-serif);

	:global(button), :global(input), :global(textarea), :global(select) { font-family: inherit; }
	:global(a) { color: var(--hk3-accent-700); }
	:global(button:focus-visible), :global(a:focus-visible) { outline: 2px solid var(--hk3-accent); outline-offset: 2px; }
	::selection { background: var(--hk3-accent-200); }

	// 動きを減らす設定中は、UI3 内のCSS遷移・アニメーションをすべて止める。
	&[data-reduce-motion],
	&[data-reduce-motion] :global(*),
	&[data-reduce-motion] :global(*)::before,
	&[data-reduce-motion] :global(*)::after {
		transition: none !important;
		animation: none !important;
	}
}

.desktop {
	display: grid;
	width: 100%;
	height: 100%;
	min-height: 0;
}

.navCell {
	position: relative;
	z-index: 50;
	height: 100%;
	min-width: 0;
	min-height: 0;
	isolation: isolate;
	overflow: hidden;
	transition: width 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.main {
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	border-right: 2px solid var(--hk3-divider);
}

// 各領域は独立した重なり順を持たせ、中のページの z-index(検索欄の固定ヘッダーなど)が
// UI3 の引き出し・投稿窓・バナーより上に出ないようにする。body 直下のポップアップには影響しない。
.page {
	position: relative;
	isolation: isolate;
	flex: 1;
	min-width: 0;
	min-height: 0;
	overflow: auto;
	overscroll-behavior: contain;
	background: var(--MI_THEME-bg);
	container-type: inline-size;
}

.right {
	position: relative;
	isolation: isolate;
	min-width: 0;
	min-height: 0;
}

.deckCell {
	position: relative;
	min-width: 0;
	min-height: 0;
	display: flex;
	flex-direction: column;
	background: var(--hk3-neutral-200);
}

.deck {
	position: relative;
	isolation: isolate;
	flex: 1;
	min-height: 0;
}

.window {
	position: absolute;
	z-index: 30;
	width: 560px;
	max-width: calc(100% - 16px);
	display: flex;
	flex-direction: column;
	background: var(--hk3-bg);
	border: 2px solid var(--hk3-text);
	box-shadow: var(--hk3-shadow-lg);
	transition: box-shadow 200ms ease;

	&[data-dragging] { box-shadow: var(--hk3-shadow-lg), 0 0 0 4px var(--hk3-accent-200); }
}

.windowBar {
	display: flex;
	align-items: center;
	gap: 10px;
	height: 38px;
	padding: 0 4px 0 12px;
	flex: none;
	background: var(--hk3-text);
	color: var(--hk3-bg);
	cursor: grab;
	user-select: none;
	touch-action: none;

	.window[data-dragging] & { cursor: grabbing; }
}

.windowGrip { opacity: 0.7; }

.windowTitle {
	flex: 1;
	font-size: 13px;
}

.windowBtn {
	width: 32px;
	height: 32px;
	border: 0;
	background: transparent;
	color: var(--hk3-bg);
	cursor: pointer;
	display: grid;
	place-items: center;

	&:hover { background: var(--hk3-neutral-800); }
}

.windowClose:hover { background: var(--hk3-accent); }

// ===== スマホ =====
.mobile {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-height: 0;
	overflow: hidden;
}

.safeTop {
	height: env(safe-area-inset-top, 0px);
	flex: none;
}

.mobilePage {
	flex: 1;
}

// 引き出しと背面の幕は、ページが body 直下に出す固定要素(検索欄など z-index 100 前後)より上、
// メニュー・ダイアログなどのポップアップ(z-index 100万台)より下に置く。
.scrim {
	position: absolute;
	inset: 0;
	z-index: 900;
	background: color-mix(in srgb, var(--hk3-neutral-900) 45%, transparent);
	opacity: 0;
	pointer-events: none;
	transition: opacity 320ms ease;

	&[data-open] { opacity: 1; pointer-events: auto; }
}

.drawer {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	z-index: 901;
	width: min(300px, 86vw);
	display: flex;
	flex-direction: column;
	background: var(--hk3-bg);
	border-right: 2px solid var(--hk3-divider);
	transform: translateX(-104%);
	visibility: hidden;
	transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 420ms ease, visibility 0s linear 420ms;

	&[data-open] {
		transform: translateX(0);
		visibility: visible;
		box-shadow: var(--hk3-shadow-lg);
		transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 420ms ease, visibility 0s;
	}
}

.drawerBody {
	position: relative;
	flex: 1;
	min-height: 0;
}

.bottomNav {
	display: flex;
	height: 68px;
	padding-bottom: env(safe-area-inset-bottom, 0px);
	flex: none;
	border-top: 2px solid var(--hk3-divider);
	background: var(--hk3-bg);
}

.bottomBtn {
	position: relative;
	flex: 1 1 0;
	min-width: 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	padding: 0 8px;
	border: 0;
	border-right: 1px solid var(--hk3-divider);
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;
	font-size: 10px;
	font-weight: 700;
	transition: background 200ms ease, color 200ms ease;

	&:last-child { border-right: 0; }
	&[data-active] { background: var(--hk3-accent-100); color: var(--hk3-accent-800); }
	&:first-child[data-active] { background: var(--hk3-text); color: var(--hk3-bg); }
	&:active { background: var(--hk3-accent-200); }
}

.bottomMotion {
	transition: flex-grow 320ms cubic-bezier(0.22, 1, 0.36, 1), padding 320ms ease, border-width 320ms ease, opacity 220ms ease;
	pointer-events: none;
}

.bottomHidden {
	flex-grow: 0;
	padding-inline: 0;
	border-right-width: 0;
	opacity: 0;
}

.bottomPost {
	background: var(--hk3-accent);
	color: var(--hk3-bg);

	&:active { background: var(--hk3-accent-600); }
}

.bottomLabel {
	line-height: 1;
	white-space: nowrap;

	&[data-brand] { font-family: 'Righteous', system-ui, sans-serif; font-weight: 400; letter-spacing: 0.02em; }
}

.bottomBadge {
	position: absolute;
	top: 12px;
	left: calc(50% + 6px);
	padding: 0 5px;
	background: var(--hk3-accent);
	color: var(--hk3-bg);
	font-size: 10px;
	font-weight: 800;
}

@media (prefers-reduced-motion: reduce) {
	.scrim, .drawer, .window, .bottomBtn { transition: none !important; }
}
</style>

<style>
/* Hataskey UI 3 のロゴ・独自ツール名(Hatask など)に使う書体。UI3 だけを開いたときも読み込まれるようここで宣言する。 */
@font-face {
	font-family: 'Righteous';
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
}
</style>
