<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hataskey UI 3: 左メニュー。HataSideStudio の有効プロファイル(拡大/縮小)をそのまま描画する。
-->
<template>
<nav :class="$style.root" :data-mode="collapsed ? 'collapsed' : 'expanded'" :aria-label="copy.menu">
	<button type="button" :class="$style.brand" :title="instanceName" aria-haspopup="menu" :aria-expanded="instanceMenuOpen" @click="openInstanceMenu">
		<img :src="instance.iconUrl || '/favicon.ico'" alt="" :class="$style.brandIcon"/>
	</button>

	<div :class="$style.scroll">
		<template v-if="!collapsed">
			<div v-for="block in blocks" :key="block.id" :class="$style.block" :data-group="block.group ? 'true' : undefined">
				<span v-if="block.name" :class="$style.blockName">{{ block.name }}</span>
				<div :class="$style.grid" :style="{ gridTemplateColumns: `repeat(${block.columns}, minmax(0, 1fr))` }">
					<template v-for="item in block.items" :key="item.id">
						<button
							v-if="item.type === 'button'"
							v-show="menuAvailable(item.menuId)"
							type="button"
							:class="$style.item"
							:data-size="item.size"
							:data-menu-id="item.menuId"
							:data-icon-only="item.showLabel && item.size !== 'small' ? undefined : 'true'"
							:data-brand="BRAND_MENUS.has(item.menuId) ? 'true' : undefined"
														:data-active="menuActive(item.menuId) ? 'true' : undefined"
							:style="{ gridColumn: item.size === 'large' ? '1 / -1' : 'auto', ...(item.menuId === 'cacheClear' ? { '--hk3-cache-label-size': getHataSideStudioCacheLabelSize(buttonLabel(item)) } : {}) }"
							:title="buttonLabel(item)"
							@click="onItemClick(item, $event)"
						>
							<i :class="[iconOf(item), $style.itemIcon]"></i>
							<span v-if="item.showLabel && item.size !== 'small'" :class="$style.itemLabel">{{ buttonLabel(item) }}</span>
							<span v-if="badgeOf(item.menuId)" :class="$style.badge">{{ badgeOf(item.menuId) }}</span>
						</button>
						<div v-else :class="$style.widget" :data-size="item.size" :style="{ gridColumn: item.size === 'large' ? '1 / -1' : 'auto', minHeight: `${widgetMinHeight(item)}px` }">
							<HataSideStudioFlowers v-if="item.kind === 'hataskFlowers' || item.kind === 'flowers'" :size="item.size"/>
							<HataSideStudioEarthquake v-else-if="item.kind === 'earthquake'" :size="item.size"/>
							<component :is="`widget-${widgetName(item)}`" v-else-if="widgetName(item)" :key="`${item.id}:${item.size}`" :widget="{ id: item.id, name: widgetName(item), data: widgetData(item) }"/>
							<span v-else :class="$style.widgetFallback">{{ getHataSideWidgetDisplayLabel(item.kind, item.label) }}</span>
						</div>
					</template>
				</div>
			</div>
		</template>
		<div v-else :class="$style.rail">
			<button
				v-for="item in railButtons"
				v-show="menuAvailable(item.menuId)"
				:key="item.id"
				type="button"
				:class="$style.railItem"
				:data-menu-id="item.menuId"
				:data-active="menuActive(item.menuId) ? 'true' : undefined"
				:title="buttonLabel(item)"
				@click="onItemClick(item, $event)"
			>
				<i :class="[iconOf(item), $style.railIcon]"></i>
				<span v-if="badgeOf(item.menuId)" :class="$style.railBadge">{{ badgeOf(item.menuId) }}</span>
			</button>
		</div>
	</div>

	<div :class="$style.foot">
		<button v-if="isDeck" type="button" :class="$style.post" :title="copy.note" @click="emit('post')">
			<component :is="postOpen ? X : profile.postButton.icon === 'paw' ? PawPrint : Pencil" :size="20"/>
		</button>
		<div :class="$style.trio" :data-stack="collapsed ? 'true' : undefined">
			<button v-if="isAdmin" type="button" :class="$style.footBtn" :data-active="adminActive ? 'true' : undefined" :title="copy.controlPanel" @click="go('/admin')"><Gauge :size="18"/></button>
			<button v-else type="button" :class="$style.footBtn" :data-active="studioActive ? 'true' : undefined" :title="copy.editSideMenu" @click="go('/hata-side-studio')"><PanelsTopLeft :size="18"/></button>
			<button type="button" :class="$style.footBtn" :title="dark ? copy.lightMode : copy.darkMode" @click="emit('toggleTheme')"><component :is="dark ? Sun : Moon" :size="18"/></button>
			<button type="button" :class="$style.footBtn" :data-active="settingsActive ? 'true' : undefined" :title="i18n.ts.settings" @click="go('/settings')"><Settings :size="18"/></button>
		</div>
		<div :class="$style.pair" :data-stack="collapsed ? 'true' : undefined">
			<button type="button" :class="$style.modeBtn" :data-on="!isDeck ? 'true' : undefined" :aria-pressed="!isDeck" :title="copy.standardView" @click="emit('mode', false)"><RectangleVertical :size="18"/></button>
			<button type="button" :class="$style.modeBtn" :data-on="isDeck ? 'true' : undefined" :aria-pressed="isDeck" :title="copy.deckView" :disabled="!deckAvailable" @click="emit('mode', true)"><Columns3 :size="18"/></button>
		</div>
		<button v-if="$i" type="button" :class="$style.account" :title="copy.account" @click="openAccountMenu">
			<MkAvatar :user="$i" :class="$style.accountAvatar"/>
			<span v-if="!collapsed" :class="$style.accountName">@{{ $i.username }}</span>
		</button>
	</div>
