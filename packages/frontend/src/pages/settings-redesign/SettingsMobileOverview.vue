<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<!-- 旗鯖fork: ⚠️自分のアイコンを必ず出すこと。狭い幅では左ペインの
	     プロフィール行が出ず、どのアカウントの設定を触っているのか
	     画面から読み取れなかった。 -->
	<button v-if="activeCategory == null && props.profileItem != null && props.profileUsername != null" type="button" :class="[$style.profileRow, { [$style.itemActive]: activeItemId === props.profileItem.id }]" :aria-current="activeItemId === props.profileItem.id ? 'page' : undefined" @click="emit('select', props.profileItem)">
		<img v-if="props.profileAvatarUrl != null" :src="props.profileAvatarUrl" :class="$style.profileAvatar" alt=""/>
		<span :class="$style.profileText">
			<strong>{{ props.profileName ?? props.profileUsername }}</strong>
			<small>@{{ props.profileUsername }}</small>
		</span>
		<i class="ti ti-chevron-right" aria-hidden="true"></i>
	</button>

	<section v-if="activeCategory == null" :class="$style.section" aria-labelledby="settings-mobile-quick">
		<h2 id="settings-mobile-quick" :class="$style.sectionTitle">{{ copy.frequentlyUsedSettings }}</h2>
		<div :class="$style.quickGrid">
			<button v-for="item in props.quickItems" :key="item.id" type="button" :class="[$style.quickItem, { [$style.itemActive]: activeItemId === item.id }]" :aria-label="item.label" :aria-current="activeItemId === item.id ? 'page' : undefined" @click="emit('select', item)">
				<i :class="item.icon" aria-hidden="true"></i><span :class="{ settingsBrand: item.brand != null || hasSettingsBrand(item.label) }">{{ item.label }}</span>
			</button>
		</div>
	</section>

	<section v-if="activeCategory == null" :class="[$style.section, $style.feature]" aria-labelledby="settings-mobile-feature">
		<div :class="$style.featureBadge"><i class="ti ti-sparkles" aria-hidden="true"></i>{{ copy.mobile.recommendedInUse }}</div>
		<h2 id="settings-mobile-feature"><span class="settingsBrand">Hataskey UI</span></h2>
		<p>{{ copy.mobile.featureDescription }}</p>
		<div :class="$style.featureActions">
			<button type="button" :class="[$style.featureLink, { [$style.itemActive]: activeItemId === props.featureItem.id }]" :aria-current="activeItemId === props.featureItem.id ? 'page' : undefined" @click="emit('select', props.featureItem)">{{ copy.mobile.openSettings }}<i class="ti ti-arrow-right" aria-hidden="true"></i></button>
			<button type="button" :class="$style.featurePreview" :aria-label="copy.ui2.openPreview" @click="emit('preview')"><i class="ti ti-eye" aria-hidden="true"></i></button>
		</div>
	</section>

	<section v-if="activeCategory == null && props.valueItems.length > 0" :class="$style.section" aria-labelledby="settings-mobile-current">
		<h2 id="settings-mobile-current" :class="$style.sectionTitle">{{ copy.mobile.changeCurrentValues }}</h2>
		<div :class="$style.valueGrid">
			<button v-for="item in props.valueItems" :key="item.id" type="button" :class="[$style.valueItem, { [$style.itemActive]: activeItemId === item.id }]" :aria-current="activeItemId === item.id ? 'page' : undefined" @click="emit('select', item)">
				<span :class="{ settingsBrand: item.brand != null || hasSettingsBrand(item.label) }">{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ copy.mobile.openSettings }}</small>
			</button>
		</div>
	</section>

	<template v-if="activeCategory == null">
		<section :class="$style.section" aria-labelledby="settings-mobile-categories">
			<h2 id="settings-mobile-categories" :class="$style.sectionTitle">{{ copy.mobile.allCategories }}</h2>
			<div :class="$style.categories">
				<button v-for="section in props.sections" :key="section.id" :ref="element => setCategoryButtonRef(section.id, element)" type="button" :class="[$style.category, { [$style.itemActive]: activeSectionId === section.id }]" :aria-current="activeSectionId === section.id ? 'page' : undefined" :data-settings-mobile-category-id="section.id" @click="openCategory(section.id)">
					<i :class="section.icon" aria-hidden="true"></i>
					<span><strong :class="{ settingsBrand: section.brand != null || hasSettingsBrand(section.label) }">{{ section.label }}</strong><small :class="{ settingsBrandText: hasSettingsBrand(section.description) }">{{ section.description }}</small></span>
					<i class="ti ti-chevron-right" aria-hidden="true"></i>
				</button>
			</div>
		</section>

		<section v-if="props.deprecatedSections.length > 0" :class="[$style.section, $style.deprecated]" :aria-label="copy.mobile.misskeyRelatedSettings">
			<h2 :class="$style.srOnly">{{ copy.mobile.misskeyRelatedSettings }}</h2>
			<div :class="$style.categories">
				<button v-for="section in props.deprecatedSections" :key="section.id" :ref="element => setCategoryButtonRef(section.id, element)" type="button" :class="[$style.category, { [$style.itemActive]: activeSectionId === section.id }]" :aria-current="activeSectionId === section.id ? 'page' : undefined" :data-settings-mobile-category-id="section.id" @click="openCategory(section.id)">
					<i :class="section.icon" aria-hidden="true"></i>
					<span><strong :class="{ settingsBrand: section.brand != null || hasSettingsBrand(section.label) }">{{ section.label }}</strong><small :class="{ settingsBrandText: hasSettingsBrand(section.description) }">{{ section.description }}</small></span>
					<small :class="$style.deprecatedPill">{{ copy.mobile.deprecated }}</small>
					<i class="ti ti-chevron-right" aria-hidden="true"></i>
				</button>
			</div>
		</section>
	</template>

	<section v-else :class="[$style.section, $style.categoryDetail]" :aria-labelledby="`settings-mobile-category-${activeCategory.id}`">
		<button ref="categoryBackEl" type="button" :class="$style.categoryBack" @click="openCategory(null)"><i class="ti ti-chevron-left" aria-hidden="true"></i>{{ copy.mobile.allCategories }}</button>
		<h2 :id="`settings-mobile-category-${activeCategory.id}`" :class="$style.sectionTitle"><span :class="{ settingsBrand: activeCategory.brand != null || hasSettingsBrand(activeCategory.label) }">{{ activeCategory.label }}</span></h2>
		<p :class="[$style.categoryDescription, { settingsBrandText: hasSettingsBrand(activeCategory.description) }]">{{ activeCategory.description }}</p>
		<div :class="$style.categoryLinks">
			<button v-for="item in activeCategory.items" :key="item.id" type="button" :class="{ [$style.itemActive]: activeItemId === item.id }" :aria-current="activeItemId === item.id ? 'page' : undefined" @click="emit('select', item)"><i :class="item.icon" aria-hidden="true"></i><span :class="{ settingsBrand: item.brand != null || hasSettingsBrand(item.label) }">{{ item.label }}</span><i class="ti ti-chevron-right" aria-hidden="true"></i></button>
		</div>
	</section>

	<section v-if="activeCategory == null && props.destructiveItems.length > 0" :class="[$style.section, $style.destructive]" aria-labelledby="settings-mobile-session-actions">
		<h2 id="settings-mobile-session-actions" :class="$style.sectionTitle">{{ copy.sessionAndLogin }}</h2>
		<div :class="$style.destructiveActions">
			<button
				v-for="item in props.destructiveItems"
				:key="item.id"
				type="button"
				:data-settings-search-id="item.searchId"
				data-settings-search-destructive="true"
				@click="emit('action', item.id)"
			>
				<i :class="item.icon" aria-hidden="true"></i>{{ item.label }}
			</button>
		</div>
	</section>

	<button v-if="activeCategory == null && props.legacyLabel" type="button" :class="$style.legacyPill" @click="emit('legacy')"><i class="ti ti-history" aria-hidden="true"></i>{{ props.legacyLabel }}</button>
