<!--
	SPDX-FileCopyrightText: Tolehata and hatasaba-project
	SPDX-License-Identifier: AGPL-3.0-only
-->

<!--
	旗鯖fork: HatasabaUI デッキモード (D2: 3階層モデル)。
	データ構造: profile → slots[] → frames[] → tabs[](=カラム)
	  - slot  : レイアウトの1マス(row:列 / grid:セル / stack:段)。frames を縦積みできる
	  - frame : スロット内の箱。tabs が複数ならブラウザ風タブで切替表示(=「カラムの中で複数カラムをタブ切替」)
	  - tab   : 表示内容(カラム本体)。type でTL種別を決める
	これにより「縦積み(日の字)」と「タブ束ね」を全レイアウトで両立できる。

	プロファイルは simpleUi.deckProfilesV2 に保存。旧 simpleUi.deckProfiles(columns形式)からは
	初回に一度だけ自動マイグレーション(1カラム=1slot=1frame=1tab)。旧データは温存しロールバック可能。

	【重要】ビルドプラグイン(unwind-css-module-class-name)はCSS Modulesクラスを静的解決するため
	$style[変数] の動的アクセスは解決されない。レイアウトクラスは v-if/v-else-if で分岐し静的参照すること。
	【重要】副作用(prefer.commit)を computed 内で呼ばないこと。マイグレーションは onMounted のみ。
-->

<template>
<div :class="[$style.deckWrap, toolbarPos === 'right' ? $style.deckWrapRight : toolbarPos === 'bottom' ? $style.deckWrapBottom : $style.deckWrapTop]">
	<!-- 折り畳み式ツールバー -->
	<div :class="$style.toolbarBar">
		<button :class="[$style.toolbarToggle, { [$style.toolbarToggleOn]: toolbarOpen }]" v-tooltip="toolbarOpen ? 'ツールバーを隠す' : 'ツールバーを表示'" @click="toolbarOpen = !toolbarOpen">
			<i :class="toolbarOpen ? 'ti ti-chevron-up' : 'ti ti-adjustments-horizontal'"></i>
		</button>
		<div v-if="toolbarOpen" :class="$style.toolbarInner">
			<div :class="$style.layoutPill">
				<button v-for="l in LAYOUTS" :key="l.id" :class="[$style.layoutBtn, { [$style.layoutBtnOn]: layout === l.id }]" v-tooltip="l.label" @click="setLayout(l.id)"><i :class="l.icon"></i></button>
			</div>
			<button :class="$style.profileBtn" @click="openProfileMenu($event)">
				<i class="ti ti-layout-board"></i><span v-if="toolbarPos !== 'right'" :class="$style.profileName">{{ activeProfileName }}</span><i v-if="toolbarPos !== 'right'" class="ti ti-chevron-down" :class="$style.profileChevron"></i>
			</button>
			<button :class="$style.iconBtn" v-tooltip="'すべてのカラムを更新'" @click="reloadAll"><i class="ti ti-refresh"></i></button>
			<button :class="[$style.iconBtn, { [$style.iconBtnOn]: locked }]" v-tooltip="locked ? 'ロック中(タップで解除)' : 'カラム編集をロック'" @click="toggleLock"><i :class="locked ? 'ti ti-lock' : 'ti ti-lock-open'"></i></button>
			<button :class="$style.iconBtn" v-tooltip="toolbarPosLabel" @click="cycleToolbarPos"><i :class="toolbarPosIcon"></i></button>
			<button v-if="toolbarPos !== 'right'" :class="[$style.iconBtn, { [$style.iconBtnOn]: clockEnabled }]" v-tooltip="'時計の表示'" @click="toggleClock"><i class="ti ti-clock"></i></button>
			<div v-if="showClock" :class="$style.clock">{{ clockText }}</div>
			<div :class="$style.toolbarSpacer"></div>
		</div>
	</div>

	<!-- row -->
	<div v-if="layout === 'row'" :class="[$style.deck, $style.layoutRow]">
		<div v-for="slot in slots" :key="slot.id" :class="[$style.slot, { [$style.slotDragging]: slotDragId === slot.id, [$style.slotDragOver]: slotDragOverId === slot.id }]" :style="slotStyle(slot)" @dragover="onSlotDragOver(slot.id, $event)" @drop="onSlotDrop(slot.id, $event)">
			<div :class="$style.slotStack">
				<template v-for="frame in slot.frames" :key="frame.id">
					<div :class="['frameRoot', $style.frameRoot, { [$style.frameColored]: !!frame.borderColor, [$style.frameDragOver]: dragOverFrame === frame.id }]" :style="frameStyle(frame, slot)" @dragover.prevent="onFrameDragOver(frame.id, $event)" @drop="onFrameDrop(slot.id, frame.id, $event)">
						<!-- タブバー(tabs複数 or 常時表示) -->
						<div :class="$style.tabBar">
							<div :class="$style.tabs">
								<button
									v-for="tab in frame.tabs" :key="tab.id"
									:class="[$style.tab, { [$style.tabActive]: activeTabOf(frame).id === tab.id, [$style.tabDragOver]: tabDragOverId === tab.id }]"
									:style="tabStyle(tab, activeTabOf(frame).id === tab.id)"
									:draggable="!locked"
									@click="setActiveTab(slot.id, frame.id, tab.id)"
									@dblclick="renameTab(slot.id, frame.id, tab.id)"
									@dragstart="onTabDragStart(slot.id, frame.id, tab.id, $event)"
									@dragend="onTabDragEnd"
									@dragover.prevent="onTabDragOverTab(tab.id, $event)"
									@drop="onTabDropOnTab(slot.id, frame.id, tab.id, $event)"
									@contextmenu.prevent="openTabMenu(slot, frame, tab, $event)"
								>
									<i :class="[tabIcon(tab), $style.tabIcon, { [$style.tabIconActiveColored]: tab.tabColor && activeTabOf(frame).id === tab.id }]"></i>
									<span :class="$style.tabLabel">{{ tabTitle(tab) }}</span>
								</button>
							</div>
							<button v-if="activeTabOf(frame).type === 'externalNotifications'" class="_button" :class="$style.frameHeadBtn" v-tooltip="'既読にする'" @click.stop="markExtRead(activeTabOf(frame).id)"><i class="ti ti-check"></i></button>
							<button v-if="frame.tabs.length > 1" class="_button" :class="$style.frameTabsBtn" v-tooltip="'タブの管理'" @click.stop="openTabManageMenu(slot, frame, $event)"><i class="ti ti-layout-navbar"></i></button>
							<button v-if="!locked" class="_button" :class="$style.slotHandle" v-tooltip="'ドラッグで列を移動 / クリックで列設定'" :draggable="!locked" @dragstart="onSlotDragStart(slot.id, $event)" @dragend="onSlotDragEnd" @click.stop="openSlotMenu(slot, $event)"><i class="ti ti-grip-vertical"></i></button>
							<button class="_button" :class="$style.frameMenuBtn" @click.stop="openFrameMenu(slot, frame, $event)"><i class="ti ti-dots"></i></button>
						</div>
						<!-- 本体(アクティブタブ) -->
						<div :class="['frameBody', $style.frameBody]">
							<template v-for="tab in frame.tabs" :key="tab.id">
								<div v-show="activeTabOf(frame).id === tab.id" :class="$style.tabPane">
									<component :is="resolveColumn(tab)" v-bind="columnProps(tab)" :ref="el => setColRef(tab.id, el)"/>
								</div>
							</template>
						</div>
					</div>
				</template>
				<!-- 縦積みドロップ帯 -->
				<div v-if="dragSrc" :class="[$style.stackDrop, { [$style.stackDropOver]: dragOverSlotStack === slot.id }]" @dragover.prevent="onSlotStackDragOver(slot.id, $event)" @drop="onSlotStackDrop(slot.id, $event)">ここに縦積み</div>
			</div>
		</div>
		<!-- 新規列ドロップ帯 + 追加ボタン -->
		<div v-if="dragSrc" :class="$style.newSlotDrop" @dragover.prevent @drop="onNewSlotDrop($event)">新しい列</div>
		<button v-if="!locked" :class="$style.addColumn" @click="addColumn($event)"><i class="ti ti-plus"></i><span>カラムを追加</span></button>
	</div>

	<!-- grid2 / grid3 共通(クラスのみ差し替え) -->
	<div v-else-if="layout === 'grid2' || layout === 'grid3'" :class="[$style.deck, layout === 'grid2' ? $style.layoutGrid2 : $style.layoutGrid3]">
		<div v-for="slot in slots" :key="slot.id" :class="[$style.slot, $style.slotGrid, { [$style.slotFull]: slot.fullWidth, [$style.slotFullV]: slot.fullHeight, [$style.slotDragging]: slotDragId === slot.id, [$style.slotDragOver]: slotDragOverId === slot.id }]" @dragover="onSlotDragOver(slot.id, $event)" @drop="onSlotDrop(slot.id, $event)">
			<div :class="$style.slotStack">
				<template v-for="frame in slot.frames" :key="frame.id">
					<div :class="['frameRoot', $style.frameRoot, { [$style.frameColored]: !!frame.borderColor, [$style.frameDragOver]: dragOverFrame === frame.id }]" :style="frameStyle(frame, slot)" @dragover.prevent="onFrameDragOver(frame.id, $event)" @drop="onFrameDrop(slot.id, frame.id, $event)">
						<div :class="$style.tabBar">
							<div :class="$style.tabs">
								<button v-for="tab in frame.tabs" :key="tab.id" :class="[$style.tab, { [$style.tabActive]: activeTabOf(frame).id === tab.id, [$style.tabDragOver]: tabDragOverId === tab.id }]" :style="tabStyle(tab, activeTabOf(frame).id === tab.id)" :draggable="!locked" @click="setActiveTab(slot.id, frame.id, tab.id)" @dblclick="renameTab(slot.id, frame.id, tab.id)" @dragstart="onTabDragStart(slot.id, frame.id, tab.id, $event)" @dragend="onTabDragEnd" @dragover.prevent="onTabDragOverTab(tab.id, $event)" @drop="onTabDropOnTab(slot.id, frame.id, tab.id, $event)" @contextmenu.prevent="openTabMenu(slot, frame, tab, $event)">
									<i :class="[tabIcon(tab), $style.tabIcon, { [$style.tabIconActiveColored]: tab.tabColor && activeTabOf(frame).id === tab.id }]"></i><span :class="$style.tabLabel">{{ tabTitle(tab) }}</span>
								</button>
							</div>
							<button v-if="activeTabOf(frame).type === 'externalNotifications'" class="_button" :class="$style.frameHeadBtn" v-tooltip="'既読にする'" @click.stop="markExtRead(activeTabOf(frame).id)"><i class="ti ti-check"></i></button>
							<button v-if="frame.tabs.length > 1" class="_button" :class="$style.frameTabsBtn" v-tooltip="'タブの管理'" @click.stop="openTabManageMenu(slot, frame, $event)"><i class="ti ti-layout-navbar"></i></button>
							<button v-if="!locked" class="_button" :class="$style.slotHandle" v-tooltip="'ドラッグで列を移動 / クリックで列設定'" :draggable="!locked" @dragstart="onSlotDragStart(slot.id, $event)" @dragend="onSlotDragEnd" @click.stop="openSlotMenu(slot, $event)"><i class="ti ti-grip-vertical"></i></button>
							<button class="_button" :class="$style.frameMenuBtn" @click.stop="openFrameMenu(slot, frame, $event)"><i class="ti ti-dots"></i></button>
						</div>
						<div :class="['frameBody', $style.frameBody]">
							<template v-for="tab in frame.tabs" :key="tab.id">
								<div v-show="activeTabOf(frame).id === tab.id" :class="$style.tabPane"><component :is="resolveColumn(tab)" v-bind="columnProps(tab)" :ref="el => setColRef(tab.id, el)"/></div>
							</template>
						</div>
					</div>
				</template>
				<div v-if="dragSrc" :class="[$style.stackDrop, { [$style.stackDropOver]: dragOverSlotStack === slot.id }]" @dragover.prevent="onSlotStackDragOver(slot.id, $event)" @drop="onSlotStackDrop(slot.id, $event)">ここに縦積み</div>
			</div>
		</div>
		<button v-if="!locked" :class="[$style.addColumn, $style.addColumnGrid]" @click="addColumn($event)"><i class="ti ti-plus"></i><span>カラムを追加</span></button>
	</div>

	<!-- stack -->
	<div v-else :class="[$style.deck, $style.layoutStack]">
		<div v-for="slot in slots" :key="slot.id" :class="[$style.slot, { [$style.slotDragging]: slotDragId === slot.id, [$style.slotDragOver]: slotDragOverId === slot.id }]" :style="slotStyle(slot)" @dragover="onSlotDragOver(slot.id, $event)" @drop="onSlotDrop(slot.id, $event)">
			<div :class="$style.slotStack">
				<template v-for="frame in slot.frames" :key="frame.id">
					<div :class="['frameRoot', $style.frameRoot, { [$style.frameColored]: !!frame.borderColor, [$style.frameDragOver]: dragOverFrame === frame.id }]" :style="frameStyle(frame, slot)" @dragover.prevent="onFrameDragOver(frame.id, $event)" @drop="onFrameDrop(slot.id, frame.id, $event)">
						<div :class="$style.tabBar">
							<div :class="$style.tabs">
								<button v-for="tab in frame.tabs" :key="tab.id" :class="[$style.tab, { [$style.tabActive]: activeTabOf(frame).id === tab.id, [$style.tabDragOver]: tabDragOverId === tab.id }]" :style="tabStyle(tab, activeTabOf(frame).id === tab.id)" :draggable="!locked" @click="setActiveTab(slot.id, frame.id, tab.id)" @dblclick="renameTab(slot.id, frame.id, tab.id)" @dragstart="onTabDragStart(slot.id, frame.id, tab.id, $event)" @dragend="onTabDragEnd" @dragover.prevent="onTabDragOverTab(tab.id, $event)" @drop="onTabDropOnTab(slot.id, frame.id, tab.id, $event)" @contextmenu.prevent="openTabMenu(slot, frame, tab, $event)">
									<i :class="[tabIcon(tab), $style.tabIcon, { [$style.tabIconActiveColored]: tab.tabColor && activeTabOf(frame).id === tab.id }]"></i><span :class="$style.tabLabel">{{ tabTitle(tab) }}</span>
								</button>
							</div>
							<button v-if="activeTabOf(frame).type === 'externalNotifications'" class="_button" :class="$style.frameHeadBtn" v-tooltip="'既読にする'" @click.stop="markExtRead(activeTabOf(frame).id)"><i class="ti ti-check"></i></button>
							<button v-if="frame.tabs.length > 1" class="_button" :class="$style.frameTabsBtn" v-tooltip="'タブの管理'" @click.stop="openTabManageMenu(slot, frame, $event)"><i class="ti ti-layout-navbar"></i></button>
							<button v-if="!locked" class="_button" :class="$style.slotHandle" v-tooltip="'ドラッグで列を移動 / クリックで列設定'" :draggable="!locked" @dragstart="onSlotDragStart(slot.id, $event)" @dragend="onSlotDragEnd" @click.stop="openSlotMenu(slot, $event)"><i class="ti ti-grip-vertical"></i></button>
							<button class="_button" :class="$style.frameMenuBtn" @click.stop="openFrameMenu(slot, frame, $event)"><i class="ti ti-dots"></i></button>
						</div>
						<div :class="['frameBody', $style.frameBody]">
							<template v-for="tab in frame.tabs" :key="tab.id">
								<div v-show="activeTabOf(frame).id === tab.id" :class="$style.tabPane"><component :is="resolveColumn(tab)" v-bind="columnProps(tab)" :ref="el => setColRef(tab.id, el)"/></div>
							</template>
						</div>
					</div>
				</template>
				<div v-if="dragSrc" :class="[$style.stackDrop, { [$style.stackDropOver]: dragOverSlotStack === slot.id }]" @dragover.prevent="onSlotStackDragOver(slot.id, $event)" @drop="onSlotStackDrop(slot.id, $event)">ここに縦積み</div>
			</div>
		</div>
		<button v-if="!locked" :class="[$style.addColumn, $style.addColumnStack]" @click="addColumn($event)"><i class="ti ti-plus"></i><span>カラムを追加</span></button>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted, defineAsyncComponent, type Component } from 'vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { prefer } from '@/preferences.js';
