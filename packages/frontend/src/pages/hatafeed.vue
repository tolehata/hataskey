<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed(フィードバックセンター)メインページ。
  - ロールポリシー canAccessHataFeed で利用可否を判定(未許可は「現在解放されていません」)。
  - HatasabaUI 寄りのピル型・シンプルなダッシュボードで Issue / ロードマップ / 申請 / 通知 を俯瞰。
  - /hatafeed/:issueId で Issue 詳細(会話・賛同・スタッフ操作)を表示。
  - ロゴフォントは Hataskey と同じ Righteous(同梱)。背景右下に若葉のアニメーション。
-->
<template>
<MkStickyContainer>
	<template #header><MkPageHeader :actions="headerActions" :title="'HataFeed'" :icon="'ti ti-message-report'"/></template>
	<MkSpacer :contentMax="1080">
		<div v-if="loading" :class="$style.center">読み込み中…</div>

		<!-- ロール未許可 -->
		<div v-else-if="!canAccess" :class="$style.empty">
			<i class="ti ti-lock" :class="$style.emptyIcon"></i>
			<div :class="$style.emptyText">この機能は現在解放されていません。</div>
		</div>

		<!-- 詳細ビュー -->
		<HataFeedIssue
			v-else-if="issueId"
			:issueId="issueId"
			:isStaff="isStaff"
			@back="goList"
		/>

		<!-- ダッシュボード -->
		<div v-else :class="$style.stage">
			<HataFeedLeaves v-if="leavesEnabled"/>
			<div :class="$style.content">
				<!-- ヒーロー -->
				<section :class="$style.hero">
					<div :class="$style.heroText">
						<div :class="$style.logo">HataFeed</div>
						<p :class="$style.tagline">不具合の報告、機能要望、絵文字の追加申請などを受け付けています。</p>
					</div>
					<div :class="$style.heroBtns">
						<button :class="[$style.pillBtn, $style.pillPrimary]" @click="createIssue"><i class="ti ti-pencil-plus"></i><span>イシューを立てる</span></button>
						<button :class="$style.pillBtn" @click="requestEmoji"><i class="ti ti-mood-smile"></i><span>{{ isStaff ? '絵文字を追加（リモート可）' : '絵文字を申請' }}</span></button>
						<button :class="$style.pillBtn" @click="openBeta"><i class="ti ti-flask"></i><span>ベータ機能を試す</span><span v-if="hataBetaTotal > 0" :class="$style.betaBadge">{{ hataBetaTotal }}</span></button>
					</div>
				</section>

				<!-- プロジェクト切替 -->
				<section :class="$style.projectBar">
					<button :class="[$style.proj, currentProjectId == null && $style.projOn]" @click="selectProject(null)"><i class="ti ti-flag-2"></i> Hataskey</button>
					<button v-for="p in ownProjects" :key="p.id" :class="[$style.proj, currentProjectId === p.id && $style.projOn, p.suspended && $style.projSuspended]" :style="p.color ? { '--hfProjColor': p.color } : undefined" @click="selectProject(p.id)"><i :class="p.suspended ? 'ti ti-player-pause' : 'ti ti-cube'" :style="p.color ? { color: p.color } : undefined"></i> {{ p.name }}<span v-if="p.suspended" :class="$style.suspendedTag">停止中</span></button>
					<button v-if="currentProject" :class="[$style.proj, $style.projManage]" @click="showProjectOverview(currentProject)"><i class="ti ti-info-circle"></i> 概要</button>
					<button v-if="isStaff && currentProjectId != null" :class="[$style.proj, $style.projManage]" @click="manageCurrentProject"><i class="ti ti-settings"></i> 管理</button>
					<button v-if="canExportCurrent" :class="[$style.proj, $style.projManage]" @click="exportIssues"><i class="ti ti-file-export"></i> エクスポート</button>
					<button v-if="isStaff" :class="[$style.proj, $style.projAdd]" @click="createProject"><i class="ti ti-plus"></i> プロジェクトを追加</button>
				</section>

				<!-- ロードマップ(近々の修正・改善予定) -->
				<section v-if="roadmap.length || isStaff" :class="$style.roadmap">
					<div :class="$style.cardHead">
						<span :class="$style.cardTitle"><i class="ti ti-route"></i> 近々の修正・改善予定</span>
						<button v-if="isStaff" :class="$style.smallPill" @click="addRoadmap"><i class="ti ti-plus"></i> 予定を追加</button>
					</div>
					<div v-if="roadmap.length === 0" :class="$style.emptyMini">掲示中の予定はありません。</div>
					<div v-else :class="$style.roadList">
						<button v-for="r in roadmap" :key="r.id" :class="$style.roadItem" @click="openIssue(r.id)">
							<span class="hfDot" :data-status="r.status"></span>
							<img v-if="r.files && r.files.length" :src="r.files[0].thumbnailUrl ?? r.files[0].url" :class="$style.roadImg" :alt="r.title"/>
							<span :class="$style.roadTitle">{{ r.title }}</span>
							<span class="hfStatusPill" :data-status="r.status">{{ statusLabel[r.status] ?? r.status }}</span>
						</button>
					</div>
				</section>

				<div :class="$style.colsCt">
				<div :class="$style.cols">
					<!-- メイン: イシュー一覧 -->
					<section :class="$style.main">
						<div :class="$style.cardHead">
							<span :class="$style.cardTitle"><i class="ti ti-clipboard-list"></i> イシュー</span>
							<button v-if="visibleIssues.length > 0" :class="$style.smallPill" @click="createIssue"><i class="ti ti-plus"></i> 作成</button>
						</div>
						<div :class="$style.searchBar">
							<i class="ti ti-search" :class="$style.searchIcon"></i>
							<input v-model="searchQuery" :class="$style.searchInput" type="search" placeholder="タイトル・会話を検索" @keydown.enter="reloadIssues" @search="reloadIssues">
							<button v-if="searchQuery" :class="$style.searchClear" @click="searchQuery = ''; reloadIssues()"><i class="ti ti-x"></i></button>
						</div>
						<div :class="$style.filters">
							<select v-model="filterCategory" :class="$style.select" @change="reloadIssues">
								<option :value="null">すべてのカテゴリ</option>
								<option v-for="c in filterCategoryKeys" :key="c" :value="c">{{ categoryLabel[c] }}</option>
							</select>
							<select v-model="filterStatus" :class="$style.select" @change="reloadIssues">
								<option :value="null">すべてのステータス</option>
								<option v-for="s in statusKeys" :key="s" :value="s">{{ statusLabel[s] }}</option>
							</select>
							<button :class="[$style.toggle, includeClosed && $style.toggleOn]" @click="includeClosed = !includeClosed; reloadIssues()">
								<i class="ti" :class="includeClosed ? 'ti-eye' : 'ti-eye-off'"></i> 解決済み
							</button>
						</div>

						<div v-if="visibleIssues.length === 0" :class="$style.emptyBlock">
							<i class="ti ti-mail-opened" :class="$style.emptyBlockIcon"></i>
							<div>現在、イシューはありません。<br>お気づきの点があればご報告ください。</div>
							<button :class="[$style.pillBtn, $style.pillPrimary]" @click="createIssue"><i class="ti ti-pencil-plus"></i><span>イシューを作成する</span></button>
						</div>
						<div v-else ref="issueListEl" :class="$style.issueList">
							<button v-for="issue in visibleIssues" :key="issue.id" :class="$style.issueCard" @click="openIssue(issue.id)">
								<div :class="$style.issueHead">
									<span class="hfCatPill" :data-cat="issue.category">{{ categoryLabel[issue.category] ?? issue.category }}</span>
									<span class="hfStatusPill" :data-status="issue.status">{{ statusLabel[issue.status] ?? issue.status }}</span>
									<i v-if="issue.pinned" class="ti ti-pin" :class="$style.pinIcon"></i>
									<span v-if="issue.closed" :class="$style.closedTag"><i class="ti ti-lock"></i></span>
								</div>
								<div :class="$style.issueTitle"><span :class="$style.issueNo">#{{ issue.number }}</span> {{ issue.title }}</div>
								<div :class="$style.issueFoot">
									<span :class="$style.metaChip"><i class="ti ti-heart"></i> {{ issue.agreementsCount }}</span>
									<span :class="$style.metaChip"><i class="ti ti-message-2"></i> {{ issue.commentsCount }}</span>
									<span v-if="issue.createdBy" :class="$style.byUser">
										<MkAvatar :class="$style.byAvatar" :user="issue.createdBy"/><MkUserName :user="issue.createdBy"/>
									</span>
								</div>
							</button>
						</div>
						<!-- 旗鯖fork: ページ式ナビ(最大表示数＋＜＞で前後ページ) -->
						<div v-if="visibleIssues.length > 0 || issuePage > 0" :class="$style.pager">
							<label :class="$style.pagerSize">
								表示数
								<select v-model.number="issuePageSize" :class="$style.select" @change="reloadIssues">
									<option :value="10">10</option>
									<option :value="50">50</option>
									<option :value="100">100</option>
								</select>
							</label>
							<div :class="$style.pagerNav">
								<button :class="$style.pagerBtn" :disabled="issuePage === 0" @click="prevIssuePage"><i class="ti ti-chevron-left"></i></button>
								<span :class="$style.pagerPage">{{ issuePage + 1 }}</span>
								<button :class="$style.pagerBtn" :disabled="!issuesHasNext" @click="nextIssuePage"><i class="ti ti-chevron-right"></i></button>
							</div>
						</div>
					</section>

					<!-- サイド -->
					<aside :class="$style.side">
						<!-- ライブアクティビティ -->
						<section :class="$style.card">
							<div :class="$style.cardHead">
								<span :class="$style.cardTitle"><span :class="$style.liveDot"></span> みんなの動き</span>
							</div>
							<div v-if="activity.length === 0" :class="$style.emptyMini">まだ動きはありません。</div>
							<TransitionGroup v-else tag="div" :class="$style.actList" name="hfAct">
								<div v-for="(a, idx) in activity" :key="a.key" :class="[$style.actRow, idx === 0 && $style.actNew]">
									<MkAvatar v-if="a.user" :class="$style.actAvatar" :user="a.user"/>
									<span v-else :class="[$style.actAvatar, $style.actLock]"><i :class="a.type === 'issueClosed' ? 'ti ti-lock' : 'ti ti-help'"></i></span>
									<div :class="$style.actBody">
										<MkUserName v-if="a.user" :class="$style.actName" :user="a.user"/><span v-else :class="$style.actName">誰か</span>
										<span :class="$style.actVerb">{{ a.verb }}</span>
										<div :class="$style.actObj">
											<img v-if="a.type === 'emoji' && a.image" :src="a.image" :class="$style.actEmoji"/>
											<i v-else-if="a.type === 'issueClosed'" class="ti ti-lock" :class="$style.actClosedIcon"></i>
											<span :class="$style.actObjText">{{ a.label }}</span>
										</div>
									</div>
									<MkTime :class="$style.actTime" :time="a.time" mode="relative"/>
								</div>
							</TransitionGroup>
						</section>

						<!-- 絵文字申請 -->
						<section :class="$style.card">
							<div :class="$style.cardHead">
								<span :class="$style.cardTitle"><i class="ti ti-mood-smile"></i> {{ isStaff ? '絵文字申請（未処理）' : '自分の絵文字申請' }}</span>
								<button :class="$style.smallPill" @click="requestEmoji"><i class="ti ti-plus"></i> {{ isStaff ? '追加' : '申請' }}</button>
							</div>
							<div v-if="emojiQuota && !isStaff" :class="$style.quotaNote"><i class="ti ti-ticket"></i> 今週あと {{ emojiQuota.remaining }} / {{ emojiQuota.limit }} 件</div>
							<div v-if="emojiRequests.length === 0" :class="$style.emptyMini">{{ isStaff ? '未処理の申請はありません。' : 'まだ申請はありません。' }}</div>
							<div v-else :class="$style.emojiList">
								<button v-for="r in emojiRequests" :key="r.id" :class="$style.emojiRow" @click="isStaff && r.status === 'pending' ? openApprove(r) : null">
									<img v-if="r.imageUrl" :src="r.imageUrl" :class="$style.emojiImg" :alt="r.name"/>
									<div :class="$style.emojiInfo">
										<div :class="$style.emojiName">:{{ r.name }}:</div>
										<div :class="$style.emojiSub">{{ r.requestedBy?.name ?? r.requestedBy?.username }} ・ {{ emojiStatusLabel[r.status] }}</div>
									</div>
									<i :class="['ti', emojiStatusIcon[r.status] ?? 'ti-clock-hour-4', 'hfEstIcon']" :data-est="r.status" :title="emojiStatusLabel[r.status]"></i>
									<i v-if="isStaff && r.status === 'pending'" class="ti ti-chevron-right" :class="$style.emojiArrow"></i>
								</button>
							</div>
						</section>

						<!-- 通知 -->
						<section :class="$style.card">
							<div :class="$style.cardHead">
								<span :class="$style.cardTitle"><i class="ti ti-bell"></i> 通知<span v-if="unreadCount > 0" :class="$style.unread">{{ unreadCount }}</span></span>
								<span :class="$style.notifActions">
									<button :class="[$style.smallPill, notifFilter && $style.smallPillOn]" @click="openNotifFilter"><i class="ti ti-filter"></i> {{ notifFilter ? notifTypeLabel[notifFilter] ?? notifFilter : 'すべて' }}</button>
									<button v-if="unreadCount > 0" :class="$style.smallPill" @click="markRead">既読</button>
								</span>
							</div>
							<div v-if="filteredNotifications.length === 0" :class="$style.emptyMini">{{ notifFilter ? '該当する通知はありません。' : '通知はありません。' }}</div>
							<div v-else :class="$style.notifList">
								<button v-for="n in filteredNotifications" :key="n.id" :class="[$style.notifRow, !n.isRead && $style.notifUnread]" @click="onNotifClick(n)">
									<i :class="['ti', notifIcon(n.type), $style.notifIcon]"></i>
									<div :class="$style.notifBody">
										<div :class="$style.notifMsg">{{ n.message }}</div>
										<div v-if="n.actor" :class="$style.notifActor">{{ n.actor.name ?? n.actor.username }}</div>
									</div>
								</button>
							</div>
							<!-- 旗鯖fork: 通知の前後ページ送り(＜＞) -->
							<div v-if="notifPage > 0 || notifHasNext" :class="$style.notifPager">
								<button :class="$style.pagerBtn" :disabled="notifPage === 0" @click="prevNotifPage"><i class="ti ti-chevron-left"></i></button>
								<span :class="$style.pagerPage">{{ notifPage + 1 }}</span>
								<button :class="$style.pagerBtn" :disabled="!notifHasNext" @click="nextNotifPage"><i class="ti ti-chevron-right"></i></button>
							</div>
						</section>
					</aside>
				</div>
				</div>
			</div>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import HataFeedIssue from '@/components/HataFeedIssue.vue';
