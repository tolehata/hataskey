<!-- SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div class="hatady-scope hatafeed-scope" :class="$style.root" :data-hatady-theme="hataFeedTheme">
	<HataFeedLeaves v-if="leavesEnabled"/>
	<div :class="$style.page">
		<HataFeedHeader
			v-if="canAccess" :tab="issueId ? 'issues' : activeTab" :projectName="currentProject?.name ?? 'Hataskey'" :staff="isStaff" :unread="unreadCount" :refreshing="refreshing"
			@navigate="navigateTab" @create="handleCreate" @project="openProjectSwitch" @notifications="openNotifications" @refresh="refreshAll" @settings="openDisplaySettings" @exit="exitHataFeed"
		/>
		<p v-if="loading" class="hf-empty" role="status">読み込んでいます</p>
		<div v-else-if="error" class="hf-empty" role="alert">{{ error }}<button type="button" class="hy-secondary" @click="error = ''; init()">再読み込み</button></div>
		<p v-else-if="!canAccess" class="hf-empty">HataFeed を利用できません</p>
		<HataFeedIssue v-else-if="issueId" :key="issueId" ref="issueView" :issueId="issueId" :isStaff="isStaff" @back="goList"/>
		<main v-else :class="$style.main">
			<HataFeedHome
				v-if="activeTab === 'home'" :isStaff="isStaff" :roadmap="roadmap" :ownEmojiRequests="ownEmojiRequests" :emojiRequests="emojiRequests" :emojiQuota="emojiQuota" :activity="activity" :issues="issues" :issuesHasNext="issuesHasNext" :loading="issuePageLoading"
				@issue="openIssue" @navigate="navigateTab" @approve="openApprove" @addRoadmap="addRoadmap" @ownHistory="openOwnHistory" @reviewQueue="openReviewQueue"
			/>
			<HataFeedBeta v-if="activeTab === 'beta'" @createIssue="createIssue"/>
			<div v-if="activeTab === 'emoji' && isStaff" class="hf-panel" :class="$style.emojiAdmin">
				<div :class="$style.eaTop">
					<div :class="$style.eaFilters">
						<button v-for="f in emojiAdminFilters" :key="String(f.value)" :class="$style.eaFilter" :aria-pressed="emojiAdminStatus === f.value" @click="setEmojiAdminStatus(f.value)">{{ f.label }}</button>
					</div>
					<div :class="$style.eaTopActions">
						<button type="button" :class="$style.eaRequestOwn" @click="requestEmoji"><i class="ti ti-mood-plus"></i> {{ copy.requestEmojiForSelf }}</button>
						<button v-if="emojiAdminStatus === 'pending' && emojiAdminList.length" type="button" :class="$style.eaBatch" @click="openReviewQueue"><i class="ti ti-player-track-next"></i> {{ copy.reviewPendingSequentially }}</button>
					</div>
				</div>
				<div v-if="emojiAdminList.length === 0" :class="$style.emptyBlock">
					<i class="ti ti-mood-empty" :class="$style.emptyBlockIcon"></i>
					<div>{{ emojiAdminStatus === 'pending' ? copy.noPendingRequests : copy.noMatchingRequests }}</div>
				</div>
				<div v-else :class="$style.eaList">
					<div v-for="r in emojiAdminList" :key="r.id" :class="$style.eaRow">
						<span :class="$style.eaTile"><img v-if="r.imageUrl" :src="r.imageUrl" :class="$style.eaImg" :alt="r.name"/></span>
						<div :class="$style.eaInfo">
							<div :class="$style.eaName">:{{ r.name }}:</div>
							<div :class="$style.eaMeta">
								<HfAvatar v-if="r.requestedBy" :user="r.requestedBy" :size="16"/>
								<span>{{ r.requestedBy?.name ?? r.requestedBy?.username }}</span>
								・ <MkTime :time="r.createdAt" mode="relative"/>
								・ {{ r.sourceType === 'remote' ? (r.remoteHost ? copyx.remoteSource({ host: r.remoteHost }) : copy.remote) : copy.ownSource }}
							</div>
							<div v-if="r.resolvedComment" :class="$style.eaResolution"><i class="ti ti-message-circle"></i><span><strong>{{ copy.resolutionReason }}</strong> {{ r.resolvedComment }}</span></div>
						</div>
						<div :class="$style.eaAction">
							<button v-if="r.status === 'pending' || r.status === 'held'" :class="$style.eaReview" @click="openApprove(r)"><i class="ti ti-eye"></i> {{ copy.review }}</button>
							<span v-else :class="['ti', emojiStatusIcon[r.status] ?? '', 'hfEstIcon']" :data-est="r.status" :title="emojiStatusLabel[r.status]"></span>
						</div>
					</div>
				</div>
				<div v-if="emojiAdminPage > 0 || emojiAdminHasNext" :class="$style.pager">
					<button :class="$style.pagerArrow" :disabled="emojiAdminPage === 0" @click="prevEmojiAdminPage"><i class="ti ti-chevron-left"></i> {{ copy.previous }}</button>
					<span :class="$style.pagerPage">{{ emojiAdminPage + 1 }}</span>
					<button :class="$style.pagerArrow" :disabled="!emojiAdminHasNext" @click="nextEmojiAdminPage">{{ copy.next }} <i class="ti ti-chevron-right"></i></button>
				</div>
			</div>
			<section v-if="activeTab === 'issues' || activeTab === 'roadmap'" class="hf-panel" :class="$style.statusBar" aria-label="対応状況">
				<h2>対応状況<small>このページの {{ issues.length }} 件</small></h2>
				<button v-for="status in ['open', 'inProgress', 'resolved']" :key="status" type="button" :class="$style.stat" @click="applyStatus(status)"><b>{{ counts[status] }}</b><span>{{ statusLabel[status] }}</span></button>
			</section>
			<section v-if="activeTab === 'issues' || activeTab === 'roadmap'" class="hf-panel" :class="$style.listPanel" :aria-busy="issuePageLoading">
				<header :class="$style.listHead" :data-roadmap-actions="activeTab === 'roadmap' && isStaff">
					<h2>{{ activeTab === 'roadmap' ? 'ロードマップ' : 'イシュー' }}<small :title="'読み込み済みの件数'">{{ issues.length }}{{ issuesHasNext ? '+' : '' }}</small></h2>
					<button v-if="activeTab === 'roadmap' && isStaff" type="button" class="hy-secondary hf-roadmap-add" @click="addRoadmap"><i class="ti ti-plus" aria-hidden="true"></i>改善予定を追加</button>
					<form :class="$style.search" role="search" @submit.prevent="reloadIssues"><i class="ti ti-search" aria-hidden="true"></i><input v-model="searchQuery" type="search" aria-label="イシュー・会話を検索" placeholder="イシュー・会話を検索"><button type="submit" class="hf-icon" aria-label="検索"><i class="ti ti-arrow-right" aria-hidden="true"></i></button></form>
				</header>
				<div :class="$style.filters"><div :class="$style.segment"><button type="button" :aria-pressed="!includeClosed" @click="setClosed(false)">受付中</button><button type="button" :aria-pressed="includeClosed" @click="setClosed(true)">終了分も含む</button></div><div :class="$style.dropdowns"><button type="button" @click="openCategoryMenu">{{ filterCategory ? categoryLabel[filterCategory] : copy.category }}<i class="ti ti-chevron-down"></i></button><button type="button" @click="openStatusMenu">{{ filterStatus ? statusLabel[filterStatus] : copy.status }}<i class="ti ti-chevron-down"></i></button><button type="button" @click="openAuthorMenu">{{ authorFilter ? (authorFilter.name ?? authorFilter.username) : copy.author }}<i class="ti ti-chevron-down"></i></button></div></div>
				<div v-if="!visibleIssues.length" class="hf-empty"><p>{{ activeTab === 'roadmap' ? copy.noPublishedPlans : 'イシューがありません' }}</p></div>
				<div v-else ref="issueListEl" :class="$style.listCard">
					<button
						v-for="issue in visibleIssues"
						:key="issue.id"
						:class="$style.issueRow" :data-pinned="issue.pinned" :data-closed="issue.closed"
						@click="openIssue(issue.id)"
					>
						<i v-if="issue.pinned" class="ti ti-pin" :class="$style.rowPin"></i>
						<HfStatusPill v-else :status="issue.status" variant="text" iconOnly :class="$style.rowStatusIcon"/>
						<div :class="$style.rowMain">
							<div :class="$style.rowTitleLine">
								<span :class="$style.rowTitle">{{ issue.title }}</span>
								<HfCategoryBadge :category="issue.category"/>
							</div>
							<div :class="$style.rowMeta">
								<span :class="$style.rowNo">#{{ issue.number }}</span>
								<template v-if="issue.createdBy">・ <MkUserName :class="$style.rowAuthor" :user="issue.createdBy"/>{{ copy.createdAtBefore }}<MkTime :time="issue.createdAt" mode="relative"/>{{ copy.createdAtAfter }}</template>
								・ <HfStatusPill :status="issue.status" variant="text" :showIcon="false" :class="$style.rowStatusText"/>
								<template v-if="issue.assignees && issue.assignees.length"> ・ <i class="ti ti-shield-check" :class="$style.rowAssigneeIcon"></i> <MkUserName :class="$style.rowAuthor" :user="issue.assignees[0]"/>{{ copy.assigneeSuffix }}</template>
							</div>
						</div>
						<div :class="$style.rowSide">
							<span :class="$style.rowStat"><i class="ti ti-message-2"></i> {{ issue.commentsCount }}</span>
							<span :class="$style.rowStat"><i class="ti ti-heart"></i> {{ issue.agreementsCount }}</span>
							<HfAvatar v-if="issue.createdBy" :user="issue.createdBy" :size="22"/>
						</div>
					</button>
				</div>

				<!-- ページ式ナビ -->
				<div v-if="visibleIssues.length > 0 || issuePage > 0" :class="$style.pager">
					<button :class="$style.pagerArrow" :disabled="issuePageLoading || issuePage === 0" @click="prevIssuePage"><i class="ti ti-chevron-left"></i> {{ copy.previous }}</button>
					<span :class="$style.pagerPage">{{ issuePage + 1 }}</span>
					<button :class="$style.pagerArrow" :disabled="issuePageLoading || !issuesHasNext" @click="nextIssuePage">{{ copy.next }} <i class="ti ti-chevron-right"></i></button>
					<label :class="$style.pagerSize">
						<select v-model.number="issuePageSize" :class="$style.pagerSelect" @change="reloadIssues">
							<option :value="10">{{ copyx.itemCount({ count: '10' }) }}</option>
							<option :value="50">{{ copyx.itemCount({ count: '50' }) }}</option>
							<option :value="100">{{ copyx.itemCount({ count: '100' }) }}</option>
						</select>
					</label>
				</div>
			</section>
		</main>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, inject, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue';
