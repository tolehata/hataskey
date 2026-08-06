<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed(フィードバックセンター)メインページ。
  - ロールポリシー canAccessHataFeed で利用可否を判定(未許可は「現在解放されていません」)。
  - デザイン改修(§4 2a/3a): Gitホスティング級の情報密度のリスト型リポジトリUI。
    上部ツールバー(サーバー切替 + 検索 + 新規イシュー) → タブバー → 本体グリッド(1fr 296px)。
    ベル/アバター等のグローバル chrome は Misskey フレーム(MkPageHeader)に委ね、二重化しない。
  - <600px ではコンテナクエリで縦積み(3a): ティッカー + 集計チップ + 予定 + フィルタ + リスト。
  - /hatafeed/:issueId で Issue 詳細(会話・賛同・スタッフ操作)を表示。
  - ロゴフォントは Hataskey と同じ Righteous(同梱)。背景右下に若葉のアニメーション。
-->
<template>
<MkStickyContainer>
	<template #header><MkPageHeader :title="'HataFeed'" :icon="'ti ti-message-report'"/></template>
	<MkSpacer :contentMax="1120">
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

		<!-- ダッシュボード(2a/3a) -->
		<div v-else :class="$style.repo" :data-smartphone="isSmartphone ? 'on' : undefined">
			<HataFeedLeaves v-if="leavesEnabled"/>
			<div :class="$style.repoInner">

				<!-- ツールバー: サーバー(プロジェクト)切替 + 検索 + 補助操作 -->
				<div :class="$style.toolbar">
					<div :class="$style.brand">
						<span :class="$style.logo">HataFeed</span>
					</div>
					<div :class="$style.toolDivider"></div>
					<button :class="$style.serverBtn" @click="openProjectSwitch">
						<i class="ti ti-flag-2" :class="$style.serverIcon" :style="currentProject?.color ? { color: currentProject.color } : undefined"></i>
						<span :class="$style.serverName">{{ currentProject?.name ?? 'Hataskey' }}</span>
						<i class="ti ti-selector" :class="$style.serverCaret"></i>
					</button>
					<div :class="$style.search">
						<i class="ti ti-search" :class="$style.searchIcon"></i>
						<input v-model="searchQuery" :class="$style.searchInput" type="search" placeholder="イシュー・会話を検索" @keydown.enter="reloadIssues" @search="reloadIssues">
						<button v-if="searchQuery" :class="$style.searchClear" @click="searchQuery = ''; reloadIssues()"><i class="ti ti-x"></i></button>
					</div>
					<button v-if="activeTab === 'roadmap' && isStaff" :class="[$style.newBtn]" @click="addRoadmap"><i class="ti ti-route"></i><span>予定を追加</span></button>
					<button ref="bellEl" :class="$style.iconBtn" title="通知" @click="openNotifications">
						<i class="ti ti-bell"></i>
						<span v-if="unreadCount > 0" :class="$style.bellBadge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
					</button>
					<button :class="$style.iconBtn" title="更新" @click="refreshAll"><i class="ti ti-refresh"></i></button>
					<button v-if="canExportCurrent" :class="[$style.iconBtn, $style.iconBtnHideMobile]" title="エクスポート" @click="openExportWindow"><i class="ti ti-file-export"></i></button>
					<button v-if="isStaff && currentProjectId != null" :class="[$style.iconBtn, $style.iconBtnHideMobile]" title="プロジェクト管理" @click="manageCurrentProject"><i class="ti ti-settings"></i></button>
				</div>

				<!-- タブバー(下線式) -->
				<nav :class="$style.tabs">
					<button :class="[$style.tab, activeTab === 'issues' && $style.tabOn]" @click="goIssuesTab"><i class="ti ti-clipboard-list"></i> イシュー</button>
					<button :class="[$style.tab, activeTab === 'roadmap' && $style.tabOn]" @click="goRoadmapTab"><i class="ti ti-route"></i> ロードマップ</button>
					<button v-if="isStaff" :class="[$style.tab, activeTab === 'emoji' && $style.tabOn]" @click="goEmojiAdminTab"><i class="ti ti-mood-cog"></i> 申請管理<span v-if="emojiRequests.length" :class="$style.tabCount">{{ emojiRequests.length }}</span></button>
					<button :class="$style.tab" @click="openBeta"><i class="ti ti-flask"></i> ベータ<span v-if="hataBetaTotal" :class="$style.tabCount">{{ hataBetaTotal }}</span></button>
				</nav>

				<!-- 旗鯖fork: 利用者の主要操作を本文上部へ固定。左が絵文字申請、右が新規イシュー。 -->
				<div v-if="activeTab === 'issues'" :class="$style.topActions">
					<button type="button" :class="[$style.topAction, $style.topActionEmoji]" @click="requestEmoji">
						<i class="ti ti-mood-plus"></i>
						<span>絵文字申請</span>
					</button>
					<button type="button" :class="[$style.topAction, $style.topActionEmoji]" @click="createIssue">
						<i class="ti ti-pencil-plus"></i>
						<span>新規イシュー</span>
					</button>
				</div>

				<!-- 絵文字申請管理(スタッフのみ・2g相当): 申請一覧を状態別に絞り、各行の「確認」から承認/リジェクト -->
				<div v-if="activeTab === 'emoji' && isStaff" :class="$style.emojiAdmin">
					<div :class="$style.eaTop">
						<div :class="$style.eaFilters">
							<button v-for="f in emojiAdminFilters" :key="String(f.value)" :class="[$style.eaFilter, emojiAdminStatus === f.value && $style.eaFilterOn]" @click="setEmojiAdminStatus(f.value)">{{ f.label }}</button>
						</div>
						<div :class="$style.eaTopActions">
							<button type="button" :class="$style.eaRequestOwn" @click="requestEmoji"><i class="ti ti-mood-plus"></i> 自分で絵文字を申請</button>
							<button v-if="emojiAdminStatus === 'pending' && emojiAdminList.length" type="button" :class="$style.eaBatch" @click="openReviewQueue"><i class="ti ti-player-track-next"></i> 未処理を連続確認</button>
						</div>
					</div>
					<div v-if="emojiAdminList.length === 0" :class="$style.emptyBlock">
						<i class="ti ti-mood-empty" :class="$style.emptyBlockIcon"></i>
						<div>{{ emojiAdminStatus === 'pending' ? '未処理の申請はありません。' : '該当する申請はありません。' }}</div>
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
									・ {{ r.sourceType === 'remote' ? (r.remoteHost ? `リモート(${r.remoteHost})` : 'リモート') : '自前' }}
								</div>
							</div>
							<div :class="$style.eaAction">
								<button v-if="r.status === 'pending'" :class="$style.eaReview" @click="openApprove(r)"><i class="ti ti-eye"></i> 確認</button>
								<span v-else :class="['ti', emojiStatusIcon[r.status] ?? '', 'hfEstIcon']" :data-est="r.status" :title="emojiStatusLabel[r.status]"></span>
							</div>
						</div>
					</div>
					<div v-if="emojiAdminPage > 0 || emojiAdminHasNext" :class="$style.pager">
						<button :class="$style.pagerArrow" :disabled="emojiAdminPage === 0" @click="prevEmojiAdminPage"><i class="ti ti-chevron-left"></i> 前へ</button>
						<span :class="$style.pagerPage">{{ emojiAdminPage + 1 }}</span>
						<button :class="$style.pagerArrow" :disabled="!emojiAdminHasNext" @click="nextEmojiAdminPage">次へ <i class="ti ti-chevron-right"></i></button>
					</div>
				</div>

				<!-- 3a(モバイル)専用: ライブティッカー + 集計チップ + 予定横スクロール -->
				<div v-if="activeTab !== 'emoji'" :class="$style.mobileExtras">
					<div v-if="activity.length" :class="$style.ticker">
						<span :class="$style.tickerDot"></span>
						<span :class="$style.tickerText"><b>{{ activity[0].user ? (activity[0].user.name ?? activity[0].user.username) : '誰か' }}</b>{{ activity[0].verb }}「{{ activity[0].label }}」</span>
						<MkTime :class="$style.tickerTime" :time="activity[0].time" mode="relative"/>
					</div>
					<div :class="$style.statChips">
						<button :class="$style.statChip" @click="applyStatus('open')"><div :class="[$style.statNum, $style.statOpen]">{{ counts.open }}</div><div :class="$style.statLabel">受付中</div></button>
						<button :class="$style.statChip" @click="applyStatus('inProgress')"><div :class="[$style.statNum, $style.statDoing]">{{ counts.inProgress }}</div><div :class="$style.statLabel">対応中</div></button>
						<button :class="$style.statChip" @click="applyStatus('resolved')"><div :class="[$style.statNum, $style.statResolved]">{{ counts.resolved }}</div><div :class="$style.statLabel">解決済み</div></button>
						<button :class="$style.statChip" @click="isStaff ? goEmojiAdminTab() : requestEmoji()"><div :class="[$style.statNum, $style.statEmoji]">{{ emojiRequests.length }}</div><div :class="$style.statLabel">{{ isStaff ? '申請を確認' : '絵文字を申請' }}</div></button>
					</div>
					<!-- 旗鯖fork: スマホでは右サイドバーを畳むため、絵文字申請カラムだけ本文側へ再配置する。 -->
					<section :class="$style.mobileEmojiCard">
						<div :class="$style.mobileEmojiHead">
							<div>
								<div :class="$style.mobileEmojiTitle"><i class="ti ti-mood-smile"></i> 絵文字申請 <span v-if="emojiRequests.length">{{ emojiRequests.length }}</span></div>
								<div :class="$style.mobileEmojiLead">{{ isStaff ? '未処理の申請を順番に確認できます。' : '使いたい絵文字を画像またはリモート絵文字から申請できます。' }}</div>
							</div>
							<button type="button" :class="$style.mobileEmojiPrimary" @click="isStaff ? openReviewQueue() : requestEmoji()">
								<i :class="isStaff ? 'ti ti-player-track-next' : 'ti ti-plus'"></i> {{ isStaff ? 'まとめて確認' : '申請する' }}
							</button>
						</div>
						<div v-if="emojiRequests.length === 0" :class="$style.emptyMini">{{ isStaff ? '未処理の申請はありません。' : 'まだ申請はありません。' }}</div>
						<div v-else :class="$style.mobileEmojiList">
							<button v-for="r in emojiRequests.slice(0, 5)" :key="r.id" type="button" :class="$style.mobileEmojiRow" @click="isStaff && r.status === 'pending' ? openApprove(r) : null">
								<span :class="$style.emojiTile"><img v-if="r.imageUrl" :src="r.imageUrl" :class="$style.emojiImg" :alt="r.name"></span>
								<span :class="$style.emojiCode">:{{ r.name }}:</span>
								<i :class="['ti', emojiStatusIcon[r.status] ?? 'ti-clock-hour-4', 'hfEstIcon']" :data-est="r.status" :title="emojiStatusLabel[r.status]"></i>
							</button>
						</div>
						<div v-if="emojiQuota && !isStaff" :class="$style.quotaWrap"><HfQuotaMeter :remaining="emojiQuota.remaining" :limit="emojiQuota.limit"/></div>
					</section>
					<div v-if="roadmap.length" :class="$style.roadScroll">
						<div :class="$style.roadScrollHead"><i class="ti ti-route"></i> 近々の修正・改善予定</div>
						<div :class="$style.roadScrollList">
							<button v-for="r in roadmap.slice(0, 6)" :key="r.id" :class="$style.roadScrollCard" @click="openIssue(r.id)">
								<div :class="$style.roadScrollTitle">{{ r.title }}</div>
								<HfStatusPill :status="r.status" variant="pill"/>
							</button>
						</div>
					</div>
				</div>

				<!-- 本体グリッド(イシュー/ロードマップ) -->
				<div v-if="activeTab !== 'emoji'" :class="$style.gridCt">
				<div :class="$style.grid">
					<!-- 左: フィルタ + イシューリスト -->
					<section :class="$style.listCol">
						<div :class="$style.filterRow">
							<button :class="[$style.filterToggle, !includeClosed && $style.filterToggleOn]" @click="setClosed(false)"><i class="ti ti-circle-dot"></i> 受付中</button>
							<button :class="[$style.filterToggle, includeClosed && $style.filterToggleOn]" @click="setClosed(true)"><i class="ti ti-circle-check"></i> 解決済み</button>
							<div :class="$style.filterDropdowns">
								<button :class="[$style.dropBtn, filterCategory && $style.dropBtnOn]" @click="openCategoryMenu">{{ filterCategory ? categoryLabel[filterCategory] : 'カテゴリ' }} <i class="ti ti-chevron-down"></i></button>
								<button :class="[$style.dropBtn, filterStatus && $style.dropBtnOn]" @click="openStatusMenu">{{ filterStatus ? statusLabel[filterStatus] : 'ステータス' }} <i class="ti ti-chevron-down"></i></button>
								<button :class="[$style.dropBtn, authorFilter && $style.dropBtnOn]" @click="openAuthorMenu">{{ authorFilter ? (authorFilter.name ?? authorFilter.username) : '作成者' }} <i class="ti ti-chevron-down"></i></button>
							</div>
						</div>

						<div v-if="visibleIssues.length === 0" :class="$style.emptyBlock">
							<template v-if="activeTab === 'roadmap'">
								<i class="ti ti-route" :class="$style.emptyBlockIcon"></i>
								<div>ロードマップを報告するには、このタブを使用します。<br>近々の修正・改善予定を掲示できます。</div>
								<button v-if="isStaff" :class="$style.emptyCta" @click="addRoadmap"><i class="ti ti-route"></i> ロードマップを計画する</button>
							</template>
							<template v-else>
								<i class="ti ti-mail-opened" :class="$style.emptyBlockIcon"></i>
								<div>該当するイシューはありません。<br>お気づきの点があればご報告ください。</div>
								<button :class="$style.emptyCta" @click="createIssue"><i class="ti ti-pencil-plus"></i> イシューを作成する</button>
							</template>
						</div>
						<div v-else ref="issueListEl" :class="$style.listCard">
							<button
								v-for="issue in visibleIssues"
								:key="issue.id"
								:class="[$style.issueRow, issue.pinned && $style.issueRowPinned, issue.closed && $style.issueRowClosed]"
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
										<template v-if="issue.createdBy">・ <MkUserName :class="$style.rowAuthor" :user="issue.createdBy"/> が<MkTime :time="issue.createdAt" mode="relative"/>に作成</template>
										・ <HfStatusPill :status="issue.status" variant="text" :showIcon="false" :class="$style.rowStatusText"/>
										<template v-if="issue.assignees && issue.assignees.length"> ・ <i class="ti ti-shield-check" :class="$style.rowAssigneeIcon"></i> <MkUserName :class="$style.rowAuthor" :user="issue.assignees[0]"/> が対処担当</template>
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
							<button :class="$style.pagerArrow" :disabled="issuePage === 0" @click="prevIssuePage"><i class="ti ti-chevron-left"></i> 前へ</button>
							<span :class="$style.pagerPage">{{ issuePage + 1 }}</span>
							<button :class="$style.pagerArrow" :disabled="!issuesHasNext" @click="nextIssuePage">次へ <i class="ti ti-chevron-right"></i></button>
							<label :class="$style.pagerSize">
								<select v-model.number="issuePageSize" :class="$style.pagerSelect" @change="reloadIssues">
									<option :value="10">10件</option>
									<option :value="50">50件</option>
									<option :value="100">100件</option>
								</select>
							</label>
						</div>
					</section>

					<!-- 右: サイドバー3カード -->
					<aside :class="$style.sideCol">
						<!-- ①近々の修正・改善予定 -->
						<section v-if="roadmap.length || isStaff" :class="$style.sideCard">
							<div :class="$style.sideHead">
								<span :class="$style.sideTitle"><i class="ti ti-route"></i> 近々の修正・改善予定</span>
								<button v-if="isStaff" :class="$style.sideAdd" @click="addRoadmap"><i class="ti ti-plus"></i></button>
							</div>
							<div v-if="roadmap.length === 0" :class="$style.emptyMini">掲示中の予定はありません。</div>
							<div v-else :class="$style.roadList">
								<button v-for="r in roadmap.slice(0, 5)" :key="r.id" :class="$style.roadItem" @click="openIssue(r.id)">
									<span :class="$style.roadDot" :data-status="r.status"></span>
									<span :class="$style.roadTitle">{{ r.title }}</span>
									<HfStatusPill :status="r.status" variant="pill"/>
								</button>
							</div>
						</section>

						<!-- ②絵文字申請 -->
						<section :class="$style.sideCard">
							<div :class="$style.sideHead">
								<span :class="$style.sideTitle"><i class="ti ti-mood-smile"></i> 絵文字申請<span v-if="emojiRequests.length" :class="$style.sideCount">{{ emojiRequests.length }}</span></span>
								<div :class="$style.sideHeadActions">
									<button v-if="isStaff && emojiRequests.length > 1" type="button" :class="$style.sideReviewQueue" title="未処理の絵文字申請をまとめて確認" @click="openReviewQueue"><i class="ti ti-player-track-next"></i> まとめて確認</button>
									<button type="button" :class="$style.sideAddText" @click="requestEmoji"><i class="ti ti-plus"></i> {{ isStaff ? '自分で申請' : '申請する' }}</button>
								</div>
							</div>
							<div v-if="emojiRequests.length === 0" :class="$style.emptyMini">{{ isStaff ? '未処理の申請はありません。' : 'まだ申請はありません。' }}</div>
							<div v-else :class="$style.emojiList">
								<button v-for="r in emojiRequests" :key="r.id" :class="$style.emojiRow" @click="isStaff && r.status === 'pending' ? openApprove(r) : null">
									<span :class="$style.emojiTile"><img v-if="r.imageUrl" :src="r.imageUrl" :class="$style.emojiImg" :alt="r.name"/></span>
									<span :class="$style.emojiCode">:{{ r.name }}:</span>
									<i :class="['ti', emojiStatusIcon[r.status] ?? 'ti-clock-hour-4', 'hfEstIcon']" :data-est="r.status" :title="emojiStatusLabel[r.status]"></i>
								</button>
							</div>
							<div v-if="emojiQuota && !isStaff" :class="$style.quotaWrap">
								<HfQuotaMeter :remaining="emojiQuota.remaining" :limit="emojiQuota.limit"/>
							</div>
						</section>

						<!-- ③みんなの動き -->
						<section :class="$style.sideCard">
							<div :class="$style.sideHead">
								<span :class="$style.sideTitle"><span :class="$style.liveDot"></span> みんなの動き</span>
							</div>
							<div v-if="activity.length === 0" :class="$style.emptyMini">まだ動きはありません。</div>
							<TransitionGroup v-else tag="div" :class="$style.actList" name="hfAct">
								<div v-for="a in activity.slice(0, 3)" :key="a.key" :class="$style.actRow">
									<HfAvatar v-if="a.user" :user="a.user" :size="20"/>
									<span v-else :class="[$style.actAvatarLock]"><i :class="a.type === 'issueClosed' ? 'ti ti-lock' : 'ti ti-help'"></i></span>
									<div :class="$style.actBody">
										<MkUserName v-if="a.user" :class="$style.actName" :user="a.user"/><span v-else :class="$style.actName">誰か</span>
										<span :class="$style.actVerb">{{ a.verb }}</span>
										<span :class="$style.actObj">{{ a.label }}</span>
									</div>
									<MkTime :class="$style.actTime" :time="a.time" mode="relative"/>
								</div>
							</TransitionGroup>
						</section>
					</aside>
				</div>
				</div>

				<!-- モバイル: ロードマップ管理だけは本文の主導線と用途が異なるためFABを残す。 -->
				<button v-if="activeTab === 'roadmap' && isStaff" :class="$style.fab" @click="addRoadmap">
					<i class="ti ti-route"></i>
				</button>
			</div>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import type { HataFeedEmojiRequest } from '@/utility/hatafeed.js';
