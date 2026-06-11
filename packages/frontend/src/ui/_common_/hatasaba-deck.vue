<!--
	SPDX-FileCopyrightText: Tolehata and hatasaba-project
	SPDX-License-Identifier: AGPL-3.0-only
-->

<!--
	旗鯖fork: HatasabaUI デッキモード。
	レイアウトシート: row(横並び) / grid2(田の字) / grid3(3列) / stack(縦一列)
	プロファイル(simpleUi.deckProfiles): 構成を複数保存して切替。旧 deckColumns/deckLayout から自動マイグレーション。
	カラム種別: home/local/social/global/ohtl/oltl/list/antenna/channel/mentions/directs/notifications/externalNotifications/widgets
	  - mentions=メンション, directs=指名(あなた宛のダイレクト投稿TL), channel=チャンネル(フォロー中から選択)
	機能: カラム別リノートON/OFF, ドラッグ並び替え, ロック(追加/削除/移動を抑止), 全カラム一括更新
	上部ツールバーは折り畳み式。

	【重要】ビルドプラグイン(unwind-css-module-class-name)はCSS Modulesクラスを静的解決するため
	$style[変数] の動的アクセスは解決されない。レイアウトクラスは v-if/v-else-if で分岐し静的参照すること。
-->

<template>
<div :class="$style.deckWrap">
	<div :class="$style.toolbarBar">
		<button :class="[$style.toolbarToggle, { [$style.toolbarToggleOn]: toolbarOpen }]" v-tooltip="toolbarOpen ? 'ツールバーを隠す' : 'ツールバーを表示'" @click="toolbarOpen = !toolbarOpen">
			<i :class="toolbarOpen ? 'ti ti-chevron-up' : 'ti ti-adjustments-horizontal'"></i>
		</button>
		<div v-if="toolbarOpen" :class="$style.toolbarInner">
			<div :class="$style.layoutPill">
				<button v-for="l in LAYOUTS" :key="l.id" :class="[$style.layoutBtn, { [$style.layoutBtnOn]: layout === l.id }]" v-tooltip="l.label" @click="setLayout(l.id)"><i :class="l.icon"></i></button>
			</div>
			<button :class="$style.profileBtn" @click="openProfileMenu($event)">
				<i class="ti ti-layout-board"></i><span :class="$style.profileName">{{ activeProfileName }}</span><i class="ti ti-chevron-down" :class="$style.profileChevron"></i>
			</button>
			<div :class="$style.toolbarSpacer"></div>
			<button :class="$style.iconBtn" v-tooltip="'すべてのカラムを更新'" @click="reloadAll"><i class="ti ti-refresh"></i></button>
			<button :class="[$style.iconBtn, { [$style.iconBtnOn]: locked }]" v-tooltip="locked ? 'ロック中(タップで解除)' : 'カラム編集をロック'" @click="toggleLock"><i :class="locked ? 'ti ti-lock' : 'ti ti-lock-open'"></i></button>
		</div>
	</div>

	<div v-if="layout === 'row'" :class="[$style.deck, $style.layoutRow]">
		<template v-for="(col, i) in columns" :key="col.id">
			<div :class="[$style.column, { [$style.columnDragging]: dragIndex === i, [$style.columnDragOver]: dragOverIndex === i, [$style.columnColored]: !!col.borderColor }]" :style="colStyle(col)" :draggable="!locked" @dragstart="onDragStart(i, $event)" @dragover.prevent="onDragOver(i, $event)" @drop="onDrop(i, $event)" @dragend="onDragEnd">
				<header :class="$style.colHeader" v-tooltip="locked ? 'クリックで最上部へ' : 'クリックで最上部へ / ドラッグで並び替え'" @click="scrollColTop($event)">
					<i :class="[iconOf(col), $style.colIcon]"></i><span :class="$style.colTitle">{{ titleOf(col) }}</span>
					<button v-if="col.type === 'externalNotifications'" class="_button" :class="$style.colHeadBtn" v-tooltip="'既読にする'" @click.stop="markExtRead(col.id)"><i class="ti ti-check"></i></button>
					<button class="_button" :class="$style.colMenuBtn" @click.stop="openColumnMenu(i, $event)"><i class="ti ti-dots"></i></button>
				</header>
				<div :class="$style.colBody"><component :is="resolveColumn(col)" v-bind="columnProps(col)" :ref="el => setColRef(col.id, el)" :key="col.id"/></div>
			</div>
		</template>
		<button v-if="!locked" :class="$style.addColumn" @click="addColumn($event)"><i class="ti ti-plus"></i><span>カラムを追加</span></button>
	</div>

	<div v-else-if="layout === 'grid2'" :class="[$style.deck, $style.layoutGrid2]">
		<template v-for="(col, i) in columns" :key="col.id">
			<div :class="[$style.column, { [$style.columnDragging]: dragIndex === i, [$style.columnDragOver]: dragOverIndex === i, [$style.columnColored]: !!col.borderColor, [$style.columnFull]: col.fullWidth, [$style.columnFullV]: col.fullHeight }]" :style="colStyle(col)" :draggable="!locked" @dragstart="onDragStart(i, $event)" @dragover.prevent="onDragOver(i, $event)" @drop="onDrop(i, $event)" @dragend="onDragEnd">
				<header :class="$style.colHeader" v-tooltip="locked ? 'クリックで最上部へ' : 'クリックで最上部へ / ドラッグで並び替え'" @click="scrollColTop($event)">
					<i :class="[iconOf(col), $style.colIcon]"></i><span :class="$style.colTitle">{{ titleOf(col) }}</span>
					<button v-if="col.type === 'externalNotifications'" class="_button" :class="$style.colHeadBtn" v-tooltip="'既読にする'" @click.stop="markExtRead(col.id)"><i class="ti ti-check"></i></button>
					<button class="_button" :class="$style.colMenuBtn" @click.stop="openColumnMenu(i, $event)"><i class="ti ti-dots"></i></button>
				</header>
				<div :class="$style.colBody"><component :is="resolveColumn(col)" v-bind="columnProps(col)" :ref="el => setColRef(col.id, el)" :key="col.id"/></div>
			</div>
		</template>
		<button v-if="!locked" :class="[$style.addColumn, $style.addColumnGrid]" @click="addColumn($event)"><i class="ti ti-plus"></i><span>カラムを追加</span></button>
	</div>

	<div v-else-if="layout === 'grid3'" :class="[$style.deck, $style.layoutGrid3]">
		<template v-for="(col, i) in columns" :key="col.id">
			<div :class="[$style.column, { [$style.columnDragging]: dragIndex === i, [$style.columnDragOver]: dragOverIndex === i, [$style.columnColored]: !!col.borderColor, [$style.columnFull]: col.fullWidth, [$style.columnFullV]: col.fullHeight }]" :style="colStyle(col)" :draggable="!locked" @dragstart="onDragStart(i, $event)" @dragover.prevent="onDragOver(i, $event)" @drop="onDrop(i, $event)" @dragend="onDragEnd">
				<header :class="$style.colHeader" v-tooltip="locked ? 'クリックで最上部へ' : 'クリックで最上部へ / ドラッグで並び替え'" @click="scrollColTop($event)">
					<i :class="[iconOf(col), $style.colIcon]"></i><span :class="$style.colTitle">{{ titleOf(col) }}</span>
					<button v-if="col.type === 'externalNotifications'" class="_button" :class="$style.colHeadBtn" v-tooltip="'既読にする'" @click.stop="markExtRead(col.id)"><i class="ti ti-check"></i></button>
					<button class="_button" :class="$style.colMenuBtn" @click.stop="openColumnMenu(i, $event)"><i class="ti ti-dots"></i></button>
				</header>
				<div :class="$style.colBody"><component :is="resolveColumn(col)" v-bind="columnProps(col)" :ref="el => setColRef(col.id, el)" :key="col.id"/></div>
			</div>
		</template>
		<button v-if="!locked" :class="[$style.addColumn, $style.addColumnGrid]" @click="addColumn($event)"><i class="ti ti-plus"></i><span>カラムを追加</span></button>
	</div>

	<div v-else :class="[$style.deck, $style.layoutStack]">
		<template v-for="(col, i) in columns" :key="col.id">
			<div :class="[$style.column, { [$style.columnDragging]: dragIndex === i, [$style.columnDragOver]: dragOverIndex === i, [$style.columnColored]: !!col.borderColor }]" :style="colStyle(col)" :draggable="!locked" @dragstart="onDragStart(i, $event)" @dragover.prevent="onDragOver(i, $event)" @drop="onDrop(i, $event)" @dragend="onDragEnd">
				<header :class="$style.colHeader" v-tooltip="locked ? 'クリックで最上部へ' : 'クリックで最上部へ / ドラッグで並び替え'" @click="scrollColTop($event)">
					<i :class="[iconOf(col), $style.colIcon]"></i><span :class="$style.colTitle">{{ titleOf(col) }}</span>
					<button v-if="col.type === 'externalNotifications'" class="_button" :class="$style.colHeadBtn" v-tooltip="'既読にする'" @click.stop="markExtRead(col.id)"><i class="ti ti-check"></i></button>
					<button class="_button" :class="$style.colMenuBtn" @click.stop="openColumnMenu(i, $event)"><i class="ti ti-dots"></i></button>
				</header>
				<div :class="$style.colBody"><component :is="resolveColumn(col)" v-bind="columnProps(col)" :ref="el => setColRef(col.id, el)" :key="col.id"/></div>
			</div>
		</template>
		<button v-if="!locked" :class="[$style.addColumn, $style.addColumnStack]" @click="addColumn($event)"><i class="ti ti-plus"></i><span>カラムを追加</span></button>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, defineAsyncComponent, type Component } from 'vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { prefer } from '@/preferences.js';
