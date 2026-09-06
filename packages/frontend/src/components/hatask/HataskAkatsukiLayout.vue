<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section
	ref="rootEl"
	class="htk-akatsuki-layout"
	:data-enabled="enabled"
	:data-mode="mode"
	:data-motion="enabled ? (motionEnabled ? 'on' : 'off') : undefined"
	:data-rail-collapsed="railCollapsed"
	:data-tab="activeTab"
	:data-hide-aside="hideAside"
	:data-nav-hidden="navHidden"
	:data-searching="searching"
	:data-fab-open="fabOpen"
	:style="layoutStyle"
	:aria-busy="enabled ? model.loading : undefined"
	@keydown.esc="closeTransient"
>
	<aside v-if="enabled" class="hak-rail" aria-label="Hatask ナビゲーション">
		<div class="hak-rail-head">
			<button class="hak-rail-menu hak-icon" type="button" :aria-expanded="!railCollapsed" aria-label="メニューを開閉" @click="railExpanded = railCollapsed">
				<i class="ti ti-menu-2" aria-hidden="true"></i>
			</button>
			<div class="hak-rail-brand hak-brand">Hatask</div>
		</div>
		<button v-for="tab in desktopTabs" :key="tab.id" class="hak-rail-tab" type="button" :aria-label="tab.label" :title="railCollapsed ? tab.label : undefined" :aria-current="activeTab === tab.id ? 'page' : undefined" @click="navigate(tab.id)">
			<i :class="tab.icon" aria-hidden="true"></i><span class="hak-rail-label">{{ tab.label }}</span>
		</button>
		<div class="hak-rail-space"></div>
		<button class="hak-rail-tab" type="button" aria-label="Hatask を閉じる" :title="railCollapsed ? 'Hatask を閉じる' : undefined" @click="dispatch({ type: 'exit' })">
			<i class="ti ti-logout-2" aria-hidden="true"></i><span class="hak-rail-label">Hatask を閉じる</span>
		</button>
	</aside>
	<div ref="scrollEl" class="hak-scroll" @scroll.passive="onScroll">
		<header v-if="enabled" class="hak-desktop-top">
			<form class="hak-desktop-case" role="search" @submit.prevent="submitSearch">
				<span class="hak-date hak-round">{{ dateLabel }}</span>
				<span class="hak-dow">{{ weekdayLabel }}</span>
				<label class="hak-desktop-search"><i class="ti ti-search" aria-hidden="true"></i><input ref="desktopSearchEl" v-model="searchQuery" type="search" placeholder="Hatask を検索" aria-label="Hatask を検索" :aria-controls="searchOpen ? searchResultsId : undefined"></label>
				<time v-if="model.showClock !== false" class="hak-clock hak-num">{{ clockLabel }}</time>
				<button class="hak-icon" type="button" aria-label="Hatask 設定" @click="emit('settings')"><i class="ti ti-settings" aria-hidden="true"></i></button>
			</form>
		</header>
		<header v-if="enabled" class="hak-mobile-head">
			<form class="hak-mobile-case" role="search" @submit.prevent="submitSearch">
				<span class="hak-mobile-brand hak-brand">Hatask</span>
				<label class="hak-mobile-search" :aria-hidden="!searching"><i class="ti ti-search" aria-hidden="true"></i><input ref="mobileSearchEl" v-model="searchQuery" type="search" placeholder="Hatask を検索" aria-label="Hatask を検索" :aria-controls="searchOpen ? searchResultsId : undefined" :disabled="!searching"></label>
				<button ref="searchToggleEl" class="hak-icon hak-search-toggle" type="button" :aria-expanded="searching" :aria-label="searching ? '検索を閉じる' : '検索'" @click="toggleSearch"><i :class="searching ? 'ti ti-x' : 'ti ti-search'" aria-hidden="true"></i></button>
				<button class="hak-icon hak-mobile-gear" type="button" aria-label="Hatask 設定" :tabindex="searching ? -1 : undefined" :aria-hidden="searching" @click="emit('settings')"><i class="ti ti-settings" aria-hidden="true"></i></button>
			</form>
		</header>
		<div v-if="enabled" class="hak-search-disclosure" :data-open="!!searchOpen" :inert="!searchOpen" :aria-hidden="!searchOpen">
			<div class="hak-search-disclosure-clip">
				<section :id="searchResultsId" class="hak-search-results" aria-label="Hatask の検索結果" :style="{ maxHeight: `${Math.max(120, rootHeight * .5)}px` }">
					<div class="hak-search-results-head"><h2>検索結果</h2><button type="button" class="hak-icon" aria-label="検索結果を閉じる" @click="closeSearchResults"><i class="ti ti-x" aria-hidden="true"></i></button></div>
					<slot name="search-results"></slot>
				</section>
			</div>
		</div>
		<div ref="bodyEl" class="hak-body">
			<div ref="centerEl" class="hak-center" :role="enabled ? 'main' : undefined">
				<section v-if="enabled" v-show="activeTab === 'home'" class="hak-home" aria-label="ホーム">
					<div class="hak-home-summary">
						<div class="hak-mobile-date"><span class="hak-date hak-round">{{ dateLabel }}</span><span class="hak-dow">{{ weekdayLabel }}</span><span v-if="model.dayCountLabel" class="hak-day-count hak-num">{{ model.dayCountLabel }}</span></div>
						<p>{{ model.loading ? '記録を読み込んでいます' : model.summary || 'きょうの予定と記録を、ここから' }}</p>
					</div>
					<div v-if="model.showEvents !== false" class="hak-next">
						<p v-if="model.scheduleUnavailable && !model.loading" role="status">予定を読み込めませんでした</p>
						<template v-if="model.next && !model.loading">
							<h1 class="hak-round"><span class="hak-next-lead">つぎは、</span><span class="hak-next-title">{{ model.next.title }}</span></h1>
							<p>{{ model.next.meta || model.next.timeLabel }}<template v-if="model.next.detail"><br>{{ model.next.detail }}</template></p>
							<div class="hak-actions">
								<template v-if="model.next.buttons?.length">
									<button v-for="(button, index) in model.next.buttons" :key="index" class="hak-action-button" :data-primary="button.primary" type="button" :disabled="button.disabled" @click="dispatch(button.action)"><i v-if="button.icon" :class="button.icon" aria-hidden="true"></i>{{ button.label }}</button>
								</template>
								<button v-else class="hak-action-button" data-primary="true" type="button" @click="openEvent(model.next)"><i class="ti ti-calendar-event" aria-hidden="true"></i>予定を開く</button>
							</div>
						</template>
						<template v-else-if="!model.loading && !model.scheduleUnavailable"><h1 class="hak-round"><span class="hak-next-lead">つぎの予定は、</span><span class="hak-next-title">まだありません</span></h1><div class="hak-actions"><button class="hak-action-button" data-primary="true" type="button" @click="dispatch({ type: 'create-event' })"><i class="ti ti-plus" aria-hidden="true"></i>予定を追加</button></div></template>
					</div>
					<div v-if="model.showEvents !== false && !model.scheduleUnavailable" class="hak-timeline" role="group" aria-label="きょうの時間帯別の予定">
						<div v-if="activeTimelineEntry" class="hak-timeline-label" :style="{ '--hak-label-left': `${activeTimelineEntry.left}%`, '--hak-label-width': `${100 - activeTimelineEntry.left}%` }"><strong class="hak-num">{{ activeTimelineEntry.event.timeLabel }}</strong><span>{{ activeTimelineEntry.event.title }}</span></div>
						<span class="hak-time-axis" aria-hidden="true"></span>
						<span v-for="tick in timelineTicks" :key="tick.minute" class="hak-time-tick hak-num" :data-major="tick.major" :style="{ left: `${tick.left}%` }" aria-hidden="true">{{ tick.label }}</span>
						<button v-for="entry in timelineEntries" :key="entry.event.id" class="hak-time-block" :data-main="entry.event.id === model.next?.id" :style="{ left: `${entry.left}%`, width: `${entry.width}%` }" type="button" :aria-label="`${entry.event.timeLabel} ${entry.event.title}`" :title="`${entry.event.timeLabel} ${entry.event.title}`" @click="openEvent(entry.event)"><span></span></button>
						<span v-if="nowPosition !== null" class="hak-time-now" :style="{ left: `${nowPosition}%` }" role="img" :aria-label="`現在 ${clockLabel}`"></span>
					</div>
					<section v-if="model.showEvents !== false && !model.scheduleUnavailable" class="hak-later" aria-label="このあと">
						<h2 class="hak-section-heading hak-round">このあと</h2>
						<button v-for="entry in model.later ?? []" :key="entry.id" class="hak-later-row" type="button" :disabled="model.loading" @click="openEvent(entry)"><span class="hak-later-time hak-num">{{ entry.timeLabel }}</span><span class="hak-dot" :data-muted="entry.muted" aria-hidden="true"></span><span class="hak-later-title">{{ entry.title }}</span><i class="ti ti-chevron-right" aria-hidden="true"></i></button>
						<p v-if="!model.loading && !model.later?.length" class="hak-empty">このあとの予定はありません</p>
					</section>
					<div v-if="model.stats?.length && !model.loading" class="hak-stats">
						<component :is="stat.tab ? 'button' : 'div'" v-for="stat in model.stats" :key="stat.id" class="hak-stat" :type="stat.tab ? 'button' : undefined" @click="stat.tab && navigate(stat.tab)"><span class="hak-stat-label hak-round">{{ stat.label }}</span><span class="hak-stat-value"><strong class="hak-num">{{ stat.value }}</strong><span v-if="stat.unit">{{ stat.unit }}</span></span></component>
					</div>
					<div v-if="!model.loading && (model.meals?.length || model.flower)" class="hak-rich-grid">
						<section v-if="model.meals?.length"><h2 class="hak-section-heading hak-round">きょうのごはん</h2><button v-for="(meal, index) in model.meals" :key="meal.id" class="hak-rich-row" type="button" :disabled="meal.unavailable" @click="dispatch({ type: 'record-meal', id: meal.id })"><i :class="['ti', ['ti-sunrise', 'ti-sun', 'ti-moon'][index] ?? 'ti-soup']" aria-hidden="true"></i><span class="hak-rich-slot">{{ meal.label }}</span><span class="hak-rich-copy">{{ meal.text }}</span><span v-if="!meal.unavailable" class="hak-rich-status" :data-pending="!meal.recorded">{{ meal.recorded ? '記録済' : '未記録' }}</span></button></section>
						<section v-if="model.flower"><h2 class="hak-section-heading hak-round">おはなの様子</h2><template v-if="model.flower.rows?.length"><div v-for="row in model.flower.rows" :key="row.label" class="hak-rich-row"><span class="hak-rich-copy">{{ row.label }}</span><strong class="hak-num">{{ row.value }}</strong></div></template><template v-else><div class="hak-rich-row"><span class="hak-rich-copy">{{ model.flower.name }}</span><strong v-if="flowerProgress !== null" class="hak-num">{{ flowerProgress }}%</strong></div><div v-if="model.flower.watered !== undefined" class="hak-rich-row"><span class="hak-rich-copy">水やり</span><strong>{{ model.flower.watered ? '今日 済' : 'まだ' }}</strong></div><div v-if="model.flower.detail" class="hak-rich-row">{{ model.flower.detail }}</div></template></section>
					</div>
					<div v-if="$slots['home-extra']" class="hak-home-extra"><slot name="home-extra"/></div>
				</section>
				<!-- Stable ancestors preserve drafts across both tab and theme changes. -->
				<div v-show="!enabled || activeTab !== 'home'" class="hak-tab-content"><slot/></div>
			</div>
			<aside v-if="enabled" class="hak-side" aria-label="きろく">
				<section class="hak-side-case hak-record-case">
					<h2 class="hak-side-heading hak-round">きろく</h2>
					<p v-if="model.loading" class="hak-empty">記録を読み込んでいます</p>
					<div v-else-if="model.week?.length" class="hak-week" aria-label="今週のきもち"><button v-for="day in model.week" :key="day.id" class="hak-week-day" type="button" :data-today="day.today" :data-pending="day.pending" :aria-label="`${day.label} ${day.description}`" @click="navigate('mood')"><span>{{ day.label }}</span><span v-if="day.emoji" class="hak-week-emoji">{{ day.emoji }}</span><i v-else :class="day.icon || 'ti ti-point'" aria-hidden="true"></i></button></div>
				</section>
				<template v-if="!model.loading">
					<button v-if="model.flower" class="hak-side-row hak-flower-row hak-side-case" type="button" @click="navigate('garden')"><span v-if="model.flower.emoji" class="hak-flower-emoji">{{ model.flower.emoji }}</span><i v-else class="ti ti-flower" aria-hidden="true"></i><span class="hak-side-row-main"><strong>{{ model.flower.name }}</strong><small><template v-if="flowerProgress !== null">{{ flowerProgress }}%<template v-if="model.flower.detail"> ・ </template></template>{{ model.flower.detail }}</small></span></button>
					<div v-if="model.mealSummary" class="hak-side-row hak-meal-row hak-side-case"><i class="ti ti-soup" aria-hidden="true"></i><span class="hak-side-row-main">{{ model.mealSummary }}</span><button class="hak-small-button" type="button" @click="dispatch({ type: 'record-meal' })">記録</button></div>
					<div v-if="model.streakLabel" class="hak-side-row hak-streak hak-side-case"><i class="ti ti-flame" aria-hidden="true"></i><span class="hak-side-row-main">{{ model.streakLabel }}</span><span v-if="model.rankLabel" class="hak-rank hak-num">{{ model.rankLabel }}</span></div>
					<button v-if="model.eye" class="hak-side-eye hak-round hak-side-case" type="button" @click="dispatch({ type: 'open-eye' })">{{ model.eye.text }}<small v-if="model.eye.number !== undefined" class="hak-num"> — EYE {{ model.eye.number }}</small></button>
					<section v-if="model.todos?.length" class="hak-todo-block hak-side-case"><h3 class="hak-todo-title hak-round">ToDo</h3><button v-for="todo in model.todos" :key="todo.id" class="hak-todo-row" type="button" :aria-pressed="!!todo.completed" :aria-label="`${todo.title}：${todo.completed ? '未完了に戻す' : '完了にする'}`" :disabled="todo.readOnly" @click="dispatch({ type: 'toggle-todo', id: todo.id, value: !todo.completed })"><span class="hak-todo-box" :data-checked="todo.completed"><i v-if="todo.completed" class="ti ti-check" aria-hidden="true"></i></span><span class="hak-todo-copy"><strong :data-completed="todo.completed">{{ todo.title }}</strong><small v-if="todo.meta">{{ todo.meta }}</small></span></button></section>
					<section v-if="model.apps?.length" class="hak-side-apps hak-side-case"><h3 class="hak-todo-title hak-brand">Apps</h3><button v-for="app in model.apps" :key="app.id" class="hak-side-row" type="button" @click="dispatch({ type: 'open-app', id: app.id })"><i :class="app.icon" aria-hidden="true"></i><span class="hak-side-row-main"><strong>{{ app.label }}</strong><small v-if="app.description">{{ app.description }}</small></span><i class="ti ti-chevron-right" aria-hidden="true"></i></button></section>
				</template>
			</aside>
			<nav v-if="enabled && activeTab === 'home' && missingMobileAppTabs.length" class="hak-app-return hak-desktop-case" aria-label="下部ナビから外したアプリ">
				<button v-for="tab in missingMobileAppTabs" :key="tab.id" class="hak-small-button" type="button" :data-app-return="tab.id" @click="navigate(tab.id)">{{ tab.label }}</button>
			</nav>
		</div>
	</div>
	<button v-if="enabled" class="hak-fab-scrim" :tabindex="fabOpen ? 0 : -1" :aria-hidden="!fabOpen" type="button" aria-label="記録メニューを閉じる" @click="closeFab()"></button>
	<div v-if="enabled" ref="fabSheetEl" class="hak-fab-sheet" :inert="!fabOpen" :aria-hidden="!fabOpen" role="group" aria-label="記録する">
		<div class="hak-sheet-head hak-round"><span>記録する</span><button type="button" @click="closeFab()">閉じる</button></div>
		<button v-for="choice in recordActions" :key="choice.action.type" class="hak-sheet-action" type="button" :disabled="model.loading" @click="record(choice.action)"><i :class="choice.icon" aria-hidden="true"></i><span class="hak-sheet-copy"><strong>{{ choice.label }}</strong><small>{{ choice.action.type === 'water-flower' ? (flowerProgress !== null ? `育成 ${flowerProgress}%` : '育成の記録') : choice.description }}</small></span><i class="ti ti-chevron-right" aria-hidden="true"></i></button>
	</div>
	<nav v-if="enabled" ref="bottomEl" class="hak-bottom" aria-label="Hatask 下部ナビゲーション" @focusin="restoreNav">
		<button class="hak-exit" type="button" aria-label="Hatask を閉じる" @click="dispatch({ type: 'exit' })"><i class="ti ti-logout-2" aria-hidden="true"></i></button>
		<div class="hak-bottom-case">
			<button v-for="tab in mobileTabs" :key="tab.id" class="hak-mobile-tab" type="button" :aria-label="tab.label" :aria-current="isMobileTabActive(tab.id) ? 'page' : undefined" :tabindex="navHidden ? -1 : undefined" :aria-hidden="navHidden" @click="navigate(tab.id)"><i :class="tab.icon" aria-hidden="true"></i></button>
			<button ref="fabEl" class="hak-fab" type="button" :aria-label="fabOpen ? '記録メニューを閉じる' : '記録する'" :aria-expanded="fabOpen" @click="toggleFab"><i class="ti ti-plus" aria-hidden="true"></i></button>
		</div>
	</nav>
