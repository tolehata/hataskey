<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed のカスタム絵文字 追加申請ウィザード。
  ソース選択(自分の画像 / リモート絵文字を一覧検索)→ 詳細入力 + ライト/ダークプレビュー → 申請。
  リモート絵文字の申請はロールポリシー canRequestRemoteEmoji が必要。
  週あたりの申請上限(emojiRequestLimit、既定10)と残数を表示する。
-->
<template>
<MkModalWindow
	ref="dialog"
	:width="580"
	:height="700"
	@close="dialog?.close()"
	@closed="emit('closed')"
>
	<template #header>絵文字を申請（{{ step }}/2）</template>

	<div class="_spacer" style="--MI_SPACER-min: 20px; --MI_SPACER-max: 28px;">
		<!-- Step1 -->
		<div v-if="step === 1" :class="$style.gaps">
			<!-- 残数バナー(スタッフは上限なしのため非表示) -->
			<div v-if="quota && !isStaff" :class="[$style.quota, quota.remaining <= 0 && $style.quotaEmpty]">
				<i class="ti ti-ticket"></i>
				<span v-if="quota.remaining > 0">今週はあと <b>{{ quota.remaining }}</b> / {{ quota.limit }} 件 申請できます</span>
				<span v-else>今週の申請上限（{{ quota.limit }}件）に達しました<template v-if="quota.resetAt"> ・ <MkTime :time="quota.resetAt" mode="relative"/>に1枠回復</template></span>
			</div>

			<!-- ソース選択 -->
			<template v-if="mode === 'source'">
				<div :class="$style.lead">申請する絵文字を選択してください。</div>
				<button :class="$style.srcCard" :disabled="quotaEmpty" @click="pickImage">
					<i class="ti ti-photo-up" :class="$style.srcIcon"></i>
					<div :class="$style.srcText"><div :class="$style.srcName">自分の画像から</div><div :class="$style.srcDesc">ドライブの画像をアップロードして申請</div></div>
				</button>
				<button v-if="quota?.canRemote" :class="$style.srcCard" :disabled="quotaEmpty" @click="openRemote">
					<i class="ti ti-world-search" :class="$style.srcIcon"></i>
					<div :class="$style.srcText"><div :class="$style.srcName">リモートの絵文字から探す</div><div :class="$style.srcDesc">連合先サーバーの絵文字を一覧・検索して申請</div></div>
					<i class="ti ti-chevron-right" :class="$style.srcArrow"></i>
				</button>
			</template>

			<!-- リモート絵文字ブラウザ -->
			<template v-else>
				<div :class="$style.remoteHead">
					<button :class="$style.backBtn" @click="mode = 'source'"><i class="ti ti-arrow-left"></i> 戻る</button>
					<span :class="$style.lead">リモートの絵文字を検索</span>
				</div>
				<div :class="$style.searchRow">
					<MkInput v-model="remoteQuery" :class="$style.searchInput" type="search" placeholder="絵文字名で検索" @enter="searchRemote(true)">
						<template #prefix><i class="ti ti-search"></i></template>
					</MkInput>
					<MkInput v-model="remoteHostFilter" :class="$style.hostInput" placeholder="ホスト(任意)" @enter="searchRemote(true)"/>
					<MkButton rounded primary @click="searchRemote(true)">検索</MkButton>
				</div>
				<div v-if="remoteLoading && remoteResults.length === 0" :class="$style.remoteHint">検索中…</div>
				<div v-else-if="remoteResults.length === 0" :class="$style.remoteHint">条件に合う絵文字が見つかりません。</div>
				<div v-else :class="$style.remoteGrid">
					<button v-for="e in remoteResults" :key="e.id" :class="$style.remoteItem" @click="pickRemote(e)">
						<img :src="e.url" :class="$style.remoteImg" :alt="e.name"/>
						<div :class="$style.remoteName">:{{ e.name }}:</div>
						<div :class="$style.remoteHost">{{ e.host }}</div>
					</button>
				</div>
				<MkButton v-if="remoteResults.length > 0 && remoteHasMore" :class="$style.moreBtn" rounded @click="searchRemote(false)">さらに表示</MkButton>
			</template>
		</div>

		<!-- Step2: 詳細 + プレビュー -->
		<div v-else :class="$style.gaps">
			<div :class="$style.previewWrap">
				<div :class="[$style.preview, $style.previewLight]"><img v-if="previewUrl" :src="previewUrl" :class="$style.previewImg"/></div>
				<div :class="[$style.preview, $style.previewDark]"><img v-if="previewUrl" :src="previewUrl" :class="$style.previewImg"/></div>
			</div>
			<MkInfo warn>ライトモード・ダークモードの<b>両方で見やすい</b>絵文字であることを強く推奨します。</MkInfo>

			<MkInput v-model="name">
				<template #label>絵文字の名前 <span :class="$style.req">必須</span></template>
				<template #prefix>:</template>
				<template #suffix>:</template>
			</MkInput>
			<MkInput v-model="license">
				<template #label>ライセンス</template>
				<template #caption>作者・出典・利用条件など。不明な場合は確認のうえ記入してください。</template>
			</MkInput>
			<HataFeedCategorySelect v-model="category" :categories="categories"/>
			<MkInput v-model="tagsRaw">
				<template #label>タグ</template>
				<template #caption>複数指定する場合は半角スペースで区切ってください（例: cat cute mascot）。</template>
			</MkInput>
			<MkSwitch v-model="localOnly">このサーバーのみで使用（連合しない）</MkSwitch>
			<MkSwitch v-model="isSensitive">センシティブな絵文字</MkSwitch>

			<div :class="$style.navRow">
				<MkButton rounded @click="backToStep1"><i class="ti ti-arrow-left"></i> 戻る</MkButton>
				<MkButton rounded primary gradate :disabled="!name.trim() || submitting" @click="submit"><i class="ti ti-send"></i> 申請する</MkButton>
			</div>
		</div>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, useTemplateRef } from 'vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInfo from '@/components/MkInfo.vue';