</nav>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, onBeforeUnmount, ref } from 'vue';
import { Columns3, Gauge, Moon, PanelsTopLeft, PawPrint, Pencil, RectangleVertical, Settings, Sun, X } from '@lucide/vue';
import { instanceName as fallbackInstanceName } from '@@/js/config.js';
import type { HataSideButton, HataSideWidget } from '@/utility/hata-side-studio.js';
import HataSideStudioEarthquake from '@/components/HataSideStudioEarthquake.vue';
import HataSideStudioFlowers from '@/components/HataSideStudioFlowers.vue';
import MkLaunchPad from '@/components/MkLaunchPad.vue';
import * as os from '@/os.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { mainRouter } from '@/router.js';
import { navbarItemDef } from '@/navbar.js';
import { miLocalStorage } from '@/local-storage.js';
import { getAccountMenu } from '@/accounts.js';
import { openInstanceMenu as openServerMenu } from '@/ui/_common_/common.js';
import { getExternalAccount } from '@/utility/external-api.js';
import { SIDEBAR_ICON_OVERRIDES } from '@/utility/sidebar-icon-overrides.js';
import { createButton, getActiveHataSideProfile, getHataSideStudioCacheLabelSize, getHataSideStudioGroupDisplayName, getHataSideStudioMenuDisplayLabel, hataSideStudioStore } from '@/utility/hata-side-studio.js';
import { getHataSideWidgetDisplayLabel, HATA_SIDE_WIDGET_REGISTRY } from '@/utility/hata-side-studio-widgets.js';

withDefaults(defineProps<{
	collapsed?: boolean;
	isDeck?: boolean;
	deckAvailable?: boolean;
	postOpen?: boolean;
	dark?: boolean;
}>(), {
	collapsed: false,
	isDeck: false,
	deckAvailable: true,
	postOpen: false,
	dark: false,
});

const emit = defineEmits<{
	(ev: 'post'): void;
	(ev: 'toggleTheme'): void;
	(ev: 'mode', deck: boolean): void;
	(ev: 'navigate'): void;
	(ev: 'launchPadOpen', open: boolean): void;
	(ev: 'instanceMenuOpen', open: boolean): void;
}>();

const copy = i18n.ts._hata._hataskeyUi3;
const instanceName = computed(() => instance.name || fallbackInstanceName);
const profile = computed(() => getActiveHataSideProfile(hataSideStudioStore.value));
const isAdmin = computed(() => $i != null && ($i.isAdmin || $i.isModerator));
const path = computed(() => mainRouter.currentRoute.value.path);
const adminActive = computed(() => path.value.startsWith('/admin'));
const studioActive = computed(() => path.value.startsWith('/hata-side-studio'));
const settingsActive = computed(() => path.value.startsWith('/settings'));