</section>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, useId, watch } from 'vue';
import type { HataskAkatsukiAction, HataskAkatsukiEvent, HataskAkatsukiLayoutProps, HataskAkatsukiTab } from './hatask-akatsuki-types.js';
import { normalizeHataskAkatsukiMobileTabs } from '@/utility/hatask-akatsuki-navigation.js';
import { getHataskDaylightStyle } from '@/utility/hatask-daylight.js';
import { globalEvents } from '@/events.js';

const props = withDefaults(defineProps<HataskAkatsukiLayoutProps>(), { mode: 'light', animations: true });
const emit = defineEmits<{
	navigate: [tab: HataskAkatsukiTab];
	settings: [];
	search: [query?: string];
	closeSearch: [];
	action: [action: HataskAkatsukiAction];
}>();
const rootEl = ref<HTMLElement>();
const scrollEl = ref<HTMLElement>();
const bodyEl = ref<HTMLElement>();
const centerEl = ref<HTMLElement>();
const bottomEl = ref<HTMLElement>();
const mobileSearchEl = ref<HTMLInputElement>();
const desktopSearchEl = ref<HTMLInputElement>();
const searchResultsId = useId();
const searchToggleEl = ref<HTMLButtonElement>();
const fabEl = ref<HTMLButtonElement>();
const fabSheetEl = ref<HTMLElement>();
const railExpanded = ref<boolean | null>(null);
const rootWidth = ref(1200);
const rootHeight = ref(800);
const bodyWidth = ref(988);
const searching = ref(false);
const searchQuery = defineModel<string>('searchQuery', { default: '' });
const fabOpen = ref(false);
const navHidden = ref(false);
const reducedMotion = ref(false);
const motionEnabled = computed(() => props.animations && !reducedMotion.value);
const daylightDuration = ref('0s');
const layoutStyle = computed(() => props.enabled ? {
	...getHataskDaylightStyle(props.now ?? new Date(NaN), props.mode),
	'--hak-daylight-duration': motionEnabled.value ? daylightDuration.value : '0s',
	'--hak-hero-size': `${rootWidth.value * .034}px`,
	'--hak-app-title-size': `${rootWidth.value * .03}px`,
} : undefined);
const railCollapsed = computed(() => railExpanded.value === null ? rootWidth.value < 1000 : !railExpanded.value);
const isMobile = computed(() => rootWidth.value <= 599);
watch([isMobile, () => props.searchOpen], ([mobile, opened]) => {
	if (mobile && opened) searching.value = true;
});
const hideAside = computed(() => {
	if (isMobile.value) return props.activeTab !== 'home';
	if (rootHeight.value > rootWidth.value && props.activeTab !== 'home') return true;
	return (props.activeTab === 'apps' || props.activeTab === 'hataskapps') && bodyWidth.value <= 780;
});
const tabs: { id: HataskAkatsukiTab; label: string; icon: string }[] = [
	{ id: 'home', label: 'ホーム', icon: 'ti ti-home' },
	{ id: 'cal', label: 'カレンダー', icon: 'ti ti-calendar-event' },
	{ id: 'todo', label: 'ToDo', icon: 'ti ti-checkbox' },
	{ id: 'mood', label: 'きもち', icon: 'ti ti-mood-smile' },
	{ id: 'meal', label: 'ごはん', icon: 'ti ti-soup' },
	{ id: 'garden', label: 'おはな', icon: 'ti ti-flower' },
	{ id: 'hataskapps', label: 'Hatask App', icon: 'ti ti-layout-grid' },
	{ id: 'apps', label: 'Hataskey App', icon: 'ti ti-app-window' },
	{ id: 'eye', label: 'EYE', icon: 'ti ti-eye' },
];
const desktopTabs = tabs;
const mobileTabs = computed(() => {
	const ids = normalizeHataskAkatsukiMobileTabs(props.model.mobileTabs);
	return ids.map(id => tabs.find(tab => tab.id === id)!);
});
const missingMobileAppTabs = computed(() => isMobile.value
	? tabs.filter(tab => (tab.id === 'hataskapps' || tab.id === 'apps') && !mobileTabs.value.some(selected => selected.id === tab.id))
	: []);
