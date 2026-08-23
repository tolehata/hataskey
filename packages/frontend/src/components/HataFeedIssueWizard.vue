<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed の Issue 作成ウィザード。
  イシューの書き方がわからない利用者向けに、カテゴリ選択→内容入力→確認の3ステップで案内する。
-->
<template>
<!-- 旗鯖fork: モーダル(旧 MkModalWindow)から非モーダルウィンドウ(MkWindow)に変更。
     再現手順を確認するために裏のページを触りながらイシューを書きたい、
     項目数が多く全て覚えるのが困難というユーザー要望(特にデッキUI使用者)に対応。
     MkWindow は移動・リサイズ可能で裏のページがそのまま操作できる。 -->
<MkWindow
	ref="dialog"
	:initialWidth="560"
	:initialHeight="620"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header>{{ copyx.header({ step: step.toString() }) }}</template>

	<div class="_spacer" style="--MI_SPACER-min: 20px; --MI_SPACER-max: 28px;">
		<!-- Step1: カテゴリ -->
		<div v-if="step === 1" :class="$style.gaps">
			<div :class="$style.lead">{{ copy.chooseCategory }}</div>
			<button
				v-for="c in availableCategoryKeys"
				:key="c"
				:class="[$style.catCard, category === c && $style.catActive]"
				@click="category = c; step = 2"
			>
				<i :class="[categoryIcon[c], $style.catIcon]"></i>
				<div :class="$style.catText">
					<div :class="$style.catName">{{ categoryLabel[c] }}</div>
					<div :class="$style.catDesc">{{ categoryDesc[c] }}</div>
				</div>
				<i class="ti ti-chevron-right" :class="$style.catArrow"></i>
			</button>
		</div>

		<!-- Step2: 内容 -->
		<div v-else-if="step === 2" :class="$style.gaps">
			<div :class="$style.lead"><span :class="$style.tag">{{ categoryLabel[category] }}</span> {{ copy.detailsLeadSuffix }}</div>
			<MkInput v-model="title" :placeholder="titleHint">
				<template #label>{{ copy.title }} <span :class="$style.req">{{ copy.required }}</span></template>
			</MkInput>
			<MkTextarea v-model="description" :placeholder="descHint">
				<template #label>{{ copy.description }}</template>
				<template #caption>{{ descCaption }}</template>
			</MkTextarea>
			<div>
				<div :class="$style.fieldLabel">{{ copy.attachments }}</div>
				<div :class="$style.fileGrid">
					<div v-for="f in files" :key="f.id" :class="$style.fileThumb">
						<img :src="f.thumbnailUrl ?? f.url" :alt="f.name"/>
						<button :class="$style.fileDel" @click="files = files.filter(x => x.id !== f.id)"><i class="ti ti-x"></i></button>
					</div>
					<button :class="$style.fileAdd" @click="addFiles"><i class="ti ti-plus"></i></button>
				</div>
			</div>

			<!-- 旗鯖fork: コード提出（任意） -->
			<div>
					<MkSwitch v-model="codeEnabled">
						<template #label><i class="ti ti-code"></i> {{ copy.submitCode }}</template>
						<template #caption>{{ copy.submitCodeHint }}</template>
					</MkSwitch>
					<MkTextarea v-if="codeEnabled" v-model="code" :class="$style.codeArea" :placeholder="copy.codePlaceholder">
						<template #label>{{ copy.code }}</template>
					</MkTextarea>
				</div>

				<div :class="$style.navRow">
					<MkButton rounded @click="step = 1"><i class="ti ti-arrow-left"></i> {{ copy.back }}</MkButton>
					<MkButton rounded primary :disabled="!title.trim()" @click="step = 3">{{ copy.next }} <i class="ti ti-arrow-right"></i></MkButton>
				</div>
		</div>

		<!-- Step3: 確認 -->
		<div v-else :class="$style.gaps">
			<div :class="$style.lead">{{ copy.choosePriority }}</div>
			<MkSelect v-model="priority" :items="priorityItems">
				<template #label>{{ copy.priority }}</template>
			</MkSelect>

			<div :class="$style.summary">
				<div><b>{{ copy.categorySummary }}</b> {{ categoryLabel[category] }}</div>
				<div><b>{{ copy.titleSummary }}</b> {{ title }}</div>
				<div v-if="projectName"><b>{{ copy.projectSummary }}</b> {{ projectName }}</div>
			</div>

			<div :class="$style.navRow">
				<MkButton rounded @click="step = 2"><i class="ti ti-arrow-left"></i> {{ copy.back }}</MkButton>
				<MkButton rounded primary gradate :disabled="submitting" @click="submit"><i class="ti ti-send"></i> {{ copy.send }}</MkButton>
			</div>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { chooseDriveFile } from '@/utility/drive.js';
import { iAmModerator } from '@/i.js';
import { categoryLabel, creatableCategoryKeys, staffOnlyCategoryKeys, categoryDesc, categoryIcon } from '@/utility/hatafeed.js';
import type { HataFeedCategory, HataFeedPriority } from '@/utility/hatafeed.js';
import { useHataFormDraft } from '@/utility/hata-form-draft.js';

const props = defineProps<{ projectId: string | null; projects: any[] }>();
const emit = defineEmits<{ (ev: 'done', v: any): void; (ev: 'closed'): void }>();

const dialog = useTemplateRef('dialog');
const copy = i18n.ts._hata._hatafeed._issueWizard;
const copyx = i18n.tsx._hata._hatafeed._issueWizard;

const step = ref(1);
const category = ref<HataFeedCategory>('bug');
const title = ref('');
const description = ref('');
const priority = ref<HataFeedPriority>('normal');
const priorityItems = [
	{ value: 'low', label: copy.priorityLow },
	{ value: 'normal', label: copy.priorityNormal },
	{ value: 'high', label: copy.priorityHigh },
];
const files = ref<any[]>([]);
const submitting = ref(false);
// 旗鯖fork: コード提出（任意）
const codeEnabled = ref(false);
const code = ref('');

