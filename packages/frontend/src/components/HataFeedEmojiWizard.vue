<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(HataFeed 2f/3b/3c/3d): カスタム絵文字 追加申請ウィザード。
  3b ソース選択(自作 / リモート検索・要ロール) → 2f 自作詳細 / 3c リモート検索 → 3d リモート由来詳細。
  詳細は2ペイン(左=フォーム / 右=ライブプレビュー: 白黒プレビュー + ノート見え方 + 申請枠メーター)。
  3d(リモート由来)は右ペインに出典カードを出し、名前/カテゴリ/タグは元絵文字から自動入力、
  ライセンス欄は「元サーバーの利用条件を確認」の警告状態にする。
  リモート絵文字の申請はロールポリシー canRequestRemoteEmoji(quota.canRemote)が必要。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="720"
	:initialHeight="640"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-mood-smile"></i> 絵文字を申請</template>

	<div class="_spacer" style="--MI_SPACER-min: 18px; --MI_SPACER-max: 26px;">
		<!-- ステップインジケータ -->
		<div :class="$style.steps">
			<div :class="[$style.step, step >= 1 && $style.stepCur]">
				<span :class="$style.stepNo"><i v-if="step > 1" class="ti ti-check"></i><template v-else>1</template></span> 画像
			</div>
			<div :class="$style.stepBar"></div>
			<div :class="[$style.step, step >= 2 && $style.stepCur]">
				<span :class="$style.stepNo">2</span> 詳細
			</div>
		</div>

		<!-- ================= Step1 ================= -->
		<div v-if="step === 1" :class="$style.gaps">
			<!-- 3b: ソース選択 -->
			<template v-if="mode === 'source'">
				<div v-if="quota && !isStaff" :class="$style.quotaBand">
					<HfQuotaMeter :remaining="quota.remaining" :limit="quota.limit"/>
				</div>
				<div :class="$style.lead">申請する絵文字のソースを選んでください。</div>

				<button :class="$style.srcCard" :disabled="quotaEmpty" @click="pickImage">
					<span :class="$style.srcTile"><i class="ti ti-photo-up"></i></span>
					<div :class="$style.srcText">
						<div :class="$style.srcName">自分の画像から</div>
						<div :class="$style.srcDesc">ドライブの画像をアップロードして申請します。</div>
					</div>
					<i class="ti ti-chevron-right" :class="$style.srcArrow"></i>
				</button>

				<button :class="$style.srcCard" :disabled="quotaEmpty || !quota?.canRemote" @click="openRemote">
					<span :class="$style.srcTile"><i class="ti ti-world-search"></i></span>
					<div :class="$style.srcText">
						<div :class="$style.srcName">リモートの絵文字から探す <span v-if="!quota?.canRemote" :class="$style.roleBadge">要ロール</span></div>
						<div :class="$style.srcDesc">
							<template v-if="quota?.canRemote">連合先サーバーの絵文字を検索して申請します。</template>
							<template v-else>この機能は特定のロールを持つ方のみ利用できます。</template>
						</div>
					</div>
					<i class="ti ti-chevron-right" :class="$style.srcArrow"></i>
				</button>
			</template>

			<!-- 3c: リモート絵文字ブラウザ -->
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
					<button v-for="e in remoteResults" :key="e.id" :class="[$style.remoteItem, previewUrl === e.url && $style.remoteItemSel]" @click="pickRemote(e)">
						<img :src="e.url" :class="$style.remoteImg" :alt="e.name"/>
						<div :class="$style.remoteName">:{{ e.name }}:</div>
						<div :class="$style.remoteHost">{{ e.host }}</div>
					</button>
				</div>
				<MkButton v-if="remoteResults.length > 0 && remoteHasMore" :class="$style.moreBtn" rounded @click="searchRemote(false)">さらに表示</MkButton>
			</template>
		</div>

		<!-- ================= Step2: 詳細(2f 自作 / 3d リモート由来) ================= -->
		<div v-else :class="$style.detailGrid">
			<!-- 左: フォーム -->
			<div :class="$style.form">
				<MkInput v-model="name">
					<template #label>絵文字の名前 <span :class="$style.req">必須</span></template>
					<template #prefix>:</template>
					<template #suffix>:</template>
					<template v-if="sourceType === 'remote'" #caption>元の名前から自動入力しています。必要に応じて変更してください。</template>
				</MkInput>

				<div :class="[$style.licenseField, sourceType === 'remote' && $style.licenseWarn]">
					<MkInput v-model="license">
						<template #label>ライセンス</template>
						<template #caption>
							<span v-if="sourceType === 'remote'" :class="$style.warnText"><i class="ti ti-alert-triangle"></i> 元サーバーの利用条件を確認のうえ記入してください。</span>
							<span v-else>作者・出典・利用条件など。不明な場合は確認のうえ記入してください。</span>
						</template>
					</MkInput>
				</div>

				<HataFeedCategorySelect v-model="category" :categories="categories"/>
				<MkInput v-model="tagsRaw">
					<template #label>タグ</template>
					<template #caption>複数指定する場合は半角スペースで区切ってください（例: cat cute mascot）。</template>
				</MkInput>
				<MkSwitch v-model="localOnly">このサーバーのみで使用（連合しない）</MkSwitch>
				<MkSwitch v-model="isSensitive">センシティブな絵文字</MkSwitch>

				<div :class="$style.navRow">
					<MkButton rounded @click="backToStep1"><i class="ti ti-arrow-left"></i> {{ sourceType === 'remote' ? '検索に戻る' : '戻る' }}</MkButton>
					<MkButton rounded primary gradate :disabled="!name.trim() || submitting" @click="submit"><i class="ti ti-send"></i> 申請する</MkButton>
				</div>
			</div>

			<!-- 右: ライブプレビュー -->
			<aside :class="$style.preview">
				<div :class="$style.previewLabel">プレビュー</div>
				<HfEmojiPreviewPair :url="previewUrl" :size="52"/>

				<!-- 3d: 出典カード -->
				<div v-if="sourceType === 'remote'" :class="$style.sourceCard">
					<div :class="$style.sourceBadge"><i class="ti ti-world"></i> リモート画像</div>
					<a v-if="safeOriginalUrl" :class="$style.sourceLink" :href="safeOriginalUrl" target="_blank" rel="noopener noreferrer">
						{{ remoteHost ?? '元画像を開く' }} <i class="ti ti-external-link"></i>
					</a>
				</div>

				<!-- ノートでの見え方 -->
				<div :class="$style.noteHint">
					<div :class="$style.noteHintLabel">ノートでの見え方</div>
					<div :class="$style.noteFaux">
						いいね！ <img v-if="previewUrl" :src="previewUrl" :class="$style.noteEmoji" :alt="name"/> です
					</div>
				</div>

				<div v-if="quota && !isStaff" :class="$style.previewQuota">
					<HfQuotaMeter :remaining="quota.remaining" :limit="quota.limit"/>
				</div>
				<div v-else-if="sourceType !== 'remote'" :class="$style.previewTip">
					<i class="ti ti-bulb"></i> ライト・ダーク両テーマで見やすい絵文字を推奨します。
				</div>
			</aside>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, useTemplateRef } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import HataFeedCategorySelect from '@/components/HataFeedCategorySelect.vue';