import { globalEvents } from '@/events.js';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import MkExternalTimeline from '@/components/MkExternalTimeline.vue';
import MkStreamingNotificationsTimeline from '@/components/MkStreamingNotificationsTimeline.vue';
import MkTrendingTimeline from '@/components/MkTrendingTimeline.vue';

const XWidgets = defineAsyncComponent(() => import('./widgets.vue'));
const WidgetExternalNotifications = defineAsyncComponent(() => import('@/widgets/WidgetExternalNotifications.vue'));

type DeckLayout = 'row' | 'grid2' | 'grid3' | 'stack';
type ColumnType = 'home' | 'local' | 'social' | 'global' | 'trending' | 'ohtl' | 'oltl' | 'list' | 'antenna' | 'channel' | 'mentions' | 'directs' | 'notifications' | 'externalNotifications' | 'widgets';
type DeckColumn = { id: string; type: ColumnType; width: number; height?: number; name?: string; sourceId?: string; withRenotes?: boolean; borderColor?: string | null; fullWidth?: boolean; fullHeight?: boolean; };
type DeckProfile = { id: string; name: string; layout: DeckLayout; columns: DeckColumn[]; };

const LAYOUTS: { id: DeckLayout; icon: string; label: string }[] = [
	{ id: 'row', icon: 'ti ti-layout-columns', label: '横並び (従来デッキ風)' },
	{ id: 'grid2', icon: 'ti ti-layout-grid', label: '田の字 (2列グリッド)' },
	{ id: 'grid3', icon: 'ti ti-layout-board-split', label: '3列グリッド' },
	{ id: 'stack', icon: 'ti ti-layout-list', label: '縦一列' },
];