type IssueDraft = {
	step: number;
	category: HataFeedCategory;
	title: string;
	description: string;
	priority: HataFeedPriority;
	files: any[];
	codeEnabled: boolean;
	code: string;
};
const { clearDraft } = useHataFormDraft<IssueDraft>({
	id: `hatafeed:issue:${props.projectId ?? 'general'}`,
	capture: () => ({ step: step.value, category: category.value, title: title.value, description: description.value, priority: priority.value, files: files.value, codeEnabled: codeEnabled.value, code: code.value }),
	restore: draft => {
		step.value = Math.min(3, Math.max(1, Number(draft.step) || 1));
		if (creatableCategoryKeys.includes(draft.category as typeof creatableCategoryKeys[number])) category.value = draft.category;
		title.value = typeof draft.title === 'string' ? draft.title : '';
		description.value = typeof draft.description === 'string' ? draft.description : '';
		if (draft.priority === 'low' || draft.priority === 'normal' || draft.priority === 'high') priority.value = draft.priority;
		files.value = Array.isArray(draft.files) ? draft.files : [];
		codeEnabled.value = draft.codeEnabled === true;
		code.value = typeof draft.code === 'string' ? draft.code : '';
	},
	isMeaningful: draft => draft.title.trim().length > 0 || draft.description.trim().length > 0 || draft.files.length > 0 || draft.code.trim().length > 0,
});

// 旗鯖fork: スタッフ専用カテゴリ(security等)は一般ユーザーに見せない。
const availableCategoryKeys = computed(() => creatableCategoryKeys.filter(c => iAmModerator || !staffOnlyCategoryKeys.includes(c as 'security')));

const projectName = computed(() => props.projects.find(p => p.id === props.projectId)?.name ?? null);

// カテゴリ別の入力ガイド(書き方がわからない人向け)。
const titleHint = computed(() => {
	switch (category.value) {
		case 'bug': return copy.titleHintBug;
		case 'featureRequest': return copy.titleHintFeatureRequest;
		case 'adoptionRequest': return copy.titleHintAdoptionRequest;
		case 'security': return copy.titleHintSecurity;
		default: return copy.titleHintDefault;
	}
});
const descHint = computed(() => {
	switch (category.value) {
		case 'bug': return copy.descriptionHintBug;
		case 'featureRequest': return copy.descriptionHintFeatureRequest;
		default: return copy.descriptionHintDefault;
	}
});
const descCaption = computed(() => category.value === 'security' ? copy.securityDescriptionCaption : '');

async function addFiles() {
	const chosen = await chooseDriveFile({ multiple: true }).catch(() => []);
	for (const f of chosen) {
		if (!files.value.some(x => x.id === f.id)) files.value.push(f);
	}
}

async function submit() {
	if (!title.value.trim()) return;
	submitting.value = true;
	try {
		const issue = await misskeyApi('hata/feedback/issues/create', {
			title: title.value.trim(),
			description: description.value,
			category: category.value,
			priority: priority.value,
			projectId: props.projectId,
			fileIds: files.value.map(f => f.id),
				code: (codeEnabled.value && code.value.trim().length > 0) ? code.value : null,
		});
		clearDraft();
		os.success();
		emit('done', issue);
		dialog.value?.close();
	} finally {
		submitting.value = false;
	}
}
</script>

<style lang="scss" module>
.gaps { display: flex; flex-direction: column; gap: 14px; }
.lead { opacity: .8; font-size: .92em; }
.tag { background: var(--MI_THEME-accent); color: #fff; border-radius: 999px; padding: 2px 10px; font-size: .82em; }
.req { color: var(--MI_THEME-error); font-size: .72em; margin-left: 4px; }

.catCard {
	display: flex; align-items: center; gap: 12px;
	background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider);
	border-radius: 14px; padding: 12px 14px; cursor: pointer; text-align: left; color: inherit;
	transition: all .15s;
}
.catCard:hover { border-color: var(--MI_THEME-accent); transform: translateY(-1px); }
.catActive { border-color: var(--MI_THEME-accent); }
.catIcon { font-size: 1.5rem; color: var(--MI_THEME-accent); width: 28px; text-align: center; }
.catText { flex: 1; min-width: 0; }
.catName { font-weight: 700; }
.catDesc { font-size: .8em; opacity: .65; margin-top: 2px; }
.catArrow { opacity: .4; }

.navRow { display: flex; justify-content: space-between; margin-top: 6px; }
.fieldLabel { font-size: .85em; opacity: .8; margin-bottom: 6px; }
.fileGrid { display: flex; gap: 8px; flex-wrap: wrap; }
.fileThumb { position: relative; width: 72px; height: 72px; border-radius: 10px; overflow: hidden; border: 1px solid var(--MI_THEME-divider); }
.fileThumb img { width: 100%; height: 100%; object-fit: cover; }
.fileDel { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,.5); color: #fff; border: none; border-radius: 999px; width: 20px; height: 20px; cursor: pointer; }
.fileAdd { width: 72px; height: 72px; border-radius: 10px; border: 1px dashed var(--MI_THEME-divider); background: var(--MI_THEME-bg); cursor: pointer; color: inherit; font-size: 1.2rem; }
.summary { background: var(--MI_THEME-bg); border-radius: 12px; padding: 12px 14px; font-size: .88em; display: flex; flex-direction: column; gap: 4px; }
.codeArea { margin-top: 8px; }
.codeArea :global(textarea) { font-family: Consolas, Menlo, monospace; font-size: .85em; }
</style>