type Block = { id: string; name: string; group: boolean; columns: number; items: Array<HataSideButton | HataSideWidget> };
const moreButton = createButton({ id: 'more', icon: 'ti ti-dots', label: i18n.ts.more, group: 'more' });
const railButtons = computed(() => profile.value.collapsed.buttons.some(item => item.menuId === 'more')
	? profile.value.collapsed.buttons
	: [...profile.value.collapsed.buttons, { ...moreButton, id: 'hk3-rail-more', size: 'small' as const, showLabel: false }]);

// 連続するルート直下の項目は1つのブロックにまとめ、グループは見出し付きの独立ブロックにする。
const blocks = computed<Block[]>(() => {
	const result: Block[] = [];
	let run: Block | null = null;
	const nodes = profile.value.expanded.nodes;
	for (const node of nodes) {
		if (node.type === 'group') {
			run = null;
			result.push({ id: node.id, name: node.showName ? getHataSideStudioGroupDisplayName(node.name) : '', group: true, columns: node.columns, items: [...node.children] });
			continue;
		}
		if (run == null) {
			run = { id: `run:${node.id}`, name: '', group: false, columns: profile.value.expanded.columns, items: [] };
			result.push(run);
		}
		run.items.push(node);
	}
	if (!nodes.some(node => node.type === 'button' ? node.menuId === 'more' : node.type === 'group' && node.children.some(child => child.type === 'button' && child.menuId === 'more'))) {
		// group.id は生成IDなので、保存名を優先し、改名後はその他系メニューで識別する。
		const other = nodes.find(node => node.type === 'group' && node.name === 'その他')
			?? nodes.find(node => node.type === 'group' && node.children.some(child => child.type === 'button' && (child.menuId === 'reload' || child.menuId === 'cacheClear')));
		const block = other && result.find(block => block.id === other.id);
		if (block) block.items.push(moreButton);
		else result.push({ id: 'hk3-more', name: getHataSideStudioGroupDisplayName('その他'), group: true, columns: 2, items: [moreButton] });
	}
	return result;
});

const MENU_PATHS: Record<string, string> = {
	timeline: '/',
	notifications: '/my/notifications',
	search: '/search',
	chat: '/chat',
	hatask: '/hatask',
	lists: '/my/lists',
	channels: '/channels',
	antennas: '/my/antennas',
	drive: '/my/drive',
	announcements: '/announcements',
	favorites: '/my/favorites',
	explore: '/explore',
	followRequests: '/my/follow-requests',
	hatafeed: '/hatafeed',
	hatady: '/hatady',
	earthquake: '/earthquake',
	externalNotifications: '/my/external-notifications',
};

function navbarFallback(menuId: string) {
	return (navbarItemDef as unknown as Record<string, { show?: boolean; to?: string; action?: (ev?: MouseEvent) => void } | undefined>)[menuId];
}

function menuAvailable(menuId: string): boolean {
	if (menuId === 'externalNotifications') return getExternalAccount() != null;
	return navbarFallback(menuId)?.show !== false;
}

function menuActive(menuId: string): boolean {
	const target = MENU_PATHS[menuId] ?? navbarFallback(menuId)?.to;
	if (typeof target !== 'string') return false;
	if (target === '/') return path.value === '/';
	return path.value.startsWith(target);
}

function iconOf(item: HataSideButton): string {
	return SIDEBAR_ICON_OVERRIDES[item.menuId] ?? item.icon;
}

// Hataskey 独自のツールは、名前をロゴと同じ Righteous で表示する。
const BRAND_MENUS = new Set(['hatask', 'hatafeed', 'hatady']);

function buttonLabel(item: HataSideButton): string {
	return getHataSideStudioMenuDisplayLabel(item.menuId, item.label);
}

function badgeOf(menuId: string): string | null {
	if ($i == null) return null;
	if (menuId === 'notifications' && $i.unreadNotificationsCount > 0) return $i.unreadNotificationsCount > 99 ? '99+' : String($i.unreadNotificationsCount);
	if (menuId === 'chat' && $i.hasUnreadChatMessages) return '•';
	if (menuId === 'announcements' && $i.hasUnreadAnnouncement) return '•';
	return null;
}

