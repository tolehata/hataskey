<!-- SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<MkStickyContainer>
	<div :class="[$style.root, 'hatady-scope']" :data-hatady-theme="hatadyTheme" :data-hatady-lang="versatileLang">
		<header :class="$style.header">
			<button :class="$style.brand" @click="setTab('home')">Hatady</button>
			<button :class="[$style.mobileExit, 'hy-icon-button']" type="button" aria-label="Hatadyを終了" title="Hatadyを終了" @click="exitHatady">
				<i class="ti ti-logout-2" aria-hidden="true"></i>
			</button>
			<HyNav :class="$style.nav" :modelValue="activeTab" :options="tabs" @update:modelValue="setTab($event, true)"/>
			<div :class="$style.headerActions">
				<button class="hy-primary" :aria-label="copy.recordActivity" @click="openActivityComposer">
					<i class="ti ti-plus" aria-hidden="true"></i>
				</button>
				<button class="hy-icon-button" :aria-label="copy.searchAll" @click="openFullSearch('')">
					<i class="ti ti-search" aria-hidden="true"></i>
				</button>
				<button ref="bell" class="hy-icon-button" :aria-label="copy.notifications" @click="openNotifications">
					<i class="ti ti-bell" aria-hidden="true"></i>
					<span v-if="unread" :class="$style.badge">{{ unread > 99 ? '99+' : unread }}</span>
				</button>
				<button class="hy-icon-button" :aria-label="copy.settings" @click="openSettings">
					<i class="ti ti-settings" aria-hidden="true"></i>
				</button>
			</div>
			<button ref="menu" :class="[$style.mobileMenu, 'hy-secondary']" :aria-label="copy.settings" @click="openMenu">
				<i class="ti ti-dots" aria-hidden="true"></i>
			</button>
		</header>
		<main ref="mainEl" :class="$style.main" @scroll.passive="onPageScroll">
			<HatadyHome
				v-if="activeTab === 'home'"
				:revision="revision"
				:stats="stats"
				@record="openActivityComposer"
				@records="showRecords"
				@work="openWork"
				@activity="openActivity"
				@collection="showCollection"
				@community="showCommunity"
				@profile="openProfile"
				@stats="openStatsDetail"
				@goals="openGoals"
				@streaks="openStreaks"
				@ready="playListEntrance()"
			>
				<template #greetingActions>
					<div :class="$style.mobileRecord" data-hatady-home-actions>
						<button class="hy-icon-button" :aria-label="copy.notifications" @click="openNotifications">
							<i class="ti ti-bell" aria-hidden="true"></i>
							<span v-if="unread" :class="$style.badge">{{ unread > 99 ? '99+' : unread }}</span>
						</button>
						<button class="hy-primary" :aria-label="copy.recordActivity" @click="openActivityComposer">
							<i class="ti ti-plus" aria-hidden="true"></i>
						</button>
					</div>
				</template>
			</HatadyHome>
			<section v-else-if="activeTab === 'records'" :class="$style.page">
				<div :class="$style.pageTitle">
					<h1>日々の記録</h1>
					<button
						:class="[$style.compactRecord, 'hy-primary']"
						:aria-label="copy.recordActivity"
						@click="openActivityComposer"
					>
						<i class="ti ti-plus" aria-hidden="true"></i>
					</button>
				</div>
				<div data-hy-page-controls>
					<div :class="$style.recordControls">
						<HyCapsule
							:modelValue="recordScope"
							:options="scopeOptions"
							label="記録の範囲"
							@update:modelValue="setRecordScope"
						/>
						<div :class="$style.toolbar">
							<HyCapsule
								:modelValue="recordKind"
								:options="recordKinds"
								label="活動の種類"
								@update:modelValue="setRecordKind"
							/>
							<button
								type="button"
								class="hy-icon-button"
								:aria-label="copy.period"
								:aria-expanded="periodOpen"
								:data-active="periodActive"
								@click="periodOpen = !periodOpen"
							>
								<i class="ti ti-calendar" aria-hidden="true"></i>
							</button>
						</div>
					</div>
					<form v-if="periodOpen" :class="$style.periodTools" aria-label="記録の日付" @submit.prevent="applyPeriod">
						<div :class="$style.periodRange" role="group" aria-label="表示する期間">
							<label :class="$style.dateField">
								<span>開始</span>
								<input v-model="sinceDraft" type="date" aria-label="開始日"/>
							</label>
							<span aria-hidden="true">〜</span>
							<label :class="$style.dateField">
								<span>終了</span>
								<input v-model="untilDraft" type="date" aria-label="終了日"/>
							</label>
						</div>
						<div :class="$style.periodActions">
							<select :class="$style.periodPreset" aria-label="期間の候補" @change="selectPeriodPreset">
								<option value="">期間を選ぶ</option>
								<option value="month">{{ copy.thisMonth }}</option>
								<option value="lastMonth">{{ copy.lastMonth }}</option>
								<option value="30days">{{ copy.last30 }}</option>
							</select>
							<button type="submit" class="hy-primary">{{ copy.apply }}</button>
							<button type="button" class="hy-icon-button" :aria-label="copy.clearPeriod" :title="copy.clearPeriod" @click="clearPeriod">
								<i class="ti ti-x" aria-hidden="true"></i>
							</button>
						</div>
						<label :class="[$style.dateField, $style.dateJump]">
							<i class="ti ti-calendar-search" aria-hidden="true"></i>
							<span>日付へ</span>
							<input v-model="jumpDraft" type="date" :aria-label="copy.jumpTo" @change="jumpToDate"/>
						</label>
					</form>
					<p v-if="periodActive && !periodOpen" :class="$style.periodLabel">
						{{ since || '…' }} 〜 {{ until || '…' }}
						<button class="hy-icon-button" :aria-label="copy.clearPeriod" @click="clearPeriod">
							<i class="ti ti-x" aria-hidden="true"></i>
						</button>
					</p>
				</div>
				<div v-if="recordsError" class="hy-error" role="alert">
					{{ recordsError }}
					<button class="hy-secondary" @click="loadRecords()">再読み込み</button>
				</div>
				<p v-if="recordsLoading && !activities.length" class="hy-empty" role="status">{{ copy.loading }}</p>
				<div v-else :class="$style.entries" :aria-busy="recordsLoading">
					<HatadyActivityCard
						v-for="activity in activities"
						:key="activity.id"
						:activity="activity"
						:data-hy-entrance="activityKind(activity)"
						@openLog="openConversation"
						@openBook="openBookDetail"
						@openMedia="openMediaDetailById"
						@openSession="openSession"
						@openProfile="openProfile"
						@edit="editActivity"
						@menu="openActivityMenu"
					/>
					<p v-if="!activities.length && !recordsError" class="hy-empty">
						{{ periodActive ? copy.emptyFiltered : copy.emptyLog }}
					</p>
					<button v-if="hasMore" class="hy-secondary" :disabled="recordsLoading" @click="loadRecords(true)">
						{{ mediaCopy.loadMore }}
					</button>
				</div>
			</section>
			<section v-else-if="activeTab === 'collection'" :class="$style.page">
				<div :class="$style.pageTitle"><h1>コレクション</h1></div>
				<div :class="$style.collectionTabs" data-hy-page-controls>
					<HyCapsule
						:modelValue="collectionScope"
						:options="scopeOptions"
						label="コレクションの範囲"
						@update:modelValue="setCollectionScope"
					/>
					<HyCapsule
						:modelValue="collectionKind"
						:options="collectionKinds"
						label="作品の種類"
						@update:modelValue="setCollectionKind"
					/>
				</div>
				<div :class="$style.collectionTools">
					<button
						class="hy-secondary"
						:aria-expanded="collectionFiltersOpen"
						@click="collectionFiltersOpen = !collectionFiltersOpen"
					>
						<i class="ti ti-filter" aria-hidden="true"></i>
						<span v-if="!collectionLoading">{{ filteredWorks.length }}件</span>
					</button>
					<button v-if="collectionScope === 'mine'" class="hy-primary" @click="addCollectionWork">
						<i class="ti ti-plus" aria-hidden="true"></i>
						{{ collectionKind === 'work' ? '作業を登録' : '作品を登録' }}
					</button>
				</div>
				<div v-if="collectionFiltersOpen" :class="[$style.filterPanel, 'hy-form']">
					<label class="hy-field">
						{{ mediaCopy.search }}
						<input
							v-model="collectionQuery"
							class="hy-input"
							type="search"
							:placeholder="mediaCopy.searchPlaceholder"
						/>
					</label>
					<div class="hy-form-pair">
						<label class="hy-field">
							{{ mediaCopy.statusLabel }}
							<select v-model="collectionStatus" class="hy-input">
								<option value="">{{ mediaCopy.all }}</option>
								<option v-for="status in collectionStatuses" :key="status.value" :value="status.value">
									{{ status.label }}
								</option>
							</select>
						</label>
						<label class="hy-field">
							並び順
							<select v-model="collectionSort" class="hy-input">
								<option value="updatedAt">{{ mediaCopy.sortUpdated }}</option>
								<option value="title">{{ mediaCopy.sortTitle }}</option>
								<option v-if="collectionKind === 'book'" value="finishedAt">{{ copy.sortFinished }}</option>
								<option v-else value="releaseDate">{{ mediaCopy.sortRelease }}</option>
								<option v-if="collectionKind === 'movie'" value="recommendationRating">
									{{ mediaCopy.sortRecommendation }}
								</option>
								<option value="status">{{ mediaCopy.statusLabel }}</option>
							</select>
						</label>
					</div>
					<div class="hy-actions">
						<label>
							<input v-model="favoritesOnly" type="checkbox"/>
							お気に入り
						</label>
						<label>
							<input v-model="recommendedOnly" type="checkbox"/>
							おすすめ
						</label>
						<button class="hy-secondary" @click="sortAsc = !sortAsc">
							<i :class="sortAsc ? 'ti ti-sort-ascending' : 'ti ti-sort-descending'" aria-hidden="true"></i>
							{{ sortAsc ? '昇順' : '降順' }}
						</button>
					</div>
					<details v-if="collectionKind === 'movie' || collectionKind === 'game'" :class="$style.mediaAdvanced">
						<summary>
							<i class="ti ti-adjustments-horizontal"></i>
							{{ mediaCopy.advancedFilters }}
						</summary>
						<div :class="$style.mediaFilterGrid">
							<template v-if="collectionKind === 'movie'">
								<label :class="$style.mediaFilterField">
									<span>{{ mediaCopy.form.movieOrigin }}</span>
									<select v-model="mediaFiltersDraft.origin" :class="$style.mediaSelect">
										<option value="">{{ mediaCopy.all }}</option>
										<option value="domestic">{{ mediaCopy.form.domestic }}</option>
										<option value="foreign">{{ mediaCopy.form.foreign }}</option>
										<option value="co_production">{{ mediaCopy.form.coProduction }}</option>
										<option value="other">{{ mediaCopy.form.otherOrigin }}</option>
									</select>
								</label>
								<label :class="$style.mediaFilterField">
									<span>{{ mediaCopy.form.viewingMode }}</span>
									<select v-model="mediaFiltersDraft.viewingMode" :class="$style.mediaSelect">
										<option value="">{{ mediaCopy.all }}</option>
										<option value="original">{{ mediaCopy.form.original }}</option>
										<option value="subtitled">{{ mediaCopy.form.subtitled }}</option>
										<option value="dubbed">{{ mediaCopy.form.dubbed }}</option>
									</select>
								</label>
								<label :class="$style.mediaFilterField">
									<span>{{ mediaCopy.form.recommend }}</span>
									<select v-model="mediaFiltersDraft.isRecommended" :class="$style.mediaSelect">
										<option :value="null">{{ mediaCopy.all }}</option>
										<option :value="true">{{ mediaCopy.recommendedOnly }}</option>
										<option :value="false">{{ mediaCopy.notRecommended }}</option>
									</select>
								</label>
								<label :class="$style.mediaFilterField">
									<span>{{ mediaCopy.minimumRecommendation }}</span>
									<select v-model="mediaFiltersDraft.minRecommendation" :class="$style.mediaSelect">
										<option :value="null">{{ mediaCopy.all }}</option>
										<option v-for="score in 10" :key="score" :value="score">{{ (score / 2).toFixed(1) }} / 5</option>
									</select>
								</label>
							</template>
							<template v-else-if="collectionKind === 'game'">
								<label :class="$style.mediaFilterField">
									<span>{{ mediaCopy.sessionType }}</span>
									<select v-model="mediaFiltersDraft.sessionKind" :class="$style.mediaSelect">
										<option value="">{{ mediaCopy.all }}</option>
										<option v-for="type in mediaGameSessionTypes" :key="type" :value="type">
											{{ mediaCopy.session.types[type] }}
										</option>
									</select>
								</label>
								<label :class="$style.mediaFilterField">
									<span>{{ mediaCopy.session.result }}</span>
									<select v-model="mediaFiltersDraft.result" :class="$style.mediaSelect">
										<option value="">{{ mediaCopy.all }}</option>
										<option value="win">{{ mediaCopy.session.win }}</option>
										<option value="loss">{{ mediaCopy.session.loss }}</option>
										<option value="draw">{{ mediaCopy.session.draw }}</option>
										<option value="cleared">{{ mediaCopy.session.cleared }}</option>
										<option value="failed">{{ mediaCopy.session.failed }}</option>
										<option value="retired">{{ mediaCopy.session.retired }}</option>
									</select>
								</label>
								<label :class="$style.mediaFilterField">
									<span>{{ mediaCopy.session.weapon }}</span>
									<input v-model="mediaFiltersDraft.weapon" :class="$style.mediaFilterInput" maxlength="512"/>
								</label>
								<label :class="$style.mediaFilterField">
									<span>{{ mediaCopy.session.rank }}</span>
									<input v-model="mediaFiltersDraft.rank" :class="$style.mediaFilterInput" maxlength="512"/>
								</label>
								<label :class="$style.mediaFilterField">
									<span>{{ mediaCopy.session.route }}</span>
									<input v-model="mediaFiltersDraft.route" :class="$style.mediaFilterInput" maxlength="512"/>
								</label>
								<label :class="$style.mediaFilterField">
									<span>{{ mediaCopy.sinceDate }}</span>
									<input v-model="mediaFiltersDraft.since" type="date" :class="$style.mediaFilterInput"/>
								</label>
								<label :class="$style.mediaFilterField">
									<span>{{ mediaCopy.untilDate }}</span>
									<input v-model="mediaFiltersDraft.until" type="date" :class="$style.mediaFilterInput"/>
								</label>
							</template>
						</div>
						<div :class="$style.mediaFilterActions">
							<button :class="$style.actionGhost" @click="resetMediaFilters">
								<i class="ti ti-restore"></i>
								{{ mediaCopy.resetFilters }}
							</button>
							<button :class="$style.shelfAddBtn" @click="applyMediaFilters">
								<i class="ti ti-check"></i>
								{{ mediaCopy.applyFilters }}
							</button>
						</div>
					</details>
				</div>
				<div v-if="collectionError" class="hy-error" role="alert">
					{{ collectionError }}
					<button class="hy-secondary" @click="loadCollection">再読み込み</button>
				</div>
				<p v-if="collectionLoading && !collectionWorks.length" class="hy-empty" role="status">{{ copy.loading }}</p>
				<div v-else :class="$style.gallery" :data-kind="collectionKind" :aria-busy="collectionLoading">
					<button
						v-for="work in filteredWorks"
						:key="work.id"
						:class="$style.workCard"
						:data-kind="work.kind"
						:data-hy-entrance="work.kind"
						@click="openWork(work)"
					>
						<template v-if="work.kind === 'work'">
							<small>
								{{ ownerName(work.raw) }} ·
								<i :class="visibilityIcon(work.raw.visibility)" aria-hidden="true"></i>
								<span class="_srOnly">{{ visibilityLabel(work.raw.visibility) }}</span>
							</small>
							<h2>
								<i class="ti ti-briefcase" aria-hidden="true"></i>
								{{ work.title }}
							</h2>
							<p>{{ work.description }}</p>
							<div :class="$style.workTags"><span v-for="tag in (work.raw.activity?.tags?.length ? work.raw.activity.tags : [work.status === 'completed' ? 'doneAll' : 'progress'])" :key="tag" class="hy-tag"><i :class="HATADY_RECORD_TAGS.find(item => item.value === tag)?.icon" aria-hidden="true"></i>{{ HATADY_RECORD_TAGS.find(item => item.value === tag)?.label || tag }}</span></div>
							<p
								v-if="work.raw.activity?.latest?.body && !work.raw.activity.latest.details?.spoiler"
								:class="$style.excerpt"
							>
								{{ work.raw.activity.latest.body }}
							</p>
							<div :class="$style.workFoot">
								<small v-if="work.raw.activity?.count != null">{{ work.raw.activity?.count }}件の記録 · {{ hatadyDuration(work.raw.activity.seconds) }}</small>
								<i class="ti ti-arrow-right" aria-hidden="true"></i>
							</div>
						</template>
						<template v-else>
							<div :class="$style.coverWrap">
								<span
									v-for="(bookmark, index) in (work.raw.bookmarks || []).slice(0, 6)"
									:key="bookmark.id"
									:class="$style.bookmark"
									:title="bookmark.name || `p.${bookmark.page}`"
									:style="{ background: hyBookmarkColor(bookmark.color), left: `${16 + Number(index) * 13}px` }"
								></span>
								<HyBookCover
									v-if="work.kind === 'book'"
									:title="work.title"
									:author="work.creator"
									:colorIndex="work.colorIndex"
									:width="118"
									showTitle
								/>
								<HyMediaCover
									v-else
									:kind="work.kind"
									:title="work.title"
									:subtitle="work.creator"
									:colorIndex="work.colorIndex"
									:width="118"
								/>
								<i
									v-if="work.raw.isFavorite"
									:class="[$style.favorite, 'ti ti-star-filled']"
									aria-label="お気に入り"
								></i>
							</div>
							<div :class="$style.workMeta">
								<small>
									{{ work.genre }}
									<template v-if="collectionScope !== 'mine'">· {{ ownerName(work.raw) }}</template>
								</small>
								<h2>{{ work.title }}</h2>
								<p>{{ work.creator }}</p>
								<div :class="$style.workState">
									<span>{{ statusLabel(work.status) }}</span>
									<span v-if="work.kind === 'book' && work.raw.totalPages">
										{{ work.raw.currentPage }}/{{ work.raw.totalPages }}p
									</span>
									<span v-if="work.kind === 'movie' && work.raw.recommendationRating != null">
										★ {{ (work.raw.recommendationRating / 2).toFixed(1) }}
									</span>
								</div>
								<progress
									v-if="work.kind === 'book' && work.raw.progress != null"
									max="100"
									:value="work.raw.progress"
									:aria-label="`${work.raw.progress}%`"
								></progress>
								<span v-if="work.recommended" class="hy-tag">
									<i class="ti ti-thumb-up" aria-hidden="true"></i>
									おすすめ
								</span>
							</div>
						</template>
					</button>
				</div>
				<p v-if="!filteredWorks.length && !collectionLoading && !collectionError" class="hy-empty">
					{{
						collectionKind === 'book'
							? copy.emptyShelf
							: collectionKind === 'movie'
								? mediaCopy.emptyMovie
								: collectionKind === 'game'
									? mediaCopy.emptyGame
									: 'まだ作業がありません'
					}}
				</p>
			</section>
			<HatadyProfile
				v-else
				:key="revision"
				inline
				@changed="refresh"
				@openLog="openConversation"
				@openBook="openBookDetail"
				@openMedia="openMediaDetailById"
				@openProfile="openProfile"
			/>
		</main>
	</div>
