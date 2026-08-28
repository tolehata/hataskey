<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<!-- 旗鯖fork: 自前で見出し・戻る・検索を持つので、本体の帯は出さない。
     ⚠️出すと帯が2本並ぶ。 -->
<PageWithHeader :actions="headerActions" :tabs="headerTabs" hideHeader>
	<!-- 旗鯖fork: ⚠️シェルのどこでホイールを回しても効くようにする。
	     ⚠️器が低いとき（窓を最大化から通常サイズへ戻したときなど）、ヘッダー帯には
	     スクロールできる祖先が1つも無く、ホイールが完全に無反応になる
	     （実測: 窓450px / シェル415px / ヘッダー63px の上では祖先なし）。
	     ⚠️スクロールバーは動くのにホイールだけ死ぬ、という状態がこれ。 -->
	<div ref="rootEl" :class="$style.scope" :data-motion-enabled="motionEnabled ? 'true' : 'false'" @wheel="onShellWheel">
		<a :class="$style.skip" href="#settings-redesign-main">{{ copy.skipToContent }}</a>
		<header :class="[$style.header, { [$style.compactHeader]: compact }]">
			<template v-if="compact">
				<div :class="$style.compactTop">
					<button type="button" :class="$style.compactBack" :aria-label="i18n.ts.goBack" @click="goCompactBack"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>
					<!-- 旗鯖fork: しばらく何も変えていないときだけ、検索の在り処をそっと出す。
					     ⚠️出しっぱなしにしないこと。題として読めなくなる。8秒で戻す。 -->
					<h1 :class="$style.compactTitle"><Transition name="settings-title" :css="motionEnabled" mode="out-in"><span v-if="showSearchHint" key="settings-search-hint" :class="$style.compactHint" @click="openSearch">{{ copy.searchHint }}<span :class="$style.compactHintArrow" aria-hidden="true">＞</span></span><span v-else :key="mobilePageTitle" :class="{ settingsBrand: hasSettingsBrand(mobilePageTitle) }">{{ mobilePageTitle }}</span></Transition></h1>
						<!-- 旗鯖fork: ⚠️右側のボタンは1つの箱にまとめること。
						     ⚠️列を足すたびに題の軸がずれる（虫眼鏡を足したときに実際にずれた）。
						     ⚠️左右の列を同じ幅にして、真ん中の題を器の中央へ固定する。 -->
						<div :class="$style.compactActions">
						<!-- 旗鯖fork: 詳細ページでは検索窓を虫眼鏡へ畳み、右上のアイコンの左へ寄せる。
						     ⚠️狭い画面では検索窓が縦を1行分まるごと食い、本文が読める量を削っていた。
						     ⚠️v-if で出し入れしないこと。Transition の leave が終わらず
						     `leave-from` のまま画面に残り続けた（実測: 3秒待っても消えない）。
						     ⚠️常に置いて、CSSだけで畳む。これなら止まりようがない。 -->
						<button ref="searchIconEl" type="button" :class="$style.compactSearchIcon" :data-collapsed="compactSearchCollapsed ? 'true' : 'false'" :aria-label="copy.searchTrigger" :title="copy.searchTrigger" :aria-hidden="compactSearchCollapsed ? undefined : 'true'" :tabindex="compactSearchCollapsed ? undefined : -1" @click="openSearch"><i class="ti ti-search" aria-hidden="true"></i></button>
						<button v-if="isHatasabaUi2SurfaceActive" type="button" :class="$style.compactPreview" :aria-label="copy.ui2.openPreview" @click="openHatasabaUi2Preview"><i class="ti ti-eye" aria-hidden="true"></i></button>
						<MkAvatar v-else-if="$i" :user="$i" :link="false" :class="$style.headerAvatar"/>
						</div>
				</div>
				<button v-if="!isHatasabaUi2SurfaceActive" ref="searchButtonEl" type="button" :class="$style.searchTrigger" :data-collapsed="compactSearchCollapsed ? 'true' : 'false'" :aria-hidden="compactSearchCollapsed ? 'true' : undefined" :tabindex="compactSearchCollapsed ? -1 : undefined" @click="openSearch">
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

		<div :class="$style.layout" :data-nav-mode="navPaneMode">
			<aside v-show="!compact || currentPage?.route.name == null" ref="navEl" :class="$style.nav" :aria-label="copy.settingsCategories">
				<SettingsMobileOverview
					v-if="compact && currentPage?.route.name == null"
					:quickItems="quickItems"
					:sections="mobileOverviewSections"
					:deprecatedSections="mobileDeprecatedSections"
					:featureItem="hataCustomGlassUiItem"
					:profileItem="profileNavigationItem"
					:profileName="$i?.name ?? null"
					:profileUsername="$i?.username ?? null"
					:profileAvatarUrl="$i?.avatarUrl ?? null"
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
				<!-- 旗鯖fork: 左ペインは3つの姿を持つ。
				     ⚠️大分類・詳細・帯(最小化)。分類を選んだ時点で帯へ畳む。
				     ⚠️左に項目一覧、右上に同じ項目のタブ、という二重表示をやめるため。
				     ⚠️幅で作りを変えないこと。タブレットや折りたたみでも同じ形に揃える。 -->
				<template v-else>
					<div v-if="navPaneMode === 'rail'" :class="$style.rail" data-settings-nav-rail>
						<button v-if="$i" type="button" :class="$style.railButton" :title="i18n.ts.profile" :aria-label="i18n.ts.profile" @click="goToSetting(profileNavigationItem)">
							<MkAvatar :user="$i" :link="false" :class="$style.railAvatar"/>
						</button>
						<!-- ⚠️向きは実物(ui/simple.vue)と同じ約束に。畳んでいるときは開く向き(右)。 -->
						<button type="button" :class="$style.railButton" :title="copy.settingsCategories" :aria-label="copy.settingsCategories" data-settings-nav-rail-action="categories" @click="setNavPaneMode('categories')">
							<i class="ti ti-chevron-right" aria-hidden="true"></i>
						</button>
						<!-- ⚠️押せない飾りを置かないこと。以前はここに「いまの分類」の印だけが
						     光っていて、反応しないので何なのか分からなかった。
						     ⚠️分類の絵そのものを「詳細を開く」ボタンにする。 -->
						<button v-if="activeNavSection != null && siblingTabs.length > 1" type="button" :class="[$style.railButton, $style.railCurrent]" :title="activeNavSection.label" :aria-label="activeNavSection.label" data-settings-nav-rail-action="detail" @click="setNavPaneMode('detail')">
							<img v-if="activeNavSection.iconImage != null" :src="activeNavSection.iconImage" :class="$style.pillImage" alt="" aria-hidden="true"/><i v-else :class="activeNavSection.icon" aria-hidden="true"></i>
						</button>
					</div>
					<template v-else>
						<div v-if="$i" :class="$style.profileRow">
							<MkA :to="profileNavigationItem.route" :class="$style.profile" @click.prevent="goToSetting(profileNavigationItem)">
								<MkAvatar :user="$i" :link="false" :class="$style.avatar"/>
								<span :class="$style.profileText"><strong><Mfm :text="$i.name || $i.username" :plain="true" :nyaize="false"/></strong><small>@{{ $i.username }}</small></span>
							</MkA>
						</div>

						<!-- 旗鯖fork: 絞り込みは1つの錠剤ケースにまとめ、畳むボタンは別の丸として独立させる。
						     ⚠️並のボタンを横に並べただけだと、幅が足りない環境(Chrome)で2段に折り返して
						     見た目が崩れた。ケースなら中で詰まり、折り返さない。
						     ⚠️選択中は塗りつぶさない（右ペインのタブと同じ考え方）。 -->
						<div :class="$style.filterRow">
							<div :class="$style.filterPills" role="group" :aria-label="copy.settingsFilter" data-settings-filter-case>
								<!-- ⚠️絵だけにするので、読み上げと吹き出しには必ず文言を残すこと。
								     残さないと、何を選んでいるのか画面からも読み上げからも分からなくなる。 -->
								<button v-for="filter in settingsFilters" :key="filter.id" type="button" :class="$style.filter" :data-active="activeSettingsFilter === filter.id ? 'true' : 'false'" :aria-pressed="activeSettingsFilter === filter.id" :aria-label="filter.label" :title="filter.label" @click="activeSettingsFilter = filter.id"><span v-if="filter.mark != null" :class="$style.filterMark">{{ filter.mark }}</span><i v-else :class="filter.icon" aria-hidden="true"></i></button>
							</div>
							<button v-if="!compact" type="button" :class="$style.collapseButton" :title="copy.settingsCategories" :aria-label="copy.settingsCategories" data-settings-nav-collapse @click="setNavPaneMode('rail')">
								<i class="ti ti-chevron-left" aria-hidden="true"></i>
							</button>
						</div>

						<h2 :class="[$style.sectionTitle, $style.quickSectionTitle]">{{ copy.frequentlyUsedSettings }}</h2>
						<div :class="$style.quickGrid">
							<component :is="opensSettingsPopup(item) ? 'button' : 'MkA'" v-for="item in visibleQuickItems" :key="item.id" v-bind="navBindings(item)" :class="[$style.quickItem, { [$style.navLinkActive]: isActive(item) }]" :aria-label="item.label" :title="item.label" :aria-current="isActive(item) ? 'page' : undefined" @click.prevent="goToSetting(item)"><i :class="item.icon" aria-hidden="true"></i><span><span v-if="item.brand" class="settingsBrand">{{ item.label }}</span><span v-else>{{ item.label }}</span></span></component>
						</div>

						<!-- ⚠️Transition は子を1つしか取れない。それぞれを包むこと。 -->
						<Transition :name="motionEnabled ? (navPaneMode === 'detail' ? 'settings-drill-forward' : 'settings-drill-back') : ''" :css="motionEnabled" mode="out-in">
							<nav v-if="navPaneMode === 'categories'" key="categories" :class="$style.sectionPills" :aria-label="copy.settingsCategories">
								<button
									v-for="section in visibleNavSections"
									:key="section.id"
									type="button"
									:class="[$style.sectionPill, { [$style.sectionPillCherrypick]: section.id === 'cherrypick', [$style.sectionPillDeprecated]: section.id === 'misskey-ui' }]"
									:data-active="sectionHasActiveItem(section) ? 'true' : 'false'"
									:data-settings-nav-section="section.id"
									:aria-current="sectionHasActiveItem(section) ? 'page' : undefined"
									@click="openNavigationSection(section)"
								>
									<img v-if="section.iconImage != null" :src="section.iconImage" :class="$style.pillImage" alt="" aria-hidden="true"/><i v-else :class="section.icon" aria-hidden="true"></i><span :class="{ settingsBrand: section.brand != null || hasSettingsBrand(section.label) }" :title="section.label">{{ section.label }}</span><small v-if="section.id === 'misskey-ui'" :class="$style.deprecatedBadge">{{ copy.mobile.deprecated }}</small><span v-else-if="sectionCount(section) != null" :class="$style.countBadge">{{ sectionCount(section) }}</span>
								</button>
							</nav>
							<div v-else-if="activeNavSection != null" key="detail" :class="$style.detailPane">
								<!-- 旗鯖fork: ⚠️ここにも分類の絵を出すこと。左ペインの一覧と詳細で見た目が
								     食い違うと、同じ分類を見ているのか分からなくなる。
								     ⚠️絵を持つ分類(HataSNSCordUIのマスコット)は絵を優先する。 -->
								<button ref="navDetailBackEl" type="button" :class="$style.detailBack" data-settings-nav-detail-back @click="setNavPaneMode('categories')"><i class="ti ti-chevron-left" aria-hidden="true"></i><img v-if="activeNavSection.iconImage != null" :src="activeNavSection.iconImage" :class="$style.pillImage" alt="" aria-hidden="true"/><i v-else :class="activeNavSection.icon" aria-hidden="true"></i><span :class="{ settingsBrand: activeNavSection.brand != null || hasSettingsBrand(activeNavSection.label) }">{{ activeNavSection.label }}</span></button>
								<nav :class="$style.links" :aria-label="activeNavSection.label">
									<component :is="opensSettingsPopup(item) ? 'button' : 'MkA'" v-for="item in activeNavSection.items" :key="item.id" v-bind="navBindings(item)" :class="[$style.navLink, { [$style.navLinkActive]: isActive(item) }]" :aria-current="isActive(item) ? 'page' : undefined" @click.prevent="goToSetting(item)"><img v-if="item.iconImage != null" :src="item.iconImage" :class="$style.pillImage" alt="" aria-hidden="true"/><i v-else :class="item.icon" aria-hidden="true"></i><span><span v-if="item.brand" class="settingsBrand">{{ item.label }}</span><span v-else>{{ item.label }}</span></span><span v-if="item.showCount && settingCountForItem(item) != null" :class="$style.countBadge">{{ settingCountForItem(item) }}</span></component>
								</nav>
							</div>
						</Transition>

						<section :class="$style.sessionActions" aria-labelledby="settings-shell-session-actions">
							<h2 id="settings-shell-session-actions" :class="$style.sectionTitle">{{ copy.sessionAndLogin }}</h2>
							<button v-for="item in destructiveItems" :key="item.id" type="button" :class="$style.destructiveAction" :data-settings-search-id="item.searchId" data-settings-search-destructive="true" @click="runShellAction(item.id)">
								<i :class="item.icon" aria-hidden="true"></i><span><span v-if="item.brand" class="settingsBrand">{{ item.label }}</span><span v-else>{{ item.label }}</span></span>
							</button>
						</section>

						<button type="button" :class="$style.legacyMenu" @click="requestOpenLegacy"><i class="ti ti-history" aria-hidden="true"></i>{{ copy.legacySettings }}</button>
					</template>
				</template>
			</aside>

			<main v-show="!compact || currentPage?.route.name != null" id="settings-redesign-main" ref="mainEl" :class="$style.main" tabindex="-1">
				<!-- 旗鯖fork: 右ペイン上部の兄弟タブ。いま選んでいる大分類の中の項目を並べる。
				     ⚠️手本は Hataskey UI 設定の錠剤型ケース。非選択はアイコンのみ、
				     選択中だけアクセント色の文字を添える。
				     ⚠️目印は必ずタブより前・.main の直下に置くこと。position: sticky は
				     直近の親の中でしか貼り付かないため、カードの中だと抜けた時点で消える。 -->
				<div v-if="siblingTabs.length > 1" ref="siblingTabsSentinel" :class="$style.siblingTabsSentinel" aria-hidden="true"></div>
				<nav
					v-if="siblingTabs.length > 1"
					:class="$style.siblingTabs"
					:data-stuck="siblingTabsStuck ? 'true' : 'false'"
					:aria-label="activeNavSection?.label ?? copy.settingsCategories"
					data-settings-horizontal-scroll
					@wheel="onSiblingTabWheel"
				>
					<button v-for="item in siblingTabs" :key="item.id" type="button" :aria-label="item.label" :title="item.label" :data-active="isActive(item) ? 'true' : 'false'" :aria-current="isActive(item) ? 'page' : undefined" @click="goToSetting(item)">
						<img v-if="item.iconImage != null" :src="item.iconImage" :class="$style.pillImage" alt="" aria-hidden="true"/><i v-else :class="item.icon" aria-hidden="true"></i><span v-if="isActive(item)" :class="$style.siblingTabLabel"><span v-if="item.brand" class="settingsBrand">{{ item.label }}</span><span v-else>{{ item.label }}</span></span>
					</button>
				</nav>
				<!-- 旗鯖fork: 狭い幅の画面遷移を左右へ滑らせる。
				     ⚠️広い幅では包まないこと。右ペインだけが独立して動くと、
				     左ペインとの対応が読めず、かえって落ち着かない。
				     ⚠️鍵は経路。同じ画面のまま再生成させない。 -->
				<div :class="[$style.contentCard, { [$style.contentCardSurfaceActive]: isHatasabaUi2SurfaceActive }]" :data-page-enter="pageEnterDirection ?? undefined">
					<!-- 旗鯖fork: Hataskey系の設定は、窓ではなく右ペインの中身として出す。
					     ⚠️必ず最初に見ること。ポップアップの行き先は経路が /settings/hata-custom の
					     ままなので、後ろに置くと経路で決まる別の画面に負けて出てこない。 -->
					<SettingsPopupBridge
						v-if="embeddedPopup != null"
						:popup="embeddedPopup"
						:settingsContext="settingsSearchContext"
						:motionEnabled="motionEnabled"
						embedded
						@closed="embeddedPopup = null"
					/>
					<HatasabaUi2SettingsSurface
						v-else-if="isHatasabaUi2SurfaceActive"
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
import { createSearchHintController } from '@/pages/settings-redesign/settings-search-hint.js';
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
import type { SettingsOverviewDestructiveItem, SettingsOverviewItem, SettingsOverviewSection } from './SettingsMobileOverview.vue';
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
const searchIconEl = useTemplateRef('searchIconEl');
/** ⚠️畳んでいるときは虫眼鏡が入口。焦点はそちらへ戻す。 */
const searchAnchorEl = computed(() => (compactSearchCollapsed.value ? searchIconEl.value : searchButtonEl.value));
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

