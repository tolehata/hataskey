<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: Hatady(学習・読書記録ツール)メインページ。
  hataskey 内蔵だが独立したデザイン言語(暖色クラフト紙 / Zen Maru Gothic 見出し)。
  読んでいる本・学んだトピック・得意/苦手/興味を時系列で記録し、マイログの縦タイムラインで
  振り返り、サーバー全体に公開してみんなの学習を覗ける多機能ツール。
  - テーマ(紙ライト/エスプレッソダーク)と言語(日本語/英語)は独立して選べる(表示設定)。
  - フォロー関係は hataskey 本体と非連動、Hatady 内で完結。
  - リアクション/絵文字/アイコンデコは hataskey 共通基盤を利用。
  本ファイルは Phase1(基盤): ページシェル(ヘッダ+タブ+テーマ+i18n土台)。各タブ本体は順次実装。
-->
<template>
<MkStickyContainer>
	<div :class="[$style.root, 'hatady-scope']" :data-hatady-theme="theme" :data-hatady-lang="effectiveLang">
		<!-- Hatady 独自ヘッダー -->
		<header :class="$style.header">
			<button :class="$style.backBtn" :title="t('back')" @click="goBack"><i class="ti ti-arrow-left"></i></button>
			<button :class="$style.brand" :title="t('mylog')" @click="setTab('mylog')">
				<span :class="$style.logoMark"><i class="ti ti-book-2"></i></span>
				<span :class="$style.logo">Hatady</span>
			</button>
			<span :class="$style.headDivider"></span>
			<nav :class="$style.tabs">
				<button :class="[$style.tab, activeTab === 'mylog' && $style.tabOn]" @click="setTab('mylog')">{{ t('mylog') }}</button>
				<button :class="[$style.tab, activeTab === 'discover' && $style.tabOn]" @click="setTab('discover')">{{ t('discover') }}</button>
				<button :class="[$style.tab, activeTab === 'shelf' && $style.tabOn]" @click="setTab('shelf')">{{ t('shelf') }}</button>
			</nav>
			<div :class="$style.headRight">
				<div :class="$style.search">
					<i class="ti ti-search"></i>
					<input v-model="searchQuery" :class="$style.searchInput" :placeholder="t('searchPlaceholder')">
					<button v-if="searchQuery" :class="$style.searchClear" @click="searchQuery = ''"><i class="ti ti-x"></i></button>
				</div>
				<button :class="$style.iconBtn" :title="t('settings')" @click="openSettings"><i class="ti ti-settings"></i></button>
				<button :class="$style.recordBtn" @click="openComposer"><i class="ti ti-pencil-plus"></i> <span :class="$style.recordText">{{ t('record') }}</span></button>
				<button :class="$style.iconBtn" :title="t('notifications')" @click="openNotifications">
					<i class="ti ti-bell"></i>
					<span v-if="unread > 0" :class="$style.bellBadge">{{ unread > 99 ? '99+' : unread }}</span>
				</button>
				<button :class="$style.avatarBtn" @click="openProfile()"><MkAvatar v-if="$i" :class="$style.avatar" :user="$i"/></button>
			</div>
		</header>

		<!-- 本体(タブ別) -->
		<div :class="$style.body">
			<!-- ===== マイログ(1a + t2 ヒートマップ) ===== -->
			<div v-if="activeTab === 'mylog'" :class="$style.mylog">
				<!-- 今日の記録状況バナー(未記録 / 連続途切れ / 記録済み) -->
				<div v-if="todayState === 'broken' && showInfoBanner" :class="[$style.todayBanner, $style.bannerBroken]">
					<span :class="$style.bannerIcon"><i class="ti ti-flame-off"></i></span>
					<div :class="$style.bannerText">
						<b>{{ t('streakBrokenTitle') }}</b>
						<div>{{ t('streakBrokenSub') }}</div>
					</div>
					<button :class="$style.bannerCta" @click="openComposer"><i class="ti ti-pencil-plus"></i> {{ t('record') }}</button>
					<button :class="$style.bannerClose" :title="t('dismiss')" @click="dismissInfoBanner"><i class="ti ti-x"></i></button>
				</div>
				<div v-else-if="todayState === 'notYet'" :class="[$style.todayBanner, $style.bannerNotYet]">
					<span :class="$style.bannerIcon"><i class="ti ti-calendar-exclamation"></i></span>
					<div :class="$style.bannerText">
						<b>{{ t('notYetTitle') }}</b>
						<div>{{ (stats?.streakDays ?? 0) > 0 ? t('notYetKeepStreak').replace('{n}', String(stats?.streakDays ?? 0)) : t('notYetSub') }}</div>
					</div>
					<button :class="$style.bannerCta" @click="openComposer"><i class="ti ti-pencil-plus"></i> {{ t('record') }}</button>
				</div>
				<div v-else-if="todayState === 'done' && showInfoBanner" :class="[$style.todayBanner, $style.bannerDone]">
					<span :class="$style.bannerIcon"><i class="ti ti-circle-check"></i></span>
					<div :class="$style.bannerText"><b>{{ t('doneTitle') }}</b></div>
					<button :class="$style.bannerClose" :title="t('dismiss')" @click="dismissInfoBanner"><i class="ti ti-x"></i></button>
				</div>

				<!-- hero: 統計 + 学習ヒートマップ -->
				<section :class="$style.hero">
					<div :class="$style.heroStats">
						<button :class="[$style.heroStat, $style.heroStatBtn]" :title="t('viewMilestones')" @click="openMilestones"><div :class="[$style.heroNum, $style.heroFlame]">🔥 {{ stats?.streakDays ?? 0 }}</div><div :class="$style.heroLbl">{{ t('streak') }}</div></button>
						<div :class="$style.heroStat"><div :class="$style.heroNum">{{ fmtDuration(stats?.weeklyMinutes ?? 0) }}</div><div :class="$style.heroLbl">{{ t('thisWeek') }}</div></div>
						<div :class="$style.heroStat"><div :class="$style.heroNum">{{ stats?.totalLogs ?? 0 }}</div><div :class="$style.heroLbl">{{ t('logs') }}</div></div>
						<div :class="$style.heroStat"><div :class="$style.heroNum">{{ stats?.totalBooks ?? 0 }}</div><div :class="$style.heroLbl">{{ t('books') }}</div></div>
					</div>
					<div :class="$style.heatmap">
						<div :class="$style.heatHead">{{ t('heatTitle') }}</div>
						<div :class="$style.heatGrid">
							<div v-for="(col, ci) in heatColumns" :key="ci" :class="$style.heatCol">
								<span
									v-for="(cell, ri) in col" :key="ri"
									:class="[$style.heatCell, $style.heatCellClickable]"
									:style="{ background: heatColor(cell.minutes) }"
									:title="t('jumpTo')"
									@mouseenter="showHeatPop(cell, $event)"
									@mouseleave="hideHeatPop"
									@touchstart.passive="showHeatPop(cell, $event)"
									@touchend.passive="hideHeatPop"
									@click="jumpToHeatCell(cell.date)"
								></span>
							</div>
						</div>
						<!-- 日別の学習状況ポップアップ(ホバー/長押し) -->
						<div v-if="heatPop" :class="$style.heatPop" :style="{ left: heatPop.left + 'px', top: heatPop.top + 'px' }">
							<div :class="$style.heatPopDate">{{ heatPop.dateLabel }}</div>
							<div v-if="heatPop.minutes > 0" :class="$style.heatPopStat"><i class="ti ti-hourglass"></i> {{ fmtDuration(heatPop.minutes) }} · {{ heatPop.count }}{{ effectiveLang === 'en' ? ' sessions' : 'セッション' }}</div>
							<div v-else :class="$style.heatPopEmpty">{{ effectiveLang === 'en' ? 'No study' : '記録なし' }}</div>
							<div v-if="heatPop.subjects.length" :class="$style.heatPopSubjects">
								<span v-for="s in heatPop.subjects" :key="s.subject" :class="$style.heatPopSubject">
									<span :class="$style.heatPopDot" :style="{ background: pal(s.subject).accent }"></span>
									{{ s.subject }} <span :class="$style.heatPopMin">{{ fmtDuration(s.minutes) }}</span>
								</span>
							</div>
							<div v-else-if="heatPop.minutes > 0" :class="$style.heatPopHint">{{ effectiveLang === 'en' ? 'Details in timeline' : '詳細はタイムライン' }}</div>
						</div>
					</div>
				</section>

				<!-- grid: タイムライン + サイドバー -->
				<div :class="$style.grid">
					<!-- 左: タイムライン -->
					<div ref="timelineColRef" :class="$style.timelineCol">
						<div :class="$style.tlHeadRow">
							<h2 :class="$style.tlTitle">{{ t('timeline') }}</h2>
							<button :class="[$style.periodToggle, (periodOpen || filterActive) && $style.periodToggleOn]" @click="periodOpen = !periodOpen">
								<i class="ti ti-calendar-search"></i> {{ t('period') }}
								<span v-if="filterActive" :class="$style.periodDot"></span>
							</button>
						</div>
						<!-- 期間フィルタ / 日付ジャンプ (旗鯖fork: 2ブロックに整理して洗練) -->
						<div v-if="periodOpen || filterActive" :class="$style.periodPanel">
							<!-- 期間で絞り込む -->
							<div :class="$style.periodGroup">
								<div :class="$style.periodGroupLabel"><i class="ti ti-arrows-horizontal"></i> {{ t('periodRange') }}</div>
								<div :class="$style.periodRangeField">
									<input v-model="sinceInput" type="date" :class="$style.periodDate" :aria-label="t('periodRange')">
									<span :class="$style.periodTilde">〜</span>
									<input v-model="untilInput" type="date" :class="$style.periodDate" :aria-label="t('periodRange')">
									<button :class="$style.periodApply" @click="applyPeriod">{{ t('apply') }}</button>
								</div>
								<div :class="$style.periodPresets">
									<button :class="$style.periodChip" @click="presetThisMonth">{{ t('thisMonth') }}</button>
									<button :class="$style.periodChip" @click="presetLastMonth">{{ t('lastMonth') }}</button>
									<button :class="$style.periodChip" @click="presetLast30">{{ t('last30') }}</button>
									<button v-if="filterActive" :class="[$style.periodChip, $style.periodClear]" @click="clearPeriod"><i class="ti ti-x"></i> {{ t('clearPeriod') }}</button>
								</div>
							</div>
							<div :class="$style.periodDivider"></div>
							<!-- 日付へジャンプ -->
							<div :class="$style.periodGroup">
								<div :class="$style.periodGroupLabel"><i class="ti ti-calendar-event"></i> {{ t('jumpTo') }}</div>
								<div :class="$style.periodJumpField">
									<input v-model="jumpInput" type="date" :class="$style.periodDate" :aria-label="t('jumpTo')">
									<button :class="$style.periodApply" :disabled="!jumpInput" @click="jumpToDate">{{ t('jump') }}</button>
								</div>
							</div>
						</div>
						<div v-if="filterActive && !logsLoading" :class="$style.filterNotice">
							<i class="ti ti-filter"></i> {{ t('filteredNotice').replace('{n}', String(logGroups.length)) }}
							<button :class="$style.filterNoticeClear" @click="clearPeriod">{{ t('showAll') }}</button>
						</div>
						<div v-if="logsLoading" :class="$style.loading">{{ t('loading') }}</div>
						<div v-else-if="logGroups.length === 0 && filterActive" :class="$style.emptyTl">
							<i class="ti ti-calendar-off" :class="$style.emptyIcon"></i>
							<div>{{ t('emptyFiltered') }}</div>
							<button :class="$style.emptyCta" @click="clearPeriod"><i class="ti ti-x"></i> {{ t('showAll') }}</button>
						</div>
						<div v-else-if="logGroups.length === 0" :class="$style.emptyTl">
							<i class="ti ti-notebook" :class="$style.emptyIcon"></i>
							<div>{{ t('emptyLog') }}</div>
							<button :class="$style.emptyCta" @click="openComposer"><i class="ti ti-pencil-plus"></i> {{ t('record') }}</button>
						</div>
						<template v-else>
							<div v-for="g in logGroups" :key="g.key" :data-date-key="g.key" :class="$style.dateGroup">
								<div :class="$style.dateHead">
									<span :class="$style.datePill"><i class="ti ti-calendar-event"></i> {{ g.label }}</span>
									<span :class="$style.dateSub">{{ g.sub }}</span>
									<span :class="$style.dateLine"></span>
								</div>
								<div :class="$style.rail">
									<span :class="$style.railLine"></span>
									<div v-for="log in g.logs" :key="log.id" :class="$style.entry">
										<span :class="$style.entryDot" :style="{ background: pal(log.subject).bg, borderColor: pal(log.subject).accent }"></span>
										<div :class="$style.card" :style="{ borderLeftColor: pal(log.subject).accent }">
											<div :class="$style.cardTop">
												<HySubjectBadge :subject="log.subject"/>
												<span v-if="log.visibility === 'followers'" :class="$style.privateChip"><i class="ti ti-users"></i></span>
												<span v-else-if="!log.isPublic" :class="$style.privateChip"><i class="ti ti-lock"></i></span>
												<span :class="$style.cardTime"><i class="ti ti-clock"></i> {{ fmtTime(log.studiedAt) }} · {{ fmtDuration(log.durationMinutes) }}</span>
												<button :class="$style.menuBtn" @click="openLogMenu(log, $event)"><i class="ti ti-dots"></i></button>
											</div>
											<div :class="$style.cardTitle">{{ log.title }}</div>
											<div v-if="log.book" :class="$style.bookChip">
												<HyBookCover :title="log.book.title" :author="log.book.author" :width="34"/>
												<div :class="$style.bookInfo">
													<div :class="$style.bookTitle">{{ log.book.title }}</div>
													<div :class="$style.bookAuthor">{{ log.book.author }}</div>
													<div v-if="log.book.progress != null" :class="$style.progressWrap">
														<span :class="$style.progressBar"><span :class="$style.progressFill" :style="{ width: log.book.progress + '%', background: pal(log.subject).accent }"></span></span>
														<span :class="$style.progressText" :style="{ color: pal(log.subject).accent }">{{ log.pageTo ? `p.${log.pageTo}` : '' }} {{ log.book.progress }}%</span>
													</div>
												</div>
											</div>
											<div v-if="log.body" :class="$style.cardBody">{{ log.body }}</div>
											<div :class="$style.cardFoot">
												<span v-if="hyTag(log.tag)" :class="$style.tagChip" :style="{ background: hyTag(log.tag).bg, color: hyTag(log.tag).fg }"><i :class="['ti', hyTag(log.tag).icon]"></i> {{ lang === 'en' ? hyTag(log.tag).en : hyTag(log.tag).ja }}</span>
												<span :class="$style.footRight">
													<HatadyReactions :target="{ logId: log.id }" :reactions="log.reactions ?? {}" :myReaction="log.myReaction ?? null"/>
													<button :class="$style.commentBtn" @click="openConversation(log)"><i class="ti ti-message-circle-2"></i> {{ log.commentsCount }}</button>
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</template>
					</div>

					<!-- 右: サイドバー -->
					<aside :class="$style.side">
						<div :class="$style.sideCard">
							<button :class="$style.profileMini" @click="openProfile()">
								<MkAvatar v-if="$i" :class="$style.profileAvatar" :user="$i"/>
								<div><MkUserName v-if="$i" :class="$style.profileName" :user="$i"/><div :class="$style.profileAcct">@{{ $i?.username }}</div></div>
							</button>
							<button :class="$style.streakBox" :title="t('viewMilestones')" @click="openMilestones">
								<i class="ti ti-flame-filled" :class="$style.streakIcon"></i>
								<div><div :class="$style.streakNum">{{ stats?.streakDays ?? 0 }}<span :class="$style.streakUnit"> {{ t('daysStreak') }}</span></div><div :class="$style.streakSub">{{ t('keepGoing') }}</div></div>
								<i class="ti ti-chevron-right" :class="$style.streakArrow"></i>
							</button>
						</div>

						<div v-if="stats?.focusBySubject?.length" :class="$style.sideCard">
							<div :class="$style.sideTitle"><i class="ti ti-chart-bar"></i> {{ t('focusTitle') }}</div>
							<div v-for="f in stats.focusBySubject" :key="f.subject" :class="$style.focusRow">
								<div :class="$style.focusHead"><span>{{ f.subject }}</span><span :class="$style.focusMin">{{ fmtDuration(f.minutes) }}</span></div>
								<span :class="$style.focusBar"><span :class="$style.focusFill" :style="{ width: focusPct(f.minutes) + '%', background: pal(f.subject).accent }"></span></span>
							</div>
						</div>

						<div :class="$style.sideCard">
							<div :class="$style.sideTitle"><i class="ti ti-books"></i> {{ t('reading') }}</div>
							<div v-if="readingBooks.length === 0" :class="$style.sideEmpty">{{ t('noBooks') }}</div>
							<div v-for="b in readingBooks" :key="b.id" :class="$style.readingRow">
								<HyBookCover :title="b.title" :author="b.author" :width="30"/>
								<div :class="$style.readingInfo">
									<div :class="$style.readingTitle">{{ b.title }}</div>
									<span :class="$style.progressBar"><span :class="$style.progressFill" :style="{ width: (b.progress ?? 0) + '%' }"></span></span>
								</div>
							</div>
						</div>
					</aside>
				</div>
			</div>

			<!-- ===== みんなの学習(公開フィード) ===== -->
			<div v-else-if="activeTab === 'discover'" :class="$style.discover">
				<h2 :class="$style.tlTitle">{{ t('discoverTitle') }}</h2>
				<div :class="$style.discoverTabs">
					<button v-for="dt in discoverTypes" :key="dt.key" :class="[$style.discoverTab, discoverType === dt.key && $style.discoverTabOn]" @click="setDiscoverType(dt.key)">
						<i :class="['ti', dt.icon]"></i> {{ t(dt.label) }}
					</button>
				</div>
				<div v-if="discoverLoading" :class="$style.loading">{{ t('loading') }}</div>
				<div v-else-if="discoverFiltered.length === 0" :class="$style.emptyTl">
					<i class="ti ti-world" :class="$style.emptyIcon"></i>
					<div>{{ searchQuery ? t('noResults') : (discoverType === 'following' ? t('emptyFollowing') : t('emptyDiscover')) }}</div>
				</div>
				<div v-else :class="$style.feed">
					<article v-for="log in discoverFiltered" :key="log.id" :class="$style.feedCard" :style="{ borderLeftColor: pal(log.subject).accent }">
						<div :class="$style.feedHead">
							<button :class="$style.feedAuthor" @click="openProfile(log.user?.id)">
								<MkAvatar :class="$style.feedAvatar" :user="log.user"/>
								<div :class="$style.feedWho">
									<MkUserName :class="$style.feedName" :user="log.user"/>
									<div :class="$style.feedAcct">@{{ log.user?.username }}</div>
								</div>
							</button>
							<span :class="$style.cardTime"><i class="ti ti-clock"></i> {{ fmtWhen(log.studiedAt) }}</span>
							<button :class="$style.menuBtn" @click="openLogMenu(log, $event)"><i class="ti ti-dots"></i></button>
						</div>
						<div :class="$style.feedTopics">
							<HySubjectBadge :subject="log.subject"/>
							<span v-if="hyTag(log.tag)" :class="$style.tagChip" :style="{ background: hyTag(log.tag).bg, color: hyTag(log.tag).fg }"><i :class="['ti', hyTag(log.tag).icon]"></i> {{ effectiveLang === 'en' ? hyTag(log.tag).en : hyTag(log.tag).ja }}</span>
							<span :class="$style.feedDuration"><i class="ti ti-hourglass"></i> {{ fmtDuration(log.durationMinutes) }}</span>
						</div>
						<div :class="$style.feedTitle">{{ log.title }}</div>
						<div v-if="log.book" :class="$style.bookChip">
							<HyBookCover :title="log.book.title" :author="log.book.author" :width="34"/>
							<div :class="$style.bookInfo">
								<div :class="$style.bookTitle">{{ log.book.title }}</div>
								<div :class="$style.bookAuthor">{{ log.book.author }}</div>
							</div>
						</div>
						<div v-if="log.body" :class="$style.cardBody">{{ log.body }}</div>
						<div :class="$style.cardFoot">
							<HatadyReactions :target="{ logId: log.id }" :reactions="log.reactions ?? {}" :myReaction="log.myReaction ?? null"/>
							<button :class="[$style.commentBtn, $style.footRight]" @click="openConversation(log)"><i class="ti ti-message-circle-2"></i> {{ log.commentsCount }}</button>
						</div>
					</article>
				</div>
			</div>

			<!-- ===== 本棚 ===== -->
			<div v-else-if="activeTab === 'shelf'" :class="$style.shelf">
				<div :class="$style.shelfHead">
					<h2 :class="$style.tlTitle">{{ t('shelfTitle') }}</h2>
					<div :class="$style.shelfFilters">
						<button v-for="f in shelfFilters" :key="f.key" :class="[$style.shelfFilter, (!adminAll && shelfFilter === f.key) && $style.shelfFilterOn]" @click="setAdminAll(false); shelfFilter = f.key;">{{ t(f.label) }}</button>
						<button v-if="isModerator" :class="[$style.shelfFilter, $style.adminFilter, adminAll && $style.shelfFilterOn]" @click="setAdminAll(true)"><i class="ti ti-shield"></i> {{ t('allBooks') }}</button>
					</div>
					<div :class="$style.shelfSort">
						<select v-model="sortKey" :class="$style.sortSelect">
							<option value="added">{{ t('sortAdded') }}</option>
							<option value="name">{{ t('sortName') }}</option>
							<option value="finished">{{ t('sortFinished') }}</option>
						</select>
						<button :class="$style.sortDir" :title="t('sortDir')" @click="sortAsc = !sortAsc"><i :class="sortAsc ? 'ti ti-sort-ascending' : 'ti ti-sort-descending'"></i></button>
					</div>
					<button :class="$style.shelfAddBtn" @click="addBookFromShelf"><i class="ti ti-plus"></i> {{ t('addBook') }}</button>
				</div>
				<div v-if="booksLoading" :class="$style.loading">{{ t('loading') }}</div>
				<div v-else-if="shelfBooks.length === 0" :class="$style.emptyTl">
					<i class="ti ti-books" :class="$style.emptyIcon"></i>
					<div>{{ t('emptyShelf') }}</div>
					<button :class="$style.emptyCta" @click="addBookFromShelf"><i class="ti ti-plus"></i> {{ t('addBook') }}</button>
				</div>
				<div v-else :class="$style.shelfGrid">
					<button v-for="b in shelfBooks" :key="b.id" :class="$style.shelfItem" @click="openBookDetail(b.id)">
						<div :class="$style.shelfCoverWrap">
							<!-- しおり演出: しおりの数だけ本の上端から帯が飛び出す -->
							<span
								v-for="(bm, i) in (b.bookmarks || []).slice(0, 6)" :key="bm.id"
								:class="$style.ribbon"
								:style="{ background: bmColor(bm.color), left: (16 + i * 15) + 'px' }"
								:title="(bm.name || '') + ' p.' + bm.page"
							></span>
							<HyBookCover :title="b.title" :author="b.author" :colorIndex="b.coverColorIndex" :width="118" showTitle/>
							<span v-if="b.isFavorite" :class="$style.favStar"><i class="ti ti-star-filled"></i></span>
						</div>
						<div :class="$style.shelfMeta">
							<div v-if="adminAll && b.user" :class="$style.shelfOwner"><i class="ti ti-user"></i> @{{ b.user.username }}</div>
							<div :class="$style.shelfTitle">{{ b.title }}</div>
							<div v-if="b.author" :class="$style.shelfAuthor">{{ b.author }}</div>
							<div :class="$style.shelfStatusRow">
								<span :class="$style.shelfStatus" :style="statusStyle(b.status)">{{ t('status_' + b.status) }}</span>
								<span v-if="b.totalPages" :class="$style.shelfPages">{{ b.currentPage }}/{{ b.totalPages }}p</span>
							</div>
							<div v-if="b.progress != null" :class="$style.progressWrap">
								<span :class="$style.progressBar"><span :class="$style.progressFill" :style="{ width: b.progress + '%' }"></span></span>
								<span :class="$style.progressText">{{ b.progress }}%</span>
							</div>
						</div>
					</button>
				</div>
			</div>
		</div>
	</div>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { $i } from '@/i.js';