function widgetName(widget: HataSideWidget): string | null {
	if (widget.kind === 'flowers') return 'hataskFlowers';
	if (widget.kind === 'announcements') return null;
	return widget.kind;
}

function widgetData(widget: HataSideWidget): Record<string, unknown> {
	return { ...(widget.data ?? {}), ...(widget.sizeSettings[widget.size].data ?? {}) };
}

function widgetMinHeight(widget: HataSideWidget): number {
	return Math.max(widget.sizeSettings[widget.size].minHeight ?? 0, widget.kind === 'aichan' ? HATA_SIDE_WIDGET_REGISTRY.aichan.sizes[widget.size].minHeight : 0);
}

function go(to: string) {
	emit('navigate');
	mainRouter.pushByPath(to as never);
}

const launchPadOpen = ref(false);
const instanceMenuOpen = ref(false);
let launchPadDispose: (() => void) | null = null;

function closeInstanceMenuState() {
	if (!instanceMenuOpen.value) return;
	instanceMenuOpen.value = false;
	emit('instanceMenuOpen', false);
}

function closeLaunchPad() {
	const dispose = launchPadDispose;
	launchPadDispose = null;
	if (launchPadOpen.value) {
		launchPadOpen.value = false;
		emit('launchPadOpen', false);
	}
	dispose?.();
}

function openLaunchPad(anchor: HTMLElement) {
	if (launchPadOpen.value) return;
	launchPadOpen.value = true;
	emit('launchPadOpen', true);
	try {
		launchPadDispose = os.popup(MkLaunchPad, { anchorElement: anchor }, { closed: closeLaunchPad }).dispose;
	} catch (error) {
		closeLaunchPad();
		throw error;
	}
}

onBeforeUnmount(() => {
	closeLaunchPad();
	closeInstanceMenuState();
});

function onItemClick(item: HataSideButton, ev: MouseEvent) {
	const anchor = ev.currentTarget as HTMLElement;
	if (item.targetId && item.menuId === 'lists') {
		miLocalStorage.setItem('hatasabaLastListId', item.targetId);
		go(`/timeline/list/${item.targetId}`);
		return;
	}
	if (item.targetId && item.menuId === 'antennas') {
		miLocalStorage.setItem('hatasabaLastAntennaId', item.targetId);
		go(`/timeline/antenna/${item.targetId}`);
		return;
	}
	switch (item.menuId) {
		case 'more': openLaunchPad(anchor); return;
		case 'reload': window.location.reload(); return;
		case 'cacheClear': void import('@/utility/clear-cache.js').then(({ clearCache }) => clearCache()); return;
		case 'uiSetup': {
			const { dispose } = os.popup(defineAsyncComponent(() => import('@/components/MkUISetup.vue')), {}, { closed: () => dispose() });
			return;
		}
	}
	const target = MENU_PATHS[item.menuId];
	if (target != null) {
		go(target);
		return;
	}
	const fallback = navbarFallback(item.menuId);
	if (fallback == null || fallback.show === false) return;
	if (typeof fallback.to === 'string') {
		go(fallback.to);
		return;
	}
	emit('navigate');
	fallback.action?.(ev);
}

async function openInstanceMenu(ev: MouseEvent) {
	if (instanceMenuOpen.value) return;
	instanceMenuOpen.value = true;
	emit('instanceMenuOpen', true);
	try {
		await openServerMenu(ev);
	} finally {
		closeInstanceMenuState();
	}
}

function openAccountMenu(ev: MouseEvent) {
	void getAccountMenu({ withExtraOperation: true }).then(menu => os.popupMenu(menu, ev.currentTarget as HTMLElement));
}
</script>

<style lang="scss" module>
@use './side-nav-item' as sideNavItem;

.root {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-height: 0;
	background: var(--hk3-bg);
	color: var(--hk3-text);
	border-right: 2px solid var(--hk3-divider);
	overflow: hidden;
	box-sizing: border-box;
}

.brand {
	display: flex;
	align-items: center;
	gap: 10px;
	height: 58px;
	flex: none;
	border: 0;
	border-bottom: 2px solid var(--hk3-divider);
	background: transparent;
	color: inherit;
	cursor: pointer;
	font: inherit;
	justify-content: center;
	padding: 0;
	&:hover { background: var(--hk3-accent-100); }
}

