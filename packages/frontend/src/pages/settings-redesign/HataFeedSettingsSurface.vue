<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<section :class="$style.surface" :data-motion-enabled="motionEnabled ? 'true' : 'false'" aria-labelledby="hatafeed-settings-title" data-settings-surface="hatafeed">
	<header :class="$style.intro">
		<p :class="$style.eyebrow"><span class="settingsBrand">HataFeed</span></p>
		<h2 id="hatafeed-settings-title">{{ visualCopy.hatafeedLeaves }}</h2>
		<p class="settingsBrandText">{{ visualCopy.hatafeedLeavesCaption }}</p>
	</header>
	<section :class="$style.group" aria-labelledby="hatafeed-settings-title">
		<MkSwitch v-model="hatafeedLeaves">
			<template #label>{{ visualCopy.hatafeedLeaves }}</template>
			<template #caption><span class="settingsBrandText">{{ visualCopy.hatafeedLeavesCaption }}</span></template>
		</MkSwitch>
	</section>
</section>
</template>

<script setup lang="ts">
import MkSwitch from '@/components/MkSwitch.vue';
import { i18n } from '@/i18n.js';
import { prefer } from '@/preferences.js';

withDefaults(defineProps<{ motionEnabled?: boolean }>(), { motionEnabled: true });
const visualCopy = i18n.ts._hata._customSettings._visual;
const hatafeedLeaves = prefer.model('hatafeed.leaves');
</script>

<style lang="scss" module>
.surface { display: grid; gap: 12px; color: var(--MI_THEME-fg); }
.intro, .group { border: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 72%, transparent); border-radius: 22px; background: var(--MI_THEME-panel); box-shadow: 0 2px 10px color-mix(in srgb, var(--MI_THEME-shadow) 5%, transparent); }
.intro { padding: 18px 20px; }
.eyebrow { margin: 0 0 4px; color: var(--MI_THEME-accent); font-size: .72rem; font-weight: 800; letter-spacing: .08em; }
h2 { margin: 0; font-size: 1.05rem; line-height: 1.3; }
.intro > p:last-child { margin: 8px 0 0; color: var(--MI_THEME-fgTransparentWeak); font-size: .84rem; line-height: 1.65; text-wrap: pretty; }
.group { padding: 18px 20px; }
.group :deep(button) { min-block-size: 44px; }
.surface[data-motion-enabled='false'] :deep(*) { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
@container (max-width: 520px) { .intro, .group { border-radius: 18px; padding: 16px; } }
@media (prefers-reduced-motion: reduce) { .surface, .surface :deep(*) { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
</style>