import HataFeedLeaves from '@/components/HataFeedLeaves.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { chooseDriveFile } from '@/utility/drive.js';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { prefer } from '@/preferences.js';
import {
	categoryLabel, categoryKeys, staffOnlyCategoryKeys, statusLabel, statusKeys, emojiStatusLabel, emojiStatusIcon, notifIcon, notifTypeLabel, hataBetaTotal,
} from '@/utility/hatafeed.js';
import { iAmModerator, $i } from '@/i.js';

const props = defineProps<{ issueId?: string; number?: string }>();

// 旗鯖fork: スタッフ専用カテゴリ(security等)は一般ユーザーの絞り込みから隠す。
const filterCategoryKeys = computed(() => categoryKeys.filter(c => iAmModerator || !staffOnlyCategoryKeys.includes(c)));
const router = useRouter();

// 旗鯖fork: 「#番号」リンク(/hatafeed/n/:number)から来た場合、番号→idを解決して該当イシューへ。
async function resolveNumber() {
	try {
		const res = await misskeyApi('hata/feedback/issues/show', { number: parseInt(props.number as string, 10) });
		router.replace('/hatafeed/' + res.issue.id);
	} catch {
		router.replace('/hatafeed');
	}
}

const loading = ref(true);
const canAccess = ref(false);
const isStaff = ref(false);

