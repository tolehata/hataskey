<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.widgetsRoot">
	<!-- 旗鯖fork: 編集ボタンを上部に配置。下部だとウィジェットが多い時に
	     スクロールしきらないと見えず見切れるため、先頭に出して常に見えるようにする。 -->
	<button v-if="editMode" class="_textButton" :class="$style.edit" style="font-size: 0.9em;" @click="editMode = false"><i class="ti ti-check"></i> {{ i18n.ts.editWidgetsExit }}</button>
	<button v-else class="_textButton" data-cy-widget-edit :class="$style.edit" style="font-size: 0.9em;" @click="editMode = true"><i class="ti ti-pencil"></i> {{ i18n.ts.editWidgets }}</button>

	<XWidgets :edit="editMode" :widgets="widgets" @addWidget="addWidget" @removeWidget="removeWidget" @updateWidget="updateWidget" @updateWidgets="updateWidgets" @exit="editMode = false"/>
</div>
</template>

<script lang="ts">
import { computed, ref } from 'vue';
const editMode = ref(false);
</script>
<script lang="ts" setup>
import XWidgets from '@/components/MkWidgets.vue';
import { i18n } from '@/i18n.js';
import { prefer } from '@/preferences.js';

const props = withDefaults(defineProps<{
	// null = 全てのウィジェットを表示
	// left = place: leftだけを表示
	// right = rightとnullを表示
	place?: 'left' | null | 'right';
}>(), {
	place: null,
});

const widgets = computed(() => {
	if (props.place === null) return prefer.r.widgets.value;
	if (props.place === 'left') return prefer.r.widgets.value.filter(w => w.place === 'left');
	return prefer.r.widgets.value.filter(w => w.place !== 'left');
});

function addWidget(widget) {
	prefer.commit('widgets', [{
		...widget,
		place: props.place,
	}, ...prefer.s.widgets]);
}

function removeWidget(widget) {
	prefer.commit('widgets', prefer.s.widgets.filter(w => w.id !== widget.id));
}

function updateWidget({ id, data }) {
	prefer.commit('widgets', prefer.s.widgets.map(w => w.id === id ? {
		...w,
		data,
		place: props.place,
	} : w));
}

function updateWidgets(thisWidgets) {
	if (props.place === null) {
		prefer.commit('widgets', thisWidgets);
		return;
	}
	if (props.place === 'left') {
		prefer.commit('widgets', [
			...thisWidgets.map(w => ({ ...w, place: 'left' })),
			...prefer.s.widgets.filter(w => w.place !== 'left' && !thisWidgets.some(t => w.id === t.id)),
		]);
		return;
	}
	prefer.commit('widgets', [
		...prefer.s.widgets.filter(w => w.place === 'left' && !thisWidgets.some(t => w.id === t.id)),
		...thisWidgets.map(w => ({ ...w, place: 'right' })),
	]);
}
</script>

<style lang="scss" module>
.edit {
	width: 100%;
	margin-bottom: 12px;
}

/* 旗鯖fork: ウィジェット欄内の MkContainer ヘッダの sticky 追従を無効化。
   sticky のままだと一番上のウィジェットのタイトルバーだけがスクロールに張り付いて
   動いて見える問題が起きる。MkContainer のヘッダクラスは CSS Modules でハッシュ化され
   外部から狙えないため、素のグローバルクラス ._panel 直下の <header> 要素を対象にする。 */
.widgetsRoot :global(._panel) > header {
	position: static !important;
}
</style>