/**
 * 旗鯖fork: 左ペインの姿。
 *
 * - `categories` … 大分類の一覧
 * - `detail` … いま選んでいる分類の項目一覧
 * - `rail` … 細い帯（最小化）
 *
 * ⚠️分類を選んだら帯へ畳むこと。左に項目一覧・右上に同じ項目のタブ、という
 *   二重表示が視覚的に混乱のもとになる。⚠️畳んだままにはしない。帯から
 *   「大分類へ戻る」「この分類の項目を開く」の2つで、いつでも取り戻せること。
 * ⚠️幅で作りを変えない。タブレットや折りたたみでも同じ姿を使う。
 */
type SettingsNavPaneMode = 'categories' | 'detail' | 'rail';
const navPaneMode = ref<SettingsNavPaneMode>('categories');
const navDetailBackEl = useTemplateRef<HTMLElement>('navDetailBackEl');

function setNavPaneMode(mode: SettingsNavPaneMode) {
	navPaneMode.value = mode;
	if (mode !== 'detail') return;
	// ⚠️詳細を開いたら見出しへ焦点を移すこと。キーボードだけの利用者が
	//   どこへ移ったのか分からなくなる。
	void nextTick(() => focusElement(navDetailBackEl.value));
}

/**
 * 旗鯖fork: 狭い幅でも「分類を選んだら、その中の最初の設定へ直接移る」。
 * ⚠️下位一覧を挟まないこと。PC と操作の数が食い違ううえ、右ペインの
 *   兄弟タブと同じ並びを左にもう一度出すことになる。
 */
