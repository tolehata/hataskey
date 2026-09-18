<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<fieldset :class="$style.root">
	<legend>{{ label }}<small>任意 · {{ files.length }} / 16枚</small></legend>
	<div v-if="files.length" :class="$style.images">
		<div v-for="file in files" :key="file.id" :class="$style.image">
			<MkDriveFileThumbnail :file="file" fit="contain" :highlightWhenSensitive="true" :class="$style.thumbnail"/>
			<button type="button" class="hy-icon-button" :class="$style.remove" :aria-label="`${file.name}の添付を外す`" @click="files = files.filter(item => item.id !== file.id)"><i class="ti ti-x" aria-hidden="true"></i></button>
		</div>
	</div>
	<div :class="$style.actions">
		<button type="button" class="hy-secondary" :disabled="files.length >= 16" @click="add(false)"><i class="ti ti-photo-plus" aria-hidden="true"></i>画像を追加</button>
		<button type="button" class="hy-secondary" :disabled="files.length >= 16" @click="add(true)"><i class="ti ti-cloud" aria-hidden="true"></i>ドライブから</button>
	</div>
	<p v-if="error" role="alert" :class="$style.error">{{ error }}</p>
</fieldset>
</template>

<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import type * as Misskey from 'cherrypick-js';
import MkDriveFileThumbnail from '@/components/MkDriveFileThumbnail.vue';
import { chooseDriveFile } from '@/utility/drive.js';
import * as os from '@/os.js';

const files = defineModel<Misskey.entities.DriveFile[]>({ required: true });
defineProps<{ label: string }>();
const error = ref('');
let active = true;
onScopeDispose(() => { active = false; });

async function add(fromDrive: boolean): Promise<void> {
	error.value = '';
	try {
		let selected: Misskey.entities.DriveFile[];
		if (fromDrive) {
			selected = await chooseDriveFile({ multiple: true });
		} else {
			const picked = await os.chooseFileFromPc({ multiple: true, accept: 'image/*' });
			if (!active || !picked.length) return;
			const images = picked.filter(file => file.type.startsWith('image/'));
			if (images.length !== picked.length) error.value = '画像ファイルを選んでください。';
			const remaining = 16 - files.value.length;
			if (images.length > remaining) error.value = '画像は16枚まで添付できます。';
			if (!images.length || remaining <= 0) return;
			selected = await os.launchUploader(images.slice(0, remaining));
		}
		if (!active) return;
		const images = selected.filter(file => file.type.startsWith('image/'));
		if (images.length !== selected.length) error.value = '画像ファイルを選んでください。';
		const combined = new Map(files.value.map(file => [file.id, file]));
		for (const file of images) combined.set(file.id, file);
		if (combined.size > 16) error.value = '画像は16枚まで添付できます。';
		files.value = [...combined.values()].slice(0, 16);
	} catch (reason) {
		if (active && reason != null) error.value = '画像を追加できませんでした。もう一度お試しください。';
	}
}
</script>

<style lang="scss" module>
.root { min-width: 0; border: 0; margin: 0; padding: 0; }
.root legend { margin-bottom: 10px; padding: 0; font-size: 14px; font-weight: 700; }
.root small { margin-left: 7px; font-size: 12px; font-weight: 400; color: var(--hy-muted); }
.images { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 12px; }
.image { position: relative; min-width: 0; }
.thumbnail { width: 100%; aspect-ratio: 1; border-radius: 16px; }
.image .remove { position: absolute; top: 2px; right: 2px; background: var(--hy-surface); color: var(--hy-ink); border: 1px solid var(--hy-border); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.error { margin: 10px 0 0; color: var(--hy-muted); font-size: 13px; line-height: 1.6; }
</style>