import { globalEvents } from '@/events.js';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import MkExternalTimeline from '@/components/MkExternalTimeline.vue';
import MkStreamingNotificationsTimeline from '@/components/MkStreamingNotificationsTimeline.vue';
import MkTrendingTimeline from '@/components/MkTrendingTimeline.vue';
import MkPostForm from '@/components/MkPostForm.vue';

const XWidgets = defineAsyncComponent(() => import('./widgets.vue'));
const WidgetExternalNotifications = defineAsyncComponent(() => import('@/widgets/WidgetExternalNotifications.vue'));

// ===== 型 =====
type DeckLayout = 'row' | 'grid2' | 'grid3' | 'stack';
type ColumnType = 'home' | 'local' | 'social' | 'global' | 'trending' | 'ohtl' | 'oltl' | 'list' | 'antenna' | 'channel' | 'mentions' | 'directs' | 'notifications' | 'externalNotifications' | 'widgets' | 'postForm';

// tab = カラム本体(表示内容)
type DeckTab = {
	id: string;
	type: ColumnType;
	name?: string;       // list/antenna/channel の元名称
	sourceId?: string;   // list/antenna/channel のID
	withRenotes?: boolean;
	tabName?: string;    // タブ表示名(ユーザー設定可。未設定なら種別名)
	tabColor?: string | null; // タブ(クリックして切り替える部分)の色
};
// frame = スロット内の箱。tabs 複数ならタブ表示
type DeckFrame = {
	id: string;
	activeTab?: string;
	borderColor?: string | null;
	height?: number; // 横並びレイアウトで縦積みした際の、この箱の高さ(px)
	tabs: DeckTab[];
};
// slot = レイアウトの1マス。frames を縦積み
type DeckSlot = {
	id: string;
	width: number;
	height?: number;
	fullWidth?: boolean;
	fullHeight?: boolean;
	frames: DeckFrame[];
};
type DeckProfile = { id: string; name: string; layout: DeckLayout; slots: DeckSlot[]; };

// 旧形式(マイグレーション元)
type LegacyColumn = { id: string; type: ColumnType; width: number; height?: number; name?: string; sourceId?: string; withRenotes?: boolean; borderColor?: string | null; fullWidth?: boolean; fullHeight?: boolean; };
type LegacyProfile = { id: string; name: string; layout: DeckLayout; columns: LegacyColumn[]; };

