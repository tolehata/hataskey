<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<!-- 旗鯖fork: 自前で見出し・戻る・検索を持つので、本体の帯は出さない。
     ⚠️出すと帯が2本並ぶ。 -->
<PageWithHeader :actions="headerActions" :tabs="headerTabs" hideHeader>
	<div ref="rootEl" :class="$style.scope" :data-motion-enabled="motionEnabled ? 'true' : 'false'">
		<a :class="$style.skip" href="#settings-redesign-main">{{ copy.skipToContent }}</a>
		<header :class="[$style.header, { [$style.compactHeader]: compact }]">
			<template v-if="compact">
				<div :class="$style.compactTop">
					<button type="button" :class="$style.compactBack" :aria-label="i18n.ts.goBack" @click="goCompactBack"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>
					<h1 :class="$style.compactTitle"><Transition name="settings-title" :css="motionEnabled" mode="out-in"><span :key="mobilePageTitle" :class="{ settingsBrand: hasSettingsBrand(mobilePageTitle) }">{{ mobilePageTitle }}</span></Transition></h1>
					<button v-if="isHatasabaUi2SurfaceActive" type="button" :class="$style.compactPreview" :aria-label="copy.ui2.openPreview" @click="openHatasabaUi2Preview"><i class="ti ti-eye" aria-hidden="true"></i></button>
					<MkAvatar v-else-if="$i" :user="$i" :link="false" :class="$style.headerAvatar"/>
				</div>
				<button v-if="!isHatasabaUi2SurfaceActive" ref="searchButtonEl" type="button" :class="$style.searchTrigger" @click="openSearch">
					<i class="ti ti-search" aria-hidden="true"></i>
					<span :class="$style.searchLabel">{{ copy.searchTrigger }}</span>
				</button>
			</template>
			<template v-else>
				<h1 :class="$style.title">{{ i18n.ts.settings }}</h1>
				<button ref="searchButtonEl" type="button" :class="$style.searchTrigger" @click="openSearch">
					<i class="ti ti-search" aria-hidden="true"></i>
					<span :class="$style.searchLabel">{{ copy.searchTrigger }}</span>
					<kbd :class="$style.searchShortcut" :aria-label="copyx.searchShortcut({ shortcut: searchShortcutHint })">{{ searchShortcutHint }}</kbd>
				</button>
			</template>
		</header>

		<div :class="$style.layout">
			<aside v-show="!compact || currentPage?.route.name == null" ref="navEl" :class="$style.nav" :aria-label="copy.settingsCategories">
				<SettingsMobileOverview
					v-if="compact && currentPage?.route.name == null"
					:quickItems="quickItems"
					:sections="mobileOverviewSections"
					:deprecatedSections="mobileDeprecatedSections"
					:valueItems="quickValueItems"
					:featureItem="hataCustomGlassUiItem"
					:destructiveItems="destructiveItems"
					:legacyLabel="copy.legacySettings"
					:activeCategoryId="compactNavigationSection"
					:activeItemId="activeNavItemId"
					@select="goToSetting"
					@openCategory="openCompactNavigationSection"
					@preview="openHatasabaUi2Preview"
					@action="runShellAction"
					@legacy="requestOpenLegacy"
				/>
				<template v-else>
					<div v-if="$i && !tablet" :class="$style.profileRow">
						<MkA :to="profileNavigationItem.route" :class="$style.profile" @click.prevent="goToSetting(profileNavigationItem)">
							<MkAvatar :user="$i" :link="false" :class="$style.avatar"/>
							<span :class="$style.profileText"><strong><Mfm :text="$i.name || $i.username" :plain="true" :nyaize="false"/></strong><small>@{{ $i.username }}</small></span>
						</MkA>
					</div>

					<div v-if="!tablet" :class="$style.filterPills" role="group" :aria-label="copy.settingsFilter">
						<button
							v-for="filter in settingsFilters"
							:key="filter.id"
							type="button"
							:class="[$style.filter, { [$style.filterActive]: activeSettingsFilter === filter.id }]"
							:aria-pressed="activeSettingsFilter === filter.id"
							@click="activeSettingsFilter = filter.id"
						>
							{{ filter.label }}
						</button>
					</div>

					<h2 :class="[$style.sectionTitle, $style.quickSectionTitle]">{{ copy.frequentlyUsedSettings }}</h2>
					<div :class="$style.quickGrid">
						<component :is="opensSettingsPopup(item) ? 'button' : 'MkA'" v-for="item in visibleQuickItems" :key="item.id" v-bind="navBindings(item)" :class="[$style.quickItem, { [$style.navLinkActive]: isActive(item) }]" :aria-label="item.label" :aria-current="isActive(item) ? 'page' : undefined" @click.prevent="goToSetting(item)"><i :class="item.icon" aria-hidden="true"></i><span><span v-if="item.brand" class="settingsBrand">{{ item.label }}</span><span v-else>{{ item.label }}</span></span></component>
					</div>

					<template v-if="tablet">
						<template v-if="tabletNavigationSection == null">
							<MkA :to="hataCustomGlassUiItem.route" :class="[$style.navLink, $style.tabletPrimaryLink, { [$style.navLinkActive]: isActive(hataCustomGlassUiItem) }]" :aria-current="isActive(hataCustomGlassUiItem) ? 'page' : undefined" @click.prevent="goToSetting(hataCustomGlassUiItem)">
								<i :class="hataCustomGlassUiItem.icon" aria-hidden="true"></i><span :class="{ settingsBrand: hataCustomGlassUiItem.brand }">{{ hataCustomGlassUiItem.label }}</span><i class="ti ti-chevron-right" aria-hidden="true"></i>
							</MkA>
							<button v-for="section in tabletNavSections" :key="section.id" type="button" :class="[$style.tabletCategoryLink, { [$style.tabletCherrypickLink]: section.id === 'cherrypick', [$style.tabletDeprecatedLink]: section.id === 'misskey-ui', [$style.tabletCategoryActive]: sectionHasActiveItem(section) }]" :aria-current="sectionHasActiveItem(section) ? 'page' : undefined" :data-active="sectionHasActiveItem(section) ? 'true' : 'false'" :data-settings-tablet-category-id="section.id" :data-settings-nav-section="section.id" @click="openTabletNavigationSection(section.id)">
								<i :class="section.icon" aria-hidden="true"></i><span :class="{ settingsBrand: section.brand != null || hasSettingsBrand(section.label) }">{{ section.label }}</span><small v-if="section.id === 'misskey-ui'" :class="$style.deprecatedBadge">{{ copy.mobile.deprecated }}</small><i class="ti ti-chevron-right" aria-hidden="true"></i>
							</button>
						</template>
						<template v-else-if="tabletActiveNavigationSection != null">
							<button ref="tabletSectionBackEl" type="button" :class="$style.tabletSectionBack" @click="openTabletNavigationSection(null)"><i class="ti ti-chevron-left" aria-hidden="true"></i><span :class="{ settingsBrand: tabletActiveNavigationSection.brand != null || hasSettingsBrand(tabletActiveNavigationSection.label) }">{{ tabletActiveNavigationSection.label }}</span></button>
							<nav :class="$style.links" :aria-label="tabletActiveNavigationSection.label">
								<component :is="opensSettingsPopup(item) ? 'button' : 'MkA'" v-for="item in tabletActiveNavigationSection.items" :key="item.id" v-bind="navBindings(item)" :class="[$style.navLink, { [$style.navLinkActive]: isActive(item) }]" :aria-current="isActive(item) ? 'page' : undefined" @click.prevent="goToSetting(item)"><i :class="item.icon" aria-hidden="true"></i><span><span v-if="item.brand" class="settingsBrand">{{ item.label }}</span><span v-else>{{ item.label }}</span></span><span v-if="item.showCount && settingCountForItem(item) != null" :class="$style.countBadge">{{ settingCountForItem(item) }}</span></component>
							</nav>
						</template>
					</template>
					<template v-else>
						<details v-for="section in visibleNavSections" :key="section.id" :open="expandedDesktopNavigationSectionIds.has(section.id)" :class="[$style.navSection, { [$style.cherrypickSection]: section.id === 'cherrypick', [$style.deprecatedNavSection]: section.id === 'misskey-ui', [$style.navSectionActive]: sectionHasActiveItem(section) }]" :data-active="sectionHasActiveItem(section) ? 'true' : 'false'" :data-settings-nav-section="section.id" @toggle="onDesktopNavigationSectionToggle(section.id, $event)">
							<summary :class="$style.sectionTitle"><i :class="section.icon" aria-hidden="true"></i><span :class="{ settingsBrand: section.brand != null || hasSettingsBrand(section.label) }" :title="section.label">{{ section.label }}</span><small v-if="section.id === 'misskey-ui'" :class="$style.deprecatedBadge">{{ copy.mobile.deprecated }}</small><i class="ti ti-chevron-right" aria-hidden="true"></i></summary>
							<nav :class="$style.links" :aria-label="section.label">
								<component :is="opensSettingsPopup(item) ? 'button' : 'MkA'" v-for="item in section.items" :key="item.id" v-bind="navBindings(item)" :class="[$style.navLink, { [$style.navLinkActive]: isActive(item), [$style.cherrypickNavLink]: section.id === 'cherrypick' }]" :aria-current="isActive(item) ? 'page' : undefined" @click.prevent="goToSetting(item)">
									<i :class="item.icon" aria-hidden="true"></i><span><span v-if="item.brand" class="settingsBrand">{{ item.label }}</span><span v-else>{{ item.label }}</span></span><span v-if="item.showCount && settingCountForItem(item) != null" :class="$style.countBadge" :aria-label="copyx.searchSettingsCount({ count: settingCountForItem(item) ?? 0 })" :title="copyx.searchSettingsCount({ count: settingCountForItem(item) ?? 0 })">{{ settingCountForItem(item) }}</span>
								</component>
							</nav>
						</details>
					</template>

					<section :class="$style.sessionActions" aria-labelledby="settings-shell-session-actions">
						<h2 id="settings-shell-session-actions" :class="$style.sectionTitle">{{ copy.sessionAndLogin }}</h2>
						<button
							v-for="item in destructiveItems"
							:key="item.id"
							type="button"
							:class="$style.destructiveAction"
							:data-settings-search-id="item.searchId"
							data-settings-search-destructive="true"
							@click="runShellAction(item.id)"
						>
							<i :class="item.icon" aria-hidden="true"></i><span><span v-if="item.brand" class="settingsBrand">{{ item.label }}</span><span v-else>{{ item.label }}</span></span>
						</button>
					</section>

					<button type="button" :class="$style.legacyMenu" @click="requestOpenLegacy"><i class="ti ti-history" aria-hidden="true"></i>{{ copy.legacySettings }}</button>
				</template>
			</aside>

			<main v-show="!compact || currentPage?.route.name != null" id="settings-redesign-main" ref="mainEl" :class="$style.main" tabindex="-1">
				<div :class="[$style.contentCard, { [$style.contentCardSurfaceActive]: isHatasabaUi2SurfaceActive }]">
					<HatasabaUi2SettingsSurface
						v-if="isHatasabaUi2SurfaceActive"
						ref="hatasabaSurface"
						:motionEnabled="motionEnabled"
						@close="onSurfaceClose"
						@saved="onSurfaceSaved"
						@sideStudio="onSurfaceSideStudio"
					/>
					<SettingsPreferencesSurface
						v-else-if="activePreferenceDestinationId != null"
						:destinationId="activePreferenceDestinationId"
					/>
					<SettingsServiceConnectionSurface
						v-else-if="isServiceConnectionSurfaceActive"
						:motionEnabled="motionEnabled"
					/>
					<div v-else :class="$style.legacyContent" @click.capture="onLegacyContentClickCapture"><NestedRouterView/></div>
					<SettingsRelatedLinks v-if="routeRelatedItems.length > 0" :items="routeRelatedItems" @select="goToSetting"/>
				</div>
			</main>
		</div>
	</div>
</PageWithHeader>

