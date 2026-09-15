<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<HyTutorial
	:kind="kind" :pages="getHatadyTutorialPages(kind)"
	:title="kind === 'update' ? 'Welcome to Hatady V2' : 'Hatadyの使い方'"
	finishLabel="Hatadyをはじめる" :completeOnDismiss="kind === 'initial'"
	:anchorElement="anchorElement" :cancelSignal="cancelSignal"
	@done="emit('done')" @closing="onClosing" @closed="emit('closed')"
>
	<template #headerAction>
		<button type="button" class="hy-icon-button" aria-label="配色を選ぶ" :disabled="savingTheme" @click="chooseTheme"><i class="ti ti-palette" aria-hidden="true"></i></button>
	</template>
	<template #example="{ page }"><HatadyTutorialExample :kind="kind" :page="page.id"/></template>
</HyTutorial>
</template>
<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import type { HatadyTutorialKind } from '@/utility/hatady-tutorial-content.js';
import type { HatadyTheme } from '@/utility/hatady-prefs.js';
import HyTutorial from '@/components/HyTutorial.vue';
import HatadyTutorialExample from '@/components/HatadyTutorialExample.vue';
import { getHatadyTutorialPages } from '@/utility/hatady-tutorial-content.js';
import { hatadyTheme, saveHatadyDisplay } from '@/utility/hatady-prefs.js';
import { hatadyNotify } from '@/utility/hatady-ui.js';
import * as os from '@/os.js';

withDefaults(defineProps<{ kind?: HatadyTutorialKind; anchorElement?: HTMLElement | null; cancelSignal?: AbortSignal }>(), { kind: 'initial', anchorElement: null });
const emit = defineEmits<{ done: []; closed: [] }>();
const savingTheme = ref(false);
let closing = false;

function onClosing() { closing = true; }

onUnmounted(onClosing);

async function chooseTheme(event: MouseEvent): Promise<void> {
	const options: { value: HatadyTheme; label: string }[] = [
		{ value: 'light', label: 'ライト' },
		{ value: 'dark', label: 'ダーク' },
		{ value: 'paper', label: 'ペーパー' },
		{ value: 'espresso', label: 'エスプレッソ' },
		{ value: 'hataskey', label: 'Hataskeyに合わせる' },
	];
	await os.popupMenu(
		options.map((option) => ({
			text: option.label,
			icon: hatadyTheme.value === option.value ? 'ti ti-check' : undefined,
			action: async () => {
				if (closing || savingTheme.value) return;
				savingTheme.value = true;
				try {
					await saveHatadyDisplay(option.value);
				} catch {
					hatadyNotify('配色を保存できませんでした');
				} finally {
					savingTheme.value = false;
				}
			},
		})),
		event.currentTarget as HTMLElement,
	);
}

</script>
