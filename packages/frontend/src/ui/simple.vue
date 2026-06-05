<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, { [$style.desktopLayout]: isDesktop }]">
    <!-- PC/タブレット: オリジナル左サイドバー -->
    <nav v-if="isDesktop" :class="[$style.sidebar, { [$style.sidebarSolid]: !glassEffect }]">
        <!-- バナーすりガラス背景 -->
        <div v-if="glassEffect" :class="$style.sidebarBanner">
            <img v-if="$i?.bannerUrl" :src="$i.bannerUrl" :class="$style.sidebarBannerImg" />
        </div>
        <div :class="$style.sidebarInner">
            <!-- ロゴ & インスタンス名 & TL設定 (上部固定) -->
            <div :class="$style.sbLogoRow">
                <div :class="$style.sbLogo" @click="openInstanceMenuMobile">
                    <img v-if="instanceIconUrl" :src="instanceIconUrl" :class="$style.sbLogoImg" />
                    <div :class="$style.sbLogoWrap">
                        <span :class="$style.sbLogoSub">ここは</span>
                        <span :class="$style.sbLogoText">{{ instanceNameStr }}</span>
                    </div>
                </div>
                <button :class="$style.sbLogoAction" @click="openTlOptions"><i class="ti ti-adjustments"></i></button>
            </div>

            <!-- 旗鯖fork: メニュー群はこのスクロール領域に閉じ込め、下部の投稿/アカウントは
                 固定する。メニューが増えてもノート/アカウントがスクロールで隠れない。 -->
            <div :class="$style.sbScroll">
            <!-- ナビ項目（prefer同期の並び順） -->
            <div :class="$style.sbNav">
                <template v-for="grp in sidebarGroups" :key="grp.key">
                    <div v-if="grp.label" :class="$style.sbGroupLabel">{{ grp.label }}</div>
                    <button v-for="item in grp.items" :key="item.id" :class="[$style.sbItem, { [$style.sbActive]: sidebarItemActive(item.id) }]" @click="sidebarItemClick(item.id, $event)">
                        <i :class="[item.icon, $style.sbIcon]"></i><span :class="$style.sbLabel">{{ item.label }}</span>
                        <template v-if="item.id==='notifications' && hasUnreadNotif">
                            <span v-if="showUnreadNotifCount && unreadNotifCount > 0" :class="$style.sbBadge">{{ unreadNotifCount > 99 ? '99+' : unreadNotifCount }}</span>
                            <span v-else :class="$style.sbNotifDot"></span>
                        </template>
                        <span v-if="item.id==='announcements' && hasUnreadAnnouncements" :class="$style.sbDot"></span>
                        <!-- 旗鯖fork: メッセージ未読ドット -->
                        <span v-if="item.id==='chat' && hasUnreadChat" :class="$style.sbNotifDot"></span>
                        <!-- 旗鯖fork: 外部通知の未読青ドット -->
                        <span v-if="item.id==='externalNotifications' && extNotifHasUnread" :class="$style.sbExtDot"></span>
                    </button>
                </template>
            </div>

            <div :class="$style.sbDivider"></div>

            <!-- 設定 & リアルタイムモード -->
            <div :class="$style.sbNav">
                <button :class="$style.sbItem" @click="goToSettings">
                    <i class="ti ti-settings" :class="$style.sbIcon"></i><span :class="$style.sbLabel">設定</span>
                </button>
                <button :class="[$style.sbItem, { [$style.sbActive]: isRealtimeMode }]" @click="toggleRealtimeMode">
                    <i :class="[isRealtimeMode ? 'ti ti-bolt' : 'ti ti-bolt-off', $style.sbIcon]"></i>
                    <span :class="$style.sbLabel">リアルタイム</span>
                    <span :class="[$style.sbToggle, { [$style.sbToggleOn]: isRealtimeMode }]"></span>
                </button>
            </div>

            <!-- 管理者/モデレーター用 -->
            <template v-if="$i && ($i.isAdmin || $i.isModerator)">
                <div :class="$style.sbDivider"></div>
                <div :class="$style.sbNav">
                    <button :class="[$style.sbItem, { [$style.sbActive]: isAdminPage }]" @click="goToAdmin">
                        <i class="ti ti-dashboard" :class="$style.sbIcon"></i><span :class="$style.sbLabel">コントロールパネル</span>
                    </button>
                </div>
            </template>
            </div>

            <!-- 下部: 投稿 + アカウント (固定) -->
            <div :class="$style.sbBottom">
                <button :class="$style.sbPostBtn" @click="onPostClick">
                    <i class="ti ti-pencil"></i><span>ノート</span>
                </button>
                <div :class="$style.sbBottomRow">
                    <button :class="$style.sbAccount" @click="openAccountMenu">
                        <img v-if="$i?.avatarUrl" :src="$i.avatarUrl" :class="$style.sbAvatarImg" />
                        <span :class="$style.sbUsername">@{{ $i?.username }}</span>
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <div :class="[$style.mainColumn, { [$style.mainColumnShifted]: isDesktop && userPanelUserId }]">
        <div :class="$style.mainColumnInner">
        <!-- Top pill navbar (timeline tabs) - scroll reactive -->
        <div :class="[$style.topBar, footerIsDark ? $style.topBarDark : $style.topBarLight, { [$style.topBarHidden]: !showTopBar }]" v-show="!isPageView">
            <button :class="$style.avatarBtn" @click="openAccountMenu" v-if="!isDesktop">
                <img v-if="$i?.avatarUrl" :src="$i.avatarUrl" :class="$style.avatarImg"/>
                <i v-else class="ti ti-user"></i>
            </button>
            <div :class="$style.topPill">
                <template v-for="item in visibleTopTabs" :key="item.id">
                    <button :class="[$style.topTabBtn, { [$style.topTabActive]: tab === item.id }]" @click="switchTab(item.id as TabType)">
                        <i :class="item.icon"></i>
                        <span v-if="tab === item.id" :class="$style.topTabLabel">{{ item.label }}</span>
                    </button>
                </template>
                <button v-if="showOHTL" :class="[$style.topTabBtn, $style.topTabExt, { [$style.topTabActive]: tab === 'ohtl' }]" @click="switchTab('ohtl')">
                    <i class="ti ti-home"></i>
                    <span v-if="tab === 'ohtl'" :class="$style.topTabLabel">外部ホーム</span>
                </button>
                <button v-if="showOLTL" :class="[$style.topTabBtn, $style.topTabExt, { [$style.topTabActive]: tab === 'oltl' }]" @click="switchTab('oltl')">
                    <i class="ti ti-planet"></i>
                    <span v-if="tab === 'oltl'" :class="$style.topTabLabel">外部ローカル</span>
                </button>
                <div :class="$style.topTabDivider"></div>
                <button :class="[$style.topTabBtn, { [$style.topTabActive]: isListPage }]" @click="goToLists">
                    <i class="ti ti-list"></i>
                    <span v-if="isListPage" :class="$style.topTabLabel">リスト</span>
                </button>
                <button :class="[$style.topTabBtn, { [$style.topTabActive]: isChannelPage }]" @click="goToChannels">
                    <i class="ti ti-device-tv"></i>
                    <span v-if="isChannelPage" :class="$style.topTabLabel">チャンネル</span>
                </button>
                <button :class="[$style.topTabBtn, { [$style.topTabActive]: isAntennaPage }]" @click="goToAntennas">
                    <i class="ti ti-antenna"></i>
                    <span v-if="isAntennaPage" :class="$style.topTabLabel">アンテナ</span>
                </button>
            </div>
        </div>
        <!-- Page view header -->
        <header v-show="isPageView" :class="$style.pageHeader">
            <button :class="$style.pageBackBtn" @click="goBack"><i class="ti ti-arrow-left"></i></button>
            <div :class="$style.pageTitle">{{ pageMetadata?.title ?? '' }}</div>
            <div style="width: 38px;"></div>
        </header>

        <div :class="$style.content" ref="contentEl" @scroll="onContentScroll">
            <Transition :name="$style.tlFade" mode="out-in">
                <div v-show="!isPageView" :class="$style.timelineContainer" @touchstart="onTouchStart" @touchend="onTouchEnd" :key="tab + String(withRenotes) + String(withSensitive) + String(onlyFiles)">
                    <!-- 旗鯖fork: 「タイムライン上部に投稿フォームを表示する」設定がONのとき、外部TL以外でMkPostFormを表示 -->
                    <MkPostForm v-if="showFixedPostForm && !isExternalTab" :class="$style.fixedPostForm" class="_panel" fixed />
                    <KeepAlive>
                        <MkStreamingNotesTimeline v-if="tab === 'mixed'" src="global" key="mixed" :withRenotes="withRenotes" :withSensitive="withSensitive" :onlyFiles="onlyFiles" />
                        <MkStreamingNotesTimeline v-else-if="tab === 'local'" src="local" key="local" :withRenotes="withRenotes" :withSensitive="withSensitive" :onlyFiles="onlyFiles" />
                        <MkStreamingNotesTimeline v-else-if="tab === 'social'" src="social" key="social" :withRenotes="withRenotes" :withSensitive="withSensitive" :onlyFiles="onlyFiles" />
                        <MkStreamingNotesTimeline v-else-if="tab === 'following'" src="home" key="following" :withRenotes="withRenotes" :withSensitive="withSensitive" :onlyFiles="onlyFiles" />
                        <MkExternalTimeline v-else-if="tab === 'ohtl' && externalHost && externalToken" src="ohtl" :host="externalHost" :token="externalToken" :sound="true" :simpleUi="true" key="ohtl" />
                        <MkExternalTimeline v-else-if="tab === 'oltl' && externalHost && externalToken" src="oltl" :host="externalHost" :token="externalToken" :sound="true" :simpleUi="true" key="oltl" />
                        <!-- 旗鯖fork: トレンドタイムライン (TTL) -->
                        <MkTrendingTimeline v-else-if="tab === 'trending'" key="trending" />
                    </KeepAlive>
                </div>
            </Transition>
            <div v-show="isPageView" :class="$style.pageContainer"><RouterView /></div>
        </div>

        <!-- 通常TL: ナビバー（モバイルのみ） -->
        <div :class="[$style.bottomBar, footerIsDark ? $style.bottomBarDark : $style.bottomBarLight, { [$style.bottomBarHidden]: !showBottomBar || widgetsShowing }]" v-show="!isDesktop && !isHataskPage && !isExternalTab && (!isPageView || bottomNavHasPage) && !userPanelUserId">
            <button v-if="!isDesktop" :class="$style.sideBtn" @click="simpleDrawerShowing = true"><i class="ti ti-menu-2"></i></button>
            <div :class="$style.navPill">
                <template v-for="item in visibleBottomNav" :key="item.id">
                    <button v-if="item.id==='search'" @click="openSearch" :class="[$style.navBtn, { [$style.navActive]: isSearchPage }]"><i class="ti ti-search"></i></button>
                    <button v-else-if="item.id==='home'" @click="goHome" :class="[$style.navBtn, { [$style.navActive]: isHomeTL }]"><i class="ti ti-home"></i></button>
                    <button v-else-if="item.id==='notifications'" @click="goToNotifications" :class="[$style.navBtn, { [$style.navActive]: isNotifPage }]">
                        <i class="ti ti-bell"></i>
                        <template v-if="hasUnreadNotif">
                            <span v-if="showUnreadNotifCount && unreadNotifCount > 0" :class="$style.badgeCount">{{ unreadNotifCount > 99 ? '99+' : unreadNotifCount }}</span>
                            <span v-else :class="$style.badge"></span>
                        </template>
                    </button>
                    <button v-else-if="item.id==='hatask'" @click="goToHatask" :class="[$style.navBtn, { [$style.navActive]: isHataskPage }]"><i class="ti ti-eye"></i></button>
                    <button v-else-if="item.id==='widgets'" @click="widgetsShowing = true" :class="$style.navBtn"><i class="ti ti-apps"></i></button>
                </template>
            </div>
            <button v-if="!isPageView" :class="$style.sideBtn" @click="onPostClick"><i class="ti ti-pencil"></i></button>
            <div v-else style="width:48px;"></div>
        </div>

        <!-- 外部TL: 投稿 & 通知ボタン（モバイルのみ） -->
        <div :class="[$style.bottomBar, footerIsDark ? $style.bottomBarDark : $style.bottomBarLight, { [$style.bottomBarHidden]: !showBottomBar }]" v-show="!isDesktop && isExternalTab && !isPageView && !userPanelUserId">
            <button v-if="!isDesktop" :class="$style.sideBtn" @click="simpleDrawerShowing = true"><i class="ti ti-menu-2"></i></button>
            <div :class="$style.navPill">
                <!-- 旗鯖fork: 外部通知ボタン (連携ON時のみ)。通知→ノート作成の順で横一列。
                     新着がある場合は青ドット表示。押下で専用ページへ遷移しバッジ強制解除。 -->
                <button v-if="isExternalLinked" @click="goToExternalNotifications" :class="$style.navBtn">
                    <i class="ti ti-bell"></i>
                    <span v-if="extNotifHasUnread" :class="$style.extDot"></span>
                </button>
                <button @click="onExtPostClick" :class="$style.navBtn"><i class="ti ti-pencil"></i></button>
            </div>
        </div>
        </div>

        <!-- デスクトップ: ユーザーパネル（TL横に表示） -->
        <div v-if="isDesktop && userPanelUserId" :class="$style.userPanelDesktop">
            <MkSimpleUserPanel :userId="userPanelUserId" :isMobile="false" :inline="true" @close="userPanelUserId = null" />
        </div>
    </div>

    <!-- モバイル: ユーザーパネル（フルスクリーンオーバーレイ） -->
    <Teleport to="body">
        <div v-if="!isDesktop && userPanelUserId" :class="$style.userPanelMobileOverlay" @click.self="userPanelUserId = null">
            <MkSimpleUserPanel :userId="userPanelUserId" :isMobile="true" :inline="true" @close="userPanelUserId = null" />
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
                    <img v-if="$i?.bannerUrl" :src="$i.bannerUrl" :class="$style.drawerBannerImg" />
                </div>
                <div :class="$style.sidebarInner">
                    <div :class="$style.sbLogoRow">
                        <div :class="$style.sbLogo" @click="openInstanceMenuMobile">
                            <img v-if="instanceIconUrl" :src="instanceIconUrl" :class="$style.sbLogoImg" />
                            <div :class="$style.sbLogoWrap">
                                <span :class="$style.sbLogoSub">ここは</span>
                                <span :class="$style.sbLogoText">{{ instanceNameStr }}</span>
                            </div>
                        </div>
                        <button :class="$style.sbLogoAction" @click="openTlOptions"><i class="ti ti-adjustments"></i></button>
                    </div>
                    <!-- 旗鯖fork: メニュー群をスクロール領域に、下部の投稿/アカウントを固定 -->
                    <div :class="$style.sbScroll">
                    <!-- ナビ項目（prefer同期の並び順） -->
                    <div :class="$style.sbNav">
                        <template v-for="grp in sidebarGroups" :key="grp.key">
                            <div v-if="grp.label" :class="$style.sbGroupLabel">{{ grp.label }}</div>
                            <button v-for="item in grp.items" :key="item.id" :class="[$style.sbItem, { [$style.sbActive]: sidebarItemActive(item.id) }]" @click="sidebarItemClick(item.id, $event)">
                                <i :class="[item.icon, $style.sbIcon]"></i><span :class="$style.sbLabel">{{ item.label }}</span>
                                <template v-if="item.id==='notifications' && hasUnreadNotif">
                                    <span v-if="showUnreadNotifCount && unreadNotifCount > 0" :class="$style.sbBadge">{{ unreadNotifCount > 99 ? '99+' : unreadNotifCount }}</span>
                                    <span v-else :class="$style.sbNotifDot"></span>
                                </template>
                                <span v-if="item.id==='announcements' && hasUnreadAnnouncements" :class="$style.sbDot"></span>
                                <!-- 旗鯖fork: メッセージ未読ドット -->
                                <span v-if="item.id==='chat' && hasUnreadChat" :class="$style.sbNotifDot"></span>
                            </button>
                        </template>
                    </div>
                    <div :class="$style.sbDivider"></div>
                    <div :class="$style.sbNav">
                        <button :class="$style.sbItem" @click="goToSettings(); simpleDrawerShowing = false">
                            <i class="ti ti-settings" :class="$style.sbIcon"></i><span :class="$style.sbLabel">設定</span>
                        </button>
                        <button :class="[$style.sbItem, { [$style.sbActive]: isRealtimeMode }]" @click="toggleRealtimeMode">
                            <i :class="[isRealtimeMode ? 'ti ti-bolt' : 'ti ti-bolt-off', $style.sbIcon]"></i>
                            <span :class="$style.sbLabel">リアルタイム</span>
                            <span :class="[$style.sbToggle, { [$style.sbToggleOn]: isRealtimeMode }]"></span>
                        </button>
                    </div>
                    <template v-if="$i && ($i.isAdmin || $i.isModerator)">
                        <div :class="$style.sbDivider"></div>
                        <div :class="$style.sbNav">
                            <button :class="[$style.sbItem, { [$style.sbActive]: isAdminPage }]" @click="goToAdmin(); simpleDrawerShowing = false">
                                <i class="ti ti-dashboard" :class="$style.sbIcon"></i><span :class="$style.sbLabel">コントロールパネル</span>
                            </button>
                        </div>
                    </template>
                    </div>
                    <div :class="$style.sbBottom">
                        <button :class="$style.sbPostBtn" @click="onPostClick(); simpleDrawerShowing = false">
                            <i class="ti ti-pencil"></i><span>ノート</span>
                        </button>
                        <div :class="$style.sbBottomRow">
                            <button :class="$style.sbAccount" @click="openAccountMenu">
                                <img v-if="$i?.avatarUrl" :src="$i.avatarUrl" :class="$style.sbAvatarImg" />
                                <span :class="$style.sbUsername">@{{ $i?.username }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
        </Transition>
    </Teleport>

    <!-- PC/タブレット: 右ウィジェットバー -->
    <div v-if="isDesktop" :class="[$style.desktopWidgets, { [$style.desktopWidgetsSolid]: !glassEffect }]" :data-widget-border="showWidgetBorder ? 'on' : 'off'">
        <div v-if="glassEffect" :class="$style.desktopWidgetsBanner">
            <img v-if="$i?.bannerUrl" :src="$i.bannerUrl" :class="$style.desktopWidgetsBannerImg" />
        </div>
        <div :class="$style.desktopWidgetsInner">
            <XWidgets />
        </div>
    </div>

    <XCommon v-model:widgetsShowing="widgetsShowing"/>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, provide, onMounted, onUnmounted, nextTick, defineAsyncComponent } from 'vue';
