<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(HataFeed 2a): ロードマップ(近々の修正・改善予定)専用の作成画面。
  ロードマップ項目は「improvement カテゴリ + 状態(対応予定/対応中)」の公式イシューなので、
  通常のイシュー作成ウィザードとは別に、その2点に絞ったシンプルな1画面フォームを用意する。
  スタッフ専用。作成後は選んだ状態(planned/inProgress)へ更新して掲示する。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="520"
	:initialHeight="560"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-route"></i> 近々の予定を追加</template>

	<div class="_spacer" style="--MI_SPACER-min: 20px; --MI_SPACER-max: 28px;">
		<div :class="$style.gaps">
			<div :class="$style.lead">「近々の修正・改善予定」として一覧の上部とサイドバーに掲示されます。</div>

			<MkInput v-model="title" :placeholder="'例: 絵文字ピッカーの検索を改善'">
				<template #label>内容 <span :class="$style.req">必須</span></template>
			</MkInput>

			<MkTextarea v-model="description" :placeholder="'補足があれば記入（任意）'">
				<template #label>補足</template>
			</MkTextarea>

			<div>
				<div :class="$style.fieldLabel">状態</div>
				<div :class="$style.statusRow">
					<button
						v-for="s in statusOptions"
						:key="s.value"
						:class="[$style.statusChip, status === s.value && $style.statusChipOn]"
						:data-status="s.value"
						@click="status = s.value"
					>
						<i :class="['ti', s.icon]"></i> {{ s.label }}
					</button>
				</div>
			</div>

			<div>
				<div :class="$style.fieldLabel">画像（スクリーンショット等・任意）</div>
				<div :class="$style.fileGrid">
					<div v-for="f in files" :key="f.id" :class="$style.fileThumb">
						<img :src="f.thumbnailUrl ?? f.url" :alt="f.name"/>
						<button :class="$style.fileDel" @click="files = files.filter(x => x.id !== f.id)"><i class="ti ti-x"></i></button>
					</div>
					<button :class="$style.fileAdd" @click="addFiles"><i class="ti ti-plus"></i></button>
				</div>
			</div>

			<div :class="$style.navRow">
				<MkButton rounded @click="dialog?.close()">キャンセル</MkButton>
				<MkButton rounded primary gradate :disabled="!title.trim() || submitting" @click="submit"><i class="ti ti-send"></i> 掲示する</MkButton>
			</div>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { chooseDriveFile } from '@/utility/drive.js';
import type { HataFeedEditableStatus } from '@/utility/hatafeed.js';

const emit = defineEmits<{ (ev: 'done', v: any): void; (ev: 'closed'): void }>();

const dialog = useTemplateRef('dialog');

const title = ref('');
const description = ref('');
const status = ref<Extract<HataFeedEditableStatus, 'planned' | 'inProgress'>>('planned');
const files = ref<any[]>([]);
const submitting = ref(false);

// ロードマップは「対応予定 / 対応中」の2状態で掲示する。
const statusOptions = [
	{ value: 'planned', label: '対応予定', icon: 'ti-calendar-time' },
	{ value: 'inProgress', label: '対応中', icon: 'ti-progress' },
] as const;

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
		// ロードマップ = 公式(projectId:null)の improvement カテゴリのイシュー。
		const issue = await misskeyApi('hata/feedback/issues/create', {
			title: title.value.trim(),
			description: description.value,
			category: 'improvement',
			projectId: null,
			fileIds: files.value.map(f => f.id),
		});
		// 作成直後は open のため、選んだ掲示状態(planned/inProgress)へ更新する。
		await misskeyApi('hata/feedback/issues/update', { issueId: issue.id, status: status.value }).catch(() => {});
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
.req { color: var(--MI_THEME-error); font-size: .72em; margin-left: 4px; }
.fieldLabel { font-size: .85em; opacity: .8; margin-bottom: 6px; }

.statusRow { display: flex; gap: 8px; flex-wrap: wrap; }
.statusChip {
	display: inline-flex; align-items: center; gap: 6px;
	background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); color: inherit;
	border-radius: 999px; padding: 7px 16px; font-size: .88em; font-weight: 700; cursor: pointer;
	transition: all .12s;
}
.statusChip:hover { border-color: var(--MI_THEME-accent); }
.statusChipOn { background: var(--MI_THEME-accent); color: #fff; border-color: var(--MI_THEME-accent); }

.fileGrid { display: flex; gap: 8px; flex-wrap: wrap; }
.fileThumb { position: relative; width: 72px; height: 72px; border-radius: 10px; overflow: hidden; border: 1px solid var(--MI_THEME-divider); }
.fileThumb img { width: 100%; height: 100%; object-fit: cover; }
.fileDel { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,.5); color: #fff; border: none; border-radius: 999px; width: 20px; height: 20px; cursor: pointer; }
.fileAdd { width: 72px; height: 72px; border-radius: 10px; border: 1px dashed var(--MI_THEME-divider); background: var(--MI_THEME-bg); cursor: pointer; color: inherit; font-size: 1.2rem; }

.navRow { display: flex; justify-content: space-between; margin-top: 6px; }
</style>