async function openCompactNavigationSection(id: string | null) {
	if (id == null) {
		compactNavigationSection.value = null;
		return;
	}
	const section = navSections.find(candidate => candidate.id === id);
	if (section == null) {
		// ⚠️知らない分類は、これまで通り下位一覧へ落とす（黙って無反応にしない）。
		compactNavigationSection.value = id;
		return;
	}
	await openNavigationSection(section);
}

/**
 * 旗鯖fork: 選択中の大分類が左ペインの外に出ていたら、見える位置まで寄せる。
 * ⚠️毎回 scrollIntoView を呼ばないこと。すでに見えているのに呼ぶと、
 *   関係のない場面で左ペインが勝手に動いて驚かせる。
 */
function revealActiveSectionPill(id: string) {
	void nextTick(() => {
		const nav = navEl.value;
		const pill = nav?.querySelector(`[data-settings-nav-section="${CSS.escape(id)}"]`);
		if (nav == null || !(pill instanceof HTMLElement)) return;

		const inset = 8;
		const navRect = nav.getBoundingClientRect();
		const pillRect = pill.getBoundingClientRect();
		let top = nav.scrollTop;
		if (pillRect.top < navRect.top + inset) {
			top += pillRect.top - navRect.top - inset;
		} else if (pillRect.bottom > navRect.bottom - inset) {
			top += pillRect.bottom - navRect.bottom + inset;
		} else {
			return;
		}
		nav.scrollTo({ top: Math.max(0, top), behavior: motionEnabled.value ? 'smooth' : 'auto' });
	});
}

type SettingsFilterId = 'all' | 'frequent' | 'device';
/**
 * 旗鯖fork: 絞り込みは絵で示す。
 * ⚠️`mark` は文字そのもの、`icon` は Tabler。⚠️どちらか片方だけを持たせる。
 * ⚠️Tabler に無い名前を書いても何も起きず、黙って空白になる。
 *   （SettingsDestinationIcons.test.ts と同じ理由で、実在するものだけを使う）
 */