</div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import type { SettingsSearchNavigationTargetV2 } from '@/utility/settings-search-v2-context.js';
import { i18n } from '@/i18n.js';

// 旗鯖fork: iconImage は Tabler の代わりに出す絵。⚠️あるときは icon を描かない。
export type SettingsOverviewItem = SettingsSearchNavigationTargetV2 & { id: string; label: string; icon: string; iconImage?: string; brand?: string };
export type SettingsOverviewSection = { id: string; label: string; description: string; icon: string; iconImage?: string; brand?: string; items: SettingsOverviewItem[] };
export type SettingsOverviewValue = SettingsSearchNavigationTargetV2 & { id: string; label: string; value: string; brand?: string };
export type SettingsOverviewDestructiveItem = { id: string; searchId: string; label: string; icon: string; brand?: string };

const props = withDefaults(defineProps<{
	quickItems: SettingsOverviewItem[];
	sections: SettingsOverviewSection[];
	activeItemId?: string | null;
	deprecatedSections?: SettingsOverviewSection[];
	valueItems: SettingsOverviewValue[];
	featureItem: SettingsOverviewItem;
	/**
	 * 旗鯖fork: 自分のアイコン行。⚠️ここで MkAvatar を使わないこと。
	 *   端末設定の読み出しを引き連れてくるため、この画面の単体検査が
	 *   丸ごと起動しなくなる（実測: Cannot read properties of undefined）。
	 *   値はシェルから受け取り、この画面は素の画像として描くだけにする。
	 */
	profileItem?: SettingsOverviewItem;
	profileName?: string | null;
	profileUsername?: string | null;
	profileAvatarUrl?: string | null;
	destructiveItems?: SettingsOverviewDestructiveItem[];
	legacyLabel?: string;
	activeCategoryId?: string | null;
}>(), {
	deprecatedSections: () => [],
	destructiveItems: () => [],
	legacyLabel: undefined,
	activeCategoryId: null,
	activeItemId: null,
	profileItem: undefined,
	profileName: null,
	profileUsername: null,
	profileAvatarUrl: null,
});