import { mainRouter } from '@/router.js';
import { definePage } from '@/page.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import HySubjectBadge from '@/components/HySubjectBadge.vue';
import HyBookCover from '@/components/HyBookCover.vue';
import HatadyReactions from '@/components/HatadyReactions.vue';
import { hySubjectPalette, hyTag, hyBookmarkColor } from '@/utility/hatady.js';
import { loadHySubjects } from '@/utility/hatady-subjects.js';
import { hatadyTheme, hatadyLang, loadHatadyDisplay, loadTutorialDone, setTutorialDone } from '@/utility/hatady-prefs.js';
import { claimAchievement } from '@/utility/achievements.js';

// 旗鯖fork(Hatady i18n 土台): 言語(ja/en)は表示設定で独立に切替。まずはシェル分の最小辞書。
//   後続フェーズで各画面の文言を足していく。テーマ(paper/espresso)も表示設定で独立に切替。
type Lang = 'ja' | 'en';

const DICT: Record<string, Record<Lang, string>> = {
	mylog: { ja: 'マイログ', en: 'My Log' },
	discover: { ja: 'みんなの学習', en: 'Discover' },
	shelf: { ja: '本棚', en: 'Shelf' },
	searchPlaceholder: { ja: '本・分野を検索', en: 'Search books & topics' },
	settings: { ja: '設定', en: 'Settings' },
	notifications: { ja: '通知', en: 'Notifications' },
	back: { ja: '戻る', en: 'Back' },
	edit: { ja: '編集', en: 'Edit' },
	delete: { ja: '削除', en: 'Delete' },
	report: { ja: '通報', en: 'Report' },
	deleteConfirm: { ja: 'この学習記録を削除しますか？', en: 'Delete this study log?' },
	record: { ja: '学習を記録', en: 'Record' },
	comingSoon: { ja: 'この画面はこれから実装します。', en: 'Coming soon.' },
	composerSoon: { ja: '学習を記録するコンポーザーは次のフェーズで実装します。', en: 'The composer is coming in the next phase.' },
	streak: { ja: '連続', en: 'streak' },
	thisWeek: { ja: '今週', en: 'this week' },
	logs: { ja: 'ログ', en: 'logs' },
	books: { ja: '本', en: 'books' },
	heatTitle: { ja: '学習の記録 · 過去20週', en: 'Study activity · last 20 weeks' },
	timeline: { ja: '学習タイムライン', en: 'Study timeline' },
	loading: { ja: '読み込み中…', en: 'Loading…' },
	emptyLog: { ja: 'まだ記録がありません。最初の学習を記録しましょう。', en: 'No logs yet. Record your first study session.' },
	emptyFiltered: { ja: 'この期間の記録はありません。', en: 'No logs in this period.' },
	period: { ja: '期間・ジャンプ', en: 'Period / Jump' },
	periodRange: { ja: '期間で絞り込む', en: 'Filter by period' },
	apply: { ja: '適用', en: 'Apply' },
	thisMonth: { ja: '今月', en: 'This month' },
	lastMonth: { ja: '先月', en: 'Last month' },
	last30: { ja: '過去30日', en: 'Last 30 days' },
	clearPeriod: { ja: '解除', en: 'Clear' },
	showAll: { ja: 'すべて表示', en: 'Show all' },
	jumpTo: { ja: '日付へジャンプ', en: 'Jump to date' },
	jump: { ja: 'ジャンプ', en: 'Jump' },
	filteredNotice: { ja: '期間で絞り込み中（{n}日分）', en: 'Filtered by period ({n} days)' },
	daysStreak: { ja: '日連続', en: 'day streak' },
	keepGoing: { ja: '学習を記録中！', en: 'Keep it going!' },
	viewMilestones: { ja: 'マイルストーンを見る', en: 'View milestones' },
	notYetTitle: { ja: 'まだ今日の記録がされていません', en: 'You haven\'t recorded today yet' },
	notYetSub: { ja: '記録してみませんか？', en: 'Want to record something?' },
	notYetKeepStreak: { ja: '記録してみませんか？ 連続記録（{n}日）を守りましょう！', en: 'Record now to keep your {n}-day streak!' },
	streakBrokenTitle: { ja: '連続記録が途切れてしまいました', en: 'Your streak has ended' },
	streakBrokenSub: { ja: '今日からまた積み重ねていきましょう。記録してみませんか？', en: 'Start a new streak today — want to record something?' },
	doneTitle: { ja: '今日も学習を記録しました！この調子で続けましょう', en: 'You\'ve recorded today! Keep it going' },
	dismiss: { ja: '今日は閉じる', en: 'Dismiss for today' },
	focusTitle: { ja: '今週の分野', en: 'Focus by subject' },
	reading: { ja: '今読んでいる本', en: 'Reading now' },
	noBooks: { ja: 'まだ本がありません。', en: 'No books yet.' },
	theme: { ja: 'テーマ', en: 'Theme' },
	themePaper: { ja: '紙（ライト）', en: 'Paper (light)' },
	themeEspresso: { ja: 'エスプレッソ（ダーク）', en: 'Espresso (dark)' },
	language: { ja: '言語', en: 'Language' },
	// みんなの学習(公開フィード)
	discoverTitle: { ja: 'みんなの学習', en: "Everyone's study" },
	emptyDiscover: { ja: 'まだ公開された学習がありません。', en: 'No public study logs yet.' },
	emptyFollowing: { ja: 'フォロー中の人の学習がまだありません。気になる人をフォローしましょう。', en: 'No logs from people you follow yet.' },
	noResults: { ja: '検索に一致する学習が見つかりません。', en: 'No results match your search.' },
	tabRecent: { ja: '新着', en: 'Recent' },
	tabPopular: { ja: '人気', en: 'Popular' },
	tabFollowing: { ja: 'フォロー中', en: 'Following' },
	// 本棚
	shelfTitle: { ja: '本棚', en: 'Bookshelf' },
	addBook: { ja: '本を追加', en: 'Add book' },
	emptyShelf: { ja: 'まだ本がありません。本を追加しましょう。', en: 'No books yet. Add your first book.' },
	filterAll: { ja: 'すべて', en: 'All' },
	allBooks: { ja: 'すべての本', en: 'All books' },
	sortAdded: { ja: '追加順', en: 'Added' },
	sortName: { ja: '名前', en: 'Name' },
	sortFinished: { ja: '読了日', en: 'Finished date' },
	sortDir: { ja: '昇順/降順', en: 'Ascending/Descending' },
	status_reading: { ja: '読書中', en: 'Reading' },
	status_finished: { ja: '読了', en: 'Finished' },
	status_want: { ja: '積読', en: 'To read' },
};