import HfQuotaMeter from '@/components/HfQuotaMeter.vue';
import HfEmojiPreviewPair from '@/components/HfEmojiPreviewPair.vue';
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

// 出典リンクは http(s) のみ許可(スキーム偽装対策)。
const safeOriginalUrl = computed(() => {
	const u = originalUrl.value;
	if (!u) return null;
	return /^https?:\/\//i.test(u) ? u : null;
});

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
	if (quotaEmpty.value || !quota.value?.canRemote) return;
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
	// リモート由来ならブラウザ(3c)に戻す。
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

/* ステップインジケータ */
.steps { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.step { display: inline-flex; align-items: center; gap: 6px; font-size: .82em; font-weight: 700; opacity: .5; }
.stepCur { opacity: 1; }
.stepNo { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 999px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); font-size: .85em; }
.stepCur .stepNo { background: var(--MI_THEME-accent); color: #fff; border-color: var(--MI_THEME-accent); }
.stepBar { flex: 1; height: 2px; background: var(--MI_THEME-divider); border-radius: 999px; max-width: 60px; }

/* 3b: ソースカード */
.quotaBand { background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 12px; padding: 10px 14px; }
.srcCard { display: flex; align-items: center; gap: 14px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 14px; padding: 14px 16px; cursor: pointer; text-align: left; color: inherit; width: 100%; transition: border-color .12s, transform .12s; }
.srcCard:hover:not(:disabled) { border-color: var(--MI_THEME-accent); transform: translateY(-1px); }
.srcCard:disabled { opacity: .5; cursor: not-allowed; }
.srcTile { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); font-size: 1.4rem; flex-shrink: 0; }
.srcText { min-width: 0; flex: 1; }
.srcName { font-weight: 700; display: flex; align-items: center; gap: 6px; }
.srcDesc { font-size: .8em; opacity: .65; margin-top: 2px; }
.srcArrow { opacity: .4; }
.roleBadge { font-size: .72em; font-weight: 700; background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); border-radius: 999px; padding: 1px 8px; }