const projects = ref<any[]>([]);
const currentProjectId = ref<string | null>(null);

const issues = ref<any[]>([]);
// 旗鯖fork: ページ式ページネーション(最大表示数 10/50/100・最下部の＜＞で前後ページ)。
const issuePageSize = ref(10);
const issuePage = ref(0);
const issueCursors = ref<(string | undefined)[]>([undefined]); // cursors[i] = page i を取得する untilId
const issuesHasNext = ref(false);
const issueListEl = ref<HTMLElement | null>(null);
const roadmap = ref<any[]>([]);
const filterCategory = ref<string | null>(null);
const filterStatus = ref<string | null>(null);
const includeClosed = ref(false);
const searchQuery = ref('');

const notifications = ref<any[]>([]);
const notifFilter = ref<string | null>(null);
const filteredNotifications = computed(() => notifFilter.value
	? notifications.value.filter(n => n.type === notifFilter.value)
	: notifications.value);
const unreadCount = ref(0);
const emojiRequests = ref<any[]>([]);
const emojiQuota = ref<{ limit: number; remaining: number } | null>(null);

const issueId = computed(() => props.issueId ?? null);
const ownProjects = computed(() => projects.value.filter(p => !p.isOfficial));
// 旗鯖fork: 現在選択中のプロジェクト(公式=null時はnull)。
const currentProject = computed(() => currentProjectId.value == null ? null : (projects.value.find(p => p.id === currentProjectId.value) ?? null));