// 旗鯖fork: テーマ・言語は端末ローカル(miLocalStorage)で保持。prefer 同期経由だと
//   クラウド/タブ間同期の巻き戻しで数秒後に既定へ戻る事象があったため端末ローカルにした。
//   共有 reactive ref なので、表示設定モーダルでの変更が即このページにも反映される。
const lang = hatadyLang;
const theme = hatadyTheme;
// 言語 'auto' は端末(Misskey/ブラウザ)ロケールに追従。Hatady は ja/en のみ対応。
const effectiveLang = computed<Lang>(() => {
	if (lang.value === 'auto') {
		const loc = navigator.language ?? 'ja';
		return loc.toLowerCase().startsWith('ja') ? 'ja' : 'en';
	}
	return lang.value as Lang;
});
function t(key: string): string {
	return DICT[key]?.[effectiveLang.value] ?? key;
}

const activeTab = ref<'mylog' | 'discover' | 'shelf'>('mylog');

// ヘッダー検索: 表示中タブの一覧をキーワードで絞り込む(タイトル/分野/本/メモ/著者)。
//   NFKC 正規化 + 小文字化で、大文字小文字・全角半角(Ａ↔A / ａ↔a / ０↔0)を区別せず一致させる。
const searchQuery = ref('');
function norm(s: string): string { return s.normalize('NFKC').toLowerCase(); }
function matchLog(log: any): boolean {
	const q = norm(searchQuery.value.trim());
	if (!q) return true;
	return [log.title, log.subject, log.body, log.book?.title, log.book?.author, log.user?.name, log.user?.username]
		.some(v => typeof v === 'string' && norm(v).includes(q));
}
function matchBook(b: any): boolean {
	const q = norm(searchQuery.value.trim());
	if (!q) return true;
	return [b.title, b.author].some(v => typeof v === 'string' && norm(v).includes(q));
}