<Teleport to="body">
	<Transition
		:enterActiveClass="motionEnabled ? $style.navigationNoticeEnterActive : ''"
		:leaveActiveClass="motionEnabled ? $style.navigationNoticeLeaveActive : ''"
		:enterFromClass="motionEnabled ? $style.navigationNoticeEnterFrom : ''"
		:leaveToClass="motionEnabled ? $style.navigationNoticeLeaveTo : ''"
	>
		<div v-if="navigationNoticeMessage != null" :class="$style.navigationNoticeHost" :style="{ zIndex: navigationNoticeZIndex }">
			<SettingsNavigationNotice
				:key="navigationNoticeKey"
				:message="navigationNoticeMessage"
				:dismissLabel="copy.searchPrerequisite.dismiss"
				:dismissible="true"
				:motionEnabled="motionEnabled"
				@dismiss="clearNavigationNotice"
			/>
		</div>
	</Transition>
</Teleport>

<SettingsSearchPanel :open="searchOpen" :catalog="catalog" :catalogState="catalogState" @close="closeSearch" @select="onSearchSelect" @retry="loadCatalog"/>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, provide, ref, useTemplateRef, watch } from 'vue';
import SettingsSearchPanel from './SettingsSearchPanel.vue';
import SettingsNavigationNotice from './SettingsNavigationNotice.vue';
import SettingsRelatedLinks from './SettingsRelatedLinks.vue';
import SettingsMobileOverview from './SettingsMobileOverview.vue';
import SettingsPopupBridge from './SettingsPopupBridge.vue';
import { createSettingsShellActions } from './settings-shell-actions.js';
import { assertUniqueNavigationIds } from './settings-navigation-ids.js';
import { createSettingsSurfaceLeaveGuard } from './settings-surface-leave-guard.js';
import { waitForSettingsNavigationFocus } from './settings-navigation-focus.js';
import { settingsDestinationSections, settingsDestinations, destinationForId } from './settings-destinations.js';
import { canonicalSearchIdForDescriptor, destinationForSearchDescriptor, generatedPreferenceSearchId, parsePreferenceDestination } from './settings-preferences-catalog.js';
import { mergeRedesignedPreferenceSearchItems, redesignedPreferenceStableIdAliases, settingsDestinationCatalogItemsV2, suppressLegacyPreferenceSearchMarkers } from './settings-preferences-search-index.js';
import HatasabaUi2SettingsSurface from './HatasabaUi2SettingsSurface.vue';
import SettingsPreferencesSurface from './SettingsPreferencesSurface.vue';
import SettingsServiceConnectionSurface from './SettingsServiceConnectionSurface.vue';
import type { SettingsDestination } from './settings-destinations.js';
import type { SettingsSearchCloseEvent } from './SettingsSearchPanel.vue';
import type { SearchIndexItem } from '@/utility/inapp-search.js';
import type { SettingsActivationUnmetV2, SettingsControlCatalogItemV2 } from '@/utility/settings-control-search-v2.js';
import type { SettingsCatalogPresentationV2 } from '@/utility/settings-search-v2.js';
import type { SettingsSearchNavigationTargetV2, SettingsSearchV2Context } from '@/utility/settings-search-v2-context.js';
import type { HatasabaNavItem } from '@/utility/hatasaba-navigation.js';
import type { SettingsRelatedLink } from './SettingsRelatedLinks.vue';
import type { SettingsOverviewDestructiveItem, SettingsOverviewItem, SettingsOverviewSection, SettingsOverviewValue } from './SettingsMobileOverview.vue';
import type { SettingsShellActionId } from './settings-shell-actions.js';
import { genSearchIndexes } from '@/utility/inapp-search.js';
import { initIntlString } from '@/utility/intl-string.js';
import { i18n } from '@/i18n.js';
import { buildSettingsCatalogV2, canonicalStableIdForCatalogV2 } from '@/utility/settings-search-v2.js';
import { toSettingsControlCatalogItemsV2 } from '@/utility/settings-control-search-v2.js';
import { relatedSourcesForSettingsNavigationV2 } from '@/utility/settings-navigation-scope.js';
import {
	settingsSearchV2ContextKey,
} from '@/utility/settings-search-v2-context.js';
import { isFocusable } from '@/utility/focus.js';
import { glassUiBubbleLocal } from '@/utility/hatasaba-device-prefs.js';
import { getVisibleBottomNav, HATASABA_BOTTOM_NAV_MAX } from '@/utility/hatasaba-navigation.js';
import { clearCache } from '@/utility/clear-cache.js';
import { $i } from '@/i.js';
import * as os from '@/os.js';
import { prefer } from '@/preferences.js';
import { signout, signoutAll } from '@/signout.js';
import { definePage, provideReactiveMetadata } from '@/page.js';
import { mainRouter, useRouter } from '@/router.js';

type NavItem = SettingsOverviewItem & {
	primary?: boolean;
	showCount?: boolean;
	/** Catalog category used only when its count can be proved exactly. */
	categoryId?: string;
};
type NavSection = SettingsOverviewSection & { items: NavItem[] };
type SettingsActivation = NonNullable<SettingsSearchNavigationTargetV2['activation']>;
type SettingsActivationStep = NonNullable<SettingsActivation['steps']>[number];
type NavigationFocusTarget = { kind: 'control' | 'group'; id: string };
type ExactNavigationElement =
	| { state: 'missing' }
	| { state: 'ambiguous' }
	| { state: 'found'; element: HTMLElement };

const copy = i18n.ts._hata._settingsRedesign;
const copyx = i18n.tsx._hata._settingsRedesign;

const settingsCatalogPresentation: SettingsCatalogPresentationV2 = {
	categoryLabels: {
		'hatasnscord-ui': 'HataSNSCordUI',
		'hataskey-ui': copy.catalog.categories.hataskeyUi,
		'display-notes': copy.catalog.categories.displayNotes,
		'theme-font': copy.catalog.categories.themeFont,
		'timeline-posting': copy.catalog.categories.timelinePosting,
		reactions: copy.catalog.categories.reactions,
		'notification-sound': copy.catalog.categories.notificationSound,
		account: copy.catalog.categories.account,
		'hata-tools': copy.catalog.categories.hataTools,
		cherrypick: copy.catalog.categories.cherrypick,
		'data-connect': copy.catalog.categories.dataConnect,
		'misskey-ui': copy.catalog.categories.misskeyUi,
		behavior: copy.catalog.categories.behavior,
	},
	fallback: {
		'/settings/drive/cleaner': copy.catalog.fallback.driveCleaner,
		'/settings/theme/install': copy.catalog.fallback.themeInstall,
		'/settings/theme/manage': copy.catalog.fallback.themeManage,
		'/settings/statusbar': copy.catalog.fallback.statusbar,
		'/settings/plugin/install': copy.catalog.fallback.pluginInstall,
		'/settings/apps': copy.catalog.fallback.apps,
		'/settings/webhook/edit/:webhookId': copy.catalog.fallback.webhookEdit,
		'/settings/webhook/new': copy.catalog.fallback.webhookNew,
		'/settings/custom-css': copy.catalog.fallback.customCss,
		'/settings/account-stats': copy.catalog.fallback.accountStats,
		'/settings/external-account': copy.catalog.fallback.externalAccount,
		'/settings/hata-custom': copy.catalog.fallback.hataCustom,
		'/settings/hidden-reactions': copy.catalog.fallback.hiddenReactions,
	},
	relationReasons: {
		sameSection: copy.catalog.relation.sameSection,
		sameGroup: copy.catalog.relation.sameGroup,
		sameNestedGroup: copy.catalog.relation.sameNestedGroup,
		samePreference: copy.catalog.relation.samePreference,
		sameFeature: copy.catalog.relation.sameFeature,
		sharedVisibleTerm: copy.catalog.relation.sharedVisibleTerm,
	},
	noRelatedReasons: {
		fallback: copy.catalog.noRelated.fallback,
		marker: copy.catalog.noRelated.marker,
		default: copy.catalog.noRelated.default,
	},
	fallbackReason: copy.catalog.system.fallbackReason,
	activationUnavailableReason: copy.catalog.system.activationUnavailable,
};

const emit = defineEmits<{
	openLegacy: [];
}>();

