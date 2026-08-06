<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed の絵文字申請確認ウィンドウ。
  1件だけの通常確認と、複数申請を順番に処理する連続確認の両方に対応する。
  一括で無条件承認はせず、各申請の画像・出典・ライセンス・公開範囲を確認してから
  「承認して次へ」「リジェクトして次へ」で進む。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="860"
	:initialHeight="720"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-mood-check"></i> {{ initialTotal > 1 ? '絵文字申請を連続確認' : '絵文字申請の確認' }}</template>

	<div :class="$style.reviewShell">
		<template v-if="currentReq">
			<div v-if="initialTotal > 1" :class="$style.queuePanel">
				<div :class="$style.queueHead">
					<div>
						<div :class="$style.queueTitle">未処理の申請</div>
						<div :class="$style.queueMeta">確認中 {{ currentIndex + 1 }} / {{ queue.length }} ・ この画面で {{ resolvedCount }}件処理</div>
					</div>
					<div :class="$style.queueProgress" role="progressbar" :aria-valuemin="0" :aria-valuemax="initialTotal" :aria-valuenow="resolvedCount">
						<span :style="{ width: `${progressPercent}%` }"></span>
					</div>
				</div>
				<div :class="$style.queueStrip" aria-label="未処理の絵文字申請一覧">
					<button
						v-for="(item, index) in queue"
						:key="item.id"
						type="button"
						:class="[$style.queueItem, index === currentIndex && $style.queueItemCurrent]"
						:title="`:${item.name}: を確認`"
						@click="currentIndex = index"
					>
						<img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name">
						<i v-else class="ti ti-photo-off"></i>
					</button>
				</div>
			</div>

			<div v-if="queue.length > 1" :class="$style.mobileNav" aria-label="申請の切り替え">
				<button type="button" aria-label="前の申請" @click="showPrevious"><i class="ti ti-chevron-left"></i></button>
				<span>{{ currentIndex + 1 }} / {{ queue.length }}</span>
				<button type="button" aria-label="次の申請" @click="showNext"><i class="ti ti-chevron-right"></i></button>
			</div>

			<Transition :name="slideDirection === 'next' ? 'hfEmojiNext' : 'hfEmojiPrev'" mode="out-in">
				<div :key="currentReq.id" :class="$style.reviewGrid">
					<section :class="$style.previewColumn">
						<div :class="$style.sectionLabel">見え方と申請元</div>
						<div :class="$style.previewWrap">
							<div :class="[$style.preview, $style.previewLight]"><img v-if="currentReq.imageUrl" :src="currentReq.imageUrl" :class="$style.previewImg" :alt="currentReq.name"></div>
							<div :class="[$style.preview, $style.previewDark]"><img v-if="currentReq.imageUrl" :src="currentReq.imageUrl" :class="$style.previewImg" :alt="currentReq.name"></div>
						</div>
						<div :class="$style.notePreview">
							<div :class="$style.notePreviewLabel">ノートでの見え方</div>
							<div>いいね！ <img v-if="currentReq.imageUrl" :src="currentReq.imageUrl" :class="$style.noteEmoji" :alt="currentReq.name"> です</div>
						</div>

						<div :class="$style.metaCard">
							<div :class="$style.metaRow">
								<MkAvatar v-if="currentReq.requestedBy" :class="$style.avatar" :user="currentReq.requestedBy"/>
								<div>
									<div :class="$style.metaName"><MkUserName v-if="currentReq.requestedBy" :user="currentReq.requestedBy"/> が申請</div>
									<div :class="$style.metaSub"><MkTime :time="currentReq.createdAt"/></div>
								</div>
							</div>
							<div :class="$style.sourceRow">
								<span :class="$style.pill">{{ currentReq.sourceType === 'remote' ? 'リモート画像' : '自前画像' }}</span>
								<a v-if="safeOriginalUrl" :class="$style.srcLink" :href="safeOriginalUrl" target="_blank" rel="noopener noreferrer">{{ currentReq.remoteHost ?? '元画像を開く' }} <i class="ti ti-external-link"></i></a>
							</div>
						</div>
					</section>

					<section :class="$style.formColumn">
						<div :class="$style.sectionLabel">登録内容</div>
						<MkInfo>内容を修正できます。ライト・ダーク両方での見え方と、ライセンスを確認してください。</MkInfo>

						<MkInput v-model="name">
							<template #label>名前 <span :class="$style.req">必須</span></template>
							<template #prefix>:</template>
							<template #suffix>:</template>
						</MkInput>
						<MkInput v-model="license">
							<template #label>ライセンス</template>
							<template #caption>{{ currentReq.sourceType === 'remote' ? '元サーバーの利用条件と一致しているか確認してください。' : '作者・出典・利用条件を確認してください。' }}</template>
						</MkInput>
						<HataFeedCategorySelect v-model="category" :categories="categories"/>
						<MkInput v-model="tagsRaw">
							<template #label>タグ（半角スペース区切り）</template>
						</MkInput>
						<MkSwitch v-model="localOnly">このサーバーのみで使用（連合しない）</MkSwitch>
						<MkSwitch v-model="isSensitive">センシティブな絵文字</MkSwitch>
					</section>
				</div>
			</Transition>

			<div :class="$style.actions">
				<MkButton v-if="queue.length > 1" rounded :disabled="busy" @click="holdAndNext"><i class="ti ti-player-skip-forward"></i> 保留して次へ</MkButton>
				<div :class="$style.resolveActions">
					<MkButton rounded danger :disabled="busy" @click="reject"><i class="ti ti-x"></i> リジェクト{{ queue.length > 1 ? 'して次へ' : '' }}</MkButton>
					<MkButton rounded primary gradate :disabled="!name.trim() || busy" @click="approve"><i class="ti ti-check"></i> 承認して登録{{ queue.length > 1 ? '、次へ' : '' }}</MkButton>
				</div>
			</div>
		</template>

		<div v-else :class="$style.complete">
			<i class="ti ti-circle-check-filled"></i>
			<div :class="$style.completeTitle">未処理の申請を確認しました</div>
			<div :class="$style.completeText">この画面で {{ resolvedCount }}件を処理しました。</div>
			<MkButton rounded primary @click="closeWindow">閉じる</MkButton>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import type { HataFeedEmojiRequest } from '@/utility/hatafeed.js';
