<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed の絵文字カテゴリ選択。既存カテゴリから選べるほか、新規カテゴリも作成できる。
  申請ウィザード・承認画面の両方で共用する。v-model は最終的なカテゴリ文字列(未分類は null)。
-->
<template>
<div :class="$style.root">
	<MkSelect v-model="sel" :items="items">
		<template #label>カテゴリ</template>
	</MkSelect>
	<MkInput v-if="sel === '__new__'" v-model="newCat" :class="$style.newInput" placeholder="新しいカテゴリ名">
		<template #label>新しいカテゴリ名</template>
	</MkInput>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import MkSelect from '@/components/MkSelect.vue';
import MkInput from '@/components/MkInput.vue';

const props = defineProps<{ modelValue: string | null; categories: string[] }>();
const emit = defineEmits<{ (ev: 'update:modelValue', v: string | null): void }>();

const initial = props.modelValue ?? '';

// 既存カテゴリ一覧(現在値が含まれていなければ補う)。
const allCategories = computed(() => {
	const set = new Set(props.categories);
	if (initial !== '') set.add(initial);
	return [...set];
});

// MkSelect は items prop 方式(slotted option は不可)。
const items = computed(() => [
	{ value: '', label: '未分類' },
	...allCategories.value.map(c => ({ value: c, label: c })),
	{ value: '__new__', label: '＋ 新しいカテゴリを作成' },
]);

const sel = ref<string>(initial);
const newCat = ref<string>('');

watch([sel, newCat], () => {
	const v = sel.value === '__new__' ? (newCat.value.trim() || null) : (sel.value || null);
	emit('update:modelValue', v);
});
</script>

<style lang="scss" module>
.root { display: flex; flex-direction: column; gap: 10px; }
.newInput { margin-top: 2px; }
</style>