const router = useRouter();
const rootEl = useTemplateRef('rootEl');
const navEl = useTemplateRef<HTMLElement>('navEl');
const mainEl = useTemplateRef('mainEl');
const searchButtonEl = useTemplateRef('searchButtonEl');
const tabletSectionBackEl = useTemplateRef<HTMLButtonElement>('tabletSectionBackEl');
type HatasabaUi2SurfaceHandle = { requestDiscard: () => Promise<boolean>; rollback: () => void; hasChanges: boolean; openPreview: () => void };
const hatasabaSurface = useTemplateRef<HatasabaUi2SurfaceHandle>('hatasabaSurface');
const searchOpen = ref(false);
const isApplePlatform = ref(false);
const searchShortcutHint = ref('Ctrl K');
const catalog = ref<ReturnType<typeof buildSettingsCatalogV2> | null>(null);
const catalogState = ref<'pending' | 'ready' | 'error'>('pending');
const compact = ref(false);
const tablet = ref(false);
const compactNavigationSection = ref<string | null>(null);
const tabletNavigationSection = ref<string | null>(null);
const prefersReducedMotion = ref(false);
const navigationNoticeMessage = ref<string | null>(null);
const navigationNoticeKey = ref('');
const navigationNoticeZIndex = ref(0);
const motionEnabled = computed(() => prefer.r.animation?.value !== false && !prefersReducedMotion.value);
const currentPage = computed(() => router.currentRef.value.child);
const currentFullPath = computed(() => {
	return router.currentRef.value == null ? '' : router.getCurrentFullPath();
});
const currentPath = computed(() => currentFullPath.value.replace(/[?#].*$/u, ''));
const isServiceConnectionSurfaceActive = computed(() => currentPath.value === '/settings/connect');
const currentDestinationId = computed(() => {
	const query = currentFullPath.value.split('?')[1]?.split('#')[0];
	return query == null ? null : new URLSearchParams(query).get('destination');
});
const indexInfo = {
	title: i18n.ts.settings,
	icon: 'ti ti-settings',
	hideHeader: true,
};

const hataCustomGlassUiItem = destinationForId('hataskey-ui')!;
const profileNavigationItem = destinationForId('account-profile')!;

const quickItems: NavItem[] = [
	destinationForId('notifications-page')!,
	destinationForId('notifications-sounds')!,
	destinationForId('display-theme')!,
	destinationForId('account-mute')!,
	destinationForId('account-drive')!,
	destinationForId('account-security')!,
];

const preferenceNavigationTargets = {
	density: generatedPreferenceSearchId('showGapBetweenNotesInTimeline'),
	noteDisplay: generatedPreferenceSearchId('showReplyTargetNote'),
	postForm: generatedPreferenceSearchId('showFixedPostForm'),
	chat: generatedPreferenceSearchId('chat.sendOnEnter'),
} as const;

const preferenceNavigationTargetExpectations = [
	{ controlId: preferenceNavigationTargets.density, preferenceKey: 'showGapBetweenNotesInTimeline' },
	{ controlId: preferenceNavigationTargets.noteDisplay, preferenceKey: 'showReplyTargetNote' },
	{ controlId: preferenceNavigationTargets.postForm, preferenceKey: 'showFixedPostForm' },
	{ controlId: preferenceNavigationTargets.chat, preferenceKey: 'chat.sendOnEnter' },
] as const;

function assertPreferenceNavigationTargets(nextCatalog: ReturnType<typeof buildSettingsCatalogV2>) {
	for (const { controlId, preferenceKey } of preferenceNavigationTargetExpectations) {
		const matches = nextCatalog.descriptors.filter(descriptor => (
			descriptor.source === 'control'
			&& descriptor.controlId === controlId
			&& descriptor.stableId === controlId
		));
		const [match] = matches;
		if (matches.length !== 1
			|| match == null
			|| match.route !== '/settings/preferences'
			|| !match.preferenceKeys.includes(preferenceKey)) {
			throw new Error(`[settings-redesign] stale preference navigation target: ${controlId}`);
		}
	}
}

const navSections: NavSection[] = settingsDestinationSections.map(section => ({
	...section,
	items: section.items.map(item => ({ ...item })),
}));

assertUniqueNavigationIds(navSections);

const primaryDestinationCountByRoute = computed(() => {
	const counts = new Map<string, number>();
	for (const destination of settingsDestinations) {
		if (destination.activation != null) continue;
		counts.set(destination.route, (counts.get(destination.route) ?? 0) + 1);
	}
	return counts;
});

function navigationIndexKey(route: string, ...parts: Array<string | null | undefined>) {
	return [route, ...parts].map(part => part ?? '').join('\u0000');
}

type NavigationCatalogIndex = {
	byControl: Map<string, Set<string>>;
	byCategory: Map<string, Set<string>>;
	byActivationCategory: Map<string, Set<string>>;
	byNonPopupActivationCategory: Map<string, Set<string>>;
	byPopup: Map<string, Set<string>>;
};

const navigationCatalogIndex = computed<NavigationCatalogIndex>(() => {
	const byControl = new Map<string, Set<string>>();
	const byCategory = new Map<string, Set<string>>();
	const byActivationCategory = new Map<string, Set<string>>();
	const byNonPopupActivationCategory = new Map<string, Set<string>>();
	const byPopup = new Map<string, Set<string>>();
	const add = (map: Map<string, Set<string>>, key: string, id: string) => {
		let ids = map.get(key);
		if (ids == null) {
			ids = new Set<string>();
			map.set(key, ids);
		}
		ids.add(id);
	};

	for (const descriptor of catalog.value?.descriptors ?? []) {
		if (descriptor.source !== 'control' || !descriptor.searchable) continue;
		const descriptorId = descriptor.stableId;
		const categoryId = descriptor.categoryId;
		const activationCategory = descriptor.activation?.category;
		add(byCategory, navigationIndexKey(descriptor.route, categoryId), descriptorId);
		add(byActivationCategory, navigationIndexKey(descriptor.route, categoryId, activationCategory), descriptorId);
		add(byActivationCategory, navigationIndexKey(descriptor.route, undefined, activationCategory), descriptorId);
		if (descriptor.activation?.kind === 'popup') {
			add(byPopup, navigationIndexKey(descriptor.route, categoryId, activationCategory, descriptor.activation.popup), descriptorId);
			add(byPopup, navigationIndexKey(descriptor.route, undefined, activationCategory, descriptor.activation.popup), descriptorId);
		} else {
			add(byNonPopupActivationCategory, navigationIndexKey(descriptor.route, categoryId, activationCategory), descriptorId);
			add(byNonPopupActivationCategory, navigationIndexKey(descriptor.route, undefined, activationCategory), descriptorId);
		}
		for (const controlId of new Set([descriptor.controlId, descriptor.stableId])) {
			if (controlId != null) add(byControl, navigationIndexKey(descriptor.route, controlId), descriptorId);
		}
	}

	return {
		byControl,
		byCategory,
		byActivationCategory,
		byNonPopupActivationCategory,
		byPopup,
	};
});

const navigationScopeCounts = computed(() => {
	const counts = new Map<string, number>();
	const index = navigationCatalogIndex.value;
	for (const item of navSections.flatMap(section => section.items)) {
		let ids: Set<string> | undefined;
		if (item.controlId != null) {
			ids = index.byControl.get(navigationIndexKey(item.route, item.controlId));
		} else if (item.categoryId != null || item.activation != null) {
			const categoryId = item.categoryId;
			if (item.activation == null) {
				ids = index.byCategory.get(navigationIndexKey(item.route, categoryId));
			} else if (item.activation.kind === 'popup') {
				ids = new Set([
					...(index.byNonPopupActivationCategory.get(navigationIndexKey(item.route, categoryId, item.activation.category)) ?? []),
					...(index.byPopup.get(navigationIndexKey(item.route, categoryId, item.activation.category, item.activation.popup)) ?? []),
				]);
			} else {
				ids = index.byActivationCategory.get(navigationIndexKey(item.route, categoryId, item.activation.category));
			}
		}
		counts.set(item.id, ids?.size ?? 0);
	}
	return counts;
});

function navigationSection(id: string): NavSection {
	const section = navSections.find(candidate => candidate.id === id);
	if (section == null) throw new Error(`[settings-redesign] missing mobile navigation section: ${id}`);
	return section;
}

// The compact overview is intentionally shallower than the desktop IA. The
// Hataskey UI feature card owns the glassUi destination, so it must not recur
// in the six general category rows below it. Misskey UI remains reachable,
// but is visually and semantically separated as a compatibility area.
const mobileOverviewSections = computed<SettingsOverviewSection[]>(() => navSections.filter(section => section.id !== 'hataskey-ui' && section.id !== 'misskey-ui'));
const mobileDeprecatedSections = computed<SettingsOverviewSection[]>(() => navSections.filter(section => section.id === 'misskey-ui'));
const tabletNavSections = computed<NavSection[]>(() => navSections.filter(section => section.id !== 'hataskey-ui'));
const tabletActiveNavigationSection = computed(() => tabletNavSections.value.find(section => section.id === tabletNavigationSection.value) ?? null);

function openCompactNavigationSection(id: string | null) {
	compactNavigationSection.value = id;
}

function tabletCategoryButton(id: string) {
	const matches = Array.from(rootEl.value?.querySelectorAll<HTMLButtonElement>('[data-settings-tablet-category-id]') ?? [])
		.filter(button => button.dataset.settingsTabletCategoryId === id);
	return matches.length === 1 ? matches[0] : null;
}

async function openTabletNavigationSection(id: string | null) {
	const previousId = tabletNavigationSection.value;
	tabletNavigationSection.value = id;
	await nextTick();
	if (id != null) {
		focusElement(tabletSectionBackEl.value);
		return;
	}
	if (previousId != null) focusElement(tabletCategoryButton(previousId));
}

function onDesktopNavigationSectionToggle(id: string, event: Event) {
	const details = event.currentTarget;
	if (!(details instanceof HTMLDetailsElement)) return;

	const isExpanded = expandedDesktopNavigationSectionIds.value.has(id);
	if (details.open === isExpanded) return;

	const next = details.open
		? new Set([id])
		: new Set(expandedDesktopNavigationSectionIds.value);
	if (!details.open) next.delete(id);
	expandedDesktopNavigationSectionIds.value = next;
	if (!details.open) return;

	void nextTick(() => {
		const nav = navEl.value;
		const summary = details.querySelector('summary');
		if (nav == null || summary == null) return;

		const inset = 8;
		const navRect = nav.getBoundingClientRect();
		const summaryRect = summary.getBoundingClientRect();
		let top = nav.scrollTop;
		if (summaryRect.top < navRect.top + inset) {
			top += summaryRect.top - navRect.top - inset;
		} else if (summaryRect.bottom > navRect.bottom - inset) {
			top += summaryRect.bottom - navRect.bottom + inset;
		} else {
			return;
		}
		nav.scrollTo({ top: Math.max(0, top), behavior: motionEnabled.value ? 'smooth' : 'auto' });
	});
}

type SettingsFilterId = 'all' | 'frequent' | 'device';
const settingsFilters: Array<{ id: SettingsFilterId; label: string }> = [
	{ id: 'all', label: copy.filters.all },
	{ id: 'frequent', label: copy.filters.frequent },
	{ id: 'device', label: copy.filters.deviceOnly },
];
const activeSettingsFilter = ref<SettingsFilterId>('all');

// `primary` only answers which link owns a route's default active state. It
// must not silently turn every primary route into a frequently used item. The
// quick grid is the six deliberately curated shortcuts; this small set adds
// only the desktop destinations explicitly promoted by this shell.
const frequentNavigationItemIds = new Set([
	'hataskey-ui',
	'display-theme',
	'timeline-display',
	'account-profile',
]);

function matchesItemActivation(item: NavItem, descriptor: NonNullable<typeof catalog.value>['descriptors'][number]) {
	if (item.activation == null) return true;
	if (descriptor.activation == null || item.activation.category !== descriptor.activation.category) return false;
	return item.activation.kind !== 'popup'
		|| descriptor.activation.kind !== 'popup'
		|| item.activation.popup === descriptor.activation.popup;
}

function isDeviceNavigationItem(item: NavItem) {
	if (catalog.value == null) return true;
	return catalog.value.descriptors.some(descriptor => (
		descriptor.searchable
		&& !descriptor.destructive
		&& descriptor.persistence === 'device'
		&& descriptor.route === item.route
		&& (item.controlId == null || descriptor.controlId === item.controlId || descriptor.stableId === item.controlId)
		&& matchesItemActivation(item, descriptor)
	));
}

function matchesSettingsFilter(item: NavItem, isQuickItem = false) {
	if (activeSettingsFilter.value === 'all') return true;
	if (activeSettingsFilter.value === 'frequent') return isQuickItem || frequentNavigationItemIds.has(item.id);
	return isDeviceNavigationItem(item);
}

const visibleQuickItems = computed(() => quickItems.filter(item => matchesSettingsFilter(item, true)));
const visibleNavSections = computed<NavSection[]>(() => navSections.flatMap(section => {
	const items = section.items.filter(item => matchesSettingsFilter(item));
	return items.length === 0 ? [] : [{ ...section, items }];
}));

const headerActions = computed(() => []);
const headerTabs = computed(() => []);
const quickValueItems = computed<SettingsOverviewValue[]>(() => {
	const opacity = prefer.r['simpleUi.glassUiCardOpacity']?.value;
	const noteGap = prefer.r.showGapBetweenNotesInTimeline?.value;
	const visibleBottomNavigationCount = getVisibleBottomNav(prefer.r['simpleUi.bottomNav'].value as HatasabaNavItem[]).length;
	const hataskeyUiPopup = { kind: 'popup', category: 'glassUi', popup: 'hatasaba-ui2' } as const;
	return [
		...(typeof opacity === 'number' && Number.isFinite(opacity) ? [{ id: 'glass-opacity', label: copy.values.opacity, value: `${Math.round(opacity)}%`, route: '/settings/hata-custom', activation: hataskeyUiPopup }] : []),
		{ id: 'glass-ui-bubble', label: copy.values.bubble, value: glassUiBubbleLocal.value ? i18n.ts.on : i18n.ts.off, route: '/settings/hata-custom', activation: hataskeyUiPopup },
		...(typeof noteGap === 'boolean' ? [{ id: 'note-gap', label: copy.values.noteGap, value: noteGap ? copy.values.spread : copy.values.compact, route: '/settings/preferences', controlId: preferenceNavigationTargets.density }] : []),
		{ id: 'bottom-navigation', label: copy.values.bottomNavigation, value: copyx.values.bottomNavigationCount({ count: visibleBottomNavigationCount, max: HATASABA_BOTTOM_NAV_MAX }), route: '/settings/hata-custom', activation: hataskeyUiPopup },
	];
});

const settingsShellActions = createSettingsShellActions({
	clearCache,
	signout,
	signoutAll,
	confirm: os.confirm,
	labels: {
		logoutConfirm: i18n.ts.logoutConfirm,
		logoutAllConfirm: i18n.ts.logoutAllConfirm,
		logoutWillClearClientData: i18n.ts.logoutWillClearClientData,
	},
});

const destructiveItems = computed<SettingsOverviewDestructiveItem[]>(() => [
	{ id: 'clear-cache', searchId: 'settings.shell.clear-cache', label: i18n.ts.clearCache, icon: 'ti ti-trash' },
	{ id: 'logout', searchId: 'settings.shell.logout', label: i18n.ts.logout, icon: 'ti ti-logout' },
	{ id: 'logout-all', searchId: 'settings.shell.logout-all', label: i18n.ts.logoutAll, icon: 'ti ti-power' },
]);

async function runShellAction(id: string) {
	if (id !== 'clear-cache' && id !== 'logout' && id !== 'logout-all') return;
	// A shell action can clear local state or terminate the session. Treat it as
	// a route-away operation for the shared UI2 draft, then leave its own
	// existing confirmation flow untouched.
	if (!await requestSurfaceDiscard()) return;
	await settingsShellActions[id as SettingsShellActionId]();
}

function pathWithoutQueryOrHash(fullPath: string) {
	return fullPath.replace(/[?#].*$/u, '');
}

function legacyHashFromPath(fullPath: string) {
	const hashIndex = fullPath.indexOf('#');
	if (hashIndex < 0 || hashIndex === fullPath.length - 1) return null;
	const encoded = fullPath.slice(hashIndex + 1);
	try {
		return decodeURIComponent(encoded);
	} catch {
		// A malformed historical hash must keep the legacy route visible instead
		// of being silently treated as the new default surface.
		return encoded;
	}
}

function isHataCustomPath(fullPath: string) {
	return pathWithoutQueryOrHash(fullPath) === '/settings/hata-custom';
}

// A direct, hashless legacy URL is now the compatible entry point for the
// permanent Hataskey UI.  Determine this before the first render so it does
// not briefly mount the legacy general category on a reload.
const initiallyOpenHatasabaUi2Surface = isHataCustomPath(router.getCurrentFullPath())
	&& legacyHashFromPath(router.getCurrentFullPath()) == null;
const activeHataCustomCategory = ref<string | null>(initiallyOpenHatasabaUi2Surface ? 'glassUi' : null);
const activeNavigationTarget = ref<SettingsSearchNavigationTargetV2 | null>(null);
const isHatasabaUi2SurfaceActive = computed(() => (
	currentPath.value === '/settings/hata-custom' && activeHataCustomCategory.value === 'glassUi'
));

// The redesigned shell owns this route. Queryless/invalid URLs still mount a
// deterministic new destination; the old route component remains reachable
// only through the explicit gateway legacy mode.
const activePreferenceDestinationId = computed(() => {
	if (currentPath.value !== '/settings/preferences') return null;
	const requested = currentDestinationId.value;
	return parsePreferenceDestination(requested ?? '')?.id ?? 'display-general';
});

const hasSettingsBrand = (value: string) => /Hataskey|Hatask|Hatady|HataFeed|HataSNSCordUI/u.test(value);

const mobilePageTitle = computed(() => {
	if (compact.value && compactNavigationSection.value != null) {
		return [...mobileOverviewSections.value, ...mobileDeprecatedSections.value].find(section => section.id === compactNavigationSection.value)?.label ?? i18n.ts.settings;
	}
	if (currentPage.value?.route.name == null) return i18n.ts.settings;
	if (isHatasabaUi2SurfaceActive.value) return 'Hataskey UI';
	const item = navSections.flatMap(section => section.items).find(candidate => candidate.route === currentPath.value);
	return item?.label ?? i18n.ts.settings;
});

const activeNavigationItemIds = computed(() => {
	const activeIds = new Set<string>();
	const activeTarget = activeNavigationTarget.value;
	const destinationId = currentDestinationId.value;
	const preferenceDestinationId = activePreferenceDestinationId.value;
	const path = currentPath.value;

	for (const item of navSections.flatMap(section => section.items)) {
		if (activeTarget?.stableId === item.stableId
			|| destinationId === item.id
			|| destinationId === item.stableId
			|| (item.route === '/settings/preferences' && preferenceDestinationId === item.id)
			|| (
				path === item.route
				&& (
					(item.activation?.kind === 'hata-custom-category' || item.activation?.kind === 'popup')
						? activeHataCustomCategory.value === item.activation.category
						: item.primary === true && primaryDestinationCountByRoute.value.get(item.route) === 1
				)
			)) {
			activeIds.add(item.id);
		}
	}

	return activeIds;
});

const activeNavigationSectionIds = computed(() => {
	const activeSections = new Set<string>();
	for (const section of navSections) {
		if (section.items.some(item => activeNavigationItemIds.value.has(item.id))) {
			activeSections.add(section.id);
		}
	}
	return activeSections;
});

function isActive(item: NavItem): boolean {
	return activeNavigationItemIds.value.has(item.id);
}

function sectionHasActiveItem(section: NavSection): boolean {
	return activeNavigationSectionIds.value.has(section.id);
}

const expandedDesktopNavigationSectionIds = ref<Set<string>>(new Set(activeNavigationSectionIds.value));

watch(activeNavigationSectionIds, activeIds => {
	expandedDesktopNavigationSectionIds.value = new Set(activeIds);
});

const activeNavItemId = computed(() => {
	for (const section of navSections) {
		for (const item of section.items) {
			if (activeNavigationItemIds.value.has(item.id)) return item.id;
		}
	}
	return null;
});

function settingCountForItem(item: NavItem): number | null {
	if (catalogState.value !== 'ready' || catalog.value == null) return null;
	const count = navigationScopeCounts.value.get(item.id) ?? 0;
	return count > 0 ? count : null;
}

const focusableSelector = [
	'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

const searchOriginEl = ref<HTMLElement | null>(null);
let controlFocusRevision = 0;
let controlFocusCleanup: (() => void) | null = null;
let navigationRevision = 0;
let navigationWaitCleanup: (() => void) | null = null;
let navigationTargetClearTimer: number | null = null;
let lastNavigationOpener: HTMLElement | null = null;

type SettingsPopupBridgeKind = 'hatasaba-ui2' | 'earthquake' | 'ui-setup' | 'settings-transfer' | 'hatask' | 'hatady' | 'mascot';
type ActiveSettingsPopup = {
	popup: SettingsPopupBridgeKind;
	opener: HTMLElement | null;
	dispose: () => void;
};

let activeSettingsPopup: ActiveSettingsPopup | null = null;

function isSettingsPopupBridgeKind(value: string | undefined): value is SettingsPopupBridgeKind {
	return value === 'hatasaba-ui2'
		|| value === 'earthquake'
		|| value === 'ui-setup'
		|| value === 'settings-transfer'
		|| value === 'hatask'
		|| value === 'hatady'
		|| value === 'mascot';
}

function findFocusableElements() {
	return Array.from(window.document.querySelectorAll<HTMLElement>(focusableSelector)).filter(element => (
		!element.closest('[data-settings-search-overlay]') && isFocusable(element)
	));
}

function focusElement(element: HTMLElement | null | undefined) {
	if (element == null || !element.isConnected || !isFocusable(element)) return false;
	element.focus({ preventScroll: true });
	return true;
}

function focusAdjacentTo(origin: HTMLElement | null, direction: 'next' | 'previous') {
	const focusables = findFocusableElements();
	if (focusables.length === 0) return;
	const index = origin == null ? -1 : focusables.indexOf(origin);
	const offset = direction === 'next' ? 1 : -1;
	const target = focusables[(index + offset + focusables.length) % focusables.length] ?? null;
	if (!focusElement(target)) focusElement(searchButtonEl.value);
}

function closeSearch(event: SettingsSearchCloseEvent) {
	searchOpen.value = false;
	if (event.reason === 'select') return;
	const origin = searchOriginEl.value ?? searchButtonEl.value;
	void nextTick(() => window.requestAnimationFrame(() => {
		if (event.reason === 'tab') {
			focusAdjacentTo(origin, event.direction ?? 'next');
			return;
		}
		if (!focusElement(origin)) focusElement(searchButtonEl.value);
	}));
}

function cancelControlFocus() {
	++controlFocusRevision;
	controlFocusCleanup?.();
	controlFocusCleanup = null;
}

function getControlFallbackFocusTarget(target: HTMLElement) {
	let group: HTMLElement | null = target;
	while (group != null && !group.matches('[data-in-app-search-marker-id], section, fieldset, [role="group"]')) {
		group = group.parentElement;
	}
	const root = group ?? target.parentElement ?? target;
	return root.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6, [role="heading"]') ?? root;
}

function clearActiveNavigationTarget(target: SettingsSearchNavigationTargetV2) {
	if (activeNavigationTarget.value === target) activeNavigationTarget.value = null;
}

function focusControlAfterNavigation(focusTarget: NavigationFocusTarget): Promise<boolean> {
	cancelControlFocus();
	const revision = controlFocusRevision;
	const targetNavigationRevision = navigationRevision;
	const attribute = focusTarget.kind === 'group' ? 'data-settings-search-group-id' : 'data-settings-search-id';
	const waiter = waitForSettingsNavigationFocus({
		find: () => exactNavigationElement(Array.from(window.document.querySelectorAll<HTMLElement>(`[${attribute}]`))
			.filter(element => element.getAttribute(attribute) === focusTarget.id)),
		focus: target => {
			const destination = [target, ...target.querySelectorAll<HTMLElement>(focusableSelector)]
				.find(element => !element.closest('[data-settings-related]') && isFocusable(element)) ?? getControlFallbackFocusTarget(target);
			const destinationIsFocusable: boolean = isFocusable(destination);
			if (!destinationIsFocusable && !destination.hasAttribute('tabindex')) destination.setAttribute('tabindex', '-1');
			// Center plus scroll-margin (below) keeps the target outside sticky headers.
			target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
			destination.focus({ preventScroll: true });
			return window.document.activeElement === destination;
		},
		isCurrent: () => revision === controlFocusRevision && targetNavigationRevision === navigationRevision,
	});
	controlFocusCleanup = waiter.cancel;
	return waiter.promise.finally(() => {
		if (controlFocusCleanup === waiter.cancel) controlFocusCleanup = null;
	});
}

function cancelPendingNavigation() {
	++navigationRevision;
	navigationWaitCleanup?.();
	navigationWaitCleanup = null;
	if (navigationTargetClearTimer != null) window.clearTimeout(navigationTargetClearTimer);
	navigationTargetClearTimer = null;
	cancelControlFocus();
	return navigationRevision;
}

function exactNavigationElement(elements: HTMLElement[]): ExactNavigationElement {
	if (elements.length === 0) return { state: 'missing' };
	if (elements.length !== 1) return { state: 'ambiguous' };
	return { state: 'found', element: elements[0] };
}

function waitForExactNavigationElement(find: () => ExactNavigationElement, revision: number): Promise<HTMLElement | null> {
	return new Promise(resolve => {
		let observer: MutationObserver | null = null;
		let timeout: number | null = null;
		let complete = false;
		let cancel: () => void = () => {};
		const finish = (element: HTMLElement | null) => {
			if (complete) return;
			complete = true;
			observer?.disconnect();
			if (timeout != null) window.clearTimeout(timeout);
			if (navigationWaitCleanup === cancel) navigationWaitCleanup = null;
			resolve(element);
		};
		cancel = () => finish(null);
		const check = () => {
			if (revision !== navigationRevision) {
				finish(null);
				return;
			}
			const result = find();
			if (result.state === 'ambiguous') {
				finish(null);
				return;
			}
			if (result.state === 'found') finish(result.element);
		};
		navigationWaitCleanup?.();
		navigationWaitCleanup = cancel;
		observer = new MutationObserver(check);
		observer.observe(window.document.body, { childList: true, subtree: true });
		timeout = window.setTimeout(cancel, 2500);
		check();
	});
}

function findHataCustomCategoryButton(category: string) {
	return exactNavigationElement(Array.from(window.document.querySelectorAll<HTMLElement>('[data-settings-category-id]'))
		.filter(element => rootEl.value?.contains(element) && element.dataset.settingsCategoryId === category));
}

async function activateHataCustomCategory(category: string, revision: number) {
	if (category === 'glassUi' && isHatasabaUi2SurfaceActive.value) return true;
	if (category !== 'glassUi' && isHatasabaUi2SurfaceActive.value) {
		// The permanent surface deliberately replaces the old category wrapper.
		// Reveal the requested legacy category first, then use its exact injected
		// button rather than guessing which internal tab should be selected.
		activeHataCustomCategory.value = category;
		await nextTick();
		if (revision !== navigationRevision) return false;
	}
	const button = await waitForExactNavigationElement(() => findHataCustomCategoryButton(category), revision);
	if (button == null || revision !== navigationRevision) return false;
	button.click();
	activeHataCustomCategory.value = category;
	await nextTick();
	return revision === navigationRevision;
}

function findSettingsRevealButton(revealId: string) {
	return exactNavigationElement(Array.from(window.document.querySelectorAll<HTMLElement>('[data-settings-reveal-id]'))
		.filter(element => element.dataset.settingsRevealId === revealId));
}

function findLegacySearchMarker(markerId: string) {
	return exactNavigationElement(Array.from(window.document.querySelectorAll<HTMLElement>('[data-in-app-search-marker-id]'))
		.filter(element => element.dataset.inAppSearchMarkerId === markerId));
}

async function focusLegacyMarkerAfterNavigation(markerId: string, revision: number): Promise<boolean> {
	navigationWaitCleanup?.();
	const waiter = waitForSettingsNavigationFocus({
		find: () => findLegacySearchMarker(markerId),
		focus: marker => {
			if (marker.tabIndex < 0) marker.tabIndex = -1;
			marker.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
			marker.focus({ preventScroll: true });
			return window.document.activeElement === marker;
		},
		isCurrent: () => revision === navigationRevision,
	});
	navigationWaitCleanup = waiter.cancel;
	try {
		return await waiter.promise;
	} finally {
		if (navigationWaitCleanup === waiter.cancel) navigationWaitCleanup = null;
	}
}

async function activateSettingsReveal(revealId: string, revision: number) {
	const button = await waitForExactNavigationElement(() => findSettingsRevealButton(revealId), revision);
	if (button == null || revision !== navigationRevision) return false;
	button.click();
	await nextTick();
	return revision === navigationRevision;
}

function restorePopupOpener(opener: HTMLElement | null) {
	void nextTick(() => window.requestAnimationFrame(() => {
		if (!focusElement(opener)) mainEl.value?.focus({ preventScroll: true });
	}));
}

function closeSettingsPopup(state: ActiveSettingsPopup, restoreOpener = true) {
	if (activeSettingsPopup !== state) return;
	activeSettingsPopup = null;
	state.dispose();
	if (restoreOpener) restorePopupOpener(state.opener);
}

function openSettingsPopup(popup: SettingsPopupBridgeKind, opener: HTMLElement | null) {
	if (activeSettingsPopup != null) return activeSettingsPopup.popup === popup;
	const state: ActiveSettingsPopup = { popup, opener, dispose: () => {} };
	activeSettingsPopup = state;
	const { dispose } = os.popup(SettingsPopupBridge, {
		popup,
		settingsContext: settingsSearchContext,
		motionEnabled: motionEnabled.value,
	}, {
		closed: () => closeSettingsPopup(state),
	});
	state.dispose = dispose;
	return true;
}

function resolveNavigationTarget(request: SettingsSearchNavigationTargetV2): SettingsSearchNavigationTargetV2 {
	if (catalog.value == null) return request;
	const stableId = request.stableId == null ? undefined : canonicalStableIdForCatalogV2(catalog.value, request.stableId);
	const controlId = request.controlId == null ? undefined : canonicalStableIdForCatalogV2(catalog.value, request.controlId);
	const descriptor = (stableId != null ? catalog.value.byStableId.get(stableId) : undefined)
		?? (controlId != null ? catalog.value.byStableId.get(controlId) : undefined)
		?? catalog.value.descriptors.find(item => item.route === request.route && item.controlId === controlId);
	if (descriptor == null) return request;
	const resolved = {
		...request,
		...(stableId != null ? { stableId } : {}),
		...(controlId != null ? { controlId } : {}),
		...(request.activation == null && descriptor.activation != null ? { activation: descriptor.activation } : {}),
	};
	if (descriptor.route !== '/settings/preferences') return resolved;
	const canonicalId = canonicalSearchIdForDescriptor(descriptor, catalog.value.descriptors);
	return { ...resolved, stableId: descriptor.stableId, controlId: canonicalId ?? descriptor.controlId, anchor: undefined };
}

function activationSteps(activation: SettingsActivation): SettingsActivationStep[] {
	if (activation.steps != null && activation.steps.length > 0) return activation.steps;
	return [
		{ kind: 'category', id: activation.category },
		...(activation.kind === 'popup' ? [{ kind: 'popup' as const, id: activation.popup }] : []),
	];
}

function categoryForNavigationTarget(target: SettingsSearchNavigationTargetV2): string | null {
	const activation = target.activation;
	if (activation == null) return null;
	return activationSteps(activation).find((step): step is Extract<SettingsActivationStep, { kind: 'category' }> => step.kind === 'category')?.id
		?? activation.category;
}

function popupForNavigationTarget(target: SettingsSearchNavigationTargetV2): SettingsPopupBridgeKind | null {
	const activation = target.activation;
	if (activation == null) return null;
	const popup = activationSteps(activation).find((step): step is Extract<SettingsActivationStep, { kind: 'popup' }> => step.kind === 'popup')?.id;
	return isSettingsPopupBridgeKind(popup) ? popup : null;
}

function closeIrrelevantSettingsPopup(target: SettingsSearchNavigationTargetV2) {
	const active = activeSettingsPopup;
	if (active == null || popupForNavigationTarget(target) === active.popup) return;
	// A related link may originate inside the existing bridge. Dispose it before
	// opening a different popup/route, but never steal focus back to its opener.
	closeSettingsPopup(active, false);
}

/**
 * 旗鯖fork: この項目がポップアップを開くだけのものか。
 * ⚠️MkA は自前のクリック処理で router.pushByPath(to) を必ず走らせる。親側の
 *   @click.prevent はリンクの既定動作しか止められないので、ポップアップ項目を
 *   MkA のまま置くと「ポップアップが開くのに右ペインも遷移する」ことになる。
 *   そのためポップアップ項目だけ <button> で描く。
 */
function opensSettingsPopup(item: NavItem | SettingsDestination) {
	return item.activation?.kind === 'popup';
}

/** ボタンには to を渡さない（属性として出てしまうため）。 */
function navBindings(item: NavItem | SettingsDestination) {
	return opensSettingsPopup(item) ? { type: 'button' as const } : { to: item.route };
}

function staysOnHatasabaUi2Surface(target: SettingsSearchNavigationTargetV2) {
	return target.route === '/settings/hata-custom' && categoryForNavigationTarget(target) === 'glassUi';
}

function legacyHashDescriptor(fullPath: string) {
	const legacyId = legacyHashFromPath(fullPath);
	return legacyId == null ? null : catalog.value?.byLegacyId.get(legacyId) ?? null;
}

function fullPathStaysOnHatasabaUi2Surface(fullPath: string) {
	if (!isHataCustomPath(fullPath)) return false;
	const legacyId = legacyHashFromPath(fullPath);
	if (legacyId == null) return true;
	const target = legacyHashDescriptor(fullPath);
	return target != null && categoryForNavigationTarget(target) === 'glassUi';
}

async function requestSurfaceDiscard() {
	const surface = hatasabaSurface.value;
	return surface == null ? true : surface.requestDiscard();
}

function hasUnsavedHatasabaUi2Draft() {
	return isHatasabaUi2SurfaceActive.value && hatasabaSurface.value?.hasChanges === true;
}

const settingsSurfaceLeaveGuard = createSettingsSurfaceLeaveGuard({
	router: mainRouter,
	shouldBlockNavigation: fullPath => hasUnsavedHatasabaUi2Draft() && !fullPathStaysOnHatasabaUi2Surface(fullPath),
	shouldWarnBeforeUnload: hasUnsavedHatasabaUi2Draft,
	requestDiscard: requestSurfaceDiscard,
});

function pushShellRoute(fullPath: string) {
	// Shell actions ask requestDiscard before arriving here. Let the global
	// guard know this one retry is already approved, without bypassing an
	// upstream Nirax hook such as the deck/page-window handler.
	// Nirax does not invoke navHook for an identical path, so do not leave a
	// stale allowance that could authorize a later re-entry into this route.
	if (router === mainRouter && router.getCurrentFullPath() !== fullPath) settingsSurfaceLeaveGuard.allowNextNavigation(fullPath);
	router.pushByPath(fullPath);
}

async function requestSurfaceDiscardBeforeNavigation(target: SettingsSearchNavigationTargetV2) {
	if (!isHatasabaUi2SurfaceActive.value || staysOnHatasabaUi2Surface(target)) return true;
	return requestSurfaceDiscard();
}

function focusTargetForNavigation(target: SettingsSearchNavigationTargetV2): NavigationFocusTarget | null {
	if (target.activation?.focus != null) return target.activation.focus;
	if (target.route === '/settings/preferences' && target.stableId?.startsWith('settings.destination.')) return null;
	const descriptor = descriptorForNavigationTarget(target);
	if (descriptor != null && descriptor.route === '/settings/preferences') {
		if ((descriptor.unmet?.length ?? 0) > 0) return null;
		const canonicalId = canonicalSearchIdForDescriptor(descriptor, catalog.value?.descriptors ?? []);
		if (canonicalId != null) return { kind: 'control', id: canonicalId };
	}
	return target.controlId == null ? null : { kind: 'control', id: target.controlId };
}

function activeTargetForNavigation(target: SettingsSearchNavigationTargetV2, focusTarget: NavigationFocusTarget | null) {
	if (focusTarget != null) return { ...target, controlId: focusTarget.id };
	return target.anchor == null && target.stableId == null ? null : target;
}

function navigationPathForTarget(target: SettingsSearchNavigationTargetV2, focusTarget: NavigationFocusTarget | null) {
	const isShellAction = focusTarget?.kind === 'control'
		&& (focusTarget.id === 'settings.shell.clear-cache' || focusTarget.id === 'settings.shell.logout' || focusTarget.id === 'settings.shell.logout-all');
	if (isShellAction && !compact.value && currentPath.value.startsWith('/settings/')) return currentPath.value;
	if (target.route === '/settings/preferences') {
		const descriptor = descriptorForNavigationTarget(target);
		const mapped = descriptor == null ? null : destinationForSearchDescriptor(descriptor);
		const explicit = target.stableId?.startsWith('settings.destination.') ? target.stableId.slice('settings.destination.'.length) : null;
		const manifest = settingsDestinations.find(item => item.route === '/settings/preferences' && (item.controlId === target.controlId || item.controlId === target.stableId))?.id ?? null;
		const destinationId = mapped ?? (explicit != null && parsePreferenceDestination(explicit) != null ? explicit : manifest);
		if (destinationId != null) return `${target.route}?destination=${encodeURIComponent(destinationId)}`;
	}
	return target.anchor ? `${target.route}#${target.anchor}` : target.route;
}

function activeNavigationTargetMatchesCurrentPath() {
	const target = activeNavigationTarget.value;
	if (target == null || target.route !== currentPath.value) return target == null;
	return navigationPathForTarget(target, focusTargetForNavigation(target)) === router.getCurrentFullPath();
}

async function scheduleNavigationTargetActivation(target: SettingsSearchNavigationTargetV2, revision: number, opener: HTMLElement | null): Promise<boolean> {
	const focusTarget = focusTargetForNavigation(target);
	const activeTarget = activeTargetForNavigation(target, focusTarget);
	activeNavigationTarget.value = activeTarget;
	await nextTick();
	if (revision !== navigationRevision) {
		if (activeTarget != null) clearActiveNavigationTarget(activeTarget);
		return false;
	}
	const activated = await activateNavigationTarget(target, revision, opener);
	if (!activated || revision !== navigationRevision) {
		if (activeTarget != null) clearActiveNavigationTarget(activeTarget);
		return false;
	}
	if (focusTarget != null) {
		const focused = await focusControlAfterNavigation(focusTarget);
		if (activeTarget != null) clearActiveNavigationTarget(activeTarget);
		return focused;
	}
	if (target.anchor == null) {
		mainEl.value?.scrollTo({ top: 0, behavior: 'auto' });
		mainEl.value?.focus({ preventScroll: true });
		return true;
	}
	const markerFocused = await focusLegacyMarkerAfterNavigation(target.anchor, revision);
	if (!markerFocused) {
		if (activeTarget != null) clearActiveNavigationTarget(activeTarget);
		return false;
	}
	// A confirmed marker keeps its folder-disclosure target only briefly.
	navigationTargetClearTimer = window.setTimeout(() => clearActiveNavigationTarget(target), 2500);
	return true;
}

async function activateNavigationTarget(target: SettingsSearchNavigationTargetV2, revision: number, opener: HTMLElement | null) {
	const activation = target.activation;
	if (activation == null) return true;
	const steps = activationSteps(activation);
	let previousStepOrder = -1;
	const activationHasUnmetPrerequisite = (activation.unmet?.length ?? 0) > 0;

	for (const step of steps) {
		if (revision !== navigationRevision) return false;
		const stepOrder = step.kind === 'category' ? 0 : step.kind === 'popup' ? 1 : 2;
		// Activation metadata is a typed, ordered allow-list. A bad generated
		// sequence must fail rather than clicking a later UI control out of context.
		if (stepOrder < previousStepOrder) return false;
		previousStepOrder = stepOrder;

		if (step.kind === 'category') {
			// The permanent glassUi surface intentionally unmounts the legacy
			// category buttons. A same-category search result is already revealed;
			// waiting for the old DOM here would otherwise incur a 2500ms timeout.
			if (step.id === 'glassUi' && isHatasabaUi2SurfaceActive.value) {
				await nextTick();
				continue;
			}
			if (!await activateHataCustomCategory(step.id, revision)) return false;
			continue;
		}
		if (step.kind === 'popup') {
			// The permanent Hataskey UI surface replaces this popup inside the
			// redesigned shell. Its shared body retains the generated control IDs.
			if (step.id === 'hatasaba-ui2' && isHatasabaUi2SurfaceActive.value) {
				await nextTick();
				continue;
			}
			if (!isSettingsPopupBridgeKind(step.id) || !openSettingsPopup(step.id, opener)) return false;
			await nextTick();
			continue;
		}
		// Unmet policy/consent/preference/runtime-data conditions are descriptive
		// metadata only. We never flip them merely to reveal a nested setting.
		if (activationHasUnmetPrerequisite) continue;
		if (!await activateSettingsReveal(step.id, revision)) return false;
	}

	return revision === navigationRevision;
}

function descriptorForNavigationTarget(target: SettingsSearchNavigationTargetV2) {
	if (catalog.value == null) return null;
	// Search results carry the authoritative stable id. Resolve it first so a
	// same-route related link cannot accidentally inherit another descriptor's
	// prerequisite explanation.
	if (target.stableId != null) {
		const stable = catalog.value.byStableId.get(canonicalStableIdForCatalogV2(catalog.value, target.stableId));
		if (stable != null) return stable;
	}
	if (target.controlId != null) {
		const controlId = canonicalStableIdForCatalogV2(catalog.value, target.controlId);
		const control = catalog.value.descriptors.find(descriptor => descriptor.controlId === controlId);
		if (control != null) return control;
	}
	if (target.anchor != null) return catalog.value.byLegacyId.get(target.anchor) ?? null;
	return null;
}

function navigationPrerequisiteKinds(target: SettingsSearchNavigationTargetV2): SettingsActivationUnmetV2['kind'][] {
	const descriptor = descriptorForNavigationTarget(target);
	const unmet = [
		...(descriptor?.unmet ?? []),
		...(descriptor?.activation?.unmet ?? []),
		...(target.activation?.unmet ?? []),
	];
	return [...new Set(unmet.map(item => item.kind))];
}

function setNavigationNotice(target: SettingsSearchNavigationTargetV2): void {
	const descriptor = descriptorForNavigationTarget(target);
	const kinds = navigationPrerequisiteKinds(target);
	if (descriptor == null || kinds.length === 0) {
		navigationNoticeMessage.value = null;
		navigationNoticeKey.value = '';
		return;
	}
	const messages = kinds.map(kind => copyx.searchPrerequisite[kind === 'runtime-data' ? 'runtimeData' : kind]({ label: descriptor.label }));
	navigationNoticeKey.value = `${descriptor.stableId}:${kinds.join(',')}`;
	navigationNoticeZIndex.value = os.claimZIndex('high');
	navigationNoticeMessage.value = messages.join(' ');
}

function clearNavigationNotice(): void {
	navigationNoticeMessage.value = null;
	navigationNoticeKey.value = '';
}

async function goToSetting(request: SettingsSearchNavigationTargetV2): Promise<boolean> {
	const target = resolveNavigationTarget(request);
	if (!await requestSurfaceDiscardBeforeNavigation(target)) return false;
	clearNavigationNotice();
	closeIrrelevantSettingsPopup(target);
	const revision = cancelPendingNavigation();
	const focusTarget = focusTargetForNavigation(target);
	const opener = searchOpen.value ? searchOriginEl.value : lastNavigationOpener;
	lastNavigationOpener = null;
	const directPopup = popupForNavigationTarget(target);
	if (directPopup != null && target.route === '/settings/hata-custom' && !staysOnHatasabaUi2Surface(target)) {
		const opened = openSettingsPopup(directPopup, opener);
		if (opened) activeNavigationTarget.value = target;
		return opened;
	}
	const path = navigationPathForTarget(target, focusTarget);
	pushShellRoute(path);
	const navigated = await scheduleNavigationTargetActivation(target, revision, opener);
	if (navigated) setNavigationNotice(target);
	return navigated;
}

async function onSearchSelect(target: SettingsSearchNavigationTargetV2) {
	// Keep the combobox mounted until the route/category/popup activation has
	// actually been accepted. A declined draft discard or failed exact target
	// leaves keyboard focus in the search panel instead of losing it to the page.
	if (await goToSetting(target)) closeSearch({ reason: 'select' });
}

function matchesFallbackRoute(sourceRoute: string | undefined, path: string) {
	if (sourceRoute == null) return false;
	const expected = sourceRoute.split('/').filter(Boolean);
	const actual = path.split('/').filter(Boolean);
	return expected.length === actual.length && expected.every((segment, index) => segment.startsWith(':') || segment === actual[index]);
}

const routeFallback = computed(() => catalog.value?.descriptors.find(descriptor => descriptor.isFallback && matchesFallbackRoute(descriptor.sourceRoute, currentPath.value)) ?? null);

function relatedSourcesForCurrentNavigation() {
	if (catalog.value == null) return [];
	return relatedSourcesForSettingsNavigationV2({
		descriptors: catalog.value.descriptors,
		byStableId: catalog.value.byStableId,
		currentRoute: currentPath.value,
		activeTarget: activeNavigationTarget.value,
		activeHataCustomCategory: activeHataCustomCategory.value,
		fallback: routeFallback.value,
	});
}

const pageOwnedRelatedRoutes: Readonly<Record<string, readonly string[]>> = {
	'/settings/profile': ['/settings/avatar-decoration'],
};

const routeRelatedItems = computed<SettingsRelatedLink[]>(() => {
	if (catalog.value == null) return [];
	const sources = relatedSourcesForCurrentNavigation();
	const items: SettingsRelatedLink[] = [];
	for (const source of sources) {
		for (const relation of source.related) {
			const related = catalog.value.byStableId.get(relation.stableId);
			if (related == null || !related.searchable || items.some(item => item.stableId === related.stableId)) continue;
			if (pageOwnedRelatedRoutes[currentPath.value]?.includes(related.route) === true) continue;
			const relatedTarget = { stableId: related.stableId, route: related.route, anchor: related.anchor, controlId: related.controlId, ...(related.activation ? { activation: related.activation } : {}) } satisfies SettingsSearchNavigationTargetV2;
			const relatedDestination = related.route === '/settings/preferences' ? destinationForSearchDescriptor(related) : null;
			if (related.route !== '/settings/preferences' && related.route === currentPath.value) continue;
			if (related.route === '/settings/preferences' && relatedDestination != null && relatedDestination === activePreferenceDestinationId.value) continue;
			if (navigationPathForTarget(relatedTarget, focusTargetForNavigation(relatedTarget)) === router.getCurrentFullPath()) continue;
			items.push({
				stableId: related.stableId,
				route: related.route,
				anchor: related.anchor,
				controlId: related.controlId,
				...(related.activation ? { activation: related.activation } : {}),
				label: related.label,
				reason: relation.reason,
				destructive: related.destructive === true,
			});
		}
	}
	return items;
});

function closestFromEventTarget(target: EventTarget | null, selector: string) {
	return target instanceof Element ? target.closest<HTMLElement>(selector) : null;
}

async function activateManualHataCustomCategory(category: string, button: HTMLElement) {
	if (isHatasabaUi2SurfaceActive.value && category !== 'glassUi' && !await requestSurfaceDiscard()) return;
	cancelPendingNavigation();
	activeNavigationTarget.value = null;
	button.click();
	activeHataCustomCategory.value = category;
}

function onLegacyContentClickCapture(event: MouseEvent) {
	const categoryButton = closestFromEventTarget(event.target, '[data-settings-category-id]');
	if (categoryButton?.dataset.settingsCategoryId != null) {
		if (event.isTrusted && isHatasabaUi2SurfaceActive.value && categoryButton.dataset.settingsCategoryId !== 'glassUi') {
			event.preventDefault();
			event.stopPropagation();
			void activateManualHataCustomCategory(categoryButton.dataset.settingsCategoryId, categoryButton);
			return;
		}
		if (event.isTrusted) {
			cancelPendingNavigation();
			activeNavigationTarget.value = null;
		}
		activeHataCustomCategory.value = categoryButton.dataset.settingsCategoryId;
		return;
	}

	const launcher = closestFromEventTarget(event.target, '[data-settings-popup-launcher]');
	const popup = launcher?.dataset.settingsPopupLauncher;
	if (launcher != null && isSettingsPopupBridgeKind(popup)) {
		// This capture handler exists only in the redesigned shell. It prevents the
		// legacy button's own os.popup call, so a direct click cannot create two windows.
		event.preventDefault();
		event.stopPropagation();
		if (popup === 'hatasaba-ui2') {
			void goToSetting(hataCustomGlassUiItem);
			return;
		}
		if (event.isTrusted) {
			cancelPendingNavigation();
			activeNavigationTarget.value = null;
		}
		void openSettingsPopup(popup, launcher);
		return;
	}

	const navigationOpener = closestFromEventTarget(event.target, 'button, a[href]');
	if (event.isTrusted && navigationOpener != null) {
		cancelPendingNavigation();
		activeNavigationTarget.value = null;
		lastNavigationOpener = navigationOpener;
	}
}

async function requestOpenLegacy() {
	if (!await requestSurfaceDiscard()) return;
	emit('openLegacy');
}

async function onSurfaceClose() {
	// The body has already asked the draft to discard before emitting close.
	await goSettingsTop();
}

function onSurfaceSaved() {
	activeNavigationTarget.value = null;
}

async function onSurfaceSideStudio() {
	if (!await requestSurfaceDiscard()) return;
	settingsSurfaceLeaveGuard.allowNextNavigation('/hata-side-studio');
	mainRouter.push('/hata-side-studio');
}

function activeHatasabaUi2Surface(): HatasabaUi2SurfaceHandle | null {
	return isHatasabaUi2SurfaceActive.value ? hatasabaSurface.value ?? null : null;
}

/**
 * A compact overview can request preview before the route's permanent surface
 * has mounted.  Watch the template ref rather than assuming one nextTick is
 * enough for a nested router/category activation, and never create a second
 * editor just to satisfy the preview request.
 */
function waitForHatasabaUi2Surface(): Promise<HatasabaUi2SurfaceHandle | null> {
	const current = activeHatasabaUi2Surface();
	if (current != null) return Promise.resolve(current);

	return new Promise(resolve => {
		let finished = false;
		let timeout: number | null = null;
		let stop: (() => void) | null = null;
		const finish = (surface: HatasabaUi2SurfaceHandle | null) => {
			if (finished) return;
			finished = true;
			stop?.();
			if (timeout != null) window.clearTimeout(timeout);
			resolve(surface);
		};
		const check = () => {
			const surface = activeHatasabaUi2Surface();
			if (surface != null) finish(surface);
		};
		stop = watch(() => [isHatasabaUi2SurfaceActive.value, hatasabaSurface.value], check, { flush: 'post' });
		timeout = window.setTimeout(() => finish(null), 2500);
		void nextTick(check);
	});
}

async function openHatasabaUi2Preview() {
	if (!isHatasabaUi2SurfaceActive.value) {
		await goToSetting(hataCustomGlassUiItem);
	}
	// The permanent surface owns the one shared editor object. Do not create a
	// popup or a second draft simply to show a mobile preview.
	const surface = await waitForHatasabaUi2Surface();
	surface?.openPreview();
}

function openSearch() {
	searchOriginEl.value = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : searchButtonEl.value;
	searchOpen.value = true;
}

function isTextEntryTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	return target.isContentEditable || target.matches('input, textarea, select, [contenteditable="true"]');
}

function onGlobalKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented || event.isComposing || searchOpen.value) return;
	if (event.key.toLocaleLowerCase('en-US') !== 'k') return;
	const searchModifierPressed = isApplePlatform.value ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
	if (!searchModifierPressed || event.altKey || event.shiftKey || isTextEntryTarget(event.target)) return;

	event.preventDefault();
	openSearch();
}

async function loadCatalog() {
	catalog.value = null;
	catalogState.value = 'pending';
	await initIntlString(true).catch(error => { if (_DEV_) console.warn('[settings-search-v2] intl initialization failed', error); });
	const [legacyResult, controlResult] = await Promise.allSettled([
		import('search-index:settings'),
		import('search-index-v2:settings'),
	]);
	const legacyItems = legacyResult.status === 'fulfilled' ? genSearchIndexes(legacyResult.value.searchIndexes as SearchIndexItem[]) : [];
	let generatedControlItems: SettingsControlCatalogItemV2[] = [];
	if (controlResult.status === 'fulfilled') {
		try { generatedControlItems = toSettingsControlCatalogItemsV2(controlResult.value.settingsControlSearchIndexV2, i18n.ts as unknown as Record<string, unknown>); } catch (error) { if (_DEV_) console.warn('[settings-search-v2] control catalog adapter failed', error); }
	}
	try {
		const controlItems = mergeRedesignedPreferenceSearchItems(generatedControlItems);
		const stableIdAliases = redesignedPreferenceStableIdAliases(generatedControlItems);
		const destinationItems = settingsDestinationCatalogItemsV2();
		if (legacyItems.length === 0 && controlItems.length === 0) { catalogState.value = 'error'; return; }
		const nextCatalog = buildSettingsCatalogV2(legacyItems, controlItems, settingsCatalogPresentation, destinationItems, stableIdAliases);
		suppressLegacyPreferenceSearchMarkers(nextCatalog);
		assertPreferenceNavigationTargets(nextCatalog);
		catalog.value = nextCatalog;
		catalogState.value = 'ready';
		syncHataCustomRoutePresentation();
	} catch (error) {
		if (_DEV_) console.warn('[settings-search-v2] catalog build failed', error);
		catalogState.value = 'error';
	}
}

let appliedHataCustomDeepLink: string | null = null;

/**
 * Keep the old deep-link contract without mounting its general tab by default.
 * A plain `/settings/hata-custom` becomes the permanent glassUi surface, while
 * a known historical marker hash is resolved through the catalog exactly once.
 */
function syncHataCustomRoutePresentation() {
	const fullPath = router.getCurrentFullPath();
	if (!isHataCustomPath(fullPath)) {
		appliedHataCustomDeepLink = null;
		return;
	}

	const legacyId = legacyHashFromPath(fullPath);
	if (legacyId == null) {
		appliedHataCustomDeepLink = fullPath;
		// Do not cancel an explicit search/category activation that has already
		// claimed this route. It will choose glassUi or the requested old tab.
		if (activeNavigationTarget.value?.route !== currentPath.value) activeHataCustomCategory.value = 'glassUi';
		return;
	}
	if (catalogState.value !== 'ready' || catalog.value == null || appliedHataCustomDeepLink === fullPath) return;
	appliedHataCustomDeepLink = fullPath;
	const descriptor = catalog.value.byLegacyId.get(legacyId);
	if (descriptor == null) {
		// Unknown historical anchors must retain the old page rather than being
		// silently redirected to glassUi.
		activeHataCustomCategory.value = null;
		return;
	}
	if (descriptor.activation == null) {
		// A known legacy marker without a proved activation is still meaningful;
		// mount the old wrapper so its existing marker/folder behavior can handle it.
		activeHataCustomCategory.value = null;
	}
	if (descriptor.route !== currentPath.value) {
		// A hash on this compatibility route is never permission to jump to an
		// unrelated settings route. Keep the historical surface visible instead.
		activeHataCustomCategory.value = null;
		return;
	}

	const revision = cancelPendingNavigation();
	const target: SettingsSearchNavigationTargetV2 = {
		stableId: descriptor.stableId,
		route: descriptor.route,
		anchor: descriptor.anchor,
		controlId: descriptor.controlId,
		activation: descriptor.activation,
	};
	closeIrrelevantSettingsPopup(target);
	void scheduleNavigationTargetActivation(target, revision, null);
}

function redirectDefaultPage() {
	// ⚠️設定の外にいるときは絶対に動かないこと。ResizeObserver から呼ばれるため、
	//   設定を離れたあとの幅変更でも走ってしまい、利用者を設定へ引き戻していた。
	if (!isSettingsFullPath(router.getCurrentFullPath())) return;
	if (compact.value || router.currentRef.value.child?.route.name != null) return;
	const revision = cancelPendingNavigation();
	activeNavigationTarget.value = null;
	router.replace('/settings/hata-custom');
	void nextTick(async () => {
		if (revision !== navigationRevision) return;
		await activateHataCustomCategory('glassUi', revision);
	});
}

function updateCompact() {
	const width = rootEl.value?.offsetWidth ?? 0;
	compact.value = width <= 680;
	tablet.value = width > 680 && width <= 900;
	if (!compact.value) compactNavigationSection.value = null;
	if (!tablet.value) tabletNavigationSection.value = null;
	redirectDefaultPage();
}

async function goSettingsTop() {
	if (!await requestSurfaceDiscard()) return;
	// ⚠️確認を待つ間に別の画面へ移っていることがある。そこで無条件に /settings を
	//   押すと、行こうとした先から設定へ引き戻してしまう。設定にいるときだけ押す。
	if (!isSettingsFullPath(router.getCurrentFullPath())) return;
	pushShellRoute('/settings');
}

/** 旗鯖fork: いま設定の中にいるか。⚠️下位ルートも含める。 */
function isSettingsFullPath(fullPath: string) {
	const path = fullPath.split('?')[0].split('#')[0];
	return path === '/settings' || path.startsWith('/settings/');
}

async function goCompactBack() {
	if (compactNavigationSection.value != null) {
		compactNavigationSection.value = null;
		return;
	}
	if (currentPage.value?.route.name != null) {
		await goSettingsTop();
		return;
	}
	if (!await requestSurfaceDiscard()) return;
	if (window.history.length > 1) {
		window.history.back();
		return;
	}
	pushShellRoute('/');
}

const resizeObserver = new ResizeObserver(updateCompact);
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let shellListenersActive = false;

function syncReducedMotion(event?: MediaQueryListEvent) {
	prefersReducedMotion.value = event?.matches ?? reducedMotionQuery.matches;
}

function activateShell() {
	settingsSurfaceLeaveGuard.install();
	if (!shellListenersActive) {
		if (rootEl.value != null) resizeObserver.observe(rootEl.value);
		window.addEventListener('keydown', onGlobalKeydown);
		reducedMotionQuery.addEventListener('change', syncReducedMotion);
		shellListenersActive = true;
	}
	syncReducedMotion();
	updateCompact();
}

function deactivateShell() {
	settingsSurfaceLeaveGuard.dispose();
	cancelPendingNavigation();
	activeNavigationTarget.value = null;
	if (!shellListenersActive) return;
	resizeObserver.disconnect();
	window.removeEventListener('keydown', onGlobalKeydown);
	reducedMotionQuery.removeEventListener('change', syncReducedMotion);
	shellListenersActive = false;
}

onMounted(() => {
	isApplePlatform.value = /Mac|iPhone|iPad|iPod/u.test(navigator.platform);
	searchShortcutHint.value = isApplePlatform.value ? '⌘K' : 'Ctrl K';
	activateShell();
	void loadCatalog();
});

onActivated(activateShell);
onDeactivated(deactivateShell);

watch(router.currentRef, () => {
	if (currentPage.value?.route.name != null) compactNavigationSection.value = null;
	if (!tablet.value) tabletNavigationSection.value = null;
	if (!activeNavigationTargetMatchesCurrentPath()) activeNavigationTarget.value = null;
	if (currentPath.value !== '/settings/hata-custom') activeHataCustomCategory.value = null;
	syncHataCustomRoutePresentation();
	redirectDefaultPage();
});
onUnmounted(deactivateShell);

const settingsSearchContext: SettingsSearchV2Context = {
	catalog,
	navigateToSetting: goToSetting,
	activeNavigationTarget,
	motionEnabled,
	inlineRelated: false,
};

provide(settingsSearchV2ContextKey, settingsSearchContext);

provideReactiveMetadata(ref(indexInfo));
definePage(() => indexInfo);
</script>

<style lang="scss">
@use './settings-redesign-brand.scss';
</style>

<style lang="scss" module>
.scope {
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	box-sizing: border-box;
	block-size: calc(100cqh - (var(--MI-stickyTop, 0px) + var(--MI-stickyBottom, 0px)));
	overflow: clip;
	min-block-size: 0;
	--settings-bg: light-dark(color-mix(in srgb, var(--MI_THEME-bg) 90%, var(--MI_THEME-panel)), color-mix(in srgb, var(--MI_THEME-bg) 82%, var(--MI_THEME-panel)));
	--settings-surface: var(--MI_THEME-panel);
	--settings-border: color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent);
	--settings-muted: color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent);
	container-type: inline-size;
	position: relative;
	border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent));
	border-radius: 26px;
	background: var(--settings-bg, var(--MI_THEME-bg));
	color: var(--MI_THEME-fg);
	font-family: 'Noto Sans JP', var(--MI-font), sans-serif;
	line-break: strict;
	word-break: normal;
	text-wrap: pretty;
}

