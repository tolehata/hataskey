<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.widgetsRoot">
	<!-- 旗鯖fork(新デッキ): 編集モード時だけ、編集中であることを示す細いバーを上部に出す。
	     編集の開始/終了は カラム右上の三点メニュー or タブ右クリック から行うため、
	     常時表示の「ウィジェットを編集」ボタンは廃止し表示領域を最大化する
	     (旧デッキ UI のようにカラム上部メニューに編集導線を寄せる)。
	     deckEmbedded=false (通常 UI のウィジェット領域等) では従来通りボタンを出す。 -->
	<template v-if="deckEmbedded">
		<div v-if="editMode" :class="$style.editingBar">
			<span><i class="ti ti-pencil"></i> {{ i18n.ts._hata._timelineCustom.widgetEditMode }}</span>
			<button class="_textButton" :class="$style.editingDone" @click="editMode = false"><i class="ti ti-check"></i> {{ i18n.ts.editWidgetsExit }}</button>
		</div>
	</template>
	<template v-else>
		<button v-if="editMode" class="_textButton" :class="$style.edit" style="font-size: 0.9em;" @click="editMode = false"><i class="ti ti-check"></i> {{ i18n.ts.editWidgetsExit }}</button>
		<button v-else class="_textButton" data-cy-widget-edit :class="$style.edit" style="font-size: 0.9em;" @click="editMode = true"><i class="ti ti-pencil"></i> {{ i18n.ts.editWidgets }}</button>
	</template>

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
	// 旗鯖fork(新デッキ): デッキカラムに埋め込まれているか。true の場合、編集導線は
	// カラム右上の三点メニュー / タブ右クリックに集約し、常時表示ボタンを出さない。
	deckEmbedded?: boolean;
}>(), {
	place: null,
	deckEmbedded: false,
});

// 旗鯖fork(新デッキ): 親 (hatasaba-deck) の三点メニュー / タブ右クリックから編集モードを
// 制御するため、editMode の参照とトグル関数を expose する。
defineExpose({
	getWidgetEditMode: () => editMode.value,
	setWidgetEditMode: (v: boolean) => { editMode.value = v; },
	toggleWidgetEditMode: () => { editMode.value = !editMode.value; },
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

/* 旗鯖fork(新デッキ): 編集モード中であることを示す細いバー */
.editingBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 6px 12px;
	margin-bottom: 10px;
	border-radius: 8px;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
	font-size: 0.85em;
	font-weight: 600;
}
.editingDone {
	font-size: 0.95em;
	white-space: nowrap;
}

/* 旗鯖fork: ウィジェット欄内の MkContainer ヘッダの sticky 追従を無効化。
   sticky のままだと一番上のウィジェットのタイトルバーだけがスクロールに張り付いて
   動いて見える問題が起きる。MkContainer のヘッダクラスは CSS Modules でハッシュ化され
   外部から狙えないため、素のグローバルクラス ._panel 直下の <header> 要素を対象にする。 */
.widgetsRoot :global(._panel) > header {
	position: static !important;
}
</style>
