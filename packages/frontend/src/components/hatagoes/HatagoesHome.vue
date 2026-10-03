<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<div ref="rootEl" class="hgh" :class="{ 'hgh-default-order': isDefaultOrder, 'hgh-tablet-half-pair': tabletHalfPair, 'hgh-mobile-half-pair': mobileHalfPair }">
	<div class="hgh-cards">
		<section class="hgh-launcher hgh-launcher-desktop" aria-label="よく使う App">
			<h2><i class="ti ti-apps" aria-hidden="true"></i>よく使う App</h2>
			<div class="hgh-launcher-grid">
				<button v-for="app in launcherApps.slice(0, 12)" :key="app.id" type="button" class="hgh-launcher-app" :title="app.label" @click="emit('openApp', app.id)"><span class="hgh-launcher-icon"><i :class="app.icon" aria-hidden="true"></i></span><small>{{ app.label }}</small></button>
			</div>
			<button type="button" class="hgh-launcher-all" @click="emit('allApps')"><i class="ti ti-layout-grid" aria-hidden="true"></i>すべての App</button>
		</section>
		<section v-if="showV3('daily')" class="hgh-card hgh-card-daily" :style="{ order: v3Order('daily') }" aria-labelledby="hgh-title-daily">
			<div class="hgh-daily-intro"><small>{{ todayLabel }}<span class="hgh-clock"> · {{ timeLabel }}</span></small><h2 id="hgh-title-daily"><span class="hgh-headline-first">{{ dailyHeadlineParts[0] }}<template v-if="dailyHeadlineParts[1]">、</template></span><template v-if="dailyHeadlineParts[1]"><br class="hgh-mobile-break">{{ dailyHeadlineParts[1] }}</template></h2><small v-if="daily.status === 'ready'" class="hgh-mobile-streak">{{ daily.data?.streakDays ?? 0 }} 日連続</small></div>
			<div v-if="daily.status === 'loading'" class="hgh-state"><HataAppLoading app="hatagoes" :size="24" :monochrome="monochrome" :active="active" label="読み込み中"/></div>
			<div v-else-if="daily.status === 'error'" class="hgh-state" role="alert">記録を読み込めませんでした。<button type="button" @click="loadDaily">再試行</button></div>
			<template v-else>
				<div class="hgh-daily-main"><div class="hgh-daily-ring" :style="{ '--hgh-ring': `${(dailyToday?.count ?? 0) * 20}%` }"><div><strong>{{ dailyToday?.known ? dailyToday.count : '—' }}<span>/5</span></strong><small>きょうの記録</small></div></div><div class="hgh-rituals"><button v-for="ritual in rituals" :key="ritual.id" type="button" :class="{ 'is-done': ritual.id === 'water' ? waterDone : dailyToday?.completed.includes(ritual.id) }" :disabled="ritual.id === 'water' ? !canHomeWater : busyActions.includes(ritual.id)" @click="openRitual(ritual.id)"><i :class="ritual.icon" aria-hidden="true"></i><span>{{ ritual.id === 'water' && waterDone ? '水やり済み' : ritual.label }}</span><i :class="ritual.id === 'water' ? waterDone ? 'ti ti-check' : 'ti ti-arrow-up-right' : dailyToday?.completed.includes(ritual.id) ? 'ti ti-check' : 'ti ti-arrow-up-right'" aria-hidden="true"></i></button></div></div>
				<div class="hgh-heat"><div><strong>そろった日</strong><small><b>{{ daily.data?.streakDays ?? 0 }}</b> 日連続</small></div><div class="hgh-heat-days" aria-label="過去2週間の記録"><span v-for="day in daily.data?.days ?? []" :key="day.date" :class="{ 'is-unknown': !day.known, 'is-complete': day.complete }" :style="{ '--hgh-day-fill': `${day.count * 20}%` }" :title="`${day.date} · ${day.known ? `${day.count}/5` : '未集計'}`"></span></div><small>2週間 · 色が濃いほど記録がそろった日</small></div>
			</template>
		</section>
		<section class="hgh-launcher hgh-launcher-mobile" :style="{ order: mobileLauncherOrder }" aria-label="よく使う App">
			<h2><i class="ti ti-apps" aria-hidden="true"></i>よく使う App</h2>
			<div class="hgh-launcher-grid">
				<button v-for="app in launcherApps.slice(0, 7)" :key="app.id" type="button" class="hgh-launcher-app" :title="app.label" @click="emit('openApp', app.id)"><span class="hgh-launcher-icon"><i :class="app.icon" aria-hidden="true"></i></span><small>{{ app.label }}</small></button>
				<button type="button" class="hgh-launcher-app hgh-launcher-app-all" @click="emit('allApps')"><span class="hgh-launcher-icon"><i class="ti ti-layout-grid" aria-hidden="true"></i></span><small>すべて</small></button>
			</div>
		</section>
		<section v-for="card in visibleCards" :key="card.id" class="hgh-card" :class="`hgh-card-${card.id}`" :style="{ order: v3Order(card.id) }" :aria-labelledby="`hgh-title-${card.id}`">
			<header class="hgh-card-header"><h2 :id="`hgh-title-${card.id}`"><i :class="icons[card.id]" aria-hidden="true"></i>{{ card.id === 'schedule' ? 'いま' : card.id === 'todo' ? 'ToDo' : card.id === 'mood' ? 'いまのきもち' : card.id === 'meal' ? 'きょうのごはん' : card.id === 'reading' ? '読みかけ' : card.id === 'issues' ? state.issues.data.source === 'mine' ? 'あなたのイシュー' : '新しいイシュー' : titles[card.id] }}<small v-if="card.id === 'todo' && state.todo.status === 'ready'">{{ state.todo.data.total ?? state.todo.data.rows.length }}</small></h2><span v-if="cardBrand[card.id]" class="hgh-brand"><HataAppLogo :app="cardBrand[card.id]!" :size="16" :monochrome="monochrome"/><HataAppWordmark :app="cardBrand[card.id]!" :onDark="monochrome"/></span><span v-else-if="card.id === 'todo'" class="hgh-card-meta">優先度順</span><button v-else-if="state[card.id].status !== 'ready' || !state[card.id].data.unavailable" type="button" class="hgh-open" :aria-label="`${titles[card.id]}を開く`" @click="emit('navigate', paths[card.id])"><i class="ti ti-chevron-right" aria-hidden="true"></i></button></header>
			<div v-if="state[card.id].status === 'loading'" class="hgh-state"><HataAppLoading :app="cardBrand[card.id] ?? 'hatagoes'" :size="24" :monochrome="monochrome" :active="active" label="読み込み中"/></div>
			<div v-else-if="state[card.id].status === 'error'" class="hgh-state" role="alert">読み込めませんでした。<button type="button" @click="retry(card.id)">再試行</button></div>
			<template v-else>
				<template v-if="card.id === 'schedule'">
					<div v-if="state.schedule.data.currentEvent || state.schedule.data.nextEvent" class="hgh-event-hero">
						<p class="hgh-kicker">{{ eventTime(state.schedule.data.currentEvent ?? state.schedule.data.nextEvent!) }}<template v-if="state.schedule.data.currentEvent?.endsAt"> · 残り{{ remainingMinutes(state.schedule.data.currentEvent) }}分</template></p>
						<button type="button" class="hgh-hero-title" @click="emit('navigate', (state.schedule.data.currentEvent ?? state.schedule.data.nextEvent!).path)">{{ (state.schedule.data.currentEvent ?? state.schedule.data.nextEvent!).title }} <i class="ti ti-arrow-up-right" aria-hidden="true"></i></button>
						<progress v-if="eventProgress(state.schedule.data.currentEvent) != null" max="100" :value="eventProgress(state.schedule.data.currentEvent) ?? undefined" :aria-label="`進行 ${eventProgress(state.schedule.data.currentEvent)}%`"></progress>
					</div>
					<button v-if="state.schedule.data.currentEvent && state.schedule.data.nextEvent" type="button" class="hgh-next-event" @click="emit('navigate', state.schedule.data.nextEvent.path)"><time>{{ eventTime(state.schedule.data.nextEvent) }}</time><i class="ti ti-point-filled" aria-hidden="true"></i><span>{{ state.schedule.data.nextEvent.title }}</span><i class="ti ti-chevron-right" aria-hidden="true"></i></button>
					<ul v-if="!state.schedule.data.currentEvent && !state.schedule.data.nextEvent && state.schedule.data.rows.length" class="hgh-list"><li v-for="row in state.schedule.data.rows" :key="row.id"><button type="button" class="hgh-row" @click="emit('navigate', row.path)"><span>{{ row.title }}</span><small>{{ row.detail }}</small></button></li></ul>
					<p v-else-if="!state.schedule.data.currentEvent && !state.schedule.data.nextEvent" class="hgh-empty">今後30日の予定はありません。</p>
				</template>
				<template v-else-if="card.id === 'todo'">
					<ul v-if="state.todo.data.rows.length" class="hgh-list hgh-todos"><li v-for="row in state.todo.data.rows" :key="row.id"><button type="button" class="hgh-check" :disabled="busyTodoIds.includes(row.id)" :aria-label="`${row.title}を完了にする`" @click="emit('toggleTodo', row.id)"><i class="ti ti-square" aria-hidden="true"></i></button><button type="button" class="hgh-row" @click="emit('navigate', row.path)"><span>{{ row.title }}</span><small v-if="row.detail">{{ row.detail }}</small></button><span v-if="row.priority && row.priority !== 'none'" class="hgh-priority" :data-priority="row.priority">{{ priorityLabel[row.priority] }}</span></li></ul>
					<p v-else class="hgh-empty">未完了の ToDo はありません。</p>
				</template>
				<template v-else-if="card.id === 'flower'">
					<button type="button" class="hgh-tile-body" @click="emit('navigate', paths.flower)"><span class="hgh-tile-icon" :style="{ '--flower-progress': `${state.flower.data.flower?.progress ?? 0}%` }" aria-hidden="true"><span class="hgh-tile-icon-inner"><HataskEmoji :emoji="state.flower.data.flower?.emoji ?? '✿'"/></span></span><strong>{{ state.flower.data.flower?.name ?? 'おはな' }}</strong><small v-if="state.flower.data.flower">成長 {{ state.flower.data.flower.progress }}% · 花しずく {{ state.flower.data.flower.drops }}個</small><small v-else>花の情報はありません。</small><span class="hgh-sr-only">を開く</span></button>
					<button v-if="state.flower.data.flower?.canWater || waterDone" type="button" class="hgh-water-action" :disabled="!canHomeWater" @click="requestWater"><i class="ti ti-droplet" aria-hidden="true"></i> {{ waterDone ? 'きょうは水やり済み' : '水をあげる' }} <i v-if="!waterDone" class="ti ti-arrow-right" aria-hidden="true"></i></button>
					<small v-if="state.flower.data.flower?.canWater && state.flower.data.flower.pourMinutes != null" class="hgh-water-explain">1回で花しずく1個を使い、{{ state.flower.data.flower.pourMinutes }}分育ちます</small>
					<small v-if="state.flower.data.flower" class="hgh-harvested">咲いたおはな <b>{{ state.flower.data.flower.harvestedCount }}</b> 本</small>
				</template>
				<template v-else-if="card.id === 'mood'">
					<p class="hgh-card-status">{{ journal.data?.mood ? `${journal.data.mood.emoji ?? '●'} ${journal.data.mood.note?.trim() || 'きもちを記録しました'}` : 'きもち未記録' }}</p><div class="hgh-mood-choices"><button v-for="mood in moodChoices" :key="mood.level" type="button" :class="{ 'is-selected': Number(journal.data?.mood?.level) === mood.level }" :aria-label="`きもちを${mood.label}で記録`" :disabled="busyActions.includes('mood')" @click="emit('recordMood', mood.level)"><i :class="mood.icon" aria-hidden="true"></i></button></div><div class="hgh-mood-week"><span v-for="day in journal.data?.week ?? []" :key="day.date" :title="`${day.date} · ${day.mood ? day.mood.emoji ?? day.mood.level : '記録なし'}`"><small>{{ day.label }}</small><i :class="moodIcon(day.mood?.level)" aria-hidden="true"></i></span></div>
				</template>
				<template v-else-if="card.id === 'meal'">
					<div class="hgh-meal-choices"><button v-for="meal in mealChoices" :key="meal.slot" type="button" :disabled="busyActions.includes('meal')" @click="emit('recordMeal', meal.slot)"><i :class="meal.icon" aria-hidden="true"></i><strong>{{ meal.label }}</strong><small>{{ journal.data?.meals.find(item => item.slot === meal.slot)?.entry?.note?.trim() || (journal.data?.meals.find(item => item.slot === meal.slot)?.entry ? '記録済み' : '記録する') }}</small></button></div>
				</template>
				<template v-else-if="card.id === 'reading'">
					<div v-if="state.reading.data.rows[0]" class="hgh-feature-book"><span class="hgh-book-cover" aria-hidden="true"><HyBookCover :title="state.reading.data.rows[0].title" :author="state.reading.data.rows[0].author" :colorIndex="state.reading.data.rows[0].coverColorIndex" :width="58" :showTitle="true"/></span><div class="hgh-book-copy"><button type="button" class="hgh-row" @click="emit('navigate', state.reading.data.rows[0].path)"><span>{{ state.reading.data.rows[0].title }}</span><small v-if="state.reading.data.rows[0].currentPage != null">{{ state.reading.data.rows[0].currentPage }}<template v-if="state.reading.data.rows[0].totalPages"> / {{ state.reading.data.rows[0].totalPages }}</template> ページ</small><small v-else-if="state.reading.data.rows[0].author">{{ state.reading.data.rows[0].author }}</small></button><progress v-if="state.reading.data.rows[0].progress != null" max="100" :value="state.reading.data.rows[0].progress" :aria-label="`読書進捗 ${state.reading.data.rows[0].progress}%`"></progress></div></div><button v-if="state.reading.data.rows[0]" type="button" class="hgh-reading-action" :disabled="busyActions.includes('reading')" @click="emit('recordReading', state.reading.data.rows[0].id)"><i class="ti ti-player-play" aria-hidden="true"></i>続きを記録</button>
					<p v-else class="hgh-empty">読みかけの本はありません。</p>
				</template>
				<template v-else-if="card.id === 'issues'">
					<p v-if="state.issues.data.unavailable && state.issues.data.summary" class="hgh-summary">{{ state.issues.data.summary }}</p>
					<button v-if="state.issues.data.rows[0]" type="button" class="hgh-issue-feature" @click="emit('navigate', state.issues.data.rows[0].path)"><small>{{ state.issues.data.rows[0].detail }}</small><strong>{{ state.issues.data.rows[0].title }}</strong><span v-if="state.issues.data.rows[0].status" class="hgh-issue-steps" :data-status="state.issues.data.rows[0].status"><span v-for="step in issueSteps" :key="step.id">{{ step.label }}</span></span><small v-if="state.issues.data.rows[0].agreementsCount != null || state.issues.data.rows[0].commentsCount != null"><i class="ti ti-heart" aria-hidden="true"></i> {{ state.issues.data.rows[0].agreementsCount ?? 0 }} · コメント {{ state.issues.data.rows[0].commentsCount ?? 0 }}</small></button>
					<p v-else-if="!state.issues.data.unavailable" class="hgh-empty">表示できるイシューはありません。</p>
				</template>
			</template>
			<footer v-if="creation[card.id] && !['mood', 'meal', 'reading'].includes(card.id) && !(state[card.id].status === 'ready' && state[card.id].data.unavailable)"><button type="button" @click="create(card.id)"><i class="ti ti-plus" aria-hidden="true"></i> {{ creation[card.id]?.label }}</button><button v-if="card.id === 'schedule'" type="button" @click="emit('navigate', paths.schedule)">予定を見る <i class="ti ti-arrow-right" aria-hidden="true"></i></button></footer>
		</section>
		<section v-if="showV3('history')" class="hgh-card hgh-card-history" :style="{ order: v3Order('history') }" aria-labelledby="hgh-title-history"><header class="hgh-card-header"><h2 id="hgh-title-history"><i class="ti ti-history" aria-hidden="true"></i>先週のきょう</h2></header><div v-if="journal.status === 'loading'" class="hgh-state"><HataAppLoading app="hatagoes" :size="24" :monochrome="monochrome" :active="active" label="読み込み中"/></div><div v-else-if="journal.status === 'error'" class="hgh-state" role="alert">記録を読み込めませんでした。<button type="button" @click="loadJournal">再試行</button></div><template v-else><p v-if="journal.data?.history.mood || journal.data?.history.meals.length" class="hgh-history-entry"><i class="ti ti-mood-smile" aria-hidden="true"></i><span>{{ historySummary }}</span></p><p v-if="journal.data?.history.mood?.note" class="hgh-history-note">「{{ journal.data.history.mood.note }}」</p><p v-else-if="!journal.data?.history.mood && !journal.data?.history.meals.length" class="hgh-empty">{{ journal.data?.history.date }} の記録はありません。</p></template></section>
		<section v-if="showV3('feed')" class="hgh-card-feed" :style="{ order: v3Order('feed') }" aria-label="みんなのきょう"><HatagoesSharedFeed ref="feedRef" :active="active" :revision="revision" @navigate="emit('navigate', $event)" @feedState="emit('feedState', $event)"/></section>
	</div>