// 旗鯖fork: 現在のプロジェクトのイシューをエクスポートできるか(鯖缶 or プロジェクト作成者)。
const canExportCurrent = computed(() => {
	if (isStaff.value) return true;
	if (currentProjectId.value == null) return false;
	const p = ownProjects.value.find(x => x.id === currentProjectId.value);
	return p != null && p.ownerId === $i?.id;
});

// 旗鯖fork: イシュー一覧(タイトル・会話・ステータス等)をAI可読JSONでダウンロード。
async function exportIssues() {
	const data = await os.apiWithDialog('hata/feedback/issues/export', {
		projectId: currentProjectId.value,
		includeClosed: true,
	});
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = window.document.createElement('a');
	a.href = url;
	a.download = `hatafeed-issues-${currentProjectId.value ?? 'official'}.json`;
	window.document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
// 旗鯖fork: 若葉アニメの表示可否(アクセシビリティ設定・既定OFF)。
const leavesEnabled = computed(() => prefer.r['hatafeed.leaves'].value);

// 改善予定(improvement)はロードマップ枠に出すので、明示的に絞り込んでいない限りメイン一覧からは除く。
const visibleIssues = computed(() => filterCategory.value === 'improvement'
	? issues.value
	: issues.value.filter(i => i.category !== 'improvement'));

// ライブアクティビティ: 直近のイシュー・絵文字申請を時系列でマージ。
const activity = computed(() => {
	const items: any[] = [];
	for (const i of issues.value) {
		if (!i.closed) {
			if (!i.createdBy) continue;
			items.push({ key: 'i' + i.id, type: 'issue', user: i.createdBy, time: i.createdAt, verb: 'がイシューを立てました', label: i.title });
		} else {
			// クローズ済みは「立てました」ではなく「クローズしました」として、どのイシューが閉じたかを明記する。
			items.push({ key: 'c' + i.id, type: 'issueClosed', user: i.closedBy ?? null, time: i.closedAt ?? i.createdAt, verb: 'がイシューをクローズしました', label: i.title });
		}
	}
	for (const r of emojiRequests.value) {
		if (!r.requestedBy) continue;
		items.push({ key: 'e' + r.id, type: 'emoji', user: r.requestedBy, time: r.createdAt, verb: 'が絵文字を申請しました', label: ':' + r.name + ':', image: r.imageUrl });
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
		await Promise.all([loadProjects(), reloadIssues(), loadRoadmap(), loadNotifications(), loadEmojiRequests()]);
	} finally {
		loading.value = false;
	}
}

async function loadProjects() {
	projects.value = await misskeyApi('hata/feedback/projects', {});
}

// 旗鯖fork: 指定カーソル(untilId)から1ページ分取得する。
async function fetchIssuePage(untilId: string | undefined) {
	const res = await misskeyApi('hata/feedback/issues', {
		projectId: currentProjectId.value,
		category: filterCategory.value,
		status: filterStatus.value,
		query: searchQuery.value.trim() || null,
		includeClosed: includeClosed.value,
		limit: issuePageSize.value + 1,
		untilId,
	});
	issuesHasNext.value = res.length > issuePageSize.value;
	issues.value = res.slice(0, issuePageSize.value);
}

// フィルタ変更・表示数変更時は1ページ目から取り直す。
async function reloadIssues() {
	issuePage.value = 0;
	issueCursors.value = [undefined];
	await fetchIssuePage(undefined);
}

async function nextIssuePage() {
	if (!issuesHasNext.value) return;
	const lastId = issues.value[issues.value.length - 1]?.id;
	issuePage.value += 1;
	issueCursors.value[issuePage.value] = lastId;
	await fetchIssuePage(lastId);
	scrollIssueListTop();
}

async function prevIssuePage() {
	if (issuePage.value === 0) return;
	issuePage.value -= 1;
	await fetchIssuePage(issueCursors.value[issuePage.value]);
	scrollIssueListTop();
}

function scrollIssueListTop() {
	issueListEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ロードマップ = 公式の「改善予定(improvement)」イシュー。
async function loadRoadmap() {
	roadmap.value = await misskeyApi('hata/feedback/issues', { projectId: null, category: 'improvement', includeClosed: false, limit: 12 });
}

// 旗鯖fork: 通知も＜＞でページ送りする。
const NOTIF_PAGE_SIZE = 5;
const notifPage = ref(0);
const notifCursors = ref<(string | undefined)[]>([undefined]);
const notifHasNext = ref(false);

async function fetchNotifPage(untilId: string | undefined) {
	const res = await misskeyApi('hata/feedback/notifications', { limit: NOTIF_PAGE_SIZE + 1, untilId });
	notifHasNext.value = res.notifications.length > NOTIF_PAGE_SIZE;
	notifications.value = res.notifications.slice(0, NOTIF_PAGE_SIZE);
	unreadCount.value = res.unreadCount;
}

async function loadNotifications() {
	notifPage.value = 0;
	notifCursors.value = [undefined];
	await fetchNotifPage(undefined);
}

async function nextNotifPage() {
	if (!notifHasNext.value) return;
	const lastId = notifications.value[notifications.value.length - 1]?.id;
	notifPage.value += 1;
	notifCursors.value[notifPage.value] = lastId;
	await fetchNotifPage(lastId);
}

async function prevNotifPage() {
	if (notifPage.value === 0) return;
	notifPage.value -= 1;
	await fetchNotifPage(notifCursors.value[notifPage.value]);
}

async function loadEmojiRequests() {
	emojiRequests.value = await misskeyApi('hata/feedback/emoji-requests', isStaff.value ? { status: 'pending', limit: 20 } : { mine: true, limit: 20 });
	emojiQuota.value = await misskeyApi('hata/feedback/emoji-quota', {}).catch(() => null);
}

function selectProject(id: string | null) {
	currentProjectId.value = id;
	reloadIssues();
}

function openIssue(id: string) {
	router.push(`/hatafeed/${id}`);
}
function openBeta() {
	router.push('/hatafeed/beta');
}
function goList() {
	router.push('/hatafeed');
}

async function markRead() {
	await misskeyApi('hata/feedback/notifications/read', {});
	unreadCount.value = 0;
	notifications.value = notifications.value.map(n => ({ ...n, isRead: true }));
}

function onNotifClick(n: any) {
	if (n.feedbackId) openIssue(n.feedbackId);
	else if (n.emojiRequestId) handleEmojiRequestNotif(n.emojiRequestId);
}

// 旗鯖fork(#38): 絵文字申請通知のクリック時、現状を確認する。
//   pending=未処理 → 承認ダイアログ / それ以外 → 「既に処理済み」のお知らせを出す。
async function handleEmojiRequestNotif(requestId: string) {
	try {
		const list: any[] = await misskeyApi('hata/feedback/emoji-requests', { id: requestId, limit: 1 });
		const r = list[0];
		if (!r) {
			os.alert({ type: 'info', title: '申請が見つかりません', text: 'この申請は削除された可能性があります。' });
			return;
		}
		if (r.status === 'pending') {
			// 未処理: 通常の承認ダイアログ(スタッフのみ操作可・申請者も中身を確認できる)
			if (isStaff.value) openApprove(r);
			else os.alert({ type: 'info', title: '申請受付中', text: `:${r.name}: の申請はまだ未処理です。スタッフの確認をお待ちください。` });
			return;
		}
		// approved / rejected
		const statusLabel = emojiStatusLabel[r.status] ?? r.status;
		const reason = r.resolvedComment ? `\n\n理由：${r.resolvedComment}` : '';
		os.alert({ type: 'info', title: 'この申請は既に処理されています', text: `:${r.name}: の申請は「${statusLabel}」になっています。${reason}` });
	} catch {
		os.alert({ type: 'error', title: 'エラー', text: '申請の状態を取得できませんでした。' });
	}
}

// ホーム通知をタイプで絞り込むメニュー。
function openNotifFilter(ev: MouseEvent) {
	const present = [...new Set(notifications.value.map(n => n.type))];
	os.popupMenu([
		{ text: 'すべて', active: notifFilter.value === null, action: () => { notifFilter.value = null; } },
		...present.map(t => ({
			text: notifTypeLabel[t] ?? t,
			active: notifFilter.value === t,
			action: () => { notifFilter.value = t; },
		})),
	], ev.currentTarget ?? undefined);
}

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
		done: () => { loadEmojiRequests(); },
		closed: () => dispose(),
	});
}