.navigationNoticeHost {
	position: fixed;
	inset: max(12px, env(safe-area-inset-top)) 12px auto;
	display: flex;
	justify-content: center;
	width: calc(100% - 24px);
	pointer-events: none;
}

.navigationNoticeHost > * {
	width: min(100%, 720px);
	max-width: 720px;
	pointer-events: auto;
}

.navigationNoticeEnterActive,
.navigationNoticeLeaveActive {
	transition: opacity 220ms ease, transform 220ms ease;
}

.navigationNoticeLeaveActive { transition-duration: 150ms; }

.navigationNoticeEnterFrom,
.navigationNoticeLeaveTo {
	opacity: 0;
	transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
	.navigationNoticeEnterActive,
	.navigationNoticeLeaveActive {
		animation: none !important;
		transition: none !important;
	}
}

.scope[data-motion-enabled='false'] {
	scroll-behavior: auto;

	:deep(*) {
		animation: none !important;
		scroll-behavior: auto !important;
		transition: none !important;
	}
}

.skip { position: absolute; z-index: 2; top: 8px; left: 12px; transform: translateY(-160%); border-radius: 999px; padding: 8px 12px; background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); font-size: .8rem; &:focus { transform: translateY(0); } }
.header { display: flex; align-items: center; gap: 18px; padding: 20px 26px; }
.compactHeader { display: block; padding: 12px 14px 14px; }
/* 旗鯖fork: 画面を移ると見出しが左右に滑って入れ替わる。
   ⚠️:global を付けないと、CSS Modules がハッシュ化して Transition の名前と噛み合わない。 */
