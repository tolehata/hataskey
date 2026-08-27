<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<section v-if="isLegacyMode" ref="legacyRegion" :class="$style.settingsRegion" role="region" :aria-label="copy.gateway.legacyRegion" tabindex="-1">
	<LegacySettings/>
</section>
<section v-else ref="redesignedRegion" :class="$style.settingsRegion" role="region" :aria-label="copy.gateway.redesignedRegion" tabindex="-1">
	<SettingsRedesign @openLegacy="openLegacy"/>
</section>

<Teleport v-if="isLegacyMode" to="body">
	<!-- 旗鯖fork: 旧設定にいる間は上部に固定で出す。
	     ⚠️元は右下に浮くボタンだけで、戻れること自体に気づけなかった。 -->
	<div :class="$style.legacyReturn" role="region" :aria-label="copy.gateway.legacyRegion">
		<p :class="$style.legacyNotice"><i class="ti ti-alert-triangle" aria-hidden="true"></i>{{ copy.gateway.legacyNotice }}</p>
		<button type="button" :class="$style.legacyReturnButton" :aria-label="copy.gateway.returnToRedesigned" @click="openRedesignedSettings">
			{{ copy.gateway.returnToRedesignedButton }}
		</button>
	</div>
</Teleport>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, nextTick, onDeactivated, ref, useTemplateRef } from 'vue';
import { i18n } from '@/i18n.js';

const LegacySettings = defineAsyncComponent(() => import('@/pages/settings/index.vue'));
const SettingsRedesign = defineAsyncComponent(() => import('./index.vue'));

// この状態は設定の親ルートが有効な間だけ保持する。設定内の子ルート遷移では維持し、
// KeepAlive により親がキャッシュされる場合も、設定から離れた時点で保存せず初期化する。
const isLegacyMode = ref(false);
const copy = i18n.ts._hata._settingsRedesign;
const legacyRegion = useTemplateRef<HTMLElement>('legacyRegion');
const redesignedRegion = useTemplateRef<HTMLElement>('redesignedRegion');

function focusSettingsContext(mode: 'legacy' | 'redesigned') {
	void nextTick(() => window.requestAnimationFrame(() => {
		const region = mode === 'legacy' ? legacyRegion.value : redesignedRegion.value;
		region?.focus({ preventScroll: true });
	}));
}

function openLegacy() {
	isLegacyMode.value = true;
	focusSettingsContext('legacy');
}

function openRedesignedSettings() {
	isLegacyMode.value = false;
	focusSettingsContext('redesigned');
}

onDeactivated(() => {
	isLegacyMode.value = false;
});
</script>

<style lang="scss" module>
.legacyReturn {
	position: fixed;
	inset-block-start: 0;
	inset-inline: 0;
	z-index: 3000;
	display: flex;
	box-sizing: border-box;
	align-items: center;
	justify-content: center;
	gap: 12px;
	flex-wrap: wrap;
	padding: 10px max(12px, env(safe-area-inset-right)) 10px max(12px, env(safe-area-inset-left));
	border-block-end: 1px solid color-mix(in srgb, var(--MI_THEME-warn) 40%, var(--MI_THEME-divider));
	background: color-mix(in srgb, var(--MI_THEME-warn) 12%, var(--MI_THEME-panel));
	backdrop-filter: blur(12px);
}

.legacyNotice {
	display: flex;
	align-items: center;
	gap: 7px;
	margin: 0;
	color: var(--MI_THEME-fg);
	font-size: .82rem;
	font-weight: 600;
	line-height: 1.5;
	text-wrap: pretty;
}

.legacyNotice > i { flex: none; color: var(--MI_THEME-warn); }

.settingsRegion {
	outline: 0;
}

.legacyReturnButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-block-size: 44px;
	padding: 8px 14px;
	border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 42%, var(--MI_THEME-divider));
	border-radius: 999px;
	background: var(--MI_THEME-panel);
	box-shadow: 0 4px 14px color-mix(in srgb, var(--MI_THEME-shadow) 16%, transparent);
	color: var(--MI_THEME-accent);
	font: inherit;
	font-size: 0.9rem;
	font-weight: 700;
	line-break: strict;
	text-wrap: pretty;
	word-break: normal;
	cursor: pointer;
}

.legacyReturnButton:hover {
	background: color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--MI_THEME-panel));
}

.legacyReturnButton:focus-visible {
	outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 58%, transparent);
	outline-offset: 3px;
}

.legacyReturnButton:active {
	transform: translateY(1px);
}

@media (prefers-reduced-motion: reduce) {
	.legacyReturnButton:active {
		transform: none;
	}
}
</style>
