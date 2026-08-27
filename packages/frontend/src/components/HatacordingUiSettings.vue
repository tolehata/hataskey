<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<div
	:class="[$style.root, compact && $style.compact]"
	:data-color-mode="preferences.colorMode"
	data-hatacording-ui-settings
>
	<div :class="$style.section">
		<div :class="$style.heading"><strong>{{ copy.uiColor }}</strong><span>{{ copy.uiColorDescription }}</span></div>
		<div :class="$style.choiceBar" role="group" :aria-label="copy.uiColor">
			<button
				v-for="choice in colorChoices"
				:key="choice.id"
				type="button"
				:class="[$style.choice, preferences.colorMode === choice.id && $style.activeChoice]"
				:data-active="preferences.colorMode === choice.id ? 'true' : 'false'"
				:aria-pressed="preferences.colorMode === choice.id"
				@click="updatePreferences({ colorMode: choice.id })"
			>
				{{ choice.label }}
			</button>
		</div>
	</div>

	<div :class="$style.section" data-hatacording-ui-scale-selector>
		<div :class="$style.heading"><strong>{{ copy.uiScale }}</strong><span>{{ copy.uiScaleDescription }}</span></div>
		<div :class="$style.choiceBar" role="group" :aria-label="copy.uiScale">
			<button
				v-for="choice in scaleChoices"
				:key="choice.id"
				type="button"
				:class="[$style.choice, preferences.uiScale === choice.id && $style.activeChoice]"
				:data-active="preferences.uiScale === choice.id ? 'true' : 'false'"
				:aria-pressed="preferences.uiScale === choice.id"
				@click="updatePreferences({ uiScale: choice.id })"
			>
				{{ choice.label }}
			</button>
		</div>
	</div>

	<div :class="$style.switches">
		<MkSwitch :modelValue="preferences.timelineRealtime" :disabled="!realtimeAvailable" @update:modelValue="value => updatePreferences({ timelineRealtime: value })">
			{{ copy.realtimeUpdate }}
			<template #caption>{{ realtimeAvailable ? copy.realtimeUpdateDescription : copy.realtimeUnavailable }}</template>
		</MkSwitch>
		<MkSwitch :modelValue="preferences.reuseSubpaneTab" @update:modelValue="value => updatePreferences({ reuseSubpaneTab: value })">
			{{ copy.reuseSubpaneTab }}
		</MkSwitch>
		<MkSwitch :modelValue="preferences.showRateLimitNumber" @update:modelValue="value => updatePreferences({ showRateLimitNumber: value })">
			{{ copy.showRateLimitNumber }}
		</MkSwitch>
		<MkSwitch :modelValue="preferences.showCharacterCounter" @update:modelValue="value => updatePreferences({ showCharacterCounter: value })">
			{{ copy.showCharacterCounter }}
		</MkSwitch>
		<MkSwitch :modelValue="preferences.showFoilAnimation" @update:modelValue="value => updatePreferences({ showFoilAnimation: value })">
			{{ copy.showShimmerAnimation }}
		</MkSwitch>
	</div>

	<p v-if="!compact" :class="[$style.note, 'settingsBrandText']">{{ copy.savedLocally }}</p>
</div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, toRefs } from 'vue';
import type {
	HatacordingUiColorMode,
	HatacordingUiDevicePreferences,
	HatacordingUiPreferencesChangeDetail,
	HatacordingUiScale,
} from '@/utility/hatacording-ui.js';
import MkSwitch from '@/components/MkSwitch.vue';
import {
	HATACORDING_UI_PREFERENCES_CHANGE_EVENT,
	readHatacordingUiPreferences,
	writeHatacordingUiPreferences,
} from '@/utility/hatacording-ui.js';
import { i18n } from '@/i18n.js';

const props = withDefaults(defineProps<{
	accountId: string;
	compact?: boolean;
	realtimeAvailable?: boolean;
}>(), {
	compact: false,
	realtimeAvailable: true,
});
const { accountId } = toRefs(props);

const preferences = ref(readHatacordingUiPreferences(accountId.value));
const copy = i18n.ts._hata._hatacordingUi._settings;
const colorChoices: { id: HatacordingUiColorMode; label: string }[] = [
	{ id: 'theme', label: copy.theme },
	{ id: 'light', label: copy.light },
	{ id: 'dark', label: copy.dark },
];
const scaleChoices: { id: HatacordingUiScale; label: string }[] = [
	{ id: 'small', label: copy.small },
	{ id: 'medium', label: copy.medium },
	{ id: 'large', label: copy.large },
];

