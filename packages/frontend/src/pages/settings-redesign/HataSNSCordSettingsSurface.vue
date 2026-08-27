<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<section
	:class="$style.surface"
	:data-motion-enabled="motionEnabled ? 'true' : 'false'"
	aria-labelledby="hata-sns-cord-settings-title"
	data-settings-surface="hatasns-cord-ui"
	data-settings-search-key="hatasnscord-settings"
	data-settings-search-group-id="settings.group.hatasnscord-settings"
	data-settings-related-host="settings.group.hatasnscord-settings"
	tabindex="-1"
>
	<header :class="$style.intro">
		<p :class="$style.eyebrow"><span class="settingsBrand">HataSNSCordUI</span></p>
		<h2 id="hata-sns-cord-settings-title"><span class="settingsBrandText">{{ copy.hataSnsCordUiSettings }}</span></h2>
		<p class="settingsBrandText">{{ copy.hataSnsCordUiDescriptionPrefix }}<b>{{ copy.hataSnsCordUiSync }}</b>{{ copy.hataSnsCordUiDescriptionSuffix }}</p>
	</header>
	<div :class="$style.group" aria-labelledby="hata-sns-cord-settings-title">
		<HatacordingUiSettings :accountId="$i.id"/>
	</div>
</section>
</template>

<script setup lang="ts">
import HatacordingUiSettings from '@/components/HatacordingUiSettings.vue';
import { ensureSignin } from '@/i.js';
import { i18n } from '@/i18n.js';

withDefaults(defineProps<{ motionEnabled?: boolean }>(), { motionEnabled: true });
const $i = ensureSignin();
const copy = i18n.ts._hata._customSettings._ui;
</script>

<style lang="scss" module>
.surface { display: grid; gap: 12px; color: var(--MI_THEME-fg); }
.intro, .group { border: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 72%, transparent); border-radius: 22px; background: var(--MI_THEME-panel); box-shadow: 0 2px 10px color-mix(in srgb, var(--MI_THEME-shadow) 5%, transparent); }
.intro { padding: 18px 20px; }
.eyebrow { margin: 0 0 4px; color: var(--MI_THEME-accent); font-size: .72rem; font-weight: 800; letter-spacing: .08em; }
h2 { margin: 0; font-size: 1.05rem; line-height: 1.3; }
.intro > p:last-child { margin: 8px 0 0; color: var(--MI_THEME-fgTransparentWeak); font-size: .84rem; line-height: 1.65; text-wrap: pretty; }
.group { padding: 18px 20px; }
.group :deep([data-hatacording-ui-settings]) { margin: 0; }
.group :deep([data-hatacording-ui-settings] .choiceBar) { grid-auto-rows: 44px; }
.group :deep([data-hatacording-ui-settings] .choice) { min-block-size: 44px; block-size: 44px; max-block-size: 44px; }
.group :deep([data-hatacording-ui-settings] button:focus-visible) { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 54%, transparent); outline-offset: 2px; }
.group :deep(.novjtcto > .body) { gap: 8px; }
.group :deep(.novjtcto > .body > *) { min-block-size: 44px; }
.surface[data-motion-enabled='false'] :deep(*) { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
@container (max-width: 520px) { .intro, .group { border-radius: 18px; padding: 16px; } }
@media (prefers-reduced-motion: reduce) { .surface, .surface :deep(*) { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
</style>