const settingsFilters: Array<{ id: SettingsFilterId; label: string; mark?: string; icon?: string }> = [
	{ id: 'all', label: copy.filters.all, mark: 'ALL' },
	{ id: 'frequent', label: copy.filters.frequent, icon: 'ti ti-star' },
	{ id: 'device', label: copy.filters.deviceOnly, icon: 'ti ti-device-mobile-check' },
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

/**
 * 旗鯖fork: 狭い幅で検索窓を虫眼鏡へ畳むかどうか。
 * ⚠️一覧(子ルートなし)では畳まないこと。設定を探す入口が消える。
 */
/**
 * 旗鯖fork: 狭い幅での画面の入れ替わりの向き。
 * ⚠️戻るときに左から入ってこないと、進んだのか戻ったのか分からない。
 */
/**
 * 旗鯖fork: 設定へ入る直前に居た場所。戻るときの行き先に使う。
 * ⚠️設定の中の経路で上書きしないこと。上書きすると戻る操作が設定へ戻る。
 */
let lastNonSettingsRoute: string | null = null;

/**
 * 旗鯖fork: 詳細画面でしばらく何も変えていないとき、見出しの場所に
 * 検索の在り処をそっと出す。理屈は settings-search-hint.ts にある。
 *
 * ⚠️「操作が無い」ではなく「**設定が変わっていない**」で数えること。
 *   読んでいるだけの人にこそ出したい案内なので、スクロールで消してはいけない。
 * ⚠️繋ぎ込みを忘れると、時計が正しくても一生出ない（一度そうなった）。
 *   下の watch を消すときは SettingsSearchHint.test.ts も一緒に見直すこと。
 */
const showSearchHint = ref(false);
const searchHintController = createSearchHintController({
	idleMs: 15000,
	visibleMs: 8000,
	extensionMs: 20000,
	maxExtensions: 3,
	// ⚠️狭い幅の詳細画面だけ。広い幅では検索窓が常に見えている。
	eligible: () => compact.value && currentPage.value?.route.name != null,
	onChange: (visible) => { showSearchHint.value = visible; },
});

const compactPageDirection = ref<'forward' | 'back'>('forward');

/**
 * 旗鯖fork: 画面が入れ替わったときだけ立てる印。CSSのアニメーションを1回流す。
 *
 * ⚠️Transition で要素ごと差し替えないこと。
 *   ⚠️ウィンドウの最大化を切り替えると幅の判定(compact)が反転し、鍵が変わって
 *   出入りの遷移が走る。その遷移が終わらないと**右ペインが白いまま二度と
 *   描かれなくなる**（左から何を選んでも白いまま）。
 *   ⚠️中身を常に置いたままにすれば、この壊れ方は起こり得ない。
 */
const pageEnterDirection = ref<'forward' | 'back' | null>(null);
let pageEnterTimer: number | null = null;

function playPageEnter() {
	if (!compact.value || !motionEnabled.value) return;
	if (pageEnterTimer != null) window.clearTimeout(pageEnterTimer);
	pageEnterDirection.value = null;
	// ⚠️同じ値のままだとアニメーションが再生されない。いったん外してから付ける。
	void nextTick(() => {
		pageEnterDirection.value = compactPageDirection.value;
		pageEnterTimer = window.setTimeout(() => {
			pageEnterDirection.value = null;
			pageEnterTimer = null;
		}, 280);
	});
}

const compactSearchCollapsed = computed(() => compact.value && currentPage.value?.route.name != null);

const hasSettingsBrand = (value: string) => /Hataskey|Hatask|Hatady|HataFeed|HataSNSCordUI/u.test(value);

const mobilePageTitle = computed(() => {
	if (compact.value && compactNavigationSection.value != null) {
		return [...mobileOverviewSections.value, ...mobileDeprecatedSections.value].find(section => section.id === compactNavigationSection.value)?.label ?? i18n.ts.settings;
	}
	if (currentPage.value?.route.name == null) return i18n.ts.settings;
	if (isHatasabaUi2SurfaceActive.value) return 'Hataskey UI';
	// 旗鯖fork: ⚠️見出しは「分類名」で固定すること。項目名にすると、右ペインの
	//   兄弟タブを移るたびに上の題が書き換わり、いまどこに居るのか読めなくなる。
	//   ⚠️分類が決まらないときだけ、開いている項目名へ落とす。
	const section = activeNavSection.value;
	if (section != null) return section.label;
	const item = navSections.flatMap(candidate => candidate.items).find(candidate => candidate.route === currentPath.value);
	return item?.label ?? i18n.ts.settings;
});

/**
 * 旗鯖fork: いま開いている項目。
 *
 * ⚠️「経路だけの一致」と「はっきりした一致」を混ぜないこと。
 *   Hataskey独自ツールの項目はポップアップを開くだけで**経路が変わらない**ため、
 *   両方を素朴に OR で足すと、開いた項目とその経路の持ち主が**同時に**点いた。
 *   （実測: Hatady を開くと Hatady=true と HataFeed=true が並んだ）
 * ⚠️はっきりした一致が1つでもあれば、経路だけの一致は捨てる。
 *   これで兄弟タブの点灯は常に1つに保たれる。
 */
const activeNavigationItemIds = computed(() => {
	const explicitIds = new Set<string>();
	const routeOnlyIds = new Set<string>();
	const activeTarget = activeNavigationTarget.value;
	const destinationId = currentDestinationId.value;
	const preferenceDestinationId = activePreferenceDestinationId.value;
	const path = currentPath.value;

	for (const item of navSections.flatMap(section => section.items)) {
		const activation = item.activation;
		const activated = (activation?.kind === 'hata-custom-category' || activation?.kind === 'popup')
			&& path === item.route
			&& activeHataCustomCategory.value === activation.category;

		if (activeTarget?.stableId === item.stableId
			|| destinationId === item.id
			|| destinationId === item.stableId
			|| (item.route === '/settings/preferences' && preferenceDestinationId === item.id)
			|| activated) {
			explicitIds.add(item.id);
			continue;
		}

		if (activation == null
			&& path === item.route
			&& item.primary === true
			&& primaryDestinationCountByRoute.value.get(item.route) === 1) {
			routeOnlyIds.add(item.id);
		}
	}

	return explicitIds.size > 0 ? explicitIds : routeOnlyIds;
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

/**
 * 旗鯖fork: 左ペインで選んでいる大分類。右ペインの兄弟タブはここから引く。
 * ⚠️URLだけを正本にしないこと。ポップアップを開く項目は経路が変わらないので、
 *   経路から引くと分類が「Hataskeyツール」から動かなくなる。
 *   ⚠️逆に選択状態だけを正本にすると、検索から直接飛んだときに左が追従しない。
 *   両方見て、いま活きている項目があればそれを優先する。
 */
const requestedSectionId = ref<string | null>(null);
const activeSectionId = computed<string | null>(() => {
	const [activeId] = activeNavigationSectionIds.value;
	if (activeId != null) return activeId;
	if (requestedSectionId.value != null) return requestedSectionId.value;
	return visibleNavSections.value[0]?.id ?? null;
});
const activeNavSection = computed<NavSection | null>(() => visibleNavSections.value.find(section => section.id === activeSectionId.value) ?? null);
const siblingTabs = computed<NavItem[]>(() => activeNavSection.value?.items ?? []);

// ⚠️開いた直後に動かさないこと。最初の1回で下へスクロールしてしまい、
//   左上のプロフィール行が画面外へ隠れていた。分類が「変わったとき」だけ寄せる。
let sectionRevealArmed = false;
watch(activeSectionId, id => {
	if (!sectionRevealArmed) {
		sectionRevealArmed = true;
		return;
	}
	if (id != null) revealActiveSectionPill(id);
});

/**
 * 旗鯖fork: 分類を選んだときに開く項目。
 * ⚠️並びの先頭をそのまま使うこと。以前は primary を優先していたが、
 *   「データと引っ越し」を選んだのに2番目が開くなど、左の並びと開く画面が
 *   食い違って読めなかった。⚠️並び順そのものが利用者への約束。
 */
function sectionLandingItem(section: NavSection): NavItem | undefined {
	const items: NavItem[] = section.items;
	return items[0];
}

async function openNavigationSection(section: NavSection): Promise<void> {
	requestedSectionId.value = section.id;
	const item = sectionLandingItem(section);
	if (item != null) await goToSetting(item);
	// ⚠️自動では畳まないこと。分類を選ぶたびに左が消えると、隣の分類へ
	//   移りたいだけなのに毎回開き直すことになり、かえって手数が増える。
	//   ⚠️畳むかどうかは利用者が決める（プロフィール行の畳むボタン）。
}

/** 左ペインの分類に添える件数。⚠️中身が読めていないときは出さない。 */
function sectionCount(section: NavSection): number | null {
	if (catalogState.value !== 'ready') return null;
	const total = section.items.reduce((sum, item) => sum + (settingCountForItem(item) ?? 0), 0);
	return total > 0 ? total : null;
}

/**
 * 旗鯖fork: 兄弟タブの追従。
 * ⚠️scroll を毎回聞かないこと。重いうえ取りこぼす。高さ0の目印が
 *   画面から外れた＝タブが本来の位置を離れた、と見なす。
 */
const siblingTabsSentinel = useTemplateRef<HTMLElement>('siblingTabsSentinel');
const siblingTabsStuck = ref(false);
let siblingTabsObserver: IntersectionObserver | null = null;

function observeSiblingTabs() {
	siblingTabsObserver?.disconnect();
	siblingTabsObserver = null;
	const target = siblingTabsSentinel.value;
	if (target == null || typeof IntersectionObserver === 'undefined') return;
	// ⚠️根は .main（ここが縦にスクロールする器）。既定の viewport にすると、
	//   ペインの中でいくらスクロールしても外れたと判定されない。
	siblingTabsObserver = new IntersectionObserver(entries => {
		for (const entry of entries) siblingTabsStuck.value = !entry.isIntersecting;
	}, { root: mainEl.value ?? null, threshold: 0 });
	siblingTabsObserver.observe(target);
}

// ⚠️タブは分類によって出たり消えたりする。目印が付け替わるたびに観測し直す。
watch(siblingTabsSentinel, () => { void nextTick(observeSiblingTabs); }, { flush: 'post' });

/** 横に溢れたタブを、縦ホイールでも送れるようにする。 */
function onSiblingTabWheel(event: WheelEvent): void {
	const element = event.currentTarget;
	if (!(element instanceof HTMLElement)) return;

	const maxScrollLeft = element.scrollWidth - element.clientWidth;
	if (maxScrollLeft <= 0) return;

	const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
	if (delta === 0) return;

	const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, element.scrollLeft + delta));
	if (nextScrollLeft === element.scrollLeft) return;

	event.preventDefault();
	element.scrollLeft = nextScrollLeft;
}

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
	if (!focusElement(target)) focusElement(searchAnchorEl.value);
}