:global(.settings-title-enter-active), :global(.settings-title-leave-active) { transition: opacity .2s ease, transform .24s cubic-bezier(.2, .9, .2, 1); display: inline-block; }
:global(.settings-title-enter-from) { opacity: 0; transform: translateX(12px); }
:global(.settings-title-leave-to) { opacity: 0; transform: translateX(-12px); }
@media (prefers-reduced-motion: reduce) {
	:global(.settings-title-enter-active), :global(.settings-title-leave-active) { transition: none; }
}
.compactTop { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center; gap: 10px; }
.compactBack, .compactPreview { display: grid; width: 44px; height: 44px; place-items: center; border: 0; border-radius: 50%; background: transparent; color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: 1.15rem; touch-action: manipulation; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } }
.compactPreview { background: color-mix(in srgb, var(--MI_THEME-accent) 12%, var(--settings-surface, var(--MI_THEME-panel))); color: var(--MI_THEME-accent); }
.compactTitle { overflow: hidden; margin: 0; color: var(--MI_THEME-fg); font-size: 1.375rem; font-weight: 800; letter-spacing: -.02em; line-height: 1.2; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.title { margin: 0; font-size: 1.35rem; font-weight: 800; letter-spacing: -.01em; line-height: 1; white-space: nowrap; }
.searchTrigger { display: flex; min-width: 0; max-width: 440px; flex: 1 1 310px; align-items: center; gap: 10px; min-height: 44px; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 999px; padding: 9px 18px; background: var(--settings-surface, var(--MI_THEME-panel)); box-shadow: 0 1px 2px color-mix(in srgb, var(--MI_THEME-fg) 6%, transparent); color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); cursor: pointer; font: inherit; font-size: .82rem; text-align: start; touch-action: manipulation; &:hover { border-color: color-mix(in srgb, var(--MI_THEME-accent) 45%, var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent))); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } > i { color: var(--MI_THEME-accent); font-size: 1.05rem; } }
.searchLabel { overflow: hidden; flex: 1; text-overflow: ellipsis; white-space: nowrap; }
.searchShortcut { flex: none; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 999px; padding: 3px 8px; color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); font: 600 .65rem/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: nowrap; }
.headerActions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.headerAvatar { display: none; width: 44px; height: 44px; }
.uiPill, .legacyTop { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border-radius: 999px; font: inherit; font-size: .75rem; font-weight: 700; white-space: nowrap; }
.uiPill { min-height: 36px; padding: 6px 10px; background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); font-size: .7rem; }
.uiPillLabel { overflow: hidden; max-inline-size: 10ch; text-overflow: ellipsis; }
.legacyTop { min-height: 44px; padding: 8px 14px; }
.legacyTop { border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); background: var(--settings-surface, var(--MI_THEME-panel)); color: var(--MI_THEME-fg); cursor: pointer; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } }
.layout { min-block-size: 0; display: grid; grid-template-columns: minmax(226px, 272px) minmax(0, 1fr); align-items: stretch; gap: 22px; overflow: clip; padding: 0 22px 24px; }
.nav, .contentCard { border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 22px; background: var(--settings-surface, var(--MI_THEME-panel)); box-shadow: 0 2px 10px color-mix(in srgb, var(--MI_THEME-fg) 5%, transparent); }
/* 旗鯖fork: ⚠️scrollbar-gutter は重ね描き方式のスクロールバーでは効かない。
   端に余白を持たせて、件数バッジや枠がバーの下へ潜らないようにする。 */