const emit = defineEmits<{
	select: [item: SettingsSearchNavigationTargetV2];
	action: [id: string];
	preview: [];
	legacy: [];
	openCategory: [id: string | null];
}>();

const copy = i18n.ts._hata._settingsRedesign;
const activeCategory = computed(() => [...props.sections, ...props.deprecatedSections].find(section => section.id === props.activeCategoryId) ?? null);
const activeSectionId = computed(() => [...props.sections, ...props.deprecatedSections].find(section => section.items.some(item => item.id === props.activeItemId))?.id ?? null);
const hasSettingsBrand = (value: string) => /Hataskey|Hatask|Hatady|HataFeed|HataSNSCordUI/u.test(value);
const categoryBackEl = ref<HTMLButtonElement | null>(null);
const categoryButtonEls = new Map<string, HTMLButtonElement>();

function setCategoryButtonRef(id: string, element: Element | ComponentPublicInstance | null) {
	if (element instanceof HTMLButtonElement) {
		categoryButtonEls.set(id, element);
		return;
	}
	categoryButtonEls.delete(id);
}

function openCategory(id: string | null) {
	emit('openCategory', id);
}

watch(activeCategory, async (nextCategory, previousCategory) => {
	await nextTick();
	if (nextCategory != null) {
		categoryBackEl.value?.focus({ preventScroll: true });
		return;
	}
	if (previousCategory != null) categoryButtonEls.get(previousCategory.id)?.focus({ preventScroll: true });
}, { flush: 'post' });
</script>

<style lang="scss" module>
/* 旗鯖fork: 非推奨バッジは見出しの行に揃える。
   ⚠️行の中央へ置かないこと。説明が2行に折り返す行では、バッジの上下に
   空きができて宙に浮いて見えた（実測: 上32px / 下12px）。 */
.deprecatedPill {
	align-self: flex-start;
	margin-block-start: 2px;
}

/* 旗鯖fork: 自分のアイコン行。左ペインのプロフィール行と同じ役割を狭い幅で担う。 */
.profileRow {
	display: flex;
	box-sizing: border-box;
	width: 100%;
	min-height: 64px;
	align-items: center;
	gap: 11px;
	margin-bottom: 14px;
	border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 36%, var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)));
	border-radius: 18px;
	padding: 10px 12px;
	background: light-dark(color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--settings-surface, var(--MI_THEME-panel))), color-mix(in srgb, var(--MI_THEME-accent) 18%, var(--settings-surface, var(--MI_THEME-panel))));
	color: var(--MI_THEME-fg);
	cursor: pointer;
	font: inherit;
	text-align: start;

	&:focus-visible {
		outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent);
		outline-offset: -3px;
	}

	> i:last-child { flex: none; margin-left: auto; opacity: .6; }
}

