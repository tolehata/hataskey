<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(HataFeed デザイン改修 §3): 週次の絵文字申請枠メーター。
  ti-ticket + 「あと remaining/limit 件」+ 6px 高バー(width = 残数割合 remaining/limit)。
  既存 API(hata/feedback/emoji-quota)の { remaining, limit } 形をそのまま受ける。
  ウィザード・一覧サイドバー・承認画面で共用。
-->
<template>
<div :class="[$style.root, { [$style.low]: ratio <= 0.2 }]">
	<div :class="$style.head">
		<span :class="$style.text"><i class="ti ti-ticket"></i> {{ prefix }} {{ remaining }}/{{ limit }} 件</span>
	</div>
	<div :class="$style.track">
		<div :class="$style.fill" :style="{ width: `${Math.round(ratio * 100)}%` }"></div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(defineProps<{
	remaining: number;
	limit: number;
	prefix?: string;
}>(), {
	prefix: '今週あと',
});

const ratio = computed(() => {
	if (props.limit <= 0) return 0;
	return Math.max(0, Math.min(1, props.remaining / props.limit));
});
</script>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.head {
	display: flex;
	align-items: center;
}
.text {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: .78em;
	font-weight: 700;
	color: var(--MI_THEME-accent);

	i { font-size: 1.05em; }
}
.track {
	height: 6px;
	border-radius: 999px;
	background: var(--MI_THEME-divider);
	overflow: hidden;
}
.fill {
	height: 100%;
	border-radius: 999px;
	background: var(--MI_THEME-accent);
	transition: width .2s ease;
}
/* 残りわずか(<=20%)は警告色に切り替えて気付きやすくする */
.low {
	.text { color: var(--MI_THEME-warn); }
	.fill { background: var(--MI_THEME-warn); }
}
</style>