.nav { min-block-size: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 14px; padding-inline-end: 20px; }
.profileRow { display: flex; gap: 10px; align-items: stretch; margin-bottom: 14px; }
.profile { min-height: 64px; color: var(--MI_THEME-fg); text-decoration: none; &:hover { text-decoration: none; } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } }
.profile { display: flex; min-width: 0; flex: 1; align-items: center; gap: 11px; border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 36%, var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent))); border-radius: 18px; padding: 10px 12px; background: light-dark(color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--settings-surface, var(--MI_THEME-panel))), color-mix(in srgb, var(--MI_THEME-accent) 18%, var(--settings-surface, var(--MI_THEME-panel)))); }
.avatar { width: 40px; height: 40px; flex: none; }
.profileText { display: grid; min-width: 0; gap: 2px; strong, small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } strong { font-size: .82rem; } small { color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); font-size: .68rem; } }
.filterPills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.filter { display: inline-flex; min-height: 44px; align-items: center; border: 0; border-radius: 999px; padding: 6px 13px; background: var(--MI_THEME-buttonBg); color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: .7rem; font-weight: 700; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } }
.filterActive { background: var(--MI_THEME-fg); color: var(--MI_THEME-bg); }
.sectionTitle { margin: 14px 0 8px; padding: 0 10px; color: var(--MI_THEME-accent); font-size: .74rem; font-weight: 700; letter-spacing: .03em; line-height: 1.45; }
.navSection > .sectionTitle { display: flex; min-height: 44px; align-items: center; gap: 8px; margin: 14px 0 8px; padding: 0 10px; color: color-mix(in srgb, var(--MI_THEME-fg) 88%, transparent); font-weight: 700; cursor: pointer; list-style: none; &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } &::-webkit-details-marker { display: none; } > i:first-child { color: var(--MI_THEME-accent); font-size: 1rem; } > span { min-width: 0; overflow: hidden; flex: 1; text-overflow: ellipsis; white-space: nowrap; } > i:last-child { display: inline-block; flex: none; transition: transform 150ms ease; } }
.navSection[open] > .sectionTitle > i:last-child { transform: rotate(90deg); }
.navSectionActive > .sectionTitle { color: var(--MI_THEME-accent); font-weight: 800; }
.navSectionActive > .sectionTitle::after { content: ''; flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--MI_THEME-accent); }
.cherrypickSection > .sectionTitle { border-block-end: 1px dashed color-mix(in srgb, var(--MI_THEME-accent) 60%, var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent))); color: var(--MI_THEME-accent); }
.cherrypickSection > .sectionTitle > i:first-child { color: inherit; }
.cherrypickNavLink { margin-block: 3px; border: 1px dashed color-mix(in srgb, var(--MI_THEME-accent) 60%, var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent))); color: var(--MI_THEME-accent); &:hover { border-color: var(--MI_THEME-accent); } }
.deprecatedNavSection { opacity: .68; }
.deprecatedNavSection > .sectionTitle, .deprecatedNavSection .navLink { color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); }
.quickGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.quickItem { display: flex; box-sizing: border-box; width: 100%; min-width: 0; min-height: 44px; align-items: center; gap: 8px; appearance: none; cursor: pointer; font: inherit; text-align: start; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 16px; padding: 8px 11px; background: var(--settings-bg, var(--MI_THEME-bg)); color: var(--MI_THEME-fg); font-size: .75rem; text-decoration: none; &:hover { border-color: color-mix(in srgb, var(--MI_THEME-accent) 45%, var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent))); text-decoration: none; } > i { color: var(--MI_THEME-accent); font-size: 1rem; } > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
.links { display: grid; gap: 3px; }
.navLink { display: flex; box-sizing: border-box; width: 100%; min-height: 44px; align-items: center; gap: 10px; appearance: none; border: 0; background: transparent; cursor: pointer; font: inherit; text-align: start; border-radius: 999px; padding: 7px 14px; color: var(--MI_THEME-fg); font-size: .84rem; text-decoration: none; touch-action: manipulation; &:hover { background: var(--MI_THEME-buttonHoverBg); text-decoration: none; } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } > i { opacity: .8; font-size: 1rem; } > span:not(.countBadge) { min-width: 0; flex: 1; line-break: strict; text-wrap: pretty; } }
/* 旗鯖fork: ⚠️塗りつぶさないこと。アイコンと文字をアクセント色にし、
   下地はごく淡く敷くだけにする（Hataskey UI の上部タブと同じ考え方）。 */
