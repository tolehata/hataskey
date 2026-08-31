<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, { [$style.desktopLayout]: isDesktop }]" :data-hata-foldable="isFoldableWide ? 'true' : undefined">
	<!-- PC/タブレット: オリジナル左サイドバー (上部メニューモード時は隠す) -->
	<nav v-if="isDesktop && !topNavActive" :class="[$style.sidebar, { [$style.sidebarSolid]: !glassEffect, [$style.sidebarWide]: !sidebarFolded && studioProfile.expanded.width === 'wide', [$style.sidebarDeckFolded]: deckActive || sidebarCollapsed }]">
		<!-- バナーすりガラス背景 -->
		<div v-if="glassEffect" :class="$style.sidebarBanner">
			<img v-if="$i?.bannerUrl" :src="$i.bannerUrl" :class="$style.sidebarBannerImg"/>
		</div>
		<div :class="$style.sidebarInner">
			<!-- ロゴ & インスタンス名 & TL設定 (上部固定) -->
			<div :class="$style.sbLogoRow">
				<div :class="$style.sbLogo" @click="openInstanceMenuMobile">
					<img v-if="instanceIconUrl" :src="instanceIconUrl" :class="$style.sbLogoImg"/>
					<div :class="$style.sbLogoWrap">
						<span :class="$style.sbLogoSub">{{ copy.hereIs }}</span>
						<span :class="$style.sbLogoText">{{ instanceNameStr }}</span>
					</div>
				</div>
				<!-- 旗鯖fork(タスク6): 拡大表示時のみ、TL設定ボタンと縮小ボタンを表示。デッキ時(強制縮小)は出さない。 -->
				<button v-if="!sidebarCollapsed && !deckActive" v-tooltip="copy.timelineSettings" :class="$style.sbLogoAction" @click.stop="openTlOptions"><i class="ti ti-adjustments"></i></button>
				<button v-if="!sidebarCollapsed && !deckActive" ref="collapseAnchorEl" v-tooltip="copy.collapseMenu" :class="$style.sbLogoAction" @click.stop="toggleSidebarCollapse"><i class="ti ti-chevron-left"></i></button>
			</div>
			<!-- 旗鯖fork(タスク6): 縮小表示時、サーバーアイコンの下に拡大ボタン[＞]を表示。デッキ時は出さない。 -->
			<button v-if="sidebarCollapsed && !deckActive" v-tooltip="copy.expandMenu" :class="$style.sbExpandBtn" @click.stop="toggleSidebarCollapse"><i class="ti ti-chevron-right"></i></button>

			<!-- 旗鯖fork: メニュー群はこのスクロール領域に閉じ込め、下部の投稿/アカウントは
                 固定する。メニューが増えてもノート/アカウントがスクロールで隠れない。 -->
			<div :class="[$style.sbScrollWrap, { [$style.fadeTop]: sbFadeTop, [$style.fadeBottom]: sbFadeBottom }]">
				<div ref="sbScrollEl" :class="$style.sbScroll" @scroll="onSbScroll">
					<!-- ナビ項目（prefer同期の並び順） -->
					<div :class="[$style.sbNav, $style.hssRoot]" :data-hss-mode="sidebarFolded ? 'collapsed' : 'expanded'" :style="{ '--hss-normal-columns': String(studioProfile.expanded.columns) }">
						<!-- HataSideStudio: 縮小表示は専用順序のボタンだけを必ず縦一列で描画する。
                     グループ/ウィジェットは縮小側の型に存在しないため、CSS崩れではなく構造上表示されない。 -->
						<template v-if="sidebarFolded">
							<button v-if="isExternalLinked && !studioCollapsedButtons.some(item => item.menuId === 'externalNotifications')" v-tooltip.right="copy.externalNotifications" :class="[$style.sbItem, $style.hssCollapsedItem]" @click="sidebarItemClick('externalNotifications', $event)"><i class="ti ti-bell" :class="$style.sbIcon"></i><span v-if="extNotifHasUnread" :class="$style.sbExtDot"></span></button>
							<button v-for="item in studioCollapsedButtons" v-show="studioMenuItemAvailable(item.menuId)" :key="item.id" v-tooltip.right="studioButtonLabel(item)" :class="[$style.sbItem, $style.hssCollapsedItem, { [$style.sbActive]: sidebarItemActive(item.menuId) }]" :data-hss-shape="item.shape" :style="studioItemStyle(item)" @click="studioItemClick(item, $event)">
								<i :class="[studioIcon(item), $style.sbIcon]"></i>
								<template v-if="item.menuId==='notifications' && hasUnreadNotif">
									<span v-if="showUnreadNotifCount && unreadNotifCount > 0" :class="$style.sbBadge">{{ unreadNotifCount > 99 ? '99+' : unreadNotifCount }}</span>
									<span v-else :class="$style.sbNotifDot"></span>
								</template>
								<span v-if="item.menuId==='announcements' && hasUnreadAnnouncements" :class="$style.sbDot"></span>
								<span v-if="item.menuId==='chat' && hasUnreadChat" :class="$style.sbNotifDot"></span>
							</button>
						</template>
						<template v-else>
							<button v-if="isExternalLinked && !studioExpandedMenuIds.has('externalNotifications')" :class="[$style.sbItem, { [$style.sbActive]: sidebarItemActive('externalNotifications') }]" @click="sidebarItemClick('externalNotifications', $event)"><i class="ti ti-bell" :class="$style.sbIcon"></i><span :class="$style.sbLabel">{{ copy.externalNotifications }}</span><span v-if="extNotifHasUnread" :class="$style.sbExtDot"></span></button>
							<template v-for="node in studioExpandedNodes" :key="node.id">
								<div v-if="node.type === 'group'" :class="$style.hssGroup" :data-hss-masonry="node.masonry ? 'on' : 'off'" :style="studioGroupStyle(node)">
									<div v-if="node.showName" :class="$style.hssGroupTitle">{{ getHataSideStudioGroupDisplayName(node.name) }}</div>
									<div :class="$style.hssGroupGrid" :data-hss-columns="node.columns" :style="{ '--hss-columns': String(node.columns) }">
										<template v-for="child in node.children" :key="child.id">
											<div v-if="child.type === 'button'" v-show="studioMenuItemAvailable(child.menuId)" :class="$style.hssItemSlot" :data-hss-shape="child.shape" :data-hss-size="child.size" :style="studioItemStyle(child)">
												<form v-if="isStudioSearchButton(child)" :class="[$style.sbItem, $style.hssButton, $style.hssSearchButton]" :data-hss-shape="child.shape" :data-hss-size="child.size" role="search" @submit.prevent="submitStudioSearch">
													<i :class="[studioIcon(child), $style.sbIcon]"></i>
													<input name="query" type="search" :placeholder="copy.searchPlaceholder" :aria-label="copy.searchQuery" @click.stop>
													<button type="submit" :aria-label="copy.searchSubmit" @click.stop><i class="ti ti-arrow-right"></i></button>
												</form>
												<button v-else v-tooltip.right="!child.showLabel ? studioButtonLabel(child) : null" :class="[$style.sbItem, $style.hssButton, { [$style.sbActive]: sidebarItemActive(child.menuId) }]" :data-hss-shape="child.shape" :data-hss-size="child.size" type="button" @click="studioItemClick(child, $event)">
													<i :class="[studioIcon(child), $style.sbIcon]"></i><span v-if="child.showLabel" :class="$style.sbLabel">{{ studioButtonLabel(child) }}</span><span v-if="child.size === 'large'" :class="$style.hssButtonLines"><span v-for="line in studioButtonLines(child.menuId)" :key="line">{{ line }}</span></span>
													<template v-if="child.menuId==='notifications' && hasUnreadNotif"><span v-if="showUnreadNotifCount && unreadNotifCount > 0" :class="$style.sbBadge">{{ unreadNotifCount > 99 ? '99+' : unreadNotifCount }}</span><span v-else :class="$style.sbNotifDot"></span></template>
													<span v-if="child.menuId==='announcements' && hasUnreadAnnouncements" :class="$style.sbDot"></span><span v-if="child.menuId==='chat' && hasUnreadChat" :class="$style.sbNotifDot"></span>
												</button>
												<div v-if="child.size === 'large' && studioButtonSignals(child.menuId).length" :class="$style.hssButtonSignals"><button v-for="signal in studioButtonSignals(child.menuId)" :key="signal.label" type="button" @click.stop="openStudioButtonSignal(signal)">{{ signal.label }}</button></div>
											</div>
											<div v-else :class="$style.hssWidget" :data-hss-kind="child.kind" :data-hss-content="studioWidgetContent(child)" :data-hss-shape="child.shape" :data-hss-size="child.size" :style="studioItemStyle(child)">
												<div :class="$style.hssWidgetFrame" @wheel="onStudioWidgetWheel(child.kind, $event)">
													<HataSideStudioFlowers v-if="child.kind === 'hataskFlowers' || child.kind === 'flowers'" :size="child.size"/>
													<HataSideStudioEarthquake v-else-if="child.kind === 'earthquake'" :size="child.size"/>
													<component :is="studioWidgetComponent(child)" v-else-if="studioWidgetComponent(child)" :key="studioWidgetRenderKey(child)" :widget="studioWidgetModel(child)" @updateProps="updateStudioWidgetProps(child.id, $event)"/>
													<button v-else type="button" :class="$style.hssWidgetFallback" @click="studioWidgetClick(child.kind)"><i :class="studioWidgetIcon(child.kind)"></i><span><b>{{ studioWidgetValue(child.kind) }}</b><small v-if="studioWidgetContent(child) !== 'compact'">{{ studioWidgetLabel(child) }}</small><small v-if="studioWidgetContent(child) === 'detail'">{{ studioWidgetDetail(child.kind) }}</small></span></button>
												</div>
											</div>
										</template>
									</div>
								</div>
								<div v-else-if="node.type === 'button'" v-show="studioMenuItemAvailable(node.menuId)" :class="$style.hssItemSlot" :data-hss-shape="node.shape" :data-hss-size="node.size" :style="studioItemStyle(node)">
									<form v-if="isStudioSearchButton(node)" :class="[$style.sbItem, $style.hssButton, $style.hssSearchButton]" :data-hss-shape="node.shape" :data-hss-size="node.size" role="search" @submit.prevent="submitStudioSearch">
										<i :class="[studioIcon(node), $style.sbIcon]"></i><input name="query" type="search" :placeholder="copy.searchPlaceholder" :aria-label="copy.searchQuery" @click.stop><button type="submit" :aria-label="copy.searchSubmit" @click.stop><i class="ti ti-arrow-right"></i></button>
									</form>
									<template v-else>
										<button v-tooltip.right="!node.showLabel ? studioButtonLabel(node) : null" :class="[$style.sbItem, $style.hssButton, { [$style.sbActive]: sidebarItemActive(node.menuId) }]" :data-hss-shape="node.shape" :data-hss-size="node.size" type="button" @click="studioItemClick(node, $event)"><i :class="[studioIcon(node), $style.sbIcon]"></i><span v-if="node.showLabel" :class="$style.sbLabel">{{ studioButtonLabel(node) }}</span><span v-if="node.size === 'large'" :class="$style.hssButtonLines"><span v-for="line in studioButtonLines(node.menuId)" :key="line">{{ line }}</span></span></button>
										<div v-if="node.size === 'large' && studioButtonSignals(node.menuId).length" :class="$style.hssButtonSignals"><button v-for="signal in studioButtonSignals(node.menuId)" :key="signal.label" type="button" @click.stop="openStudioButtonSignal(signal)">{{ signal.label }}</button></div>
									</template>
								</div>
								<div v-else :class="$style.hssWidget" :data-hss-kind="node.kind" :data-hss-content="studioWidgetContent(node)" :data-hss-shape="node.shape" :data-hss-size="node.size" :style="studioItemStyle(node)">
									<div :class="$style.hssWidgetFrame" @wheel="onStudioWidgetWheel(node.kind, $event)">
										<HataSideStudioFlowers v-if="node.kind === 'hataskFlowers' || node.kind === 'flowers'" :size="node.size"/>
										<HataSideStudioEarthquake v-else-if="node.kind === 'earthquake'" :size="node.size"/>
										<component :is="studioWidgetComponent(node)" v-else-if="studioWidgetComponent(node)" :key="studioWidgetRenderKey(node)" :widget="studioWidgetModel(node)" @updateProps="updateStudioWidgetProps(node.id, $event)"/>
										<button v-else type="button" :class="$style.hssWidgetFallback" @click="studioWidgetClick(node.kind)"><i :class="studioWidgetIcon(node.kind)"></i><span><b>{{ studioWidgetValue(node.kind) }}</b><small v-if="studioWidgetContent(node) !== 'compact'">{{ studioWidgetLabel(node) }}</small><small v-if="studioWidgetContent(node) === 'detail'">{{ studioWidgetDetail(node.kind) }}</small></span></button>
									</div>
								</div>
							</template>
						</template>
						<!-- 旗鯖fork: かつてここに「リロード」をハードコード表示していたが、
                     ユーザーが設定UIから非表示・並び替えできるよう、通常の sidebar 項目として
                     def.ts と sidebarItemClick map に統合した (v5 マイグレで既存ユーザーにも追加)。 -->
					</div>

					<div :class="$style.sbDivider"></div>

					<!-- 設定 & リアルタイムモード -->
					<div :class="$style.sbNav">
						<button :ref="el => { moreAnchorEl = (el as HTMLElement | null); }" v-tooltip.right="sidebarFolded ? copy.more : null" :class="$style.sbItem" @click="openMore($event)">
							<i class="ti ti-dots" :class="$style.sbIcon"></i><span :class="$style.sbLabel">{{ copy.more }}</span>
						</button>
						<button v-tooltip.right="sidebarFolded ? copy.settings : null" :class="$style.sbItem" @click="goToSettings">
							<i class="ti ti-settings" :class="$style.sbIcon"></i><span :class="$style.sbLabel">{{ copy.settings }}</span>
						</button>
						<button v-tooltip.right="sidebarFolded ? copy.realtime : null" :class="[$style.sbItem, { [$style.sbActive]: isRealtimeMode }]" @click="toggleRealtimeMode">
							<i :class="[isRealtimeMode ? 'ti ti-bolt' : 'ti ti-bolt-off', $style.sbIcon]"></i>
							<span :class="$style.sbLabel">{{ copy.realtime }}</span>
							<span :class="[$style.sbOnOff, { [$style.sbOnOffOn]: isRealtimeMode }]">{{ isRealtimeMode ? copy.on : copy.off }}</span>
						</button>
					</div>

					<!-- 管理者/モデレーター用 -->
					<template v-if="$i && ($i.isAdmin || $i.isModerator)">
						<div :class="$style.sbDivider"></div>
						<div :class="$style.sbNav">
							<button v-tooltip.right="sidebarFolded ? copy.controlPanel : null" :class="[$style.sbItem, { [$style.sbActive]: isAdminPage }]" @click="goToAdmin">
								<i class="ti ti-dashboard" :class="$style.sbIcon"></i><span :class="$style.sbLabel">{{ copy.controlPanel }}</span>
							</button>
						</div>
					</template>
				</div>
			</div>

			<!-- 下部: 投稿 + アカウント (固定) -->
			<div :class="$style.sbBottom">
				<!-- 旗鯖fork: Hataskey UIデッキUI使用中は、ノートボタンの上にリロードボタンを固定表示 -->
				<button v-if="deckActive" v-tooltip.right="sidebarFolded ? copy.reload : null" :class="$style.sbReloadBtn" @click="reloadPage($event)">
					<i class="ti ti-refresh"></i>
				</button>
				<button v-tooltip.right="sidebarFolded ? copy.note : null" :class="$style.sbPostBtn" :style="studioPostButtonStyle" data-cy-open-post-form @click="playSimpleNavMotion($event, 'post'); onPostClick()">
					<i :class="studioPostButtonIcon"></i>
				</button>
				<!-- 旗鯖fork: デッキモード切替トグル (アカウント表示の上) -->
				<div ref="deckAnchorEl" :class="$style.sbModeToggle">
					<button v-tooltip="copy.standardView" :class="[$style.sbModeBtn, { [$style.sbModeActive]: !deckMode }]" @click="setDeckMode(false)">
						<i class="ti ti-device-mobile"></i>
					</button>
					<button v-tooltip="copy.deckView" :class="[$style.sbModeBtn, { [$style.sbModeActive]: deckMode }]" @click="setDeckMode(true)">
						<i class="ti ti-layout-columns"></i>
					</button>
				</div>
				<div :class="$style.sbBottomRow">
					<button v-tooltip.right="sidebarFolded ? copy.account : null" :class="$style.sbAccount" @click="openAccountMenu">
						<img v-if="$i?.avatarUrl" :src="$i.avatarUrl" :class="$style.sbAvatarImg"/>
						<span :class="$style.sbUsername">@{{ $i?.username }}</span>
					</button>
				</div>
			</div>
		</div>
	</nav>

	<div :class="[$style.mainColumn, { [$style.mainColumnShifted]: isDesktop && userPanelUserId }]">
		<div :class="$style.mainColumnInner">
			<!-- 旗鯖fork: 上部メニューモードのナビバー(横並びピル型/常時固定)。デッキ併用時はこの下にデッキツールバーが来る。 -->
			<nav v-if="topNavActive" data-htk-weather-footer :class="[$style.topNav, { [$style.topNavSolid]: !glassEffect }]">
				<button v-tooltip="instance.name ?? copy.instance" :class="$style.topNavLogo" @click="playSimpleNavMotion($event, 'layout'); openInstanceMenuMobile($event)">
					<img v-if="instance.iconUrl" :src="instance.iconUrl" :class="$style.topNavLogoImg"/>
					<i v-else class="ti ti-server"></i>
				</button>
				<button v-tooltip="isRealtimeMode ? copy.realtimeOn : copy.realtimeOff" :class="[$style.topNavItem, { [$style.topNavItemActive]: isRealtimeMode }]" @click="playSimpleNavMotion($event, 'realtime'); toggleRealtimeMode()">
					<i :class="isRealtimeMode ? 'ti ti-bolt' : 'ti ti-bolt-off'"></i><span>{{ copy.realtime }}</span>
				</button>
				<div :class="$style.topNavDivider"></div>
				<div :class="$style.topNavScroll" @wheel.prevent="onTopNavWheel">
					<template v-for="grp in sidebarGroups" :key="grp.key">
						<button v-for="item in grp.items" :key="item.id" v-tooltip="simpleMenuDisplayLabel(item.id, item.label)" :class="[$style.topNavItem, { [$style.topNavItemActive]: sidebarItemActive(item.id) }]" @click="sidebarItemClick(item.id, $event)">
							<i :class="item.icon"></i><span>{{ simpleMenuDisplayLabel(item.id, item.label) }}</span>
							<span v-if="item.id==='notifications' && hasUnreadNotif" :class="$style.topNavDot"></span>
							<span v-if="item.id==='announcements' && hasUnreadAnnouncements" :class="$style.topNavDot"></span>
							<span v-if="item.id==='chat' && hasUnreadChat" :class="$style.topNavDot"></span>
							<span v-if="item.id==='externalNotifications' && extNotifHasUnread" :class="$style.topNavDotBlue"></span>
						</button>
					</template>
					<!-- 旗鯖fork: かつて「もっと」の右にリロードボタンをハードコード表示していたが、
                     sidebar 項目化したため上の v-for に統合済み(reload を非表示にしてれば出ない)。 -->
					<button v-if="$i && ($i.isAdmin || $i.isModerator)" v-tooltip="copy.controlPanel" :class="[$style.topNavItem, { [$style.topNavItemActive]: isAdminPage }]" @click="playSimpleNavMotion($event, 'admin'); goToAdmin()"><i class="ti ti-dashboard"></i><span>{{ copy.adminShort }}</span></button>
				</div>
				<div :class="$style.topNavDivider"></div>
				<button v-if="deckActive" v-tooltip="copy.deckSettings" :class="$style.topNavItem" @click="playSimpleNavMotion($event, 'deck'); globalEvents.emit('toggleDeckToolbar')"><i class="ti ti-layout-board"></i><span>{{ copy.deckShort }}</span></button>
				<button v-tooltip="copy.settings" :class="$style.topNavItem" @click="playSimpleNavMotion($event, 'settings'); goToSettings()"><i class="ti ti-settings"></i><span>{{ copy.settings }}</span></button>
				<button v-tooltip="copy.note" :class="$style.topNavPost" data-cy-open-post-form @click="playSimpleNavMotion($event, 'post'); onPostClick()"><i class="ti ti-pencil"></i><span>{{ copy.note }}</span></button>
				<button :class="$style.topNavAvatar" @click="openAccountMenu"><MkAvatar v-if="$i" :user="$i" :class="$style.topNavAvatarImg"/></button>
			</nav>
			<!-- Top pill navbar (timeline tabs) - scroll reactive -->
			<div v-show="(!isPageView || isCollectionTimelinePage) && !deckActive" :class="[$style.topBar, footerIsDark ? $style.topBarDark : $style.topBarLight, { [$style.topBarHidden]: !showTopBar }]">
				<button v-if="!isDesktop" :class="$style.avatarBtn" @click="openAccountMenu">
					<img v-if="$i?.avatarUrl" :src="$i.avatarUrl" :class="$style.avatarImg"/>
					<i v-else class="ti ti-user"></i>
				</button>
				<div ref="topNavStackEl" :class="$style.topNavStack">
					<div :class="$style.topPill">
						<template v-for="item in visibleTopTabs" :key="item.id">
							<button :class="[$style.topTabBtn, { [$style.topTabActive]: !isCollectionTimelinePage && tab === item.id }]" @click="playSimpleNavMotion($event, item.id); switchTab(item.id as TabType)">
								<i :class="item.icon"></i>
								<span v-if="!isCollectionTimelinePage && tab === item.id" :class="$style.topTabLabel">{{ simpleMenuDisplayLabel(item.id, item.label) }}</span>
							</button>
						</template>
						<button v-if="showOHTL" :class="[$style.topTabBtn, $style.topTabExt, { [$style.topTabActive]: !isCollectionTimelinePage && tab === 'ohtl' }]" @click="playSimpleNavMotion($event, 'timeline:external-home'); switchTab('ohtl')">
							<i class="ti ti-home"></i>
							<span v-if="!isCollectionTimelinePage && tab === 'ohtl'" :class="$style.topTabLabel">{{ copy.externalHome }}</span>
						</button>
						<button v-if="showOLTL" :class="[$style.topTabBtn, $style.topTabExt, { [$style.topTabActive]: !isCollectionTimelinePage && tab === 'oltl' }]" @click="playSimpleNavMotion($event, 'timeline:external-local'); switchTab('oltl')">
							<i class="ti ti-planet"></i>
							<span v-if="!isCollectionTimelinePage && tab === 'oltl'" :class="$style.topTabLabel">{{ copy.externalLocal }}</span>
						</button>
						<div :class="$style.topTabDivider"></div>
						<div :class="[$style.listTabPill, { [$style.listTabPillActive]: isListTimelinePage }]">
							<button :class="[$style.topTabBtn, $style.listTabMain, { [$style.topTabActive]: isListTimelinePage }]" @click="playSimpleNavMotion($event, 'list'); openPreferredList()">
								<i class="ti ti-list"></i>
								<span v-if="isListTimelinePage" :class="$style.topTabCopy"><span :class="$style.topTabLabel">{{ copy.list }}</span><span :class="$style.topTabName">{{ activeListName }}</span></span>
							</button>
							<button v-if="isListTimelinePage" v-tooltip="copy.switchList" :class="$style.listSelectBtn" :aria-label="copy.switchList" @click="playSimpleNavMotion($event, 'list'); toggleTimelinePicker('list')">
								<i class="ti ti-selector"></i>
							</button>
							<button v-if="isListTimelinePage" v-tooltip="copy.configureList" :class="$style.listSelectBtn" :aria-label="copy.configureList" @click="playSimpleNavMotion($event, 'settings'); openActiveCollectionSettings('list')"><i class="ti ti-settings"></i></button>
						</div>
						<button :class="[$style.topTabBtn, { [$style.topTabActive]: isChannelPage }]" @click="playSimpleNavMotion($event, 'channel'); goToChannels()">
							<i class="ti ti-device-tv"></i>
							<span v-if="isChannelPage" :class="$style.topTabLabel">{{ copy.channel }}</span>
						</button>
						<div :class="[$style.listTabPill, { [$style.listTabPillActive]: isAntennaTimelinePage }]">
							<button :class="[$style.topTabBtn, $style.listTabMain, { [$style.topTabActive]: isAntennaTimelinePage }]" @click="playSimpleNavMotion($event, 'antenna'); openPreferredAntenna()">
								<i class="ti ti-antenna"></i>
								<span v-if="isAntennaTimelinePage" :class="$style.topTabCopy"><span :class="$style.topTabLabel">{{ copy.antenna }}</span><span :class="$style.topTabName">{{ activeAntennaName }}</span></span>
							</button>
							<button v-if="isAntennaTimelinePage" v-tooltip="copy.switchAntenna" :class="$style.listSelectBtn" :aria-label="copy.switchAntenna" @click="playSimpleNavMotion($event, 'antenna'); toggleTimelinePicker('antenna')"><i class="ti ti-selector"></i></button>
							<button v-if="isAntennaTimelinePage" v-tooltip="copy.configureAntenna" :class="$style.listSelectBtn" :aria-label="copy.configureAntenna" @click="playSimpleNavMotion($event, 'settings'); openActiveCollectionSettings('antenna')"><i class="ti ti-settings"></i></button>
						</div>
					</div>
					<div v-if="timelinePickerKind" :class="$style.timelinePicker" :aria-label="timelinePickerKind === 'list' ? copy.selectList : copy.selectAntenna">
						<div v-if="timelinePickerItems.length === 0" :class="$style.timelinePickerEmpty">
							<span>{{ timelinePickerKind === 'list' ? copy.noLists : copy.noAntennas }}</span>
							<button :class="$style.timelinePickerOptions" @click="playSimpleNavMotion($event, 'settings'); openEmptyCollectionOptions()">
								<i class="ti ti-settings"></i><span>{{ copy.options }}</span>
							</button>
						</div>
						<button v-for="item in timelinePickerItems" :key="item.id" :class="[$style.timelinePickerItem, { [$style.timelinePickerItemActive]: item.id === activeCollectionId }]" @click="playSimpleNavMotion($event, timelinePickerKind === 'list' ? 'list' : 'antenna'); selectTimelineCollection(item.id)">
							<i :class="timelinePickerKind === 'list' ? 'ti ti-list' : 'ti ti-antenna'"></i><span>{{ item.name }}</span>
						</button>
					</div>
				</div>
			</div>
			<!-- Page view header -->
			<header v-show="isPageView && showPageHeader && !isCollectionTimelinePage && !isSettingsPage" :class="$style.pageHeader">
				<button :class="$style.pageBackBtn" @click="goBack"><i class="ti ti-chevron-left"></i></button>
				<div :class="$style.pageTitle">{{ pageMetadata?.title ?? '' }}</div>
				<div style="width: 38px;"></div>
			</header>

			<!-- 旗鯖fork: 通常表示(デッキUIではない)タイムラインの背景にヘッダー画像のぼかしを敷く(無効化可)。
             .content(スクロール領域)の外、.mainColumnInner 直下に置くことで、タイムラインを
             スクロールしても背景が流れず固定表示される(デッキ版の .deckBanner と同じ考え方)。 -->
			<div v-if="timelineGlassBg && $i?.bannerUrl" :class="$style.timelineBanner">
				<img :src="$i.bannerUrl" :class="$style.timelineBannerImg"/>
			</div>
			<div ref="contentEl" :class="$style.content" @scroll="onContentScroll" @wheel="onContentWheel">
				<Transition :name="$style.tlFade" mode="out-in">
					<div v-show="!isPageView && !deckActive" :key="tab + String(withRenotes) + String(withSensitive) + String(onlyFiles)" :class="$style.timelineContainer" :data-glass-bg="timelineGlassBg ? 'on' : undefined" @touchstart="onTouchStart" @touchend="onTouchEnd">
						<!-- 旗鯖fork: 「タイムライン上部に投稿フォームを表示する」設定がONのとき、外部TL以外でMkPostFormを表示 -->
						<MkPostForm v-if="showFixedPostForm && !isExternalTab" :class="$style.fixedPostForm" class="_panel" fixed/>
						<KeepAlive>
							<MkStreamingNotesTimeline v-if="tab === 'mixed'" key="mixed" src="global" :withRenotes="withRenotes" :withSensitive="withSensitive" :onlyFiles="onlyFiles" :glassBg="timelineGlassBg"/>
							<MkStreamingNotesTimeline v-else-if="tab === 'local'" key="local" src="local" :withRenotes="withRenotes" :withSensitive="withSensitive" :onlyFiles="onlyFiles" :glassBg="timelineGlassBg"/>
							<MkStreamingNotesTimeline v-else-if="tab === 'social'" key="social" src="social" :withRenotes="withRenotes" :withSensitive="withSensitive" :onlyFiles="onlyFiles" :glassBg="timelineGlassBg"/>
							<MkStreamingNotesTimeline v-else-if="tab === 'following'" key="following" src="home" :withRenotes="withRenotes" :withSensitive="withSensitive" :onlyFiles="onlyFiles" :glassBg="timelineGlassBg"/>
							<MkExternalTimeline v-else-if="tab === 'ohtl' && externalHost && externalToken" key="ohtl" src="ohtl" :host="externalHost" :token="externalToken" :sound="true" :simpleUi="true"/>
							<MkExternalTimeline v-else-if="tab === 'oltl' && externalHost && externalToken" key="oltl" src="oltl" :host="externalHost" :token="externalToken" :sound="true" :simpleUi="true"/>
							<!-- 旗鯖fork: トレンドタイムライン (TTL) -->
							<MkTrendingTimeline v-else-if="tab === 'trending'" key="trending" :glassBg="timelineGlassBg"/>
						</KeepAlive>
					</div>
				</Transition>
				<!-- 旗鯖fork: デッキモード (デスクトップのみ)。背景にヘッダー画像のぼかしを敷く(無効化可) -->
				<div v-if="deckActive" :class="$style.deckArea">
					<div v-if="glassEffect && !deckNoBannerBg && $i?.bannerUrl" :class="$style.deckBanner">
						<img :src="$i.bannerUrl" :class="$style.deckBannerImg"/>
					</div>
					<HatasabaDeck :class="$style.deckAreaInner"/>
				</div>
				<div v-show="isPageView" :class="[$style.pageContainer, { [$style.collectionPageContainer]: isCollectionTimelinePage }]"><RouterView/></div>
			</div>

			<!-- 通常TL: ナビバー（モバイルのみ） -->
			<div v-show="!isDesktop && !isHataskPage && !isExternalTab && !isChannelDetailPage && (!isPageView || bottomNavHasPage) && !userPanelUserId" data-htk-weather-footer :class="[$style.bottomBar, footerIsDark ? $style.bottomBarDark : $style.bottomBarLight, { [$style.bottomBarHidden]: !showBottomBar || widgetsShowing }]">
				<button v-if="!isDesktop" :class="$style.sideBtn" @click="playSimpleNavMotion($event, 'layout'); simpleDrawerShowing = true"><i class="ti ti-menu-2"></i></button>
				<div :class="$style.navPill">
					<template v-for="item in visibleBottomNav" :key="item.id">
						<button v-if="item.id==='search'" :class="[$style.navBtn, { [$style.navActive]: isSearchPage }]" @click="playSimpleNavMotion($event, 'search'); openSearch()"><i class="ti ti-search"></i></button>
						<button v-else-if="item.id==='home'" :class="[$style.navBtn, { [$style.navActive]: isHomeTL }]" @click="playSimpleNavMotion($event, 'home'); goHome()"><i class="ti ti-home"></i></button>
						<button v-else-if="item.id==='notifications'" :class="[$style.navBtn, { [$style.navActive]: isNotifPage }]" @click="playSimpleNavMotion($event, 'notifications'); goToNotifications()">
							<i class="ti ti-bell"></i>
							<template v-if="hasUnreadNotif">
								<span v-if="showUnreadNotifCount && unreadNotifCount > 0" :class="$style.badgeCount">{{ unreadNotifCount > 99 ? '99+' : unreadNotifCount }}</span>
								<span v-else :class="$style.badge"></span>
							</template>
						</button>
						<button v-else-if="item.id==='hatask'" :class="[$style.navBtn, { [$style.navActive]: isHataskPage }]" @click="playSimpleNavMotion($event, 'hatask'); goToHatask()"><i class="ti ti-eye"></i></button>
						<button v-else-if="item.id==='hatady'" :class="[$style.navBtn, { [$style.navActive]: isHatadyPage }]" @click="playSimpleNavMotion($event, 'hatady'); goToHatady()"><i class="ti ti-book-2"></i></button>
						<button v-else-if="item.id==='hatafeed'" :class="[$style.navBtn, { [$style.navActive]: isHataFeedPage }]" @click="playSimpleNavMotion($event, 'hatafeed'); goToHataFeed()"><i class="ti ti-message-report"></i></button>
						<button v-else-if="item.id==='widgets'" :class="$style.navBtn" @click="playSimpleNavMotion($event, 'widgets'); widgetsShowing = true"><i class="ti ti-apps"></i></button>
					</template>
				</div>
				<button v-if="!isPageView || isCollectionTimelinePage" :class="$style.sideBtn" data-cy-open-post-form @click="playSimpleNavMotion($event, 'post'); onPostClick()"><i class="ti ti-pencil"></i></button>
				<div v-else style="width:48px;"></div>
			</div>

			<!-- 外部TL: 投稿 & 通知ボタン（モバイルのみ） -->
			<div v-show="!isDesktop && isExternalTab && !isPageView && !userPanelUserId" data-htk-weather-footer :class="[$style.bottomBar, footerIsDark ? $style.bottomBarDark : $style.bottomBarLight, { [$style.bottomBarHidden]: !showBottomBar }]">
				<button v-if="!isDesktop" :class="$style.sideBtn" @click="playSimpleNavMotion($event, 'layout'); simpleDrawerShowing = true"><i class="ti ti-menu-2"></i></button>
				<div :class="$style.navPill">
					<!-- 旗鯖fork: 外部通知ボタン (連携ON時のみ)。通知→ノート作成の順で横一列。
                     新着がある場合は青ドット表示。押下で専用ページへ遷移しバッジ強制解除。 -->
					<button v-if="isExternalLinked" :class="$style.navBtn" @click="playSimpleNavMotion($event, 'notifications'); goToExternalNotifications()">
						<i class="ti ti-bell"></i>
						<span v-if="extNotifHasUnread" :class="$style.extDot"></span>
					</button>
					<button :class="$style.navBtn" @click="playSimpleNavMotion($event, 'post'); onExtPostClick()"><i class="ti ti-pencil"></i></button>
				</div>
			</div>
		</div>

		<!-- デスクトップ: ユーザーパネル（TL横に表示） -->
		<div v-if="isDesktop && userPanelUserId" :class="$style.userPanelDesktop">
			<MkSimpleUserPanel :userId="userPanelUserId" :isMobile="false" :inline="true" @close="userPanelUserId = null"/>
		</div>
	</div>

	<!-- モバイル: ユーザーパネル（フルスクリーンオーバーレイ） -->
	<Teleport to="body">
		<div v-if="!isDesktop && userPanelUserId" :class="$style.userPanelMobileOverlay" @click.self="userPanelUserId = null">
			<MkSimpleUserPanel :userId="userPanelUserId" :isMobile="true" :inline="true" @close="userPanelUserId = null"/>
		</div>
	</Teleport>

	<!-- 旗鯖fork: お知らせ吹き出しは body 直下に Teleport し、サイドメニューの overflow/スタッキングを回避 -->
	<Teleport to="body">
		<div v-if="deckAnnounceVisible && deckAnnPos" :class="$style.sbAnnounce" :style="{ top: deckAnnPos.top + 'px', left: deckAnnPos.left + 'px' }">
			<div :class="$style.sbAnnounceText">{{ copy.deckAddedAnnouncement }}</div>
			<button :class="$style.sbAnnounceClose" @click="dismissDeckAnnounce"><i class="ti ti-x"></i></button>
			<div :class="$style.sbAnnounceArrow"></div>
		</div>
		<div v-if="collapseAnnounceVisible && collapseAnnPos && !sidebarCollapsed && !deckActive" :class="$style.sbAnnounce" :style="{ top: collapseAnnPos.top + 'px', left: collapseAnnPos.left + 'px' }">
			<div :class="$style.sbAnnounceText">{{ copy.collapseAnnouncement }}</div>
			<button :class="$style.sbAnnounceClose" @click="dismissCollapseAnnounce"><i class="ti ti-x"></i></button>
			<div :class="$style.sbAnnounceArrow"></div>
		</div>
		<!-- 旗鯖fork: HataFeed/地震・津波情報の新機能案内(「もっと」内のメニューを案内・端末ごと1回)
             法的安全性のためクリックでは遷移しないお知らせのみ(気象業務法上の独自警報化リスク回避) -->
		<div v-if="moreAnnounceVisible && moreAnnPos" :class="$style.sbAnnounce" :style="{ top: moreAnnPos.top + 'px', left: moreAnnPos.left + 'px' }">
			<div :class="$style.sbAnnounceText">{{ copy.hataFeedMoreAnnouncement }} 気象庁発表の地震・津波情報も「もっと！」から確認できます</div>
			<button :class="$style.sbAnnounceClose" @click.stop="dismissMoreAnnounce"><i class="ti ti-x"></i></button>
			<div :class="$style.sbAnnounceArrow"></div>
		</div>
	</Teleport>

	<!-- モバイル: オリジナルドロワーメニュー -->
	<Teleport to="body">
		<Transition name="simple-drawer-bg">
			<div v-if="simpleDrawerShowing" :class="$style.drawerBg" @click="simpleDrawerShowing = false"></div>
		</Transition>
		<Transition name="simple-drawer">
			<nav v-if="simpleDrawerShowing" :class="[$style.drawerNav, { [$style.drawerNavSolid]: !glassEffect }]">
				<!-- ヘッダー背景（すりガラス） -->
				<div v-if="glassEffect" :class="$style.drawerBanner">
					<img v-if="$i?.bannerUrl" :src="$i.bannerUrl" :class="$style.drawerBannerImg"/>
				</div>
				<div :class="$style.sidebarInner">
					<div :class="$style.sbLogoRow">
						<div :class="$style.sbLogo" @click="openInstanceMenuMobile">
							<img v-if="instanceIconUrl" :src="instanceIconUrl" :class="$style.sbLogoImg"/>
							<div :class="$style.sbLogoWrap">
								<span :class="$style.sbLogoSub">{{ copy.hereIs }}</span>
								<span :class="$style.sbLogoText">{{ instanceNameStr }}</span>
							</div>
						</div>
						<button :class="$style.sbLogoAction" @click="openTlOptions"><i class="ti ti-adjustments"></i></button>
					</div>
					<!-- 旗鯖fork: メニュー群をスクロール領域に、下部の投稿/アカウントを固定 -->
					<div :class="$style.sbScroll">
						<!-- モバイルもHataSideStudioの拡大プロファイルを正本として描画する。 -->
						<div :class="[$style.sbNav, $style.hssRoot, $style.hssMobileRoot]" data-hss-mode="expanded" :style="{ '--hss-normal-columns': String(studioProfile.expanded.columns) }">
							<button v-if="isExternalLinked && !studioExpandedMenuIds.has('externalNotifications')" :class="[$style.sbItem, { [$style.sbActive]: sidebarItemActive('externalNotifications') }]" @click="sidebarItemClick('externalNotifications', $event)"><i class="ti ti-bell" :class="$style.sbIcon"></i><span :class="$style.sbLabel">{{ copy.externalNotifications }}</span><span v-if="extNotifHasUnread" :class="$style.sbExtDot"></span></button>
							<template v-for="node in studioExpandedNodes" :key="node.id">
								<div v-if="node.type === 'group'" :class="$style.hssGroup" :data-hss-masonry="node.masonry ? 'on' : 'off'" :style="studioGroupStyle(node)">
									<div v-if="node.showName" :class="$style.hssGroupTitle">{{ getHataSideStudioGroupDisplayName(node.name) }}</div>
									<div :class="$style.hssGroupGrid" :data-hss-columns="node.columns" :style="{ '--hss-columns': String(node.columns) }">
										<template v-for="child in node.children" :key="child.id">
											<div v-if="child.type === 'button'" v-show="studioMenuItemAvailable(child.menuId)" :class="$style.hssItemSlot" :data-hss-shape="child.shape" :data-hss-size="child.size" :style="studioItemStyle(child)">
												<form v-if="isStudioSearchButton(child)" :class="[$style.sbItem, $style.hssButton, $style.hssSearchButton]" :data-hss-shape="child.shape" :data-hss-size="child.size" role="search" @submit.prevent="submitStudioMobileSearch"><i :class="[studioIcon(child), $style.sbIcon]"></i><input name="query" type="search" :placeholder="copy.searchPlaceholder" :aria-label="copy.searchQuery" @click.stop><button type="submit" :aria-label="copy.searchSubmit" @click.stop><i class="ti ti-arrow-right"></i></button></form>
												<button v-else v-tooltip.right="!child.showLabel ? studioButtonLabel(child) : null" :class="[$style.sbItem, $style.hssButton, { [$style.sbActive]: sidebarItemActive(child.menuId) }]" :data-hss-shape="child.shape" :data-hss-size="child.size" type="button" @click="studioItemClick(child, $event)"><i :class="[studioIcon(child), $style.sbIcon]"></i><span v-if="child.showLabel" :class="$style.sbLabel">{{ studioButtonLabel(child) }}</span><span v-if="child.size === 'large'" :class="$style.hssButtonLines"><span v-for="line in studioButtonLines(child.menuId)" :key="line">{{ line }}</span></span><template v-if="child.menuId==='notifications' && hasUnreadNotif"><span v-if="showUnreadNotifCount && unreadNotifCount > 0" :class="$style.sbBadge">{{ unreadNotifCount > 99 ? '99+' : unreadNotifCount }}</span><span v-else :class="$style.sbNotifDot"></span></template><span v-if="child.menuId==='announcements' && hasUnreadAnnouncements" :class="$style.sbDot"></span><span v-if="child.menuId==='chat' && hasUnreadChat" :class="$style.sbNotifDot"></span></button>
											</div>
											<div v-else :class="$style.hssWidget" :data-hss-kind="child.kind" :data-hss-content="studioWidgetContent(child)" :data-hss-shape="child.shape" :data-hss-size="child.size" :style="studioItemStyle(child)"><div :class="$style.hssWidgetFrame" @wheel="onStudioWidgetWheel(child.kind, $event)"><HataSideStudioFlowers v-if="child.kind === 'hataskFlowers' || child.kind === 'flowers'" :size="child.size"/><HataSideStudioEarthquake v-else-if="child.kind === 'earthquake'" :size="child.size"/><component :is="studioWidgetComponent(child)" v-else-if="studioWidgetComponent(child)" :key="studioWidgetRenderKey(child)" :widget="studioWidgetModel(child)" @updateProps="updateStudioWidgetProps(child.id, $event)"/><button v-else type="button" :class="$style.hssWidgetFallback" @click="studioWidgetClick(child.kind)"><i :class="studioWidgetIcon(child.kind)"></i><span><b>{{ studioWidgetValue(child.kind) }}</b><small>{{ studioWidgetLabel(child) }}</small></span></button></div></div>
										</template>
									</div>
								</div>
								<div v-else-if="node.type === 'button'" v-show="studioMenuItemAvailable(node.menuId)" :class="$style.hssItemSlot" :data-hss-shape="node.shape" :data-hss-size="node.size" :style="studioItemStyle(node)">
									<form v-if="isStudioSearchButton(node)" :class="[$style.sbItem, $style.hssButton, $style.hssSearchButton]" :data-hss-shape="node.shape" :data-hss-size="node.size" role="search" @submit.prevent="submitStudioMobileSearch"><i :class="[studioIcon(node), $style.sbIcon]"></i><input name="query" type="search" :placeholder="copy.searchPlaceholder" :aria-label="copy.searchQuery" @click.stop><button type="submit" :aria-label="copy.searchSubmit" @click.stop><i class="ti ti-arrow-right"></i></button></form>
									<button v-else v-tooltip.right="!node.showLabel ? studioButtonLabel(node) : null" :class="[$style.sbItem, $style.hssButton, { [$style.sbActive]: sidebarItemActive(node.menuId) }]" :data-hss-shape="node.shape" :data-hss-size="node.size" type="button" @click="studioItemClick(node, $event)"><i :class="[studioIcon(node), $style.sbIcon]"></i><span v-if="node.showLabel" :class="$style.sbLabel">{{ studioButtonLabel(node) }}</span><span v-if="node.size === 'large'" :class="$style.hssButtonLines"><span v-for="line in studioButtonLines(node.menuId)" :key="line">{{ line }}</span></span></button>
								</div>
								<div v-else :class="$style.hssWidget" :data-hss-kind="node.kind" :data-hss-content="studioWidgetContent(node)" :data-hss-shape="node.shape" :data-hss-size="node.size" :style="studioItemStyle(node)"><div :class="$style.hssWidgetFrame" @wheel="onStudioWidgetWheel(node.kind, $event)"><HataSideStudioFlowers v-if="node.kind === 'hataskFlowers' || node.kind === 'flowers'" :size="node.size"/><HataSideStudioEarthquake v-else-if="node.kind === 'earthquake'" :size="node.size"/><component :is="studioWidgetComponent(node)" v-else-if="studioWidgetComponent(node)" :key="studioWidgetRenderKey(node)" :widget="studioWidgetModel(node)" @updateProps="updateStudioWidgetProps(node.id, $event)"/><button v-else type="button" :class="$style.hssWidgetFallback" @click="studioWidgetClick(node.kind)"><i :class="studioWidgetIcon(node.kind)"></i><span><b>{{ studioWidgetValue(node.kind) }}</b><small>{{ studioWidgetLabel(node) }}</small></span></button></div></div>
							</template>
						</div>
						<div :class="$style.sbDivider"></div>
						<div :class="$style.sbNav">
							<button data-hatasaba-mobile-more type="button" :class="$style.sbItem" @click="openMore($event, true)">
								<i class="ti ti-dots" :class="$style.sbIcon"></i><span :class="$style.sbLabel">{{ copy.more }}</span>
							</button>
							<button :class="$style.sbItem" @click="goToSettings(); simpleDrawerShowing = false">
								<i class="ti ti-settings" :class="$style.sbIcon"></i><span :class="$style.sbLabel">{{ copy.settings }}</span>
							</button>
							<button :class="[$style.sbItem, { [$style.sbActive]: isRealtimeMode }]" @click="toggleRealtimeMode">
								<i :class="[isRealtimeMode ? 'ti ti-bolt' : 'ti ti-bolt-off', $style.sbIcon]"></i>
								<span :class="$style.sbLabel">{{ copy.realtime }}</span>
								<span :class="[$style.sbToggle, { [$style.sbToggleOn]: isRealtimeMode }]"></span>
							</button>
						</div>
						<template v-if="$i && ($i.isAdmin || $i.isModerator)">
							<div :class="$style.sbDivider"></div>
							<div :class="$style.sbNav">
								<button :class="[$style.sbItem, { [$style.sbActive]: isAdminPage }]" @click="goToAdmin(); simpleDrawerShowing = false">
									<i class="ti ti-dashboard" :class="$style.sbIcon"></i><span :class="$style.sbLabel">{{ copy.controlPanel }}</span>
								</button>
							</div>
						</template>
					</div>
					<div :class="$style.sbBottom">
						<button :class="$style.sbPostBtn" :style="studioPostButtonStyle" @click="playSimpleNavMotion($event, 'post'); onPostClick(); simpleDrawerShowing = false">
							<i :class="studioPostButtonIcon"></i><span>{{ copy.note }}</span>
						</button>
						<div :class="$style.sbBottomRow">
							<button :class="$style.sbAccount" @click="openAccountMenu">
								<img v-if="$i?.avatarUrl" :src="$i.avatarUrl" :class="$style.sbAvatarImg"/>
								<span :class="$style.sbUsername">@{{ $i?.username }}</span>
							</button>
						</div>
					</div>
				</div>
			</nav>
		</Transition>
	</Teleport>

	<!-- PC/タブレット: 右ウィジェットバー -->
	<!-- 旗鯖fork: 折りたたみ端末の広い面でも、このバーだけPCと同じ構成・同じ表示で常時出す。
	     ⚠️isDesktop は広げない(下部ナビ等までPC化して「モバイル表示のまま」が崩れるため)。 -->
	<div v-if="(isDesktop || isFoldableWide) && !deckActive" :class="[$style.desktopWidgets, { [$style.desktopWidgetsSolid]: !glassEffect }]" :data-widget-border="showWidgetBorder ? 'on' : 'off'">
		<div v-if="glassEffect" :class="$style.desktopWidgetsBanner">
			<img v-if="$i?.bannerUrl" :src="$i.bannerUrl" :class="$style.desktopWidgetsBannerImg"/>
		</div>
		<div :class="$style.desktopWidgetsInner">
			<XWidgets/>
		</div>
	</div>

	<XCommon v-model:widgetsShowing="widgetsShowing"/>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, provide, onMounted, onUnmounted, nextTick, defineAsyncComponent, watch } from 'vue';