</MkStickyContainer>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import type { HatadyActivity, HatadyMediaAdvancedFilters, HatadyMediaKind } from '@/utility/hatady-media.js';
import type { HatadyHomeWork } from '@/utility/hatady-home.js';
import { $i } from '@/i.js';
import { useRouter } from '@/router.js';
import { definePage } from '@/page.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { versatileLang } from '@/utility/intl-const.js';
import { captureHatadyPageTurn } from '@/utility/hatady-motion.js';
import { createHatadyListEntrance } from '@/utility/hatady-list-motion.js';
import HyNav from '@/components/HyNav.vue';
import HyCapsule from '@/components/HyCapsule.vue';
import HyBookCover from '@/components/HyBookCover.vue';
import HyMediaCover from '@/components/HyMediaCover.vue';
import HatadyHome from '@/components/HatadyHome.vue';
import HatadyActivityCard from '@/components/HatadyActivityCard.vue';
import HatadyProfile from '@/components/HatadyProfile.vue';
import { hyBookmarkColor } from '@/utility/hatady.js';
import { loadHySubjects } from '@/utility/hatady-subjects.js';
import {
	hatadyTheme,
	hatadyTzOffset,
	loadHatadyDisplay,
} from '@/utility/hatady-prefs.js';
import { showHatadyTutorial } from '@/utility/hatady-tutorial-launcher.js';
import {
	hatadyMediaCopy,
	mediaAdvancedFilterPayload,
	mediaSessionTypes,
	mediaStatusCopyKey,
	mediaStatusOptions,
	requireHatadyActivityPage,
	normalizeHatadyLogKinds,
} from '@/utility/hatady-media.js';
import { activityData, activityKind, collectWorkPages, homeWork, localDateKey } from '@/utility/hatady-home.js';
import { HATADY_ACTIVITY_CHOICES, HATADY_RECORD_TAGS, hatadyDialogSurfaces, hatadyDuration, hatadyNotify } from '@/utility/hatady-ui.js';
import '@/components/hatady-ui.css';

