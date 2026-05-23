<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<!--
	MkTrendingTimeline.vue (旗鯖fork 独自実装)

	トレンドタイムライン (TTL) 専用のフロントコンポーネント。

	===== 仕様 =====

	- 過去 7 日間のリアクション/リノートが多いノートを Top 100 から
	  seed で固定シャッフルした順序で表示
	- offsetMode の Paginator で 20 件ずつページング
	- 引っ張って更新で新しい seed を生成して reload (再集計+シャッフル)
	- 30 秒ごとに /api/notes/trending/check-new をポーリングし、
	  新規ランクインがあれば「N 件の新しいトレンドノートがあります」バー表示

	===== 設計 =====

	- 既存の Paginator + MkNotesTimeline を流用 (explore.featured.vue と同じパターン)
	- seed はクライアント側で生成・保持し、params で送信
	- Streaming は使わない (TTL はスナップショット形式のため)
-->

<template>
<div :class="$style.root">
	<!-- 新規ランクイン通知バー -->
	<div v-if="newCount > 0" :class="$style.newBanner" @click="reloadWithNewSeed">
		<i class="ti ti-flame"></i>
		<span>{{ i18n.tsx._trending.newNotesAvailable({ n: newCount }) }}</span>
	</div>

	<MkNotesTimeline :paginator="paginator" :withControl="false" :onRefresh="reloadWithNewSeed"/>
</div>
</template>

<script lang="ts" setup>
import { markRaw, ref, onMounted, onUnmounted } from 'vue';
import MkNotesTimeline from '@/components/MkNotesTimeline.vue';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { Paginator } from '@/utility/paginator.js';

const POLL_INTERVAL_MS = 30 * 1000; // 30 秒ごとに新規ランクインをチェック

// seed はクライアント側で生成・保持 (同じ seed で同じシャッフル順を再現)
function generateSeed(): number {
	return Math.floor(Math.random() * 0x7FFFFFFF) + 1;
}
const currentSeed = ref<number>(generateSeed());
const newCount = ref<number>(0);
const knownNoteIds = ref<Set<string>>(new Set());
let pollTimer: ReturnType<typeof setInterval> | null = null;

// offsetMode の Paginator (explore.featured.vue と同じパターン)
// 注: notes/trending は旗鯖fork 独自エンドポイントのため、cherrypick-js の autogen 型定義に
//     まだ含まれていない。pnpm build で型再生成するまでは型制約を満たさないため、
//     ここでは endpoint 名を型キャストして Paginator に渡す (vite build は型チェックしないので実行時は問題なし)。
const paginator = markRaw(new Paginator('notes/trending' as 'notes/featured', {
	limit: 20,
	offsetMode: true,
	params: () => ({
		seed: currentSeed.value,
	}) as never,
}));

/**
 * 引っ張って更新 / 新規ランクインバー押下時:
 * 新しい seed を生成して再集計+シャッフルし直す
 *
 * 外部影響: なし (Redis 再集計のみ、ActivityPub fetch は発生しない)
 */
async function reloadWithNewSeed() {
	currentSeed.value = generateSeed();
	newCount.value = 0;
	await paginator.reload();
	await refreshKnownIds();
}

/**
 * 現在の Top 100 のノート ID を取得して保持する (新規ランクイン検出の基準用)
 */
async function refreshKnownIds() {
	try {
		const res = await (misskeyApi as any)('notes/trending/check-new', {}) as { topNoteIds: string[]; newCount: number };
		knownNoteIds.value = new Set(res.topNoteIds);
	} catch {
		// 失敗しても致命的ではない
	}
}

/**
 * 30 秒ごとのポーリング: 新規ランクイン件数を取得
 * 軽量 API (Redis 読み取りのみ、DB 触らない)
 */
async function pollNewNotes() {
	try {
		const res = await (misskeyApi as any)('notes/trending/check-new', {
			knownIds: Array.from(knownNoteIds.value),
		}) as { topNoteIds: string[]; newCount: number };
		newCount.value = res.newCount;
	} catch {
		// ポーリングエラーは無視 (次回リトライ)
	}
}

onMounted(async () => {
	await refreshKnownIds();
	pollTimer = setInterval(pollNewNotes, POLL_INTERVAL_MS);
});

onUnmounted(() => {
	if (pollTimer != null) clearInterval(pollTimer);
});

defineExpose({
	reload: reloadWithNewSeed,
});
</script>

<style lang="scss" module>
.root {
	position: relative;
}

.newBanner {
	position: sticky;
	top: 0;
	z-index: 10;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 10px 16px;
	margin-bottom: var(--MI-margin);
	background: var(--MI_THEME-accent);
	color: #fff;
	font-size: 0.9em;
	font-weight: 600;
	border-radius: var(--MI-radius);
	cursor: pointer;
	transition: opacity 0.2s;

	&:hover {
		opacity: 0.85;
	}

	> i {
		font-size: 1.1em;
	}
}
</style>