import { instanceName } from '@@/js/config.js';
import XCommon from './_common_/common.vue';
import type { PageMetadata } from '@/page.js';
import type { TimelineCollectionKind } from '@/utility/hatasaba-navigation.js';
import type { HataSideButton, HataSideGroup, HataSideWidget, HataSideWidgetKind } from '@/utility/hata-side-studio.js';
import { globalEvents } from '@/events.js';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import { SIDEBAR_ICON_OVERRIDES } from '@/utility/sidebar-icon-overrides.js';
import { navbarItemDef } from '@/navbar.js';
import MkExternalTimeline from '@/components/MkExternalTimeline.vue';
import HataSideStudioEarthquake from '@/components/HataSideStudioEarthquake.vue';
import HataSideStudioFlowers from '@/components/HataSideStudioFlowers.vue';
import { getHataSideWidgetDisplayLabel, HATA_SIDE_WIDGET_REGISTRY } from '@/utility/hata-side-studio-widgets.js';
import { useFoldableScrollAnchor, useFoldableWide } from '@/utility/hata-foldable.js';
// 旗鯖fork: トレンドタイムライン (TTL)
import MkTrendingTimeline from '@/components/MkTrendingTimeline.vue';
import { provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import { mainRouter } from '@/router.js';
import { DI } from '@/di.js';
import * as os from '@/os.js';
import { useStream } from '@/stream.js';
import { $i } from '@/i.js';
import { antennasCache, userListsCache } from '@/cache.js';
import { deckIgnoreWidth, glassUiLocal, tabSwipeEnabled } from '@/utility/hatasaba-device-prefs.js';
import { hatadyTzOffset } from '@/utility/hatady-prefs.js';
import { prefer } from '@/preferences.js';
import { cleanupStaleUiElements } from '@/utility/ui-cleanup.js';
import { clearCache } from '@/utility/clear-cache.js';
import { playHataIconMotion, playHataNavigationMotion } from '@/utility/hata-icon-motion.js';
import { getAccountMenu } from '@/accounts.js';
import { instance } from '@/instance.js';
import { store } from '@/store.js';
import { deepMerge } from '@/utility/merge.js';
import { i18n } from '@/i18n.js';
import { versatileLang } from '@/utility/intl-const.js';
import { openInstanceMenu, showLoginBonusIfNeeded } from '@/ui/_common_/common.js';
import { miLocalStorage } from '@/local-storage.js';
import { getPreferredTimelinePath, getVisibleBottomNav, isAntennaTimelinePath, isListTimelinePath } from '@/utility/hatasaba-navigation.js';
import {
	applyHataSideStudioStore, cloneHataSideStudioStore, ensureHataSideStudioInitialized,
	getActiveHataSideProfile, getHataSideStudioGroupDisplayName, getHataSideStudioMenuDisplayLabel, gradientCss, hataSideStudioStore,
} from '@/utility/hata-side-studio.js';

const XWidgets = defineAsyncComponent(() => import('./_common_/widgets.vue'));
const HatasabaDeck = defineAsyncComponent(() => import('./_common_/hatasaba-deck.vue'));
const MkSimpleUserPanel = defineAsyncComponent(() => import('@/components/MkSimpleUserPanel.vue'));
// 旗鯖fork: 「タイムライン上部に投稿フォームを表示する」設定で使用
const MkPostForm = defineAsyncComponent(() => import('@/components/MkPostForm.vue'));
const copy = i18n.ts._hata._hatasabaUi._simple;
const copyx = i18n.tsx._hata._hatasabaUi._simple;
const simpleNumberFormatter = new Intl.NumberFormat(versatileLang);
const simpleClockFormatter = new Intl.DateTimeFormat(versatileLang, { hour: '2-digit', minute: '2-digit' });
const simpleShortDateFormatter = new Intl.DateTimeFormat(versatileLang, { month: 'short', day: 'numeric', weekday: 'short' });

const SIMPLE_MENU_STORAGE_LABELS: Readonly<Record<string, string>> = {
	following: 'ホーム',
	home: 'ホーム',
	local: 'ローカル',
	social: 'ソーシャル',
	mixed: 'グローバル',
	trending: 'トレンド',
	timeline: 'タイムライン',
	search: '検索',
	notifications: '通知',
	chat: 'メッセージ',
	announcements: 'お知らせ',
	drive: 'ドライブ',
	favorites: 'お気に入り',
	hatask: 'Hatask',
	hatafeed: 'HataFeed',
	hatady: 'Hatady',
	earthquake: '地震・津波情報',
	uiSetup: 'UI切り替え',
	explore: 'みつける',
	followRequests: 'フォロー申請',
	channels: 'チャンネル',
	more: 'もっと',
	reload: 'リロード',
	cacheClear: 'キャッシュをクリア',
	externalNotifications: '外部通知',
};

function simpleMenuDisplayLabel(id: string, storedLabel?: string): string {
	const canonical = SIMPLE_MENU_STORAGE_LABELS[id];
	const fallback = typeof storedLabel === 'string' && storedLabel.length > 0 ? storedLabel : canonical ?? id;
	if (id === 'earthquake' || canonical == null) return fallback;
	if (typeof storedLabel === 'string' && storedLabel.length > 0 && storedLabel !== canonical) return storedLabel;
	return (copy.menuLabels as Record<string, string>)[id] ?? getHataSideStudioMenuDisplayLabel(id, fallback);
}

function studioButtonLabel(item: HataSideButton): string {
	return simpleMenuDisplayLabel(item.menuId, getHataSideStudioMenuDisplayLabel(item.menuId, item.label));
}

function studioWidgetLabel(item: HataSideWidget): string {
	return getHataSideWidgetDisplayLabel(item.kind, item.label);
}

provide(DI.router, mainRouter);

const pageMetadata = ref<null | PageMetadata>(null);
provideMetadataReceiver((metadataGetter) => {
	const info = metadataGetter();
	pageMetadata.value = info;
	if (pageMetadata.value) {
		const isRoot = mainRouter.currentRoute.value.name === 'index';
		if (isRoot && pageMetadata.value.title === instanceName) {
			window.document.title = pageMetadata.value.title;
		} else {
			window.document.title = `${pageMetadata.value.title} | ${instanceName}`;
		}
	}
});
provideReactiveMetadata(pageMetadata);

const simpleDrawerShowing = ref(false);
const widgetsShowing = ref(false);

// 旗鯖fork: デッキモード (デスクトップのみ)。サイドメニュー下部のトグルで切替。
const deckMode = prefer.r['simpleUi.deckMode'];
const deckActive = computed(() => isDesktop.value && deckMode.value && !isPageView.value);
// 旗鯖fork: デッキを初めて開いた時、チュートリアル(ウィザード)を表示する。
// watch の登録は isDesktop/isPageView 定義後に行う(下方の onMounted 付近)。
let deckTutorialShown = false;

function maybeShowDeckTutorial() {
	if (deckTutorialShown) return;
	if (prefer.r['simpleUi.deckTutorialDone']?.value) return;
	deckTutorialShown = true;
	const { dispose } = os.popup(defineAsyncComponent(() => import('./_common_/HatasabaDeckTutorial.vue')), {}, { closed: () => dispose() });
}

// 旗鯖fork: 上部メニューモード(デスクトップのみ)。ONで左サイドバーを隠し上部ナビバーを出す。
const topNavMode = prefer.r['simpleUi.topNavMode'];
const topNavActive = computed(() => isDesktop.value && topNavMode.value && !isPageView.value);
// 旗鯖fork: デッキ背景のヘッダー画像ぼかしを使わないオプション
const deckNoBannerBg = computed(() => prefer.r['simpleUi.deckNoBannerBg'].value);
// 旗鯖fork: 通常表示(デッキUIではない)タイムライン背景のヘッダー画像ぼかしを使わないオプション
const normalNoBannerBg = computed(() => prefer.r['simpleUi.normalNoBannerBg'].value);
// 旗鯖fork: .timelineBanner(背景ぼかし)が実際に表示されているかどうか。
// 表示されている時だけノートカードを半透明化するため、同じ条件を MkStreamingNotesTimeline へ渡す。
// 旗鯖fork(ベータ): 通常表示タイムラインの背景ぼかしは Hataskey UI 2(glassUiLocal)有効時のみ適用する。
// Hataskey UI 2 は「背景ぼかし + ノート透過」のセット機能で、それ以外の状況(単なる glassEffect ON
// 等)では通常表示のタイムライン背景にぼかしを敷かない = 従来のノート表示を維持する。
const timelineGlassBg = computed(() => !isPageView.value && !deckActive.value && glassUiLocal.value && !normalNoBannerBg.value && !!$i?.bannerUrl);

function setDeckMode(v: boolean) {
	prefer.commit('simpleUi.deckMode', v);
	dismissDeckAnnounce();
}

// 旗鯖fork: 上部メニューモード(topNav)⇔左サイドメニューの切替。
// タスク4(上部ナビバー右ボタン)とタスク5(デッキUIメニュー)から共通で呼ぶ。
function setTopNavMode(v: boolean) {
	prefer.commit('simpleUi.topNavMode', v);
}

// 旗鯖fork: 左サイドメニューの手動縮小(折りたたみ)。
// deckActive(デッキ時の自動折りたたみ)とは独立。どちらかが真なら畳む。
const sidebarCollapsed = prefer.r['simpleUi.sidebarCollapsed'];
// 旗鯖fork(#12): サイドメニューがアイコンのみ(折りたたみ/デッキ)のとき、ホバーでラベルチップを出すための判定。
const sidebarFolded = computed(() => deckActive.value || sidebarCollapsed.value);

function toggleSidebarCollapse() {
	prefer.commit('simpleUi.sidebarCollapsed', !sidebarCollapsed.value);
	dismissCollapseAnnounce();
}

// 旗鯖fork(タスク3): デッキ表示が追加された旨のお知らせ吹き出し。
// デスクトップで未表示なら出し、閉じる/切替操作で二度と出さない。
const deckAnnounceVisible = ref(false);

function dismissDeckAnnounce() {
	deckAnnounceVisible.value = false;
	if (!prefer.s['simpleUi.deckAnnounceShown']) prefer.commit('simpleUi.deckAnnounceShown', true);
}

// 旗鯖fork: サイドメニュー縮小/拡大ボタンのお知らせ吹き出し(デッキお知らせと同形式)。
const collapseAnnounceVisible = ref(false);

function dismissCollapseAnnounce() {
	collapseAnnounceVisible.value = false;
	if (!prefer.s['simpleUi.collapseAnnounceShown']) prefer.commit('simpleUi.collapseAnnounceShown', true);
}

// 旗鯖fork: トラックパッドの横スクロールでタイムラインタブを切替。
// macOSでは横スワイプがブラウザの「戻る/進む」履歴ジェスチャに化けてしまうため、
// 横方向が優位なwheelイベントを preventDefault で食い、タブ切替に割り当てる
// (CSS側の overscroll-behavior-x: none と併用)。
let wheelAccX = 0;
// 旗鯖fork: wheel(トラックパッド横スワイプ)とtouchの両方がタブ移動を起こすと
// 1スワイプで2タブ動いてしまう。両者で共有するロックで二重発火を防ぐ。
let tabSwitchLockUntil = 0;
// 旗鯖fork: トラックパッドの大きな横スワイプは wheel イベントが連続で飛んでくるため、
// ロック時間だけでは1ジェスチャ中に2回移動してしまう。
// 「wheelが一定時間途切れたら1ジェスチャ終了」とみなし、1ジェスチャにつき1回だけ移動させる。
let wheelGestureMoved = false; // この連続ジェスチャ中に既に1回移動したか
let wheelEndTimer: number | null = null;
const orderedWheelTabs = computed<string[]>(() => [
	...visibleTopTabs.value.map((t: any) => t.id),
	...(showOHTL.value ? ['ohtl'] : []),
	...(showOLTL.value ? ['oltl'] : []),
]);

// ノート内のコードブロック等、横スクロール可能な子要素の上では奪わない
function hasHScrollableAncestor(start: HTMLElement | null): boolean {
	let el = start;
	while (el && el !== contentEl.value) {
		if (el.scrollWidth > el.clientWidth + 1) {
			const ox = window.getComputedStyle(el).overflowX;
			if (ox === 'auto' || ox === 'scroll') return true;
		}
		el = el.parentElement;
	}
	return false;
}

function onContentWheel(ev: WheelEvent) {
	if (!tabSwipeEnabled.value) return;
	if (!isDesktop.value || isPageView.value || deckActive.value) return;
	if (Math.abs(ev.deltaX) <= Math.abs(ev.deltaY) * 1.2) return; // 横方向優位のみ
	if (hasHScrollableAncestor(ev.target as HTMLElement)) return;
	ev.preventDefault(); // macの履歴スワイプ誤発火を抑止

	// wheelが途切れたら1ジェスチャ終了とみなす。来るたびにタイマーをリセット。
	if (wheelEndTimer) window.clearTimeout(wheelEndTimer);
	wheelEndTimer = window.setTimeout(() => { wheelGestureMoved = false; wheelAccX = 0; wheelEndTimer = null; }, 150);

	// このジェスチャ中に既に1回動いていたら、以降のwheelは溜めずに無視(=1ジェスチャ1タブ)
	if (wheelGestureMoved) { wheelAccX = 0; return; }

	wheelAccX += ev.deltaX;
	if (Math.abs(wheelAccX) < 90) return;
	const dir = wheelAccX > 0 ? 1 : -1;
	wheelAccX = 0;
	wheelGestureMoved = true; // このジェスチャでは移動済み
	tabSwitchLockUntil = Date.now() + 450; // touch側との二重発火も防ぐ
	const tabs = orderedWheelTabs.value;
	const idx = tabs.indexOf(tab.value);
	const next = idx === -1 ? 0 : Math.min(tabs.length - 1, Math.max(0, idx + dir));
	if (tabs[next] && tabs[next] !== tab.value) switchTab(tabs[next] as TabType);
}

// ===== デスクトップ判定 =====
const DESKTOP_THRESHOLD = 1100;
// 旗鯖fork: 横開きの折りたたみ端末(メインディスプレイ)向け。PC幅未満でもウィジェットを常時出す。
const isFoldableWide = useFoldableWide(DESKTOP_THRESHOLD);
// 折りたたむ/開くでレイアウトが切り替わっても、読んでいた位置を保つ。
useFoldableScrollAnchor(isFoldableWide, () => contentEl.value);
const windowWidth = ref(window.innerWidth);
// 旗鯖fork(#6): 「画面幅に関係なくデッキ表示」設定がON かつ デッキモードONのときは、
// 狭幅でもデスクトップ相当のレイアウト(=デッキが使える)として扱う。
// これは端末ローカル設定(hatasaba-device-prefs)なので、スマホ等にプロファイル共有されない。
const isDesktop = computed(() => (deckIgnoreWidth.value && deckMode.value) ? true : windowWidth.value >= DESKTOP_THRESHOLD);

function onResize() {
	windowWidth.value = window.innerWidth;
	nextTick(() => { updateSbFade(); updateAnnouncePositions(); });
}

window.addEventListener('resize', onResize);

// ===== テーマ判定 =====
const footerIsDark = ref(true);

function detectThemeBrightness() {
	let r = 0, g = 0, b = 0;
	let found = false;

	// Strategy 1: CSS custom property
	const cs = window.getComputedStyle(window.document.documentElement);
	for (const prop of ['--MI_THEME-bg', '--MI_THEME-panel', '--bg', '--panel']) {
		const val = cs.getPropertyValue(prop).trim();
		if (val) {
			const m = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
			if (m) { r = +m[1]; g = +m[2]; b = +m[3]; found = true; break; }
			if (val.startsWith('#')) {
				const h = val.replace('#', '');
				if (h.length >= 6) { r = parseInt(h.substring(0, 2), 16); g = parseInt(h.substring(2, 4), 16); b = parseInt(h.substring(4, 6), 16); found = true; break; }
				if (h.length === 3) { r = parseInt(h[0] + h[0], 16); g = parseInt(h[1] + h[1], 16); b = parseInt(h[2] + h[2], 16); found = true; break; }
			}
		}
	}

	// Strategy 2: Computed background-color of root element or body
	if (!found) {
		for (const el of [window.document.documentElement, window.document.body, window.document.querySelector('.root') as HTMLElement | null]) {
			if (!el) continue;
			const bgc = window.getComputedStyle(el).backgroundColor;
			const m = bgc?.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
			if (m && bgc !== 'rgba(0, 0, 0, 0)') { r = +m[1]; g = +m[2]; b = +m[3]; found = true; break; }
		}
	}

	// Strategy 3: Misskey data-color-mode attribute
	if (!found) {
		const mode = window.document.documentElement.getAttribute('data-color-mode');
		if (mode === 'light') { footerIsDark.value = false; return; }
		if (mode === 'dark') { footerIsDark.value = true; return; }
	}

	footerIsDark.value = !found || (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

let themeObs: MutationObserver | null = null;
let darkMql: MediaQueryList | null = null;
let darkMqlH: ((e:MediaQueryListEvent)=>void) | null = null;

function startThemeWatch() {
	detectThemeBrightness();
	themeObs = new MutationObserver(() => {
		window.setTimeout(detectThemeBrightness, 50);
		window.setTimeout(detectThemeBrightness, 300);
	});
	themeObs.observe(window.document.documentElement, { attributes: true, attributeFilter: ['data-color-mode', 'class', 'style'] });
	darkMql = window.matchMedia('(prefers-color-scheme:dark)');
	darkMqlH = () => { window.setTimeout(detectThemeBrightness, 50); };
	darkMql.addEventListener('change', darkMqlH);
}

function stopThemeWatch() {
	themeObs?.disconnect(); themeObs = null;
	if (darkMql && darkMqlH) darkMql.removeEventListener('change', darkMqlH);
	darkMql = null; darkMqlH = null;
}

// ===== スクロール検知 =====
const contentEl = ref<HTMLElement | null>(null);

// 旗鯖fork: お知らせ吹き出しはサイドメニューの overflow:hidden / スタッキングコンテキストに
// 囚われてタイムラインに隠れるため、Teleport で body 直下に出し、アンカー要素の座標に fixed 配置する。
const deckAnchorEl = ref<HTMLElement | null>(null);
const collapseAnchorEl = ref<HTMLElement | null>(null);
const deckAnnPos = ref<{ top: number; left: number } | null>(null);
const collapseAnnPos = ref<{ top: number; left: number } | null>(null);
// 旗鯖fork: HataFeed 新登場の案内(「もっと」にアンカー・端末ごと1回)。
const moreAnchorEl = ref<HTMLElement | null>(null);
const moreAnnounceVisible = ref(false);
const moreAnnPos = ref<{ top: number; left: number } | null>(null);

function dismissMoreAnnounce() {
	moreAnnounceVisible.value = false;
	// 旗鯖fork: prefer 経由(マルチデバイス同期)で dismiss を保存。
	// 既存ユーザー(端末ローカル miLocalStorage に保存済み) との互換のため両方書く。
	prefer.commit('simpleUi.hatafeedIntroShown', true);
	miLocalStorage.setItem('hatafeedIntroShown', 'true');
}

// 旗鯖fork: 案内吹き出しはクリック非遷移に変更したため未使用(関数は念のため残す)
function calcAnnPos(el: HTMLElement | null): { top: number; left: number } | null {
	if (!el) return null;
	// 旗鯖fork: アンカー(例:「もっと」メニュー)が非表示・折りたたみだと座標が壊れて吹き出しが
	//   画面端に飛ぶため、そうした場合は null を返して吹き出し自体を出さない。
	//   display:none 等は offsetParent が null になる(position:fixed のときのみ例外的に null になり得る)。
	if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return null;
	const r = el.getBoundingClientRect();
	if (r.width === 0 || r.height === 0) return null;
	// アンカーが完全にビューポート外(サイドバーのスクロールで隠れている等)なら出さない。
	if (r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth) return null;
	const center = r.top + r.height / 2;
	// 旗鯖fork: 「もっと」はサイドバー最下部で中心が画面下端より下(=ほぼ画面外)に来ることがあり、
	//   その位置に吹き出しを出すと崩壊するため出さない。デッキ切替トグルのように画面内に収まる
	//   下寄りアンカー(中心が画面内)は従来どおり表示する。
	if (center >= window.innerHeight) return null;
	// 要素の右側・縦中央に出す(しっぽは吹き出し左辺=「く」の口)。
	//   下寄りのアンカーでも吹き出しが画面下にはみ出さないよう軽くクランプする。
	const top = Math.min(center, window.innerHeight - 48);
	return { top, left: r.right + 12 };
}

function updateAnnouncePositions() {
	if (deckAnnounceVisible.value) deckAnnPos.value = calcAnnPos(deckAnchorEl.value);
	if (collapseAnnounceVisible.value) collapseAnnPos.value = calcAnnPos(collapseAnchorEl.value);
	if (moreAnnounceVisible.value) moreAnnPos.value = calcAnnPos(moreAnchorEl.value);
}

// 旗鯖fork: サイドメニューのスクロールバーを隠し、続きがある時だけ上下にフェードを出す
const sbScrollEl = ref<HTMLElement | null>(null);
const sbFadeTop = ref(false);
const sbFadeBottom = ref(false);

function updateSbFade() {
	const el = sbScrollEl.value;
	if (!el) { sbFadeTop.value = false; sbFadeBottom.value = false; return; }
	const top = el.scrollTop;
	const max = el.scrollHeight - el.clientHeight;
	sbFadeTop.value = top > 1;
	sbFadeBottom.value = top < max - 1;
}

function onSbScroll() {
	updateSbFade();
	updateAnnouncePositions();
	const el = sbScrollEl.value;
	if (el) el.style.setProperty('--hss-parallax', studioProfile.value.expanded.parallax && !sidebarFolded.value ? `${Math.round(el.scrollTop * -0.035)}px` : '0px');
}

const showBottomBar = ref(true);
const showTopBar = ref(true);
let lastScrollY = 0;
let scrollTimer: number | null = null;

function onContentScroll() {
	if (!contentEl.value) return;
	const sy = contentEl.value.scrollTop;
	const diff = sy - lastScrollY;
	if (diff > 35) { showBottomBar.value = false; showTopBar.value = false; }
	if (diff < -25) { showBottomBar.value = true; showTopBar.value = true; }
	lastScrollY = sy;
	if (scrollTimer) window.clearTimeout(scrollTimer);
	scrollTimer = window.setTimeout(() => { showBottomBar.value = true; showTopBar.value = true; }, 400);
}

// ===== 外部アカウント =====
const isExternalLinked = computed(() => prefer.s['external.enabled'] && prefer.s['external.token'] != null);
const externalHost = computed(() => prefer.s['external.host'] || '');
const externalToken = computed(() => prefer.s['external.token'] || '');
const showOHTL = computed(() => isExternalLinked.value && prefer.s['external.enableOHTL']);
const showOLTL = computed(() => isExternalLinked.value && prefer.s['external.enableOLTL']);
// 旗鯖fork: 外部通知の未読有無 (件数ではなくドット表示。件数はWS+ポーリングで二重カウントの恐れがあるため)
const extNotifHasUnread = ref(false);

function openExtNotifPanel() { window.dispatchEvent(new CustomEvent('ext-tl-open-notif')); }

// 旗鯖fork: 外部通知専用ページへ遷移。遷移と同時にバッジを強制解除する
// (ページ側でも既読化するが、UI即時反映のためここでも消す)
function goToExternalNotifications() {
	extNotifHasUnread.value = false;
	mainRouter.push('/my/external-notifications');
}

function onExtPostClick() { window.dispatchEvent(new CustomEvent('ext-tl-post')); }

// 旗鯖fork: ポーリング/既読イベント由来。detail===0(明示的既読化)の時だけドットを消す。
// ポーリングで「未読あり」が来てもここではドットを点けない (タブ切替の度に復活するのを防ぐため)。
// ドットを点けるのは WS リアルタイム受信 (onExtNotifRealtime) のみに一本化する。
function onExtNotifCount(e:Event) {
	const v = (e as CustomEvent).detail ?? 0;
	if (v === 0) {
		extNotifHasUnread.value = false;
	}
}

// 旗鯖fork: WS経由でリアルタイム受信した外部通知で未読ドットを点ける
// (現在外部通知ページを見ている場合は点けない=既読扱い)
function onExtNotifRealtime() {
	if (mainRouter.currentRoute.value.path.startsWith('/my/external-notifications')) return;
	extNotifHasUnread.value = true;
}

// ===== ページ判定 =====
const HOME_ROUTES = new Set(['index', 'timeline']);
const isPageView = ref(false);
const isSearchPage = computed(() => { const r = mainRouter.currentRoute.value; return r.name === 'search' || r.path === '/search'; });
const isNotifPage = computed(() => mainRouter.currentRoute.value.path === '/my/notifications');
const isHataskPage = computed(() => { const p = mainRouter.currentRoute.value.path; return p === '/hatask' || p === '/hata-docs'; });
const isHatadyPage = computed(() => mainRouter.currentRoute.value.path.startsWith('/hatady'));
const isHataFeedPage = computed(() => mainRouter.currentRoute.value.path.startsWith('/hatafeed'));
const isListTimelinePage = computed(() => isListTimelinePath(mainRouter.currentRoute.value.path));
const isListPage = computed(() => mainRouter.currentRoute.value.path.startsWith('/my/lists') || isListTimelinePage.value);
const isChannelPage = computed(() => mainRouter.currentRoute.value.path.startsWith('/channels'));
// 旗鯖fork: チャンネル個別ページ (/channels/:id) の判定。一覧 (/channels) は除外。
// 個別ページはページ下部に「チャンネルへ投稿」ボタンがあり、下部ナビバーが被さって
// タップできなくなるため、個別ページでは下部ナビバーを隠す。
const isChannelDetailPage = computed(() => {
	const p = mainRouter.currentRoute.value.path;
	return /^\/channels\/[^/]+/.test(p);
});
const isAntennaTimelinePage = computed(() => isAntennaTimelinePath(mainRouter.currentRoute.value.path));
const isAntennaPage = computed(() => mainRouter.currentRoute.value.path.startsWith('/my/antennas') || isAntennaTimelinePage.value);
const isCollectionTimelinePage = computed(() => isListTimelinePage.value || isAntennaTimelinePage.value);
/**
 * 旗鯖fork: 設定画面かどうか。
 * ⚠️再設計の設定画面は自前で見出しと戻る操作を持つので、本体のページヘッダーを
 *   重ねて出すと帯が2本並んでしまう。設定の下位ページも含めて対象にする。
 */
const isSettingsPage = computed(() => {
	// ⚠️まず currentRoute（ref）を読んで依存を作る。これが無いと computed が
	//   一度計算したきり更新されず、画面を移っても帯が消えない。
	//   ⚠️getCurrentFullPath() はただのプロパティでリアクティブではない。
	const route = mainRouter.currentRoute.value;
	// ⚠️設定の下位ルートは router.definition.ts で '/profile' のように
	//   親を含まない形で定義されている。route.path だけでは取りこぼすので実URLを見る。
	const path = (route == null ? '' : mainRouter.getCurrentFullPath()).split('?')[0].split('#')[0];
	return path === '/settings' || path.startsWith('/settings/');
});
// currentRoute.path は実URLではなく `/timeline/list/:listId` のようなルート定義。
// ここからIDを切り出すと文字列 `:listId` を管理画面へ渡してしまうため、
// 解決済みルートの props から実際のIDを読む。
const activeListId = computed(() => {
	if (!isListTimelinePage.value) return null;
	const id = mainRouter.currentRef.value.props.get('listId');
	return typeof id === 'string' && id.length > 0 ? id : null;
});
const activeAntennaId = computed(() => {
	if (!isAntennaTimelinePage.value) return null;
	const id = mainRouter.currentRef.value.props.get('antennaId');
	return typeof id === 'string' && id.length > 0 ? id : null;
});
const timelinePickerKind = ref<TimelineCollectionKind | null>(null);
const activeCollectionId = computed(() => timelinePickerKind.value === 'list' ? activeListId.value : activeAntennaId.value);
const activeListName = computed(() => userListsCache.value.value?.find(item => item.id === activeListId.value)?.name ?? String(pageMetadata.value?.title ?? ''));
const activeAntennaName = computed(() => antennasCache.value.value?.find(item => item.id === activeAntennaId.value)?.name ?? String(pageMetadata.value?.title ?? ''));
const timelinePickerItems = computed(() => timelinePickerKind.value === 'list' ? (userListsCache.value.value ?? []) : (antennasCache.value.value ?? []));
const isExternalTab = computed(() => tab.value === 'ohtl' || tab.value === 'oltl');
const isHomeTL = computed(() => !isPageView.value && !isSearchPage.value && !isNotifPage.value && !isHataskPage.value);

const checkIsPageView = () => { isPageView.value = !HOME_ROUTES.has(mainRouter.currentRoute.value.name as string); };

mainRouter.on('change', () => {
	checkIsPageView();
	rememberCurrentCollection();
	timelinePickerKind.value = null;
	simpleDrawerShowing.value = false;
	showBottomBar.value = true;
	showTopBar.value = true;
	if (mainRouter.currentRoute.value.path === '/my/notifications') { hasUnreadNotif.value = false; unreadNotifCount.value = 0; }
	// テーマ再検出（ページ遷移でテーマが変わる場合）
	window.setTimeout(detectThemeBrightness, 100);
});

// ===== タブ =====
// 旗鯖fork: 'trending' を追加 (トレンドタイムライン (TTL))
type TabType = 'following' | 'mixed' | 'local' | 'social' | 'ohtl' | 'oltl' | 'trending';

// 旗鯖fork: 再読み込み時に最後のタブを復元する。
// ただし外部TL(ohtl/oltl)はトークンが無いと表示できず空タブになるため復元対象から除外し、
// 復元できない場合は 'following' にフォールバックする。
function getInitialTab(): TabType {
	const saved = miLocalStorage.getItem('hatasabaUiLastTab') as TabType | null;
	const restorable: TabType[] = ['following', 'mixed', 'local', 'social', 'trending'];
	if (saved != null && restorable.includes(saved)) return saved;
	return 'following';
}

const tab = ref<TabType>(getInitialTab());

// ===== prefer連動: 上部タブ =====
// 旗鯖fork: トレンドタブ (TTL) は専用トグル simpleUi.showTrendingTab で制御し、
// 有効時は topNav 設定とは独立して最左に差し込む (既存ユーザーの topNav 設定を変更しないため)
const visibleTopTabs = computed(() => {
	const saved = (prefer.r['simpleUi.topNav'].value as any[]).filter((t: any) => t.visible);
	if (prefer.r['simpleUi.showTrendingTab'].value) {
		// 旗鯖fork: トレンドタブは通常タブの右端に置く。
		// tabOrder で後段に ohtl/oltl(外部TL)が push されるため、
		// 結果の並びは「通常タブ... → トレンド → 外部ホーム → 外部ローカル」となる。
		return [...saved, { id: 'trending', icon: 'ti ti-flame', label: 'トレンド', visible: true }];
	}
	return saved;
});
const tabOrder = computed<TabType[]>(() => {
	const tabs: TabType[] = visibleTopTabs.value.map((t: any) => t.id as TabType);
	if (showOHTL.value) tabs.push('ohtl');
	if (showOLTL.value) tabs.push('oltl');
	return tabs;
});

// ===== prefer連動: 下部ナビ =====
const visibleBottomNav = computed(() => getVisibleBottomNav(prefer.r['simpleUi.bottomNav'].value as any[]));
const bottomNavHasPage = computed(() => {
	const ids = visibleBottomNav.value.map((t: any) => t.id);
	return (ids.includes('search') && isSearchPage.value)
        || (ids.includes('notifications') && isNotifPage.value)
        || (ids.includes('hatask') && isHataskPage.value)
        || (ids.includes('hatady') && isHatadyPage.value)
        || (ids.includes('hatafeed') && isHataFeedPage.value)
        || isListPage.value || isChannelPage.value || isAntennaPage.value;
});

// ===== prefer連動: ウィジェット縁色 =====
const showWidgetBorder = computed(() => prefer.r['simpleUi.widgetBorder'].value);

// ===== prefer連動: すりガラス効果 =====
const glassEffect = computed(() => prefer.r['simpleUi.glassEffect'].value);
// 旗鯖fork: Hataskey UI のページヘッダー(タイトル+戻るボタン)の表示制御。
// デフォルト false: ページ自身の MkPageHeader と二重表示になるため非表示。
// アクセシビリティ設定からON切替可能。
const showPageHeader = computed(() => prefer.r['simpleUi.showPageHeader'].value);

// ===== prefer連動: サイドバー =====
const sidebarOrder = computed(() => prefer.r['simpleUi.sidebar'].value as any[]);
// HataSideStudio は端末ローカル。初回だけ、既存の prefer 側サイドバー順を材料にして
// 拡大/縮小の両レイアウトを作るため、これまでの利用者の並びを失わない。
ensureHataSideStudioInitialized(sidebarOrder.value);
const studioProfile = computed(() => getActiveHataSideProfile(hataSideStudioStore.value));
const studioPostButtonIcon = computed(() => studioProfile.value.postButton.icon === 'paw' ? 'ti ti-paw' : 'ti ti-pencil');
const studioPostButtonStyle = computed(() => ({
	background: gradientCss(studioProfile.value.postButton),
	color: studioProfile.value.postButton.foreground,
}));
const studioExpandedNodes = computed(() => studioProfile.value.expanded.nodes);
const studioCollapsedButtons = computed(() => studioProfile.value.collapsed.buttons);
const studioExpandedMenuIds = computed(() => {
	const ids = new Set<string>();
	for (const node of studioExpandedNodes.value) {
		if (node.type === 'button') ids.add(node.menuId);
		if (node.type === 'group') for (const child of node.children) if (child.type === 'button') ids.add(child.menuId);
	}
	return ids;
});
const studioLargeMenuKey = computed(() => {
	const ids = new Set<string>();
	for (const node of studioExpandedNodes.value) {
		if (node.type === 'button' && node.size === 'large' && node.shape !== 'circle' && studioMenuItemAvailable(node.menuId)) ids.add(node.menuId);
		if (node.type === 'group') {
			for (const child of node.children) {
				if (child.type === 'button' && child.size === 'large' && child.shape !== 'circle' && studioMenuItemAvailable(child.menuId)) ids.add(child.menuId);
			}
		}
	}
	return [...ids].sort().join('|');
});
type StudioLargePreview = {
	lines: string[];
	signals?: string[];
	targetPath?: string;
};
type StudioButtonSignal = {
	label: string;
	targetPath: string;
};
const studioLargePreviews = ref<Record<string, StudioLargePreview>>({});
const studioLargeLoadedAt = new Map<string, number>();
const studioLargeInFlight = new Map<string, Promise<void>>();
const studioNow = ref(new Date());
let studioClockTimer: number | null = null;
onMounted(() => { studioClockTimer = window.setInterval(() => { studioNow.value = new Date(); }, 30_000); });
onUnmounted(() => { if (studioClockTimer) window.clearInterval(studioClockTimer); });

watch(studioLargeMenuKey, (key) => {
	for (const menuId of key.split('|').filter(Boolean)) void loadStudioLargePreview(menuId);
}, { immediate: true });

function studioIcon(item: HataSideButton): string {
	return SIDEBAR_ICON_OVERRIDES[item.menuId] ?? item.icon;
}

function studioMenuItemAvailable(menuId: string): boolean {
	const definition = (navbarItemDef as unknown as Record<string, { show?: boolean } | undefined>)[menuId];
	return definition?.show !== false;
}

function studioItemStyle(item: HataSideButton | HataSideWidget) {
	const rotation = 'rotation' in item ? item.rotation : 0;
	const borderVisible = item.type !== 'button' || item.borderVisible !== false;
	const savedWidgetMinHeight = item.type === 'widget' ? item.sizeSettings[item.size].minHeight : 0;
	const registryWidgetMinHeight = item.type === 'widget' ? HATA_SIDE_WIDGET_REGISTRY[item.kind].sizes[item.size].minHeight : 0;
	const widgetMinHeight = item.type === 'widget' && item.kind === 'aichan'
		? Math.max(savedWidgetMinHeight, registryWidgetMinHeight)
		: savedWidgetMinHeight;
	return {
		'--hss-bg': gradientCss(item),
		'--hss-border': item.border,
		'--hss-border-width': `${borderVisible ? (item.borderWidth ?? 1) : 0}px`,
		'--hss-border-style': item.borderStyle ?? 'solid',
		'--hss-fg': item.foreground,
		'--hss-rotation': `${rotation}deg`,
		// 横幅220pxの一列ボタンを最大12度回しても、前後の項目や枠線を侵食しない予約領域。
		// 回転しない大多数の項目は従来同等の2pxだけなので、一覧が間延びしない。
		'--hss-rotation-space': `${rotation === 0 ? 1 : Math.ceil(Math.abs(rotation) * 1.6 + 1)}px`,
		...(item.type === 'widget' ? {
			'--hss-widget-min-height': `${widgetMinHeight}px`,
			...(item.kind === 'aichan' ? { '--hss-aichan-scale': String(Math.min(1, widgetMinHeight / 350)) } : {}),
		} : {}),
	};
}

function studioGroupStyle(group: HataSideGroup) {
	return {
		'--hss-bg': gradientCss(group),
		'--hss-border': group.border,
		'--hss-border-width': `${group.borderWidth ?? 1}px`,
		'--hss-border-style': group.borderStyle ?? 'solid',
		'--hss-fg': group.foreground,
	};
}

function studioItemClick(item: HataSideButton, ev: MouseEvent) {
	if (item.targetId && item.menuId === 'lists') {
		playHataNavigationMotion(ev, `list:${item.targetId}`, 620);
		miLocalStorage.setItem('hatasabaLastListId', item.targetId);
		mainRouter.pushByPath(`/timeline/list/${item.targetId}`);
		return;
	}
	if (item.targetId && item.menuId === 'antennas') {
		playHataNavigationMotion(ev, `antenna:${item.targetId}`, 620);
		miLocalStorage.setItem('hatasabaLastAntennaId', item.targetId);
		mainRouter.pushByPath(`/timeline/antenna/${item.targetId}`);
		return;
	}
	const previewTarget = item.size === 'large' ? studioLargePreviews.value[item.menuId]?.targetPath : null;
	if (previewTarget) {
		playHataNavigationMotion(ev, item.menuId, 620);
		mainRouter.pushByPath(previewTarget as never);
		return;
	}
	sidebarItemClick(item.menuId, ev);
}

function studioPlainText(value: unknown): string {
	return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function studioRecord(value: unknown): Record<string, unknown> {
	return value != null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function studioRecords(value: unknown): Array<Record<string, unknown>> {
	return Array.isArray(value) ? value.filter(item => item != null && typeof item === 'object' && !Array.isArray(item)) as Array<Record<string, unknown>> : [];
}

function studioCountLabel(count: number, limit = 100): string {
	return count >= limit
		? copyx.countAtLeast({ count: simpleNumberFormatter.format(limit) })
		: copyx.count({ count: simpleNumberFormatter.format(count) });
}

function studioDateKey(date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function studioMinutesLabel(minutes: number): string {
	const safe = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));
	if (safe < 60) return copyx.minutes({ count: simpleNumberFormatter.format(safe) });
	const hours = Math.floor(safe / 60);
	const rest = safe % 60;
	return rest === 0
		? copyx.hours({ count: simpleNumberFormatter.format(hours) })
		: copyx.hoursMinutes({ hours: simpleNumberFormatter.format(hours), minutes: simpleNumberFormatter.format(rest) });
}

function setStudioLargePreview(menuId: string, preview: StudioLargePreview): void {
	studioLargePreviews.value = { ...studioLargePreviews.value, [menuId]: preview };
}

function studioNotificationLines(notification: Record<string, unknown>): string[] {
	const user = studioRecord(notification.user);
	const note = studioRecord(notification.note);
	const actor = studioPlainText(user.name) || (user.username ? `@${user.username}` : copy.notificationSource);
	const typeLabels: Record<string, string> = {
		reaction: copy.notificationReaction, reply: copy.notificationReply, mention: copy.notificationMention,
		quote: copy.notificationQuote, renote: copy.notificationRenote, follow: copy.notificationFollow,
		receiveFollowRequest: copy.notificationFollowRequest, followRequestAccepted: copy.notificationFollowAccepted,
		pollEnded: copy.notificationPollEnded, achievementEarned: copy.notificationAchievement,
		chatRoomInvitationReceived: copy.notificationChatInvite, channelInvitationReceived: copy.notificationChannelInvite,
	};
	const heading = notification.header ? studioPlainText(notification.header) : `${actor}${typeLabels[String(notification.type)] ?? copy.notificationFallback}`;
	const body = studioPlainText(notification.body) || studioPlainText(note.cw) || studioPlainText(note.text);
	return [heading, body].filter(Boolean);
}

async function loadStudioLargePreview(menuId: string, force = false): Promise<void> {
	const supported = new Set(['notifications', 'announcements', 'chat', 'channels', 'hatask', 'hatady', 'hatafeed']);
	if (!supported.has(menuId)) return;
	// 公開APIのお知らせ以外は認証必須。保存済みprofileをログアウト状態で復元してもAPIを空打ちしない。
	if ($i == null && menuId !== 'announcements') return;
	if (!force && Date.now() - (studioLargeLoadedAt.get(menuId) ?? 0) < 5 * 60_000) return;
	const active = studioLargeInFlight.get(menuId);
	if (active) return active;

	const task = (async() => {
		try {
			const { misskeyApi } = await import('@/utility/misskey-api.js');
			const api = misskeyApi as unknown as (endpoint: string, params: Record<string, unknown>) => Promise<unknown>;

			if (menuId === 'notifications') {
				const rows = studioRecords(await api('i/notifications', { limit: 1, markAsRead: false }));
				if (rows[0]) {
					setStudioLargePreview(menuId, { lines: studioNotificationLines(rows[0]) });
				} else {
					setStudioLargePreview(menuId, { lines: [copy.noNewNotifications] });
				}
			} else if (menuId === 'announcements') {
				const items = studioRecords(await api('announcements', { limit: 5, isActive: true }));
				const maintenance = items.filter(item => item?.icon === 'maintenance');
				const latest = items.find(item => item?.icon !== 'maintenance');
				const lines = [
					...maintenance.slice(0, 3).map(item => copyx.maintenanceTitle({ title: studioPlainText(item.title) })),
					...(latest ? [copyx.latestTitle({ title: studioPlainText(latest.title) })] : []),
				].filter(line => !line.endsWith(': '));
				setStudioLargePreview(menuId, {
					lines: lines.length > 0 ? lines : [copy.noAnnouncements],
					signals: [copyx.maintenanceCount({ count: studioCountLabel(maintenance.length) }), copyx.announcementCount({ count: studioCountLabel(items.length - maintenance.length) })],
				});
			} else if (menuId === 'chat') {
				const [userRows, roomRows] = await Promise.all([
					api('chat/history', { room: false }),
					api('chat/history', { room: true }),
				]);
				const latest = [...studioRecords(userRows), ...studioRecords(roomRows)]
					.toSorted((a, b) => new Date(String(b.createdAt ?? 0)).getTime() - new Date(String(a.createdAt ?? 0)).getTime())[0];
				if (latest) {
					const isRoom = latest.toRoomId != null;
					const other = studioRecord(latest.fromUserId === $i?.id ? latest.toUser : latest.fromUser);
					const room = studioRecord(latest.toRoom);
					const name = isRoom ? (studioPlainText(room.name) || copy.groupChat) : (studioPlainText(other.name) || (other.username ? `@${other.username}` : copy.directChat));
					const targetId = isRoom ? latest.toRoomId : other?.id;
					setStudioLargePreview(menuId, {
						lines: [copyx.lastRoom({ name }), studioPlainText(latest.text) || copy.chatAttachment],
						targetPath: targetId ? (isRoom ? `/chat/room/${targetId}` : `/chat/user/${targetId}`) : '/chat',
					});
				} else {
					setStudioLargePreview(menuId, { lines: [copy.noChatHistory], targetPath: '/chat' });
				}
			} else if (menuId === 'channels') {
				const followed = studioRecords(await api('channels/followed', { limit: 100 }));
				const channel = followed.toSorted((a, b) => new Date(String(b.lastNotedAt ?? 0)).getTime() - new Date(String(a.lastNotedAt ?? 0)).getTime())[0];
				if (channel) {
					const notes = await api('channels/timeline', { channelId: channel.id, limit: 1 });
					const note = studioRecords(notes)[0];
					const noteUser = studioRecord(note?.user);
					const author = studioPlainText(noteUser.name) || (noteUser.username ? `@${noteUser.username}` : copy.newPostAuthor);
					const body = studioPlainText(note?.cw) || studioPlainText(note?.text) || (note ? copy.attachmentPost : copy.noNewPosts);
					setStudioLargePreview(menuId, {
						lines: [studioPlainText(channel.name) || copy.followedChannel, copyx.authorContent({ author, content: body })],
						targetPath: `/channels/${channel.id}`,
					});
				} else {
					setStudioLargePreview(menuId, { lines: [copy.noFollowedChannels], targetPath: '/channels' });
				}
			} else if (menuId === 'hatask') {
				const data = studioRecord(await api('i/registry/get-all', { scope: ['client', 'hatask'] }));
				const events = studioRecords(data.events);
				const todos = studioRecords(data.todos);
				const meals = studioRecords(data.meals);
				const moods = studioRecords(data.moods);
				const now = Date.now();
				const today = studioDateKey();
				const nextEvent = events
					.map(event => ({ event, at: new Date(`${event.date}T${event.timeStart || '23:59'}`).getTime() }))
					.filter(entry => Number.isFinite(entry.at) && entry.at >= now)
					.toSorted((a, b) => a.at - b.at)[0]?.event;
				const pending = todos.filter(todo => todo.done !== true && todo.archivedAt == null);
				const mealToday = meals.filter(meal => meal.date === today).length;
				const moodToday = moods.filter(mood => mood.date === today).length;
				setStudioLargePreview(menuId, {
					lines: [nextEvent ? copyx.nextEvent({ date: simpleShortDateFormatter.format(new Date(`${nextEvent.date}T00:00:00`)), title: studioPlainText(nextEvent.title) }) : copy.noUpcomingEvents, copyx.pendingTodo({ count: simpleNumberFormatter.format(pending.length) }), copyx.todayRecords({ meals: simpleNumberFormatter.format(mealToday), moods: simpleNumberFormatter.format(moodToday) })],
					signals: [nextEvent ? copy.scheduleAvailable : copy.noSchedule, copyx.todoSignal({ count: simpleNumberFormatter.format(pending.length) }), copyx.mealSignal({ count: simpleNumberFormatter.format(mealToday) }), copyx.moodSignal({ count: simpleNumberFormatter.format(moodToday) })],
					targetPath: '/hatask',
				});
			} else if (menuId === 'hatady') {
				const [statsRaw, booksRaw, logsRaw] = await Promise.all([
					api('hata/hatady/stats', { tzOffset: hatadyTzOffset() }),
					api('hata/hatady/books', { limit: 20 }),
					api('hata/hatady/logs', { limit: 20 }),
				]);
				const stats = studioRecord(statsRaw);
				const bookRows = studioRecords(booksRaw);
				const book = bookRows.find(item => item?.status === 'reading') ?? bookRows[0];
				const today = studioDateKey();
				const todayLogs = studioRecords(logsRaw).filter(log => studioDateKey(new Date(String(log.studiedAt))) === today);
				const todayMinutes = todayLogs.reduce((sum, log) => sum + Number(log.durationMinutes ?? 0), 0);
				setStudioLargePreview(menuId, {
					lines: [copyx.weekStudyStreak({ duration: studioMinutesLabel(Number(stats?.weeklyMinutes ?? 0)), days: simpleNumberFormatter.format(Number(stats?.streakDays ?? 0)) }), book ? copyx.readingBook({ title: studioPlainText(book.title) }) : copy.noReadingBook, todayLogs[0] ? copyx.todayStudy({ title: studioPlainText(todayLogs[0].title), duration: studioMinutesLabel(todayMinutes) }) : copy.noStudyToday],
					signals: [copyx.studySignal({ duration: studioMinutesLabel(Number(stats?.weeklyMinutes ?? 0)) }), book ? copyx.readingSignal({ title: studioPlainText(book.title) }) : copy.readingUnregistered],
					targetPath: '/hatady',
				});
			} else if (menuId === 'hatafeed') {
				const availability = studioRecord(await api('hata/feedback/available', {}));
				if (availability.available !== true) return;
				const staff = availability.isStaff === true;
				if (staff) {
					const [pending, issues] = await Promise.all([
						api('hata/feedback/emoji-requests', { status: 'pending', limit: 100 }),
						api('hata/feedback/issues', { includeClosed: false, limit: 100 }),
					]);
					const pendingCount = studioRecords(pending).length;
					const issueCount = studioRecords(issues).length;
					setStudioLargePreview(menuId, { lines: [copyx.emojiPending({ count: studioCountLabel(pendingCount) }), copyx.openIssues({ count: studioCountLabel(issueCount) })], signals: [copyx.reviewSignal({ count: studioCountLabel(pendingCount) }), copyx.issueSignal({ count: studioCountLabel(issueCount) })], targetPath: '/hatafeed' });
				} else {
					const [requests, issues, quota] = await Promise.all([
						api('hata/feedback/emoji-requests', { mine: true, limit: 100 }),
						api('hata/feedback/issues', { createdById: $i?.id ?? null, includeClosed: false, limit: 100 }),
						api('hata/feedback/emoji-quota', {}),
					]);
					const requestCount = studioRecords(requests).length;
					const issueCount = studioRecords(issues).length;
					const quotaData = studioRecord(quota);
					const remaining = Number(quotaData.remaining ?? 0);
					const limit = Number(quotaData.limit ?? 0);
					setStudioLargePreview(menuId, { lines: [copyx.emojiRequests({ count: studioCountLabel(requestCount) }), copyx.myIssues({ count: studioCountLabel(issueCount) }), copyx.monthlyQuota({ remaining: simpleNumberFormatter.format(remaining), limit: simpleNumberFormatter.format(limit) })], signals: [copyx.requestSignal({ count: studioCountLabel(requestCount) }), copyx.issueSignal({ count: studioCountLabel(issueCount) }), copyx.remainingSignal({ remaining: simpleNumberFormatter.format(remaining), limit: simpleNumberFormatter.format(limit) })], targetPath: '/hatafeed' });
				}
			}
			studioLargeLoadedAt.set(menuId, Date.now());
		} catch {
			// サイドメニューの補助表示なので、取得失敗時は既存の汎用文言をそのまま使う。
		}
	})();
	studioLargeInFlight.set(menuId, task);
	try {
		await task;
	} finally {
		studioLargeInFlight.delete(menuId);
	}
}

function studioButtonDetail(menuId: string): string {
	if (menuId === 'notifications') return unreadNotifCount.value > 0 ? copyx.unreadCount({ count: simpleNumberFormatter.format(unreadNotifCount.value) }) : copy.noUnread;
	if (menuId === 'hatask') return copy.hataskDetail;
	if (menuId === 'hatady') return copy.hatadyDetail;
	if (menuId === 'hatafeed') return ($i?.isAdmin || $i?.isModerator) ? copy.hatafeedStaffDetail : copy.hatafeedUserDetail;
	if (menuId === 'announcements') return copy.announcementsDetail;
	if (menuId === 'chat') return copy.chatDetail;
	if (menuId === 'channels') return copy.channelsDetail;
	return copy.open;
}

function studioButtonLines(menuId: string): string[] {
	return studioLargePreviews.value[menuId]?.lines ?? [studioButtonDetail(menuId)];
}

function studioButtonSignals(menuId: string): StudioButtonSignal[] {
	const loaded = studioLargePreviews.value[menuId]?.signals;
	if (menuId === 'hatask') {
		const labels = loaded ?? [copy.schedule, copy.todo, copy.meal, copy.mood];
		const tabs = ['cal', 'todo', 'meal', 'mood'];
		return labels.map((label, index) => ({ label, targetPath: `/hatask?tab=${tabs[index] ?? 'home'}` }));
	}
	const targetPath = studioLargePreviews.value[menuId]?.targetPath ?? ({
		notifications: '/my/notifications',
		hatady: '/hatady',
		hatafeed: '/hatafeed',
		announcements: '/announcements',
		chat: '/chat',
		channels: '/channels',
	} as Record<string, string>)[menuId];
	if (!targetPath) return [];
	if (loaded) return loaded.map(label => ({ label, targetPath }));
	if (menuId === 'notifications') return [{ label: unreadNotifCount.value > 0 ? copyx.unreadCount({ count: simpleNumberFormatter.format(unreadNotifCount.value) }) : copy.noUnreadShort, targetPath }];
	if (menuId === 'hatady') return [copy.study, copy.reading].map(label => ({ label, targetPath }));
	if (menuId === 'hatafeed') return (($i?.isAdmin || $i?.isModerator) ? [copy.emojiReview, copy.issue] : [copy.emojiRequest, copy.issue]).map(label => ({ label, targetPath }));
	if (menuId === 'announcements') return [{ label: copy.latestAnnouncement, targetPath }];
	if (menuId === 'chat') return [{ label: copy.recentChat, targetPath }];
	if (menuId === 'channels') return [{ label: copy.followedUpdates, targetPath }];
	return [];
}

function openStudioButtonSignal(signal: StudioButtonSignal): void {
	mainRouter.pushByPath(signal.targetPath as never);
}

function isStudioSearchButton(item: HataSideButton): boolean {
	return item.menuId === 'search' && item.size === 'large' && item.shape !== 'circle';
}

function submitStudioSearch(event: Event): void {
	const form = event.currentTarget as HTMLFormElement | null;
	const query = form == null ? '' : String(new FormData(form).get('query') ?? '').trim();
	mainRouter.pushByPath(query === '' ? '/search' : `/search?q=${encodeURIComponent(query)}`);
}

function submitStudioMobileSearch(event: Event): void {
	simpleDrawerShowing.value = false;
	submitStudioSearch(event);
}

function studioWidgetIcon(kind: HataSideWidgetKind): string {
	return kind === 'clock' ? 'ti ti-clock' : kind === 'flowers' ? 'ti ti-flower' : kind === 'notifications' ? 'ti ti-bell' : 'ti ti-speakerphone';
}

function studioWidgetNativeName(widget: HataSideWidget): string | null {
	// v2開発版の旧名だけを実コンポーネント名へ移す。お知らせには対応するnative widgetが
	// まだ無いため、無関係なRSS等へすり替えず従来の要約表示を維持する。
	if (widget.kind === 'flowers') return 'hataskFlowers';
	if (widget.kind === 'announcements') return null;
	return widget.kind;
}

function studioWidgetContent(widget: HataSideWidget): 'compact' | 'normal' | 'detail' {
	return widget.sizeSettings[widget.size].content ?? widget.content[widget.size] ?? 'normal';
}

function studioWidgetData(widget: HataSideWidget): Record<string, unknown> {
	const data: Record<string, unknown> = {
		...(widget.data ?? {}),
		...(widget.sizeSettings[widget.size].data ?? {}),
	};
	// 旧プロファイルが4円グラフ表示(view:2)を保持していても、狭い小サイズでは
	// CPU/RAMの2枚表示へ正規化し、数値と円グラフの重なりを防ぐ。
	if (widget.kind === 'serverMetric' && widget.size === 'small') data.view = 3;
	return data;
}

function studioWidgetComponent(widget: HataSideWidget): string | null {
	const name = studioWidgetNativeName(widget);
	return name == null ? null : `widget-${name}`;
}

function studioWidgetModel(widget: HataSideWidget) {
	return {
		id: widget.id,
		name: studioWidgetNativeName(widget) ?? widget.kind,
		data: studioWidgetData(widget),
	};
}

function studioWidgetRenderKey(widget: HataSideWidget): string {
	return `${widget.id}:${widget.size}:${JSON.stringify(studioWidgetData(widget))}`;
}

function updateStudioWidgetProps(widgetId: string, data: Record<string, unknown>): void {
	const next = cloneHataSideStudioStore(hataSideStudioStore.value);
	const profile = getActiveHataSideProfile(next);
	let updated = false;
	for (const node of profile.expanded.nodes) {
		if (node.type === 'widget' && node.id === widgetId) {
			node.data = { ...(node.data ?? {}), ...data };
			updated = true;
			break;
		}
		if (node.type !== 'group') continue;
		const child = node.children.find(item => item.type === 'widget' && item.id === widgetId);
		if (child?.type === 'widget') {
			child.data = { ...(child.data ?? {}), ...data };
			updated = true;
			break;
		}
	}
	if (!updated) return;
	profile.updatedAt = new Date().toISOString();
	applyHataSideStudioStore(next);
}

function onStudioWidgetWheel(kind: HataSideWidgetKind, event: WheelEvent): void {
	if (kind !== 'postForm') return;
	const frame = event.currentTarget as HTMLElement | null;
	const footer = (event.target as HTMLElement | null)?.closest?.('.mkw-post-form footer') as HTMLElement | null;
	// 下部ツール列には独立した実幅を持たせている。ポインタがツール列上なら
	// 外側のフォームではなくツール列自身を動かし、末尾のボタンまで必ず到達させる。
	const target = footer && footer.scrollWidth > footer.clientWidth + 1 ? footer : frame;
	if (!target || target.scrollWidth <= target.clientWidth + 1) return;
	const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
	if (delta === 0) return;
	const before = target.scrollLeft;
	target.scrollLeft += delta;
	if (target.scrollLeft !== before) event.preventDefault();
}

function studioWidgetValue(kind: HataSideWidgetKind): string {
	if (kind === 'clock') return simpleClockFormatter.format(studioNow.value);
	if (kind === 'flowers') return copyx.flowersCount({ count: simpleNumberFormatter.format(Number(($i as any)?.hataskFlowerCount ?? 0)) });
	if (kind === 'notifications') return unreadNotifCount.value > 0 ? studioCountLabel(unreadNotifCount.value) : copy.none;
	return hasUnreadAnnouncements.value ? copy.updated : copy.checked;
}

function studioWidgetDetail(kind: HataSideWidgetKind): string {
	if (kind === 'clock') return simpleShortDateFormatter.format(studioNow.value);
	if (kind === 'flowers') return copy.flowersDetail;
	if (kind === 'notifications') return copy.notificationsDetail;
	return copy.announcementsDetail;
}

function studioWidgetClick(kind: HataSideWidgetKind) {
	if (kind === 'flowers') goToHatask();
	else if (kind === 'notifications') goToNotifications();
	else if (kind === 'announcements') goToAnnouncements();
}

// 旗鯖fork: グループ見出しラベル
const sidebarGroupLabels: Record<string, string> = {
	basic: copy.groupBasic,
	hata: copy.groupHata,
	discover: copy.groupDiscover,
	more: '',
};
// 旗鯖fork: サイドバー項目をグループ単位にまとめる (group未指定の項目は 'basic' 扱いで後方互換)
// 旗鯖fork: visible === false の項目はサイドバーに表示しない。ただし必須項目
// (timeline / notifications / announcements / followRequests / more) は強制表示。
const REQUIRED_SIDEBAR_IDS = ['timeline', 'notifications', 'announcements', 'followRequests', 'more'];
// 旗鯖fork: 過去に削除された(=コード側に対応する遷移処理が無い)サイドバー項目ID。
// 既存ユーザーの simpleUi.sidebar 保存値に残っている場合、サイドメニュー/Hataskey UI上部ナビバー
// の両方で描画されないよう除外する。将来別の項目が削除された場合はここに追記する。
const DEAD_SIDEBAR_IDS = ['whatsNew', 'portal'];
// 旗鯖fork: アイコン override は utility/sidebar-icon-overrides.ts に集約。
// サイドバー本体と設定UI(settings/hata-custom.vue)で同じマップを参照することで、
// 「サイドバー側だけ新アイコン・設定UI側は旧アイコンのまま」という不整合を防ぐ。
// SIDEBAR_ICON_OVERRIDES は ファイル上部の import で読み込み済み (utility/sidebar-icon-overrides.ts)。
const sidebarGroups = computed(() => {
	const order = ['basic', 'hata', 'discover', 'more'];
	const groups: { key: string; label: string; items: any[] }[] = [];
	for (const item of sidebarOrder.value) {
		// 旗鯖fork: 削除済み項目(whatsNew等)は保存値に残っていても無視する
		if (DEAD_SIDEBAR_IDS.includes(item.id)) continue;
		// 旗鯖fork: visible:false は除外、ただし必須項目は強制的に表示
		if (item.visible === false && !REQUIRED_SIDEBAR_IDS.includes(item.id)) continue;
		const g = item.group ?? 'basic';
		let grp = groups.find(x => x.key === g);
		if (!grp) { grp = { key: g, label: sidebarGroupLabels[g] ?? '', items: [] }; groups.push(grp); }
		grp.items.push(SIDEBAR_ICON_OVERRIDES[item.id] ? { ...item, icon: SIDEBAR_ICON_OVERRIDES[item.id] } : item);
	}
	// 旗鯖fork: chat (メッセージ) は v5 マイグレ (boot/common.ts) で既存ユーザーの sidebar に
	// insertAfter で追加するため、動的注入は不要 (撤去)。これによりユーザーが設定 UI から
	// メッセージ項目の非表示・並び替えを通常の sidebar 項目として行えるようになる。
	// 旗鯖fork: 外部通知を連携ON時のみ動的注入する。通知の直後に配置。
	// 連携状態はリアクティブな isExternalLinked に依存するため、連携ON/OFFで即座に
	// 出現/消滅する (リロード不要)。必須項目扱いでトグル不可 (並び替え対象にも出すが外せない)。
	// 注入方式のため simpleUi.sidebar には保存されず、連携状態だけで表示が決まる。
	if (isExternalLinked.value) {
		let basic = groups.find(x => x.key === 'basic');
		if (!basic) { basic = { key: 'basic', label: sidebarGroupLabels['basic'] ?? '', items: [] }; groups.push(basic); }
		const notifIdx2 = basic.items.findIndex((x: any) => x.id === 'notifications');
		const extNotifItem = { id: 'externalNotifications', icon: 'ti ti-bell', label: '外部通知', group: 'basic' };
		// 通知の直後に置く (チャットより前)
		if (notifIdx2 >= 0) {
			basic.items.splice(notifIdx2 + 1, 0, extNotifItem);
		} else {
			basic.items.push(extNotifItem);
		}
	}
	// グループの表示順を固定 (定義順に依存しないように)
	return groups.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
});
const switchTab = (t:TabType) => {
	if (isCollectionTimelinePage.value) mainRouter.push('/');
	timelinePickerKind.value = null;
	if (tab.value === t) { if (contentEl.value) contentEl.value.scrollTo({ top: 0, behavior: 'smooth' }); } else { tab.value = t; }
	if (t !== 'ohtl' && t !== 'oltl') miLocalStorage.setItem('hatasabaUiLastTab', t);
};

// ===== アカウント切り替えメニュー =====
async function openAccountMenu(ev: MouseEvent) {
	const menuItems = await getAccountMenu({ withExtraOperation: true });
	os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}

// ===== スワイプ =====
const touchStartPos = ref<{ x: number;y: number } | null>(null);
const onTouchStart = (e:TouchEvent) => {
	if (!tabSwipeEnabled.value) { touchStartPos.value = null; return; }
	touchStartPos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
};
const onTouchEnd = (e:TouchEvent) => {
	if (!tabSwipeEnabled.value) { touchStartPos.value = null; return; }
	if (!touchStartPos.value) return;
	const dx = e.changedTouches[0].clientX - touchStartPos.value.x;
	const dy = e.changedTouches[0].clientY - touchStartPos.value.y;
	touchStartPos.value = null;
	if (Math.abs(dy) > Math.abs(dx) || Math.abs(dy) > 50) return;
	if (Math.abs(dx) > 60) {
		// 旗鯖fork: wheelとtouchの二重発火で2タブ動くのを防ぐ共通ロック
		if (Date.now() < tabSwitchLockUntil) return;
		tabSwitchLockUntil = Date.now() + 450;
		const idx = tabOrder.value.indexOf(tab.value);
		if (dx > 0) {if (idx > 0)switchTab(tabOrder.value[idx - 1]); else simpleDrawerShowing.value = true;} else {if (idx < tabOrder.value.length - 1)switchTab(tabOrder.value[idx + 1]);}
	}
};

// ===== ナビゲーション =====
// 旗鯖fork: 上部ナビバーの横スクロール(縦ホイール→横)
const onTopNavWheel = (ev: WheelEvent) => { const el = ev.currentTarget as HTMLElement; el.scrollLeft += (Math.abs(ev.deltaY) > Math.abs(ev.deltaX) ? ev.deltaY : ev.deltaX); };
const onPostClick = () => { os.post({}); };
const scrollToTop = () => { if (contentEl.value) contentEl.value.scrollTo({ top: 0, behavior: 'smooth' }); };
// 旗鯖fork: ホームボタンは「HTLへ強制的に切り替える」ボタンではなく、今見ているTLタブを
// 一番上(最新)まで戻すボタンとして扱う。以前は following(HTL)以外のタブを見ている時に
// switchTab('following') を呼んでいたため、どのタブを見ていても強制的にHTLへ切り替わってしまい、
// 元のタブへ戻す手間が発生していた。
const goHome = () => {
	if (isPageView.value) { mainRouter.pushByPath('/', 'forcePage'); } else { scrollToTop(); }
};
const goBack = () => {
	if (window.history.length > 1) { window.history.back(); } else { goHome(); }
};
const openSearch = () => { mainRouter.push('/search'); };
const goToHatask = () => { mainRouter.push('/hatask'); };
const goToHatady = () => { mainRouter.push('/hatady'); };
const goToHataFeed = () => { mainRouter.push('/hatafeed'); };
const goToNotifications = () => { hasUnreadNotif.value = false; unreadNotifCount.value = 0; mainRouter.push('/my/notifications'); };
const goToLists = () => { mainRouter.push('/my/lists'); };
const goToChannels = () => { mainRouter.push('/channels'); };
const goToAntennas = () => { mainRouter.push('/my/antennas'); };

function rememberCurrentCollection() {
	const listId = activeListId.value;
	const antennaId = activeAntennaId.value;
	if (listId) miLocalStorage.setItem('hatasabaLastListId', listId);
	if (antennaId) miLocalStorage.setItem('hatasabaLastAntennaId', antennaId);
}

async function openPreferredList() {
	const lists = await userListsCache.fetch().catch(() => []);
	const path = getPreferredTimelinePath(lists, miLocalStorage.getItem('hatasabaLastListId'), 'list');
	if (path != null) mainRouter.pushByPath(path);
	else timelinePickerKind.value = 'list';
}

async function openPreferredAntenna() {
	const antennas = await antennasCache.fetch().catch(() => []);
	const path = getPreferredTimelinePath(antennas, miLocalStorage.getItem('hatasabaLastAntennaId'), 'antenna');
	if (path != null) mainRouter.pushByPath(path);
	else timelinePickerKind.value = 'antenna';
}

async function toggleTimelinePicker(kind: TimelineCollectionKind) {
	if (timelinePickerKind.value === kind) { timelinePickerKind.value = null; return; }
	if (kind === 'list') await userListsCache.fetch().catch(() => []);
	else await antennasCache.fetch().catch(() => []);
	timelinePickerKind.value = kind;
}

function selectTimelineCollection(id: string) {
	const kind = timelinePickerKind.value;
	if (!kind) return;
	miLocalStorage.setItem(kind === 'list' ? 'hatasabaLastListId' : 'hatasabaLastAntennaId', id);
	timelinePickerKind.value = null;
	mainRouter.pushByPath(`/timeline/${kind}/${id}`);
}

function openEmptyCollectionOptions() {
	const kind = timelinePickerKind.value;
	timelinePickerKind.value = null;
	if (kind === 'list') goToLists();
	else if (kind === 'antenna') goToAntennas();
}

function openActiveCollectionSettings(kind: TimelineCollectionKind) {
	const id = kind === 'list' ? activeListId.value : activeAntennaId.value;
	if (!id) return;
	timelinePickerKind.value = null;
	if (kind === 'list') {
		mainRouter.push('/my/lists/:listId', { params: { listId: id } });
	} else {
		mainRouter.push('/my/antennas/:antennaId', { params: { antennaId: id } });
	}
}

const topNavStackEl = ref<HTMLElement | null>(null);

function closeTimelinePickerOnOutsidePointer(ev: PointerEvent) {
	if (timelinePickerKind.value == null) return;
	const target = ev.target;
	if (target instanceof Node && topNavStackEl.value?.contains(target)) return;
	timelinePickerKind.value = null;
}

function openAntennaList(ev?: MouseEvent) {
	if (isAntennaTimelinePage.value && ev) toggleTimelinePicker('antenna');
	else openPreferredAntenna();
}

const goToDrive = () => { mainRouter.push('/my/drive'); };
// 旗鯖fork: メッセージ (チャット) へ遷移
const goToChat = () => { mainRouter.push('/chat'); };
const goToAnnouncements = () => { mainRouter.push('/announcements'); };
const openUiSetup = async () => {
	const { defineAsyncComponent: dac } = await import('vue');
	const { dispose } = os.popup(dac(() => import('@/components/MkUISetup.vue')), {}, { closed: () => dispose() });
};
const goToSettings = () => { mainRouter.push('/settings'); };
const goToAdmin = () => { mainRouter.push('/admin'); };

// 旗鯖fork: ページ全体をリロードする。
async function reloadPage(ev?: Event) {
	if (ev) {
		playHataIconMotion(ev, 'reload-spin', 540);
		if (prefer.s.animation && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise(resolve => window.setTimeout(resolve, 540));
	}
	window.location.reload();
}

async function clearCacheWithMotion(ev?: Event) {
	if (ev) {
		playHataIconMotion(ev, 'cache-clear', 720);
		if (prefer.s.animation && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise(resolve => window.setTimeout(resolve, 720));
	}
	await clearCache();
}

// ===== サイドバー項目ヘルパー =====
function sidebarItemClick(id: string, ev?: MouseEvent) {
	if (ev && id !== 'reload' && id !== 'cacheClear' && id !== 'more') {
		playHataNavigationMotion(ev, id, 620);
	}
	// モバイルドロワーのボタンを先に消すと、遅延読込中にLaunchPadのアンカーを失う。
	// LaunchPadが閉じるまでドロワーを残し、狭幅PCのpopup配置も壊さない。
	if (id === 'more' && ev && simpleDrawerShowing.value) {
		void openMore(ev, true);
		return;
	}
	simpleDrawerShowing.value = false;
	// 旗鯖fork: 外部リンク項目は新しいタブで開く
	const item = sidebarOrder.value.find((x: any) => x.id === id);
	if (item?.external && item.url) {
		window.open(item.url, '_blank', 'noopener');
		return;
	}
	const map: Record<string, ()=>void> = {
		timeline: goHome, notifications: () => goToNotifications(), search: () => openSearch(),
		chat: () => goToChat(),
		hatask: () => goToHatask(), lists: () => goToLists(), channels: () => goToChannels(),
		antennas: () => { if (ev) openAntennaList(ev); else goToAntennas(); }, drive: () => goToDrive(),
		announcements: () => goToAnnouncements(), uiSetup: () => openUiSetup(),
		// 旗鯖fork: 新規追加項目
		favorites: () => mainRouter.push('/my/favorites'),
		explore: () => mainRouter.push('/explore'),
		followRequests: () => mainRouter.push('/my/follow-requests'),
		// 旗鯖fork: HataFeed / Hatady / 地震・津波情報
		hatafeed: () => mainRouter.push('/hatafeed'),
		hatady: () => mainRouter.push('/hatady'),
		earthquake: () => mainRouter.push('/earthquake'),
		// 旗鯖fork: 外部通知専用ページへ
		externalNotifications: () => mainRouter.push('/my/external-notifications'),
		more: () => { if (ev) openMore(ev); },
		// 旗鯖fork: reload はクリックでページ全体をリロード (旧来は独立ボタンだったが sidebar 項目化)
		reload: () => reloadPage(ev),
		// 既存のクライアントキャッシュ削除処理を使い、取得し直したあと全タブを再読み込みする。
		cacheClear: () => { void clearCacheWithMotion(ev); },
	};
	if (map[id]) {
		map[id]();
		return;
	}

	// HataSideStudioは「もっと！」(navbarItemDef)の項目も直接配置できる。
	// 既存の専用mapと外部リンクを優先したうえで、未知IDだけ本家定義へ安全に委譲する。
	type StudioNavbarFallback = {
		show?: boolean;
		to?: string;
		action?: (event?: MouseEvent) => void;
	};
	const fallback = (navbarItemDef as unknown as Record<string, StudioNavbarFallback | undefined>)[id];
	if (fallback == null || fallback.show === false) return;
	if (typeof fallback.to === 'string') {
		mainRouter.pushByPath(fallback.to as never);
		return;
	}
	fallback.action?.(ev);
}

function playSimpleNavMotion(ev: Event, id: string): void {
	playHataNavigationMotion(ev, id, 620);
}

function sidebarItemActive(id: string): boolean {
	const known = ({
		timeline: isHomeTL.value && !isPageView.value,
		notifications: isNotifPage.value, search: isSearchPage.value,
		chat: isChatPage.value,
		hatask: isHataskPage.value, lists: isListPage.value,
		channels: isChannelPage.value, antennas: isAntennaPage.value,
		drive: isDrivePage.value,
		announcements: mainRouter.currentRoute.value.path.startsWith('/announcements'),
		// 旗鯖fork: 新規追加項目のアクティブ判定
		favorites: mainRouter.currentRoute.value.path.startsWith('/my/favorites'),
		explore: mainRouter.currentRoute.value.path.startsWith('/explore'),
		followRequests: mainRouter.currentRoute.value.path.startsWith('/my/follow-requests'),
		hatafeed: mainRouter.currentRoute.value.path.startsWith('/hatafeed'),
		hatady: mainRouter.currentRoute.value.path.startsWith('/hatady'),
		earthquake: mainRouter.currentRoute.value.path.startsWith('/earthquake'),
		// 旗鯖fork: 外部通知ページのアクティブ判定
		externalNotifications: mainRouter.currentRoute.value.path.startsWith('/my/external-notifications'),
	} as Record<string, boolean | undefined>)[id];
	if (known != null) return known;
	const fallback = (navbarItemDef as unknown as Record<string, { show?: boolean; to?: string } | undefined>)[id];
	return fallback?.show !== false && typeof fallback?.to === 'string' && mainRouter.currentRoute.value.path.startsWith(fallback.to);
}

// ===== インスタンス情報 =====
const instanceNameStr = computed(() => instance.name || instanceName);
const instanceIconUrl = computed(() => instance.iconUrl || '/favicon.ico');

// ===== ドライブページ判定 =====
const isDrivePage = computed(() => mainRouter.currentRoute.value.path.startsWith('/my/drive'));
// 旗鯖fork: メッセージ (チャット) ページ判定
const isChatPage = computed(() => mainRouter.currentRoute.value.path.startsWith('/chat'));
const isAdminPage = computed(() => mainRouter.currentRoute.value.path.startsWith('/admin'));

// ===== もっとメニュー（ランチパッド） =====
async function openMore(ev: MouseEvent | PointerEvent, closeMobileDrawerAfter = false) {
	const target = (ev.currentTarget ?? ev.target) as HTMLElement;
	if (!target) return;
	playHataIconMotion(ev, 'more-dots', 520);
	const { dispose } = await os.popupAsyncWithDialog(
		import('@/components/MkLaunchPad.vue').then(component => component.default),
		{ anchorElement: target },
		{
			closed: () => {
				if (closeMobileDrawerAfter) simpleDrawerShowing.value = false;
				dispose();
			},
		},
	);
}

// ===== サーバーメニュー =====
function openInstanceMenuMobile(ev: MouseEvent | PointerEvent) {
	openInstanceMenu(ev as PointerEvent);
}

// ===== TL設定ポップアップ =====
const withRenotes = computed<boolean>({
	get: () => store.r.tl.value.filter.withRenotes,
	set: (x) => saveTlFilter('withRenotes', x),
});
const withSensitive = computed<boolean>({
	get: () => store.r.tl.value.filter.withSensitive,
	set: (x) => saveTlFilter('withSensitive', x),
});
const onlyFiles = computed<boolean>({
	get: () => store.r.tl.value.filter.onlyFiles,
	set: (x) => saveTlFilter('onlyFiles', x),
});
const showFixedPostForm = prefer.model('showFixedPostForm');

function saveTlFilter(key: string, newValue: boolean) {
	const out = deepMerge({ filter: { [key]: newValue } }, store.s.tl);
	store.set('tl', out);
}

function openTlOptions(ev: MouseEvent | PointerEvent) {
	os.popupMenu([{
		type: 'switch',
		icon: 'ti ti-repeat',
		text: i18n.ts.showRenotes,
		ref: withRenotes,
	}, {
		type: 'switch',
		icon: 'ti ti-eye-exclamation',
		text: i18n.ts.withSensitive,
		ref: withSensitive,
	}, {
		type: 'switch',
		icon: 'ti ti-photo',
		text: i18n.ts.fileAttachedOnly,
		ref: onlyFiles,
	}, {
		type: 'divider',
	}, {
		type: 'switch',
		text: i18n.ts.showFixedPostForm,
		ref: showFixedPostForm,
	}, {
		type: 'divider',
	}, {
		icon: 'ti ti-layout-sidebar-left-expand',
		text: copy.openHataSideStudio,
		action: () => mainRouter.push('/hata-side-studio'),
	}], ev.currentTarget ?? ev.target);
}

// ===== リアルタイムモード =====
const isRealtimeMode = computed(() => store.r.realtimeMode.value);

function toggleRealtimeMode() {
	store.set('realtimeMode', !store.s.realtimeMode);
	window.location.reload();
}

// ===== ユーザーパネル =====
const userPanelUserId = ref<string | null>(null);

// ===== 通知バッジ / お知らせ未読 =====
// hasUnreadNotif: 未読通知の有無 (boolean)
// unreadNotifCount: 未読通知の件数 (number) - 表示用
// hasUnreadAnnouncements: 未読お知らせの有無 (computed) - 本家準拠で $i.hasUnreadAnnouncement を直接参照
const hasUnreadNotif = ref(false);
const unreadNotifCount = ref(0);
const hasUnreadAnnouncements = computed(() => $i != null && $i.hasUnreadAnnouncement === true);
// 旗鯖fork: 未読メッセージ (チャット) の有無
const hasUnreadChat = computed(() => $i != null && $i.hasUnreadChatMessages === true);
// 通知バッジに件数を表示するかどうかの preference 参照（既存設定との統合）
// true: 件数バッジ表示 / false: ドットのみ表示
const showUnreadNotifCount = computed(() => prefer.s.showUnreadNotificationsCount === true);
let mainCh:any = null;
let unreadPollTimer: number | null = null;

// 通知の現在値を $i から同期（reactivity 補強）
const syncUnreadFromI = () => {
	if (!$i) return;
	// 本家準拠: hasUnreadNotification (boolean) を最優先
	if (typeof $i.hasUnreadNotification === 'boolean') {
		hasUnreadNotif.value = $i.hasUnreadNotification;
	}
	if (typeof $i.unreadNotificationsCount === 'number') {
		unreadNotifCount.value = $i.unreadNotificationsCount;
		// hasUnreadNotification が無い古い環境のフォールバック
		if (typeof $i.hasUnreadNotification !== 'boolean') {
			hasUnreadNotif.value = $i.unreadNotificationsCount > 0;
		}
	}
};

// 初期状態の取得（$i に値があればそれを使い、無ければ API 取得）
const checkUnread = async() => {
	try {
		syncUnreadFromI();
		// $i に何も値が無い場合のフォールバック: API で直近1件取得
		if (!$i || (typeof $i.hasUnreadNotification !== 'boolean' && typeof $i.unreadNotificationsCount !== 'number')) {
			// 旗鯖fork: os.api は存在しないため misskeyApi を動的importして使う(従来はcatchで握り潰され未読フォールバックが機能していなかった)
			const { misskeyApi } = await import('@/utility/misskey-api.js');
			const r = await misskeyApi('i/notifications', { limit: 1 });
			const first = Array.isArray(r) ? (r as Array<{ isRead?: boolean }>)[0] : undefined;
			if (first && first.isRead !== true) {
				hasUnreadNotif.value = true;
			} else {
				hasUnreadNotif.value = false;
				unreadNotifCount.value = 0;
			}
		}
	} catch {}
};

// useStream() でストリームのシングルトンを取得し、main チャンネルを購読
// 接続未完了でも先にリスナーを登録しておけば、接続成立後に正しく発火する
const initStream = () => {
	if (mainCh) return; // 二重初期化防止
	try {
		const stream = useStream();
		if (!stream) {
			console.warn('[hatasaba] useStream() returned null, scheduling retry');
			window.setTimeout(initStream, 2000);
			return;
		}
		mainCh = stream.useChannel('main');

		// 新規通知
		mainCh.on('notification', () => {
			if (mainRouter.currentRoute.value.path.startsWith('/my/notifications')) return;
			hasUnreadNotif.value = true;
			// $i は本家の `meUpdated` イベント経由で自動更新される
			// ここでは即時反応のためインクリメント or 同期
			if (typeof $i?.unreadNotificationsCount === 'number') {
				unreadNotifCount.value = $i.unreadNotificationsCount;
			} else {
				unreadNotifCount.value++;
			}
		});

		// 未読通知サマリ（接続復帰時など）
		mainCh.on('unreadNotification', () => {
			if (mainRouter.currentRoute.value.path.startsWith('/my/notifications')) return;
			hasUnreadNotif.value = true;
			syncUnreadFromI();
		});

		// 全て既読化
		mainCh.on('readAllNotifications', () => {
			hasUnreadNotif.value = false;
			unreadNotifCount.value = 0;
		});

		// 接続切断時のログのみ（ハンドラ自体は残る、再接続時に発火継続）
		stream.on('_disconnected_', () => {
			console.info('[hatasaba] stream disconnected (will auto-reconnect)');
		});

		// 接続成立後に1度同期しておく（$i に最新値があるはず）
		syncUnreadFromI();
	} catch (e) {
		console.warn('[hatasaba] Stream init failed, retrying:', e);
		mainCh = null;
		window.setTimeout(initStream, 2000);
	}
};

// $i.unreadNotificationsCount を定期的にポーリング（ストリーム不調時の保険）
const startUnreadPoll = () => {
	if (unreadPollTimer) return;
	unreadPollTimer = window.setInterval(checkUnread, 60000);
};
const stopUnreadPoll = () => {
	if (unreadPollTimer) { window.clearInterval(unreadPollTimer); unreadPollTimer = null; }
};

// ===== ユーザーパネルイベントリスナー =====
function onSimpleUserPanel(ev: Event) {
	const detail = (ev as CustomEvent).detail;
	if (detail?.userId) {
		ev.preventDefault(); // MkNote側のフォールバックポップアップを抑制
		// directProfile ON → ユーザーパネルを経由せず直接プロフィールへ
		if (prefer.s['simpleUi.directProfile']) {
			import('@/utility/misskey-api.js').then(({ misskeyApi }) => {
				misskeyApi('users/show', { userId: detail.userId }).then((u: any) => {
					const path = u.host ? `/@${u.username}@${u.host}` : `/@${u.username}`;
					mainRouter.pushByPath(path);
				});
			});
			return;
		}
		userPanelUserId.value = detail.userId;
	}
}

// 旗鯖fork: デッキ初表示時にチュートリアルを出す監視(全変数定義後に登録)
watch(deckActive, (v) => { if (v) maybeShowDeckTutorial(); }, { immediate: true });

// 旗鯖fork: お知らせ吹き出しの表示時に、アンカー座標を計算して fixed 配置する
watch([deckAnnounceVisible, collapseAnnounceVisible, moreAnnounceVisible], () => {
	nextTick(() => { updateAnnouncePositions(); });
});

onMounted(() => {
	cleanupStaleUiElements();
	checkIsPageView();
	rememberCurrentCollection();
	if (isListTimelinePage.value) userListsCache.fetch().catch(() => []);
	if (isAntennaTimelinePage.value) antennasCache.fetch().catch(() => []);
	// 旗鯖fork: ログインボーナス(ログイン日数)ポップアップは universal.vue でしか呼ばれておらず、
	//   Hataskey UI(simple)では表示されなかった(他UIに切替えると出る)。ここでも呼んで設定を尊重する。
	showLoginBonusIfNeeded();
	// 旗鯖fork(タスク3): デスクトップで未表示なら、デッキ表示追加のお知らせ吹き出しを出す
	if (isDesktop.value && !prefer.s['simpleUi.deckAnnounceShown']) {
		deckAnnounceVisible.value = true;
	}
	// 旗鯖fork: デスクトップ通常表示(デッキでない)で未表示なら、縮小/拡大お知らせを出す
	if (isDesktop.value && !deckActive.value && !prefer.s['simpleUi.collapseAnnounceShown']) {
		collapseAnnounceVisible.value = true;
	}
	// 旗鯖fork: HataFeed を利用でき、未表示なら「もっと」に新登場の案内を出す。
	// prefer (マルチデバイス同期) と miLocalStorage (旧来の端末ローカル) のどちらかが立っていれば skip。
	// 端末ローカルだけで判定すると別端末/シークレットで毎回再表示される本番不具合があったため
	// prefer 経由を優先しつつ、既存ユーザー保護のため miLocalStorage も互換チェックする。
	if (isDesktop.value && !deckActive.value
        && !prefer.s['simpleUi.hatafeedIntroShown']
        && !miLocalStorage.getItem('hatafeedIntroShown')
	        && ((($i?.policies as Record<string, unknown> | undefined)?.canAccessHataFeed) === true || $i?.isModerator || $i?.isAdmin)) {
		moreAnnounceVisible.value = true;
	}
	// 旗鯖fork: 復元したタブが現在の設定で表示可能か検証し、非表示なら先頭タブにフォールバック
	if (!tabOrder.value.includes(tab.value)) {
		tab.value = tabOrder.value[0] ?? 'following';
	}
	// ストリームを先に初期化してから初期同期（接続未完了でもリスナー登録は有効）
	initStream();
	checkUnread();
	startUnreadPoll();
	window.addEventListener('simple-user-panel', onSimpleUserPanel);
	nextTick(() => { startThemeWatch(); });
	nextTick(() => { updateSbFade(); });
	window.addEventListener('ext-tl-notif-count', onExtNotifCount);
	window.addEventListener('external-notification', onExtNotifRealtime);
	window.document.addEventListener('pointerdown', closeTimelinePickerOnOutsidePointer, true);
	// 旗鯖fork: 起動時に1回だけ外部通知の未読有無を初期化 (WS受信前の既存未読を反映)
	// 外部通知ページ閲覧中は除外。localStorage の lastReadAt 基準で未読判定。
	if (isExternalLinked.value && !mainRouter.currentRoute.value.path.startsWith('/my/external-notifications')) {
		(async () => {
			try {
				const { callExternalApi } = await import('@/utility/external-api.js');
				const notifs = await callExternalApi('i/notifications', { limit: 20, markAsRead: false });
				if (Array.isArray(notifs)) {
					const lastReadTs = localStorage.getItem('extNotifLastReadAt');
					const lastReadTime = lastReadTs ? new Date(lastReadTs).getTime() : 0;
					const hasUnread = notifs.some((n: any) => !lastReadTime || new Date(n.createdAt).getTime() > lastReadTime);
					extNotifHasUnread.value = hasUnread;
				}
			} catch { /* 取得失敗時はドットなし */ }
		})();
	}
});
onUnmounted(() => {
	mainCh?.dispose();
	mainCh = null;
	stopUnreadPoll();
	stopThemeWatch();
	if (scrollTimer) window.clearTimeout(scrollTimer);
	window.removeEventListener('ext-tl-notif-count', onExtNotifCount);
	window.removeEventListener('external-notification', onExtNotifRealtime);
	window.document.removeEventListener('pointerdown', closeTimelinePickerOnOutsidePointer, true);
	window.removeEventListener('resize', onResize);
	window.removeEventListener('simple-user-panel', onSimpleUserPanel);
});
</script>

<style lang="scss" module>
.root { display:flex; flex-direction:column; height:100dvh; background:var(--MI_THEME-bg); overflow:hidden; user-select:none; -webkit-tap-highlight-color:transparent; }

// ===== デスクトップレイアウト =====
.desktopLayout {
    flex-direction:row;
}

// ===== オリジナルサイドバー =====
.sidebar {
    width:220px;
    flex-shrink:0;
    height:100dvh;
    background:var(--MI_THEME-navBg);
    display:flex;
    flex-direction:column;
    border-right:solid 0.5px var(--MI_THEME-divider);
    position:relative;
    overflow:hidden;
}
.sidebarWide {
	width:280px;
}
/* 旗鯖fork: デッキモード時はサイドバーをアイコンのみの細表示に折り畳む(横幅を最大化) */
.sidebarDeckFolded {
    width:64px;
    transition:width .2s ease;
}
.sidebarDeckFolded .sbLabel,
.sidebarDeckFolded .sbGroupLabel,
.sidebarDeckFolded .sbBadge,
.sidebarDeckFolded .sbUsername,
.sidebarDeckFolded .sbLogoWrap,
.sidebarDeckFolded .sbLogoSub,
.sidebarDeckFolded .sbLogoText,
.sidebarDeckFolded .sidebarBanner {
    display:none;
}
.sidebarDeckFolded .sbItem,
.sidebarDeckFolded .sbPostBtn,
.sidebarDeckFolded .sbAccount {
    justify-content:center;
    padding-left:0;
    padding-right:0;
    gap:0;
}
.sidebarDeckFolded .sidebarInner {
    padding-left:8px;
    padding-right:8px;
}
.sidebarDeckFolded .sbModeToggle {
    flex-direction:column;
    gap:4px;
}
/* 応急処置: 折り畳み時にメニューが縦に収まらず切れる問題を緩和。
   下部(投稿/モード/アカウント)をコンパクトにし、メニュー領域(sbScroll)の可視範囲を確保。
   本格対応(ペンのみ表示・リアルタイムのボタン化等)はサイドメニュー刷新(S1)で行う。 */
.sidebarDeckFolded .sbBottom {
    gap:4px;
    padding-top:8px;
    margin-top:4px;
}
.sidebarDeckFolded .sbPostBtn {
    height:44px;
}
.sidebarDeckFolded .sbScroll {
    overflow-y:auto;
}
.sidebarBanner {
    position:absolute;
    inset:0;
    z-index:0;
    overflow:hidden;
    &::after {
        content:'';
        position:absolute;
        inset:0;
        background:var(--MI_THEME-navBg);
        opacity:.75;
        backdrop-filter:blur(20px);
        -webkit-backdrop-filter:blur(20px);
    }
}
.sidebarBannerImg {
    width:100%;
    height:100%;
    object-fit:cover;
    filter:blur(16px) saturate(1.2);
    transform:scale(1.1);
}
.sidebarInner {
    display:flex;
    flex-direction:column;
    height:100%;
    padding:16px 12px;
    box-sizing:border-box;
    overflow:hidden;
    position:relative;
    z-index:1;
}
.sbScrollWrap {
    /* 旗鯖fork: スクロール領域を内包し、上下のフェードを重ねる枠 */
    position:relative;
    flex:1;
    min-height:0;
    display:flex;
    flex-direction:column;
}
.sbScroll {
    /* 旗鯖fork: メニュー群だけをスクロールさせる領域。下部の投稿/アカウントは外側で固定。 */
    flex:1;
    min-height:0;
    overflow-y:auto;
    overflow-x:hidden;
    /* スクロールバーは非表示にし、代わりにフェードで続きを示す */
    scrollbar-width:none;
    -ms-overflow-style:none;
    display:flex;
    flex-direction:column;
	justify-content:flex-start;
	padding-bottom:2px;
	box-sizing:border-box;
}
.sbScroll::-webkit-scrollbar { width:0; height:0; display:none; }
/* 旗鯖fork: 続きがある方向をフェードで示す。以前は navBg 色のグラデーションを重ねていたが、
   サイドバーがすりガラス背景(バナーぼかし)の時に不透明な帯が浮いて目立っていた。
   代わりに mask-image でスクロール内容そのものを端で徐々に透明にする。背景色に依存せず、
   メニュー項目が端で自然に薄くなって「続きがある」と伝わる。 */
.sbScroll {
    transition: mask-image .2s, -webkit-mask-image .2s;
}
.fadeTop .sbScroll {
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 12px);
    mask-image: linear-gradient(to bottom, transparent 0, #000 12px);
}
.fadeBottom .sbScroll {
    -webkit-mask-image: linear-gradient(to top, transparent 0, #000 12px);
    mask-image: linear-gradient(to top, transparent 0, #000 12px);
}
.fadeTop.fadeBottom .sbScroll {
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
    mask-image: linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
}
.sbLogoRow {
    position:relative;
    display:flex;
    align-items:center;
    gap:4px;
    margin-bottom:20px;
}
.sbLogo {
    display:flex;
    align-items:center;
    gap:10px;
    padding:8px 10px;
    cursor:pointer;
    border-radius:12px;
    transition:background .2s;
    flex:1;
    min-width:0;
    &:hover { background:var(--MI_THEME-accentedBg); }
}
.sbLogoAction {
    width:34px;
    height:34px;
    border-radius:8px;
    display:flex;
    align-items:center;
    justify-content:center;
    background:transparent;
    border:none;
    color:var(--MI_THEME-navFg);
    opacity:.5;
    cursor:pointer;
    font-size:1.05rem;
    transition:all .2s;
    flex-shrink:0;
    &:hover { opacity:1; background:color-mix(in srgb, var(--MI_THEME-navFg) 8%, transparent); }
}
.sbLogoImg {
    width:28px;
    height:28px;
    border-radius:8px;
    object-fit:cover;
    flex-shrink:0;
}
.sbLogoText {
    font-size:.88rem;
    font-weight:700;
    color:var(--MI_THEME-navFg);
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
}
.sbLogoWrap {
    display:flex;
    flex-direction:column;
    min-width:0;
}
.sbLogoSub {
    font-size:.58rem;
    font-weight:400;
    opacity:.5;
    color:var(--MI_THEME-navFg);
    line-height:1;
    margin-bottom:1px;
}
.sbNav {
    display:flex;
    flex-direction:column;
    gap:2px;
}
.sbScroll > .sbNav:first-child {
    transform:translateY(var(--hss-parallax, 0));
    transition:transform 80ms linear;
}
.sbItem {
    display:flex;
    align-items:center;
    gap:12px;
    padding:10px 12px;
    border-radius:10px;
    border:none;
    background:transparent;
    cursor:pointer;
    font-family:inherit;
    font-size:.9rem;
    color:var(--MI_THEME-navFg);
    opacity:.7;
    transition:all .2s ease;
    position:relative;
    &:hover {
        background:color-mix(in srgb, var(--MI_THEME-navFg) 8%, transparent);
        opacity:1;
    }
}
.sbActive {
    background:var(--MI_THEME-accentedBg) !important;
    color:var(--MI_THEME-accent) !important;
    opacity:1 !important;
    font-weight:600;
}
.sbIcon {
    font-size:1.15rem;
    width:22px;
    text-align:center;
    flex-shrink:0;
}
.sbLabel {
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
}
.sbBadge {
    position:absolute;
    top:6px;
    right:10px;
    min-width:18px;
    height:18px;
    padding:0 5px;
    border-radius:9px;
    background:var(--MI_THEME-indicator, #f44);
    color:#fff;
    font-size:10px;
    font-weight:700;
    line-height:18px;
    text-align:center;
    box-sizing:border-box;
}
/* 旗鯖fork: 外部通知の未読青ドット (サイドメニュー用) */
.sbExtDot {
    position:absolute;
    top:10px;
    right:14px;
    width:8px;
    height:8px;
    border-radius:50%;
    background:#4a9eff;
}
.sbDot {
    position:absolute;
    top:10px;
    right:14px;
    width:8px;
    height:8px;
    border-radius:50%;
    background:var(--MI_THEME-accent, #4c93e2);
    box-shadow:0 0 0 2px var(--MI_THEME-panel, #fff);
}
.sbNotifDot {
    position:absolute;
    top:10px;
    right:14px;
    width:8px;
    height:8px;
    border-radius:50%;
    background:var(--MI_THEME-indicator, #f44);
    box-shadow:0 0 0 2px var(--MI_THEME-panel, #fff);
}
.sbGroupLabel {
    font-size:11px;
    font-weight:600;
    opacity:0.5;
    padding:4px 12px 2px;
    margin-top:8px;
    letter-spacing:0.04em;
    user-select:none;
}
.sbGroupLabel:first-child {
    margin-top:0;
}
/* HataSideStudio: 拡大時の自由配置。グループ内のウィジェットは必ず全幅を占有し、
   回転したボタンは上下の予約領域内で描画して隣の項目へ重ならない。 */
.hssGroup {
    min-width:0;
    padding:8px;
    margin:3px 0;
    border:var(--hss-border-width, 1px) var(--hss-border-style, solid) var(--hss-border, var(--MI_THEME-divider));
    border-radius:14px;
    background:var(--hss-bg, transparent);
	overflow:visible;
}
.hssRoot[data-hss-mode="expanded"] {
    display:grid;
    grid-template-columns:repeat(var(--hss-normal-columns, 1), minmax(0, 1fr));
    align-items:start;
	gap:4px;
	align-content:start;
}
.hssRoot[data-hss-mode="expanded"] .hssGroup,
.hssRoot[data-hss-mode="expanded"] .hssWidget {
    grid-column:1 / -1;
}
.hssMobileRoot {
	width:100%;
	min-width:0;
	padding:0 8px 8px;
	box-sizing:border-box;
}
.hssRoot[data-hss-mode="collapsed"] {
    display:flex;
    flex-direction:column;
    align-items:center;
}
.hssGroupTitle {
    padding:1px 5px 7px;
    color:var(--hss-fg, var(--MI_THEME-navFg));
    font-size:11px;
    font-weight:700;
    opacity:.62;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
}
.hssGroupGrid {
    display:grid;
    grid-template-columns:repeat(var(--hss-columns, 1), minmax(0, 1fr));
	gap:4px;
    min-width:0;
}
.hssGroup[data-hss-masonry="on"] .hssGroupGrid {
    display:block;
    column-count:var(--hss-columns, 1);
	column-gap:4px;
}
.hssGroup[data-hss-masonry="on"] .hssItemSlot,
.hssGroup[data-hss-masonry="on"] .hssWidget {
	display:grid;
	width:100%;
	margin:0 0 4px;
	break-inside:avoid;
}
.hssGroup[data-hss-masonry="on"] .hssWidget {
	column-span:all;
}
.hssItemSlot {
	min-width:0;
	box-sizing:border-box;
	display:grid;
	align-items:stretch;
	padding:var(--hss-rotation-space, 1px) 1px;
	overflow:visible;
}
.hssItemSlot[data-hss-shape="circle"] { place-items:center; }
.hssButton {
	width:100%;
	min-width:0;
	min-height:40px;
	box-sizing:border-box;
    color:var(--hss-fg, var(--MI_THEME-navFg));
    border:var(--hss-border-width, 1px) var(--hss-border-style, solid) var(--hss-border, transparent);
	background:var(--hss-bg, transparent);
	transform:rotate(var(--hss-rotation, 0deg));
	transform-origin:center;
	margin:0;
	overflow:visible;
	font-size:.9rem;
}
.hssGroupGrid[data-hss-columns="2"] .hssButton,
.hssGroupGrid[data-hss-columns="3"] .hssButton {
    flex-direction:column;
    justify-content:center;
    gap:4px;
    padding:8px 4px;
    text-align:center;
}
.hssGroupGrid[data-hss-columns="2"] .sbLabel,
.hssGroupGrid[data-hss-columns="3"] .sbLabel {
    width:100%;
	font-size:12px;
	line-height:1.25;
}
.hssButton[data-hss-shape="circle"] {
	justify-self:center;
	width:44px;
	min-width:44px;
	height:44px;
	min-height:44px;
	margin-inline:auto;
	padding:7px;
	border-radius:50%;
	aspect-ratio:auto;
	justify-content:center;
}
.hssButton[data-hss-shape="circle"] .sbLabel,
.hssButton[data-hss-shape="circle"] .hssButtonLines { display:none; }
.hssButton[data-hss-shape="circle"][data-hss-size="small"] { width:36px;min-width:36px;height:36px;min-height:36px; }
.hssButton[data-hss-shape="circle"][data-hss-size="large"] { display:flex;width:54px;min-width:54px;height:54px;min-height:54px; }
.hssButton[data-hss-shape="pill"] { width:calc(100% - 4px);margin-inline:2px;border-radius:999px; }
.hssButton[data-hss-size="small"] { min-height:34px; padding-block:6px; font-size:.78rem; }
.hssButton[data-hss-size="large"] {
	display:grid;
	grid-template-columns:minmax(0, 1fr);
	grid-auto-rows:auto;
	align-items:start;
	justify-items:stretch;
	gap:4px;
	min-height:98px;
	padding:11px 12px;
	font-size:.95rem;
	line-height:1.35;
	text-align:left;
}
.hssButton[data-hss-shape="circle"][data-hss-size="large"] {
	display:flex;
	grid-template-columns:none;
	grid-template-rows:none;
	min-height:54px;
	padding:7px;
}
.hssButton[data-hss-size="large"] .sbIcon { grid-column:1;grid-row:auto;width:auto;text-align:left;font-size:1.25rem; }
.hssButton[data-hss-size="large"] .sbLabel { grid-column:1;display:block;width:100%;min-width:0;font-size:.95rem;font-weight:700;line-height:1.3;text-align:left;white-space:normal;overflow-wrap:anywhere; }
.hssButtonLines {
	grid-column:1;
	display:grid;
	gap:2px;
    min-width:0;
	max-height:none;
	overflow:visible;
    line-height:1.35;
	font-size:12.5px;
    font-weight:400;
	opacity:.72;
	text-align:left;
	writing-mode:horizontal-tb;
}
.hssButtonLines > span {
	min-width:0;
	white-space:normal;
	word-break:normal;
	overflow-wrap:break-word;
}
.hssButtonSignals {
	grid-column:1 / -1;
	display:flex;
	flex-wrap:wrap;
	gap:3px;
	min-width:0;
	margin-top:6px;
}
.hssButtonSignals > button {
	min-width:0;
	padding:2px 6px;
	border:0;
	border-radius:999px;
	background:color-mix(in srgb, currentColor 10%, transparent);
	color:inherit;
	cursor:pointer;
	font:inherit;
	font-size:9px;
	font-weight:650;
	line-height:1.35;
	overflow:hidden;
	text-overflow:ellipsis;
	white-space:nowrap;
}
.hssButtonSignals > button:hover,.hssButtonSignals > button:focus-visible { background:color-mix(in srgb, currentColor 20%, transparent);outline:1px solid currentColor; }
.hssSearchButton {
	display:grid !important;
	grid-template-columns:20px minmax(0, 1fr) 28px !important;
	grid-template-rows:1fr !important;
	gap:6px !important;
	min-height:52px !important;
	padding:7px 7px 7px 10px !important;
	border-radius:14px;
	opacity:1;
}
.hssSearchButton > input {
	min-width:0;
	width:100%;
	padding:7px 8px;
	border:0;
	outline:0;
	border-radius:9px;
	background:color-mix(in srgb, var(--MI_THEME-panel) 78%, transparent);
	color:var(--hss-fg, var(--MI_THEME-navFg));
	font:inherit;
	font-size:11px;
}
.hssSearchButton > input::placeholder { color:currentColor; opacity:.52; }
.hssSearchButton > button {
	display:grid;
	place-items:center;
	width:28px;
	height:28px;
	padding:0;
	border:0;
	border-radius:9px;
	background:var(--MI_THEME-accent);
	color:var(--MI_THEME-fgOnAccent);
	cursor:pointer;
}
.hssWidget {
	grid-column:1 / -1;
	display:block;
	width:100%;
	min-width:0;
	height:auto;
	/* minHeight は native widget の内容領域に対する保証値。外枠の
	   padding と border を加え、内容がそれ以上なら自然に伸ばす。 */
	min-height:calc(var(--hss-widget-min-height, 72px) + 10px);
	box-sizing:border-box;
	padding:4px;
	color:var(--hss-fg, var(--MI_THEME-navFg));
    border:var(--hss-border-width, 1px) var(--hss-border-style, solid) var(--hss-border, var(--MI_THEME-divider));
    border-radius:13px;
	background:var(--hss-bg, var(--MI_THEME-panel));
	overflow:clip;
	text-align:left;
}
.hssWidget > * { width:100%; min-width:0; }
.hssWidgetFrame { width:100%;height:auto;min-width:0;min-height:var(--hss-widget-min-height,72px);box-sizing:border-box;overflow:visible;overscroll-behavior:auto;touch-action:auto; }
.hssWidgetFrame > * { width:100%;min-width:0;box-sizing:border-box; }
.hssWidget[data-hss-kind="announcements"] .hssWidgetFrame { display:grid;place-items:center;text-align:center;overflow:clip; }
.hssWidget[data-hss-kind="announcements"] .hssWidgetFallback { justify-content:center;text-align:center; }
.hssWidget[data-hss-kind="postForm"] .hssWidgetFrame { overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;touch-action:pan-x;scroll-behavior:smooth;scrollbar-width:thin; }
.hssWidget[data-hss-kind="postForm"] :global(.mkw-post-form) { width:max(100%,260px)!important;min-width:260px!important;box-sizing:border-box; }
.hssWidget[data-hss-kind="postForm"] :global(.mkw-post-form footer) { display:block!important;width:100%!important;max-width:none!important;overflow-x:auto!important;overflow-y:hidden!important;overscroll-behavior-x:contain;touch-action:pan-x;padding-inline:8px!important;box-sizing:border-box;scrollbar-width:thin; }
.hssWidget[data-hss-kind="postForm"] :global(.mkw-post-form footer > div) { display:flex!important;flex-wrap:nowrap!important;width:max-content!important;min-width:100%!important;max-width:none!important;overflow:visible!important; }
.hssWidget[data-hss-kind="postForm"] :global(.mkw-post-form footer > div > button) { flex:0 0 38px!important;width:38px!important;min-width:38px!important;height:40px!important; }
.hssWidget[data-hss-kind="digitalClock"] .hssWidgetFrame,
.hssWidget[data-hss-kind="clock"] .hssWidgetFrame,
.hssWidget[data-hss-kind="rssTicker"] .hssWidgetFrame,
.hssWidget[data-hss-kind="onlineUsers"] .hssWidgetFrame { display:grid;place-items:center;overflow:clip; }
.hssWidget[data-hss-kind="digitalClock"] :global([data-testid="mkw-digitalClock"]),
.hssWidget[data-hss-kind="clock"] :global([data-testid="mkw-clock"]),
.hssWidget[data-hss-kind="onlineUsers"] :global([data-testid="mkw-onlineUsers"]) { display:grid!important;place-items:center!important;width:100%!important;height:100%!important;min-height:0!important;padding-block:0!important;box-sizing:border-box; }
.hssWidget[data-hss-kind="digitalClock"] :global([data-testid="mkw-digitalClock"]) { padding-block:0!important; }
.hssWidget[data-hss-kind="clock"] :global([data-testid="mkw-clock"]) { opacity:1!important;filter:none!important; }
.hssWidget[data-hss-kind="rssTicker"] :global(.mkw-rss-ticker) { width:100%!important;min-height:0!important;margin:auto 0; }
.hssWidget[data-hss-kind="rss"] :global(.mkw-rss),
.hssWidget[data-hss-kind="trends"] :global(.mkw-trends) { width:100%!important;min-height:0!important; }
.hssWidget[data-hss-kind="rss"] :global(.mkw-rss a) { padding:5px 9px!important;font-size:.8rem; }
.hssWidget[data-hss-kind="trends"] :global(.wbrkwala),
.hssWidget[data-hss-kind="federation"] :global(.wbrkwalb) { height:auto!important;max-height:none!important;overflow:visible!important; }
.hssWidget[data-hss-kind="trends"] :global(.tags > div) { min-height:0!important;padding:7px 9px!important; }
.hssWidget[data-hss-kind="federation"] :global(.instances > .instance) { min-height:0!important;padding:7px 9px!important; }
.hssWidget[data-hss-kind="trends"][data-hss-size="small"] :global(.tags > div:nth-child(n+2)),
.hssWidget[data-hss-kind="federation"][data-hss-size="small"] :global(.instances > .instance:nth-child(n+2)),
.hssWidget[data-hss-kind="trends"][data-hss-size="normal"] :global(.tags > div:nth-child(n+3)),
.hssWidget[data-hss-kind="federation"][data-hss-size="normal"] :global(.instances > .instance:nth-child(n+3)),
.hssWidget[data-hss-kind="trends"][data-hss-size="large"] :global(.tags > div:nth-child(n+4)),
.hssWidget[data-hss-kind="federation"][data-hss-size="large"] :global(.instances > .instance:nth-child(n+4)) { display:none!important; }
.hssWidget[data-hss-kind="notifications"] :global(.mkw-notifications),
.hssWidget[data-hss-kind="externalNotifications"] :global(.mkw-externalNotifications),
.hssWidget[data-hss-kind="timeline"] :global(.mkw-timeline) { width:100%!important;height:auto!important;min-height:var(--hss-widget-min-height,112px)!important;box-sizing:border-box;overflow:clip!important; }
.hssWidget[data-hss-kind="notifications"] :global(.mkw-notifications > div:last-child),
.hssWidget[data-hss-kind="externalNotifications"] :global(.mkw-externalNotifications > div:last-child),
.hssWidget[data-hss-kind="timeline"] :global(.mkw-timeline > div:last-child) { overflow:visible!important; }
.hssWidget[data-hss-kind="notifications"] :global(.mkw-notifications > div:last-child > div > div > div > button),
.hssWidget[data-hss-kind="timeline"] :global(.mkw-timeline > div:last-child > div > div > div > button) { display:none!important; }
.hssWidget[data-hss-kind="notifications"][data-hss-size="small"] :global([data-scroll-anchor]:nth-child(n+2)),
.hssWidget[data-hss-kind="timeline"][data-hss-size="small"] :global([data-scroll-anchor]:nth-child(n+2)),
.hssWidget[data-hss-kind="notifications"][data-hss-size="normal"] :global([data-scroll-anchor]:nth-child(n+3)),
.hssWidget[data-hss-kind="timeline"][data-hss-size="normal"] :global([data-scroll-anchor]:nth-child(n+3)),
.hssWidget[data-hss-kind="notifications"][data-hss-size="large"] :global([data-scroll-anchor]:nth-child(n+4)),
.hssWidget[data-hss-kind="timeline"][data-hss-size="large"] :global([data-scroll-anchor]:nth-child(n+4)) { display:none!important; }
.hssWidget[data-hss-kind="externalNotifications"][data-hss-size="small"] :global(.mkw-externalNotifications > div:last-child > div > div > div:nth-child(n+2)),
.hssWidget[data-hss-kind="externalNotifications"][data-hss-size="normal"] :global(.mkw-externalNotifications > div:last-child > div > div > div:nth-child(n+3)),
.hssWidget[data-hss-kind="externalNotifications"][data-hss-size="large"] :global(.mkw-externalNotifications > div:last-child > div > div > div:nth-child(n+4)) { display:none!important; }
.hssWidget[data-hss-kind="externalNotifications"] :global(.mkw-externalNotifications),
.hssWidget[data-hss-kind="notifications"] :global(.mkw-notifications) { width:100%!important; }
.hssWidget[data-hss-kind="externalNotifications"] :global(.mkw-externalNotifications) div:has(> .ti-plug-connected-x) { display:flex!important;flex-direction:column;align-items:center;justify-content:center;min-height:var(--hss-widget-min-height,88px)!important;padding:4px 8px!important;box-sizing:border-box;overflow:clip!important;text-align:center; }
.hssWidget[data-hss-kind="photos"][data-hss-size="small"] :global(.mkw-photos [style*="background-image"]:nth-child(n+4)),
.hssWidget[data-hss-kind="photos"][data-hss-size="normal"] :global(.mkw-photos [style*="background-image"]:nth-child(n+7)) { display:none!important; }
.hssWidget[data-hss-kind="userList"][data-hss-size="small"] :global(.mkw-userList .users > .user:nth-child(n+5)),
.hssWidget[data-hss-kind="userList"][data-hss-size="normal"] :global(.mkw-userList .users > .user:nth-child(n+9)),
.hssWidget[data-hss-kind="userList"][data-hss-size="large"] :global(.mkw-userList .users > .user:nth-child(n+13)) { display:none!important; }
.hssWidget[data-hss-kind="chat"][data-hss-size="small"] :global(.mkw-chat ._gaps_s > a:nth-child(n+2)),
.hssWidget[data-hss-kind="chat"][data-hss-size="normal"] :global(.mkw-chat ._gaps_s > a:nth-child(n+3)),
.hssWidget[data-hss-kind="chat"][data-hss-size="large"] :global(.mkw-chat ._gaps_s > a:nth-child(n+4)) { display:none!important; }
.hssWidget[data-hss-kind="birthdayFollowings"][data-hss-size="small"] :global(.mkw-bdayfollowings a:nth-child(n+7)),
.hssWidget[data-hss-kind="birthdayFollowings"][data-hss-size="normal"] :global(.mkw-bdayfollowings a:nth-child(n+13)) { display:none!important; }
.hssWidget[data-hss-kind="instanceCloud"] :global(.mkw-instance-cloud canvas) { width:100%!important;height:var(--hss-widget-min-height,128px)!important;max-height:var(--hss-widget-min-height,128px)!important; }
.hssWidget[data-hss-kind="profile"] .hssWidgetFrame,
.hssWidget[data-hss-kind="profile"] .hssWidgetFrame > *,
.hssWidget[data-hss-kind="profile"] .hssWidgetFrame > * > * { width:100%!important;max-width:none!important;box-sizing:border-box; }
.hssWidget[data-hss-kind="serverMetric"] :global([data-testid="mkw-serverMetric"]) { width:100%!important;min-width:0!important;contain:layout paint;font-variant-numeric:tabular-nums; }
.hssWidget[data-hss-kind="serverMetric"] :global([data-testid="mkw-serverMetric"]) * { min-width:0!important;max-width:100%;box-sizing:border-box;font-variant-numeric:tabular-nums; }
.hssWidget[data-hss-kind="serverMetric"] :global([data-testid="mkw-serverMetric"] > div) { width:100%!important;overflow:hidden; }
.hssWidget[data-hss-kind="serverMetric"] :global([data-testid="mkw-serverMetric"] svg) { max-width:100%!important;height:auto!important; }
.hssWidget[data-hss-kind="aichan"] .hssWidgetFrame { position:relative;height:var(--hss-widget-min-height,168px);min-height:var(--hss-widget-min-height,168px);overflow:hidden; }
.hssWidget[data-hss-kind="aichan"] .hssWidgetFrame > * { position:relative;height:var(--hss-widget-min-height,168px)!important;overflow:hidden!important; }
.hssWidget[data-hss-kind="aichan"] .hssWidgetFrame iframe { position:absolute;top:0;left:50%;width:300px!important;height:350px!important;max-width:none!important;transform:translateX(-50%) scale(var(--hss-aichan-scale,1));transform-origin:top center; }
.hssWidget[data-hss-kind="mascot"][data-hss-size="small"] .hssWidgetFrame > *,
.hssWidget[data-hss-kind="dice"][data-hss-size="small"] .hssWidgetFrame > * { width:125%!important;transform:scale(.8);transform-origin:top left; }
.hssWidget[data-hss-kind="mascot"][data-hss-size="normal"] .hssWidgetFrame > *,
.hssWidget[data-hss-kind="dice"][data-hss-size="normal"] .hssWidgetFrame > * { width:111.12%!important;transform:scale(.9);transform-origin:top left; }
.hssWidget[data-hss-shape="circle"] { justify-self:center;width:100%;min-width:0;height:var(--hss-widget-min-height, 72px);min-height:0;margin-inline:auto;border-radius:50%;aspect-ratio:1; }
.hssWidget[data-hss-shape="circle"] > * { height:100%; overflow:hidden; border-radius:50%; }
.hssWidget[data-hss-shape="pill"] { width:calc(100% - 4px);max-width:calc(100% - 4px);margin-inline:2px;border-radius:999px; }
.hssWidgetFallback {
	display:flex;
	align-items:center;
	gap:9px;
	width:100%;
	min-width:0;
	min-height:54px;
	padding:7px 8px;
	border:0;
	border-radius:inherit;
	background:transparent;
	color:inherit;
	text-align:left;
	cursor:pointer;
}
.hssWidgetFallback > i { flex:0 0 auto; font-size:22px; }
.hssWidgetFallback > span { display:grid; min-width:0; }
.hssWidgetFallback b,
.hssWidgetFallback small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hssWidgetFallback small { font-size:9px; opacity:.62; }
/* 縮小時専用: 内幅48pxへ左右2pxずつ余白を残し、太い枠線も切らずに縦一列へ収める。 */
.hssCollapsedItem {
    flex:0 0 44px;
    display:flex !important;
    align-items:center;
    justify-content:center;
    width:calc(100% - 4px);
    max-width:44px;
    height:44px;
    min-width:0;
    min-height:44px;
    margin:0 2px;
    padding:0 !important;
    gap:0 !important;
    box-sizing:border-box;
    color:var(--hss-fg, var(--MI_THEME-navFg));
    border:var(--hss-border-width, 1px) var(--hss-border-style, solid) var(--hss-border, transparent);
    background:var(--hss-bg, transparent);
    background-clip:padding-box;
    transform:none !important;
    overflow:visible;
}
.hssCollapsedItem[data-hss-shape="circle"] { border-radius:50%; }
.hssCollapsedItem[data-hss-shape="pill"] { border-radius:999px; height:40px; min-height:40px; flex-basis:40px; }
.sbDivider {
    height:1px;
    background:var(--MI_THEME-divider);
    margin:10px 8px;
}
.sbSpacer {
    flex:1;
}
.sbBottom {
    display:flex;
    flex-direction:column;
    gap:8px;
    padding-top:12px;
    border-top:1px solid var(--MI_THEME-divider);
    margin-top:8px;
    flex-shrink:0;
}
.sbPostBtn {
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    padding:11px 0;
    border:none;
    border-radius:999px;
    background:linear-gradient(135deg, var(--MI_THEME-accent), hsl(from var(--MI_THEME-accent) h s calc(l + 5)));
    color:var(--MI_THEME-fgOnAccent, #fff);
    font-family:inherit;
    font-size:.88rem;
    font-weight:700;
    cursor:pointer;
    transition:all .2s;
    &:hover { filter:brightness(1.1); transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,0,0,.15); }
    &:active { transform:scale(.97); }
}
/* 旗鯖fork: デッキUI時のリロードボタン(ノートボタンの上に固定) */
.sbReloadBtn {
    display:flex;
    align-items:center;
    justify-content:center;
    padding:9px 0;
    margin-bottom:8px;
    border:1px solid var(--MI_THEME-divider);
    border-radius:999px;
    background:var(--MI_THEME-panel);
    color:var(--MI_THEME-fg);
    font-size:1.05rem;
    cursor:pointer;
    transition:all .2s;
    &:hover { background:var(--MI_THEME-buttonHoverBg); transform:translateY(-1px); }
    &:active { transform:scale(.97); }
}
.sbBottomRow {
    display:flex;
    align-items:center;
    gap:6px;
}
.sbBottomIcon {
    width:36px;
    height:36px;
    border-radius:8px;
    display:flex;
    align-items:center;
    justify-content:center;
    background:transparent;
    border:none;
    color:var(--MI_THEME-navFg);
    opacity:.5;
    cursor:pointer;
    font-size:1.05rem;
    transition:all .2s;
    flex-shrink:0;
    &:hover { opacity:1; background:color-mix(in srgb, var(--MI_THEME-navFg) 8%, transparent); }
}
/* 旗鯖fork: デッキモード切替トグル */
/* 旗鯖fork(タスク6): 縮小表示時にサーバーアイコン下に出す拡大ボタン[＞] */
.sbExpandBtn {
    display:flex;
    align-items:center;
    justify-content:center;
    width:40px;
    height:32px;
    margin:0 auto 12px;
    border-radius:8px;
    border:none;
    background:color-mix(in srgb, var(--MI_THEME-navFg) 8%, transparent);
    color: var(--MI_THEME-navFg);
    cursor:pointer;
    opacity:.7;
    transition:all .2s;
}
.sbExpandBtn:hover { opacity:1; background:color-mix(in srgb, var(--MI_THEME-navFg) 16%, transparent); }
.sbModeToggle {
    position: relative;
    display:flex;
    gap:2px;
    padding:3px;
    margin-bottom:8px;
    border-radius:999px;
    background:color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent);
}
.sbAnnounceClickable { cursor: pointer; }
.sbAnnounce {
    position:fixed;
    transform:translateY(-50%);
    width:210px;
    display:flex;
    align-items:flex-start;
    gap:6px;
    padding:10px 12px;
    border-radius:12px;
    background: var(--MI_THEME-accent);
    color:#fff;
    box-shadow:0 4px 16px rgba(0,0,0,.25);
    z-index:3000;
    animation: sbAnnouncePop .3s ease;
}
.sbAnnounceText { flex:1; font-size:.8rem; line-height:1.5; font-weight:600; }
.sbAnnounceClose { flex:none; background:rgba(255,255,255,.2); border:none; color:#fff; border-radius:50%; width:22px; height:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; }
.sbAnnounceClose:hover { background:rgba(255,255,255,.35); }
.sbAnnounceArrow { position:absolute; left:-5px; top:50%; transform:translateY(-50%) rotate(45deg); width:12px; height:12px; background: var(--MI_THEME-accent); }
@keyframes sbAnnouncePop { from { opacity:0; transform:translateY(-50%) translateX(-6px); } to { opacity:1; transform:translateY(-50%) translateX(0); } }
.sbModeBtn {
    flex:1;
    padding:6px 0;
    border:none;
    border-radius:999px;
    background:none;
    color:var(--MI_THEME-fg);
    opacity:.55;
    cursor:pointer;
    font-size:1em;
    transition:background .15s, opacity .15s;
    &:hover { opacity:.85; }
}
.sbModeActive {
    background:var(--MI_THEME-accent);
    color:var(--MI_THEME-fgOnAccent);
    opacity:1;
    &:hover { opacity:1; }
}
/* 旗鯖fork: デッキモード表示領域 */
.deckArea {
    height:100%;
    position:relative;
}
/* 旗鯖fork: デッキ背景のヘッダー画像ぼかし */
.deckBanner {
    position:absolute;
    inset:0;
    z-index:0;
    overflow:hidden;
    &::after {
        content:'';
        position:absolute;
        inset:0;
        background:color-mix(in srgb, var(--MI_THEME-bg) 78%, transparent);
    }
}
.deckBannerImg {
    width:100%;
    height:100%;
    object-fit:cover;
    filter:blur(20px) saturate(1.2);
    transform:scale(1.1);
}
/* 旗鯖fork: 通常表示(デッキUIではない)タイムライン背景のヘッダー画像ぼかし。
   .mainColumnInner 直下(.content の兄弟、position:relative; overflow:hidden)に配置し、
   .content(スクロール領域)の外側で固定表示させる。z-index は auto(0相当)のままとし、
   後続の DOM 順(.content)より奥、topBar/topNav/pageHeader(いずれも明示z-indexあり)より
   手前に来ないよう揃える。 */
.timelineBanner {
    position:absolute;
    inset:0;
    z-index:0;
    overflow:hidden;
    &::after {
        content:'';
        position:absolute;
        inset:0;
        background:color-mix(in srgb, var(--MI_THEME-bg) 78%, transparent);
    }
}
.timelineBannerImg {
    width:100%;
    height:100%;
    object-fit:cover;
    filter:blur(20px) saturate(1.2);
    transform:scale(1.1);
}
.deckAreaInner {
    position:relative;
    z-index:1;
    height:100%;
}
/* 旗鯖fork: macの履歴スワイプ(横オーバースクロール)による「戻る」誤発火を抑止 */
/* .root/.content だけでは Mac PWA のトラックパッド横スワイプ(履歴ナビ)が止まらないため、
   html/body にもグローバルに overscroll-behavior-x:none を効かせる。 */
:global(html), :global(body) {
    overscroll-behavior-x: none;
}
.root {
    overscroll-behavior-x:none;
}
.content {
    overscroll-behavior-x:none;
}

.sbAccount {
    flex:1;
    min-width:0;
    display:flex;
    align-items:center;
    gap:8px;
    padding:6px 8px;
    border-radius:8px;
    border:none;
    background:transparent;
    cursor:pointer;
    font-family:inherit;
    transition:background .2s;
    &:hover { background:color-mix(in srgb, var(--MI_THEME-navFg) 8%, transparent); }
}
.sbAvatarImg {
    width:28px;
    height:28px;
    border-radius:999px;
    object-fit:cover;
    flex-shrink:0;
}
.sbUsername {
    font-size:.78rem;
    color:var(--MI_THEME-navFg);
    opacity:.6;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
}
// リアルタイムモード用インラインスイッチ
.sbOnOff {
    margin-left:auto;
    flex-shrink:0;
    padding:2px 9px;
    border-radius:999px;
    font-size:.72em;
    font-weight:700;
    background:color-mix(in srgb, var(--MI_THEME-navFg) 14%, transparent);
    color:var(--MI_THEME-navFg);
    opacity:.6;
    transition:background .2s, color .2s, opacity .2s;
}
.sbOnOffOn {
    background:var(--MI_THEME-accent);
    color:var(--MI_THEME-fgOnAccent);
    opacity:1;
}
.sbToggle {
    margin-left:auto;
    width:32px;
    height:18px;
    border-radius:9px;
    background:color-mix(in srgb, var(--MI_THEME-navFg) 15%, transparent);
    position:relative;
    flex-shrink:0;
    transition:background .25s;
    &::after {
        content:'';
        position:absolute;
        top:2px;
        left:2px;
        width:14px;
        height:14px;
        border-radius:50%;
        background:color-mix(in srgb, var(--MI_THEME-navFg) 50%, transparent);
        transition:all .25s cubic-bezier(.34,1.56,.64,1);
    }
}
.sbToggleOn {
    background:color-mix(in srgb, var(--MI_THEME-accent) 40%, transparent);
    &::after {
        left:16px;
        background:var(--MI_THEME-accent);
    }
}
.mainColumn {
    flex:1;
    min-width:0;
    display:flex;
    flex-direction:column;
    height:100dvh;
    position:relative;
    overflow:hidden;
}
.mainColumnShifted {
    flex-direction:row;
}
.mainColumnShifted .mainColumnInner {
    flex:1;
    min-width:0;
    display:flex;
    flex-direction:column;
    height:100dvh;
    overflow:hidden;
    transition:flex .3s cubic-bezier(.22,1,.36,1);
}
/* 旗鯖fork: 上部メニューモードのナビバー */
.topNav {
    flex-shrink: 0; display: flex; align-items: center; gap: 6px;
    padding: 8px 12px; position: sticky; top: 0; z-index: 50;
    background: color-mix(in srgb, var(--MI_THEME-bg) 72%, transparent);
    backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
    border-bottom: 1px solid var(--MI_THEME-divider);
}
.topNavSolid { background: var(--MI_THEME-bg); backdrop-filter: none; -webkit-backdrop-filter: none; }
.topNavScroll {
    flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 4px;
    overflow-x: auto; scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
}
.topNavItem {
    flex-shrink: 0; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
    min-width: 56px; padding: 5px 10px; border: none; background: transparent; cursor: pointer;
    border-radius: 12px; color: var(--MI_THEME-fg); opacity: .7; transition: background .12s, opacity .12s;
    font-size: .68em; font-weight: 600; white-space: nowrap;
    > i { font-size: 1.5em; }
    &:hover { opacity: 1; background: color-mix(in srgb, var(--MI_THEME-accent) 10%, transparent); }
}
.topNavItemActive { opacity: 1; color: var(--MI_THEME-accent); background: color-mix(in srgb, var(--MI_THEME-accent) 14%, transparent); }
.topNavLogo {
    flex-shrink: 0; width: 40px; height: 40px; padding: 0; border-radius: 12px; border: none; cursor: pointer; overflow: hidden;
    display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--MI_THEME-accent) 10%, transparent);
    > i { font-size: 1.3em; color: var(--MI_THEME-accent); }
}
.topNavLogoImg { width: 100%; height: 100%; object-fit: cover; }
.topNavDivider { flex-shrink: 0; width: 1px; height: 28px; background: var(--MI_THEME-divider); margin: 0 2px; }
.topNavPost {
    flex-shrink: 0; display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; cursor: pointer;
    border-radius: 999px; background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); font-weight: 700; font-size: .85em;
    &:hover { opacity: .9; }
}
.topNavAvatar { flex-shrink: 0; width: 38px; height: 38px; padding: 0; border: none; background: transparent; cursor: pointer; border-radius: 999px; }
.topNavAvatarImg { width: 38px; height: 38px; }
.topNavDot { position: absolute; top: 4px; right: 10px; width: 7px; height: 7px; border-radius: 999px; background: var(--MI_THEME-accent); }
.topNavDotBlue { position: absolute; top: 4px; right: 10px; width: 7px; height: 7px; border-radius: 999px; background: #4a9eff; }
.mainColumnInner {
    flex:1;
    min-width:0;
    display:flex;
    flex-direction:column;
    height:100dvh;
    position:relative;
    overflow:hidden;
}

// ===== ユーザーパネル（デスクトップ） =====
.userPanelDesktop {
    width:340px;
    flex-shrink:0;
    height:100dvh;
    border-left:1px solid var(--MI_THEME-divider);
    background:var(--MI_THEME-bg);
    overflow:hidden;
    animation:supSlideIn .3s cubic-bezier(.22,1,.36,1) both;
}
@keyframes supSlideIn {
    from { width:0; opacity:0; }
    to { width:340px; opacity:1; }
}

// ===== ユーザーパネル（モバイル: フルスクリーン） =====
.userPanelMobileOverlay {
    position:fixed;
    inset:0;
    z-index:3200000;
    background:var(--MI_THEME-bg);
    animation:supMobileIn .3s cubic-bezier(.22,1,.36,1) both;
}
@keyframes supMobileIn {
    from { transform:translateX(100%); }
    to { transform:translateX(0); }
}
.desktopWidgets {
    width:350px;
    flex-shrink:0;
    height:100dvh;
    box-sizing:border-box;
    overflow:hidden;
    border-left:none;
    background:var(--MI_THEME-bg);
    position:relative;
}
.desktopWidgetsBanner {
    position:absolute;
    inset:0;
    z-index:0;
    overflow:hidden;
    &::after {
        content:'';
        position:absolute;
        inset:0;
        background:var(--MI_THEME-bg);
        opacity:.75;
        backdrop-filter:blur(20px);
        -webkit-backdrop-filter:blur(20px);
    }
}
.desktopWidgetsBannerImg {
    width:100%;
    height:100%;
    object-fit:cover;
    filter:blur(16px) saturate(1.2);
    transform:scale(1.1);
}
.desktopWidgetsInner {
    position:relative;
    z-index:1;
    height:100%;
    overflow-y:auto;
    /* 旗鯖fork: 下部余白は padding-bottom ではなく末尾要素(編集ボタン)の margin-bottom で確保する。
       Firefox は overflow コンテナ末尾の padding-bottom をスクロール可能領域に含めないため、
       padding-bottom だと「ウィジェットを編集」ボタンが画面外に隠れてスクロールしても見えなくなる
       (Chrome では含まれるため再現しない)。実体のある margin で確保すれば全ブラウザで見切れない。 */
    padding:16px 12px 0;
    scrollbar-width:thin;
    scrollbar-color:color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent) transparent;

    /* 旗鯖fork: 末尾の「ウィジェットを編集」ボタンに下余白を持たせ、Firefoxでも見切れないようにする */
    :deep(> div > ._textButton:last-child) {
        margin-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    }

    /* 旗鯖fork: サーバーメトリクス等のウィジェットでヘッダが sticky 設定されているため、
       スクロール時にタイトルバーだけが分離して動いて見える問題があった。
       ウィジェット領域内では sticky を打ち消して、コンテンツと一緒にスクロールするようにする。 */
    :deep(.mkw-container > header) {
        position: relative !important;
        top: auto !important;
    }

    // ウィジェットカード間のスタイル
    :deep(.mkw-container) {
        border-radius:14px !important;
        border:none !important;
        background:var(--MI_THEME-panel) !important;
        box-shadow:0 2px 12px rgba(0,0,0,.06);
        margin-bottom:12px !important;
        overflow:hidden;
        transition:box-shadow .3s ease;
    }
    :deep(.mkw-container > header) { border-radius:14px 14px 0 0; }
    :deep(.mkw-container > div) { border-top:none !important; }
    :deep(._panel) {
        border-radius:14px !important;
        border:none !important;
        background:var(--MI_THEME-panel) !important;
        box-shadow:0 2px 12px rgba(0,0,0,.06);
        transition:box-shadow .3s ease;
    }
}

// ===== トップバー（ピル型、スクロール連動） =====
.topBar {
    position:fixed; top:0; left:0; right:0; z-index:200;
    display:flex; justify-content:center; align-items:flex-start; gap:6px;
    padding:calc(10px + env(safe-area-inset-top,0px)) 16px 8px;
	box-sizing:border-box; min-width:0;
    pointer-events:none;
    transition: transform .35s cubic-bezier(.22,1,.36,1), opacity .3s ease;
    transform: translateY(0); opacity: 1;
}
.desktopLayout .topBar {
    position:absolute;
    left:0; right:0;
}
.topBarHidden {
    transform: translateY(calc(-100% - 20px));
    opacity: 0;
    transition: transform .25s cubic-bezier(.55,.06,.68,.19), opacity .2s ease;
}
.topNavStack {
    position:relative; display:flex; flex-direction:column; align-items:center; gap:7px;
	width:max-content; min-width:0; max-width:min(680px,calc(100% - 42px)); flex:0 1 auto; pointer-events:none;
}
.desktopLayout .topNavStack { max-width:min(680px,100%); }
// アカウントアイコン（タブピル左隣）
.avatarBtn {
    width:36px; height:36px; border-radius:9999px; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    position:relative; z-index:1; margin-top:6px;
    pointer-events:auto; overflow:hidden; flex-shrink:0; padding:0;
    transition:all .25s cubic-bezier(.34,1.56,.64,1);
}
.topBarDark .avatarBtn {
    background:rgba(30,30,30,.78); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 4px 24px rgba(0,0,0,.15),0 0 0 .5px rgba(255,255,255,.08) inset; color:rgba(255,255,255,.55);
}
.topBarLight .avatarBtn {
    background:rgba(245,245,245,.78); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 4px 24px rgba(0,0,0,.06),0 0 0 .5px rgba(0,0,0,.06) inset; color:rgba(0,0,0,.45);
}
.avatarBtn:active { transform:scale(.9); }
.avatarImg { width:100%; height:100%; max-width:36px; max-height:36px; object-fit:cover; border-radius:9999px; }

.topPill {
    display:flex; align-items:center; gap:2px; padding:4px 6px; border-radius:9999px;
	width:max-content; max-width:100%; min-width:0; box-sizing:border-box;
    pointer-events:auto; transition:background .3s,box-shadow .3s;
    overflow-x:auto; scrollbar-width:none; -ms-overflow-style:none;
    &::-webkit-scrollbar { display:none; }
}
.timelinePicker {
    position:absolute; top:calc(100% + 7px); left:0; z-index:2;
    display:flex; align-items:center; gap:7px; width:100%; max-width:100%; box-sizing:border-box;
    padding:6px; overflow-x:auto; scrollbar-width:none; pointer-events:auto;
    border-radius:9999px; animation:timelinePickerIn .18s ease-out;
    background:color-mix(in srgb,var(--MI_THEME-panel) 88%,transparent);
    box-shadow:0 8px 28px rgba(0,0,0,.18),0 0 0 1px color-mix(in srgb,var(--MI_THEME-fg) 9%,transparent) inset;
    backdrop-filter:blur(24px) saturate(1.35); -webkit-backdrop-filter:blur(24px) saturate(1.35);
    &::-webkit-scrollbar { display:none; }
}
.timelinePickerItem {
    display:flex; align-items:center; gap:6px; flex:0 0 auto; max-width:220px;
    height:34px; padding:0 14px; border:0; border-radius:9999px; cursor:pointer;
    color:var(--MI_THEME-fg); background:color-mix(in srgb,var(--MI_THEME-fg) 6%,transparent);
    font:inherit; font-size:.84em; white-space:nowrap;
    span { overflow:hidden; text-overflow:ellipsis; }
    &:hover { background:color-mix(in srgb,var(--MI_THEME-accent) 14%,transparent); }
}
.timelinePickerItemActive { color:var(--MI_THEME-accent); background:var(--MI_THEME-accentedBg); font-weight:700; }
.timelinePickerEmpty { display:flex; align-items:center; gap:8px; padding:0 4px 0 12px; font-size:.82em; white-space:nowrap; }
.timelinePickerOptions {
    display:flex; align-items:center; gap:5px; height:34px; padding:0 12px; border:0; border-radius:9999px;
    color:var(--MI_THEME-accent); background:var(--MI_THEME-accentedBg); cursor:pointer; font:inherit; font-weight:700;
    &:hover { filter:brightness(1.05); }
    &:focus-visible { outline:2px solid var(--MI_THEME-accent); outline-offset:1px; }
}
@keyframes timelinePickerIn { from { opacity:0; transform:translateY(-5px) scale(.98); } to { opacity:1; transform:none; } }
.topBarDark .topPill {
    background:rgba(30,30,30,.78); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 4px 24px rgba(0,0,0,.15),0 0 0 .5px rgba(255,255,255,.08) inset;
}
.topBarLight .topPill {
    background:rgba(245,245,245,.78); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 4px 24px rgba(0,0,0,.06),0 0 0 .5px rgba(0,0,0,.06) inset;
}
.topTabBtn {
    min-width:40px; height:40px; border-radius:9999px; background:transparent; border:none;
    font-size:1.1em; cursor:pointer; display:flex; align-items:center; justify-content:center;
    gap:6px; padding:0 12px;
    transition:all .25s ease; font-family:inherit; flex-shrink:0;
    box-sizing:border-box;
}
.topBarDark .topTabBtn { color:rgba(255,255,255,.4); }
.topBarLight .topTabBtn { color:rgba(0,0,0,.38); }
.topTabActive { color:var(--MI_THEME-accent) !important; }
.topBarDark .topTabActive { background:rgba(255,255,255,.1); }
.topBarLight .topTabActive { background:rgba(0,0,0,.06); }
.listTabPill {
    display:flex; align-items:center; flex-shrink:0; border-radius:9999px;
    transition:background .25s ease,box-shadow .25s ease;
}
.listTabPillActive { padding-right:4px; }
.topBarDark .listTabPillActive { background:rgba(255,255,255,.1); box-shadow:0 0 0 1px rgba(255,255,255,.08) inset; }
.topBarLight .listTabPillActive { background:rgba(0,0,0,.06); box-shadow:0 0 0 1px rgba(0,0,0,.06) inset; }
.listTabMain.topTabActive { background:transparent; }
.listSelectBtn {
    width:32px; height:32px; padding:0; border:0; border-radius:9999px;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    background:transparent; color:var(--MI_THEME-accent); cursor:pointer;
    transition:background .15s ease,transform .15s ease;
    &:hover { background:color-mix(in srgb,var(--MI_THEME-accent) 14%,transparent); }
    &:active { transform:scale(.92); }
    &:focus-visible { outline:2px solid var(--MI_THEME-accent); outline-offset:1px; }
}
// アクティブタブのテキストラベル
.topTabLabel {
    font-size:.78em; font-weight:600; line-height:1;
    white-space:nowrap; max-width:100px;
    overflow:hidden; text-overflow:ellipsis;
}
.topTabCopy { display:flex; min-width:0; flex-direction:column; align-items:flex-start; gap:2px; }
.topTabName { max-width:112px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.62em; line-height:1; opacity:.72; }
// 外部TL (OH/OL) のアイコン色を変えて区別
.topTabExt { color:var(--MI_THEME-accent) !important; opacity:.45; }
.topTabExt.topTabActive { opacity:1; }
// ピル内のディバイダー（TLタブとページ遷移タブの区切り）
.topTabDivider {
    width:1px; height:20px; flex-shrink:0; margin:0 4px;
}
.topBarDark .topTabDivider { background:rgba(255,255,255,.15); }
.topBarLight .topTabDivider { background:rgba(0,0,0,.1); }

// ===== ページビューヘッダ =====
.pageHeader {
    flex-shrink:0; height:50px; background:var(--MI_THEME-panel); border-bottom:solid 1px var(--MI_THEME-divider);
    display:flex; align-items:center; padding:0 12px; z-index:100;
}
.pageBackBtn {
    background:transparent; border:none; font-size:1.2em; padding:8px;
    color:var(--MI_THEME-fg); cursor:pointer; flex-shrink:0;
}
.pageTitle {
    flex:1; text-align:center; font-weight:bold; font-size:.95em;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}

// ===== コンテンツ =====
.content { flex:1; overflow-y:auto; position:relative; min-height:0; }
.timelineContainer {
    max-width:800px; margin:0 auto; min-height:100%;
    /* 旗鯖fork: 従来はタイムライン列の左右に divider の縦線を出していたが、
       ノートを一体化した太い帯として見せる方針 (連なるノート群が途切れない見た目) と
       ヘッダー画像ぼかし背景 (Hataskey UI 2) の上で縦線が浮く問題の両方に対処するため撤去。 */
    padding-top:calc(56px + env(safe-area-inset-top,0px));
    padding-bottom:calc(80px + env(safe-area-inset-bottom,0px));
    touch-action:pan-y;
}
.desktopLayout .timelineContainer {
    padding-top:calc(56px);
}
/* 旗鯖fork: タイムライン上部固定投稿フォーム */
.fixedPostForm {
    margin: 0 auto var(--MI-margin) auto;
    max-width: 800px;
}
.pageContainer { height:100%; overflow-y:auto; }
.collectionPageContainer {
    box-sizing:border-box;
    padding-top:calc(68px + env(safe-area-inset-top,0px));
}

// ===== フェードトランジション =====
.tlFade {
    :global(&-enter-active) { transition:opacity .25s ease, transform .28s cubic-bezier(.22,1,.36,1); }
    :global(&-leave-active) { transition:opacity .15s ease, transform .2s cubic-bezier(.22,1,.36,1); }
    :global(&-enter-from) { opacity:0; transform:translateX(24px); }
    :global(&-leave-to) { opacity:0; transform:translateX(-24px); }
}

// ===== ボトムバー =====
.bottomBar {
    position:fixed; bottom:0; left:0; right:0; z-index:200;
    display:flex; justify-content:center; align-items:center; gap:8px;
    padding:0 16px calc(12px + env(safe-area-inset-bottom,0px));
    pointer-events:none;
    transition: transform .35s cubic-bezier(.22,1,.36,1), opacity .3s ease;
    transform: translateY(0); opacity: 1;
}
.desktopLayout .bottomBar {
    position:absolute;
    left:0; right:0;
}
.bottomBarHidden {
    transform: translateY(calc(100% + 20px));
    opacity: 0;
    transition: transform .25s cubic-bezier(.55,.06,.68,.19), opacity .2s ease;
}

.navPill {
    display:flex; align-items:center; gap:4px; padding:6px 8px; border-radius:9999px;
    pointer-events:auto; transition:background .3s,box-shadow .3s;
}

/* 旗鯖fork: 外部通知ボタンの未読青ドット (モバイルナビ用) */
.extDot {
    position:absolute;
    top:6px;
    right:6px;
    width:8px;
    height:8px;
    border-radius:50%;
    background:#4a9eff;
    border:1.5px solid var(--MI_THEME-panel);
}
.bottomBarDark .navPill {
    background:color-mix(in srgb,var(--MI_THEME-panel) 92%,transparent); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 5px 26px rgba(0,0,0,.24),0 0 0 1px color-mix(in srgb,var(--MI_THEME-fg) 13%,transparent) inset;
}
.bottomBarLight .navPill {
    background:color-mix(in srgb,var(--MI_THEME-panel) 92%,transparent); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 5px 26px rgba(0,0,0,.16),0 0 0 1px color-mix(in srgb,var(--MI_THEME-fg) 13%,transparent) inset;
}
.navBtn {
    width:44px; height:44px; border-radius:50%; background:transparent; border:none; cursor:pointer;
    position:relative; display:flex; align-items:center; justify-content:center;
    font-size:1.15em; transition:all .25s cubic-bezier(.34,1.56,.64,1); font-family:inherit; padding:0;
}
.bottomBarDark .navBtn,
.bottomBarLight .navBtn { color:color-mix(in srgb,var(--MI_THEME-fg) 76%,transparent); }
.navActive { color:var(--MI_THEME-accent) !important; }
.bottomBarDark .navActive { background:rgba(255,255,255,.1); }
.bottomBarLight .navActive { background:rgba(0,0,0,.06); }

// サイドバー & 投稿ボタン（ピルの外側、同じグラスデザイン）
.sideBtn {
    width:48px; height:48px; border-radius:9999px; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center; font-size:1.15em;
    pointer-events:auto; transition:all .25s cubic-bezier(.34,1.56,.64,1); flex-shrink:0;
}
.bottomBarDark .sideBtn {
    background:color-mix(in srgb,var(--MI_THEME-panel) 92%,transparent); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 5px 26px rgba(0,0,0,.24),0 0 0 1px color-mix(in srgb,var(--MI_THEME-fg) 13%,transparent) inset; color:color-mix(in srgb,var(--MI_THEME-fg) 76%,transparent);
}
.bottomBarLight .sideBtn {
    background:color-mix(in srgb,var(--MI_THEME-panel) 92%,transparent); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 5px 26px rgba(0,0,0,.16),0 0 0 1px color-mix(in srgb,var(--MI_THEME-fg) 13%,transparent) inset; color:color-mix(in srgb,var(--MI_THEME-fg) 76%,transparent);
}
.sideBtn:active { transform:scale(.9); }

/* 旗鯖fork(Hataskey UI 2): 上部/下部ナビバーもノートと同じガラス面デザインで統一する。
   透過率は `--htk-glass-card-opacity` (simpleUi.glassUiCardOpacity から boot 経由で注入、
   default 55%) で連動。ダーク/ライトはテーマ変数 (--MI_THEME-panel/accent) 経由。
   デザインの骨格 (ピル/ボタンの形状・レイアウト) は保持し、色/背景のみ差し替える。 */
:global(html.hataGlassUi) .topNav {
    background: color-mix(in srgb,
        color-mix(in srgb, var(--MI_THEME-accent) 12%, var(--MI_THEME-panel))
        var(--htk-glass-card-opacity, 55%),
        transparent) !important;
    backdrop-filter: blur(18px) saturate(1.5);
    -webkit-backdrop-filter: blur(18px) saturate(1.5);
    border-bottom-color: color-mix(in srgb, var(--MI_THEME-divider) 50%, transparent);
}
/* topNavSolid の背景単色化は glass モードでは無効化 (glass 有効時は常にガラス面) */
:global(html.hataGlassUi) .topNavSolid { background: color-mix(in srgb,
    color-mix(in srgb, var(--MI_THEME-accent) 12%, var(--MI_THEME-panel))
    var(--htk-glass-card-opacity, 55%),
    transparent) !important; backdrop-filter: blur(18px) saturate(1.5) !important; -webkit-backdrop-filter: blur(18px) saturate(1.5) !important; }

:global(html.hataGlassUi) .bottomBarDark .navPill,
:global(html.hataGlassUi) .bottomBarDark .sideBtn,
:global(html.hataGlassUi) .bottomBarLight .navPill,
:global(html.hataGlassUi) .bottomBarLight .sideBtn {
    background: color-mix(in srgb,
        color-mix(in srgb, var(--MI_THEME-accent) 12%, var(--MI_THEME-panel))
        90%,
        transparent) !important;
    backdrop-filter: blur(22px) saturate(1.5) !important;
    -webkit-backdrop-filter: blur(22px) saturate(1.5) !important;
}

.badge { position:absolute; top:8px; right:8px; width:8px; height:8px; background:var(--MI_THEME-indicator); border-radius:50%; }
.badgeCount {
    position:absolute; top:2px; right:0; min-width:16px; height:16px; padding:0 4px; border-radius:8px;
    background:var(--MI_THEME-indicator, #f44); color:#fff; font-size:.6em; font-weight:700;
    display:flex; align-items:center; justify-content:center; line-height:1;
}
.extBadge {
    position:absolute; top:2px; right:0; min-width:16px; height:16px; padding:0 4px; border-radius:8px;
    background:#e74040; color:#fff; font-size:.6em; font-weight:700;
    display:flex; align-items:center; justify-content:center; line-height:1;
}

// デスクトップではウィジェットバーを非表示にする閾値
@media (max-width: 1100px) {
    .desktopWidgets { display:none; }
}

// ===== 旗鯖fork: 横開き折りたたみ端末(メインディスプレイ) =====
// 中央はモバイル表示のまま、右にウィジェットを常時出して少しPCライクにする。
// ⚠️PC用の .desktopLayout / .desktopWidgets の指定は一切変更せず、
//   data-hata-foldable が付いたときだけ上書きする(PC表示を巻き込まないため)。
// ⚠️上の @media(max-width:1100px) が .desktopWidgets を display:none にしているので、
//   ここで戻す。詳細度で勝つ形にしてあり、記述順には依存しない。
// ⚠️この2規則は必ず module ブロック(この <style module> の中)に置くこと。
//   末尾の global ブロックへ書くと .root / .desktopWidgets がハッシュ名に解決されず、
//   セレクタがどこにも当たらないまま「書いたのに効かない」状態になる。
// ⚠️.root の直下の子は サイドバー(PC時のみ) / .mainColumn / .desktopWidgets だけ。
//   上下のバーは .mainColumn の中にあるので、row にしてもモバイル表示は崩れない。
.root[data-hata-foldable='true'] {
    flex-direction: row;
}

.root[data-hata-foldable='true'] .desktopWidgets {
    display: block;
    // PCの350pxは折りたたみ端末には広すぎるので詰める。⚠️実測後に見直すこと。
    width: 300px;
}

// モバイル用の上部ナビは画面全幅へ固定されるため、右ウィジェット列も
// 左のノート列と同じ高さから始めて、先頭の操作をナビの下へ退避する。
.root[data-hata-foldable='true'] .desktopWidgetsInner {
    padding-top: calc(56px + env(safe-area-inset-top, 0px));
}

.bottomBarDark {}
.bottomBarLight {}
.topBarDark {}
.topBarLight {}

// ===== モバイルドロワーメニュー =====
.drawerBg {
    position:fixed;
    inset:0;
    z-index:900000;
    background:rgba(0,0,0,.5);
    backdrop-filter:blur(4px);
    -webkit-backdrop-filter:blur(4px);
}
.drawerNav {
    position:fixed;
    top:0;
    left:0;
    bottom:0;
    z-index:900001;
    width:250px;
    max-width:72vw;
    background:var(--MI_THEME-navBg);
    overflow:hidden;
    box-shadow:4px 0 24px rgba(0,0,0,.25);
}
.drawerBanner {
    position:absolute;
    inset:0;
    z-index:0;
    overflow:hidden;
    &::after {
        content:'';
        position:absolute;
        inset:0;
        background:var(--MI_THEME-navBg);
        opacity:.75;
        backdrop-filter:blur(20px);
        -webkit-backdrop-filter:blur(20px);
    }
}
.drawerBannerImg {
    width:100%;
    height:100%;
    object-fit:cover;
    filter:blur(16px) saturate(1.2);
    transform:scale(1.1);
}

// ===== すりガラスOFF時の単色表示 =====
.sidebarSolid { background:var(--MI_THEME-navBg) !important; }
.desktopWidgetsSolid { background:var(--MI_THEME-bg) !important; }
.drawerNavSolid { background:var(--MI_THEME-navBg) !important; }
</style>

<!-- グローバルスタイル: ドロワートランジション + ウィジェット縁色 -->
<style lang="scss">
.simple-drawer-bg-enter-active, .simple-drawer-bg-leave-active { transition:opacity .3s ease; }
.simple-drawer-bg-enter-from, .simple-drawer-bg-leave-to { opacity:0; }
.simple-drawer-enter-active { transition:transform .3s cubic-bezier(.22,1,.36,1); }
.simple-drawer-leave-active { transition:transform .25s cubic-bezier(.55,.06,.68,.19); }
.simple-drawer-enter-from, .simple-drawer-leave-to { transform:translateX(-100%); }
</style>