.profileAvatar { width: 40px; height: 40px; flex: none; border-radius: 50%; object-fit: cover; }

.profileText {
	display: grid;
	min-width: 0;
	gap: 2px;

	strong, small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	strong { font-size: .9rem; }
	small { color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); font-size: .72rem; }
}

.root { padding: 4px 0 12px; }
.srOnly { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.section + .section { margin-top: 20px; }
/* ⚠️見出しも中央へ。下のグリッドが中央寄せの札なので、
   ここだけ左詰めだと軸が食い違って見える。 */
.sectionTitle { margin: 0 0 12px; color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); font-size: .78rem; font-weight: 700; line-height: 1.5; text-align: center; }
.quickGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.quickItem { display: grid; box-sizing: border-box; width: 100%; min-height: 104px; place-content: center; gap: 8px; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 20px; padding: 12px 6px; background: var(--settings-surface, var(--MI_THEME-panel)); color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: .8rem; font-weight: 700; text-align: center; line-break: strict; text-wrap: pretty; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } > i { display: grid; width: 44px; height: 44px; place-items: center; margin: auto; border-radius: 50%; background: light-dark(color-mix(in srgb, var(--MI_THEME-accent) 13%, var(--settings-surface, var(--MI_THEME-panel))), color-mix(in srgb, var(--MI_THEME-accent) 22%, var(--settings-surface, var(--MI_THEME-panel)))); color: var(--MI_THEME-accent); font-size: 1.25rem; } }
.feature { border-radius: 24px; padding: 20px; background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); }
.featureBadge { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 5px 10px; background: color-mix(in srgb, var(--MI_THEME-fgOnAccent) 22%, transparent); font-size: .72rem; font-weight: 700; }
.feature h2 { margin: 12px 0 8px; font-size: 1.7rem; line-height: 1.1; }
.feature p { margin: 0; font-size: .84rem; line-height: 1.7; line-break: strict; text-wrap: pretty; }
.featureActions { display: flex; gap: 10px; margin-top: 16px; }
/* 旗鯖fork: ⚠️このボタンはアクセント色のカードの上に載る。汎用の buttonHoverBg だと
   カードと同化してボタンの位置が分からなくなるので、必ず明るい側へ寄せる。 */
.featureLink, .featurePreview { border: 0; background: var(--MI_THEME-panel); color: var(--MI_THEME-accent); cursor: pointer; font: inherit; font-weight: 700; &:hover { background: color-mix(in srgb, var(--MI_THEME-panel) 88%, var(--MI_THEME-accent)); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-fgOnAccent) 60%, transparent); outline-offset: 2px; } }
.featureLink { display: flex; min-width: 0; flex: 1; min-height: 48px; align-items: center; justify-content: center; gap: 8px; border-radius: 999px; padding: 8px 14px; font-size: .9rem; }
.featurePreview { display: grid; flex: 0 0 48px; width: 48px; height: 48px; place-items: center; border-radius: 50%; font-size: 1.15rem; }
.valueGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.valueItem { display: grid; box-sizing: border-box; width: 100%; min-height: 124px; align-content: start; gap: 8px; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 20px; padding: 16px; background: var(--settings-surface, var(--MI_THEME-panel)); color: var(--MI_THEME-fg); cursor: pointer; font: inherit; text-align: start; line-break: strict; text-wrap: pretty; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } > span { color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); font-size: .78rem; } > strong { color: var(--MI_THEME-accent); font-size: 1.2rem; line-height: 1.2; } > small { margin-top: auto; color: var(--MI_THEME-accent); font-size: .72rem; font-weight: 700; } }
.categories { overflow: clip; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 22px; background: var(--settings-surface, var(--MI_THEME-panel)); }
.category { display: grid; box-sizing: border-box; width: 100%; min-height: 76px; grid-template-columns: 42px minmax(0, 1fr) auto; align-items: center; gap: 14px; border: 0; padding: 12px 16px; background: transparent; color: var(--MI_THEME-fg); cursor: pointer; font: inherit; text-align: start; &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: -3px; } > i:first-child { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 14px; background: var(--settings-bg, var(--MI_THEME-bg)); color: var(--MI_THEME-accent); font-size: 1.2rem; } > span { min-width: 0; } strong, small { display: block; line-break: strict; text-wrap: pretty; } strong { font-size: .92rem; } small { margin-top: 3px; color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); font-size: .74rem; line-height: 1.5; } > i:last-child { color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); } }
.category + .category { border-top: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); }
/* 旗鯖fork: ⚠️選択中を塗りつぶさない。アイコンと文字をアクセント色にし、
   下地はごく淡く敷くだけ（Hataskey UI の上部タブと同じ考え方）。
   ⚠️`!important` を外さないこと。ここは修飾用クラスとして後から重ねられる。 */
