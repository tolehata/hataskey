<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed 通知本文を安全なプレーンテキストとカスタム絵文字へ分割して表示する。
通知には note.emojis のような URL 対応表が無いため、承認直後などローカル絵文字キャッシュが
更新される前でも /emoji/:name.webp を直接使い、ショートコードへ退行しないようにする。
-->
<template>
<span :class="$style.root">
	<template v-for="(segment, index) in segments" :key="index">
		<MkCustomEmoji
			v-if="segment.type === 'emoji'"
			:name="segment.name"
			:host="segment.host"
			:url="segment.url"
			:normal="true"
			:fallbackToImage="false"
		/>
		<template v-else>{{ segment.text }}</template>
	</template>
</span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import MkCustomEmoji from '@/components/global/MkCustomEmoji.vue';
import { splitHataFeedNotificationBody } from '@/utility/hatafeed-notification-emoji.js';

const props = defineProps<{ text: string }>();

const segments = computed(() => splitHataFeedNotificationBody(props.text));
</script>

<style lang="scss" module>
.root {
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
