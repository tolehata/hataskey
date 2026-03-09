<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
    <!-- Top pill navbar (timeline tabs) - scroll reactive -->
    <div :class="[$style.topBar, footerIsDark ? $style.topBarDark : $style.topBarLight, { [$style.topBarHidden]: !showTopBar }]" v-show="!isPageView">
        <button :class="$style.avatarBtn" @click="openAccountMenu">
            <img v-if="$i?.avatarUrl" :src="$i.avatarUrl" :class="$style.avatarImg"/>
            <i v-else class="ti ti-user"></i>
        </button>
        <div :class="$style.topPill">
            <button :class="[$style.topTabBtn, { [$style.topTabActive]: tab === 'following' }]" @click="switchTab('following')"><i class="ti ti-home"></i></button>
            <button :class="[$style.topTabBtn, { [$style.topTabActive]: tab === 'local' }]" @click="switchTab('local')"><i class="ti ti-planet"></i></button>
            <button :class="[$style.topTabBtn, { [$style.topTabActive]: tab === 'mixed' }]" @click="switchTab('mixed')"><i class="ti ti-universe"></i></button>
            <button v-if="showOHTL" :class="[$style.topTabBtn, $style.topTabExt, { [$style.topTabActive]: tab === 'ohtl' }]" @click="switchTab('ohtl')"><i class="ti ti-home"></i></button>
            <button v-if="showOLTL" :class="[$style.topTabBtn, $style.topTabExt, { [$style.topTabActive]: tab === 'oltl' }]" @click="switchTab('oltl')"><i class="ti ti-planet"></i></button>
        </div>
    </div>
    <!-- Page view header -->
    <header v-show="isPageView" :class="$style.pageHeader">
        <button :class="$style.pageBackBtn" @click="goHome"><i class="ti ti-arrow-left"></i></button>
        <div :class="$style.pageTitle">{{ pageMetadata?.title ?? '' }}</div>
        <div style="width: 38px;"></div>
    </header>

    <div :class="$style.content" ref="contentEl" @scroll="onContentScroll">
        <div v-show="!isPageView" :class="$style.timelineContainer" @touchstart="onTouchStart" @touchend="onTouchEnd">
            <KeepAlive>
                <MkStreamingNotesTimeline v-if="tab === 'mixed'" src="global" key="mixed" />
                <MkStreamingNotesTimeline v-else-if="tab === 'local'" src="local" key="local" />
                <MkStreamingNotesTimeline v-else-if="tab === 'following'" src="home" key="following" />
                <MkExternalTimeline v-else-if="tab === 'ohtl' && externalHost && externalToken" src="ohtl" :host="externalHost" :token="externalToken" :sound="true" :simpleUi="true" key="ohtl" />
                <MkExternalTimeline v-else-if="tab === 'oltl' && externalHost && externalToken" src="oltl" :host="externalHost" :token="externalToken" :sound="true" :simpleUi="true" key="oltl" />
            </KeepAlive>
        </div>
        <div v-show="isPageView" :class="$style.pageContainer"><RouterView /></div>
    </div>

    <!-- 通常TL: サイドバー + ナビバー + 投稿ボタン -->
    <div :class="[$style.bottomBar, footerIsDark ? $style.bottomBarDark : $style.bottomBarLight, { [$style.bottomBarHidden]: !showBottomBar }]" v-show="!isHataskPage && !isExternalTab && !isPageView">
        <button :class="$style.sideBtn" @click="drawerMenuShowing = true"><i class="ti ti-menu-2"></i></button>
        <div :class="$style.navPill">
            <button @click="openSearch" :class="[$style.navBtn, { [$style.navActive]: isSearchPage }]"><i class="ti ti-search"></i></button>
            <button @click="goHome" :class="[$style.navBtn, { [$style.navActive]: isHomeTL }]"><i class="ti ti-home"></i></button>
            <button @click="goToNotifications" :class="[$style.navBtn, { [$style.navActive]: isNotifPage }]">
                <i class="ti ti-bell"></i>
                <span v-if="hasUnreadNotif" :class="$style.badge"></span>
            </button>
            <button @click="goToHatask" :class="[$style.navBtn, { [$style.navActive]: isHataskPage }]"><i class="ti ti-eye"></i></button>
        </div>
        <button v-if="!isPageView" :class="$style.sideBtn" @click="onPostClick"><i class="ti ti-pencil"></i></button>
        <div v-else style="width:48px;"></div>
    </div>

    <!-- 外部TL: サイドバー + 投稿 & 通知ボタン -->
    <div :class="[$style.bottomBar, footerIsDark ? $style.bottomBarDark : $style.bottomBarLight, { [$style.bottomBarHidden]: !showBottomBar }]" v-show="isExternalTab && !isPageView">
        <button :class="$style.sideBtn" @click="drawerMenuShowing = true"><i class="ti ti-menu-2"></i></button>
        <div :class="$style.navPill">
            <button @click="onExtPostClick" :class="$style.navBtn"><i class="ti ti-pencil"></i></button>
            <button @click="openExtNotifPanel" :class="$style.navBtn">
                <i class="ti ti-bell"></i>
                <span v-if="extNotifCount > 0" :class="$style.extBadge">{{ extNotifCount > 99 ? '99+' : extNotifCount }}</span>
            </button>
        </div>
    </div>

    <XCommon v-model:drawerMenuShowing="drawerMenuShowing"/>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, provide, onMounted, onUnmounted, nextTick } from 'vue';