import MkWindow from '@/components/MkWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInfo from '@/components/MkInfo.vue';
import HataFeedCategorySelect from '@/components/HataFeedCategorySelect.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const props = defineProps<{ req?: HataFeedEmojiRequest; requests?: HataFeedEmojiRequest[] }>();
const emit = defineEmits<{ (ev: 'done'): void; (ev: 'closed'): void }>();
const dialog = useTemplateRef('dialog');

const queue = ref<HataFeedEmojiRequest[]>([]);
const initialTotal = ref(0);
const currentIndex = ref(0);
const currentReq = computed<HataFeedEmojiRequest | null>(() => queue.value.at(currentIndex.value) ?? null);
const resolvedCount = ref(0);
const progressPercent = computed(() => initialTotal.value === 0 ? 100 : Math.round((resolvedCount.value / initialTotal.value) * 100));
const slideDirection = ref<'next' | 'prev'>('next');

let initialized = false;
watch([() => props.requests, () => props.req], ([requests, req]) => {
	if (initialized) return;
	const seed = requests?.length ? requests : (req ? [req] : []);
	queue.value = seed.filter(item => item.status === 'pending');
	initialTotal.value = queue.value.length;
	initialized = true;
}, { immediate: true });

const name = ref('');
const license = ref('');
const category = ref<string | null>('');
const tagsRaw = ref('');
const localOnly = ref(false);
const isSensitive = ref(false);
const categories = ref<string[]>([]);
const busy = ref(false);

const safeOriginalUrl = computed(() => {
	const u = currentReq.value?.originalUrl;
	if (typeof u !== 'string' || !u) return null;
	try {
		const parsed = new URL(u);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? u : null;
	} catch {
		return null;
	}
});