.itemActive, .itemActive:hover { border-color: var(--MI_THEME-accent) !important; background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent) !important; color: var(--MI_THEME-accent) !important; font-weight: 750 !important; box-shadow: inset 3px 0 0 var(--MI_THEME-accent); }
.itemActive > i, .itemActive i { color: var(--MI_THEME-accent) !important; }
.category.itemActive, .category.itemActive:hover { border-color: transparent !important; background: color-mix(in srgb, var(--MI_THEME-accent) 14%, var(--settings-surface, var(--MI_THEME-panel))) !important; color: var(--MI_THEME-accent) !important; box-shadow: inset 3px 0 0 var(--MI_THEME-accent); }
.category.itemActive > i:first-child { background: color-mix(in srgb, var(--MI_THEME-accent) 22%, var(--settings-bg, var(--MI_THEME-bg))); color: var(--MI_THEME-accent); }
.category.itemActive > i:last-child { color: var(--MI_THEME-accent); }
.categoryDetail { border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 22px; padding: 14px; background: var(--settings-surface, var(--MI_THEME-panel)); }
.categoryBack { display: inline-flex; min-height: 48px; align-items: center; gap: 6px; border: 0; border-radius: 999px; padding: 8px 10px; background: transparent; color: var(--MI_THEME-accent); cursor: pointer; font: inherit; font-size: .78rem; font-weight: 700; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } }
.categoryDescription { margin: -5px 0 12px; color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); font-size: .8rem; line-height: 1.55; }
.categoryLinks { display: grid; gap: 4px; }
.categoryLinks button { display: flex; box-sizing: border-box; width: 100%; min-height: 48px; align-items: center; gap: 9px; border: 0; border-radius: 14px; padding: 8px 10px; background: transparent; color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: .8rem; text-align: start; line-break: strict; text-wrap: pretty; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } > i { color: var(--MI_THEME-accent); } > i:last-child { margin-left: auto; color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); } }
.deprecated .categories { border-color: color-mix(in srgb, var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)) 64%, transparent); background: color-mix(in srgb, var(--settings-bg, var(--MI_THEME-bg)) 76%, var(--MI_THEME-panel)); }
.deprecated .sectionTitle { color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); }
.deprecated .category { min-height: 64px; grid-template-columns: 42px minmax(0, 1fr) auto auto; opacity: .82; }
.deprecated .category > i:first-child { background: color-mix(in srgb, var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)) 12%, var(--settings-bg, var(--MI_THEME-bg))); color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); }
.deprecatedPill { display: inline-flex; min-height: 24px; align-items: center; border-radius: 999px; padding: 3px 8px; background: color-mix(in srgb, var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)) 16%, transparent); color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); font-size: .66rem; font-weight: 700; white-space: nowrap; }
.destructiveActions { display: grid; gap: 6px; }
.destructiveActions button { display: flex; width: 100%; min-height: 48px; align-items: center; gap: 9px; border: 1px solid color-mix(in srgb, var(--MI_THEME-error) 34%, var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent))); border-radius: 14px; padding: 9px 12px; background: transparent; color: var(--MI_THEME-error); cursor: pointer; font: inherit; font-size: .82rem; font-weight: 700; text-align: start; &:hover { background: color-mix(in srgb, var(--MI_THEME-error) 10%, transparent); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-error) 55%, transparent); outline-offset: 2px; } > i { font-size: 1rem; } }
.legacyPill { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; gap: 7px; margin-top: 20px; border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); border-radius: 999px; padding: 8px 13px; background: transparent; color: var(--settings-muted, color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent)); cursor: pointer; font: inherit; font-size: .76rem; font-weight: 700; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 50%, transparent); outline-offset: 2px; } }
</style>
