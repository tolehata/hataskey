<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed のエクスポート範囲・内容を指定する非モーダルウィンドウ。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="640"
	:initialHeight="720"
	:canResize="true"
	:beforeClose="beforeClose"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-file-export"></i> HataFeedをエクスポート</template>

	<form :class="$style.form" @submit.prevent="runExport">
		<div :class="$style.intro">
			<b>{{ projectName }}</b> のイシューをJSONで保存します。空欄の範囲は制限しません。
		</div>

		<section :class="$style.section">
			<h3 :class="$style.heading"><i class="ti ti-arrows-range"></i> 範囲</h3>
			<div :class="$style.twoColumns">
				<MkInput v-model="numberFrom" type="number" :min="1" :disabled="exporting">
					<template #label>イシュー番号（開始）</template>
					<template #prefix>#</template>
				</MkInput>
				<MkInput v-model="numberTo" type="number" :min="1" :disabled="exporting">
					<template #label>イシュー番号（終了）</template>
					<template #prefix>#</template>
				</MkInput>
				<MkInput v-model="createdFrom" type="date" :disabled="exporting">
					<template #label>作成日（開始）</template>
				</MkInput>
				<MkInput v-model="createdTo" type="date" :disabled="exporting">
					<template #label>作成日（終了）</template>
				</MkInput>
			</div>
			<MkSelect v-model="closedState" :items="closedStateItems" :disabled="exporting">
				<template #label>受付状態</template>
			</MkSelect>
		</section>

		<section :class="$style.section">
			<div :class="$style.headingRow">
				<h3 :class="$style.heading"><i class="ti ti-progress-check"></i> ステータス</h3>
				<button type="button" :class="$style.textButton" :disabled="exporting" @click="toggleAllStatuses">{{ selectedStatuses.length === exportStatusKeys.length ? 'すべて外す' : 'すべて選ぶ' }}</button>
			</div>
			<div :class="$style.chips">
				<button
					v-for="key in exportStatusKeys"
					:key="key"
					type="button"
					:class="$style.chip"
					:data-selected="selectedStatuses.includes(key) ? 'true' : undefined"
					:aria-pressed="selectedStatuses.includes(key)"
					:disabled="exporting"
					@click="toggleValue(selectedStatuses, key)"
				>
					{{ statusLabel[key] }}
				</button>
			</div>
		</section>

		<section :class="$style.section">
			<div :class="$style.headingRow">
				<h3 :class="$style.heading"><i class="ti ti-tags"></i> カテゴリ</h3>
				<button type="button" :class="$style.textButton" :disabled="exporting" @click="toggleAllCategories">{{ selectedCategories.length === exportCategoryKeys.length ? 'すべて外す' : 'すべて選ぶ' }}</button>
			</div>
			<div :class="$style.chips">
				<button
					v-for="key in exportCategoryKeys"
					:key="key"
					type="button"
					:class="$style.chip"
					:data-selected="selectedCategories.includes(key) ? 'true' : undefined"
					:aria-pressed="selectedCategories.includes(key)"
					:disabled="exporting"
					@click="toggleValue(selectedCategories, key)"
				>
					{{ categoryLabel[key] }}
				</button>
			</div>
		</section>

		<section :class="$style.section">
			<h3 :class="$style.heading"><i class="ti ti-file-description"></i> 含める内容</h3>
			<div :class="$style.switches">
				<MkSwitch v-model="includeDescription" :disabled="exporting">イシュー本文</MkSwitch>
				<MkSwitch v-model="includeComments" :disabled="exporting">会話（コメント）</MkSwitch>
				<MkSwitch v-model="includeCode" :disabled="exporting">提出されたコード</MkSwitch>
				<MkSwitch v-model="includeResolution" :disabled="exporting">解決メモ</MkSwitch>
				<MkSwitch v-model="includeAuthors" :disabled="exporting">投稿者名</MkSwitch>
				<MkSwitch v-model="includeStats" :disabled="exporting">賛同数・コメント数</MkSwitch>
			</div>
			<div :class="$style.caption">番号・タイトル・カテゴリ・ステータス・優先度・作成日時は常に含まれます。</div>
		</section>

		<div v-if="validationError" :class="$style.error"><i class="ti ti-alert-circle"></i> {{ validationError }}</div>
		<div :class="$style.actions">
			<MkButton rounded :disabled="exporting" @click="dialog?.close()">キャンセル</MkButton>
			<MkButton type="submit" primary gradate rounded :wait="exporting" :disabled="!canExport">
				<i class="ti ti-download"></i> {{ exporting ? '書き出し中…' : 'エクスポート' }}
			</MkButton>
		</div>
	</form>
</MkWindow>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { categoryKeys, categoryLabel, statusKeys, statusLabel } from '@/utility/hatafeed.js';
import { downloadHataFeedJson, localDayEndIso, localDayStartIso, validateHataFeedExportRange } from '@/utility/hatafeed-export.js';

const props = defineProps<{ projectId: string | null; projectName: string }>();
const emit = defineEmits<{ (ev: 'closed'): void }>();

