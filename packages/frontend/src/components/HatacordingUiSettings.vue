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
		<div :class="$style.heading"><strong>UIカラー</strong><span>表示に合わせて全体の配色を切り替えます</span></div>
		<div :class="$style.choiceBar" role="group" aria-label="UIカラー">
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
		<div :class="$style.heading"><strong>UI全体の大きさ</strong><span>情報量と読みやすさを調整します</span></div>
		<div :class="$style.choiceBar" role="group" aria-label="UI全体の大きさ">
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
			リアルタイム更新
			<template #caption>{{ realtimeAvailable ? '新しい投稿と投稿の変化をその場で反映します。' : '現在のタイムラインはリアルタイム更新に対応していません。' }}</template>
		</MkSwitch>
		<MkSwitch :modelValue="preferences.reuseSubpaneTab" @update:modelValue="value => updatePreferences({ reuseSubpaneTab: value })">
			右ペインは同じタブで遷移
		</MkSwitch>
		<MkSwitch :modelValue="preferences.showRateLimitNumber" @update:modelValue="value => updatePreferences({ showRateLimitNumber: value })">
			レートリミット円に数値を表示
		</MkSwitch>
		<MkSwitch :modelValue="preferences.showCharacterCounter" @update:modelValue="value => updatePreferences({ showCharacterCounter: value })">
			投稿欄に文字数チェッカーを表示
		</MkSwitch>
		<MkSwitch :modelValue="preferences.showFoilAnimation" @update:modelValue="value => updatePreferences({ showFoilAnimation: value })">
			テキストのshimmerアニメーションを表示
		</MkSwitch>
	</div>

	<p v-if="!compact" :class="$style.note">この内容は端末内に保存され、HataSNSCordUI左上の調整メニューと常に同期します。</p>
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
const colorChoices: { id: HatacordingUiColorMode; label: string }[] = [
	{ id: 'theme', label: 'テーマ' },
	{ id: 'light', label: 'ライト' },
	{ id: 'dark', label: 'ダーク' },
];
const scaleChoices: { id: HatacordingUiScale; label: string }[] = [
	{ id: 'small', label: '小' },
	{ id: 'medium', label: '中' },
	{ id: 'large', label: '大' },
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
	gap: 4px;
	padding: 3px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 12px;
	background: color-mix(in srgb, var(--MI_THEME-bg) 88%, var(--MI_THEME-panel));
}

.choice {
	min-width: 0;
	min-height: 32px;
	padding: 5px 9px;
	border: 1px solid transparent;
	border-radius: 9px;
	background: transparent;
	color: var(--MI_THEME-fg);
	font: inherit;
	font-size: .82em;
	font-weight: 650;
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