const toolbarOpen = ref(false);

const locked = computed<boolean>(() => prefer.r['simpleUi.deckLocked'].value as boolean);
function toggleLock() { prefer.commit('simpleUi.deckLocked', !locked.value); }

// 旗鯖fork: 旧 deckColumns/deckLayout からの一回限りのマイグレーション。
// 【重要】これは onMounted でのみ呼ぶ副作用関数。computed 内では絶対に commit しないこと。
// 以前は profiles computed の中で commit していたため、デッキ↔通常UIの切り替えで
// コンポーネントが再マウントされるたびに「プロファイルが空に見える一瞬」で旧キーの
// 初期値(3カラム)に上書きされ、編集内容がリセットされるバグがあった。
function migrateProfilesIfNeeded() {
	const existing = prefer.r['simpleUi.deckProfiles'].value as DeckProfile[];
	if (existing != null && existing.length > 0) return; // 既にあるなら絶対に触らない
	const migrated: DeckProfile = {
		id: 'default', name: 'デフォルト',
		layout: (prefer.r['simpleUi.deckLayout'].value as DeckLayout) ?? 'row',
		columns: (prefer.r['simpleUi.deckColumns'].value as DeckColumn[]) ?? [],
	};
	prefer.commit('simpleUi.deckProfiles', [migrated]);
	prefer.commit('simpleUi.deckActiveProfile', 'default');
}

onMounted(() => { migrateProfilesIfNeeded(); });

// 副作用なし: 読むだけ。空ならフォールバックの一時プロファイルを返す(commitはしない)。
const FALLBACK_PROFILE: DeckProfile = { id: 'default', name: 'デフォルト', layout: 'row', columns: [] };
const profiles = computed<DeckProfile[]>(() => {
	const p = prefer.r['simpleUi.deckProfiles'].value as DeckProfile[];
	return (p != null && p.length > 0) ? p : [FALLBACK_PROFILE];
});
const activeProfileId = computed<string>(() => {
	const id = prefer.r['simpleUi.deckActiveProfile'].value as string;
	const list = profiles.value;
	if (id && list.some(p => p.id === id)) return id;
	return list[0]?.id ?? 'default';
});
const activeProfile = computed<DeckProfile>(() => {
	const list = profiles.value;
	return list.find(p => p.id === activeProfileId.value) ?? list[0];
});
const activeProfileName = computed<string>(() => activeProfile.value?.name ?? 'デフォルト');
const columns = computed<DeckColumn[]>(() => activeProfile.value?.columns ?? []);
const layout = computed<DeckLayout>(() => activeProfile.value?.layout ?? 'row');

const externalHost = computed(() => prefer.s['external.host']);
const externalToken = computed(() => prefer.s['external.token']);
const externalReady = computed(() => externalHost.value != null && externalHost.value !== '' && externalToken.value != null);

