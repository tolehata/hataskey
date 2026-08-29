<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<MkModal
	ref="modal"
	v-slot="{ maxHeight }"
	:anchorElement="anchorElement"
	:preferType="'popup'"
	:zPriority="'high'"
	:transparentBg="true"
	:returnFocusTo="anchorElement"
	motionPreset="postform"
	@click="closeMenu"
	@opened="focusFirstTool"
	@closed="emit('closed')"
	@esc="closeMenu"
>
	<section
		id="hatacording-composer-tools-menu"
		ref="menu"
		:class="$style.root"
		:data-animation="animationEnabled ? 'true' : 'false'"
		:data-color-mode="colorMode"
		:data-compact="compact ? 'true' : 'false'"
		:style="{ '--available-height': maxHeight == null ? '60dvh' : `${maxHeight}px` }"
		role="menu"
		:aria-label="label"
	>
		<div :class="$style.scroll">
			<button
				v-for="tool in tools"
				:key="tool.id"
				type="button"
				role="menuitem"
				:class="$style.tool"
				:data-active="activeToolIds.includes(tool.id) ? 'true' : 'false'"
				:data-expanded="selectedToolId === tool.id ? 'true' : 'false'"
				:title="tool.label"
				:aria-label="tool.label"
				@click="emit('select', tool.id, $event)"
			>
				<component :is="tool.icon" :size="18"/>
				<span :class="$style.label">{{ tool.label }}</span>
			</button>
			<button v-if="plugin" type="button" role="menuitem" :class="$style.tool" :title="plugin.label" :aria-label="plugin.label" @click="emit('plugins', $event)">
				<component :is="plugin.icon" :size="18"/>
				<span :class="$style.label">{{ plugin.label }}</span>
			</button>
		</div>
	</section>
</MkModal>
</template>

<script lang="ts" setup>
import { nextTick, useTemplateRef, watch } from 'vue';
import type { Component } from 'vue';
import type { HatacordingUiComposerShortcut } from '@/utility/hatacording-ui.js';
import MkModal from '@/components/MkModal.vue';

type HatacordingComposerToolDefinition = {
	id: HatacordingUiComposerShortcut;
	label: string;
	icon: Component;
};

type HatacordingComposerPluginDefinition = {
	label: string;
	icon: Component;
};

const props = defineProps<{
	anchorElement: HTMLElement;
	tools: readonly HatacordingComposerToolDefinition[];
	plugin: HatacordingComposerPluginDefinition | null;
	activeToolIds: HatacordingUiComposerShortcut[];
	selectedToolId: HatacordingUiComposerShortcut | null;
	showing: boolean;
	compact: boolean;
	animationEnabled: boolean;
	colorMode: 'theme' | 'light' | 'dark';
	label: string;
}>();

const emit = defineEmits<{
	(ev: 'select', id: HatacordingUiComposerShortcut, event: MouseEvent): void;
	(ev: 'plugins', event: MouseEvent): void;
	(ev: 'closed'): void;
}>();

const modal = useTemplateRef('modal');
const menu = useTemplateRef('menu');

watch(() => props.showing, showing => {
	if (!showing) closeMenu();
});

function closeMenu(): void {
	modal.value?.close();
}

function focusFirstTool(): void {
	nextTick(() => menu.value?.querySelector<HTMLElement>('button[data-expanded="true"], button')?.focus({ preventScroll: true }));
}
</script>

<style lang="scss" module>
.root {
	--visible-items: 5;
	--tool-row-height: 48px;
	--tool-gap: 6px;

	width: min(220px, calc(100dvw - 24px));
	max-height: min(var(--available-height), calc(100dvh - 24px));
	padding: 8px;
	box-sizing: border-box;
	overflow: hidden;
	border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 22%, var(--MI_THEME-divider));
	border-radius: 16px;
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	box-shadow: 0 18px 44px var(--MI_THEME-shadow);
}

.root[data-compact='true'] {
	--visible-items: 4;
}

.root[data-color-mode='light'] {
	--MI_THEME-bg: #f3f5f8;
	--MI_THEME-panel: #fff;
	--MI_THEME-fg: #1c2430;
	--MI_THEME-divider: #d6dce5;
	--MI_THEME-hover: rgb(16 24 40 / 7%);
	--MI_THEME-shadow: rgb(16 24 40 / 16%);

	color-scheme: light;
}

.root[data-color-mode='dark'] {
	--MI_THEME-bg: #0f1218;
	--MI_THEME-panel: #181c25;
	--MI_THEME-fg: #edf1f7;
	--MI_THEME-divider: #343b49;
	--MI_THEME-hover: rgb(255 255 255 / 8%);
	--MI_THEME-shadow: rgb(0 0 0 / 42%);

	color-scheme: dark;
}

.scroll {
	display: flex;
	height: calc(var(--visible-items) * var(--tool-row-height) + (var(--visible-items) - 1) * var(--tool-gap));
	max-height: calc(var(--available-height) - 18px);
	flex-direction: column;
	gap: var(--tool-gap);
	overflow-x: hidden;
	overflow-y: auto;
	overscroll-behavior: contain;
	scroll-snap-type: y mandatory;
	scrollbar-width: none;
	touch-action: pan-y;
}

.scroll::-webkit-scrollbar {
	display: none;
}

.tool {
	display: flex;
	width: 100%;
	height: var(--tool-row-height);
	min-width: 0;
	min-height: 44px;
	box-sizing: border-box;
	flex: 0 0 var(--tool-row-height);
	align-items: center;
	justify-content: flex-start;
	gap: 8px;
	padding: 0 12px;
	overflow: hidden;
	border: 0;
	border-radius: 10px;
	background: color-mix(in srgb, var(--MI_THEME-fg) 3%, transparent);
	color: inherit;
	font: inherit;
	font-weight: 650;
	text-align: left;
	white-space: nowrap;
	cursor: pointer;
	scroll-snap-align: start;
	scroll-snap-stop: normal;
	transition: background-color .18s ease, color .18s ease, box-shadow .18s ease;
}

.tool > :is(svg, [data-hatacording-animated-icon]) {
	flex: 0 0 auto;
}

.tool > .label {
	min-width: 0;
	flex: 1;
	overflow: hidden;
	opacity: 1;
	text-overflow: ellipsis;
	transform: none;
	transition: none;
}

.tool:is(:hover, :focus-visible),
.tool[data-active='true'],
.tool[data-expanded='true'] {
	background: color-mix(in srgb, var(--MI_THEME-accent) 13%, var(--MI_THEME-bg));
	color: var(--MI_THEME-accent);
	box-shadow: inset 3px 0 0 var(--MI_THEME-accent);
}

.root[data-animation='false'] .tool {
	transition: none;
}

@media (prefers-reduced-motion: reduce) {
	.tool {
		transition: none;
	}
}
</style>