import { instanceName } from '@@/js/config.js';
import XCommon from './_common_/common.vue';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import MkExternalTimeline from '@/components/MkExternalTimeline.vue';
// 旗鯖fork: トレンドタイムライン (TTL)
import MkTrendingTimeline from '@/components/MkTrendingTimeline.vue';
import type { PageMetadata } from '@/page.js';
import { provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import { mainRouter } from '@/router.js';
import { DI } from '@/di.js';
import * as os from '@/os.js';
import { useStream } from '@/stream.js';
import { $i } from '@/i.js';
import { prefer } from '@/preferences.js';
import { cleanupStaleUiElements } from '@/utility/ui-cleanup.js';
import { getAccountMenu } from '@/accounts.js';
import { instance } from '@/instance.js';
import { store } from '@/store.js';
import { deepMerge } from '@/utility/merge.js';
import { i18n } from '@/i18n.js';
import { openInstanceMenu } from '@/ui/_common_/common.js';
import { miLocalStorage } from '@/local-storage.js';

const XWidgets = defineAsyncComponent(() => import('./_common_/widgets.vue'));
const MkSimpleUserPanel = defineAsyncComponent(() => import('@/components/MkSimpleUserPanel.vue'));
// 旗鯖fork: 「タイムライン上部に投稿フォームを表示する」設定で使用
const MkPostForm = defineAsyncComponent(() => import('@/components/MkPostForm.vue'));

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

// ===== デスクトップ判定 =====
const DESKTOP_THRESHOLD = 1100;
const isDesktop = ref(window.innerWidth >= DESKTOP_THRESHOLD);
function onResize() {
    isDesktop.value = window.innerWidth >= DESKTOP_THRESHOLD;
}
window.addEventListener('resize', onResize);

// ===== テーマ判定 =====
const footerIsDark = ref(true);
function detectThemeBrightness() {
    let r = 0, g = 0, b = 0;
    let found = false;

    // Strategy 1: CSS custom property
    const cs = window.getComputedStyle(document.documentElement);
    for (const prop of ['--MI_THEME-bg', '--MI_THEME-panel', '--bg', '--panel']) {
        const val = cs.getPropertyValue(prop).trim();
        if (val) {
            const m = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (m) { r = +m[1]; g = +m[2]; b = +m[3]; found = true; break; }
            if (val.startsWith('#')) {
                const h = val.replace('#','');
                if (h.length >= 6) { r=parseInt(h.substring(0,2),16); g=parseInt(h.substring(2,4),16); b=parseInt(h.substring(4,6),16); found = true; break; }
                if (h.length === 3) { r=parseInt(h[0]+h[0],16); g=parseInt(h[1]+h[1],16); b=parseInt(h[2]+h[2],16); found = true; break; }
            }
        }
    }

    // Strategy 2: Computed background-color of root element or body
    if (!found) {
        for (const el of [document.documentElement, document.body, document.querySelector('.root') as HTMLElement | null]) {
            if (!el) continue;
            const bgc = window.getComputedStyle(el).backgroundColor;
            const m = bgc?.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (m && bgc !== 'rgba(0, 0, 0, 0)') { r = +m[1]; g = +m[2]; b = +m[3]; found = true; break; }
        }
    }

    // Strategy 3: Misskey data-color-mode attribute
    if (!found) {
        const mode = document.documentElement.getAttribute('data-color-mode');
        if (mode === 'light') { footerIsDark.value = false; return; }
        if (mode === 'dark') { footerIsDark.value = true; return; }
    }

    footerIsDark.value = !found || (r*299+g*587+b*114)/1000 < 128;
}
let themeObs: MutationObserver|null = null;
let darkMql: MediaQueryList|null = null;
let darkMqlH: ((e:MediaQueryListEvent)=>void)|null = null;
function startThemeWatch() {
    detectThemeBrightness();
    themeObs = new MutationObserver(()=>{
        setTimeout(detectThemeBrightness, 50);
        setTimeout(detectThemeBrightness, 300);
    });
    themeObs.observe(document.documentElement, { attributes:true, attributeFilter:['data-color-mode','class','style'] });
    darkMql = window.matchMedia('(prefers-color-scheme:dark)');
    darkMqlH = ()=>{ setTimeout(detectThemeBrightness, 50); };
    darkMql.addEventListener('change', darkMqlH);
}
function stopThemeWatch() {
    themeObs?.disconnect(); themeObs=null;
    if(darkMql&&darkMqlH) darkMql.removeEventListener('change',darkMqlH);
    darkMql=null; darkMqlH=null;
}

// ===== スクロール検知 =====
const contentEl = ref<HTMLElement|null>(null);
const showBottomBar = ref(true);
const showTopBar = ref(true);
let lastScrollY = 0;
let scrollTimer: ReturnType<typeof setTimeout>|null = null;

function onContentScroll() {
    if (!contentEl.value) return;
    const sy = contentEl.value.scrollTop;
    const diff = sy - lastScrollY;
    if (diff > 35) { showBottomBar.value = false; showTopBar.value = false; }
    if (diff < -25) { showBottomBar.value = true; showTopBar.value = true; }
    lastScrollY = sy;
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(()=>{ showBottomBar.value = true; showTopBar.value = true; }, 400);
}

// ===== 外部アカウント =====
const isExternalLinked = computed(()=>prefer.s['external.enabled']&&prefer.s['external.token']!=null);
const externalHost = computed(()=>prefer.s['external.host']||'');
const externalToken = computed(()=>prefer.s['external.token']||'');
const showOHTL = computed(()=>isExternalLinked.value&&prefer.s['external.enableOHTL']);
const showOLTL = computed(()=>isExternalLinked.value&&prefer.s['external.enableOLTL']);
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
const HOME_ROUTES = new Set(['index','timeline']);
const isPageView = ref(false);
const isSearchPage = computed(()=>{ const r=mainRouter.currentRoute.value; return r.name==='search'||r.path==='/search'; });
const isNotifPage = computed(()=>mainRouter.currentRoute.value.path==='/my/notifications');
const isHataskPage = computed(()=>{ const p=mainRouter.currentRoute.value.path; return p==='/hatask'||p==='/hata-docs'; });
const isListPage = computed(()=>mainRouter.currentRoute.value.path.startsWith('/my/lists'));
const isChannelPage = computed(()=>mainRouter.currentRoute.value.path.startsWith('/channels'));
const isAntennaPage = computed(()=>mainRouter.currentRoute.value.path.startsWith('/my/antennas'));
const isExternalTab = computed(()=>tab.value==='ohtl'||tab.value==='oltl');
const isHomeTL = computed(()=>!isPageView.value&&!isSearchPage.value&&!isNotifPage.value&&!isHataskPage.value);

const checkIsPageView = ()=>{ isPageView.value = !HOME_ROUTES.has(mainRouter.currentRoute.value.name as string); };

mainRouter.on('change', ()=>{
    checkIsPageView();
    simpleDrawerShowing.value = false;
    showBottomBar.value = true;
    showTopBar.value = true;
    if (mainRouter.currentRoute.value.path==='/my/notifications') { hasUnreadNotif.value=false; unreadNotifCount.value=0; }
    // テーマ再検出（ページ遷移でテーマが変わる場合）
    setTimeout(detectThemeBrightness, 100);
});

// ===== タブ =====
// 旗鯖fork: 'trending' を追加 (トレンドタイムライン (TTL))
type TabType='following'|'mixed'|'local'|'social'|'ohtl'|'oltl'|'trending';

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
const visibleBottomNav = computed(() => (prefer.r['simpleUi.bottomNav'].value as any[]).filter((t: any) => t.visible).slice(0, 4));
const bottomNavHasPage = computed(() => {
    const ids = visibleBottomNav.value.map((t: any) => t.id);
    return (ids.includes('search') && isSearchPage.value) || (ids.includes('notifications') && isNotifPage.value) || isListPage.value || isChannelPage.value || isAntennaPage.value;
});

// ===== prefer連動: ウィジェット縁色 =====
const showWidgetBorder = computed(() => prefer.r['simpleUi.widgetBorder'].value);

// ===== prefer連動: すりガラス効果 =====
const glassEffect = computed(() => prefer.r['simpleUi.glassEffect'].value);

// ===== prefer連動: サイドバー =====
const sidebarOrder = computed(() => prefer.r['simpleUi.sidebar'].value as any[]);
// 旗鯖fork: グループ見出しラベル
const sidebarGroupLabels: Record<string, string> = {
    basic: '基本機能',
    hata: '旗鯖独自',
    discover: '発見・交流',
    more: '',
};
// 旗鯖fork: サイドバー項目をグループ単位にまとめる (group未指定の項目は 'basic' 扱いで後方互換)
// 旗鯖fork: visible === false の項目はサイドバーに表示しない。ただし必須項目
// (timeline / notifications / announcements / followRequests / more) は強制表示。
const REQUIRED_SIDEBAR_IDS = ['timeline', 'notifications', 'announcements', 'followRequests', 'more'];
const sidebarGroups = computed(() => {
    const order = ['basic', 'hata', 'discover', 'more'];
    const groups: { key: string; label: string; items: any[] }[] = [];
    for (const item of sidebarOrder.value) {
        // 旗鯖fork: visible:false は除外、ただし必須項目は強制的に表示
        if (item.visible === false && !REQUIRED_SIDEBAR_IDS.includes(item.id)) continue;
        const g = item.group ?? 'basic';
        let grp = groups.find(x => x.key === g);
        if (!grp) { grp = { key: g, label: sidebarGroupLabels[g] ?? '', items: [] }; groups.push(grp); }
        grp.items.push(item);
    }
    // 旗鯖fork: メッセージ(チャット)を基本グループに動的注入する。
    // 既存ユーザーの保存済み simpleUi.sidebar には chat が含まれないため、
    // def.ts のデフォルト変更だけでは既存ユーザーに出ない。保存済み設定を壊さず
    // 全ユーザーに表示するため、ここで注入する (トレンドタブと同じ手法)。
    // sidebarOrder に chat があってかつ visible:false の場合は注入しない (ユーザー意思を尊重)。
    const chatInOrder = sidebarOrder.value.find((x: any) => x.id === 'chat');
    if (!chatInOrder) {
        let basic = groups.find(x => x.key === 'basic');
        if (!basic) { basic = { key: 'basic', label: sidebarGroupLabels['basic'] ?? '', items: [] }; groups.push(basic); }
        // 通知の直後に置く (なければ基本グループ末尾)
        const notifIdx = basic.items.findIndex((x: any) => x.id === 'notifications');
        const chatItem = { id: 'chat', icon: 'ti ti-messages', label: 'メッセージ', group: 'basic' };
        if (notifIdx >= 0) basic.items.splice(notifIdx + 1, 0, chatItem);
        else basic.items.push(chatItem);
    }
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
const switchTab = (t:TabType)=>{ if(tab.value===t){ if(contentEl.value) contentEl.value.scrollTo({top:0,behavior:'smooth'}); } else { tab.value=t; } if(t!=='ohtl'&&t!=='oltl') miLocalStorage.setItem('hatasabaUiLastTab', t); };

// ===== アカウント切り替えメニュー =====
async function openAccountMenu(ev: MouseEvent) {
    const menuItems = await getAccountMenu({ withExtraOperation: true });
    os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}

// ===== スワイプ =====
const touchStartPos = ref<{x:number;y:number}|null>(null);
const onTouchStart = (e:TouchEvent)=>{ touchStartPos.value={x:e.touches[0].clientX,y:e.touches[0].clientY}; };
const onTouchEnd = (e:TouchEvent)=>{
    if(!touchStartPos.value)return;
    const dx=e.changedTouches[0].clientX-touchStartPos.value.x;
    const dy=e.changedTouches[0].clientY-touchStartPos.value.y;
    touchStartPos.value=null;
    if(Math.abs(dy)>Math.abs(dx)||Math.abs(dy)>50)return;
    if(Math.abs(dx)>60){
        const idx=tabOrder.value.indexOf(tab.value);
        if(dx>0){if(idx>0)switchTab(tabOrder.value[idx-1]);else simpleDrawerShowing.value=true;}
        else{if(idx<tabOrder.value.length-1)switchTab(tabOrder.value[idx+1]);}
    }
};

// ===== ナビゲーション =====
const onPostClick = ()=>{ os.post({}); };
const scrollToTop = ()=>{ if(contentEl.value) contentEl.value.scrollTo({ top:0, behavior:'smooth' }); };
const goHome = ()=>{
    if(isPageView.value) { mainRouter.push('/'); }
    else if(tab.value === 'following') { scrollToTop(); }
    else { switchTab('following'); }
};
const goBack = ()=>{
    if(window.history.length > 1) { window.history.back(); }
    else { goHome(); }
};
const openSearch = ()=>{ mainRouter.push('/search'); };
const goToHatask = ()=>{ mainRouter.push('/hatask'); };
const goToNotifications = ()=>{ hasUnreadNotif.value=false; unreadNotifCount.value=0; mainRouter.push('/my/notifications'); };
const goToLists = ()=>{ mainRouter.push('/my/lists'); };
const goToChannels = ()=>{ mainRouter.push('/channels'); };
const goToAntennas = ()=>{ mainRouter.push('/my/antennas'); };
const goToDrive = ()=>{ mainRouter.push('/my/drive'); };
// 旗鯖fork: メッセージ (チャット) へ遷移
const goToChat = ()=>{ mainRouter.push('/chat'); };
const goToAnnouncements = ()=>{ mainRouter.push('/announcements'); };
const openUiSetup = async ()=>{
    const { defineAsyncComponent: dac } = await import('vue');
    os.popup(dac(() => import('@/components/MkUISetup.vue')), {}, {}, 'closed');
};
const goToSettings = ()=>{ mainRouter.push('/settings'); };
const goToAdmin = ()=>{ mainRouter.push('/admin'); };

// ===== サイドバー項目ヘルパー =====
function sidebarItemClick(id: string, ev?: MouseEvent) {
    simpleDrawerShowing.value = false;
    // 旗鯖fork: 外部リンク項目 (旗鯖ポータル等) は新しいタブで開く
    const item = sidebarOrder.value.find((x: any) => x.id === id);
    if (item?.external && item.url) {
        window.open(item.url, '_blank', 'noopener');
        return;
    }
    const map: Record<string, ()=>void> = {
        timeline: goHome, notifications: ()=>goToNotifications(), search: ()=>openSearch(),
        chat: ()=>goToChat(),
        hatask: ()=>goToHatask(), lists: ()=>goToLists(), channels: ()=>goToChannels(),
        antennas: ()=>goToAntennas(), drive: ()=>goToDrive(),
        announcements: ()=>goToAnnouncements(), uiSetup: ()=>openUiSetup(),
        // 旗鯖fork: 新規追加項目
        favorites: ()=>mainRouter.push('/my/favorites'),
        explore: ()=>mainRouter.push('/explore'),
        followRequests: ()=>mainRouter.push('/my/follow-requests'),
        // 旗鯖fork: 外部通知専用ページへ
        externalNotifications: ()=>mainRouter.push('/my/external-notifications'),
        more: () => { if (ev) openMore(ev); },
    };
    if (map[id]) map[id]();
}
function sidebarItemActive(id: string): boolean {
    return ({
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
        // 旗鯖fork: 外部通知ページのアクティブ判定
        externalNotifications: mainRouter.currentRoute.value.path.startsWith('/my/external-notifications'),
    } as Record<string, boolean>)[id] ?? false;
}

// ===== インスタンス情報 =====
const instanceNameStr = computed(()=> instance.name || instanceName);
const instanceIconUrl = computed(()=> instance.iconUrl || '/favicon.ico');

// ===== ドライブページ判定 =====
const isDrivePage = computed(()=>mainRouter.currentRoute.value.path.startsWith('/my/drive'));
// 旗鯖fork: メッセージ (チャット) ページ判定
const isChatPage = computed(()=>mainRouter.currentRoute.value.path.startsWith('/chat'));
const isAdminPage = computed(()=>mainRouter.currentRoute.value.path.startsWith('/admin'));

// ===== もっとメニュー（ランチパッド） =====
async function openMore(ev: MouseEvent|PointerEvent) {
    const target = (ev.currentTarget ?? ev.target) as HTMLElement;
    if (!target) return;
    const { dispose } = await os.popupAsyncWithDialog(
        (await import('@/components/MkLaunchPad.vue')).default,
        { anchorElement: target },
        { closed: () => dispose() },
    );
}

// ===== サーバーメニュー =====
function openInstanceMenuMobile(ev: MouseEvent|PointerEvent) {
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

function openTlOptions(ev: MouseEvent|PointerEvent) {
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
    }], ev.currentTarget ?? ev.target);
}

// ===== リアルタイムモード =====
const isRealtimeMode = computed(() => store.r.realtimeMode.value);
function toggleRealtimeMode() {
    store.set('realtimeMode', !store.s.realtimeMode);
    window.location.reload();
}

// ===== ユーザーパネル =====
const userPanelUserId = ref<string|null>(null);

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
let unreadPollTimer: ReturnType<typeof setInterval>|null = null;

// 通知の現在値を $i から同期（reactivity 補強）
const syncUnreadFromI = ()=>{
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
const checkUnread = async()=>{
    try {
        syncUnreadFromI();
        // $i に何も値が無い場合のフォールバック: API で直近1件取得
        if (!$i || (typeof $i.hasUnreadNotification !== 'boolean' && typeof $i.unreadNotificationsCount !== 'number')) {
            const r = await os.api('i/notifications', { limit: 1 });
            if (Array.isArray(r) && r.length > 0 && !r[0].isRead) {
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
const initStream = ()=>{
    if (mainCh) return; // 二重初期化防止
    try {
        const stream = useStream();
        if (!stream) {
            console.warn('[hatasaba] useStream() returned null, scheduling retry');
            setTimeout(initStream, 2000);
            return;
        }
        mainCh = stream.useChannel('main');

        // 新規通知
        mainCh.on('notification', ()=>{
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
        mainCh.on('unreadNotification', ()=>{
            if (mainRouter.currentRoute.value.path.startsWith('/my/notifications')) return;
            hasUnreadNotif.value = true;
            syncUnreadFromI();
        });

        // 全て既読化
        mainCh.on('readAllNotifications', ()=>{
            hasUnreadNotif.value = false;
            unreadNotifCount.value = 0;
        });

        // 接続切断時のログのみ（ハンドラ自体は残る、再接続時に発火継続）
        stream.on('_disconnected_', ()=>{
            console.info('[hatasaba] stream disconnected (will auto-reconnect)');
        });

        // 接続成立後に1度同期しておく（$i に最新値があるはず）
        syncUnreadFromI();
    } catch(e) {
        console.warn('[hatasaba] Stream init failed, retrying:', e);
        mainCh = null;
        setTimeout(initStream, 2000);
    }
};

// $i.unreadNotificationsCount を定期的にポーリング（ストリーム不調時の保険）
const startUnreadPoll = ()=>{
    if (unreadPollTimer) return;
    unreadPollTimer = setInterval(checkUnread, 60000);
};
const stopUnreadPoll = ()=>{
    if (unreadPollTimer) { clearInterval(unreadPollTimer); unreadPollTimer = null; }
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
                    mainRouter.push(path);
                });
            });
            return;
        }
        userPanelUserId.value = detail.userId;
    }
}

onMounted(()=>{
    cleanupStaleUiElements();
    checkIsPageView();
    // 旗鯖fork: 復元したタブが現在の設定で表示可能か検証し、非表示なら先頭タブにフォールバック
    if (!tabOrder.value.includes(tab.value)) {
        tab.value = tabOrder.value[0] ?? 'following';
    }
    // ストリームを先に初期化してから初期同期（接続未完了でもリスナー登録は有効）
    initStream();
    checkUnread();
    startUnreadPoll();
    window.addEventListener('simple-user-panel', onSimpleUserPanel);
    nextTick(()=>{ startThemeWatch(); });
    window.addEventListener('ext-tl-notif-count', onExtNotifCount);
    window.addEventListener('external-notification', onExtNotifRealtime);
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
onUnmounted(()=>{
    mainCh?.dispose();
    mainCh = null;
    stopUnreadPoll();
    stopThemeWatch();
    if (scrollTimer) clearTimeout(scrollTimer);
    window.removeEventListener('ext-tl-notif-count', onExtNotifCount);
    window.removeEventListener('external-notification', onExtNotifRealtime);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('simple-user-panel', onSimpleUserPanel);
});
</script>

<style lang="scss" module>
.root { display:flex; flex-direction:column; height:100dvh; background:var(--MI_THEME-bg); overflow:hidden; user-select:none; }

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
.sbScroll {
    /* 旗鯖fork: メニュー群だけをスクロールさせる領域。下部の投稿/アカウントは外側で固定。 */
    flex:1;
    min-height:0;
    overflow-y:auto;
    overflow-x:hidden;
    scrollbar-width:thin;
    scrollbar-color:rgba(128,128,128,.2) transparent;
    display:flex;
    flex-direction:column;
}
.sbLogoRow {
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
    font-size:.86rem;
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
    /* 旗鯖fork: 下部の「ウィジェットを編集」ボタンが隠れないよう、padding-bottom を増やす */
    padding:16px 12px calc(64px + env(safe-area-inset-bottom, 0px));
    scrollbar-width:thin;
    scrollbar-color:color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent) transparent;

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
    display:flex; justify-content:center; align-items:center; gap:6px;
    padding:calc(10px + env(safe-area-inset-top,0px)) 16px 8px;
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
// アカウントアイコン（タブピル左隣）
.avatarBtn {
    width:36px; height:36px; border-radius:9999px; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
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
.avatarImg { width:100%; height:100%; object-fit:cover; border-radius:9999px; }

.topPill {
    display:flex; align-items:center; gap:2px; padding:4px 6px; border-radius:9999px;
    pointer-events:auto; transition:background .3s,box-shadow .3s;
    overflow-x:auto; scrollbar-width:none; -ms-overflow-style:none;
    &::-webkit-scrollbar { display:none; }
}
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
// アクティブタブのテキストラベル
.topTabLabel {
    font-size:.78em; font-weight:600; line-height:1;
    white-space:nowrap; max-width:100px;
    overflow:hidden; text-overflow:ellipsis;
}
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
    border-left:1px solid var(--MI_THEME-divider); border-right:1px solid var(--MI_THEME-divider);
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

// ===== フェードトランジション =====
.tlFade {
    :global(&-enter-active) { transition:opacity .25s ease; }
    :global(&-leave-active) { transition:opacity .15s ease; }
    :global(&-enter-from),
    :global(&-leave-to) { opacity:0; }
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
    background:rgba(30,30,30,.78); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 4px 24px rgba(0,0,0,.15),0 0 0 .5px rgba(255,255,255,.08) inset;
}
.bottomBarLight .navPill {
    background:rgba(245,245,245,.78); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 4px 24px rgba(0,0,0,.06),0 0 0 .5px rgba(0,0,0,.06) inset;
}
.navBtn {
    width:44px; height:44px; border-radius:50%; background:transparent; border:none; cursor:pointer;
    position:relative; display:flex; align-items:center; justify-content:center;
    font-size:1.15em; transition:all .25s cubic-bezier(.34,1.56,.64,1); font-family:inherit; padding:0;
}
.bottomBarDark .navBtn { color:rgba(255,255,255,.4); }
.bottomBarLight .navBtn { color:rgba(0,0,0,.38); }
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
    background:rgba(30,30,30,.78); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 4px 24px rgba(0,0,0,.15),0 0 0 .5px rgba(255,255,255,.08) inset; color:rgba(255,255,255,.55);
}
.bottomBarLight .sideBtn {
    background:rgba(245,245,245,.78); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
    box-shadow:0 4px 24px rgba(0,0,0,.06),0 0 0 .5px rgba(0,0,0,.06) inset; color:rgba(0,0,0,.45);
}
.sideBtn:active { transform:scale(.9); }

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