function commitActiveProfile(mutator: (p: DeckProfile) => DeckProfile) {
	const list = profiles.value.map(p => p.id === activeProfileId.value ? mutator({ ...p }) : p);
	prefer.commit('simpleUi.deckProfiles', list);
}
function commitColumns(next: DeckColumn[]) { commitActiveProfile(p => ({ ...p, columns: next })); }
function setLayout(l: DeckLayout) { commitActiveProfile(p => ({ ...p, layout: l })); }

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
};
function titleOf(col: DeckColumn): string {
	if ((col.type === 'list' || col.type === 'antenna' || col.type === 'channel') && col.name) return col.name;
	return COLUMN_META[col.type]?.title ?? col.type;
}
function iconOf(col: DeckColumn): string { return COLUMN_META[col.type]?.icon ?? 'ti ti-square'; }

const NOTE_SRC: Partial<Record<ColumnType, string>> = {
	home: 'home', local: 'local', social: 'social', global: 'global', mentions: 'mentions', directs: 'directs',
};

function resolveColumn(col: DeckColumn): Component {
	if (col.type in NOTE_SRC) return MkStreamingNotesTimeline;
	if (col.type === 'list' && col.sourceId) return MkStreamingNotesTimeline;
	if (col.type === 'antenna' && col.sourceId) return MkStreamingNotesTimeline;
	if (col.type === 'channel' && col.sourceId) return MkStreamingNotesTimeline;
	if ((col.type === 'ohtl' || col.type === 'oltl') && externalReady.value) return MkExternalTimeline;
	if (col.type === 'externalNotifications' && externalReady.value) return WidgetExternalNotifications;
	if (col.type === 'trending') return MkTrendingTimeline;
	if (col.type === 'notifications') return MkStreamingNotificationsTimeline;
	if (col.type === 'widgets') return XWidgets;
	return ColumnError;
}
function columnProps(col: DeckColumn): Record<string, unknown> {
	const wr = col.withRenotes !== false;
	if (col.type in NOTE_SRC) return { src: NOTE_SRC[col.type], withRenotes: wr };
	if (col.type === 'list' && col.sourceId) return { src: 'list', list: col.sourceId, withRenotes: wr };
	if (col.type === 'antenna' && col.sourceId) return { src: 'antenna', antenna: col.sourceId, withRenotes: wr };
	if (col.type === 'channel' && col.sourceId) return { src: 'channel', channel: col.sourceId, withRenotes: wr };
	if ((col.type === 'ohtl' || col.type === 'oltl') && externalReady.value) return { src: col.type, host: externalHost.value, token: externalToken.value, sound: false, simpleUi: true };
	if (col.type === 'externalNotifications' && externalReady.value) return { widget: { id: `deck-extnotif-${col.id}`, name: 'externalNotifications', data: {} }, showHeader: false };
	if (col.type === 'trending') return {};
	if (col.type === 'notifications') return {};
	if (col.type === 'widgets') return {};
	return { message: (col.type === 'ohtl' || col.type === 'oltl' || col.type === 'externalNotifications') ? '外部アカウントが未連携です' : 'このカラムを表示できません' };
}

const ColumnError = defineAsyncComponent(() => Promise.resolve({
	props: { message: { type: String, default: '' } },
	template: '<div class="_deckColError"><i class="ti ti-alert-circle"></i><div>{{ message }}</div></div>',
}));

const colRefs = new Map<string, any>();
function setColRef(id: string, el: any) { if (el) colRefs.set(id, el); else colRefs.delete(id); }

function reloadAll() {
	globalEvents.emit('reloadTimeline');
	globalEvents.emit('reloadNotification');
	for (const col of columns.value) {
		if (col.type === 'externalNotifications') colRefs.get(col.id)?.fetchNotifications?.();
		if (col.type === 'ohtl' || col.type === 'oltl') colRefs.get(col.id)?.reload?.();
	}
}
function markExtRead(id: string) { colRefs.get(id)?.markAllAsRead?.(); }

const RENOTE_TOGGLE_TYPES: ColumnType[] = ['home', 'local', 'social', 'global', 'list', 'antenna', 'channel'];
function supportsRenoteToggle(col: DeckColumn): boolean { return RENOTE_TOGGLE_TYPES.includes(col.type); }

function colStyle(col: DeckColumn): Record<string, string> {
	const st: Record<string, string> = {};
	if (layout.value === 'row') st.width = `${col.width}px`;
	else if (layout.value === 'stack') st.height = `${col.height ?? 460}px`;
	// 枠色(任意): 指定時はカラムの枠とヘッダ下線にアクセントとして反映
	if (col.borderColor) {
		st.borderColor = col.borderColor;
		st['--deckColBorder'] = col.borderColor;
	}
	return st;
}

