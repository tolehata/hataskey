<!-- SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<HyDialog
	ref="dialog"
	title="プロフィールを整える"
	:inert="closePrompt"
	wide
	:busy="saving"
	@close="requestClose"
	@closed="emit('closed')"
>
	<div :class="$style.workspace" :data-pane="pane" :data-large="large">
		<HyCapsule v-model="pane" :options="panes" label="編集とプレビュー"/>
		<div v-show="pane === 'edit' || large" :class="$style.controls">
			<fieldset class="hy-field">
				<legend>カラー</legend>
				<div :class="$style.choices">
					<button
						v-for="c in palettes"
						:key="c.value"
						:aria-pressed="draft.palette === c.value"
						@click="draft.palette = c.value"
					>
						<i :style="{ background: c.color }"></i>
						{{ c.label }}
					</button>
				</div>
			</fieldset>
			<fieldset class="hy-field">
				<legend>並べ方</legend>
				<div :class="$style.choices">
					<button
						v-for="l in layouts"
						:key="l.value"
						:aria-pressed="draft.layout === l.value"
						@click="draft.layout = l.value"
					>
						<span :class="$style.layout" :data-layout="l.value">
							<i></i>
							<i></i>
							<i></i>
						</span>
						{{ l.label }}
					</button>
				</div>
			</fieldset>
			<fieldset class="hy-field">
				<legend>表示するもの</legend>
				<div v-for="(key, index) in draft.order" :key="key" :class="$style.order">
					<label>
						<input type="checkbox" :checked="!draft.hidden.includes(key)" @change="toggle(key)"/>
						<i :class="['ti', sections[key]?.icon]"></i>
						{{ sections[key]?.label || key }}
					</label>
					<button
						class="hy-icon-button"
						:disabled="index === 0"
						:aria-label="`${sections[key]?.label}を上へ`"
						@click="move(Number(index), -1)"
					>
						<i class="ti ti-arrow-up"></i>
					</button>
					<button
						class="hy-icon-button"
						:disabled="index === draft.order.length - 1"
						:aria-label="`${sections[key]?.label}を下へ`"
						@click="move(Number(index), 1)"
					>
						<i class="ti ti-arrow-down"></i>
					</button>
				</div>
			</fieldset>
			<fieldset class="hy-field">
				<legend>カードの形</legend>
				<HyCapsule v-model="draft.corners" :options="corners" label="カードの形"/>
			</fieldset>
			<fieldset class="hy-field">
				<legend>余白</legend>
				<HyCapsule v-model="draft.spacing" :options="spacing" label="余白"/>
			</fieldset>
		</div>
		<section v-show="pane === 'preview' || large" :class="$style.preview" aria-label="プロフィールのプレビュー" inert>
			<HatadyProfilePreview inline :previewData="profile" :previewDesign="draft"/>
		</section>
	</div>
	<p v-if="error" class="hy-error" role="alert">{{ error }}</p>
	<template #actions>
		<button class="hy-secondary" :disabled="saving" @click="requestClose">閉じる</button>
		<button class="hy-primary" :disabled="saving" @click="save">
			<i class="ti ti-check"></i>
			保存する
		</button>
	</template>
</HyDialog>
<HatadyDraftPrompt
	v-if="closePrompt"
	title="デザインの編集をどうする？"
	description="編集途中のデザインを、端末に下書きとして残せます。"
	:error="error"
	:busy="saving"
	@save="leave(true)"
	@discard="leave(false)"
	@return="closePrompt = false"
/>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, defineAsyncComponent, nextTick } from 'vue';
import HyDialog from '@/components/HyDialog.vue';
import HatadyDraftPrompt from '@/components/HatadyDraftPrompt.vue';
import HyCapsule from '@/components/HyCapsule.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useHataFormDraft } from '@/utility/hata-form-draft.js';
import { hatadyNotify } from '@/utility/hatady-ui.js';
const HatadyProfilePreview = defineAsyncComponent(() => import('@/components/HatadyProfile.vue'));
const props = defineProps<{ design?: Record<string, any>; profile: any }>();
const emit = defineEmits<{ (e: 'saved', value: Record<string, any>): void; (e: 'closed'): void }>();
const dialog = ref<any>(),
	saving = ref(false),
	error = ref(''),
	pane = ref('edit'),
	large = ref(false),
	closePrompt = ref(false);
const sections: Record<string, { label: string; icon: string }> = {
	stats: { label: '積み重ね', icon: 'ti-calendar' },
	traits: { label: 'ジャンルとタグ', icon: 'ti-sparkles' },
	shelf: { label: 'コレクション', icon: 'ti-books' },
	recent: { label: '最近の記録', icon: 'ti-notebook' },
	work: { label: '作業の記録', icon: 'ti-briefcase' },
};

function normalize(value: any) {
	const order = Array.isArray(value?.order) ? value.order.filter((k: unknown) => typeof k === 'string') : [];
	return {
		...value,
		layout: ['bento', 'journal', 'gallery'].includes(value?.layout) ? value.layout : 'bento',
		palette: ['theme', 'leaf', 'violet', 'clay'].includes(value?.palette) ? value.palette : 'theme',
		corners: value?.corners === 'neat' ? 'neat' : 'soft',
		spacing: value?.spacing === 'compact' ? 'compact' : 'relaxed',
		order: [...new Set([...order, ...Object.keys(sections)])] as string[],
		hidden: Array.isArray(value?.hidden)
			? value.hidden.filter((k: unknown) => typeof k === 'string')
			: ([] as string[]),
	};
}