const LAYOUTS: { id: DeckLayout; icon: string; label: string }[] = [
	{ id: 'row', icon: 'ti ti-layout-columns', label: '横並び (従来デッキ風)' },
	{ id: 'grid2', icon: 'ti ti-layout-grid', label: '田の字 (2列グリッド)' },
	{ id: 'grid3', icon: 'ti ti-layout-board-split', label: '3列グリッド' },
	{ id: 'stack', icon: 'ti ti-layout-list', label: '縦一列' },
];

const toolbarOpen = ref(false);
const toolbarPos = computed<'top' | 'right' | 'bottom'>(() => (prefer.r['simpleUi.deckToolbarPos']?.value as 'top' | 'right' | 'bottom') ?? 'top');
function cycleToolbarPos() {
	const order: ('top' | 'right' | 'bottom')[] = ['top', 'right', 'bottom'];
	const next = order[(order.indexOf(toolbarPos.value) + 1) % order.length];
	prefer.commit('simpleUi.deckToolbarPos', next);
}
const toolbarPosIcon = computed(() => toolbarPos.value === 'top' ? 'ti ti-layout-navbar' : toolbarPos.value === 'bottom' ? 'ti ti-layout-bottombar' : 'ti ti-layout-sidebar-right');
const toolbarPosLabel = computed(() => toolbarPos.value === 'top' ? 'ツールバー: 上' : toolbarPos.value === 'bottom' ? 'ツールバー: 下' : 'ツールバー: 右');
// 時計(上下配置 かつ ツールバー表示時のみ)。ON/OFFは simpleUi.deckClock。
const clockEnabled = computed<boolean>(() => prefer.r['simpleUi.deckClock']?.value as boolean ?? false);
function toggleClock() { prefer.commit('simpleUi.deckClock', !clockEnabled.value); }
const showClock = computed(() => clockEnabled.value && (toolbarPos.value === 'top' || toolbarPos.value === 'bottom'));
const now = ref(new Date());
let clockTimer: ReturnType<typeof setInterval> | null = null;
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
const clockText = computed(() => {
	const d = now.value;
	const mon = d.getMonth() + 1;
	const day = d.getDate();
	const wd = WEEKDAYS_JA[d.getDay()];
	const h24 = d.getHours();
	const ampm = h24 < 12 ? '午前' : '午後';
	const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
	const m = d.getMinutes().toString().padStart(2, '0');
	const sec = d.getSeconds().toString().padStart(2, '0');
	return `${mon}月${day}日(${wd}) ${ampm}${h12}時${m}分${sec}秒`;
});
onMounted(() => { clockTimer = setInterval(() => { now.value = new Date(); }, 1000); });
onUnmounted(() => { if (clockTimer) clearInterval(clockTimer); });
const locked = computed<boolean>(() => prefer.r['simpleUi.deckLocked'].value as boolean);
function toggleLock() { prefer.commit('simpleUi.deckLocked', !locked.value); }