.navLinkActive, .navLinkActive:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent); color: var(--MI_THEME-accent); font-weight: 750; box-shadow: inset 3px 0 0 var(--MI_THEME-accent); > i { color: var(--MI_THEME-accent); opacity: 1; } }
.tabletPrimaryLink { margin-top: 14px; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); background: var(--settings-surface, var(--MI_THEME-panel)); > i:last-child { margin-left: auto; } }
/* 旗鯖fork: ⚠️ここは .tabletPrimaryLink と .navLinkActive の2クラスで
   詳細度が高く、.navLinkActive 単独の指定に勝ってしまう。
   ⚠️塗りつぶしをやめ、他と同じ「アクセント色の文字＋淡い下地」に揃える。 */
.tabletPrimaryLink.navLinkActive { border-color: var(--MI_THEME-accent); background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent); color: var(--MI_THEME-accent); font-weight: 750; }
.tabletCategoryLink, .tabletSectionBack { display: flex; box-sizing: border-box; width: 100%; min-height: 48px; align-items: center; gap: 10px; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 999px; padding: 8px 13px; background: var(--settings-bg, var(--MI_THEME-bg)); color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: .8rem; font-weight: 700; text-align: start; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } > i:first-child { color: var(--MI_THEME-accent); font-size: 1rem; } > i:last-child { margin-left: auto; } }
.tabletCategoryLink + .tabletCategoryLink { margin-top: 8px; }
.tabletCategoryActive, .tabletCategoryActive:hover { border-color: var(--MI_THEME-accent); background: color-mix(in srgb, var(--MI_THEME-accent) 14%, var(--settings-surface, var(--MI_THEME-panel))); color: var(--MI_THEME-accent); box-shadow: inset 3px 0 0 var(--MI_THEME-accent); }
.tabletCherrypickLink { border-style: dashed; border-color: color-mix(in srgb, var(--MI_THEME-accent) 60%, var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent))); color: var(--MI_THEME-accent); }
.tabletCherrypickLink > i:first-child { color: inherit; }
.tabletDeprecatedLink { opacity: .68; }
.tabletSectionBack { margin-top: 14px; margin-bottom: 8px; border-style: dashed; }
.deprecatedBadge { flex: none; margin-left: auto; border-radius: 999px; padding: 3px 7px; background: color-mix(in srgb, var(--MI_THEME-warn) 14%, var(--settings-bg, var(--MI_THEME-bg))); color: var(--MI_THEME-warn); font-size: .62rem; font-weight: 800; letter-spacing: 0; }
.countBadge { flex: none; border-radius: 999px; color: color-mix(in srgb, var(--MI_THEME-fg) 72%, transparent); font-size: .72rem; font-variant-numeric: tabular-nums; line-height: 1; }
.sessionActions { margin-top: 14px; border-top: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); padding-top: 2px; }
.destructiveAction { display: flex; box-sizing: border-box; width: 100%; min-height: 44px; align-items: center; gap: 10px; border: 0; border-radius: 14px; padding: 8px 12px; background: transparent; color: var(--MI_THEME-error); cursor: pointer; font: inherit; font-size: .78rem; font-weight: 700; text-align: start; &:hover { background: color-mix(in srgb, var(--MI_THEME-error) 10%, transparent); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-error) 55%, transparent); outline-offset: 2px; } > i { font-size: 1rem; } }
.navLinkActive .countBadge { color: var(--MI_THEME-accent); opacity: .85; }
.legacyMenu { display: flex; width: 100%; min-height: 44px; align-items: center; justify-content: center; gap: 7px; margin-top: 16px; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 999px; background: var(--settings-surface, var(--MI_THEME-panel)); color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: .76rem; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } }
.main { min-width: 0; min-block-size: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding-inline-end: 8px; outline: 0; }
.main :deep([data-settings-search-id]) { scroll-margin-block: 96px; }
.backToTop { display: none; }
.contentCard { min-height: 0; min-block-size: 100%; padding: 20px; }
.contentCard.contentCardSurfaceActive { min-height: 0; border: 0; border-radius: 0; padding: 0; background: transparent; box-shadow: none; }
.legacyContent :deep(.rfqxtzch > .toggle) {
	display: grid;
	place-items: center;
}

