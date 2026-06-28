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
	<template #header>イシューを立てる（{{ step }}/3）</template>

	<div class="_spacer" style="--MI_SPACER-min: 20px; --MI_SPACER-max: 28px;">
		<!-- Step1: カテゴリ -->
		<div v-if="step === 1" :class="$style.gaps">
			<div :class="$style.lead">イシューの種類を選択してください。</div>
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
			<div :class="$style.lead"><span :class="$style.tag">{{ categoryLabel[category] }}</span> の内容をご記入ください。</div>
			<MkInput v-model="title" :placeholder="titleHint">
				<template #label>タイトル <span :class="$style.req">必須</span></template>
			</MkInput>
			<MkTextarea v-model="description" :placeholder="descHint">
				<template #label>詳しい説明</template>
				<template #caption>{{ descCaption }}</template>
			</MkTextarea>
			<div>
				<div :class="$style.fieldLabel">スクリーンショット等（任意）</div>
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
						<template #label><i class="ti ti-code"></i> コードを提出する（任意）</template>
						<template #caption>再現コードやパッチ案などを添付できます。</template>
					</MkSwitch>
					<MkTextarea v-if="codeEnabled" v-model="code" :class="$style.codeArea" placeholder="// コードをここに貼り付け">
						<template #label>コード</template>
					</MkTextarea>
				</div>

				<div :class="$style.navRow">
					<MkButton rounded @click="step = 1"><i class="ti ti-arrow-left"></i> 戻る</MkButton>
					<MkButton rounded primary :disabled="!title.trim()" @click="step = 3">次へ <i class="ti ti-arrow-right"></i></MkButton>
				</div>
		</div>

		<!-- Step3: 確認 -->
		<div v-else :class="$style.gaps">
			<div :class="$style.lead">優先度を選んで送信してください。</div>
			<MkSelect v-model="priority" :items="priorityItems">
				<template #label>優先度</template>
			</MkSelect>

			<div :class="$style.summary">
				<div><b>カテゴリ:</b> {{ categoryLabel[category] }}</div>
				<div><b>タイトル:</b> {{ title }}</div>
				<div v-if="projectName"><b>プロジェクト:</b> {{ projectName }}</div>
			</div>

			<div :class="$style.navRow">
				<MkButton rounded @click="step = 2"><i class="ti ti-arrow-left"></i> 戻る</MkButton>
				<MkButton rounded primary gradate :disabled="submitting" @click="submit"><i class="ti ti-send"></i> 送信</MkButton>
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
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { chooseDriveFile } from '@/utility/drive.js';
import { iAmModerator } from '@/i.js';
import { categoryLabel, creatableCategoryKeys, staffOnlyCategoryKeys, categoryDesc, categoryIcon } from '@/utility/hatafeed.js';

const props = defineProps<{ projectId: string | null; projects: any[] }>();
const emit = defineEmits<{ (ev: 'done', v: any): void; (ev: 'closed'): void }>();

const dialog = useTemplateRef('dialog');

const step = ref(1);
const category = ref('bug');
const title = ref('');
const description = ref('');
const priority = ref('normal');
const priorityItems = [
	{ value: 'low', label: '低' },
	{ value: 'normal', label: '通常' },
	{ value: 'high', label: '高' },
];
const files = ref<any[]>([]);
const submitting = ref(false);
// 旗鯖fork: コード提出（任意）
const codeEnabled = ref(false);
const code = ref('');

// 旗鯖fork: スタッフ専用カテゴリ(security等)は一般ユーザーに見せない。
const availableCategoryKeys = computed(() => creatableCategoryKeys.filter(c => iAmModerator || !staffOnlyCategoryKeys.includes(c)));

const projectName = computed(() => props.projects.find(p => p.id === props.projectId)?.name ?? null);

// カテゴリ別の入力ガイド(書き方がわからない人向け)。
const titleHint = computed(() => {
	switch (category.value) {
		case 'bug': return '例: ○○すると画面が表示されなくなる';
		case 'featureRequest': return '例: ○○できる機能を追加してほしい';
		case 'adoptionRequest': return '例: 本家の○○を取り入れてほしい';
		case 'security': return '例: ○○に関する懸念';
		default: return '要点を簡潔にご記入ください';
	}
});
const descHint = computed(() => {
	switch (category.value) {
		case 'bug': return '【操作内容】【発生した事象】【期待する挙動】をご記入ください。\nご利用の端末・ブラウザも記載いただけると助かります。';
		case 'featureRequest': return 'どのような場面で、どのように役立つかをご記入ください。';
		default: return 'できるだけ具体的にご記入ください。';
	}
});
const descCaption = computed(() => category.value === 'security' ? 'セキュリティに関わる内容は慎重にお取り扱いください。詳細はスタッフのみの閲覧を想定しています。' : '');

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