const draft = ref(normalize(props.design));
const drafts = useHataFormDraft({
	id: 'hatady-profile-design',
	autoSave: false,
	capture: () => JSON.parse(JSON.stringify(draft.value)),
	restore: (value) => {
		draft.value = normalize(value);
	},
	isMeaningful: () => true,
});
const palettes = [
	{ value: 'theme', label: 'テーマ', color: 'var(--hy-accent)' },
	{ value: 'leaf', label: '若葉', color: '#326946' },
	{ value: 'violet', label: 'すみれ', color: '#665285' },
	{ value: 'clay', label: '土色', color: '#844d39' },
];
const layouts = [
	{ value: 'bento', label: 'バランス' },
	{ value: 'journal', label: '日記' },
	{ value: 'gallery', label: '本棚' },
];
const panes = [
	{ value: 'edit', label: '編集', icon: 'ti ti-palette' },
	{ value: 'preview', label: 'プレビュー', icon: 'ti ti-eye' },
];
const corners = [
	{ value: 'soft', label: 'まるく', icon: 'ti ti-square-rounded' },
	{ value: 'neat', label: 'すっきり', icon: 'ti ti-square' },
];
const spacing = [
	{ value: 'relaxed', label: 'ゆったり', icon: 'ti ti-spacing-vertical' },
	{ value: 'compact', label: 'コンパクト', icon: 'ti ti-layout-rows' },
];

function toggle(key: string) {
	draft.value.hidden = draft.value.hidden.includes(key)
		? draft.value.hidden.filter((k: string) => k !== key)
		: [...draft.value.hidden, key];
}

function move(index: number, delta: number) {
	const a = [...draft.value.order];
	[a[index], a[index + delta]] = [a[index + delta], a[index]];
	draft.value.order = a;
}

function requestClose() {
	if (saving.value) return;
	if (drafts.hasChanges()) closePrompt.value = true;
	else dialog.value?.close();
}

function leave(save: boolean) {
	const ok = save ? drafts.saveDraft() : drafts.clearDraft();
	if (!ok) {
		error.value = '下書きを保存・削除できませんでした';
		return;
	}
	closePrompt.value = false;
	dialog.value?.close();
	if (save) hatadyNotify('下書きを保存しました');
}

async function save() {
	if (saving.value) return;
	saving.value = true;
	error.value = '';
	try {
		await (misskeyApi as any)('hata/hatady/profile/update', { design: draft.value });
		if (!drafts.clearDraft()) hatadyNotify('デザインを保存しましたが、端末の下書きを削除できませんでした');
		else hatadyNotify('プロフィールのデザインを保存しました');
		emit('saved', draft.value);
		dialog.value?.close();
	} catch {
		error.value = '保存できませんでした。編集内容は残っています。';
	} finally {
		saving.value = false;
	}
}

let observer: ResizeObserver;
onMounted(async () => {
	await nextTick();
	observer = new ResizeObserver((entries) => {
		large.value = entries[0].contentRect.width >= 900;
	});
	if (dialog.value?.panel) observer.observe(dialog.value.panel);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
<style module lang="scss">
.workspace {
	display: grid;
	gap: 24px;
	container-type: inline-size;
}
.workspace > :first-child {
	justify-self: center;
}
.controls {
	display: grid;
	gap: 26px;
	min-height: 0;
}
.choices {
	display: flex;
	gap: 8px;
}
.choices button {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	min-height: 88px;
	padding: 12px;
	border: 1px solid transparent;
	border-radius: 16px;
	background: none;
	color: var(--hy-body);
	cursor: pointer;
}
.choices button[aria-pressed='true'] {
	border-color: var(--hy-accent);
	background: var(--hy-surface-2);
}
.choices button > i {
	width: 38px;
	height: 38px;
	border-radius: 50%;
}
.layout {
	display: grid;
	gap: 4px;
	width: 52px;
	height: 48px;
	background: var(--hy-surface);
	padding: 5px;
	border: 1px solid var(--hy-border);
	border-radius: 5px;
}
.layout i {
	background: var(--hy-border);
}
.layout[data-layout='gallery'] {
	grid-template-columns: repeat(3, 1fr);
}
.order {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 9px 0;
	border-bottom: 1px solid var(--hy-border);
}
.order label {
	display: flex;
	gap: 10px;
	align-items: center;
	flex: 1;
}
.preview {
	padding: 16px;
	border: 1px solid var(--hy-border);
	border-radius: 24px;
	overflow: hidden;
	background: var(--hy-bg);
	min-width: 0;
}
.cover {
	height: 70px;
	background: color-mix(in srgb, var(--profile-accent) 20%, var(--hy-surface));
}
.identity {
	padding: 0 20px 20px;
}
.identity p {
	font-size: 13px;
	white-space: pre-wrap;
}
.avatar {
	width: 70px;
	height: 70px;
	margin-top: -20px;
	border: 4px solid var(--hy-surface);
	border-radius: 50%;
}
.previewGrid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--profile-gap);
	padding: var(--profile-gap);
}
.previewGrid[data-layout='journal'] {
	grid-template-columns: 1fr;
}
.previewGrid section {
	padding: 16px;
	background: var(--hy-surface);
	border-radius: var(--profile-radius);
	min-width: 0;
	overflow-wrap: anywhere;
}
.previewGrid h3 {
	font-size: 13px;
	display: flex;
	gap: 8px;
}
.previewGrid strong {
	font-size: 28px;
	color: var(--profile-accent);
}
.workspace[data-large='true'] {
	grid-template-columns: minmax(280px, 0.9fr) minmax(340px, 1.1fr);
}
.workspace[data-large='true'] > :first-child {
	display: none;
}
.workspace[data-large='true'] > .controls,
.workspace[data-large='true'] > .preview {
	max-height: 65dvh;
	overflow: auto;
	scrollbar-width: none;
}
</style>