import type { HataFeedEmojiRequest } from '@/utility/hatafeed.js';
import type { HataFeedTab } from '@/utility/hatafeed-ui.js';
import HataFeedHeader from '@/components/HataFeedHeader.vue';
import HataFeedBeta from '@/components/HataFeedBeta.vue';
import { hataFeedTheme } from '@/utility/hatasaba-device-prefs.js';
import { hataFeedNotify, hataFeedProjectId, hataFeedTab } from '@/utility/hatafeed-ui.js';
import '@/components/hatafeed-ui.css';
import HataFeedIssue from '@/components/HataFeedIssue.vue';
import HataFeedLeaves from '@/components/HataFeedLeaves.vue';
import HfStatusPill from '@/components/HfStatusPill.vue';
import HfCategoryBadge from '@/components/HfCategoryBadge.vue';
import HfAvatar from '@/components/HfAvatar.vue';
import HataFeedHome from '@/components/HataFeedHome.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchHataFeedIssuePage } from '@/utility/hatafeed-issue-page.js';
import { showHataFeedTutorial } from '@/utility/hatafeed-tutorial-launcher.js';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { DI } from '@/di.js';
import { prefer } from '@/preferences.js';
import {
	categoryLabel, categoryKeys, staffOnlyCategoryKeys, statusLabel, statusKeys, emojiStatusLabel, emojiStatusIcon,
	hataFeedUnreadCount,
} from '@/utility/hatafeed.js';
import { $i, iAmModerator } from '@/i.js';
import { i18n } from '@/i18n.js';