const unread = ref(0);
async function loadUnread() {
	const r = await misskeyApi('hata/hatady/notifications/unread-count', {}).catch(() => null) as any;
	unread.value = r?.count ?? 0;
}

// タブ切替時に、そのタブのデータを(未取得なら)遅延ロードする。
function setTab(tab: 'mylog' | 'discover' | 'shelf') {
	activeTab.value = tab;
	if (tab === 'discover' && discover.value.length === 0) loadDiscover();
}

// ===== マイログ(1a): 学習ログ・統計・本 =====
const logs = ref<any[]>([]);
const stats = ref<any>(null);
const books = ref<any[]>([]);
const logsLoading = ref(true);

// 旗鯖fork: マイログの期間指定ジャンプ。studiedAt の範囲(エポックms)で絞り込む。
//   filterSince/filterUntil が両方 null なら通常の直近表示。期間指定時は多めに読み込む。
const filterSince = ref<number | null>(null);
const filterUntil = ref<number | null>(null);
const filterActive = computed(() => filterSince.value != null || filterUntil.value != null);

async function loadLogs() {
	logsLoading.value = true;
	try {
		const params: Record<string, unknown> = { limit: filterActive.value ? 100 : 50 };
		if (filterSince.value != null) params.sinceDate = filterSince.value;
		if (filterUntil.value != null) params.untilDate = filterUntil.value;
		logs.value = await misskeyApi('hata/hatady/logs', params).catch(() => []);
	} finally {
		logsLoading.value = false;
	}
}
async function loadStats() { stats.value = await misskeyApi('hata/hatady/stats', {}).catch(() => null); }
async function loadBooks() { books.value = await misskeyApi('hata/hatady/books', { limit: 20 }).catch(() => []); }

function reloadMylog() { loadLogs(); loadStats(); loadBooks(); }

// ===== 期間フィルタ / 日付ジャンプ (旗鯖fork) =====
const timelineColRef = ref<HTMLElement | null>(null);
const periodOpen = ref(false);
const sinceInput = ref('');  // <input type="date"> の値 (YYYY-MM-DD)
const untilInput = ref('');
const jumpInput = ref('');

// YYYY-MM-DD → その日の 00:00:00 / 23:59:59.999 のエポックms。
function dayStartMs(v: string): number | null { if (!v) return null; const [y, m, d] = v.split('-').map(Number); if (!y || !m || !d) return null; return new Date(y, m - 1, d, 0, 0, 0, 0).getTime(); }
function dayEndMs(v: string): number | null { if (!v) return null; const [y, m, d] = v.split('-').map(Number); if (!y || !m || !d) return null; return new Date(y, m - 1, d, 23, 59, 59, 999).getTime(); }
// logGroups のキー形式(非ゼロ埋め)に合わせる。
function groupKeyFromDate(dt: Date): string { return `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`; }
function groupKeyFromInput(v: string): string | null { if (!v) return null; const [y, m, d] = v.split('-').map(Number); if (!y || !m || !d) return null; return `${y}-${m}-${d}`; }

async function scrollToGroup(key: string): Promise<boolean> {
	await nextTick();
	const el = timelineColRef.value?.querySelector(`[data-date-key="${key}"]`) as HTMLElement | null;
	if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
	return false;
}

// 期間を適用(開始・終了の日付から)。
async function applyPeriod() {
	filterSince.value = dayStartMs(sinceInput.value);
	filterUntil.value = dayEndMs(untilInput.value);
	if (filterSince.value == null && filterUntil.value == null) return;
	await loadLogs();
	await nextTick();
	timelineColRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function clearPeriod() {
	filterSince.value = null; filterUntil.value = null;
	sinceInput.value = ''; untilInput.value = '';
	loadLogs();
}
// プリセット: 今月 / 先月 / 過去30日。
function pad(n: number): string { return n.toString().padStart(2, '0'); }
function toInput(dt: Date): string { return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; }
function presetThisMonth() { const now = new Date(); sinceInput.value = toInput(new Date(now.getFullYear(), now.getMonth(), 1)); untilInput.value = toInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)); applyPeriod(); }
function presetLastMonth() { const now = new Date(); sinceInput.value = toInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)); untilInput.value = toInput(new Date(now.getFullYear(), now.getMonth(), 0)); applyPeriod(); }
function presetLast30() { const now = new Date(); const s = new Date(now); s.setDate(s.getDate() - 29); sinceInput.value = toInput(s); untilInput.value = toInput(now); applyPeriod(); }