@container (max-width: 900px) {
	.header { flex-wrap: nowrap; gap: 14px; padding: 18px 20px; }
	.headerActions { display: none; }
	.searchTrigger { max-width: none; flex: 1 1 0; }
	.layout { grid-template-columns: 224px minmax(0, 1fr); gap: 14px; padding: 0 14px 16px; }
	.nav { border: 0; border-radius: 0; padding: 0; background: transparent; box-shadow: none; }
	.profileRow, .filterPills { display: none; }
	.quickSectionTitle { display: none; }
	.quickGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
	.quickItem { min-height: 48px; justify-content: center; padding: 6px; background: var(--settings-surface, var(--MI_THEME-panel)); text-align: center; }
	.quickItem > i { font-size: 1.15rem; }
	.quickItem > span { display: none; }
	.navSection > .sectionTitle { min-height: 48px; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 999px; padding: 8px 13px; background: var(--settings-bg, var(--MI_THEME-bg)); font-size: .8rem; letter-spacing: .01em; }
	.tabletPrimaryLink { min-height: 48px; margin-top: 14px; border-radius: 999px; padding-inline: 13px; font-size: .72rem; font-weight: 700; }
	.tabletCategoryLink, .tabletSectionBack, .navLink { background: var(--settings-surface, var(--MI_THEME-panel)); }
	.navSection > .sectionTitle > i:last-child { display: inline-block; }
	.navSection .links { gap: 5px; padding-top: 4px; }
	.navLink { min-height: 44px; border-radius: 14px; background: var(--settings-bg, var(--MI_THEME-bg)); }
	.contentCard { padding: 16px; }
}

@container (max-width: 680px) {
	.header { align-items: stretch; padding: 12px 14px 14px; }
	.compactHeader { display: block; border-bottom: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); background: var(--settings-surface, var(--MI_THEME-panel)); }
	.compactHeader .searchTrigger { width: 100%; margin-top: 10px; background: var(--settings-bg, var(--MI_THEME-bg)); box-shadow: none; }
	.searchShortcut { display: none; }
	.headerAvatar { display: block; width: 44px; height: 44px; }
	.layout { grid-template-columns: 1fr; padding: 0 12px 16px; }
	.nav { padding: 0; }
	.contentCard { min-height: 0; min-block-size: 0; border-radius: 22px; padding: 14px; }
}

@media (prefers-reduced-motion: reduce) {
	.scope, .scope :deep(*) { animation: none !important; scroll-behavior: auto !important; transition: none !important; }
}
</style>
