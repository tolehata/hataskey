<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<MkWindow ref="window" class="hatady-scope hatafeed-scope" data-hatafeed-window :data-hatady-theme="hataFeedTheme" :initialWidth="650" :initialHeight="600" canResize centerTitle @closed="emit('closed')">
	<template #header>あなたの絵文字申請</template>
	<div class="hf-form">
		<p v-if="error" role="alert">{{ error }}<button type="button" class="hy-secondary" @click="load()">再読み込み</button></p>
		<p v-else-if="loading" role="status">読み込んでいます</p>
		<p v-else-if="!requests.length" class="hf-empty">まだ申請はありません</p>
		<article v-for="request in requests" :key="request.id" :class="$style.request"><img v-if="request.imageUrl" :src="request.imageUrl" :alt="request.name"><div><strong>:{{ request.name }}:</strong><p><i :class="['ti', emojiStatusIcon[request.status]]" aria-hidden="true"></i>{{ emojiStatusLabel[request.status] }} · <MkTime :time="request.createdAt" mode="relative"/></p><p v-if="request.resolvedComment">{{ request.resolvedComment }}</p></div></article>
		<div class="hf-actions"><button type="button" class="hf-icon" aria-label="前のページ" :disabled="loading || page === 0" @click="load(page - 1)"><i class="ti ti-chevron-left"></i></button><span :class="$style.page">{{ page + 1 }}</span><button type="button" class="hf-icon" aria-label="次のページ" :disabled="loading || !hasNext" @click="load(page + 1)"><i class="ti ti-chevron-right"></i></button></div>
		<div class="hf-actions"><button type="button" class="hy-secondary" @click="window?.close()">閉じる</button></div>
	</div>
</MkWindow>
</template>
<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue';
import type { HataFeedEmojiRequest } from '@/utility/hatafeed.js';
import MkWindow from '@/components/MkWindow.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hataFeedTheme } from '@/utility/hatasaba-device-prefs.js';
import { emojiStatusIcon, emojiStatusLabel } from '@/utility/hatafeed.js';
import '@/components/hatafeed-ui.css';
const emit = defineEmits<{ closed: [] }>();
const window = useTemplateRef('window');
const requests = ref<HataFeedEmojiRequest[]>([]);
const page = ref(0);
const cursors: (string | undefined)[] = [undefined];
const hasNext = ref(false);
const loading = ref(false);
const error = ref('');

async function load(target = page.value) {
	if (loading.value) return;
	loading.value = true;
	try {
		const result = await misskeyApi('hata/feedback/emoji-requests', { mine: true, limit: 16, untilId: cursors[target] }) as unknown as HataFeedEmojiRequest[];
		requests.value = result.slice(0, 15);
		hasNext.value = result.length > 15;
		page.value = target;
		cursors[target + 1] = requests.value.at(-1)?.id;
		error.value = '';
	} catch { error.value = '申請履歴を読み込めませんでした'; } finally { loading.value = false; }
}

onMounted(() => load());
</script>
<style module>
.request { display: flex; align-items: flex-start; gap: 14px; padding-bottom: 16px; border-bottom: 1px solid var(--hy-border); text-align: center; }
.request > img { width: 44px; height: 44px; object-fit: contain; flex: none; background: var(--hy-soft); border-radius: 12px; padding: 6px; }
.request > div { flex: 1; min-width: 0; }
.request p { margin: 6px 0; font-size: 12px; color: var(--hy-muted); }
.page { align-self: center; }
</style>
