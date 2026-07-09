<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady): 本の自動表紙。タイトルから決定的にグラデーションを生成する(外部API・画像アップロード不要)。
  小さいチップ(書影)ではグラデーションのみ、大きい表示では showTitle でタイトル/著者を重ねる。
-->
<template>
<span
	:class="[$style.root, { [$style.withText]: showTitle }]"
	:style="{ width: `${width}px`, height: `${height}px`, background: gradient }"
	:title="title"
>
	<template v-if="showTitle">
		<span :class="$style.spine"></span>
		<span :class="$style.title">{{ title }}</span>
		<span v-if="author" :class="$style.author">{{ author }}</span>
	</template>
</span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { hyCoverGradient } from '@/utility/hatady.js';

const props = withDefaults(defineProps<{
	title: string;
	author?: string | null;
	width?: number;
	showTitle?: boolean;
	colorIndex?: number | null;
}>(), {
	author: null,
	width: 34,
	showTitle: false,
	colorIndex: null,
});

// 本らしい縦横比(約 1 : 1.4)。
const height = computed(() => Math.round(props.width * 1.36));
const gradient = computed(() => hyCoverGradient(props.title, props.colorIndex));
</script>

<style lang="scss" module>
.root {
	position: relative;
	display: inline-flex;
	flex-shrink: 0;
	border-radius: 3px;
	box-shadow: 1px 1px 2px rgba(0, 0, 0, .2);
	overflow: hidden;
}
/* 大きい表示: 背表紙の線 + タイトル/著者を重ねる */
.withText {
	flex-direction: column;
	justify-content: flex-end;
	padding: 8px 8px 10px;
	box-sizing: border-box;
	border-radius: 4px;
}
.spine { position: absolute; left: 5px; top: 0; bottom: 0; width: 2px; background: rgba(255, 255, 255, .18); }
.title {
	font-family: 'Noto Serif JP', 'Hiragino Mincho ProN', serif;
	font-weight: 600; font-size: 11px; line-height: 1.35; color: #fff;
	text-shadow: 0 1px 2px rgba(0, 0, 0, .35);
	display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
}
.author { font-size: 8.5px; color: rgba(255, 255, 255, .8); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