const copy = i18n.ts._hata._hatady._home,
	mediaCopy = hatadyMediaCopy();
const router = useRouter(),
	mainEl = useTemplateRef('mainEl'),
	bell = useTemplateRef('bell'),
	menu = useTemplateRef('menu');
const tabs = [
	{ value: 'home', label: 'ホーム', icon: 'ti ti-home' },
	{ value: 'records', label: '記録', icon: 'ti ti-notebook' },
	{ value: 'collection', label: 'コレクション', icon: 'ti ti-books' },
	{ value: 'profile', label: 'プロフィール', icon: 'ti ti-user' },
];

function saved(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function remember(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		/* View preferences never block recording. */
	}
}

function initialTab(): string {
	const old = saved('hatadyActiveTab');
	return old === 'shelf'
		? 'collection'
		: old === 'mylog' || old === 'discover'
			? 'records'
			: tabs.some((tab) => tab.value === old)
				? old!
				: 'home';
}

const activeTab = ref(initialTab()),
	revision = ref(0),
	stats = ref<any>(null),
	unread = ref(0);
const recordScope = ref(saved('hatadyActiveTab') === 'discover' ? 'recent' : 'mine');
const previousKinds = normalizeHatadyLogKinds(saved('hatadyLogKinds'));
const recordKind = ref(
	previousKinds.length === 1
		? previousKinds[0]
		: previousKinds.length === HATADY_ACTIVITY_CHOICES.length
			? 'all'
			: 'saved',
);
const recordKinds = computed(() => [
	{ value: 'all', label: 'すべて', icon: 'ti ti-notebook' },
	...HATADY_ACTIVITY_CHOICES,
	...(recordKind.value === 'saved' ? [{ value: 'saved', label: '保存した絞り込み', icon: 'ti ti-filter' }] : []),
]);
const scopeOptions = computed(() => [
	{ value: 'mine', label: '自分の記録', icon: 'ti ti-user' },
	{ value: 'recent', label: 'みんな', icon: 'ti ti-users' },
	{ value: 'following', label: 'フォロー中', icon: 'ti ti-user-check' },
	...(($i as any)?.isModerator || ($i as any)?.isAdmin ? [{ value: 'all', label: '管理', icon: 'ti ti-shield' }] : []),
]);
const activities = ref<HatadyActivity[]>([]),
	recordsLoading = ref(false),
	recordsError = ref(''),
	cursor = ref<string | null>(null),
	hasMore = ref(false);