</div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import HataAppLogo from '@/components/HataAppLogo.vue';
import HataAppWordmark from '@/components/HataAppWordmark.vue';
import HataAppLoading from '@/components/HataAppLoading.vue';
import type { HataApp } from '@/utility/hata-app-brand.js';
import HataskEmoji from '@/components/HataskEmoji.vue';
import HyBookCover from '@/components/HyBookCover.vue';
import HatagoesSharedFeed from './HatagoesSharedFeed.vue';
import type { HatagoesCardV3, HatagoesCardV3Id } from '@/utility/hatagoes-preferences.js';
import type { HatagoesCatalogEntry } from '@/utility/hatagoes-catalog.js';
import type { HatagoesHomeCardId, HatagoesHomeData, HatagoesHomeEvent } from '@/utility/hatagoes-home.js';
import type { HatagoesDailySummary, HatagoesJournalV3, HatagoesRitual } from '@/utility/hatagoes-home-v3.js';
import { loadHatagoesDaily, loadHatagoesJournalV3 } from '@/utility/hatagoes-home-v3.js';
import { normalizeHatagoesCardsV3 } from '@/utility/hatagoes-preferences.js';
import {
	HATAGOES_HOME_PATHS as paths, HATAGOES_HOME_TITLES as titles,
	loadHatagoesFlower, loadHatagoesIssues, loadHatagoesPlanner, loadHatagoesReading,
} from '@/utility/hatagoes-home.js';
import { toLocalDateKey } from '@/utility/hatask-planner-recurrence.js';