function closeSearch(event: SettingsSearchCloseEvent) {
	searchOpen.value = false;
	if (event.reason === 'select') return;
	const origin = searchOriginEl.value ?? searchAnchorEl.value;
	void nextTick(() => window.requestAnimationFrame(() => {
		if (event.reason === 'tab') {
			focusAdjacentTo(origin, event.direction ?? 'next');
			return;
		}
		if (!focusElement(origin)) focusElement(searchAnchorEl.value);
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

/**
 * 旗鯖fork: 二ペインのときは、窓ではなく右ペインの中身として出す。
 * ⚠️窓のまま出すと、左で選んだ分類と右の中身が食い違ううえ、
 *   画面全体を覆ってしまい兄弟タブへ移れない。
 * ⚠️compact(スマホ幅)は右ペインが1枚しかなく、埋め込むと戻り道が消えるので窓のまま。
 */
const embeddedPopup = ref<SettingsPopupBridgeKind | null>(null);

function openSettingsPopup(popup: SettingsPopupBridgeKind, opener: HTMLElement | null) {
	if (!compact.value) {
		if (embeddedPopup.value === popup) return true;
		// ⚠️窓が残っていると二重に出る。先に畳んでから埋め込みへ移す。
		if (activeSettingsPopup != null) closeSettingsPopup(activeSettingsPopup, false);
		embeddedPopup.value = popup;
		return true;
	}
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
	// ⚠️埋め込みも同じ規則で畳む。残すと、別の項目を選んだのに
	//   右ペインが前のポップアップのままになる。
	if (embeddedPopup.value != null && popupForNavigationTarget(target) !== embeddedPopup.value) {
		embeddedPopup.value = null;
	}
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
	compactPageDirection.value = 'forward';
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
	// ⚠️案内を見たあとに検索へ手が伸びたなら、用は足りている。
	//   この滞在のあいだ、もう同じ案内は出さない（controller 側で判断する）。
	searchHintController.noteSearchUsed();
	searchOriginEl.value = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : searchAnchorEl.value;
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

/** 旗鯖fork: 設定を開いたときに最初に出す画面。 */
const SETTINGS_DEFAULT_ROUTE = '/settings/profile';

function redirectDefaultPage() {
	// ⚠️設定の外にいるときは絶対に動かないこと。ResizeObserver から呼ばれるため、
	//   設定を離れたあとの幅変更でも走ってしまい、利用者を設定へ引き戻していた。
	if (!isSettingsFullPath(router.getCurrentFullPath())) return;
	if (compact.value || router.currentRef.value.child?.route.name != null) return;
	cancelPendingNavigation();
	activeNavigationTarget.value = null;
	// 旗鯖fork: ⚠️既定はプロフィール。以前は Hataskey UI を開いていたが、
	//   設定を開いて最初に見たいのは自分の見え方であって UI の細かな調整ではない。
	//   ⚠️ここを popup 系の行き先にしないこと。経路が変わらず、この関数は
	//   「子ルートが無いとき」に走るので、開いた直後に無限に呼ばれる。
	router.replace(SETTINGS_DEFAULT_ROUTE);
}

/**
 * 旗鯖fork: シェル上のホイールを、近い方のペインへ渡す。
 *
 * ⚠️すでにスクロールできる場所の上なら何もしないこと。二重に動いて飛ぶ。
 * ⚠️端まで来ているときも何もしない。外側へ伝播させる（親の器が動けるように）。
 * ⚠️横方向のホイールには手を出さない。
 */
function onShellWheel(ev: WheelEvent) {
	if (ev.deltaY === 0 || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;

	const root = rootEl.value;
	let node = ev.target instanceof HTMLElement ? ev.target : null;
	while (node != null && node !== root) {
		const overflowY = window.getComputedStyle(node).overflowY;
		if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) return;
		node = node.parentElement;
	}

	// ⚠️どちらのペインを動かすかは「指している位置に近い方」で決める。
	//   ⚠️横位置だけで決めないこと。狭い幅では左右ペインが縦に積まれ、
	//   横の範囲が重なるので、いつも片方だけが動いてしまう。
	const candidates = [navEl.value, mainEl.value].filter((pane): pane is HTMLElement => (
		pane != null && pane.scrollHeight > pane.clientHeight + 1 && pane.getBoundingClientRect().height > 0
	));
	if (candidates.length === 0) return;
	const distance = (pane: HTMLElement) => {
		const box = pane.getBoundingClientRect();
		const dx = Math.max(box.left - ev.clientX, 0, ev.clientX - box.right);
		const dy = Math.max(box.top - ev.clientY, 0, ev.clientY - box.bottom);
		return Math.hypot(dx, dy);
	};
	const pane = candidates.reduce((nearest, candidate) => (distance(candidate) < distance(nearest) ? candidate : nearest));

	const next = Math.max(0, Math.min(pane.scrollHeight - pane.clientHeight, pane.scrollTop + ev.deltaY));
	if (next === pane.scrollTop) return;
	ev.preventDefault();
	pane.scrollTop = next;
}

function updateCompact() {
	const width = rootEl.value?.offsetWidth ?? 0;
	compact.value = width <= 680;
	// 旗鯖fork: ⚠️タブレット専用の作りは廃止した。PC と同じ姿に揃える。
	//   ⚠️`tablet` は狭い幅向けの余白調整に残っているだけで、作りは変えない。
	tablet.value = width > 680 && width <= 900;
	if (compact.value) navPaneMode.value = 'categories';
	if (!compact.value) compactNavigationSection.value = null;
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
	compactPageDirection.value = 'back';
	if (compactNavigationSection.value != null) {
		compactNavigationSection.value = null;
		return;
	}
	if (currentPage.value?.route.name != null) {
		await goSettingsTop();
		return;
	}
	if (!await requestSurfaceDiscard()) return;
	// 旗鯖fork: ⚠️ここで history.back() を使わないこと。
	//   設定の中で分類や項目を選ぶたびに履歴を積んでいるので、1つ前もたいてい
	//   設定の中にある。⚠️結果、戻る→子カテゴリ→設定の先頭→戻る…と
	//   設定から永久に抜けられなくなる（実際にそうなっていた）。
	//   ⚠️設定へ入る前の場所は追えないので、確実に外へ出られる行き先を選ぶ。
	pushShellRoute(settingsExitRoute());
}

/**
 * 旗鯖fork: 設定から出るときの行き先。
 * ⚠️設定の中の経路を返さないこと。戻る操作が設定へ戻ってしまう。
 */
function settingsExitRoute(): string {
	const previous = lastNonSettingsRoute;
	return previous != null && !isSettingsFullPath(previous) ? previous : '/';
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
	searchHintController.stop();
	siblingTabsObserver?.disconnect();
	siblingTabsObserver = null;
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

// ⚠️prefer.r は「素のオブジェクト＋ref」。JSON.stringify では .value ゲッターを
//   踏まないので依存が一切登録されず、watch は一生発火しない（実測で確認済み）。
//   各 ref の .value を実際に読むこと。
watch(() => Object.values(prefer.r).map(entry => entry.value), () => searchHintController.restart());

// ⚠️起動直後も含めて数え始める。狭さの判定は onMounted の後に決まるので、
//   compact を見張っていないと「PCで開いて狭くした」場合に永遠に出ない。
watch([compact, currentPage], () => searchHintController.restart(), { immediate: true });

watch(router.currentRef, () => {
	const fullPath = router.getCurrentFullPath();
	if (!isSettingsFullPath(fullPath)) {
		lastNonSettingsRoute = fullPath;
		// ⚠️設定から出た。入り直せばまた出すが、待ち時間は20秒ずつ延びる。
		searchHintController.noteLeftSettings();
	}
	playPageEnter();
	if (currentPage.value?.route.name != null) compactNavigationSection.value = null;
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
/* 旗鯖fork: 狭い幅の画面遷移。進むときは右から、戻るときは左から。
   ⚠️出入りの遷移(Transition)にしないこと。要素を差し替える作りは、
   途中で止まると中身が消えたまま戻らない。⚠️使い捨てのアニメーションなら
   途中で止まっても中身は残る。 */
@keyframes settingsPageForward { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
@keyframes settingsPageBack { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: none; } }
.contentCard[data-page-enter='forward'] { animation: settingsPageForward 240ms cubic-bezier(.2, .9, .2, 1); }
.contentCard[data-page-enter='back'] { animation: settingsPageBack 240ms cubic-bezier(.2, .9, .2, 1); }
@media (prefers-reduced-motion: reduce) {
	.contentCard[data-page-enter='forward'], .contentCard[data-page-enter='back'] { animation: none; }
}
/* 旗鯖fork: 左ペインの下位一覧への出入り。進むときは左へ、戻るときは右へ滑らせる。
   ⚠️位置だけを動かすこと。高さを動かすと下の項目まで一緒に跳ねる。 */
:global(.settings-drill-forward-enter-active), :global(.settings-drill-forward-leave-active),
:global(.settings-drill-back-enter-active), :global(.settings-drill-back-leave-active) {
	transition: opacity 180ms ease, transform 240ms cubic-bezier(.2, .9, .2, 1);
}
:global(.settings-drill-forward-enter-from) { opacity: 0; transform: translateX(18px); }
:global(.settings-drill-forward-leave-to) { opacity: 0; transform: translateX(-18px); }
:global(.settings-drill-back-enter-from) { opacity: 0; transform: translateX(-18px); }
:global(.settings-drill-back-leave-to) { opacity: 0; transform: translateX(18px); }
@media (prefers-reduced-motion: reduce) {
	:global(.settings-drill-forward-enter-active), :global(.settings-drill-forward-leave-active),
	:global(.settings-drill-back-enter-active), :global(.settings-drill-back-leave-active) { transition: none; }
}
:global(.settings-title-enter-active), :global(.settings-title-leave-active) { transition: opacity .2s ease, transform .24s cubic-bezier(.2, .9, .2, 1); display: inline-block; }
:global(.settings-title-enter-from) { opacity: 0; transform: translateX(12px); }
:global(.settings-title-leave-to) { opacity: 0; transform: translateX(-12px); }
@media (prefers-reduced-motion: reduce) {
	:global(.settings-title-enter-active), :global(.settings-title-leave-active) { transition: none; }
}
/* 旗鯖fork: ⚠️列を固定したまま子を足さないこと。虫眼鏡が暗黙の4列目へ落ち、
   幅が中身なり(実測12px)になって潰れていた。虫眼鏡の列を明示する。 */
/* 旗鯖fork: ⚠️左右の列を同じ幅にして、真ん中の題を器の中央へ固定する。
   ⚠️右にボタンを足すたびに軸がずれる作りにしないこと。 */
.compactTop { display: grid; grid-template-columns: minmax(44px, 1fr) auto minmax(44px, 1fr); align-items: center; gap: 10px; }
.compactActions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
/* ⚠️案内は題より控えめに。ただし小さすぎると読まれない。
   ⚠️上限は幅で決まる。中央の枠は左右44pxのボタンと隙間・余白に挟まれ、
     幅375pxの端末で残りはおよそ235px。「こちらから設定を検索できます ＞」は
     全角15文字＋空白なので、1remだと約240px。字間をわずかに詰めて収める。
     これ以上大きくすると末尾が「…」で切れる。 */
/* ⚠️矢印だけを動かすので、文言からは外して印として持たせている。
   ⚠️動きを減らす設定のときは .scope[data-motion-enabled='false'] が
     子孫の animation を止めるので、ここで個別に書く必要はない。
   ⚠️大きく動かさないこと。題の場所で跳ねると、読む前に目が逃げる。 */
.compactHintArrow { display: inline-block; margin-inline-start: .25em; animation: settingsHintArrow 1.6s ease-in-out infinite; will-change: transform; }

@keyframes settingsHintArrow {
	0%, 100% { transform: translateX(0); }
	50% { transform: translateX(.22em); }
}

.compactHint { display: inline-block; overflow: hidden; max-inline-size: 100%; color: var(--MI_THEME-accent); cursor: pointer; font-size: 1rem; font-weight: 700; letter-spacing: -.02em; text-overflow: ellipsis; white-space: nowrap; }
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
.nav { min-block-size: 0; overflow-y: auto; overscroll-behavior: contain; padding: 14px 20px; }
.profileRow { display: flex; gap: 10px; align-items: stretch; margin-bottom: 14px; }
.profile { min-height: 64px; color: var(--MI_THEME-fg); text-decoration: none; &:hover { text-decoration: none; } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } }
.profile { display: flex; min-width: 0; flex: 1; align-items: center; gap: 11px; border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 36%, var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent))); border-radius: 18px; padding: 10px 12px; background: light-dark(color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--settings-surface, var(--MI_THEME-panel))), color-mix(in srgb, var(--MI_THEME-accent) 18%, var(--settings-surface, var(--MI_THEME-panel)))); }
.avatar { width: 40px; height: 40px; flex: none; }
.profileText { display: grid; min-width: 0; gap: 2px; strong, small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } strong { font-size: .82rem; } small { color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); font-size: .68rem; } }
/* 旗鯖fork: 絞り込みの錠剤ケース。⚠️寸法と表現は右ペインの兄弟タブに揃える。 */
.filterRow { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 14px; }
/* ⚠️「ALL」だけは文字。絵の並びの中で浮かないよう、字面を小さく詰める。 */
.filterMark { font-size: .68rem; font-weight: 800; letter-spacing: .04em; line-height: 1; }
.filterPills { display: flex; min-width: 0; max-width: 100%; align-items: center; gap: 2px; flex-wrap: nowrap; overflow-x: auto; box-sizing: border-box; padding: 4px; border-radius: 9999px; background: color-mix(in srgb, var(--MI_THEME-bg) 74%, var(--MI_THEME-panel)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--MI_THEME-divider) 60%, transparent) inset; scrollbar-width: none; }
.filterPills::-webkit-scrollbar { display: none; }
.filter { display: inline-flex; flex: 0 0 auto; min-width: 40px; min-height: 36px; align-items: center; justify-content: center; border: 0; border-radius: 9999px; padding: 6px 10px; background: transparent; color: color-mix(in srgb, var(--MI_THEME-fg) 55%, transparent); cursor: pointer; font: inherit; font-size: .7rem; font-weight: 700; white-space: nowrap; transition: color 200ms ease, background-color 200ms ease; &:hover { color: var(--MI_THEME-fg); background: color-mix(in srgb, var(--MI_THEME-fg) 6%, transparent); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: -3px; } > i { font-size: 1rem; } }
/* ⚠️選択中は塗りつぶさない。アクセント色の文字＋淡い下地で示す。 */
.filter[data-active='true'], .filter[data-active='true']:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent); color: var(--MI_THEME-accent); font-weight: 800; }
/* ⚠️見出しも中央へ。上の絞り込みケースと下のグリッドが中央寄せなので、
   ここだけ左詰めだと軸が食い違って見える。 */