const recordActions: { label: string; description?: string; icon: string; action: HataskAkatsukiAction }[] = [
	{ label: '予定を追加', description: 'カレンダーに 1 件', icon: 'ti ti-calendar-plus', action: { type: 'create-event' } },
	{ label: 'ToDo を書く', description: '今日のタスク', icon: 'ti ti-checkbox', action: { type: 'create-todo' } },
	{ label: 'きもちを記録', description: 'いまの気分', icon: 'ti ti-mood-smile', action: { type: 'record-mood' } },
	{ label: 'ごはんを記録', description: '朝・昼・夜', icon: 'ti ti-soup', action: { type: 'record-meal' } },
	{ label: 'おはなの様子を見る', icon: 'ti ti-flower', action: { type: 'water-flower' } },
];
const dateLabel = computed(() => props.model.dateLabel ?? (props.now ? new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric' }).format(props.now) : ''));
const weekdayLabel = computed(() => props.model.weekdayLabel ?? (props.now ? new Intl.DateTimeFormat('ja-JP', { weekday: 'long' }).format(props.now) : ''));
const clockLabel = computed(() => props.model.clockLabel ?? (props.now ? new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }).format(props.now) : ''));
const flowerProgress = computed(() => typeof props.model.flower?.progress === 'number' && Number.isFinite(props.model.flower.progress) ? Math.round(Math.max(0, Math.min(100, props.model.flower.progress))) : null);
const timedEvents = computed(() => props.model.loading ? [] : (props.model.timeline ?? []).filter(event => typeof event.startMinute === 'number' && Number.isFinite(event.startMinute) && event.startMinute >= 0 && event.startMinute < 1440));
const timelineRange = computed(() => ({
	start: Math.floor(Math.min(480, ...timedEvents.value.map(event => event.startMinute!)) / 120) * 120,
	end: Math.min(1440, Math.ceil(Math.max(1320, ...timedEvents.value.map(event => Number.isFinite(event.endMinute) ? Math.max(event.startMinute! + 15, event.endMinute!) : event.startMinute! + 30)) / 120) * 120),
}));
const timelineEntries = computed(() => timedEvents.value.map(event => {
	const { start, end } = timelineRange.value;
	const last = Number.isFinite(event.endMinute) ? Math.max(event.startMinute! + 15, event.endMinute!) : event.startMinute! + 30;
	return { event, left: (event.startMinute! - start) / (end - start) * 100, width: (Math.min(end, last) - event.startMinute!) / (end - start) * 100 };
}));
const activeTimelineEntry = computed(() => timelineEntries.value.find(entry => entry.event.id === props.model.next?.id));
const timelineTicks = computed(() => {
	const { start, end } = timelineRange.value;
	return Array.from({ length: (end - start) / 120 + 1 }, (_, index) => ({ minute: start + index * 120, left: index * 120 / (end - start) * 100, label: String((start + index * 120) / 60), major: index % 2 === 0 }));
});
const nowPosition = computed(() => {
	if (!props.now || props.model.loading) return null;
	const minute = props.now.getHours() * 60 + props.now.getMinutes();
	const { start, end } = timelineRange.value;
	return minute >= start && minute <= end ? (minute - start) / (end - start) * 100 : null;
});