function scrollColTop(ev: MouseEvent) {
	const header = ev.currentTarget as HTMLElement;
	(header.nextElementSibling as HTMLElement | null)?.scrollTo({ top: 0, behavior: 'smooth' });
}
function genId(): string { return `col-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`; }
function pushColumn(partial: Partial<DeckColumn> & { type: ColumnType }) {
	commitColumns([...columns.value, { id: genId(), width: 380, height: 460, withRenotes: true, ...partial }]);
}
function setWidth(index: number, width: number) { commitColumns(columns.value.map((c, i) => i === index ? { ...c, width } : c)); }
function setHeight(index: number, height: number) { commitColumns(columns.value.map((c, i) => i === index ? { ...c, height } : c)); }
function setRenotes(index: number, withRenotes: boolean) { commitColumns(columns.value.map((c, i) => i === index ? { ...c, withRenotes } : c)); }
function setBorderColor(index: number, color: string | null) { commitColumns(columns.value.map((c, i) => i === index ? { ...c, borderColor: color } : c)); }
// 全幅表示は「なし / 横ぶち抜き / 縦ぶち抜き」の排他選択。
// fullWidth(横) と fullHeight(縦) を相互排他で更新する(両方ONにはならない)。
function setFullSpan(index: number, span: 'none' | 'col' | 'row') {
	commitColumns(columns.value.map((c, i) => i === index ? {
		...c,
		fullWidth: span === 'col',
		fullHeight: span === 'row',
	} : c));
}
function currentFullSpan(col: DeckColumn): 'none' | 'col' | 'row' {
	if (col.fullWidth) return 'col';
	if (col.fullHeight) return 'row';
	return 'none';
}
async function setBorderColorCustom(index: number) {
	const cur = columns.value[index].borderColor ?? '';
	const { canceled, result } = await os.inputText({ title: '枠色 (カラーコード)', placeholder: '#ff6699', default: cur });
	if (canceled) return;
	setBorderColor(index, result && result.trim() !== '' ? result.trim() : null);
}
const BORDER_PALETTE: { name: string; value: string }[] = [
	{ name: 'レッド', value: '#e0566f' },
	{ name: 'オレンジ', value: '#e08a3c' },
	{ name: 'イエロー', value: '#d8b13a' },
	{ name: 'グリーン', value: '#4caf7d' },
	{ name: 'ブルー', value: '#4a9eff' },
	{ name: 'パープル', value: '#9b6dde' },
	{ name: 'ピンク', value: '#e06699' },
];
function moveColumn(index: number, step: number) {
	const to = index + step;
	if (to < 0 || to >= columns.value.length) return;
	const next = [...columns.value];
	const [c] = next.splice(index, 1);
	next.splice(to, 0, c);
	commitColumns(next);
}
function removeColumn(index: number) { commitColumns(columns.value.filter((_, i) => i !== index)); }

const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);
function onDragStart(index: number, ev: DragEvent) {
	if (locked.value) { ev.preventDefault(); return; }
	dragIndex.value = index;
	if (ev.dataTransfer) { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(index)); }
}
function onDragOver(index: number, ev: DragEvent) {
	if (locked.value || dragIndex.value === null) return;
	dragOverIndex.value = index;
	if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
}
function onDrop(index: number, ev: DragEvent) {
	ev.preventDefault();
	if (locked.value) { onDragEnd(); return; }
	const from = dragIndex.value;
	if (from === null || from === index) { onDragEnd(); return; }
	const next = [...columns.value];
	const [moved] = next.splice(from, 1);
	next.splice(index, 0, moved);
	commitColumns(next);
	onDragEnd();
}
function onDragEnd() { dragIndex.value = null; dragOverIndex.value = null; }