const props = defineProps<{ issueId?: string; number?: string; initialTab?: HataFeedTab }>();
const copy = i18n.ts._hata._hatafeed._home;
const copyx = i18n.tsx._hata._hatafeed._home;

// 旗鯖fork: スタッフ専用カテゴリ(security等)は一般ユーザーの絞り込みから隠す。
const filterCategoryKeys = computed(() => categoryKeys.filter(c => iAmModerator || !staffOnlyCategoryKeys.some(staffOnly => staffOnly === c)));
const router = useRouter();
const closePageWindow = inject(DI.pageWindowClose, null);

function exitHataFeed() {
	if (closePageWindow) closePageWindow();
	else router.push('/');
}

// 旗鯖fork: 「#番号」リンク(/hatafeed/n/:number)から来た場合、番号→idを解決して該当イシューへ。
async function resolveNumber() {
	try {
		const res = await misskeyApi('hata/feedback/issues/show', { number: parseInt(props.number as string, 10) });
		router.replace('/hatafeed/:issueId', { params: { issueId: res.issue.id } });
	} catch {
		router.replace('/hatafeed');
	}
}

const loading = ref(true);
const canAccess = ref(false);
const isStaff = ref(false);
const refreshing = ref(false);

const projects = ref<any[]>([]);
const currentProjectId = hataFeedProjectId;