.sectionTitle { margin: 14px 0 8px; padding: 0 10px; color: var(--MI_THEME-accent); font-size: .74rem; font-weight: 700; letter-spacing: .03em; line-height: 1.45; text-align: center; }
/* 旗鯖fork: よく使う設定は札を並べたグリッドにする。
   ⚠️横並び(アイコン→文字)で2列にすると1つ約100pxしかなく、日本語の
   ラベルが丸ごと隠れてアイコンだけの謎のタイルになった（実測: 文字の幅0）。
   ⚠️縦積み(アイコンの下に文字)にすれば、2列でも文字が読める。 */
.quickGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.quickItem { display: flex; box-sizing: border-box; width: 100%; min-width: 0; min-height: 68px; flex-direction: column; align-items: center; justify-content: center; gap: 4px; overflow: hidden; text-align: center; appearance: none; cursor: pointer; font: inherit; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 16px; padding: 8px 11px; background: var(--settings-bg, var(--MI_THEME-bg)); color: var(--MI_THEME-fg); font-size: .75rem; text-decoration: none; &:hover { border-color: color-mix(in srgb, var(--MI_THEME-accent) 45%, var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent))); text-decoration: none; } > i { flex: none; color: var(--MI_THEME-accent); font-size: 1.15rem; } > span { display: block; box-sizing: border-box; width: 100%; min-width: 0; padding-inline: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
/* 旗鯖fork: 左ペインの大分類。⚠️Hataskey UI の上部タブと同じ考え方で、
   選択中は塗りつぶさずアクセント色の文字＋淡い下地で示す。 */
/* 旗鯖fork: 最小化した左ペイン（帯）。
   ⚠️並ぶものは全部「同じ形の押せるボタン」に揃えること。
   以前は押せない飾りが1つ混ざっていて、光っているのに反応せず戸惑わせた。
   ⚠️中央へ揃えること。器に padding が残っていると左へ寄って見える。 */
/* 旗鯖fork: ⚠️畳んだときは器ごと細くすること。左を空けたまま幅だけ残すと、
   右ペインが広がらず畳んだ意味がない。

   ⚠️`grid-template-columns` に transition を掛けないこと。
   `minmax(226px,272px)` と `64px` はトラックの形が違って補間できず、
   ⚠️**値が古いまま張り付いて畳めなくなる**（実測: transition を切ると
   即 64px、付けると 272px のまま動かない）。
   ⚠️器は即座に切り替え、動きは「左ペインの中身の幅」で見せる。 */
.layout[data-nav-mode='rail'] { grid-template-columns: 64px minmax(0, 1fr); }
.layout[data-nav-mode='rail'] > .nav { padding-inline: 6px; }
.nav { transition: width 260ms cubic-bezier(.2, .9, .2, 1); }

/* 旗鯖fork: 畳んだときの虫眼鏡。⚠️右上のアイコンの左に並ぶ。 */
.compactSearchIcon { display: grid; box-sizing: border-box; width: 38px; height: 38px; flex: none; place-items: center; border: 0; border-radius: 999px; padding: 0; background: var(--settings-bg, var(--MI_THEME-bg)); color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: 1.05rem; transition: width 220ms cubic-bezier(.2, .9, .2, 1), opacity 160ms ease; }
/* ⚠️開いているときは幅0へ畳む。display:none にしないこと。動きが消える。 */
.compactSearchIcon[data-collapsed='false'] { width: 0; margin: 0; opacity: 0; overflow: hidden; pointer-events: none; }
.compactSearchIcon:hover { background: var(--MI_THEME-buttonHoverBg); }
.compactSearchIcon:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: -3px; }
/* ⚠️`.compactHeader .searchTrigger` と同じ詳細度だと、後ろに書かれている
   器の指定に負けて畳めない（実測: 高さ18pxが残った）。親を含めて上書きする。 */