function openColumnMenu(index: number, ev: MouseEvent) {
	const col = columns.value[index];
	const l = layout.value;
	const sizeItems = l === 'row' ? [
		{ text: '幅: 狭い', icon: 'ti ti-arrows-diff', action: () => setWidth(index, 300) },
		{ text: '幅: 標準', icon: 'ti ti-arrows-horizontal', action: () => setWidth(index, 380) },
		{ text: '幅: 広い', icon: 'ti ti-arrows-maximize', action: () => setWidth(index, 460) },
		{ type: 'divider' as const },
	] : l === 'stack' ? [
		{ text: '高さ: コンパクト', icon: 'ti ti-fold', action: () => setHeight(index, 340) },
		{ text: '高さ: 標準', icon: 'ti ti-arrows-vertical', action: () => setHeight(index, 460) },
		{ text: '高さ: たっぷり', icon: 'ti ti-arrows-maximize', action: () => setHeight(index, 640) },
		{ type: 'divider' as const },
	] : [];

	const renoteItem = supportsRenoteToggle(col) ? [
		{ type: 'switch' as const, text: 'リノートを表示', ref: computed({ get: () => col.withRenotes !== false, set: (v: boolean) => setRenotes(index, v) }) },
		{ type: 'divider' as const },
	] : [];

	let moveItems: any[];
	if (l === 'grid2' || l === 'grid3') {
		const perRow = l === 'grid2' ? 2 : 3;
		const upOk = index - perRow >= 0;
		const downOk = index + perRow < columns.value.length;
		moveItems = [
			{ text: '前へ移動', icon: 'ti ti-arrow-left', action: () => moveColumn(index, -1) },
			{ text: '後ろへ移動', icon: 'ti ti-arrow-right', action: () => moveColumn(index, 1) },
			...(upOk ? [{ text: '上の行へ', icon: 'ti ti-arrow-up', action: () => moveColumn(index, -perRow) }] : []),
			...(downOk ? [{ text: '下の行へ', icon: 'ti ti-arrow-down', action: () => moveColumn(index, perRow) }] : []),
		];
	} else if (l === 'stack') {
		moveItems = [
			{ text: '上へ移動', icon: 'ti ti-arrow-up', action: () => moveColumn(index, -1) },
			{ text: '下へ移動', icon: 'ti ti-arrow-down', action: () => moveColumn(index, 1) },
		];
	} else {
		moveItems = [
			{ text: '左へ移動', icon: 'ti ti-arrow-left', action: () => moveColumn(index, -1) },
			{ text: '右へ移動', icon: 'ti ti-arrow-right', action: () => moveColumn(index, 1) },
		];
	}

	// 枠色サブメニュー
	const colorItem = {
		type: 'parent' as const,
		text: '枠色',
		icon: 'ti ti-palette',
		children: [
			...BORDER_PALETTE.map(c => ({ text: c.name, icon: 'ti ti-circle-filled', action: () => setBorderColor(index, c.value) })),
			{ type: 'divider' as const },
			{ text: 'カスタム…', icon: 'ti ti-pencil', action: () => setBorderColorCustom(index) },
			{ text: '枠色をクリア', icon: 'ti ti-circle-off', action: () => setBorderColor(index, null) },
		],
	};
	// グリッドでのみ「全幅表示(1行ぶち抜き)」トグルを出す
	const span = currentFullSpan(col);
	const fullItem = (l === 'grid2' || l === 'grid3') ? [
		{
			type: 'parent' as const,
			text: '全幅で表示',
			icon: span === 'col' ? 'ti ti-arrows-horizontal' : span === 'row' ? 'ti ti-arrows-vertical' : 'ti ti-square',
			children: [
				{ text: 'なし', icon: span === 'none' ? 'ti ti-check' : 'ti ti-square', action: () => setFullSpan(index, 'none') },
				{ text: '横ぶち抜き', icon: span === 'col' ? 'ti ti-check' : 'ti ti-arrows-horizontal', action: () => setFullSpan(index, 'col') },
				{ text: '縦ぶち抜き', icon: span === 'row' ? 'ti ti-check' : 'ti ti-arrows-vertical', action: () => setFullSpan(index, 'row') },
			],
		},
	] : [];
	os.popupMenu([
		...sizeItems, ...renoteItem, ...fullItem, colorItem,
		...moveItems,
		{ type: 'divider' as const },
		{ text: 'カラムを削除', icon: 'ti ti-trash', danger: true, action: () => removeColumn(index) },
	], (ev.currentTarget ?? ev.target) as HTMLElement);
}

async function addListColumn(anchor: HTMLElement) {
	const lists = await misskeyApi('users/lists/list', {});
	if (!Array.isArray(lists) || lists.length === 0) { os.alert({ type: 'info', text: 'リストがありません' }); return; }
	os.popupMenu(lists.map((l: any) => ({ text: l.name, icon: 'ti ti-list', action: () => pushColumn({ type: 'list', sourceId: l.id, name: l.name }) })), anchor);
}
async function addAntennaColumn(anchor: HTMLElement) {
	const antennas = await misskeyApi('antennas/list', {});
	if (!Array.isArray(antennas) || antennas.length === 0) { os.alert({ type: 'info', text: 'アンテナがありません' }); return; }
	os.popupMenu(antennas.map((a: any) => ({ text: a.name, icon: 'ti ti-antenna', action: () => pushColumn({ type: 'antenna', sourceId: a.id, name: a.name }) })), anchor);
}
async function addChannelColumn(anchor: HTMLElement) {
	const channels = await misskeyApi('channels/followed', { limit: 100 });
	if (!Array.isArray(channels) || channels.length === 0) { os.alert({ type: 'info', text: 'フォロー中のチャンネルがありません' }); return; }
	os.popupMenu(channels.map((c: any) => ({ text: c.name, icon: 'ti ti-device-tv', action: () => pushColumn({ type: 'channel', sourceId: c.id, name: c.name }) })), anchor);
}