const issues = ref<any[]>([]);
// 旗鯖fork: ページ式ページネーション(最大表示数 10/50/100・最下部の＜＞で前後ページ)。
const issuePageSize = ref(10);
const issuePage = ref(0);
const issueCursors = ref<(string | undefined)[]>([undefined]); // cursors[i] = page i を取得する untilId
const issuesHasNext = ref(false);
const issuePageLoading = ref(false);
let issuePageRequestId = 0;
const issueListEl = ref<HTMLElement | null>(null);
const issueView = ref<InstanceType<typeof HataFeedIssue> | null>(null);
const roadmap = ref<any[]>([]);
const filterCategory = ref<string | null>(null);
const filterStatus = ref<string | null>(null);
// 旗鯖fork(2a): 作成者フィルタ(選択中のユーザー)。null = 全員。
const authorFilter = ref<any>(null);
const includeClosed = ref(false);
const searchQuery = ref('');

// 旗鯖fork: バッジは共有の状態を見る(標準通知から既読にしたときも消えるように)。
const unreadCount = hataFeedUnreadCount;
const emojiRequests = ref<HataFeedEmojiRequest[]>([]);
const emojiQuota = ref<{ limit: number; remaining: number } | null>(null);

const issueId = computed(() => props.issueId ?? null);
const ownProjects = computed(() => projects.value.filter(p => !p.isOfficial));
// 公式は API の projectId=null に対応するレコードの表示情報を使う。
const currentProject = computed(() => projects.value.find(p => currentProjectId.value == null ? p.isOfficial : p.id === currentProjectId.value) ?? null);

// 旗鯖fork(2a/3a): アクティブなタブ。'issues'/'roadmap' はイシュー一覧のフィルタ違い、
// 'emoji' はスタッフ専用の絵文字申請管理ビュー(本体を差し替える)。
const activeTab = ref<HataFeedTab>(props.initialTab ?? hataFeedTab.value);
watch(activeTab, tab => { if (tab !== 'beta') hataFeedTab.value = tab; }, { flush: 'sync' });
// RouterView caches both URLs. A cached beta page may have last navigated away
// through the admin tab; restore the tab belonging to the activated URL.
onActivated(() => {
	tutorialActive = true;
	const tab = props.initialTab === 'beta' ? 'beta' : hataFeedTab.value;
	if (activeTab.value !== tab) selectTab(tab);
	if (canAccess.value && !loading.value) refreshProjects();
	maybeShowTutorial();
});

// 旗鯖fork(3a): モバイルの集計チップ。現在読み込み済みページ内の件数を状態別に数える
// (総件数の集計APIは持たないため、表示中ページのローカル集計)。
const counts = computed(() => {
	const c: Record<string, number> = { open: 0, inProgress: 0, planned: 0, resolved: 0 };
	for (const i of issues.value) {
		if (i.status in c) c[i.status]++;
	}
	return c;
});

// 旗鯖fork: 若葉アニメの表示可否(アクセシビリティ設定・既定OFF)。
const leavesEnabled = computed(() => prefer.r['hatafeed.leaves'].value && prefer.r.animation.value);

const visibleIssues = computed(() => activeTab.value === 'home' ? issues.value.slice(0, 3) : issues.value);
const ownEmojiRequests = ref<HataFeedEmojiRequest[]>([]);
const error = ref('');

let tutorialActive = true;
let stopTutorial: (() => void) | undefined;

async function maybeShowTutorial() {
	if (!tutorialActive || loading.value || !canAccess.value || error.value || issueId.value || props.number) return;
	const hasExistingActivity = ownEmojiRequests.value.length > 0 || issues.value.some(issue => issue.createdBy?.id === $i?.id) || projects.value.some(project => project.ownerId === $i?.id);
	const stop = await showHataFeedTutorial({ isActive: () => tutorialActive && !issueId.value, isStaff: isStaff.value, hasExistingActivity });
	if (!stop) return;
	if (tutorialActive) stopTutorial = stop;
	else stop?.();
}

function stopOwnedTutorial() { tutorialActive = false; stopTutorial?.(); }

onDeactivated(stopOwnedTutorial);
onUnmounted(stopOwnedTutorial);

// ライブアクティビティ: 直近のイシュー・絵文字申請を時系列でマージ。
const activity = computed(() => {
	const items: any[] = [];
	for (const i of issues.value) {
		if (!i.closed) {
			if (!i.createdBy) continue;
			items.push({ key: 'i' + i.id, type: 'issue', issueId: i.id, user: i.createdBy, time: i.createdAt, verb: copy.activityCreatedIssue, label: i.title });
		} else {
			// クローズ済みは「立てました」ではなく「クローズしました」として、どのイシューが閉じたかを明記する。
			items.push({ key: 'c' + i.id, type: 'issueClosed', issueId: i.id, user: i.closedBy ?? null, time: i.closedAt ?? i.createdAt, verb: copy.activityClosedIssue, label: i.title });
		}
	}
	for (const r of emojiRequests.value) {
		if (!r.requestedBy) continue;
		items.push({ key: 'e' + r.id, type: 'emoji', request: r, user: r.requestedBy, time: r.createdAt, verb: copy.activityRequestedEmoji, label: ':' + r.name + ':', image: r.imageUrl });
	}
	return items.sort((a, b) => (a.time < b.time ? 1 : -1)).slice(0, 10);
});