watch(currentReq, req => {
	name.value = req?.name ?? '';
	license.value = req?.license ?? '';
	category.value = req?.category ?? '';
	tagsRaw.value = (req?.aliases ?? []).join(' ');
	localOnly.value = req?.localOnly ?? false;
	isSensitive.value = req?.isSensitive ?? false;
}, { immediate: true });

onMounted(async () => {
	categories.value = await misskeyApi('hata/feedback/emoji-categories', {}).catch(() => []);
});

function removeCurrent(): void {
	if (currentReq.value == null) return;
	queue.value.splice(currentIndex.value, 1);
	if (currentIndex.value >= queue.value.length) currentIndex.value = Math.max(0, queue.value.length - 1);
	// 従来の単件確認は処理後すぐ閉じる。完了画面は複数申請を連続確認した場合だけ表示する。
	if (queue.value.length === 0 && initialTotal.value <= 1) closeWindow();
}

function holdAndNext(): void {
	if (queue.value.length <= 1) return;
	slideDirection.value = 'next';
	currentIndex.value = (currentIndex.value + 1) % queue.value.length;
}

function showNext(): void {
	if (queue.value.length <= 1) return;
	slideDirection.value = 'next';
	currentIndex.value = (currentIndex.value + 1) % queue.value.length;
}

function showPrevious(): void {
	if (queue.value.length <= 1) return;
	slideDirection.value = 'prev';
	currentIndex.value = (currentIndex.value - 1 + queue.value.length) % queue.value.length;
}

async function ensureStillPending(requestId: string): Promise<boolean> {
	const latest = await misskeyApi('hata/feedback/emoji-requests', { id: requestId, limit: 1 });
	if (latest[0]?.status === 'pending') return true;
	os.toast('この申請は別のスタッフが処理済みです。次の申請へ進みます。');
	removeCurrent();
	emit('done');
	return false;
}

async function approve(): Promise<void> {
	const req = currentReq.value;
	if (req == null || !name.value.trim()) return;
	busy.value = true;
	try {
		if (!await ensureStillPending(req.id)) return;
		await misskeyApi('hata/feedback/emoji-requests/approve', {
			requestId: req.id,
			name: name.value.trim(),
			category: category.value === '' ? null : category.value,
			aliases: tagsRaw.value.trim() ? tagsRaw.value.trim().split(/\s+/) : [],
			license: license.value.trim() === '' ? null : license.value.trim(),
			localOnly: localOnly.value,
			isSensitive: isSensitive.value,
		});
		resolvedCount.value++;
		removeCurrent();
		emit('done');
		os.success();
	} finally {
		busy.value = false;
	}
}

async function reject(): Promise<void> {
	const req = currentReq.value;
	if (req == null) return;
	const { canceled, result } = await os.inputText({ title: 'リジェクト理由（任意）', default: '' });
	if (canceled) return;
	busy.value = true;
	try {
		if (!await ensureStillPending(req.id)) return;
		await misskeyApi('hata/feedback/emoji-requests/reject', { requestId: req.id, comment: result.trim() === '' ? null : result });
		resolvedCount.value++;
		removeCurrent();
		emit('done');
	} finally {
		busy.value = false;
	}
}

function closeWindow(): void {
	dialog.value?.close();
}
</script>

<style lang="scss" module>
.reviewShell { container-type: inline-size; padding: 20px; min-width: 0; }
.queuePanel { margin-bottom: 18px; padding: 12px 14px; border: 1px solid var(--MI_THEME-divider); border-radius: 14px; background: var(--MI_THEME-bg); }
.queueHead { display: grid; grid-template-columns: minmax(0, 1fr) 180px; align-items: center; gap: 14px; margin-bottom: 10px; }
.queueTitle { font-weight: 800; }
.queueMeta { margin-top: 2px; font-size: .76em; opacity: .65; }
.queueProgress { height: 7px; overflow: hidden; border-radius: 999px; background: var(--MI_THEME-divider); }
.queueProgress span { display: block; height: 100%; border-radius: inherit; background: var(--MI_THEME-accent); transition: width .2s ease; }
.queueStrip { display: flex; gap: 8px; overflow-x: auto; padding: 2px; }
.queueItem { width: 46px; height: 46px; flex: 0 0 46px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--MI_THEME-divider); border-radius: 10px; background: var(--MI_THEME-panel); color: inherit; cursor: pointer; }
.queueItem img { max-width: 34px; max-height: 34px; object-fit: contain; }
.queueItemCurrent { border-color: var(--MI_THEME-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--MI_THEME-accent) 24%, transparent); }
.mobileNav { display: none; }