// 旗鯖fork: プロジェクトのテーマカラー候補。
const PROJECT_COLOR_OPTIONS = [
	{ value: '', label: 'デフォルト' },
	{ value: '#3b9eff', label: '青' },
	{ value: '#41b883', label: '緑' },
	{ value: '#e6a23c', label: '橙' },
	{ value: '#f56c6c', label: '赤' },
	{ value: '#9b6cf5', label: '紫' },
	{ value: '#ff8fc3', label: 'ピンク' },
	{ value: '#36c5d1', label: 'シアン' },
];

async function createProject() {
	const { canceled, result } = await os.form('プロジェクトを追加', {
		name: { type: 'string', label: '名前', required: true },
		genre: { type: 'string', label: 'ジャンル（例: SNSクライアント / ゲーム / ツール）' },
		description: { type: 'string', label: '説明', multiline: true },
		url: { type: 'string', label: 'リポジトリURL' },
		color: { type: 'enum', label: 'テーマカラー', enum: PROJECT_COLOR_OPTIONS, default: '' },
	});
	if (canceled) return;
	await misskeyApi('hata/feedback/projects/create', {
		name: result.name,
		genre: result.genre || null,
		description: result.description ?? '',
		url: result.url || null,
		color: result.color || null,
	});
	await loadProjects();
}

// 旗鯖fork: プロジェクトの編集(スタッフのみ)。
async function editProject(project: any) {
	const { canceled, result } = await os.form('プロジェクトを編集', {
		name: { type: 'string', label: '名前', required: true, default: project.name },
		genre: { type: 'string', label: 'ジャンル（例: SNSクライアント / ゲーム / ツール）', default: project.genre ?? '' },
		description: { type: 'string', label: '説明', multiline: true, default: project.description ?? '' },
		url: { type: 'string', label: 'リポジトリURL', default: project.url ?? '' },
		color: { type: 'enum', label: 'テーマカラー', enum: PROJECT_COLOR_OPTIONS, default: project.color ?? '' },
	});
	if (canceled) return;
	await os.apiWithDialog('hata/feedback/projects/update', {
		projectId: project.id,
		name: result.name,
		genre: result.genre || null,
		description: result.description ?? '',
		url: result.url || null,
		color: result.color || null,
	});
	await loadProjects();
}

// 旗鯖fork: プロジェクトの概要(タイトル/ジャンル/説明/リポジトリURL)を表示する。
function showProjectOverview(project: any) {
	const lines: string[] = [];
	if (project.genre) lines.push(`ジャンル: ${project.genre}`);
	if (project.description) lines.push(project.description);
	if (project.url) lines.push(`リポジトリ: ${project.url}`);
	if (lines.length === 0) lines.push('（このプロジェクトの説明はまだありません）');
	os.alert({
		type: 'info',
		title: project.name,
		text: lines.join('\n\n'),
	});
}

// 旗鯖fork: プロジェクトの削除(スタッフのみ)。紐づくイシューもすべて削除される。
async function removeProject(project: any) {
	const { canceled } = await os.confirm({
		type: 'warning',
		title: 'プロジェクトを削除',
		text: `「${project.name}」を削除しますか？\nこのプロジェクトに紐づくイシュー・会話もすべて削除されます。この操作は取り消せません。`,
	});
	if (canceled) return;
	await os.apiWithDialog('hata/feedback/projects/delete', { projectId: project.id });
	if (currentProjectId.value === project.id) selectProject(null);
	await loadProjects();
}