.compactHeader .searchTrigger[data-collapsed='true'] { min-height: 0; height: 0; margin: 0; padding-block: 0; border-width: 0; opacity: 0; overflow: hidden; pointer-events: none; }
.compactHeader .searchTrigger { transition: height 220ms cubic-bezier(.2, .9, .2, 1), margin-top 220ms cubic-bezier(.2, .9, .2, 1), opacity 160ms ease, padding-block 220ms cubic-bezier(.2, .9, .2, 1); }
@media (prefers-reduced-motion: reduce) { .nav, .compactSearchIcon, .compactHeader .searchTrigger { transition: none; } }

.rail { display: grid; justify-items: center; align-content: start; gap: 8px; padding: 6px 0; }
.railButton { display: grid; box-sizing: border-box; width: 44px; height: 44px; place-items: center; border: 0; border-radius: 999px; padding: 0; background: transparent; color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: 1.15rem; transition: background-color 200ms ease, color 200ms ease; }
.railButton:hover { background: color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent); }
.railButton:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: -3px; }
/* ⚠️いま開いている分類。押すと項目一覧が開く（飾りではない）。 */
.railCurrent { background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent); color: var(--MI_THEME-accent); }
.railCurrent:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 20%, transparent); }
.railAvatar { width: 32px; height: 32px; }
.detailPane { display: block; margin-top: 14px; }
.sectionPills { display: grid; gap: 4px; margin-top: 14px; }
.sectionPill { display: flex; box-sizing: border-box; width: 100%; min-height: 46px; align-items: center; gap: 10px; appearance: none; border: 0; border-radius: 999px; padding: 8px 14px; background: transparent; color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: .84rem; font-weight: 700; text-align: start; transition: color 200ms ease, background-color 200ms ease; touch-action: manipulation; &:hover { background: color-mix(in srgb, var(--MI_THEME-fg) 6%, transparent); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: -3px; } > i:first-child { flex: none; opacity: .8; font-size: 1.05rem; } /* ⚠️件数バッジにも当たらないようにすること。素の `> span` だとバッジが
     flex:1 を受け取り、ラベルと幅を山分けして文字が「…」で切れた
     （実測: ラベル77px / バッジ77px）。 */
	> span:not(.countBadge) { min-width: 0; overflow: hidden; flex: 1; text-overflow: ellipsis; white-space: nowrap; }
	> .countBadge { flex: none; }
}
.sectionPill[data-active='true'], .sectionPill[data-active='true']:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent); color: var(--MI_THEME-accent); font-weight: 800; box-shadow: inset 3px 0 0 var(--MI_THEME-accent); }
.sectionPill[data-active='true'] > i:first-child { color: var(--MI_THEME-accent); opacity: 1; }
/* 旗鯖fork: Tabler の代わりに絵を出すときの寸法。⚠️文字と同じ高さに揃える。 */
.pillImage { flex: none; width: 1.25em; height: 1.25em; border-radius: 4px; object-fit: contain; }
/* ⚠️畳むボタンは絞り込みのケースから独立させる（〇○○ 〇 の形）。
   ⚠️ケースの中に入れると「絞り込みの一種」に見えてしまう。 */
.collapseButton { display: grid; box-sizing: border-box; width: 44px; height: 44px; flex: none; place-items: center; align-self: center; border: 0; border-radius: 9999px; padding: 0; background: color-mix(in srgb, var(--MI_THEME-bg) 74%, var(--MI_THEME-panel)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--MI_THEME-divider) 60%, transparent) inset; color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: 1.05rem; transition: background-color 200ms ease; }
.collapseButton:hover { background: color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent); }
.collapseButton:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: -3px; }
.sectionPillCherrypick { color: var(--MI_THEME-accent); }
.sectionPillDeprecated { opacity: .68; }
/* 旗鯖fork: 兄弟タブはアクセントの「補色」で示す。
   ⚠️本文の操作(アクセント色)と同じ色にしないこと。どれが画面を切り替える帯で
   どれが設定そのものかが、色から読み取れなくなる。
   ⚠️相対色構文が効かない環境ではアクセント色へ落ちる。⚠️落ちても壊れないこと。 */