/* 3c: リモートブラウザ */
.remoteHead { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.backBtn { background: none; border: none; color: var(--MI_THEME-accent); cursor: pointer; font-size: .88em; padding: 2px 0; }
.searchRow { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
.searchInput { flex: 1; min-width: 160px; }
.hostInput { width: 150px; }
.remoteHint { opacity: .55; font-size: .88em; padding: 24px 0; text-align: center; }
.remoteGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; max-height: 340px; overflow-y: auto; }
.remoteItem { display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 12px; padding: 10px 6px; cursor: pointer; color: inherit; transition: all .12s; }
.remoteItem:hover { border-color: var(--MI_THEME-accent); transform: translateY(-1px); }
.remoteItemSel { border-color: var(--MI_THEME-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--MI_THEME-accent) 30%, transparent); }
.remoteImg { width: 28px; height: 28px; object-fit: contain; }
.remoteName { font-size: .68em; font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.remoteHost { font-size: .6em; opacity: .55; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.moreBtn { align-self: center; }

/* 2f/3d: 詳細 2ペイン */
.detailGrid { display: grid; grid-template-columns: 1fr 240px; gap: 20px; align-items: start; }
.form { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.navRow { display: flex; justify-content: space-between; margin-top: 6px; }

.licenseField { border-radius: 10px; }
.licenseWarn { outline: 1px solid color-mix(in srgb, #ecb637 60%, transparent); outline-offset: 4px; border-radius: 8px; }
.warnText { color: #b6791f; }

/* 右ペイン(ライブプレビュー) */
.preview { background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px; position: sticky; top: 0; }
.previewLabel { font-size: .72em; font-weight: 800; opacity: .6; letter-spacing: .04em; }
.sourceCard { background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.sourceBadge { display: inline-flex; align-items: center; gap: 5px; font-size: .74em; font-weight: 700; color: var(--MI_THEME-accent); }
.sourceLink { display: inline-flex; align-items: center; gap: 4px; font-size: .78em; word-break: break-all; }
.noteHint { }
.noteHintLabel { font-size: .72em; opacity: .6; margin-bottom: 5px; }
.noteFaux { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 10px; padding: 8px 10px; font-size: .82em; }
.noteEmoji { width: 22px; height: 22px; object-fit: contain; vertical-align: middle; }
.previewQuota { margin-top: 2px; }
.previewTip { font-size: .74em; opacity: .7; line-height: 1.5; display: flex; gap: 5px; }
.previewTip i { color: var(--MI_THEME-accent); }

/* 狭い時は詳細を縦積み(プレビューを上に) */
@media (max-width: 620px) {
	.detailGrid { grid-template-columns: 1fr; }
	.preview { order: -1; position: static; }
	.remoteGrid { grid-template-columns: repeat(4, 1fr); }
}
</style>