function addColumn(ev: MouseEvent) {
	const anchor = (ev.currentTarget ?? ev.target) as HTMLElement;
	os.popupMenu([
		{ text: 'ホーム', icon: 'ti ti-home', action: () => pushColumn({ type: 'home' }) },
		{ text: 'ローカル', icon: 'ti ti-planet', action: () => pushColumn({ type: 'local' }) },
		{ text: 'ソーシャル', icon: 'ti ti-universe', action: () => pushColumn({ type: 'social' }) },
		{ text: 'グローバル', icon: 'ti ti-world', action: () => pushColumn({ type: 'global' }) },
		{ text: 'トレンド', icon: 'ti ti-chart-line', action: () => pushColumn({ type: 'trending' }) },
		{ type: 'divider' as const },
		{ text: 'メンション', icon: 'ti ti-at', action: () => pushColumn({ type: 'mentions' }) },
		{ text: '指名', icon: 'ti ti-mail', action: () => pushColumn({ type: 'directs' }) },
		{ type: 'divider' as const },
		{ text: 'リスト', icon: 'ti ti-list', action: () => addListColumn(anchor) },
		{ text: 'アンテナ', icon: 'ti ti-antenna', action: () => addAntennaColumn(anchor) },
		{ text: 'チャンネル', icon: 'ti ti-device-tv', action: () => addChannelColumn(anchor) },
		...(externalReady.value ? [
			{ type: 'divider' as const },
			{ text: '外部ホーム', icon: 'ti ti-home-link', action: () => pushColumn({ type: 'ohtl' as const }) },
			{ text: '外部ローカル', icon: 'ti ti-world-share', action: () => pushColumn({ type: 'oltl' as const }) },
			{ text: '外部通知', icon: 'ti ti-bell-ringing', action: () => pushColumn({ type: 'externalNotifications' as const }) },
		] : []),
		{ type: 'divider' as const },
		{ text: '通知', icon: 'ti ti-bell', action: () => pushColumn({ type: 'notifications' }) },
		{ text: 'ウィジェット', icon: 'ti ti-apps', action: () => pushColumn({ type: 'widgets' }) },
	], anchor);
}

function switchProfile(id: string) { prefer.commit('simpleUi.deckActiveProfile', id); }
async function createProfile() {
	const { canceled, result } = await os.inputText({ title: 'プロファイル名', placeholder: '例: 趣味アカ用' });
	if (canceled || !result) return;
	const id = `prof-${Date.now().toString(36)}`;
	prefer.commit('simpleUi.deckProfiles', [...profiles.value, { id, name: result, layout: 'row', columns: [
		{ id: genId(), type: 'local', width: 380, withRenotes: true },
		{ id: genId(), type: 'home', width: 380, withRenotes: true },
	] }]);
	prefer.commit('simpleUi.deckActiveProfile', id);
}
async function duplicateProfile() {
	const src = activeProfile.value;
	const id = `prof-${Date.now().toString(36)}`;
	prefer.commit('simpleUi.deckProfiles', [...profiles.value, { id, name: `${src.name} のコピー`, layout: src.layout, columns: src.columns.map(c => ({ ...c, id: genId() })) }]);
	prefer.commit('simpleUi.deckActiveProfile', id);
}
async function renameProfile() {
	const { canceled, result } = await os.inputText({ title: 'プロファイル名を変更', default: activeProfile.value.name });
	if (canceled || !result) return;
	commitActiveProfile(p => ({ ...p, name: result }));
}
async function deleteProfile() {
	if (profiles.value.length <= 1) { os.alert({ type: 'warning', text: '最後のプロファイルは削除できません' }); return; }
	const { canceled } = await os.confirm({ type: 'warning', text: `プロファイル「${activeProfile.value.name}」を削除しますか?` });
	if (canceled) return;
	const remaining = profiles.value.filter(p => p.id !== activeProfileId.value);
	prefer.commit('simpleUi.deckProfiles', remaining);
	prefer.commit('simpleUi.deckActiveProfile', remaining[0].id);
}
async function resetProfile() {
	const { canceled } = await os.confirm({ type: 'warning', text: `プロファイル「${activeProfile.value.name}」のレイアウトを初期状態(ローカル・ホーム・通知の3カラム)に戻しますか?` });
	if (canceled) return;
	commitActiveProfile(p => ({
		...p,
		layout: 'row',
		columns: [
			{ id: genId(), type: 'local', width: 380, withRenotes: true },
			{ id: genId(), type: 'home', width: 380, withRenotes: true },
			{ id: genId(), type: 'notifications', width: 340 },
		],
	}));
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
</script>

<style lang="scss" module>
.deckWrap { display: flex; flex-direction: column; height: 100%; }

.toolbarBar { flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 8px 14px 0; }
.toolbarToggle {
	flex-shrink: 0; width: 34px; height: 30px; border: 1px solid var(--MI_THEME-divider);
	border-radius: 999px; background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); cursor: pointer;
	transition: background .15s, color .15s;
	&:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--MI_THEME-panel)); }
}
.toolbarToggleOn { background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); border-color: transparent; }
.toolbarInner { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }

.layoutPill { display: flex; gap: 2px; padding: 3px; border-radius: 999px; background: color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent); }
.layoutBtn {
	width: 36px; height: 28px; border: none; border-radius: 999px; background: none; color: var(--MI_THEME-fg);
	opacity: .55; cursor: pointer; transition: background .15s, opacity .15s;
	&:hover { opacity: .85; }
}
.layoutBtnOn { background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); opacity: 1; &:hover { opacity: 1; } }

.profileBtn {
	display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--MI_THEME-divider);
	border-radius: 999px; background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); font-weight: 700; font-size: .85em; cursor: pointer;
	transition: background .15s;
	&:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 8%, var(--MI_THEME-panel)); }
}
.profileName { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profileChevron { font-size: .85em; opacity: .6; }
.toolbarSpacer { flex: 1; }

.iconBtn {
	flex-shrink: 0; width: 34px; height: 30px; border: 1px solid var(--MI_THEME-divider); border-radius: 999px;
	background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); cursor: pointer; transition: background .15s, color .15s;
	&:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--MI_THEME-panel)); }
}
.iconBtnOn { background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); border-color: transparent; }

.deck { flex: 1; min-height: 0; padding: 14px; box-sizing: border-box; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent) transparent; }

.layoutRow { display: flex; align-items: stretch; gap: 14px; overflow-x: auto; overflow-y: hidden; }
.layoutRow .column { flex-shrink: 0; min-width: 280px; }
.layoutRow .addColumn { width: 180px; flex-shrink: 0; }

.layoutGrid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: calc(50% - 7px); grid-auto-flow: row dense; gap: 14px; overflow-y: auto; overflow-x: hidden; }
.layoutGrid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: calc(50% - 7px); grid-auto-flow: row dense; gap: 14px; overflow-y: auto; overflow-x: hidden; }
.layoutGrid2 .column, .layoutGrid3 .column { min-height: 0; }
.addColumnGrid { min-height: 120px; }

.layoutStack { display: flex; flex-direction: column; gap: 14px; overflow-y: auto; overflow-x: hidden; }
.layoutStack .column { width: 100%; flex-shrink: 0; }
.addColumnStack { width: 100%; height: 96px; flex-direction: row; }

.column { display: flex; flex-direction: column; background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 14px; box-shadow: 0 2px 12px rgba(0, 0, 0, .06); overflow: hidden; transition: opacity .15s, box-shadow .15s; }
.columnDragging { opacity: .4; }
.columnDragOver { box-shadow: 0 0 0 2px var(--MI_THEME-accent); }
/* 旗鯖fork: 枠色指定カラム。colStyle が borderColor と --deckColBorder をセットする。 */
.columnColored { border-width: 2px; }
.columnColored .colHeader { border-bottom-color: var(--deckColBorder, var(--MI_THEME-divider)); }
/* 旗鯖fork: グリッドで1行ぶち抜きの全幅カラム */
.columnFull { grid-column: 1 / -1; }
.columnFullV { grid-row: span 2; }

.colHeader {
	display: flex; align-items: center; gap: 8px; flex-shrink: 0; padding: 10px 14px; font-size: .9em; font-weight: 700;
	color: var(--MI_THEME-fg); background: color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--MI_THEME-panel));
	border-bottom: 1px solid var(--MI_THEME-divider); cursor: grab; user-select: none;
	&:active { cursor: grabbing; }
}
.colIcon { color: var(--MI_THEME-accent); }
.colTitle { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.colHeadBtn, .colMenuBtn {
	flex-shrink: 0; width: 28px; height: 28px; border-radius: 999px; color: var(--MI_THEME-fg); opacity: .7;
	&:hover { opacity: 1; background: color-mix(in srgb, var(--MI_THEME-accent) 14%, transparent); }
}

.colBody { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent) transparent; }
.colBody :global(._deckColError) { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 16px; color: var(--MI_THEME-fg); opacity: .6; font-size: .9em; text-align: center; }
.colBody :global(._deckColError i) { font-size: 1.8em; }

.addColumn {
	display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
	border: 2px dashed color-mix(in srgb, var(--MI_THEME-accent) 40%, transparent); border-radius: 14px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 4%, transparent); color: var(--MI_THEME-accent); font-weight: 700; cursor: pointer;
	transition: background .15s, border-color .15s;
	i { font-size: 1.6em; }
	&:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 10%, transparent); border-color: color-mix(in srgb, var(--MI_THEME-accent) 70%, transparent); }
}
</style>