function updatePreferences(patch: Partial<HatacordingUiDevicePreferences>) {
	const next: HatacordingUiDevicePreferences = { ...preferences.value, ...patch };
	preferences.value = next;
	writeHatacordingUiPreferences(accountId.value, next);
}

function syncPreferences(event: Event) {
	const detail = (event as CustomEvent<HatacordingUiPreferencesChangeDetail>).detail;
	if (detail.accountId !== accountId.value) return;
	preferences.value = detail.preferences;
}

onMounted(() => window.addEventListener(HATACORDING_UI_PREFERENCES_CHANGE_EVENT, syncPreferences));
onBeforeUnmount(() => window.removeEventListener(HATACORDING_UI_PREFERENCES_CHANGE_EVENT, syncPreferences));
</script>

<style lang="scss" module>
.root {
	display: grid;
	gap: 18px;
	padding: 4px 0;
	color: var(--MI_THEME-fg);
}

.compact {
	min-width: min(290px, 78cqw);
	gap: 13px;
	padding: 8px 10px;
}

.section {
	display: grid;
	gap: 8px;
}

.heading {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12px;
}

.heading strong {
	font-size: .9em;
}

.heading span {
	color: var(--MI_THEME-fg);
	font-size: .74em;
	opacity: .62;
}

.compact .heading span {
	display: none;
}

.choiceBar {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	grid-auto-rows: 28px;
	align-items: stretch;
	gap: 4px;
	padding: 3px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 12px;
	background: color-mix(in srgb, var(--MI_THEME-bg) 88%, var(--MI_THEME-panel));
}

.choice {
	display: grid;
	min-width: 0;
	height: 28px;
	min-height: 28px;
	max-height: 28px;
	place-items: center;
	padding: 0 8px;
	border: 1px solid transparent;
	border-radius: 9px;
	appearance: none;
	background: transparent;
	color: var(--MI_THEME-fg);
	font: inherit;
	font-size: .82em;
	font-weight: 650;
	line-height: 1;
	white-space: nowrap;
	cursor: pointer;
}

.choice:hover {
	background: var(--MI_THEME-hover);
}

.activeChoice {
	border-color: color-mix(in srgb, var(--MI_THEME-accent) 60%, transparent);
	background: var(--MI_THEME-accent);
	color: var(--MI_THEME-fgOnAccent);
	font-weight: 800;
}

.choice[data-active='true']:hover,
.choice[data-active='true']:focus-visible {
	border-color: color-mix(in srgb, var(--MI_THEME-accent) 60%, transparent);
	background: var(--MI_THEME-accent);
	color: var(--MI_THEME-fgOnAccent);
}

.root[data-color-mode='dark'] .choiceBar {
	border-color: #515c70;
	background: #202632;
}

.root[data-color-mode='dark'] .choice {
	background: transparent;
	color: #dbe3ef;
	-webkit-text-fill-color: currentColor;
}

.root[data-color-mode='dark'] .choice:hover {
	background: #303949;
	color: #fff;
}

.root[data-color-mode='dark'] .activeChoice {
	border-color: color-mix(in srgb, var(--MI_THEME-accent) 78%, #8b96aa);
	background: color-mix(in srgb, var(--MI_THEME-accent) 68%, #202632);
	color: #fff;
	-webkit-text-fill-color: #fff;
}

.root[data-color-mode='dark'] [data-hatacording-ui-scale-selector] .choice[data-active='true']:hover,
.root[data-color-mode='dark'] [data-hatacording-ui-scale-selector] .choice[data-active='true']:focus-visible {
	border-color: color-mix(in srgb, var(--MI_THEME-accent) 78%, #8b96aa);
	background: color-mix(in srgb, var(--MI_THEME-accent) 68%, #202632);
	color: #fff;
	-webkit-text-fill-color: #fff;
}

.switches {
	display: grid;
	gap: 13px;
}

.compact .switches {
	gap: 10px;
}

.note {
	margin: 0;
	padding: 10px 12px;
	border-radius: 10px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent);
	color: var(--MI_THEME-fg);
	font-size: .8em;
	line-height: 1.6;
}
</style>