import HataFeedCategorySelect from '@/components/HataFeedCategorySelect.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { chooseDriveFile } from '@/utility/drive.js';

const props = defineProps<{ isStaff?: boolean }>();
const emit = defineEmits<{ (ev: 'done', v: any): void; (ev: 'closed'): void }>();
const dialog = useTemplateRef('dialog');

const step = ref(1);
const mode = ref<'source' | 'remote'>('source');

const sourceType = ref<'image' | 'remote'>('image');
const fileId = ref<string | null>(null);
const originalUrl = ref<string | null>(null);
const remoteHost = ref<string | null>(null);
const previewUrl = ref<string | null>(null);

const name = ref('');
const license = ref('');
const category = ref<string | null>('');
const tagsRaw = ref('');
const localOnly = ref(false);
const isSensitive = ref(false);
const categories = ref<string[]>([]);
const submitting = ref(false);

const quota = ref<{ limit: number; used: number; remaining: number; canRemote: boolean; resetAt: string | null } | null>(null);
const quotaEmpty = computed(() => !props.isStaff && (quota.value?.remaining ?? 1) <= 0);

// リモート絵文字検索
const remoteQuery = ref('');
const remoteHostFilter = ref('');
const remoteResults = ref<any[]>([]);
const remoteLoading = ref(false);
const remoteHasMore = ref(false);

onMounted(async () => {
	categories.value = await misskeyApi('hata/feedback/emoji-categories', {}).catch(() => []);
	quota.value = await misskeyApi('hata/feedback/emoji-quota', {}).catch(() => null);
});

function deriveName(src: string) {
	const base = src.split('/').pop()?.split('?')[0] ?? '';
	return base.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 64);
}

async function pickImage() {
	if (quotaEmpty.value) return;
	const chosen = await chooseDriveFile({ multiple: false }).catch(() => []);
	const f = chosen[0];
	if (!f) return;
	sourceType.value = 'image';
	fileId.value = f.id;
	originalUrl.value = null;
	remoteHost.value = null;
	previewUrl.value = f.url;
	if (!name.value) name.value = f.name ? deriveName(f.name) : '';
	step.value = 2;
}

function openRemote() {
	if (quotaEmpty.value) return;
	mode.value = 'remote';
	if (remoteResults.value.length === 0) searchRemote(true);
}

