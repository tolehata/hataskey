<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed の絵文字申請 承認ダイアログ。
  申請の詳細(プレビュー・申請者・出典)を確認し、必要なら内容を修正したうえで登録(承認)できる。
-->
<template>
<MkModalWindow
	ref="dialog"
	:width="560"
	:height="680"
	@close="dialog?.close()"
	@closed="emit('closed')"
>
	<template #header>絵文字申請の確認</template>

	<div class="_spacer" style="--MI_SPACER-min: 20px; --MI_SPACER-max: 28px;">
		<div :class="$style.gaps">
			<!-- プレビュー -->
			<div :class="$style.previewWrap">
				<div :class="[$style.preview, $style.previewLight]"><img v-if="req.imageUrl" :src="req.imageUrl" :class="$style.previewImg"/></div>
				<div :class="[$style.preview, $style.previewDark]"><img v-if="req.imageUrl" :src="req.imageUrl" :class="$style.previewImg"/></div>
			</div>

			<!-- 申請者・出典 -->
			<div :class="$style.metaCard">
				<div :class="$style.metaRow">
					<MkAvatar v-if="req.requestedBy" :class="$style.avatar" :user="req.requestedBy"/>
					<div>
						<div :class="$style.metaName"><MkUserName v-if="req.requestedBy" :user="req.requestedBy"/> が申請</div>
						<div :class="$style.metaSub"><MkTime :time="req.createdAt"/></div>
					</div>
				</div>
				<div :class="$style.sourceRow">
					<span :class="$style.pill">{{ req.sourceType === 'remote' ? 'リモート画像' : '自前画像' }}</span>
					<a v-if="safeOriginalUrl" :class="$style.srcLink" :href="safeOriginalUrl" target="_blank" rel="noopener noreferrer">{{ req.remoteHost ?? '元画像' }}</a>
				</div>
			</div>

			<MkInfo>登録内容はここで修正できます。ライト・ダーク両モードで見やすいか確認してください。</MkInfo>

			<MkInput v-model="name">
				<template #label>名前 <span :class="$style.req">必須</span></template>
				<template #prefix>:</template>
				<template #suffix>:</template>
			</MkInput>
			<MkInput v-model="license">
				<template #label>ライセンス</template>
			</MkInput>
			<HataFeedCategorySelect v-model="category" :categories="categories"/>
			<MkInput v-model="tagsRaw">
				<template #label>タグ（半角スペース区切り）</template>
			</MkInput>
			<MkSwitch v-model="localOnly">このサーバーのみで使用（連合しない）</MkSwitch>
			<MkSwitch v-model="isSensitive">センシティブな絵文字</MkSwitch>

			<div :class="$style.actions">
				<MkButton rounded danger :disabled="busy" @click="reject"><i class="ti ti-x"></i> リジェクト</MkButton>
				<MkButton rounded primary gradate :disabled="!name.trim() || busy" @click="approve"><i class="ti ti-check"></i> 承認して登録</MkButton>
			</div>
		</div>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, useTemplateRef } from 'vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInfo from '@/components/MkInfo.vue';
import HataFeedCategorySelect from '@/components/HataFeedCategorySelect.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const props = defineProps<{ req: any }>();

// 旗鯖fork(セキュリティ修正): originalUrl は申請者由来。javascript:/data: 等の危険プロトコルを除外し、
//   http/https のみクリック可能にする(承認画面で踏むのはスタッフ=モデ権限保持者なので影響大)。
const safeOriginalUrl = computed(() => {
	const u = props.req?.originalUrl;
	if (typeof u !== 'string' || !u) return null;
	try { const p = new URL(u); return (p.protocol === 'http:' || p.protocol === 'https:') ? u : null; }
	catch { return null; }
});
const emit = defineEmits<{ (ev: 'done'): void; (ev: 'closed'): void }>();
const dialog = useTemplateRef('dialog');

const name = ref(props.req.name ?? '');
const license = ref(props.req.license ?? '');
const category = ref<string | null>(props.req.category ?? '');
const tagsRaw = ref((props.req.aliases ?? []).join(' '));
const localOnly = ref(props.req.localOnly ?? false);
const isSensitive = ref(props.req.isSensitive ?? false);
const categories = ref<string[]>([]);
const busy = ref(false);

onMounted(async () => {
	categories.value = await misskeyApi('hata/feedback/emoji-categories', {}).catch(() => []);
});

async function approve() {
	if (!name.value.trim()) return;
	busy.value = true;
	try {
		await misskeyApi('hata/feedback/emoji-requests/approve', {
			requestId: props.req.id,
			name: name.value.trim(),
			category: category.value || null,
			aliases: tagsRaw.value.trim() ? tagsRaw.value.trim().split(/\s+/) : [],
			license: license.value.trim() || null,
			localOnly: localOnly.value,
			isSensitive: isSensitive.value,
		});
		os.success();
		emit('done');
		dialog.value?.close();
	} finally {
		busy.value = false;
	}
}

async function reject() {
	const { canceled, result } = await os.inputText({ title: 'リジェクト理由（任意）', allowEmpty: true });
	if (canceled) return;
	busy.value = true;
	try {
		await misskeyApi('hata/feedback/emoji-requests/reject', { requestId: props.req.id, comment: result || null });
		emit('done');
		dialog.value?.close();
	} finally {
		busy.value = false;
	}
}
</script>

<style lang="scss" module>
.gaps { display: flex; flex-direction: column; gap: 14px; }
.req { color: var(--MI_THEME-error); font-size: .72em; margin-left: 4px; }

.previewWrap { display: flex; gap: 12px; justify-content: center; }
.preview { width: 130px; height: 96px; border-radius: 14px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--MI_THEME-divider); }
.previewLight { background: #ffffff; }
.previewDark { background: #1b1b1f; }
.previewImg { width: 52px; height: 52px; object-fit: contain; }

.metaCard { background: var(--MI_THEME-bg); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.metaRow { display: flex; align-items: center; gap: 10px; }
.avatar { width: 36px; height: 36px; }
.metaName { font-weight: 600; font-size: .92em; }
.metaSub { font-size: .76em; opacity: .6; }
.sourceRow { display: flex; align-items: center; gap: 8px; }
.pill { background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); border-radius: 999px; padding: 3px 12px; font-size: .78em; }
.srcLink { font-size: .8em; color: var(--MI_THEME-accent); text-decoration: none; }

.actions { display: flex; justify-content: space-between; gap: 10px; margin-top: 6px; }
</style>
