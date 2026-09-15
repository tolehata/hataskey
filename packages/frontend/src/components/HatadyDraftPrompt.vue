<!-- SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<HyDialog :title="title" :busy="busy" @close="emit('return')">
	<p :class="$style.description">{{ description }}</p>
	<p v-if="error" class="hy-error" role="alert">{{ error }}</p>
	<slot/>
	<template #actions>
		<div :class="$style.actions">
			<button type="button" class="hy-primary" :disabled="busy" @click="emit('save')">
				端末に下書きを保存して閉じる
			</button>
			<button type="button" class="hy-secondary" :disabled="busy" @click="emit('discard')">
				下書きを破棄して閉じる
			</button>
			<button type="button" class="hy-secondary" :disabled="busy" @click="emit('return')">編集に戻る</button>
		</div>
	</template>
</HyDialog>
</template>
<script setup lang="ts">
import HyDialog from '@/components/HyDialog.vue';
withDefaults(defineProps<{ title?: string; description?: string; busy?: boolean; error?: string }>(), {
	title: '途中の編集をどうする？',
	description: '次に続けられるよう、端末に下書きを残せます。',
	busy: false,
	error: '',
});
const emit = defineEmits<{ (e: 'save'): void; (e: 'discard'): void; (e: 'return'): void }>();
</script>
<style module>
.description {
	text-align: center;
	line-height: 1.8;
	margin: 6px 0;
}
.actions {
	display: grid;
	gap: 10px;
	width: 100%;
}
</style>