let restoreTimer: number | undefined;
let resizeObserver: ResizeObserver | undefined;
let motionQuery: MediaQueryList | undefined;
let connected = false;
let tabAnimation: Animation | undefined;

function cancelTabAnimation() {
	tabAnimation?.cancel();
	tabAnimation = undefined;
}

function animateTab() {
	const target = centerEl.value;
	const previousOpacity = target && tabAnimation ? Number.parseFloat(window.getComputedStyle(target).opacity) : .2;
	cancelTabAnimation();
	if (!props.enabled || !connected || !motionEnabled.value || !target?.animate) return;
	// The new tab is already active. Motion never owns visibility, input state,
	// or mounting; cancellation therefore always leaves an operable page.
	const animation = target.animate([
		{ opacity: Number.isFinite(previousOpacity) ? previousOpacity : .2 },
		{ opacity: 1 },
	], { duration: 260, easing: 'cubic-bezier(.2, 0, 0, 1)' });
	tabAnimation = animation;
	animation.onfinish = () => { if (tabAnimation === animation) tabAnimation = undefined; };
}

function dispatch(action: HataskAkatsukiAction) {
	if (!props.model.loading || action.type === 'exit') emit('action', action);
}

function openEvent(event: HataskAkatsukiEvent) {
	dispatch(event.action ?? { type: 'open-event', id: event.id });
}

function isMobileTabActive(tab: HataskAkatsukiTab) {
	if (props.activeTab === tab) return true;
	return tab === 'hataskapps' && !mobileTabs.value.some(item => item.id === props.activeTab) && props.activeTab !== 'apps';
}

function navigate(tab: HataskAkatsukiTab) {
	closeFab(false);
	restoreNav();
	emit('navigate', tab);
}

function submitSearch() { emit('search', searchQuery.value.trim() || undefined); }

async function toggleSearch() {
	searching.value = !searching.value;
	if (!searching.value) emit('closeSearch');
	await nextTick();
	(searching.value ? mobileSearchEl.value : searchToggleEl.value)?.focus({ preventScroll: true });
}

function closeSearchResults() {
	emit('closeSearch');
	(isMobile.value ? mobileSearchEl.value : desktopSearchEl.value)?.focus({ preventScroll: true });
}

function restoreNav() {
	if (restoreTimer) window.clearTimeout(restoreTimer);
	restoreTimer = undefined;
	navHidden.value = false;
}

function onScroll() {
	if (!props.enabled || !isMobile.value || !motionEnabled.value || fabOpen.value || (bottomEl.value?.contains(window.document.activeElement) && window.document.activeElement?.matches(':focus-visible'))) return;
	if (restoreTimer) window.clearTimeout(restoreTimer);
	navHidden.value = true;
	restoreTimer = window.setTimeout(restoreNav, 420);
}

async function toggleFab() {
	if (fabOpen.value) { closeFab(); return; }
	restoreNav();
	fabOpen.value = true;
	await nextTick();
	fabSheetEl.value?.querySelector<HTMLButtonElement>('.hak-sheet-action:not(:disabled), .hak-sheet-head button')?.focus({ preventScroll: true });
}

function closeFab(returnFocus = true) {
	const wasOpen = fabOpen.value;
	fabOpen.value = false;
	if (wasOpen && returnFocus) fabEl.value?.focus({ preventScroll: true });
}

function record(action: HataskAkatsukiAction) { closeFab(); dispatch(action); }

function closeTransient(event: KeyboardEvent) {
	if (!fabOpen.value && !props.searchOpen && !searching.value) return;
	// Handle only the local layer; do not let the deck window close as well.
	event.preventDefault();
	event.stopPropagation();
	if (fabOpen.value) closeFab();
	else if (props.searchOpen) closeSearchResults();
	else if (searching.value) { searching.value = false; searchToggleEl.value?.focus({ preventScroll: true }); }
}

function onMotionChange() { reducedMotion.value = !!motionQuery?.matches; }

function onThemeChanging(): void {
	daylightDuration.value = '220ms';
	// Theme CSS is already changed; set the duration before an existing theme
	// observer forces style resolution, rather than waiting for Vue's next patch.
	rootEl.value?.style.setProperty('--hak-daylight-duration', motionEnabled.value ? '220ms' : '0s');
}

function onDocumentFocus(event: FocusEvent) {
	if (fabOpen.value && event.target instanceof Node && !fabSheetEl.value?.contains(event.target) && !fabEl.value?.contains(event.target)) closeFab(false);
}

function disconnect() {
	cancelTabAnimation();
	restoreNav();
	resizeObserver?.disconnect();
	resizeObserver = undefined;
	motionQuery?.removeEventListener('change', onMotionChange);
	motionQuery = undefined;
	window.document.removeEventListener('focusin', onDocumentFocus);
	globalEvents.off('themeChanging', onThemeChanging);
	connected = false;
}

async function connect() {
	await nextTick();
	if (connected || !props.enabled || !rootEl.value) return;
	connected = true;
	motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	onMotionChange();
	motionQuery.addEventListener('change', onMotionChange);
	const measure = () => {
		if (!rootEl.value) return;
		const bounds = rootEl.value.getBoundingClientRect();
		if (bounds.width > 0) rootWidth.value = bounds.width;
		if (bounds.height > 0) rootHeight.value = bounds.height;
		if (bodyEl.value) bodyWidth.value = bodyEl.value.getBoundingClientRect().width;
	};
	measure();
	resizeObserver = new ResizeObserver(measure);
	resizeObserver.observe(rootEl.value);
	if (bodyEl.value) resizeObserver.observe(bodyEl.value);
	window.document.addEventListener('focusin', onDocumentFocus);
	globalEvents.on('themeChanging', onThemeChanging);
}

watch(() => props.enabled, () => { disconnect(); closeFab(false); searching.value = false; void connect(); });
watch(() => props.activeTab, async () => {
	restoreNav();
	closeFab(false);
	await nextTick();
	animateTab();
	if (props.enabled && isMobile.value) scrollEl.value?.scrollTo({ top: 0, behavior: motionEnabled.value ? 'smooth' : 'auto' });
});
watch(motionEnabled, enabled => { if (!enabled) { restoreNav(); cancelTabAnimation(); } });
watch([() => props.mode, () => props.now], ([mode], [previousMode]) => {
	// Clock ticks blend for their full 30-second cadence. A manual light/dark
	// change is shorter so foregrounds never linger on the previous surface.
	daylightDuration.value = mode === previousMode ? '30s' : '220ms';
});
watch(isMobile, mobile => { restoreNav(); if (!mobile) { closeFab(false); searching.value = false; } });
onMounted(connect);
onActivated(connect);
onDeactivated(disconnect);
onBeforeUnmount(disconnect);
</script>