// 単一日ジャンプ: まず読み込み済みなら該当日へスクロール。無ければその日以前を読み直して先頭へ。
async function jumpToDate() {
	const key = groupKeyFromInput(jumpInput.value);
	if (!key) return;
	if (!filterActive.value && await scrollToGroup(key)) return;
	// 読み込み済みに無い(=より古い)ので、その日を最新にして読み直す。
	filterSince.value = null;
	filterUntil.value = dayEndMs(jumpInput.value);
	untilInput.value = jumpInput.value; sinceInput.value = '';
	await loadLogs();
	if (!await scrollToGroup(key)) {
		await nextTick();
		timelineColRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
}

// ヒートマップのセル(YYYY-MM-DD ゼロ埋め)クリックで、その日付へジャンプ。
async function jumpToHeatCell(dateKey: string) {
	jumpInput.value = dateKey;
	await jumpToDate();
}

// 日付区切りのタイムライン: studiedAt のローカル日付でグループ化(新しい日付順)。
const logGroups = computed(() => {
	const map = new Map<string, { key: string; label: string; sub: string; logs: any[] }>();
	for (const log of logs.value) {
		if (!matchLog(log)) continue;
		const d = new Date(log.studiedAt);
		const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		if (!map.has(key)) map.set(key, { key, label: formatDay(d), sub: '', logs: [] });
		map.get(key)!.logs.push(log);
	}
	// 各グループのサブ(セッション数・合計時間)。
	for (const g of map.values()) {
		const total = g.logs.reduce((a, l) => a + (l.durationMinutes || 0), 0);
		g.sub = lang.value === 'en'
			? `${g.logs.length} sessions · ${fmtDuration(total)}`
			: `${g.logs.length}セッション · ${fmtDuration(total)}`;
	}
	return [...map.values()];
});

const readingBooks = computed(() => books.value.filter(b => b.status === 'reading').slice(0, 5));

// 今日の記録状況: done=今日記録済み / notYet=今日未記録(連続は生きている) / broken=連続途切れ / null=新規/読込中
const todayState = computed<'done' | 'notYet' | 'broken' | null>(() => {
	const s = stats.value;
	if (!s) return null;
	if (s.recordedToday) return 'done';
	// 今日未記録。過去に記録があり、連続が0(=昨日も記録なし)なら「途切れた」。
	if ((s.totalLogs ?? 0) > 0 && (s.streakDays ?? 0) === 0) return 'broken';
	// 今日まだ記録していない(初回含む)。
	return 'notYet';
});
// done/broken の情報バナーは1日1回で十分(上部圧迫回避)。×で今日は非表示にする(端末ローカル)。
function todayKey(): string { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
const infoBannerDismissed = ref<string>('');
function dismissInfoBanner() { infoBannerDismissed.value = todayKey(); try { localStorage.setItem('hatadyInfoBannerDismissed', infoBannerDismissed.value); } catch { /* noop */ } }
// notYet(記録を促す)は常時表示、done/broken(情報)は未dismissの日のみ表示。
const showInfoBanner = computed(() => infoBannerDismissed.value !== todayKey());

// ===== みんなの学習(公開フィード) =====
const discover = ref<any[]>([]);
const discoverFiltered = computed(() => discover.value.filter(matchLog));
const discoverLoading = ref(false);
const discoverType = ref<'recent' | 'popular' | 'following'>('recent');
const discoverTypes = [
	{ key: 'recent' as const, label: 'tabRecent', icon: 'ti-clock' },
	{ key: 'popular' as const, label: 'tabPopular', icon: 'ti-flame' },
	{ key: 'following' as const, label: 'tabFollowing', icon: 'ti-user-check' },
];
async function loadDiscover() {
	discoverLoading.value = true;
	try {
		discover.value = await misskeyApi('hata/hatady/timeline', { type: discoverType.value, limit: 40 }).catch(() => []);
	} finally {
		discoverLoading.value = false;
	}
}
function setDiscoverType(type: 'recent' | 'popular' | 'following') {
	if (discoverType.value === type) return;
	discoverType.value = type;
	loadDiscover();
}

// ===== 本棚 =====
const booksLoading = computed(() => logsLoading.value); // 本は reloadMylog で同時ロードされる。
const shelfFilter = ref<'all' | 'reading' | 'finished' | 'want'>('all');
const shelfFilters = [
	{ key: 'all' as const, label: 'filterAll' },
	{ key: 'reading' as const, label: 'status_reading' },
	{ key: 'finished' as const, label: 'status_finished' },
	{ key: 'want' as const, label: 'status_want' },
];
// 管理者/モデレーター: 全ユーザーの本を確認できる「すべての本」表示。
const isModerator = computed(() => !!(($i as any)?.isModerator || ($i as any)?.isAdmin));
const adminAll = ref(false);
const allBooks = ref<any[]>([]);
async function loadAllBooks() {
	allBooks.value = await misskeyApi('hata/hatady/admin/books', { limit: 100 }).catch(() => []);
}
function setAdminAll(v: boolean) {
	adminAll.value = v;
	if (v && allBooks.value.length === 0) loadAllBooks();
}

// 本棚のソート: 追加日(createdAt) / 名前 / 読了日。お気に入りは常に上位。
const sortKey = ref<'added' | 'name' | 'finished'>('added');
const sortAsc = ref(false);
const shelfBooks = computed(() => {
	// 依存を明示的に読む(computed の依存追跡を確実にする)。
	const key = sortKey.value;
	const dir = sortAsc.value ? 1 : -1;
	const filter = shelfFilter.value;
	const q = searchQuery.value;
	void q;
	const source = adminAll.value ? allBooks.value : books.value;
	const base = (adminAll.value || filter === 'all' ? source : source.filter(b => b.status === filter)).filter(matchBook);
	const cmp = (a: any, b: any): number => {
		// お気に入り優先(方向に関係なく上位)。
		if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
		if (key === 'name') return dir * String(a.title ?? '').localeCompare(String(b.title ?? ''), 'ja');
		if (key === 'finished') {
			const av = a.finishedAt ? Date.parse(a.finishedAt) : -Infinity;
			const bv = b.finishedAt ? Date.parse(b.finishedAt) : -Infinity;
			return dir * (av - bv);
		}
		// 追加日: createdAt(記録済み)。無ければ id で代替(id も時系列)。
		const av = a.createdAt ? Date.parse(a.createdAt) : 0;
		const bv = b.createdAt ? Date.parse(b.createdAt) : 0;
		if (av !== bv) return dir * (av - bv);
		return dir * String(a.id ?? '').localeCompare(String(b.id ?? ''));
	};
	return [...base].sort(cmp);
});

// 本のステータス色(CSS Modules の動的クラスは解決されないためインラインで付与)。
const STATUS_COLORS: Record<string, { background: string; color: string }> = {
	reading: { background: 'rgba(217,130,74,.16)', color: '#b45f27' },
	finished: { background: 'rgba(107,142,90,.18)', color: '#4d6b3c' },
	want: { background: 'rgba(120,120,120,.16)', color: '#6b6b6b' },
};
function statusStyle(status: string) { return STATUS_COLORS[status] ?? STATUS_COLORS.reading; }

// 本棚から本を直接追加する(デザイン案 1i の専用モーダルを開く)。
async function addBookFromShelf() {
	const { dispose } = os.popup((await import('@/components/HatadyBookForm.vue')).default, {}, {
		done: () => { loadBooks(); },
		closed: () => dispose(),
	});
}

// 公開フィード用の相対時刻(◯分前 / ◯時間前 / 日付)。
function fmtWhen(iso: string): string {
	const d = new Date(iso);
	const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
	const en = effectiveLang.value === 'en';
	if (diffMin < 1) return en ? 'now' : 'たった今';
	if (diffMin < 60) return en ? `${diffMin}m ago` : `${diffMin}分前`;
	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return en ? `${diffH}h ago` : `${diffH}時間前`;
	const diffD = Math.floor(diffH / 24);
	if (diffD < 7) return en ? `${diffD}d ago` : `${diffD}日前`;
	return en ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatDay(d: Date): string {
	const today = new Date(); today.setHours(0, 0, 0, 0);
	const dd = new Date(d); dd.setHours(0, 0, 0, 0);
	const diff = Math.round((today.getTime() - dd.getTime()) / 86400000);
	if (lang.value === 'en') {
		if (diff === 0) return 'Today';
		if (diff === 1) return 'Yesterday';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
	if (diff === 0) return '今日';
	if (diff === 1) return '昨日';
	return `${d.getMonth() + 1}月${d.getDate()}日`;
}
function fmtDuration(min: number): string {
	if (min < 60) return lang.value === 'en' ? `${min}m` : `${min}分`;
	const h = Math.floor(min / 60); const m = min % 60;
	return lang.value === 'en' ? `${h}h ${m}m` : `${h}時間${m}分`;
}
function fmtTime(iso: string): string {
	const d = new Date(iso);
	return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
// ヒートマップの濃さ(0-4)。分数を段階化。
function heatLevel(minutes: number): number {
	if (minutes <= 0) return 0;
	if (minutes < 20) return 1;
	if (minutes < 45) return 2;
	if (minutes < 90) return 3;
	return 4;
}
// ヒートマップを7行×週の列にする(縦=曜日)。
type HeatCell = { minutes: number; date: string; count: number };
const heatColumns = computed<HeatCell[][]>(() => {
	const hm: HeatCell[] = stats.value?.heatmap ?? [];
	const cols: HeatCell[][] = [];
	for (let i = 0; i < hm.length; i += 7) cols.push(hm.slice(i, i + 7).map(x => ({ minutes: x.minutes, date: x.date, count: x.count ?? 0 })));
	return cols;
});

// 読み込み済みログ(直近)を日付キー(YYYY-MM-DD, ゼロ埋め=ヒートマップと同形式)で索引化。
//   ホバー時に「その日に何を勉強したか(分野別内訳)」を補完表示するのに使う。
const logsByDay = computed<Map<string, { subject: string; minutes: number }[]>>(() => {
	const map = new Map<string, Map<string, number>>();
	for (const log of logs.value) {
		const d = new Date(log.studiedAt);
		const k = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
		if (!map.has(k)) map.set(k, new Map());
		const sm = map.get(k)!;
		sm.set(log.subject, (sm.get(log.subject) ?? 0) + (log.durationMinutes || 0));
	}
	const out = new Map<string, { subject: string; minutes: number }[]>();
	for (const [k, sm] of map) out.set(k, [...sm.entries()].map(([subject, minutes]) => ({ subject, minutes })).sort((a, b) => b.minutes - a.minutes));
	return out;
});

// ヒートマップ日別ポップアップ。位置は fixed(クリップ回避)。
const heatPop = ref<{ dateLabel: string; minutes: number; count: number; subjects: { subject: string; minutes: number }[]; left: number; top: number } | null>(null);
function heatDateLabel(dateKey: string): string {
	const [y, m, d] = dateKey.split('-').map(Number);
	const dt = new Date(y, m - 1, d);
	const en = effectiveLang.value === 'en';
	const wd = dt.toLocaleDateString(en ? 'en-US' : 'ja-JP', { weekday: 'short' });
	return en ? `${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${wd})` : `${m}月${d}日 (${wd})`;
}
function showHeatPop(cell: HeatCell, ev: MouseEvent | TouchEvent) {
	const el = ev.currentTarget as HTMLElement;
	const r = el.getBoundingClientRect();
	heatPop.value = {
		dateLabel: heatDateLabel(cell.date),
		minutes: cell.minutes,
		count: cell.count,
		subjects: logsByDay.value.get(cell.date) ?? [],
		left: Math.min(Math.max(8, r.left + r.width / 2 - 90), window.innerWidth - 188),
		top: r.bottom + 8,
	};
}
function hideHeatPop() { heatPop.value = null; }

// 旗鯖fork: 表示テーマ・言語をサーバー(アカウントレジストリ)から取得して端末間同期を反映。
// 未読通知の近リアルタイム更新: 30秒ごとにポーリング + タブ復帰/フォーカス時に即更新。
//   (完全なリアルタイムは Misskey ストリーミングへの Hatady チャンネル追加が必要なため別途)
let unreadTimer: ReturnType<typeof setInterval> | null = null;
function onFocus() { loadUnread(); }
onMounted(() => {
	try { infoBannerDismissed.value = localStorage.getItem('hatadyInfoBannerDismissed') ?? ''; } catch { /* noop */ }
	loadHatadyDisplay();
	loadHySubjects().catch(() => {}); // 分野の色指定を読み込み、各所の pal() に反映
	reloadMylog();
	loadUnread();
	unreadTimer = setInterval(loadUnread, 30000);
	window.addEventListener('focus', onFocus);
	document.addEventListener('visibilitychange', onFocus);
	maybeShowTutorial();
});

// 初回のみチュートリアル(1j)を表示。完了/スキップで完了フラグを保存し実績を解除する。
async function maybeShowTutorial() {
	const done = await loadTutorialDone();
	if (done) return;
	openTutorial(true);
}
async function openTutorial(firstTime = false) {
	const { dispose } = os.popup((await import('@/components/HatadyTutorial.vue')).default, {}, {
		done: () => {
			setTutorialDone(true);
			// 初回起動(チュートリアル終了後)に実績「Hatadyへようこそ」を解除。
			if (firstTime) claimAchievement('welcomeToHatady');
			dispose();
		},
		closed: () => dispose(),
	});
}
onUnmounted(() => {
	if (unreadTimer) clearInterval(unreadTimer);
	window.removeEventListener('focus', onFocus);
	document.removeEventListener('visibilitychange', onFocus);
});

async function openComposer() {
	const { dispose } = os.popup((await import('@/components/HatadyComposer.vue')).default, {}, {
		done: () => { reloadMylog(); },
		closed: () => dispose(),
	});
}

// 投稿(学習ログ)のメニュー: 自分の投稿は編集/削除、他人の投稿は通報。
function openLogMenu(log: any, ev: MouseEvent) {
	const items: any[] = [];
	if (log.isMine) {
		items.push({ text: t('edit'), icon: 'ti ti-pencil', action: () => editLog(log) });
		items.push({ text: t('delete'), icon: 'ti ti-trash', danger: true, action: () => deleteLog(log) });
	} else if (log.user) {
		items.push({ text: t('report'), icon: 'ti ti-exclamation-circle', action: () => reportLog(log) });
	}
	if (items.length) os.popupMenu(items, (ev.currentTarget ?? ev.target) as HTMLElement);
}

async function editLog(log: any) {
	const { dispose } = os.popup((await import('@/components/HatadyComposer.vue')).default, {
		editLog: log,
	}, {
		done: () => { if (activeTab.value === 'discover') loadDiscover(); else reloadMylog(); },
		closed: () => dispose(),
	});
}

async function deleteLog(log: any) {
	const { canceled } = await os.confirm({ type: 'warning', text: t('deleteConfirm') });
	if (canceled) return;
	await misskeyApi('hata/hatady/logs/delete', { logId: log.id }).catch(() => {});
	os.success();
	if (activeTab.value === 'discover') loadDiscover(); else reloadMylog();
}

async function reportLog(log: any) {
	const { dispose } = await os.popupAsyncWithDialog(import('@/components/MkAbuseReportWindow.vue').then(x => x.default), {
		user: log.user,
		initialComment: `[Hatady] ${log.title}\n${log.body ?? ''}\n-----\n`,
	}, {
		closed: () => dispose(),
	});
}

// 会話ページ(1g)をモーダルで開く。閉じたらマイログ/フィードを再取得して件数を反映。
async function openConversation(logOrId: any) {
	const logId = typeof logOrId === 'string' ? logOrId : logOrId.id;
	const initialLog = typeof logOrId === 'string' ? undefined : logOrId;
	const { dispose } = os.popup((await import('@/components/HatadyConversation.vue')).default, {
		logId,
		initialLog,
	}, {
		changed: () => { if (activeTab.value === 'discover') loadDiscover(); else reloadMylog(); },
		closed: () => dispose(),
	});
}

// Hatady を離れて元の画面へ戻る(主にモバイルの全画面表示用)。
function goBack() {
	if (window.history.length > 1) window.history.back();
	else mainRouter.push('/');
}

// マイルストーン画面(連続記録の進捗)をモーダルで開く。
async function openMilestones() {
	const { dispose } = os.popup((await import('@/components/HatadyMilestones.vue')).default, {
		streak: stats.value?.streakDays ?? 0,
	}, {
		closed: () => dispose(),
	});
}

// 本の詳細(1c/1m)をモーダルで開く。編集/削除/進捗更新で本棚を再取得。
async function openBookDetail(bookId: string) {
	const { dispose } = os.popup((await import('@/components/HatadyBookDetail.vue')).default, {
		bookId,
	}, {
		changed: () => { loadBooks(); reloadMylog(); if (adminAll.value) loadAllBooks(); },
		openLog: (logId: string) => openConversation(logId),
		closed: () => dispose(),
	});
}

// プロフィール(1c)をモーダルで開く。userId 省略で自分のプロフィール。
async function openProfile(userId?: string | null) {
	const { dispose } = os.popup((await import('@/components/HatadyProfile.vue')).default, {
		userId: userId ?? null,
	}, {
		changed: () => { if (activeTab.value === 'discover') loadDiscover(); },
		openLog: (logId: string) => openConversation(logId),
		openProfile: (uid: string) => openProfile(uid),
		openBook: (bookId: string) => openBookDetail(bookId),
		closed: () => dispose(),
	});
}

// 通知ページ(1h)をモーダルで開く。既読で未読バッジを更新、通知タップで会話へ。
async function openNotifications() {
	const { dispose } = os.popup((await import('@/components/HatadyNotifications.vue')).default, {}, {
		read: () => loadUnread(),
		openLog: (logId: string) => openConversation(logId),
		openProfile: (uid: string) => openProfile(uid),
		closed: () => { loadUnread(); dispose(); },
	});
}

// ヒートマップの色(段階0-4)。テーマ非依存の暖色スケール。
const HEAT_COLORS = ['var(--hy-border)', '#eddcc4', '#eaca9d', '#e0a465', '#d9824a'];
function heatColor(minutes: number): string { return HEAT_COLORS[heatLevel(minutes)]; }
function pal(s: string) { return hySubjectPalette(s); }
function bmColor(key: string | null): string { return hyBookmarkColor(key); }
// 分野別フォーカスバーの割合(最大分野を100%に)。
function focusPct(minutes: number): number {
	const max = Math.max(1, ...(stats.value?.focusBySubject ?? []).map((f: any) => f.minutes));
	return Math.round((minutes / max) * 100);
}

// 表示設定(1l): テーマ(やわらかい紙/夜の書斎/hataskey準拠) と言語(日本語/English/端末に合わせる)を
//   ちゃんとしたモーダルで切替。テーマと言語は独立(要件④)。
async function openSettings() {
	const { dispose } = os.popup((await import('@/components/HatadyDisplaySettings.vue')).default, {}, {
		closed: () => dispose(),
	});
}

definePage(() => ({
	title: 'Hatady',
	icon: 'ti ti-book-2',
}));
</script>

<style lang="scss" module>
/* 旗鯖fork: Hatady ロゴ用フォント(Righteous・同梱)。見出しの Zen Maru Gothic /
   本タイトルの Noto Serif JP は未バンドルのためフォールバック指定(後日バンドル)。 */
@font-face {
	font-family: 'Righteous';
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
}

/* ===== ページ骨格。テーマトークンは非module のグローバル .hatady-scope 側で定義し、
   body 直下に描画されるモーダル(HatadyDisplaySettings)でも同じトークンを使えるようにする。 */
.root {
	display: flex;
	flex-direction: column;
	/* 旗鯖fork: コンテンツが短くても暖色背景が画面下まで埋まるように viewport 高で伸ばす。
	   下に地の背景(hataskey テーマ色)が覗く問題への対応。 */
	min-height: 100dvh;
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	color: var(--hy-body);
	background: var(--hy-bg);
}

/* ===== ヘッダー ===== */
.header {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 13px 22px;
	background: var(--hy-header-bg);
	border-bottom: 1px solid var(--hy-border);
	flex-wrap: wrap;
}
.backBtn {
	display: none; align-items: center; justify-content: center;
	width: 34px; height: 34px; border-radius: 999px; flex-shrink: 0;
	background: var(--hy-chip-bg); border: 1px solid var(--hy-border); color: var(--hy-body);
	cursor: pointer; font-size: 18px;
}
.backBtn:hover { border-color: var(--hy-accent); color: var(--hy-accent); }
.brand { display: flex; align-items: center; gap: 9px; background: none; border: none; padding: 0; cursor: pointer; }
.avatarBtn { background: none; border: none; padding: 0; cursor: pointer; display: inline-flex; border-radius: 999px; }
.logoMark {
	display: inline-flex; align-items: center; justify-content: center;
	width: 30px; height: 30px; border-radius: 9px;
	background: linear-gradient(135deg, #e79b5e, #d9824a); color: #fff;
	box-shadow: 0 2px 6px rgba(217, 130, 74, .35); font-size: 17px;
}
.logo { font-family: 'Righteous', cursive; font-size: 21px; color: var(--hy-accent); letter-spacing: .03em; }
.headDivider { width: 1px; height: 22px; background: var(--hy-border); }
.tabs { display: flex; align-items: center; gap: 2px; }
.tab {
	background: none; border: none; cursor: pointer;
	padding: 7px 13px; font-size: 13.5px; font-weight: 500;
	color: var(--hy-muted); font-family: var(--hy-heading);
	border-bottom: 2.5px solid transparent; transition: color .12s;
}
.tab:hover { color: var(--hy-ink); }
.tabOn { color: var(--hy-ink); font-weight: 700; border-bottom-color: var(--hy-accent); }
.headRight { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.search {
	display: flex; align-items: center; gap: 7px;
	background: var(--hy-chip-bg); border: 1px solid var(--hy-border);
	border-radius: 999px; padding: 6px 14px; color: var(--hy-muted); font-size: 12.5px;
	max-width: 220px;
}
.search:focus-within { border-color: var(--hy-accent); }
.searchInput {
	flex: 1; min-width: 0; background: none; border: none; outline: none;
	color: var(--hy-ink); font-size: 12.5px; font-family: inherit;
}
.searchInput::placeholder { color: var(--hy-muted); }
.searchClear { background: none; border: none; color: var(--hy-muted); cursor: pointer; padding: 0; display: inline-flex; }
.searchClear:hover { color: var(--hy-accent); }
.iconBtn {
	position: relative;
	display: inline-flex; align-items: center; justify-content: center;
	width: 34px; height: 34px; border-radius: 999px;
	background: var(--hy-chip-bg); border: 1px solid var(--hy-border); color: var(--hy-body);
	cursor: pointer; font-size: 18px; transition: border-color .12s;
}
.iconBtn:hover { border-color: var(--hy-accent); color: var(--hy-accent); }
.bellBadge {
	position: absolute; top: -2px; right: -2px;
	min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px;
	background: var(--hy-accent); color: #fff; font-size: 10px; font-weight: 800;
	display: inline-flex; align-items: center; justify-content: center; line-height: 1;
	border: 2px solid var(--hy-header-bg);
}
.recordBtn {
	display: inline-flex; align-items: center; gap: 6px;
	background: linear-gradient(90deg, #e0955a, #d9824a); color: #fff; border: none;
	border-radius: 999px; padding: 8px 16px; font-size: 13px; font-weight: 700;
	font-family: var(--hy-heading); box-shadow: 0 3px 9px rgba(217, 130, 74, .4); cursor: pointer;
}
.recordBtn:hover { opacity: .95; }
.avatar { width: 34px; height: 34px; }

/* ===== 本体(プレースホルダ) ===== */
.body { flex: 1; padding: 22px; }
.placeholder {
	display: flex; flex-direction: column; align-items: center; justify-content: center;
	gap: 12px; padding: 60px 20px; text-align: center;
	background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 14px;
	max-width: 520px; margin: 40px auto; box-shadow: 0 1px 3px rgba(96, 70, 35, .06);
}
.phMark {
	display: inline-flex; align-items: center; justify-content: center;
	width: 56px; height: 56px; border-radius: 16px;
	background: linear-gradient(135deg, #e79b5e, #d9824a); color: #fff; font-size: 28px;
	box-shadow: 0 4px 12px rgba(217, 130, 74, .35);
}
.phTitle { font-family: var(--hy-heading); font-weight: 900; font-size: 20px; color: var(--hy-ink); }
.phText { font-size: 13px; color: var(--hy-muted); }

/* ===== マイログ ===== */
.mylog { max-width: 1180px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

/* 今日の記録状況バナー */
.todayBanner { display: flex; align-items: center; gap: 13px; border-radius: 14px; padding: 14px 18px; margin-bottom: 18px; border: 1px solid var(--hy-border); }
.bannerIcon { font-size: 26px; flex-shrink: 0; display: inline-flex; }
.bannerText { flex: 1; min-width: 0; font-size: 12.5px; line-height: 1.5; color: var(--hy-body); }
.bannerText b { font-family: var(--hy-heading); font-size: 14px; color: var(--hy-ink); }
.bannerCta { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(90deg,#e0955a,#d9824a); color: #fff; border: none; border-radius: 999px; padding: 9px 18px; font-weight: 700; font-family: var(--hy-heading); font-size: 13px; cursor: pointer; box-shadow: 0 2px 8px rgba(217,130,74,.3); }
.bannerCta:hover { filter: brightness(1.05); }
.bannerClose { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 999px; background: none; border: none; color: var(--hy-muted); cursor: pointer; font-size: 16px; }
.bannerClose:hover { background: var(--hy-chip-bg); color: var(--hy-ink); }
.bannerNotYet { background: color-mix(in srgb, var(--hy-accent) 10%, var(--hy-surface)); border-color: color-mix(in srgb, var(--hy-accent) 40%, transparent); }
.bannerNotYet .bannerIcon { color: var(--hy-accent); }
.bannerBroken { background: color-mix(in srgb, #c0563a 10%, var(--hy-surface)); border-color: color-mix(in srgb, #c0563a 40%, transparent); }
.bannerBroken .bannerIcon { color: #c0563a; }
.bannerDone { background: color-mix(in srgb, #5a9a5a 10%, var(--hy-surface)); border-color: color-mix(in srgb, #5a9a5a 35%, transparent); }
.bannerDone .bannerIcon { color: #5a9a5a; }

/* 旗鯖fork: モバイル(狭幅)ではバナーが1行に詰まってタイトルが文字単位で折り返し崩れるため、
   「アイコン＋本文＋×」を1行目、「記録ボタン」を2行目(全幅)へ折り返す。 */
@media (max-width: 560px) {
	.todayBanner { flex-wrap: wrap; align-items: center; gap: 10px 11px; padding: 13px 14px; }
	.bannerText { flex: 1 1 0; }
	.bannerClose { order: 2; }
	.bannerCta { order: 3; flex: 1 1 100%; justify-content: center; padding: 11px 18px; }
}

/* hero: 統計 + ヒートマップ。
   旗鯖fork: 4つの統計は常に 2×2(田) グリッド。狭幅では「統計(上) → ヒートマップ(下)」の縦積み、
   PC等の広い幅(コンテンツ幅が足りるとき)では flex-wrap で「ヒートマップ(左) + 統計2×2(右)」に並べ、
   ヒートマップ右側の余白を統計が埋めてスッキリさせる。 */
.hero { display: flex; flex-direction: column; gap: 16px; }
.heroStats { display: grid; grid-template-columns: repeat(2, 1fr); grid-auto-rows: 1fr; gap: 12px; }
.heroStat { min-width: 0; display: flex; flex-direction: column; justify-content: center; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 12px; padding: 12px 16px; text-align: center; box-shadow: 0 1px 3px rgba(96,70,35,.06); }
.heroStatBtn { cursor: pointer; font: inherit; transition: border-color .12s; }
.heroStatBtn:hover { border-color: var(--hy-accent); }
.heroNum { font-family: var(--hy-heading); font-weight: 900; font-size: 20px; color: var(--hy-ink); }
.heroFlame { color: var(--hy-accent); }
.heroLbl { font-size: 10.5px; color: var(--hy-muted); margin-top: 2px; }
.heatmap { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 14px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(96,70,35,.06); }
.heatHead { font-size: 12.5px; font-weight: 700; color: var(--hy-ink); margin-bottom: 12px; }
.heatGrid { display: flex; gap: 4px; overflow-x: auto; }
.heatCol { display: flex; flex-direction: column; gap: 4px; }
.heatCell { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; cursor: pointer; transition: outline .1s; }
.heatCell:hover { outline: 2px solid var(--hy-accent); outline-offset: 1px; }

/* 旗鯖fork: 広い幅では「ヒートマップ左 + 統計2×2右」の田レイアウト。
   コンテンツ幅が足りない場合は flex-wrap で自動的に縦積み(ヒートマップ上→統計下)へ退避する。 */
@media (min-width: 850px) {
	.hero { flex-flow: row wrap; align-items: stretch; }
	.heatmap { order: -1; flex: 1 1 360px; min-width: 0; }
	.heroStats { flex: 1 1 236px; max-width: 320px; }
	/* 右カラムは幅が限られるため、統計セルを詰めて数値(例:1時間30分)を1行に収める。 */
	.heroStat { padding: 12px 10px; }
	.heroNum { font-size: 18px; white-space: nowrap; }
}

/* 日別ポップアップ(position:fixed で画面基準に浮かせる) */
.heatPop {
	position: fixed; z-index: 10000; width: 180px;
	background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 11px;
	padding: 11px 13px; box-shadow: 0 8px 28px rgba(0,0,0,.28);
	pointer-events: none;
}
.heatPopDate { font-family: var(--hy-heading); font-weight: 700; font-size: 12.5px; color: var(--hy-ink); margin-bottom: 5px; }
.heatPopStat { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--hy-accent-ink); }
.heatPopEmpty { font-size: 12px; color: var(--hy-muted); }
.heatPopSubjects { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.heatPopSubject { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--hy-body); }
.heatPopDot { width: 8px; height: 8px; border-radius: 999px; flex-shrink: 0; }
.heatPopMin { margin-left: auto; color: var(--hy-muted); font-weight: 700; }
.heatPopHint { font-size: 10.5px; color: var(--hy-muted); margin-top: 6px; }

/* grid */
.grid { display: grid; grid-template-columns: 1fr 312px; gap: 22px; align-items: start; }
.grid > * { min-width: 0; }

/* タイムライン */
.timelineCol { min-width: 0; scroll-margin-top: 12px; }
.tlHeadRow { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.tlTitle { margin: 0; font-family: var(--hy-heading); font-weight: 900; font-size: 18px; color: var(--hy-ink); }
.periodToggle { position: relative; display: inline-flex; align-items: center; gap: 5px; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 999px; padding: 6px 14px; font-size: 12px; font-weight: 700; color: var(--hy-body); cursor: pointer; font-family: var(--hy-heading); }
.periodToggle:hover { border-color: var(--hy-accent); }
.periodToggleOn { border-color: var(--hy-accent); color: var(--hy-accent-ink); }
.periodDot { position: absolute; top: 4px; right: 6px; width: 7px; height: 7px; border-radius: 999px; background: var(--hy-accent); }
.periodPanel { display: flex; flex-direction: column; gap: 14px; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 14px; padding: 15px 16px; margin-bottom: 14px; }
/* 旗鯖fork: 「期間で絞り込む」「日付へジャンプ」を独立ブロックに整理。 */
.periodGroup { display: flex; flex-direction: column; gap: 10px; }
.periodGroupLabel { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .03em; color: var(--hy-body); font-family: var(--hy-heading); }
.periodGroupLabel i { color: var(--hy-accent); font-size: 14px; }
.periodDivider { height: 1px; background: var(--hy-border); }
/* 期間レンジ: 2つの日付+〜を1つのまとまりに見せ、適用ボタンを添える */
.periodRangeField { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.periodJumpField { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.periodDate { flex: 1 1 130px; min-width: 116px; background: var(--hy-bg); border: 1px solid var(--hy-border); border-radius: 9px; padding: 8px 11px; color: var(--hy-ink); font-size: 13px; outline: none; font-family: inherit; transition: border-color .12s; }
.periodDate:hover { border-color: color-mix(in srgb, var(--hy-accent) 45%, var(--hy-border)); }
.periodDate:focus { border-color: var(--hy-accent); }
.periodTilde { flex: 0 0 auto; color: var(--hy-muted); font-weight: 700; }
.periodApply { flex: 0 0 auto; background: var(--hy-accent); color: #fff; border: none; border-radius: 999px; padding: 8px 18px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: var(--hy-heading); transition: filter .12s; }
.periodApply:not(:disabled):hover { filter: brightness(1.05); }
.periodApply:disabled { opacity: .5; cursor: not-allowed; }
.periodPresets { display: flex; flex-wrap: wrap; gap: 6px; }
.periodChip { display: inline-flex; align-items: center; gap: 4px; background: var(--hy-bg); border: 1px solid var(--hy-border); border-radius: 999px; padding: 5px 12px; font-size: 11.5px; font-weight: 700; color: var(--hy-body); cursor: pointer; font-family: var(--hy-heading); }
.periodChip:hover { border-color: var(--hy-accent); }
.periodClear { color: #c0563a; }
.periodClear:hover { border-color: #c0563a; }
.filterNotice { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--hy-accent-ink); background: rgba(217,130,74,.1); border: 1px solid var(--hy-border); border-radius: 10px; padding: 8px 12px; margin-bottom: 14px; }
.filterNotice > i { color: var(--hy-accent); }
.filterNoticeClear { margin-left: auto; background: none; border: none; color: var(--hy-accent-ink); font-weight: 700; cursor: pointer; text-decoration: underline; font-size: 12px; }
.heatCellClickable { cursor: pointer; }
.loading { opacity: .6; padding: 30px 0; text-align: center; }
.emptyTl { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 20px; text-align: center; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 14px; }
.emptyIcon { font-size: 2.4rem; color: var(--hy-accent); opacity: .6; }
.emptyCta { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(90deg,#e0955a,#d9824a); color: #fff; border: none; border-radius: 999px; padding: 9px 20px; font-weight: 700; font-family: var(--hy-heading); cursor: pointer; }

.dateGroup { margin-bottom: 22px; }
.dateHead { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.datePill { display: inline-flex; align-items: center; gap: 6px; background: var(--hy-ink); color: var(--hy-bg); border-radius: 999px; padding: 4px 13px; font-size: 12px; font-weight: 700; font-family: var(--hy-heading); }
.dateSub { font-size: 11.5px; color: var(--hy-muted); }
.dateLine { flex: 1; height: 1px; background: var(--hy-border); }

.rail { position: relative; padding-left: 34px; }
.railLine { position: absolute; left: 11px; top: 6px; bottom: 6px; width: 2px; background: var(--hy-border); }
.entry { position: relative; margin-bottom: 16px; }
.entry:last-child { margin-bottom: 0; }
.entryDot { position: absolute; left: -30px; top: 6px; width: 16px; height: 16px; border-radius: 999px; border: 2.5px solid; }
.card { background: var(--hy-surface); border: 1px solid var(--hy-border); border-left: 4px solid; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(96,70,35,.06); }
.cardTop { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.privateChip { color: var(--hy-muted); font-size: 11px; }
.cardTime { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--hy-body); opacity: .85; }
.menuBtn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 999px; background: none; border: none; color: var(--hy-muted); cursor: pointer; font-size: 16px; }
.menuBtn:hover { background: var(--hy-chip-bg); color: var(--hy-ink); }
.cardTitle { font-size: 14.5px; font-weight: 700; color: var(--hy-ink); line-height: 1.5; margin-bottom: 9px; }
.bookChip { display: flex; gap: 11px; align-items: center; background: var(--hy-surface-2); border-radius: 10px; padding: 9px 11px; margin-bottom: 10px; }
.bookInfo { flex: 1; min-width: 0; }
.bookTitle { font-family: var(--hy-serif); font-weight: 600; font-size: 13px; color: var(--hy-ink); line-height: 1.4; }
.bookAuthor { font-size: 11px; color: var(--hy-muted); margin: 1px 0 6px; }
.progressWrap { display: flex; align-items: center; gap: 8px; }
.progressBar { flex: 1; height: 5px; border-radius: 999px; background: var(--hy-border); overflow: hidden; display: block; }
.progressFill { display: block; height: 100%; border-radius: 999px; background: var(--hy-accent); }
.progressText { font-size: 10.5px; font-weight: 700; white-space: nowrap; }
.cardBody { font-size: 12.5px; line-height: 1.7; color: var(--hy-body); margin-bottom: 11px; word-break: break-word; }
.cardFoot { display: flex; align-items: center; gap: 7px; }
.tagChip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 999px; }
.footRight { margin-left: auto; display: flex; align-items: center; gap: 10px; color: var(--hy-body); font-size: 12px; }
.commentBtn { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; background: none; border: none; color: var(--hy-body); font-size: 12px; font-weight: 700; cursor: pointer; padding: 4px 6px; border-radius: 8px; transition: all .12s; }
.commentBtn:hover { background: var(--hy-chip-bg); color: var(--hy-accent-ink); }

/* サイドバー */
.side { display: flex; flex-direction: column; gap: 16px; }
.sideCard { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(96,70,35,.06); }
.profileMini { display: flex; align-items: center; gap: 11px; margin-bottom: 14px; width: 100%; background: none; border: none; padding: 4px; margin-left: -4px; border-radius: 10px; cursor: pointer; text-align: left; transition: background .12s; }
.profileMini:hover { background: var(--hy-chip-bg); }
.profileAvatar { width: 46px; height: 46px; }
.profileName { font-family: var(--hy-heading); font-weight: 700; font-size: 15px; color: var(--hy-ink); }
.profileAcct { font-size: 11.5px; color: var(--hy-muted); }
.streakBox { display: flex; align-items: center; gap: 9px; background: var(--hy-surface-2); border: 1px solid transparent; border-radius: 11px; padding: 10px 13px; width: 100%; cursor: pointer; text-align: left; font: inherit; color: inherit; transition: border-color .12s; }
.streakBox:hover { border-color: var(--hy-accent); }
.streakArrow { margin-left: auto; color: var(--hy-muted); font-size: 16px; }
.streakIcon { font-size: 24px; color: var(--hy-accent); }
.streakNum { font-family: var(--hy-heading); font-weight: 900; font-size: 19px; color: var(--hy-accent-ink); line-height: 1; }
.streakUnit { font-size: 12px; font-weight: 700; }
.streakSub { font-size: 11px; color: var(--hy-muted); }
.sideTitle { font-family: var(--hy-heading); font-weight: 700; font-size: 13px; color: var(--hy-ink); margin-bottom: 12px; }
.sideTitle i { color: var(--hy-accent); margin-right: 4px; }
.focusRow { margin-bottom: 9px; }
.focusHead { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--hy-body); margin-bottom: 3px; }
.focusMin { color: var(--hy-muted); }
.focusBar { display: block; height: 6px; border-radius: 999px; background: var(--hy-border); overflow: hidden; }
.focusFill { display: block; height: 100%; border-radius: 999px; }
.readingRow { display: flex; gap: 10px; margin-bottom: 12px; }
.readingRow:last-child { margin-bottom: 0; }
.readingInfo { flex: 1; min-width: 0; }
.readingTitle { font-family: var(--hy-serif); font-weight: 600; font-size: 12px; color: var(--hy-ink); line-height: 1.35; margin-bottom: 6px; }
.sideEmpty { font-size: 12px; color: var(--hy-muted); }

/* ===== みんなの学習(公開フィード) ===== */
.discover { max-width: 660px; margin: 0 auto; }
.discoverTabs { display: flex; gap: 6px; margin-bottom: 16px; }
.discoverTab { display: inline-flex; align-items: center; gap: 5px; padding: 5px 14px; font-size: 12px; font-weight: 700; color: var(--hy-body); background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 999px; cursor: pointer; font-family: var(--hy-heading); }
.discoverTab:hover { border-color: var(--hy-accent); }
.discoverTabOn { color: #fff; background: var(--hy-accent); border-color: transparent; }
.feed { display: flex; flex-direction: column; gap: 14px; }
.feedCard { background: var(--hy-surface); border: 1px solid var(--hy-border); border-left: 4px solid; border-radius: 14px; padding: 15px 17px; box-shadow: 0 1px 3px rgba(96,70,35,.06); }
.feedHead { display: flex; align-items: center; gap: 10px; margin-bottom: 11px; }
.feedAuthor { display: flex; align-items: center; gap: 10px; background: none; border: none; padding: 2px 4px 2px 2px; margin: -2px; border-radius: 999px; cursor: pointer; min-width: 0; transition: background .12s; }
.feedAuthor:hover { background: var(--hy-chip-bg); }
.feedAvatar { width: 40px; height: 40px; flex-shrink: 0; }
.feedWho { min-width: 0; }
.feedName { font-family: var(--hy-heading); font-weight: 700; font-size: 14px; color: var(--hy-ink); }
.feedAcct { font-size: 11.5px; color: var(--hy-body); opacity: .8; }
.feedTopics { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-bottom: 9px; }
.feedDuration { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--hy-body); opacity: .85; }
.feedTitle { font-size: 15px; font-weight: 700; color: var(--hy-ink); line-height: 1.55; margin-bottom: 10px; }

/* ===== 本棚 ===== */
.shelf { max-width: 1000px; margin: 0 auto; }
.shelfHead { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
.shelfHead .tlTitle { margin: 0; }
.shelfFilters { display: flex; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.shelfSort { display: flex; align-items: center; gap: 6px; }
.sortSelect { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 999px; padding: 6px 12px; font-size: 12.5px; color: var(--hy-ink); font-family: inherit; cursor: pointer; outline: none; }
.sortSelect:focus { border-color: var(--hy-accent); }
.sortDir { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 999px; background: var(--hy-surface); border: 1px solid var(--hy-border); color: var(--hy-body); cursor: pointer; font-size: 16px; }
.sortDir:hover { border-color: var(--hy-accent); color: var(--hy-accent); }
.shelfCoverWrap { position: relative; align-self: center; }
.favStar { position: absolute; top: -6px; right: -6px; z-index: 3; width: 24px; height: 24px; border-radius: 999px; background: #f6c453; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,.25); }
/* しおり: 本の上端から飛び出す帯(下端がしおりの尾のように尖る) */
.ribbon { position: absolute; top: -9px; width: 9px; height: 28px; z-index: 2; border-radius: 2px 2px 0 0; box-shadow: 0 1px 2px rgba(0,0,0,.25); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); }
.shelfAddBtn { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(90deg,#e0955a,#d9824a); color: #fff; border: none; border-radius: 999px; padding: 8px 16px; font-weight: 700; font-family: var(--hy-heading); font-size: 13px; cursor: pointer; box-shadow: 0 2px 8px rgba(217,130,74,.3); }
.shelfAddBtn:hover { filter: brightness(1.05); }
.shelfFilter { border: 1.5px solid var(--hy-border); background: var(--hy-surface); color: var(--hy-body); border-radius: 999px; padding: 6px 15px; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all .15s; }
.shelfFilter:hover { border-color: var(--hy-accent); }
.shelfFilterOn { background: var(--hy-ink); color: var(--hy-bg); border-color: var(--hy-ink); }
.shelfGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 20px; }
.shelfItem { display: flex; flex-direction: column; gap: 10px; background: none; border: none; padding: 6px; margin: -6px; border-radius: 10px; cursor: pointer; text-align: left; transition: background .12s; font: inherit; }
.shelfItem:hover { background: var(--hy-chip-bg); }
.shelfItem > :first-child { align-self: center; box-shadow: 0 3px 12px rgba(96,70,35,.18); border-radius: 4px; }
.shelfMeta { min-width: 0; }
.shelfTitle { font-family: var(--hy-serif); font-weight: 600; font-size: 13.5px; color: var(--hy-ink); line-height: 1.4; }
.shelfAuthor { font-size: 11.5px; color: var(--hy-muted); margin-top: 2px; }
.shelfOwner { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 700; color: var(--hy-accent-ink); margin-bottom: 2px; }
.adminFilter { border-color: var(--hy-accent) !important; }
.shelfStatusRow { display: flex; align-items: center; gap: 8px; margin: 7px 0 5px; }
.shelfStatus { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
.shelfPages { font-size: 11px; color: var(--hy-muted); }

@media (max-width: 920px) {
	.grid { grid-template-columns: 1fr; }
	.side { flex-direction: row; flex-wrap: wrap; }
	.sideCard { flex: 1; min-width: 220px; }
}

/* モバイル */
@media (max-width: 600px) {
	.header { padding: 10px 14px; gap: 10px; }
	.backBtn { display: inline-flex; }
	.search { display: none; }
	.logo { display: none; }
	.headDivider { display: none; }
	.recordText { display: none; }
	.recordBtn { padding: 8px 12px; }
	.heroStat { min-width: 70px; padding: 10px; }
	.side { flex-direction: column; }
}
</style>

<style lang="scss">
/* ===== Hatady テーマトークン(グローバル) =====
   テーマと言語は独立(要件④)。.hatady-scope + data-hatady-theme を付けた要素配下に効く。
   ページ本体だけでなく、body 直下に描画される Hatady のモーダル/ポップアップにも同じトークンを
   使わせるため、あえて module ではなくグローバルの属性セレクタで定義する。 */
.hatady-scope {
	--hy-heading: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', system-ui, sans-serif;
	--hy-serif: 'Noto Serif JP', 'Hiragino Mincho ProN', serif;
}
/* やわらかい紙(ライト) */
.hatady-scope[data-hatady-theme="paper"] {
	--hy-bg: #f4ecdd;
	--hy-surface: #fffdf8;
	--hy-surface-2: #f7efdf;
	--hy-ink: #443a2c;
	--hy-body: #5d4f3d;
	--hy-muted: #a2937c;
	--hy-accent: #d9824a;
	--hy-accent-ink: #b8632f;
	--hy-border: rgba(96, 70, 35, .13);
	--hy-header-bg: #fffdf8;
	--hy-chip-bg: #f4ecdd;
}
/* 夜の書斎(エスプレッソダーク) */
.hatady-scope[data-hatady-theme="espresso"] {
	--hy-bg: #211a14;
	/* カード面は半透明だと下地と合成されて中間グレーになり文字が沈むため単色にする。 */
	--hy-surface: #2f251c;
	--hy-surface-2: #271f17;
	--hy-ink: #fbf3e8;
	--hy-body: #ecdcc6;
	/* 暗背景では控えめな muted でも十分な明度が要る(@acct・時刻・ボタン類の視認性)。 */
	--hy-muted: #cbb79a;
	--hy-accent: #f0a94e;
	--hy-accent-ink: #f4bd72;
	--hy-border: rgba(255, 255, 255, .12);
	--hy-header-bg: #2b2119;
	--hy-chip-bg: rgba(255, 255, 255, .07);
}
/* hataskey 準拠(本体テーマ変数にマップ・ダーク/ライト追従) */
.hatady-scope[data-hatady-theme="hataskey"] {
	--hy-bg: var(--MI_THEME-bg);
	--hy-surface: var(--MI_THEME-panel);
	--hy-surface-2: var(--MI_THEME-bg);
	--hy-ink: var(--MI_THEME-fg);
	--hy-body: var(--MI_THEME-fg);
	/* fgTransparentWeak は淡すぎて暗テーマで沈むため、fg を 60% 混色して可読性を確保。 */
	--hy-muted: color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent);
	--hy-accent: var(--MI_THEME-accent);
	--hy-accent-ink: var(--MI_THEME-accent);
	--hy-border: var(--MI_THEME-divider);
	--hy-header-bg: var(--MI_THEME-panel);
	--hy-chip-bg: var(--MI_THEME-buttonBg, var(--MI_THEME-bg));
}
</style>