async function searchRemote(reset: boolean) {
	remoteLoading.value = true;
	try {
		if (reset) remoteResults.value = [];
		const last = remoteResults.value[remoteResults.value.length - 1];
		const res = await misskeyApi('hata/feedback/remote-emojis', {
			query: remoteQuery.value.trim() || null,
			host: remoteHostFilter.value.trim() || null,
			limit: 31,
			untilId: reset ? undefined : last?.id,
		});
		remoteHasMore.value = res.length > 30;
		remoteResults.value = (reset ? [] : remoteResults.value).concat(res.slice(0, 30));
	} catch {
		// 権限なし等はそのまま空表示
	} finally {
		remoteLoading.value = false;
	}
}

function pickRemote(e: any) {
	sourceType.value = 'remote';
	fileId.value = null;
	originalUrl.value = e.url;
	remoteHost.value = e.host ?? null;
	previewUrl.value = e.url;
	name.value = e.name ? deriveName(e.name) : '';
	if (e.category) category.value = e.category;
	if (Array.isArray(e.aliases) && e.aliases.length) tagsRaw.value = e.aliases.join(' ');
	step.value = 2;
}

function backToStep1() {
	step.value = 1;
	// リモート由来ならブラウザに戻す。
	mode.value = sourceType.value === 'remote' ? 'remote' : 'source';
}

async function submit() {
	if (!name.value.trim()) return;
	if (quotaEmpty.value) {
		os.alert({ type: 'warning', text: '今週の申請上限に達しています。' });
		return;
	}
	if (!license.value.trim()) {
		const { canceled } = await os.confirm({ type: 'warning', text: 'ライセンス情報が空です。不明なまま申請しますか？' });
		if (canceled) return;
	}
	submitting.value = true;
	try {
		const req = await misskeyApi('hata/feedback/emoji-requests/create', {
			name: name.value.trim(),
			category: category.value || null,
			aliases: tagsRaw.value.trim() ? tagsRaw.value.trim().split(/\s+/) : [],
			license: license.value.trim() || null,
			localOnly: localOnly.value,
			isSensitive: isSensitive.value,
			sourceType: sourceType.value,
			originalUrl: sourceType.value === 'remote' ? originalUrl.value : null,
			remoteHost: remoteHost.value,
			fileId: fileId.value,
		});
		os.success();
		emit('done', req);
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

.quota { display: flex; align-items: center; gap: 8px; background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); border-radius: 12px; padding: 9px 14px; font-size: .85em; }
.quota b { font-size: 1.1em; }
.quotaEmpty { background: color-mix(in srgb, var(--MI_THEME-error) 12%, transparent); color: var(--MI_THEME-error); }

.srcCard { display: flex; align-items: center; gap: 12px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 14px; padding: 14px 16px; cursor: pointer; text-align: left; color: inherit; width: 100%; transition: border-color .12s; }
.srcCard:hover:not(:disabled) { border-color: var(--MI_THEME-accent); }
.srcCard:disabled { opacity: .5; cursor: not-allowed; }
.srcIcon { font-size: 1.6rem; color: var(--MI_THEME-accent); width: 30px; text-align: center; }
.srcText { min-width: 0; flex: 1; }
.srcName { font-weight: 700; }
.srcDesc { font-size: .8em; opacity: .65; }
.srcArrow { opacity: .4; }

.remoteHead { display: flex; align-items: center; gap: 10px; }
.backBtn { background: none; border: none; color: var(--MI_THEME-accent); cursor: pointer; font-size: .88em; padding: 2px 0; }
.searchRow { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
.searchInput { flex: 1; min-width: 160px; }
.hostInput { width: 150px; }
.remoteHint { opacity: .55; font-size: .88em; padding: 16px 0; text-align: center; }
.remoteGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; max-height: 320px; overflow-y: auto; }
.remoteItem { display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 12px; padding: 10px 6px; cursor: pointer; color: inherit; transition: all .12s; }
.remoteItem:hover { border-color: var(--MI_THEME-accent); transform: translateY(-1px); }
.remoteImg { width: 40px; height: 40px; object-fit: contain; }
.remoteName { font-size: .72em; font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.remoteHost { font-size: .64em; opacity: .55; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.moreBtn { align-self: center; }

.previewWrap { display: flex; gap: 12px; justify-content: center; }
.preview { width: 120px; height: 90px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--MI_THEME-divider); }
.previewLight { background: #ffffff; }
.previewDark { background: #1b1b1f; }
.previewImg { width: 48px; height: 48px; object-fit: contain; }

.navRow { display: flex; justify-content: space-between; margin-top: 6px; }
</style>