.brandIcon {
	width: 32px;
	height: 32px;
	flex: none;
	object-fit: cover;
	background: var(--hk3-accent);
}

.scroll {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	overflow-x: hidden;
	scrollbar-width: none;
}

.block {
	display: flex;
	flex-direction: column;

	&[data-group] { border-bottom: 2px solid var(--hk3-divider); }
}

.blockName {
	@include sideNavItem.heading;
}

.grid { display: grid; }

.item {
	@include sideNavItem.frame;
	cursor: pointer;
	font: inherit;

	&[data-active] { background: var(--hk3-accent-100); color: var(--hk3-accent-800); }
	&:hover { background: var(--hk3-accent-100); color: var(--hk3-accent-800); }
}

.itemIcon {
	display: block;
	@include sideNavItem.icon;

	.item[data-active] & { color: var(--hk3-accent); }
}

.itemLabel {
	@include sideNavItem.label;
}

.item[data-menu-id="cacheClear"] .itemLabel { @include sideNavItem.cache-clear-label; }
.item[data-menu-id="earthquake"] .itemLabel { @include sideNavItem.earthquake-label; }

.badge, .railBadge {
	position: absolute;
	background: var(--hk3-accent);
	color: var(--hk3-bg);
	font-size: 11px;
	font-weight: 800;
	padding: 1px 5px;
	line-height: 1.4;
}

.badge { top: 8px; right: 8px; }

.item[data-brand] .itemLabel {
	font-family: 'Righteous', system-ui, sans-serif;
	font-weight: 400;
	letter-spacing: 0.02em;
}

.widget {
	position: relative;
	min-width: 0;
	border-right: 1px solid var(--hk3-divider);
	border-bottom: 1px solid var(--hk3-divider);
	overflow: hidden;

	:global(._panel), :global(.container), :global(section) { border-radius: 0 !important; }
}

.widgetFallback {
	display: block;
	padding: 14px;
	font-size: 13px;
	font-weight: 700;
}

.rail {
	display: flex;
	flex-direction: column;
}

.railItem {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 56px;
	padding: 0;
	border: 0;
	border-bottom: 1px solid var(--hk3-divider);
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;

	&[data-active] { background: var(--hk3-accent-100); color: var(--hk3-accent-800); }
	&:hover { background: var(--hk3-accent-100); color: var(--hk3-accent-800); }
}

.railIcon {
	display: block;
	font-size: 22px;
	line-height: 22px;

	.railItem[data-active] & { color: var(--hk3-accent); }
}

.railBadge {
	top: 9px;
	left: calc(50% + 5px);
	font-size: 10px;
	padding: 0 4px;
}

.foot {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 12px;
	flex: none;
	border-top: 2px solid var(--hk3-divider);
}

.post {
	height: 44px;
	border: 0;
	background: var(--hk3-accent);
	color: var(--hk3-bg);
	cursor: pointer;
	display: grid;
	place-items: center;

	&:hover { background: var(--hk3-accent-600); }
}

.trio, .pair {
	display: grid;
	border: 1px solid var(--hk3-divider);
}

.trio { grid-template-columns: 1fr 1fr 1fr; }
.pair { grid-template-columns: 1fr 1fr; }
.trio[data-stack], .pair[data-stack] { grid-template-columns: 1fr; }

.footBtn, .modeBtn {
	height: 40px;
	border: 0;
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;
	display: grid;
	place-items: center;

	& + & { border-left: 1px solid var(--hk3-divider); }
	[data-stack] > & + & { border-left: 0; border-top: 1px solid var(--hk3-divider); }
}

.footBtn {
	&[data-active] { background: var(--hk3-text); color: var(--hk3-bg); }
	&:hover:not([data-active]) { background: var(--hk3-accent-100); color: var(--hk3-accent-800); }
}

.modeBtn {
	&[data-on] { background: var(--hk3-text); color: var(--hk3-bg); }
	&:disabled { opacity: 0.45; cursor: default; }
}

.account {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;
	font: inherit;
	min-width: 0;

	.root[data-mode="collapsed"] & { justify-content: center; }
}

.accountAvatar {
	width: 32px;
	height: 32px;
	flex: none;
	border-radius: 0 !important;
	:global(img) { border-radius: 0 !important; }
}

.accountName {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 12px;
	font-weight: 700;
}
</style>
