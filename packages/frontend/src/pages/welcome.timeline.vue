<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root" class="_gaps">
	<div
		ref="notesMainContainerEl"
		class="_gaps"
		:class="[$style.scrollBoxMain, { [$style.scrollIntro]: (scrollState === 'intro'), [$style.scrollLoop]: (scrollState === 'loop') }]"
		@animationend="changeScrollState"
	>
		<XNote v-for="note in notes" :key="`${note.id}_1`" :class="$style.note" :note="note"/>
	</div>
	<div v-if="isScrolling" class="_gaps" :class="[$style.scrollBoxSub, { [$style.scrollIntro]: (scrollState === 'intro'), [$style.scrollLoop]: (scrollState === 'loop') }]">
		<XNote v-for="note in notes" :key="`${note.id}_2`" :class="$style.note" :note="note"/>
	</div>
</div>
</template>

<script lang="ts" setup>
import * as Misskey from 'cherrypick-js';
import { onUpdated, ref, useTemplateRef } from 'vue';
import { getScrollContainer } from '@@/js/scroll.js';
import XNote from '@/pages/welcome.timeline.note.vue';
import { misskeyApiGet } from '@/utility/misskey-api.js';

const notes = ref<Misskey.entities.Note[]>([]);
const isScrolling = ref(false);
const scrollState = ref<null | 'intro' | 'loop'>(null);
const notesMainContainerEl = useTemplateRef('notesMainContainerEl');

// 旗鯖fork: notes/featured の取得失敗をハンドリングする。
// 元実装は catch が無く、未認証のウェルカム画面初回表示時に notes/featured が
// (サーバー側のキャッシュ未ウォーム等で) 失敗すると、未処理のPromise rejectが
// エラー境界へ伝播してウェルカム画面の上半分が赤いエラー画面に落ちていた。
// (一度成功するとサーバー側がキャッシュを持つため、以降は再発しない症状だった)
// 失敗してもTLプレビューを空のままにするだけにし、赤エラーへ落とさない。
misskeyApiGet('notes/featured').then(_notes => {
	notes.value = _notes;
}).catch(() => {
	// 取得失敗時はプレビューを空のままにする(ウェルカム画面自体は正常表示)
	notes.value = [];
});

function changeScrollState() {
	if (scrollState.value !== 'loop') {
		scrollState.value = 'loop';
	}
}

onUpdated(() => {
	if (!notesMainContainerEl.value) return;
	const container = getScrollContainer(notesMainContainerEl.value);
	const containerHeight = container ? container.clientHeight : window.innerHeight;
	if (notesMainContainerEl.value.offsetHeight > containerHeight) {
		if (scrollState.value === null) {
			scrollState.value = 'intro';
		}
		isScrolling.value = true;
	}
});
</script>

<style lang="scss" module>
@keyframes scrollIntro {
	0% {
		transform: translate3d(0, 0, 0);
	}
	100% {
		transform: translate3d(0, calc(calc(-100% - 128px) - var(--MI-margin)), 0);
	}
}

@keyframes scrollConstant {
	0% {
		transform: translate3d(0, -128px, 0);
	}
	100% {
		transform: translate3d(0, calc(calc(-100% - 128px) - var(--MI-margin)), 0);
	}
}

.root {
	text-align: right;
}

.scrollBoxMain {
	&.scrollIntro {
		animation: scrollIntro 30s linear forwards;
	}
	&.scrollLoop {
		animation: scrollConstant 30s linear infinite;
	}
}

.scrollBoxSub {
	&.scrollIntro {
		animation: scrollIntro 30s linear forwards;
	}
	&.scrollLoop {
		animation: scrollConstant 30s linear infinite;
	}
}

.root:has(.note:hover) .scrollBoxMain,
.root:has(.note:hover) .scrollBoxSub {
	animation-play-state: paused;
}
</style>