// 旗鯖fork: プロジェクトのサスペンド切替。サスペンド中は owner/鯖缶以外に非表示。
async function toggleSuspendProject(project: any) {
	const toSuspend = !project.suspended;
	if (toSuspend) {
		const { canceled } = await os.confirm({
			type: 'warning',
			title: 'プロジェクトをサスペンド',
			text: `「${project.name}」を一時停止しますか？\n再びオンにするまで、作成者と鯖缶以外には表示されなくなります。`,
		});
		if (canceled) return;
	}
	await os.apiWithDialog('hata/feedback/projects/update', { projectId: project.id, suspended: toSuspend });
	await loadProjects();
}

// 旗鯖fork: 現在のプロジェクトの管理メニュー(編集/サスペンド/削除)を開く。
function manageCurrentProject(ev: MouseEvent) {
	const project = ownProjects.value.find(p => p.id === currentProjectId.value);
	if (project == null) return;
	os.popupMenu([
		{ text: '編集', icon: 'ti ti-pencil', action: () => editProject(project) },
		{
			text: project.suspended ? 'サスペンド解除' : 'サスペンド（一時停止）',
			icon: project.suspended ? 'ti ti-player-play' : 'ti ti-player-pause',
			action: () => toggleSuspendProject(project),
		},
		{ text: '削除', icon: 'ti ti-trash', danger: true, action: () => removeProject(project) },
	], ev.currentTarget ?? ev.target);
}

// スタッフ: 近々の修正・改善予定をホームに掲示する。
async function addRoadmap() {
	const { canceled, result } = await os.form('近々の予定を追加', {
		title: { type: 'string', label: '内容', required: true },
		description: { type: 'string', label: '補足', multiline: true },
	});
	if (canceled) return;
	// 任意で画像(スクショ等)を添付。
	let fileIds: string[] = [];
	const { canceled: noImg } = await os.confirm({ type: 'question', text: '画像（スクリーンショット等）を添付しますか？' });
	if (!noImg) {
		const files = await chooseDriveFile({ multiple: false }).catch(() => []);
		fileIds = files.map(f => f.id);
	}
	const issue = await misskeyApi('hata/feedback/issues/create', {
		title: result.title,
		description: result.description ?? '',
		category: 'improvement',
		projectId: null,
		fileIds,
	});
	// 掲示は「対応予定」状態で。
	await misskeyApi('hata/feedback/issues/update', { issueId: issue.id, status: 'planned' }).catch(() => {});
	await loadRoadmap();
}

watch(() => props.issueId, (v, old) => {
	if (old != null && v == null) { reloadIssues(); loadRoadmap(); loadNotifications(); }
});

onMounted(() => {
	if (props.number) { resolveNumber(); return; }
	init();
});

const headerActions = computed(() => [{
	icon: 'ti ti-refresh',
	text: '更新',
	handler: () => { reloadIssues(); loadRoadmap(); loadNotifications(); loadEmojiRequests(); },
}]);

definePage(() => ({
	title: 'HataFeed',
	icon: 'ti ti-message-report',
}));
</script>

<style lang="scss" module>
/* 旗鯖fork: HataFeed ロゴ用フォント(Hataskeyと同じ Righteous・同梱)。 */
@font-face {
	font-family: 'Righteous';
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
}

.center { text-align: center; padding: 40px 0; opacity: .6; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 64px 0; }
.emptyIcon { font-size: 3rem; opacity: .4; }
.emptyText { opacity: .7; }
.emptyMini { opacity: .55; font-size: .88em; padding: 10px 2px; }

.stage { position: relative; }
.content { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 18px; }

/* ヒーロー(中央揃え) */
.hero {
	display: flex; flex-direction: column; align-items: center; text-align: center; gap: 18px;
	background: linear-gradient(160deg, color-mix(in srgb, var(--MI_THEME-accent) 14%, var(--MI_THEME-panel)), var(--MI_THEME-panel) 72%);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 24px;
	padding: 32px 26px 28px;
}
.heroText { min-width: 0; }
.logo { font-family: 'Righteous', system-ui, sans-serif; font-size: 2.6rem; line-height: 1.05; letter-spacing: .5px; color: var(--MI_THEME-accent); }
.tagline { margin: 10px 0 0; opacity: .78; font-size: .92em; }
.heroBtns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