.siblingTabs { --hata-tab-accent: var(--MI_THEME-accent); }
@supports (color: hsl(from red h s l)) {
	.siblingTabs { --hata-tab-accent: hsl(from var(--MI_THEME-accent) calc(h + 180) s l); }
}
/* 旗鯖fork: 右ペインの兄弟タブ。⚠️寸法と表現は Hataskey UI 設定の錠剤ケースに揃える。 */
.siblingTabsSentinel { height: 0; margin: 0; padding: 0; }
.siblingTabs { display: flex; box-sizing: border-box; width: fit-content; max-width: 100%; min-width: 0; gap: 2px; flex-wrap: nowrap; overflow-x: auto; margin: 0 auto 12px; position: sticky; inset-block-start: 8px; z-index: 4; transition: box-shadow 220ms cubic-bezier(.2, .9, .2, 1), background-color 220ms ease; padding: 4px; border-radius: 9999px; background: color-mix(in srgb, var(--MI_THEME-bg) 74%, var(--MI_THEME-panel)); backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4); box-shadow: 0 0 0 1px color-mix(in srgb, var(--MI_THEME-divider) 60%, transparent) inset; scrollbar-width: none; }
.siblingTabs::-webkit-scrollbar { display: none; }
.siblingTabs > button { box-sizing: border-box; display: inline-flex; flex: 0 0 auto; min-width: 0; min-height: 40px; max-width: min(100%, 16rem); align-items: center; justify-content: center; gap: 6px; padding: 6px 10px; border: 0; border-radius: 9999px; background: transparent; color: color-mix(in srgb, var(--MI_THEME-fg) 55%, transparent); cursor: pointer; font: inherit; font-size: .75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 200ms ease, background-color 200ms ease, padding 200ms ease; &:focus-visible { outline: 3px solid color-mix(in srgb, var(--hata-tab-accent) 55%, transparent); outline-offset: -3px; } }
.siblingTabs > button[data-active='true'], .siblingTabs > button[data-active='true']:hover { background: color-mix(in srgb, var(--hata-tab-accent) 16%, transparent); color: var(--hata-tab-accent); font-weight: 750; padding-inline: 12px 14px; }
.siblingTabs > button[data-active='true'] > i { color: var(--hata-tab-accent); opacity: 1; }
.siblingTabs > button:hover:not([data-active='true']) { color: var(--hata-tab-accent); background: color-mix(in srgb, var(--hata-tab-accent) 8%, transparent); }
.siblingTabLabel { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 貼り付いている間だけ浮いて見せる。 */
.siblingTabs[data-stuck='true'] { background: color-mix(in srgb, var(--MI_THEME-panel) 92%, var(--MI_THEME-bg)); box-shadow: 0 6px 20px color-mix(in srgb, var(--MI_THEME-fg) 14%, transparent), 0 0 0 1px color-mix(in srgb, var(--hata-tab-accent) 34%, transparent) inset; }
@media (prefers-reduced-motion: reduce) { .siblingTabs, .sectionPill { transition: none; } }
.links { display: grid; gap: 3px; }
.navLink { display: flex; box-sizing: border-box; width: 100%; min-height: 44px; align-items: center; gap: 10px; appearance: none; border: 0; background: transparent; cursor: pointer; font: inherit; text-align: start; border-radius: 999px; padding: 7px 14px; color: var(--MI_THEME-fg); font-size: .84rem; text-decoration: none; touch-action: manipulation; &:hover { background: var(--MI_THEME-buttonHoverBg); text-decoration: none; } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } > i { opacity: .8; font-size: 1rem; } > span:not(.countBadge) { min-width: 0; flex: 1; line-break: strict; text-wrap: pretty; } }
/* 旗鯖fork: ⚠️塗りつぶさないこと。アイコンと文字をアクセント色にし、
   下地はごく淡く敷くだけにする（Hataskey UI の上部タブと同じ考え方）。 */
.navLinkActive, .navLinkActive:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent); color: var(--MI_THEME-accent); font-weight: 750; box-shadow: inset 3px 0 0 var(--MI_THEME-accent); > i { color: var(--MI_THEME-accent); opacity: 1; } }
.detailBack { margin-top: 14px; margin-bottom: 8px; border-style: dashed; }
/* ⚠️1つ目は戻る矢印、2つ目が分類の絵。絵だけアクセント色にする。 */
.detailBack > i:first-child { color: var(--MI_THEME-fgTransparentWeak); }
.detailBack > i:nth-child(2) { color: var(--MI_THEME-accent); }
.deprecatedBadge { flex: none; margin-left: auto; border-radius: 999px; padding: 3px 7px; background: color-mix(in srgb, var(--MI_THEME-warn) 14%, var(--settings-bg, var(--MI_THEME-bg))); color: var(--MI_THEME-warn); font-size: .62rem; font-weight: 800; letter-spacing: 0; }
.countBadge { flex: none; border-radius: 999px; color: color-mix(in srgb, var(--MI_THEME-fg) 72%, transparent); font-size: .72rem; font-variant-numeric: tabular-nums; line-height: 1; }
.sessionActions { margin-top: 14px; border-top: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); padding-top: 2px; }
.destructiveAction { display: flex; box-sizing: border-box; width: 100%; min-height: 44px; align-items: center; gap: 10px; border: 0; border-radius: 14px; padding: 8px 12px; background: transparent; color: var(--MI_THEME-error); cursor: pointer; font: inherit; font-size: .78rem; font-weight: 700; text-align: start; &:hover { background: color-mix(in srgb, var(--MI_THEME-error) 10%, transparent); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-error) 55%, transparent); outline-offset: 2px; } > i { font-size: 1rem; } }
.navLinkActive .countBadge { color: var(--MI_THEME-accent); opacity: .85; }
.legacyMenu { display: flex; width: 100%; min-height: 44px; align-items: center; justify-content: center; gap: 7px; margin-top: 16px; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 999px; background: var(--settings-surface, var(--MI_THEME-panel)); color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: .76rem; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } }
.main { min-width: 0; min-block-size: 0; overflow-y: auto; overscroll-behavior: contain; padding-inline-end: 8px; outline: 0; }
/* 旗鯖fork: スクロールバーは出さない。
   ⚠️手本は Hataskey UI のサイドメニュー（ui/simple.vue の .sbScroll）。
   ⚠️Firefox は `scrollbar-width`、Chromium/Safari は `::-webkit-scrollbar` と
   別々の仕組みなので、両方書くこと。片方だけだと片方のブラウザで出たままになる。
   ⚠️`scrollbar-gutter` も外すこと。バーが出ないのに場所だけ空くと、
   右端に説明のつかない余白が残る。 */
.nav, .main {
	scrollbar-width: none;
}

.nav::-webkit-scrollbar, .main::-webkit-scrollbar {
	width: 0;
	height: 0;
	display: none;
}

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
	/* 旗鯖fork: ⚠️プロフィール行をここで消さないこと。タブレット幅で
	   左上から自分のアイコンが丸ごと無くなり、どのアカウントの設定を
	   触っているのか画面から読めなかった（実測: display:none で 0×0）。
	   ⚠️絞り込みピルは縦を食うので、この幅では引き続き畳む。 */
	.filterPills { display: none; }
	.profileRow { margin-bottom: 10px; }
	.profile { min-height: 56px; border-radius: 16px; padding: 8px 10px; }
	.quickSectionTitle { display: none; }
	.quickGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
	.quickItem { min-height: 48px; justify-content: center; padding: 6px; background: var(--settings-surface, var(--MI_THEME-panel)); text-align: center; }
	.quickItem > i { font-size: 1.15rem; }
	.quickItem > span { display: none; }
	.navSection > .sectionTitle { min-height: 48px; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 999px; padding: 8px 13px; background: var(--settings-bg, var(--MI_THEME-bg)); font-size: .8rem; letter-spacing: .01em; }
	.detailBack, .navLink { background: var(--settings-surface, var(--MI_THEME-panel)); }
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