async function init() {
	loading.value = true;
	try {
		const av = await misskeyApi('hata/feedback/available', {});
		canAccess.value = av.available;
		isStaff.value = av.isStaff;
		if (!canAccess.value) return;
		await loadProjects();
		if (currentProjectId.value && !projects.value.some(project => project.id === currentProjectId.value)) currentProjectId.value = null;
		if (activeTab.value === 'emoji' && !isStaff.value) activeTab.value = 'home';
		if (activeTab.value === 'roadmap') filterCategory.value = 'improvement';
		await Promise.all([reloadIssues(), loadRoadmap(), loadNotifications(), loadEmojiRequests(), ...(activeTab.value === 'emoji' ? [reloadEmojiAdmin()] : [])]);
	} catch {
		error.value = '読み込めませんでした';
	} finally {
		loading.value = false;
	}
	maybeShowTutorial();
}

async function loadProjects() {
	projects.value = await misskeyApi('hata/feedback/projects', {});
}

async function refreshProjects() {
	try {
		await loadProjects();
		if (currentProjectId.value && !projects.value.some(project => project.id === currentProjectId.value)) selectProject(null);
	} catch {
		hataFeedNotify('プロジェクトを読み込めませんでした');
	}
}

// 旗鯖fork: 指定カーソル(untilId)から1ページ分取得する。
async function fetchIssuePage(untilId: string | undefined) {
	const requestId = ++issuePageRequestId;
	issuePageLoading.value = true;
	try {
		const result = await fetchHataFeedIssuePage(
			params => misskeyApi('hata/feedback/issues', params) as Promise<{ id: string }[]>,
			{
				projectId: currentProjectId.value,
				category: filterCategory.value,
				status: filterStatus.value,
				createdById: authorFilter.value?.id ?? null,
				query: searchQuery.value.trim() || null,
				includeClosed: includeClosed.value,
			},
			issuePageSize.value,
			untilId,
		);
		if (requestId !== issuePageRequestId) return null;
		issues.value = result.issues;
		issuesHasNext.value = result.hasNext;
		return result;
	} catch (error) {
		if (requestId === issuePageRequestId) {
			console.error(error);
			os.alert({ type: 'error', text: i18n.ts.somethingHappened });
		}
		return null;
	} finally {
		if (requestId === issuePageRequestId) issuePageLoading.value = false;
	}
}

// フィルタ変更・表示数変更時は1ページ目から取り直す。
async function reloadIssues() {
	if (!await fetchIssuePage(undefined)) return false;
	issuePage.value = 0;
	issueCursors.value = [undefined];
	return true;
}

async function nextIssuePage() {
	if (issuePageLoading.value || !issuesHasNext.value) return;
	const lastId = issues.value[issues.value.length - 1]?.id;
	if (lastId == null || !await fetchIssuePage(lastId)) return;
	issuePage.value += 1;
	issueCursors.value[issuePage.value] = lastId;
	scrollIssueListTop();
}

async function prevIssuePage() {
	if (issuePageLoading.value || issuePage.value === 0) return;
	const previousPage = issuePage.value - 1;
	if (!await fetchIssuePage(issueCursors.value[previousPage])) return;
	issuePage.value = previousPage;
	scrollIssueListTop();
}