function genId(prefix: string): string { return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`; }

// ===== マイグレーション(onMountedのみ。副作用) =====
// 旧 deckProfiles(columns[]) → V2(slots[].frames[].tabs[]) に 1カラム=1slot=1frame=1tab で変換。
// 旧 deckColumns/deckLayout(さらに古い単一構成)も拾う。V2が既にあれば絶対に触らない。
function legacyColumnToSlot(col: LegacyColumn): DeckSlot {
	return {
		id: genId('slot'),
		width: col.width ?? 380,
		height: col.height ?? 460,
		fullWidth: col.fullWidth,
		fullHeight: col.fullHeight,
		frames: [{
			id: genId('frame'),
			borderColor: col.borderColor ?? null,
			tabs: [{
				id: col.id ?? genId('tab'),
				type: col.type,
				name: col.name,
				sourceId: col.sourceId,
				withRenotes: col.withRenotes,
			}],
		}],
	};
}

function migrateV2IfNeeded() {
	const v2 = prefer.r['simpleUi.deckProfilesV2'].value as DeckProfile[];
	if (v2 != null && v2.length > 0) return; // 既にV2があるなら触らない

	// 1) 旧 deckProfiles(複数プロファイル, columns形式)から変換
	const legacy = prefer.r['simpleUi.deckProfiles'].value as LegacyProfile[];
	let migrated: DeckProfile[] = [];
	if (legacy != null && legacy.length > 0) {
		migrated = legacy.map(lp => ({
			id: lp.id,
			name: lp.name,
			layout: lp.layout ?? 'row',
			slots: (lp.columns ?? []).map(legacyColumnToSlot),
		}));
	} else {
		// 2) さらに古い単一構成(deckColumns/deckLayout)から
		const cols = prefer.r['simpleUi.deckColumns'].value as LegacyColumn[];
		const lay = (prefer.r['simpleUi.deckLayout'].value as DeckLayout) ?? 'row';
		migrated = [{
			id: 'default',
			name: 'デフォルト',
			layout: lay,
			slots: (cols ?? []).map(legacyColumnToSlot),
		}];
	}
	if (migrated.length === 0) {
		migrated = [{ id: 'default', name: 'デフォルト', layout: 'row', slots: [] }];
	}
	prefer.commit('simpleUi.deckProfilesV2', migrated);
	if (!(prefer.r['simpleUi.deckActiveProfileV2'].value as string)) {
		prefer.commit('simpleUi.deckActiveProfileV2', migrated[0].id);
	}
}

onMounted(() => { migrateV2IfNeeded(); });

// ===== プロファイル/slots アクセサ(副作用なし・読むだけ) =====
const FALLBACK_PROFILE: DeckProfile = { id: 'default', name: 'デフォルト', layout: 'row', slots: [] };

const profiles = computed<DeckProfile[]>(() => {
	const p = prefer.r['simpleUi.deckProfilesV2'].value as DeckProfile[];
	return (p != null && p.length > 0) ? p : [FALLBACK_PROFILE];
});
const activeProfileId = computed<string>(() => {
	const id = prefer.r['simpleUi.deckActiveProfileV2'].value as string;
	const list = profiles.value;
	if (id && list.some(p => p.id === id)) return id;
	return list[0]?.id ?? 'default';
});
const activeProfile = computed<DeckProfile>(() => {
	const list = profiles.value;
	return list.find(p => p.id === activeProfileId.value) ?? list[0];
});
const activeProfileName = computed<string>(() => activeProfile.value?.name ?? 'デフォルト');
const slots = computed<DeckSlot[]>(() => activeProfile.value?.slots ?? []);
const layout = computed<DeckLayout>(() => activeProfile.value?.layout ?? 'row');

const externalHost = computed(() => prefer.s['external.host']);
const externalToken = computed(() => prefer.s['external.token']);
const externalReady = computed(() => externalHost.value != null && externalHost.value !== '' && externalToken.value != null);

// ===== commit系 =====
function commitProfiles(list: DeckProfile[]) { prefer.commit('simpleUi.deckProfilesV2', list); }
function commitActiveProfile(mutator: (p: DeckProfile) => DeckProfile) {
	commitProfiles(profiles.value.map(p => p.id === activeProfileId.value ? mutator({ ...p }) : p));
}
function commitSlots(next: DeckSlot[]) { commitActiveProfile(p => ({ ...p, slots: next })); }
function setLayout(l: DeckLayout) { commitActiveProfile(p => ({ ...p, layout: l })); }

// ===== カラム(tab)描画ロジック =====
const COLUMN_META: Record<ColumnType, { title: string; icon: string }> = {
	home: { title: 'ホーム', icon: 'ti ti-home' },
	local: { title: 'ローカル', icon: 'ti ti-planet' },
	social: { title: 'ソーシャル', icon: 'ti ti-universe' },
	global: { title: 'グローバル', icon: 'ti ti-world' },
	trending: { title: 'トレンド', icon: 'ti ti-chart-line' },
	ohtl: { title: '外部ホーム', icon: 'ti ti-home-link' },
	oltl: { title: '外部ローカル', icon: 'ti ti-world-share' },
	list: { title: 'リスト', icon: 'ti ti-list' },
	antenna: { title: 'アンテナ', icon: 'ti ti-antenna' },
	channel: { title: 'チャンネル', icon: 'ti ti-device-tv' },
	mentions: { title: 'メンション', icon: 'ti ti-at' },
	directs: { title: '指名', icon: 'ti ti-mail' },
	notifications: { title: '通知', icon: 'ti ti-bell' },
	externalNotifications: { title: '外部通知', icon: 'ti ti-bell-ringing' },
	widgets: { title: 'ウィジェット', icon: 'ti ti-apps' },
	postForm: { title: '投稿フォーム', icon: 'ti ti-pencil-plus' },
};
function tabTitle(tab: DeckTab): string {
	if (tab.tabName && tab.tabName.trim() !== '') return tab.tabName;
	if ((tab.type === 'list' || tab.type === 'antenna' || tab.type === 'channel') && tab.name) return tab.name;
	return COLUMN_META[tab.type]?.title ?? tab.type;
}
function tabIcon(tab: DeckTab): string { return COLUMN_META[tab.type]?.icon ?? 'ti ti-square'; }

const NOTE_SRC: Partial<Record<ColumnType, string>> = {
	home: 'home', local: 'local', social: 'social', global: 'global', mentions: 'mentions', directs: 'directs',
};
function resolveColumn(tab: DeckTab): Component {
	if (tab.type in NOTE_SRC) return MkStreamingNotesTimeline;
	if (tab.type === 'list' && tab.sourceId) return MkStreamingNotesTimeline;
	if (tab.type === 'antenna' && tab.sourceId) return MkStreamingNotesTimeline;
	if (tab.type === 'channel' && tab.sourceId) return MkStreamingNotesTimeline;
	if ((tab.type === 'ohtl' || tab.type === 'oltl') && externalReady.value) return MkExternalTimeline;
	if (tab.type === 'externalNotifications' && externalReady.value) return WidgetExternalNotifications;
	if (tab.type === 'trending') return MkTrendingTimeline;
	if (tab.type === 'notifications') return MkStreamingNotificationsTimeline;
	if (tab.type === 'postForm') return MkPostForm;
	if (tab.type === 'widgets') return XWidgets;
	return ColumnError;
}
function columnProps(tab: DeckTab): Record<string, unknown> {
	const wr = tab.withRenotes !== false;
	if (tab.type in NOTE_SRC) return { src: NOTE_SRC[tab.type], withRenotes: wr };
	if (tab.type === 'list' && tab.sourceId) return { src: 'list', list: tab.sourceId, withRenotes: wr };
	if (tab.type === 'antenna' && tab.sourceId) return { src: 'antenna', antenna: tab.sourceId, withRenotes: wr };
	if (tab.type === 'channel' && tab.sourceId) return { src: 'channel', channel: tab.sourceId, withRenotes: wr };
	if ((tab.type === 'ohtl' || tab.type === 'oltl') && externalReady.value) return { src: tab.type, host: externalHost.value, token: externalToken.value, sound: false, simpleUi: true };
	if (tab.type === 'externalNotifications' && externalReady.value) return { widget: { id: `deck-extnotif-${tab.id}`, name: 'externalNotifications', data: {} }, showHeader: false };
	if (tab.type === 'trending') return {};
	if (tab.type === 'notifications') return {};
	if (tab.type === 'postForm') return { fixed: true, autofocus: false };
	if (tab.type === 'widgets') return {};
	return { message: (tab.type === 'ohtl' || tab.type === 'oltl' || tab.type === 'externalNotifications') ? '外部アカウントが未連携です' : 'このカラムを表示できません' };
}
const ColumnError = defineAsyncComponent(() => Promise.resolve({
	props: { message: { type: String, default: '' } },
	template: '<div class="_deckColError"><i class="ti ti-alert-circle"></i><div>{{ message }}</div></div>',
}));

const RENOTE_TOGGLE_TYPES: ColumnType[] = ['home', 'local', 'social', 'global', 'list', 'antenna', 'channel'];
function supportsRenoteToggle(tab: DeckTab): boolean { return RENOTE_TOGGLE_TYPES.includes(tab.type); }

// ===== カラム本体ref(外部通知の更新/既読・一括更新用) =====
const colRefs = new Map<string, any>();
function setColRef(id: string, el: any) { if (el) colRefs.set(id, el); else colRefs.delete(id); }
function reloadAll() {
	globalEvents.emit('reloadTimeline');
	globalEvents.emit('reloadNotification');
	for (const slot of slots.value) {
		for (const frame of slot.frames) {
			for (const tab of frame.tabs) {
				if (tab.type === 'externalNotifications') colRefs.get(tab.id)?.fetchNotifications?.();
				if (tab.type === 'ohtl' || tab.type === 'oltl') colRefs.get(tab.id)?.reload?.();
			}
		}
	}
}
function markExtRead(id: string) { colRefs.get(id)?.markAllAsRead?.(); }

// ===== slot/frame/tab を辿るユーティリティ =====
function mapSlots(mut: (slots: DeckSlot[]) => DeckSlot[]) { commitSlots(mut(slots.value.map(s => ({ ...s, frames: s.frames.map(f => ({ ...f, tabs: [...f.tabs] })) })))); }
function findFrame(slotId: string, frameId: string): { s: number; f: number } | null {
	for (let si = 0; si < slots.value.length; si++) {
		const fi = slots.value[si].frames.findIndex(f => f.id === frameId);
		if (slots.value[si].id === slotId && fi >= 0) return { s: si, f: fi };
	}
	return null;
}

// ===== レイアウト別サイズ =====
function slotStyle(slot: DeckSlot): Record<string, string> {
	const st: Record<string, string> = {};
	if (layout.value === 'row') st.width = `${slot.width}px`;
	else if (layout.value === 'stack') st.height = `${slot.height ?? 460}px`;
	return st;
}
function frameStyle(frame: DeckFrame, slot: DeckSlot): Record<string, string> {
	const st: Record<string, string> = {};
	if (frame.borderColor) { st.borderColor = frame.borderColor; st['--deckColBorder'] = frame.borderColor; }
	// 横並びレイアウトで縦積み(frame複数)のとき、height指定があれば固定高にする。
	// 未指定のframeは flex:1 で残りを分け合う(CSS側のデフォルト)。
	if (layout.value === 'row' && slot.frames.length > 1 && frame.height) {
		st.flex = `0 0 ${frame.height}px`;
		st.height = `${frame.height}px`;
	}
	return st;
}
function setFrameHeight(slotId: string, frameId: string, height: number | null) {
	mapSlots(ss => ss.map(s => s.id !== slotId ? s : { ...s, frames: s.frames.map(f => f.id !== frameId ? f : { ...f, height: height ?? undefined }) }));
}

// ===== タブ操作 =====
function setActiveTab(slotId: string, frameId: string, tabId: string) {
	mapSlots(ss => ss.map(s => s.id !== slotId ? s : { ...s, frames: s.frames.map(f => f.id !== frameId ? f : { ...f, activeTab: tabId }) }));
}
function activeTabOf(frame: DeckFrame): DeckTab {
	return frame.tabs.find(t => t.id === frame.activeTab) ?? frame.tabs[0];
}
async function renameTab(slotId: string, frameId: string, tabId: string) {
	const loc = findFrame(slotId, frameId); if (!loc) return;
	const tab = slots.value[loc.s].frames[loc.f].tabs.find(t => t.id === tabId); if (!tab) return;
	const { canceled, result } = await os.inputText({ title: 'タブ名を変更', default: tabTitle(tab), placeholder: '空にすると種別名に戻ります' });
	if (canceled) return;
	mapSlots(ss => ss.map(s => s.id !== slotId ? s : { ...s, frames: s.frames.map(f => f.id !== frameId ? f : { ...f, tabs: f.tabs.map(t => t.id !== tabId ? t : { ...t, tabName: (result && result.trim() !== '') ? result.trim() : undefined }) }) }));
}
function removeTab(slotId: string, frameId: string, tabId: string) {
	mapSlots(ss => {
		return ss.map(s => {
			if (s.id !== slotId) return s;
			const frames = s.frames.map(f => {
				if (f.id !== frameId) return f;
				const tabs = f.tabs.filter(t => t.id !== tabId);
				const activeTab = f.activeTab === tabId ? tabs[0]?.id : f.activeTab;
				return { ...f, tabs, activeTab };
			}).filter(f => f.tabs.length > 0); // タブが空になったframeは消す
			return { ...s, frames };
		}).filter(s => s.frames.length > 0); // frameが空のslotも消す
	});
}

// ===== frame(縦積み段)操作 =====
function removeFrame(slotId: string, frameId: string) {
	mapSlots(ss => ss.map(s => s.id !== slotId ? s : { ...s, frames: s.frames.filter(f => f.id !== frameId) }).filter(s => s.frames.length > 0));
}
function setFrameBorderColor(slotId: string, frameId: string, color: string | null) {
	mapSlots(ss => ss.map(s => s.id !== slotId ? s : { ...s, frames: s.frames.map(f => f.id !== frameId ? f : { ...f, borderColor: color }) }));
}

// ===== slot(列/セル/段)操作 =====
function setSlotWidth(slotId: string, width: number) { mapSlots(ss => ss.map(s => s.id !== slotId ? { ...s } : { ...s, width })); }
function setSlotHeight(slotId: string, height: number) { mapSlots(ss => ss.map(s => s.id !== slotId ? { ...s } : { ...s, height })); }
function setSlotFullSpan(slotId: string, span: 'none' | 'col' | 'row') {
	mapSlots(ss => ss.map(s => s.id !== slotId ? { ...s } : { ...s, fullWidth: span === 'col', fullHeight: span === 'row' }));
}
function currentFullSpan(slot: DeckSlot): 'none' | 'col' | 'row' { if (slot.fullWidth) return 'col'; if (slot.fullHeight) return 'row'; return 'none'; }
function removeSlot(slotId: string) { commitSlots(slots.value.filter(s => s.id !== slotId)); }
function moveSlot(slotId: string, step: number) {
	const idx = slots.value.findIndex(s => s.id === slotId);
	const to = idx + step;
	if (idx < 0 || to < 0 || to >= slots.value.length) return;
	const next = [...slots.value];
	const [m] = next.splice(idx, 1);
	next.splice(to, 0, m);
	commitSlots(next);
}

// 新規slot/frame/tab 生成
function newTab(partial: Partial<DeckTab> & { type: ColumnType }): DeckTab {
	return { id: genId('tab'), withRenotes: true, ...partial };
}
function newFrameFromTab(tab: DeckTab): DeckFrame { return { id: genId('frame'), borderColor: null, tabs: [tab], activeTab: tab.id }; }
function newSlotFromTab(tab: DeckTab): DeckSlot { return { id: genId('slot'), width: 380, height: 460, frames: [newFrameFromTab(tab)] }; }

// スロットを新規追加(末尾)
function addSlotWithTab(partial: Partial<DeckTab> & { type: ColumnType }) {
	commitSlots([...slots.value, newSlotFromTab(newTab(partial))]);
}
// 既存frameにタブとして束ねる
function addTabToFrame(slotId: string, frameId: string, partial: Partial<DeckTab> & { type: ColumnType }) {
	const tab = newTab(partial);
	mapSlots(ss => ss.map(s => s.id !== slotId ? s : { ...s, frames: s.frames.map(f => f.id !== frameId ? f : { ...f, tabs: [...f.tabs, tab], activeTab: tab.id }) }));
}
// 既存slotにframeとして縦積み追加
function addFrameToSlot(slotId: string, partial: Partial<DeckTab> & { type: ColumnType }) {
	const frame = newFrameFromTab(newTab(partial));
	mapSlots(ss => ss.map(s => s.id !== slotId ? s : { ...s, frames: [...s.frames, frame] }));
}

// ===== ドラッグ束ね =====
// ドラッグ対象 = タブ(どのslot/frameのどのtabか)。
// ドロップ先 = (a)別frameのヘッダ → そのframeにタブとして移動(束ねる)
//             (b)slotの縦積みドロップ帯 → そのslotに新frameとして縦積み
//             (c)レイアウト端のドロップ帯 → 新slotとして追加
type DragSrc = { slotId: string; frameId: string; tabId: string };
const dragSrc = ref<DragSrc | null>(null);
const dragOverFrame = ref<string | null>(null);   // 束ね先frame id
const dragOverSlotStack = ref<string | null>(null); // 縦積み先slot id

function onTabDragStart(slotId: string, frameId: string, tabId: string, ev: DragEvent) {
	if (locked.value) { ev.preventDefault(); return; }
	dragSrc.value = { slotId, frameId, tabId };
	if (ev.dataTransfer) { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', tabId); }
}
function onTabDragEnd() { dragSrc.value = null; dragOverFrame.value = null; dragOverSlotStack.value = null; }

// ===== slot自体のドラッグ移動(列/セル/段の並び替え) =====
const slotDragId = ref<string | null>(null);
const slotDragOverId = ref<string | null>(null);
function onSlotDragStart(slotId: string, ev: DragEvent) {
	if (locked.value) { ev.preventDefault(); return; }
	slotDragId.value = slotId;
	if (ev.dataTransfer) { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', slotId); }
}
function onSlotDragOver(slotId: string, ev: DragEvent) {
	if (locked.value || !slotDragId.value || slotDragId.value === slotId) return;
	ev.preventDefault();
	slotDragOverId.value = slotId;
	if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
}
function onSlotDrop(slotId: string, ev: DragEvent) {
	if (locked.value || !slotDragId.value) { onSlotDragEnd(); return; }
	ev.preventDefault();
	const from = slots.value.findIndex(s => s.id === slotDragId.value);
	const to = slots.value.findIndex(s => s.id === slotId);
	if (from >= 0 && to >= 0 && from !== to) {
		const next = [...slots.value];
		const [m] = next.splice(from, 1);
		next.splice(to, 0, m);
		commitSlots(next);
	}
	onSlotDragEnd();
}
function onSlotDragEnd() { slotDragId.value = null; slotDragOverId.value = null; }

// ===== タブ並び替え(同frame内、ドラッグ) =====
// タブのドラッグは既に onTabDragStart(束ね/移動)で使うため、ここでは「同じframe内に
// ドロップされた場合は並び替え」として moveTab 側で吸収せず、専用に処理する。
// 実装方針: タブ上にドロップ → 同frameなら順序入れ替え、別frameなら束ね(既存moveTab)。
const tabDragOverId = ref<string | null>(null);
function onTabDragOverTab(frameTabId: string, ev: DragEvent) {
	if (locked.value || !dragSrc.value) return;
	// 縦積み(slot内に複数frame)のとき、タブのdragoverが親frame/slotに伝播すると
	// 親側のdragoverハンドラ(slot並び替え用)と競合し、下のframeのタブにドロップ
	// できなくなる。ここで preventDefault + stopPropagation して親への伝播を断つ。
	ev.preventDefault();
	ev.stopPropagation();
	tabDragOverId.value = frameTabId;
	if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
}
function onTabDropOnTab(slotId: string, frameId: string, targetTabId: string, ev: DragEvent) {
	ev.preventDefault();
	ev.stopPropagation();
	const src = dragSrc.value;
	tabDragOverId.value = null;
	if (locked.value || !src) { onTabDragEnd(); return; }
	if (src.slotId === slotId && src.frameId === frameId) {
		// 同frame内 → 並び替え
		mapSlots(ss => ss.map(s => s.id !== slotId ? s : { ...s, frames: s.frames.map(f => {
			if (f.id !== frameId) return f;
			const tabs = [...f.tabs];
			const fromIdx = tabs.findIndex(t => t.id === src.tabId);
			const toIdx = tabs.findIndex(t => t.id === targetTabId);
			if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return f;
			const [m] = tabs.splice(fromIdx, 1);
			tabs.splice(toIdx, 0, m);
			return { ...f, tabs };
		}) }));
	} else {
		// 別frame → 束ね(そのframeに移動)
		moveTab(src, { kind: 'frame', slotId, frameId });
	}
	onTabDragEnd();
}

// ===== タブの色 =====
function setTabColor(slotId: string, frameId: string, tabId: string, color: string | null) {
	mapSlots(ss => ss.map(s => s.id !== slotId ? s : { ...s, frames: s.frames.map(f => f.id !== frameId ? f : { ...f, tabs: f.tabs.map(t => t.id !== tabId ? t : { ...t, tabColor: color }) }) }));
}
async function setTabColorCustom(slotId: string, frameId: string, tabId: string) {
	const loc = findFrame(slotId, frameId); if (!loc) return;
	const tab = slots.value[loc.s].frames[loc.f].tabs.find(t => t.id === tabId);
	const { canceled, result } = await os.inputText({ title: 'タブの色 (カラーコード)', placeholder: '#ff6699', default: tab?.tabColor ?? '' });
	if (canceled) return;
	setTabColor(slotId, frameId, tabId, (result && result.trim() !== '') ? result.trim() : null);
}
function tabStyle(tab: DeckTab, active: boolean): Record<string, string> {
	if (!tab.tabColor) return {};
	// タブ部分の色: アクティブ時は背景、非アクティブ時は下線アクセント
	return active
		? { background: tab.tabColor, color: '#fff', borderColor: tab.tabColor }
		: { boxShadow: `inset 0 -3px 0 ${tab.tabColor}` };
}

// タブ管理メニュー(タブが複数ある時、frameごとに出す)
function openTabManageMenu(slot: DeckSlot, frame: DeckFrame, ev: MouseEvent) {
	const anchor = (ev.currentTarget ?? ev.target) as HTMLElement;
	const items: any[] = [{ type: 'label' as const, text: 'タブの管理' }];
	for (const tab of frame.tabs) {
		items.push({
			type: 'parent' as const,
			text: tabTitle(tab),
			icon: tabIcon(tab),
			children: [
				{ text: '名前を変更', icon: 'ti ti-forms', action: () => renameTab(slot.id, frame.id, tab.id) },
				{
					type: 'parent' as const, text: 'タブの色', icon: 'ti ti-palette',
					children: [
						...BORDER_PALETTE.map(c => ({ text: c.name, icon: 'ti ti-circle-filled', action: () => setTabColor(slot.id, frame.id, tab.id, c.value) })),
						{ type: 'divider' as const },
						{ text: 'カスタム…', icon: 'ti ti-pencil', action: () => setTabColorCustom(slot.id, frame.id, tab.id) },
						{ text: '色をクリア', icon: 'ti ti-circle-off', action: () => setTabColor(slot.id, frame.id, tab.id, null) },
					],
				},
				...(frame.tabs.length > 1 ? [{ text: 'このタブを削除', icon: 'ti ti-trash', danger: true, action: () => removeTab(slot.id, frame.id, tab.id) }] : []),
			],
		});
	}
	os.popupMenu(items, anchor);
}

// 移動の実体: src の tab を抜き出し、dest に挿入。空frame/slotは掃除。
function moveTab(src: DragSrc, dest: { kind: 'frame'; slotId: string; frameId: string } | { kind: 'newFrameInSlot'; slotId: string } | { kind: 'newSlot' }) {
	mapSlots(ss => {
		// 1) src tab を取り出す
		let moved: DeckTab | null = null;
		let work = ss.map(s => ({
			...s,
			frames: s.frames.map(f => {
				if (s.id === src.slotId && f.id === src.frameId) {
					const t = f.tabs.find(t => t.id === src.tabId) ?? null;
					if (t) moved = t;
					const tabs = f.tabs.filter(t => t.id !== src.tabId);
					const activeTab = f.activeTab === src.tabId ? tabs[0]?.id : f.activeTab;
					return { ...f, tabs, activeTab };
				}
				return f;
			}),
		}));
		if (!moved) return ss;
		// 2) dest へ挿入
		if (dest.kind === 'frame') {
			work = work.map(s => s.id !== dest.slotId ? s : { ...s, frames: s.frames.map(f => f.id !== dest.frameId ? f : { ...f, tabs: [...f.tabs, moved!], activeTab: moved!.id }) });
		} else if (dest.kind === 'newFrameInSlot') {
			work = work.map(s => s.id !== dest.slotId ? s : { ...s, frames: [...s.frames, newFrameFromTab(moved!)] });
		} else {
			work = [...work, newSlotFromTab(moved!)];
		}
		// 3) 空frame/空slotを掃除
		return work.map(s => ({ ...s, frames: s.frames.filter(f => f.tabs.length > 0) })).filter(s => s.frames.length > 0);
	});
}

function onFrameDrop(slotId: string, frameId: string, ev: DragEvent) {
	ev.preventDefault();
	if (locked.value || !dragSrc.value) { onTabDragEnd(); return; }
	if (!(dragSrc.value.slotId === slotId && dragSrc.value.frameId === frameId)) {
		moveTab(dragSrc.value, { kind: 'frame', slotId, frameId });
	}
	onTabDragEnd();
}
function onSlotStackDrop(slotId: string, ev: DragEvent) {
	ev.preventDefault();
	if (locked.value || !dragSrc.value) { onTabDragEnd(); return; }
	moveTab(dragSrc.value, { kind: 'newFrameInSlot', slotId });
	onTabDragEnd();
}
function onNewSlotDrop(ev: DragEvent) {
	ev.preventDefault();
	if (locked.value || !dragSrc.value) { onTabDragEnd(); return; }
	moveTab(dragSrc.value, { kind: 'newSlot' });
	onTabDragEnd();
}
function onFrameDragOver(frameId: string, ev: DragEvent) { if (!locked.value && dragSrc.value) { ev.stopPropagation(); dragOverFrame.value = frameId; if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'; } }
function onSlotStackDragOver(slotId: string, ev: DragEvent) { if (!locked.value && dragSrc.value) { dragOverSlotStack.value = slotId; if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'; } }

// ===== カラム追加メニュー(末尾に新slot) =====
async function pickListId(anchor: HTMLElement, then: (id: string, name: string) => void) {
	const lists = await misskeyApi('users/lists/list', {});
	if (!Array.isArray(lists) || lists.length === 0) { os.alert({ type: 'info', text: 'リストがありません' }); return; }
	os.popupMenu(lists.map((l: any) => ({ text: l.name, icon: 'ti ti-list', action: () => then(l.id, l.name) })), anchor);
}
async function pickAntennaId(anchor: HTMLElement, then: (id: string, name: string) => void) {
	const antennas = await misskeyApi('antennas/list', {});
	if (!Array.isArray(antennas) || antennas.length === 0) { os.alert({ type: 'info', text: 'アンテナがありません' }); return; }
	os.popupMenu(antennas.map((a: any) => ({ text: a.name, icon: 'ti ti-antenna', action: () => then(a.id, a.name) })), anchor);
}
async function pickChannelId(anchor: HTMLElement, then: (id: string, name: string) => void) {
	const channels = await misskeyApi('channels/followed', { limit: 100 });
	if (!Array.isArray(channels) || channels.length === 0) { os.alert({ type: 'info', text: 'フォロー中のチャンネルがありません' }); return; }
	os.popupMenu(channels.map((c: any) => ({ text: c.name, icon: 'ti ti-device-tv', action: () => then(c.id, c.name) })), anchor);
}

// 種別選択メニューを作る共通関数。onPick(partial) でカラムを確定。
function columnTypeMenu(anchor: HTMLElement, onPick: (partial: Partial<DeckTab> & { type: ColumnType }) => void) {
	return [
		{ text: 'ホーム', icon: 'ti ti-home', action: () => onPick({ type: 'home' }) },
		{ text: 'ローカル', icon: 'ti ti-planet', action: () => onPick({ type: 'local' }) },
		{ text: 'ソーシャル', icon: 'ti ti-universe', action: () => onPick({ type: 'social' }) },
		{ text: 'グローバル', icon: 'ti ti-world', action: () => onPick({ type: 'global' }) },
		{ text: 'トレンド', icon: 'ti ti-chart-line', action: () => onPick({ type: 'trending' }) },
		{ type: 'divider' as const },
		{ text: 'メンション', icon: 'ti ti-at', action: () => onPick({ type: 'mentions' }) },
		{ text: '指名', icon: 'ti ti-mail', action: () => onPick({ type: 'directs' }) },
		{ type: 'divider' as const },
		{ text: 'リスト', icon: 'ti ti-list', action: () => pickListId(anchor, (id, name) => onPick({ type: 'list', sourceId: id, name })) },
		{ text: 'アンテナ', icon: 'ti ti-antenna', action: () => pickAntennaId(anchor, (id, name) => onPick({ type: 'antenna', sourceId: id, name })) },
		{ text: 'チャンネル', icon: 'ti ti-device-tv', action: () => pickChannelId(anchor, (id, name) => onPick({ type: 'channel', sourceId: id, name })) },
		...(externalReady.value ? [
			{ type: 'divider' as const },
			{ text: '外部ホーム', icon: 'ti ti-home-link', action: () => onPick({ type: 'ohtl' as const }) },
			{ text: '外部ローカル', icon: 'ti ti-world-share', action: () => onPick({ type: 'oltl' as const }) },
			{ text: '外部通知', icon: 'ti ti-bell-ringing', action: () => onPick({ type: 'externalNotifications' as const }) },
		] : []),
		{ type: 'divider' as const },
		{ text: '通知', icon: 'ti ti-bell', action: () => onPick({ type: 'notifications' }) },
		{ text: 'ウィジェット', icon: 'ti ti-apps', action: () => onPick({ type: 'widgets' }) },
		{ text: '投稿フォーム', icon: 'ti ti-pencil-plus', action: () => onPick({ type: 'postForm' }) },
	];
}
async function addColumn(ev: MouseEvent) {
	// os.popupMenu はアンカー基準で、横スクロールコンテナ内の右端ボタンだと
	// 位置計算が崩れてメニューが見切れる(1行しか出ない)。標準deckと同じく
	// os.select(中央ダイアログ)で種別を選ばせる。見切れず項目も多くても安全。
	const anchor = (ev.currentTarget ?? ev.target) as HTMLElement;
	const ext = externalReady.value;
	const items = [
		{ value: 'home', label: 'ホーム' },
		{ value: 'local', label: 'ローカル' },
		{ value: 'social', label: 'ソーシャル' },
		{ value: 'global', label: 'グローバル' },
		{ value: 'trending', label: 'トレンド' },
		{ value: 'mentions', label: 'メンション' },
		{ value: 'directs', label: '指名' },
		{ value: 'list', label: 'リスト' },
		{ value: 'antenna', label: 'アンテナ' },
		{ value: 'channel', label: 'チャンネル' },
		...(ext ? [
			{ value: 'ohtl', label: '外部ホーム' },
			{ value: 'oltl', label: '外部ローカル' },
			{ value: 'externalNotifications', label: '外部通知' },
		] : []),
		{ value: 'notifications', label: '通知' },
		{ value: 'widgets', label: 'ウィジェット' },
		{ value: 'postForm', label: '投稿フォーム' },
	];
	const { canceled, result } = await os.select({ title: 'カラムを追加', items });
	if (canceled || result == null) return;
	const type = result as ColumnType;
	// ID選択が要る種別は二段で選ぶ
	if (type === 'list') { pickListId(anchor, (id, name) => addSlotWithTab({ type: 'list', sourceId: id, name })); return; }
	if (type === 'antenna') { pickAntennaId(anchor, (id, name) => addSlotWithTab({ type: 'antenna', sourceId: id, name })); return; }
	if (type === 'channel') { pickChannelId(anchor, (id, name) => addSlotWithTab({ type: 'channel', sourceId: id, name })); return; }
	addSlotWithTab({ type });
}

const BORDER_PALETTE: { name: string; value: string }[] = [
	{ name: 'レッド', value: '#e0566f' }, { name: 'オレンジ', value: '#e08a3c' }, { name: 'イエロー', value: '#d8b13a' },
	{ name: 'グリーン', value: '#4caf7d' }, { name: 'ブルー', value: '#4a9eff' }, { name: 'パープル', value: '#9b6dde' }, { name: 'ピンク', value: '#e06699' },
];
async function setFrameBorderCustom(slotId: string, frameId: string) {
	const loc = findFrame(slotId, frameId); if (!loc) return;
	const cur = slots.value[loc.s].frames[loc.f].borderColor ?? '';
	const { canceled, result } = await os.inputText({ title: '枠色 (カラーコード)', placeholder: '#ff6699', default: cur });
	if (canceled) return;
	setFrameBorderColor(slotId, frameId, (result && result.trim() !== '') ? result.trim() : null);
}

// ===== frame メニュー(箱単位の操作) =====
function openFrameMenu(slot: DeckSlot, frame: DeckFrame, ev: MouseEvent) {
	const anchor = (ev.currentTarget ?? ev.target) as HTMLElement;
	const active = activeTabOf(frame);
	const renoteItem = supportsRenoteToggle(active) ? [
		{ type: 'switch' as const, text: 'リノートを表示', ref: computed({ get: () => active.withRenotes !== false, set: (v: boolean) => {
			mapSlots(ss => ss.map(s => s.id !== slot.id ? s : { ...s, frames: s.frames.map(f => f.id !== frame.id ? f : { ...f, tabs: f.tabs.map(t => t.id !== active.id ? t : { ...t, withRenotes: v }) }) }));
		} }) },
		{ type: 'divider' as const },
	] : [];
	const colorItem = {
		type: 'parent' as const, text: '枠色', icon: 'ti ti-palette',
		children: [
			...BORDER_PALETTE.map(c => ({ text: c.name, icon: 'ti ti-circle-filled', action: () => setFrameBorderColor(slot.id, frame.id, c.value) })),
			{ type: 'divider' as const },
			{ text: 'カスタム…', icon: 'ti ti-pencil', action: () => setFrameBorderCustom(slot.id, frame.id) },
			{ text: '枠色をクリア', icon: 'ti ti-circle-off', action: () => setFrameBorderColor(slot.id, frame.id, null) },
		],
	};
	// 横並びレイアウトで縦積み(この列にframeが2つ以上)のとき、箱の高さを設定できる
	const heightItem = (layout.value === 'row' && slot.frames.length > 1) ? [{
		type: 'parent' as const, text: '高さ', icon: 'ti ti-arrows-vertical',
		children: [
			{ text: '自動(均等)', icon: !frame.height ? 'ti ti-check' : 'ti ti-arrows-vertical', action: () => setFrameHeight(slot.id, frame.id, null) },
			{ text: 'コンパクト (260px)', icon: frame.height === 260 ? 'ti ti-check' : 'ti ti-fold', action: () => setFrameHeight(slot.id, frame.id, 260) },
			{ text: '標準 (360px)', icon: frame.height === 360 ? 'ti ti-check' : 'ti ti-arrows-vertical', action: () => setFrameHeight(slot.id, frame.id, 360) },
			{ text: 'たっぷり (500px)', icon: frame.height === 500 ? 'ti ti-check' : 'ti ti-arrows-maximize', action: () => setFrameHeight(slot.id, frame.id, 500) },
		],
	}] : [];
	os.popupMenu([
		{ type: 'label' as const, text: tabTitle(active) },
		...renoteItem,
		{ text: 'タブ名を変更', icon: 'ti ti-forms', action: () => renameTab(slot.id, frame.id, active.id) },
		{ text: 'このカラムに別カラムをタブ追加', icon: 'ti ti-plus', action: () => os.popupMenu(columnTypeMenu(anchor, p => addTabToFrame(slot.id, frame.id, p)), anchor) },
		...heightItem,
		colorItem,
		{ type: 'divider' as const },
		{ text: 'この箱を削除', icon: 'ti ti-trash', danger: true, action: () => removeFrame(slot.id, frame.id) },
	], anchor);
}
// タブ自体の右クリック/長押し相当(タブ単体メニュー)
function openTabMenu(slot: DeckSlot, frame: DeckFrame, tab: DeckTab, ev: MouseEvent) {
	const anchor = (ev.currentTarget ?? ev.target) as HTMLElement;
	os.popupMenu([
		{ text: 'タブ名を変更', icon: 'ti ti-forms', action: () => renameTab(slot.id, frame.id, tab.id) },
		...(frame.tabs.length > 1 ? [{ text: 'このタブを外す', icon: 'ti ti-trash', danger: true, action: () => removeTab(slot.id, frame.id, tab.id) }] : []),
	], anchor);
}

// ===== slot メニュー(列/セル/段の操作) =====
function openSlotMenu(slot: DeckSlot, ev: MouseEvent) {
	const anchor = (ev.currentTarget ?? ev.target) as HTMLElement;
	const l = layout.value;
	const sizeItems = l === 'row' ? [
		{ text: '幅: 狭い', icon: 'ti ti-arrows-diff', action: () => setSlotWidth(slot.id, 300) },
		{ text: '幅: 標準', icon: 'ti ti-arrows-horizontal', action: () => setSlotWidth(slot.id, 380) },
		{ text: '幅: 広い', icon: 'ti ti-arrows-maximize', action: () => setSlotWidth(slot.id, 460) },
		{ type: 'divider' as const },
	] : l === 'stack' ? [
		{ text: '高さ: コンパクト', icon: 'ti ti-fold', action: () => setSlotHeight(slot.id, 340) },
		{ text: '高さ: 標準', icon: 'ti ti-arrows-vertical', action: () => setSlotHeight(slot.id, 460) },
		{ text: '高さ: たっぷり', icon: 'ti ti-arrows-maximize', action: () => setSlotHeight(slot.id, 640) },
		{ type: 'divider' as const },
	] : [];
	const span = currentFullSpan(slot);
	const fullItem = (l === 'grid2' || l === 'grid3') ? [{
		type: 'parent' as const, text: '全幅で表示',
		icon: span === 'col' ? 'ti ti-arrows-horizontal' : span === 'row' ? 'ti ti-arrows-vertical' : 'ti ti-square',
		children: [
			{ text: 'なし', icon: span === 'none' ? 'ti ti-check' : 'ti ti-square', action: () => setSlotFullSpan(slot.id, 'none') },
			{ text: '横ぶち抜き', icon: span === 'col' ? 'ti ti-check' : 'ti ti-arrows-horizontal', action: () => setSlotFullSpan(slot.id, 'col') },
			{ text: '縦ぶち抜き', icon: span === 'row' ? 'ti ti-check' : 'ti ti-arrows-vertical', action: () => setSlotFullSpan(slot.id, 'row') },
		],
	}] : [];
	const backLabel = l === 'stack' ? '上へ移動' : (l === 'row' ? '左へ移動' : '前へ移動');
	const fwdLabel = l === 'stack' ? '下へ移動' : (l === 'row' ? '右へ移動' : '後ろへ移動');
	os.popupMenu([
		...sizeItems,
		...fullItem,
		{ text: 'この列に縦積みで追加', icon: 'ti ti-rows', action: () => os.popupMenu(columnTypeMenu(anchor, p => addFrameToSlot(slot.id, p)), anchor) },
		{ type: 'divider' as const },
		{ text: backLabel, icon: l === 'stack' ? 'ti ti-arrow-up' : 'ti ti-arrow-left', action: () => moveSlot(slot.id, -1) },
		{ text: fwdLabel, icon: l === 'stack' ? 'ti ti-arrow-down' : 'ti ti-arrow-right', action: () => moveSlot(slot.id, 1) },
		{ type: 'divider' as const },
		{ text: 'この列を削除', icon: 'ti ti-trash', danger: true, action: () => removeSlot(slot.id) },
	], anchor);
}

// ===== プロファイル =====
function switchProfile(id: string) { prefer.commit('simpleUi.deckActiveProfileV2', id); }
function defaultSlots(): DeckSlot[] {
	return [
		newSlotFromTab(newTab({ type: 'local' })),
		newSlotFromTab(newTab({ type: 'home' })),
		newSlotFromTab(newTab({ type: 'notifications' })),
	];
}
async function createProfile() {
	const { canceled, result } = await os.inputText({ title: 'プロファイル名', placeholder: '例: 趣味アカ用' });
	if (canceled || !result) return;
	const id = genId('prof');
	commitProfiles([...profiles.value, { id, name: result, layout: 'row', slots: defaultSlots() }]);
	prefer.commit('simpleUi.deckActiveProfileV2', id);
}
async function duplicateProfile() {
	const src = activeProfile.value;
	const id = genId('prof');
	const clonedSlots: DeckSlot[] = src.slots.map(s => ({ ...s, id: genId('slot'), frames: s.frames.map(f => ({ ...f, id: genId('frame'), tabs: f.tabs.map(t => ({ ...t, id: genId('tab') })) })) }));
	commitProfiles([...profiles.value, { id, name: `${src.name} のコピー`, layout: src.layout, slots: clonedSlots }]);
	prefer.commit('simpleUi.deckActiveProfileV2', id);
}
async function renameProfile() {
	const { canceled, result } = await os.inputText({ title: 'プロファイル名を変更', default: activeProfile.value.name });
	if (canceled || !result) return;
	commitActiveProfile(p => ({ ...p, name: result }));
}
async function resetProfile() {
	const { canceled } = await os.confirm({ type: 'warning', text: `プロファイル「${activeProfile.value.name}」のレイアウトを初期状態(ローカル・ホーム・通知)に戻しますか?` });
	if (canceled) return;
	commitActiveProfile(p => ({ ...p, layout: 'row', slots: defaultSlots() }));
}
async function deleteProfile() {
	if (profiles.value.length <= 1) { os.alert({ type: 'warning', text: '最後のプロファイルは削除できません' }); return; }
	const { canceled } = await os.confirm({ type: 'warning', text: `プロファイル「${activeProfile.value.name}」を削除しますか?` });
	if (canceled) return;
	const remaining = profiles.value.filter(p => p.id !== activeProfileId.value);
	commitProfiles(remaining);
	prefer.commit('simpleUi.deckActiveProfileV2', remaining[0].id);
}
function openProfileMenu(ev: MouseEvent) {
	const anchor = (ev.currentTarget ?? ev.target) as HTMLElement;
	os.popupMenu([
		{ type: 'label' as const, text: 'プロファイル切替' },
		...profiles.value.map(p => ({ text: p.name, icon: p.id === activeProfileId.value ? 'ti ti-check' : 'ti ti-layout-board', action: () => switchProfile(p.id) })),
		{ type: 'divider' as const },
		{ text: '新規プロファイル', icon: 'ti ti-plus', action: () => createProfile() },
		{ text: '複製', icon: 'ti ti-copy', action: () => duplicateProfile() },
		{ text: '名前を変更', icon: 'ti ti-pencil', action: () => renameProfile() },
		{ type: 'divider' as const },
		{ text: 'レイアウトをリセット', icon: 'ti ti-refresh-dot', action: () => resetProfile() },
		{ text: '削除', icon: 'ti ti-trash', danger: true, action: () => deleteProfile() },
	], anchor);
}

// チャンク3: template / チャンク4: style + 検証
</script>

<style lang="scss" module>
.deckWrap { display: flex; height: 100%; }
/* ツールバー位置: 上(デフォルト)/下/右。レイアウト方向で配置を変える */
.deckWrapTop { flex-direction: column; }
.deckWrapBottom { flex-direction: column-reverse; }
.deckWrapRight { flex-direction: row-reverse; }
/* 右配置時はツールバーを縦長の細い帯にする */
.deckWrapRight .toolbarBar { flex-direction: column; width: auto; height: 100%; padding: 6px 6px 6px 0; align-items: stretch; }
.deckWrapRight .toolbarInner { flex-direction: column; align-items: stretch; }
.deckWrapRight .layoutPill { flex-direction: column; }
.deckWrapRight .toolbarSpacer { flex: 1; }
/* 右配置時: 各ボタンをアイコンサイズの正方形に揃える(横長ピルが縦に並ぶ不格好を解消) */
.deckWrapRight .profileBtn { justify-content: center; width: 30px; height: 30px; padding: 0; gap: 0; align-self: center; }
.deckWrapRight .iconBtn,
.deckWrapRight .toolbarToggle { align-self: center; }
.deckWrapRight .layoutPill { align-self: center; }
.deckWrapBottom .toolbarBar { padding: 0 14px 8px; }

/* 折り畳みツールバー */
.toolbarBar { flex-shrink: 0; display: flex; align-items: center; gap: 8px; padding: 5px 12px 0; }
.toolbarToggle {
	flex-shrink: 0; width: 30px; height: 26px; border: 1px solid var(--MI_THEME-divider); border-radius: 999px;
	background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); cursor: pointer; transition: background .15s, color .15s;
	&:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--MI_THEME-panel)); }
}
.toolbarToggleOn { background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); border-color: transparent; }
.toolbarInner { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.layoutPill { display: flex; gap: 2px; padding: 3px; border-radius: 999px; background: color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent); }
.layoutBtn { width: 32px; height: 24px; border: none; border-radius: 999px; background: none; color: var(--MI_THEME-fg); opacity: .55; cursor: pointer; transition: background .15s, opacity .15s; &:hover { opacity: .85; } }
.layoutBtnOn { background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); opacity: 1; &:hover { opacity: 1; } }
.profileBtn { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--MI_THEME-divider); border-radius: 999px; background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); font-weight: 700; font-size: .82em; cursor: pointer; transition: background .15s; &:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 8%, var(--MI_THEME-panel)); } }
.profileName { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profileChevron { font-size: .85em; opacity: .6; }
.toolbarSpacer { flex: 1; }
.iconBtn { flex-shrink: 0; width: 30px; height: 26px; border: 1px solid var(--MI_THEME-divider); border-radius: 999px; background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); cursor: pointer; transition: background .15s, color .15s; &:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--MI_THEME-panel)); } }
.iconBtnOn { background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); border-color: transparent; }
.clock { flex-shrink: 0; align-self: center; font-variant-numeric: tabular-nums; font-weight: 700; font-size: .95em; color: var(--MI_THEME-accent); padding: 0 8px; letter-spacing: .02em; }

.deck { flex: 1; min-height: 0; padding: 14px; box-sizing: border-box; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent) transparent; }

/* レイアウト */
.layoutRow { display: flex; align-items: stretch; gap: 14px; overflow-x: auto; overflow-y: hidden; }
.layoutRow .slot { flex-shrink: 0; min-width: 280px; }
.layoutGrid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: calc(50% - 7px); grid-auto-flow: row dense; gap: 14px; overflow-y: auto; overflow-x: hidden; }
.layoutGrid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: calc(50% - 7px); grid-auto-flow: row dense; gap: 14px; overflow-y: auto; overflow-x: hidden; }
.slotGrid { min-height: 0; }
.slotFull { grid-column: 1 / -1; }
.slotFullV { grid-row: span 2; }
.layoutStack { display: flex; flex-direction: column; gap: 14px; overflow-y: auto; overflow-x: hidden; }
.layoutStack .slot { width: 100%; flex-shrink: 0; }

/* slot = レイアウトの1マス。中に frames を縦積み */
.slot { position: relative; display: flex; flex-direction: column; min-height: 0; }
.slotStack { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; }
/* 列設定FAB(右上に小さく) */
/* slotハンドル(タブバー左端。ドラッグで列移動 / クリックで列設定) */
.slotHandle {
	flex-shrink: 0; align-self: center; width: 24px; height: 28px; border: none; border-radius: 8px;
	background: transparent; color: var(--MI_THEME-fg); opacity: .4; cursor: grab; transition: opacity .15s, background .15s;
	&:hover { opacity: .9; background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent); }
	&:active { cursor: grabbing; }
}
/* slotドラッグ中の視覚 */
.slotDragging { opacity: .4; }
.slotDragOver { box-shadow: 0 0 0 2px var(--MI_THEME-accent); }

/* frame = 箱。tabsが複数ならタブ表示 */
.frameRoot {
	flex: 1; min-height: 0; display: flex; flex-direction: column;
	background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 14px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, .06); overflow: hidden; transition: box-shadow .15s;
}
.frameColored { border-width: 2px; border-color: var(--deckColBorder, var(--MI_THEME-divider)); }
.frameDragOver { box-shadow: 0 0 0 2px var(--MI_THEME-accent); }

/* タブバー(ブラウザ風) */
.tabBar {
	flex-shrink: 0; display: flex; align-items: stretch; gap: 4px; padding: 6px 8px 0 8px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 8%, var(--MI_THEME-panel));
	border-bottom: 1px solid var(--deckColBorder, var(--MI_THEME-divider));
}
.tabs { display: flex; align-items: stretch; gap: 4px; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.tab {
	display: flex; align-items: center; gap: 6px; max-width: 180px; padding: 7px 12px; border: none; cursor: pointer;
	background: transparent; color: var(--MI_THEME-fg); opacity: .6; font-size: .82em; font-weight: 700;
	border-radius: 10px 10px 0 0; border: 1px solid transparent; border-bottom: none; transition: background .12s, opacity .12s;
	&:hover { opacity: .85; background: color-mix(in srgb, var(--MI_THEME-accent) 10%, transparent); }
}
.tabActive {
	opacity: 1; background: var(--MI_THEME-panel);
	border-color: var(--deckColBorder, var(--MI_THEME-divider));
	box-shadow: 0 -2px 6px rgba(0, 0, 0, .04);
}
.tabDragOver { box-shadow: inset 2px 0 0 var(--MI_THEME-accent); }
.tabIcon { flex-shrink: 0; color: var(--MI_THEME-accent); font-size: 1.05em; }
.tabIconActiveColored { color: #fff !important; }
.tabLabel { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.frameHeadBtn, .frameMenuBtn, .frameTabsBtn {
	flex-shrink: 0; align-self: center; width: 28px; height: 28px; border-radius: 999px; color: var(--MI_THEME-fg); opacity: .7;
	&:hover { opacity: 1; background: color-mix(in srgb, var(--MI_THEME-accent) 14%, transparent); }
}

/* frame本体 */
.frameBody { flex: 1; min-height: 0; position: relative; }
.tabPane { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent) transparent; }
.tabPane :global(._deckColError) { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 16px; color: var(--MI_THEME-fg); opacity: .6; font-size: .9em; text-align: center; }
.tabPane :global(._deckColError i) { font-size: 1.8em; }

/* 縦積みドロップ帯(ドラッグ中のみ表示) */
.stackDrop {
	flex-shrink: 0; height: 44px; display: flex; align-items: center; justify-content: center;
	border: 2px dashed color-mix(in srgb, var(--MI_THEME-accent) 35%, transparent); border-radius: 12px;
	color: var(--MI_THEME-accent); font-size: .8em; font-weight: 700; opacity: .7; transition: background .12s, opacity .12s;
}
.stackDropOver { background: color-mix(in srgb, var(--MI_THEME-accent) 14%, transparent); opacity: 1; }
.newSlotDrop {
	flex-shrink: 0; width: 120px; display: flex; align-items: center; justify-content: center; align-self: stretch;
	border: 2px dashed color-mix(in srgb, var(--MI_THEME-accent) 35%, transparent); border-radius: 14px;
	color: var(--MI_THEME-accent); font-size: .8em; font-weight: 700;
}

/* 追加ボタン */
.addColumn {
	display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
	border: 2px dashed color-mix(in srgb, var(--MI_THEME-accent) 40%, transparent); border-radius: 14px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 4%, transparent); color: var(--MI_THEME-accent); font-weight: 700; cursor: pointer;
	transition: background .15s, border-color .15s;
	i { font-size: 1.6em; }
	&:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 10%, transparent); border-color: color-mix(in srgb, var(--MI_THEME-accent) 70%, transparent); }
}
.layoutRow .addColumn { width: 180px; flex-shrink: 0; }
.addColumnGrid { min-height: 120px; }
.addColumnStack { width: 100%; height: 96px; flex-direction: row; }
</style>