import { deviceKind } from '@/utility/device-kind.js';
import HataFeedIssue from '@/components/HataFeedIssue.vue';
import HataFeedLeaves from '@/components/HataFeedLeaves.vue';
import HfStatusPill from '@/components/HfStatusPill.vue';
import HfCategoryBadge from '@/components/HfCategoryBadge.vue';
import HfAvatar from '@/components/HfAvatar.vue';
import HfQuotaMeter from '@/components/HfQuotaMeter.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { prefer } from '@/preferences.js';
import {
	categoryLabel, categoryKeys, staffOnlyCategoryKeys, statusLabel, statusKeys, emojiStatusLabel, emojiStatusIcon, hataBetaTotal,
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
		router.replace('/hatafeed/:issueId', { params: { issueId: res.issue.id } });
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
// 旗鯖fork(2a): 通知パネルをアンカーするツールバーのベル要素。
const bellEl = ref<HTMLElement | null>(null);
// 旗鯖fork(2a/3a): 実機がスマホか。作成ボタンの形態(スマホ=右下FAB / それ以外=右上ボタン)を
// 幅ではなくデバイス種別で分岐する。狭いデスクトップウィンドウでは FAB を出さず、
// ツールバー右上の作成ボタンを使う(FAB がイシュー情報に被る問題への対応)。
const isSmartphone = deviceKind === 'smartphone';
const roadmap = ref<any[]>([]);
const filterCategory = ref<string | null>(null);
const filterStatus = ref<string | null>(null);
// 旗鯖fork(2a): 作成者フィルタ(選択中のユーザー)。null = 全員。
const authorFilter = ref<any>(null);
const includeClosed = ref(false);
const searchQuery = ref('');
const exportWindowOpen = ref(false);

const unreadCount = ref(0);
const emojiRequests = ref<HataFeedEmojiRequest[]>([]);
const emojiQuota = ref<{ limit: number; remaining: number } | null>(null);

const issueId = computed(() => props.issueId ?? null);
const ownProjects = computed(() => projects.value.filter(p => !p.isOfficial));
// 旗鯖fork: 現在選択中のプロジェクト(公式=null時はnull)。
const currentProject = computed(() => currentProjectId.value == null ? null : (projects.value.find(p => p.id === currentProjectId.value) ?? null));

// 旗鯖fork(2a/3a): アクティブなタブ。'issues'/'roadmap' はイシュー一覧のフィルタ違い、
// 'emoji' はスタッフ専用の絵文字申請管理ビュー(本体を差し替える)。
const activeTab = ref<'issues' | 'roadmap' | 'emoji'>('issues');

// 旗鯖fork(3a): モバイルの集計チップ。現在読み込み済みページ内の件数を状態別に数える
// (総件数の集計APIは持たないため、表示中ページのローカル集計)。
const counts = computed(() => {
	const c: Record<string, number> = { open: 0, inProgress: 0, planned: 0, resolved: 0 };
	for (const i of issues.value) {
		if (i.status in c) c[i.status]++;
	}
	return c;
});

// 旗鯖fork: 現在のプロジェクトのイシューをエクスポートできるか(鯖缶 or プロジェクト作成者)。
const canExportCurrent = computed(() => {
	if (isStaff.value) return true;
	if (currentProjectId.value == null) return false;
	const p = ownProjects.value.find(x => x.id === currentProjectId.value);
	return p != null && p.ownerId === $i?.id;
});

// 旗鯖fork: 全件一括ダウンロードではなく、範囲・内容を選ぶ非モーダル画面を開く。
async function openExportWindow() {
	if (exportWindowOpen.value) return;
	exportWindowOpen.value = true;
	try {
		const { dispose } = os.popup((await import('@/components/HataFeedExportWindow.vue')).default, {
			projectId: currentProjectId.value,
			projectName: currentProject.value?.name ?? 'Hataskey',
		}, {
			closed: () => { exportWindowOpen.value = false; dispose(); },
		});
	} catch (error) {
		exportWindowOpen.value = false;
		console.error(error);
		os.alert({ type: 'error', title: 'エクスポート画面を開けませんでした', text: '再読み込みして、もう一度お試しください。' });
	}
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
		createdById: authorFilter.value?.id ?? null,
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

// 旗鯖fork(2a/3a): ツールバー/フィルタのメニュー・トグル群。
function openProjectSwitch(ev: MouseEvent) {
	const items: any[] = [
		{ text: 'Hataskey', icon: 'ti ti-flag-2', active: currentProjectId.value == null, action: () => selectProject(null) },
		...ownProjects.value.map(p => ({
			text: p.name + (p.suspended ? '（停止中）' : ''),
			icon: p.suspended ? 'ti ti-player-pause' : 'ti ti-cube',
			active: currentProjectId.value === p.id,
			action: () => selectProject(p.id),
		})),
	];
	if (currentProject.value) items.push(null, { text: '概要', icon: 'ti ti-info-circle', action: () => showProjectOverview(currentProject.value) });
	if (isStaff.value) items.push({ text: 'プロジェクトを追加', icon: 'ti ti-plus', action: createProject });
	os.popupMenu(items, (ev.currentTarget ?? ev.target) as HTMLElement);
}

function openCategoryMenu(ev: MouseEvent) {
	os.popupMenu([
		{ text: 'すべてのカテゴリ', active: filterCategory.value == null, action: () => { filterCategory.value = null; reloadIssues(); } },
		...filterCategoryKeys.value.map(c => ({ text: categoryLabel[c], active: filterCategory.value === c, action: () => { filterCategory.value = c; reloadIssues(); } })),
	], (ev.currentTarget ?? ev.target) as HTMLElement);
}

function openStatusMenu(ev: MouseEvent) {
	os.popupMenu([
		{ text: 'すべてのステータス', active: filterStatus.value == null, action: () => { filterStatus.value = null; reloadIssues(); } },
		...statusKeys.map(s => ({ text: statusLabel[s], active: filterStatus.value === s, action: () => { filterStatus.value = s; reloadIssues(); } })),
	], (ev.currentTarget ?? ev.target) as HTMLElement);
}

// 旗鯖fork(2a): 作成者で絞り込む。ユーザー選択ダイアログで作成者を指定/解除する。
async function openAuthorMenu(ev: MouseEvent) {
	const anchor = (ev.currentTarget ?? ev.target) as HTMLElement;
	if (authorFilter.value) {
		os.popupMenu([
			{ text: `${authorFilter.value.name ?? authorFilter.value.username} で絞り込み中`, icon: 'ti ti-user', action: () => {} },
			{ type: 'divider' },
			{ text: '作成者フィルタを解除', icon: 'ti ti-x', action: () => { authorFilter.value = null; reloadIssues(); } },
			{ text: '別の作成者を選ぶ', icon: 'ti ti-user-search', action: () => pickAuthor() },
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
	{ value: 'pending', label: '未処理' },
	{ value: 'approved', label: '承認済み' },
	{ value: 'rejected', label: 'リジェクト' },
	{ value: null, label: 'すべて' },
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
async function openNotifications() {
	const { dispose } = os.popup((await import('@/components/HataFeedNotifications.vue')).default, {
		anchorElement: bellEl.value,
	}, {
		read: () => { unreadCount.value = 0; },
		closed: () => { loadNotifications(); dispose(); },
	});
}

async function loadEmojiRequests() {
	emojiRequests.value = await misskeyApi('hata/feedback/emoji-requests', isStaff.value ? { status: 'pending', limit: 20 } : { mine: true, limit: 20 }) as unknown as HataFeedEmojiRequest[];
	emojiQuota.value = await misskeyApi('hata/feedback/emoji-quota', {}).catch(() => null);
}

function selectProject(id: string | null) {
	currentProjectId.value = id;
	reloadIssues();
}

function openIssue(id: string) {
	router.push('/hatafeed/:issueId', { params: { issueId: id } });
}

function openBeta() {
	router.push('/hatafeed/beta');
}

function goList() {
	router.push('/hatafeed');
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
		done: () => { loadEmojiRequests(); if (activeTab.value === 'emoji') reloadEmojiAdmin(); },
		closed: () => dispose(),
	});
}

// 旗鯖fork: 未処理申請を最大100件まで取得し、1件ずつ内容を確認しながら連続処理する。
// 一括承認は行わず、各操作は既存のスタッフ専用 approve/reject API を順番に呼ぶ。
async function openReviewQueue() {
	const pending = await misskeyApi('hata/feedback/emoji-requests', { status: 'pending', limit: 100 }) as unknown as HataFeedEmojiRequest[];
	if (pending.length === 0) {
		os.toast('未処理の絵文字申請はありません。');
		await loadEmojiRequests();
		if (activeTab.value === 'emoji') await reloadEmojiAdmin();
		return;
	}
	const { dispose } = os.popup((await import('@/components/HataFeedEmojiApprove.vue')).default, { requests: pending }, {
		done: () => { loadEmojiRequests(); if (activeTab.value === 'emoji') reloadEmojiAdmin(); },
		closed: () => { loadEmojiRequests(); if (activeTab.value === 'emoji') reloadEmojiAdmin(); dispose(); },
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
	], (ev.currentTarget ?? ev.target) as HTMLElement);
}

// スタッフ: 近々の修正・改善予定を掲示する。ロードマップ専用の作成画面(ウィザード)を開く。
async function addRoadmap() {
	const { dispose } = os.popup((await import('@/components/HataFeedRoadmapWizard.vue')).default, {}, {
		done: () => { loadRoadmap(); if (filterCategory.value === 'improvement') reloadIssues(); },
		closed: () => dispose(),
	});
}

watch(() => props.issueId, (v, old) => {
	if (old != null && v == null) { reloadIssues(); loadRoadmap(); loadNotifications(); }
});

onMounted(() => {
	if (props.number) { resolveNumber(); return; }
	init();
});

// 旗鯖fork(2a): 更新はツールバーの更新アイコンから。MkPageHeader の actions 帯は
// リポジトリUIのツールバーと機能が重複し、下の UI に覆いかぶさって邪魔なため廃止した。
function refreshAll() {
	reloadIssues();
	loadRoadmap();
	loadNotifications();
	loadEmojiRequests();
}

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
.emptyMini { opacity: .55; font-size: .84em; padding: 8px 2px; }

.repo { position: relative; container-type: inline-size; container-name: hatafeed; }
.repoInner { position: relative; z-index: 1; }

/* ===== ツールバー ===== */
.toolbar {
	display: flex; align-items: center; gap: 10px;
	/* 上パディングでベルの未読バッジ(top:-5px)が上部バーにクリップされないよう余白を確保 */
	padding: 8px 4px 12px;
	flex-wrap: wrap;
}
.brand { display: flex; align-items: center; }
.logo { font-family: 'Righteous', system-ui, sans-serif; font-size: 1.5rem; letter-spacing: .3px; color: var(--MI_THEME-accent); }
.toolDivider { width: 1px; height: 20px; background: var(--MI_THEME-divider); }
.serverBtn {
	display: inline-flex; align-items: center; gap: 7px;
	background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); color: inherit;
	border-radius: 8px; padding: 6px 12px; font-size: .86em; font-weight: 700; cursor: pointer;
	transition: border-color .12s;
}
.serverBtn:hover { border-color: var(--MI_THEME-accent); }
.serverIcon { color: var(--MI_THEME-accent); }
.serverName { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.serverCaret { opacity: .5; font-size: .9em; }
.search {
	flex: 1; min-width: 160px; max-width: 360px; margin-left: auto;
	display: flex; align-items: center; gap: 8px;
	background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider);
	border-radius: 8px; padding: 6px 12px;
}
.searchIcon { opacity: .5; }
.searchInput { flex: 1; min-width: 0; background: none; border: none; outline: none; color: inherit; font-size: .86em; }
.searchClear { background: none; border: none; color: inherit; opacity: .5; cursor: pointer; }
.searchClear:hover { opacity: 1; }
.newBtn {
	display: inline-flex; align-items: center; gap: 6px;
	background: var(--MI_THEME-accent); border: none; color: #fff;
	border-radius: 8px; padding: 7px 14px; font-size: .86em; font-weight: 700; cursor: pointer;
	transition: opacity .12s;
}
.newBtn:hover { opacity: .9; }
.iconBtn {
	position: relative;
	display: inline-flex; align-items: center; justify-content: center;
	width: 34px; height: 34px; border-radius: 8px;
	background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); color: inherit; cursor: pointer;
	transition: border-color .12s;
}
.iconBtn:hover { border-color: var(--MI_THEME-accent); color: var(--MI_THEME-accent); }
.bellBadge { position: absolute; top: -5px; right: -5px; background: var(--MI_THEME-accent); color: #fff; border-radius: 999px; font-size: .62em; font-weight: 800; line-height: 1.3; padding: 1px 5px; }

/* ===== トップの主要操作 ===== */
.topActions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; margin: -2px 0 18px; }
.topAction {
	display: inline-flex; align-items: center; justify-content: center; gap: 8px;
	min-height: 46px; padding: 9px 16px; border-radius: 12px;
	font-size: .92em; font-weight: 800; cursor: pointer;
	transition: border-color .12s, background-color .12s, opacity .12s;
}
.topActionEmoji { border: 2px solid var(--MI_THEME-accent); background: var(--MI_THEME-panel); color: var(--MI_THEME-accent); }
.topActionEmoji:hover { background: var(--MI_THEME-accentedBg); }
/* ===== タブバー ===== */
.tabs {
	display: flex; align-items: center; gap: 2px;
	border-bottom: 1px solid var(--MI_THEME-divider);
	margin-bottom: 18px;
	overflow-x: auto;
	scrollbar-width: none;
}
.tabs::-webkit-scrollbar { display: none; }
.tab {
	display: inline-flex; align-items: center; gap: 7px;
	background: none; border: none; color: var(--MI_THEME-fg); opacity: .65;
	padding: 11px 12px; font-size: .9em; font-weight: 600; cursor: pointer; white-space: nowrap;
	border-bottom: 2px solid transparent; margin-bottom: -1px;
	transition: opacity .12s, color .12s;
}
.tab:hover { opacity: 1; }
.tab i { font-size: 1.05em; }
.tabOn { opacity: 1; font-weight: 700; color: var(--MI_THEME-accent); border-bottom-color: var(--MI_THEME-accent); }
.tabOn i { color: var(--MI_THEME-accent); }
.tabCount { background: var(--MI_THEME-buttonBg, rgba(0,0,0,.07)); border-radius: 999px; padding: 1px 7px; font-size: .78em; font-weight: 700; }

/* ===== 本体グリッド ===== */
.gridCt { }
.grid { display: grid; grid-template-columns: 1fr 296px; gap: 20px; align-items: start; min-width: 0; }
.grid > * { min-width: 0; }

/* ===== 左カラム ===== */
.listCol { min-width: 0; }
.filterRow { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.filterToggle {
	display: inline-flex; align-items: center; gap: 6px;
	background: none; border: none; color: var(--MI_THEME-fg); opacity: .6;
	font-size: .9em; font-weight: 700; cursor: pointer; padding: 4px 2px;
	transition: opacity .12s;
}
.filterToggle:hover { opacity: .9; }
.filterToggleOn { opacity: 1; color: var(--MI_THEME-accent); }
.filterToggleOn i { color: var(--MI_THEME-accent); }
.filterDropdowns { margin-left: auto; display: flex; gap: 2px; flex-wrap: wrap; }
.dropBtn {
	display: inline-flex; align-items: center; gap: 4px;
	background: none; border: none; color: var(--MI_THEME-fg); opacity: .7;
	font-size: .84em; padding: 5px 10px; cursor: pointer; border-radius: 6px;
	transition: background .12s, opacity .12s;
}
.dropBtn:hover { opacity: 1; background: var(--MI_THEME-buttonHoverBg, rgba(0,0,0,.04)); }
.dropBtn i { font-size: .85em; }
.dropBtnOn { opacity: 1; color: var(--MI_THEME-accent); font-weight: 700; }

/* リストカード */
.listCard {
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 10px;
	overflow: hidden;
}
.issueRow {
	display: flex; gap: 11px; align-items: flex-start;
	width: 100%; text-align: left; color: inherit; background: none; border: none;
	padding: 11px 16px; cursor: pointer;
	border-top: 1px solid var(--MI_THEME-divider);
	transition: background .12s;
}
.issueRow:first-child { border-top: none; }
.issueRow:hover { background: var(--MI_THEME-bg); }
.issueRowPinned { background: color-mix(in srgb, var(--MI_THEME-accent) 6%, transparent); }
.issueRowPinned:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 10%, transparent); }
.issueRowClosed { opacity: .72; }
.rowPin { color: var(--MI_THEME-accent); font-size: 16px; margin-top: 2px; flex-shrink: 0; }
.rowStatusIcon { font-size: 16px; margin-top: 2px; flex-shrink: 0; }
.rowMain { flex: 1; min-width: 0; }
.rowTitleLine { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rowTitle { font-size: 1em; font-weight: 700; color: var(--MI_THEME-fg); overflow-wrap: anywhere; }
.rowMeta { font-size: .8em; opacity: .7; margin-top: 3px; }
.rowNo { font-family: ui-monospace, Menlo, monospace; }
.rowAuthor { font-weight: 700; }
.rowStatusText { font-size: 1em; }
.rowAssigneeIcon { color: var(--MI_THEME-accent); }
.rowSide { display: flex; align-items: center; gap: 12px; font-size: .82em; opacity: .8; padding-top: 3px; flex-shrink: 0; }
.rowStat { display: inline-flex; align-items: center; gap: 4px; }

/* ページャ */
.pager { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 16px; font-size: .88em; flex-wrap: wrap; }
.pagerArrow {
	display: inline-flex; align-items: center; gap: 4px;
	background: none; border: none; color: var(--MI_THEME-accent); cursor: pointer; padding: 6px 10px;
}
.pagerArrow:disabled { color: var(--MI_THEME-fg); opacity: .3; cursor: default; }
.pagerPage { min-width: 2em; text-align: center; font-weight: 700; background: var(--MI_THEME-accent); color: #fff; border-radius: 6px; padding: 4px 11px; }
.pagerSize { margin-left: 10px; }
.pagerSelect { background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 6px; padding: 5px 8px; font-size: .9em; color: inherit; cursor: pointer; }

.emptyBlock { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 42px 0; text-align: center; opacity: .85; }
.emptyBlockIcon { font-size: 2.4rem; opacity: .35; }
.emptyCta { display: inline-flex; align-items: center; gap: 6px; background: var(--MI_THEME-accent); border: none; color: #fff; border-radius: 8px; padding: 8px 18px; font-weight: 700; font-size: .88em; cursor: pointer; }

/* ===== 右サイドバー ===== */
.sideCol { display: flex; flex-direction: column; gap: 16px; }
.sideCard { background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 10px; padding: 14px 16px; }
.sideHead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sideHeadActions { display: inline-flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 6px; }
.sideTitle { display: inline-flex; align-items: center; gap: 6px; font-size: .88em; font-weight: 800; color: var(--MI_THEME-fg); }
.sideTitle i { color: var(--MI_THEME-accent); }
.sideCount { background: var(--MI_THEME-buttonBg, rgba(0,0,0,.07)); border-radius: 999px; padding: 0 7px; font-size: .82em; }
.sideAdd { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; background: none; border: 1px solid var(--MI_THEME-divider); color: inherit; cursor: pointer; }
.sideAdd:hover { border-color: var(--MI_THEME-accent); color: var(--MI_THEME-accent); }
.sideAddText { display: inline-flex; align-items: center; gap: 4px; background: none; border: 1px solid var(--MI_THEME-divider); border-radius: 6px; color: inherit; font-size: .78em; font-weight: 700; padding: 3px 9px; cursor: pointer; }
.sideAddText:hover { border-color: var(--MI_THEME-accent); color: var(--MI_THEME-accent); }
.sideReviewQueue { display: inline-flex; align-items: center; gap: 4px; border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 45%, var(--MI_THEME-divider)); border-radius: 999px; background: color-mix(in srgb, var(--MI_THEME-accent) 10%, transparent); color: var(--MI_THEME-accent); font-size: .76em; font-weight: 800; padding: 4px 9px; cursor: pointer; }
.sideReviewQueue:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 18%, transparent); }

/* 予定リスト */
.roadList { display: flex; flex-direction: column; gap: 9px; }
.roadItem { display: flex; align-items: center; gap: 8px; background: none; border: none; color: inherit; cursor: pointer; text-align: left; padding: 0; }
.roadDot { width: 8px; height: 8px; border-radius: 999px; flex-shrink: 0; }
.roadTitle { flex: 1; min-width: 0; font-size: .84em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 絵文字 */
.emojiList { display: flex; flex-direction: column; gap: 8px; }
.emojiRow { display: flex; align-items: center; gap: 9px; background: none; border: none; color: inherit; cursor: pointer; text-align: left; padding: 0; }
.emojiTile { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 6px; flex-shrink: 0; overflow: hidden; }
.emojiImg { max-width: 100%; max-height: 100%; object-fit: contain; }
.emojiCode { flex: 1; min-width: 0; font-family: ui-monospace, Menlo, monospace; font-size: .78em; opacity: .85; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.quotaWrap { margin-top: 12px; }

/* ===== 絵文字申請管理(2g) ===== */
.emojiAdmin { min-width: 0; }
.eaTop { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.eaFilters { display: flex; gap: 8px; flex-wrap: wrap; }
.eaTopActions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.eaFilter {
	background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); color: inherit;
	border-radius: 999px; padding: 6px 15px; font-size: .84em; font-weight: 700; cursor: pointer;
	transition: all .12s;
}
.eaFilter:hover { border-color: var(--MI_THEME-accent); }
.eaFilterOn { background: var(--MI_THEME-accent); color: #fff; border-color: var(--MI_THEME-accent); }
.eaRequestOwn, .eaBatch { display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; padding: 7px 12px; font-size: .82em; font-weight: 800; cursor: pointer; }
.eaRequestOwn { background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); color: inherit; }
.eaRequestOwn:hover { border-color: var(--MI_THEME-accent); color: var(--MI_THEME-accent); }
.eaBatch { background: var(--MI_THEME-accent); border: 1px solid var(--MI_THEME-accent); color: #fff; }
.eaBatch:hover { opacity: .9; }
.eaList { display: flex; flex-direction: column; gap: 8px; }
.eaRow {
	display: flex; align-items: center; gap: 12px;
	background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider);
	border-radius: 12px; padding: 10px 14px;
}
.eaTile {
	width: 40px; height: 40px; flex-shrink: 0;
	display: inline-flex; align-items: center; justify-content: center;
	background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 8px; overflow: hidden;
}
.eaImg { max-width: 100%; max-height: 100%; object-fit: contain; }
.eaInfo { flex: 1; min-width: 0; }
.eaName { font-family: ui-monospace, Menlo, monospace; font-weight: 700; font-size: .92em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eaMeta { display: flex; align-items: center; gap: 5px; font-size: .76em; opacity: .7; margin-top: 3px; flex-wrap: wrap; }
.eaAction { flex-shrink: 0; }
.eaReview {
	display: inline-flex; align-items: center; gap: 5px;
	background: var(--MI_THEME-accent); border: none; color: #fff;
	border-radius: 999px; padding: 6px 14px; font-size: .82em; font-weight: 700; cursor: pointer;
	transition: opacity .12s;
}
.eaReview:hover { opacity: .9; }

/* みんなの動き */
.liveDot { width: 8px; height: 8px; border-radius: 999px; background: #e0506a; animation: hfPulse 1.8s infinite; }
@keyframes hfPulse { 0% { box-shadow: 0 0 0 0 rgba(224,80,106,.5); } 70% { box-shadow: 0 0 0 7px rgba(224,80,106,0); } 100% { box-shadow: 0 0 0 0 rgba(224,80,106,0); } }
.actList { display: flex; flex-direction: column; gap: 9px; }
.actRow { display: flex; gap: 8px; align-items: flex-start; font-size: .82em; }
.actAvatarLock { width: 20px; height: 20px; border-radius: 999px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); font-size: .85em; opacity: .8; }
.actBody { flex: 1; min-width: 0; line-height: 1.5; }
.actName { font-weight: 700; }
.actVerb { opacity: .75; }
.actObj { display: block; opacity: .6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.actTime { font-size: .82em; opacity: .5; flex-shrink: 0; }

/* ===== 3a(モバイル)専用パーツ: 既定は非表示、<600px で表示 ===== */
.mobileExtras { display: none; }
.ticker { display: flex; align-items: center; gap: 8px; padding: 7px 12px; background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 10px; font-size: .82em; overflow: hidden; margin-bottom: 10px; }
.tickerDot { width: 7px; height: 7px; border-radius: 999px; background: #e0506a; animation: hfPulse 1.8s infinite; flex-shrink: 0; }
.tickerText { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .85; }
.tickerTime { margin-left: auto; font-size: .85em; opacity: .5; flex-shrink: 0; }
.statChips { display: flex; gap: 8px; margin-bottom: 12px; }
.statChip { flex: 1; background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 10px; padding: 8px 6px; text-align: center; cursor: pointer; color: inherit; }
.statNum { font-size: 1.15em; font-weight: 800; }
.statLabel { font-size: .68em; font-weight: 700; opacity: .6; margin-top: 2px; }
.statOpen { color: #2b6fc0; }
.statDoing { color: #b6791f; }
.statResolved { color: #1f8a5b; }
.statEmoji { color: #c9971f; }
.mobileEmojiCard { margin-bottom: 12px; padding: 14px; border: 1px solid var(--MI_THEME-divider); border-radius: 12px; background: var(--MI_THEME-panel); }
.mobileEmojiHead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.mobileEmojiTitle { display: flex; align-items: center; gap: 6px; font-size: .9em; font-weight: 800; }
.mobileEmojiTitle i { color: var(--MI_THEME-accent); }
.mobileEmojiTitle span { padding: 1px 7px; border-radius: 999px; background: var(--MI_THEME-buttonBg, rgba(0,0,0,.07)); font-size: .8em; }
.mobileEmojiLead { margin-top: 3px; font-size: .72em; line-height: 1.5; opacity: .62; }
.mobileEmojiPrimary { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; border: none; border-radius: 8px; padding: 7px 11px; background: var(--MI_THEME-accent); color: #fff; font-size: .76em; font-weight: 800; cursor: pointer; }
.mobileEmojiList { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--MI_THEME-divider); }
.mobileEmojiRow { display: flex; align-items: center; gap: 9px; width: 100%; padding: 0; border: none; background: none; color: inherit; text-align: left; cursor: pointer; }
.roadScroll { margin-bottom: 12px; }
.roadScrollHead { display: flex; align-items: center; gap: 5px; font-size: .74em; font-weight: 800; opacity: .6; margin-bottom: 7px; }
.roadScrollHead i { color: var(--MI_THEME-accent); }
.roadScrollList { display: flex; gap: 8px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
.roadScrollList::-webkit-scrollbar { display: none; }
/* 旗鯖fork(3a): モバイルでは全体幅のカルーセル(1枚=画面幅)。複数あればスワイプで送る。 */
.roadScrollCard { flex: 0 0 100%; box-sizing: border-box; scroll-snap-align: start; background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 10px; padding: 11px 14px; text-align: left; color: inherit; cursor: pointer; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.roadScrollTitle { font-size: .8em; font-weight: 700; line-height: 1.4; }

/* FAB(モバイルのみ) */
.fab { display: none; position: fixed; right: 20px; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); width: 52px; height: 52px; border-radius: 999px; background: var(--MI_THEME-accent); border: none; color: #fff; font-size: 1.4rem; box-shadow: 0 6px 16px rgba(52,161,201,.45); cursor: pointer; z-index: 10; }

/* ===== レスポンシブ ===== */
/* 1024px 未満: 右サイドバーを下に畳む */
@container hatafeed (max-width: 1023px) {
	.grid { grid-template-columns: 1fr; }
	.sideCol { flex-direction: row; flex-wrap: wrap; }
	.sideCard { flex: 1; min-width: 220px; }
}
/* 600px 未満(3a レイアウト): 幅ベースの折り返し。ツールバーは検索を独立行に落とし、
	 集計チップ等のモバイルパーツを出す。主要な作成操作は本文上部の2ボタンを維持する。 */
@container hatafeed (max-width: 599px) {
	.toolDivider { display: none; }
	.iconBtnHideMobile { display: none; }
	.serverName { max-width: 100px; }
	.search { order: 10; flex-basis: 100%; max-width: none; margin-left: 0; }
	.topActions { gap: 8px; }
	.topAction { min-height: 44px; padding: 8px 10px; font-size: .84em; }
	.mobileExtras { display: block; }
	.sideCol { display: none; }
	.listCard { margin-bottom: 8px; }
}

/* 旗鯖fork(2a/3a): ロードマップ管理の追加操作だけ、スマホでは右下FABへ移す。
	 イシュー作成はトップ本文のボタンへ一本化し、右上・FABには重複させない。 */
.repo[data-smartphone="on"] .newBtn { display: none; }
.repo[data-smartphone="on"] .fab { display: inline-flex; align-items: center; justify-content: center; }
</style>

<style lang="scss" scoped>
/* 動的な値(ステータス)で色が変わる小要素は data 属性で当てる(module の動的キーはビルドで解決されないため)。 */
.roadDot[data-status="open"] { background: #2b6fc0; }
.roadDot[data-status="planned"] { background: #d6a82b; }
.roadDot[data-status="inProgress"] { background: #e08a1f; }
.roadDot[data-status="resolved"] { background: #1f8a5b; }
.roadDot[data-status="wontfix"] { background: #999; }
.roadDot[data-status="unknown"] { background: #bbb; }
.roadDot[data-status="closed"] { background: #8a7aa6; }

/* 絵文字申請の状態アイコン(承認=緑✓ / 審査中=黄時計 / 却下=赤🚫) */
.hfEstIcon { font-size: 1.05rem; flex-shrink: 0; opacity: .9; }
.hfEstIcon[data-est="approved"] { color: #1f8a5b; }
.hfEstIcon[data-est="pending"] { color: #c9971f; }
.hfEstIcon[data-est="rejected"] { color: #c0392b; }

/* みんなの動きの入場/並べ替えアニメーション(TransitionGroup name=hfAct はグローバルクラス) */
.hfAct-enter-active { transition: opacity .35s ease, transform .35s ease; }
.hfAct-enter-from { opacity: 0; transform: translateY(-8px); }
.hfAct-leave-active { transition: opacity .25s ease; position: absolute; }
.hfAct-leave-to { opacity: 0; }
.hfAct-move { transition: transform .35s ease; }

@media (prefers-reduced-motion: reduce) {
	.hfAct-enter-active, .hfAct-leave-active, .hfAct-move { transition: none; }
}
</style>
