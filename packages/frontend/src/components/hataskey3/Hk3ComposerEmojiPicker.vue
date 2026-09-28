<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
UI S composer appearance for the shared emoji picker.
-->
<template>
	<MkEmojiPicker ref="picker" data-hk3-composer-menus :class="$style.picker" :showPinned="true" :pinnedEmojis="pinnedEmojis" :asReactionPicker="false" :asDrawer="true" :maxHeight="maxHeight" @chosen="emoji => emit('done', emoji)" @esc="emit('closed')"/>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef } from 'vue';
import MkEmojiPicker from '@/components/MkEmojiPicker.vue';
import { prefer } from '@/preferences.js';

defineProps<{ maxHeight: number }>();
const emit = defineEmits<{ (ev: 'done', emoji: string): void; (ev: 'closed'): void }>();
const picker = useTemplateRef('picker');
const pinnedEmojis = computed(() => prefer.r.emojiPaletteForMain.value == null
	? prefer.r.emojiPalettes.value[0]?.emojis ?? []
	: prefer.r.emojiPalettes.value.find(palette => palette.id === prefer.r.emojiPaletteForMain.value)?.emojis ?? []);

defineExpose({
	focus: () => picker.value?.focus(),
	reset: () => picker.value?.reset(),
});
</script>

<style lang="scss" module>
.picker {
	box-sizing: border-box;
	max-width: 100%;
	min-width: 0;
	color: var(--hk3-text, var(--MI_THEME-fg));
	--MI_THEME-accent: var(--hk3-accent);
	--MI_THEME-fg: var(--hk3-text);
	--MI_THEME-divider: var(--hk3-divider);

	:global(input), :global(button:not(.ti)) { font-family: inherit; }
	:global(input:focus-visible), :global(button:focus-visible) { outline: 2px solid var(--hk3-accent); outline-offset: -2px; }
	:global(.emojis) { container-type: inline-size; }
	@container (min-width: 520px) {
		:global(.emojis section > .body) {
			grid-template-columns: repeat(auto-fill, minmax(var(--eachSize), 1fr)) !important;
		}
	}
	// The shared picker places an empty search below the catalog by default.
	:global(.search) {
		order: -1 !important;
		margin-bottom: 0 !important;
		box-shadow: 0 1px 0 var(--hk3-divider) !important;
	}
	:global(.emojis header) {
		background: var(--hk3-bg, var(--MI_THEME-panel));
		color: var(--hk3-text, var(--MI_THEME-fg));
		@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
			background: var(--hk3-glass-control, color-mix(in srgb, var(--hk3-bg, var(--MI_THEME-panel)) 28%, transparent));
			-webkit-backdrop-filter: blur(20px) saturate(1.15);
			backdrop-filter: blur(20px) saturate(1.15);
		}
	}
}
</style>
