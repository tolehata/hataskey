<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div :class="$style.message" :data-navbar-notice-kind="notice.kind">
	<template v-if="notice.kind === 'emojiAdded'"><span :class="$style.check" aria-hidden="true"><i class="ti ti-check" :class="$style.checkIcon"></i></span><span :class="$style.full">{{ copy.emojiPrefix }}</span><span :class="$style.compact">{{ copy.emojiCompactPrefix }}</span><span :class="$style.emoji"><MkCustomEmoji :name="notice.emoji.name" :url="notice.emoji.url" normal noStyle fallbackToImage/></span><span :class="$style.full">{{ copy.emojiRest }}</span><span :class="$style.compact">{{ copy.emojiCompactRest }}</span></template>
	<template v-else><i class="ti ti-clock" :class="$style.clock" aria-hidden="true"></i><span :class="$style.time">{{ i18n.tsx._hata._navbarNotice.timeSignal({ time: notice.time }) }}</span></template>
</div>
</template>

<script setup lang="ts">
import type { HataskeyNavbarNotice } from '@/utility/hataskey-notification-toast.js';
import { i18n } from '@/i18n.js';

defineProps<{ notice: HataskeyNavbarNotice }>();
const copy = i18n.ts._hata._navbarNotice;
</script>

<style module lang="scss">
.message { min-height: 44px; font-size: 13px; line-height: 44px; white-space: nowrap; text-align: center; }
.check {
	display: inline-grid; place-items: center; box-sizing: border-box;
	width: 14px; height: 14px; margin-inline-end: 4px; vertical-align: middle; line-height: 0;
	border: 1.5px solid var(--MI_THEME-panel); border-radius: 50%; background: var(--MI_THEME-success); color: #fff;
}
.checkIcon { display: grid; place-items: center; width: 9px; height: 9px; font-size: 9px; line-height: 1; }
.emoji { display: inline-block; width: 28px; height: 28px; margin-inline: 3px; vertical-align: middle; line-height: 0; }
.emoji > img { display: block; width: 100%; height: 100%; max-width: none; max-height: none; object-fit: contain; }
.compact { display: none; }
.clock { display: inline-grid; place-items: center; width: 22px; height: 22px; margin-inline-end: 7px; vertical-align: middle; font-size: 22px; line-height: 1; }
.time { font-variant-numeric: tabular-nums; }
@container hataskey-notice (max-width: 500px) {
	.full { display: none; }
	.compact { display: inline; }
}
@container hataskey-notice (max-width: 280px) {
	.message { font-size: 12px; }
	.emoji { width: 26px; height: 26px; }
}
</style>