import { instanceName } from '@@/js/config.js';
import XCommon from './_common_/common.vue';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import MkExternalTimeline from '@/components/MkExternalTimeline.vue';
import type { PageMetadata } from '@/page.js';
import { provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import { mainRouter } from '@/router.js';
import { DI } from '@/di.js';
import * as os from '@/os.js';
import { $i } from '@/i.js';
import { prefer } from '@/preferences.js';
import { cleanupStaleUiElements } from '@/utility/ui-cleanup.js';
import { getAccountMenu } from '@/accounts.js';

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

const drawerMenuShowing = ref(false);

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
const extNotifCount = ref(0);
function openExtNotifPanel() { window.dispatchEvent(new CustomEvent('ext-tl-open-notif')); }
function onExtPostClick() { window.dispatchEvent(new CustomEvent('ext-tl-post')); }
function onExtNotifCount(e:Event) { extNotifCount.value = (e as CustomEvent).detail ?? 0; }

// ===== ページ判定 =====
const HOME_ROUTES = new Set(['index','timeline']);
const isPageView = ref(false);
const isSearchPage = computed(()=>{ const r=mainRouter.currentRoute.value; return r.name==='search'||r.path==='/search'; });
const isNotifPage = computed(()=>mainRouter.currentRoute.value.path==='/my/notifications');
const isHataskPage = computed(()=>{ const p=mainRouter.currentRoute.value.path; return p==='/hatask'||p==='/hata-docs'; });
const isExternalTab = computed(()=>tab.value==='ohtl'||tab.value==='oltl');
const isHomeTL = computed(()=>!isPageView.value&&!isSearchPage.value&&!isNotifPage.value&&!isHataskPage.value);

const checkIsPageView = ()=>{ isPageView.value = !HOME_ROUTES.has(mainRouter.currentRoute.value.name as string); };

mainRouter.on('change', ()=>{
    checkIsPageView();
    drawerMenuShowing.value = false;
    showBottomBar.value = true;
    showTopBar.value = true;
    if (mainRouter.currentRoute.value.path==='/my/notifications') hasUnreadNotif.value=false;
    // テーマ再検出（ページ遷移でテーマが変わる場合）
    setTimeout(detectThemeBrightness, 100);
});

// ===== タブ =====
type TabType='following'|'mixed'|'local'|'ohtl'|'oltl';
const tab = ref<TabType>('following');
const tabOrder = computed<TabType[]>(()=>{ const b:TabType[]=['following','local','mixed']; if(showOHTL.value)b.push('ohtl'); if(showOLTL.value)b.push('oltl'); return b; });
const switchTab = (t:TabType)=>{ tab.value=t; };

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
        if(dx>0){if(idx>0)switchTab(tabOrder.value[idx-1]);else drawerMenuShowing.value=true;}
        else{if(idx<tabOrder.value.length-1)switchTab(tabOrder.value[idx+1]);}
    }
};