type CardState = { status: 'loading' | 'ready' | 'error'; data: HatagoesHomeData };
const props = withDefaults(defineProps<{ cards?: { id: HatagoesHomeCardId; hidden: boolean }[]; cardsV3?: HatagoesCardV3[]; launcherApps?: readonly HatagoesCatalogEntry[]; revision: number; active?: boolean; monochrome?: boolean; busyTodoIds?: string[]; busyActions?: string[] }>(), { active: true, monochrome: false, busyTodoIds: () => [], busyActions: () => [], launcherApps: () => [] });
const emit = defineEmits<{ navigate: [path: string]; create: [app: 'hatask' | 'hatady' | 'hatafeed', kind: string]; toggleTodo: [id: string]; recordMood: [level: 1 | 2 | 3 | 4 | 5]; water: [day: string]; recordMeal: [slot: 'breakfast' | 'lunch' | 'dinner']; recordReading: [bookId: string]; feedState: [active: boolean]; openApp: [screenId: string]; allApps: [] }>();
type V3LegacyId = Exclude<HatagoesHomeCardId, 'community' | 'roadmap'>;
const ids: V3LegacyId[] = ['schedule', 'todo', 'flower', 'mood', 'meal', 'reading', 'issues'];
const empty = (): CardState => ({ status: 'loading', data: { rows: [] } });
const state = reactive<Record<HatagoesHomeCardId, CardState>>(Object.fromEntries(ids.map(id => [id, empty()])) as Record<HatagoesHomeCardId, CardState>);
const v3Cards = computed(() => props.cardsV3 ?? normalizeHatagoesCardsV3(undefined, props.cards));
const isDefaultOrder = computed(() => v3Cards.value.map(card => card.id).join(',') === 'daily,schedule,flower,todo,mood,meal,reading,issues,history,feed');
const showV3 = (id: HatagoesCardV3Id) => v3Cards.value.some(card => card.id === id && !card.hidden);
const v3Order = (id: HatagoesCardV3Id) => v3Cards.value.findIndex(card => card.id === id) * 2;
const mobileLauncherOrder = computed(() => showV3('daily') ? v3Order('daily') + 1 : -1);
const visibleCards = computed(() => v3Cards.value.filter((card): card is { id: V3LegacyId; hidden: boolean } => !card.hidden && ids.some(id => id === card.id)));
const visibleIds = computed(() => new Set(visibleCards.value.map(card => card.id)));
const halfPair = (excludeHistory: boolean) => {
	const visible = v3Cards.value.filter(card => !card.hidden && (!excludeHistory || card.id !== 'history')).map(card => card.id);
	if (isDefaultOrder.value && excludeHistory) return visible.includes('flower') && visible.includes('reading');
	return Math.abs(visible.indexOf('flower') - visible.indexOf('reading')) === 1 && visible.includes('flower') && visible.includes('reading');
};
const tabletHalfPair = computed(() => halfPair(false));
const mobileHalfPair = computed(() => halfPair(true));
const creation: Partial<Record<HatagoesHomeCardId, { app: 'hatask' | 'hatady' | 'hatafeed'; kind: string; label: string }>> = {
	schedule: { app: 'hatask', kind: 'event', label: '予定を作る' }, todo: { app: 'hatask', kind: 'todo', label: 'ToDo を作る' },
	mood: { app: 'hatask', kind: 'mood', label: 'きもちを記録' }, meal: { app: 'hatask', kind: 'meal', label: '食事を記録' },
	reading: { app: 'hatady', kind: 'book', label: '本を追加' }, issues: { app: 'hatafeed', kind: 'issue', label: 'イシューを作る' },
};
const icons: Record<HatagoesHomeCardId, string> = { schedule: 'ti ti-calendar-event', todo: 'ti ti-checkbox', flower: 'ti ti-flower', mood: 'ti ti-mood-smile', meal: 'ti ti-soup', reading: 'ti ti-book-2', issues: 'ti ti-message-report', community: 'ti ti-users', roadmap: 'ti ti-route' };
const cardBrand: Partial<Record<HatagoesHomeCardId, HataApp>> = { schedule: 'hatask', flower: 'hatask', meal: 'hatask', reading: 'hatady', issues: 'hatafeed', community: 'hatady', roadmap: 'hatafeed' };
const priorityLabel = { high: '高', medium: '中', low: '低', none: '' };
const issueSteps = [{ id: 'open', label: '受付' }, { id: 'planned', label: '確認' }, { id: 'inProgress', label: '対応中' }, { id: 'resolved', label: '完了' }] as const;
const now = ref(new Date());
const rootEl = ref<HTMLElement | null>(null);
const feedRef = ref<InstanceType<typeof HatagoesSharedFeed> | null>(null);