/* ピル型ボタン(HatasabaUI調) */
.pillBtn {
	display: inline-flex; align-items: center; gap: 8px;
	border: 1px solid var(--MI_THEME-divider); background: var(--MI_THEME-panel); color: inherit;
	border-radius: 999px; padding: 11px 20px; font-size: .92em; font-weight: 600; cursor: pointer;
	transition: transform .12s, box-shadow .12s, border-color .12s;
}
.pillBtn:hover { transform: translateY(-1px); border-color: var(--MI_THEME-accent); box-shadow: 0 4px 14px rgba(0,0,0,.06); }
.pillBtn i { font-size: 1.05em; }
/* 旗鯖fork: ベータ機能数バッジ(〇に数字) */
.betaBadge {
	display: inline-flex; align-items: center; justify-content: center;
	min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
	background: var(--MI_THEME-accent); color: #fff; font-size: .72em; font-weight: 900; line-height: 1;
}
.pillPrimary { background: var(--MI_THEME-accent); color: #fff; border-color: var(--MI_THEME-accent); }

/* プロジェクトバー(中央揃え) */
.projectBar { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.proj { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--MI_THEME-divider); background: var(--MI_THEME-panel); color: inherit; border-radius: 999px; padding: 7px 16px; font-size: .85em; cursor: pointer; transition: all .12s; }
.proj:hover { border-color: var(--MI_THEME-accent); }
.projOn { background: var(--MI_THEME-accent); color: #fff; border-color: var(--MI_THEME-accent); }
.projAdd { border-style: dashed; opacity: .85; }
.projManage { opacity: .85; }
.projSuspended { opacity: .6; border-style: dashed; }
.suspendedTag { margin-left: 6px; font-size: .8em; padding: 1px 6px; border-radius: 999px; background: var(--MI_THEME-warn); color: #fff; }

/* カード共通 */
.card, .roadmap, .main {
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 20px;
	padding: 18px 20px;
}
.cardHead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.cardTitle { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; font-size: 1.02em; }
.cardTitle i { color: var(--MI_THEME-accent); }
.smallPill { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--MI_THEME-divider); background: var(--MI_THEME-bg); color: inherit; border-radius: 999px; padding: 5px 13px; font-size: .8em; font-weight: 600; cursor: pointer; transition: all .12s; }
.smallPill:hover { border-color: var(--MI_THEME-accent); color: var(--MI_THEME-accent); }
.smallPillOn { background: var(--MI_THEME-accent); color: #fff; border-color: var(--MI_THEME-accent); }
.notifActions { display: inline-flex; gap: 6px; align-items: center; }

/* ロードマップ */
.roadmap { background: linear-gradient(120deg, color-mix(in srgb, var(--MI_THEME-accent) 9%, var(--MI_THEME-panel)), var(--MI_THEME-panel) 80%); }
.roadList { display: flex; flex-direction: column; gap: 8px; }
.roadItem { display: flex; align-items: center; gap: 10px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 999px; padding: 9px 16px; cursor: pointer; text-align: left; color: inherit; transition: all .12s; }
.roadItem:hover { border-color: var(--MI_THEME-accent); transform: translateX(2px); }
.roadImg { width: 30px; height: 30px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.roadTitle { flex: 1; min-width: 0; font-weight: 600; font-size: .92em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 2カラム */
/* ウィンドウ表示など実際の幅で折り返すためコンテナクエリを使う */
.colsCt { container-type: inline-size; }
.cols { display: grid; grid-template-columns: 1.7fr 1fr; gap: 18px; align-items: stretch; }

.searchBar { display: flex; align-items: center; gap: 8px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 999px; padding: 8px 14px; margin-bottom: 10px; }
.searchIcon { opacity: .5; }
.searchInput { flex: 1; min-width: 0; background: none; border: none; outline: none; color: inherit; font-size: .9em; }
.searchClear { background: none; border: none; color: inherit; opacity: .5; cursor: pointer; }
.searchClear:hover { opacity: 1; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
.select { background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 999px; padding: 7px 14px; font-size: .82em; color: inherit; cursor: pointer; }
.toggle { display: inline-flex; align-items: center; gap: 5px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 999px; padding: 7px 14px; font-size: .82em; color: inherit; cursor: pointer; }
.toggleOn { background: var(--MI_THEME-accent); color: #fff; border-color: var(--MI_THEME-accent); }

.issueList { display: flex; flex-direction: column; gap: 10px; }
.issueCard { text-align: left; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 16px; padding: 14px 16px; cursor: pointer; color: inherit; transition: transform .12s, border-color .12s, box-shadow .12s; }
.issueCard:hover { border-color: var(--MI_THEME-accent); transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.06); }
.issueHead { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.issueTitle { font-weight: 700; margin: 8px 0; }
.issueNo { color: var(--MI_THEME-accent); font-weight: 700; margin-right: 2px; }
.issueFoot { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; opacity: .8; font-size: .8em; }
.metaChip { display: inline-flex; align-items: center; gap: 4px; }
.byUser { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; opacity: .85; }
.byAvatar { width: 18px; height: 18px; }

.moreBtn { display: block; margin: 14px auto 0; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 999px; padding: 8px 22px; font-size: .85em; color: inherit; cursor: pointer; }

/* 旗鯖fork: イシュー一覧のページ式ナビ */
.pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
.pagerSize { display: inline-flex; align-items: center; gap: 8px; font-size: .82em; opacity: .85; }
.pagerNav { display: inline-flex; align-items: center; gap: 10px; margin-left: auto; }
.pagerBtn { width: 38px; height: 38px; border-radius: 999px; border: 1px solid var(--MI_THEME-divider); background: var(--MI_THEME-panel); color: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all .12s; }
.pagerBtn:hover:not(:disabled) { border-color: var(--MI_THEME-accent); color: var(--MI_THEME-accent); }
.pagerBtn:disabled { opacity: .35; cursor: default; }
.pagerPage { min-width: 2em; text-align: center; font-weight: 700; font-size: .9em; }
.notifPager { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 10px; }
.moreBtn:hover { border-color: var(--MI_THEME-accent); }

.emptyBlock { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 36px 0; text-align: center; opacity: .85; }
.emptyBlockIcon { font-size: 2.4rem; opacity: .35; }

/* サイド */
.side { display: flex; flex-direction: column; gap: 18px; }

.pinIcon { color: var(--MI_THEME-accent); font-size: .9em; }
.closedTag { font-size: .72em; opacity: .55; }

/* ライブアクティビティ */
.liveDot { width: 9px; height: 9px; border-radius: 999px; background: #e0506a; box-shadow: 0 0 0 0 rgba(224,80,106,.6); animation: hfPulse 1.8s infinite; }
@keyframes hfPulse { 0% { box-shadow: 0 0 0 0 rgba(224,80,106,.5); } 70% { box-shadow: 0 0 0 7px rgba(224,80,106,0); } 100% { box-shadow: 0 0 0 0 rgba(224,80,106,0); } }
.actList { display: flex; flex-direction: column; gap: 6px; }
.actRow { display: flex; gap: 9px; align-items: flex-start; padding: 8px; border-radius: 12px; }
.actNew { background: color-mix(in srgb, var(--MI_THEME-accent) 7%, transparent); }
.actAvatar { width: 30px; height: 30px; flex-shrink: 0; }
.actLock { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--MI_THEME-bg); color: var(--MI_THEME-fgTransparentWeak, var(--MI_THEME-fg)); border: 1px solid var(--MI_THEME-divider); font-size: .9em; }
.actClosedIcon { color: var(--MI_THEME-fgTransparentWeak, #888); font-size: .9em; }
.actBody { min-width: 0; flex: 1; font-size: .84em; }
.actName { font-weight: 700; }
.actVerb { opacity: .7; }
.actObj { display: flex; align-items: center; gap: 5px; margin-top: 2px; }
.actEmoji { width: 18px; height: 18px; object-fit: contain; }
.actObjText { opacity: .9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.actTime { font-size: .72em; opacity: .5; flex-shrink: 0; }

/* 通知 */
.unread { background: var(--MI_THEME-accent); color: #fff; border-radius: 999px; padding: 0 7px; font-size: .7em; margin-left: 5px; }
.notifList { display: flex; flex-direction: column; gap: 4px; }
.notifRow { display: flex; gap: 9px; padding: 8px; border-radius: 12px; cursor: pointer; text-align: left; color: inherit; background: none; border: none; }
.notifRow:hover { background: var(--MI_THEME-bg); }
.notifUnread { background: color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent); }
.notifIcon { font-size: 1.05rem; opacity: .7; margin-top: 2px; color: var(--MI_THEME-accent); }
.notifBody { min-width: 0; }
.notifMsg { font-size: .85em; }
.notifActor { font-size: .72em; opacity: .55; }

/* 絵文字 */
.quotaNote { display: inline-flex; align-items: center; gap: 5px; font-size: .76em; color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); border-radius: 999px; padding: 3px 10px; margin-bottom: 10px; }
.emojiList { display: flex; flex-direction: column; gap: 6px; }
.emojiRow { display: flex; align-items: center; gap: 10px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 14px; padding: 8px 12px; cursor: pointer; text-align: left; color: inherit; transition: border-color .12s; }
.emojiRow:hover { border-color: var(--MI_THEME-accent); }
.emojiImg { width: 34px; height: 34px; object-fit: contain; flex-shrink: 0; }
.emojiInfo { min-width: 0; flex: 1; }
.emojiName { font-weight: 600; font-size: .88em; }
.emojiSub { font-size: .74em; opacity: .6; }
.emojiArrow { opacity: .4; }

@container (max-width: 850px) {
	.cols { grid-template-columns: 1fr; }
}
</style>

<style lang="scss" scoped>
/* カテゴリ/ステータスの色は値が動的なため、module ではなく data 属性で当てる(動的 $style[] はビルドで解決されないため)。 */
.hfCatPill, .hfStatusPill { font-size: .72em; padding: 3px 10px; border-radius: 999px; font-weight: 600; white-space: nowrap; }
.hfCatPill[data-cat="bug"] { background: #ffe1e1; color: #c0392b; }
.hfCatPill[data-cat="improvement"] { background: #e1fff0; color: #1f8a5b; }
.hfCatPill[data-cat="security"] { background: #ffe9d6; color: #c0612b; }
.hfCatPill[data-cat="featureRequest"] { background: #e1efff; color: #2b6fc0; }
.hfCatPill[data-cat="adoptionRequest"] { background: #e7e1ff; color: #5a2bc0; }
.hfCatPill[data-cat="betaFeature"] { background: #d9f3f0; color: #1f7a86; }
.hfCatPill[data-cat="unresolved"] { background: #efefef; color: #666; }
.hfCatPill[data-cat="other"] { background: #efefef; color: #666; }
.hfStatusPill[data-status="open"] { background: #e1efff; color: #2b6fc0; }
.hfStatusPill[data-status="planned"] { background: #fff6d6; color: #9a7b1f; }
.hfStatusPill[data-status="inProgress"] { background: #fff0d6; color: #b6791f; }
.hfStatusPill[data-status="resolved"] { background: #e1fff0; color: #1f8a5b; }
.hfStatusPill[data-status="wontfix"] { background: #efefef; color: #777; }
.hfStatusPill[data-status="unknown"] { background: #efefef; color: #999; }
.hfStatusPill[data-status="closed"] { background: #e9e4ef; color: #6a5a86; }
.hfDot { width: 9px; height: 9px; border-radius: 999px; flex-shrink: 0; display: inline-block; }
.hfDot[data-status="open"] { background: #2b6fc0; }
.hfDot[data-status="planned"] { background: #d6a82b; }
.hfDot[data-status="inProgress"] { background: #e08a1f; }
.hfDot[data-status="resolved"] { background: #1f8a5b; }
.hfDot[data-status="wontfix"] { background: #999; }
.hfDot[data-status="unknown"] { background: #bbb; }
.hfDot[data-status="closed"] { background: #8a7aa6; }

/* 絵文字申請の状態アイコン(承認=緑✓ / 審査中=黄時計 / 却下=赤🚫) */
.hfEstIcon { font-size: 1.15rem; flex-shrink: 0; opacity: .85; }
.hfEstIcon[data-est="approved"] { color: #1f8a5b; }
.hfEstIcon[data-est="pending"] { color: #c9971f; }
.hfEstIcon[data-est="rejected"] { color: #c0392b; }

/* ライブアクティビティの入場/並べ替えアニメーション(TransitionGroup の name=hfAct はグローバルクラスのため module 外で定義)。 */
.hfAct-enter-active { transition: opacity .35s ease, transform .35s ease; }
.hfAct-enter-from { opacity: 0; transform: translateY(-8px); }
.hfAct-leave-active { transition: opacity .25s ease; position: absolute; }
.hfAct-leave-to { opacity: 0; }
.hfAct-move { transition: transform .35s ease; }

@media (prefers-reduced-motion: reduce) {
	.hfAct-enter-active, .hfAct-leave-active, .hfAct-move { transition: none; }
}
</style>