const periodOpen = ref(false),
	since = ref(''),
	until = ref(''),
	sinceDraft = ref(''),
	untilDraft = ref(''),
	jumpDraft = ref('');
const periodActive = computed(() => !!(since.value || until.value));
let recordsRequest = 0,
	collectionRequest = 0,
	motionFrame = 0,
	motionPending = false,
	motionRevision = 0,
	recordsQuery = '',
	collectionRequestQuery = '',
	activeMotion: ReturnType<typeof captureHatadyPageTurn> | undefined,
	listEntrance: ReturnType<typeof createHatadyListEntrance> | undefined;
const scrollPositions = new Map<string, number>();

function resetListEntrance(): void {
	listEntrance?.cancel();
	listEntrance = mainEl.value ? createHatadyListEntrance(mainEl.value) : undefined;
}

function playListEntrance(startTime?: CSSNumberish | null): void {
	if (!motionPending && !hatadyDialogSurfaces.value.length) listEntrance?.play(startTime);
}

function cancelPageMotion(): void {
	motionRevision++;
	cancelAnimationFrame(motionFrame);
	motionFrame = 0;
	motionPending = false;
	activeMotion?.cancel();
	activeMotion = undefined;
	listEntrance?.finish();
}

function preparePageMotion(direction = 1): void {
	cancelPageMotion();
	const current = captureHatadyPageTurn(mainEl.value, direction),
		revision = motionRevision;
	motionPending = true;
	// Restore the destination's scroll position before mounting the decorative leaf.
	nextTick(() => {
		if (motionRevision !== revision) {
			current.cancel();
			return;
		}
		motionFrame = requestAnimationFrame(() => {
			motionFrame = 0;
			if (motionRevision !== revision) {
				current.cancel();
				return;
			}
			motionPending = false;
			activeMotion = current;
			const start = window.document.timeline.currentTime;
			current.play(start);
			playListEntrance(start);
		});
	});
}

function onPageScroll(): void {
	if (activeMotion) cancelPageMotion();
}

async function setTab(value: string, animate = false): Promise<void> {
	if (!tabs.some((tab) => tab.value === value) || activeTab.value === value) return;
	if (mainEl.value) scrollPositions.set(activeTab.value, mainEl.value.scrollTop);
	const before = tabs.findIndex((tab) => tab.value === activeTab.value),
		after = tabs.findIndex((tab) => tab.value === value);
	if (animate) preparePageMotion(after > before ? 1 : -1);
	else cancelPageMotion();
	activeTab.value = value;
	remember('hatadyActiveTab', value);
	if (value === 'records') loadRecords();
	if (value === 'collection') loadCollection();
	await nextTick();
	if (mainEl.value) mainEl.value.scrollTop = scrollPositions.get(value) || 0;
}

function setRecordScope(value: string): void {
	if (value === recordScope.value) return;
	preparePageMotion(scopeOptions.value.findIndex(option => option.value === value) > scopeOptions.value.findIndex(option => option.value === recordScope.value) ? 1 : -1);
	recordScope.value = value;
	loadRecords();
}

function setRecordKind(value: string): void {
	if (value === recordKind.value) return;
	preparePageMotion(recordKinds.value.findIndex(option => option.value === value) > recordKinds.value.findIndex(option => option.value === recordKind.value) ? 1 : -1);
	recordKind.value = value;
	remember(
		'hatadyLogKinds',
		JSON.stringify(value === 'all' ? HATADY_ACTIVITY_CHOICES.map((item) => item.value) : [value]),
	);
	loadRecords();
}