.reviewGrid { display: grid; grid-template-columns: minmax(260px, .85fr) minmax(300px, 1.15fr); gap: 20px; align-items: start; }
.previewColumn, .formColumn { min-width: 0; }
.formColumn { display: flex; flex-direction: column; gap: 14px; }
.sectionLabel { margin-bottom: 10px; font-size: .78em; font-weight: 800; opacity: .65; letter-spacing: .04em; }
.req { color: var(--MI_THEME-error); font-size: .72em; margin-left: 4px; }

.previewWrap { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.preview { min-height: 132px; border-radius: 14px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--MI_THEME-divider); }
.previewLight { background: #fff; }
.previewDark { background: #1b1b1f; }
.previewImg { width: 64px; height: 64px; object-fit: contain; }
.notePreview { margin-top: 10px; padding: 14px; border: 1px solid var(--MI_THEME-divider); border-radius: 12px; background: var(--MI_THEME-panel); }
.notePreviewLabel { margin-bottom: 8px; font-size: .72em; font-weight: 700; opacity: .55; }
.noteEmoji { width: 28px; height: 28px; object-fit: contain; vertical-align: middle; }

.metaCard { margin-top: 10px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.metaRow { display: flex; align-items: center; gap: 10px; }
.avatar { width: 36px; height: 36px; }
.metaName { font-weight: 600; font-size: .92em; }
.metaSub { font-size: .76em; opacity: .6; }
.sourceRow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pill { background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); border-radius: 999px; padding: 3px 12px; font-size: .78em; }
.srcLink { font-size: .8em; color: var(--MI_THEME-accent); text-decoration: none; overflow-wrap: anywhere; }

.actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--MI_THEME-divider); }
.resolveActions { display: flex; justify-content: flex-end; gap: 10px; margin-left: auto; }
.complete { min-height: 360px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; }
.complete > i { color: var(--MI_THEME-accent); font-size: 3rem; }
.completeTitle { font-size: 1.15em; font-weight: 800; }
.completeText { opacity: .65; }

@container (max-width: 700px) {
	.reviewGrid { grid-template-columns: 1fr; }
	.queueHead { grid-template-columns: 1fr; }
	.queueStrip { display: none; }
	.mobileNav { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; gap: 10px; margin-bottom: 12px; }
	.mobileNav button { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--MI_THEME-divider); border-radius: 999px; background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); font-size: 1.25rem; cursor: pointer; }
	.mobileNav span { text-align: center; font-size: .86em; font-weight: 800; }
	.actions, .resolveActions { align-items: stretch; flex-direction: column; width: 100%; }
	.resolveActions { margin-left: 0; }
}
</style>

<style lang="scss" scoped>
.hfEmojiNext-enter-active, .hfEmojiNext-leave-active,
.hfEmojiPrev-enter-active, .hfEmojiPrev-leave-active {
	transition: opacity .18s ease, transform .18s ease;
}
.hfEmojiNext-enter-from { opacity: 0; transform: translateX(28px); }
.hfEmojiNext-leave-to { opacity: 0; transform: translateX(-28px); }
.hfEmojiPrev-enter-from { opacity: 0; transform: translateX(-28px); }
.hfEmojiPrev-leave-to { opacity: 0; transform: translateX(28px); }
@media (prefers-reduced-motion: reduce) {
	.hfEmojiNext-enter-active, .hfEmojiNext-leave-active,
	.hfEmojiPrev-enter-active, .hfEmojiPrev-leave-active { transition: none; }
}
</style>