// ===== ナビゲーション =====
const onPostClick = ()=>{ os.post({}); };
const goHome = ()=>{ if(isPageView.value)mainRouter.push('/'); else switchTab('following'); };
const openSearch = ()=>{ mainRouter.push('/search'); };
const goToHatask = ()=>{ mainRouter.push('/hatask'); };
const goToNotifications = ()=>{ hasUnreadNotif.value=false; mainRouter.push('/my/notifications'); };

// ===== 通知バッジ =====
const hasUnreadNotif = ref(false);
let mainCh:any = null;
const checkUnread = async()=>{ try{ const r=await os.api('i/notifications',{limit:1,following:true}); if(r.length>0&&!r[0].isRead)hasUnreadNotif.value=true; }catch{} };
const initStream = ()=>{
    if(mainCh)return; mainCh=os.stream.useChannel('main');
    mainCh.on('notification',()=>{ if(mainRouter.currentRoute.value.path!=='/my/notifications')hasUnreadNotif.value=true; });
    mainCh.on('unreadNotification',()=>{ if(mainRouter.currentRoute.value.path!=='/my/notifications')hasUnreadNotif.value=true; });
    mainCh.on('readAllNotifications',()=>{ hasUnreadNotif.value=false; });
};

onMounted(()=>{ cleanupStaleUiElements(); checkIsPageView(); checkUnread(); nextTick(()=>{ initStream(); startThemeWatch(); }); window.addEventListener('ext-tl-notif-count', onExtNotifCount); });
onUnmounted(()=>{ mainCh?.dispose(); mainCh=null; stopThemeWatch(); if(scrollTimer)clearTimeout(scrollTimer); window.removeEventListener('ext-tl-notif-count', onExtNotifCount); });
</script>

<style lang="scss" module>
.root { display:flex; flex-direction:column; height:100dvh; background:var(--MI_THEME-bg); overflow:hidden; user-select:none; }

// ===== トップバー（ピル型、スクロール連動） =====
.topBar {
    position:fixed; top:0; left:0; right:0; z-index:200;
    display:flex; justify-content:center; align-items:center; gap:6px;
    padding:calc(10px + env(safe-area-inset-top,0px)) 16px 8px;
    pointer-events:none;
    transition: transform .35s cubic-bezier(.22,1,.36,1), opacity .3s ease;
    transform: translateY(0); opacity: 1;
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
    width:40px; height:40px; border-radius:50%; background:transparent; border:none;
    font-size:1.1em; cursor:pointer; display:flex; align-items:center; justify-content:center;
    transition:all .2s; font-family:inherit; padding:0;
}
.topBarDark .topTabBtn { color:rgba(255,255,255,.4); }
.topBarLight .topTabBtn { color:rgba(0,0,0,.38); }
.topTabActive { color:var(--MI_THEME-accent) !important; }
.topBarDark .topTabActive { background:rgba(255,255,255,.1); }
.topBarLight .topTabActive { background:rgba(0,0,0,.06); }
// 外部TL (OH/OL) のアイコン色を変えて区別
.topTabExt { color:var(--MI_THEME-accent) !important; opacity:.45; }
.topTabExt.topTabActive { opacity:1; }

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
.pageContainer { height:100%; overflow-y:auto; }

// ===== ボトムバー =====
.bottomBar {
    position:fixed; bottom:0; left:0; right:0; z-index:200;
    display:flex; justify-content:center; align-items:center; gap:8px;
    padding:0 16px calc(12px + env(safe-area-inset-bottom,0px));
    pointer-events:none;
    transition: transform .35s cubic-bezier(.22,1,.36,1), opacity .3s ease;
    transform: translateY(0); opacity: 1;
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
.extBadge {
    position:absolute; top:2px; right:0; min-width:16px; height:16px; padding:0 4px; border-radius:8px;
    background:#e74040; color:#fff; font-size:.6em; font-weight:700;
    display:flex; align-items:center; justify-content:center; line-height:1;
}

.bottomBarDark {}
.bottomBarLight {}
.topBarDark {}
.topBarLight {}
</style>