function epoch(value: string, end = false): number | undefined {
	return value ? new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`).getTime() : undefined;
}

async function loadRecords(append = false): Promise<void> {
	if (append && recordsLoading.value) return;
	const query = JSON.stringify([recordScope.value, recordKind.value, since.value, until.value]);
	if (recordsQuery !== query) {
		activities.value = [];
		cursor.value = null;
		hasMore.value = false;
		recordsQuery = query;
	}
	const request = ++recordsRequest;
	recordsLoading.value = true;
	recordsError.value = '';
	if (recordKind.value === 'saved' && previousKinds.length === 0) {
		recordsLoading.value = false;
		return;
	}
	try {
		const page = requireHatadyActivityPage(
			await misskeyApi(
				'hata/hatady/activities' as never,
				{
					scope: recordScope.value,
					limit: 50,
					...(recordKind.value === 'all'
						? {}
						: { kinds: recordKind.value === 'saved' ? previousKinds : [recordKind.value] }),
					...(since.value ? { sinceDate: epoch(since.value) } : {}),
					...(until.value ? { untilDate: epoch(until.value, true) } : {}),
					...(append && cursor.value ? { cursor: cursor.value } : {}),
				} as never,
			),
		);
		if (request !== recordsRequest) return;
		const previous = append ? activities.value : [];
		activities.value = [...new Map([...previous, ...page.items].map((row) => [row.id, row])).values()];
		cursor.value = page.nextCursor;
		hasMore.value = page.hasMore && !!page.nextCursor;
	} catch {
		if (request === recordsRequest) recordsError.value = '記録を読み込めませんでした';
	} finally {
		if (request === recordsRequest) recordsLoading.value = false;
	}
}

function applyPeriod(): void {
	if (sinceDraft.value && untilDraft.value && sinceDraft.value > untilDraft.value) {
		recordsError.value = '終了日は開始日以降にしてください';
		return;
	}
	since.value = sinceDraft.value;
	until.value = untilDraft.value;
	loadRecords();
}

function clearPeriod(): void {
	since.value = '';
	until.value = '';
	sinceDraft.value = '';
	untilDraft.value = '';
	jumpDraft.value = '';
	loadRecords();
}

function presetPeriod(value: string): void {
	const today = new Date(),
		start = new Date(today),
		end = new Date(today);
	if (value === 'month') {
		start.setDate(1);
		end.setMonth(end.getMonth() + 1, 0);
	} else if (value === 'lastMonth') {
		start.setDate(1);
		start.setMonth(start.getMonth() - 1);
		end.setDate(0);
	} else start.setDate(start.getDate() - 29);
	sinceDraft.value = localDateKey(start);
	untilDraft.value = localDateKey(end);
	applyPeriod();
}

function selectPeriodPreset(event: Event): void {
	const select = event.target as HTMLSelectElement;
	if (select.value) presetPeriod(select.value);
	select.value = '';
}

function jumpToDate(): void {
	if (!jumpDraft.value) return;
	sinceDraft.value = jumpDraft.value;
	untilDraft.value = jumpDraft.value;
	applyPeriod();
}

function showRecords(kind = 'all'): void {
	recordScope.value = 'mine';
	recordKind.value = kind;
	if (activeTab.value === 'records') loadRecords();
	else setTab('records');
}

function showCommunity(): void {
	recordScope.value = 'recent';
	recordKind.value = 'all';
	since.value = '';
	until.value = '';
	if (activeTab.value === 'records') loadRecords();
	else setTab('records');
}

const collectionKinds = [
	{ value: 'book', label: '本', icon: 'ti ti-books' },
	{ value: 'movie', label: '映画', icon: 'ti ti-movie' },
	{ value: 'game', label: 'ゲーム', icon: 'ti ti-device-gamepad-2' },
	{ value: 'work', label: '作業', icon: 'ti ti-briefcase' },
];
const collectionKind = ref(
	({ books: 'book', movies: 'movie', games: 'game' } as Record<string, string>)[saved('hatadyCollectionKind') || ''] ||
		(collectionKinds.some((kind) => kind.value === saved('hatadyCollectionKind'))
			? saved('hatadyCollectionKind')!
			: 'book'),
);
const collectionScope = ref('mine'),
	collectionWorks = ref<HatadyHomeWork[]>([]),
	collectionLoading = ref(false),
	collectionError = ref('');
const collectionFiltersOpen = ref(false),
	collectionQuery = ref(''),
	collectionStatus = ref(''),
	collectionSort = ref('updatedAt'),
	favoritesOnly = ref(false),
	recommendedOnly = ref(false),
	sortAsc = ref(false);
const collectionStatuses = computed(() =>
	collectionKind.value === 'book'
		? ['want', 'reading', 'finished', 'tsundoku'].map((status) => ({
			value: status,
			label: String((copy as any)[`status_${status}`]),
		}))
		: mediaStatusOptions(collectionKind.value as HatadyMediaKind).map((status) => ({
			value: status,
			label: statusLabel(status),
		})),
);

function statusLabel(status: string): string {
	if (collectionKind.value === 'book') return String((copy as any)[`status_${status}`] || status);
	if (collectionKind.value === 'work') return ({ in_progress: '進行中', completed: '完了', on_hold: '保留' } as Record<string, string>)[status] || status;
	return String(
		mediaCopy.status?.[mediaStatusCopyKey(collectionKind.value as HatadyMediaKind, status as any)] ?? status,
	);
}

function ownerName(raw: Record<string, any>): string {
	return raw.user?.name || raw.user?.username || (raw.userId === $i?.id ? $i?.name || $i?.username : '') || '';
}

function visibilityIcon(value: string): string {
	return value === 'private' ? 'ti ti-lock' : value === 'followers' ? 'ti ti-users' : 'ti ti-world';
}

function visibilityLabel(value: string): string {
	return value === 'private' ? '自分のみ' : value === 'followers' ? 'フォロワーのみ' : '公開';
}

const collator = new Intl.Collator(versatileLang, { usage: 'sort', sensitivity: 'base' });
const filteredWorks = computed(() => {
	const query = collectionQuery.value.normalize('NFKC').toLowerCase(),
		dir = sortAsc.value ? 1 : -1;
	return collectionWorks.value
		.filter(
			(work) =>
				(!collectionStatus.value || work.status === collectionStatus.value) &&
				(!favoritesOnly.value || work.raw.isFavorite) &&
				(!recommendedOnly.value || work.recommended) &&
				(!query ||
					[work.title, work.creator, work.genre].some((value) =>
						value.normalize('NFKC').toLowerCase().includes(query),
					)),
		)
		.sort((a, b) => {
			if (!!a.raw.isFavorite !== !!b.raw.isFavorite) return a.raw.isFavorite ? -1 : 1;
			const av = a.raw[collectionSort.value],
				bv = b.raw[collectionSort.value];
			if (av == null || av === '' || bv == null || bv === '') return av == null || av === '' ? (bv == null || bv === '' ? 0 : 1) : -1;
			return (
				dir * (typeof av === 'number' && typeof bv === 'number' ? av - bv : collator.compare(String(av), String(bv))) ||
				a.id.localeCompare(b.id)
			);
		});
});
const mediaGameSessionTypes = mediaSessionTypes('game');

function emptyMediaFilters(): HatadyMediaAdvancedFilters {
	return {
		origin: '',
		viewingMode: '',
		isRecommended: null,
		minRecommendation: null,
		sessionKind: '',
		result: '',
		weapon: '',
		rank: '',
		route: '',
		since: '',
		until: '',
	};
}

const mediaFiltersDraft = ref(emptyMediaFilters()),
	mediaFiltersApplied = ref(emptyMediaFilters());

function applyMediaFilters(): void {
	mediaFiltersApplied.value = { ...mediaFiltersDraft.value };
	loadCollection();
}

function resetMediaFilters(): void {
	mediaFiltersDraft.value = emptyMediaFilters();
	mediaFiltersApplied.value = emptyMediaFilters();
	loadCollection();
}

function setCollectionKind(value: string): void {
	if (value === collectionKind.value) return;
	preparePageMotion(collectionKinds.findIndex(option => option.value === value) > collectionKinds.findIndex(option => option.value === collectionKind.value) ? 1 : -1);
	collectionKind.value = value;
	remember('hatadyCollectionKind', value);
	collectionStatus.value = '';
	collectionSort.value = 'updatedAt';
	mediaFiltersDraft.value = emptyMediaFilters();
	mediaFiltersApplied.value = emptyMediaFilters();
	loadCollection();
}

function setCollectionScope(value: string): void {
	if (value === collectionScope.value) return;
	preparePageMotion(scopeOptions.value.findIndex(option => option.value === value) > scopeOptions.value.findIndex(option => option.value === collectionScope.value) ? 1 : -1);
	collectionScope.value = value;
	loadCollection();
}

function showCollection(kind: string): void {
	collectionKind.value = collectionKinds.some((item) => item.value === kind) ? kind : 'book';
	collectionScope.value = 'mine';
	collectionStatus.value = '';
	if (activeTab.value === 'collection') loadCollection();
	else setTab('collection');
}

async function loadCollection(): Promise<void> {
	const request = ++collectionRequest,
		kind = collectionKind.value,
		query = JSON.stringify([kind, collectionScope.value, kind === 'book' ? null : mediaFiltersApplied.value]);
	if (query !== collectionRequestQuery) {
		collectionRequestQuery = query;
		collectionWorks.value = [];
	}
	collectionLoading.value = true;
	collectionError.value = '';
	try {
		const filter = mediaFiltersApplied.value;
		const params = {
			scope: collectionScope.value,
			limit: 100,
			...(kind !== 'book'
				? {
					kind,
					...mediaAdvancedFilterPayload(kind as HatadyMediaKind, {
						...filter,
						since: filter.since ? new Date(`${filter.since}T00:00:00`).toISOString() : undefined,
						until: filter.until ? new Date(`${filter.until}T23:59:59.999`).toISOString() : undefined,
					}),
				}
				: {}),
		};
		const list = await collectWorkPages<Record<string, any> & { id: string }>(
			async (untilId) =>
				(await misskeyApi(
					(kind === 'book' ? 'hata/hatady/books' : 'hata/hatady/media/works/list') as never,
					{ ...params, ...(untilId ? { untilId } : {}) } as never,
				)) as any,
		);
		if (request === collectionRequest) collectionWorks.value = list.map((work) =>
			homeWork(work, work.userId === $i?.id, kind as HatadyHomeWork['kind']),
		);
	} catch {
		if (request === collectionRequest) collectionError.value = String(mediaCopy.loadFailed);
	} finally {
		if (request === collectionRequest) collectionLoading.value = false;
	}
}

async function refresh(): Promise<void> {
	revision.value++;
	loadStats();
	loadUnread();
	if (activeTab.value === 'records') loadRecords();
	if (activeTab.value === 'collection') loadCollection();
}

async function loadStats(): Promise<void> {
	try {
		stats.value = await misskeyApi('hata/hatady/stats', { tzOffset: hatadyTzOffset() });
	} catch {
		/* Home has its own explicit retry state. */
	}
}

async function loadUnread(): Promise<void> {
	try {
		const result = (await misskeyApi('hata/hatady/notifications/unread-count', {})) as any;
		unread.value = result.count;
	} catch {
		/* A failed refresh cannot mark notifications read. */
	}
}

async function openActivityComposer(_kind?: unknown): Promise<void> {
	const { dispose } = os.popup(
		(await import('@/components/HatadyActivityRecordChooser.vue')).default,
		{},
		{ done: refresh, closed: () => dispose() },
	);
}

async function addCollectionWork(): Promise<void> {
	if (collectionKind.value === 'book') {
		const { dispose } = os.popup(
			(await import('@/components/HatadyBookForm.vue')).default,
			{},
			{ done: refresh, closed: () => dispose() },
		);
	} else {
		const { dispose } = os.popup(
			(await import('@/components/HatadyMediaWorkForm.vue')).default,
			{ kind: collectionKind.value as HatadyMediaKind },
			{ done: refresh, closed: () => dispose() },
		);
	}
}

function openWork(work: HatadyHomeWork): void {
	if (work.kind === 'book') openBookDetail(work.id);
	else openMediaDetailById(work.id, work.kind);
}

function openActivity(activity: HatadyActivity): void {
	if (activity.study) openConversation(activity.study.id);
	else if (activity.media) openSession(activity.media.session.id, activity.media.session.workId || undefined);
}

async function editActivity(activity: HatadyActivity): Promise<void> {
	if (!activity.isMine) return;
	if (activity.study) {
		const { dispose } = os.popup(
			(await import('@/components/HatadyComposer.vue')).default,
			{ editLog: activity.study },
			{ done: refresh, closed: () => dispose() },
		);
	} else if (activity.media) {
		const { dispose } = os.popup(
			(await import('@/components/HatadyMediaSessionForm.vue')).default,
			{ work: activity.media.work, editSession: activity.media.session },
			{ done: refresh, closed: () => dispose() },
		);
	}
}

function openActivityMenu(activity: HatadyActivity, event: MouseEvent): void {
	const items: any[] = [];
	if (activity.isMine) items.push(
		{ text: copy.edit, icon: 'ti ti-pencil', action: () => editActivity(activity) },
		{ text: copy.delete, icon: 'ti ti-trash', danger: true, action: () => deleteActivity(activity) },
	);
	else if (activity.user) items.push({ text: copy.report, icon: 'ti ti-flag', action: () => reportActivity(activity) });
	if (items.length) os.popupMenu(items, (event.currentTarget || event.target) as HTMLElement);
}

async function deleteActivity(activity: HatadyActivity): Promise<void> {
	const { canceled } = await os.confirm({ type: 'warning', text: copy.deleteConfirm });
	if (canceled) return;
	try {
		if (activity.study) await misskeyApi('hata/hatady/logs/delete', { logId: activity.study.id });
		else if (activity.media) await misskeyApi('hata/hatady/media/sessions/delete' as never, { sessionId: activity.media.session.id } as never);
		hatadyNotify('記録を削除しました');
		refresh();
	} catch {
		await os.alert({ type: 'error', text: i18n.ts.somethingHappened });
	}
}

async function reportActivity(activity: HatadyActivity): Promise<void> {
	if (!activity.user) return;
	const data = activityData(activity);
	const reference = activity.study
		? `hatady:log:${activity.study.id}`
		: activity.media ? `hatady:media:session:${activity.media.session.id}` : null;
	if (!reference) return;
	const { dispose } = await os.popupAsyncWithDialog(
		import('@/components/HatadyReport.vue').then((module) => module.default),
		{ user: activity.user, initialComment: `${reference}\n${data.title}\n${data.body}` },
		{ closed: () => dispose() },
	);
}

async function openConversation(value: any): Promise<void> {
	const { dispose } = os.popup(
		(await import('@/components/HatadyConversation.vue')).default,
		{ logId: typeof value === 'string' ? value : value.id },
		{ changed: refresh, closed: () => dispose() },
	);
}

async function openSession(sessionId: string, workId?: string): Promise<void> {
	const { dispose } = os.popup(
		(await import('@/components/HatadyConversation.vue')).default,
		{ sessionId, workId },
		{ changed: refresh, closed: () => dispose() },
	);
}

async function openBookDetail(bookId: string): Promise<void> {
	const { dispose } = os.popup(
		(await import('@/components/HatadyBookDetail.vue')).default,
		{ bookId },
		{ changed: refresh, openLog: openConversation, closed: () => dispose() },
	);
}

async function openMediaDetailById(workId: string, kind?: HatadyMediaKind): Promise<void> {
	const { dispose } = os.popup(
		(await import('@/components/HatadyMediaWorkDetail.vue')).default,
		{ workId, kind },
		{ changed: refresh, deleted: refresh, closed: () => dispose() },
	);
}

async function openProfile(userId?: string | null): Promise<void> {
	if (!userId || userId === $i?.id) {
		setTab('profile');
		return;
	}
	const { dispose } = os.popup(
		(await import('@/components/HatadyProfile.vue')).default,
		{ userId },
		{
			changed: refresh,
			openLog: openConversation,
			openProfile,
			openBook: openBookDetail,
			openMedia: openMediaDetailById,
			closed: () => dispose(),
		},
	);
}

async function openNotifications(event?: MouseEvent): Promise<void> {
	const anchorElement = (event?.currentTarget as HTMLElement | null) || bell.value || menu.value;
	const { dispose } = os.popup(
		(await import('@/components/HatadyNotifications.vue')).default,
		{ anchorElement },
		{
			read: loadUnread,
			openLog: openConversation,
			openProfile,
			openMedia: openMediaDetailById,
			openSession,
			closed: () => {
				loadUnread();
				dispose();
			},
		},
	);
}

async function openFullSearch(initialQuery = ''): Promise<void> {
	const { dispose } = os.popup(
		(await import('@/components/HatadySearch.vue')).default,
		{ initialQuery },
		{
			jumpLog: (date: string) => {
				recordScope.value = 'mine';
				recordKind.value = 'all';
				since.value = localDateKey(new Date(date));
				until.value = since.value;
				sinceDraft.value = since.value;
				untilDraft.value = until.value;
				if (activeTab.value === 'records') loadRecords();
				else setTab('records');
			},
			closed: () => dispose(),
		},
	);
}

async function openStatsDetail(): Promise<void> {
	const { dispose } = os.popup(
		(await import('@/components/HatadyStatsDetail.vue')).default,
		{},
		{ closed: () => dispose() },
	);
}

async function openGoals(): Promise<void> {
	const { dispose } = os.popup(
		(await import('@/components/HatadyGoals.vue')).default,
		{},
		{ changed: loadStats, closed: () => dispose() },
	);
}

async function openStreaks(): Promise<void> {
	const { dispose } = os.popup(
		(await import('@/components/HatadyStreaks.vue')).default,
		{},
		{ closed: () => dispose() },
	);
}

async function openSettings(): Promise<void> {
	const { dispose } = os.popup(
		(await import('@/components/HatadyDisplaySettings.vue')).default,
		{},
		{ closed: () => dispose() },
	);
}

function exitHatady(): void {
	router.push('/');
}

function openMenu(event: MouseEvent): void {
	os.popupMenu(
		[
			{ text: copy.recordActivity, icon: 'ti ti-plus', action: openActivityComposer },
			{ text: copy.searchAll, icon: 'ti ti-search', action: () => openFullSearch('') },
			{ text: copy.settings, icon: 'ti ti-settings', action: openSettings },
			{ text: copy.toolStats, icon: 'ti ti-chart-bar', action: openStatsDetail },
			{ text: copy.toolGoals, icon: 'ti ti-target', action: openGoals },
			{ text: 'Hatadyを終了', icon: 'ti ti-logout-2', action: exitHatady },
		],
		event.currentTarget as HTMLElement,
	);
}

let tutorialActive = true;
let stopTutorial: (() => void) | undefined;

async function maybeShowTutorial(): Promise<void> {
	const stop = await showHatadyTutorial({ isActive: () => tutorialActive });
	if (!stop) return;
	if (tutorialActive) stopTutorial = stop;
	else stop();
}

let unreadTimer: number | undefined, resize: ResizeObserver | undefined;

watch([activeTab, recordScope, recordKind, collectionScope, collectionKind], resetListEntrance, { flush: 'sync' });
// API results can arrive after the paper finishes. Animate the newly rendered
// cards then, while preserving cards already shown during this tab visit.
watch([activities, filteredWorks], () => playListEntrance(), { flush: 'post' });
watch(hatadyDialogSurfaces, () => {
	if (hatadyDialogSurfaces.value.length) cancelPageMotion();
	else playListEntrance();
}, { flush: 'post' });

function onFocus(): void {
	if (!window.document.hidden) loadUnread();
	else cancelPageMotion();
}

onMounted(() => {
	resetListEntrance();
	loadHatadyDisplay();
	loadHySubjects().catch(() => {});
	loadStats();
	loadUnread();
	if (activeTab.value === 'records') loadRecords();
	if (activeTab.value === 'collection') loadCollection();
	unreadTimer = window.setInterval(() => {
		if (!window.document.hidden) loadUnread();
	}, 30000);
	window.addEventListener('focus', onFocus);
	window.document.addEventListener('visibilitychange', onFocus);
	let lastSize: { width: number; height: number } | undefined;
	resize = new ResizeObserver(entries => {
		const size = entries[0]?.contentRect;
		if (!size) return;
		// The observer's initial delivery is not a resize or a user interruption.
		if (lastSize && (lastSize.width !== size.width || lastSize.height !== size.height)) cancelPageMotion();
		lastSize = { width: size.width, height: size.height };
	});
	if (mainEl.value) resize.observe(mainEl.value);
	maybeShowTutorial();
});
onUnmounted(() => {
	tutorialActive = false;
	stopTutorial?.();
	recordsRequest++;
	collectionRequest++;
	window.clearInterval(unreadTimer);
	resize?.disconnect();
	cancelPageMotion();
	listEntrance?.cancel();
	listEntrance = undefined;
	window.removeEventListener('focus', onFocus);
	window.document.removeEventListener('visibilitychange', onFocus);
});
definePage(() => ({ title: 'Hatady', icon: 'ti ti-book-2' }));
</script>

<style lang="scss" module>
.root {
	--hy-header-height: 72px;
	display: flex;
	position: relative;
	flex-direction: column;
	height: calc(var(--MI-viewport-height, 100dvh) - var(--MI-stickyTop, 0px));
	min-height: 0;
	background: var(--hy-bg);
	overflow: hidden;
	container: hatady / inline-size;
}
.header {
	display: grid;
	grid-template-columns: minmax(90px, 1fr) auto minmax(180px, 1fr);
	align-items: start;
	position: relative;
	flex: none;
	gap: 16px;
	padding: 10px 24px 8px;
	z-index: 5;
}
.brand {
	justify-self: start;
	margin-top: 5px;
	min-height: 44px;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--hy-ink);
	font-family: 'Hatady Brand', sans-serif !important;
	font-size: 29px !important;
	cursor: pointer;
}
.nav {
	grid-column: 2;
}
.headerActions {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: 6px;
	padding-top: 6px;
}
.headerActions > button {
	position: relative;
}
.headerActions > :first-child {
	padding: 0;
	width: 44px;
	margin-right: 4px;
	font-size: 23px;
}
.badge {
	position: absolute;
	right: 0;
	top: -3px;
	min-width: 18px;
	border-radius: 999px;
	padding: 0 4px;
	font-size: 11px;
	background: var(--hy-accent);
	color: var(--hy-on-accent);
}
.root .mobileMenu,
.mobileRecord,
.root .mobileExit,
.compactRecord {
	display: none;
}
.main {
	position: relative;
	flex: 1;
	min-height: 0;
	overflow: auto;
	padding: 0 24px 24px;
	scrollbar-width: none;
	overscroll-behavior: contain;
	scroll-padding-top: 12px;
}
.main::-webkit-scrollbar {
	display: none;
}
.main > :not([data-hy-page-leaf]) {
	max-width: 1280px;
	margin-inline: auto;
}
.page {
	min-height: 100%;
}
.pageTitle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: 62px;
}
.pageTitle h1 {
	margin: 7px 0 18px;
	font-size: 25px;
	letter-spacing: 0.1em;
}
.recordControls {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin: 8px 0 18px;
}
.recordControls > :first-child {
	flex: 0 0 auto;
}
.toolbar {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-width: 0;
	max-width: 100%;
}
.toolbar > :first-child {
	min-width: 0;
}
.toolbar > button {
	flex: none;
}
.toolbar > button[data-active='true'] {
	background: var(--hy-soft);
	color: var(--hy-accent);
}
.entries {
	display: grid;
	gap: 14px;
}
.entries > :last-child:is(button) {
	justify-self: center;
}
.filterPanel {
	padding: 22px;
	margin: 14px 0;
	border: 1px solid var(--hy-border);
	background: var(--hy-surface);
	border-radius: 22px;
}
.periodTools {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 10px;
	margin: 0 0 16px;
	padding: 12px;
	border: 1px solid var(--hy-border);
	border-radius: 20px;
	background: var(--hy-surface);
}
.periodRange {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
	flex: 1 1 340px;
	color: var(--hy-muted);
}
.dateField {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
	min-height: 44px;
	padding: 0 10px;
	border: 1px solid var(--hy-border);
	border-radius: 12px;
	background: var(--hy-bg);
}
.periodRange > .dateField {
	flex: 1;
}
.dateField > span {
	font-size: 12px;
	white-space: nowrap;
	color: var(--hy-muted);
}
.dateField input {
	width: 100%;
	min-width: 0;
	min-height: 42px;
	padding: 0;
	border: 0;
	border-radius: 8px;
	background: transparent;
	color: var(--hy-ink);
	font: inherit;
	font-size: 13px;
}
.periodActions {
	display: flex;
	align-items: center;
	gap: 6px;
}
.periodActions > button[type='submit'] {
	padding-inline: 16px;
}
.periodPreset {
	width: auto;
	min-width: 0;
	min-height: 44px;
	padding: 0 10px;
	border: 1px solid var(--hy-border);
	border-radius: 12px;
	background: var(--hy-bg);
	color: var(--hy-ink);
	font: inherit;
	font-size: 13px;
}
.dateJump {
	flex: 0 1 228px;
}
.periodLabel {
	display: flex;
	justify-content: center;
	align-items: center;
	margin: 4px;
	font-size: 13px;
	color: var(--hy-muted);
}
.collectionTabs {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-wrap: wrap;
	gap: 14px;
	margin: 8px 0 20px;
}
.collectionTools {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	margin-bottom: 18px;
}
.collectionTools > :first-child {
	padding: 0 12px;
}
.gallery {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
	align-items: stretch;
	gap: 16px;
}
.workCard {
	min-width: 0;
	position: relative;
	display: flex;
	flex-direction: column;
	padding: 24px 20px;
	border: 1px solid var(--hy-border);
	border-radius: 24px;
	background: var(--hy-surface);
	color: var(--hy-ink);
	text-align: left;
	cursor: pointer;
}
.workCard:hover {
	box-shadow: var(--hy-shadow);
	border-color: color-mix(in srgb, var(--hy-accent) 40%, var(--hy-border));
}
.coverWrap {
	position: relative;
	display: flex;
	justify-content: center;
	padding: 10px 0 18px;
}
.bookmark {
	position: absolute;
	top: 2px;
	z-index: 1;
	width: 9px;
	height: 33px;
	clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%);
}
.favorite {
	position: absolute;
	right: 2px;
	top: 0;
	color: var(--hy-accent);
}
.workMeta {
	min-width: 0;
}
.workMeta small,
.workMeta p,
.workCard > small {
	font-size: 12px;
	color: var(--hy-muted);
}
.workMeta h2 {
	margin: 6px 0 3px;
	font-size: 18px;
	overflow-wrap: anywhere;
}
.workMeta p {
	margin: 0 0 12px;
}
.workState {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 12px;
}
.workMeta progress {
	width: 100%;
	height: 4px;
	margin-top: 10px;
	accent-color: var(--hy-accent);
}
.workMeta > :last-child:is(span) {
	margin-top: 12px;
}
.gallery[data-kind='work'] {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}
.workCard[data-kind='work'] {
	padding: 24px;
	min-height: 275px;
}
.workCard[data-kind='work'] > h2 {
	display: flex;
	align-items: center;
	gap: 10px;
	margin: 20px 0 0;
	font-size: 22px;
}
.workCard[data-kind='work'] > p {
	line-height: 1.8;
}
.workCard[data-kind='work'] > .excerpt {
	border-top: 1px solid var(--hy-border);
	padding-top: 14px;
	font-size: 14px;
}
.workCard[data-kind='work'] > span {
	align-self: flex-start;
}
.workTags { display: flex; flex-wrap: wrap; gap: 6px; }
.workFoot {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	margin-top: auto;
	padding-top: 20px;
}
.workFoot small {
	color: var(--hy-muted);
	font-size: 12px;
}
.mediaAdvanced {
	border-top: 1px solid var(--hy-border);
	padding-top: 18px;
}
.mediaAdvanced > summary {
	cursor: pointer;
	min-height: 44px;
	font-weight: 700;
}
.mediaFilterGrid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16px;
	margin: 12px 0;
}
.mediaFilterField {
	display: grid;
	gap: 8px;
	min-width: 0;
	font-size: 14px;
}
.mediaSelect,
.mediaFilterInput {
	width: 100%;
	min-width: 0;
	min-height: 48px;
	padding: 11px;
	border: 1px solid var(--hy-border);
	background: var(--hy-bg);
	color: var(--hy-ink);
	border-radius: 12px;
}
.mediaFilterActions {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}
.actionGhost,
.shelfAddBtn {
	display: flex;
	align-items: center;
	gap: 8px;
	min-height: 44px;
	border: 0;
	border-radius: 999px;
	padding: 10px 18px;
	background: var(--hy-soft);
	color: var(--hy-ink);
}
.shelfAddBtn {
	background: var(--hy-accent);
	color: var(--hy-on-accent);
}
@container hatady (max-width: 800px) {
	.header {
		grid-template-columns: minmax(0, 1fr) 44px auto minmax(44px, 1fr);
		gap: 10px;
		padding: 6px 14px 8px;
	}
	.headerActions {
		display: none;
	}
	.brand {
		grid-column: 1;
		grid-row: 1;
		font-size: 23px !important;
	}
	.nav {
		grid-column: 3;
		grid-row: 1;
	}
	.root .mobileMenu {
		grid-column: 4;
		grid-row: 1;
		display: grid;
		position: relative;
		place-items: center;
		justify-self: end;
		width: 44px;
		padding: 0;
		margin-top: 6px;
		background: var(--hy-surface);
		border: 1px solid var(--hy-border);
	}
	.root .mobileExit {
		display: inline-grid;
		grid-column: 2;
		grid-row: 1;
		width: 44px;
		padding: 0;
		margin-top: 6px;
		background: var(--hy-surface);
		border: 1px solid var(--hy-border);
	}
	.main {
		padding: 0 14px 20px;
	}
	.mobileRecord {
		display: flex;
		gap: 6px;
	}
	.mobileRecord > button {
		position: relative;
		width: 44px;
		padding: 0;
		background: var(--hy-surface);
		border: 1px solid var(--hy-border);
	}
	.mobileRecord > button:last-child {
		background: var(--hy-accent);
		color: var(--hy-on-accent);
		font-size: 23px;
	}
	.compactRecord {
		display: inline-grid;
		place-items: center;
		width: 44px;
		padding: 0;
	}
	.pageTitle h1 {
		font-size: 22px;
	}
	.gallery {
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 12px;
	}
}
@container hatady (max-width: 600px) {
	.header {
		grid-template-columns: 44px minmax(0, 1fr) 44px;
		gap: 4px 8px;
	}
	.brand {
		grid-column: 1 / -2;
		grid-row: 1;
		margin-top: 0;
	}
	.root .mobileMenu {
		grid-column: 3;
		grid-row: 1;
		margin-top: 0;
	}
	.nav {
		grid-column: 2 / -1;
		grid-row: 2;
		width: 100%;
		min-width: 0;
	}
	.root .mobileExit {
		grid-column: 1;
		grid-row: 2;
		margin-top: 5px;
	}
}
@container hatady (max-width: 380px) {
	.header {
		padding-inline: 10px;
		column-gap: 6px;
	}
}
@container hatady (max-width: 480px) {
	.gallery[data-kind='work'] {
		grid-template-columns: 1fr;
	}
	.collectionTabs {
		flex-direction: column;
		gap: 14px;
	}
	.filterPanel {
		padding: 18px;
	}
	.mediaFilterGrid {
		grid-template-columns: 1fr;
	}
	.pageTitle {
		min-height: 56px;
	}
	.workCard {
		padding: 20px 14px;
	}
	.recordControls {
		gap: 10px;
	}
	.toolbar {
		gap: 4px;
	}
	.periodTools {
		gap: 8px;
		padding: 10px;
	}
	.periodRange {
		flex-basis: 100%;
	}
	.periodRange > .dateField {
		display: grid;
		gap: 0;
		padding: 5px 8px 0;
	}
	.dateJump {
		flex: 1 1 100%;
	}
	.toolbar > :first-child {
		flex-shrink: 1;
	}
}
</style>