<style scoped lang="scss">
// Registered colors interpolate inside gradients; transitioning background-image
// alone would switch discretely. Names are Hatask-only and inert in old themes.
@each $name in bg, start, middle, end, left-start, left-middle, left-end, right-start, right-middle, right-end {
	@property --hak-daylight-#{$name} {
		syntax: '<color>';
		inherits: true;
		initial-value: transparent;
	}
}
.htk-akatsuki-layout[data-enabled='true'] {
	--bg: var(--hak-daylight-bg);
	--bg-image: linear-gradient(168deg, var(--hak-daylight-start) 0%, var(--hak-daylight-middle) 46%, var(--hak-daylight-end) 100%);
	--surface: rgba(255, 255, 255, .82);
	--masthead: #fff7f2;
	--paper: #fff7f2;
	--fg: #2b1f2c;
	--fg-2: #6a5566;
	--fg-3: #8a7386;
	--fg2: var(--fg-2);
	--fg3: var(--fg-3);
	--rule: rgba(80, 50, 70, .18);
	--rule2: rgba(80, 50, 70, .4);
	--accent: #e0567a;
	--accent-ink: #b02e56;
	--accent2: #f2a04b;
	--on-accent: #fff;
	--hak-badge-bg: #b02e56;
	--on-accent2: #3a1e05;
	--border: 1px solid rgba(255, 255, 255, .7);
	--button-border: 2px solid rgba(80, 50, 70, .34);
	--shadow: 0 20px 40px -28px rgba(90, 50, 70, .55);
	--menu-left-bg: linear-gradient(196deg, var(--hak-daylight-left-start) 0%, var(--hak-daylight-left-middle) 48%, var(--hak-daylight-left-end) 100%);
	--menu-right-bg: linear-gradient(340deg, var(--hak-daylight-right-start) 0%, var(--hak-daylight-right-middle) 46%, var(--hak-daylight-right-end) 100%);
	--htk-font-body: 'Zen Kaku Gothic New', system-ui, sans-serif;
	--htk-font-head: 'Zen Maru Gothic', 'Zen Kaku Gothic New', sans-serif;
	--fill: color-mix(in srgb, var(--accent) 8%, var(--surface));
	--fill-2: color-mix(in srgb, var(--accent) 15%, var(--surface));
	--card-radius: 24px;
	--card-border: var(--border);
	--card-shadow: var(--shadow);
	position: relative;
	display: flex;
	width: 100%;
	height: var(--hatask-akatsuki-height, 100dvh);
	min-width: 0;
	min-height: 0;
	max-height: 100dvh;
	isolation: isolate;
	overflow: hidden;
	container: hatask-akatsuki / inline-size;
	background: var(--bg-image), var(--bg);
	transition-property: --hak-daylight-bg, --hak-daylight-start, --hak-daylight-middle, --hak-daylight-end, --hak-daylight-left-start, --hak-daylight-left-middle, --hak-daylight-left-end, --hak-daylight-right-start, --hak-daylight-right-middle, --hak-daylight-right-end;
	transition-duration: var(--hak-daylight-duration, 0s);
	transition-timing-function: linear;
	color: var(--fg);
	font: 14px/1.55 var(--htk-font-body);
	overflow-wrap: anywhere;
	line-break: strict;
	color-scheme: light;
}
.htk-akatsuki-layout[data-enabled='true'][data-mode='dark'] {
	--bg-image: linear-gradient(168deg, var(--hak-daylight-start) 0%, var(--hak-daylight-middle) 52%, var(--hak-daylight-end) 100%);
	--surface: rgba(255, 255, 255, .1);
	--masthead: #1b1424;
	--paper: #1b1424;
	--fg: #f6ecf3;
	--fg-2: #c8b5c6;
	--fg-3: #a3909f;
	--rule: rgba(255, 255, 255, .18);
	--rule2: rgba(255, 255, 255, .34);
	--accent: #ff7fa3;
	--accent-ink: #ff7fa3;
	--accent2: #ffb36b;
	--on-accent: #26101c;
	--on-accent2: #33200a;
	--border: 1px solid rgba(255, 255, 255, .16);
	--button-border: 2px solid rgba(255, 255, 255, .4);
	--shadow: 0 20px 40px -28px rgba(0, 0, 0, .8);
	--menu-left-bg: linear-gradient(196deg, var(--hak-daylight-left-start) 0%, var(--hak-daylight-left-middle) 46%, var(--hak-daylight-left-end) 100%);
	--menu-right-bg: linear-gradient(340deg, var(--hak-daylight-right-start) 0%, var(--hak-daylight-right-middle) 48%, var(--hak-daylight-right-end) 100%);
	color-scheme: dark;
}
.htk-akatsuki-layout *, .htk-akatsuki-layout *::before, .htk-akatsuki-layout *::after { box-sizing: border-box; }
.htk-akatsuki-layout button { margin: 0; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: start; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.htk-akatsuki-layout button:disabled { cursor: not-allowed; opacity: .55; }
.htk-akatsuki-layout :is(button, input):focus-visible { outline: 3px solid var(--accent-ink); outline-offset: 3px; }
.htk-akatsuki-layout button { touch-action: manipulation; }
.htk-akatsuki-layout .ti { flex: 0 0 auto; font-size: 20px; line-height: 1; }
.hak-brand { font-family: 'Righteous', 'Zen Kaku Gothic New', sans-serif; font-weight: 400; font-synthesis: none; letter-spacing: .01em; }
/* The parent registers self-hosted Archivo; Japanese labels keep the existing fallback. */
.hak-num { font-family: 'Archivo', 'Zen Kaku Gothic New', system-ui, sans-serif; font-variant-numeric: tabular-nums; }
.htk-akatsuki-layout .hak-round { font-family: var(--htk-font-head); }
.htk-akatsuki-layout .hak-icon { width: 36px; height: 36px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 999px; color: var(--fg-2); }
.hak-icon > .ti { font-size: 19px; }
.hak-icon:hover, .hak-rail-tab:hover { background: var(--fill-2); }
.hak-rail { width: 212px; flex: 0 0 auto; display: flex; flex-direction: column; gap: 3px; padding: 20px 12px; border-right: 1px solid var(--rule2); background: var(--menu-left-bg); overflow-x: hidden; overflow-y: auto; transition: width .26s cubic-bezier(.2, 0, 0, 1), padding .26s; }
.hak-rail-head { display: flex; align-items: center; gap: 8px; min-width: 0; margin-bottom: 18px; }
/* The menu center shares the tab's 12px padding + 20px icon column. */
.htk-akatsuki-layout .hak-rail-menu { width: 44px; height: 40px; }
.htk-akatsuki-layout .hak-rail-menu > .ti { width: 21px; height: 21px; display: grid; place-items: center; font-size: 21px; vertical-align: baseline; }
.hak-rail-brand { font-size: 20px; white-space: nowrap; }
.hak-rail-tab { display: flex; align-items: center; gap: 11px; min-height: 42px; padding: 0 12px !important; border-radius: 999px; color: var(--fg-2) !important; font-weight: 800 !important; }
.hak-rail-tab > .ti { width: 20px; height: 20px; flex: 0 0 20px; display: grid; place-items: center; font-size: 18px; vertical-align: baseline; }
.hak-rail :is(.hak-rail-menu, .hak-rail-tab) > .ti::before { display: block; font-size: 1em; line-height: 1; }
.hak-rail-tab[aria-current='page'] { color: var(--on-accent) !important; background: var(--accent); }
.hak-rail-label { white-space: nowrap; }
.hak-rail-space { flex: 1; min-height: 24px; }
[data-rail-collapsed='true'] .hak-rail { width: 64px; padding: 20px 8px; }
[data-rail-collapsed='true'] .hak-rail-brand, [data-rail-collapsed='true'] .hak-rail-label { display: none; }
[data-rail-collapsed='true'] .hak-rail-head { justify-content: center; margin-bottom: 6px; }
[data-rail-collapsed='true'] .hak-rail-tab { justify-content: center; padding-inline: 0 !important; }
.hak-scroll { flex: 1; min-width: 0; min-height: 0; overflow: auto; overscroll-behavior: contain; scroll-padding: 100px 12px 24px; box-shadow: 0 28px 56px -34px rgba(90, 50, 70, .6); }
.hak-desktop-top { position: sticky; top: 0; z-index: 20; padding: 14px 22px 12px; }
.hak-desktop-case { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 10px 0 22px; border: var(--border); border-radius: 999px; background: var(--masthead); box-shadow: 0 16px 32px -24px rgba(0, 0, 0, .45), var(--shadow); }
.hak-date { font-size: 19px; font-weight: 700; white-space: nowrap; }
.hak-dow { color: var(--fg-2); font-size: 13px; white-space: nowrap; }
.hak-desktop-search { flex: 1; min-width: 0; display: flex; align-items: center; gap: 9px; min-height: 38px; margin: 0 6px; padding: 0 14px; border-radius: 999px; background: color-mix(in srgb, var(--fg) 7%, transparent); color: var(--fg-2); }
.hak-desktop-search .ti, .hak-mobile-search .ti { font-size: 18px; }
.hak-desktop-search input, .hak-mobile-search input { width: 100%; min-width: 0; padding: 6px 0; border: 0; background: none; color: var(--fg); font: inherit; }
.hak-desktop-search input { height: 36px; font-size: 14px; font-weight: 500; }
.hak-desktop-search .ti { font-size: 17px; }
.hak-desktop-search input::placeholder, .hak-mobile-search input::placeholder { color: var(--fg-2); opacity: 1; }
.htk-akatsuki-layout .hak-desktop-search:focus-within { outline: 3px solid var(--accent-ink); outline-offset: 3px; }
.htk-akatsuki-layout .hak-desktop-search input:focus-visible { outline: none; }
/* Keep one result pane mounted so rapid reversals continue from its current height. */
.hak-search-disclosure { display: grid; grid-template-rows: 0fr; min-width: 0; opacity: 0; visibility: hidden; transition: grid-template-rows .28s cubic-bezier(.2, 0, 0, 1), opacity .18s ease, visibility 0s .28s; }
.hak-search-disclosure[data-open='true'] { grid-template-rows: 1fr; opacity: 1; visibility: visible; transition-delay: 0s; }
.hak-search-disclosure-clip { min-height: 0; overflow: hidden; }
.hak-search-results { margin: 0 22px 12px; padding: 12px 18px; min-width: 0; overflow: auto; border: var(--border); border-radius: 22px; background: var(--masthead); color: var(--fg); transform: translateY(-12px); transition: transform .28s cubic-bezier(.2, 0, 0, 1); }
.hak-search-disclosure[data-open='true'] .hak-search-results { transform: translateY(0); }
.hak-search-results-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.hak-search-results-head h2 { margin: 0; font-size: 14px; }
.hak-clock { font-size: 15px; font-weight: 800; white-space: nowrap; }
.hak-body { display: flex; min-width: 0; min-height: calc(100% - 82px); container: hatask-akatsuki-body / inline-size; }
.hak-center { flex: 1; min-width: 0; padding: 26px 30px; }
.hak-home { display: grid; grid-template-areas: 'summary' 'next' 'timeline' 'later' 'stats' 'rich' 'extra'; animation: hak-up .35s cubic-bezier(.2, 0, 0, 1) both; }
.hak-home-extra { grid-area: extra; min-width: 0; margin-top: 30px; }
.hak-app-return { align-self: stretch; margin: 22px 20px 0; padding: 12px; flex-wrap: wrap; justify-content: center; }
.hak-home-summary { grid-area: summary; color: var(--fg-2); margin-bottom: 22px; }
.hak-home-summary p { margin: 0; }
.hak-next { grid-area: next; min-width: 0; max-width: 44ch; margin-bottom: 30px; }
.hak-next h1 { margin: 0; font-size: clamp(30px, var(--hak-hero-size), 42px); font-weight: 700; line-height: 1.16; letter-spacing: -.018em; text-wrap: balance; }
.hak-next-lead { display: block; white-space: nowrap; }
.hak-next-title { display: block; overflow-wrap: anywhere; word-break: normal; }
.hak-next p { margin: 12px 0 0; color: var(--fg-2); line-height: 1.75; }
.hak-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.htk-akatsuki-layout .hak-action-button { display: inline-flex; justify-content: center; align-items: center; gap: 8px; min-height: 46px; padding: 8px 18px; border: var(--button-border); border-radius: 999px; font-size: 15px; font-weight: 800; }
.hak-action-button .ti { font-size: 18px; }
.htk-akatsuki-layout .hak-action-button[data-primary='true'] { padding-inline: 20px; border-color: transparent; background: var(--accent); color: var(--on-accent); box-shadow: var(--shadow); }
.htk-akatsuki-layout .hak-action-button:hover:not(:disabled), .htk-akatsuki-layout .hak-small-button:hover { border-color: var(--accent); background: var(--accent); color: var(--on-accent); }
.htk-akatsuki-layout .hak-action-button[data-primary='true']:hover:not(:disabled) { filter: brightness(.92); }
.hak-timeline { grid-area: timeline; position: relative; height: 105px; margin-bottom: 30px; border-top: 1px solid var(--rule2); }
.hak-timeline-label { position: absolute; top: 20px; left: var(--hak-label-left, 0); max-width: var(--hak-label-width, 100%); display: flex; gap: 7px; align-items: baseline; color: var(--accent-ink); font-size: 12px; font-weight: 800; }
.hak-timeline-label strong { display: none; color: var(--accent-ink); white-space: nowrap; }
.hak-timeline-label span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hak-time-axis { position: absolute; left: 0; right: 0; top: 66px; height: 1px; background: var(--rule); }
.hak-time-tick { position: absolute; top: 61px; transform: translateX(-50%); color: var(--fg-2); text-align: center; font-size: 11px; }
.hak-time-tick::before { content: ''; width: 1px; height: 6px; display: block; margin: 0 auto 4px; background: var(--rule); }
.htk-akatsuki-layout .hak-time-block { position: absolute; top: 30px; min-width: 9px; height: 36px; border-radius: 4px; }
.hak-time-block span { position: absolute; top: 10px; left: 0; right: 0; height: 10px; border-radius: 999px; background: color-mix(in srgb, var(--accent) 30%, var(--surface)); }
.hak-time-block[data-main='true'] span { height: 18px; background: var(--accent); }
.hak-time-now { position: absolute; top: 34px; bottom: 22px; width: 2px; background: var(--accent-ink); pointer-events: none; animation: hak-pulse 2.4s ease-in-out infinite; }
.hak-later { grid-area: later; }
.hak-section-heading { margin: 0; padding-bottom: 8px; border-bottom: 1px solid var(--rule2); font-size: 12px; font-weight: 800; letter-spacing: .08em; }
.htk-akatsuki-layout .hak-later-row { width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--rule); }
.hak-later-row:hover, .hak-todo-row:hover, button.hak-rich-row:hover, button.hak-side-row:hover, button.hak-stat:hover { background: var(--fill); }
.hak-later-time { min-width: 46px; color: var(--fg-2); font-size: 13px; font-weight: 800; }
.hak-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent2); flex: 0 0 auto; }
.hak-dot[data-muted='true'] { background: var(--fg-3); }
.hak-later-title { flex: 1; min-width: 0; font-size: 15px; font-weight: 500; }
.hak-later-row > .ti { color: var(--fg-2); font-size: 15px; }
.hak-empty { margin: 16px 0; color: var(--fg-2); font-size: 13px; }
.hak-stats { grid-area: stats; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; overflow: hidden; margin-top: 32px; border: 1px solid var(--rule2); border-radius: 28px; background: var(--rule2); }
.htk-akatsuki-layout .hak-stat { padding: 16px 18px; background: var(--surface); }
.hak-stat-label { display: block; color: var(--fg-2); font-size: 11px; font-weight: 800; letter-spacing: .08em; }
.hak-stat-value { display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
.hak-stat-value strong { font-size: 26px; font-weight: 800; line-height: 1; }
.hak-stat-value > span { color: var(--fg-2); font-size: 12px; font-weight: 700; }
.hak-rich-grid { grid-area: rich; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 30px; margin-top: 30px; }
.hak-rich-grid .hak-section-heading { padding-bottom: 10px; }
.htk-akatsuki-layout .hak-rich-row { width: 100%; display: flex; align-items: center; gap: 12px; padding: 13px 0; border-bottom: 1px solid var(--rule); }
.hak-rich-row > .ti { min-width: 22px; font-size: 18px; color: var(--accent-ink); }
.hak-rich-slot { color: var(--fg-2); font-size: 12px; font-weight: 800; }
.hak-rich-copy { flex: 1; min-width: 0; }
.hak-rich-status { color: var(--fg-2); font-size: 11px; font-weight: 800; white-space: nowrap; }
.hak-rich-status[data-pending='true'] { color: var(--accent-ink); }
.hak-tab-content { min-width: 0; }
.hak-side { position: sticky; top: 84px; align-self: flex-start; width: 284px; flex: 0 0 auto; display: flex; flex-direction: column; gap: 12px; min-width: 0; padding: 26px 24px 52px; border-left: 1px solid transparent; isolation: isolate; }
/* Fade only the surface and divider, never text, controls, or their focus rings. */
.hak-side::before { content: ''; position: absolute; z-index: -1; inset: 0 0 0 -1px; border-left: 1px solid var(--rule2); background: var(--menu-right-bg); mask-image: linear-gradient(to bottom, transparent, #000 48px, #000 calc(100% - 88px), transparent); pointer-events: none; }
[data-hide-aside='true'] .hak-side { display: none; }
.hak-side-heading { margin: 0; padding-bottom: 12px; font-size: 12px; font-weight: 800; letter-spacing: .08em; }
.hak-week { display: flex; justify-content: space-between; gap: 4px; }
.htk-akatsuki-layout .hak-week-day { flex: 1; min-width: 0; min-height: 44px; display: flex; align-items: center; flex-direction: column; gap: 6px; color: var(--accent-ink); }
.hak-week-day > span:first-child { color: var(--fg-2); font-size: 11px; font-weight: 800; }
.htk-akatsuki-layout .hak-week-day[data-today='true'] { padding-bottom: 5px; box-shadow: inset 0 -2px 0 var(--accent); }
.hak-week-day[data-pending='true'] { color: var(--fg-3); }
.hak-week-day[data-pending='true'] > .ti { opacity: .4; }
.hak-week-emoji { font-size: 19px; line-height: 1; }
.htk-akatsuki-layout .hak-side-row { width: 100%; display: flex; align-items: center; gap: 12px; padding: 15px 0; border-bottom: 1px solid var(--rule); font-size: 13px; font-weight: 700; }
.hak-side-row > .ti { font-size: 19px; color: var(--fg-2); }
.hak-side-row-main { min-width: 0; flex: 1; }
.hak-side-row-main strong { display: block; font-size: 13px; font-weight: 700; }
.hak-side-row-main small { display: block; color: var(--fg-2); font-size: 12px; margin-top: 2px; font-weight: 400; }
.hak-flower-emoji { font-size: 22px; }
.htk-akatsuki-layout .hak-small-button { flex: 0 0 auto; min-height: 32px; padding: 0 12px; border: var(--button-border); border-radius: 999px; font-size: 11px; font-weight: 800; }
.hak-streak > .ti { color: var(--accent-ink); }
.hak-rank { color: var(--fg-2); font-size: 12px; }
.htk-akatsuki-layout .hak-side-eye { width: 100%; color: var(--fg-2); line-height: 1.8; font-size: 14px; }
.hak-side-eye small { color: var(--fg-2); font-size: 11px; white-space: nowrap; }
.hak-todo-title { margin: 0; padding-bottom: 12px; font-size: 12px; font-weight: 800; letter-spacing: .08em; }
.htk-akatsuki-layout .hak-todo-row { width: 100%; display: flex; align-items: flex-start; gap: 11px; padding: 11px 0; border-bottom: 1px solid var(--rule); }
.hak-todo-box { width: 16px; height: 16px; margin-top: 2px; flex: 0 0 auto; display: grid; place-items: center; border: var(--button-border); border-radius: 50%; }
.hak-todo-box[data-checked='true'] { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }
.hak-todo-box > .ti { font-size: 13px; }
.hak-todo-copy { min-width: 0; flex: 1; }
.hak-todo-copy strong { display: block; font-size: 13px; font-weight: 700; line-height: 1.5; }
.hak-todo-copy strong[data-completed='true'] { text-decoration: line-through; }
.hak-todo-copy small { display: block; margin-top: 3px; color: var(--fg-2); font-size: 11px; font-weight: 800; }
.htk-akatsuki-layout .hak-side-case { min-width: 0; padding: 14px; border: var(--card-border); border-radius: var(--card-radius); background: var(--masthead); box-shadow: var(--card-shadow); }
.htk-akatsuki-layout button.hak-side-case:hover { background: color-mix(in srgb, var(--fill-2) 45%, var(--masthead)); }
.hak-side-case .hak-side-row-main, .hak-side-case .hak-todo-copy { overflow-wrap: anywhere; }
.htk-akatsuki-layout .hak-side-case > :is(.hak-todo-row, .hak-side-row):last-child { padding-bottom: 0; border-bottom: 0; }
.hak-mobile-head, .hak-mobile-date, .hak-bottom, .hak-fab-sheet, .hak-fab-scrim { display: none; }
@container hatask-akatsuki-body (max-width: 780px) {
	.hak-center { padding: 24px 22px; }
	.hak-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.hak-rich-grid { grid-template-columns: minmax(0, 1fr); gap: 24px; }
}
@container hatask-akatsuki (max-width: 750px) {
	.hak-desktop-case { gap: 8px; padding-left: 16px; }
	.hak-desktop-case .hak-dow { display: none; }
	.hak-side { width: 244px; padding-inline: 18px; }
}
@container hatask-akatsuki (max-width: 599px) {
	.hak-rail, .hak-desktop-top { display: none; }
	.hak-search-results { margin-inline: 12px; padding-inline: 14px; }
	.hak-scroll { padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); scroll-padding: 20px 12px calc(112px + env(safe-area-inset-bottom, 0px)); }
	.hak-mobile-head { display: block; padding: 12px 12px 10px; }
	.hak-mobile-case { display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 0 8px 0 16px; border: var(--border); border-radius: 999px; background: var(--masthead); box-shadow: 0 14px 28px -20px rgba(0, 0, 0, .4), var(--shadow); transition: padding .26s cubic-bezier(.2, 0, 0, 1); }
	.hak-mobile-brand { max-width: 120px; overflow: hidden; font-size: 19px; white-space: nowrap; transition: max-width .26s cubic-bezier(.2, 0, 0, 1), opacity .16s; }
	.htk-akatsuki-layout .hak-search-toggle { margin-left: auto; }
	.hak-mobile-search { display: flex; align-items: center; gap: 8px; flex: 0 1 0; width: 0; min-width: 0; overflow: hidden; opacity: 0; pointer-events: none; color: var(--accent-ink); transition: flex-grow .26s cubic-bezier(.2, 0, 0, 1), width .26s, opacity .2s; }
	.hak-mobile-search input { font-size: 16px; }
	.hak-mobile-gear { max-width: 36px; overflow: hidden; transition: max-width .24s, opacity .16s; }
	[data-searching='true'] .hak-mobile-case { padding-left: 12px; }
	.htk-akatsuki-layout[data-searching='true'] .hak-search-toggle { margin-left: 0; background: var(--accent); color: var(--on-accent); }
	[data-searching='true'] .hak-mobile-brand { flex: 0 1 0; max-width: 0; opacity: 0; }
	[data-searching='true'] .hak-mobile-search { flex: 1 1 0; width: auto; opacity: 1; pointer-events: auto; }
	[data-searching='true'] .hak-mobile-gear { width: 0; max-width: 0; opacity: 0; pointer-events: none; }
	.hak-body { display: flex; flex-direction: column; min-height: 0; }
	.hak-center { flex: none; width: 100%; padding: 4px 20px 0; }
	[data-tab='apps'] .hak-center, [data-tab='hataskapps'] .hak-center { padding-inline: 14px; }
	.hak-home { grid-template-areas: 'summary' 'timeline' 'next' 'later' 'stats' 'rich' 'extra'; }
	.hak-home-summary { margin-bottom: 16px; }
	.hak-mobile-date { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
	.hak-mobile-date .hak-dow { font-size: 12px; }
	.hak-day-count { margin-left: auto; color: var(--fg-2); font-size: 11px; font-weight: 800; }
	.hak-home-summary p { font-size: 13px; line-height: 1.65; }
	.hak-next { margin-bottom: 22px; }
	.hak-next h1 { font-size: 25px; line-height: 1.28; letter-spacing: -.01em; }
	.hak-next p { margin-top: 8px; font-size: 13px; }
	.hak-actions { gap: 8px; margin-top: 16px; }
	.htk-akatsuki-layout .hak-action-button { font-size: 14px; }
	.htk-akatsuki-layout .hak-action-button[data-primary='true'] { flex: 1; }
	.hak-timeline { height: 71px; margin-bottom: 18px; padding-top: 12px; }
	.hak-timeline-label { top: 12px; left: 0; max-width: 100%; color: var(--fg); font-weight: 700; }
	.hak-timeline-label strong { display: inline; font-weight: 800; }
	.hak-time-axis { top: 52px; }
	.hak-time-tick { top: 53px; }
	.hak-time-tick[data-major='false'] { display: none; }
	.htk-akatsuki-layout .hak-time-block { top: 36px; }
	.hak-time-block span { top: 10px; height: 8px; }
	.hak-time-block[data-main='true'] span { top: 7px; height: 14px; }
	.hak-time-now { top: 38px; bottom: auto; height: 22px; }
	.hak-later { margin-bottom: 22px; }
	.htk-akatsuki-layout .hak-later-row { gap: 11px; padding: 13px 0; }
	.hak-later-time { min-width: 42px; font-size: 12px; font-weight: 800; }
	.hak-later-title { font-size: 14px; }
	.hak-stats, .hak-rich-grid { display: none; }
	.hak-side { position: static; width: 100%; padding: 0 20px 12px; }
	.hak-side::before { display: none; }
	.hak-side-heading { padding-bottom: 10px; margin-bottom: 0; }
	.htk-akatsuki-layout .hak-side-apps .hak-side-row { padding: 13px 0; }
	.hak-flower-emoji { font-size: 19px; }
	.hak-flower-row .hak-side-row-main { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px; }
	.htk-akatsuki-layout .hak-side-eye { font-size: 13px; line-height: 1.7; }
	.hak-streak, .hak-todo-block, .hak-side-apps { display: none !important; }
	.hak-side-row-main strong { font-size: 13px; }
	.hak-side-row-main small { display: inline; margin-left: 6px; }
	.hak-bottom { position: absolute; left: max(12px, env(safe-area-inset-left, 0px)); right: max(12px, env(safe-area-inset-right, 0px)); bottom: calc(14px + env(safe-area-inset-bottom, 0px)); z-index: 7; display: flex; align-items: center; justify-content: flex-end; gap: 8px; pointer-events: none; }
	.htk-akatsuki-layout .hak-exit { width: 56px; height: 58px; flex: 0 0 auto; display: grid; place-items: center; border: var(--border); border-radius: 999px; background: var(--masthead); color: var(--fg-2); box-shadow: 0 18px 34px -18px rgba(0, 0, 0, .45), var(--shadow); pointer-events: auto; }
	.hak-exit .ti { font-size: 21px; transform: scaleX(-1); }
	.hak-bottom-case { height: 58px; flex: 1 1 auto; min-width: 0; display: flex; align-items: center; justify-content: flex-end; gap: 4px; padding: 6px; overflow: hidden; border: var(--border); border-radius: 999px; background: var(--masthead); box-shadow: 0 18px 34px -18px rgba(0, 0, 0, .45), var(--shadow); transition: flex-basis .3s cubic-bezier(.2, 0, 0, 1), flex-grow .3s cubic-bezier(.2, 0, 0, 1), gap .2s; pointer-events: auto; }
	.htk-akatsuki-layout .hak-mobile-tab { min-width: 0; height: 46px; flex: 1 1 0; display: grid; place-items: center; border-radius: 999px; color: var(--fg-2); overflow: hidden; transform-origin: right center; transition: flex-basis .24s cubic-bezier(.2, 0, 0, 1), width .24s cubic-bezier(.2, 0, 0, 1), opacity .16s, transform .24s cubic-bezier(.2, 0, 0, 1); }
	.hak-mobile-tab > .ti { font-size: 23px; }
	.hak-mobile-tab[aria-current='page'] { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent-ink); }
	[data-nav-hidden='true'] .hak-bottom-case { flex: 0 0 58px; gap: 0; transition-delay: .14s, .14s, 0s; }
	.htk-akatsuki-layout[data-nav-hidden='true'] .hak-mobile-tab { width: 0; flex: 0 0 0; padding: 0; opacity: 0; pointer-events: none; transform: translateX(20px) scale(.5); }
	[data-nav-hidden='true'] .hak-mobile-tab:nth-child(1) { transition-delay: 0ms; }
	[data-nav-hidden='true'] .hak-mobile-tab:nth-child(2) { transition-delay: 55ms; }
	[data-nav-hidden='true'] .hak-mobile-tab:nth-child(3) { transition-delay: 110ms; }
	[data-nav-hidden='true'] .hak-mobile-tab:nth-child(4) { transition-delay: 165ms; }
	[data-nav-hidden='false'] .hak-mobile-tab:nth-child(1) { transition-delay: 165ms; }
	[data-nav-hidden='false'] .hak-mobile-tab:nth-child(2) { transition-delay: 110ms; }
	[data-nav-hidden='false'] .hak-mobile-tab:nth-child(3) { transition-delay: 55ms; }
	[data-nav-hidden='false'] .hak-mobile-tab:nth-child(4) { transition-delay: 0ms; }
	.htk-akatsuki-layout .hak-fab { width: 46px; height: 46px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 999px; background: var(--accent); color: var(--on-accent); }
	.hak-fab .ti { font-size: 25px; transition: transform .22s cubic-bezier(.2, 0, 0, 1); }
	[data-fab-open='true'] .hak-fab .ti { transform: rotate(45deg); }
	.htk-akatsuki-layout .hak-fab-scrim { position: absolute; display: block; inset: 0; z-index: 5; background: color-mix(in srgb, var(--fg) 42%, transparent); opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .2s, visibility .2s; }
	.hak-fab-sheet { position: absolute; display: block; left: 14px; right: 14px; bottom: calc(84px + env(safe-area-inset-bottom, 0px)); z-index: 6; max-height: calc(100% - 110px - env(safe-area-inset-bottom, 0px)); overflow: auto; border: var(--border); border-radius: 28px; background: var(--masthead); box-shadow: 0 26px 50px -24px rgba(0, 0, 0, .55), var(--shadow); opacity: 0; visibility: hidden; pointer-events: none; transform: translateY(14px); transition: opacity .2s, transform .24s cubic-bezier(.2, 0, 0, 1), visibility .24s; }
	.hak-sheet-head { display: flex; align-items: baseline; gap: 9px; padding: 14px 18px 10px; border-bottom: 1px solid var(--rule2); font-size: 11px; font-weight: 800; letter-spacing: .08em; }
	.hak-sheet-head button { margin-left: auto; min-height: 24px; color: var(--fg-2); font-size: 12px; font-weight: 800; }
	.hak-fab-sheet .hak-sheet-action { width: 100%; min-height: 56px; display: flex; align-items: center; gap: 13px; padding: 14px 18px; border-bottom: 1px solid var(--rule); }
	.hak-sheet-action > .ti:first-child { min-width: 24px; font-size: 21px; color: var(--accent-ink); }
	.hak-sheet-action > .ti:last-child { font-size: 16px; color: var(--fg-2); }
	.hak-sheet-copy { flex: 1; min-width: 0; }
	.hak-sheet-copy strong { display: block; font-size: 14px; font-weight: 800; }
	.hak-sheet-copy small { display: block; margin-top: 2px; color: var(--fg-2); font-size: 11px; }
	.hak-sheet-action:hover { background: var(--accent); color: var(--on-accent); }
	.hak-sheet-action:hover > .ti, .hak-sheet-action:hover small { color: var(--on-accent); }
	[data-fab-open='true'] .hak-fab-scrim, [data-fab-open='true'] .hak-fab-sheet { opacity: 1; visibility: visible; pointer-events: auto; transform: none; }
}
@keyframes hak-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes hak-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
.htk-akatsuki-layout[data-motion='off'], .htk-akatsuki-layout[data-motion='off'] *, .htk-akatsuki-layout[data-motion='off'] *::before, .htk-akatsuki-layout[data-motion='off'] *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
@media (prefers-reduced-motion: reduce) {
	.htk-akatsuki-layout[data-enabled='true'], .htk-akatsuki-layout[data-enabled='true'] *, .htk-akatsuki-layout[data-enabled='true'] *::before, .htk-akatsuki-layout[data-enabled='true'] *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
/* No theme variables, sizing boxes, or scroll containers leak into the four legacy themes. */
.htk-akatsuki-layout[data-enabled='false'],
.htk-akatsuki-layout[data-enabled='false'] :is(.hak-scroll, .hak-body, .hak-center, .hak-tab-content) {
	display: contents;
	container: none;
	isolation: auto;
	position: static;
	overflow: visible;
	font: inherit;
	color: inherit;
	background: none;
}
</style>