type ExportStatus = 'open' | 'planned' | 'inProgress' | 'resolved' | 'wontfix' | 'unknown' | 'closed';
type ExportCategory = 'bug' | 'improvement' | 'unresolved' | 'featureRequest' | 'adoptionRequest' | 'security' | 'betaFeature' | 'other';
const exportStatusKeys: readonly ExportStatus[] = statusKeys;
const exportCategoryKeys: readonly ExportCategory[] = categoryKeys;

const dialog = useTemplateRef('dialog');
const exporting = ref(false);
const numberFrom = ref<number | null>(null);
const numberTo = ref<number | null>(null);
const createdFrom = ref('');
const createdTo = ref('');
const closedState = ref<'all' | 'open' | 'closed'>('all');
const closedStateItems = [
	{ value: 'all', label: '受付中・受付終了の両方' },
	{ value: 'open', label: '受付中のみ' },
	{ value: 'closed', label: '受付終了のみ' },
];
const selectedStatuses = ref<ExportStatus[]>([...exportStatusKeys]);
const selectedCategories = ref<ExportCategory[]>([...exportCategoryKeys]);
const includeDescription = ref(true);
const includeComments = ref(true);
const includeCode = ref(true);
const includeResolution = ref(true);
const includeAuthors = ref(true);
const includeStats = ref(true);

const validationError = computed(() => {
	const rangeError = validateHataFeedExportRange({
		numberFrom: optionalNumber(numberFrom.value) ?? null,
		numberTo: optionalNumber(numberTo.value) ?? null,
		createdFrom: createdFrom.value,
		createdTo: createdTo.value,
	});
	if (rangeError != null) return rangeError;
	if (selectedStatuses.value.length === 0) return 'ステータスを1つ以上選んでください。';
	if (selectedCategories.value.length === 0) return 'カテゴリを1つ以上選んでください。';
	return null;
});
const canExport = computed(() => !exporting.value && validationError.value == null && selectedStatuses.value.length > 0 && selectedCategories.value.length > 0);

function optionalNumber(value: number | null): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toggleValue<T extends string>(values: T[], key: T) {
	const index = values.indexOf(key);
	if (index === -1) values.push(key);
	else values.splice(index, 1);
}

function toggleAllStatuses() {
	selectedStatuses.value = selectedStatuses.value.length === exportStatusKeys.length ? [] : [...exportStatusKeys];
}

function toggleAllCategories() {
	selectedCategories.value = selectedCategories.value.length === exportCategoryKeys.length ? [] : [...exportCategoryKeys];
}

function beforeClose() {
	return !exporting.value;
}

async function runExport() {
	if (!canExport.value) return;
	exporting.value = true;
	let succeeded = false;
	try {
		const data = await misskeyApi('hata/feedback/issues/export', {
			projectId: props.projectId,
			numberFrom: optionalNumber(numberFrom.value),
			numberTo: optionalNumber(numberTo.value),
			createdFrom: localDayStartIso(createdFrom.value),
			createdTo: localDayEndIso(createdTo.value),
			closedState: closedState.value,
			statuses: selectedStatuses.value,
			categories: selectedCategories.value,
			includeDescription: includeDescription.value,
			includeComments: includeComments.value,
			includeCode: includeCode.value,
			includeResolution: includeResolution.value,
			includeAuthors: includeAuthors.value,
			includeStats: includeStats.value,
		});
		const date = new Date().toISOString().slice(0, 10);
		downloadHataFeedJson(data, `hatafeed-issues-${props.projectId ?? 'official'}-${date}.json`);
		os.toast('エクスポートを開始しました。');
		succeeded = true;
	} catch (error) {
		console.error(error);
		os.alert({ type: 'error', title: 'エクスポートできませんでした', text: '範囲や通信状態を確認して、もう一度お試しください。' });
	} finally {
		exporting.value = false;
	}
	if (succeeded) await dialog.value?.close();
}
</script>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: 16px;
	box-sizing: border-box;
	min-width: 0;
	padding: 20px;
	container-type: inline-size;
}

.intro {
	padding: 12px 14px;
	border-radius: 12px;
	background: color(from var(--MI_THEME-accent) srgb r g b / 0.1);
	line-height: 1.6;
}

.section {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 16px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 14px;
	background: var(--MI_THEME-panel);
}

.headingRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.heading {
	margin: 0;
	font-size: 1em;
}

.twoColumns {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.chip {
	padding: 7px 12px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 999px;
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	cursor: pointer;
}

.chip[data-selected="true"] {
	border-color: var(--MI_THEME-accent);
	background: color(from var(--MI_THEME-accent) srgb r g b / 0.16);
	color: var(--MI_THEME-accent);
	font-weight: 700;
}

.chip:disabled,
.textButton:disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

.textButton {
	border: 0;
	background: transparent;
	color: var(--MI_THEME-accent);
	cursor: pointer;
	font: inherit;
}

.switches {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
}

.caption {
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.7);
	font-size: 0.85em;
	line-height: 1.5;
}

.error {
	padding: 10px 12px;
	border-radius: 10px;
	background: color(from var(--MI_THEME-error) srgb r g b / 0.12);
	color: var(--MI_THEME-error);
}

.actions {
	position: sticky;
	bottom: 0;
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	padding: 12px 0 2px;
	background: var(--MI_THEME-bg);
}

@container (max-width: 520px) {
	.twoColumns,
	.switches {
		grid-template-columns: 1fr;
	}
}
</style>