function scrollToTop(): void { if (feedRef.value) feedRef.value.scrollToTop(); else rootEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

defineExpose({ scrollToTop, markWatered });
const daily = reactive<{ status: 'loading' | 'ready' | 'error'; data: HatagoesDailySummary | null }>({ status: 'loading', data: null });
const wateredDay = ref<string | null>(null);
const journal = reactive<{ status: 'loading' | 'ready' | 'error'; data: HatagoesJournalV3 | null }>({ status: 'loading', data: null });
const dailyToday = computed(() => daily.data?.days.find(day => day.date === daily.data?.today));
const waterDone = computed(() => daily.status === 'ready' && !!daily.data?.today && (dailyToday.value?.completed.includes('water') === true || wateredDay.value === daily.data.today));
const canHomeWater = computed(() => daily.status === 'ready' && !!daily.data?.today && dailyToday.value?.known === true && !waterDone.value && state.flower.data.flower?.canWater === true && !props.busyActions.includes('water'));
const todayLabel = computed(() => new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' }).format(daily.data?.today ? new Date(`${daily.data.today}T12:00:00`) : now.value));
const timeLabel = computed(() => new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(now.value));
const dailyHeadline = computed(() => dailyToday.value?.known && dailyToday.value.complete ? 'きょうの記録がそろいました。' : 'きょうの記録を、ひとつずつ。');
const dailyHeadlineParts = computed(() => {
	const index = dailyHeadline.value.indexOf('、');
	return index < 0 ? [dailyHeadline.value] : [dailyHeadline.value.slice(0, index), dailyHeadline.value.slice(index + 1)];
});
const historySummary = computed(() => [journal.data?.history.mood ? `きもち「${journal.data.history.mood.emoji ?? journal.data.history.mood.level}」` : null, ...(journal.data?.history.meals ?? []).map(meal => meal.note?.trim() || '食事の記録')].filter(Boolean).join(' · '));
const rituals: { id: HatagoesRitual; label: string; icon: string }[] = [
	{ id: 'mood', label: 'きもち', icon: 'ti ti-mood-smile' }, { id: 'meal', label: 'ごはん', icon: 'ti ti-soup' },
	{ id: 'todo', label: 'ToDo', icon: 'ti ti-checkbox' }, { id: 'water', label: '水やり', icon: 'ti ti-droplet' }, { id: 'reading', label: '読書', icon: 'ti ti-book-2' },
];
const moodChoices: { level: 1 | 2 | 3 | 4 | 5; label: string; icon: string }[] = [
	{ level: 1, label: 'とてもつらい', icon: 'ti ti-mood-sad-2' }, { level: 2, label: 'つらい', icon: 'ti ti-mood-sad' },
	{ level: 3, label: 'ふつう', icon: 'ti ti-mood-neutral' }, { level: 4, label: 'いい', icon: 'ti ti-mood-smile' }, { level: 5, label: 'とてもいい', icon: 'ti ti-mood-happy' },
];
const mealChoices: { slot: 'breakfast' | 'lunch' | 'dinner'; label: string; icon: string }[] = [
	{ slot: 'breakfast', label: '朝', icon: 'ti ti-sunrise' }, { slot: 'lunch', label: '昼', icon: 'ti ti-sun' }, { slot: 'dinner', label: '夜', icon: 'ti ti-moon' },
];
const moodIcon = (level?: number | string) => moodChoices.find(mood => mood.level === Number(level))?.icon ?? 'ti ti-minus';
let generation = 0;
let clockTimer: number | undefined;
const sourceVersion: Record<string, number> = {};

function openRitual(id: HatagoesRitual): void {
	if (id === 'water') requestWater();
	else if (id === 'mood' || id === 'meal') emit('navigate', paths[id]);
	else emit('navigate', id === 'todo' ? paths.todo : paths.reading);
}

function requestWater(): void { if (canHomeWater.value && daily.data) emit('water', daily.data.today); }

function markWatered(day: string): void { wateredDay.value = day; }

async function loadDaily(): Promise<void> {
	const version = ++generation; sourceVersion.daily = version; daily.status = 'loading';
	try { const data = await loadHatagoesDaily(); if (sourceVersion.daily === version) { daily.data = data; daily.status = 'ready'; } } catch { if (sourceVersion.daily === version) daily.status = 'error'; }
	// Daily reconciliation may have grown the flower. Read it after that transaction.
	if (sourceVersion.daily === version && props.active && (showV3('daily') || showV3('flower'))) await loadCard('flower');
}

async function loadJournal(): Promise<void> {
	const version = ++generation; sourceVersion.journal = version; journal.status = 'loading';
	for (const id of ['mood', 'meal'] as const) state[id].status = 'loading';
	try {
		const data = await loadHatagoesJournalV3();
		if (sourceVersion.journal !== version) return;
		journal.data = data; journal.status = 'ready';
		const mealEntries = data.meals.filter(slot => slot.entry);
		const firstMeal = mealEntries[0]?.entry;
		state.mood = { status: 'ready', data: { rows: [], journal: { todayCount: data.mood ? 1 : 0, latestToday: data.mood ? { id: data.mood.id, title: `${data.mood.emoji ?? '●'} ${data.mood.note?.trim() || 'きもちの記録'}`, detail: data.mood.time, path: paths.mood } : undefined } } };
		state.meal = { status: 'ready', data: { rows: [], journal: { todayCount: mealEntries.length, mealSlots: mealEntries.length, latestToday: firstMeal ? { id: firstMeal.id, title: firstMeal.note?.trim() || '食事の記録', path: paths.meal } : undefined } } };
	} catch { if (sourceVersion.journal === version) { journal.status = 'error'; state.mood.status = 'error'; state.meal.status = 'error'; } }
}

function eventTime(event: HatagoesHomeEvent): string { const day = event.date === toLocalDateKey(now.value) ? '' : `${event.date} · `; return event.timeStart ? `${day}${event.timeStart}${event.timeEnd ? `–${event.timeEnd}` : ''}` : `${day || '今日・'}終日`; }

function eventProgress(event: HatagoesHomeEvent | undefined): number | null { return event?.startsAt == null || event.endsAt == null ? null : Math.max(0, Math.min(100, Math.round((now.value.getTime() - event.startsAt) / (event.endsAt - event.startsAt) * 100))); }

function remainingMinutes(event: HatagoesHomeEvent): number { return Math.max(0, Math.ceil(((event.endsAt ?? now.value.getTime()) - now.value.getTime()) / 60000)); }

function create(id: HatagoesHomeCardId): void { const target = creation[id]; if (target) emit('create', target.app, target.kind); }

function update(id: HatagoesHomeCardId, data: HatagoesHomeData, version: number): void { if (sourceVersion[id] === version) state[id] = { status: 'ready', data }; }

async function loadPlanner(): Promise<void> {
	const version = ++generation;
	for (const id of ['schedule', 'todo'] as const) { sourceVersion[id] = version; state[id].status = 'loading'; }
	try { const result = await loadHatagoesPlanner(); update('schedule', result.schedule, version); update('todo', result.todo, version); } catch { for (const id of ['schedule', 'todo'] as const) if (sourceVersion[id] === version) state[id].status = 'error'; }
}

async function loadCard(id: Exclude<V3LegacyId, 'schedule' | 'todo' | 'mood' | 'meal'>): Promise<void> {
	const version = ++generation;
	sourceVersion[id] = version; state[id].status = 'loading';
	try {
		const data = id === 'flower' ? await loadHatagoesFlower() : id === 'reading' ? await loadHatagoesReading() : await loadHatagoesIssues();
		update(id, data, version);
	} catch { if (sourceVersion[id] === version) state[id].status = 'error'; }
}

function retry(id: V3LegacyId): void { if (id === 'schedule' || id === 'todo') void loadPlanner(); else if (id === 'mood' || id === 'meal') void loadJournal(); else void loadCard(id); }

function refresh(): void {
	const shown = visibleCards.value.map(card => card.id);
	if (shown.includes('schedule') || shown.includes('todo')) void loadPlanner();
	for (const id of shown) if (id !== 'schedule' && id !== 'todo' && id !== 'mood' && id !== 'meal' && id !== 'flower') void loadCard(id);
	if (shown.includes('mood') || shown.includes('meal') || showV3('history')) void loadJournal();
	if (showV3('daily') || showV3('flower')) void loadDaily();
}

onMounted(() => {
	if (props.active) refresh();
	clockTimer = window.setInterval(() => {
		const previousDay = now.value.toDateString();
		const previousCurrent = state.schedule.data.currentEvent?.id;
		const previousNext = state.schedule.data.nextEvent?.id;
		now.value = new Date();
		if (!props.active) return;
		if (previousDay !== now.value.toDateString()) refresh();
		else if (visibleIds.value.has('schedule') && state.schedule.status === 'ready' && (
			previousCurrent && state.schedule.data.currentEvent?.endsAt != null && state.schedule.data.currentEvent.endsAt <= now.value.getTime()
			|| previousNext && state.schedule.data.nextEvent?.startsAt != null && state.schedule.data.nextEvent.startsAt <= now.value.getTime()
		)) void loadPlanner();
	}, 30000);
});
onUnmounted(() => { if (clockTimer != null) window.clearInterval(clockTimer); });
watch([() => props.active, () => props.revision], ([active, revision], [wasActive, previousRevision]) => {
	if (active && (!wasActive || revision !== previousRevision)) refresh();
});
watch(visibleCards, (current, previous) => { if (!props.active) return; const before = new Set(previous.map(card => card.id)); const added = current.filter(card => !before.has(card.id)); if (added.some(card => card.id === 'mood' || card.id === 'meal')) void loadJournal(); if (added.some(card => card.id === 'flower')) void loadDaily(); for (const card of added) if (card.id !== 'mood' && card.id !== 'meal' && card.id !== 'flower') retry(card.id); });
watch(() => showV3('daily'), (visible, wasVisible) => { if (props.active && visible && !wasVisible) void loadDaily(); });
watch(() => showV3('history'), (visible, wasVisible) => { if (props.active && visible && !wasVisible) void loadJournal(); });
</script>

<style scoped>
.hgh { --hgh-fg: var(--fg, var(--MI_THEME-fg)); --hgh-muted: var(--fg-2, var(--MI_THEME-fg)); --hgh-accent: var(--accent, var(--MI_THEME-accent)); --hgh-rule: var(--rule, var(--MI_THEME-divider)); --hgh-surface: var(--surface, var(--MI_THEME-panel)); --hgh-bg: var(--bg, var(--MI_THEME-bg)); box-sizing: border-box; container-type: inline-size; width: 100%; padding: 16px clamp(12px, 2vw, 28px) 32px; color: var(--hgh-fg); font-size: 14px; line-height: 1.55; }
.hgh-sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.hgh-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; overflow: hidden; margin-bottom: 10px; border: 1px solid var(--hgh-rule); border-radius: min(var(--case-radius, 20px), 20px); background: var(--hgh-rule); }
.hgh-metric { min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 9px 11px; background: var(--hgh-surface); }
.hgh-metric > span { color: var(--hgh-muted); font-size: 11px; font-weight: 800; }
.hgh-metric strong { font-size: 20px; line-height: 1.2; font-weight: 800; font-variant-numeric: tabular-nums; }
.hgh-metric small { margin-left: 2px; color: var(--hgh-muted); font-size: 11px; font-weight: 600; }
.hgh-metric button { align-self: start; padding: 0; font-size: 11px; }
.hgh-cards { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-flow: row; gap: clamp(10px, 1.1vw, 16px); align-items: stretch; }
.hgh-card { grid-column: span 6; box-sizing: border-box; min-width: 0; padding: 12px clamp(14px, 1.6vw, 24px); border: 1px solid var(--hgh-rule); border-radius: var(--card-radius, 20px); background: var(--hgh-surface); }
.hgh-launcher { grid-column: span 12; box-sizing: border-box; min-width: 0; border: 1px solid var(--hgh-rule); border-radius: var(--card-radius, 20px); background: var(--hgh-surface); box-shadow: var(--hgh-shadow); }
.hgh-launcher-desktop { order: -1; display: flex; align-items: center; gap: 18px; padding: 14px 18px 14px 22px; }
.hgh-launcher-mobile { display: none; }
.hgh-launcher h2 { display: flex; align-items: center; gap: 7px; flex: 0 0 118px; margin: 0; font: 400 15px/1.2 Righteous, var(--htk-font-head, sans-serif); }
.hgh-launcher h2 i { flex: none; font-size: 18px; }
.hgh-launcher-grid { display: grid; flex: 1; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 4px; min-width: 0; }
.hgh-launcher-app { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; min-width: 0; padding: 6px 0; border-radius: 16px; color: var(--hgh-fg) !important; text-align: center; }
.hgh-launcher-app:hover { background: var(--hgh-faint) !important; }
.hgh-launcher-icon { display: grid; place-items: center; box-sizing: border-box; width: 48px; height: 48px; border-radius: min(var(--control-radius, 16px), 16px); background: var(--hgh-faint); color: var(--hgh-accent); }
.hgh-launcher-icon i { font-size: 23px; }
.hgh-launcher-app small { display: block; max-width: 100%; overflow: hidden; color: var(--hgh-fg); font-size: 11px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.hgh-launcher-all { display: inline-flex; flex: none; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px; border: 1.5px solid var(--hgh-rule) !important; border-radius: var(--control-radius, 999px); color: var(--hgh-fg) !important; font-size: 13px !important; font-weight: 800 !important; }
.hgh-launcher-all i { font-size: 17px; }
.hgh-card-schedule, .hgh-card-todo { grid-column: span 6; }
.hgh-card-flower, .hgh-card-mood, .hgh-card-meal { grid-column: span 4; padding: 14px 12px; border-radius: min(var(--card-radius, 18px), 18px); text-align: center; }
.hgh-card-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; min-height: 34px; }
.hgh-card h2 { margin: 0; color: var(--hgh-muted); font-size: 11px; font-weight: 800; letter-spacing: .05em; }
.hgh button { border: 0; background: transparent; color: var(--hgh-accent); cursor: pointer; font: inherit; }
.hgh-card button { box-sizing: border-box; }
.hgh button:focus-visible { outline: 2px solid var(--hgh-accent); outline-offset: 2px; }
.hgh button:disabled { opacity: .45; cursor: wait; }
.hgh-open { flex: none; padding: 4px 0 4px 8px; color: var(--hgh-muted) !important; font-size: 11px !important; }
.hgh-state, .hgh-empty, .hgh-summary { margin: 0; padding: 10px 0; color: var(--hgh-muted); font-size: 12px; }
.hgh-state button { text-decoration: underline; }
.hgh-event-hero { display: flex; flex-direction: column; gap: 5px; }
.hgh-kicker { margin: 0; color: var(--hgh-accent); font-size: 11px; font-weight: 800; }
.hgh-hero-title { align-self: start; max-width: 100%; padding: 0; color: var(--hgh-fg) !important; text-align: left; overflow-wrap: anywhere; font-size: 21px !important; font-weight: 700 !important; line-height: 1.3; }
.hgh-hero-title i { color: var(--hgh-accent); font-size: 15px; }
.hgh-hero-next { margin: 0; color: var(--hgh-muted); font-size: 13px; }
.hgh-event-hero progress { width: 100%; height: 6px; margin-top: 4px; accent-color: var(--hgh-accent); }
.hgh-list { margin: 0; padding: 0; list-style: none; }
.hgh-list li { display: flex; align-items: center; gap: 11px; min-height: 40px; padding: 3px 0; }
.hgh-list li + li { border-top: 1px solid var(--hgh-rule); }
.hgh-list li > i { flex: none; color: var(--hgh-accent); font-size: 19px; }
.hgh-row { display: flex; flex: 1; flex-direction: column; align-items: flex-start; min-width: 0; padding: 4px 0; color: var(--hgh-fg) !important; text-align: left; }
.hgh-row span { max-width: 100%; overflow-wrap: anywhere; font-size: 14px; font-weight: 700; }
.hgh-row small { color: var(--hgh-muted); font-size: 11px; font-weight: 700; }
.hgh-check { display: grid; place-items: center; flex: 0 0 26px; width: 26px; height: 34px; padding: 0; color: var(--hgh-muted) !important; font-size: 20px !important; }
.hgh-priority, .hgh-tag { flex: none; padding: 2px 9px; border-radius: 999px; background: color-mix(in srgb, var(--hgh-accent) 10%, var(--hgh-surface)); color: var(--hgh-accent); font-size: 10px; font-weight: 800; }
.hgh-priority[data-priority='high'] { background: #ffe6e6; color: #b23a3a; }
.hgh-priority[data-priority='medium'] { background: #fff4d6; color: #8a6414; }
.hgh-priority[data-priority='low'] { background: color-mix(in srgb, var(--hgh-fg) 8%, var(--hgh-surface)); color: var(--hgh-muted); }
.hgh-tile-body { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 100%; min-width: 0; padding: 0; color: var(--hgh-fg) !important; }
.hgh-tile-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: min(var(--control-radius, 14px), 14px); background: color-mix(in srgb, var(--hgh-accent) 8%, var(--hgh-surface)); color: var(--hgh-accent); font-size: 22px; }
.hgh-tile-body strong, .hgh-tile-body small { max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hgh-tile-body strong { font-size: 12px; font-weight: 800; }
.hgh-tile-body small { color: var(--hgh-muted); font-size: 11px; }
.hgh-trail { flex: none; min-height: 30px; padding: 0 12px; border-radius: 999px !important; background: var(--hgh-accent) !important; color: var(--hgh-surface) !important; font-size: 12px !important; font-weight: 800 !important; }
.hgh-card footer { display: flex; justify-content: space-between; gap: 10px; border-top: 1px solid var(--hgh-rule); }
.hgh-card footer button { min-height: 32px; padding: 0; font-size: 11px; font-weight: 700; }
.hgh-card-flower footer, .hgh-card-mood footer, .hgh-card-meal footer { margin-top: 7px; }
@container (max-width: 900px) { .hgh-card { grid-column: span 12; } .hgh-card-flower, .hgh-card-mood, .hgh-card-meal { grid-column: span 4; } }
@container (max-width: 540px) { .hgh-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .hgh-card-flower, .hgh-card-mood, .hgh-card-meal { grid-column: span 12; text-align: left; } .hgh-tile-body { flex-direction: row; text-align: left; flex-wrap: wrap; } .hgh-tile-icon { flex: 0 0 44px; } .hgh-tile-body strong { flex: 1; } .hgh-tile-body small { width: 100%; padding-left: 52px; } }
@container (max-width: 430px) { .hgh-card { padding-left: 12px; padding-right: 12px; } }
/* Home v3 card surfaces. Data and actions continue to use the existing sources. */
.hgh { --hgh-faint: color-mix(in srgb, var(--hgh-accent) 8%, var(--hgh-surface)); --hgh-warm: color-mix(in srgb, var(--hgh-accent) 15%, var(--hgh-surface)); --hgh-shadow: var(--shadow, 0 20px 40px -28px rgb(90 50 70 / 55%)); padding-top: 18px; }
.hgh-cards { gap: 14px; }
.hgh-card { padding: 20px 22px; box-shadow: var(--hgh-shadow); }
.hgh-card-flower { background: var(--hgh-warm); box-shadow: none; }
.hgh-card-reading { background: var(--hgh-faint); box-shadow: none; }
.hgh-card-header { min-height: 28px; margin-bottom: 12px; }
.hgh-card h2 { display: flex; align-items: center; gap: 8px; color: var(--hgh-fg); font-family: var(--htk-font-head, sans-serif); font-size: 15px; font-weight: 700; letter-spacing: 0; }
.hgh-card h2 > i { color: var(--hgh-accent); font-size: 18px; }
.hgh-card h2 > small { color: var(--hgh-accent); font-family: Archivo, sans-serif; font-size: 12px; font-weight: 800; }
.hgh-brand { display: inline-flex; align-items: center; gap: 4px; color: var(--hgh-muted); font-size: 12px; }
.hgh-card-meta { color: var(--hgh-muted); font-size: 11px; font-weight: 800; }
.hgh-open { color: var(--hgh-muted) !important; font-size: 17px !important; }
.hgh-event-hero { gap: 5px; }
.hgh-kicker { font-size: 12px; }
.hgh-hero-title { font-family: var(--htk-font-head, sans-serif) !important; font-size: 24px !important; }
.hgh-event-hero progress { height: 6px; margin-top: 10px; }
.hgh-next-event { display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 14px; padding: 12px 0 0 !important; border-top: 1px solid var(--hgh-rule) !important; color: var(--hgh-fg) !important; text-align: left; }
.hgh-next-event time { flex: none; min-width: 44px; color: var(--hgh-muted); font-family: Archivo, sans-serif; font-size: 12px; font-weight: 800; }
.hgh-next-event .ti-point-filled { color: var(--hgh-accent); }
.hgh-next-event span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.hgh-next-event .ti-chevron-right { color: var(--hgh-muted); }
.hgh-todos li { min-height: 48px; }
.hgh-check { color: var(--hgh-accent) !important; }
.hgh-card-flower .hgh-tile-body { gap: 8px; }
.hgh-card-flower .hgh-tile-icon { width: 150px; height: 150px; border-radius: 50%; background: conic-gradient(var(--hgh-accent) 0 var(--flower-progress), var(--hgh-faint) var(--flower-progress) 100%); font-size: 52px; }
.hgh-card-flower .hgh-tile-icon-inner { display: grid; place-items: center; width: 128px; height: 128px; border-radius: 50%; background: var(--hgh-surface); }
.hgh-card-flower .hgh-tile-body strong { font-family: var(--htk-font-head, sans-serif); font-size: 18px; }
.hgh-card-flower .hgh-tile-body small { white-space: normal; }
.hgh-card-mood .hgh-tile-body, .hgh-card-meal .hgh-tile-body { align-items: flex-start; text-align: left; }
.hgh-card-mood .hgh-tile-icon, .hgh-card-meal .hgh-tile-icon { background: var(--hgh-faint); }
.hgh-feature-book { display: flex; align-items: center; gap: 14px; }
.hgh-book-cover { display: block; flex: 0 0 58px; width: 58px; height: 80px; transform: rotate(-4deg); }
.hgh-book-copy { flex: 1; min-width: 0; }
.hgh-book-copy progress { width: 100%; height: 6px; accent-color: var(--hgh-accent); }
.hgh-reading-action { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 44px; margin-top: 12px; padding: 0 16px !important; border-radius: var(--control-radius, 999px) !important; background: var(--hgh-surface) !important; color: var(--hgh-fg) !important; font-size: 13px !important; font-weight: 800 !important; }
.hgh-issue-feature { display: flex; flex-direction: column; align-items: stretch; gap: 6px; width: 100%; padding: 0 !important; color: var(--hgh-fg) !important; text-align: left; }
.hgh-issue-feature > small { color: var(--hgh-muted); font-size: 12px; }
.hgh-issue-feature > strong { font-family: var(--htk-font-head, sans-serif); font-size: 17px; }
.hgh-issue-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; margin: 4px 0; }
.hgh-issue-steps span { display: flex; flex-direction: column; gap: 5px; min-width: 0; color: var(--hgh-muted); font-size: 10px; font-weight: 800; }
.hgh-issue-steps span::before { content: ''; display: block; height: 5px; border-radius: 999px; background: var(--hgh-rule); }
.hgh-issue-steps[data-status='open'] span:first-child::before, .hgh-issue-steps[data-status='planned'] span:nth-child(-n + 2)::before, .hgh-issue-steps[data-status='inProgress'] span:nth-child(-n + 3)::before, .hgh-issue-steps[data-status='resolved'] span::before { background: var(--hgh-accent); }
@container (max-width: 900px) { .hgh-card { padding: 16px; } }
@container (max-width: 540px) { .hgh { padding: 4px 14px 24px; } .hgh-cards { gap: 10px; } .hgh-card { padding: 14px 16px; } .hgh-card h2 { font-size: 14px; } .hgh-hero-title { font-size: 21px !important; } .hgh-card-flower .hgh-tile-body { flex-direction: row; text-align: left; } .hgh-card-flower .hgh-tile-icon { width: 46px; height: 46px; flex: 0 0 46px; font-size: 22px; } .hgh-card-flower .hgh-tile-icon-inner { width: 38px; height: 38px; } }
.hgh-cards { grid-auto-rows: minmax(0, auto); }
.hgh-card-daily { grid-column: span 5; grid-row: span 2; display: grid; grid-template-columns: 150px minmax(0, 1fr); align-content: start; gap: 18px 22px; padding: 24px 26px; }
.hgh-card-schedule { grid-column: span 4; }
.hgh-card-flower { grid-column: span 3; grid-row: span 2; }
.hgh-card-todo { grid-column: span 4; }
.hgh-card-mood, .hgh-card-meal, .hgh-card-reading { grid-column: span 4; text-align: left; }
.hgh-card-issues { grid-column: span 5; }
.hgh-card-history { grid-column: span 7; }
.hgh-card-feed { grid-column: span 12; min-width: 0; }
.hgh-daily-intro > small { color: var(--hgh-muted); font-size: 12px; font-weight: 700; }
.hgh-daily-intro { grid-column: 1 / -1; }
.hgh-mobile-streak { display: none; }
.hgh-card-daily .hgh-daily-intro h2 { display: block; margin: 4px 0 0; color: var(--hgh-fg); font-family: var(--htk-font-head, sans-serif); font-size: 26px; line-height: 1.35; }
.hgh-headline-first { white-space: nowrap; }
.hgh-mobile-break { display: none; }
.hgh-daily-main { display: contents; }
.hgh-daily-ring { display: grid; place-items: center; width: 150px; height: 150px; flex: none; border-radius: 50%; background: conic-gradient(var(--hgh-accent) 0 var(--hgh-ring), var(--hgh-faint) var(--hgh-ring) 100%); }
.hgh-daily-ring > div { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 122px; height: 122px; border-radius: 50%; background: var(--hgh-surface); }
.hgh-daily-ring strong { font-family: Archivo, sans-serif; font-size: 38px; font-weight: 800; line-height: 1; }
.hgh-daily-ring strong span { color: var(--hgh-muted); font-size: 20px; }
.hgh-daily-ring small { margin-top: 4px; color: var(--hgh-muted); font-size: 11px; font-weight: 800; }
.hgh-rituals { display: flex; flex-direction: column; align-self: center; gap: 6px; min-width: 0; }
.hgh-rituals button { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 34px; padding: 0 12px; border-radius: var(--control-radius, 16px); background: var(--hgh-faint); color: var(--hgh-fg); text-align: left; font-size: 13px; font-weight: 800; }
.hgh-rituals button.is-done { background: var(--hgh-accent); color: var(--on-accent, var(--MI_THEME-fgOnAccent)); }
.hgh-rituals button span { flex: 1; }
.hgh-heat { display: flex; grid-column: 1 / -1; flex-direction: column; gap: 8px; padding-top: 14px; border-top: 1px solid var(--hgh-rule); }
.hgh-heat > div:first-child { display: flex; justify-content: space-between; align-items: baseline; }
.hgh-heat strong { font-family: var(--htk-font-head, sans-serif); font-size: 14px; }
.hgh-heat small { color: var(--hgh-muted); font-size: 11px; }
.hgh-heat b { color: var(--hgh-accent); font-family: Archivo, sans-serif; font-size: 15px; }
.hgh-heat-days { display: grid; grid-template-columns: repeat(14, minmax(0, 1fr)); gap: 5px; }
.hgh-heat-days span { aspect-ratio: 1; border-radius: 6px; background: linear-gradient(to top, var(--hgh-accent) var(--hgh-day-fill), var(--hgh-faint) var(--hgh-day-fill)); }
.hgh-heat-days span.is-unknown { background: repeating-linear-gradient(45deg, var(--hgh-faint), var(--hgh-faint) 3px, var(--hgh-rule) 3px, var(--hgh-rule) 4px); }
.hgh-heat-days span.is-complete { background: var(--hgh-accent); }
.hgh-card-history .hgh-empty { padding-bottom: 0; }
.hgh-card-status { margin: 0; color: var(--hgh-muted); font-size: 12px; }
.hgh-mood-choices { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; margin-top: 10px; }
.hgh-mood-choices button { display: grid; place-items: center; height: 52px; border-radius: 16px; background: var(--hgh-faint); color: var(--hgh-accent); font-size: 23px; }
.hgh-mood-choices button.is-selected { background: var(--hgh-accent); color: var(--on-accent, var(--hgh-surface)); }
.hgh-mood-week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; margin-top: 10px; text-align: center; }
.hgh-mood-week span { display: flex; flex-direction: column; align-items: center; gap: 2px; color: var(--hgh-muted); }
.hgh-mood-week small { font-size: 10px; font-weight: 800; }
.hgh-mood-week i { color: var(--hgh-accent); font-size: 17px; }
.hgh-meal-choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.hgh-meal-choices button { display: flex; flex-direction: column; gap: 3px; min-height: 74px; padding: 10px 12px; border: 1px solid var(--hgh-rule); border-radius: 16px; background: var(--hgh-faint); color: var(--hgh-fg); text-align: left; }
.hgh-meal-choices button i { color: var(--hgh-accent); }
.hgh-meal-choices button strong { font-size: 12px; }
.hgh-meal-choices button small { color: var(--hgh-muted); font-size: 11px; }
.hgh-card-meal .hgh-card-status { margin-top: 8px; }
.hgh-water-action { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; min-height: 48px; margin-top: 12px; padding: 0 18px; border-radius: var(--control-radius, 999px); background: var(--hgh-accent) !important; color: var(--on-accent, var(--MI_THEME-fgOnAccent)) !important; font-size: 14px; font-weight: 800; }
.hgh-water-action:disabled { opacity: .6; cursor: default; }
.hgh-water-explain { display: block; margin-top: 5px; color: var(--hgh-muted); font-size: 11px; }
.hgh-harvested { display: block; margin-top: 10px; color: var(--hgh-muted); font-size: 11px; }
.hgh-harvested b { color: var(--hgh-fg); font-family: Archivo, sans-serif; font-size: 13px; }
.hgh-history-entry { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 13px; }
.hgh-history-entry i { color: var(--hgh-accent); font-size: 22px; }
.hgh-history-note { margin: 8px 0 0; color: var(--hgh-muted); font-size: 12px; line-height: 1.7; }
@container (max-width: 540px) { .hgh-card-history { display: none; } }
@container (max-width: 540px) { .hgh-daily-intro > .hgh-mobile-streak { display: block; margin-top: 2px; color: var(--hgh-accent); font-size: 12px; font-weight: 800; } }
@container (max-width: 540px) { .hgh-mobile-break { display: inline; } }
@container (max-width: 1100px) { .hgh-card-daily, .hgh-card-schedule { grid-column: span 6; grid-row: auto; } .hgh-card-flower { grid-column: span 4; grid-row: auto; } .hgh-card-todo { grid-column: span 8; } }
@container (max-width: 760px) { .hgh-card-daily, .hgh-card-schedule, .hgh-card-todo, .hgh-card-mood, .hgh-card-meal, .hgh-card-issues, .hgh-card-history, .hgh-card-feed { grid-column: span 12; } .hgh-card-flower, .hgh-card-reading { grid-column: span 12; grid-row: auto; } .hgh-tablet-half-pair .hgh-card-flower, .hgh-tablet-half-pair .hgh-card-reading { grid-column: span 6; } .hgh-card-daily { grid-row: auto; } }
@container (max-width: 540px) { .hgh-card-daily { grid-template-columns: 96px minmax(0, 1fr); align-items: center; padding: 18px; gap: 14px 16px; } .hgh-daily-intro { grid-column: 2; grid-row: 1; } .hgh-clock { display: none; } .hgh-daily-ring { grid-column: 1; grid-row: 1; width: 96px; height: 96px; } .hgh-daily-ring > div { width: 78px; height: 78px; } .hgh-daily-ring strong { font-size: 25px; } .hgh-daily-ring strong span { font-size: 14px; } .hgh-card-daily .hgh-daily-intro h2 { font-size: 18px; } .hgh-rituals { display: grid; grid-column: 1 / -1; grid-row: 2; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; } .hgh-rituals button { flex-direction: column; justify-content: center; gap: 2px; min-height: 56px; padding: 4px 2px; font-size: 10px; } .hgh-rituals button i:last-child { display: none; } .hgh-rituals button i:first-child { font-size: 18px; } .hgh-heat { display: none; } .hgh-card-flower, .hgh-card-reading { grid-column: span 12; } .hgh-mobile-half-pair .hgh-card-flower, .hgh-mobile-half-pair .hgh-card-reading { grid-column: span 6; } .hgh-default-order .hgh-card-flower { order: 4 !important; } .hgh-default-order .hgh-card-reading { order: 5 !important; } .hgh-default-order .hgh-card-todo { order: 2 !important; } .hgh-default-order .hgh-card-mood { order: 3 !important; } .hgh-default-order .hgh-card-meal { order: 6 !important; } .hgh-default-order .hgh-card-issues { order: 7 !important; } .hgh-default-order .hgh-card-history { order: 8 !important; } .hgh-default-order .hgh-card-feed { order: 9 !important; } .hgh-card-flower .hgh-tile-body { flex-direction: column; align-items: flex-start; } .hgh-card-flower .hgh-tile-body small { padding-left: 0; } }
@container (max-width: 540px) { .hgh .hgh-card-flower, .hgh .hgh-card-reading { grid-column: span 12; } .hgh-mobile-half-pair .hgh-card-flower, .hgh-mobile-half-pair .hgh-card-reading { grid-column: span 6; } }
@container (max-width: 540px) { .hgh-book-cover { flex-basis: 32px; width: 32px; height: 44px; transform: rotate(-4deg); } .hgh-book-cover > * { transform: scale(.55); transform-origin: top left; } .hgh-feature-book { gap: 8px; } }
@container (max-width: 900px) {
	.hgh-launcher-desktop { display: none; }
	.hgh-launcher-mobile { display: flex; flex-direction: column; gap: 6px; padding: 12px 10px 8px; }
	.hgh-launcher-mobile h2 { flex: none; padding: 0 6px; font-size: 14px; }
	.hgh-launcher-mobile .hgh-launcher-grid { width: 100%; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2px; }
	.hgh-launcher-mobile .hgh-launcher-app { gap: 4px; border-radius: 14px; }
	.hgh-launcher-mobile .hgh-launcher-icon { width: 50px; height: 50px; font-size: 24px; }
	.hgh-launcher-app-all .hgh-launcher-icon { border: 1.5px dashed var(--hgh-rule); background: transparent; color: var(--hgh-muted); }
}
@container (min-width: 901px) and (max-width: 1100px) {
	.hgh-launcher-desktop { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
	.hgh-launcher-desktop h2 { grid-column: 1; grid-row: 1; }
	.hgh-launcher-desktop .hgh-launcher-all { grid-column: 2; grid-row: 1; }
	.hgh-launcher-desktop .hgh-launcher-grid { grid-column: 1 / -1; grid-row: 2; width: 100%; }
}
@container (max-width: 540px) {
	.hgh-card-daily .hgh-daily-intro h2 { font-size: clamp(15px, 5cqw, 18px); }
	.hgh-headline-first { white-space: normal; }
	.hgh-default-order .hgh-card-todo { order: 4 !important; }
	.hgh-default-order .hgh-card-mood { order: 6 !important; }
	.hgh-default-order .hgh-card-flower { order: 8 !important; }
	.hgh-default-order .hgh-card-reading { order: 10 !important; }
	.hgh-default-order .hgh-card-meal { order: 12 !important; }
	.hgh-default-order .hgh-card-issues { order: 14 !important; }
	.hgh-default-order .hgh-card-history { order: 16 !important; }
	.hgh-default-order .hgh-card-feed { order: 18 !important; }
}
</style>