function scrollIssueListTop() {
	issueListEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ロードマップ = 公式の「改善予定(improvement)」イシュー。
async function loadRoadmap() {
	roadmap.value = await misskeyApi('hata/feedback/issues', { projectId: null, category: 'improvement', includeClosed: false, limit: 12 });
}

// 旗鯖fork(2a/3a): ツールバー/フィルタのメニュー・トグル群。
function openProjectSwitch(ev: MouseEvent) {
	const items: any[] = [
		{ text: projects.value.find(p => p.isOfficial)?.name ?? 'Hataskey', icon: 'ti ti-flag-2', active: currentProjectId.value == null, action: () => selectProject(null) },
		...ownProjects.value.map(p => ({
			text: p.name + (p.suspended ? copy.suspendedSuffix : ''),
			icon: p.suspended ? 'ti ti-player-pause' : 'ti ti-cube',
			active: currentProjectId.value === p.id,
			action: () => selectProject(p.id),
		})),
	];
	items.push(null, { text: copy.overview, icon: 'ti ti-info-circle', action: () => showProjectOverview(currentProject.value ?? { name: 'Hataskey' }) });
	os.popupMenu(items, (ev.currentTarget ?? ev.target) as HTMLElement);
}

function openCategoryMenu(ev: MouseEvent) {
	os.popupMenu([
		{ text: copy.allCategories, active: filterCategory.value == null, action: () => { filterCategory.value = null; reloadIssues(); } },
		...filterCategoryKeys.value.map(c => ({ text: categoryLabel[c], active: filterCategory.value === c, action: () => { filterCategory.value = c; reloadIssues(); } })),
	], (ev.currentTarget ?? ev.target) as HTMLElement);
}

function openStatusMenu(ev: MouseEvent) {
	os.popupMenu([
		{ text: copy.allStatuses, active: filterStatus.value == null, action: () => { filterStatus.value = null; reloadIssues(); } },
		...statusKeys.map(s => ({ text: statusLabel[s], active: filterStatus.value === s, action: () => { filterStatus.value = s; reloadIssues(); } })),
	], (ev.currentTarget ?? ev.target) as HTMLElement);
}

// 旗鯖fork(2a): 作成者で絞り込む。ユーザー選択ダイアログで作成者を指定/解除する。
async function openAuthorMenu(ev: MouseEvent) {
	const anchor = (ev.currentTarget ?? ev.target) as HTMLElement;
	if (authorFilter.value) {
		os.popupMenu([
			{ text: copyx.filteringByAuthor({ name: authorFilter.value.name ?? authorFilter.value.username }), icon: 'ti ti-user', action: () => {} },
			{ type: 'divider' },
			{ text: copy.clearAuthorFilter, icon: 'ti ti-x', action: () => { authorFilter.value = null; reloadIssues(); } },
			{ text: copy.chooseDifferentAuthor, icon: 'ti ti-user-search', action: () => pickAuthor() },
		], anchor);
	} else {
		pickAuthor();
	}
}

async function pickAuthor() {
	const user = await os.selectUser({});
	if (!user) return;
	authorFilter.value = user;
	reloadIssues();
}

function setClosed(v: boolean) {
	if (includeClosed.value === v) return;
	includeClosed.value = v;
	reloadIssues();
}

// 3a 集計チップからのステータス絞り込み。
function applyStatus(s: string) {
	filterStatus.value = filterStatus.value === s ? null : s;
	if (s === 'resolved') includeClosed.value = true;
	reloadIssues();
}

// タブ: イシュー(改善予定の絞りを解除して全体へ)。
function goIssuesTab() {
	activeTab.value = 'issues';
	if (filterCategory.value === 'improvement') { filterCategory.value = null; reloadIssues(); }
}

// タブ: ロードマップ(= improvement カテゴリの一覧を本体に出す)。
function goRoadmapTab() {
	activeTab.value = 'roadmap';
	if (filterCategory.value !== 'improvement') { filterCategory.value = 'improvement'; reloadIssues(); }
}

// タブ: 絵文字申請管理(スタッフ専用・2g)。本体を申請一覧の管理ビューに差し替える。
function goEmojiAdminTab() {
	activeTab.value = 'emoji';
	reloadEmojiAdmin();
}

// ===== 旗鯖fork(2g): 絵文字申請管理 =====
const EMOJI_ADMIN_PAGE_SIZE = 15;
const emojiAdminList = ref<HataFeedEmojiRequest[]>([]);
const emojiAdminStatus = ref<HataFeedEmojiRequest['status'] | null>('pending'); // 既定は「未処理」から確認できるように。
const emojiAdminPage = ref(0);
const emojiAdminCursors = ref<(string | undefined)[]>([undefined]);
const emojiAdminHasNext = ref(false);
const emojiAdminFilters: { value: HataFeedEmojiRequest['status'] | null; label: string }[] = [
	{ value: 'pending', label: emojiStatusLabel.pending },
	{ value: 'held', label: emojiStatusLabel.held },
	{ value: 'approved', label: emojiStatusLabel.approved },
	{ value: 'rejected', label: emojiStatusLabel.rejected },
	{ value: null, label: copy.all },
];

async function fetchEmojiAdminPage(untilId: string | undefined) {
	const res = await misskeyApi('hata/feedback/emoji-requests', {
		status: emojiAdminStatus.value ?? undefined,
		limit: EMOJI_ADMIN_PAGE_SIZE + 1,
		untilId,
	}) as unknown as HataFeedEmojiRequest[];
	emojiAdminHasNext.value = res.length > EMOJI_ADMIN_PAGE_SIZE;
	emojiAdminList.value = res.slice(0, EMOJI_ADMIN_PAGE_SIZE);
}

async function reloadEmojiAdmin() {
	emojiAdminPage.value = 0;
	emojiAdminCursors.value = [undefined];
	await fetchEmojiAdminPage(undefined);
}

function setEmojiAdminStatus(s: HataFeedEmojiRequest['status'] | null) {
	if (emojiAdminStatus.value === s) return;
	emojiAdminStatus.value = s;
	reloadEmojiAdmin();
}

async function nextEmojiAdminPage() {
	if (!emojiAdminHasNext.value) return;
	const lastId = emojiAdminList.value[emojiAdminList.value.length - 1]?.id;
	emojiAdminPage.value += 1;
	emojiAdminCursors.value[emojiAdminPage.value] = lastId;
	await fetchEmojiAdminPage(lastId);
}

async function prevEmojiAdminPage() {
	if (emojiAdminPage.value === 0) return;
	emojiAdminPage.value -= 1;
	await fetchEmojiAdminPage(emojiAdminCursors.value[emojiAdminPage.value]);
}

// 旗鯖fork: 未読件数のみ取得(ツールバーのベルのバッジ用)。通知一覧・フィルタ・
//   ページ送りは HataFeedNotifications パネル側が担う。
async function loadNotifications() {
	const res = await misskeyApi('hata/feedback/notifications', { limit: 1 });
	unreadCount.value = res.unreadCount;
}

// ツールバーのベル: 通知パネル(種類フィルタ + 前後ページ送り付き)を開く。
//   PC/タブレットではベルにアンカーした吹き出し(popup)、スマホでは全画面寄りの
//   ドロワー(drawer)に MkModal 側が自動で切り替える(anchorElement を渡すのが肝)。
async function openNotifications(event: MouseEvent) {
	// currentTarget is cleared as soon as dispatch ends, before the import resolves.
	const anchorElement = event.currentTarget as HTMLElement;
	const { dispose } = os.popup((await import('@/components/HataFeedNotifications.vue')).default, {
		anchorElement,
	}, {
		read: (count: number) => { unreadCount.value = count; },
		closed: () => { loadNotifications(); dispose(); },
	});
}

async function loadEmojiRequests() {
	const [own, pending] = await Promise.all([
		misskeyApi('hata/feedback/emoji-requests', { mine: true, limit: 20 }),
		isStaff.value ? misskeyApi('hata/feedback/emoji-requests', { status: 'pending', limit: 20 }) : Promise.resolve([]),
	]);
	ownEmojiRequests.value = own as unknown as HataFeedEmojiRequest[];
	emojiRequests.value = isStaff.value ? pending as unknown as HataFeedEmojiRequest[] : ownEmojiRequests.value;
	emojiQuota.value = await misskeyApi('hata/feedback/emoji-quota', {}).catch(() => null);
}

function selectProject(id: string | null) {
	currentProjectId.value = id;
	if (issueId.value) { activeTab.value = 'home'; router.push('/hatafeed'); }
	reloadIssues();
}

function openIssue(id: string) {
	router.push('/hatafeed/:issueId', { params: { issueId: id } });
}

function openBeta() {
	activeTab.value = 'beta';
	if (props.initialTab !== 'beta') router.push('/hatafeed/beta');
}

function goList() { navigateTab('issues'); }

async function createIssue() {
	const { dispose } = os.popup((await import('@/components/HataFeedIssueWizard.vue')).default, {
		projectId: currentProjectId.value,
		projects: projects.value,
	}, {
		done: () => { reloadIssues(); },
		closed: () => dispose(),
	});
}

async function requestEmoji() {
	const { dispose } = os.popup((await import('@/components/HataFeedEmojiWizard.vue')).default, { isStaff: isStaff.value }, {
		done: () => { loadEmojiRequests(); },
		closed: () => dispose(),
	});
}

async function openApprove(r: any) {
	const { dispose } = os.popup((await import('@/components/HataFeedEmojiApprove.vue')).default, { req: r }, {
		done: () => { loadEmojiRequests(); if (activeTab.value === 'emoji') reloadEmojiAdmin(); },
		closed: () => dispose(),
	});
}

// 旗鯖fork: 未処理申請を最大100件まで取得し、1件ずつ内容を確認しながら連続処理する。
// 一括承認は行わず、各操作は既存のスタッフ専用 approve/reject API を順番に呼ぶ。
async function openReviewQueue() {
	const pending = await misskeyApi('hata/feedback/emoji-requests', { status: 'pending', limit: 100 }) as unknown as HataFeedEmojiRequest[];
	if (pending.length === 0) {
		hataFeedNotify(copy.noPendingRequests);
		await loadEmojiRequests();
		if (activeTab.value === 'emoji') await reloadEmojiAdmin();
		return;
	}
	const { dispose } = os.popup((await import('@/components/HataFeedEmojiApprove.vue')).default, { requests: pending }, {
		done: () => { loadEmojiRequests(); if (activeTab.value === 'emoji') reloadEmojiAdmin(); },
		closed: () => { loadEmojiRequests(); if (activeTab.value === 'emoji') reloadEmojiAdmin(); dispose(); },
	});
}

// 旗鯖fork: プロジェクトの概要(タイトル/ジャンル/説明/リポジトリURL)を表示する。
function showProjectOverview(project: any) {
	const lines: string[] = [];
	if (project.genre) lines.push(copyx.genreValue({ genre: project.genre }));
	if (project.description) lines.push(project.description);
	if (project.url) lines.push(copyx.repositoryValue({ url: project.url }));
	if (lines.length === 0) lines.push(copy.noProjectDescription);
	os.alert({
		type: 'info',
		title: project.name,
		text: lines.join('\n\n'),
	});
}

// スタッフ: 近々の修正・改善予定を掲示する。ロードマップ専用の作成画面(ウィザード)を開く。
async function addRoadmap() {
	const { dispose } = os.popup((await import('@/components/HataFeedRoadmapWizard.vue')).default, {}, {
		done: () => { loadRoadmap(); if (filterCategory.value === 'improvement') reloadIssues(); },
		closed: () => dispose(),
	});
}

watch(() => props.issueId, (v, old) => {
	if (old != null && v == null) { reloadIssues(); loadRoadmap(); loadNotifications(); maybeShowTutorial(); }
});

onMounted(() => {
	if (props.number) { resolveNumber(); return; }
	init();
});

// 旗鯖fork(2a): 更新はツールバーの更新アイコンから。MkPageHeader の actions 帯は
// リポジトリUIのツールバーと機能が重複し、下の UI に覆いかぶさって邪魔なため廃止した。
async function refreshAll() {
	if (refreshing.value) return;
	refreshing.value = true;
	const results = await Promise.allSettled([reloadIssues(), loadRoadmap(), loadNotifications(), loadEmojiRequests(),
																																											...(activeTab.value === 'emoji' && isStaff.value ? [reloadEmojiAdmin()] : []),
																																											...(issueView.value ? [issueView.value.reload()] : []),
	]);
	if (results.some(result => result.status === 'rejected') || (results[0].status === 'fulfilled' && results[0].value === false)) hataFeedNotify('更新できない項目がありました');
	else hataFeedNotify('更新しました');
	refreshing.value = false;
}

definePage(() => ({
	title: 'HataFeed',
	icon: 'ti ti-message-report',
}));

function navigateTab(tab: HataFeedTab) {
	if (tab === 'emoji' && !isStaff.value) return;
	if (tab === 'beta') { openBeta(); return; }
	selectTab(tab);
	if (issueId.value || props.initialTab === 'beta') router.push('/hatafeed');
}

function selectTab(tab: HataFeedTab) {
	if (tab === 'beta') { activeTab.value = 'beta'; return; }
	if (tab === 'issues') goIssuesTab();
	else if (tab === 'roadmap') goRoadmapTab();
	else if (tab === 'emoji') goEmojiAdminTab();
	else {
		activeTab.value = 'home';
		filterCategory.value = null;
		filterStatus.value = null;
		authorFilter.value = null;
		searchQuery.value = '';
		includeClosed.value = false;
		reloadIssues();
	}
}

function handleCreate(kind: 'emoji' | 'issue') {
	if (kind === 'emoji') requestEmoji();
	else createIssue();
}

async function openDisplaySettings() {
	const { dispose } = os.popup((await import('@/components/HataFeedDisplaySettings.vue')).default, {}, { projectsChanged: refreshProjects, closed: () => dispose() });
}

async function openOwnHistory() {
	const { dispose } = os.popup((await import('@/components/HataFeedEmojiHistory.vue')).default, {}, { closed: () => { loadEmojiRequests(); dispose(); } });
}

</script>

<style module src="../components/hatafeed-page.module.css"></style>

<style scoped>
header[data-roadmap-actions='true'] { flex-wrap: wrap; }
header[data-roadmap-actions='true'] > form { margin-left: auto; }
.hf-roadmap-add { flex-shrink: 0; white-space: nowrap; }
.hfEstIcon[data-est="pending"] { color: var(--hy-accent); }
.hfEstIcon[data-est="held"] { color: #a36a24; }
.hfEstIcon[data-est="approved"] { color: var(--hy-accent); }
.hfEstIcon[data-est="rejected"] { color: var(--MI_THEME-error); }
</style>
